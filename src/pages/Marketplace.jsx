import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, orderBy, doc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PRODUCT_CATEGORIES = [
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

const COUNTRY_STATES = {
  Ethiopia: [
    "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa", 
    "Gambela", "Harari", "Oromia", "Somali", "Southern Nations", 
    "Tigray"
  ],
  Ghana: [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern", 
    "Volta", "Northern", "Upper East", "Upper West", "Brong-Ahafo", 
    "Bono East", "Ahafo", "Savannah", "North East", "Oti", 
    "Western North"
  ],
  Nigeria: [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", 
    "Bayelsa", "Benue", "Borno", "Cross River", "Delta", 
    "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", 
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", 
    "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", 
    "Niger", "Ogun", "Ondo", "Osun", "Oyo", 
    "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", 
    "Zamfara", "FCT"
  ],
  Kenya: [
    "Nairobi", "Mombasa", "Kwale", "Kilifi", "Tana River", 
    "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", 
    "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", 
    "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", 
    "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", 
    "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", 
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", 
    "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", 
    "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori", 
    "Kisii", "Nyamira"
  ],
  Egypt: [
    "Cairo", "Alexandria", "Giza", "Dakahlia", "Red Sea", 
    "Beheira", "Fayoum", "Gharbia", "Ismailia", "Menofia", 
    "Minya", "Qaliubia", "New Valley", "Suez", "Aswan", 
    "Assiut", "Beni Suef", "Port Said", "Damietta", "Sharkia", 
    "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", 
    "North Sinai", "Sohag", "6th of October", "Helwan", "Marsa Matrouh"
  ],
  Tanzania: [
    "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", 
    "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", 
    "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", 
    "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", 
    "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", 
    "Songwe", "Tabora", "Tanga", "Zanzibar North", "Zanzibar South", 
    "Zanzibar West"
  ]
};

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [locations, setLocations] = useState([]);
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const fetchMarketplace = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let q = query(
        collection(db, "products"),
        where("status", "==", "available"),
        orderBy("createdAt", "desc")
      );

      if (categoryFilter !== "all") {
        q = query(q, where("category", "==", categoryFilter));
      }
      if (countryFilter !== "all") {
        q = query(q, where("country", "==", countryFilter));
      }
      if (locationFilter !== "all") {
        q = query(q, where("state", "==", locationFilter));
      }

      const snapshot = await getDocs(q);
      console.log("Marketplace products loaded:", snapshot.size);

      if (snapshot.empty) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productsData = [];
      const locationSet = new Set();

      snapshot.forEach(doc => {
        const productData = doc.data();
        if (!productData.name || !productData.price) {
          console.warn("Incomplete product skipped:", doc.id);
          return;
        }

        const product = {
          id: doc.id,
          ...productData,
          createdAt: productData.createdAt?.toDate()?.toLocaleDateString() || "N/A",
          sellerName: productData.sellerName || "Unknown Farmer"
        };

        if (productData.state) locationSet.add(productData.state);
        productsData.push(product);
      });

      setProducts(productsData);
      setLocations(Array.from(locationSet));

    } catch (error) {
      console.error("Error loading marketplace:", error);
      setError(
        error.message.includes("index") 
          ? "Please wait while we prepare the marketplace..." 
          : "Failed to load products. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplace();
  }, [categoryFilter, countryFilter, locationFilter]);

  const handleOrderNow = (product) => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (user.uid === product.sellerId) {
      alert("You cannot order your own products");
      return;
    }
    
    navigate(`/orders/${product.id}`, {
      state: {
        productDetails: product
      }
    });
  };

  const handleAddToCart = (product) => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (user.uid === product.sellerId) {
      alert("You cannot add your own products to cart");
      return;
    }
    
    // Here you would add to cart using your cart context
    // For now, we'll navigate to cart page with the product
    navigate("/cart", {
      state: {
        productToAdd: product
      }
    });
  };

  const handleMessageSeller = (sellerId) => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/messages/${sellerId}`);
  };

  const handleEditProduct = (productId) => {
    navigate(`/edit-product/${productId}`);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", productId));
        setProducts(products.filter(product => product.id !== productId));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      (product.description && product.description.toLowerCase().includes(term)) ||
      (product.category && product.category.toLowerCase().includes(term)) ||
      (product.sellerName && product.sellerName.toLowerCase().includes(term))
    );
  });

  const handleAddProduct = () => {
    navigate(role === "farmer" ? "/add-product" : "/register?role=farmer");
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-gray-900">
        {categoryFilter !== "all" || countryFilter !== "all" || locationFilter !== "all" 
          ? "No matching products found" 
          : "No products available yet"}
      </h3>
      {role === "farmer" && (
        <button
          onClick={handleAddProduct}
          className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
        >
          List Your Products
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">Marketplace</h1>
          <p className="text-gray-600">
            {role === "farmer" 
              ? "Sell your farm produce directly to buyers" 
              : "Buy fresh farm produce directly from farmers"}
          </p>
        </div>
        
        {role === "farmer" && (
          <button
            onClick={handleAddProduct}
            className="mt-4 md:mt-0 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setLocationFilter("all");
              }}
            >
              <option value="all">All Countries</option>
              {Object.keys(COUNTRY_STATES).map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              disabled={countryFilter === "all"}
            >
              <option value="all">
                {countryFilter === "all" ? "Select country first" : "All States/Regions"}
              </option>
              {countryFilter !== "all" && COUNTRY_STATES[countryFilter].map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        renderSkeletons()
      ) : filteredProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className="relative h-48 bg-gray-100">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = "/placeholder-product.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                  {product.category || "Uncategorized"}
                </div>
                <div className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded ${
                  product.quantity > 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                }`}>
                  {product.quantity > 0 ? "Available" : "Out of Stock"}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                  <span className="text-lg font-bold text-green-600 whitespace-nowrap">
                    ₦{product.price?.toLocaleString()}/kg
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {product.state || "Unknown location"}, {product.country || "Unknown country"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Available: {product.quantity} kg
                  </p>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {product.description || "No description available"}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <Link
                    to={`/farmers/${product.sellerId}`}
                    className="flex items-center text-sm hover:text-green-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-2">
                      {product.sellerPhotoUrl ? (
                        <img src={product.sellerPhotoUrl} alt="Seller" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {product.sellerName?.charAt(0).toUpperCase() || "F"}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {product.sellerName || "Unknown Farmer"}
                    </span>
                  </Link>
                </div>

                {/* Action Buttons */}
                {user ? (
                  <div className="flex space-x-2">
                    {user.uid === product.sellerId ? (
                      <>
                        <button
                          onClick={() => handleEditProduct(product.id)}
                          className="flex-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-md"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      role !== "farmer" && (
                        <>
                          <button
                            onClick={() => handleMessageSeller(product.sellerId)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Message
                          </button>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.quantity <= 0}
                            className={`flex-1 px-3 py-2 text-white text-sm rounded-md transition-colors ${
                              product.quantity > 0 ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => handleOrderNow(product)}
                            disabled={product.quantity <= 0}
                            className={`flex-1 px-3 py-2 text-white text-sm rounded-md transition-colors ${
                              product.quantity > 0 ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Buy Now
                          </button>
                        </>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                    >
                      Sign in to purchase
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;