const express = require("express");
const { analyzeService } = require("../controllers/aiController");
const { 
  chatStream, 
  getRecommendations, 
  getReplySuggestions, 
  draftDispute, 
  getAdminInsights 
} = require("../controllers/aiControllerV6");
const { protect, authorize } = require("../middleware/authMiddleware");
const aiRateLimiter = require("../middleware/aiRateLimiter");

const router = express.Router();

router.post("/analyze-service", protect, aiRateLimiter, analyzeService);
router.post("/chat/stream", protect, chatStream);
router.get("/recommendations", protect, getRecommendations);
router.post("/reply-suggestions", protect, getReplySuggestions);
router.post("/draft-dispute", protect, draftDispute);
router.get("/admin-insights", protect, authorize("admin"), getAdminInsights);

module.exports = router;
