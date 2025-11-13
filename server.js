const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fetch = require("node-fetch"); // Add this for making HTTP requests

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

// Import models and middleware
const Property = require("./models/Property");
const { protect } = require("./middleware/auth"); // Assuming you have authentication middleware

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/properties", require("./routes/properties"));

// =============== AI CHAT ASSISTANT (OLLAMA CLOUD) ===============
app.post("/api/chat", protect, async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res
      .status(400)
      .json({ reply: "Please send a valid message.", properties: [] });
  }

  try {
    // --- 1. STRUCTURE PROMPT FOR JSON EXTRACTION ---
    const prompt = `
You are a real estate assistant for Home254, a Kenyan property platform.
Extract property search criteria from the user's message.
Output ONLY valid JSON using these exact keys (omit unknown fields):
- "location.county" (string)
- "location.town" (string)
- "propertyType" ("sale" or "rent")
- "category" ("apartment", "bungalow", "land", "office")
- "price" (number, max price in KES)
- "specs.bedrooms" (number, min)
- "specs.bathrooms" (number, min)
- "specs.isFurnished" (boolean)

Examples:
User: "3-bed apartments under 5M in Nairobi for rent"
→ {"location.county":"Nairobi","specs.bedrooms":3,"price":5000000,"propertyType":"rent","category":"apartment"}

User: "furnished bungalows"
→ {"category":"bungalow","specs.isFurnished":true}

User message: ${JSON.stringify(message.trim())}
`;

    // --- 2. CALL OLLAMA CLOUD ---
    const ollamaRes = await fetch(
      "https://api.ollama.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OLLAMA_CLOUD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3.1",
          messages: [{ role: "user", content: prompt }],
          format: "json",
          temperature: 0.1,
          stream: false,
        }),
      }
    );

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      console.error("Ollama Cloud error:", text);
      return res
        .status(500)
        .json({
          reply: "AI assistant is unavailable. Try again later.",
          properties: [],
        });
    }

    const data = await ollamaRes.json();
    const aiResponse = data?.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // --- 3. PARSE JSON FILTERS ---
    let filters;
    try {
      filters = JSON.parse(aiResponse);
    } catch (e) {
      return res.json({
        reply:
          'I couldn\'t understand your request. Try: _"3-bedroom apartments under 5M in Nairobi"_',
        properties: [],
      });
    }

    // --- 4. QUERY YOUR LOCAL PROPERTY DB ---
    const query = {};

    if (filters["location.county"])
      query["location.county"] = filters["location.county"];
    if (filters["location.town"])
      query["location.town"] = filters["location.town"];
    if (filters.propertyType && ["sale", "rent"].includes(filters.propertyType))
      query.propertyType = filters.propertyType;
    if (
      filters.category &&
      ["apartment", "bungalow", "land", "office"].includes(filters.category)
    )
      query.category = filters.category;
    if (typeof filters.price === "number" && filters.price > 0)
      query.price = { $lte: filters.price };
    if (typeof filters["specs.bedrooms"] === "number")
      query["specs.bedrooms"] = { $gte: filters["specs.bedrooms"] };
    if (typeof filters["specs.bathrooms"] === "number")
      query["specs.bathrooms"] = { $gte: filters["specs.bathrooms"] };
    if (typeof filters["specs.isFurnished"] === "boolean")
      query["specs.isFurnished"] = filters["specs.isFurnished"];

    const properties = await Property.find(query)
      .limit(4)
      .populate({ path: "postedBy", select: "whatsappContact" });

    // --- 5. FORMAT RESPONSE ---
    if (properties.length === 0) {
      return res.json({
        reply:
          "I couldn't find any properties matching your request. Try adjusting your price or location!",
        properties: [],
      });
    }

    const propertyList = properties
      .map(
        (p) =>
          `- **${p.title}** (${
            p.location.town
          }) – KES ${p.price.toLocaleString()} (${p.propertyType})`
      )
      .join("\n");

    res.json({
      reply: `I found ${properties.length} property(ies):\n\n${propertyList}`,
      properties: properties.map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        location: p.location,
        propertyType: p.propertyType,
        image: p.images?.[0] || null,
      })),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      reply: "Sorry, I'm having trouble right now. Please try again!",
      properties: [],
    });
  }
});
// ==========================================================

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
