const Property = require("../models/Property");

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate({
      path: "postedBy",
      select: "whatsappContact",
    });
    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get single property by ID
// @route   GET /api/properties/:id
// @access  Public
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate({
      path: "postedBy",
      select: "whatsappContact",
    });
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    res.status(200).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (Admin)
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
    };

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      propertyData.images = req.files.map(
        (file) => `/uploads/${file.filename}`
      );
    }

    // Validate required fields
    if (
      !propertyData.title ||
      !propertyData.price ||
      !propertyData.category ||
      !propertyData.propertyType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: title, price, category, propertyType",
      });
    }

    const property = await Property.create(propertyData);
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Admin + Owner)
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this property",
      });
    }

    const updateData = { ...req.body };

    // Handle updated images if provided
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((file) => `/uploads/${file.filename}`);
    }

    property = await Property.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "postedBy",
      select: "whatsappContact",
    });

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Admin + Owner)
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this property",
      });
    }

    await property.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Search & filter properties
// @route   GET /api/properties/search
// @access  Public
exports.searchProperties = async (req, res) => {
  try {
    const query = { ...req.query };

    // Remove non-filter fields
    const removeFields = ["select", "sort", "page", "limit"];
    removeFields.forEach((param) => delete query[param]);

    // Parse boolean and numeric fields
    if (query["specs.isFurnished"] !== undefined) {
      query["specs.isFurnished"] = query["specs.isFurnished"] === "true";
    }

    const numericFields = [
      "price",
      "specs.bedrooms",
      "specs.bathrooms",
      "specs.kitchens",
      "specs.livingRooms",
      "specs.doors",
      "specs.windows",
      "specs.parkingSpaces",
      "specs.upperFloors",
    ];

    numericFields.forEach((field) => {
      if (query[field] !== undefined) {
        query[field] = Number(query[field]);
      }
    });

    // Price filter example: max budget
    if (query.price) {
      query.price = { $lte: query.price };
    }

    const properties = await Property.find(query).populate({
      path: "postedBy",
      select: "whatsappContact",
    });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
