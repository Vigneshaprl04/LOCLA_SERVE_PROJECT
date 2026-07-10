# TODO - Real-time Booking-based Chat (User ↔ Provider)

## Step 1 — Backend DB
- [x] Add “ensure messages table exists” on server startup (or migration script)
- [x] Verify columns: id, booking_id, sender_id, receiver_id, message, is_read, created_at
- [x] Add indexes on booking_id, sender_id, receiver_id

## Step 2 — Backend new HTTP endpoints (do not break existing chat)
- [x] Create `backend/controllers/messageController.js`
- [x] Create `backend/routes/messageRoutes.js`
- [x] Add `GET /api/messages/:bookingId` (JWT protected + booking membership authorization)
- [x] Wire into `backend/server.js` as `/api/messages`

## Step 3 — Socket.IO JWT auth + secure room join
- [x] Update `backend/server.js` Socket.IO auth handshake using JWT middleware (`io.use`)
- [x] Modify `joinBooking` to accept `{ bookingId }` and validate socket.userId belongs to booking
- [x] Modify `sendMessage` to derive senderId from socket.userId and validate access
- [x] Keep existing events tolerant to avoid breaking current behavior

## Step 4 — Frontend ChatPage + Socket.IO client
- [x] Ensure `socket.io-client` is installed in `frontend`
- [x] Create `frontend/src/pages/ChatPage.jsx`
- [x] Add route `/chat/:bookingId` in `frontend/src/App.jsx`
- [x] Load history from `GET /api/messages/:bookingId`
- [x] Connect Socket.IO with JWT, join `booking_<bookingId>`, send/receive in real time
- [x] UI: bubbles, loading/error/back, auto-scroll

## Step 5 — Provider/User booking buttons
- [x] Confirm `MyBookings.jsx` Chat button routes correctly (already expected)
- [x] Update `frontend/src/pages/ProviderDashboard.jsx` to add Chat button for each booking

## Step 6 — Run build/tests
- [x] Run backend/API checks (where possible)
- [x] Run `npm run build` in frontend and fix compile errors

## Step 7 — Verification steps
- [x] Manual test with 2 browser sessions for one booking (User + Provider)
- [x] Confirm real-time message sending and history loading
# TODO - User Profile and Provider Profile Management UI

## Step 1 — Backend Profile Endpoints
- [x] Create `GET /api/auth/profile` and `PUT /api/auth/profile` for general user identity details
- [x] Create `GET /api/providers/profile` to load joined user and provider fields
- [x] Enforce email uniqueness check and reject with HTTP 409
- [x] Enforce role-based access control preventing users from modifying protected fields like role, verification status, and ratings

## Step 2 — Frontend Profile Pages
- [x] Create `frontend/src/pages/UserProfile.jsx` with card layout and locked inputs for role
- [x] Create `frontend/src/pages/ProviderProfile.jsx` with experience details, description, and category selector
- [x] Integrate explicit button triggering browser location mapping coordinates
- [x] Add cancel states and link context update synchronizing local store and state

## Step 3 — Routing & Dashboard links
- [x] Add routes in `frontend/src/App.jsx`
- [x] Render "Profile" navigation controls on `UserHome.jsx`, `MyBookings.jsx`, and `ProviderDashboard.jsx`
