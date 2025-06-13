import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  // Fetch user and orders on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userRole = userDoc.exists() ? userDoc.data().role : 'buyer';
        setRole(userRole);
        fetchOrders(currentUser.uid, userRole);
        
        if (userRole === 'buyer') {
          fetchAvailableProducts();
        }
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchAvailableProducts = async () => {
    try {
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'available')
      );
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async (uid, userRole) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'orders'),
        where(userRole === 'farmer' ? 'sellerId' : 'buyerId', '==', uid),
        where('status', '!=', 'cart')
      );
      const snapshot = await getDocs(q);

      const ordersData = await Promise.all(snapshot.docs.map(async (doc) => {
        const orderData = doc.data();
        let productDetails = {};
        if (orderData.productId) {
          const productDoc = await getDoc(doc(db, 'products', orderData.productId));
          productDetails = productDoc.exists() ? productDoc.data() : {};
        }
        
        return {
          id: doc.id,
          ...orderData,
          ...productDetails,
          orderDate: orderData.timestamp?.toDate().toLocaleDateString() || 'N/A',
          orderTime: orderData.timestamp?.toDate().toLocaleTimeString() || 'N/A'
        };
      }));

      ordersData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchOrders(user.uid, role);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const createOrder = async () => {
    if (!currentProduct || !quantity || !address) return;
    
    try {
      setLoading(true);
      
      const sellerDoc = await getDoc(doc(db, 'users', currentProduct.sellerId));
      const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
      
      await addDoc(collection(db, 'orders'), {
        productId: currentProduct.id,
        productName: currentProduct.name,
        productImage: currentProduct.image || currentProduct.imageUrl || '',
        price: currentProduct.price,
        quantity: quantity,
        totalAmount: currentProduct.price * quantity,
        buyerId: user.uid,
        buyerName: user.displayName || 'Customer',
        buyerPhone: user.phoneNumber || '',
        sellerId: currentProduct.sellerId,
        sellerName: sellerData.name || currentProduct.sellerName || 'Seller',
        sellerPhone: sellerData.phone || '',
        status: 'pending',
        address: address,
        paymentMethod: paymentMethod,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (currentProduct.quantity) {
        await updateDoc(doc(db, 'products', currentProduct.id), {
          quantity: currentProduct.quantity - quantity
        });
      }

      setShowOrderModal(false);
      setCurrentProduct(null);
      setQuantity(1);
      setAddress('');
      fetchOrders(user.uid, role);
      fetchAvailableProducts();
      
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (currentStatus) => {
    if (role !== 'farmer') return [];
    switch (currentStatus) {
      case 'pending': return ['confirm', 'cancel'];
      case 'confirmed': return ['ship', 'cancel'];
      case 'shipped': return ['complete'];
      default: return [];
    }
  };

  const openOrderModal = (product) => {
    setCurrentProduct(product);
    setShowOrderModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-green-800">
            {role === 'farmer' ? 'Your Orders' : 'My Orders'}
          </h1>
          <div className="flex space-x-2">
            <Link to="/marketplace" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">
              Marketplace
            </Link>
            {role === 'buyer' && (
              <button onClick={() => navigate('/cart')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
                View Cart
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm">Total Orders</h3>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm">Pending</h3>
            <p className="text-2xl font-bold">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <h3 className="text-gray-500 text-sm">Shipped</h3>
            <p className="text-2xl font-bold">{orders.filter(o => o.status === 'shipped').length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm">Completed</h3>
            <p className="text-2xl font-bold">{orders.filter(o => o.status === 'delivered').length}</p>
          </div>
        </div>

        {/* For Buyers: Available Products */}
        {role === 'buyer' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Available Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-product.png';
                          e.target.className = 'w-24 h-24 object-contain';
                        }}
                      />
                    ) : (
                      <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-green-600 font-semibold">₦{product.price?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      {product.quantity ? `${product.quantity} available` : 'In stock'}
                    </p>
                    <button
                      onClick={() => openOrderModal(product)}
                      className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No orders yet</h3>
              <p className="mt-1 text-gray-500">
                {role === 'farmer' 
                  ? 'Your orders will appear here when customers purchase your products'
                  : 'Your orders will appear here when you purchase products'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {role === 'farmer' ? 'Buyer' : 'Seller'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                            {order.productImage ? (
                              <img 
                                className="h-full w-full object-cover" 
                                src={order.productImage} 
                                alt={order.productName}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/placeholder-product.png';
                                }}
                              />
                            ) : (
                              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{order.productName}</div>
                            <div className="text-sm text-gray-500">Qty: {order.quantity}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{role === 'farmer' ? order.buyerName : order.sellerName}</div>
                        <div className="text-gray-400">{role === 'farmer' ? order.buyerPhone : order.sellerPhone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{order.orderDate}</div>
                        <div className="text-xs text-gray-400">{order.orderTime}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₦{order.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {getStatusActions(order.status).map((action) => (
                            <button
                              key={action}
                              onClick={() => {
                                const newStatus =
                                  action === 'confirm' ? 'confirmed' :
                                  action === 'ship' ? 'shipped' :
                                  action === 'complete' ? 'delivered' :
                                  action === 'cancel' ? 'cancelled' : order.status;
                                updateOrderStatus(order.id, newStatus);
                              }}
                              className={`px-2 py-1 rounded text-xs ${
                                action === 'cancel'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Modal - UPDATED WITH FIXES */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative my-8">
            {/* Close button (X) */}
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold mb-4">Place Order</h2>
            
            <div className="mb-4">
              <div className="w-full h-48 bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                {currentProduct.image ? (
                  <img 
                    src={currentProduct.image} 
                    alt={currentProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-product.png';
                      e.target.className = 'w-24 h-24 object-contain';
                    }}
                  />
                ) : (
                  <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <h3 className="font-bold text-lg">{currentProduct.name}</h3>
              <p className="text-green-600 font-semibold">₦{currentProduct.price?.toLocaleString()}</p>
              {currentProduct.quantity && (
                <p className="text-sm text-gray-500">
                  {currentProduct.quantity} available
                </p>
              )}
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={currentProduct.quantity || 100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
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
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={createOrder}
                disabled={!address || loading}
                className={`px-4 py-2 rounded-md text-white ${!address || loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;