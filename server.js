const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fetch = require("node-fetch");

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
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// General middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));

// Serve uploaded files
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

// Import models and middleware
const Property = require("./models/Property");
const { protect } = require("./middleware/auth");

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/properties", require("./routes/properties"));

// =============== ADVANCED NLP UTILITIES ===============

// Comprehensive property-related keywords with synonyms and variations
const PROPERTY_KEYWORDS = {
  // Property types
  apartment: [
    "apartment",
    "flat",
    "unit",
    "condo",
    "condominium",
    "maisonette",
    "penthouse",
    "studio",
    "bedsitter",
    "bedsit",
    "single room",
  ],
  bungalow: [
    "bungalow",
    "cottage",
    "villa",
    "standalone",
    "detached",
    "single family",
    "townhouse",
    "duplex",
  ],
  land: [
    "land",
    "plot",
    "parcel",
    "acre",
    "acres",
    "hectare",
    "lot",
    "site",
    "ground",
  ],
  office: [
    "office",
    "commercial",
    "workspace",
    "business space",
    "shop",
    "retail",
    "showroom",
    "warehouse",
    "godown",
  ],

  // General property terms
  general: [
    "property",
    "properties",
    "house",
    "houses",
    "home",
    "homes",
    "place",
    "residence",
    "dwelling",
    "accommodation",
    "housing",
    "real estate",
    "estate",
    "building",
    "premises",
  ],

  // Transaction types
  sale: [
    "sale",
    "buy",
    "purchase",
    "buying",
    "purchasing",
    "own",
    "ownership",
    "acquire",
    "investment",
  ],
  rent: [
    "rent",
    "rental",
    "lease",
    "leasing",
    "hire",
    "letting",
    "tenant",
    "tenancy",
  ],

  // Features
  furnished: [
    "furnished",
    "furnished apartment",
    "fully furnished",
    "semi furnished",
    "with furniture",
    "fitted",
  ],
  unfurnished: ["unfurnished", "bare", "empty", "no furniture", "shell"],

  // Kenyan locations (common areas)
  locations: [
    "nairobi",
    "karen",
    "westlands",
    "kilimani",
    "lavington",
    "kileleshwa",
    "parklands",
    "upperhill",
    "south b",
    "south c",
    "kiambu",
    "thika",
    "ruiru",
    "juja",
    "kikuyu",
    "limuru",
    "mombasa",
    "nyali",
    "bamburi",
    "diani",
    "malindi",
    "kisumu",
    "nakuru",
    "eldoret",
    "kakamega",
    "machakos",
    "kitengela",
  ],

  // Action words
  actions: [
    "looking for",
    "search",
    "find",
    "need",
    "want",
    "interested",
    "seeking",
    "show me",
    "get me",
    "available",
    "list",
    "display",
  ],
};

// Advanced text similarity function (Levenshtein distance)
function similarityScore(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const editDistance = levenshteinDistance(longer, shorter);
  const maxLength = longer.length;

  if (maxLength === 0) return 1.0;
  return (maxLength - editDistance) / maxLength;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Enhanced property detection with fuzzy matching
function detectPropertyIntent(message) {
  const msg = message.toLowerCase();
  const words = msg.split(/\s+/);

  let score = 0;
  let detectedCategory = null;
  let detectedType = null;
  let detectedFeatures = {};

  // Check for property-related keywords with fuzzy matching
  for (const word of words) {
    // Check categories
    for (const [category, synonyms] of Object.entries(PROPERTY_KEYWORDS)) {
      if (
        [
          "general",
          "actions",
          "locations",
          "sale",
          "rent",
          "furnished",
          "unfurnished",
        ].includes(category)
      )
        continue;

      for (const synonym of synonyms) {
        const similarity = similarityScore(word, synonym);
        if (similarity > 0.7) {
          score += similarity * 2;
          if (!detectedCategory || similarity > 0.85) {
            detectedCategory = category;
          }
        }
      }
    }

    // Check general property terms
    for (const term of PROPERTY_KEYWORDS.general) {
      if (similarityScore(word, term) > 0.75) {
        score += 1;
      }
    }

    // Check action words
    for (const action of PROPERTY_KEYWORDS.actions) {
      if (msg.includes(action)) {
        score += 0.5;
        break;
      }
    }
  }

  // Check for transaction type
  for (const saleWord of PROPERTY_KEYWORDS.sale) {
    if (msg.includes(saleWord)) {
      detectedType = "sale";
      score += 1;
      break;
    }
  }

  if (!detectedType) {
    for (const rentWord of PROPERTY_KEYWORDS.rent) {
      if (msg.includes(rentWord)) {
        detectedType = "rent";
        score += 1;
        break;
      }
    }
  }

  // Check for furnished status
  for (const furnWord of PROPERTY_KEYWORDS.furnished) {
    if (msg.includes(furnWord)) {
      detectedFeatures.isFurnished = true;
      score += 0.5;
      break;
    }
  }

  for (const unfurnWord of PROPERTY_KEYWORDS.unfurnished) {
    if (msg.includes(unfurnWord)) {
      detectedFeatures.isFurnished = false;
      score += 0.5;
      break;
    }
  }

  return {
    isPropertyRelated: score > 1.5,
    confidence: Math.min(score / 5, 1),
    category: detectedCategory,
    propertyType: detectedType,
    features: detectedFeatures,
  };
}

// Extract numbers from text
function extractNumbers(text) {
  const numbers = text.match(/\d+/g);
  return numbers ? numbers.map((n) => parseInt(n)) : [];
}

// Enhanced location detection
function detectLocation(message) {
  const msg = message.toLowerCase();

  for (const location of PROPERTY_KEYWORDS.locations) {
    if (msg.includes(location)) {
      // Capitalize first letter of each word
      return location
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  return null;
}

// =============== ADVANCED AI CHAT ASSISTANT ===============
app.post("/api/chat", protect, async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res
      .status(400)
      .json({ reply: "Please send a message.", properties: [] });
  }

  const userMessage = message.trim();
  const lowerMessage = userMessage.toLowerCase();

  // Handle greetings
  const greetings = [
    "hi",
    "hello",
    "hey",
    "howdy",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "habari",
    "sasa",
  ];
  if (
    greetings.some(
      (g) =>
        lowerMessage === g ||
        lowerMessage.startsWith(g + " ") ||
        lowerMessage.endsWith(" " + g)
    )
  ) {
    return res.json({
      reply: `👋 Hello! I'm your Home254 property assistant. I can help you find:\n\n• Apartments, houses, bungalows\n• Land plots and commercial spaces\n• Properties for sale or rent\n• Furnished or unfurnished options\n\nJust tell me what you're looking for! Example: "3-bedroom apartment in Karen" or "land for sale in Kiambu"`,
      properties: [],
    });
  }

  // Detect property intent using advanced NLP
  const intent = detectPropertyIntent(userMessage);

  // If not clearly property-related, ask for clarification
  if (!intent.isPropertyRelated || intent.confidence < 0.3) {
    return res.json({
      reply:
        "I'm here to help you find properties! Could you please specify what type of property you're looking for? For example:\n\n• 'Apartment for rent in Westlands'\n• 'Land for sale'\n• 'Furnished 2-bedroom house'",
      properties: [],
    });
  }

  try {
    // Extract information from message
    const numbers = extractNumbers(userMessage);
    const location = detectLocation(userMessage);

    // Build base filters from intent detection
    const baseFilters = {
      category: intent.category,
      propertyType: intent.propertyType,
    };

    if (location) {
      baseFilters.location = location;
    }

    if (intent.features.isFurnished !== undefined) {
      baseFilters.isFurnished = intent.features.isFurnished;
    }

    // Add bedroom/price info from numbers if available
    if (numbers.length > 0) {
      // First number might be bedrooms (if < 10), later numbers might be price
      if (numbers[0] < 10) {
        baseFilters.bedrooms = numbers[0];
      }

      // Look for price indicators
      const priceMatch = userMessage.match(/(\d+)\s*(m|million|k|thousand)/i);
      if (priceMatch) {
        const num = parseInt(priceMatch[1]);
        const unit = priceMatch[2].toLowerCase();
        if (unit.startsWith("m")) {
          baseFilters.maxPrice = num * 1000000;
        } else if (unit.startsWith("k")) {
          baseFilters.maxPrice = num * 1000;
        }
      }
    }

    // --- Enhanced AI prompt with context ---
    const prompt = `You are a Kenyan real estate AI assistant for Home254.

User message: "${userMessage}"

Initial detection results:
${JSON.stringify(baseFilters, null, 2)}

Extract and refine ALL relevant filters. Return ONLY valid JSON with these optional fields:
- "location.county": string (Kenyan county)
- "location.town": string (specific area/town - capitalize properly)
- "propertyType": "sale" or "rent"
- "category": "apartment", "bungalow", "land", or "office"
- "price": number (maximum price in KES)
- "specs.bedrooms": number (minimum bedrooms)
- "specs.bathrooms": number (minimum bathrooms)
- "specs.isFurnished": boolean

Common Kenyan locations: Nairobi, Karen, Westlands, Kilimani, Kiambu, Thika, Mombasa, Nakuru, Kisumu, etc.

Rules:
- Use detected info as hints but extract from original message
- Only include fields you're confident about
- Properly capitalize location names
- Don't invent information

Return JSON only:`;

    const response = await fetch(
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
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data?.choices?.[0]?.message?.content || "{}";

    // Clean markdown code blocks
    aiResponse = aiResponse
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    let filters = {};
    try {
      filters = JSON.parse(aiResponse);
    } catch (e) {
      console.warn("AI JSON parse failed, using base filters:", aiResponse);
      // Fallback to base filters from NLP detection
      filters = baseFilters;
    }

    // Build MongoDB query
    const query = {};

    if (filters["location.county"]) {
      query["location.county"] = new RegExp(filters["location.county"], "i");
    }
    if (filters["location.town"]) {
      query["location.town"] = new RegExp(filters["location.town"], "i");
    }
    if (baseFilters.location) {
      // Use NLP detected location if AI didn't provide one
      if (!query["location.town"] && !query["location.county"]) {
        query.$or = [
          { "location.town": new RegExp(baseFilters.location, "i") },
          { "location.county": new RegExp(baseFilters.location, "i") },
        ];
      }
    }

    if (["sale", "rent"].includes(filters.propertyType)) {
      query.propertyType = filters.propertyType;
    } else if (baseFilters.propertyType) {
      query.propertyType = baseFilters.propertyType;
    }

    if (
      ["apartment", "bungalow", "land", "office"].includes(filters.category)
    ) {
      query.category = filters.category;
    } else if (baseFilters.category) {
      query.category = baseFilters.category;
    }

    if (typeof filters.price === "number" && filters.price > 0) {
      query.price = { $lte: filters.price };
    } else if (baseFilters.maxPrice) {
      query.price = { $lte: baseFilters.maxPrice };
    }

    if (typeof filters["specs.bedrooms"] === "number") {
      query["specs.bedrooms"] = { $gte: filters["specs.bedrooms"] };
    } else if (baseFilters.bedrooms) {
      query["specs.bedrooms"] = { $gte: baseFilters.bedrooms };
    }

    if (typeof filters["specs.bathrooms"] === "number") {
      query["specs.bathrooms"] = { $gte: filters["specs.bathrooms"] };
    }

    if (typeof filters["specs.isFurnished"] === "boolean") {
      query["specs.isFurnished"] = filters["specs.isFurnished"];
    } else if (baseFilters.isFurnished !== undefined) {
      query["specs.isFurnished"] = baseFilters.isFurnished;
    }

    console.log("Search query:", JSON.stringify(query));

    // Query database
    const properties = await Property.find(query)
      .limit(6)
      .sort({ createdAt: -1 })
      .populate({ path: "postedBy", select: "whatsappContact" });

    if (properties.length === 0) {
      // Try a broader search if no results
      const broaderQuery = {};
      if (query.category) broaderQuery.category = query.category;
      if (query.propertyType) broaderQuery.propertyType = query.propertyType;

      const broaderResults = await Property.find(broaderQuery)
        .limit(4)
        .sort({ createdAt: -1 })
        .populate({ path: "postedBy", select: "whatsappContact" });

      if (broaderResults.length > 0) {
        const list = broaderResults
          .map(
            (p) =>
              `- **${p.title}** (${
                p.location.town || p.location.county
              }) – KES ${p.price.toLocaleString()}`
          )
          .join("\n");

        return res.json({
          reply: `I couldn't find exact matches, but here are similar properties:\n\n${list}`,
          properties: broaderResults.map((p) => ({
            _id: p._id,
            title: p.title,
            price: p.price,
            location: p.location,
            propertyType: p.propertyType,
            category: p.category,
            specs: p.specs,
            image: p.images?.[0] || null,
          })),
        });
      }

      return res.json({
        reply:
          "I couldn't find properties matching your criteria. Try:\n\n• Broadening your search (e.g., remove price limit)\n• Checking spelling of locations\n• Using different terms (e.g., 'flat' instead of 'apartment')",
        properties: [],
      });
    }

    // Generate response message
    const propertyList = properties
      .map((p) => {
        const specs = [];
        if (p.specs?.bedrooms) specs.push(`${p.specs.bedrooms} bed`);
        if (p.specs?.bathrooms) specs.push(`${p.specs.bathrooms} bath`);
        if (p.specs?.isFurnished) specs.push("furnished");

        const specStr = specs.length > 0 ? ` | ${specs.join(", ")}` : "";
        return `- **${p.title}** (${
          p.location.town || p.location.county
        })${specStr} – KES ${p.price.toLocaleString()}`;
      })
      .join("\n");

    res.json({
      reply: `✅ Found ${properties.length} propert${
        properties.length === 1 ? "y" : "ies"
      } for you:\n\n${propertyList}\n\nClick on any property to view details!`,
      properties: properties.map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        location: p.location,
        propertyType: p.propertyType,
        category: p.category,
        specs: p.specs,
        image: p.images?.[0] || null,
      })),
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Fallback to recent properties
    try {
      const fallbackProps = await Property.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: "postedBy", select: "whatsappContact" });

      if (fallbackProps.length > 0) {
        const list = fallbackProps
          .map(
            (p) =>
              `- **${p.title}** (${
                p.location.town || p.location.county
              }) – KES ${p.price.toLocaleString()}`
          )
          .join("\n");

        return res.json({
          reply: `I had a small hiccup 😅, but here are some recent properties:\n\n${list}`,
          properties: fallbackProps.map((p) => ({
            _id: p._id,
            title: p.title,
            price: p.price,
            location: p.location,
            propertyType: p.propertyType,
            category: p.category,
            specs: p.specs,
            image: p.images?.[0] || null,
          })),
        });
      }
    } catch (fallbackErr) {
      console.error("Fallback error:", fallbackErr);
    }

    res.status(500).json({
      reply:
        "Sorry, I'm experiencing technical difficulties. Please try again in a moment! 🔧",
      properties: [],
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
