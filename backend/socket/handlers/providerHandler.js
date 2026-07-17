"use strict";

const presenceManager = require("../presenceManager");
const socketEvents = require("../socketEvents");
const providerService = require("../../services/providerService");

/**
 * Socket.IO handlers for Provider presence and status tracking.
 * Handles provider registration, heartbeat timeouts, database updates, and clean disconnects.
 * 
 * @param {object} io - The main Socket.IO server instance
 * @param {object} socket - The current connected client socket
 */
module.exports = (io, socket) => {
  
  // Timeout callback function for missed heartbeats
  const handleHeartbeatTimeout = async () => {
    try {
      const providerId = socket.providerId;
      if (!providerId) return;

      const currentSocketId = presenceManager.getSocket(providerId);
      // Prevent duplicate DB updates and duplicate broadcasts:
      // only proceed if this socket is still recorded as the active session
      if (currentSocketId === socket.id) {
        presenceManager.removeProvider(providerId);
        presenceManager.clearHeartbeat(providerId);

        console.log(`[Socket] Missed heartbeat. Provider ${providerId} timeout expired (socket: ${socket.id}). Auto-offlining.`);

        // Update database to offline using injected service
        if (socket.userId) {
          try {
            await providerService.setProviderOffline(socket.userId);
          } catch (dbErr) {
            console.error(`[Socket] Auto-offline DB update failed for provider ${providerId}:`, dbErr.message);
          }
        }

        // Broadcast offline status update
        const socketServer = require("../socketServer");
        socketServer.broadcastProviderStatus({
          providerId,
          isOnline: false,
          lastSeen: new Date()
        });

        // Forcefully close the socket session
        socket.emit("socket_error", { message: "Heartbeat timeout. Connection closed." });
        socket.disconnect(true);
      }
    } catch (error) {
      console.error("[Socket] Error inside heartbeat timeout callback:", error.message);
    }
  };

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
        // Explicitly clear heartbeat mapping for the replaced socket
        presenceManager.clearHeartbeat(providerId);
      }

      // Add to presence manager and record providerId on socket metadata
      presenceManager.addProvider(providerId, socket.id);
      socket.providerId = providerId;

      // Start/register the heartbeat timeout tracker
      presenceManager.resetHeartbeat(providerId, handleHeartbeatTimeout);

      console.log(`[Socket] Provider ${providerId} successfully registered on socket ${socket.id}`);
    } catch (error) {
      console.error("[Socket] Error in provider_join handler:", error.message);
      socket.emit("socket_error", { message: "Internal server error during join" });
    }
  });

  // Handle client heartbeat event
  socket.on("provider_heartbeat", () => {
    try {
      const providerId = socket.providerId;
      if (!providerId) {
        console.error(`[Socket] provider_heartbeat received from socket ${socket.id} without providerId metadata`);
        socket.emit("socket_error", { message: "Session not registered. Please join first." });
        return;
      }

      // Prevent processing heartbeats from stale/duplicate sockets
      const activeSocketId = presenceManager.getSocket(providerId);
      if (activeSocketId !== socket.id) {
        console.error(`[Socket] Heartbeat ignored for stale/replaced socket ${socket.id} (active: ${activeSocketId})`);
        socket.emit("socket_error", { message: "Stale socket session" });
        return;
      }

      // Reset the heartbeat timeout on receiving valid heartbeat
      presenceManager.resetHeartbeat(providerId, handleHeartbeatTimeout);
      console.log(`[Socket] Valid heartbeat received for provider ${providerId} (socket: ${socket.id})`);
    } catch (error) {
      console.error("[Socket] Error in provider_heartbeat handler:", error.message);
    }
  });

  // Handle socket disconnection
  socket.on("disconnect", async () => {
    try {
      if (socket.providerId) {
        const providerId = socket.providerId;
        const currentSocketId = presenceManager.getSocket(providerId);

        // Clean up and update DB/broadcast ONLY if this disconnected socket is the active session
        if (currentSocketId === socket.id) {
          presenceManager.removeProvider(providerId);
          presenceManager.clearHeartbeat(providerId);

          console.log(`[Socket] Active session for provider ${providerId} disconnected (${socket.id}). Updating DB & Broadcasting offline.`);

          // Update database to offline using injected service
          if (socket.userId) {
            try {
              await providerService.setProviderOffline(socket.userId);
            } catch (dbErr) {
              console.error(`[Socket] Disconnect DB update failed for provider ${providerId}:`, dbErr.message);
            }
          }

          // Broadcast offline status update
          const socketServer = require("../socketServer");
          socketServer.broadcastProviderStatus({
            providerId,
            isOnline: false,
            lastSeen: new Date()
          });
        } else {
          console.log(`[Socket] Replaced/stale socket ${socket.id} disconnected for provider ${providerId}. No DB write or broadcast needed.`);
        }
      }
    } catch (error) {
      console.error("[Socket] Error in provider disconnect handler:", error.message);
    }
  });
};
