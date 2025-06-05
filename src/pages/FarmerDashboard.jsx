import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const FarmerDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [productCount, setProductCount] = useState(0);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarmerProducts = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        const q = query(
          collection(db, "products"),
          where("sellerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        setProductCount(snapshot.size);
        
        // Get 3 most recent products
        const products = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 3);
        setRecentProducts(products);
      } catch (error) {
        console.error("❌ Error fetching farmer's products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmerProducts();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-green-600 to-green-800 rounded-xl shadow-lg text-white">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name || "Farmer"}
                className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white text-green-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : "F"}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome back, {user?.name || "Farmer"}!
              </h1>
              <p className="text-green-100">Manage your farm products and connect with buyers</p>
            </div>
          </div>
          <Link
            to="/profile"
            className="px-6 py-2 bg-white text-green-700 rounded-full font-medium hover:bg-gray-100 transition-all"
          >
            Edit Profile
          </Link>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Product Count Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">Your Products</h2>
                {loading ? (
                  <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                ) : (
                  <p className="text-3xl font-bold text-green-600">{productCount}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Listed on marketplace</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-green-600 text-xl">📦</span>
              </div>
            </div>
            <Link
              to="/marketplace/add"
              className="mt-4 inline-block text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Add new product →
            </Link>
          </div>

          {/* Earnings Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">Monthly Earnings</h2>
                <p className="text-3xl font-bold text-blue-600">₦--,--</p>
                <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-blue-600 text-xl">💰</span>
              </div>
            </div>
            <Link
              to="/earnings"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View details →
            </Link>
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">Messages</h2>
                <p className="text-3xl font-bold text-purple-600">5+</p>
                <p className="text-sm text-gray-500 mt-1">Waiting for reply</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <span className="text-purple-600 text-xl">💬</span>
              </div>
            </div>
            <Link
              to="/chat"
              className="mt-4 inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Open Chat
            </Link>
          </div>
        </div>

        {/* Recent Products Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <span className="bg-green-100 text-green-600 p-2 rounded-lg mr-3">🌱</span>
              Your Recent Products
            </h2>
          </div>
          
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : recentProducts.length > 0 ? (
            <div className="divide-y">
              {recentProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="p-4 hover:bg-gray-50 transition-colors block"
                >
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden mr-4">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{product.name}</h3>
                      <p className="text-green-600 font-semibold">₦{product.price?.toLocaleString() || '--'}</p>
                      <p className="text-sm text-gray-500">Available: {product.quantity} {product.unit}</p>
                    </div>
                    <div className="text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">You haven't added any products yet</p>
              <Link
                to="/marketplace/add"
                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Your First Product
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            to="/marketplace/add"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="bg-green-100 text-green-600 p-3 rounded-full inline-block mb-2">
              <span className="text-xl">➕</span>
            </div>
            <p className="font-medium text-gray-700">Add Product</p>
          </Link>
          <Link
            to="/marketplace"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full inline-block mb-2">
              <span className="text-xl">🛒</span>
            </div>
            <p className="font-medium text-gray-700">View Marketplace</p>
          </Link>
          <Link
            to="/orders"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="bg-orange-100 text-orange-600 p-3 rounded-full inline-block mb-2">
              <span className="text-xl">📦</span>
            </div>
            <p className="font-medium text-gray-700">Your Orders</p>
          </Link>
          <Link
            to="/resources"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="bg-purple-100 text-purple-600 p-3 rounded-full inline-block mb-2">
              <span className="text-xl">📚</span>
            </div>
            <p className="font-medium text-gray-700">Farming Resources</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;