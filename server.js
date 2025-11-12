const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("DB connection error:", err));

const app = express();

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use(limiter);

// General middleware
app.use(helmet());
app.use(cors()); // Allows all origins for API routes (can restrict in production)
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));

// ✅ Serve uploaded files with CORP header for cross-origin embedding
app.use(
  "/uploads",
  (req, res, next) => {
    // CORP header allows embedding in cross-origin contexts
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // Optional: simple CORS headers for dev/testing
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/properties", require("./routes/properties"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
