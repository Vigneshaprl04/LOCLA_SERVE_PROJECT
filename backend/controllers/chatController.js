const db = require("../config/db");

exports.getBookingMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [bookings] = await db.query(
      `SELECT b.user_id, p.user_id AS provider_user_id
       FROM bookings b
       JOIN providers p ON b.provider_id = p.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const booking = bookings[0];

    if (
      Number(req.user.id) !== Number(booking.user_id) &&
      Number(req.user.id) !== Number(booking.provider_user_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this booking chat"
      });
    }

    const [messages] = await db.query(
      `SELECT
         m.id,
         m.booking_id,
         m.sender_id,
         m.receiver_id,
         m.message,
         m.is_read,
         m.created_at,
         u.name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.booking_id = ?
       ORDER BY m.created_at ASC, m.id ASC`,
      [bookingId]
    );

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error("Get Messages Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [result] = await db.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE booking_id = ?
       AND receiver_id = ?`,
      [bookingId, req.user.id]
    );

    res.json({
      success: true,
      message: "Messages marked as read",
      updatedCount: result.affectedRows
    });
  } catch (error) {
    console.error("Mark Messages Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
