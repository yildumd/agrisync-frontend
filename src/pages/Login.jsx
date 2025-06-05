// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import LoadingSpinner from "../components/LoadingSpinner";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle redirect messages (from FarmerRoute or other protected routes)
  const from = location.state?.from || "";
  const redirectMessage = location.state?.message || "";

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // 2. Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("User record not found. Please register.");
      }

      const userData = userDoc.data();

      // 3. Show success message (avoid using alert)
      setSuccess(`Welcome back, ${userData.name || userData.email}!`);
      
      // 4. Redirect based on role (with slight delay for UX)
      setTimeout(() => {
        switch(userData.role) {
          case "farmer":
            navigate("/dashboard/farmer", { replace: true });
            break;
          case "buyer":
            navigate("/dashboard/buyer", { replace: true });
            break;
          case "admin":
            navigate("/admin", { replace: true });
            break;
          default:
            navigate("/", { replace: true });
        }
      }, 1500);

    } catch (err) {
      console.error("Login error:", err);
      
      // User-friendly error messages
      const errorMap = {
        "auth/invalid-email": "Invalid email address",
        "auth/user-disabled": "Account disabled",
        "auth/user-not-found": "No account found with this email",
        "auth/wrong-password": "Incorrect password",
        "auth/too-many-requests": "Too many attempts. Try again later"
      };
      
      setError(errorMap[err.code] || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold text-center text-green-700 mb-6">
        Login to AgriSync
      </h2>

      {/* Redirect message (from protected routes) */}
      {redirectMessage && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4 text-center">
          {redirectMessage}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-100 text-green-800 p-3 rounded mb-4 text-center">
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-between">
          <a href="/forgot-password" className="text-sm text-green-600 hover:underline">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Authenticating..." : "Login"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/register" className="text-green-600 hover:underline font-medium">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;