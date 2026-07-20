const db = require("../config/db");

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  let connection;
  try {
    connection = await db.getConnection();
    
    // 0. Ensure payments and payment_logs tables exist with proper structure
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        user_id INT NOT NULL,
        provider_id INT NULL,
        razorpay_order_id VARCHAR(255) NULL,
        razorpay_payment_id VARCHAR(255) NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        amount DECIMAL(10,2) NOT NULL,
        gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        payment_method VARCHAR(50) NULL,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        invoice_number VARCHAR(255) NULL UNIQUE,
        paid_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_booking (booking_id),
        INDEX idx_payment_user (user_id),
        INDEX idx_payment_provider (provider_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NULL,
        booking_id INT NOT NULL,
        previous_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NOT NULL,
        event TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_log_booking (booking_id)
      )
    `);

    // Ensure provider_status_logs table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS provider_status_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        previous_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NOT NULL,
        changed_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_log_provider (provider_id)
      )
    `);

    // Ensure notifications table exists with proper structure
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        booking_id INT NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        type VARCHAR(50) NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notification_user (user_id),
        INDEX idx_notification_booking (booking_id)
      )
    `);

    // 1. Check/Add columns in users, providers, payments, and notifications tables
    const columnsToVerify = [
      { table: "users", column: "email_verified", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { table: "users", column: "email_verification_token_hash", definition: "VARCHAR(255) NULL" },
      { table: "users", column: "email_verification_expires_at", definition: "DATETIME NULL" },
      { table: "users", column: "password_reset_token_hash", definition: "VARCHAR(255) NULL" },
      { table: "users", column: "password_reset_expires_at", definition: "DATETIME NULL" },
      { table: "users", column: "password_changed_at", definition: "DATETIME NULL" },
      { table: "users", column: "failed_login_attempts", definition: "INT NOT NULL DEFAULT 0" },
      { table: "users", column: "login_locked_until", definition: "DATETIME NULL" },
      { table: "providers", column: "last_location_updated_at", definition: "TIMESTAMP NULL DEFAULT NULL" },
      { table: "providers", column: "is_online", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { table: "providers", column: "last_seen", definition: "DATETIME NULL" },
      { table: "payments", column: "provider_id", definition: "INT NULL" },
      { table: "payments", column: "razorpay_order_id", definition: "VARCHAR(255) NULL" },
      { table: "payments", column: "razorpay_payment_id", definition: "VARCHAR(255) NULL" },
      { table: "payments", column: "currency", definition: "VARCHAR(10) NOT NULL DEFAULT 'INR'" },
      { table: "payments", column: "gst_amount", definition: "DECIMAL(10,2) NOT NULL DEFAULT 0.00" },
      { table: "payments", column: "total_amount", definition: "DECIMAL(10,2) NOT NULL DEFAULT 0.00" },
      { table: "payments", column: "payment_method", definition: "VARCHAR(50) NULL" },
      { table: "payments", column: "invoice_number", definition: "VARCHAR(255) NULL UNIQUE" },
      { table: "payments", column: "paid_at", definition: "DATETIME NULL" },
      { table: "notifications", column: "booking_id", definition: "INT NULL" }
    ];

    for (const col of columnsToVerify) {
      const [check] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ?`,
        [col.table, col.column]
      );

      if (check.length === 0) {
        console.log(`➕ Adding column [${col.column}] to table [${col.table}]...`);
        await connection.query(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.definition}`);
      }
    }

    // 2. Check/Add indexes in users table for verification and reset token hashes
    const indexesToVerify = [
      { name: "idx_users_email_verification", table: "users", column: "email_verification_token_hash" },
      { name: "idx_users_password_reset", table: "users", column: "password_reset_token_hash" }
    ];

    for (const idx of indexesToVerify) {
      const [check] = await connection.query(
        `SELECT INDEX_NAME 
         FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND INDEX_NAME = ?`,
        [idx.table, idx.name]
      );

      if (check.length === 0) {
        console.log(`➕ Creating index [${idx.name}] on table [${idx.table}]...`);
        await connection.query(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.column})`);
      }
    }

    // 3. Backfill existing demo/test accounts to email_verified = true
    const demoAccounts = [
      "vignesh@test.com",
      "arun@test.com",
      "kumar@test.com",
      "admin@localserve.com"
    ];

    const [updateResult] = await connection.query(
      `UPDATE users 
       SET email_verified = 1 
       WHERE email_verified = 0 
         AND email IN (?)`,
      [demoAccounts]
    );
    if (updateResult.affectedRows > 0) {
      console.log(`✅ Backfilled ${updateResult.affectedRows} demo accounts as verified.`);
    }

    console.log("✅ Database migrations completed successfully.");
  } catch (err) {
    console.error("❌ Database Migration Error:", err.message);
    throw err; // Re-throw to halt server startup on failure
  } finally {
    if (connection) connection.release();
  }
}

module.exports = runMigrations;
