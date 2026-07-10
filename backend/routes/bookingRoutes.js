const express = require("express");

const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus
} = require("../controllers/bookingController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("user"),
  createBooking
);

router.get(
  "/my",
  protect,
  authorize("user"),
  getMyBookings
);

router.get(
  "/provider",
  protect,
  authorize("provider"),
  getProviderBookings
);

router.patch(
  "/:bookingId/status",
  protect,
  authorize("provider"),
  updateBookingStatus
);

module.exports = router;
