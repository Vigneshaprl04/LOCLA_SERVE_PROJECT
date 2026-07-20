# LocalServe Release v1.0.0

This release document marks the launch of **LocalServe v1.0.0**, a production-ready home services marketplace platform. It enables customers to register, request booking tasks, receive real-time bids/quotes from service providers, accept and make secure payments for bookings, receive real-time chat updates and push notifications, rate/review their experiences, and file complaints if necessary. 

The application utilizes a robust architecture built on top of Express, Socket.IO, MySQL, and React, following a strict layered architecture pattern.

---

## 🚀 Key Features

### 1. Authentication & Security
- **JWT-Based Stateless Auth**: Secure token-based authentication with expiration limits.
- **Role-Based Access Control (RBAC)**: Enforced middleware-level guards routing requests for `Customer`, `Provider`, and `Admin` users.
- **Email Verification**: Verification flows upon registration to filter genuine email addresses.
- **Security Protections**: Rate limiters for brute force prevention, HTTP headers via `Helmet`, and strict CORS whitelist checks.

### 2. Provider Availability & Search
- **Weekly Scheduling**: Providers can define active time slots for each day.
- **Real-time Status**: Providers can go online/offline, notifying active rooms instantly.
- **Search & Filter**: Customers can search and view nearby available providers filterable by categories.

### 3. Booking Engine
- **Service Request**: Customers can initiate requests specifying category, address, and issue details.
- **Real-Time Quoting**: Providers can bid/quote on requests with transparent pricing.
- **Status Workflows**: Multi-step booking status machine (Pending → Quoted → Accepted → In-Progress → Completed).

### 4. Secure Payments & Billing
- **Razorpay Integration**: End-to-end checkout with secure webhook/signature verification.
- **Dynamic Invoices**: PDF generation using `PDFKit` with clean layout, brand logo, tax breakdowns (18% GST), and unique ID sequence (`INV-YYYY-XXXXXX`).
- **Payment History**: Collapsible records on user profile dashboard showing status (Success, Failed, Cancelled).

### 5. Chat & Presence (Real-Time)
- **Room Isolation**: Secure Socket.IO rooms for individual bookings (`booking_<id>`).
- **Bidirectional Messaging**: Low-latency message delivery for active bookings.
- **Persistent Storage**: All chat messages stored in database with read/unread statuses.

### 6. Notifications System
- **Real-Time Delivery**: Pushed instantly via Socket.IO to user rooms (`user:<userId>`).
- **REST Fallback**: REST endpoints to retrieve notification logs, count unread notifications, and toggle read/unread state.
- **Single-Listener Pattern**: Unified React Context managing a single socket connection to prevent connection leakage.

### 7. AI Assistant
- **Gemini AI Integration**: Contextual recommendation Engine powered by `gemini-1.5-flash` with dynamic category suggestion based on issues.
- **Mock AI Mode**: Developer-friendly togglable local mock fallback configuration.

### 8. Admin Panel
- **User Controls**: Enable/disable user accounts with direct status toggling.
- **Platform Analytics**: High-level financial reporting and category distribution charts.
- **Complaints Resolution**: Ticket flow allowing Admins to review and mark complaints as resolved.

---

## 🏗️ Architecture Design

LocalServe v1.0.0 enforces a strict layered pattern:

```
Repository (Data Access)
   ↓
Service (Business Logic)
   ↓
Controller (HTTP Requests & WebSockets)
   ↓
Socket.IO (Real-Time Communication Bridge)
   ↓
React Context (Global State Management)
   ↓
Hooks (Reusable State Selectors)
   ↓
UI Components (Modular Layout & Styling)
```

---

## 🛠️ Tech Stack & Dependencies

### Backend
- **Node.js / Express 5**: REST API backend
- **Socket.IO 4**: WebSocket communication
- **MySQL 2**: Persistent database connection pool
- **PDFKit**: Invoice generator
- **Razorpay SDK**: Digital checkout integration
- **Nodemailer**: Transactional emailer
- **bcryptjs & jsonwebtoken**: Cryptography & tokens

### Frontend
- **React 19**: Frontend UI library
- **Vite 8**: Build system & hot-reload bundler
- **React Router 7**: SPA routing
- **Axios**: Promised-based HTTP client

---

## 📊 Database Migration & Setup

LocalServe includes an automatic migrations manager (`backend/scripts/runMigrations.js`) executed at server startup. The schema includes:
1. `users` & `providers` (Profile, Role, and verification)
2. `provider_availability` (Scheduling times)
3. `bookings` & `quotes` (Booking transaction flows)
4. `payments` & `payment_logs` (Financial audit trails)
5. `messages` (Chat messages)
6. `notifications` (User notification logs)
7. `complaints` & `reviews` (Feedback systems)
