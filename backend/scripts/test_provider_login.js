require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const axios = require('axios');

async function main(){
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const email = 'arun@test.com';
  const plainPassword = 'Pass1234!';

  try {
    const hashed = await bcrypt.hash(plainPassword, 10);

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    let userId;

    if (existing.length > 0) {
      userId = existing[0].id;
      await pool.query('UPDATE users SET password = ?, role = ?, is_active = 1 WHERE id = ?', [hashed, 'provider', userId]);
      console.log('Updated existing user id', userId);
    } else {
      const [res] = await pool.query('INSERT INTO users (name, email, phone, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['Arun', email, null, hashed, 'provider', 1]);
      userId = res.insertId;
      console.log('Inserted user id', userId);
    }

    const [prov] = await pool.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (prov.length === 0) {
      await pool.query('INSERT INTO providers (user_id) VALUES (?)', [userId]);
      console.log('Created providers row for user', userId);
    } else {
      console.log('Providers row exists for user', userId);
    }

    // Perform login request
    const resp = await axios.post('http://localhost:' + (process.env.PORT || 5000) + '/api/auth/login', {
      email,
      password: plainPassword
    });

    console.log('Login response data:');
    console.log(JSON.stringify(resp.data, null, 2));

    // Decode token payload without verifying (just to inspect)
    if (resp.data && resp.data.token) {
      const parts = resp.data.token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('Decoded token payload:', payload);
      }
    }

    await pool.end();
  } catch (err) {
    console.error('Script error:', err.message || err);
    process.exitCode = 1;
  }
}

main();
