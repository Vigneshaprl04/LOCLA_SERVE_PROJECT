const express = require("express");

const {
  getBookingMessages,
  markMessagesAsRead
} = require("../controllers/chatController");

const {
  protect
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/booking/:bookingId",
  protect,
  getBookingMessages
);

router.patch(
  "/booking/:bookingId/read",
  protect,
  markMessagesAsRead
);

module.exports = router;
