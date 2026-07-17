import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
dotenv.config()

import pool from '../db.js'

const username = process.argv[2] || process.env.ADMIN_INITIAL_USERNAME
const password = process.env.ADMIN_INITIAL_PASSWORD

if (!username || !password || password.length < 12) {
  console.error('Set ADMIN_INITIAL_USERNAME and ADMIN_INITIAL_PASSWORD (minimum 12 characters), or pass username as the first argument.')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
await pool.query(
  `INSERT INTO admin_users (username, password_hash) VALUES (?, ?)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
  [username, hash],
)
await pool.end()
console.log(`Admin user "${username}" seeded.`)
