const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a property title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    propertyType: {
      type: String,
      enum: ["sale", "rent"],
      required: true,
    },
    category: {
      type: String,
      enum: ["apartment", "bungalow", "land", "office"],
      required: true,
    },
    location: {
      county: { type: String, required: true },
      town: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    specs: {
      bedrooms: Number,
      bathrooms: Number,
      kitchens: Number,
      livingRooms: Number,
      doors: Number,
      windows: Number,
      parkingSpaces: Number,
      upperFloors: Number,
      roofType: String, // e.g., 'tile', 'mabati'
      floorType: String, // e.g., 'tile', 'wood', 'concrete'
      isFurnished: {
        type: Boolean,
        default: false,
      },
    },
    images: [String], // Array of image URLs
    postedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- INDEXING FOR PERFORMANCE ---
// Create indexes for fields that will be frequently searched
PropertySchema.index({ category: 1, propertyType: 1 });
PropertySchema.index({ "specs.bedrooms": 1 });
PropertySchema.index({ "specs.bathrooms": 1 });
PropertySchema.index({ price: 1 });
PropertySchema.index({ "location.county": 1, "location.town": 1 });

module.exports = mongoose.model("Property", PropertySchema);
