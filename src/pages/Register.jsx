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
    confirmPassword: "",
    phone: "",
    country: "",
    state: "",
    address: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countries = [
    { name: "Nigeria", code: "NG", states: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", 
      "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", 
      "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", 
      "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", 
      "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", 
      "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
    ]},
    { name: "Ghana", code: "GH", states: [
      "Greater Accra", "Ashanti", "Western", "Central", "Eastern", 
      "Volta", "Northern", "Upper East", "Upper West", "Brong-Ahafo"
    ]},
    { name: "Kenya", code: "KE", states: [
      "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", 
      "Machakos", "Meru", "Kiambu", "Kakamega", "Bungoma"
    ]},
    { name: "South Africa", code: "ZA", states: [
      "Gauteng", "KwaZulu-Natal", "Western Cape", "Eastern Cape",
      "Limpopo", "Mpumalanga", "Free State", "North West", "Northern Cape"
    ]},
    { name: "Tanzania", code: "TZ", states: [
      "Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Mbeya",
      "Morogoro", "Tanga", "Kilimanjaro", "Kigoma", "Rukwa",
      "Katavi", "Njombe", "Manyara", "Simiyu", "Geita"
    ]},
    { name: "Ethiopia", code: "ET", states: [
      "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz",
      "Dire Dawa", "Gambela", "Harari", "Oromia", "Somali",
      "Southern Nations, Nationalities, and Peoples' Region (SNNPR)",
      "Tigray"
    ]},
    { name: "Egypt", code: "EG", states: [
      "Cairo", "Alexandria", "Giza", "Luxor", "Aswan",
      "Port Said", "Suez", "Sharm El Sheikh", "Hurghada",
      "Mansoura", "Tanta", "Ismailia", "Faiyum", "Asyut",
      "Zagazig", "Damanhur", "Beni Suef", "Minya", "Qena"
    ]}
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    
    if (name === "country") {
      setFormData(prev => ({ ...prev, state: "" }));
    }
  };

  const handleFileChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Email is invalid";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.country) newErrors.country = "Country is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.address) newErrors.address = "Address is required";
    
    if (role === "farmer" && !photoFile) {
      newErrors.photo = "Profile photo is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

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

      const { password, confirmPassword, ...userDataToSave } = formData;

      const userData = {
        uid: user.uid,
        role,
        ...userDataToSave,
        photoUrl,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", user.uid), userData);
      const roleCollection = role === "farmer" ? "farmers" : "buyers";
      await setDoc(doc(db, roleCollection, user.uid), userData);

      localStorage.setItem("user", JSON.stringify(userData));

      alert("Registration successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === "auth/email-already-in-use") {
        setErrors({ ...errors, email: "Email already in use" });
      } else {
        alert("Registration failed: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCountry = countries.find(c => c.name === formData.country);

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold text-center text-green-700 mb-6">
        Register as {role === "farmer" ? "Farmer" : "Buyer"}
      </h2>

      <div className="mb-6 flex justify-center space-x-4">
        <button
          type="button"
          onClick={() => setRole("farmer")}
          className={`px-4 py-2 rounded-md transition-colors ${
            role === "farmer" 
              ? "bg-green-700 text-white shadow-md" 
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Farmer
        </button>
        <button
          type="button"
          onClick={() => setRole("buyer")}
          className={`px-4 py-2 rounded-md transition-colors ${
            role === "buyer" 
              ? "bg-green-700 text-white shadow-md" 
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Buyer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
        </div>

        <div>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.confirmPassword ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <div>
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.phone ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
        </div>

        <div>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.country ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country}</p>}
        </div>

        <div>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            disabled={!formData.country}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.state ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select State</option>
            {selectedCountry?.states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
        </div>

        <div>
          <textarea
            name="address"
            placeholder="Full Address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.address ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            {role === "farmer" ? "Profile Photo (Required)" : "Profile Photo (Optional)"}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={`w-full px-4 py-2 border rounded-md ${
              errors.photo ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.photo && <p className="mt-1 text-sm text-red-500">{errors.photo}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800 transition-colors ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <button 
          onClick={() => navigate("/login")} 
          className="text-green-700 hover:underline"
        >
          Login here
        </button>
      </p>
    </div>
  );
};

export default Register;