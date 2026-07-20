"use strict";

const socketEvents = require("./socketEvents");
const providerHandler = require("./handlers/providerHandler");
const bookingHandler = require("./bookingHandler");

let io = null;

/**
 * Initializes the Socket Server with the main Socket.IO server instance.
 * Registers global connection event listener and delegates to handlers.
 * @param {object} ioInstance - The Socket.IO server instance
 */
function init(ioInstance) {
  io = ioInstance;
  
  io.on("connection", (socket) => {
    // Mount the provider socket handler
    providerHandler(io, socket);
    // Mount the booking socket handler
    bookingHandler(io, socket);
  });
}

/**
 * Broadcasts provider online/offline status updates to all connected clients.
 * @param {object} provider - The status details of the provider
 * @param {number} provider.providerId
 * @param {boolean} provider.isOnline
 * @param {string|Date} provider.lastSeen
 */
function broadcastProviderStatus(provider) {
  if (!io) {
    console.error("Socket Server not initialized!");
    return;
  }

  io.emit(socketEvents.SERVER.PROVIDER_STATUS_CHANGED, {
    providerId: provider.providerId,
    isOnline: provider.isOnline,
    lastSeen: provider.lastSeen
  });
}

/**
 * Broadcasts booking status changed updates to all clients in the booking room.
 * @param {object} bookingUpdate
 * @param {number} bookingUpdate.bookingId
 * @param {string} bookingUpdate.status
 * @param {number} bookingUpdate.providerId
 * @param {number} bookingUpdate.userId
 * @param {string|Date} bookingUpdate.updatedAt
 */
function broadcastBookingStatus(bookingUpdate) {
  if (!io) {
    console.error("Socket Server not initialized!");
    return;
  }

  const { bookingId, status, providerId, userId, updatedAt } = bookingUpdate;
  io.to(`booking:${bookingId}`).emit("booking_status_changed", {
    bookingId,
    status,
    providerId,
    userId,
    updatedAt
  });
}

module.exports = {
  init,
  broadcastProviderStatus,
  broadcastBookingStatus
};

