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

async function runTests() {
  console.log("\n==================================================");
  console.log("  LocalServe V2 - Sprint 1 Phase 4 Socket.IO Tests");
  console.log("==================================================\n");

  let dbConnection;
  const activeSockets = [];

  try {
    // 1. Establish DB Connection
    dbConnection = await mysql.createConnection(DB_CONFIG);
    console.log("  DB connected successfully");

    // 2. Ensure server is started (require server.js)
    console.log("  Starting API server...");
    require("../backend/server");
    
    // Wait for database, migrations, and server startup to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("  API server ready. Running test cases...\n");

    // Import Presence Manager directly in test script to verify in-memory states
    const presenceManager = require("../backend/socket/presenceManager");

    // 3. Authenticate users to get tokens
    console.log("🔐 [AUTH] Authenticating test accounts...");
    const loginUserRes = await api("POST", "/auth/login", { email: "vignesh@test.com", password: "user123" });
    const loginProvRes = await api("POST", "/auth/login", { email: "arun@test.com", password: "Pass1234!" });

    const userToken = loginUserRes.data.token;
    const provToken = loginProvRes.data.token;
    const provUserId = loginProvRes.data.user.id;

    assert(!!userToken, "User Authentication", "Failed to retrieve customer token");
    assert(!!provToken, "Provider Authentication", "Failed to retrieve provider token");

    // Find provider_id for Arun
    const [[arunProv]] = await dbConnection.execute("SELECT id FROM providers WHERE user_id = ?", [provUserId]);
    const arunProviderId = arunProv.id;

    // Reset status to offline in database to start clean
    await dbConnection.execute("UPDATE providers SET is_online = 0 WHERE id = ?", [arunProviderId]);

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

    // 4. Connect client and provider sockets
    console.log("\n🔌 [CONN] Connecting Socket.IO clients...");
    const customerSocket1 = connectSocket(userToken);
    const providerSocket1 = connectSocket(provToken);

    await Promise.all([
      new Promise((resolve) => customerSocket1.once("connect", resolve)),
      new Promise((resolve) => providerSocket1.once("connect", resolve))
    ]);
    console.log("  Both sockets connected successfully.");

    // --- TEST 1: Provider Joins ---
    console.log("\n🔍 [TEST 1] Testing Provider Join presence registration...");
    providerSocket1.emit("provider_join", { providerId: arunProviderId });
    
    // Wait briefly for server state to update
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert(
      presenceManager.isOnline(arunProviderId),
      "Provider Join presence tracking",
      "Provider should be marked online in presence manager map"
    );
    assert(
      presenceManager.getSocket(arunProviderId) === providerSocket1.id,
      "Provider socket ID mapping",
      `Expected socket ID ${providerSocket1.id}, got ${presenceManager.getSocket(arunProviderId)}`
    );

    // --- TEST 2: ONLINE Event Emitted ---
    console.log("\n🔍 [TEST 2] Testing ONLINE status change broadcast...");
    
    let eventReceivedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for status changed event")), 3000);
      customerSocket1.once("provider_status_changed", (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // Make provider online via REST API
    await api("POST", "/providers/go-online", null, provToken);

    let eventData = await eventReceivedPromise;
    assert(
      eventData.providerId === arunProviderId && eventData.isOnline === true,
      "ONLINE event broadcast",
      `Expected online status change for provider ${arunProviderId}, received: ${JSON.stringify(eventData)}`
    );

    // --- TEST 3: OFFLINE Event Emitted ---
    console.log("\n🔍 [TEST 3] Testing OFFLINE status change broadcast...");
    
    eventReceivedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for status changed event")), 3000);
      customerSocket1.once("provider_status_changed", (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // Make provider offline via REST API
    await api("POST", "/providers/go-offline", null, provToken);

    eventData = await eventReceivedPromise;
    assert(
      eventData.providerId === arunProviderId && eventData.isOnline === false,
      "OFFLINE event broadcast",
      `Expected offline status change for provider ${arunProviderId}, received: ${JSON.stringify(eventData)}`
    );

    // --- TEST 4: Multiple Clients Receive Updates ---
    console.log("\n🔍 [TEST 4] Testing multiple clients receiving status updates...");
    const customerSocket2 = connectSocket(userToken);
    await new Promise((resolve) => customerSocket2.once("connect", resolve));

    const p1 = new Promise((resolve) => customerSocket1.once("provider_status_changed", resolve));
    const p2 = new Promise((resolve) => customerSocket2.once("provider_status_changed", resolve));

    // Make provider online via REST API
    await api("POST", "/providers/go-online", null, provToken);

    const [res1, res2] = await Promise.all([p1, p2]);
    assert(
      res1.isOnline === true && res2.isOnline === true,
      "Multiple clients status broadcast",
      "Both client sockets should receive the status update"
    );

    // --- TEST 5: Duplicate Connections Handled ---
    console.log("\n🔍 [TEST 5] Testing duplicate provider session replacement...");
    const providerSocket2 = connectSocket(provToken);
    await new Promise((resolve) => providerSocket2.once("connect", resolve));

    // Register providerSocket2 with the same providerId
    const firstSocketDisconnectPromise = new Promise((resolve) => {
      providerSocket1.once("disconnect", () => resolve(true));
      providerSocket1.once("socket_error", () => resolve(true));
    });

    providerSocket2.emit("provider_join", { providerId: arunProviderId });
    
    await firstSocketDisconnectPromise;
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert(
      presenceManager.getSocket(arunProviderId) === providerSocket2.id,
      "Duplicate session replacement - new socket ID set",
      `Presence manager should point to new socket ${providerSocket2.id}, got ${presenceManager.getSocket(arunProviderId)}`
    );

    // --- TEST 6: Reconnect Works ---
    console.log("\n🔍 [TEST 6] Testing reconnect registration...");
    // Disconnect active socket
    providerSocket2.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert(
      !presenceManager.isOnline(arunProviderId),
      "Presence cleanup after disconnect",
      "Provider should be removed from presence manager"
    );

    // Connect new socket (socket 3) simulating reconnect
    const providerSocket3 = connectSocket(provToken);
    await new Promise((resolve) => providerSocket3.once("connect", resolve));
    providerSocket3.emit("provider_join", { providerId: arunProviderId });
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert(
      presenceManager.getSocket(arunProviderId) === providerSocket3.id,
      "Reconnect successful",
      `Expected socket ID ${providerSocket3.id}, got ${presenceManager.getSocket(arunProviderId)}`
    );

    // --- TEST 7: Provider Disconnects & Broadcasts OFFLINE ---
    console.log("\n🔍 [TEST 7] Testing OFFLINE broadcast on socket disconnect...");
    
    const disconnectOfflinePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for OFFLINE broadcast")), 3000);
      customerSocket1.once("provider_status_changed", (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // Disconnect the provider socket
    providerSocket3.disconnect();

    const disconnectEvent = await disconnectOfflinePromise;
    assert(
      disconnectEvent.providerId === arunProviderId && disconnectEvent.isOnline === false,
      "Offline broadcast on disconnect",
      `Expected status update to offline, received: ${JSON.stringify(disconnectEvent)}`
    );
    assert(
      !presenceManager.isOnline(arunProviderId),
      "Presence cleanup on disconnect",
      "Provider should not be in presence manager map"
    );

    // --- TEST 8: No Server Crash After Disconnect ---
    console.log("\n🔍 [TEST 8] Checking server health after disconnects...");
    const pingRes = await axios.get(BACKEND_URL, { validateStatus: () => true });
    assert(
      pingRes.status === 200 && pingRes.data.success === true,
      "Server remains responsive",
      `Ping status: ${pingRes.status}`
    );

    // Clean up DB status back to offline
    await dbConnection.execute("UPDATE providers SET is_online = 0 WHERE id = ?", [arunProviderId]);

  } catch (error) {
    console.error("❌ Test script encountered crash:", error.message);
    failed.push({ testName: "Test Run Integrity", message: error.message });
  } finally {
    // Close all sockets
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
