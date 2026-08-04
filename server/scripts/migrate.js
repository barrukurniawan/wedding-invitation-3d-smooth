import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const migrations = [
  '004_saas_tenant_foundation.sql',
  '005_user_auth_sessions.sql',
  '006_payment_proof.sql',
  '007_payment_audit_and_state.sql',
]
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const migrationsDirectory = process.env.MIGRATIONS_DIR
  ? path.resolve(process.env.MIGRATIONS_DIR)
  : path.resolve(scriptDirectory, '../../database/migrations')

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Z',
  multipleStatements: true,
})

try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(128) PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`)

  for (const version of migrations) {
    const sql = await readFile(path.join(migrationsDirectory, version), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const [rows] = await connection.query(
      'SELECT checksum FROM schema_migrations WHERE version = ?',
      [version],
    )

    if (rows[0]) {
      if (rows[0].checksum !== checksum) {
        throw new Error(`Migration ${version} changed after it was applied.`)
      }
      console.log(`Migration already applied: ${version}`)
      continue
    }

    await connection.query(sql)
    await connection.query(
      'INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)',
      [version, checksum],
    )
    console.log(`Applied migration: ${version}`)
  }
} finally {
  await connection.end()
}
