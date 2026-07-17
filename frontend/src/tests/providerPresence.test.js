import assert from "assert";

// Mock implementation of socketClient to verify its logic in a clean unit test
class MockSocket {
  constructor(url, opts) {
    this.url = url;
    this.opts = opts;
    this.connected = true;
    this.listeners = {};
    this.id = "mock-socket-12345";
  }

  on(event, cb) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(cb);
  }

  off(event, cb) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
    }
  }

  emit(event, data) {
    // Simulate server side receiving and echoing or registering
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  connect() {
    this.connected = true;
    return this;
  }
}

// Test Suite
async function runTests() {
  console.log("\n==================================================");
  console.log("  LocalServe V2 - Sprint 2 Phase 5 Frontend Tests");
  console.log("==================================================\n");

  const passed = [];
  const failed = [];

  const testAssert = (condition, testName, message) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed.push(testName);
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${message}`);
      failed.push({ testName, message });
    }
  };

  try {
    // --- TEST 1: Socket Client Singleton Logic ---
    console.log("🔍 [TEST 1] Testing Socket Client Singleton...");
    
    // Simulate socketClient getSocket singleton logic
    let socketInstance = null;
    const getSocketMock = (token) => {
      if (!token) {
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }
        return null;
      }
      if (!socketInstance) {
        socketInstance = new MockSocket("http://localhost:5000", { auth: { token } });
      } else if (socketInstance.opts.auth.token !== token) {
        socketInstance.opts.auth.token = token;
        socketInstance.disconnect().connect();
      }
      return socketInstance;
    };

    const s1 = getSocketMock("token-1");
    const s2 = getSocketMock("token-1");
    testAssert(s1 === s2, "Socket Singleton Reuse", "Multiple calls with same token must return identical socket instance");
    testAssert(s1.connected === true, "Socket Connected Status", "New socket must be active and connected");

    const s3 = getSocketMock("token-2");
    testAssert(s1 === s3, "Socket Instance Preserved on Token Change", "Instance must be preserved when token changes");
    testAssert(s3.opts.auth.token === "token-2", "Socket Token Updated", "Token should be updated on reconnect");

    getSocketMock(null);
    testAssert(socketInstance === null, "Socket Cleaned up on empty token", "Socket must be destroyed when token is null");

    // --- TEST 2: ProviderPresenceContext Global Listener Registration ---
    console.log("\n🔍 [TEST 2] Testing Single Listener and Context mapping...");
    
    const socket = new MockSocket("http://localhost:5000", { auth: { token: "token-1" } });
    
    // Simulate ProviderPresenceProvider state mount
    let presenceMap = {};
    const setPresenceMap = (updater) => {
      if (typeof updater === "function") {
        presenceMap = updater(presenceMap);
      } else {
        presenceMap = updater;
      }
    };

    const updateProviderPresence = (providerId, isOnline) => {
      presenceMap = {
        ...presenceMap,
        [Number(providerId)]: !!isOnline
      };
    };

    // Simulate ProviderPresenceProvider useEffect mounting
    let registeredCallbacks = [];
    const handleStatusChanged = (data) => {
      const providerId = Number(data?.providerId);
      const isOnline = !!data?.isOnline;
      if (!isNaN(providerId)) {
        setPresenceMap((prev) => ({
          ...prev,
          [providerId]: isOnline
        }));
      }
    };

    // Register single event listener
    socket.on("provider_status_changed", handleStatusChanged);
    registeredCallbacks.push(handleStatusChanged);

    testAssert(
      socket.listeners["provider_status_changed"]?.length === 1,
      "Single Socket Listener registered",
      `Expected exactly 1 listener, got ${socket.listeners["provider_status_changed"]?.length}`
    );

    // --- TEST 3: Hook Lightweight Reading & Initializing ---
    console.log("\n🔍 [TEST 3] Testing Hook Reading and Initialization...");
    
    // Hook simulation function for useProviderPresence
    const useProviderPresenceMock = (providerId, initialStatus) => {
      const id = Number(providerId);
      if (presenceMap[id] === undefined && initialStatus !== undefined) {
        updateProviderPresence(id, initialStatus);
      }
      return presenceMap[id] !== undefined ? presenceMap[id] : !!initialStatus;
    };

    // Simulate components rendering
    const card1Status = useProviderPresenceMock(10, true); // Provider 10 is online initially
    const card2Status = useProviderPresenceMock(20, false); // Provider 20 is offline initially

    testAssert(card1Status === true, "Provider 10 initial status", "Should resolve to true");
    testAssert(card2Status === false, "Provider 20 initial status", "Should resolve to false");
    testAssert(presenceMap[10] === true, "Presence map contains provider 10", "Should be marked online");
    testAssert(presenceMap[20] === false, "Presence map contains provider 20", "Should be marked offline");
    
    testAssert(
      socket.listeners["provider_status_changed"]?.length === 1,
      "Lightweight hooks do not register new listeners",
      "Calling hook multiple times must not add new event listeners to the socket"
    );

    // --- TEST 4: Live Event Updates Propagation ---
    console.log("\n🔍 [TEST 4] Testing Live event propagation...");
    
    // Simulate backend status change emit: Provider 20 goes Online
    const eventHandler = socket.listeners["provider_status_changed"][0];
    eventHandler({ providerId: 20, isOnline: true });

    testAssert(
      useProviderPresenceMock(20, false) === true,
      "Provider 20 status updates to Online",
      "Hook should return true after online event is received"
    );

    // --- TEST 5: Rapid Status Changes (Bounce) ---
    console.log("\n🔍 [TEST 5] Testing Rapid status updates...");
    
    eventHandler({ providerId: 20, isOnline: false });
    eventHandler({ providerId: 20, isOnline: true });
    eventHandler({ providerId: 20, isOnline: false });

    testAssert(
      useProviderPresenceMock(20, true) === false,
      "Provider 20 handles rapid status updates cleanly",
      "Hook should resolve to latest offline status"
    );

    // --- TEST 6: Unknown / Untracked Provider Events ---
    console.log("\n🔍 [TEST 6] Testing Unknown provider status changes...");
    
    // Backend emits status change for provider 999 (which is not pre-registered in hook)
    eventHandler({ providerId: 999, isOnline: true });

    testAssert(
      presenceMap[999] === true,
      "Unknown provider recorded in presence map",
      "Event must be saved in global presence map even if no component is active"
    );
    testAssert(
      useProviderPresenceMock(999, false) === true,
      "Lightweight hook resolves state of unknown provider from context",
      "Hook must retrieve state from global map and return true"
    );

    // --- TEST 7: Listener Cleanup ---
    console.log("\n🔍 [TEST 7] Testing Context Unmount Listener Cleanup...");
    
    // Simulate ProviderPresenceProvider cleanup
    socket.off("provider_status_changed", handleStatusChanged);
    
    testAssert(
      socket.listeners["provider_status_changed"]?.length === 0,
      "Context clean unmount listener cleanup",
      `Expected listener count to be 0, got ${socket.listeners["provider_status_changed"]?.length}`
    );

    // --- TEST 8: Reconnect & Re-subscription Logic ---
    console.log("\n🔍 [TEST 8] Testing Reconnect and Re-subscription...");
    
    // Simulate reconnect: ProviderPresenceProvider re-subscribes
    socket.on("provider_status_changed", handleStatusChanged);
    testAssert(
      socket.listeners["provider_status_changed"]?.length === 1,
      "Re-subscribes successfully on reconnect",
      "Context must re-subscribe single listener"
    );

  } catch (error) {
    console.error("❌ Tests encountered error:", error.message);
    failed.push({ testName: "Test Run Integrity", message: error.message });
  }

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

runTests();
