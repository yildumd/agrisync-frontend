// src/components/BuyerRoute.js

import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

const BuyerRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isBuyer, setIsBuyer] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    // Check if the user has a "buyer" role
    if (user && user.role === "buyer") {
      setIsBuyer(true);
    } else {
      setIsBuyer(false);
    }

    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Show loading while checking the role
  }

  // If the user is not a buyer, redirect them to the login page
  if (!isBuyer) {
    return <Navigate to="/login" />;
  }

  // Render the children (protected content) if the user is a buyer
  return children;
};

export default BuyerRoute;
