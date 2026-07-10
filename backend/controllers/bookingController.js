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

    let estimatedPrice = Number(categories[0].base_price);

    if (emergency_booking) {
      estimatedPrice *= 1.5;
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
        preferred_date || null,
        latitude || null,
        longitude || null,
        emergency_booking,
        estimatedPrice
      ]
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertId,
      estimatedPrice
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
      "accepted",
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
      pending: ["accepted", "rejected"],
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

    await db.query(
      `UPDATE bookings
       SET booking_status = ?
       WHERE id = ?`,
      [status, bookingId]
    );

    const io = req.app.get("io");

    await createNotification({
      io,
      userId: bookings[0].user_id,
      title: "Booking Status Updated",
      message: `Your booking #${bookingId} status is now ${status}`,
      type: "booking_status"
    });

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
