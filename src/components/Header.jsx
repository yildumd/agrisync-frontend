// src/components/Header.jsx

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const [userData, setUserData] = useState(null);

  // Pages where user info (name + profile picture) should appear
  const showUserInfoPaths = [
    "/dashboard",
    "/dashboard/farmer",
    "/dashboard/buyer",
    "/marketplace",
    "/add-product",
    "/admin"
  ];

  const showUserInfo = user && showUserInfoPaths.includes(location.pathname);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && showUserInfo) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user, showUserInfo]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <header className="bg-green-700 text-white px-6 py-4 shadow-md">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">AgriSync</h1>
        <nav className="space-x-4 flex items-center">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          <Link to="/marketplace" className="hover:underline">Marketplace</Link>

          {role === "farmer" && (
            <Link to="/add-product" className="hover:underline">Add Product</Link>
          )}

          {!user ? (
            <>
              <Link to="/register" className="hover:underline">Register</Link>
              <Link to="/login" className="hover:underline">Login</Link>
            </>
          ) : (
            <>
              {showUserInfo && (
                <>
                  <span className="text-sm italic">
                    Hi, {userData?.name || user.displayName || user.email}
                  </span>
                  {userData?.photoURL && (
                    <img
                      src={userData.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full ml-2"
                    />
                  )}
                </>
              )}
              <button onClick={handleLogout} className="ml-2 underline text-sm">
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
