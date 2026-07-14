const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Verify active status and check password change time
    const [users] = await db.query(
      "SELECT password_changed_at, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is blocked or inactive",
      });
    }

    if (user.password_changed_at) {
      const changedTimestamp = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: "Token invalidated: Password was changed recently. Please log in again.",
        });
      }
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};
