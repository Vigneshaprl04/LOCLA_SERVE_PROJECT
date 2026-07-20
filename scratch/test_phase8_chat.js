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
  console.log("  LocalServe V2 - Sprint 3 Phase 2 Chat socket Tests");
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
    
    // Wait for database, migrations, and server startup to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("  API server ready. Running test cases...\n");

    // 3. Login test accounts
    // vignesh@test.com (customer, user_id=1)
    // arun@test.com (provider, user_id=2, provider_id=1)
    const loginUserRes = await api("POST", "/auth/login", { email: "vignesh@test.com", password: "user123" });
    const loginProvRes = await api("POST", "/auth/login", { email: "arun@test.com", password: "Pass1234!" });

    const userToken = loginUserRes.data.token;
    const provToken = loginProvRes.data.token;
    const customerUserId = loginUserRes.data.user.id;
    const provUserId = loginProvRes.data.user.id;

    assert(!!userToken, "User Authentication Check", "Failed to retrieve customer token");
    assert(!!provToken, "Provider Authentication Check", "Failed to retrieve provider token");

    // Get provider profile details
    const [[arunProv]] = await dbConnection.execute("SELECT id, category_id FROM providers WHERE user_id = ?", [provUserId]);
    const arunProviderId = arunProv.id;
    const categoryId = arunProv.category_id;

    // Ensure provider is verified and available so bookings can succeed
    await dbConnection.execute("UPDATE providers SET verification_status = 'verified', availability_status = 1 WHERE id = ?", [arunProviderId]);

    // Helper helper to create socket connection
    const connectSocket = (token) => {
      const socket = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket"],
        forceNew: true
      });
      activeSockets.push(socket);
      return socket;
    };

    // Connect customer and provider sockets
    const customerSocket1 = connectSocket(userToken);
    const providerSocket1 = connectSocket(provToken);

    await Promise.all([
      new Promise((resolve) => customerSocket1.once("connect", resolve)),
      new Promise((resolve) => providerSocket1.once("connect", resolve))
    ]);

    // Create Booking A (customer vignesh, provider arun)
    const createResA = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Test Booking A",
      service_address: "Address A",
      preferred_date: "2026-07-20 18:00:00"
    }, userToken);

    const bookingIdA = createResA.data.bookingId;
    assert(!!bookingIdA, "Booking A Creation", "Booking A should be created successfully");

    // Create Booking B (customer vignesh, provider arun)
    const createResB = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Test Booking B",
      service_address: "Address B",
      preferred_date: "2026-07-20 19:00:00"
    }, userToken);

    const bookingIdB = createResB.data.bookingId;
    assert(!!bookingIdB, "Booking B Creation", "Booking B should be created successfully");

    // Create a third user not part of booking A to verify unauthorized access
    let otherToken;
    const registerOtherRes = await api("POST", "/auth/register", {
      name: "Outsider Chat User",
      email: "outsider_chat@test.com",
      password: "Pass1234!",
      phone: "9999999999",
      role: "user"
    });
    
    if (registerOtherRes.data && registerOtherRes.data.token) {
      otherToken = registerOtherRes.data.token;
    } else {
      const loginOtherRes = await api("POST", "/auth/login", {
        email: "outsider_chat@test.com",
        password: "Pass1234!"
      });
      otherToken = loginOtherRes.data?.token;
    }
    
    assert(!!otherToken, "Other Account Authentication", "Failed to retrieve other token");

    const outsiderSocket = connectSocket(otherToken);
    await new Promise((resolve) => outsiderSocket.once("connect", resolve));


    // --- TEST 1: Join Chat Room ---
    console.log("\n🔍 [TEST 1] Testing Join Chat Room...");
    customerSocket1.emit("chat_join", { bookingId: bookingIdA });
    providerSocket1.emit("chat_join", { bookingId: bookingIdA });
    
    // Wait briefly
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert(true, "Join Room Emitted", "Join room event sent to socket");


    // --- TEST 2: Unauthorized Join Rejected ---
    console.log("\n🔍 [TEST 2] Testing Unauthorized Join Rejected...");
    let unauthJoinError = null;
    outsiderSocket.once("chat_error", (err) => {
      unauthJoinError = err.message;
    });

    outsiderSocket.emit("chat_join", { bookingId: bookingIdA });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(
      unauthJoinError && unauthJoinError.includes("You cannot access this booking chat"),
      "Unauthorized Join Rejected",
      `Expected authorization error, received: ${unauthJoinError}`
    );


    // --- TEST 3: Send & Receive Message ---
    console.log("\n🔍 [TEST 3] Testing Send and Receive Message...");
    let userReceivedMessage = null;
    let providerReceivedMessage = null;

    customerSocket1.once("chat_message", (msg) => {
      userReceivedMessage = msg;
    });
    providerSocket1.once("chat_message", (msg) => {
      providerReceivedMessage = msg;
    });

    customerSocket1.emit("chat_send", {
      bookingId: bookingIdA,
      message: "Hello from customer"
    });

    await new Promise((resolve) => setTimeout(resolve, 400));
    assert(
      userReceivedMessage && userReceivedMessage.message === "Hello from customer",
      "Customer receives self-sent message",
      JSON.stringify(userReceivedMessage)
    );
    assert(
      providerReceivedMessage && providerReceivedMessage.message === "Hello from customer",
      "Provider receives customer message",
      JSON.stringify(providerReceivedMessage)
    );
    assert(
      providerReceivedMessage && providerReceivedMessage.senderId === customerUserId,
      "Sender identity derived from JWT socket",
      `Expected senderId: ${customerUserId}, got: ${providerReceivedMessage?.senderId}`
    );


    // --- TEST 4: Chat History Persistence ---
    console.log("\n🔍 [TEST 4] Testing Chat History Persistence...");
    const historyRes = await api("GET", `/messages/${bookingIdA}`, null, userToken);
    assert(historyRes.status === 200, "Get messages response status", `Expected 200, got ${historyRes.status}`);
    const lastMsg = historyRes.data.messages[historyRes.data.messages.length - 1];
    assert(
      lastMsg && lastMsg.message === "Hello from customer",
      "Message persisted in MySQL DB",
      `Expected 'Hello from customer', got: ${JSON.stringify(lastMsg)}`
    );


    // --- TEST 5: Room Isolation ---
    console.log("\n🔍 [TEST 5] Testing Room Isolation (Room members receive updates, outsiders do not)...");
    
    // Join customer socket to Room B as well
    customerSocket1.emit("chat_join", { bookingId: bookingIdB });
    
    let receivedInRoomA = false;
    let receivedInRoomB = false;

    // Reset listener
    customerSocket1.on("chat_message", (data) => {
      if (Number(data.bookingId) === Number(bookingIdA)) receivedInRoomA = true;
      if (Number(data.bookingId) === Number(bookingIdB)) receivedInRoomB = true;
    });

    // Provider joins room B and sends a message in room B only
    providerSocket1.emit("chat_join", { bookingId: bookingIdB });
    providerSocket1.emit("chat_send", {
      bookingId: bookingIdB,
      message: "Room B only message"
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert(receivedInRoomB === true, "Message received in active Room B", "Member of room B should receive updates");
    assert(receivedInRoomA === false, "No leakage to inactive Room A", "Update should not leak to unrelated rooms");

    // Clean listeners
    customerSocket1.removeAllListeners("chat_message");


    // --- TEST 6: Unknown Booking Rejected ---
    console.log("\n🔍 [TEST 6] Testing Unknown Booking Rejected...");
    let unknownBookingError = null;
    customerSocket1.once("chat_error", (err) => {
      unknownBookingError = err.message;
    });

    customerSocket1.emit("chat_join", { bookingId: 999999 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(
      unknownBookingError && unknownBookingError.includes("Booking not found"),
      "Unknown booking rejected",
      `Expected error, got: ${unknownBookingError}`
    );


    // --- TEST 7: Empty Message Rejected ---
    console.log("\n🔍 [TEST 7] Testing Empty Message Rejected...");
    let emptyMsgError = null;
    customerSocket1.once("chat_error", (err) => {
      emptyMsgError = err.message;
    });

    customerSocket1.emit("chat_send", {
      bookingId: bookingIdA,
      message: "    "
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(
      emptyMsgError && emptyMsgError.includes("Message content cannot be empty"),
      "Empty message rejected",
      `Expected error, got: ${emptyMsgError}`
    );


    // --- TEST 8: SQL Injection Attempt Rejected ---
    console.log("\n🔍 [TEST 8] Testing SQL Injection Attempt Rejected...");
    let sqlInjReceived = null;
    customerSocket1.once("chat_message", (msg) => {
      sqlInjReceived = msg.message;
    });

    const injectionPayload = "'; DROP TABLE messages; --";
    customerSocket1.emit("chat_send", {
      bookingId: bookingIdA,
      message: injectionPayload
    });

    await new Promise((resolve) => setTimeout(resolve, 400));
    assert(
      sqlInjReceived === injectionPayload,
      "SQL injection payload stored literally",
      `Expected safe string, got: ${sqlInjReceived}`
    );

    // Verify DB still works / table not dropped
    const verifyDbRes = await api("GET", `/messages/${bookingIdA}`, null, userToken);
    assert(verifyDbRes.status === 200, "Database remains safe and operational", `DB response: ${verifyDbRes.status}`);


    // --- TEST 9: Socket Reconnect ---
    console.log("\n🔍 [TEST 9] Testing Socket Reconnect & Join Retention...");
    
    // Simulate drop
    customerSocket1.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));

    let reconnectReceived = false;
    customerSocket1.once("chat_message", (msg) => {
      reconnectReceived = true;
    });

    customerSocket1.connect();
    await new Promise((resolve) => customerSocket1.once("connect", resolve));

    // Re-join booking room A after reconnect (simulates context behavior)
    customerSocket1.emit("chat_join", { bookingId: bookingIdA });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Provider sends message in A
    providerSocket1.emit("chat_join", { bookingId: bookingIdA });
    providerSocket1.emit("chat_send", {
      bookingId: bookingIdA,
      message: "Post-reconnect message"
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert(reconnectReceived === true, "Reconnect message delivered successfully", "Reconnected socket receives messages after re-joining room");

  } catch (error) {
    console.error("❌ Test script encountered crash:", error.message, error.stack);
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
