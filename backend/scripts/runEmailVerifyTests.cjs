/**
 * LocalServe - Integration & Unit Test Suite for Email Verification & Registration
 * Tests registration, timeouts, SMTP failures, rate limiting, and verification flows.
 * Run: node backend/scripts/runEmailVerifyTests.cjs
 */

'use strict';

process.env.PORT = 5001; // Run tests on port 5001 to prevent conflict with running backend
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

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\n=======================================================");
  console.log("  Running LocalServe Registration & Verification Tests");
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

  // Original SMTP sendMail reference to restore later
  const originalSendMail = emailService.transporter.sendMail;

  // Cleanup helper
  const cleanUser = async (email) => {
    await db.query("DELETE FROM users WHERE email = ?", [email]);
  };

  // Setup testing emails
  const emailOK = `test_ok_${Date.now()}@example.com`;
  const emailSMTPOffline = `test_offline_${Date.now()}@example.com`;
  const emailSMTPAuth = `test_auth_${Date.now()}@example.com`;
  const emailTimeout = `test_timeout_${Date.now()}@example.com`;

  // 1. Registration success with functional SMTP
  await assertTest("Registration succeeds and logs emailSent: true with mock SMTP OK", async () => {
    // Stub SMTP success
    emailService.transporter.sendMail = async (options) => {
      return { messageId: 'mock-message-id', response: '250 OK' };
    };

    const res = await axios.post(`${BASE}/auth/register`, {
      name: "SMTP Success User",
      email: emailOK,
      password: "User@12345",
      role: "user"
    });

    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");
    if (res.data.emailSent !== true) throw new Error("Expected emailSent: true");

    // Verify row in DB
    const [rows] = await db.query("SELECT email_verified, email_verification_token_hash FROM users WHERE email = ?", [emailOK]);
    if (rows.length === 0) throw new Error("User was not created in the database");
    if (rows[0].email_verified !== 0) throw new Error("User email_verified should be 0 (unverified)");
    if (!rows[0].email_verification_token_hash) throw new Error("Verification token was not saved");
  });

  // 2. Registration succeeds even if SMTP is offline (No Rollback)
  await assertTest("Registration succeeds (does not rollback) when SMTP is unavailable/offline", async () => {
    // Stub SMTP offline failure
    emailService.transporter.sendMail = async () => {
      throw new Error("ETIMEDOUT: Connection to SMTP server failed");
    };

    const res = await axios.post(`${BASE}/auth/register`, {
      name: "SMTP Offline User",
      email: emailSMTPOffline,
      password: "User@12345",
      role: "user"
    });

    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");
    if (res.data.emailSent !== false) throw new Error("Expected emailSent: false");
    if (!res.data.message.includes("We couldn't send the verification email right now")) {
      throw new Error(`Unexpected message: ${res.data.message}`);
    }

    // Verify row is created despite email failure
    const [rows] = await db.query("SELECT email_verified FROM users WHERE email = ?", [emailSMTPOffline]);
    if (rows.length === 0) throw new Error("User row should not have been rolled back");
    if (rows[0].email_verified !== 0) throw new Error("User email_verified should be 0");
  });

  // 3. Registration succeeds even if SMTP credentials are invalid
  await assertTest("Registration succeeds (does not rollback) when SMTP credentials are invalid", async () => {
    // Stub SMTP credentials error
    emailService.transporter.sendMail = async () => {
      throw new Error("Invalid login: 535-5.7.8 Username and Password not accepted");
    };

    const res = await axios.post(`${BASE}/auth/register`, {
      name: "SMTP Bad Auth User",
      email: emailSMTPAuth,
      password: "User@12345",
      role: "user"
    });

    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.data.emailSent !== false) throw new Error("Expected emailSent: false");

    const [rows] = await db.query("SELECT email_verified FROM users WHERE email = ?", [emailSMTPAuth]);
    if (rows.length === 0) throw new Error("User row should not have been rolled back");
  });

  // 4. Login fails with 403 for unverified accounts
  await assertTest("Login attempts on unverified accounts return HTTP 403", async () => {
    try {
      await axios.post(`${BASE}/auth/login`, {
        email: emailOK,
        password: "User@12345"
      });
      throw new Error("Login should have failed but succeeded");
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 403) throw new Error(`Expected HTTP 403, got ${error.response.status}`);
      if (!error.response.data.message.includes("Please verify your email")) {
        throw new Error(`Unexpected message: ${error.response.data.message}`);
      }
    }
  });

  // 5. Resend Verification
  let tokenToVerify;
  await assertTest("Resend verification email generates a fresh token and invalidates old ones", async () => {
    emailService.transporter.sendMail = async () => {
      return { messageId: 'mock-message-id', response: '250 OK' };
    };

    // Get old token hash
    const [oldRows] = await db.query("SELECT email_verification_token_hash FROM users WHERE email = ?", [emailOK]);
    const oldHash = oldRows[0].email_verification_token_hash;

    // Call Resend
    const res = await axios.post(`${BASE}/auth/resend-verification`, { email: emailOK });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);

    // Get new token hash
    const [newRows] = await db.query("SELECT email_verification_token_hash FROM users WHERE email = ?", [emailOK]);
    const newHash = newRows[0].email_verification_token_hash;

    if (oldHash === newHash) throw new Error("Token hash was not refreshed");
    
    // Set token to verify for next test (we mock a token hash mapping in DB to grab a raw token)
    // To test verifyEmail, let's create a known raw token, hash it, update DB, then test verify.
    const rawToken = "supersecretverificationtokenhash12345";
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await db.query("UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = ? WHERE email = ?", [hashed, expires, emailOK]);
    tokenToVerify = rawToken;
  });

  // 6. Resend Verification Rate Limiting (60 seconds)
  await assertTest("Resend verification email rejects requests within 60s cooldown with HTTP 429", async () => {
    try {
      await axios.post(`${BASE}/auth/resend-verification`, { email: emailOK });
      throw new Error("Resend verification should have been rate limited but succeeded");
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 429) throw new Error(`Expected HTTP 429, got ${error.response.status}`);
      if (!error.response.data.message.includes("Please wait")) {
        throw new Error(`Unexpected message: ${error.response.data.message}`);
      }
    }
  });

  // 7. Expired verification token fails
  await assertTest("Email verification fails when verification token has expired", async () => {
    // Set token expiry to 1 hour in the past
    const pastExpires = new Date(Date.now() - 60 * 60 * 1000);
    await db.query("UPDATE users SET email_verification_expires_at = ? WHERE email = ?", [pastExpires, emailOK]);

    try {
      await axios.get(`${BASE}/auth/verify-email`, { params: { token: tokenToVerify } });
      throw new Error("Verification should have failed for expired token");
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) throw new Error(`Expected HTTP 400, got ${error.response.status}`);
      if (!error.response.data.message.includes("Invalid or expired")) {
        throw new Error(`Unexpected error message: ${error.response.data.message}`);
      }
    }
  });

  // 8. Verify Email successfully
  await assertTest("Email verification succeeds with a valid, non-expired token", async () => {
    // Set expiry to future
    const futureExpires = new Date(Date.now() + 60 * 60 * 1000);
    await db.query("UPDATE users SET email_verification_expires_at = ? WHERE email = ?", [futureExpires, emailOK]);

    const res = await axios.get(`${BASE}/auth/verify-email`, { params: { token: tokenToVerify } });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.success !== true) throw new Error("Expected success: true");

    // Verify row verified = 1 in DB
    const [rows] = await db.query("SELECT email_verified, email_verification_token_hash FROM users WHERE email = ?", [emailOK]);
    if (rows[0].email_verified !== 1) throw new Error("User email_verified should be 1 (verified)");
    if (rows[0].email_verification_token_hash !== null) throw new Error("Verification token hash should have been cleared");
  });

  // 9. Already verified resend check
  await assertTest("Resend verification for already verified email returns generic success without email trigger", async () => {
    let emailTriggered = false;
    emailService.transporter.sendMail = async () => {
      emailTriggered = true;
      return { messageId: 'mock-id' };
    };

    const res = await axios.post(`${BASE}/auth/resend-verification`, { email: emailOK });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (emailTriggered) throw new Error("Verification email should not be sent for verified account");
  });

  // 10. Login succeeds after verification
  await assertTest("Login succeeds and returns HTTP 200 + JWT for verified accounts", async () => {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: emailOK,
      password: "User@12345"
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (!res.data.token) throw new Error("JWT token was not returned on login");
    if (res.data.success !== true) throw new Error("Expected success: true");
  });

  // 11. Registration Timeout (8-second threshold)
  await assertTest("Registration endpoint handles SMTP timeouts gracefully and keeps user row", async () => {
    // Stub SMTP delay of 12 seconds
    emailService.transporter.sendMail = async () => {
      await sleep(12000);
      return { messageId: 'late-message' };
    };

    const startTime = Date.now();
    const res = await axios.post(`${BASE}/auth/register`, {
      name: "SMTP Timeout User",
      email: emailTimeout,
      password: "User@12345",
      role: "user"
    });
    const duration = Date.now() - startTime;

    // Verify response was fast (should timeout at 8s, response should take ~8s)
    if (duration > 10000) throw new Error(`Registration took too long: ${duration}ms (expected <10s)`);
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.data.emailSent !== false) throw new Error("Expected emailSent: false due to timeout");

    // Verify user row still created
    const [rows] = await db.query("SELECT email_verified FROM users WHERE email = ?", [emailTimeout]);
    if (rows.length === 0) throw new Error("User was rolled back on timeout");
  });

  // Cleanup testing data
  console.log("\nCleaning up test users...");
  await cleanUser(emailOK);
  await cleanUser(emailSMTPOffline);
  await cleanUser(emailSMTPAuth);
  await cleanUser(emailTimeout);

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
