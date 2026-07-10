const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const { getMessagesByBookingId } = require("../controllers/messageController");

const router = express.Router();

router.get(
  "/:bookingId",
  protect,
  getMessagesByBookingId
);

module.exports = router;

