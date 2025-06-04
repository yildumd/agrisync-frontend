import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const ChatPage = () => {
  const { farmerId } = useParams();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [farmerName, setFarmerName] = useState("");

  const chatId =
    currentUser?.uid > farmerId
      ? `${currentUser.uid}_${farmerId}`
      : `${farmerId}_${currentUser?.uid}`;

  const chatRef = doc(db, "chats", chatId);
  const messagesRef = collection(db, "chats", chatId, "messages");

  // ✅ Fetch farmer name
  useEffect(() => {
    const getFarmerName = async () => {
      try {
        const farmerRef = doc(db, "farmers", farmerId);
        const farmerSnap = await getDoc(farmerRef);
        if (farmerSnap.exists()) {
          const farmerData = farmerSnap.data();
          setFarmerName(farmerData.name || "Farmer");
        }
      } catch (error) {
        console.error("Error fetching farmer name:", error.message);
      }
    };

    getFarmerName();
  }, [farmerId]);

  // ✅ Chat listener
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe;

    const setupChatListener = async () => {
      try {
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          await setDoc(chatRef, {
            participants: [currentUser.uid, farmerId],
            lastMessage: "",
            timestamp: serverTimestamp(),
          });
        }

        const q = query(messagesRef, orderBy("timestamp", "asc"));

        unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(msgs);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up chat listener:", error.message);
        alert("Unable to load chat messages.");
        setLoading(false);
      }
    };

    setupChatListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, currentUser, farmerId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [currentUser.uid, farmerId],
          lastMessage: text.trim(),
          timestamp: serverTimestamp(),
        });
      } else {
        await setDoc(
          chatRef,
          {
            lastMessage: text.trim(),
            timestamp: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: text.trim(),
        timestamp: serverTimestamp(),
      });

      setText("");
    } catch (error) {
      console.error("Error sending message:", error.message);
      alert("Failed to send message. Please try again.");
    }
  };

  if (!currentUser) {
    return <div className="text-center mt-10">You must be logged in to chat.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 border rounded shadow p-4 h-[80vh] flex flex-col">
      <h2 className="text-xl font-bold text-center mb-2">
        Chat with {farmerName}
      </h2>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Say hi!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-md max-w-xs ${
                msg.senderId === currentUser.uid
                  ? "bg-green-200 ml-auto text-right"
                  : "bg-gray-200 mr-auto text-left"
              }`}
            >
              {msg.text}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-green-700 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
