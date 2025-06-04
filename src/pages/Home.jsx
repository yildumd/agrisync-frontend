// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        // user is not logged in — clear local user
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center bg-white shadow-lg p-10 rounded-lg relative">
        {/* Only show profile if actually logged in */}
        {user && user.photoUrl && (
          <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2">
            <img
              src={user.photoUrl}
              alt="Seller"
              className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
            />
          </div>
        )}

        <h1 className="mt-16 text-4xl font-bold text-green-700 mb-4">
          Welcome to AgriSync AI 🌾
        </h1>
        <p className="text-lg text-gray-700 mb-4">
          <strong>AgriSync AI</strong> is a smart agricultural platform designed to help farmers and buyers thrive. Whether you're growing crops, facing farm challenges, or seeking fresh produce — AgriSync AI connects you with solutions, markets, and tools that boost productivity and income.
        </p>

        <p className="text-gray-700 mb-3">
          ✅ <strong>Voice-based Crop Reporting:</strong> Record issues with your crops using voice. Our AI listens and gives you tailored solutions instantly.
        </p>
        <p className="text-gray-700 mb-3">
          🌦️ <strong>Live Weather Insights:</strong> Plan your farming with accurate weather data based on your exact location.
        </p>
        <p className="text-gray-700 mb-3">
          🛒 <strong>Marketplace:</strong> Farmers can upload and sell their harvest. Buyers browse available produce and connect directly — no middlemen.
        </p>
        <p className="text-gray-700 mb-3">
          📊 <strong>Role-Based Dashboards:</strong> Custom experiences for farmers, buyers, and admins to manage, monitor, and maximize results.
        </p>
        <p className="text-gray-700 mb-6">
          🚀 AgriSync AI brings technology, connection, and opportunity to every farmer’s hands — starting from Africa to the world.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            to="/register"
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg font-medium"
          >
            Get Started
          </Link>
          <Link
            to="/marketplace"
            className="bg-gray-200 hover:bg-gray-300 text-green-800 px-6 py-2 rounded-lg font-medium"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
