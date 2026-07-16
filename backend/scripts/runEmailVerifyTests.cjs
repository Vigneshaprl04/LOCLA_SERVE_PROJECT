/**
 * LocalServe - Integration & Regression Test Suite for Authentication Flow (Verification-Free)
 * Run: node backend/scripts/runEmailVerifyTests.cjs
 */

'use strict';

process.env.PORT = 5001; // Run tests on port 5001 to prevent conflicts
process.env.NODE_ENV = 'test';

const axios = require('axios');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const emailService = require('../services/emailService');

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
  console.log("  Running LocalServe Registration & Login Regression Tests");
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

  // Mock email service transporter sendMail to prevent real SMTP connections
  const originalSendMail = emailService.transporter.sendMail;
  emailService.transporter.sendMail = async (options) => {
    return { messageId: 'mock-message-id', response: '250 OK' };
  };

  const cleanUser = async (email) => {
    await db.query("DELETE FROM users WHERE email = ?", [email]);
  };

  const testEmail = `test_regression_${Date.now()}@example.com`;
  const duplicateEmail = `test_dup_${Date.now()}@example.com`;
  const invalidEmail = `test_invalid_at_sign`;

  // 1. Register -> Login works immediately
  await assertTest("Registration succeeds and sets email_verified = 1 in DB immediately", async () => {
    const res = await axios.post(`${BASE}/auth/register`, {
      name: "Regression Test User",
      email: testEmail,
      password: "User@12345",
      role: "user"
    });

    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");

    const [rows] = await db.query("SELECT email_verified, email_verification_token_hash FROM users WHERE email = ?", [testEmail]);
    if (rows.length === 0) throw new Error("User was not created in the database");
    if (rows[0].email_verified !== 1) throw new Error("User email_verified should be 1 (verified) immediately");
    if (rows[0].email_verification_token_hash !== null) throw new Error("Verification token should be NULL");
  });

  await assertTest("Login works immediately after registration without 403 Forbidden", async () => {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: testEmail,
      password: "User@12345"
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");
    if (!res.data.token) throw new Error("Expected JWT token to be returned");
  });

  // 2. Duplicate email is rejected
  await assertTest("Duplicate registration fails with 409 Conflict", async () => {
    // First registration
    await axios.post(`${BASE}/auth/register`, {
      name: "Duplicate Tester",
      email: duplicateEmail,
      password: "User@12345",
      role: "user"
    });

    try {
      // Second registration with duplicate email
      await axios.post(`${BASE}/auth/register`, {
        name: "Duplicate Tester 2",
        email: duplicateEmail,
        password: "User@12345",
        role: "user"
      });
      throw new Error("Duplicate email registration should have failed");
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 409) throw new Error(`Expected HTTP 409, got ${error.response.status}`);
      if (!error.response.data.message.toLowerCase().includes("email already registered")) {
        throw new Error(`Unexpected error message: ${error.response.data.message}`);
      }
    }
  });

  // 3. Invalid email format is rejected
  await assertTest("Registration with invalid email format fails with 400 Bad Request", async () => {
    try {
      await axios.post(`${BASE}/auth/register`, {
        name: "Invalid Email Tester",
        email: invalidEmail,
        password: "User@12345",
        role: "user"
      });
      throw new Error("Registration with invalid email format should have failed");
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) throw new Error(`Expected HTTP 400, got ${error.response.status}`);
      if (!error.response.data.message) {
        throw new Error("Expected error message in response");
      }
    }
  });

  // 4. Forgot Password still works
  await assertTest("Forgot password request updates database reset token and returns success status", async () => {
    const res = await axios.post(`${BASE}/auth/forgot-password`, {
      email: testEmail
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");

    const [rows] = await db.query("SELECT password_reset_token_hash FROM users WHERE email = ?", [testEmail]);
    if (rows.length === 0) throw new Error("User email not found in DB");
    if (!rows[0].password_reset_token_hash) throw new Error("Password reset token hash was not generated/saved");
  });

  // Cleanup testing data
  console.log("\nCleaning up test users...");
  await cleanUser(testEmail);
  await cleanUser(duplicateEmail);

  // Restore transporter
  emailService.transporter.sendMail = originalSendMail;

  console.log("\n=======================================================");
  console.log(`  Tests completed. Passed: ${passed}, Failed: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
