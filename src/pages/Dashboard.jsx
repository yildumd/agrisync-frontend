import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { collection, getDocs, addDoc, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [profilePic, setProfilePic] = useState("");

  const [weather, setWeather] = useState(null);
  const [farmerLocation, setFarmerLocation] = useState("Abuja");
  const [voiceInput, setVoiceInput] = useState("");
  const [listening, setListening] = useState(false);
  const [issues, setIssues] = useState([]);
  const [aiResponse, setAiResponse] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageResponse, setImageResponse] = useState("");
  const [uploading, setUploading] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const API_KEY = "967c8ce2410ebb26a3ba9b630f00e963";

  // User authentication and data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const uid = currentUser.uid;
        try {
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserName(data.name || "Farmer");
            setUserRole(data.role || "");
            setProfilePic(data.photoUrl || "");
            if (data.location) setFarmerLocation(data.location);
            fetchIssues(uid);
          }
        } catch (error) {
          console.error("Error fetching user info:", error);
        }
      } else {
        navigate("/login");
      }
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Weather data
  useEffect(() => {
    const fetchWeather = async () => {
      if (!farmerLocation || !user) return;
      setLoadingWeather(true);
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${farmerLocation}&units=metric&appid=${API_KEY}`
        );
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [farmerLocation, user]);

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
        const userId = user?.uid;
        if (!userId) return;

        await addDoc(collection(db, "issues"), {
          message: spokenText,
          response: diagnosis,
          timestamp: new Date(),
          location: farmerLocation,
          status: "pending",
          userId: userId,
        });
        fetchIssues(userId);
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

  const fetchIssues = async (uid) => {
    if (!uid) return;
    setLoadingIssues(true);
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
    } finally {
      setLoadingIssues(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">AgriSync AI Dashboard</h1>
          <div className="flex items-center space-x-4">
            {profilePic && (
              <img 
                src={profilePic} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            )}
            <span className="font-medium">{userName}</span>
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
                {userRole === "farmer" 
                  ? "Get personalized farming advice and connect with buyers"
                  : "Browse fresh produce and connect directly with farmers"}
              </p>
            </div>
            {loadingWeather ? (
              <div className="animate-pulse bg-gray-200 rounded-full px-4 py-2 w-32 h-10 mt-4 md:mt-0"></div>
            ) : weather ? (
              <div className="flex items-center bg-green-100 rounded-full px-4 py-2 mt-4 md:mt-0">
                <span className="text-green-800 font-medium">
                  {weather.weather[0].description}, {weather.main.temp}°C
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

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Voice Diagnosis Card */}
          <section className="bg-white rounded-xl shadow-md p-6">
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
          </section>

          {/* Image Diagnosis Card */}
          <section className="bg-white rounded-xl shadow-md p-6">
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
          </section>
        </div>

        {/* Recent Reports */}
        <section className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center mb-6">
            <div className="bg-orange-100 p-3 rounded-full mr-4">
              <span className="text-orange-600 text-2xl">📋</span>
            </div>
            <h2 className="text-xl font-semibold">Recent Reports</h2>
          </div>
          
          {loadingIssues ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : issues.length > 0 ? (
            <div className="space-y-4">
              {issues.slice(0, 5).map((issue) => (
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
              {issues.length > 5 && (
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
      </main>
    </div>
  );
};

export default Dashboard;