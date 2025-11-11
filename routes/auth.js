// routes/auth.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Validation middleware
const validateRegister = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("whatsappContact")
    .notEmpty()
    .withMessage("WhatsApp contact is required"),
];

const validateLogin = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/forgotpassword", body("email").isEmail(), forgotPassword);
router.put(
  "/resetpassword/:resettoken",
  body("password").isLength({ min: 6 }),
  resetPassword
);

module.exports = router;
