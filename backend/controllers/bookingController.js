const db = require("../config/db");
const createNotification = require("../utils/createNotification");

exports.createBooking = async (req, res) => {
  try {
    const {
      provider_id,
      category_id,
      service_description,
      service_address,
      preferred_date,
      latitude,
      longitude,
      emergency_booking = false
    } = req.body;

    const [providers] = await db.query(
      `SELECT id, category_id, availability_status, verification_status
       FROM providers
       WHERE id = ?`,
      [provider_id]
    );

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const provider = providers[0];

    if (provider.verification_status !== "verified") {
      return res.status(400).json({
        success: false,
        message: "Provider is not verified"
      });
    }

    if (!provider.availability_status) {
      return res.status(400).json({
        success: false,
        message: "Provider is currently unavailable"
      });
    }

    if (Number(provider.category_id) !== Number(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Selected category does not match provider service category"
      });
    }

    const [categories] = await db.query(
      `SELECT base_price
       FROM service_categories
       WHERE id = ?`,
      [category_id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service category not found"
      });
    }

    let formattedDate = preferred_date || null;
    if (formattedDate && typeof formattedDate === "string" && formattedDate.includes("T")) {
      formattedDate = formattedDate.replace("T", " ").replace("Z", "").split(".")[0];
    }

    const [result] = await db.query(
      `INSERT INTO bookings (
        user_id,
        provider_id,
        category_id,
        service_description,
        service_address,
        preferred_date,
        latitude,
        longitude,
        emergency_booking,
        estimated_price
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        provider_id,
        category_id,
        service_description,
        service_address,
        formattedDate,
        latitude || null,
        longitude || null,
        emergency_booking,
        null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertId,
      estimatedPrice: null
    });
  } catch (error) {
    console.error("Create Booking Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT
        b.*,
        u.name AS provider_name,
        sc.name AS category_name
       FROM bookings b
       JOIN providers p ON b.provider_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN service_categories sc ON b.category_id = sc.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error("Get User Bookings Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getProviderBookings = async (req, res) => {
  try {
    const [providers] = await db.query(
      "SELECT id FROM providers WHERE user_id = ?",
      [req.user.id]
    );

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    const providerId = providers[0].id;

    const [bookings] = await db.query(
      `SELECT
        b.*,
        u.name AS customer_name,
        u.phone AS customer_phone,
        sc.name AS category_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN service_categories sc ON b.category_id = sc.id
       WHERE b.provider_id = ?
       ORDER BY b.created_at DESC`,
      [providerId]
    );

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error("Get Provider Bookings Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "quoted",
      "rejected",
      "on_the_way",
      "work_started",
      "completed"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status"
      });
    }

    const [providers] = await db.query(
      "SELECT id FROM providers WHERE user_id = ?",
      [req.user.id]
    );

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    const providerId = providers[0].id;

    const [bookings] = await db.query(
      `SELECT
         b.id,
         b.user_id,
         b.booking_status
       FROM bookings b
       WHERE b.id = ?
       AND b.provider_id = ?`,
      [bookingId, providerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const currentStatus = bookings[0].booking_status;

    const validTransitions = {
      pending: ["quoted", "rejected"],
      accepted: ["on_the_way"],
      on_the_way: ["work_started"],
      work_started: ["completed"]
    };

    if (
      !validTransitions[currentStatus] ||
      !validTransitions[currentStatus].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change booking status from ${currentStatus} to ${status}`
      });
    }

    let estimatedPrice = null;
    if (status === "quoted") {
      estimatedPrice = Number(req.body.estimated_price);
      if (isNaN(estimatedPrice) || estimatedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Estimated price must be a valid positive number greater than 0"
        });
      }

      await db.query(
        `UPDATE bookings
         SET booking_status = ?, estimated_price = ?
         WHERE id = ?`,
        [status, estimatedPrice, bookingId]
      );
    } else {
      await db.query(
        `UPDATE bookings
         SET booking_status = ?
         WHERE id = ?`,
        [status, bookingId]
      );
    }

    const io = req.app.get("io");

    const title = status === "quoted" ? "Booking Quoted" : "Booking Status Updated";
    const notifMessage = status === "quoted"
      ? `Provider submitted an estimated quote of ₹${estimatedPrice} for booking #${bookingId}`
      : `Your booking #${bookingId} status is now ${status}`;

    await createNotification({
      io,
      userId: bookings[0].user_id,
      title,
      message: notifMessage,
      type: "booking_status"
    });

    // Broadcast booking status change over Socket.IO
    try {
      const [updatedRows] = await db.query(
        `SELECT id, booking_status, provider_id, user_id, updated_at, created_at
         FROM bookings
         WHERE id = ?`,
        [bookingId]
      );
      if (updatedRows.length > 0) {
        const updatedBooking = updatedRows[0];
        const socketServer = require("../socket/socketServer");
        socketServer.broadcastBookingStatus({
          bookingId: Number(updatedBooking.id),
          status: updatedBooking.booking_status,
          providerId: Number(updatedBooking.provider_id),
          userId: Number(updatedBooking.user_id),
          updatedAt: updatedBooking.updated_at || updatedBooking.created_at || new Date().toISOString()
        });
      }
    } catch (socketErr) {
      console.error("Failed to broadcast booking status change via socket:", socketErr);
    }

    res.json({
      success: true,
      message: `Booking status updated to ${status}`
    });
  } catch (error) {
    console.error("Update Booking Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateCustomerBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["accepted", "quote_rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Only accept or reject quote are allowed."
      });
    }

    // Verify booking belongs to logged-in customer
    const [bookings] = await db.query(
      `SELECT
         b.id,
         b.booking_status,
         b.provider_id,
         b.estimated_price
       FROM bookings b
       WHERE b.id = ?
       AND b.user_id = ?`,
      [bookingId, req.user.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or not owned by you"
      });
    }

    const booking = bookings[0];

    // Verify current status is "quoted"
    if (booking.booking_status !== "quoted") {
      return res.status(400).json({
        success: false,
        message: `Cannot perform action. Current status is ${booking.booking_status}, not quoted.`
      });
    }

    // Update status
    await db.query(
      `UPDATE bookings
       SET booking_status = ?
       WHERE id = ?`,
      [status, bookingId]
    );

    // Get the provider's user_id to send a notification
    const [providerRows] = await db.query(
      "SELECT user_id FROM providers WHERE id = ?",
      [booking.provider_id]
    );
    const providerUserId = providerRows[0]?.user_id;

    const io = req.app.get("io");

    if (providerUserId) {
      const title = status === "accepted" ? "Quote Accepted" : "Quote Rejected";
      const message = status === "accepted"
        ? `Customer accepted your quote of ₹${booking.estimated_price} for booking #${bookingId}`
        : `Customer rejected your quote for booking #${bookingId}`;

      await createNotification({
        io,
        userId: providerUserId,
        title,
        message,
        type: "booking_status"
      });
    }

    // Broadcast booking status change over Socket.IO
    try {
      const [updatedRows] = await db.query(
        `SELECT id, booking_status, provider_id, user_id, updated_at, created_at
         FROM bookings
         WHERE id = ?`,
        [bookingId]
      );
      if (updatedRows.length > 0) {
        const updatedBooking = updatedRows[0];
        const socketServer = require("../socket/socketServer");
        socketServer.broadcastBookingStatus({
          bookingId: Number(updatedBooking.id),
          status: updatedBooking.booking_status,
          providerId: Number(updatedBooking.provider_id),
          userId: Number(updatedBooking.user_id),
          updatedAt: updatedBooking.updated_at || updatedBooking.created_at || new Date().toISOString()
        });
      }
    } catch (socketErr) {
      console.error("Failed to broadcast booking status change via socket:", socketErr);
    }

    res.json({
      success: true,
      message: `Booking quote was successfully ${status === 'accepted' ? 'accepted' : 'rejected'}`
    });
  } catch (error) {
    console.error("Update Customer Booking Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
