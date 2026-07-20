"use strict";

const notificationService = require("../services/notificationService");

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotificationsForUser(req.user.id);
    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await notificationService.markNotificationAsRead(notificationId, req.user.id);
    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const updatedCount = await notificationService.markAllNotificationsAsRead(req.user.id);
    res.json({
      success: true,
      message: "All notifications marked as read",
      updatedCount
    });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await notificationService.deleteNotification(notificationId, req.user.id);
    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};
