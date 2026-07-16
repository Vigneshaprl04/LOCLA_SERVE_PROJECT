/**
 * LocalServe - Integration & Unit Test Suite for Razorpay Payment & Invoice Module
 * Run: node backend/scripts/runPaymentTests.cjs
 */

'use strict';

process.env.PORT = 5001; // Run tests on port 5001 to prevent conflict
process.env.NODE_ENV = 'test';

const axios = require('axios');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const BASE = 'http://localhost:5001/api';
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Vicky@2005',
  database: process.env.DB_NAME || 'localserve_db',
  port: Number(process.env.DB_PORT || 3306),
  ssl: { rejectUnauthorized: false }
};

let db;
let passed = 0;
let failed = 0;

async function assertTest(name, testFn) {
  try {
    await testFn();
    console.log(`  ✅ PASSED: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Reason:`, err.message);
    if (err.response) {
      console.error(`     Response Status:`, err.response.status);
      console.error(`     Response Data:`, JSON.stringify(err.response.data));
    }
    failed++;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\n=======================================================");
  console.log("  Running LocalServe Razorpay & Invoice System Integration Tests");
  console.log("=======================================================\n");

  // Connect to Database
  try {
    db = await mysql.createConnection(DB_CONFIG);
    console.log("Connected to database successfully.");
  } catch (err) {
    console.error("FATAL: Could not connect to database:", err.message);
    process.exit(1);
  }

  // Start Server
  console.log("Starting backend server on port 5001...");
  require('../server');

  // Wait for server to boot
  let retries = 10;
  let serverReady = false;
  while (retries > 0) {
    try {
      await axios.get('http://localhost:5001/');
      serverReady = true;
      console.log("Backend server is ready on port 5001.\n");
      break;
    } catch (e) {
      retries--;
      await sleep(500);
    }
  }

  if (!serverReady) {
    console.error("FATAL: Backend server failed to start on port 5001.");
    process.exit(1);
  }

  // 1. Setup Test Accounts & Tokens
  let userToken, providerToken, adminToken;
  let userId, providerUserId, providerId, bookingId;

  const testUserEmail = `pmt_user_${Date.now()}@example.com`;
  const testProvEmail = `pmt_prov_${Date.now()}@example.com`;
  const testAdminEmail = `pmt_admin_${Date.now()}@example.com`;
  const password = "User@12345";

  // Register User
  await axios.post(`${BASE}/auth/register`, {
    name: "Payment Tester User",
    email: testUserEmail,
    password,
    role: "user"
  });

  // Login User
  let res = await axios.post(`${BASE}/auth/login`, { email: testUserEmail, password });
  userToken = res.data.token;
  userId = res.data.user.id;

  // Register Provider
  await axios.post(`${BASE}/auth/register`, {
    name: "Payment Tester Provider",
    email: testProvEmail,
    password,
    role: "provider",
    category_id: 1,
    experience: 5,
    working_area: "Test Area",
    city: "Test City",
    pincode: "600001"
  });

  // Verify provider setup in DB and fetch providerId
  const [[provRow]] = await db.query("SELECT id, user_id FROM providers WHERE user_id = (SELECT id FROM users WHERE email = ?)", [testProvEmail]);
  providerId = provRow.id;
  providerUserId = provRow.user_id;

  // Login Provider
  res = await axios.post(`${BASE}/auth/login`, { email: testProvEmail, password });
  providerToken = res.data.token;

  // Setup Admin
  await db.query(
    "INSERT INTO users (name, email, password, role, is_active, email_verified) VALUES ('Payment Test Admin', ?, ?, 'admin', 1, 1)",
    [testAdminEmail, await require('bcryptjs').hash(password, 10)]
  );
  res = await axios.post(`${BASE}/auth/login`, { email: testAdminEmail, password });
  adminToken = res.data.token;

  // Create mock booking
  const [bResult] = await db.query(
    `INSERT INTO bookings (user_id, provider_id, category_id, service_description, service_address, preferred_date, estimated_price, final_price, booking_status, payment_status)
     VALUES (?, ?, 1, 'Completed mock repair service', '123 Test St', NOW(), 200.00, 200.00, 'completed', 'pending')`,
    [userId, providerId]
  );
  bookingId = bResult.insertId;

  // Variables for holding testing values
  let orderId;

  // T01: Order Creation (Verification of ownership & backend amount calculation)
  await assertTest("Order Creation succeeds and calculates GST + Total strictly on backend", async () => {
    const res = await axios.post(`${BASE}/payments/create-order`, { booking_id: bookingId }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");
    if (!res.data.order.id) throw new Error("Expected Razorpay order ID to be returned");

    orderId = res.data.order.id;

    // Check DB record
    const [rows] = await db.query("SELECT * FROM payments WHERE razorpay_order_id = ?", [orderId]);
    if (rows.length === 0) throw new Error("Payment record not found in DB");
    
    const p = rows[0];
    if (Number(p.amount) !== 200.00) throw new Error(`Expected amount 200, got ${p.amount}`);
    if (Number(p.gst_amount) !== 36.00) throw new Error(`Expected GST 36, got ${p.gst_amount}`);
    if (Number(p.total_amount) !== 236.00) throw new Error(`Expected total 236, got ${p.total_amount}`);
    if (p.payment_status !== "pending") throw new Error(`Expected status pending, got ${p.payment_status}`);
  });

  // T02: Unauthorized Access to Order Creation
  await assertTest("Order Creation fails with 403 when accessed by another user", async () => {
    try {
      await axios.post(`${BASE}/payments/create-order`, { booking_id: bookingId }, {
        headers: { Authorization: `Bearer ${providerToken}` } // provider is not the booking client
      });
      throw new Error("Should have thrown 403");
    } catch (err) {
      if (!err.response || err.response.status !== 403) {
        throw new Error(`Expected status 403, got ${err.response?.status || err.message}`);
      }
    }
  });

  // T03: Failed Payment Simulation
  await assertTest("Fail Payment updates status to failed and logs error reason", async () => {
    const mockPaymentId = `pay_err_${crypto.randomBytes(4).toString('hex')}`;
    const res = await axios.post(`${BASE}/payments/fail`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: mockPaymentId,
      error_reason: "User cancelled authentication on Checkout page"
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    
    // Check DB status changed to failed
    const [rows] = await db.query("SELECT payment_status FROM payments WHERE razorpay_order_id = ?", [orderId]);
    if (rows[0].payment_status !== "failed") throw new Error(`Expected status failed, got ${rows[0].payment_status}`);

    // Check payment logs
    const [logs] = await db.query("SELECT * FROM payment_logs WHERE booking_id = ? AND new_status = 'failed'", [bookingId]);
    if (logs.length === 0) throw new Error("Expected failure log in payment_logs");
  });

  // T04: Cancelled Payment Simulation
  await assertTest("Cancel Payment updates status to cancelled and logs the event", async () => {
    // Create new order to test cancellation
    const oRes = await axios.post(`${BASE}/payments/create-order`, { booking_id: bookingId }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const tempOrderId = oRes.data.order.id;

    const res = await axios.post(`${BASE}/payments/cancel`, { razorpay_order_id: tempOrderId }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);

    const [rows] = await db.query("SELECT payment_status FROM payments WHERE razorpay_order_id = ?", [tempOrderId]);
    if (rows[0].payment_status !== "cancelled") throw new Error(`Expected status cancelled, got ${rows[0].payment_status}`);
  });

  // T05: Signature Verification & Successful Payment
  let invoiceNo;
  await assertTest("Signature Verification (Mock) succeeds, generates INV number and updates booking status", async () => {
    // We retry/verify the orderId that was set to failed earlier, simulating a successful retry!
    const mockPaymentId = `pay_mock_${crypto.randomBytes(6).toString('hex')}`;
    const res = await axios.post(`${BASE}/payments/verify`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: mockPaymentId,
      payment_method: "Mock-UPI"
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");
    if (!res.data.invoiceNumber) throw new Error("Expected invoiceNumber to be returned");

    invoiceNo = res.data.invoiceNumber;
    if (!invoiceNo.startsWith(`INV-${new Date().getFullYear()}-`)) {
      throw new Error(`Invalid invoice format: ${invoiceNo}`);
    }

    // Verify DB states
    const [pRows] = await db.query("SELECT payment_status, invoice_number FROM payments WHERE razorpay_order_id = ?", [orderId]);
    if (pRows[0].payment_status !== "paid") throw new Error("Expected payment status to be paid");
    if (pRows[0].invoice_number !== invoiceNo) throw new Error("Invoice number mismatch");

    const [bRows] = await db.query("SELECT payment_status FROM bookings WHERE id = ?", [bookingId]);
    if (bRows[0].payment_status !== "paid") throw new Error("Expected booking payment status to be paid");
  });

  // T06: Idempotent Signature Verification (Prevent duplicate verification)
  await assertTest("Idempotent verifyPayment call returns existing verification status instantly", async () => {
    const mockPaymentId = `pay_mock_${crypto.randomBytes(6).toString('hex')}`;
    const res = await axios.post(`${BASE}/payments/verify`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: mockPaymentId,
      payment_method: "Mock-UPI"
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.message !== "Payment already verified") throw new Error(`Expected 'Payment already verified', got ${res.data.message}`);
  });

  // T07: Fetch Invoice Details (JSON)
  await assertTest("Get Invoice JSON returns complete customer, provider, and payment breakdown details", async () => {
    const res = await axios.get(`${BASE}/payments/invoice/${bookingId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const invoice = res.data.invoice;
    if (invoice.id !== bookingId) throw new Error("Booking ID mismatch in invoice");
    if (invoice.invoice_number !== invoiceNo) throw new Error("Invoice number mismatch");
    if (Number(invoice.total_amount) !== 236.00) throw new Error("Total amount mismatch");
  });

  // T08: Download Invoice PDF
  await assertTest("Download Invoice PDF returns correct headers and content-type", async () => {
    const res = await axios.get(`${BASE}/payments/invoice/${bookingId}/pdf`, {
      headers: { Authorization: `Bearer ${userToken}` },
      responseType: 'arraybuffer'
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.headers['content-type'] !== 'application/pdf') {
      throw new Error(`Expected content-type application/pdf, got ${res.headers['content-type']}`);
    }
    if (!res.headers['content-disposition'].includes('attachment; filename=invoice-')) {
      throw new Error(`Expected content-disposition attachment filename, got ${res.headers['content-disposition']}`);
    }
  });

  // T09: Payment History with filters and search
  await assertTest("getPaymentHistory returns filtered and searched payments list", async () => {
    // Test user history
    let res = await axios.get(`${BASE}/payments/history`, {
      params: { filter: "today", search: String(bookingId) },
      headers: { Authorization: `Bearer ${userToken}` }
    });
    if (res.data.payments.length === 0) throw new Error("Expected at least one payment history item");
    if (res.data.payments[0].invoice_number !== invoiceNo) throw new Error("Invoice number mismatch in history");

    // Test provider history
    res = await axios.get(`${BASE}/payments/history`, {
      params: { filter: "all" },
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (res.data.payments.length === 0) throw new Error("Provider should see their completed earnings transaction");

    // Test admin history
    res = await axios.get(`${BASE}/payments/history`, {
      params: { search: invoiceNo },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.data.payments.length === 0) throw new Error("Admin should see searched invoice in platform-wide payments");
  });

  // T10: Provider Dashboard Stats
  await assertTest("Provider Dashboard Stats returns completed, pending, and failed earnings statistics", async () => {
    const res = await axios.get(`${BASE}/payments/dashboard/provider`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const stats = res.data.stats;
    if (stats.completedPayments !== 1) throw new Error(`Expected completedPayments 1, got ${stats.completedPayments}`);
    if (stats.todayEarnings !== 236.00) throw new Error(`Expected todayEarnings 236, got ${stats.todayEarnings}`);
  });

  // T11: Admin Dashboard Stats
  await assertTest("Admin Dashboard Stats returns completed platform revenue, weekly and monthly stats", async () => {
    const res = await axios.get(`${BASE}/payments/dashboard/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const stats = res.data.stats;
    if (stats.completedPayments !== 1) throw new Error(`Expected completedPayments 1, got ${stats.completedPayments}`);
    if (stats.totalRevenue !== 236.00) throw new Error(`Expected totalRevenue 236, got ${stats.totalRevenue}`);
  });

  // T12: Invalid JWT Authorization
  await assertTest("API endpoints block requests with invalid JWT tokens", async () => {
    try {
      await axios.get(`${BASE}/payments/history`, {
        headers: { Authorization: `Bearer invalid_jwt_token` }
      });
      throw new Error("Should have thrown auth error");
    } catch (err) {
      if (!err.response || (err.response.status !== 401 && err.response.status !== 403)) {
        throw new Error(`Expected status 401/403, got ${err.response?.status || err.message}`);
      }
    }
  });

  // T13: Unauthorized Invoice Download
  await assertTest("downloadInvoicePDF blocks unauthorized users (other client) with 403", async () => {
    // Register another user
    const otherEmail = `pmt_other_${Date.now()}@example.com`;
    await axios.post(`${BASE}/auth/register`, { name: "Other User", email: otherEmail, password, role: "user" });
    const oRes = await axios.post(`${BASE}/auth/login`, { email: otherEmail, password });
    const otherToken = oRes.data.token;

    try {
      await axios.get(`${BASE}/payments/invoice/${bookingId}/pdf`, {
        headers: { Authorization: `Bearer ${otherToken}` }
      });
      throw new Error("Should have blocked the unauthorized user");
    } catch (err) {
      if (!err.response || err.response.status !== 403) {
        throw new Error(`Expected status 403, got ${err.response?.status || err.message}`);
      }
    }
  });

  // Clean up database records
  console.log("\nCleaning up test database records...");
  await db.query("DELETE FROM payment_logs WHERE booking_id = ?", [bookingId]);
  await db.query("DELETE FROM payments WHERE booking_id = ?", [bookingId]);
  await db.query("DELETE FROM bookings WHERE id = ?", [bookingId]);
  await db.query("DELETE FROM providers WHERE id = ?", [providerId]);
  await db.query("DELETE FROM users WHERE email IN (?, ?, ?, ?)", [testUserEmail, testProvEmail, testAdminEmail, `pmt_other_${Date.now()}@example.com`]);

  console.log("\n=======================================================");
  console.log(`  Payment Module Tests completed. Passed: ${passed}, Failed: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
