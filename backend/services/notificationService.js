"use strict";

const webpush = require("web-push");
const db = require("../config/db");
const notificationRepository = require("../repositories/notificationRepository");

class NotificationError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Configure VAPID details for Web Push API
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_USER || "your_email@gmail.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

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

  // 1. Emit to user's real-time room if socketServer is initialized
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

  // 2. Dispatch live Web Push notifications to user's registered browser endpoints
  try {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const [subs] = await db.query(
        "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
        [userId]
      );

      if (subs.length > 0) {
        const payload = JSON.stringify({
          title: notif.title,
          body: notif.message,
          data: {
            url: notif.booking_id ? `/chat/${notif.booking_id}` : '/user/bookings'
          }
        });

        const pushPromises = subs.map(sub => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          return webpush.sendNotification(pushSubscription, payload)
            .catch(async (err) => {
              // Delete expired/invalid endpoint subscriptions (404 Not Found or 410 Gone)
              if (err.statusCode === 404 || err.statusCode === 410) {
                console.log(`[Push] Cleaning up stale/expired subscription endpoint for user ${userId}`);
                await db.query("DELETE FROM push_subscriptions WHERE endpoint = ?", [sub.endpoint]);
              } else {
                console.error(`[Push] Failed to send push to endpoint:`, err.message);
              }
            });
        });

        await Promise.all(pushPromises);
      }
    }
  } catch (pushErr) {
    console.error("[NotificationService] Push notification dispatch failed:", pushErr.message);
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
