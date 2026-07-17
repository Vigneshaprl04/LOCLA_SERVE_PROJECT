"use strict";

const presenceManager = require("../presenceManager");
const socketEvents = require("../socketEvents");

/**
 * Socket.IO handlers for Provider presence and status tracking.
 * Handles provider registration, duplicate sessions, and clean disconnects.
 * @param {object} io - The main Socket.IO server instance
 * @param {object} socket - The current connected client socket
 */
module.exports = (io, socket) => {
  // Handle provider joining the presence tracking room
  socket.on(socketEvents.CLIENT.PROVIDER_JOIN, (payload) => {
    try {
      const providerId = Number(payload?.providerId);
      if (!providerId || isNaN(providerId) || providerId <= 0) {
        console.error(`[Socket] Invalid providerId received in provider_join:`, payload?.providerId);
        socket.emit("socket_error", { message: "Invalid providerId format" });
        return;
      }

      // Handle duplicate session replacement
      const oldSocketId = presenceManager.getSocket(providerId);
      if (oldSocketId) {
        console.log(`[Socket] Duplicate connection for provider ${providerId}. Replacing socket ${oldSocketId} with ${socket.id}`);
        
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.emit("socket_error", { message: "Multiple connections detected. You have been disconnected." });
          oldSocket.disconnect(true);
        }
      }

      // Add to presence manager and record providerId on socket metadata
      presenceManager.addProvider(providerId, socket.id);
      socket.providerId = providerId;

      console.log(`[Socket] Provider ${providerId} successfully registered on socket ${socket.id}`);
    } catch (error) {
      console.error("[Socket] Error in provider_join handler:", error.message);
      socket.emit("socket_error", { message: "Internal server error during join" });
    }
  });

  // Handle socket disconnection
  socket.on("disconnect", () => {
    try {
      if (socket.providerId) {
        const providerId = socket.providerId;
        const currentSocketId = presenceManager.getSocket(providerId);

        // Clean up and broadcast OFFLINE ONLY if this disconnected socket is the active session
        if (currentSocketId === socket.id) {
          presenceManager.removeProvider(providerId);
          console.log(`[Socket] Active session for provider ${providerId} disconnected (${socket.id}). Broadcasting OFFLINE.`);

          // Require socketServer dynamically to avoid circular dependency
          const socketServer = require("../socketServer");
          socketServer.broadcastProviderStatus({
            providerId,
            isOnline: false,
            lastSeen: new Date()
          });
        } else {
          console.log(`[Socket] Stale/duplicate socket ${socket.id} disconnected for provider ${providerId}. Active socket is ${currentSocketId}. No broadcast needed.`);
        }
      }
    } catch (error) {
      console.error("[Socket] Error in provider disconnect handler:", error.message);
    }
  });
};
