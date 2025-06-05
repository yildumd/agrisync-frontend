import React, { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import uploadToCloudinary from "../components/uploadToCloudinary";

const AddProduct = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    quantity: "",
    location: "",
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
      // Validate image type and size (e.g., 5MB max)
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
    const phoneRegex = /^[0-9]{11}$/; // Adjust based on your country's format
    return phoneRegex.test(phone);
  };

  // Submit product to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, price, category, quantity, location, description, phone } = product;

    // Validation
    if (!name || !price || !category || !quantity || !location || !phone || !imageFile) {
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
      setError("Please enter a valid phone number");
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
        category: category.trim().toLowerCase(),
        location: location.trim(),
        phone: phone.trim(),
        description: description?.trim() || "",
        image: imageUrl,
        sellerId: user.uid,
        sellerName: user.displayName || "Unknown Seller",
        sellerEmail: user.email || "unknown",
        sellerPhotoUrl: user.photoURL || "",
        timestamp: serverTimestamp(),
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
        location: "",
        phone: "",
      });
      setImageFile(null);
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
        <input
          type="text"
          name="category"
          value={product.category}
          onChange={handleChange}
          placeholder="Category (e.g., maize)"
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="location"
          value={product.location}
          onChange={handleChange}
          placeholder="Location (e.g., Kaduna)"
          required
          className="w-full p-2 border rounded"
        />
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