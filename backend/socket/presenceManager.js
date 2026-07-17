"use strict";

/**
 * Manages active provider Socket.IO presence in memory.
 * Maps providerId (Number) -> socketId (String).
 */
class PresenceManager {
  constructor() {
    this.presence = new Map();
    // Maps providerId (Number) -> { lastHeartbeat: Date, timeout: Timer }
    this.heartbeats = new Map();
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

  /**
   * Resets/registers heartbeat metadata for a provider.
   * Clears any active timeout and schedules a new timeout of 40 seconds.
   * @param {number} providerId 
   * @param {function} onTimeoutCallback - Function to invoke when heartbeat is missed
   */
  resetHeartbeat(providerId, onTimeoutCallback) {
    const id = Number(providerId);
    if (isNaN(id) || id <= 0) return;

    this.clearHeartbeat(id);

    const timer = setTimeout(onTimeoutCallback, 40000); // 30s heartbeat + 10s grace
    this.heartbeats.set(id, {
      lastHeartbeat: new Date(),
      timeout: timer
    });
  }

  /**
   * Clears heartbeat timeout and metadata for a provider.
   * @param {number} providerId 
   */
  clearHeartbeat(providerId) {
    const id = Number(providerId);
    const meta = this.heartbeats.get(id);
    if (meta) {
      if (meta.timeout) {
        clearTimeout(meta.timeout);
      }
      this.heartbeats.delete(id);
    }
  }

  /**
   * Retrieves the last heartbeat timestamp for a provider.
   * @param {number} providerId 
   * @returns {Date|null}
   */
  getLastHeartbeat(providerId) {
    const id = Number(providerId);
    const meta = this.heartbeats.get(id);
    return meta ? meta.lastHeartbeat : null;
  }
}

module.exports = new PresenceManager();
