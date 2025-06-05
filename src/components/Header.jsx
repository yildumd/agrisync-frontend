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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Paths where user info should be shown
  const showUserInfoPaths = [
    "/dashboard",
    "/dashboard/farmer",
    "/dashboard/buyer",
    "/marketplace",
    "/add-product",
    "/admin",
    "/orders",
    "/profile"
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
    try {
      await signOut(auth);
      navigate("/login");
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-green-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="https://res.cloudinary.com/dyweczdw2/image/upload/v1749120256/Agrisync_Logo_v8lrij.png"
                alt="AgriSync Logo"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === "/" ? "bg-green-800" : "hover:bg-green-600"
                }`}
              >
                Home
              </Link>
              <Link
                to="/marketplace"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname.startsWith("/marketplace") ? "bg-green-800" : "hover:bg-green-600"
                }`}
              >
                Marketplace
              </Link>
              
              {role === "farmer" && (
                <Link
                  to="/add-product"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === "/add-product" ? "bg-green-800" : "hover:bg-green-600"
                  }`}
                >
                  Add Product
                </Link>
              )}

              {role === "buyer" && (
                <Link
                  to="/orders"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === "/orders" ? "bg-green-800" : "hover:bg-green-600"
                  }`}
                >
                  My Orders
                </Link>
              )}

              {user ? (
                <div className="ml-4 flex items-center md:ml-6">
                  <div className="relative">
                    <div className="flex items-center space-x-2 cursor-pointer group">
                      {userData?.photoURL ? (
                        <img
                          className="h-8 w-8 rounded-full border-2 border-white"
                          src={userData.photoURL}
                          alt="Profile"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white text-green-700 flex items-center justify-center font-bold">
                          {userData?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {userData?.name || user.email.split("@")[0]}
                      </span>
                    </div>
                    
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Your Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    to="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-600"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2 rounded-md text-sm font-medium bg-white text-green-700 hover:bg-gray-100"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {user && (
              <div className="mr-4 flex items-center">
                {userData?.photoURL ? (
                  <img
                    className="h-8 w-8 rounded-full border-2 border-white"
                    src={userData.photoURL}
                    alt="Profile"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white text-green-700 flex items-center justify-center font-bold">
                    {userData?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-green-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-green-800 pb-3 px-2">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === "/" ? "bg-green-700" : "hover:bg-green-600"
              }`}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname.startsWith("/marketplace") ? "bg-green-700" : "hover:bg-green-600"
              }`}
            >
              Marketplace
            </Link>
            
            {role === "farmer" && (
              <Link
                to="/add-product"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === "/add-product" ? "bg-green-700" : "hover:bg-green-600"
                }`}
              >
                Add Product
              </Link>
            )}

            {role === "buyer" && (
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === "/orders" ? "bg-green-700" : "hover:bg-green-600"
                }`}
              >
                My Orders
              </Link>
            )}

            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === "/profile" ? "bg-green-700" : "hover:bg-green-600"
                  }`}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-green-600"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-green-600"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium bg-white text-green-700 hover:bg-gray-100"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;