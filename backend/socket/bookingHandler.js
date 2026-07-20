"use strict";

const db = require("../config/db");

/**
 * Socket.IO handlers for Booking real-time status updates and live tracking.
 * Handles room joining, verification, and location streaming for active bookings.
 * 
 * @param {object} io - The main Socket.IO server instance
 * @param {object} socket - The current connected client socket
 */
module.exports = (io, socket) => {
  
  // Standard booking status channel room join
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

  // customer:tracking:start - Begin live tracking subscription
  socket.on("customer:tracking:start", async (payload) => {
    try {
      const bookingId = Number(payload?.bookingId);
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        socket.emit("socket_error", { message: "Invalid bookingId format" });
        return;
      }

      if (!socket.userId) {
        socket.emit("socket_error", { message: "Unauthorized socket session" });
        return;
      }

      // Security validation: Only booking participants may track
      const [bookings] = await db.query(
        `SELECT b.id, b.user_id, p.user_id AS provider_user_id 
         FROM bookings b
         JOIN providers p ON b.provider_id = p.id
         WHERE b.id = ?`,
        [bookingId]
      );

      if (bookings.length === 0) {
        socket.emit("socket_error", { message: "Booking record not found" });
        return;
      }

      const booking = bookings[0];
      if (booking.user_id !== socket.userId && booking.provider_user_id !== socket.userId) {
        socket.emit("socket_error", { message: "Access denied: Not a booking participant" });
        return;
      }

      const roomName = `booking:tracking:${bookingId}`;
      socket.join(roomName);
      console.log(`[Socket] Socket ${socket.id} (user: ${socket.userId}) joined tracking room ${roomName}`);
      socket.emit("tracking:started", { bookingId });
    } catch (error) {
      console.error("[Socket] Error in customer:tracking:start:", error.message);
      socket.emit("socket_error", { message: "Internal server error starting tracking" });
    }
  });

  // customer:tracking:stop - Unsubscribe from tracking updates
  socket.on("customer:tracking:stop", (payload) => {
    try {
      const bookingId = Number(payload?.bookingId);
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        return;
      }

      const roomName = `booking:tracking:${bookingId}`;
      socket.leave(roomName);
      console.log(`[Socket] Socket ${socket.id} left tracking room ${roomName}`);
      socket.emit("tracking:stopped", { bookingId });
    } catch (error) {
      console.error("[Socket] Error in customer:tracking:stop:", error.message);
    }
  });

  // provider:location:update - Provider updates live travel coordinates
  socket.on("provider:location:update", async (payload) => {
    try {
      const bookingId = Number(payload?.bookingId);
      const latitude = Number(payload?.latitude);
      const longitude = Number(payload?.longitude);

      if (!bookingId || isNaN(bookingId) || isNaN(latitude) || isNaN(longitude)) {
        socket.emit("socket_error", { message: "Invalid payload parameters" });
        return;
      }

      if (!socket.userId) {
        socket.emit("socket_error", { message: "Unauthorized socket session" });
        return;
      }

      // Security check: Verify socket user is the provider for this booking and booking is tracking-active
      const [bookings] = await db.query(
        `SELECT b.id, b.booking_status, p.user_id AS provider_user_id 
         FROM bookings b
         JOIN providers p ON b.provider_id = p.id
         WHERE b.id = ?`,
        [bookingId]
      );

      if (bookings.length === 0) {
        socket.emit("socket_error", { message: "Booking record not found" });
        return;
      }

      const booking = bookings[0];
      if (booking.provider_user_id !== socket.userId) {
        socket.emit("socket_error", { message: "Access denied: Only assigned provider can update tracking locations" });
        return;
      }

      // Ensure booking is in accepted or on_the_way state to allow location tracking
      if (booking.booking_status !== 'accepted' && booking.booking_status !== 'on_the_way') {
        socket.emit("socket_error", { message: "Tracking coordinates rejected: Booking is not active" });
        return;
      }

      // Update provider location in database
      await db.query(
        `UPDATE providers 
         SET latitude = ?, longitude = ?, last_location_updated_at = NOW() 
         WHERE user_id = ?`,
        [latitude, longitude, socket.userId]
      );

      // Broadcast update to all subscribers in tracking room
      const roomName = `booking:tracking:${bookingId}`;
      io.to(roomName).emit("booking:tracking:update", {
        bookingId,
        latitude,
        longitude,
        status: booking.booking_status,
        timestamp: new Date()
      });

      console.log(`[Socket] Broadcast coordinates for booking ${bookingId}: lat=${latitude}, lng=${longitude}`);
    } catch (error) {
      console.error("[Socket] Error in provider:location:update handler:", error.message);
      socket.emit("socket_error", { message: "Internal server error broadcasting location" });
    }
  });
};
