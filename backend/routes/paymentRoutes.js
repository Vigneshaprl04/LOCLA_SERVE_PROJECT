const express = require("express");

const {
  createPaymentOrder,
  verifyPayment,
  getMyPayments
} = require("../controllers/paymentController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/create-order",
  protect,
  authorize("user"),
  createPaymentOrder
);

router.post(
  "/verify",
  protect,
  authorize("user"),
  verifyPayment
);

router.get(
  "/my",
  protect,
  authorize("user"),
  getMyPayments
);

module.exports = router;
