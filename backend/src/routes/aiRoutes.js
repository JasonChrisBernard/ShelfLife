import express from "express";

import {
  getFoodRecommendation,
  chatWithShelfLife,
} from "../controllers/aiController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.post(
  "/food/:id/recommendation",
  getFoodRecommendation
);

router.post(
  "/chat",
  chatWithShelfLife
);

export default router;