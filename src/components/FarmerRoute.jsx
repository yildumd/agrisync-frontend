// src/components/FarmerRoute.js

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase"; // Import auth from firebase

const FarmerRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isFarmer, setIsFarmer] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.role === "farmer") {
      setIsFarmer(true); // If the user is a farmer, set isFarmer to true
    } else {
      setIsFarmer(false); // Otherwise, set isFarmer to false
    }
    setLoading(false); // Set loading to false once the check is done
  }, []);

  // Display a loading message while checking the user's role
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if the user is not a farmer
  if (!isFarmer) {
    return <Navigate to="/login" />;
  }

  // Render children (protected content) if the user is a farmer
  return children;
};

export default FarmerRoute;
