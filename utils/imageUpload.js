const multer = require("multer");
const path = require("path");

// Helper function to sanitize filenames
const sanitizeFilename = (name) => {
  return name
    .normalize("NFD") // normalize accented characters
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-zA-Z0-9.-]/g, "-"); // replace spaces and special chars with dash
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Make sure 'uploads' folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${Date.now()}-${sanitizeFilename(baseName)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
