import React, { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import uploadToCloudinary from "../components/uploadToCloudinary";

// Enhanced product categories with African-specific items
const productCategories = [
  {
    category: "Grains & Cereals",
    items: [
      "Maize/Corn", "Rice", "Millet", "Sorghum", "Wheat", 
      "Oats", "Barley", "Quinoa", "Fonio", "Acha"
    ]
  },
  {
    category: "Fruits",
    items: [
      "Mango", "Banana", "Plantain", "Pineapple", "Orange", 
      "Watermelon", "Pawpaw", "Guava", "Apple", "Grapes",
      "Avocado", "Cashew Apple", "Tangerine", "Lemon", "Lime",
      "African Star Apple (Agbalumo)", "African Pear (Ube)"
    ]
  },
  {
    category: "Vegetables",
    items: [
      "Tomato", "Onion", "Pepper", "Okra", "Cabbage",
      "Carrot", "Cucumber", "Lettuce", "Spinach", "Eggplant",
      "Pumpkin Leaves (Ugu)", "Bitter Leaf", "Water Leaf",
      "African Eggplant (Garden Egg)", "Jute Leaves (Ewedu)"
    ]
  },
  {
    category: "Livestock",
    items: [
      "Cattle", "Goat", "Sheep", "Pig", "Rabbit",
      "Grasscutter", "Snail", "Donkey", "Horse", "Camel"
    ]
  },
  {
    category: "Dairy Products",
    items: [
      "Fresh Milk", "Yogurt", "Cheese", "Butter", "Fura da Nono",
      "Wara (Local Cheese)", "Madara", "Fermented Milk"
    ]
  },
  {
    category: "Poultry",
    items: [
      "Chicken", "Turkey", "Duck", "Goose", "Quail",
      "Pigeon", "Ostrich", "Guinea Fowl"
    ]
  },
  {
    category: "Seafood",
    items: [
      "Catfish", "Tilapia", "Mackerel", "Sardines", "Crab",
      "Shrimp", "Lobster", "Oyster", "Periwinkle", "Crayfish",
      "Stockfish", "Smoked Fish", "Dried Fish"
    ]
  },
  {
    category: "Nuts & Seeds",
    items: [
      "Groundnut", "Cashew Nut", "Almond", "Walnut", "Pistachio",
      "Tigernut", "Bambara Nut", "Pumpkin Seed", "Melon Seed (Egusi)",
      "Sesame Seed (Benniseed)", "Flax Seed", "Chia Seed"
    ]
  },
  {
    category: "Spices & Herbs",
    items: [
      "Ginger", "Garlic", "Turmeric", "Nutmeg", "Cloves",
      "Cinnamon", "Black Pepper", "Cayenne Pepper", "Thyme",
      "Curry Leaves", "Scent Leaves (Nchanwu)", "Uziza",
      "Ehuru (Calabash Nutmeg)", "Grains of Selim (Hwentia)"
    ]
  },
  {
    category: "Tubers",
    items: [
      "Yam", "Cassava", "Potato", "Sweet Potato", "Cocoyam",
      "Ginger", "Turmeric", "Arrowroot"
    ]
  },
  {
    category: "Legumes",
    items: [
      "Beans", "Soybean", "Peas", "Lentils", "Bambara Nut",
      "Cowpea", "Pigeon Pea", "African Yam Bean"
    ]
  },
  {
    category: "Processed Foods",
    items: [
      "Garri", "Fufu", "Semolina", "Wheat Flour", "Palm Oil",
      "Groundnut Oil", "Soybean Oil", "Honey", "Plantain Chips",
      "Cassava Flour", "Yam Flour", "Ogi/Akamu", "Kilishi",
      "Suya Meat", "Dried Okro", "Pounded Yam", "Starch"
    ]
  },
  {
    category: "Organic Products",
    items: [
      "Organic Fertilizer", "Organic Pesticide", "Vermicompost",
      "Biochar", "Organic Seeds", "Organic Herbs"
    ]
  },
  {
    category: "Farm Equipment",
    items: [
      "Tractor", "Plough", "Harrow", "Planter", "Harvester",
      "Irrigation System", "Sprayer", "Cutlass", "Hoe",
      "Shovel", "Wheelbarrow", "Generator", "Water Pump",
      "Greenhouse", "Fishing Net", "Feed Mill", "Grinding Machine"
    ]
  },
  {
    category: "Fertilizers",
    items: [
      "NPK Fertilizer", "Urea", "DAP", "Organic Manure",
      "Liquid Fertilizer", "Biofertilizer", "Compost"
    ]
  },
  {
    category: "Seeds & Seedlings",
    items: [
      "Improved Seeds", "Hybrid Seeds", "Seedlings", "Grafted Plants",
      "Tissue Culture Plants", "Planting Materials"
    ]
  },
  {
    category: "Other",
    items: []
  }
];

// African countries and states
const africanCountries = [
  {
    name: "Nigeria",
    states: [ "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara" ]
  },
  {
    name: "Ghana",
    states: [ "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North" ]
  },
  { name: "Kenya", states: [] },
  { name: "South Africa", states: [] },
  { name: "Ethiopia", states: [] },
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);

  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    specificProduct: "",
    country: "",
    state: "",
    phone: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      currentUser ? setUser(currentUser) : navigate("/login");
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleCountryChange = (e) => {
    const countryName = e.target.value;
    const found = africanCountries.find(c => c.name === countryName);
    setSelectedCountry(countryName);
    setAvailableStates(found?.states || []);
    setProduct(prev => ({ ...prev, country: countryName, state: "" }));
  };

  const handleCategoryChange = (e) => {
    const categoryName = e.target.value;
    setSelectedCategory(categoryName);
    setSelectedProduct("");
    
    const foundCategory = productCategories.find(cat => cat.category === categoryName);
    setAvailableProducts(foundCategory?.items || []);
    setShowProductList(foundCategory?.items?.length > 0);
    
    setProduct(prev => ({ ...prev, category: categoryName, specificProduct: "" }));
  };

  const handleProductSelect = (productName) => {
    setSelectedProduct(productName);
    setShowProductList(false);
    setProduct(prev => ({ ...prev, specificProduct: productName, name: productName }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        return setError("Only image files are allowed.");
      }
      if (file.size > 5 * 1024 * 1024) {
        return setError("Image must be less than 5MB.");
      }
      setError("");
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const validatePhone = (phone) => /^[0-9]{11}$/.test(phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, price, category, country, state, phone, description } = product;

    if (!name || !price || !category || !country || !phone || !imageFile) {
      return setError("Please fill all required fields and select an image.");
    }

    if (parseFloat(price) <= 0 || isNaN(price)) {
      return setError("Enter a valid price.");
    }

    if (!validatePhone(phone)) {
      return setError("Phone must be exactly 11 digits.");
    }

    if (!user?.uid) {
      return setError("User not authenticated.");
    }

    setLoading(true);

    try {
      const imageUrl = await uploadToCloudinary(imageFile);
      if (!imageUrl) throw new Error("Image upload failed.");

      const newProduct = {
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim(),
        specificProduct: product.specificProduct?.trim() || "",
        country: country.trim(),
        state: state.trim(),
        phone: phone.trim(),
        description: description?.trim() || "",
        image: imageUrl,
        sellerId: user.uid,
        sellerName: user.displayName || "Unknown Seller",
        sellerEmail: user.email || "unknown",
        sellerPhotoUrl: user.photoURL || "",
        status: "available",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "products"), newProduct);

      setProduct({
        name: "",
        price: "",
        description: "",
        category: "",
        specificProduct: "",
        country: "",
        state: "",
        phone: "",
      });
      setImageFile(null);
      setSelectedCountry("");
      setSelectedCategory("");
      setSelectedProduct("");
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
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <select
            name="category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select Category</option>
            {productCategories.map(cat => (
              <option key={cat.category} value={cat.category}>{cat.category}</option>
            ))}
          </select>
        </div>

        {showProductList && (
          <div className="border rounded p-2 max-h-60 overflow-y-auto">
            <p className="text-sm mb-2">Select specific product:</p>
            <div className="grid grid-cols-2 gap-2">
              {availableProducts.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleProductSelect(item)}
                  className={`p-2 text-sm rounded ${
                    selectedProduct === item 
                      ? "bg-green-100 border border-green-500" 
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedProduct ? (
          <input
            type="text"
            name="name"
            value={selectedProduct}
            readOnly
            className="w-full p-2 border rounded bg-gray-50"
          />
        ) : (
          <input
            type="text"
            name="name"
            value={product.name}
            onChange={handleChange}
            placeholder="Or enter custom product name"
            required
            className="w-full p-2 border rounded"
          />
        )}

        <input
          type="number"
          name="price"
          value={product.price}
          onChange={handleChange}
          placeholder="Price per KG (₦)"
          required
          min="0"
          step="0.01"
          className="w-full p-2 border rounded"
        />

        <div className="grid grid-cols-2 gap-4">
          <select
            name="country"
            value={selectedCountry}
            onChange={handleCountryChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select Country</option>
            {africanCountries.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
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
              {availableStates.map(state => (
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