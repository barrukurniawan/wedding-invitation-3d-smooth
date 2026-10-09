// Chat bantuan: validasi dan bentuk data bersama untuk rute pengguna dan admin.
import { z } from 'zod'
import pool from '../db.js'

export const MAX_MESSAGE_LENGTH = 2000
const PAGE_SIZE = 100

export const messageSchema = z.object({
  body: z.string().trim().min(1, 'Pesan tidak boleh kosong.').max(MAX_MESSAGE_LENGTH, `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`),
  context: z.string().trim().max(255).optional(),
}).strict()

export const afterSchema = z.object({ after: z.coerce.number().int().min(0).default(0) })

export function serializeMessage(row) {
  return {
    id: Number(row.id),
    sender: row.sender,
    body: row.body,
    context: row.context || null,
    read: row.read_at != null,
    created_at: new Date(Number(row.created_epoch) * 1000).toISOString(),
  }
}

// Pesan satu percakapan: 100 terakhir, atau hanya yang lebih baru dari `after` (polling).
export async function listMessages(userId, after) {
  const columns = 'id, sender, body, context, read_at, UNIX_TIMESTAMP(created_at) AS created_epoch'
  const [rows] = after > 0
    ? await pool.query(`SELECT ${columns} FROM support_messages WHERE user_id = ? AND id > ? ORDER BY id ASC LIMIT 200`, [userId, after])
    : await pool.query(`SELECT * FROM (SELECT ${columns} FROM support_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?) t ORDER BY id ASC`, [userId, PAGE_SIZE])
  return rows.map(serializeMessage)
}

// Tandai pesan dari pihak lawan sudah dibaca.
export async function markRead(userId, fromSender) {
  await pool.query(
    'UPDATE support_messages SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND sender = ? AND read_at IS NULL',
    [userId, fromSender],
  )
}

export async function insertMessage(userId, sender, body, context = null) {
  const [result] = await pool.query(
    'INSERT INTO support_messages (user_id, sender, body, context) VALUES (?, ?, ?, ?)',
    [userId, sender, body, context],
  )
  const [rows] = await pool.query(
    'SELECT id, sender, body, context, read_at, UNIX_TIMESTAMP(created_at) AS created_epoch FROM support_messages WHERE id = ?',
    [result.insertId],
  )
  return serializeMessage(rows[0])
}

// Tabel belum ada (migrasi 016 belum jalan): balas 503 yang jelas, bukan 500.
export function notMigrated(res, error) {
  if (error?.code !== 'ER_NO_SUCH_TABLE') return false
  res.status(503).json({ error: { code: 'SUPPORT_NOT_MIGRATED', message: 'Fitur chat belum aktif di database. Jalankan migration terbaru.' } })
  return true
}
