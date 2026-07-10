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

  const email = 'vignesh@test.com';
  const plain = 'user123';

  try {
    const hashed = bcrypt.hashSync(plain, 10);
    console.log('Generated user hash:', hashed);

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await pool.query('UPDATE users SET password = ?, role = ? WHERE email = ?', [hashed, 'user', email]);
      console.log('Updated existing user');
    } else {
      await pool.query('INSERT INTO users (name, email, phone, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['Vignesh', email, '9876500000', hashed, 'user', 1]);
      console.log('Inserted new user');
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  }
})();
