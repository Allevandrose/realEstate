// controllers/propertyController.js
const Property = require("../models/Property");
const cloudinary = require("../services/cloudinary");

// Helper: upload files to Cloudinary
const getCloudinaryUrls = (files) => {
  if (!files || files.length === 0) return [];
  return files.map((file) => file.path); // multer with CloudinaryStorage stores URL in file.path
};

// Helper: delete Cloudinary image by URL
const deleteCloudinaryImage = async (url) => {
  try {
    if (!url) return;
    const segments = url.split("/");
    const filename = segments[segments.length - 1].split(".")[0]; // remove extension
    await cloudinary.uploader.destroy(`properties/${filename}`);
  } catch (err) {
    console.error("Error deleting Cloudinary image:", err.message);
  }
};

// Get all properties
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate({
      path: "postedBy",
      select: "whatsappContact",
    });
    res
      .status(200)
      .json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get single property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate({
      path: "postedBy",
      select: "whatsappContact",
    });
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    res.status(200).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create new property
exports.createProperty = async (req, res) => {
  try {
    const body = req.body || {};

    const propertyData = {
      title: body.title,
      description: body.description || "",
      price: Number(body.price),
      propertyType: body.propertyType,
      category: body.category,
      location: {
        county: body["location.county"],
        town: body["location.town"] || "",
      },
      specs: {
        bedrooms: body["specs.bedrooms"]
          ? Number(body["specs.bedrooms"])
          : undefined,
        bathrooms: body["specs.bathrooms"]
          ? Number(body["specs.bathrooms"])
          : undefined,
        isFurnished:
          body["specs.isFurnished"] === "true" ||
          body["specs.isFurnished"] === true,
        roofType: body["specs.roofType"] || undefined,
        floorType: body["specs.floorType"] || undefined,
        kitchens: body["specs.kitchens"]
          ? Number(body["specs.kitchens"])
          : undefined,
        livingRooms: body["specs.livingRooms"]
          ? Number(body["specs.livingRooms"])
          : undefined,
        doors: body["specs.doors"] ? Number(body["specs.doors"]) : undefined,
        windows: body["specs.windows"]
          ? Number(body["specs.windows"])
          : undefined,
        parkingSpaces: body["specs.parkingSpaces"]
          ? Number(body["specs.parkingSpaces"])
          : undefined,
        upperFloors: body["specs.upperFloors"]
          ? Number(body["specs.upperFloors"])
          : undefined,
      },
      postedBy: req.user.id,
      images: getCloudinaryUrls(req.files),
    };

    if (
      !propertyData.title ||
      !propertyData.price ||
      !propertyData.category ||
      !propertyData.propertyType
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const property = await Property.create(propertyData);
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update property
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });

    if (property.postedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const updateData = { ...req.body };

    // If new images uploaded, delete old ones from Cloudinary
    if (req.files && req.files.length > 0) {
      if (property.images && property.images.length > 0) {
        await Promise.all(
          property.images.map((url) => deleteCloudinaryImage(url))
        );
      }
      updateData.images = getCloudinaryUrls(req.files);
    }

    property = await Property.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate({ path: "postedBy", select: "whatsappContact" });

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });

    if (property.postedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Delete images from Cloudinary
    if (property.images && property.images.length > 0) {
      await Promise.all(
        property.images.map((url) => deleteCloudinaryImage(url))
      );
    }

    await property.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Search properties
exports.searchProperties = async (req, res) => {
  try {
    const query = { ...req.query };
    ["select", "sort", "page", "limit"].forEach((param) => delete query[param]);

    if (query["specs.isFurnished"] !== undefined)
      query["specs.isFurnished"] = query["specs.isFurnished"] === "true";

    [
      "price",
      "specs.bedrooms",
      "specs.bathrooms",
      "specs.kitchens",
      "specs.livingRooms",
      "specs.doors",
      "specs.windows",
      "specs.parkingSpaces",
      "specs.upperFloors",
    ].forEach((field) => {
      if (query[field] !== undefined) query[field] = Number(query[field]);
    });

    if (query.price) query.price = { $lte: query.price };

    const properties = await Property.find(query).populate({
      path: "postedBy",
      select: "whatsappContact",
    });

    res
      .status(200)
      .json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
