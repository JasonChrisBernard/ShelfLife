import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);


// Send verification OTP
export const sendVerificationOtp = async (
  email,
  otp
) => {

  const { data, error } =
    await resend.emails.send({

      from: process.env.EMAIL_FROM,

      to: email,

      subject: "ShelfLife - Verify Your Email",

      html: `
        <h2>Welcome to ShelfLife</h2>

        <p>Your verification code is:</p>

        <h1>${otp}</h1>

        <p>This code expires in 10 minutes.</p>

        <p>If you did not request this code,
        please ignore this email.</p>
      `,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};