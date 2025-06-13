import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch user and cart on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchCart(currentUser.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchCart = async (userId) => {
    try {
      setLoading(true);
      const cartDoc = await getDoc(doc(db, 'carts', userId));
      
      if (cartDoc.exists()) {
        const cartData = cartDoc.data();
        const cartItemsWithDetails = await Promise.all(
          cartData.items.map(async (item) => {
            const productDoc = await getDoc(doc(db, 'products', item.productId));
            return {
              ...item,
              productDetails: productDoc.exists() ? productDoc.data() : null
            };
          })
        );
        setCart(cartItemsWithDetails);
      } else {
        setCart([]);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateCartItemQuantity = async (productId, newQuantity) => {
    if (!user || newQuantity < 0.1) return;
    
    try {
      setLoading(true);
      const cartRef = doc(db, 'carts', user.uid);
      const existingItem = cart.find(item => item.productId === productId);
      
      if (existingItem) {
        await updateDoc(cartRef, {
          items: arrayRemove({ productId, quantity: existingItem.quantity })
        });
      }
      
      await updateDoc(cartRef, {
        items: arrayUnion({ productId, quantity: newQuantity }),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      fetchCart(user.uid);
    } catch (error) {
      console.error('Error updating cart item:', error);
      setError('Failed to update item quantity');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const cartRef = doc(db, 'carts', user.uid);
      const itemToRemove = cart.find(item => item.productId === productId);
      
      if (itemToRemove) {
        await updateDoc(cartRef, {
          items: arrayRemove({ productId, quantity: itemToRemove.quantity }),
          updatedAt: serverTimestamp()
        });
        fetchCart(user.uid);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError('Failed to remove item from cart');
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    if (!user || !address || cart.length === 0) {
      setError('Please fill all required fields and ensure your cart is not empty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Create orders for each cart item
      for (const item of cart) {
        if (!item.productDetails) continue;
        
        // Create order document
        await addDoc(collection(db, 'orders'), {
          productId: item.productId,
          productName: item.productDetails.name,
          productImage: item.productDetails.imageUrl || '',
          price: item.productDetails.price,
          quantity: item.quantity,
          unit: 'kg',
          totalAmount: item.productDetails.price * item.quantity,
          buyerId: user.uid,
          buyerName: user.displayName || 'Customer',
          buyerPhone: user.phoneNumber || userData.phone || '',
          sellerId: item.productDetails.sellerId,
          sellerName: item.productDetails.sellerName || 'Seller',
          sellerPhone: item.productDetails.sellerPhone || '',
          status: 'pending',
          address: address,
          paymentMethod: paymentMethod,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update product quantity
        if (item.productDetails.quantity) {
          const newQuantity = item.productDetails.quantity - item.quantity;
          await updateDoc(doc(db, 'products', item.productId), {
            quantity: newQuantity > 0 ? newQuantity : 0
          });
        }
      }
      
      // Clear the cart
      await setDoc(doc(db, 'carts', user.uid), {
        items: [],
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      navigate('/orders');
    } catch (error) {
      console.error('Error during checkout:', error);
      setError('Failed to complete checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.productDetails?.price * item.quantity || 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-green-800">Your Cart</h1>
          <div className="flex space-x-2">
            <Link to="/marketplace" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">
              Continue Shopping
            </Link>
            <Link to="/orders" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
              View Orders
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Your cart is empty</h3>
            <p className="mt-1 text-gray-500">Add some products from the marketplace</p>
            <Link to="/marketplace" className="mt-4 inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {cart.map((item) => (
                    <div key={item.productId} className="p-4 flex">
                      <div className="flex-shrink-0 h-20 w-20">
                        <img 
                          className="h-full w-full object-cover rounded-md" 
                          src={item.productDetails?.imageUrl || 'https://via.placeholder.com/80'} 
                          alt={item.productDetails?.name} 
                        />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {item.productDetails?.name || 'Product'}
                            </h3>
                            <p className="text-green-600 font-semibold">
                              ₦{item.productDetails?.price?.toLocaleString() || '0'}/kg
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-2 flex items-center">
                          <label className="mr-2 text-sm text-gray-700">Quantity (kg):</label>
                          <input
                            type="number"
                            min="0.1"
                            max={item.productDetails?.quantity || 1000}
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                updateCartItemQuantity(item.productId, Math.max(0.1, value));
                              }
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center"
                          />
                          {item.productDetails?.quantity && (
                            <span className="ml-2 text-sm text-gray-500">
                              {item.productDetails.quantity}kg available
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-right font-medium">
                          ₦{(item.productDetails?.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-lg font-medium mb-4">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>₦{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-4">
                    <span>Total</span>
                    <span className="text-green-600">₦{calculateTotal().toLocaleString()}</span>
                  </div>

                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Enter your full delivery address"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="cash">Cash on Delivery</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Credit/Debit Card</option>
                    </select>
                  </div>

                  <button
                    onClick={checkout}
                    disabled={!address || loading}
                    className={`w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-white font-medium ${
                      !address || loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {loading ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;