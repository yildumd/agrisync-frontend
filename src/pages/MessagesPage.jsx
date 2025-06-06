import { getDoc, updateDoc } from "firebase/firestore";
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const MessagesPage = () => {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserPhoto, setOtherUserPhoto] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Get current user on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchConversations(currentUser.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch all conversations for the current user
  const fetchConversations = async (userId) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const convos = [];
      querySnapshot.forEach((doc) => {
        convos.push({
          id: doc.id,
          ...doc.data(),
          lastMessageTime: doc.data().lastMessage?.toDate() || null
        });
      });

      // Sort by most recent message
      convos.sort((a, b) => (b.lastMessageTime - a.lastMessageTime));
      setConversations(convos);
      
      // Auto-select first conversation if none selected
      if (convos.length > 0 && !activeConversation) {
        selectConversation(convos[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select a conversation and load its messages
  const selectConversation = async (conversation) => {
    setActiveConversation(conversation);
    
    // Get the other participant's details
    const otherUserId = conversation.participants.find(id => id !== user.uid);
    if (otherUserId) {
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        setOtherUserName(userDoc.data().name || 'User');
        setOtherUserPhoto(userDoc.data().photoUrl || '');
      }
    }
    
    // Set up real-time listener for messages
    const messagesQuery = query(
      collection(db, 'conversations', conversation.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        });
      });
      setMessages(msgs);
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user) return;

    try {
      // Add message to subcollection
      await addDoc(
        collection(db, 'conversations', activeConversation.id, 'messages'), 
        {
          text: newMessage,
          senderId: user.uid,
          timestamp: serverTimestamp()
        }
      );

      // Update conversation last message
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Start a new conversation (if needed)
  const startNewConversation = async (productId, sellerId) => {
    // You would implement this when clicking "Message" on a product
    // For now, we'll just use existing conversations
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar - Conversation List */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No messages yet</h3>
            <p className="mt-1 text-gray-500">Your conversations will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((convo) => {
              const otherUserId = convo.participants.find(id => id !== user?.uid);
              const lastMessage = convo.lastMessageText || 'No messages yet';
              const isActive = activeConversation?.id === convo.id;
              
              return (
                <div 
                  key={convo.id}
                  onClick={() => selectConversation(convo)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${isActive ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <img 
                        className="h-10 w-10 rounded-full bg-gray-200" 
                        src={convo.participantPhoto || `https://ui-avatars.com/api/?name=${convo.participantName}&background=random`}
                        alt=""
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {convo.participantName || 'User'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {lastMessage.length > 30 ? `${lastMessage.substring(0, 30)}...` : lastMessage}
                      </p>
                    </div>
                    {convo.lastMessage && (
                      <div className="text-xs text-gray-500">
                        {convo.lastMessage.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="hidden md:flex flex-col flex-1">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center">
              <Link to="#" className="md:hidden mr-2 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="flex-shrink-0">
                <img 
                  className="h-10 w-10 rounded-full bg-gray-200" 
                  src={otherUserPhoto || `https://ui-avatars.com/api/?name=${otherUserName}&background=random`} 
                  alt=""
                />
              </div>
              <div className="ml-3">
                <p className="text-lg font-medium text-gray-900">{otherUserName}</p>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No messages yet</h3>
                    <p className="mt-1 text-gray-500">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${message.senderId === user?.uid ? 'bg-green-100 text-green-900' : 'bg-white border border-gray-200'}`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`px-4 py-2 rounded-r-lg ${newMessage.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'} text-white`}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-gray-500">Choose a chat from the sidebar to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile view - show conversation or messages */}
      <div className="md:hidden flex-1">
        {activeConversation ? (
          <>
            {/* Mobile Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center">
              <button 
                onClick={() => setActiveConversation(null)}
                className="mr-2 text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex-shrink-0">
                <img 
                  className="h-10 w-10 rounded-full bg-gray-200" 
                  src={otherUserPhoto || `https://ui-avatars.com/api/?name=${otherUserName}&background=random`} 
                  alt=""
                />
              </div>
              <div className="ml-3">
                <p className="text-lg font-medium text-gray-900">{otherUserName}</p>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>

            {/* Mobile Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50" style={{ height: 'calc(100vh - 180px)' }}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No messages yet</h3>
                    <p className="mt-1 text-gray-500">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xs rounded-lg px-4 py-2 ${message.senderId === user?.uid ? 'bg-green-100 text-green-900' : 'bg-white border border-gray-200'}`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Mobile Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`px-4 py-2 rounded-r-lg ${newMessage.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'} text-white`}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-gray-500">Choose a chat from the sidebar to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;