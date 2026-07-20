"use strict";

const db = require("../config/db");
const PDFDocument = require("pdfkit");

/**
 * Compiles real DB statistics for Admin Dashboard metrics.
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    // 1. Total Booking counts
    const [[bookingCounts]] = await db.query(
      `SELECT 
         COUNT(*) as totalBookings,
         SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM bookings`
    );

    // 2. Total User & Provider registrations
    const [[userCounts]] = await db.query(
      `SELECT 
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as usersCount,
         SUM(CASE WHEN role = 'provider' THEN 1 ELSE 0 END) as providersCount
       FROM users`
    );

    // 3. Complaint logs
    const [[complaintCounts]] = await db.query(
      `SELECT 
         COUNT(*) as totalComplaints,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedComplaints
       FROM complaints`
    );

    // 4. Payment summaries
    const [[paymentCounts]] = await db.query(
      `SELECT 
         COUNT(*) as totalPayments,
         SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paidPayments,
         SUM(total_amount) as totalGross
       FROM payments`
    );

    const totalB = Number(bookingCounts?.totalBookings || 0);
    const totalP = Number(paymentCounts?.totalPayments || 0);

    const cancellationRate = totalB > 0 ? ((Number(bookingCounts?.cancelled || 0) / totalB) * 100) : 0;
    const paymentSuccessRate = totalP > 0 ? ((Number(paymentCounts?.paidPayments || 0) / totalP) * 100) : 100;

    // 5. Chart data trends (Weekly, Monthly, Yearly)
    const [weeklyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%a') as name, COUNT(*) as bookings, SUM(final_price) as revenue 
       FROM bookings 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY name`
    );

    const [monthlyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, 'Week %u') as name, COUNT(*) as bookings, SUM(final_price) as revenue 
       FROM bookings 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY name`
    );

    const [yearlyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%b') as name, COUNT(*) as bookings, SUM(final_price) as revenue 
       FROM bookings 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY name`
    );

    // Fallbacks if database datasets are empty
    const weeklyFallback = [
      { name: "Mon", bookings: 0, revenue: 0 },
      { name: "Tue", bookings: 0, revenue: 0 },
      { name: "Wed", bookings: 0, revenue: 0 },
      { name: "Thu", bookings: 0, revenue: 0 },
      { name: "Fri", bookings: 0, revenue: 0 },
      { name: "Sat", bookings: 0, revenue: 0 },
      { name: "Sun", bookings: 0, revenue: 0 }
    ];

    const monthlyFallback = [
      { name: "Week 1", bookings: 0, revenue: 0 },
      { name: "Week 2", bookings: 0, revenue: 0 },
      { name: "Week 3", bookings: 0, revenue: 0 },
      { name: "Week 4", bookings: 0, revenue: 0 }
    ];

    const yearlyFallback = [
      { name: "Jan", bookings: 0, revenue: 0 },
      { name: "Feb", bookings: 0, revenue: 0 },
      { name: "Mar", bookings: 0, revenue: 0 },
      { name: "Apr", bookings: 0, revenue: 0 },
      { name: "May", bookings: 0, revenue: 0 },
      { name: "Jun", bookings: 0, revenue: 0 },
      { name: "Jul", bookings: 0, revenue: 0 },
      { name: "Aug", bookings: 0, revenue: 0 },
      { name: "Sep", bookings: 0, revenue: 0 },
      { name: "Oct", bookings: 0, revenue: 0 },
      { name: "Nov", bookings: 0, revenue: 0 },
      { name: "Dec", bookings: 0, revenue: 0 }
    ];

    // Merge actual data into fallback slots to retain continuous chart rendering
    const mergeData = (fallback, rows) => {
      return fallback.map(f => {
        const match = rows.find(r => r.name?.toLowerCase() === f.name?.toLowerCase());
        return {
          name: f.name,
          bookings: match ? Number(match.bookings || 0) : f.bookings,
          revenue: match ? Number(match.revenue || 0) : f.revenue
        };
      });
    };

    res.json({
      success: true,
      data: {
        totals: {
          totalBookings: totalB,
          completedBookings: Number(bookingCounts?.completed || 0),
          cancelledBookings: Number(bookingCounts?.cancelled || 0),
          cancellationRate: Math.round(cancellationRate * 10) / 10,
          totalUsers: Number(userCounts?.usersCount || 0),
          totalProviders: Number(userCounts?.providersCount || 0),
          totalComplaints: Number(complaintCounts?.totalComplaints || 0),
          resolvedComplaints: Number(complaintCounts?.resolvedComplaints || 0),
          grossRevenue: Number(paymentCounts?.totalGross || 0),
          paymentSuccessRate: Math.round(paymentSuccessRate * 10) / 10
        },
        charts: {
          weekly: mergeData(weeklyFallback, weeklyRows),
          monthly: mergeData(monthlyFallback, monthlyRows),
          yearly: mergeData(yearlyFallback, yearlyRows)
        }
      }
    });
  } catch (error) {
    console.error("Fetch Analytics Overview Error:", error.message);
    res.status(500).json({ success: false, message: "Server error compiling analytics." });
  }
};

/**
 * Exports analytics booking and revenue records in raw CSV format.
 */
exports.exportAnalyticsCSV = async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT id, user_id, provider_id, preferred_date, estimated_price, final_price, booking_status 
       FROM bookings`
    );

    let csvContent = "BookingID,CustomerID,ProviderID,PreferredDate,EstimatedPrice,FinalPrice,Status\n";
    for (const b of bookings) {
      csvContent += `${b.id},${b.user_id},${b.provider_id},"${b.preferred_date}",${b.estimated_price},${b.final_price || 0},${b.booking_status}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="localserve_analytics_report.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export Analytics CSV Error:", error.message);
    res.status(500).send("Failed to generate CSV export file.");
  }
};

/**
 * Exports platform analytics report as a beautifully generated PDF invoice page using pdfkit.
 */
exports.exportAnalyticsPDF = async (req, res) => {
  try {
    const [[bookingCounts]] = await db.query(
      `SELECT 
         COUNT(*) as totalBookings,
         SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM bookings`
    );

    const [[paymentCounts]] = await db.query(
      `SELECT SUM(total_amount) as totalGross FROM payments WHERE payment_status = 'paid'`
    );

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="localserve_analytics_report.pdf"');
    doc.pipe(res);

    // Title / Header banner
    doc.fontSize(22).font("Helvetica-Bold").text("LocalServe Service Marketplace", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Enterprise Analytics Executive Report", { align: "center" });
    doc.moveDown(2);

    // Report details meta
    doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`);
    doc.text("Audience: LocalServe Board Administrators");
    doc.moveDown(1.5);

    // Draw horizontal separator line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#dddddd").stroke();
    doc.moveDown(2);

    // Write performance summary variables
    doc.fontSize(14).font("Helvetica-Bold").text("Platform Totals Summary");
    doc.moveDown(0.8);
    doc.fontSize(11).font("Helvetica").text(`- Total Requested Bookings: ${bookingCounts?.totalBookings || 0}`);
    doc.text(`- Completed Bookings Tally: ${bookingCounts?.completed || 0}`);
    doc.text(`- Accumulated Gross Platform Revenue: INR ${(paymentCounts?.totalGross || 0).toFixed(2)}`);
    doc.moveDown(2.5);

    // Disclaimer footer
    doc.fontSize(9).font("Helvetica-Oblique").text("This document contains verified production records automatically parsed from the database. Distribution is strictly restricted to authenticated system administrators.", { align: "justify" });

    doc.end();
  } catch (error) {
    console.error("Export Analytics PDF Error:", error.message);
    res.status(500).send("Failed to generate PDF audit file.");
  }
};
