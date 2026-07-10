const db = require("../config/db");

exports.createReview = async (req, res) => {
  try {
    const { booking_id, rating, review_text } = req.body;

    if (!booking_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Valid booking_id and rating between 1 and 5 are required"
      });
    }

    const [bookings] = await db.query(
      `SELECT id, provider_id, booking_status
       FROM bookings
       WHERE id = ? AND user_id = ?`,
      [booking_id, req.user.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const booking = bookings[0];

    if (booking.booking_status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Review allowed only after service completion"
      });
    }

    const [existingReviews] = await db.query(
      "SELECT id FROM reviews WHERE booking_id = ?",
      [booking_id]
    );

    if (existingReviews.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Review already submitted for this booking"
      });
    }

    let fakeProbability = 0;

    if (!review_text || review_text.trim().length < 10) {
      fakeProbability += 30;
    }

    if (review_text && /(best|excellent|amazing|worst|fraud|scam)/gi.test(review_text)) {
      fakeProbability += 15;
    }

    const [sameTextReviews] = await db.query(
      `SELECT COUNT(*) AS count
       FROM reviews
       WHERE LOWER(TRIM(review_text)) = LOWER(TRIM(?))`,
      [review_text || ""]
    );

    if (sameTextReviews[0].count > 0) {
      fakeProbability += 40;
    }

    fakeProbability = Math.min(fakeProbability, 100);

    const isFlagged = fakeProbability >= 60;

    const [result] = await db.query(
      `INSERT INTO reviews
       (booking_id, user_id, provider_id, rating, review_text, fake_probability, is_flagged)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        booking_id,
        req.user.id,
        booking.provider_id,
        rating,
        review_text || null,
        fakeProbability,
        isFlagged
      ]
    );

    await db.query(
      `UPDATE providers p
       SET average_rating = (
         SELECT COALESCE(AVG(r.rating), 0)
         FROM reviews r
         WHERE r.provider_id = p.id
         AND r.is_flagged = FALSE
       )
       WHERE p.id = ?`,
      [booking.provider_id]
    );

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      reviewId: result.insertId,
      fakeProbability,
      isFlagged
    });
  } catch (error) {
    console.error("Create Review Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;

    const [reviews] = await db.query(
      `SELECT
         r.id,
         r.rating,
         r.review_text,
         r.created_at,
         u.name AS customer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.provider_id = ?
       AND r.is_flagged = FALSE
       ORDER BY r.created_at DESC`,
      [providerId]
    );

    res.json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
