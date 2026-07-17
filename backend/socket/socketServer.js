"use strict";

const socketEvents = require("./socketEvents");
const providerHandler = require("./handlers/providerHandler");

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

module.exports = {
  init,
  broadcastProviderStatus
};
