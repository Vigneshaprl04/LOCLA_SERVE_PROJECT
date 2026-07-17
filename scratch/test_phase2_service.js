"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const db = require("../backend/config/db");
const providerRepository = require("../backend/repositories/providerRepository");
const providerService = require("../backend/services/providerService");
const PROVIDER_STATUS = require("../backend/constants/providerStatus");
const MESSAGES = require("../backend/constants/messages");

async function runTests() {
  console.log("\n==================================================");
  console.log("  LocalServe V2 - Sprint 1 Phase 2 Service Tests");
  console.log("==================================================\n");

  try {
    // 1. Fetch test provider credentials
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
    console.log(`Using Test Provider ID: ${providerId}, User ID: ${userId}, City: ${testCity}`);

    // Ensure provider starts offline
    await providerRepository.updateOnlineStatus(userId, 0, null);

    // 2. Test Online Workflow
    console.log("\n🔍 [TEST 1] Testing setProviderOnline (Online Workflow)...");
    const onlineRes = await providerService.setProviderOnline(userId);
    if (onlineRes.success && onlineRes.data.isOnline === true) {
      console.log("  ✅ Successfully went online:", onlineRes.message);
      
      const dbProfile = await providerRepository.getProfileByUserId(userId);
      if (dbProfile.is_online === 1) {
        console.log("  ✅ Verified online status in database is 1");
      } else {
        throw new Error("Database state did not update to online");
      }
    } else {
      throw new Error(`Failed setProviderOnline: ${JSON.stringify(onlineRes)}`);
    }

    // 3. Test Duplicate Online Prevention
    console.log("\n🔍 [TEST 2] Testing duplicate online update prevention...");
    const dupOnlineRes = await providerService.setProviderOnline(userId);
    if (dupOnlineRes.success && dupOnlineRes.message === "Provider is already online") {
      console.log("  ✅ Duplicate online transition prevented cleanly");
    } else {
      throw new Error(`Duplicate online update was not prevented: ${JSON.stringify(dupOnlineRes)}`);
    }

    // 4. Test Offline Workflow
    console.log("\n🔍 [TEST 3] Testing setProviderOffline (Offline Workflow)...");
    const offlineRes = await providerService.setProviderOffline(userId);
    if (offlineRes.success && offlineRes.data.isOnline === false) {
      console.log("  ✅ Successfully went offline:", offlineRes.message);
      
      const dbProfile = await providerRepository.getProfileByUserId(userId);
      if (dbProfile.is_online === 0) {
        console.log("  ✅ Verified offline status in database is 0");
      } else {
        throw new Error("Database state did not update to offline");
      }
    } else {
      throw new Error(`Failed setProviderOffline: ${JSON.stringify(offlineRes)}`);
    }

    // 5. Test Duplicate Offline Prevention
    console.log("\n🔍 [TEST 4] Testing duplicate offline update prevention...");
    const dupOfflineRes = await providerService.setProviderOffline(userId);
    if (dupOfflineRes.success && dupOfflineRes.message === "Provider is already offline") {
      console.log("  ✅ Duplicate offline transition prevented cleanly");
    } else {
      throw new Error(`Duplicate offline update was not prevented: ${JSON.stringify(dupOfflineRes)}`);
    }

    // 6. Test Transaction Rollback
    console.log("\n🔍 [TEST 5] Testing Transaction Rollback on failure...");
    // Ensure provider starts offline
    await providerRepository.updateOnlineStatus(userId, 0, null);

    // Stub createStatusLog to force an error during the transaction
    const originalCreateStatusLog = providerRepository.createStatusLog;
    providerRepository.createStatusLog = async () => {
      throw new Error("Mocked database error for rollback testing");
    };

    try {
      await providerService.setProviderOnline(userId);
      throw new Error("Rollback test failed: Service did not throw an error");
    } catch (err) {
      if (err.message === "Mocked database error for rollback testing") {
        console.log("  ✅ Expected error caught during service execution");
      } else {
        throw err;
      }
    } finally {
      // Restore original function
      providerRepository.createStatusLog = originalCreateStatusLog;
    }

    // Verify online status rolled back and remains offline (0) in DB
    const rollbackCheck = await providerRepository.getProfileByUserId(userId);
    if (rollbackCheck.is_online === 0) {
      console.log("  ✅ Rollback verification passed: provider is_online remains 0 in DB");
    } else {
      throw new Error("Rollback verification failed: provider was set to online in DB");
    }

    // 7. Test Provider Not Found
    console.log("\n🔍 [TEST 6] Testing setProviderOnline with invalid User ID...");
    try {
      await providerService.setProviderOnline(99999);
      throw new Error("Should have thrown error for non-existent provider");
    } catch (err) {
      if (err.message === MESSAGES.PROVIDER_NOT_FOUND) {
        console.log("  ✅ Successfully returned Provider Not Found error");
      } else {
        throw err;
      }
    }

    // 8. Test Concurrent Online Updates
    console.log("\n🔍 [TEST 7] Testing concurrent online updates...");
    // Reset to offline first
    await providerService.setProviderOffline(userId);

    // Call online status updates concurrently
    const [res1, res2] = await Promise.all([
      providerService.setProviderOnline(userId),
      providerService.setProviderOnline(userId)
    ]);

    const successCount = (res1.message === MESSAGES.STATUS_UPDATED ? 1 : 0) +
                         (res2.message === MESSAGES.STATUS_UPDATED ? 1 : 0);
    const alreadyCount = (res1.message === "Provider is already online" ? 1 : 0) +
                         (res2.message === "Provider is already online" ? 1 : 0);

    if (successCount === 1 && alreadyCount === 1) {
      console.log("  ✅ Concurrency safety verified: Only one request transitioned state");
    } else {
      throw new Error(`Concurrency test failed. successCount: ${successCount}, alreadyCount: ${alreadyCount}`);
    }

    // Clean up
    await providerService.setProviderOffline(userId);
    console.log("\n🧹 Provider status reset to offline");

    console.log("\n🎉 ALL SERVICE TESTS PASSED SUCCESSFULLY! 🎉\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ TEST RUNNER FAILED:", error.message);
    process.exit(1);
  }
}

runTests();
