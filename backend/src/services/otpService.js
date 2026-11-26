import crypto from "node:crypto";


// Generate a six-digit OTP
export const generateOtp = () => {

  return crypto
    .randomInt(100000, 1000000)
    .toString();
};


// Securely hash the OTP
export const hashOtp = (otp) => {

  const secret =
    process.env.EMAIL_OTP_SECRET;

  if (!secret) {
    throw new Error(
      "EMAIL_OTP_SECRET is missing"
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(String(otp))
    .digest("hex");
};