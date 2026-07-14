const express = require("express");

const {
  register,
  login,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

const authRateLimiter = require("../middleware/authRateLimiter");

const router = express.Router();

// Apply rate limits to public security-sensitive endpoints (5 requests per 15 mins)
const loginLimiter = authRateLimiter(10, 1, "Too many login attempts. Please try again in 1 minute.");
const registerLimiter = authRateLimiter(5, 15, "Too many registration attempts. Please try again later.");
const forgotLimiter = authRateLimiter(5, 15, "Too many password recovery requests. Please try again later.");
const resetLimiter = authRateLimiter(5, 15, "Too many password reset attempts. Please try again later.");
const resendLimiter = authRateLimiter(5, 15, "Too many verification resend attempts. Please try again later.");

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendLimiter, resendVerification);
router.post("/forgot-password", forgotLimiter, forgotPassword);
router.post("/reset-password", resetLimiter, resetPassword);

router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;
