"use strict";

const notificationRepository = require("../repositories/notificationRepository");

class NotificationError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Saves a notification and triggers real-time Socket.IO broadcast if socketServer is present.
 * 
 * @param {object} params
 * @param {number} params.userId
 * @param {number|null} params.bookingId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type
 * @returns {Promise<object>} The stored notification
 */
async function createNotification({ userId, bookingId, title, message, type }) {
  if (!userId) {
    throw new NotificationError("User ID is required", 400);
  }

  const notif = await notificationRepository.createNotification({
    userId,
    bookingId,
    title,
    message,
    type
  });

  // Emit to user's real-time room if socketServer is initialized
  try {
    const socketServer = require("../socket/socketServer");
    if (socketServer && typeof socketServer.broadcastNotification === "function") {
      socketServer.broadcastNotification(userId, {
        id: Number(notif.id),
        title: notif.title,
        message: notif.message,
        type: notif.type,
        bookingId: notif.booking_id ? Number(notif.booking_id) : null,
        createdAt: notif.created_at
      });
    }
  } catch (err) {
    console.log("[NotificationService] Socket broadcast skipped (not configured yet):", err.message);
  }

  return notif;
}

/**
 * Retrieves all notifications for a user.
 * 
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getNotificationsForUser(userId) {
  return await notificationRepository.getNotificationsByUserId(userId);
}

/**
 * Retrieves unread notification count.
 * 
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  return await notificationRepository.getUnreadCountByUserId(userId);
}

/**
 * Marks a specific notification as read.
 * 
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function markNotificationAsRead(notificationId, userId) {
  const affected = await notificationRepository.markAsRead(notificationId, userId);
  if (affected === 0) {
    throw new NotificationError("Notification not found", 404);
  }
  return affected;
}

/**
 * Marks all unread notifications as read.
 * 
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function markAllNotificationsAsRead(userId) {
  return await notificationRepository.markAllAsRead(userId);
}

/**
 * Deletes a notification.
 * 
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function deleteNotification(notificationId, userId) {
  const affected = await notificationRepository.deleteNotification(notificationId, userId);
  if (affected === 0) {
    throw new NotificationError("Notification not found", 404);
  }
  return affected;
}

module.exports = {
  NotificationError,
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
