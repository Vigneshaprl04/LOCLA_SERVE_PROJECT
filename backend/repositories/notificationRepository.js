"use strict";

const db = require("../config/db");

/**
 * Creates a notification in the database.
 * 
 * @param {object} params
 * @param {number} params.userId
 * @param {number|null} params.bookingId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type
 * @returns {Promise<object|null>} The inserted notification record
 */
async function createNotification({ userId, bookingId, title, message, type }) {
  const [result] = await db.query(
    `INSERT INTO notifications (user_id, booking_id, title, message, type, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, bookingId, title, message, type]
  );
  
  const [rows] = await db.query(
    `SELECT id, user_id, booking_id, title, message, type, is_read, created_at
     FROM notifications
     WHERE id = ?`,
    [result.insertId]
  );
  return rows[0] || null;
}

/**
 * Gets all notifications for a user, sorted by most recent first.
 * 
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getNotificationsByUserId(userId) {
  const [rows] = await db.query(
    `SELECT id, user_id, booking_id, title, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows;
}

/**
 * Gets the count of unread notifications for a user.
 * 
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function getUnreadCountByUserId(userId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS unreadCount
     FROM notifications
     WHERE user_id = ?
     AND is_read = 0`,
    [userId]
  );
  return rows[0]?.unreadCount || 0;
}

/**
 * Marks a specific notification as read for its owner user.
 * 
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>} Affected rows count
 */
async function markAsRead(notificationId, userId) {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE id = ?
     AND user_id = ?`,
    [notificationId, userId]
  );
  return result.affectedRows;
}

/**
 * Marks all unread notifications as read for a user.
 * 
 * @param {number} userId
 * @returns {Promise<number>} Affected rows count
 */
async function markAllAsRead(userId) {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ?
     AND is_read = 0`,
    [userId]
  );
  return result.affectedRows;
}

/**
 * Deletes a notification if it belongs to the user.
 * 
 * @param {number} notificationId
 * @param {number} userId
 * @returns {Promise<number>} Affected rows count
 */
async function deleteNotification(notificationId, userId) {
  const [result] = await db.query(
    `DELETE FROM notifications
     WHERE id = ?
     AND user_id = ?`,
    [notificationId, userId]
  );
  return result.affectedRows;
}

module.exports = {
  createNotification,
  getNotificationsByUserId,
  getUnreadCountByUserId,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
