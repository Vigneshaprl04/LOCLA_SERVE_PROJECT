const Razorpay = require("razorpay");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const db = require("../config/db");

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
const hasValidRazorpayConfig =
  keyId.trim() &&
  keySecret.trim() &&
  !keyId.toLowerCase().includes("your_") &&
  !keySecret.toLowerCase().includes("your_") &&
  !keyId.toLowerCase().includes("xxxxxx") &&
  !keySecret.toLowerCase().includes("xxxxxx");

const razorpay = hasValidRazorpayConfig
  ? new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  : null;

// Helper to write payment status transition log
async function logPaymentEvent(connection, paymentId, bookingId, prevStatus, newStatus, eventText) {
  await connection.query(
    `INSERT INTO payment_logs (payment_id, booking_id, previous_status, new_status, event)
     VALUES (?, ?, ?, ?, ?)`,
    [paymentId, bookingId, prevStatus, newStatus, eventText]
  );
}

// 1. Create Payment Order
exports.createPaymentOrder = async (req, res) => {
  try {
    const { booking_id } = req.body;
    if (!booking_id) {
      return res.status(400).json({ success: false, message: "Booking ID is required" });
    }

    const [bookings] = await db.query(
      `SELECT id, user_id, provider_id, estimated_price, final_price, payment_status, booking_status
       FROM bookings
       WHERE id = ?`,
      [booking_id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = bookings[0];

    // Enforce booking ownership: only the user who booked it can initiate payment
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied. Unauthorized booking access." });
    }

    if (booking.payment_status === "paid") {
      return res.status(409).json({ success: false, message: "Booking already paid" });
    }

    const baseAmount = Number(booking.final_price || booking.estimated_price);
    if (!baseAmount || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid booking amount" });
    }

    // STRICT BACKEND AMOUNT CALCULATION (GST = 18%)
    const gstRate = 0.18;
    const gstAmount = baseAmount * gstRate;
    const totalAmount = baseAmount + gstAmount;

    let order;
    if (razorpay) {
      order = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `booking_${booking.id}_${Date.now()}`
      });
    } else {
      // Mock Razorpay order object for test mode compatibility
      order = {
        id: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
        amount: Math.round(totalAmount * 100),
        currency: "INR"
      };
    }

    // Insert pending payment record
    const [result] = await db.query(
      `INSERT INTO payments
       (booking_id, user_id, provider_id, razorpay_order_id, currency, amount, gst_amount, total_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [booking.id, req.user.id, booking.provider_id, order.id, order.currency, baseAmount, gstAmount, totalAmount]
    );

    const paymentId = result.insertId;

    // Log payment order creation event
    await logPaymentEvent(db, paymentId, booking.id, null, "pending", `Payment order created with order_id: ${order.id}`);

    res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      keyId: hasValidRazorpayConfig ? keyId : "mock_key_id"
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error);
    res.status(500).json({ success: false, message: "Payment order creation failed" });
  }
};

// 2. Verify Payment (Idempotent)
exports.verifyPayment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method = "Razorpay-Online"
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required"
      });
    }

    // Handle Signature Verification (Mock or Live)
    const isMockOrder = razorpay_order_id.startsWith("order_mock_");
    if (!isMockOrder) {
      if (!razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment signature is required" });
      }
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }
    }

    await connection.beginTransaction();

    const [payments] = await connection.query(
      `SELECT id, booking_id, user_id, payment_status, total_amount, invoice_number
       FROM payments
       WHERE razorpay_order_id = ?
       FOR UPDATE`,
      [razorpay_order_id]
    );

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Payment order not found" });
    }

    const payment = payments[0];

    // Enforce booking ownership: only the user who initiated the payment can verify it
    if (payment.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // IDEMPOTENT VERIFICATION: Prevent duplicate verification
    if (payment.payment_status === "paid") {
      await connection.rollback();
      return res.json({
        success: true,
        message: "Payment already verified",
        invoiceNumber: payment.invoice_number
      });
    }

    // GENERATE INVOICE NUMBER: INV-YYYY-000001 (Sequential)
    const currentYear = new Date().getFullYear();
    const [[countRow]] = await connection.query(
      `SELECT COUNT(*) as count FROM payments WHERE invoice_number LIKE ?`,
      [`INV-${currentYear}-%`]
    );
    const seq = String(countRow.count + 1).padStart(6, "0");
    const invoiceNumber = `INV-${currentYear}-${seq}`;

    // Update payment record to PAID
    await connection.query(
      `UPDATE payments
       SET razorpay_payment_id = ?,
           payment_method = ?,
           payment_status = 'paid',
           invoice_number = ?,
           paid_at = NOW()
       WHERE id = ?`,
      [razorpay_payment_id, payment_method, invoiceNumber, payment.id]
    );

    // Update booking payment status
    await connection.query(
      `UPDATE bookings
       SET payment_status = 'paid'
       WHERE id = ?`,
      [payment.booking_id]
    );

    // Log the success event
    await logPaymentEvent(connection, payment.id, payment.booking_id, payment.payment_status, "paid", `Payment verified successfully. Payment ID: ${razorpay_payment_id}, Invoice: ${invoiceNumber}`);

    await connection.commit();

    res.json({
      success: true,
      message: "Payment verified successfully",
      invoiceNumber
    });
  } catch (error) {
    await connection.rollback();
    console.error("Verify Payment Error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  } finally {
    connection.release();
  }
};

// 3. Fail Payment
exports.failPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, error_reason } = req.body;
    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    const [payments] = await db.query(
      `SELECT id, booking_id, user_id, payment_status FROM payments WHERE razorpay_order_id = ?`,
      [razorpay_order_id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: "Payment order not found" });
    }

    const payment = payments[0];
    if (payment.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await db.query(
      `UPDATE payments
       SET payment_status = 'failed',
           razorpay_payment_id = ?
       WHERE id = ?`,
      [razorpay_payment_id || null, payment.id]
    );

    await db.query(
      `UPDATE bookings
       SET payment_status = 'failed'
       WHERE id = ?`,
      [payment.booking_id]
    );

    await logPaymentEvent(db, payment.id, payment.booking_id, payment.payment_status, "failed", `Payment attempt failed: ${error_reason || "Unknown reason"}`);

    res.json({ success: true, message: "Payment status updated to failed" });
  } catch (error) {
    console.error("Fail Payment Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 4. Cancel Payment
exports.cancelPayment = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    const [payments] = await db.query(
      `SELECT id, booking_id, user_id, payment_status FROM payments WHERE razorpay_order_id = ?`,
      [razorpay_order_id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: "Payment order not found" });
    }

    const payment = payments[0];
    if (payment.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await db.query(
      `UPDATE payments
       SET payment_status = 'cancelled'
       WHERE id = ?`,
      [payment.id]
    );

    await logPaymentEvent(db, payment.id, payment.booking_id, payment.payment_status, "cancelled", "Payment order cancelled by user");

    res.json({ success: true, message: "Payment order cancelled successfully" });
  } catch (error) {
    console.error("Cancel Payment Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 5. Get Payment History (Filters & Search)
exports.getPaymentHistory = async (req, res) => {
  try {
    const { filter = "all", search = "" } = req.query;

    let dateConstraint = "";
    if (filter === "today") {
      dateConstraint = "AND DATE(p.created_at) = CURDATE()";
    } else if (filter === "last_7_days") {
      dateConstraint = "AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } else if (filter === "this_month") {
      dateConstraint = "AND MONTH(p.created_at) = MONTH(CURDATE()) AND YEAR(p.created_at) = YEAR(CURDATE())";
    }

    let searchConstraint = "";
    let searchParams = [];
    if (search.trim()) {
      searchConstraint = "AND (p.booking_id = ? OR p.invoice_number LIKE ?)";
      searchParams = [Number(search) || 0, `%${search}%`];
    }

    let query = "";
    let params = [];

    if (req.user.role === "user") {
      query = `
        SELECT p.*, b.service_description, u.name AS provider_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN providers prov ON p.provider_id = prov.id
        LEFT JOIN users u ON prov.user_id = u.id
        WHERE p.user_id = ? ${dateConstraint} ${searchConstraint}
        ORDER BY p.created_at DESC`;
      params = [req.user.id, ...searchParams];
    } else if (req.user.role === "provider") {
      const [providers] = await db.query("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
      if (providers.length === 0) {
        return res.status(404).json({ success: false, message: "Provider profile not found" });
      }
      const providerId = providers[0].id;

      query = `
        SELECT p.*, b.service_description, u.name AS user_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN users u ON p.user_id = u.id
        WHERE p.provider_id = ? ${dateConstraint} ${searchConstraint}
        ORDER BY p.created_at DESC`;
      params = [providerId, ...searchParams];
    } else if (req.user.role === "admin") {
      query = `
        SELECT p.*, b.service_description, u_user.name AS user_name, u_prov.name AS provider_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN users u_user ON p.user_id = u_user.id
        LEFT JOIN providers prov ON p.provider_id = prov.id
        LEFT JOIN users u_prov ON prov.user_id = u_prov.id
        WHERE 1=1 ${dateConstraint} ${searchConstraint}
        ORDER BY p.created_at DESC`;
      params = [...searchParams];
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const [payments] = await db.query(query, params);
    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error("Get Payment History Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 6. Get Invoice Details (JSON)
exports.getInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const [bookings] = await db.query(
      `SELECT b.id, b.user_id, b.provider_id, b.service_description, b.created_at AS booking_date,
              u_user.name AS user_name, u_user.email AS user_email,
              u_prov.name AS provider_name,
              sc.name AS category_name,
              p.invoice_number, p.paid_at, p.payment_method, p.amount, p.gst_amount, p.total_amount, p.payment_status
       FROM bookings b
       JOIN users u_user ON b.user_id = u_user.id
       JOIN providers prov ON b.provider_id = prov.id
       JOIN users u_prov ON prov.user_id = u_prov.id
       LEFT JOIN service_categories sc ON b.category_id = sc.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'paid'
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: "Booking invoice not found" });
    }

    const booking = bookings[0];

    // Enforce authorization: user, provider, or admin only
    const isUser = booking.user_id === req.user.id;
    const [providers] = await db.query("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
    const isProvider = providers.length > 0 && booking.provider_id === providers[0].id;
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({
      success: true,
      invoice: booking
    });
  } catch (error) {
    console.error("Get Invoice JSON Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 7. Download Invoice PDF (pdfkit)
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const [bookings] = await db.query(
      `SELECT b.id, b.user_id, b.provider_id, b.service_description, b.created_at AS booking_date,
              u_user.name AS user_name, u_user.email AS user_email,
              u_prov.name AS provider_name,
              sc.name AS category_name,
              p.invoice_number, p.paid_at, p.payment_method, p.amount, p.gst_amount, p.total_amount, p.payment_status
       FROM bookings b
       JOIN users u_user ON b.user_id = u_user.id
       JOIN providers prov ON b.provider_id = prov.id
       JOIN users u_prov ON prov.user_id = u_prov.id
       LEFT JOIN service_categories sc ON b.category_id = sc.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'paid'
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    const booking = bookings[0];

    // Enforce authorization
    const isUser = booking.user_id === req.user.id;
    const [providers] = await db.query("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
    const isProvider = providers.length > 0 && booking.provider_id === providers[0].id;
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isProvider && !isAdmin) {
      return res.status(403).send("Access denied");
    }

    // Set PDF generation
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${bookingId}.pdf`);
    doc.pipe(res);

    // Beautiful Layout Design
    // Title & Logo
    doc.fillColor("#2563eb").fontSize(26).text("LocalServe", 50, 50, { bold: true });
    doc.fillColor("#6b7280").fontSize(10).text("Marketplace Invoice Statement", 50, 80);

    // Meta Header (Right-Aligned)
    doc.fillColor("#1f2937").fontSize(20).text("INVOICE", 400, 50, { align: "right" });
    doc.fontSize(10).fillColor("#4b5563");
    doc.text(`Invoice No: ${booking.invoice_number || "PENDING"}`, 400, 75, { align: "right" });
    doc.text(`Booking Date: ${new Date(booking.booking_date).toLocaleDateString()}`, 400, 90, { align: "right" });
    doc.text(`Payment Date: ${booking.paid_at ? new Date(booking.paid_at).toLocaleDateString() : "N/A"}`, 400, 105, { align: "right" });

    // Separator line
    doc.moveTo(50, 130).lineTo(550, 130).strokeColor("#e5e7eb").lineWidth(1).stroke();

    // Bill To & Service Details
    doc.fontSize(12).fillColor("#1f2937").text("Bill To:", 50, 150, { underline: true });
    doc.fontSize(10).fillColor("#4b5563");
    doc.text(`Customer Name: ${booking.user_name}`, 50, 170);
    doc.text(`Email: ${booking.user_email}`, 50, 185);

    doc.fontSize(12).fillColor("#1f2937").text("Service Provider:", 350, 150, { underline: true });
    doc.fontSize(10).fillColor("#4b5563");
    doc.text(`Provider Name: ${booking.provider_name}`, 350, 170);
    doc.text(`Category: ${booking.category_name}`, 350, 185);

    // Separator
    doc.moveTo(50, 215).lineTo(550, 215).strokeColor("#e5e7eb").lineWidth(1).stroke();

    // Table Header
    doc.fontSize(11).fillColor("#1f2937");
    doc.text("Service Details", 50, 235);
    doc.text("Booking ID", 300, 235);
    doc.text("Base Price (INR)", 450, 235, { align: "right" });

    doc.moveTo(50, 255).lineTo(550, 255).strokeColor("#3b82f6").lineWidth(1.5).stroke();

    // Table Row
    const amount = Number(booking.amount || 0);
    const gst = Number(booking.gst_amount || 0);
    const total = Number(booking.total_amount || 0);

    doc.fontSize(10).fillColor("#4b5563");
    doc.text(`${booking.category_name} - ${booking.service_description.substring(0, 30)}...`, 50, 275);
    doc.text(`#${bookingId}`, 300, 275);
    doc.text(`₹${amount.toFixed(2)}`, 450, 275, { align: "right" });

    doc.moveTo(50, 305).lineTo(550, 305).strokeColor("#e5e7eb").lineWidth(1).stroke();

    // Financial Breakdown
    doc.fontSize(10).fillColor("#4b5563");
    doc.text("Subtotal:", 350, 325);
    doc.text(`₹${amount.toFixed(2)}`, 450, 325, { align: "right" });

    doc.text("GST (18%):", 350, 345);
    doc.text(`₹${gst.toFixed(2)}`, 450, 345, { align: "right" });

    doc.fontSize(12).fillColor("#1f2937").text("Grand Total:", 350, 365, { bold: true });
    doc.fontSize(12).fillColor("#2563eb").text(`₹${total.toFixed(2)}`, 450, 365, { align: "right", bold: true });

    doc.moveTo(50, 395).lineTo(550, 395).strokeColor("#e5e7eb").lineWidth(1).stroke();

    // Transaction Details
    doc.fontSize(10).fillColor("#4b5563");
    doc.text(`Payment Status: ${(booking.payment_status || "pending").toUpperCase()}`, 50, 415);
    doc.text(`Payment Method: ${booking.payment_method || "N/A"}`, 50, 430);

    // Footer
    doc.fontSize(9).fillColor("#9ca3af").text("Thank you for choosing LocalServe! If you have any inquiries regarding this invoice, please support@localserve.com.", 50, 680, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Download PDF Invoice Error:", error);
    res.status(500).send("Server error generating PDF invoice");
  }
};

// 8. Provider Dashboard Stats
exports.getProviderDashboardStats = async (req, res) => {
  try {
    const [providers] = await db.query("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
    if (providers.length === 0) {
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    }
    const providerId = providers[0].id;

    // Today's Earnings
    const [[todayRow]] = await db.query(
      `SELECT SUM(total_amount) as total FROM payments WHERE provider_id = ? AND payment_status = 'paid' AND DATE(paid_at) = CURDATE()`,
      [providerId]
    );

    // Weekly Earnings
    const [[weeklyRow]] = await db.query(
      `SELECT SUM(total_amount) as total FROM payments WHERE provider_id = ? AND payment_status = 'paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [providerId]
    );

    // Monthly Earnings
    const [[monthlyRow]] = await db.query(
      `SELECT SUM(total_amount) as total FROM payments WHERE provider_id = ? AND payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())`,
      [providerId]
    );

    // Completed, Pending, Failed Counts
    const [statusRows] = await db.query(
      `SELECT payment_status, COUNT(*) as count FROM payments WHERE provider_id = ? GROUP BY payment_status`,
      [providerId]
    );

    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    statusRows.forEach(r => {
      if (r.payment_status === "paid") completedCount = Number(r.count);
      else if (r.payment_status === "failed") failedCount = Number(r.count);
      else pendingCount += Number(r.count); // pending, authorized, cancelled counts mapped to pending
    });

    // Average Earnings
    const [[avgRow]] = await db.query(
      `SELECT AVG(total_amount) as total FROM payments WHERE provider_id = ? AND payment_status = 'paid'`,
      [providerId]
    );

    res.json({
      success: true,
      stats: {
        todayEarnings: Number(todayRow?.total || 0),
        weeklyEarnings: Number(weeklyRow?.total || 0),
        monthlyEarnings: Number(monthlyRow?.total || 0),
        completedPayments: completedCount,
        pendingPayments: pendingCount,
        failedPayments: failedCount,
        averageEarnings: Number(avgRow?.total || 0)
      }
    });
  } catch (error) {
    console.error("Get Provider Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 9. Admin Dashboard Stats
exports.getAdminDashboardStats = async (req, res) => {
  try {
    // Today's Revenue
    const [[todayRow]] = await db.query(
      `SELECT SUM(total_amount) as total FROM payments WHERE payment_status = 'paid' AND DATE(paid_at) = CURDATE()`
    );

    // Weekly Revenue
    const [[weeklyRow]] = await db.query(
      `SELECT SUM(total_amount) as total FROM payments WHERE payment_status = 'paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    // Monthly Revenue
    const [[monthlyRow]] = await db.query(
      `SELECT SUM(total_amount) as total FROM payments WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())`
    );

    // Completed, Pending, Failed Counts & Total
    const [[completedRow]] = await db.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as total FROM payments WHERE payment_status = 'paid'`
    );

    const [[failedRow]] = await db.query(
      `SELECT COUNT(*) as count FROM payments WHERE payment_status = 'failed'`
    );

    const [[pendingRow]] = await db.query(
      `SELECT COUNT(*) as count FROM payments WHERE payment_status NOT IN ('paid', 'failed')`
    );

    // Future Refund Count (represented by 'refunded' payments count - mock schema support)
    const [[refundRow]] = await db.query(
      `SELECT COUNT(*) as count FROM payments WHERE payment_status = 'refunded'`
    );

    res.json({
      success: true,
      stats: {
        todayRevenue: Number(todayRow?.total || 0),
        weeklyRevenue: Number(weeklyRow?.total || 0),
        monthlyRevenue: Number(monthlyRow?.total || 0),
        completedPayments: Number(completedRow?.count || 0),
        pendingPayments: Number(pendingRow?.count || 0),
        failedPayments: Number(failedRow?.count || 0),
        totalRevenue: Number(completedRow?.total || 0),
        refundCount: Number(refundRow?.count || 0)
      }
    });
  } catch (error) {
    console.error("Get Admin Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
