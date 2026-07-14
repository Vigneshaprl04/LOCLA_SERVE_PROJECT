const rateLimit = require("express-rate-limit");

/**
 * Authentication Endpoints Rate Limiter.
 * 
 * ⚠️ WARNING / KNOWN LIMITATION:
 * This rate limiter uses an in-memory store (MemoryStore) by default.
 * It is only effective for protecting a SINGLE backend server instance.
 * If the production deployment runs multiple instances or scale-outs (e.g. on Render, Heroku, AWS ECS),
 * brute-force requests will be distributed among different instances, bypassing the threshold.
 * 
 * In multi-instance production environments, this memory store MUST be replaced with a shared external
 * store (e.g., rate-limit-redis or a centralized database-backed tracking store) for consistent protection.
 */
const authRateLimiter = (limit = 5, windowMins = 15, message) => {
  return rateLimit({
    windowMs: windowMins * 60 * 1000,
    max: limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: message || `Too many requests. Please try again in ${windowMins} minutes.`
    }
  });
};

module.exports = authRateLimiter;
