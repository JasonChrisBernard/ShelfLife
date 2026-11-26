import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();

  const {
    user,
    handleLogout,
  } = useAuth();

  const logoutUser = async () => {
    await handleLogout();

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h2>🥗 ShelfLife</h2>

      {user && (
        <div>
          <Link to="/">Pantry</Link>
          <Link to="/use-first">
            Use First
          </Link>
          <Link to="/dashboard">
            Dashboard
          </Link>
          <span>{user.name}</span>
          <Link to="/history">
            History
          </Link>
          <Link to="/ai">
            AI Assistant
          </Link>
          <Link
          to="/scan"
          className="navbar-add-button"
          title="Add Food"
        >
          +
        </Link>

          

          <button onClick={logoutUser}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;