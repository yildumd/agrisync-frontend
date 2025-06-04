// src/pages/ChatInbox.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ChatList from "../components/ChatList";

const ChatInbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setChats(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectChat = (chat) => {
    navigate(`/chat/${chat.id}`);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      <ChatList
        chats={chats}
        selectedChatId={null}
        onSelectChat={handleSelectChat}
      />

      <div className="flex-1 flex items-center justify-center text-gray-500 px-4">
        {loading ? (
          <p className="text-sm">Loading chats...</p>
        ) : chats.length === 0 ? (
          <p className="text-sm text-center">
            You don’t have any chats yet.<br />
            Start a conversation with a farmer from the marketplace.
          </p>
        ) : (
          <p className="text-sm">Select a chat to start messaging.</p>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;
