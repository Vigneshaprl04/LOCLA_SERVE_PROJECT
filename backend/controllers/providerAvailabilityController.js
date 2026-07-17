"use strict";

const providerService = require("../services/providerService");
const MESSAGES = require("../constants/messages");

/**
 * REST controller for Provider Availability operations.
 */

/**
 * POST /api/providers/go-online
 * Authenticated provider can update online status.
 */
exports.goOnline = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await providerService.setProviderOnline(userId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error("Error in goOnline controller:", error.message);
    const statusCode = error.message === MESSAGES.PROVIDER_NOT_FOUND ? 404 :
                       error.message === MESSAGES.PROVIDER_NOT_VERIFIED ? 403 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || MESSAGES.ERROR_SERVER,
      error: null
    });
  }
};

/**
 * POST /api/providers/go-offline
 * Authenticated provider can update offline status.
 */
exports.goOffline = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await providerService.setProviderOffline(userId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error("Error in goOffline controller:", error.message);
    const statusCode = error.message === MESSAGES.PROVIDER_NOT_FOUND ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || MESSAGES.ERROR_SERVER,
      error: null
    });
  }
};

/**
 * GET /api/providers/availability/:providerId
 * Public check for provider availability status.
 */
exports.getAvailability = async (req, res) => {
  try {
    const { providerId } = req.params;
    const providerIdNum = Number(providerId);

    if (isNaN(providerIdNum) || providerIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID format",
        error: null
      });
    }

    const result = await providerService.getProviderAvailability(providerIdNum);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error("Error in getAvailability controller:", error.message);
    const statusCode = error.message === MESSAGES.PROVIDER_NOT_FOUND ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || MESSAGES.ERROR_SERVER,
      error: null
    });
  }
};

/**
 * GET /api/providers/search
 * Search available/online providers (extended with available_now filter).
 */
exports.searchAvailableProviders = async (req, res) => {
  try {
    const { city, category, category_id, pincode, available_now } = req.query;

    const categoryVal = category || category_id;

    const filters = {
      category_id: categoryVal ? Number(categoryVal) : undefined,
      city: city || undefined,
      pincode: pincode || undefined,
      available_now: available_now === "true" || available_now === true || available_now === "1" || available_now === 1
    };

    if (filters.category_id !== undefined && isNaN(filters.category_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
        error: null
      });
    }

    const result = await providerService.getAvailableProviders(filters);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error("Error in searchAvailableProviders controller:", error.message);
    return res.status(500).json({
      success: false,
      message: MESSAGES.ERROR_SERVER,
      error: null
    });
  }
};
