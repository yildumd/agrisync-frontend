import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, getDoc, doc, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const { role } = useAuth();
  const navigate = useNavigate();

  // Check user login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        setLoading(true);
        
        // Base query
        let q = query(collection(db, "products"), orderBy("createdAt", "desc"));

        // Apply filters if selected
        if (categoryFilter !== "all") {
          q = query(q, where("category", "==", categoryFilter));
        }
        if (locationFilter !== "all") {
          q = query(q, where("location", "==", locationFilter));
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Get unique categories and locations for filters
        const allProducts = snapshot.docs.map(doc => doc.data());
        const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
        const uniqueLocations = [...new Set(allProducts.map(p => p.location))];
        setCategories(uniqueCategories);
        setLocations(uniqueLocations);

        // Enrich products with seller data
        const enrichedProducts = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const product = { id: docSnap.id, ...docSnap.data() };
            let sellerData = {};

            if (product.sellerId) {
              try {
                const sellerRef = doc(db, "users", product.sellerId);
                const sellerSnap = await getDoc(sellerRef);
                if (sellerSnap.exists()) {
                  sellerData = sellerSnap.data();
                }
              } catch (e) {
                console.warn("⚠️ Error fetching seller info:", e);
              }
            }

            return {
              ...product,
              sellerName: sellerData.name || "Unknown Farmer",
              sellerPhotoUrl: sellerData.photoURL || "",
              createdAt: product.createdAt?.toDate()?.toLocaleDateString() || "N/A"
            };
          })
        );

        setProducts(enrichedProducts);
      } catch (error) {
        console.error("❌ Error fetching marketplace:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, [categoryFilter, locationFilter]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleAddProduct = () => {
    if (role === "farmer") {
      navigate("/add-product");
    } else {
      alert("Only farmers can add products. Please register as a farmer.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Marketplace Header */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search products..."
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
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
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
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-gray-500">Try adjusting your search or filter criteria</p>
          {role === "farmer" && (
            <button
              onClick={handleAddProduct}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
            >
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image Available
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                  {product.category}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <span className="text-lg font-bold text-green-600">₦{product.price?.toLocaleString()}</span>
                </div>
                
                <p className="text-sm text-gray-500 mb-2">{product.location}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {product.sellerPhotoUrl ? (
                      <img
                        src={product.sellerPhotoUrl}
                        alt={product.sellerName}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold mr-2">
                        {product.sellerName?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">{product.sellerName}</span>
                  </div>
                  
                  {user ? (
                    user.uid === product.sellerId ? (
                      <Link
                        to={`/product/${product.id}/edit`}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        Edit
                      </Link>
                    ) : (
                      <Link
                        to={`/product/${product.id}`}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                      >
                        View
                      </Link>
                    )
                  ) : (
                    <Link
                      to="/login"
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      Login to view
                    </Link>
                  )}
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