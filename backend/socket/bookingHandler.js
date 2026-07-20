"use strict";

/**
 * Socket.IO handlers for Booking real-time status updates.
 * Handles room joining for booking-specific status events.
 * 
 * @param {object} io - The main Socket.IO server instance
 * @param {object} socket - The current connected client socket
 */
module.exports = (io, socket) => {
  socket.on("booking_join", (payload) => {
    try {
      const bookingId = Number(payload?.bookingId);
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        console.error(`[Socket] Invalid bookingId received in booking_join:`, payload?.bookingId);
        socket.emit("socket_error", { message: "Invalid bookingId format" });
        return;
      }

      const roomName = `booking:${bookingId}`;
      socket.join(roomName);
      console.log(`[Socket] Socket ${socket.id} joined room ${roomName}`);
    } catch (error) {
      console.error("[Socket] Error in booking_join handler:", error.message);
      socket.emit("socket_error", { message: "Internal server error during booking room join" });
    }
  });
};
