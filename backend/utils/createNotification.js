"use strict";

const notificationService = require("../services/notificationService");

/**
 * Backward-compatible helper utility that routes notification creations
 * through the unified notificationService layer.
 * 
 * @param {object} params
 * @param {object} [params.io] - Kept for backward compatibility signature
 * @param {number} params.userId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type]
 * @param {number|null} [params.bookingId]
 * @returns {Promise<object>} The stored notification
 */
const createNotification = async ({
  io,
  userId,
  title,
  message,
  type = "general",
  bookingId = null
}) => {
  return await notificationService.createNotification({
    userId,
    bookingId,
    title,
    message,
    type
  });
};

module.exports = createNotification;
