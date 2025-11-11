const express = require("express");
const router = express.Router();
const upload = require("../utils/imageUpload"); // Multer upload utility

const {
  createProperty,
  searchProperties,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} = require("../controllers/propertyController");

const { protect, authorize } = require("../middleware/auth");

// Public routes
router.get("/search", searchProperties);
router.get("/", getProperties);
router.get("/:id", getPropertyById);

// Protected routes (admin only)
router.use(protect);
router.use(authorize("admin"));

// Admin-only routes with file upload support
router.post("/", upload.array("images", 10), createProperty); // handles multiple images, max 10
router.put("/:id", upload.array("images", 10), updateProperty); // optional: allow updating images
router.delete("/:id", deleteProperty);

module.exports = router;
