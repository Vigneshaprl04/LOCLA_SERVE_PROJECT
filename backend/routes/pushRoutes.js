"use strict";

const express = require("express");
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * POST /api/notifications/subscribe
 * Register a client Web Push subscription credentials.
 */
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription payload parameters."
      });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Check if endpoint is already registered
    const [existing] = await db.query(
      "SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      [userId, endpoint]
    );

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
         VALUES (?, ?, ?, ?)`,
        [userId, endpoint, p256dh, auth]
      );
      console.log(`[Push] User ${userId} successfully registered new Web Push subscription.`);
    }

    return res.status(200).json({
      success: true,
      message: "Push notification subscription registered successfully."
    });
  } catch (error) {
    console.error("Error in push subscribe controller:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error registering subscription."
    });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Deregister a client Web Push subscription endpoint.
 */
router.post("/unsubscribe", protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: "Endpoint is required to unsubscribe."
      });
    }

    await db.query(
      "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      [userId, endpoint]
    );

    console.log(`[Push] User ${userId} successfully removed Web Push subscription.`);

    return res.status(200).json({
      success: true,
      message: "Push notification subscription removed successfully."
    });
  } catch (error) {
    console.error("Error in push unsubscribe controller:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error removing subscription."
    });
  }
});

module.exports = router;
