const db = require("../config/db");

const createNotification = async ({
  io,
  userId,
  title,
  message,
  type = "general"
}) => {
  const [result] = await db.query(
    `INSERT INTO notifications
     (user_id, title, message, type)
     VALUES (?, ?, ?, ?)`,
    [userId, title, message, type]
  );

  const notification = {
    id: result.insertId,
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    created_at: new Date()
  };

  if (io) {
    io.to(`user_${userId}`).emit(
      "new_notification",
      notification
    );
  }

  return notification;
};

module.exports = createNotification;
