"use strict";

const providerRepository = require("../repositories/providerRepository");
const { runInTransaction } = require("../utils/transactionHelper");
const PROVIDER_STATUS = require("../constants/providerStatus");
const MESSAGES = require("../constants/messages");

/**
 * Service to manage Provider Availability business logic.
 */
class ProviderService {
  /**
   * Sets a provider to ONLINE status.
   * Runs in a transaction to update status and insert transition audit logs safely.
   * @param {number} userId - The user ID of the provider
   * @returns {Promise<Object>} Standardized response object
   */
  async setProviderOnline(userId) {
    if (!userId) {
      throw new Error(MESSAGES.UNAUTHORIZED);
    }

    return await runInTransaction(async (connection) => {
      // 1. Fetch profile with FOR UPDATE lock inside transaction to prevent concurrent updates
      const profile = await providerRepository.getProfileByUserId(userId, { connection, lock: true });
      if (!profile) {
        throw new Error(MESSAGES.PROVIDER_NOT_FOUND);
      }

      // 2. Verify provider is active/verified (verification_status must be 'verified')
      if (profile.verification_status !== "verified") {
        throw new Error(MESSAGES.PROVIDER_NOT_VERIFIED);
      }

      // 3. Prevent duplicate ONLINE updates
      if (profile.is_online === 1) {
        return {
          success: true,
          message: "Provider is already online",
          data: {
            providerId: profile.provider_id,
            isOnline: true,
            lastSeen: profile.last_seen
          }
        };
      }

      // 4. Update online status
      const lastSeen = new Date();
      const updated = await providerRepository.updateOnlineStatus(userId, 1, lastSeen, { connection });
      if (!updated) {
        throw new Error(MESSAGES.DB_ERROR);
      }

      // 5. Create audit log inside the same transaction
      const previousStatus = profile.is_online === 1 ? PROVIDER_STATUS.ONLINE : PROVIDER_STATUS.OFFLINE;
      await providerRepository.createStatusLog(
        profile.provider_id,
        previousStatus,
        PROVIDER_STATUS.ONLINE,
        userId,
        { connection }
      );

      return {
        success: true,
        message: MESSAGES.STATUS_UPDATED,
        data: {
          providerId: profile.provider_id,
          isOnline: true,
          lastSeen
        }
      };
    });
  }

  /**
   * Sets a provider to OFFLINE status.
   * Runs in a transaction to update status and log transitions.
   * @param {number} userId - The user ID of the provider
   * @returns {Promise<Object>} Standardized response object
   */
  async setProviderOffline(userId) {
    if (!userId) {
      throw new Error(MESSAGES.UNAUTHORIZED);
    }

    return await runInTransaction(async (connection) => {
      // 1. Fetch profile with FOR UPDATE lock inside transaction
      const profile = await providerRepository.getProfileByUserId(userId, { connection, lock: true });
      if (!profile) {
        throw new Error(MESSAGES.PROVIDER_NOT_FOUND);
      }

      // 2. Prevent duplicate OFFLINE updates
      if (profile.is_online === 0) {
        return {
          success: true,
          message: "Provider is already offline",
          data: {
            providerId: profile.provider_id,
            isOnline: false,
            lastSeen: profile.last_seen
          }
        };
      }

      // 3. Update status to offline
      const lastSeen = new Date();
      const updated = await providerRepository.updateOnlineStatus(userId, 0, lastSeen, { connection });
      if (!updated) {
        throw new Error(MESSAGES.DB_ERROR);
      }

      // 4. Create audit log
      const previousStatus = profile.is_online === 1 ? PROVIDER_STATUS.ONLINE : PROVIDER_STATUS.OFFLINE;
      await providerRepository.createStatusLog(
        profile.provider_id,
        previousStatus,
        PROVIDER_STATUS.OFFLINE,
        userId,
        { connection }
      );

      return {
        success: true,
        message: MESSAGES.STATUS_UPDATED,
        data: {
          providerId: profile.provider_id,
          isOnline: false,
          lastSeen
        }
      };
    });
  }

  /**
   * Fetch available/online providers using filters.
   * @param {Object} filters 
   * @returns {Promise<Object>} Standardized response object
   */
  async getAvailableProviders(filters = {}) {
    try {
      const providers = await providerRepository.searchProviders(filters);
      return {
        success: true,
        message: MESSAGES.SUCCESS,
        data: {
          count: providers.length,
          providers
        }
      };
    } catch (error) {
      console.error("Error in getAvailableProviders service:", error.message);
      throw error;
    }
  }

  /**
   * Fetch current provider availability status.
   * @param {number} providerId 
   * @returns {Promise<Object>} Standardized response object
   */
  async getProviderAvailability(providerId) {
    if (!providerId) {
      throw new Error("Provider ID is required");
    }

    try {
      const provider = await providerRepository.getProviderById(providerId);
      if (!provider) {
        throw new Error(MESSAGES.PROVIDER_NOT_FOUND);
      }

      return {
        success: true,
        message: MESSAGES.SUCCESS,
        data: {
          providerId: provider.provider_id,
          isOnline: provider.is_online === 1,
          lastSeen: provider.last_seen
        }
      };
    } catch (error) {
      console.error("Error in getProviderAvailability service:", error.message);
      throw error;
    }
  }
}

module.exports = new ProviderService();
