import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';

const MessagesPage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
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

  // Handle userId param to start new conversation
  useEffect(() => {
    if (userId && user && user.uid !== userId) {
      startNewConversation(userId);
    }
  }, [userId, user]);

  // Fetch all conversations for the current user
  const fetchConversations = async (currentUserId) => {
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUserId),
        orderBy('lastMessage', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const convos = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const otherUserId = data.participants.find(id => id !== currentUserId);
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        
        convos.push({
          id: doc.id,
          ...data,
          otherUserId,
          otherUserName: otherUserDoc.exists() ? otherUserDoc.data().name || 'User' : 'User',
          otherUserPhoto: otherUserDoc.exists() ? otherUserDoc.data().photoUrl || '' : '',
          lastMessageTime: data.lastMessage?.toDate(),
          unread: data.unread?.[currentUserId] || false
        });
      }

      setConversations(convos);
      
      // Auto-select first conversation if none selected and no userId param
      if (convos.length > 0 && !activeConversation && !userId) {
        selectConversation(convos[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Select a conversation and load its messages
  const selectConversation = async (conversation) => {
    try {
      // Mark as read when selected
      if (conversation.unread) {
        await updateDoc(doc(db, 'conversations', conversation.id), {
          [`unread.${user.uid}`]: false
        });
      }

      setActiveConversation(conversation);
      setOtherUser({
        id: conversation.otherUserId,
        name: conversation.otherUserName,
        photo: conversation.otherUserPhoto
      });
      
      // Set up real-time listener for messages
      const messagesQuery = query(
        collection(db, 'conversations', conversation.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        setMessages(msgs);
        scrollToBottom();
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error selecting conversation:', error);
      setError('Failed to load conversation. Please try again.');
    }
  };

  // Start a new conversation
  const startNewConversation = async (otherUserId) => {
    if (!user || !otherUserId || otherUserId === user.uid) return;

    try {
      setLoading(true);
      setError(null);
      
      // Check if conversation already exists
      const existingConvo = conversations.find(c => c.otherUserId === otherUserId);
      if (existingConvo) {
        selectConversation(existingConvo);
        return;
      }

      const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
      const otherUserData = otherUserDoc.exists() ? otherUserDoc.data() : null;
      
      // Create new conversation
      const newConvoRef = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid, otherUserId],
        participantNames: {
          [user.uid]: user.displayName || 'You',
          [otherUserId]: otherUserData?.name || 'User'
        },
        participantPhotos: {
          [user.uid]: user.photoURL || '',
          [otherUserId]: otherUserData?.photoUrl || ''
        },
        createdAt: serverTimestamp(),
        lastMessage: serverTimestamp(),
        lastMessageText: 'Conversation started',
        unread: {
          [otherUserId]: true
        }
      });

      // Refresh conversations
      await fetchConversations(user.uid);
      
      // Select the new conversation
      const newConvo = {
        id: newConvoRef.id,
        otherUserId,
        otherUserName: otherUserData?.name || 'User',
        otherUserPhoto: otherUserData?.photoUrl || ''
      };
      selectConversation(newConvo);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user || isSending) return;

    try {
      setIsSending(true);
      setError(null);
      
      // Create message object with client-side timestamp as fallback
      const messageData = {
        text: newMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        clientTimestamp: new Date().toISOString()
      };

      console.log('Sending message:', messageData);
      
      // Add message to subcollection
      await addDoc(
        collection(db, 'conversations', activeConversation.id, 'messages'), 
        messageData
      );

      // Update conversation last message
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: serverTimestamp(),
        lastMessageText: newMessage,
        [`unread.${otherUser.id}`]: true
      });

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press for sending message
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar - Conversation List */}
      <div className={`${activeConversation ? 'hidden md:block' : 'block'} w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-md mx-2 my-2">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No messages yet</h3>
            <p className="mt-1 text-gray-500">Start a conversation from a product or profile</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 overflow-y-auto max-h-[calc(100vh-120px)]">
            {conversations.map((convo) => (
              <div 
                key={convo.id}
                onClick={() => selectConversation(convo)}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${activeConversation?.id === convo.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <img 
                      className="h-10 w-10 rounded-full bg-gray-200 object-cover"
                      src={convo.otherUserPhoto || `https://ui-avatars.com/api/?name=${convo.otherUserName}&background=random`}
                      alt={convo.otherUserName}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${convo.otherUserName}&background=random`;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {convo.otherUserName}
                      </p>
                      {convo.lastMessageTime && (
                        <span className="text-xs text-gray-500">
                          {convo.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {convo.lastMessageText?.substring(0, 30) || 'No messages yet'}
                      </p>
                      {convo.unread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`${activeConversation ? 'block' : 'hidden md:block'} flex flex-col flex-1`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center">
              <button 
                onClick={() => setActiveConversation(null)}
                className="md:hidden mr-2 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex-shrink-0">
                <img 
                  className="h-10 w-10 rounded-full bg-gray-200 object-cover"
                  src={otherUser?.photo || `https://ui-avatars.com/api/?name=${otherUser?.name}&background=random`} 
                  alt={otherUser?.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${otherUser?.name}&background=random`;
                  }}
                />
              </div>
              <div className="ml-3">
                <p className="text-lg font-medium text-gray-900">{otherUser?.name}</p>
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
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
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
              {error && (
                <div className="text-red-500 text-sm mb-2">
                  {error}
                </div>
              )}
              <div className="flex items-center">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className={`px-4 py-2 rounded-r-lg ${(!newMessage.trim() || isSending) ? 'bg-gray-300' : 'bg-green-600 hover:bg-green-700'} text-white`}
                >
                  {isSending ? (
                    <svg className="animate-spin h-5 w-5 text-white mx-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Send'
                  )}
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