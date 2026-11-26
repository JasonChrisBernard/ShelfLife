import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import "./index.css";


// =====================================
// MOBILE DEBUGGING
// =====================================

if (import.meta.env.DEV) {

  const button = document.createElement("button");

  button.textContent = "DEBUG";

  Object.assign(button.style, {

    position: "fixed",
    top: "120px",
    right: "15px",
    zIndex: "2147483647",
    background: "#dc2626",
    color: "#ffffff",
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    fontSize: "14px",
    pointerEvents: "auto",
  });

  document.body.appendChild(button);

  const erudaReady = import("eruda")
    .then(({ default: eruda }) => {

      eruda.init();

      console.log("Mobile debugger initialized");

      return eruda;

    })
    .catch((error) => {

      button.textContent = "DEBUG FAILED";

      console.error("Eruda failed:", error);

      return null;
    });

  button.onclick = async () => {

    const eruda = await erudaReady;

    if (eruda) {
      eruda.show("console");
    } else {
      alert("Eruda initialization failed");
    }
  };
}


// =====================================
// REACT APPLICATION
// =====================================

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);