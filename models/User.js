// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false, // Exclude password from queries by default
    },
    role: {
      type: String,
      enum: ["admin","user"],
      default: "user",
    },
    whatsappContact: {
      type: String,
      required: [true, "Please add a WhatsApp contact number"],
      trim: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password only when modified
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next(); // ✅ Critical: return to prevent re-hashing
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to generate and hash a password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate unhashed token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and store it
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expiration (10 minutes from now)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken; // Return unhashed token to send to user (e.g., via email)
};

// Optional: Instance method to compare passwords (useful in login)
UserSchema.methods.verifyPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
