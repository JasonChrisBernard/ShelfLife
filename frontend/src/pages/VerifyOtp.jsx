import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  sendEmailOtp,
  verifyEmailOtp,
} from "../services/authService";

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setMessage("");

      await verifyEmailOtp(email, otp);

      setMessage("Email verified successfully");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleResend = async () => {
    try {
      setError("");
      setMessage("");

      await sendEmailOtp(email);

      setMessage("A new OTP has been sent.");

      setCountdown(60);
    } catch (error) {
      setError(error.message);
    }
  };

  if (!email) {
    return (
      <main className="auth-page">
        <p>Email information is missing.</p>

        <button onClick={() => navigate("/register")}>
          Register Again
        </button>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1>🥗 ShelfLife</h1>

      <h2>Verify Your Email</h2>

      <p>
        We sent a 6-digit verification code to:
      </p>

      <strong>{email}</strong>

      {message && <p>{message}</p>}
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleVerify}>
        <input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(event) => {
            const value = event.target.value
              .replace(/\D/g, "")
              .slice(0, 6);

            setOtp(value);
          }}
          maxLength={6}
          required
        />

        <button
          type="submit"
          disabled={otp.length !== 6}
        >
          Verify Email
        </button>
      </form>

      <div>
        {countdown > 0 ? (
          <p>
            Resend OTP in {countdown}s
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
          >
            Resend OTP
          </button>
        )}
      </div>
    </main>
  );
}

export default VerifyOtp;