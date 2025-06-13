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
  const [orders, setOrders] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

  // Weather states
  const [weather, setWeather] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState([]);
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
  const streamRef = useRef(null);

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
          // Fetch orders
          fetchOrders(currentUser.uid);
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

        // Get current weather
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData);

        // Get 5-day forecast (3-hour intervals)
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
        );
        const forecastData = await forecastRes.json();
        
        // Process forecast to get daily data (next 2 days)
        const dailyForecast = [];
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        
        // Filter for noon forecasts (most representative of the day)
        forecastData.list.forEach(item => {
          const forecastDate = new Date(item.dt * 1000);
          if (forecastDate.getHours() === 12 && 
              (forecastDate.getDate() === tomorrow.getDate() || 
               forecastDate.getDate() === dayAfter.getDate())) {
            dailyForecast.push({
              date: forecastDate,
              temp: item.main.temp,
              description: item.weather[0].description,
              icon: item.weather[0].icon,
              humidity: item.main.humidity,
              wind: item.wind.speed
            });
          }
        });
        
        setWeatherForecast(dailyForecast);

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
        
        // Mock forecast data for fallback
        setWeatherForecast([
          {
            date: new Date(new Date().setDate(new Date().getDate() + 1)),
            temp: 28,
            description: "Partly cloudy",
            icon: "03d",
            humidity: 65,
            wind: 3.5
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() + 2)),
            temp: 30,
            description: "Sunny",
            icon: "01d",
            humidity: 55,
            wind: 2.8
          }
        ]);
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
        where("sellerId", "==", userId),
        orderBy("createdAt", "desc")
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

  // Fetch orders
  const fetchOrders = async (userId) => {
    try {
      const q = query(
        collection(db, "orders"),
        where("sellerId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        formattedDate: new Date(doc.data().createdAt?.seconds * 1000).toLocaleDateString()
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Fetch issues
  const fetchIssues = async (uid) => {
    try {
      const q = query(
        collection(db, "reports"),
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

  // Update profile picture
  const updateProfilePicture = async () => {
    if (!newProfilePic || !user) return;
    setUploadingProfilePic(true);
    
    try {
      // Upload to Cloudinary
      const cloudinaryData = new FormData();
      cloudinaryData.append("file", newProfilePic);
      cloudinaryData.append("upload_preset", "agrisync_upload");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dyweczdw2/image/upload",
        {
          method: "POST",
          body: cloudinaryData,
        }
      );

      if (!res.ok) throw new Error("Photo upload failed");

      const cloudinaryRes = await res.json();
      const photoUrl = cloudinaryRes.secure_url;

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        photoUrl: photoUrl
      });

      // Update local state
      setProfilePic(photoUrl);
      setShowProfileModal(false);
      setNewProfilePic(null);
    } catch (error) {
      console.error("Error updating profile picture:", error);
      alert("Failed to update profile picture");
    } finally {
      setUploadingProfilePic(false);
    }
  };

  // Advanced AI Diagnosis using Plant.id API
  const diagnoseWithPlantId = async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append("images", imageFile);
      formData.append("key", "YOUR_PLANT_ID_API_KEY"); // Replace with your actual API key

      const response = await fetch("https://api.plant.id/v2/identify", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("AI diagnosis failed");

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        const topSuggestion = data.suggestions[0];
        const diseaseInfo = topSuggestion.diseases && topSuggestion.diseases.length > 0 
          ? `Possible disease: ${topSuggestion.diseases[0].name}. ${topSuggestion.diseases[0].treatment.prevention.join(" ")}`
          : "No diseases detected.";
        
        return `Identified as ${topSuggestion.plant_name} (${Math.round(topSuggestion.probability * 100)}% match). ${diseaseInfo}`;
      }
      
      return "Plant identification completed but no specific matches found.";
    } catch (error) {
      console.error("Plant.id API error:", error);
      return "Advanced analysis failed. Falling back to basic diagnosis.";
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
      const diagnosis = await diagnoseIssue(spokenText);
      setAiResponse(diagnosis);
      setListening(false);

      try {
        await addDoc(collection(db, "reports"), {
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

  const diagnoseIssue = async (text) => {
    try {
      // First try with Plant.id API (for voice)
      const response = await fetch("https://api.plant.id/v2/health_assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": "YOUR_PLANT_ID_API_KEY" // Replace with your actual API key
        },
        body: JSON.stringify({
          description: text,
          latitude: 0, // You can get these from geolocation
          longitude: 0,
          similar_images: true
        })
      });

      if (!response.ok) throw new Error("AI diagnosis failed");

      const data = await response.json();
      
      if (data.health_assessment && data.health_assessment.length > 0) {
        const assessment = data.health_assessment[0];
        return `Possible issue: ${assessment.disease.name}. Recommendation: ${assessment.disease.treatment.prevention.join(" ")}`;
      }
      
      // Fallback to basic diagnosis if API fails
      const lower = text.toLowerCase();
      if (lower.includes("yellow")) return "Check for nitrogen deficiency. Apply balanced fertilizer.";
      if (lower.includes("blight")) return "Apply copper-based fungicide. Remove affected leaves immediately.";
      if (lower.includes("wilt")) return "Check soil moisture. Improve drainage if waterlogged.";
      if (lower.includes("bug") || lower.includes("insect")) return "Apply neem oil solution. Introduce beneficial insects.";
      return "Issue logged. Our agricultural expert will contact you within 24 hours.";
    } catch (error) {
      console.error("AI diagnosis error:", error);
      return "Our AI assistant is currently unavailable. Your issue has been logged and an expert will contact you shortly.";
    }
  };

  // Image processing
  const handleImageUpload = async () => {
    if (!imageFile || !user) return;
    setUploading(true);
    try {
      // First upload to storage
      const imageRef = ref(storage, `crop_images/${user.uid}/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setImageUrl(downloadURL);

      // Get diagnosis from Plant.id API
      const aiAnalysis = await diagnoseWithPlantId(imageFile);
      setImageResponse(aiAnalysis);

      // Save to database
      await addDoc(collection(db, "reports"), {
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
      setImageResponse("Error processing image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'environment', // Prefer rear camera for mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
    }
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
      }, "image/jpeg", 0.9); // 90% quality
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
      advice.push("🌱 Delay planting of sensitive crops until temperatures rise.");
      advice.push("💧 Reduce irrigation frequency to prevent waterlogging in cold soils.");
    } else if (temp > 35) {
      advice.push("🔥 Extreme heat may stress plants. Water early morning/late evening.");
      advice.push("🌿 Provide shade for sensitive plants during peak heat hours.");
      advice.push("💦 Increase watering frequency but avoid midday watering to reduce evaporation.");
    } else if (temp > 25) {
      advice.push("☀️ Warm weather good for most crops. Ensure adequate watering.");
      advice.push("🌾 Ideal conditions for planting warm-season crops like maize and beans.");
      advice.push("🕒 Water in early morning to maximize absorption and minimize evaporation.");
    } else {
      advice.push("🌡️ Moderate temperatures ideal for planting and growth.");
      advice.push("🌻 Good conditions for most farming activities.");
    }

    if (conditions.includes("rain")) {
      if (description.includes("heavy") || description.includes("shower")) {
        advice.push("🌧️ Heavy rain expected. Avoid field work and protect young plants.");
        advice.push("🚜 Postpone fertilizer application to prevent runoff.");
        advice.push("🌱 Check drainage systems to prevent waterlogging.");
      } else {
        advice.push("🌦️ Light rain expected. Good for planting and natural irrigation.");
        advice.push("🌿 Take advantage of moist soil for transplanting seedlings.");
      }
    } else if (conditions.includes("clear")) {
      advice.push("☀️ Clear skies. Ensure adequate irrigation for your crops.");
      advice.push("🌱 Good day for harvesting and drying crops.");
    }

    if (windSpeed > 8) {
      advice.push("💨 High winds expected. Secure structures and protect delicate plants.");
      advice.push("🌾 Avoid spraying pesticides or herbicides which may drift.");
      advice.push("🌱 Stake young plants to prevent wind damage.");
    }

    if (humidity > 80) {
      advice.push("💧 High humidity may promote fungal diseases. Monitor crops closely.");
      advice.push("🍄 Consider applying fungicide preventatively for susceptible crops.");
      advice.push("🌱 Space plants adequately to improve air circulation.");
    } else if (humidity < 30) {
      advice.push("🏜️ Low humidity increases evaporation. Water more frequently.");
      advice.push("🌿 Mulch around plants to retain soil moisture.");
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
            <div className="relative">
              {profilePic ? (
                <img 
                  src={profilePic} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
                  onClick={() => setShowProfileModal(true)}
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer"
                  onClick={() => setShowProfileModal(true)}
                >
                  <span className="text-gray-600 text-lg">{userName.charAt(0)}</span>
                </div>
              )}
            </div>
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

      {/* Profile Picture Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Update Profile Picture</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewProfilePic(e.target.files[0])}
              className="mb-4"
            />
            {newProfilePic && (
              <img 
                src={URL.createObjectURL(newProfilePic)} 
                alt="Preview" 
                className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
              />
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setNewProfilePic(null);
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Cancel
              </button>
              <button
                onClick={updateProfilePicture}
                disabled={!newProfilePic || uploadingProfilePic}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
              >
                {uploadingProfilePic ? "Uploading..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Weather Advisory Section */}
        {weather && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">🌤️</span>
                Weather Forecast (Next 2 Days)
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Weather */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Today</h3>
                  <div className="flex items-center mb-2">
                    <img 
                      src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`} 
                      alt="Weather icon"
                      className="w-12 h-12"
                    />
                    <div className="ml-2">
                      <p className="text-xl font-bold">{Math.round(weather.main.temp)}°C</p>
                      <p className="capitalize">{weather.weather[0].description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Humidity</p>
                      <p>{weather.main.humidity}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Wind</p>
                      <p>{weather.wind.speed} m/s</p>
                    </div>
                  </div>
                </div>

                {/* Forecast Days */}
                {weatherForecast.map((day, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">
                      {day.date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </h3>
                    <div className="flex items-center mb-2">
                      <img 
                        src={`https://openweathermap.org/img/wn/${day.icon}.png`} 
                        alt="Weather icon"
                        className="w-12 h-12"
                      />
                      <div className="ml-2">
                        <p className="text-xl font-bold">{Math.round(day.temp)}°C</p>
                        <p className="capitalize">{day.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Humidity</p>
                        <p>{day.humidity}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Wind</p>
                        <p>{day.wind} m/s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Farming Advice */}
              <div className="mt-6">
                <h3 className="font-medium text-green-800 mb-2">Farming Recommendations</h3>
                <ul className="space-y-2">
                  {getFarmingAdvice(weather).map((advice, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
              to="/add-product"
              className="mt-4 inline-block text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Add new product →
            </Link>
          </div>

          {/* Orders Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">Recent Orders</h2>
                {loading ? (
                  <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                ) : (
                  <p className="text-3xl font-bold text-orange-600">{orders.length}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Total orders received</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <span className="text-orange-600 text-xl">📋</span>
              </div>
            </div>
            <Link
              to="/orders"
              className="mt-4 inline-block text-orange-600 hover:text-orange-800 text-sm font-medium"
            >
              View all orders →
            </Link>
          </div>

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
                to="/add-product"
                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Your First Product
              </Link>
            </div>
          )}
        </div>

        {/* Recent Orders Section */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="bg-orange-100 text-orange-600 p-2 rounded-lg mr-3">📋</span>
                Recent Orders
              </h2>
            </div>
            
            <div className="divide-y">
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        Order #{order.id.substring(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">{order.formattedDate}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''} • ₦{order.totalAmount?.toLocaleString() || '--'}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                      <Link 
                        to={`/orders/${order.id}`}
                        className="ml-3 text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {orders.length > 3 && (
              <div className="p-4 text-center border-t">
                <Link 
                  to="/orders" 
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  View all orders →
                </Link>
              </div>
            )}
          </div>
        )}

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
              Upload or capture an image of your crops for instant analysis using our advanced AI.
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
                  playsInline
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
            
            {imageFile && (
              <div className="mt-4 p-2 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Selected image:</p>
                <img 
                  src={URL.createObjectURL(imageFile)} 
                  alt="Preview" 
                  className="w-full h-32 object-contain rounded"
                />
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
            to="/add-product"
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
          {/* Changed from /chat to /messages */}
<Link
  to="/messages"
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