import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden h-[70vh]">

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black opacity-40 z-10"></div>

        {/* Video element */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
          poster="https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        >
          <source src="https://drive.google.com/uc?export=download&id=1XP1TVN2N20bNC-c7QUtAUMqPHlGOmJrl" type="video/mp4" />
        </video>

        {/* Profile image overlay */}
        {user && user.photoUrl && (
          <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2 z-30">
            <img
              src={user.photoUrl}
              alt="Seller"
              className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
            />
          </div>
        )}

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
          <div className="max-w-3xl w-full text-center text-white">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to AgriSync AI <span className="text-green-300">🌾</span>
            </h1>
            <p className="text-xl text-white mb-8">
              Connecting farmers with technology, markets, and solutions for a thriving agricultural future
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/register"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-all transform hover:scale-105"
              >
                Get Started
              </Link>
              <Link
                to="/marketplace"
                className="bg-white hover:bg-gray-100 text-green-800 px-8 py-3 rounded-lg font-medium text-lg transition-all transform hover:scale-105"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile (if logged in) */}
      {user && user.photoUrl && (
        <div className="flex justify-center -mt-16 relative z-30">
          <img
            src={user.photoUrl}
            alt="User Profile"
            className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
          />
        </div>
      )}

      {/* Features Section */}
      <div className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-green-800 mb-4">How AgriSync AI Helps You</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform provides comprehensive solutions for modern agricultural challenges
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Feature Cards */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-3xl">🎤</span>
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Voice Reporting</h3>
            <p className="text-gray-600">Describe crop issues with your voice and get AI-powered solutions instantly.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-3xl">🌦️</span>
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Live Weather</h3>
            <p className="text-gray-600">Accurate, location-specific weather forecasts to plan your farming activities.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-3xl">🛒</span>
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Marketplace</h3>
            <p className="text-gray-600">Direct connection between farmers and buyers with no middlemen.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Smart Dashboards</h3>
            <p className="text-gray-600">Personalized dashboards for farmers, buyers, and administrators.</p>
          </div>
        </div>

        {/* Video Demo Section */}
        <div className="mb-16">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <div className="relative pb-[56.25%] h-0 overflow-hidden">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/CqYjC-6cwKU?autoplay=0&rel=0"
                    title="AgriSync AI Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="p-8 md:w-1/2">
                <h3 className="text-2xl font-bold text-green-800 mb-4">See AgriSync AI in Action</h3>
                <p className="text-gray-600 mb-6">
                  Watch our short demo video to see how AgriSync AI can transform your farming or buying experience with cutting-edge technology.
                </p>
                <Link
                  to="/register"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Try It Yourself
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-green-800 mb-8">What Our Users Say</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial Cards */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=987&q=80"
                  alt="Farmer"
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Sarah K.</h4>
                  <p className="text-sm text-gray-500">Maize Farmer, Kenya</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "AgriSync AI helped me identify a pest problem early and saved my entire harvest. The voice reporting is so easy to use!"
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=987&q=80"
                  alt="Buyer"
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">James O.</h4>
                  <p className="text-sm text-gray-500">Produce Buyer, Nigeria</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "The marketplace connects me directly with farmers. I get better prices and they earn more - everyone wins!"
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=1061&q=80"
                  alt="Farmer"
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Amina B.</h4>
                  <p className="text-sm text-gray-500">Vegetable Farmer, Tanzania</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "The weather alerts help me plan irrigation perfectly. My water usage is down 30% and yields are up!"
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-green-700 rounded-xl p-8 md:p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Agriculture?</h3>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and buyers already benefiting from AgriSync AI
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-white hover:bg-gray-100 text-green-800 px-8 py-3 rounded-lg font-medium text-lg transition-all transform hover:scale-105"
            >
              Sign Up Free
            </Link>
            <Link
              to="/marketplace"
              className="bg-transparent hover:bg-green-800 border-2 border-white text-white px-8 py-3 rounded-lg font-medium text-lg transition-all transform hover:scale-105"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
