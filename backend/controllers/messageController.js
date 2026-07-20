"use strict";

const chatService = require("../services/chatService");

exports.getMessagesByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await chatService.getBookingMessages(bookingId, req.user.id);

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
