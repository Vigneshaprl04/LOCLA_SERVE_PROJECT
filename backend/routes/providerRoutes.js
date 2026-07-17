const express = require("express");

const {
  updateProfile,
  updateAvailability,
  searchProviders,
  getNearbyProviders,
  getProviderById,
  getProfile,
  getCategories
} = require("../controllers/providerController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

const providerAvailabilityRoutes = require("./providerAvailabilityRoutes");
router.use("/", providerAvailabilityRoutes);

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
  "/categories",
  getCategories
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
