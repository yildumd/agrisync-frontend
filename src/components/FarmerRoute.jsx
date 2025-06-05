// src/components/FarmerRoute.js
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import LoadingSpinner from "./LoadingSpinner"; // Create a separate loading component

const FarmerRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isFarmer, setIsFarmer] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check user role in Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsFarmer(userData.role === "farmer");
          } else {
            setIsFarmer(false);
          }
        } catch (error) {
          console.error("Error verifying user role:", error);
          setIsFarmer(false);
        }
      } else {
        setIsFarmer(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isFarmer) {
    // Redirect to login with state to show appropriate message
    return <Navigate to="/login" state={{ from: "farmer" }} />;
  }

  return children;
};

export default FarmerRoute;