// Paket gratis per akun: akun yang mendaftar saat INVITATION_PRICE_IDR = 0 tidak pernah dikenai biaya,
// meski harga kemudian dinaikkan (users.free_plan, migrasi 020).
import pool from '../db.js'
import { invitationPriceIdr } from './paymentConfig.js'

/** Nilai free_plan untuk akun yang baru mendaftar sekarang. */
export function freePlanForNewUser(env = process.env) {
  return invitationPriceIdr(env) === 0 ? 1 : 0
}

/** Gratis bila harga saat ini Rp0, atau akun mendaftar di masa gratis. */
export async function isFreeForUser(userId, connection = pool, env = process.env) {
  if (invitationPriceIdr(env) === 0) return true
  const [rows] = await connection.query('SELECT free_plan FROM users WHERE id = ?', [userId])
  return Number(rows[0]?.free_plan) === 1
}
