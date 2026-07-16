const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validateAndNormalizeEmail } = require("../utils/emailValidator");
const { validatePasswordStrength } = require("../utils/passwordValidator");
const emailService = require("../services/emailService");

// In-memory rate limiting map for email verification resends (email -> timestamp)
const resendCooldowns = new Map();

exports.register = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { name, email, phone, password, role = "user" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Centralized email validation & normalization
    const emailCheck = validateAndNormalizeEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.errorReason,
      });
    }
    const normalizedEmail = emailCheck.normalizedEmail;

    // Centralized password strength check
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordCheck.errorReason,
      });
    }

    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Start transaction for atomic updates
    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    if (phone) {
      const [existingPhone] = await connection.query(
        "SELECT id FROM users WHERE phone = ?",
        [phone]
      );

      if (existingPhone.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: "Phone number already registered",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `INSERT INTO users (name, email, phone, password, role, email_verified, email_verification_token_hash, email_verification_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, normalizedEmail, phone || null, hashedPassword, role, 1, null, null]
    );

    const userId = result.insertId;

    if (role === "provider") {
      const { category_id, experience, description, working_area, city, pincode } = req.body;
      await connection.query(
        `INSERT INTO providers (user_id, category_id, experience, description, working_area, city, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          category_id ? Number(category_id) : null,
          experience ? Number(experience) : null,
          description || null,
          working_area || null,
          city || null,
          pincode || null
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Registration successful. You can now log in.",
      userId,
      emailSent: false,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Register Error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      let message = "Email or phone number already registered";
      if (error.sqlMessage && error.sqlMessage.toLowerCase().includes("email")) {
        message = "Email already registered";
      } else if (error.sqlMessage && error.sqlMessage.toLowerCase().includes("phone")) {
        message = "Phone number already registered";
      }
      return res.status(409).json({
        success: false,
        message: message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const emailCheck = validateAndNormalizeEmail(email);
    if (!emailCheck.isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    const normalizedEmail = emailCheck.normalizedEmail;

    const [users] = await db.query(
      `SELECT id, name, email, password, role, is_active, email_verified, failed_login_attempts, login_locked_until
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Check account lockout status
    if (user.login_locked_until && new Date(user.login_locked_until) > new Date()) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // Generic response
      });
    }

    // Email verification check removed for verification-free login flow

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked",
      });
    }

    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatched) {
      // Password failed: increment failed attempts
      const newAttempts = user.failed_login_attempts + 1;
      let lockTime = null;
      if (newAttempts >= 5) {
        lockTime = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
      }

      await db.query(
        `UPDATE users
         SET failed_login_attempts = ?, login_locked_until = ?
         WHERE id = ?`,
        [newAttempts, lockTime, user.id]
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Success: reset attempts and lockouts
    await db.query(
      `UPDATE users
       SET failed_login_attempts = 0, login_locked_until = NULL
       WHERE id = ?`,
      [user.id]
    );

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, email, phone, role, address, area, city, pincode, is_active, created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { name, email, phone, address, area, city, pincode, currentPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    const emailCheck = validateAndNormalizeEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.errorReason
      });
    }
    const normalizedEmail = emailCheck.normalizedEmail;

    // Get current user details from DB
    const [users] = await connection.query(
      "SELECT email, password FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];
    const isEmailChanging = normalizedEmail !== user.email.toLowerCase();

    if (isEmailChanging) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to change email."
        });
      }

      const passwordMatched = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatched) {
        return res.status(401).json({
          success: false,
          message: "Invalid current password"
        });
      }

      // Check if email is already taken by another user
      const [existingUsers] = await connection.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [normalizedEmail, req.user.id]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use"
        });
      }
    }

    await connection.beginTransaction();

    if (isEmailChanging) {
      await connection.query(
        `UPDATE users
         SET name = ?, email = ?, phone = ?, address = ?, area = ?, city = ?, pincode = ?,
             email_verified = 1,
             email_verification_token_hash = NULL,
             email_verification_expires_at = NULL
         WHERE id = ?`,
        [name, normalizedEmail, phone || null, address || null, area || null, city || null, pincode || null, req.user.id]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        emailVerified: true
      });
    } else {
      await connection.query(
        `UPDATE users
         SET name = ?, phone = ?, address = ?, area = ?, city = ?, pincode = ?
         WHERE id = ?`,
        [name, phone || null, address || null, area || null, city || null, pincode || null, req.user.id]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: "Profile updated successfully"
      });
    }
  } catch (error) {
    await connection.rollback();
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  } finally {
    connection.release();
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required"
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [users] = await db.query(
      `SELECT id FROM users
       WHERE email_verification_token_hash = ?
         AND email_verification_expires_at > NOW()`,
      [tokenHash]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    const userId = users[0].id;

    await db.query(
      `UPDATE users
       SET email_verified = 1,
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL
       WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in."
    });
  } catch (error) {
    console.error("Verify Email Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const emailCheck = validateAndNormalizeEmail(email);
    if (!emailCheck.isValid) {
      return res.json({
        success: true,
        message: "If an account is associated with this email, a new verification link has been sent."
      });
    }
    const normalizedEmail = emailCheck.normalizedEmail;

    const [users] = await db.query(
      "SELECT id, name, email_verified FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (users.length === 0 || users[0].email_verified) {
      // Generic message to prevent enumeration
      return res.json({
        success: true,
        message: "If an account is associated with this email, a new verification link has been sent."
      });
    }

    // Apply 60 seconds rate limit
    const now = Date.now();
    if (resendCooldowns.has(normalizedEmail)) {
      const lastTime = resendCooldowns.get(normalizedEmail);
      const diff = Math.ceil((60000 - (now - lastTime)) / 1000);
      if (diff > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${diff} seconds before requesting another verification link.`
        });
      }
    }
    resendCooldowns.set(normalizedEmail, now);

    const user = users[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Overwriting the token details automatically invalidates any previous tokens
    await db.query(
      `UPDATE users
       SET email_verification_token_hash = ?, email_verification_expires_at = ?
       WHERE id = ?`,
      [tokenHash, tokenExpires, user.id]
    );

    try {
      await emailService.sendVerificationEmail(normalizedEmail, user.name, rawToken);
    } catch (mailError) {
      console.error("❌ Resend Verification Email Delivery Failure:", mailError.stack || mailError.message || mailError);
      // Remove rate limit on failure so they can retry immediately
      resendCooldowns.delete(normalizedEmail);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later."
      });
    }

    res.json({
      success: true,
      message: "If an account is associated with this email, a new verification link has been sent."
    });
  } catch (error) {
    console.error("Resend Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const emailCheck = validateAndNormalizeEmail(email);
    if (!emailCheck.isValid) {
      return res.json({
        success: true,
        message: "If an account exists for this email, password reset instructions have been sent."
      });
    }
    const normalizedEmail = emailCheck.normalizedEmail;

    const [users] = await db.query(
      "SELECT id, name, is_active FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.json({
        success: true,
        message: "If an account exists for this email, password reset instructions have been sent."
      });
    }

    const user = users[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins resets expiry

    await db.query(
      `UPDATE users
       SET password_reset_token_hash = ?, password_reset_expires_at = ?
       WHERE id = ?`,
      [tokenHash, tokenExpires, user.id]
    );

    try {
      await emailService.sendPasswordResetEmail(normalizedEmail, user.name, rawToken);
    } catch (mailError) {
      console.error("❌ Forgot Password Email Delivery Failure:", mailError.message);
    }

    res.json({
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent."
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, password and confirmPassword are required"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordCheck.errorReason
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [users] = await db.query(
      `SELECT id FROM users
       WHERE password_reset_token_hash = ?
         AND password_reset_expires_at > NOW()`,
      [tokenHash]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token"
      });
    }

    const userId = users[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    await db.query(
      `UPDATE users
       SET password = ?,
           password_changed_at = ?,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL,
           failed_login_attempts = 0,
           login_locked_until = NULL
       WHERE id = ?`,
      [hashedPassword, now, userId]
    );

    res.json({
      success: true,
      message: "Password reset successful. Please log in with your new password."
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
