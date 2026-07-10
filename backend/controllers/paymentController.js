const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require("../config/db");

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
const hasValidRazorpayConfig =
  keyId.trim() &&
  keySecret.trim() &&
  !keyId.toLowerCase().includes("your_") &&
  !keySecret.toLowerCase().includes("your_");

const razorpay = hasValidRazorpayConfig
  ? new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  : null;

exports.createPaymentOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay credentials are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first."
      });
    }

    const { booking_id } = req.body;

    const [bookings] = await db.query(
      `SELECT id, user_id, estimated_price, final_price,
              payment_status, booking_status
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

    if (
      !["accepted", "on_the_way", "work_started", "completed"].includes(
        booking.booking_status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not allowed for this booking status"
      });
    }

    if (booking.payment_status === "paid") {
      return res.status(409).json({
        success: false,
        message: "Booking already paid"
      });
    }

    const amount = Number(booking.final_price || booking.estimated_price);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount"
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `booking_${booking.id}_${Date.now()}`
    });

    await db.query(
      `INSERT INTO payments
       (booking_id, user_id, amount, payment_gateway,
        payment_order_id, payment_status)
       VALUES (?, ?, ?, 'razorpay', ?, 'created')`,
      [booking.id, req.user.id, amount, order.id]
    );

    res.status(201).json({
      success: true,
      message: "Payment order created",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Payment order creation failed"
    });
  }
};

exports.verifyPayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required"
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    await connection.beginTransaction();

    const [payments] = await connection.query(
      `SELECT id, booking_id, user_id, payment_status
       FROM payments
       WHERE payment_order_id = ?
       FOR UPDATE`,
      [razorpay_order_id]
    );

    if (payments.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Payment order not found"
      });
    }

    const payment = payments[0];

    if (payment.user_id !== req.user.id) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (payment.payment_status === "paid") {
      await connection.rollback();

      return res.json({
        success: true,
        message: "Payment already verified"
      });
    }

    await connection.query(
      `UPDATE payments
       SET payment_id = ?,
           payment_status = 'paid'
       WHERE id = ?`,
      [razorpay_payment_id, payment.id]
    );

    await connection.query(
      `UPDATE bookings
       SET payment_status = 'paid'
       WHERE id = ?`,
      [payment.booking_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Payment verified successfully"
    });
  } catch (error) {
    await connection.rollback();

    console.error("Verify Payment Error:", error);

    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  } finally {
    connection.release();
  }
};

exports.getMyPayments = async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT *
       FROM payments
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
