const db = require("../config/db");

exports.getMessagesByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking ownership (user or provider)
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
        message: "Booking not found",
      });
    }

    const booking = bookings[0];
    const connectedUserId = Number(req.user.id);

    if (
      connectedUserId !== Number(booking.user_id) &&
      connectedUserId !== Number(booking.provider_user_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this booking chat",
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
      messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

