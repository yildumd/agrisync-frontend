import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const FarmerDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const fetchFarmerProducts = async () => {
      if (!user?.uid) return;

      try {
        const q = query(
          collection(db, "products"),
          where("sellerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        setProductCount(snapshot.size);
      } catch (error) {
        console.error("❌ Error fetching farmer's products:", error);
      }
    };

    fetchFarmerProducts();
  }, [user?.uid]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Profile Section */}
      <div className="flex items-center gap-4 mb-6">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.name || "Farmer"}
            className="w-16 h-16 rounded-full border object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : "F"}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-green-700">
            Welcome, {user?.name || "Farmer"}!
          </h1>
          <p className="text-gray-600">This is your personalized farmer dashboard.</p>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Product Count Card */}
        <div className="bg-white p-5 shadow rounded-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">📦 Your Products</h2>
          <p className="text-green-700 text-3xl font-bold">{productCount}</p>
          <p className="text-sm text-gray-600 mt-1">products listed on the marketplace</p>
        </div>

        {/* Chat Access Card */}
        <div className="bg-white p-5 shadow rounded-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">💬 Messages</h2>
          <p className="text-sm text-gray-600 mb-3">Chat with buyers who contacted you.</p>
          <Link
            to="/chat"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            Open Chat
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
