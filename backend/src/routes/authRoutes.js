import express from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// PUBLIC
router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.post("/send-otp", sendEmailOtp);
router.post("/verify-otp", verifyEmailOtp);

// PROTECTED
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logoutUser);

export default router;