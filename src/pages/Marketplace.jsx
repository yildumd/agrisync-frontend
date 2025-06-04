// src/pages/Marketplace.jsx

import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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
        const q = query(collection(db, "products"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setProducts([]);
          setLoading(false);
          return;
        }

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
            };
          })
        );

        setProducts(enrichedProducts);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching marketplace:", error);
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4">
      <h2 className="text-3xl font-bold text-green-700 mb-6 text-center">
        Marketplace
      </h2>

      {loading ? (
        <p className="text-center text-gray-600">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-600">No products listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-5 shadow-md rounded-lg border relative"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              ) : (
                <div className="w-full h-40 bg-gray-200 rounded mb-3 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}

              <h3 className="text-xl font-semibold text-green-800 mb-1">
                {product.name}
              </h3>
              <p className="text-gray-700">Category: {product.category}</p>
              <p className="text-gray-700">Quantity: {product.quantity} kg</p>
              <p className="text-gray-700">Price: ₦{product.price}/kg</p>
              <p className="text-gray-700">Location: {product.location}</p>

              {user ? (
                <div className="flex flex-col gap-3 mt-4">
                  <div className="flex items-center gap-3">
                    {product.sellerPhotoUrl ? (
                      <img
                        src={product.sellerPhotoUrl}
                        alt="Seller"
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                        {product.sellerName?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-gray-800 font-medium">
                        {product.sellerName}
                      </p>
                    </div>
                  </div>

                  {user.uid !== product.sellerId && (
                    <Link to={`/chat/${product.sellerId}`}>
                      <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Message Farmer
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-red-600 font-semibold">
                  🔒 Login to view seller contact info
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
