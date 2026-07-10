const express = require("express");

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationController");

const {
  protect
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getMyNotifications);

router.get("/unread-count", protect, getUnreadCount);

router.patch(
  "/read-all",
  protect,
  markAllAsRead
);

router.patch(
  "/:notificationId/read",
  protect,
  markAsRead
);

router.delete(
  "/:notificationId",
  protect,
  deleteNotification
);

module.exports = router;
