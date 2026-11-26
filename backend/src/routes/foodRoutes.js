import express from "express";

import {
  getFoods,
  getUseFirstFoods,
  getExpiredFoods,
  createFood,
  updateFood,
  deleteFood,
} from "../controllers/foodController.js";

import {
  markFoodAction,
} from "../controllers/foodActionController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// GET routes
router.get("/", getFoods);

router.get("/use-first", getUseFirstFoods);

router.get("/expired", getExpiredFoods);

// POST
router.post("/", createFood);

router.post("/:id/action", markFoodAction);


// UPDATE
router.put("/:id", updateFood);

// DELETE
router.delete("/:id", deleteFood);

export default router;