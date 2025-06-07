import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components and Pages
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Marketplace from "./pages/Marketplace";
import AddProduct from "./pages/AddProduct";
import BuyerDashboard from "./pages/BuyerDashboard";
import FarmerDashboard from "./pages/FarmerDashboard";
import AdminPanel from "./components/AdminPanel";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage"; // ✅ NEW IMPORT
import ChatPage from "./pages/ChatPage";
import ChatInbox from "./pages/ChatInbox";

// Route Guards
import ProtectedRoute from "./components/ProtectedRoute";
import FarmerRoute from "./components/FarmerRoute";
import BuyerRoute from "./components/BuyerRoute";
import PrivateRoute from "./components/PrivateRoute";

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            role === "farmer" ? <Navigate to="/dashboard/farmer" /> :
            role === "buyer" ? <Navigate to="/dashboard/buyer" /> :
            role === "admin" ? <Navigate to="/admin" /> :
            <Navigate to="/login" />
          ) : (
            <Home />
          )
        }
      />

      {/* Public Routes */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/marketplace" element={<Marketplace />} />

      {/* Dashboards */}
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/dashboard/farmer" element={user && role === "farmer" ? <FarmerDashboard /> : <Navigate to="/login" />} />
      <Route path="/add-product" element={user && role === "farmer" ? <AddProduct /> : <Navigate to="/login" />} />
      <Route path="/dashboard/buyer" element={user && role === "buyer" ? <BuyerDashboard /> : <Navigate to="/login" />} />
      <Route path="/admin" element={user && role === "admin" ? <AdminPanel /> : <Navigate to="/login" />} />

      {/* ✅ Orders Page for all logged-in users */}
      <Route path="/orders" element={user ? <OrdersPage /> : <Navigate to="/login" />} />

      {/* Chat Routes */}
      <Route path="/inbox" element={user ? <ChatInbox /> : <Navigate to="/login" />} />
      <Route path="/chat/:chatId" element={user ? <ChatPage /> : <Navigate to="/login" />} />

      {/* Other */}
      <Route path="/verify-email" element={<div>Please verify your email to access this page.</div>} />
      <Route path="*" element={<div className="text-center mt-20 text-red-600 text-xl">404 - Page Not Found</div>} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
