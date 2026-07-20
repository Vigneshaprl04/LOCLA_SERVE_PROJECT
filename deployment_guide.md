# LocalServe V2 – Production Deployment Guide

This guide walks through deploying LocalServe V2 to production using **Render** (backend) and **Netlify** (frontend). Adapt as needed for other hosts.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Socket.IO Over HTTPS](#socketio-over-https)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub repository pushed and up to date
- MySQL database hosted on a cloud provider (e.g., Aiven, PlanetScale, Railway)
- Razorpay account with API keys
- Gmail App Password (or SMTP credentials) for transactional emails
- (Optional) Google Gemini API key for AI features

---

## Architecture Overview

```
┌──────────────────┐         ┌──────────────────────────┐
│   Netlify (CDN)  │  HTTPS  │   Render (Node.js)       │
│                  │ ◄──────►│                          │
│  React Frontend  │  REST   │  Express + Socket.IO     │
│  (Static Build)  │  + WSS  │  Backend API Server      │
└──────────────────┘         └──────────┬───────────────┘
                                        │
                                        │ MySQL (SSL)
                                        ▼
                             ┌──────────────────────┐
                             │   Cloud MySQL         │
                             │   (Aiven / Railway)   │
                             └──────────────────────┘
```

---

## Backend Deployment (Render)

### Step 1: Create a Web Service

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `localserve-backend`
   - **Region**: Closest to your users
   - **Branch**: `main` or `feature/provider-realtime`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free (or Starter for production)

### Step 2: Set Environment Variables

In Render's **Environment** tab, add every variable from `backend/.env.example`:

| Variable | Production Value |
|---|---|
| `PORT` | `5000` (Render may override this) |
| `NODE_ENV` | `production` |
| `DB_HOST` | Your cloud MySQL host |
| `DB_PORT` | `3306` (or provider's port) |
| `DB_USER` | Your MySQL username |
| `DB_PASSWORD` | Your MySQL password |
| `DB_NAME` | `localserve_db` |
| `JWT_SECRET` | A strong random string (64+ chars) |
| `FRONTEND_URL` | `https://local-serve-frontend.netlify.app` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_SECURE` | `false` |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Gmail App Password |
| `EMAIL_FROM` | `noreply@localserve.com` |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret |
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-1.5-flash` |
| `MOCK_AI` | `false` |

### Step 3: Deploy

Click **Deploy**. Render will install dependencies and start the server. Watch the logs for:

```
✅ MySQL Connected
✅ Database migrations completed successfully.
Server running on 5000 [PRODUCTION]
Allowed CORS origins: https://local-serve-frontend.netlify.app
```

---

## Frontend Deployment (Netlify)

### Step 1: Create a New Site

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Connect your GitHub repository
3. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

### Step 2: Set Environment Variables

In Netlify's **Site settings** → **Environment variables**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://localserve-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://localserve-backend.onrender.com` |

> **Important**: Replace `localserve-backend` with your actual Render service name.

### Step 3: Configure Redirects

Create `frontend/public/_redirects` with:

```
/*    /index.html   200
```

This ensures React Router's client-side routing works on Netlify.

### Step 4: Deploy

Trigger a deploy. Netlify will build the Vite project and serve the static bundle over its CDN.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | Yes | `development` or `production` |
| `DB_HOST` | Yes | MySQL host address |
| `DB_PORT` | Yes | MySQL port (default: 3306) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `FRONTEND_URL` | Yes | Comma-separated allowed frontend origins |
| `EMAIL_HOST` | No | SMTP host (default: smtp.gmail.com) |
| `EMAIL_PORT` | No | SMTP port (default: 587) |
| `EMAIL_SECURE` | No | Use TLS (default: false) |
| `EMAIL_USER` | No | SMTP username |
| `EMAIL_PASS` | No | SMTP password / app password |
| `EMAIL_FROM` | No | Sender email address |
| `RAZORPAY_KEY_ID` | Yes | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay API Key Secret |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model name |
| `MOCK_AI` | No | Set `true` to mock AI responses |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend REST API base URL (with `/api`) |
| `VITE_SOCKET_URL` | Yes | Backend Socket.IO server URL (no `/api`) |

---

## Socket.IO Over HTTPS

Socket.IO works over HTTPS/WSS automatically when:

1. **Backend is served over HTTPS** (Render provides this by default)
2. **Frontend connects to the HTTPS backend URL** via `VITE_SOCKET_URL`
3. **CORS is configured** with the correct `FRONTEND_URL`

The `socketClient.js` on the frontend reads `VITE_SOCKET_URL` and connects using both `websocket` and `polling` transports with automatic reconnection.

The backend's `server.js` uses the same `isOriginAllowed()` function for both Express CORS and Socket.IO CORS, ensuring consistent origin enforcement across HTTP and WebSocket connections.

**No additional proxy or SSL configuration is needed** — the hosting platform handles TLS termination.

---

## Post-Deployment Verification

### Backend Health Check

```bash
curl https://localserve-backend.onrender.com/
# Expected: {"success":true,"message":"LocalServe Backend Running 🚀"}
```

### Socket.IO Connectivity

```bash
curl https://localserve-backend.onrender.com/socket.io/?EIO=4&transport=polling
# Expected: A JSON response starting with "0{" (Socket.IO handshake)
```

### Frontend

1. Open `https://local-serve-frontend.netlify.app`
2. Verify the login page loads
3. Log in and confirm the navbar renders (with notification bell)
4. Check browser console for `[SocketClient] Created new socket instance.`

### End-to-End Flow

1. **Login** as customer → Verify JWT stored in localStorage
2. **Create booking** → Verify provider receives real-time notification
3. **Provider quotes** → Verify customer receives quote notification
4. **Customer accepts** → Verify provider receives acceptance alert
5. **Chat** → Send a message and verify real-time delivery
6. **Payment** → Complete a payment and verify invoice generation
7. **Notifications** → Click bell, verify list, mark as read

---

## Troubleshooting

### CORS Errors

- Verify `FRONTEND_URL` is set correctly in backend environment
- Ensure no trailing slash in the URL (e.g., `https://example.com` not `https://example.com/`)
- Check Render logs for "Allowed CORS origins:" on startup

### Socket.IO Connection Failures

- Verify `VITE_SOCKET_URL` points to the backend HTTPS URL (no `/api`)
- Check browser console for `connect_error` events
- Confirm the backend is running and Socket.IO middleware is accepting connections

### Database Connection Errors

- Verify all `DB_*` variables are set
- Ensure the cloud MySQL instance allows connections from Render's IP range
- Check that SSL is enabled (`ssl: { rejectUnauthorized: false }` is set in `config/db.js`)

### Render Free Tier Cold Starts

- Free instances spin down after 15 minutes of inactivity
- First request after idle may take 30–60 seconds
- Consider upgrading to Starter for always-on service
