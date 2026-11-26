import FoodHistory from "../models/FoodHistory.js";

export const getFoodHistory = async (req, res) => {
  try {
    const history = await FoodHistory.find({
      userId: req.session.userId,
    }).sort({
      actionDate: -1,
    });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};