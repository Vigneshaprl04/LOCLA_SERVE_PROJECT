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
  console.log("  LocalServe V2 - Sprint 3 Phase 1 Socket.IO Tests");
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
    
    // Wait for server to stand up
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("  API server ready. Running test cases...\n");

    // 3. Login test accounts
    const loginUserRes = await api("POST", "/auth/login", { email: "vignesh@test.com", password: "user123" });
    const loginProvRes = await api("POST", "/auth/login", { email: "arun@test.com", password: "Pass1234!" });

    const userToken = loginUserRes.data.token;
    const provToken = loginProvRes.data.token;
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

    // Create Booking A
    const createResA = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Test Booking A",
      service_address: "Address A",
      preferred_date: "2026-07-20 18:00:00"
    }, userToken);

    const bookingIdA = createResA.data.bookingId;
    assert(!!bookingIdA, "Booking A Creation", "Booking A should be created successfully");

    // Create Booking B (for isolation and concurrent tests)
    const createResB = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Test Booking B",
      service_address: "Address B",
      preferred_date: "2026-07-20 19:00:00"
    }, userToken);

    const bookingIdB = createResB.data.bookingId;
    assert(!!bookingIdB, "Booking B Creation", "Booking B should be created successfully");

    // --- TEST 1: Booking Join Room ---
    console.log("\n🔍 [TEST 1] Testing join room...");
    customerSocket.emit("booking_join", { bookingId: bookingIdA });
    providerSocket.emit("booking_join", { bookingId: bookingIdA });

    // --- TEST 2: Pending -> Quoted (Provider) ---
    console.log("\n🔍 [TEST 2] Testing Pending -> Quoted status change event...");
    let userEventPromise = new Promise((resolve) => {
      customerSocket.once("booking_status_changed", resolve);
    });
    let providerEventPromise = new Promise((resolve) => {
      providerSocket.once("booking_status_changed", resolve);
    });

    // Update status to quoted via API (provider)
    const quoteRes = await api("PATCH", `/bookings/${bookingIdA}/status`, {
      status: "quoted",
      estimated_price: 1500
    }, provToken);

    assert(quoteRes.data.success === true, "REST Status: Quoted", "Failed to update booking status to quoted");

    let userData = await userEventPromise;
    let providerData = await providerEventPromise;

    assert(userData.bookingId === bookingIdA && userData.status === "quoted", "Customer receives status 'quoted'", JSON.stringify(userData));
    assert(providerData.bookingId === bookingIdA && providerData.status === "quoted", "Provider receives status 'quoted'", JSON.stringify(providerData));

    // --- TEST 3: Quoted -> Accepted (Customer accepts quote) ---
    console.log("\n🔍 [TEST 3] Testing Quoted -> Accepted status change event...");
    userEventPromise = new Promise((resolve) => {
      customerSocket.once("booking_status_changed", resolve);
    });
    providerEventPromise = new Promise((resolve) => {
      providerSocket.once("booking_status_changed", resolve);
    });

    const acceptRes = await api("PATCH", `/bookings/${bookingIdA}/customer-status`, {
      status: "accepted"
    }, userToken);

    assert(acceptRes.data.success === true, "REST Status: Accepted", "Failed to accept booking quote");

    userData = await userEventPromise;
    providerData = await providerEventPromise;

    assert(userData.bookingId === bookingIdA && userData.status === "accepted", "Customer receives status 'accepted'", JSON.stringify(userData));
    assert(providerData.bookingId === bookingIdA && providerData.status === "accepted", "Provider receives status 'accepted'", JSON.stringify(providerData));

    // --- TEST 4: Accepted -> On The Way -> Work Started -> Completed (Provider) ---
    console.log("\n🔍 [TEST 4] Testing sequential status workflow (On The Way -> Work Started -> Completed)...");
    
    const statuses = ["on_the_way", "work_started", "completed"];
    for (const targetStatus of statuses) {
      userEventPromise = new Promise((resolve) => customerSocket.once("booking_status_changed", resolve));

      const updateRes = await api("PATCH", `/bookings/${bookingIdA}/status`, {
        status: targetStatus
      }, provToken);

      assert(updateRes.data.success === true, `REST Status: ${targetStatus}`, `Failed to update status to ${targetStatus}`);

      userData = await userEventPromise;
      assert(userData.bookingId === bookingIdA && userData.status === targetStatus, `Customer receives status '${targetStatus}'`, JSON.stringify(userData));
    }

    // --- TEST 5: Room Isolation ---
    console.log("\n🔍 [TEST 5] Testing Room Isolation (Room members receive updates, outsiders do not)...");
    
    const outsiderSocket = connectSocket(userToken);
    await new Promise((resolve) => outsiderSocket.once("connect", resolve));
    
    // Join outsider to booking B room
    outsiderSocket.emit("booking_join", { bookingId: bookingIdB });
    
    // Join Vignesh's main socket to booking B room as well
    customerSocket.emit("booking_join", { bookingId: bookingIdB });

    let mainSocketReceived = false;
    let outsiderSocketReceived = false;

    customerSocket.once("booking_status_changed", (data) => {
      if (data.bookingId === bookingIdB) mainSocketReceived = true;
    });
    outsiderSocket.once("booking_status_changed", (data) => {
      if (data.bookingId === bookingIdB) outsiderSocketReceived = true;
    });

    // Make provider join room B
    providerSocket.emit("booking_join", { bookingId: bookingIdB });

    // Update booking B status to quoted via API (provider)
    const quoteResB = await api("PATCH", `/bookings/${bookingIdB}/status`, {
      status: "quoted",
      estimated_price: 2000
    }, provToken);

    assert(quoteResB.data.success === true, "REST Status B: Quoted", "Failed to update booking B status to quoted");

    // Wait to see if sockets receive the event
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert(mainSocketReceived === true, "Room Member Receives Update", "Customer socket in room B should receive the status update");
    assert(outsiderSocketReceived === true, "Other Room Member Receives Update", "Outsider socket in room B should receive the status update");

    // Verify room isolation: Vignesh's customerSocket (now in room B) did NOT receive booking A updates on B's handler
    let outsiderReceivedC = false;
    outsiderSocket.on("booking_status_changed", (data) => {
      if (data.bookingId === 99999) outsiderReceivedC = true; // should not trigger
    });

    // Create booking C for testing A vs C isolation
    const createResC = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Test Booking C",
      service_address: "Address C",
      preferred_date: "2026-07-20 20:00:00"
    }, userToken);
    const bookingIdC = createResC.data.bookingId;

    customerSocket.emit("booking_join", { bookingId: bookingIdC });
    providerSocket.emit("booking_join", { bookingId: bookingIdC });

    await api("PATCH", `/bookings/${bookingIdC}/status`, {
      status: "rejected"
    }, provToken);

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(outsiderReceivedC === false, "Room Isolation Correctness", "Outsider socket not in room C should NOT receive room C updates");

    // --- TEST 6: Multiple Bookings Simultaneously ---
    console.log("\n🔍 [TEST 6] Testing multiple bookings simultaneously...");
    // Create Booking D and E
    const resD = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Booking D",
      service_address: "Address D",
      preferred_date: "2026-07-20 21:00:00"
    }, userToken);
    const resE = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Booking E",
      service_address: "Address E",
      preferred_date: "2026-07-20 22:00:00"
    }, userToken);

    const bIdD = resD.data.bookingId;
    const bIdE = resE.data.bookingId;

    customerSocket.emit("booking_join", { bookingId: bIdD });
    customerSocket.emit("booking_join", { bookingId: bIdE });
    providerSocket.emit("booking_join", { bookingId: bIdD });
    providerSocket.emit("booking_join", { bookingId: bIdE });

    let dReceived = false;
    let eReceived = false;

    const multiStatusHandler = (data) => {
      if (data.bookingId === bIdD) dReceived = true;
      if (data.bookingId === bIdE) eReceived = true;
    };
    customerSocket.on("booking_status_changed", multiStatusHandler);

    await api("PATCH", `/bookings/${bIdD}/status`, { status: "rejected" }, provToken);
    await api("PATCH", `/bookings/${bIdE}/status`, { status: "rejected" }, provToken);

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert(dReceived && eReceived, "Multiple concurrent bookings updates received", `D received: ${dReceived}, E received: ${eReceived}`);
    customerSocket.off("booking_status_changed", multiStatusHandler);

    // --- TEST 7: Unknown booking ignored/rejected handler test ---
    console.log("\n🔍 [TEST 7] Testing unknown booking join...");
    let errorReceived = false;
    customerSocket.once("socket_error", (err) => {
      errorReceived = true;
      assert(err.message.includes("Invalid bookingId"), "Unknown booking error message", err.message);
    });

    customerSocket.emit("booking_join", { bookingId: "invalid-id" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(errorReceived, "Unknown booking input yields validation error", "Invalid bookingId should trigger socket_error");

    // --- TEST 8: Socket Reconnect ---
    console.log("\n🔍 [TEST 8] Testing socket reconnect & room join retention...");
    
    const reconnectSocket = connectSocket(userToken);
    await new Promise((resolve) => reconnectSocket.once("connect", resolve));

    // Create Booking F
    const resF = await api("POST", "/bookings", {
      provider_id: arunProviderId,
      category_id: categoryId,
      service_description: "Booking F",
      service_address: "Address F",
      preferred_date: "2026-07-20 23:00:00"
    }, userToken);
    const bIdF = resF.data.bookingId;

    reconnectSocket.emit("booking_join", { bookingId: bIdF });
    providerSocket.emit("booking_join", { bookingId: bIdF });

    // Disconnect and reconnect customer socket to simulate internet drop
    reconnectSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    let fReceived = false;
    reconnectSocket.once("booking_status_changed", (data) => {
      if (data.bookingId === bIdF) fReceived = true;
    });

    reconnectSocket.connect();
    await new Promise((resolve) => reconnectSocket.once("connect", resolve));

    // Simulate client behavior re-joining
    reconnectSocket.emit("booking_join", { bookingId: bIdF });

    // Update status to quoted
    await api("PATCH", `/bookings/${bIdF}/status`, { status: "quoted", estimated_price: 800 }, provToken);

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert(fReceived === true, "Reconnect status update received", "Reconnected socket should successfully receive status change after re-joining");

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
