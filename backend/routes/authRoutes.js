const express = require("express");

const {
  register,
  login,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;
