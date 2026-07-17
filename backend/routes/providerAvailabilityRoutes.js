"use strict";

const express = require("express");
const {
  goOnline,
  goOffline,
  getAvailability,
  searchAvailableProviders
} = require("../controllers/providerAvailabilityController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes (Availability lookup doesn't require JWT, matching existing detail lookup)
router.get("/availability/:providerId", getAvailability);

// Protected routes (Search requires user/provider authentication)
router.get("/search", protect, searchAvailableProviders);

// Provider only routes (updating status)
router.post("/go-online", protect, authorize("provider"), goOnline);
router.post("/go-offline", protect, authorize("provider"), goOffline);

module.exports = router;
