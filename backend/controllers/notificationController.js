const db = require("../config/db");

exports.getMyNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT *
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS unreadCount
       FROM notifications
       WHERE user_id = ?
       AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      success: true,
      unreadCount: rows[0].unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = ?
       AND user_id = ?`,
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = ?
       AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
      updatedCount: result.affectedRows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const [result] = await db.query(
      `DELETE FROM notifications
       WHERE id = ?
       AND user_id = ?`,
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
