import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DashboardRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role === "farmer") {
      navigate("/dashboard/farmer");
    } else if (role === "buyer") {
      navigate("/dashboard/buyer");
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return <div>Redirecting...</div>;
};

export default DashboardRedirect;
