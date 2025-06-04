// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("farmer");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    crop: "",
  });
  const [photoFile, setPhotoFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1. Create the user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // 2. Upload photo if provided
      let photoUrl = "";
      if (photoFile) {
        const cloudinaryData = new FormData();
        cloudinaryData.append("file", photoFile);
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
        photoUrl = cloudinaryRes.secure_url;
      }

      // 3. Prepare user data (remove password from saved object)
      const { password, ...userDataToSave } = formData;

      const userData = {
        uid: user.uid,
        role,
        ...userDataToSave,
        photoUrl,
        createdAt: new Date().toISOString(),
      };

      // 4. Save to Firestore (general + role collection)
      await setDoc(doc(db, "users", user.uid), userData);
      const roleCollection = role === "farmer" ? "farmers" : "buyers";
      await setDoc(doc(db, roleCollection, user.uid), userData);

      // 5. Save to localStorage
      localStorage.setItem("user", JSON.stringify(userData));

      alert("Registration successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("Email already in use.");
      } else {
        alert("Registration failed: " + error.message);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold text-center text-green-700 mb-6">
        Register as {role === "farmer" ? "Farmer" : "Buyer"}
      </h2>

      <div className="mb-4 flex justify-center space-x-4">
        <button
          type="button"
          onClick={() => setRole("farmer")}
          className={`px-4 py-2 rounded-md ${
            role === "farmer" ? "bg-green-700 text-white" : "bg-gray-200"
          }`}
        >
          Farmer
        </button>
        <button
          type="button"
          onClick={() => setRole("buyer")}
          className={`px-4 py-2 rounded-md ${
            role === "buyer" ? "bg-green-700 text-white" : "bg-gray-200"
          }`}
        >
          Buyer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />

        {role === "farmer" && (
          <input
            type="text"
            name="crop"
            placeholder="What produce do you sell?"
            value={formData.crop}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
        )}

        {/* Optional: allow both farmers and buyers to upload a profile picture */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border rounded-md"
          required={role === "farmer"} // required only for farmers
        />

        <button
          type="submit"
          className="w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;
