/**
 * Test script for the AI Local Service Assistant
 * Run: node test_ai_assistant.cjs
 */

'use strict';
require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000/api';

async function run() {
  console.log('==================================================');
  console.log('  Testing AI Local Service Assistant');
  console.log('==================================================\n');

  // 1. Get Authentication Token by logging in
  console.log('Step 1: Logging in as test user...');
  let token;
  try {
    const loginRes = await axios.post(`${BASE}/auth/login`, {
      email: 'vignesh@test.com',
      password: 'user123'
    });
    token = loginRes.data.token;
    console.log('✅ Logged in successfully. Token acquired.\n');
  } catch (err) {
    console.error('❌ Login failed. Make sure the backend server is running on port 5000.');
    console.error(err.message);
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  let passed = 0;
  let failed = 0;

  async function assertTest(name, promise) {
    try {
      await promise();
      console.log(`✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${name}`);
      console.error('   Reason:', err.message);
      if (err.response) {
        console.error('   Response status:', err.response.status);
        console.error('   Response data:', JSON.stringify(err.response.data));
      }
      failed++;
    }
    console.log('--------------------------------------------------');
  }

  // Test 1: Unauthenticated request
  await assertTest('Unauthenticated request should return 401', async () => {
    const res = await axios.post(`${BASE}/ai/analyze-service`, {
      problem: 'AC is not working'
    }, { validateStatus: status => status === 401 });
    if (res.status !== 401) {
      throw new Error(`Expected status 401, got ${res.status}`);
    }
  });

  // Test 2: Invalid payload (missing problem)
  await assertTest('Empty/missing problem should return 400', async () => {
    const res = await axios.post(`${BASE}/ai/analyze-service`, {
      problem: ''
    }, { headers: authHeaders, validateStatus: status => status === 400 });
    if (res.status !== 400) {
      throw new Error(`Expected status 400, got ${res.status}`);
    }
    if (res.data.success !== false) {
      throw new Error('Expected success to be false');
    }
  });

  // Test 3: Match a category (AC Repair)
  await assertTest('Should match category: AC Repair', async () => {
    const res = await axios.post(`${BASE}/ai/analyze-service`, {
      problem: 'my AC is not cooling properly, it blows hot air',
      latitude: 13.0827,
      longitude: 80.2707
    }, { headers: authHeaders });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const { success, analysis, providers } = res.data;
    if (!success) throw new Error('success field is false');
    if (analysis.status !== 'matched') throw new Error(`Expected matched, got ${analysis.status}`);
    if (analysis.serviceCategory !== 'AC Repair') throw new Error(`Expected AC Repair, got ${analysis.serviceCategory}`);
    if (!Array.isArray(providers)) throw new Error('providers is not an array');
    console.log(`   Found ${providers.length} providers. Top matched provider score: ${providers[0]?.matchScore || 'N/A'}`);
  });

  // Test 4: Ambiguous query requiring clarification
  await assertTest('Should return needs_clarification for motor issue', async () => {
    const res = await axios.post(`${BASE}/ai/analyze-service`, {
      problem: 'the motor is not working at all',
      conversationContext: []
    }, { headers: authHeaders });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const { success, analysis } = res.data;
    if (!success) throw new Error('success field is false');
    if (analysis.status !== 'needs_clarification') {
      throw new Error(`Expected needs_clarification, got ${analysis.status}`);
    }
    if (!analysis.clarificationQuestion) {
      throw new Error('Expected clarificationQuestion to be populated');
    }
    console.log(`   Clarification question: "${analysis.clarificationQuestion}"`);
  });

  // Test 5: No match
  await assertTest('Should return no_match for non-service request', async () => {
    const res = await axios.post(`${BASE}/ai/analyze-service`, {
      problem: 'can you write a poem about the sea?'
    }, { headers: authHeaders });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const { success, analysis } = res.data;
    if (!success) throw new Error('success field is false');
    if (analysis.status !== 'no_match') {
      throw new Error(`Expected no_match, got ${analysis.status}`);
    }
  });

  // Test 6: Unit Test for 429 and 503 Error Mapping
  await assertTest('AI Service should map 429 and 503 errors and redact secrets', async () => {
    const { analyzeProblem } = require('./services/aiService');
    const originalAxiosPost = axios.post;
    
    try {
      // Temporarily modify MOCK_AI for this unit test
      process.env.MOCK_AI = 'false';
      process.env.GEMINI_API_KEY = 'TEST_KEY_AQ.Ab8RN6IQ9kWIlEoWSFiUbz';
      
      // Case A: Mock 429 Rate Limit
      axios.post = async () => {
        const err = new Error('Request failed with status code 429');
        err.response = { status: 429, data: { error: { message: 'Quota exceeded' } } };
        throw err;
      };
      
      try {
        await analyzeProblem('test problem', [{ id: 1, name: 'Plumber' }]);
        throw new Error('Expected analyzeProblem to throw for 429');
      } catch (err) {
        if (err.statusCode !== 429) {
          throw new Error(`Expected error statusCode 429, got ${err.statusCode}`);
        }
        if (err.message.includes('TEST_KEY_AQ.Ab8')) {
          throw new Error('Credential leak: Error message contains API key prefix');
        }
        console.log('   ✅ successfully mapped 429 rate limit error');
      }

      // Case B: Mock 503 Upstream Limit
      axios.post = async () => {
        const err = new Error('Request failed with status code 500');
        err.response = { status: 502, data: { error: { message: 'Bad Gateway' } } };
        throw err;
      };
      
      try {
        await analyzeProblem('test problem', [{ id: 1, name: 'Plumber' }]);
        throw new Error('Expected analyzeProblem to throw for 502/503');
      } catch (err) {
        if (err.statusCode !== 503) {
          throw new Error(`Expected error statusCode 503, got ${err.statusCode}`);
        }
        if (err.message.includes('TEST_KEY_AQ.Ab8')) {
          throw new Error('Credential leak: Error message contains API key prefix');
        }
        console.log('   ✅ successfully mapped 502/503 upstream error');
      }

      // Case C: Mock Network Timeout (503)
      axios.post = async () => {
        const err = new Error('timeout of 30000ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      };
      
      try {
        await analyzeProblem('test problem', [{ id: 1, name: 'Plumber' }]);
        throw new Error('Expected analyzeProblem to throw for Timeout');
      } catch (err) {
        if (err.statusCode !== 503) {
          throw new Error(`Expected error statusCode 503, got ${err.statusCode}`);
        }
        if (err.message.includes('TEST_KEY_AQ.Ab8')) {
          throw new Error('Credential leak: Error message contains API key prefix');
        }
        console.log('   ✅ successfully mapped timeout network error');
      }

    } finally {
      // Restore original post and config
      axios.post = originalAxiosPost;
      process.env.MOCK_AI = 'true'; // Restore E2E standard mock mode
      delete process.env.GEMINI_API_KEY;
    }
  });

  console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All AI Assistant tests passed successfully!');
    process.exit(0);
  }
}

run();
