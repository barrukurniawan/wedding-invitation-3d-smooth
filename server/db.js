import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  throw new Error(`Missing required database environment variables: ${missing.join(', ')}`)
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: ['DATETIME'],
  // Prevent ETIMEDOUT on startup/idle from permanently killing the pool
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  idleTimeout: 60_000,
})

export default pool
