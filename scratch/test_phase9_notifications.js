"use strict";

const path = require("path");
module.paths.push(path.join(__dirname, "../backend/node_modules"));

require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const axios = require("axios");
const mysql = require("mysql2/promise");
const { io } = require("../frontend/node_modules/socket.io-client");

const BASE_URL = "http://localhost:5000/api";
const BACKEND_URL = "http://localhost:5000";
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "localserve_db",
  port: Number(process.env.DB_PORT || 3306),
  ssl: { rejectUnauthorized: false }
};

const passed = [];
const failed = [];

function assert(condition, testName, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed.push(testName);
  } else {
    console.error(`  ❌ [FAIL] ${testName}: ${message}`);
    failed.push({ testName, message });
  }
}

async function api(method, urlPath, body = null, token = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${urlPath}`,
      data: body,
      headers,
      validateStatus: () => true
    });
    return response;
  } catch (error) {
    console.error(`Request to ${urlPath} threw exception:`, error.message);
    throw error;
  }
}

async function runTests() {
  console.log("\n==================================================");
  console.log("  LocalServe V2 - Sprint 3 Phase 3 Notifications Tests (Phase 2 Sockets)");
  console.log("==================================================\n");

  let dbConnection;
  const activeSockets = [];

  try {
    // 1. Establish DB Connection
    dbConnection = await mysql.createConnection(DB_CONFIG);
    console.log("  DB connected successfully");

    // 2. Ensure server is started
    console.log("  Starting API server...");
    require("../backend/server");
    
    // Wait for startup
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("  API server ready. Running test cases...\n");

    // 3. Login test accounts
    const loginUserRes = await api("POST", "/auth/login", { email: "vignesh@test.com", password: "user123" });
    const loginProvRes = await api("POST", "/auth/login", { email: "arun@test.com", password: "Pass1234!" });

    const userToken = loginUserRes.data.token;
    const provToken = loginProvRes.data.token;
    const customerUserId = loginUserRes.data.user.id;
    const provUserId = loginProvRes.data.user.id;

    assert(!!userToken, "User Login Check", "Failed to retrieve customer token");
    assert(!!provToken, "Provider Login Check", "Failed to retrieve provider token");

    // Get provider profile details
    const [[arunProv]] = await dbConnection.execute("SELECT id, category_id FROM providers WHERE user_id = ?", [provUserId]);
    const arunProviderId = arunProv.id;
    const categoryId = arunProv.category_id;

    // Ensure provider is verified and available so bookings can succeed
    await dbConnection.execute("UPDATE providers SET verification_status = 'verified', availability_status = 1 WHERE id = ?", [arunProviderId]);

    // Socket helper
    const connectSocket = (token) => {
      const socket = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket"],
        forceNew: true
      });
      activeSockets.push(socket);
      return socket;
    };

    // Connect user and provider sockets
    const customerSocket = connectSocket(userToken);
    const providerSocket = connectSocket(provToken);

    await Promise.all([
      new Promise((resolve) => customerSocket.once("connect", resolve)),
      new Promise((resolve) => providerSocket.once("connect", resolve))
    ]);

    // Clear old test notifications for users
    await dbConnection.execute("DELETE FROM notifications WHERE user_id IN (?, ?)", [customerUserId, provUserId]);


    // --- TEST 1: Invalid/Expired JWT Rejection ---
    console.log("\n🔍 [TEST 1] Testing Invalid/Expired JWT Rejection...");
    const expiredSocket = io(BACKEND_URL, {
      auth: { token: "invalid_or_expired_jwt_signature" },
      transports: ["websocket"],
      forceNew: true
    });
    
    let connectErrorMsg = null;
    await new Promise((resolve) => {
      expiredSocket.once("connect_error", (err) => {
        connectErrorMsg = err.message;
        resolve();
      });
    });
    assert(
      connectErrorMsg && connectErrorMsg.includes("Authentication error"),
      "Expired/Invalid JWT Connection Rejected",
      `Expected authentication error, got: ${connectErrorMsg}`
    );
    expiredSocket.close();


    // --- TEST 2: User joins correct room (auto-join) & Room Isolation ---
    console.log("\n🔍 [TEST 2] Testing User joins correct room (auto-join user:<userId>)...");
    // Verify by broadcasting a general notification to User 1 (customerUserId)
    let customerNotifPromise = new Promise((resolve) => {
      customerSocket.once("notification", resolve);
    });

    let providerReceivedWrong = false;
    providerSocket.on("notification", () => {
      providerReceivedWrong = true;
    });

    // Directly call service to create notification for User 1 (Vignesh)
    const notificationService = require("../backend/services/notificationService");
    const testNotif1 = await notificationService.createNotification({
      userId: customerUserId,
      bookingId: null,
      title: "Test Room Join",
      message: "This should be sent to user room user:<userId>",
      type: "general"
    });

    let custReceivedNotif = await customerNotifPromise;
    assert(Number(custReceivedNotif.id) === Number(testNotif1.id), "Customer receives notification emitted to user:1", JSON.stringify(custReceivedNotif));
    
    // Wait to verify room isolation (Provider should NOT receive User 1's notification)
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(providerReceivedWrong === false, "Multiple User Isolation (Provider room did not leak)", "Provider socket should not receive customer notifications");
    
    providerSocket.removeAllListeners("notification");


    // --- TEST 3: Booking Created Notification ---
    console.log("\n🔍 [TEST 3] Testing Booking Created notification trigger...");
    let providerNotifPromise = new Promise((resolve) => {
      providerSocket.once("notification", resolve);
    });

    const createRes = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Real-time Notification Test booking",
      service_address: "Address X",
      preferred_date: "2026-07-20 18:00:00"
    }, userToken);

    const bookingId = createRes.data.bookingId;
    assert(!!bookingId, "Booking creation", "Booking should be created successfully");

    let provNotifData = await providerNotifPromise;
    assert(
      provNotifData.bookingId === bookingId && provNotifData.type === "BOOKING_CREATED",
      "Provider receives BOOKING_CREATED notification via socket",
      JSON.stringify(provNotifData)
    );


    // --- TEST 4: Booking Accepted Notification ---
    console.log("\n🔍 [TEST 4] Testing Booking Accepted notification trigger...");
    // Step A: Provider quotes (triggers BOOKING_QUOTED)
    const quotePromise = new Promise((resolve) => {
      customerSocket.once("notification", resolve);
    });
    await api("PATCH", `/bookings/${bookingId}/status`, { status: "quoted", estimated_price: 500 }, provToken);
    await quotePromise; // Clear the quoted notification from socket stream

    const providerNotifPromise2 = new Promise((resolve) => {
      providerSocket.once("notification", resolve);
    });

    // Step B: Customer accepts (triggers BOOKING_ACCEPTED)
    await api("PATCH", `/bookings/${bookingId}/customer-status`, { status: "accepted" }, userToken);

    // Assert provider receives booking accepted notification
    let provNotifData2 = await providerNotifPromise2;
    assert(
      provNotifData2.bookingId === bookingId && provNotifData2.type === "BOOKING_ACCEPTED",
      "Provider receives BOOKING_ACCEPTED notification via socket",
      JSON.stringify(provNotifData2)
    );


    // --- TEST 5: Chat Notification (NEW_CHAT_MESSAGE) ---
    console.log("\n🔍 [TEST 5] Testing Chat notification on new message...");
    customerNotifPromise = new Promise((resolve) => {
      customerSocket.once("notification", resolve);
    });

    // Provider sends chat message to customer
    const chatSocket = connectSocket(provToken);
    await new Promise((resolve) => chatSocket.once("connect", resolve));
    chatSocket.emit("chat_join", { bookingId });
    await new Promise((resolve) => setTimeout(resolve, 200));

    chatSocket.emit("chat_send", { bookingId, message: "Hello notification test!" });

    const custNotifData = await customerNotifPromise;
    assert(
      custNotifData.bookingId === bookingId && custNotifData.type === "NEW_CHAT_MESSAGE",
      "Customer receives NEW_CHAT_MESSAGE notification via socket",
      JSON.stringify(custNotifData)
    );
    chatSocket.close();


    // --- TEST 6: Payment Notification (PAYMENT_SUCCESS) ---
    console.log("\n🔍 [TEST 6] Testing Payment Success notifications...");
    let custPaymentNotifPromise = new Promise((resolve) => {
      customerSocket.once("notification", resolve);
    });
    let provPaymentNotifPromise = new Promise((resolve) => {
      providerSocket.once("notification", resolve);
    });

    // Create payment order
    const orderRes = await api("POST", "/payments/create-order", { booking_id: bookingId }, userToken);
    const mockOrderId = orderRes.data.orderId || orderRes.data.order?.id;
    assert(!!mockOrderId, "Payment order created", JSON.stringify(orderRes.data));

    // Verify payment
    await api("POST", "/payments/verify", {
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: "pay_mock_123456"
    }, userToken);

    let custPaymentNotif = await custPaymentNotifPromise;
    let provPaymentNotif = await provPaymentNotifPromise;

    assert(
      custPaymentNotif.type === "PAYMENT_SUCCESS" && custPaymentNotif.bookingId === bookingId,
      "Customer receives PAYMENT_SUCCESS notification",
      JSON.stringify(custPaymentNotif)
    );
    assert(
      provPaymentNotif.type === "PAYMENT_SUCCESS" && provPaymentNotif.bookingId === bookingId,
      "Provider receives PAYMENT_SUCCESS notification",
      JSON.stringify(provPaymentNotif)
    );


    // --- TEST 7: notification_mark_read ---
    console.log("\n🔍 [TEST 7] Testing notification_mark_read event...");
    const notifList = await api("GET", "/notifications", null, userToken);
    const targetNotifId = notifList.data.notifications[0].id;

    let socketReadAck = new Promise((resolve) => {
      customerSocket.once("notification_read", resolve);
    });

    customerSocket.emit("notification_mark_read", { notificationId: targetNotifId });
    let readAck = await socketReadAck;
    assert(Number(readAck.notificationId) === Number(targetNotifId), "Socket receives notification_read confirmation", JSON.stringify(readAck));

    // Verify database status is updated
    const [[notifDbRow]] = await dbConnection.execute("SELECT is_read FROM notifications WHERE id = ?", [targetNotifId]);
    assert(notifDbRow.is_read === 1, "Notification marked as read in database", `Database row status: ${notifDbRow.is_read}`);


    // --- TEST 8: notification_read_all ---
    console.log("\n🔍 [TEST 8] Testing notification_read_all event...");
    let socketReadAllAck = new Promise((resolve) => {
      customerSocket.once("notification_read_all", resolve);
    });

    customerSocket.emit("notification_read_all");
    let readAllAck = await socketReadAllAck;
    assert(readAllAck.success === true, "Socket receives notification_read_all confirmation", JSON.stringify(readAllAck));

    // Verify database count is 0
    const countRes = await api("GET", "/notifications/unread-count", null, userToken);
    assert(countRes.data.unreadCount === 0, "Mark all read clears unread count in DB", `Unread count: ${countRes.data.unreadCount}`);


    // --- TEST 9: Socket Reconnect ---
    console.log("\n🔍 [TEST 9] Testing Socket reconnect & auto-rejoin user room...");
    customerSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));

    customerNotifPromise = new Promise((resolve) => {
      customerSocket.once("notification", resolve);
    });

    customerSocket.connect();
    await new Promise((resolve) => customerSocket.once("connect", resolve));

    // Emulating client joining notification room on reconnect
    customerSocket.emit("joinUser");
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Provider updates status to on_the_way (valid transition from accepted)
    await api("PATCH", `/bookings/${bookingId}/status`, { status: "on_the_way" }, provToken);

    const reconnectNotifData = await customerNotifPromise;
    assert(
      reconnectNotifData.bookingId === bookingId && reconnectNotifData.type === "PROVIDER_ON_THE_WAY",
      "Customer receives notifications after socket reconnection",
      JSON.stringify(reconnectNotifData)
    );

  } catch (error) {
    console.error("❌ Test suite encountered crash:", error.message, error.stack);
    failed.push({ testName: "Test Run Integrity", message: error.message });
  } finally {
    // Cleanup sockets
    activeSockets.forEach((s) => {
      if (s.connected) s.close();
    });
    if (dbConnection) await dbConnection.end();

    console.log("\n==================================================");
    console.log("  ALL TESTS COMPLETED");
    console.log(`  Passed: ${passed.length} | Failed: ${failed.length}`);
    console.log("==================================================\n");

    if (failed.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
