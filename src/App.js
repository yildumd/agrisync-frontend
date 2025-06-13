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
import EditProduct from "./pages/EditProduct";
import BuyerDashboard from "./pages/BuyerDashboard";
import FarmerDashboard from "./pages/FarmerDashboard";
import AdminPanel from "./components/AdminPanel";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import MessagesPage from "./pages/MessagesPage";
import CartPage from "./components/CartPage";
import LoadingSpinner from "./components/LoadingSpinner";

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Routes>
      {/* Home redirect logic */}
      <Route
        path="/"
        element={
          user ? (
            role === "farmer" ? (
              <Navigate to="/dashboard/farmer" replace />
            ) : role === "buyer" ? (
              <Navigate to="/dashboard/buyer" replace />
            ) : role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/marketplace" replace />
            )
          ) : (
            <Home />
          )
        }
      />

      {/* Public Routes */}
      <Route path="/register" element={<Register />} />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route path="/marketplace" element={<Marketplace />} />

      {/* Protected Routes - Only change is replacing "/login" with "/" in Navigate */}
      <Route 
        path="/dashboard" 
        element={user ? <Dashboard /> : <Navigate to="/" replace />} 
      />
      <Route
        path="/dashboard/farmer"
        element={
          user && role === "farmer" ? (
            <FarmerDashboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/add-product"
        element={
          user && role === "farmer" ? (
            <AddProduct />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/edit-product/:productId"
        element={
          user && role === "farmer" ? (
            <EditProduct />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/dashboard/buyer"
        element={
          user && role === "buyer" ? (
            <BuyerDashboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/admin"
        element={
          user && role === "admin" ? (
            <AdminPanel />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Orders and Cart Routes */}
      <Route
        path="/orders/:productId?"
        element={user ? <OrdersPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/cart"
        element={user ? <CartPage /> : <Navigate to="/" replace />}
      />

      {/* Messages Routes */}
      <Route
        path="/messages/:userId"
        element={user ? <MessagesPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/messages"
        element={user ? <MessagesPage /> : <Navigate to="/" replace />}
      />

      {/* Other Routes */}
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