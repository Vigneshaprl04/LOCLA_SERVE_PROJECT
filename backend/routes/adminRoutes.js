const express = require("express");

const {
  getPendingProviders,
  updateProviderVerification
} = require("../controllers/adminController");

const {
  getAnalyticsOverview,
  exportAnalyticsCSV,
  exportAnalyticsPDF
} = require("../controllers/analyticsController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/providers/pending",
  protect,
  authorize("admin"),
  getPendingProviders
);

router.patch(
  "/providers/:providerId/verification",
  protect,
  authorize("admin"),
  updateProviderVerification
);

router.get(
  "/analytics/overview",
  protect,
  authorize("admin"),
  getAnalyticsOverview
);

router.get(
  "/analytics/export/csv",
  protect,
  authorize("admin"),
  exportAnalyticsCSV
);

router.get(
  "/analytics/export/pdf",
  protect,
  authorize("admin"),
  exportAnalyticsPDF
);

module.exports = router;
