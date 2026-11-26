import express from "express";

import {
  getFoodHistory,
} from "../controllers/foodHistoryController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getFoodHistory);

export default router;