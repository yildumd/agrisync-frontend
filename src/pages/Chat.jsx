// src/pages/Chat.jsx

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const Chat = () => {
  const { chatId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) setCurrentUser(user);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    // Scroll to the latest message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    const messagesRef = collection(db, "chats", chatId, "messages");

    await addDoc(messagesRef, {
      text: message.trim(),
      senderId: currentUser.uid,
      receiverId: getReceiverId(chatId, currentUser.uid),
      timestamp: serverTimestamp(),
    });

    setMessage("");
  };

  const getReceiverId = (chatId, senderId) => {
    const ids = chatId.split("_");
    return ids.find(id => id !== senderId);
  };

  if (!currentUser) {
    return <div className="text-center mt-10 text-gray-500">Loading chat...</div>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="h-96 overflow-y-scroll mb-4 border p-4 rounded bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400">Start the conversation...</div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`mb-2 p-2 rounded-lg max-w-xs text-sm ${
                msg.senderId === currentUser.uid
                  ? "bg-green-200 ml-auto text-right"
                  : "bg-gray-200 text-left"
              }`}
            >
              <div>{msg.text}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          className="flex-1 p-2 border rounded"
        />
        <button type="submit" className="bg-green-700 text-white px-4 rounded">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
