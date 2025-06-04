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
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Submit product to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, price, category, quantity, location, description, phone } = product;

    // Basic validation
    if (!name || !price || !category || !quantity || !location || !phone || !imageFile) {
      alert("Please fill all required fields and select an image.");
      return;
    }

    if (!user?.uid) {
      alert("User not authenticated.");
      return;
    }

    setLoading(true);

    try {
      // Upload image to Cloudinary
      console.log("🔄 Uploading image to Cloudinary...");
      const imageUrl = await uploadToCloudinary(imageFile);
      console.log("✅ Image uploaded:", imageUrl);

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
        sellerName: user.displayName || user.name || "Unknown Seller",
        sellerEmail: user.email || "unknown",
        sellerPhotoUrl: user.photoURL || "",
        timestamp: serverTimestamp(),
      };

      // Add to Firestore
      console.log("📦 Saving product to Firestore...");
      await addDoc(collection(db, "products"), newProduct);
      console.log("✅ Product added successfully!");

      alert("✅ Product added successfully!");
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
      setPreview(null);
      navigate("/marketplace");
    } catch (err) {
      console.error("🔥 Error adding product:", err.message, err);
      alert("❌ Error adding product. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Add New Product</h2>
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
          placeholder="Your Phone Number"
          required
          className="w-full p-2 border rounded"
        />
        <textarea
          name="description"
          value={product.description}
          onChange={handleChange}
          placeholder="Description (optional)"
          rows="3"
          className="w-full p-2 border rounded"
        />
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
