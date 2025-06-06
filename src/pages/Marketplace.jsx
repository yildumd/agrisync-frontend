import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Common categories used in both AddProduct and Marketplace
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

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [locations, setLocations] = useState([]);
  const { role } = useAuth();
  const navigate = useNavigate();

  // Check user auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch products with error handling
  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Base query for available products
        let q = query(
          collection(db, "products"),
          where("status", "==", "available"),
          orderBy("createdAt", "desc")
        );

        // Apply additional filters
        if (categoryFilter !== "all") {
          q = query(q, where("category", "==", categoryFilter));
        }
        if (locationFilter !== "all") {
          q = query(q, where("state", "==", locationFilter)); // Changed from location to state
        }

        const snapshot = await getDocs(q);
        console.log("Firestore query returned", snapshot.size, "products");

        if (snapshot.empty) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Process products and extract locations
        const productsData = [];
        const locationSet = new Set();

        for (const doc of snapshot.docs) {
          const product = { 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toLocaleDateString() || "N/A"
          };

          // Validate required fields
          if (!product.name || !product.price || !product.image) {
            console.warn("Incomplete product skipped:", product.id);
            continue;
          }

          // Add to location filters
          if (product.state) locationSet.add(product.state);

          productsData.push(product);
        }

        setProducts(productsData);
        setLocations(Array.from(locationSet));

      } catch (error) {
        console.error("Failed to load products:", error);
        setError(error.message.includes("index") 
          ? "Please wait while we prepare the marketplace..." 
          : "Failed to load products. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, [categoryFilter, locationFilter]);

  // Filter products by search term
  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      (product.description && product.description.toLowerCase().includes(term)) ||
      (product.category && product.category.toLowerCase().includes(term))
    );
  });

  const handleAddProduct = () => {
    if (role === "farmer") {
      navigate("/add-product");
    } else {
      alert("Please register as a farmer to list products");
      navigate("/register?role=farmer");
    }
  };

  // Loading skeleton
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gray-200 animate-pulse"></div>
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-gray-900">
        {categoryFilter !== "all" || locationFilter !== "all" 
          ? "No matching products found" 
          : "Marketplace is empty"}
      </h3>
      <p className="mt-1 text-gray-500">
        {categoryFilter !== "all" || locationFilter !== "all"
          ? "Try adjusting your filters"
          : "Check back soon for new listings"}
      </p>
      {role === "farmer" && (
        <button
          onClick={handleAddProduct}
          className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
        >
          Add Your First Product
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
            className="mt-4 md:mt-0 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Product
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
            <input
              type="text"
              id="search"
              placeholder="Search by name, description or category..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              id="category"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
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
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              id="location"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
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
              <div className="relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = "/placeholder-product.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                  {product.category || "Uncategorized"}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                  <span className="text-lg font-bold text-green-600 whitespace-nowrap">
                    ₦{product.price?.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {product.state || "Unknown location"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Qty: {product.quantity}
                  </p>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {product.description || "No description available"}
                </p>
                
                <div className="flex items-center justify-between">
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
                      {product.sellerName || "Farmer"}
                    </span>
                  </Link>
                  
                  <Link
                    to={`/products/${product.id}`}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;