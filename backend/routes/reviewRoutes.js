const express = require("express");

const {
  createReview,
  getProviderReviews
} = require("../controllers/reviewController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("user"),
  createReview
);

router.get(
  "/provider/:providerId",
  getProviderReviews
);

module.exports = router;
