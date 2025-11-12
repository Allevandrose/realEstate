// utils/imageUpload.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../services/cloudinary");

// Optional: helper to sanitize file names (for reference; Cloudinary will handle most of it)
const sanitizeFilename = (name) => {
  return name
    .normalize("NFD") // normalize accented characters
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-zA-Z0-9.-]/g, "-"); // replace spaces and special chars with dash
};

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "properties", // Cloudinary folder
    allowed_formats: ["jpg", "jpeg", "png"], // only images
    public_id: (req, file) => {
      // Optional: customize filename in Cloudinary
      const ext = file.originalname.split(".").pop();
      const baseName = sanitizeFilename(
        file.originalname.replace(/\.[^/.]+$/, "")
      );
      return `${Date.now()}-${baseName}`;
    },
    transformation: [{ width: 800, crop: "limit" }], // optional image resizing
  },
});

// Multer setup with file size limit
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

module.exports = upload;
