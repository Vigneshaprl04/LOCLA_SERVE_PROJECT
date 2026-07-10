const express = require("express");

const {
  updateProfile,
  updateAvailability,
  searchProviders,
  getNearbyProviders,
  getProviderById,
  getProfile
} = require("../controllers/providerController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/search", protect, searchProviders);

router.get(
  "/nearby",
  protect,
  authorize("user"),
  getNearbyProviders
);

router.get(
  "/profile",
  protect,
  authorize("provider"),
  getProfile
);

router.get(
  "/:providerId",
  protect,
  authorize("user"),
  getProviderById
);

router.put(
  "/profile",
  protect,
  authorize("provider"),
  updateProfile
);

router.patch(
  "/availability",
  protect,
  authorize("provider"),
  updateAvailability
);

module.exports = router;
