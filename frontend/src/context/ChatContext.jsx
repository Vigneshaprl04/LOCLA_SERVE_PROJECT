import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";

export const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { socket } = useAuth();
  const [chatMessages, setChatMessages] = useState(new Map());
  const trackedChatsRef = useRef(new Set());

  // Function to join a booking chat room
  const joinChat = useCallback((bookingId) => {
    if (!bookingId || !socket) return;
    const bId = Number(bookingId);
    if (!trackedChatsRef.current.has(bId)) {
      trackedChatsRef.current.add(bId);
      socket.emit("chat_join", { bookingId: bId });
      console.log(`[ChatContext] Emitted chat_join for booking ${bId}`);
    }
  }, [socket]);

  // Function to send a message over socket
  const sendMessage = useCallback((bookingId, message) => {
    if (!bookingId || !socket || !message || !message.trim()) return;
    socket.emit("chat_send", {
      bookingId: Number(bookingId),
      message: message.trim()
    });
  }, [socket]);

  // Function to initialize message history loaded from REST API
  const setInitialMessages = useCallback((bookingId, messagesList) => {
    if (!bookingId) return;
    const bId = Number(bookingId);
    setChatMessages(prev => {
      const next = new Map(prev);
      next.set(bId, messagesList || []);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      trackedChatsRef.current.clear();
      setChatMessages(new Map());
      return;
    }

    const handleChatMessage = (message) => {
      console.log("[ChatContext] Received chat message:", message);
      const bId = Number(message.bookingId);

      setChatMessages(prev => {
        const next = new Map(prev);
        const list = next.get(bId) || [];
        
        // Prevent duplicate append
        if (list.some(m => m.id === message.messageId)) {
          return prev;
        }

        // Map payload attributes to match existing REST DB representation for compatibility
        const formattedMsg = {
          id: message.messageId,
          booking_id: message.bookingId,
          sender_id: message.senderId,
          receiver_id: message.receiverId,
          message: message.message,
          created_at: message.createdAt
        };

        next.set(bId, [...list, formattedMsg]);
        return next;
      });
    };

    socket.on("chat_message", handleChatMessage);

    const handleReconnect = () => {
      console.log("[ChatContext] Socket reconnected. Re-joining active chat rooms:", trackedChatsRef.current);
      trackedChatsRef.current.forEach((bookingId) => {
        socket.emit("chat_join", { bookingId });
      });
    };

    socket.on("connect", handleReconnect);

    // If socket is already connected, trigger re-join
    if (socket.connected) {
      handleReconnect();
    }

    return () => {
      socket.off("chat_message", handleChatMessage);
      socket.off("connect", handleReconnect);
    };
  }, [socket]);

  return (
    <ChatContext.Provider value={{ chatMessages, joinChat, sendMessage, setInitialMessages }}>
      {children}
    </ChatContext.Provider>
  );
};
