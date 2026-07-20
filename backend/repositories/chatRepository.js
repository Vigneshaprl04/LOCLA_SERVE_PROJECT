"use strict";

const db = require("../config/db");

/**
 * Retrieves booking details including the customer's user_id and provider's user_id.
 * Used for membership authorization check.
 * 
 * @param {number} bookingId
 * @returns {Promise<object|null>}
 */
async function getBookingParticipants(bookingId) {
  const [rows] = await db.query(
    `SELECT b.user_id, p.user_id AS provider_user_id
     FROM bookings b
     JOIN providers p ON b.provider_id = p.id
     WHERE b.id = ?`,
    [bookingId]
  );
  return rows[0] || null;
}

/**
 * Retrieves all messages for a given booking ID.
 * 
 * @param {number} bookingId
 * @returns {Promise<Array>}
 */
async function getMessagesByBookingId(bookingId) {
  const [rows] = await db.query(
    `SELECT
       m.id,
       m.booking_id,
       m.sender_id,
       m.receiver_id,
       m.message,
       m.is_read,
       m.created_at,
       u.name AS sender_name
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.booking_id = ?
     ORDER BY m.created_at ASC, m.id ASC`,
    [bookingId]
  );
  return rows;
}

/**
 * Marks all messages received by the user in a booking as read.
 * 
 * @param {number} bookingId
 * @param {number} receiverId
 * @returns {Promise<number>} Number of updated rows
 */
async function markMessagesAsRead(bookingId, receiverId) {
  const [result] = await db.query(
    `UPDATE messages
     SET is_read = TRUE
     WHERE booking_id = ?
     AND receiver_id = ?`,
    [bookingId, receiverId]
  );
  return result.affectedRows;
}

/**
 * Saves a new chat message to the database and returns the populated record.
 * 
 * @param {object} params
 * @param {number} params.bookingId
 * @param {number} params.senderId
 * @param {number} params.receiverId
 * @param {string} params.message
 * @returns {Promise<object|null>} The newly created message record
 */
async function createMessage({ bookingId, senderId, receiverId, message }) {
  const [result] = await db.query(
    `INSERT INTO messages (booking_id, sender_id, receiver_id, message)
     VALUES (?, ?, ?, ?)`,
    [bookingId, senderId, receiverId, message.trim()]
  );
  
  const [rows] = await db.query(
    `SELECT m.id, m.booking_id, m.sender_id, m.receiver_id, m.message, m.is_read, m.created_at, u.name AS sender_name
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.id = ?`,
    [result.insertId]
  );
  return rows[0] || null;
}

module.exports = {
  getBookingParticipants,
  getMessagesByBookingId,
  markMessagesAsRead,
  createMessage
};
