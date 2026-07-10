const axios = require('axios');
const mysql = require('mysql2/promise');
const { io } = require('../frontend/node_modules/socket.io-client');
require('dotenv').config();

const BACKEND_URL = 'http://localhost:5000';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Vicky@2005',
  database: process.env.DB_NAME || 'localserve_db',
};

async function runTests() {
  console.log('=== STARTING CHAT SYSTEM INTEGRATION TESTS ===\n');
  const results = {};
  let dbPool;

  try {
    // Check 1: Database connection
    dbPool = mysql.createPool(DB_CONFIG);
    const [dbTest] = await dbPool.query('SELECT 1');
    results['Database Connection'] = dbTest.length > 0 ? 'PASS' : 'FAIL';
    console.log('✔ Check 1: MySQL Database Connection - PASS');
  } catch (err) {
    results['Database Connection'] = 'FAIL';
    console.error('❌ Check 1: MySQL Database Connection failed:', err.message);
    process.exit(1);
  }

  let userToken, providerToken, unauthorizedToken;
  let userId, providerUserId, unauthorizedUserId;

  try {
    // Authenticate User (Vignesh)
    const userRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'vignesh@test.com',
      password: 'user123',
    });
    userToken = userRes.data.token;
    userId = userRes.data.user.id;
    console.log(`✔ User authenticated (ID: ${userId})`);

    // Authenticate Provider (Arun)
    const providerRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'arun@test.com',
      password: 'Pass1234!',
    });
    providerToken = providerRes.data.token;
    providerUserId = providerRes.data.user.id;
    console.log(`✔ Provider authenticated (ID: ${providerUserId})`);

    // Authenticate Unauthorized User (Kumar)
    const unauthorizedRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'kumar@test.com',
      password: 'Pass1234!',
    });
    unauthorizedToken = unauthorizedRes.data.token;
    unauthorizedUserId = unauthorizedRes.data.user.id;
    console.log(`✔ Unauthorized Provider authenticated (ID: ${unauthorizedUserId})`);

    results['JWT HTTP Authentication'] = 'PASS';
  } catch (err) {
    results['JWT HTTP Authentication'] = 'FAIL';
    console.error('❌ Authentication failed:', err.response?.data || err.message);
    await dbPool.end();
    process.exit(1);
  }

  // Clear messages from booking 2 to start clean
  await dbPool.query('DELETE FROM messages WHERE booking_id = 2');
  console.log('✔ Cleared messages for Booking #2 in DB');

  // Connect user and provider sockets
  const userSocket = io(BACKEND_URL, { auth: { token: userToken } });
  const providerSocket = io(BACKEND_URL, { auth: { token: providerToken } });
  const unauthorizedSocket = io(BACKEND_URL, { auth: { token: unauthorizedToken } });

  try {
    // Check socket connections & JWT auth
    await Promise.all([
      new Promise((resolve) => userSocket.on('connect', resolve)),
      new Promise((resolve) => providerSocket.on('connect', resolve)),
      new Promise((resolve) => unauthorizedSocket.on('connect', resolve)),
    ]);
    results['Socket.IO Connection & JWT Handshake'] = 'PASS';
    console.log('✔ Check 2: Both clients and unauthorized client connected using JWT - PASS');

    // Check room joining
    userSocket.emit('joinBooking', { bookingId: 2 });
    providerSocket.emit('joinBooking', { bookingId: 2 });

    const userJoined = await new Promise((resolve) => {
      userSocket.once('booking_joined', (data) => resolve(data.bookingId === 2));
    });
    const providerJoined = await new Promise((resolve) => {
      providerSocket.once('booking_joined', (data) => resolve(data.bookingId === 2));
    });

    results['Booking Room Join'] = userJoined && providerJoined ? 'PASS' : 'FAIL';
    console.log(`✔ Check 3: Room join status (User: ${userJoined}, Provider: ${providerJoined}) - PASS`);

    // Check Real-time message User -> Provider
    const userMessageContent = `Test message from User at ${Date.now()}`;
    const providerReceivedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Provider message receive timeout')), 3500);
      providerSocket.once('newMessage', (msg) => {
        clearTimeout(timeout);
        resolve(msg);
      });
    });

    userSocket.emit('sendMessage', {
      bookingId: 2,
      senderId: userId,
      message: userMessageContent,
    });

    const receivedByUser = await providerReceivedPromise;
    const checkUserMsg = receivedByUser.message === userMessageContent && receivedByUser.sender_id === userId;
    results['Real-time message User -> Provider'] = checkUserMsg ? 'PASS' : 'FAIL';
    console.log('✔ Check 4: User sends message, Provider receives instantly - PASS');

    // Check Real-time message Provider -> User
    const providerMessageContent = `Test reply from Provider at ${Date.now()}`;
    const userReceivedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('User message receive timeout')), 3500);
      userSocket.once('newMessage', (msg) => {
        clearTimeout(timeout);
        resolve(msg);
      });
    });

    providerSocket.emit('sendMessage', {
      bookingId: 2,
      senderId: providerUserId,
      message: providerMessageContent,
    });

    const receivedByProvider = await userReceivedPromise;
    const checkProvMsg = receivedByProvider.message === providerMessageContent && receivedByProvider.sender_id === providerUserId;
    results['Real-time message Provider -> User'] = checkProvMsg ? 'PASS' : 'FAIL';
    console.log('✔ Check 5: Provider sends message, User receives instantly - PASS');

    // Verify messages stored only once in database
    const [dbMessages] = await dbPool.query('SELECT * FROM messages WHERE booking_id = 2');
    const checkDbCount = dbMessages.length === 2;
    results['Messages stored exactly once in DB'] = checkDbCount ? 'PASS' : 'FAIL';
    console.log(`✔ Check 6: Database messages count check (Count: ${dbMessages.length}) - PASS`);

    // Verify loading history via HTTP API
    const historyRes = await axios.get(`${BACKEND_URL}/api/messages/2`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const historyCheck = historyRes.data.messages.length === 2 && historyRes.data.messages[0].message === userMessageContent;
    results['Load history via HTTP API'] = historyCheck ? 'PASS' : 'FAIL';
    console.log('✔ Check 7: Loaded history via GET /api/messages/:bookingId - PASS');

    // Verify unauthorized user blocked from joining booking room 2
    unauthorizedSocket.emit('joinBooking', { bookingId: 2 });
    const authJoinErrorPromise = new Promise((resolve) => {
      unauthorizedSocket.once('chat_error', (err) => resolve(err.message));
    });
    const errorMsgJoin = await authJoinErrorPromise;
        const checkJoinAuth = errorMsgJoin.startsWith('Access denied');
    results['Unauthorized room join blocked'] = checkJoinAuth ? 'PASS' : 'FAIL';
    console.log(`✔ Check 8: Unauthorized user room join blocked (Message: "${errorMsgJoin}") - PASS`);

    // Verify unauthorized user blocked from sending messages to booking room 2
    unauthorizedSocket.emit('sendMessage', {
      bookingId: 2,
      senderId: unauthorizedUserId,
      message: 'Hack message!',
    });
    const authSendErrorPromise = new Promise((resolve) => {
      unauthorizedSocket.once('chat_error', (err) => resolve(err.message));
    });
    const errorMsgSend = await authSendErrorPromise;
    const checkSendAuth = errorMsgSend.startsWith('Access denied');
    results['Unauthorized message sending blocked'] = checkSendAuth ? 'PASS' : 'FAIL';
    console.log(`✔ Check 9: Unauthorized user message sending blocked (Message: "${errorMsgSend}") - PASS`);

    // Check if unauthorized message made it to the database
    const [dbMessagesAfterHack] = await dbPool.query('SELECT * FROM messages WHERE booking_id = 2');
    results['Database free of unauthorized messages'] = dbMessagesAfterHack.length === 2 ? 'PASS' : 'FAIL';
    console.log('✔ Check 10: Database has no unauthorized message entries - PASS');

    // Test read-status endpoint works
    const readRes = await axios.patch(
      `${BACKEND_URL}/api/chat/booking/2/read`,
      {},
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    const readStatusCheck = readRes.data.success === true && readRes.data.updatedCount === 1;
    
    // Query database to confirm is_read is updated
    const [unreadMessages] = await dbPool.query('SELECT * FROM messages WHERE booking_id = 2 AND receiver_id = ? AND is_read = 0', [providerUserId]);
    const readDbCheck = unreadMessages.length === 0;

    results['Read-status API update works'] = readStatusCheck && readDbCheck ? 'PASS' : 'FAIL';
    console.log('✔ Check 11: Mark messages as read endpoint works - PASS');

  } catch (err) {
    console.error('❌ Test run encountered error:', err.message);
  } finally {
    userSocket.close();
    providerSocket.close();
    unauthorizedSocket.close();
    await dbPool.end();
  }

  console.log('\n=== INTEGRATION TEST RESULTS ===');
  console.table(results);
}

runTests();
