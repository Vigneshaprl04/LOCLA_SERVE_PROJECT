"use strict";

const notificationService = require("../services/notificationService");

/**
 * Socket.IO handlers for real-time notifications.
 * Marks notifications as read and emits confirmations back to the client.
 * 
 * @param {object} io - The main Socket.IO server instance
 * @param {object} socket - The current connected client socket
 */
module.exports = (io, socket) => {
  // Client marks a single notification as read
  socket.on("notification_mark_read", async (payload) => {
    try {
      const notificationId = Number(payload?.notificationId);
      if (!notificationId || isNaN(notificationId) || notificationId <= 0) {
        socket.emit("notification_error", { message: "Invalid notificationId format" });
        return;
      }

      if (!socket.userId) {
        socket.emit("notification_error", { message: "Access denied: Unauthenticated socket session" });
        return;
      }

      await notificationService.markNotificationAsRead(notificationId, socket.userId);
      
      // Emit read confirmation back to the client
      socket.emit("notification_read", { notificationId });
      console.log(`[Socket] Notification ${notificationId} marked as read by user ${socket.userId}`);
    } catch (error) {
      console.error("[Socket] Error in notification_mark_read handler:", error.message);
      socket.emit("notification_error", { message: error.message || "Mark read operation failed" });
    }
  });

  // Client marks all notifications as read
  socket.on("notification_read_all", async () => {
    try {
      if (!socket.userId) {
        socket.emit("notification_error", { message: "Access denied: Unauthenticated socket session" });
        return;
      }

      const updatedCount = await notificationService.markAllNotificationsAsRead(socket.userId);
      
      // Emit confirmation back to the client
      socket.emit("notification_read_all", { success: true, updatedCount });
      console.log(`[Socket] All notifications marked as read for user ${socket.userId}`);
    } catch (error) {
      console.error("[Socket] Error in notification_read_all handler:", error.message);
      socket.emit("notification_error", { message: error.message || "Mark all read operation failed" });
    }
  });
};
