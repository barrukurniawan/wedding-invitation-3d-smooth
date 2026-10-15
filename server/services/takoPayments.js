// Sinkronisasi pembayaran Tako → tabel payments → status undangan. Dipakai callback, cek status dari
// dashboard, dan rekonsiliasi berkala (callback Tako hanya dikirim sekali tanpa retry).
// Sumber kebenaran selalu GET /api/v1/transactions/{id}, bukan isi callback.
import pool from '../db.js'
import { sendActivationEmail } from './email.js'
import { buildPublicUrl } from './host.js'
import { transitionInvitation, withTransaction } from './invitationState.js'
import { getTakoTransaction, mapTakoStatus, takoConfigured } from './tako.js'

const FINAL = new Set(['received', 'failed', 'cancelled'])
export const OPEN_TTL_HOURS = 24

// Jalur status undangan menuju aktif (mesin status: draft/awaiting_payment → pending_verification → active).
const PATH_TO_ACTIVE = {
  draft: ['pending_verification', 'active'],
  awaiting_payment: ['pending_verification', 'active'],
  pending_verification: ['active'],
}

/**
 * Cek satu pembayaran Tako ke API lalu terapkan hasilnya. Idempoten.
 * @returns {{ status: string, activated: boolean }}
 */
export async function syncTakoPayment(paymentId) {
  const [rows] = await pool.query("SELECT * FROM payments WHERE id = ? AND provider = 'tako'", [paymentId])
  const current = rows[0]
  if (!current) return { status: 'missing', activated: false }
  if (FINAL.has(current.status)) return { status: current.status, activated: false }

  const tx = await getTakoTransaction(current.provider_order_id)
  let next = mapTakoStatus(tx.status)
  let note = null
  if (next === 'received' && Number(tx.amount) < Number(current.amount)) {
    // Nominal kurang dari harga paket: jangan aktifkan otomatis, biarkan admin memeriksa.
    next = 'pending'
    note = `amount ${tx.amount} < ${current.amount}`
  }

  const outcome = await withTransaction(async (connection) => {
    const [locked] = await connection.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [paymentId])
    const payment = locked[0]
    if (!payment || FINAL.has(payment.status)) return { status: payment?.status || 'missing', activated: false }
    const payload = { ...(parsePayload(payment.provider_payload)), transaction: tx, ...(note ? { note } : {}) }
    await connection.query(
      'UPDATE payments SET status = ?, provider_status = ?, provider_payload = ? WHERE id = ?',
      [next === 'pending' ? payment.status : next, tx.status || null, JSON.stringify(payload), payment.id],
    )
    if (next === 'received') {
      const activated = await activateInvitation(connection, payment)
      return { status: 'received', activated }
    }
    if (next === 'failed') await revertIfNoOpenPayment(connection, payment, `Pembayaran Tako ${tx.status}`)
    return { status: next === 'pending' ? payment.status : next, activated: false }
  })

  if (outcome.activated) void notifyActivated(current.invitation_id)
  return outcome
}

async function activateInvitation(connection, payment) {
  const [rows] = await connection.query(
    'SELECT status FROM invitations WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
    [payment.invitation_id],
  )
  const path = PATH_TO_ACTIVE[rows[0]?.status]
  if (!path) return false // sudah aktif, kedaluwarsa, dll.: pembayaran tetap tercatat untuk admin.
  await connection.query('UPDATE invitations SET payment_submitted_at = UTC_TIMESTAMP() WHERE id = ?', [payment.invitation_id])
  for (const toStatus of path) {
    await transitionInvitation({
      invitationId: payment.invitation_id,
      toStatus,
      actorType: 'system',
      reason: toStatus === 'active' ? 'Pembayaran Tako berhasil; aktif otomatis' : 'Pembayaran Tako diterima',
      paymentId: payment.id,
      connection,
    })
  }
  return true
}

async function revertIfNoOpenPayment(connection, payment, reason) {
  const [open] = await connection.query(
    "SELECT id FROM payments WHERE invitation_id = ? AND id <> ? AND status IN ('created', 'pending') LIMIT 1",
    [payment.invitation_id, payment.id],
  )
  if (open[0]) return
  const [rows] = await connection.query('SELECT status FROM invitations WHERE id = ? FOR UPDATE', [payment.invitation_id])
  if (rows[0]?.status !== 'awaiting_payment') return
  await transitionInvitation({ invitationId: payment.invitation_id, toStatus: 'draft', actorType: 'system', reason, paymentId: payment.id, connection })
}

async function notifyActivated(invitationId) {
  try {
    const [rows] = await pool.query(
      `SELECT i.slug, u.email, c.bride_name, c.groom_name
       FROM invitations i
       LEFT JOIN users u ON u.id = i.owner_user_id
       LEFT JOIN wedding_configs c ON c.invitation_id = i.id
       WHERE i.id = ?`,
      [invitationId],
    )
    const r = rows[0]
    if (r?.email) await sendActivationEmail(r.email, { bride_name: r.bride_name, groom_name: r.groom_name, public_url: buildPublicUrl(r.slug), slug: r.slug })
  } catch (error) {
    console.error('[Tako] activation email failed:', error.message)
  }
}

function parsePayload(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

/** Pembayaran Tako terbuka milik satu undangan (terbaru dulu). */
export async function openTakoPayments(invitationId) {
  const [rows] = await pool.query(
    `SELECT id FROM payments WHERE invitation_id = ? AND provider = 'tako' AND status IN ('created', 'pending')
       AND created_at > UTC_TIMESTAMP() - INTERVAL ? HOUR
     ORDER BY id DESC LIMIT 5`,
    [invitationId, OPEN_TTL_HOURS],
  )
  return rows.map((r) => Number(r.id))
}

/** Rekonsiliasi berkala: cek yang masih terbuka, batalkan yang lewat 24 jam. */
export async function reconcileTakoPayments() {
  if (!takoConfigured()) return
  const [open] = await pool.query(
    `SELECT id FROM payments WHERE provider = 'tako' AND status IN ('created', 'pending')
       AND created_at > UTC_TIMESTAMP() - INTERVAL ? HOUR ORDER BY id LIMIT 50`,
    [OPEN_TTL_HOURS],
  )
  for (const { id } of open) {
    try {
      await syncTakoPayment(Number(id))
    } catch (error) {
      console.error(`[Tako] reconcile payment ${id}:`, error.message)
    }
  }
  const [stale] = await pool.query(
    `SELECT * FROM payments WHERE provider = 'tako' AND status IN ('created', 'pending')
       AND created_at <= UTC_TIMESTAMP() - INTERVAL ? HOUR LIMIT 50`,
    [OPEN_TTL_HOURS],
  )
  for (const payment of stale) {
    try {
      await syncTakoPayment(Number(payment.id)) // dibayar di menit terakhir? tetap diproses.
      await withTransaction(async (connection) => {
        const [res] = await connection.query(
          "UPDATE payments SET status = 'cancelled' WHERE id = ? AND status IN ('created', 'pending')",
          [payment.id],
        )
        if (res.affectedRows) await revertIfNoOpenPayment(connection, payment, 'Pembayaran Tako kedaluwarsa (24 jam)')
      })
    } catch (error) {
      console.error(`[Tako] expire payment ${payment.id}:`, error.message)
    }
  }
}
