// src/components/ChatList.jsx

import React from "react";

const ChatList = ({
  chats = [],
  selectedChatId = "",
  onSelectChat = () => {},
  loading = false,
}) => {
  return (
    <div className="w-full md:w-1/3 bg-white border-r h-full overflow-y-auto">
      <h2 className="text-xl font-semibold p-4 border-b">Chats</h2>

      {loading ? (
        <div className="p-4 text-gray-400 animate-pulse">Loading chats...</div>
      ) : chats.length === 0 ? (
        <div className="p-4 text-gray-500 text-sm italic">No chats yet. Start a conversation!</div>
      ) : (
        <ul role="list" className="divide-y divide-gray-200">
          {chats.map((chat) => {
            const isActive = selectedChatId === chat.id;
            const displayName = chat.name || "Unknown User";
            const lastMsg = chat.lastMessage || "No messages yet";
            const timestamp = chat.timestamp?.toDate?.() || new Date(chat.timestamp);
            const timeString = timestamp?.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <li
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                className={`p-4 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                  isActive ? "bg-green-100" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-medium truncate">{displayName}</p>
                  {timeString && (
                    <span className="text-xs text-gray-400 shrink-0">{timeString}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{lastMsg}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
