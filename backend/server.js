require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const providerRoutes = require("./routes/providerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiRoutes = require("./routes/aiRoutes");
const jwt = require("jsonwebtoken");
const runMigrations = require("./scripts/runMigrations");

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    "https://local-serve-frontend.netlify.app"
];

if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(",");
    urls.forEach(url => {
        const trimmed = url.trim();
        if (trimmed && !allowedOrigins.includes(trimmed)) {
            allowedOrigins.push(trimmed);
        }
    });
}

function isOriginAllowed(origin) {
    if (!origin) return true;
    let normalizedOrigin = origin.trim().toLowerCase();
    if (normalizedOrigin.endsWith("/")) {
        normalizedOrigin = normalizedOrigin.slice(0, -1);
    }
    return allowedOrigins.some(allowed => {
        let normalizedAllowed = allowed.trim().toLowerCase();
        if (normalizedAllowed.endsWith("/")) {
            normalizedAllowed = normalizedAllowed.slice(0, -1);
        }
        return normalizedOrigin === normalizedAllowed;
    });
}

const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
};

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true
    }
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Authentication error: Missing token"));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify active state and password changed at time
        const [users] = await db.query(
            "SELECT password_changed_at, is_active FROM users WHERE id = ?",
            [decoded.id]
        );

        if (users.length === 0) {
            return next(new Error("Authentication error: User not found"));
        }

        const user = users[0];
        if (!user.is_active) {
            return next(new Error("Authentication error: Account is blocked"));
        }

        if (user.password_changed_at) {
            // MySQL DATETIME returns Date object or string. Convert to seconds timestamp.
            const changedTimestamp = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
            if (decoded.iat < changedTimestamp) {
                return next(new Error("Authentication error: Token invalidated by password change"));
            }
        }

        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
    } catch (err) {
        console.error("Socket Authentication Error:", err.message);
        return next(new Error("Authentication error: Invalid or expired token"));
    }
});

app.set("io", io);

// Initialize modular Socket.IO server
const socketServer = require("./socket/socketServer");
socketServer.init(io);

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", async (req, res) => {
    res.json({
        success: true,
        message: "LocalServe Backend Running 🚀"
    });
});

async function ensureMessagesTableExists() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                message TEXT NOT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_booking_id (booking_id),
                INDEX idx_sender_id (sender_id),
                INDEX idx_receiver_id (receiver_id)
            )
        `);
        console.log("✅ Messages table verified/created");
    } catch (err) {
        console.error("❌ Error ensuring messages table exists:", err.message);
    }
}

async function connectDB() {
    try {
        const conn = await db.getConnection();
        console.log("✅ MySQL Connected");
        conn.release();
        
        // Execute migrations on startup
        await runMigrations();
        
        await ensureMessagesTableExists();

        // Start server listening only after DB and migrations are ready
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    } catch (err) {
        console.error("❌ DB/Migration Error during startup:", err.message);
        process.exit(1); // Stop application from running with incorrect schema
    }
}

connectDB();

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Auto-join the authenticated user's notification room
    if (socket.userId) {
        socket.join(`user_${socket.userId}`);
        console.log(`User ${socket.userId} joined notification room (auto)`);
    }

    socket.on("joinUser", () => {
        if (socket.userId) {
            socket.join(`user_${socket.userId}`);
            console.log(`User ${socket.userId} joined notification room (joinUser event)`);
        }
    });

    socket.on("joinBooking", async ({ bookingId }) => {
        try {
            if (!socket.userId) {
                return socket.emit("chat_error", {
                    message: "Access denied: Unauthenticated socket"
                });
            }

            const [bookings] = await db.query(
                `SELECT b.user_id, p.user_id AS provider_user_id
                 FROM bookings b
                 JOIN providers p ON b.provider_id = p.id
                 WHERE b.id = ?`,
                [bookingId]
            );

            if (bookings.length === 0) {
                return socket.emit("chat_error", {
                    message: "Booking not found"
                });
            }

            const booking = bookings[0];
            const senderId = Number(socket.userId);

            if (
                senderId !== Number(booking.user_id) &&
                senderId !== Number(booking.provider_user_id)
            ) {
                return socket.emit("chat_error", {
                    message: "Access denied: You are not authorized for this booking"
                });
            }

            socket.join(`booking_${bookingId}`);

            socket.emit("booking_joined", {
                bookingId
            });
        } catch (error) {
            console.error("Join Booking Error:", error);

            socket.emit("chat_error", {
                message: "Unable to join booking chat"
            });
        }
    });

    socket.on(
        "sendMessage",
        async ({ bookingId, message }) => {
            try {
                if (!socket.userId) {
                    return socket.emit("chat_error", {
                        message: "Access denied: Unauthenticated socket"
                    });
                }
                if (!message || !message.trim()) {
                    return;
                }

                const [bookings] = await db.query(
                    `SELECT b.user_id, p.user_id AS provider_user_id
                     FROM bookings b
                     JOIN providers p ON b.provider_id = p.id
                     WHERE b.id = ?`,
                    [bookingId]
                );

                if (bookings.length === 0) {
                    return socket.emit("chat_error", {
                        message: "Booking not found"
                    });
                }

                const booking = bookings[0];

                const customerId = Number(booking.user_id);
                const providerUserId = Number(booking.provider_user_id);
                const senderId = Number(socket.userId);

                if (
                    senderId !== customerId &&
                    senderId !== providerUserId
                ) {
                    return socket.emit("chat_error", {
                        message: "Access denied: You are not authorized for this booking"
                    });
                }

                const receiverId =
                    senderId === customerId
                        ? providerUserId
                        : customerId;

                const [result] = await db.query(
                    `INSERT INTO messages
                     (booking_id, sender_id, receiver_id, message)
                     VALUES (?, ?, ?, ?)`,
                    [
                        bookingId,
                        senderId,
                        receiverId,
                        message.trim()
                    ]
                );

                const newMessage = {
                    id: result.insertId,
                    booking_id: Number(bookingId),
                    sender_id: senderId,
                    receiver_id: receiverId,
                    message: message.trim(),
                    is_read: false,
                    created_at: new Date()
                };

                io.to(`booking_${bookingId}`).emit(
                    "newMessage",
                    newMessage
                );
            } catch (error) {
                console.error("Send Message Error:", error);

                socket.emit("chat_error", {
                    message: "Message sending failed"
                });
            }
        }
    );

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

