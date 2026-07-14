const rateLimitMap = new Map();

// Clear rate limits map every hour to prevent memory growth
setInterval(() => {
  rateLimitMap.clear();
}, 60 * 60 * 1000);

const aiRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown_ip";
  const userId = req.user?.id || "anonymous";
  const key = `${userId}_${ip}`;

  const limit = 20; // 20 requests per hour
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const record = rateLimitMap.get(key);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  if (record.count >= limit) {
    const minutesLeft = Math.ceil((record.resetTime - now) / (60 * 1000));
    return res.status(429).json({
      success: false,
      message: `Too many AI analysis requests. Please try again in ${minutesLeft} minutes.`
    });
  }

  record.count += 1;
  next();
};

module.exports = aiRateLimiter;
