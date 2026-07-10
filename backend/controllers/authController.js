const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role = "user" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Public registration-la admin create panna allow panna koodadhu.
    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone || null, hashedPassword, role]
    );

    // Provider role-na providers table-la initial profile create pannuvom.
    if (role === "provider") {
      await db.query(
        "INSERT INTO providers (user_id) VALUES (?)",
        [result.insertId]
      );
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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

    const [users] = await db.query(
      `SELECT id, name, email, password, role, is_active
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

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
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

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
  try {
    const { name, email, phone, address, area, city, pincode } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already in use"
      });
    }

    await db.query(
      `UPDATE users
       SET name = ?, email = ?, phone = ?, address = ?, area = ?, city = ?, pincode = ?
       WHERE id = ?`,
      [name, email, phone || null, address || null, area || null, city || null, pincode || null, req.user.id]
    );

    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
