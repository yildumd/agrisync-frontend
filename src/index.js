// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext"; // ✅ Import the AuthProvider

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* ✅ Wrap App in AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
