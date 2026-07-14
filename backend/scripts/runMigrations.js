const db = require("../config/db");

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  let connection;
  try {
    connection = await db.getConnection();
    
    // 1. Check/Add columns in users table and providers table
    const columnsToVerify = [
      { table: "users", column: "email_verified", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { table: "users", column: "email_verification_token_hash", definition: "VARCHAR(255) NULL" },
      { table: "users", column: "email_verification_expires_at", definition: "DATETIME NULL" },
      { table: "users", column: "password_reset_token_hash", definition: "VARCHAR(255) NULL" },
      { table: "users", column: "password_reset_expires_at", definition: "DATETIME NULL" },
      { table: "users", column: "password_changed_at", definition: "DATETIME NULL" },
      { table: "users", column: "failed_login_attempts", definition: "INT NOT NULL DEFAULT 0" },
      { table: "users", column: "login_locked_until", definition: "DATETIME NULL" },
      { table: "providers", column: "last_location_updated_at", definition: "TIMESTAMP NULL DEFAULT NULL" }
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
