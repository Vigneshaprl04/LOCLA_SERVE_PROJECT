const mysql = require("mysql2/promise");
const crypto = require("crypto");
require("dotenv").config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Vicky@2005',
  database: process.env.DB_NAME || 'localserve_db',
  port: Number(process.env.DB_PORT || 3306),
  ssl: { rejectUnauthorized: false }
};

const action = process.argv[2];
const email = process.argv[3];

if (!action || !email) {
  console.error("Usage: node runProdVerifyHelper.js [verify|forgot] [email]");
  process.exit(1);
}

async function run() {
  let db;
  try {
    db = await mysql.createConnection(DB_CONFIG);
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }

  try {
    if (action === "verify") {
      console.log(`Setting email_verified = 1 for email: ${email}`);
      const [res] = await db.query(
        "UPDATE users SET email_verified = 1, email_verification_token_hash = NULL, email_verification_expires_at = NULL WHERE email = ?",
        [email]
      );
      console.log(`Successfully updated. Affected rows: ${res.affectedRows}`);
    } else if (action === "forgot") {
      const token = "prodresettoken12345";
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      
      console.log(`Setting known reset token hash in DB for email: ${email}`);
      const [res] = await db.query(
        "UPDATE users SET password_reset_token_hash = ?, password_reset_expires_at = ? WHERE email = ?",
        [tokenHash, expires, email]
      );
      console.log(`Successfully updated. Affected rows: ${res.affectedRows}`);
      console.log(`Raw token to use in URL: ${token}`);
    }
    process.exit(0);
  } catch (err) {
    console.error("Query execution failed:", err.message);
    process.exit(1);
  }
}

run();
