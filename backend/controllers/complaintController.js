const db = require("../config/db");
const createNotification = require("../utils/createNotification");

exports.createComplaint = async (req, res) => {
  try {
    const { booking_id, complaint_description } = req.body;

    if (!complaint_description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Complaint description is required"
      });
    }

    if (booking_id) {
      const [bookings] = await db.query(
        `SELECT id FROM bookings
         WHERE id = ? AND user_id = ?`,
        [booking_id, req.user.id]
      );

      if (bookings.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You cannot create a complaint for this booking"
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO complaints
       (user_id, booking_id, complaint_description)
       VALUES (?, ?, ?)`,
      [
        req.user.id,
        booking_id || null,
        complaint_description.trim()
      ]
    );

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      complaintId: result.insertId
    });
  } catch (error) {
    console.error("Create Complaint Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const [complaints] = await db.query(
      `SELECT *
       FROM complaints
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const [complaints] = await db.query(
      `SELECT
         c.*,
         u.name AS customer_name,
         u.email AS customer_email
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "open",
      "investigating",
      "resolved",
      "rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint status"
      });
    }

    const [complaints] = await db.query(
      `SELECT id, user_id
       FROM complaints
       WHERE id = ?`,
      [complaintId]
    );

    if (complaints.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    const [result] = await db.query(
      `UPDATE complaints
       SET complaint_status = ?
       WHERE id = ?`,
      [status, complaintId]
    );

    const io = req.app.get("io");

    await createNotification({
      io,
      userId: complaints[0].user_id,
      title: "Complaint Status Updated",
      message: `Your complaint #${complaintId} status is now ${status}`,
      type: "complaint_status"
    });

    res.json({
      success: true,
      message: `Complaint status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
