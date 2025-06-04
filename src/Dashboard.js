import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";

const Dashboard = () => {
  const [weather, setWeather] = useState(null);
  const [farmerLocation, setFarmerLocation] = useState("Abuja");
  const [voiceInput, setVoiceInput] = useState("");
  const [listening, setListening] = useState(false);
  const [issues, setIssues] = useState([]);
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(true);

  const [imageFile, setImageFile] = useState(null); // 🌱 Image state
  const [description, setDescription] = useState(""); // 🌱 Text input
  const [imageAnalysis, setImageAnalysis] = useState(""); // 🌱 AI result

  const API_KEY = "967c8ce2410ebb26a3ba9b630f00e963";
  const user = JSON.parse(localStorage.getItem("user"));

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please use Google Chrome on desktop.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;
      setVoiceInput(spokenText);
      setListening(false);

      const diagnosis = diagnoseIssue(spokenText);
      setAiResponse(diagnosis);

      try {
        await addDoc(collection(db, "issues"), {
          message: spokenText,
          response: diagnosis,
          timestamp: new Date().toISOString(),
          location: farmerLocation,
          status: "pending",
          userId: user?.uid || null,
        });
        fetchIssues();
      } catch (error) {
        console.error("Error saving voice issue:", error);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert("Speech recognition failed. Please try again.");
      setListening(false);
    };
  };

  const diagnoseIssue = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("yellow")) return "Check for nitrogen deficiency. Apply balanced fertilizer.";
    if (lowerText.includes("blight")) return "Apply copper-based fungicide. Remove affected leaves immediately.";
    if (lowerText.includes("wilt")) return "Check soil moisture. Improve drainage if waterlogged.";
    if (lowerText.includes("bug") || lowerText.includes("insect"))
      return "Apply neem oil solution. Introduce beneficial insects.";
    return "Issue logged. Our agricultural expert will contact you within 24 hours.";
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      if (!user?.uid) return;
      const q = query(collection(db, "issues"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedIssues = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setIssues(fetchedIssues.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      console.error("Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSubmit = async () => {
    if (!imageFile || !description) {
      alert("Please select an image and provide a short description.");
      return;
    }

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", "your_upload_preset"); // ⬅️ Replace with your Cloudinary preset
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      // Simulated analysis result for now
      const simulatedResult = `AI Analysis for image: Possible fungal infection based on pattern. Recommendation: Apply fungicide.`;

      setImageAnalysis(simulatedResult);

      await addDoc(collection(db, "issues"), {
        message: description,
        response: simulatedResult,
        imageUrl: data.secure_url,
        timestamp: new Date().toISOString(),
        location: farmerLocation,
        status: "pending",
        userId: user?.uid || null,
      });

      fetchIssues();
      setImageFile(null);
      setDescription("");
    } catch (error) {
      console.error("Image upload or analysis failed:", error);
      alert("Failed to upload or analyze the image.");
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        if (!user?.uid) return;
        const q = query(collection(db, "farmers"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const farmer = querySnapshot.docs[0].data();
          if (farmer.location) {
            setFarmerLocation(farmer.location);
          }
        }
      } catch (error) {
        console.error("Error fetching farmer location:", error);
      }
    };

    fetchLocation();
    fetchIssues();
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      if (!farmerLocation) return;
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${farmerLocation}&units=metric&appid=${API_KEY}`
        );
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [farmerLocation]);

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <h1 className="text-3xl font-bold text-green-700 mb-6">
        Hi {user?.name || "Farmer"}!
      </h1>

      {/* ... Weather, Crop Health, Marketplace, Alerts ... */}

      {/* 🎤 Voice Reporting Section ... */}

      {/* 📸 Image Upload Section */}
      <div className="bg-white shadow-md rounded-lg p-5 mt-8">
        <h2 className="text-xl font-semibold mb-2">📸 Snap a Picture of Your Crop</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="mb-3"
        />
        <textarea
          placeholder="Describe the problem..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />
        <button
          onClick={handleImageSubmit}
          className="bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Submit for Analysis
        </button>

        {imageAnalysis && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="font-medium text-green-800">🌿 AI Result:</p>
            <p>{imageAnalysis}</p>
          </div>
        )}
      </div>

      {/* ... Previous Reports Section ... */}
    </div>
  );
};

export default Dashboard;
