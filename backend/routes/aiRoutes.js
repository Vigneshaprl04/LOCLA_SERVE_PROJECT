const express = require("express");
const { analyzeService } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");
const aiRateLimiter = require("../middleware/aiRateLimiter");

const router = express.Router();

router.post("/analyze-service", protect, aiRateLimiter, analyzeService);

module.exports = router;
