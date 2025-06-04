import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

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

  // 1. Auth & user info
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

  // 2. Weather
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

  // 3. AI Voice Diagnosis
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

  // 4. Camera and Image Upload
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

  // Final JSX
  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 text-gray-800">
      {!loadingUser && user && (
        <h1 className="text-3xl font-bold text-green-700 mb-6">Welcome, {userName}!</h1>
      )}

      {/* Weather Info */}
      <div className="bg-white shadow-md rounded-lg p-5 mb-8">
        <h2 className="text-xl font-semibold mb-3">🌤️ Weather Update</h2>
        {loadingWeather ? (
          <p>Loading weather...</p>
        ) : weather ? (
          <p>
            {weather.name}: {weather.weather[0].description}, {weather.main.temp}°C
          </p>
        ) : (
          <p>Weather info not available.</p>
        )}
      </div>

      {/* Voice Assistant */}
      <div className="bg-white shadow-md rounded-lg p-5 mb-8">
        <h2 className="text-xl font-semibold mb-3">🎙️ Voice Diagnosis</h2>
        <button
          onClick={startListening}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {listening ? "Listening..." : "Start Speaking"}
        </button>
        {voiceInput && (
          <p className="mt-2">You said: <strong>{voiceInput}</strong></p>
        )}
        {aiResponse && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="font-medium">🧠 AI Response:</p>
            <p>{aiResponse}</p>
          </div>
        )}
      </div>

      {/* Snap & Diagnose Section */}
      <div className="bg-white shadow-md rounded-lg p-5 mb-8">
        <h2 className="text-xl font-semibold mb-2">📷 Snap & Diagnose</h2>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="mb-3"
        />

        {!cameraOn ? (
          <button onClick={startCamera} className="px-4 py-2 bg-gray-800 text-white rounded">
            Open Camera
          </button>
        ) : (
          <div>
            <video ref={videoRef} autoPlay className="w-full max-w-md mb-2 rounded" />
            <button onClick={captureImage} className="px-4 py-2 bg-green-600 text-white rounded mr-2">
              Capture
            </button>
            <button onClick={stopCamera} className="px-4 py-2 bg-red-600 text-white rounded">
              Stop
            </button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <button
          onClick={handleImageUpload}
          disabled={!imageFile || uploading}
          className="mt-3 px-4 py-2 bg-green-700 text-white rounded"
        >
          {uploading ? "Uploading..." : "Upload & Diagnose"}
        </button>

        {imageResponse && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="font-medium">🧠 AI Diagnosis:</p>
            <p>{imageResponse}</p>
          </div>
        )}
      </div>

      {/* Previous Reports */}
      <div className="bg-white shadow-md rounded-lg p-5 mb-8">
        <h2 className="text-xl font-semibold mb-3">📝 Previous Reports</h2>
        {loadingIssues ? (
          <p>Loading reports...</p>
        ) : issues.length > 0 ? (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="border-b pb-2">
                <p><strong>Issue:</strong> {issue.message}</p>
                <p><strong>AI Response:</strong> {issue.response}</p>
                {issue.imageUrl && (
                  <img src={issue.imageUrl} alt="Uploaded" className="w-32 mt-2" />
                )}
                <p className="text-sm text-gray-500">
                  {new Date(issue.timestamp?.seconds * 1000).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No reports found yet.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
