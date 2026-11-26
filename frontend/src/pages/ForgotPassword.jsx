import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");

      const data = await forgotPassword(email);

      setMessage(data.message);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <main className="auth-page">
      <h1>🥗 ShelfLife</h1>

      <h2>Forgot Password</h2>

      <p>Enter your email to reset your password.</p>

      {message && <p>{message}</p>}
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <button type="submit">
          Reset Password
        </button>
      </form>

      <Link to="/login">
        Back to Login
      </Link>
    </main>
  );
}

export default ForgotPassword;