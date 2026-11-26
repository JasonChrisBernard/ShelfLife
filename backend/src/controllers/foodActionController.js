import Food from "../models/Food.js";
import FoodHistory from "../models/FoodHistory.js";

export const markFoodAction = async (req, res) => {
  try {
    const { action, quantity, wasteReason } = req.body;

    const allowedActions = [
      "CONSUMED",
      "WASTED",
    ];

    const allowedWasteReasons = [
      "Expired",
      "Spoiled",
      "Forgot",
      "Too Much",
      "Other",
    ];

    // Check action
    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        message:
          "Action must be CONSUMED or WASTED",
      });
    }

    // Find user's food
    const food = await Food.findOne({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    const actionQuantity = Number(quantity);

    // Check quantity
    if (
      !actionQuantity ||
      actionQuantity <= 0 ||
      actionQuantity > food.quantity
    ) {
      return res.status(400).json({
        message: `Quantity must be between 1 and ${food.quantity}`,
      });
    }

    // Wasted food needs reason
    if (action === "WASTED") {
      if (!wasteReason) {
        return res.status(400).json({
          message: "Waste reason is required",
        });
      }

      if (
        !allowedWasteReasons.includes(wasteReason)
      ) {
        return res.status(400).json({
          message: "Invalid waste reason",
        });
      }
    }

    // Save history
    const history = await FoodHistory.create({
      userId: req.session.userId,
      foodId: food._id,
      foodName: food.name,
      quantity: actionQuantity,
      category: food.category,
      action,
      wasteReason:
        action === "WASTED"
          ? wasteReason
          : null,
    });

    const remainingQuantity =
      food.quantity - actionQuantity;

    // Remove food if nothing remains
    if (remainingQuantity === 0) {
      await Food.findOneAndDelete({
        _id: food._id,
        userId: req.session.userId,
      });
    } else {
      food.quantity = remainingQuantity;

      await food.save();
    }

    res.status(200).json({
      message:
        action === "CONSUMED"
          ? "Food marked as consumed"
          : "Food marked as wasted",

      history,
      remainingQuantity,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};