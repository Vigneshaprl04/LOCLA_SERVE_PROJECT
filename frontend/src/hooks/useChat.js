import { useContext, useEffect, useState } from "react";
import { ChatContext } from "../context/ChatContext";
import api from "../api";

/**
 * Custom hook to interact with a specific booking chat.
 * Joins room, loads message history via REST if not cached, and exposes sendMessage.
 * Hook reads only from ChatContext and does not create private socket listeners.
 * 
 * @param {number|string} bookingId
 * @returns {object} { messages, sendMessage, loading, error }
 */
export const useChat = (bookingId) => {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }

  const { chatMessages, joinChat, sendMessage, setInitialMessages } = context;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bId = Number(bookingId);
  const messages = chatMessages.get(bId);

  useEffect(() => {
    if (!bId) return;

    // Join the Socket.IO room (managed globally via context)
    joinChat(bId);

    // Fetch message history from REST API on first demand
    if (messages === undefined) {
      const fetchHistory = async () => {
        try {
          setLoading(true);
          setError("");
          const response = await api.get(`/messages/${bId}`);
          setInitialMessages(bId, response.data.messages || []);
        } catch (err) {
          console.error("Failed to load chat history in useChat hook:", err);
          setError(err.response?.data?.message || "Failed to load chat history");
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    }
  }, [bId, joinChat, messages, setInitialMessages]);

  return {
    messages: messages || [],
    sendMessage: (msgText) => sendMessage(bId, msgText),
    loading: messages === undefined || loading,
    error
  };
};
