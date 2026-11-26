import mongoose from "mongoose";

const foodHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    foodName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      enum: ["CONSUMED", "WASTED"],
    },

    wasteReason: {
      type: String,
      enum: [
        "Expired",
        "Spoiled",
        "Forgot",
        "Too Much",
        "Other",
        null,
      ],
      default: null,
    },

    actionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const FoodHistory = mongoose.model(
  "FoodHistory",
  foodHistorySchema
);

export default FoodHistory;