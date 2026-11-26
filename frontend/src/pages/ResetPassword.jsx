import { useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { resetPassword } from "../services/authService";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");

      await resetPassword(token, password);

      navigate("/login");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <main className="auth-page">
      <h1>🥗 ShelfLife</h1>

      <h2>Reset Password</h2>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          required
        />

        <button type="submit">
          Save New Password
        </button>
      </form>
    </main>
  );
}

export default ResetPassword;