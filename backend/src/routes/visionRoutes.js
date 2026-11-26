import express from "express";

import {
  testGemini,
  analyzeProduct,
  analyzeExpiry,
  analyzeBarcode,
  lookupBarcode,
} from "../controllers/visionController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);


// Gemini connection test
router.get(
  "/test",
  testGemini
);


// Product recognition
router.post(
  "/product",
  analyzeProduct
);

router.post(
  "/expiry",
  analyzeExpiry
);

router.post("/barcode", analyzeBarcode);

router.get(
  "/barcode/:barcode",
  lookupBarcode
);

export default router;