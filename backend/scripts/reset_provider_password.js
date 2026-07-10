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

  const email = 'arun@test.com';
  const newPlain = '123456';

  try {
    const hashed = bcrypt.hashSync(newPlain, 10);
    console.log('Generated hash:', hashed);

    const [res] = await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
    console.log('Affected rows:', res.affectedRows);

    const [rows] = await pool.query('SELECT id, name, email, password FROM users WHERE email = ?', [email]);
    console.log('User after update:', rows[0]);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  }
})();
