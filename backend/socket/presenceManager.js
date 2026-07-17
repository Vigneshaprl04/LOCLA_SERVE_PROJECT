"use strict";

/**
 * Manages active provider Socket.IO presence in memory.
 * Maps providerId (Number) -> socketId (String).
 */
class PresenceManager {
  constructor() {
    this.presence = new Map();
  }

  /**
   * Adds or registers a provider with their socket ID.
   * @param {number} providerId 
   * @param {string} socketId 
   */
  addProvider(providerId, socketId) {
    const id = Number(providerId);
    if (!id || isNaN(id) || id <= 0) {
      throw new Error("Invalid providerId");
    }
    this.presence.set(id, socketId);
  }

  /**
   * Removes a provider from the presence tracking.
   * @param {number} providerId 
   */
  removeProvider(providerId) {
    const id = Number(providerId);
    this.presence.delete(id);
  }

  /**
   * Replaces a provider's socket mapping (for duplicate sessions).
   * @param {number} providerId 
   * @param {string} socketId 
   * @returns {string|null} The old socket ID if it existed, otherwise null
   */
  replaceProvider(providerId, socketId) {
    const id = Number(providerId);
    if (!id || isNaN(id) || id <= 0) {
      throw new Error("Invalid providerId");
    }
    const oldSocketId = this.presence.get(id) || null;
    this.presence.set(id, socketId);
    return oldSocketId;
  }

  /**
   * Gets the active socket ID mapped to a provider.
   * @param {number} providerId 
   * @returns {string|undefined}
   */
  getSocket(providerId) {
    return this.presence.get(Number(providerId));
  }

  /**
   * Checks if a provider is online.
   * @param {number} providerId 
   * @returns {boolean}
   */
  isOnline(providerId) {
    return this.presence.has(Number(providerId));
  }

  /**
   * Returns list of all online provider IDs.
   * @returns {Array<number>}
   */
  getOnlineProviders() {
    return Array.from(this.presence.keys());
  }
}

module.exports = new PresenceManager();
