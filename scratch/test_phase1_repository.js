"use strict";

// Inject environment variables from backend/.env
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const db = require("../backend/config/db");
const providerRepository = require("../backend/repositories/providerRepository");
const PROVIDER_STATUS = require("../backend/constants/providerStatus");

async function runTests() {
  console.log("\n==================================================");
  console.log("  LocalServe V2 - Sprint 1 Phase 1 Repository Tests");
  console.log("==================================================\n");

  try {
    // 1. Verify Migrations
    console.log("🔍 [TEST 1] Verifying Database Migrations...");
    const [columns] = await db.query(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'providers' 
         AND COLUMN_NAME IN ('is_online', 'last_seen')`
    );

    if (columns.length === 2) {
      console.log("  ✅ columns is_online and last_seen verified in providers table");
    } else {
      throw new Error(`Migration check failed: Expected 2 columns, got ${columns.length}`);
    }

    const [tables] = await db.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'provider_status_logs'`
    );

    if (tables.length === 1) {
      console.log("  ✅ provider_status_logs table verified in database");
    } else {
      throw new Error("Migration check failed: provider_status_logs table not found");
    }

    // 2. Fetch test provider credentials
    const [testProviders] = await db.query(
      `SELECT u.id AS user_id, p.id AS provider_id, p.city 
       FROM users u 
       JOIN providers p ON p.user_id = u.id 
       WHERE p.verification_status = 'verified' AND u.is_active = 1 
       LIMIT 1`
    );

    if (testProviders.length === 0) {
      throw new Error("Pre-requisite failed: No verified and active provider found in DB to test with.");
    }

    const testProvider = testProviders[0];
    const userId = testProvider.user_id;
    const providerId = testProvider.provider_id;
    const testCity = testProvider.city;
    console.log(`\nUsing Test Provider ID: ${providerId}, User ID: ${userId}, City: ${testCity}`);

    // 3. Test getProfileByUserId
    console.log("\n🔍 [TEST 2] Testing getProfileByUserId...");
    const profile = await providerRepository.getProfileByUserId(userId);
    if (profile && Number(profile.provider_id) === Number(providerId)) {
      console.log(`  ✅ Successfully fetched profile. Name: ${profile.name}`);
    } else {
      throw new Error("Failed to fetch profile by User ID");
    }

    // 4. Test getProviderById
    console.log("\n🔍 [TEST 3] Testing getProviderById...");
    const provider = await providerRepository.getProviderById(providerId);
    if (provider && Number(provider.provider_id) === Number(providerId)) {
      console.log(`  ✅ Successfully fetched provider by ID. Name: ${provider.name}`);
    } else {
      throw new Error("Failed to fetch provider by Provider ID");
    }

    // 5. Test updateOnlineStatus (Go Online)
    console.log("\n🔍 [TEST 4] Testing updateOnlineStatus (Going Online)...");
    const lastSeenTime = new Date();
    const updateResult = await providerRepository.updateOnlineStatus(userId, 1, lastSeenTime);
    if (updateResult) {
      console.log("  ✅ Successfully updated status to ONLINE");
      
      const updatedProfile = await providerRepository.getProfileByUserId(userId);
      if (updatedProfile.is_online === 1) {
        console.log("  ✅ Verified updated is_online state is 1");
      } else {
        throw new Error("Verification failed: is_online field did not update to 1");
      }
    } else {
      throw new Error("Failed to update online status");
    }

    // 6. Test createStatusLog
    console.log("\n🔍 [TEST 5] Testing createStatusLog (Logging status change)...");
    const logId = await providerRepository.createStatusLog(
      providerId,
      PROVIDER_STATUS.OFFLINE,
      PROVIDER_STATUS.ONLINE,
      userId
    );
    if (logId > 0) {
      console.log(`  ✅ Successfully inserted audit log. Log ID: ${logId}`);
      
      const [logs] = await db.query("SELECT * FROM provider_status_logs WHERE id = ?", [logId]);
      if (logs.length === 1 && logs[0].new_status === PROVIDER_STATUS.ONLINE) {
        console.log("  ✅ Log content verified in DB");
      } else {
        throw new Error("Verification failed: Log entry does not match in database");
      }
    } else {
      throw new Error("Failed to insert status transition log");
    }

    // 7. Test getOnlineProviders
    console.log("\n🔍 [TEST 6] Testing getOnlineProviders...");
    const onlineProviders = await providerRepository.getOnlineProviders();
    const foundOnline = onlineProviders.some(p => Number(p.provider_id) === Number(providerId));
    if (foundOnline) {
      console.log(`  ✅ Verified test provider is returned in the online providers list`);
    } else {
      throw new Error("Failed: Test provider not found in online providers list");
    }

    // 8. Test searchProviders (with available_now filter)
    console.log("\n🔍 [TEST 7] Testing searchProviders (with available_now)...");
    const searchResults = await providerRepository.searchProviders({
      city: testCity,
      available_now: true
    });
    const foundInSearch = searchResults.some(p => Number(p.provider_id) === Number(providerId));
    if (foundInSearch) {
      console.log(`  ✅ Verified provider found in search results with available_now filter`);
    } else {
      throw new Error("Failed: Test provider not found in search results");
    }

    // 9. Reset provider status back to OFFLINE (Clean up)
    console.log("\n🧹 Cleaning up test status changes...");
    await providerRepository.updateOnlineStatus(userId, 0, null);
    console.log("  ✅ Provider online status reset to 0 (offline)");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST RUNNER FAILED:", error.message);
    process.exit(1);
  }
}

runTests();
