const express = require("express");

const {
  getPendingProviders,
  updateProviderVerification
} = require("../controllers/adminController");

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

module.exports = router;
