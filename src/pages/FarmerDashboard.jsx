import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { collection, getDocs, addDoc, doc, getDoc, query, where, orderBy, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [recentProducts, setRecentProducts] = useState([]);

  // Weather states
  const [weather, setWeather] = useState(null);
  const [farmerLocation, setFarmerLocation] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(true);
  const API_KEY = "967c8ce2410ebb26a3ba9b630f00e963";

  // Voice/image diagnosis states
  const [voiceInput, setVoiceInput] = useState("");
  const [listening, setListening] = useState(false);
  const [issues, setIssues] = useState([]);
  const [aiResponse, setAiResponse] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageResponse, setImageResponse] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Authentication and user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch user data
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || "Farmer");
            setProfilePic(userData.photoUrl || "");
            if (userData.location) setFarmerLocation(userData.location);
          }
          
          // Fetch products
          fetchFarmerProducts(currentUser.uid);
          // Fetch issues
          fetchIssues(currentUser.uid);
        } catch (error) {
          console.error("Error loading data:", error);
        }
      } else {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        // Try geolocation first
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60000
          });
        });
        
        const { latitude, longitude } = position.coords;
        
        // Get location name
        const locationRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        );
        const locationData = await locationRes.json();
        const locationName = locationData[0]?.name || "Your location";
        setFarmerLocation(locationName);

        // Get weather
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData);

        // Update user location if logged in
        if (user?.uid) {
          await updateDoc(doc(db, "users", user.uid), {
            location: locationName
          });
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
        // Fallback to default location
        const fallbackRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Abuja&units=metric&appid=${API_KEY}`
        );
        const fallbackData = await fallbackRes.json();
        setWeather(fallbackData);
        setFarmerLocation("Abuja");
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [user]);

  // Fetch farmer's products
  const fetchFarmerProducts = async (userId) => {
    try {
      const q = query(
        collection(db, "products"),
        where("sellerId", "==", userId)
      );
      const snapshot = await getDocs(q);
      setProductCount(snapshot.size);
      
      const products = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 3);
      setRecentProducts(products);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // Fetch issues
  const fetchIssues = async (uid) => {
    try {
      const q = query(
        collection(db, "issues"),
        where("userId", "==", uid),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setIssues(fetched);
    } catch (error) {
      console.error("Error fetching issues:", error);
    }
  };

  // Voice recognition
  const startListening = () => {
    if (!window.webkitSpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);

    recognition.onresult = async (event) => {
      const spokenText = event.results?.[0]?.[0]?.transcript || "";
      if (!spokenText) {
        setListening(false);
        return;
      }

      setVoiceInput(spokenText);
      const diagnosis = diagnoseIssue(spokenText);
      setAiResponse(diagnosis);
      setListening(false);

      try {
        await addDoc(collection(db, "issues"), {
          message: spokenText,
          response: diagnosis,
          timestamp: new Date(),
          location: farmerLocation,
          status: "pending",
          userId: user.uid,
        });
        fetchIssues(user.uid);
      } catch (error) {
        console.error("Error saving voice issue:", error);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };
  };

  const diagnoseIssue = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("yellow")) return "Check for nitrogen deficiency. Apply balanced fertilizer.";
    if (lower.includes("blight")) return "Apply copper-based fungicide. Remove affected leaves immediately.";
    if (lower.includes("wilt")) return "Check soil moisture. Improve drainage if waterlogged.";
    if (lower.includes("bug") || lower.includes("insect")) return "Apply neem oil solution. Introduce beneficial insects.";
    return "Issue logged. Our agricultural expert will contact you within 24 hours.";
  };

  // Image processing
  const diagnoseFromImage = (fileName) => {
    if (fileName.toLowerCase().includes("leaf")) {
      return "Leaf appears to show early signs of blight. Recommend copper fungicide.";
    }
    return "Image received. Our AI assistant is analyzing and will update shortly.";
  };

  const handleImageUpload = async () => {
    if (!imageFile || !user) return;
    setUploading(true);
    try {
      const imageRef = ref(storage, `crop_images/${user.uid}/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setImageUrl(downloadURL);

      const aiAnalysis = diagnoseFromImage(imageFile.name);
      setImageResponse(aiAnalysis);

      await addDoc(collection(db, "issues"), {
        imageUrl: downloadURL,
        response: aiAnalysis,
        message: "Image diagnosis",
        timestamp: new Date(),
        location: farmerLocation,
        status: "pending",
        userId: user.uid,
      });

      fetchIssues(user.uid);
      setImageFile(null);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    const tracks = stream?.getTracks();
    tracks?.forEach((track) => track.stop());
    setCameraOn(false);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured_crop_image.jpg", { type: "image/jpeg" });
        setImageFile(file);
        stopCamera();
      }, "image/jpeg");
    }
  };

  // Weather advice
  const getFarmingAdvice = (weatherData) => {
    if (!weatherData) return [];
    
    const { main, weather, wind } = weatherData;
    const conditions = weather[0]?.main.toLowerCase() || "";
    const description = weather[0]?.description.toLowerCase() || "";
    const temp = main?.temp || 0;
    const humidity = main?.humidity || 0;
    const windSpeed = wind?.speed || 0;

    let advice = [];
    
    if (temp < 10) {
      advice.push("❄️ Too cold for most crops. Consider cold frames or greenhouses.");
    } else if (temp > 35) {
      advice.push("🔥 Extreme heat may stress plants. Water early morning/late evening.");
    } else if (temp > 25) {
      advice.push("☀️ Warm weather good for most crops. Ensure adequate watering.");
    } else {
      advice.push("🌡️ Moderate temperatures ideal for planting and growth.");
    }

    if (conditions.includes("rain")) {
      if (description.includes("heavy") || description.includes("shower")) {
        advice.push("🌧️ Heavy rain expected. Avoid field work and protect young plants.");
      } else {
        advice.push("🌦️ Light rain expected. Good for planting and natural irrigation.");
      }
    } else if (conditions.includes("clear")) {
      advice.push("☀️ Clear skies. Ensure adequate irrigation for your crops.");
    }

    if (windSpeed > 8) {
      advice.push("💨 High winds expected. Secure structures and protect delicate plants.");
    }

    if (humidity > 80) {
      advice.push("💧 High humidity may promote fungal diseases. Monitor crops closely.");
    } else if (humidity < 30) {
      advice.push("🏜️ Low humidity increases evaporation. Water more frequently.");
    }

    return advice;
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Farmer Dashboard</h1>
          <div className="flex items-center space-x-4">
            {profilePic && (
              <img 
                src={profilePic} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            )}
            <span className="font-medium">{userName}</span>
            <button 
              onClick={handleLogout}
              className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 px-4">
        {/* Welcome Section */}
        <section className="mb-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Welcome back, {userName}!
              </h2>
              <p className="text-gray-600">
                Manage your farm products and get personalized farming advice
              </p>
            </div>
            {loadingWeather ? (
              <div className="animate-pulse bg-gray-200 rounded-full px-4 py-2 w-32 h-10 mt-4 md:mt-0"></div>
            ) : weather ? (
              <div className="flex items-center bg-green-100 rounded-full px-4 py-2 mt-4 md:mt-0">
                <span className="text-green-800 font-medium">
                  {farmerLocation}: {Math.round(weather.main.temp)}°C
                </span>
                <img 
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`} 
                  alt="Weather icon"
                  className="w-8 h-8 ml-2"
                />
              </div>
            ) : null}
          </div>
        </section>

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

          {/* Weather Advisory Card */}
          {weather && (
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-1">Weather Advisory</h2>
                  {loadingWeather ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-xl font-bold text-blue-600 capitalize">
                      {weather.weather[0].description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{farmerLocation}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <span className="text-blue-600 text-xl">
                    {weather.weather[0].icon.includes('d') ? '☀️' : '🌙'}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                {getFarmingAdvice(weather).slice(0, 2).map((advice, i) => (
                  <p key={i} className="text-sm text-gray-700">{advice}</p>
                ))}
              </div>
            </div>
          )}

          {/* AI Diagnosis Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">Crop Doctor</h2>
                <p className="text-sm text-gray-500 mt-1">Get instant diagnosis</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <span className="text-purple-600 text-xl">🌿</span>
              </div>
            </div>
            <Link
              to="#diagnosis"
              className="mt-4 inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Diagnose Issues
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
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{product.name}</h3>
                      <p className="text-green-600 font-semibold">₦{product.price?.toLocaleString() || '--'}</p>
                      <p className="text-sm text-gray-500">Available: {product.quantity} {product.unit || 'kg'}</p>
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

        {/* Diagnosis Tools Section */}
        <section id="diagnosis" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Voice Diagnosis Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <span className="text-blue-600 text-2xl">🎤</span>
              </div>
              <h2 className="text-xl font-semibold">Voice Diagnosis</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Describe your crop issues with your voice and get instant AI-powered solutions.
            </p>
            
            <button
              onClick={startListening}
              disabled={listening}
              className={`px-6 py-3 rounded-lg font-medium w-full flex items-center justify-center ${
                listening 
                  ? "bg-blue-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white transition-colors`}
            >
              {listening ? (
                <>
                  <span className="animate-pulse mr-2">🔴</span> Listening...
                </>
              ) : (
                "Start Speaking"
              )}
            </button>
            
            {voiceInput && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800">You said:</p>
                <p className="text-gray-800">{voiceInput}</p>
              </div>
            )}
            
            {aiResponse && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-green-600 mr-2">🌱</span>
                  <div>
                    <p className="font-medium text-green-800">AI Response:</p>
                    <p className="text-gray-800">{aiResponse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image Diagnosis Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <span className="text-purple-600 text-2xl">📷</span>
              </div>
              <h2 className="text-xl font-semibold">Image Diagnosis</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Upload or capture an image of your crops for instant analysis.
            </p>
            
            {!cameraOn ? (
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-green-50 file:text-green-700
                    hover:file:bg-green-100"
                />
                
                <button 
                  onClick={startCamera}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium w-full"
                >
                  Open Camera
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                
                <div className="flex space-x-3">
                  <button 
                    onClick={captureImage}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Capture
                  </button>
                  <button 
                    onClick={stopCamera}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}
            
            <canvas ref={canvasRef} style={{ display: "none" }} />
            
            <button
              onClick={handleImageUpload}
              disabled={!imageFile || uploading}
              className={`mt-4 px-6 py-3 rounded-lg font-medium w-full ${
                !imageFile || uploading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } text-white transition-colors`}
            >
              {uploading ? "Uploading..." : "Upload & Diagnose"}
            </button>
            
            {imageResponse && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-green-600 mr-2">🌿</span>
                  <div>
                    <p className="font-medium text-green-800">AI Diagnosis:</p>
                    <p className="text-gray-800">{imageResponse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent Reports */}
        <section className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-orange-100 p-3 rounded-full mr-4">
              <span className="text-orange-600 text-2xl">📋</span>
            </div>
            <h2 className="text-xl font-semibold">Recent Reports</h2>
          </div>
          
          {issues.length > 0 ? (
            <div className="space-y-4">
              {issues.slice(0, 3).map((issue) => (
                <div key={issue.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {issue.message || "Image diagnosis"}
                      </h3>
                      <p className="text-gray-600 mt-1">{issue.response}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(issue.timestamp?.seconds * 1000).toLocaleString()}
                      </p>
                    </div>
                    {issue.imageUrl && (
                      <img 
                        src={issue.imageUrl} 
                        alt="Crop issue" 
                        className="w-16 h-16 object-cover rounded-lg ml-4"
                      />
                    )}
                  </div>
                </div>
              ))}
              {issues.length > 3 && (
                <Link 
                  to="/reports" 
                  className="block text-center text-green-600 hover:text-green-800 mt-4"
                >
                  View all reports →
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No reports found yet.</p>
              <p className="text-gray-400 mt-2">Use voice or image diagnosis to create your first report</p>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <p className="font-medium text-gray-700">Marketplace</p>
          </Link>
          <Link
            to="/orders"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="bg-orange-100 text-orange-600 p-3 rounded-full inline-block mb-2">
              <span className="text-xl">📦</span>
            </div>
            <p className="font-medium text-gray-700">Orders</p>
          </Link>
          <Link
            to="/chat"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="bg-purple-100 text-purple-600 p-3 rounded-full inline-block mb-2">
              <span className="text-xl">💬</span>
            </div>
            <p className="font-medium text-gray-700">Messages</p>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default FarmerDashboard;