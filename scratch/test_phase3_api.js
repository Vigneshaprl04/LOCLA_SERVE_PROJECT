"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const axios = require("axios");
const mysql = require("mysql2/promise");

const BASE_URL = "http://localhost:5000/api";
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
  console.log("  LocalServe V2 - Sprint 1 Phase 3 API Tests");
  console.log("==================================================\n");

  let dbConnection;
  try {
    // 1. Establish DB Connection
    dbConnection = await mysql.createConnection(DB_CONFIG);
    console.log("  DB connected successfully");

    // 2. Ensure server is started (require server.js)
    console.log("  Starting API server...");
    require("../backend/server");
    
    // Wait for database and migrations to complete inside server startup
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("  API server ready. Running test cases...\n");

    // 3. Authenticate users to get tokens
    console.log("🔐 [AUTH] Authenticating test accounts...");
    const loginUserRes = await api("POST", "/auth/login", { email: "vignesh@test.com", password: "user123" });
    const loginProvRes = await api("POST", "/auth/login", { email: "arun@test.com", password: "Pass1234!" });

    const userToken = loginUserRes.data.token;
    const userUserId = loginUserRes.data.user.id;
    const provToken = loginProvRes.data.token;
    const provUserId = loginProvRes.data.user.id;

    assert(!!userToken, "User Authentication", "Failed to retrieve Vignesh user token");
    assert(!!provToken, "Provider Authentication", "Failed to retrieve Arun provider token");

    // Find provider_id for Arun
    const [[arunProv]] = await dbConnection.execute("SELECT id FROM providers WHERE user_id = ?", [provUserId]);
    const arunProviderId = arunProv.id;

    // Reset status to offline
    await dbConnection.execute("UPDATE providers SET is_online = 0 WHERE id = ?", [arunProviderId]);

    // 4. Test go-online API (Success case)
    console.log("\n🔍 [TEST 1] Testing POST /providers/go-online (Success)...");
    const onlineRes = await api("POST", "/providers/go-online", null, provToken);
    assert(
      onlineRes.status === 200 && onlineRes.data.success === true && onlineRes.data.data.isOnline === true,
      "POST /go-online (Success)",
      `Expected status 200, got ${onlineRes.status} with body: ${JSON.stringify(onlineRes.data)}`
    );

    // 5. Test standardized response structure
    console.log("\n🔍 [TEST 2] Testing API Response Format Consistency...");
    const formatCheck = onlineRes.data;
    assert(
      formatCheck.success !== undefined && formatCheck.message !== undefined && formatCheck.data !== undefined,
      "Standard Success Response Envelope",
      `Format incorrect: ${JSON.stringify(formatCheck)}`
    );

    // 6. Test go-offline API (Success case)
    console.log("\n🔍 [TEST 3] Testing POST /providers/go-offline (Success)...");
    const offlineRes = await api("POST", "/providers/go-offline", null, provToken);
    assert(
      offlineRes.status === 200 && offlineRes.data.success === true && offlineRes.data.data.isOnline === false,
      "POST /go-offline (Success)",
      `Expected status 200, got ${offlineRes.status} with body: ${JSON.stringify(offlineRes.data)}`
    );

    // 7. Test go-online Unauthorized (No Token)
    console.log("\n🔍 [TEST 4] Testing POST /providers/go-online (Unauthorized - 401)...");
    const unauthRes = await api("POST", "/providers/go-online", null, null);
    assert(
      unauthRes.status === 401 && unauthRes.data.success === false,
      "POST /go-online (401 Unauthorized)",
      `Expected status 401, got ${unauthRes.status} with body: ${JSON.stringify(unauthRes.data)}`
    );

    // 8. Test go-online Forbidden Role (User calling provider endpoint)
    console.log("\n🔍 [TEST 5] Testing POST /providers/go-online (Forbidden Role - 403)...");
    const forbiddenRes = await api("POST", "/providers/go-online", null, userToken);
    assert(
      forbiddenRes.status === 403 && forbiddenRes.data.success === false,
      "POST /go-online (403 Forbidden)",
      `Expected status 403, got ${forbiddenRes.status} with body: ${JSON.stringify(forbiddenRes.data)}`
    );

    // 9. Test getAvailability (Success)
    console.log("\n🔍 [TEST 6] Testing GET /providers/availability/:providerId (Success)...");
    const availRes = await api("GET", `/providers/availability/${arunProviderId}`);
    assert(
      availRes.status === 200 && availRes.data.success === true && availRes.data.data.providerId === arunProviderId,
      "GET /availability/:providerId (Success)",
      `Expected status 200, got ${availRes.status} with body: ${JSON.stringify(availRes.data)}`
    );

    // 10. Test getAvailability with invalid ID (Bad Request - 400)
    console.log("\n🔍 [TEST 7] Testing GET /providers/availability/abc (Bad Request - 400)...");
    const badAvailRes = await api("GET", "/providers/availability/abc");
    assert(
      badAvailRes.status === 400 && badAvailRes.data.success === false,
      "GET /availability/abc (400 Bad Request)",
      `Expected status 400, got ${badAvailRes.status} with body: ${JSON.stringify(badAvailRes.data)}`
    );

    // 11. Test getAvailability with non-existent ID (Not Found - 404)
    console.log("\n🔍 [TEST 8] Testing GET /providers/availability/99999 (Not Found - 404)...");
    const notFoundAvailRes = await api("GET", "/providers/availability/99999");
    assert(
      notFoundAvailRes.status === 404 && notFoundAvailRes.data.success === false,
      "GET /availability/99999 (404 Not Found)",
      `Expected status 404, got ${notFoundAvailRes.status} with body: ${JSON.stringify(notFoundAvailRes.data)}`
    );

    // 12. Test searchAvailableProviders with available_now filter (Success)
    console.log("\n🔍 [TEST 9] Testing GET /providers/search (Success with available_now)...");
    // Make provider online first
    await api("POST", "/providers/go-online", null, provToken);

    const searchRes = await api("GET", `/providers/search?city=Chennai&available_now=true`, null, userToken);
    assert(
      searchRes.status === 200 && searchRes.data.success === true && Array.isArray(searchRes.data.data.providers),
      "GET /search (Success)",
      `Expected status 200, got ${searchRes.status} with body: ${JSON.stringify(searchRes.data)}`
    );

    const providerFound = searchRes.data.data.providers.some(p => p.provider_id === arunProviderId);
    assert(
      providerFound,
      "GET /search (Returns Online Provider)",
      "Test online provider not found in search results"
    );

    // 13. Test searchAvailableProviders fails on bad category ID
    console.log("\n🔍 [TEST 10] Testing GET /providers/search (Bad Request - 400 on invalid category)...");
    const badSearchRes = await api("GET", "/providers/search?category=abc", null, userToken);
    assert(
      badSearchRes.status === 400 && badSearchRes.data.success === false,
      "GET /search?category=abc (400 Bad Request)",
      `Expected status 400, got ${badSearchRes.status} with body: ${JSON.stringify(badSearchRes.data)}`
    );

    // Reset status back to offline
    await api("POST", "/providers/go-offline", null, provToken);

    console.log("\n==================================================");
    console.log("  ALL TESTS COMPLETED");
    console.log(`  Passed: ${passed.length} | Failed: ${failed.length}`);
    console.log("==================================================\n");

    if (failed.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error("❌ API integration tests crashed:", error.message);
    process.exit(1);
  } finally {
    if (dbConnection) await dbConnection.end();
  }
}

runTests();
