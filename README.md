# 🏠 LocalServe V2

> A full-stack home-services marketplace connecting customers with local service providers. Built with **React**, **Express**, **Socket.IO**, and **MySQL**.

[![Live Demo](https://img.shields.io/badge/Frontend-Netlify-00C7B7?style=flat-square&logo=netlify)](https://local-serve-frontend.netlify.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://locla-serve-project.onrender.com)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

---

## ✨ Features

| Module | Description |
|---|---|
| 🔐 **Authentication** | JWT-based login/register, email verification, password reset, role-based access (Customer, Provider, Admin) |
| 📋 **Booking System** | Service requests, provider quoting, accept/reject workflow, status tracking |
| 💳 **Payments** | Razorpay integration, signature verification, GST invoicing, PDF generation |
| ⭐ **Reviews** | Post-completion ratings & text reviews |
| 🛡️ **Complaints** | Ticket system with admin resolution workflow |
| 👑 **Admin Panel** | User management, financial overview, complaint handling, platform analytics |
| 🕐 **Provider Availability** | Weekly schedule management with time-slot booking |
| 💬 **Real-Time Chat** | Per-booking messaging via Socket.IO |
| 🔔 **Real-Time Notifications** | Push notifications for booking events, quotes, and payments |
| 🤖 **AI Assistant** | Gemini-powered service recommendations |
| 📊 **Provider Dashboard** | Earnings tracking (daily/weekly/monthly), booking management |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │ AuthCtx  │  │ SocketCtx │  │ NotifCtx │  │ Pages  │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬───┘ │
│       │              │              │              │      │
│       └──────────────┼──────────────┼──────────────┘      │
│                      │              │                     │
│              HTTPS / WSS            │                     │
└──────────────────────┼──────────────┼─────────────────────┘
                       │              │
┌──────────────────────┼──────────────┼─────────────────────┐
│                Express + Socket.IO Backend                 │
│                      │              │                     │
│  ┌───────────────────▼──────────────▼───────────────────┐ │
│  │                  Middleware Layer                     │ │
│  │   JWT Auth │ CORS │ Helmet │ Rate Limiting           │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼───────────────────────────────┐ │
│  │                  Controllers                         │ │
│  │  Auth│Booking│Payment│Review│Chat│Notification│Admin │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼───────────────────────────────┐ │
│  │                   Services                           │ │
│  │  notificationService │ aiService │ emailService      │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼───────────────────────────────┐ │
│  │                  Repositories                        │ │
│  │  notificationRepository │ bookingRepository          │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼───────────────────────────────┐ │
│  │              MySQL (with SSL)                        │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Layered Pattern

```
Repository → Service → Controller → Route → Socket Handler → React Context → Hook → UI
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Express 5 | REST API framework |
| Socket.IO 4 | Real-time bidirectional communication |
| MySQL 2 | Relational database with connection pooling |
| JWT | Stateless authentication |
| Helmet | Security headers |
| Razorpay SDK | Payment gateway |
| PDFKit | Invoice PDF generation |
| Nodemailer | Transactional emails |
| bcryptjs | Password hashing |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI library |
| Vite 8 | Build tool & dev server |
| React Router 7 | Client-side routing |
| Socket.IO Client 4 | Real-time connection |
| Axios | HTTP client |
| React Icons | Icon library |

---

## 📁 Project Structure

```
localserve/
├── backend/
│   ├── config/           # Database connection pool
│   ├── constants/        # Socket event names
│   ├── controllers/      # Request handlers (auth, booking, payment, etc.)
│   ├── middleware/        # JWT auth, role guards, rate limiting
│   ├── models/           # Data models
│   ├── repositories/     # Database query layer
│   ├── routes/           # Express route definitions
│   ├── scripts/          # DB migrations, admin setup, test utilities
│   ├── services/         # Business logic (notifications, AI, email)
│   ├── socket/           # Socket.IO handlers (chat, booking, notifications)
│   ├── utils/            # Email transporter, helpers
│   ├── server.js         # Application entry point
│   ├── .env.example      # Environment variable template
│   └── package.json
├── frontend/
│   ├── public/           # Static assets, Netlify _redirects
│   ├── src/
│   │   ├── components/   # Navbar, NotificationBell, ProtectedRoute
│   │   ├── context/      # NotificationContext
│   │   ├── hooks/        # useNotifications
│   │   ├── pages/        # All page components (16 pages)
│   │   ├── socket/       # Socket.IO client singleton
│   │   ├── api.js        # Axios instance with auth interceptor
│   │   ├── AuthContext.jsx
│   │   └── main.jsx      # App entry + provider tree
│   ├── .env.example      # Frontend env template
│   └── package.json
├── deployment_guide.md   # Production deployment instructions
├── CHANGELOG.md          # Version history
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **MySQL** ≥ 8.0
- **npm** ≥ 9

### 1. Clone the Repository

```bash
git clone https://github.com/Vigneshaprl04/LOCLA_SERVE_PROJECT.git
cd LOCLA_SERVE_PROJECT
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials, JWT secret, and API keys
npm install
npm start
```

The server will:
- Connect to MySQL
- Run all database migrations automatically
- Start listening on `PORT` (default: 5000)

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your backend URLs
npm install
npm run dev
```

The frontend dev server starts on `http://localhost:5173`.

### 4. Create Admin User

```bash
cd backend
node scripts/setup_admin.js
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login & receive JWT |
| GET | `/api/auth/verify-email` | ❌ | Email verification |
| POST | `/api/auth/forgot-password` | ❌ | Request password reset |
| POST | `/api/auth/reset-password` | ❌ | Reset password with token |
| GET | `/api/auth/profile` | ✅ | Get current user profile |
| PUT | `/api/auth/profile` | ✅ | Update profile |
| PUT | `/api/auth/change-password` | ✅ | Change password |

### Providers
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/providers` | ❌ | List all providers |
| GET | `/api/providers/search` | ❌ | Search providers by service/location |
| GET | `/api/providers/:id` | ❌ | Get provider details |
| GET | `/api/providers/:id/availability` | ❌ | Get provider availability |
| PUT | `/api/providers/availability` | ✅ Provider | Update availability schedule |
| GET | `/api/providers/availability/mine` | ✅ Provider | Get own availability |

### Bookings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | ✅ Customer | Create booking request |
| GET | `/api/bookings` | ✅ | List user's bookings |
| GET | `/api/bookings/:id` | ✅ | Get booking details |
| PUT | `/api/bookings/:id/status` | ✅ | Update booking status |
| POST | `/api/bookings/:id/quote` | ✅ Provider | Submit quote |
| POST | `/api/bookings/:id/accept-quote` | ✅ Customer | Accept provider's quote |

### Payments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/create-order` | ✅ | Create Razorpay order |
| POST | `/api/payments/verify` | ✅ | Verify payment signature |
| GET | `/api/payments/booking/:bookingId` | ✅ | Get payment for booking |
| GET | `/api/payments/history` | ✅ | Payment history |
| GET | `/api/payments/invoice/:paymentId` | ✅ | Download invoice PDF |
| POST | `/api/payments/retry` | ✅ | Retry failed payment |
| POST | `/api/payments/cancel` | ✅ | Cancel payment |
| GET | `/api/payments/stats` | ✅ Admin | Platform payment stats |

### Reviews
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/reviews` | ✅ Customer | Submit review |
| GET | `/api/reviews/provider/:id` | ❌ | Get provider reviews |

### Complaints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/complaints` | ✅ | File complaint |
| GET | `/api/complaints` | ✅ | List user's complaints |
| GET | `/api/complaints/all` | ✅ Admin | All complaints |
| PUT | `/api/complaints/:id/resolve` | ✅ Admin | Resolve complaint |

### Notifications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | ✅ | Get user's notifications |
| PUT | `/api/notifications/:id/read` | ✅ | Mark notification as read |
| PUT | `/api/notifications/read-all` | ✅ | Mark all as read |
| GET | `/api/notifications/unread-count` | ✅ | Get unread count |

### Chat & Messages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/chat/:bookingId` | ✅ | Get chat messages |
| GET | `/api/messages/:bookingId` | ✅ | Get booking messages |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | ✅ Admin | List all users |
| PUT | `/api/admin/users/:id/toggle` | ✅ Admin | Enable/disable user |
| GET | `/api/admin/stats` | ✅ Admin | Platform statistics |
| GET | `/api/admin/complaints` | ✅ Admin | All complaints |

### AI Assistant
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/recommend` | ✅ | Get AI service recommendations |
| POST | `/api/ai/assist` | ✅ | AI chat assistance |

---

## 🔌 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `joinUser` | — | Join user's notification room |
| `joinBooking` | `{ bookingId }` | Join booking room for real-time updates |
| `booking_join` | `{ bookingId }` | Join booking-specific room |
| `chat_join` | `{ bookingId }` | Join chat room |
| `chat_send` | `{ bookingId, message }` | Send chat message |
| `sendMessage` | `{ bookingId, message }` | Send message (legacy) |
| `notification_mark_read` | `{ notificationId }` | Mark notification as read |
| `notification_read_all` | — | Mark all notifications as read |
| `provider_join` | `{ providerId }` | Join provider room |
| `provider_heartbeat` | — | Provider keepalive |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_notification` | `{ id, type, message, ... }` | New notification pushed |
| `notification_updated` | `{ id, is_read }` | Notification state change |
| `all_notifications_read` | — | All marked as read |
| `newMessage` | `{ id, sender_id, message, ... }` | New chat message |
| `chat_message` | `{ id, sender_id, message, ... }` | Chat message received |
| `bookingUpdate` | `{ bookingId, status, ... }` | Booking status change |
| `booking_update` | `{ booking }` | Booking update pushed |
| `provider_status_update` | `{ providerId, status }` | Provider online/offline |
| `chat_error` | `{ message }` | Chat error |

---

## 🔒 Security

- **JWT Authentication** — Stateless tokens with configurable expiry
- **Helmet** — Security headers (XSS, HSTS, Content-Type sniffing)
- **CORS** — Origin-whitelisted, environment-driven (`FRONTEND_URL`)
- **bcrypt** — Password hashing with salt rounds
- **Rate Limiting** — Brute-force protection on auth routes
- **Input Validation** — Request body size limited to 10KB
- **SSL/TLS** — Database connections over SSL; HTTPS enforced in production
- **Socket Auth** — JWT verified on WebSocket handshake

---

## 🚢 Deployment

See the full [Deployment Guide](deployment_guide.md) for step-by-step instructions.

**Quick summary:**
- **Backend** → Render (Web Service, Node runtime)
- **Frontend** → Netlify (Static site, Vite build)
- **Database** → Aiven / PlanetScale / Railway (Cloud MySQL)
- **Payments** → Razorpay (Live/Test mode)

---

## 📄 License

This project is licensed under the ISC License.

---

## 👤 Author

**Vignesh** — [@Vigneshaprl04](https://github.com/Vigneshaprl04)
