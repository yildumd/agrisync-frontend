import React, { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import uploadToCloudinary from "../components/uploadToCloudinary";

// Product categories data
const productCategories = [
  "Grains & Cereals",
  "Fruits",
  "Vegetables",
  "Livestock",
  "Dairy Products",
  "Poultry",
  "Seafood",
  "Nuts & Seeds",
  "Spices & Herbs",
  "Tubers",
  "Legumes",
  "Processed Foods",
  "Organic Products",
  "Farm Equipment",
  "Fertilizers",
  "Seeds & Seedlings",
  "Other"
];

// African countries and states data
const africanCountries = [
  { 
    name: "Nigeria", 
    states: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", 
      "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", 
      "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", 
      "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", 
      "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", 
      "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
    ]
  },
  { 
    name: "Ghana", 
    states: [
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", 
      "Greater Accra", "North East", "Northern", "Oti", "Savannah", 
      "Upper East", "Upper West", "Volta", "Western", "Western North"
    ]
  },
  // Add more countries as needed...
  { name: "Kenya", states: [] },
  { name: "South Africa", states: [] },
  { name: "Ethiopia", states: [] },
  // ...other African countries
];

const AddProduct = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [availableStates, setAvailableStates] = useState([]);

  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    quantity: "",
    country: "",
    state: "",
    phone: "",
  });

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Handle country selection
  const handleCountryChange = (e) => {
    const countryName = e.target.value;
    setSelectedCountry(countryName);
    setProduct(prev => ({ ...prev, country: countryName, state: "" }));
    
    const country = africanCountries.find(c => c.name === countryName);
    setAvailableStates(country?.states || []);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match("image.*")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      
      setError("");
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Validate phone number
  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{11}$/;
    return phoneRegex.test(phone);
  };

  // Submit product to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, price, category, quantity, country, state, phone, description } = product;

    // Validation
    if (!name || !price || !category || !quantity || !country || !phone || !imageFile) {
      setError("Please fill all required fields and select an image.");
      return;
    }

    if (parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
      setError("Please enter a valid price");
      return;
    }

    if (parseInt(quantity, 10) <= 0 || isNaN(parseInt(quantity, 10))) {
      setError("Please enter a valid quantity");
      return;
    }

    if (!validatePhone(phone)) {
      setError("Please enter a valid phone number (11 digits)");
      return;
    }

    if (!user?.uid) {
      setError("User not authenticated.");
      return;
    }

    setLoading(true);

    try {
      // Upload image to Cloudinary
      const imageUrl = await uploadToCloudinary(imageFile);
      if (!imageUrl) {
        throw new Error("Image upload failed");
      }

      // Format product data
      const newProduct = {
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        category: category.trim(),
        country: country.trim(),
        state: state.trim(),
        phone: phone.trim(),
        description: description?.trim() || "",
        image: imageUrl,
        sellerId: user.uid,
        sellerName: user.displayName || "Unknown Seller",
        sellerEmail: user.email || "unknown",
        sellerPhotoUrl: user.photoURL || "",
        status: "available", // Add status field
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add to Firestore
      await addDoc(collection(db, "products"), newProduct);

      // Reset form
      setProduct({
        name: "",
        price: "",
        description: "",
        category: "",
        quantity: "",
        country: "",
        state: "",
        phone: "",
      });
      setImageFile(null);
      setSelectedCountry("");
      setAvailableStates([]);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
      
      navigate("/marketplace");
    } catch (err) {
      console.error("Error adding product:", err);
      setError(err.message || "Error adding product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Add New Product</h2>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          value={product.name}
          onChange={handleChange}
          placeholder="Product Name"
          required
          className="w-full p-2 border rounded"
        />
        
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            name="price"
            value={product.price}
            onChange={handleChange}
            placeholder="Price per KG (₦)"
            required
            className="w-full p-2 border rounded"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            name="quantity"
            value={product.quantity}
            onChange={handleChange}
            placeholder="Quantity in KG"
            required
            className="w-full p-2 border rounded"
            min="1"
          />
        </div>

        <select
          name="category"
          value={product.category}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        >
          <option value="">Select Category</option>
          {productCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-4">
          <select
            name="country"
            value={selectedCountry}
            onChange={handleCountryChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select Country</option>
            {africanCountries.map((country) => (
              <option key={country.name} value={country.name}>{country.name}</option>
            ))}
          </select>

          {availableStates.length > 0 ? (
            <select
              name="state"
              value={product.state}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select State/Region</option>
              {availableStates.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="state"
              value={product.state}
              onChange={handleChange}
              placeholder="State/Region"
              className="w-full p-2 border rounded"
            />
          )}
        </div>

        <input
          type="tel"
          name="phone"
          value={product.phone}
          onChange={handleChange}
          placeholder="Your Phone Number (11 digits)"
          required
          className="w-full p-2 border rounded"
          pattern="[0-9]{11}"
        />
        
        <textarea
          name="description"
          value={product.description}
          onChange={handleChange}
          placeholder="Description (optional)"
          rows="3"
          className="w-full p-2 border rounded"
        />
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Product Image (required)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            className="w-full p-2 border rounded"
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover mt-2 border rounded"
            />
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white px-4 py-2 rounded transition ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"
          }`}
        >
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;