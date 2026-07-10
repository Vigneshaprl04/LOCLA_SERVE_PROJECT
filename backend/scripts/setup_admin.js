require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async function(){
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const email = 'admin@localserve.com';
  const plain = 'admin123';

  try {
    const hashed = bcrypt.hashSync(plain, 10);
    console.log('Generated admin hash:', hashed);

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await pool.query('UPDATE users SET password = ?, role = ? WHERE email = ?', [hashed, 'admin', email]);
      console.log('Updated existing admin user');
    } else {
      await pool.query('INSERT INTO users (name, email, phone, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['LocalServe Admin', email, '9876543212', hashed, 'admin', 1]);
      console.log('Inserted new admin user');
    }

    // Set provider verification to pending for provider user_id=2 (for testing)
    await pool.query("UPDATE providers SET verification_status = 'pending' WHERE user_id = ?", [2]);
    console.log('Set provider (user_id=2) verification_status to pending');

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  }
})();
