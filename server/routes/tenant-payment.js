import { Router } from 'express'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { midtransConfigured, snap } from '../services/midtrans.js'
import { buildPublicUrl } from '../services/host.js'
import { randomUUID } from 'node:crypto'
import { transitionInvitation, withTransaction } from '../services/invitationState.js'

const router = Router()
const PAYMENT_MODE = (process.env.PAYMENT_MODE || 'manual').toLowerCase()
const PACKAGE_AMOUNT = Number(process.env.INVITATION_PRICE_IDR ?? 0)

function serializeInvitation(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    status: row.status,
    payment_proof_url: row.payment_proof_url || null,
    payment_submitted_at: row.payment_submitted_at ? String(row.payment_submitted_at).replace(' ', 'T') : null,
    reception_at: String(row.reception_at).replace(' ', 'T'),
    timezone: row.timezone,
    expires_at: String(row.expires_at).replace(' ', 'T'),
    retention_until: String(row.retention_until).replace(' ', 'T'),
    activated_at: row.activated_at ? String(row.activated_at).replace(' ', 'T') : null,
    public_url: buildPublicUrl(row.slug),
    config: row.bride_name == null ? null : {
      bride_name: row.bride_name,
      groom_name: row.groom_name,
      wedding_date: String(row.wedding_date).replace(' ', 'T'),
      resepsi_date: row.resepsi_date,
      resepsi_time: row.resepsi_time,
      resepsi_location: row.resepsi_location,
    },
  }
}

async function prepareInvitation(req, res, next) {
  try {
    const [invRows] = await pool.query(
      `SELECT id FROM invitations WHERE owner_user_id = ? AND status != 'deleted'`,
      [req.user.id],
    )
    if (invRows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    }
    const invitation = invRows[0]
    req.userInvitationId = invitation.id
    next()
  } catch (err) {
    next(err)
  }
}

router.post(
  '/payment/checkout',
  requireUser,
  requireCsrf,
  prepareInvitation,
  async (req, res, next) => {
    try {
      // 1. Create a transaction on Midtrans
      if (PAYMENT_MODE !== 'midtrans') {
        return res.status(409).json({ error: { code: 'MANUAL_PAYMENT_ONLY', message: 'Pembayaran online tidak digunakan. Silakan kirim konfirmasi manual.' } })
      }
      if (!midtransConfigured()) {
        return res.status(503).json({ error: { code: 'PAYMENT_NOT_CONFIGURED', message: 'Pembayaran online belum dikonfigurasi.' } })
      }
      if (!Number.isInteger(PACKAGE_AMOUNT) || PACKAGE_AMOUNT < 0) {
        return res.status(503).json({ error: { code: 'PAYMENT_NOT_CONFIGURED', message: 'Paket pembayaran belum dikonfigurasi.' } })
      }

      const [activePayments] = await pool.query(
        `SELECT id FROM payments
         WHERE invitation_id = ? AND provider = 'midtrans'
           AND status IN ('created', 'pending', 'received')
         ORDER BY id DESC LIMIT 1`,
        [req.userInvitationId],
      )
      if (activePayments[0]) {
        return res.status(409).json({ error: { code: 'PAYMENT_IN_PROGRESS', message: 'Pembayaran sebelumnya masih diproses.' } })
      }

      const orderId = `inv_${req.userInvitationId}_${Date.now()}_${randomUUID().slice(0, 8)}`
      
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: PACKAGE_AMOUNT,
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: req.user.displayName,
          email: req.user.email,
        }
      }

      const transaction = await snap.createTransaction(parameter)

      await withTransaction(async (connection) => {
        await transitionInvitation({
          invitationId: req.userInvitationId,
          toStatus: 'awaiting_payment',
          actorType: 'user',
          actorId: req.user.id,
          reason: 'Midtrans checkout dibuat',
          connection,
        })
        await connection.query(
          `INSERT INTO payments
             (invitation_id, provider, provider_order_id, amount, status, provider_status)
           VALUES (?, 'midtrans', ?, ?, 'created', 'pending')`,
          [req.userInvitationId, orderId, PACKAGE_AMOUNT],
        )
      })

      res.json({ token: transaction.token, redirect_url: transaction.redirect_url })
    } catch (error) {
      next(error)
    }
  },
)

export default router
