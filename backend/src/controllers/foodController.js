import Food from "../models/Food.js";
import { getExpiryInfo } from "../utils/expiryUtils.js";

export const getFoods = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const foods = await Food.find({
      userId: req.session.userId,
      expiryDate: {
        $gte: today,
      },
    });

    const foodsWithExpiry = foods.map((food) => {
      const expiryInfo = getExpiryInfo(food.expiryDate);

      return {
        ...food.toObject(),
        ...expiryInfo,
      };
    });

    res.status(200).json(foodsWithExpiry);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createFood = async (req, res) => {
  try {
    const food = await Food.create({
      ...req.body,
      userId: req.session.userId,
    });

    res.status(201).json(food);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const updateFood = async (req, res) => {
  try {
    const food = await Food.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.session.userId,
      },
      req.body,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    res.status(200).json(food);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const deleteFood = async (req, res) => {
  try {
    const food = await Food.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    res.status(200).json({
      message: "Food deleted successfully",
    });

  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const getUseFirstFoods = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const foods = await Food.find({
      userId: req.session.userId,
      expiryDate: {
        $gte: today,
      },
    }).sort({
      expiryDate: 1,
    });

    const foodsWithExpiry = foods.map((food) => {
      const expiryInfo = getExpiryInfo(food.expiryDate);

      return {
        ...food.toObject(),
        ...expiryInfo,
      };
    });

    res.status(200).json(foodsWithExpiry);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getExpiredFoods = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const foods = await Food.find({
      userId: req.session.userId,
      expiryDate: {
        $lt: today,
      },
    }).sort({
      expiryDate: -1,
    });

    const foodsWithExpiry = foods.map((food) => {
      const expiryInfo = getExpiryInfo(food.expiryDate);

      return {
        ...food.toObject(),
        ...expiryInfo,
      };
    });

    res.status(200).json(foodsWithExpiry);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

