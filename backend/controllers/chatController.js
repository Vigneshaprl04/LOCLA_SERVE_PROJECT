"use strict";

const chatService = require("../services/chatService");

exports.getBookingMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await chatService.getBookingMessages(bookingId, req.user.id);
    
    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error("Get Booking Messages Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updatedCount = await chatService.markMessagesAsRead(bookingId, req.user.id);

    res.json({
      success: true,
      message: "Messages marked as read",
      updatedCount
    });
  } catch (error) {
    console.error("Mark Messages Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};
