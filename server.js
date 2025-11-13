const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fetch = require("node-fetch"); // v2 compatible

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("DB connection error:", err));

const app = express();

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// General middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));

// Serve uploaded files (if still used — though you use Cloudinary)
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// Import routes and models
const Property = require("./models/Property");
const { protect } = require("./middleware/auth");

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/properties", require("./routes/properties"));

// =============== AI CHAT ASSISTANT (Flexible + Fallback) ===============
app.post("/api/chat", protect, async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res
      .status(400)
      .json({ reply: "Please send a message.", properties: [] });
  }

  const userMessage = message.trim().toLowerCase();

  // Handle greetings
  const greetings = [
    "hi",
    "hello",
    "hey",
    "howdy",
    "good morning",
    "good evening",
    "yo",
  ];
  if (greetings.some((g) => userMessage.includes(g))) {
    return res.json({
      // Fixed the nested quotes issue by using single quotes for the examples
      reply:
        "👋 Hello! I'm your Home254 property assistant. You can ask me things like:\n\n• '3-bedroom apartments in Nairobi'\n• 'Furnished bungalows for rent'\n• 'Land under 2M in Kiambu'",
      properties: [],
    });
  }

  // Handle vague requests
  const vague = [
    "home",
    "house",
    "property",
    "place",
    "flat",
    "apartment",
    "listings",
  ];
  if (vague.some((w) => userMessage.includes(w)) && !/\d/.test(userMessage)) {
    // User said "show me homes" but no numbers → show recent properties
    try {
      const recentProps = await Property.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .populate({ path: "postedBy", select: "whatsappContact" });

      const list = recentProps
        .map(
          (p) =>
            `- ${p.title} (${
              p.location.town
            }) – KES ${p.price.toLocaleString()}`
        )
        .join("\n");

      return res.json({
        reply: `Here are some recent properties:\n\n${list}`,
        properties: recentProps.map((p) => ({
          _id: p._id,
          title: p.title,
          price: p.price,
          location: p.location,
          propertyType: p.propertyType,
          image: p.images?.[0] || null,
        })),
      });
    } catch (err) {
      console.error("Fallback search error:", err);
    }
  }

  try {
    // --- SMART PROMPT: Allow natural language + graceful JSON ---
    const prompt = `
You are a helpful real estate assistant for Home254 (Kenya). 
The user said: "${message}"

Your job: Extract **only known property filters** from their message. 
If you're unsure about a field, **omit it**. Never guess.

Return valid JSON with **only these possible keys**:
- "location.county" (e.g., "Nairobi")
- "location.town" (e.g., "Westlands")
- "propertyType" ("sale" or "rent")
- "category" ("apartment", "bungalow", "land", "office")
- "price" (max price in KES, number)
- "specs.bedrooms" (min number)
- "specs.bathrooms" (min number)
- "specs.isFurnished" (true/false)

Examples:
- "nice 2 bed flat in karen under 4M" → {"location.town":"Karen","specs.bedrooms":2,"price":4000000,"category":"apartment"}
- "land for sale" → {"category":"land","propertyType":"sale"}
- "hello" → {}

Now respond with JSON only:
`;

    const openrouterRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.VITE_APP_URL || "http://localhost:5000",
          "X-Title": "Home254",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct",
          messages: [{ role: "user", content: prompt }],
          format: "json",
          temperature: 0.3, // slightly more creative
        }),
      }
    );

    if (!openrouterRes.ok) throw new Error(await openrouterRes.text());

    const data = await openrouterRes.json();
    const aiResponse = data?.choices?.[0]?.message?.content || "{}";

    // Clean & parse JSON (handle markdown/code blocks)
    let cleanJson = aiResponse.trim();
    if (cleanJson.startsWith("```json")) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith("```")) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith("```")) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    let filters = {};
    try {
      filters = JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Failed to parse LLM JSON, using empty filters:", cleanJson);
      filters = {};
    }

    // --- Build DB query ---
    const query = {};
    if (filters["location.county"])
      query["location.county"] = filters["location.county"];
    if (filters["location.town"])
      query["location.town"] = filters["location.town"];
    if (["sale", "rent"].includes(filters.propertyType))
      query.propertyType = filters.propertyType;
    if (["apartment", "bungalow", "land", "office"].includes(filters.category))
      query.category = filters.category;
    if (typeof filters.price === "number" && filters.price > 0)
      query.price = { $lte: filters.price };
    if (typeof filters["specs.bedrooms"] === "number")
      query["specs.bedrooms"] = { $gte: filters["specs.bedrooms"] };
    if (typeof filters["specs.bathrooms"] === "number")
      query["specs.bathrooms"] = { $gte: filters["specs.bathrooms"] };
    if (typeof filters["specs.isFurnished"] === "boolean")
      query["specs.isFurnished"] = filters["specs.isFurnished"];

    // If no filters extracted, search with relaxed criteria (e.g., use keywords)
    if (Object.keys(query).length === 0) {
      // Optional: keyword fallback (e.g., match "bungalow" in title/description)
      // For now, just return recent properties
      const fallbackProps = await Property.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .populate({ path: "postedBy", select: "whatsappContact" });

      const list = fallbackProps
        .map(
          (p) =>
            `- ${p.title} (${
              p.location.town
            }) – KES ${p.price.toLocaleString()}`
        )
        .join("\n");

      return res.json({
        reply: `I couldn't extract specific filters, but here are some available properties:\n\n${list}`,
        properties: fallbackProps.map((p) => ({
          _id: p._id,
          title: p.title,
          price: p.price,
          location: p.location,
          propertyType: p.propertyType,
          image: p.images?.[0] || null,
        })),
      });
    }

    // --- Query DB ---
    const properties = await Property.find(query)
      .limit(4)
      .populate({ path: "postedBy", select: "whatsappContact" });

    if (properties.length === 0) {
      return res.json({
        reply:
          "I couldn't find any properties matching your request. Try adjusting your criteria!",
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
    // Fallback to recent properties on any error
    try {
      const fallbackProps = await Property.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .populate({ path: "postedBy", select: "whatsappContact" });

      const list = fallbackProps
        .map(
          (p) =>
            `- ${p.title} (${
              p.location.town
            }) – KES ${p.price.toLocaleString()}`
        )
        .join("\n");

      res.json({
        reply:
          "I'm having a small issue, but here are some properties you might like:\n\n" +
          list,
        properties: fallbackProps.map((p) => ({
          _id: p._id,
          title: p.title,
          price: p.price,
          location: p.location,
          propertyType: p.propertyType,
          image: p.images?.[0] || null,
        })),
      });
    } catch (fallbackErr) {
      res.status(500).json({
        reply: "Sorry, I'm having trouble right now. Please try again later!",
        properties: [],
      });
    }
  }
});
// ==========================================================

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
