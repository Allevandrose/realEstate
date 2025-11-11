// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

// @desc    Register a new admin user
// @route   POST /api/auth/register
// @access  Public (but only admins can register in Phase 1)
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { name, email, password, whatsappContact } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user (password will be hashed via UserSchema pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      whatsappContact,
    });

    // Send JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    });

    res.status(201).json({
      success: true,
      token,
    });
  } catch (err) {
    // Handle duplicate key or validation errors from MongoDB
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { email, password } = req.body;

  try {
    // Find user and include password (normally excluded by `select: false`)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Use instance method to verify password
    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate and send token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    });

    res.json({
      success: true,
      token,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with that email",
      });
    }

    // Generate reset token (unhashed version for email)
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false }); // Skip validation to save token fields

    // ⚠️ In production: send email via a proper email service
    // Example: emailService.sendResetEmail(user.email, resetToken);
    // For Phase 1 dev/testing, return token in response (remove in production!)
    if (process.env.NODE_ENV === "development") {
      res.json({
        success: true,
        message: "Password reset token generated",
        resetToken, // Only for dev! Never expose in production.
      });
    } else {
      // In production, just confirm email was sent
      res.json({
        success: true,
        message: `Password reset instructions sent to ${email}`,
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error during password reset request",
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { password } = req.body;
  const { resettoken } = req.params;

  try {
    // Hash the token from the URL (same way it was stored)
    const hashedToken = crypto
      .createHash("sha256")
      .update(resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password (will be hashed via pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send new JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    });

    res.json({
      success: true,
      token,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error during password reset",
    });
  }
};
