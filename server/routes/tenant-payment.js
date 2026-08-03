import { Router } from 'express'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { snap } from '../services/midtrans.js'
import { buildPublicUrl } from '../services/host.js'

const router = Router()

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
      const orderId = `inv_${req.userInvitationId}_${Date.now()}`
      
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: 150000 // Harga paket undangan
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
      
      // Update status menjadi awaiting_payment
      await pool.query(
        `UPDATE invitations
         SET status = 'awaiting_payment'
         WHERE id = ?`,
        [req.userInvitationId],
      )

      res.json({ token: transaction.token, redirect_url: transaction.redirect_url })
    } catch (error) {
      next(error)
    }
  },
)

export default router
