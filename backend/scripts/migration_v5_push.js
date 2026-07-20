"use strict";

const db = require("../config/db");

async function runMigration() {
  console.log("[Migration] Running push notifications subscription table migration...");
  
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log("[Migration] Migration completed successfully: push_subscriptions table is ready.");
    process.exit(0);
  } catch (error) {
    console.error("[Migration] Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
