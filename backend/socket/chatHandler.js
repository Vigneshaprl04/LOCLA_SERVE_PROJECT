"use strict";

const chatService = require("../services/chatService");

/**
 * Socket.IO handlers for real-time one-to-one chat.
 * Enforces room boundaries and verifies socket membership via chatService.
 * 
 * @param {object} io - The main Socket.IO server instance
 * @param {object} socket - The current connected client socket
 */
module.exports = (io, socket) => {
  // 1. Join Chat Room
  socket.on("chat_join", async (payload) => {
    try {
      const bookingId = Number(payload?.bookingId);
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        console.error(`[Socket] Invalid bookingId received in chat_join:`, payload?.bookingId);
        socket.emit("chat_error", { message: "Invalid bookingId format" });
        return;
      }

      if (!socket.userId) {
        socket.emit("chat_error", { message: "Access denied: Unauthenticated socket session" });
        return;
      }

      // Verify booking membership
      await chatService.verifyBookingAccess(bookingId, socket.userId);

      const roomName = `chat:booking:${bookingId}`;
      socket.join(roomName);
      console.log(`[Socket] Socket ${socket.id} (user ${socket.userId}) joined chat room ${roomName}`);
    } catch (error) {
      console.error("[Socket] Error in chat_join handler:", error.message);
      socket.emit("chat_error", { message: error.message || "Internal server error during chat join" });
    }
  });

  // 2. Send Message
  socket.on("chat_send", async (payload) => {
    try {
      const bookingId = Number(payload?.bookingId);
      const messageContent = payload?.message;

      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        console.error(`[Socket] Invalid bookingId received in chat_send:`, payload?.bookingId);
        socket.emit("chat_error", { message: "Invalid bookingId format" });
        return;
      }

      if (!socket.userId) {
        socket.emit("chat_error", { message: "Access denied: Unauthenticated socket session" });
        return;
      }

      if (!messageContent || !messageContent.trim()) {
        socket.emit("chat_error", { message: "Message content cannot be empty" });
        return;
      }

      // Save message to database after verifying access (inside chatService)
      const savedMessage = await chatService.postMessage({
        bookingId,
        senderId: socket.userId,
        message: messageContent
      });

      // Broadcast to room members
      const socketServer = require("./socketServer");
      socketServer.broadcastChatMessage({
        messageId: Number(savedMessage.id),
        bookingId: Number(savedMessage.booking_id),
        senderId: Number(savedMessage.sender_id),
        receiverId: Number(savedMessage.receiver_id),
        message: savedMessage.message,
        createdAt: savedMessage.created_at
      });

      console.log(`[Socket] Message from user ${socket.userId} sent in booking ${bookingId}`);
    } catch (error) {
      console.error("[Socket] Error in chat_send handler:", error.message);
      socket.emit("chat_error", { message: error.message || "Message sending failed" });
    }
  });
};
