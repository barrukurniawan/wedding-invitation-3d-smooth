import pool from '../db.js'
import { isFreeManualPackage } from '../services/paymentConfig.js'

const dryRun = process.argv.includes('--dry-run')

if (!isFreeManualPackage()) {
  throw new Error('Refusing to activate drafts: PAYMENT_MODE must be manual and INVITATION_PRICE_IDR must be 0.')
}

const connection = await pool.getConnection()
try {
  await connection.beginTransaction()
  const [rows] = await connection.query(
    `SELECT id, slug
     FROM invitations
     WHERE status = 'draft' AND deleted_at IS NULL
     FOR UPDATE`,
  )

  console.log(`${dryRun ? '[dry-run] ' : ''}Free draft invitations: ${rows.length}`)
  for (const row of rows) console.log(`- ${row.id}: ${row.slug}`)

  if (!dryRun) {
    for (const row of rows) {
      await connection.query(
        `UPDATE invitations
         SET status = 'active', activated_at = COALESCE(activated_at, UTC_TIMESTAMP()),
             rejection_reason = NULL
         WHERE id = ? AND status = 'draft' AND deleted_at IS NULL`,
        [row.id],
      )
      await connection.query(
        `INSERT INTO invitation_status_events
           (invitation_id, from_status, to_status, actor_type, reason)
         VALUES (?, 'draft', 'active', 'system', 'Paket gratis: aktivasi existing draft')`,
        [row.id],
      )
    }
  }
  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
  await pool.end()
}
