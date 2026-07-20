"use strict";

const chatRepository = require("../repositories/chatRepository");

class ChatError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Verifies if a user has access to a specific booking's chat.
 * 
 * @param {number} bookingId
 * @param {number} userId
 * @returns {Promise<object>} The booking details if authorized
 */
async function verifyBookingAccess(bookingId, userId) {
  const booking = await chatRepository.getBookingParticipants(bookingId);
  if (!booking) {
    throw new ChatError("Booking not found", 404);
  }

  const uId = Number(userId);
  if (uId !== Number(booking.user_id) && uId !== Number(booking.provider_user_id)) {
    throw new ChatError("You cannot access this booking chat", 403);
  }

  return booking;
}

/**
 * Gets message history for a booking after verifying user access.
 * 
 * @param {number} bookingId
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getBookingMessages(bookingId, userId) {
  await verifyBookingAccess(bookingId, userId);
  return await chatRepository.getMessagesByBookingId(bookingId);
}

/**
 * Marks incoming messages as read for a booking.
 * 
 * @param {number} bookingId
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function markMessagesAsRead(bookingId, userId) {
  return await chatRepository.markMessagesAsRead(bookingId, userId);
}

/**
 * Verifies access and stores a new message.
 * 
 * @param {object} params
 * @param {number} params.bookingId
 * @param {number} params.senderId
 * @param {string} params.message
 * @returns {Promise<object>} The saved message details
 */
async function postMessage({ bookingId, senderId, message }) {
  if (!message || !message.trim()) {
    throw new ChatError("Message content cannot be empty", 400);
  }

  const booking = await verifyBookingAccess(bookingId, senderId);
  
  const customerUserId = Number(booking.user_id);
  const providerUserId = Number(booking.provider_user_id);
  const sId = Number(senderId);

  const receiverId = (sId === customerUserId) ? providerUserId : customerUserId;

  const savedMessage = await chatRepository.createMessage({
    bookingId,
    senderId: sId,
    receiverId,
    message: message.trim()
  });

  // Trigger real-time NEW_CHAT_MESSAGE notification for receiver
  try {
    const createNotification = require("../utils/createNotification");
    createNotification({
      userId: receiverId,
      title: "New Chat Message",
      message: `You received a new message for booking #${bookingId}`,
      type: "NEW_CHAT_MESSAGE",
      bookingId
    }).catch((err) => console.error("Failed to create chat notification:", err.message));
  } catch (err) {
    console.error("Failed to trigger chat notification:", err.message);
  }

  return savedMessage;
}

module.exports = {
  ChatError,
  verifyBookingAccess,
  getBookingMessages,
  markMessagesAsRead,
  postMessage
};
