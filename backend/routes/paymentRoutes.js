const express = require("express");

const {
  createPaymentOrder,
  verifyPayment,
  failPayment,
  cancelPayment,
  getPaymentHistory,
  getInvoice,
  downloadInvoicePDF,
  getProviderDashboardStats,
  getAdminDashboardStats
} = require("../controllers/paymentController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Order creation & completion (User only)
router.post("/create-order", protect, authorize("user"), createPaymentOrder);
router.post("/verify", protect, authorize("user"), verifyPayment);
router.post("/fail", protect, authorize("user"), failPayment);
router.post("/cancel", protect, authorize("user"), cancelPayment);

// Payment history (All authenticated users can fetch their corresponding history)
router.get("/history", protect, getPaymentHistory);

// Invoices JSON & PDF (Protected by ownership checks in controller)
router.get("/invoice/:bookingId", protect, getInvoice);
router.get("/invoice/:bookingId/pdf", protect, downloadInvoicePDF);

// Dashboard analytics
router.get("/dashboard/provider", protect, authorize("provider"), getProviderDashboardStats);
router.get("/dashboard/admin", protect, authorize("admin"), getAdminDashboardStats);

module.exports = router;
