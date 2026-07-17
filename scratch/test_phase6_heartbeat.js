"use strict";

const path = require("path");
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

async function getProviderDbStatus(dbConnection, providerId) {
  const [[prov]] = await dbConnection.execute(
    "SELECT is_online, availability_status FROM providers WHERE id = ?",
    [providerId]
  );
  return prov;
}

async function runTests() {
  console.log("\n==================================================");
  console.log("  LocalServe V2 - Sprint 2 Phase 6 Heartbeat Tests");
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

    // 3. Authenticate users to get tokens
    console.log("🔐 [AUTH] Authenticating test accounts...");
    const loginUserRes = await api("POST", "/auth/login", { email: "vignesh@test.com", password: "user123" });
    const loginProvRes = await api("POST", "/auth/login", { email: "arun@test.com", password: "Pass1234!" });

    const userToken = loginUserRes.data.token;
    const provToken = loginProvRes.data.token;
    const provUserId = loginProvRes.data.user.id;

    // Find provider_id for Arun
    const [[arunProv]] = await dbConnection.execute("SELECT id FROM providers WHERE user_id = ?", [provUserId]);
    const arunProviderId = arunProv.id;

    // Reset status to offline in database to start clean
    await dbConnection.execute("UPDATE providers SET is_online = 0, availability_status = 0 WHERE id = ?", [arunProviderId]);

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

    // --- TEST 1: Normal Heartbeat Loop ---
    console.log("\n🔍 [TEST 1] Testing Normal Heartbeat Keep-Alive...");
    
    const customerSocket = connectSocket(userToken);
    const providerSocket = connectSocket(provToken);

    await Promise.all([
      new Promise((resolve) => customerSocket.once("connect", resolve)),
      new Promise((resolve) => providerSocket.once("connect", resolve))
    ]);

    // Mark online via REST API
    await api("POST", "/providers/go-online", null, provToken);
    
    // Join presence tracking
    providerSocket.emit("provider_join", { providerId: arunProviderId });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Send heartbeats every 2 seconds for a total of 6 seconds
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      providerSocket.emit("provider_heartbeat");
      console.log(`    Emitted heartbeat #${i + 1}`);
    }

    // Verify still online
    let status = await getProviderDbStatus(dbConnection, arunProviderId);
    assert(
      status.is_online === 1 && status.availability_status === 1,
      "Normal Heartbeat keeps provider online",
      `Expected is_online=1 and availability_status=1, got is_online=${status.is_online}, availability_status=${status.availability_status}`
    );

    // --- TEST 2: Heartbeat Timeout ---
    console.log("\n🔍 [TEST 2] Testing Heartbeat Timeout Expiration (Waiting 42 seconds)...");
    
    const timeoutEventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for status changed event")), 50000);
      customerSocket.once("provider_status_changed", (data) => {
        if (data.providerId === arunProviderId && data.isOnline === false) {
          clearTimeout(timeout);
          resolve(data);
        }
      });
    });

    // Wait 42 seconds to trigger the timeout on the server (timeout = 40 seconds)
    console.log("    Waiting 42 seconds for server-side timeout...");
    await new Promise((resolve) => setTimeout(resolve, 42000));

    // Verify broadcast received
    const timeoutEvent = await timeoutEventPromise;
    assert(
      timeoutEvent.isOnline === false,
      "Timeout offline broadcast received",
      "Other clients must receive provider_status_changed offline broadcast"
    );

    // Verify DB updated
    status = await getProviderDbStatus(dbConnection, arunProviderId);
    assert(
      status.is_online === 0 && status.availability_status === 0,
      "Database marked offline after heartbeat timeout",
      `Expected is_online=0 and availability_status=0, got is_online=${status.is_online}, availability_status=${status.availability_status}`
    );

    assert(
      providerSocket.connected === false,
      "Socket disconnected after heartbeat timeout",
      "Stale socket connection should be closed by the server"
    );

    // --- TEST 3: Reconnect after Timeout ---
    console.log("\n🔍 [TEST 3] Testing Reconnect and Re-join after timeout...");
    
    const providerSocket2 = connectSocket(provToken);
    await new Promise((resolve) => providerSocket2.once("connect", resolve));

    // Make provider online again
    await api("POST", "/providers/go-online", null, provToken);
    providerSocket2.emit("provider_join", { providerId: arunProviderId });
    await new Promise((resolve) => setTimeout(resolve, 200));

    status = await getProviderDbStatus(dbConnection, arunProviderId);
    assert(
      status.is_online === 1 && status.availability_status === 1,
      "Provider can become online again after reconnect",
      "Reconnecting and joining should restore online status"
    );

    // --- TEST 4: Immediate Disconnect ---
    console.log("\n🔍 [TEST 4] Testing immediate disconnect auto-offline...");

    const disconnectEventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for status changed event")), 5000);
      customerSocket.once("provider_status_changed", (data) => {
        if (data.providerId === arunProviderId && data.isOnline === false) {
          clearTimeout(timeout);
          resolve(data);
        }
      });
    });

    // Normally disconnect the socket
    providerSocket2.disconnect();

    await disconnectEventPromise;
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify DB updated to offline immediately
    status = await getProviderDbStatus(dbConnection, arunProviderId);
    assert(
      status.is_online === 0 && status.availability_status === 0,
      "Database marked offline immediately on socket disconnect",
      `Expected is_online=0 and availability_status=0, got is_online=${status.is_online}, availability_status=${status.availability_status}`
    );

    // --- TEST 5: Rapid Heartbeat Spam ---
    console.log("\n🔍 [TEST 5] Testing rapid heartbeat spam...");
    
    const providerSocket3 = connectSocket(provToken);
    await new Promise((resolve) => providerSocket3.once("connect", resolve));
    
    // Join
    providerSocket3.emit("provider_join", { providerId: arunProviderId });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Spam 25 heartbeats rapidly
    let count = 25;
    for (let i = 0; i < count; i++) {
      providerSocket3.emit("provider_heartbeat");
    }
    
    // Wait briefly
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    // Verify no server crash
    const pingRes = await axios.get(BACKEND_URL, { validateStatus: () => true });
    assert(
      pingRes.status === 200 && pingRes.data.success === true,
      "Server remains responsive under heartbeat spam",
      `Status code: ${pingRes.status}`
    );

    // --- TEST 6: Unknown Events Handling ---
    console.log("\n🔍 [TEST 6] Testing unknown events handling...");
    providerSocket3.emit("some_unknown_unsupported_event", { data: "test" });
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const pingRes2 = await axios.get(BACKEND_URL, { validateStatus: () => true });
    assert(
      pingRes2.status === 200 && pingRes2.data.success === true,
      "Server remains responsive after receiving unknown events",
      `Status code: ${pingRes2.status}`
    );

    // Clean up
    providerSocket3.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 200));

  } catch (error) {
    console.error("❌ Test script encountered crash:", error.message);
    failed.push({ testName: "Test Run Integrity", message: error.message });
  } finally {
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
