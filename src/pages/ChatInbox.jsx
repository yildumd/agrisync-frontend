import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";

const ChatInbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newChatUserId, setNewChatUserId] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdated", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (doc) => {
        const chatData = doc.data();
        const otherUserId = chatData.participants.find(id => id !== user.uid);
        let otherUserData = {};
        
        try {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            otherUserData = userDoc.data();
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }

        return {
          id: doc.id,
          ...chatData,
          otherUserId,
          otherUserName: otherUserData.name || "Unknown User",
          otherUserPhoto: otherUserData.photoURL || "",
          lastMessageTime: chatData.lastUpdated 
            ? formatDistanceToNow(chatData.lastUpdated.toDate(), { addSuffix: true })
            : "No messages"
        };
      });

      const chatData = await Promise.all(chatPromises);
      setChats(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredChats = chats.filter(chat => 
    chat.otherUserName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectChat = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  const startNewChat = async () => {
    if (!newChatUserId || !user?.uid) return;
    
    try {
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.participants.includes(newChatUserId)
      );
      
      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      // Get recipient info
      const recipientDoc = await getDoc(doc(db, "users", newChatUserId));
      if (!recipientDoc.exists()) {
        alert("User not found");
        return;
      }

      // Create new chat
      const newChatRef = await addDoc(collection(db, "chats"), {
        participants: [user.uid, newChatUserId],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        lastMessage: "",
        lastMessageSender: ""
      });

      navigate(`/chat/${newChatRef.id}`);
      setNewChatUserId("");
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to start new chat");
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white">
      {/* Chat List Sidebar */}
      <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          
          {/* Search */}
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* New Chat Input */}
          <div className="mt-3 flex">
            <input
              type="text"
              placeholder="Enter user ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
              value={newChatUserId}
              onChange={(e) => setNewChatUserId(e.target.value)}
            />
            <button
              onClick={startNewChat}
              className="px-3 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 text-sm"
            >
              New
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? (
                "No matching chats found"
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="mt-2">No chats yet</p>
                  <p className="text-sm mt-1">
                    Start a conversation from the marketplace
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredChats.map((chat) => (
                <li
                  key={chat.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <div className="flex items-center space-x-3">
                    {chat.otherUserPhoto ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={chat.otherUserPhoto}
                        alt={chat.otherUserName}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium">
                        {chat.otherUserName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {chat.otherUserName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {chat.lastMessageTime}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat Content Area */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center p-6 max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {chats.length > 0 ? "Select a chat" : "No chats"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {chats.length > 0
              ? "Choose a conversation from the sidebar"
              : "Start a new conversation from the marketplace"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInbox;