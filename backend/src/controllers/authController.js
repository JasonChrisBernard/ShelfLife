import argon2 from "argon2";
import User from "../models/User.js";
import crypto from "node:crypto";
import { generateOtp, hashOtp } from "../services/otpService.js";
import { sendVerificationOtp } from "../services/emailService.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await argon2.hash(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await argon2.verify(
      user.password,
      password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        return res.status(500).json({
          message: "Could not create session",
        });
      }

      req.session.userId = user._id.toString();

      req.session.save((error) => {
        if (error) {
          return res.status(500).json({
            message: "Could not save session",
          });
        }

        res.status(200).json({
          message: "Login successful",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Could not log out",
      });
    }

    res.clearCookie("shelflife.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      message: "Logout successful",
    });
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(
      req.session.userId
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");

      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      user.resetPasswordTokenHash = resetTokenHash;

      user.resetPasswordExpiresAt =
        new Date(Date.now() + 15 * 60 * 1000);

      await user.save();

      const resetLink =
        `http://localhost:5173/reset-password/${resetToken}`;

      console.log("\n🔑 PASSWORD RESET LINK:");
      console.log(resetLink);
      console.log();
    }

    res.status(200).json({
      message:
        "If an account exists with that email, a password reset link has been generated.",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordTokenHash: resetTokenHash,

      resetPasswordExpiresAt: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or expired",
      });
    }

    user.password = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(200).json({
        message: "If the account exists, a verification code was sent.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    if (
      user.emailOtpLastSentAt &&
      Date.now() - user.emailOtpLastSentAt.getTime() < 60000
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP",
      });
    }

    const otp = generateOtp();

    user.emailOtpHash = hashOtp(otp);

    user.emailOtpExpiresAt =
      new Date(Date.now() + 10 * 60 * 1000);

    user.emailOtpAttempts = 0;

    user.emailOtpLastSentAt = new Date();

    await user.save();

    await sendVerificationOtp(user.email, otp);

    res.status(200).json({
      message: "Verification code sent",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification code",
      });
    }

    if (
      !user.emailOtpHash ||
      !user.emailOtpExpiresAt ||
      user.emailOtpExpiresAt < new Date()
    ) {
      return res.status(400).json({
        message: "OTP is invalid or expired",
      });
    }

    if (user.emailOtpAttempts >= 5) {
      return res.status(429).json({
        message: "Too many attempts. Request a new OTP.",
      });
    }

    const enteredOtpHash = hashOtp(otp);

    if (enteredOtpHash !== user.emailOtpHash) {
      user.emailOtpAttempts += 1;

      await user.save();

      return res.status(400).json({
        message: "Invalid verification code",
      });
    }

    user.isEmailVerified = true;

    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    user.emailOtpAttempts = 0;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};