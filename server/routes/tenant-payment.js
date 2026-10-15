import { Router } from 'express'
import pool from '../db.js'
import { requireCsrf, requireUser } from '../userAuth.js'
import { midtransConfigured, snap } from '../services/midtrans.js'
import { buildPublicUrl } from '../services/host.js'
import { randomUUID } from 'node:crypto'
import { transitionInvitation, withTransaction } from '../services/invitationState.js'
import { invitationPriceIdr, paymentMode } from '../services/paymentConfig.js'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { TAKO_METHODS, TakoError, createTakoGift, takoConfigured } from '../services/tako.js'
import { openTakoPayments, syncTakoPayment } from '../services/takoPayments.js'
import { isFreeForUser } from '../services/freePlan.js'

const router = Router()
const PAYMENT_MODE = paymentMode()
const PACKAGE_AMOUNT = invitationPriceIdr()

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
      if (PACKAGE_AMOUNT === null || !Number.isInteger(PACKAGE_AMOUNT)) {
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

// ── Tako (tako.id): pembayaran online otomatis ──────────────────────────────────────
const takoLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `tako:${req.user.id}`,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu sering membuat pembayaran. Coba lagi beberapa menit lagi.' } },
})
const takoSchema = z.object({ method: z.enum(TAKO_METHODS) }).strict()
const REUSE_MINUTES = 30

async function ownerInvitation(userId) {
  const [rows] = await pool.query(
    'SELECT id, slug, status FROM invitations WHERE owner_user_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1',
    [userId],
  )
  return rows[0] || null
}

function takoPayload(row) {
  try {
    return typeof row.provider_payload === 'string' ? JSON.parse(row.provider_payload) : row.provider_payload || {}
  } catch {
    return {}
  }
}

router.post('/payment/tako', requireUser, requireCsrf, takoLimit, async (req, res, next) => {
  const parsed = takoSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Pilih metode pembayaran.' } })
  const method = parsed.data.method
  try {
    if (paymentMode() !== 'tako') {
      return res.status(409).json({ error: { code: 'TAKO_DISABLED', message: 'Pembayaran online belum dibuka.' } })
    }
    const amount = invitationPriceIdr()
    if (!takoConfigured() || !Number.isInteger(amount) || amount <= 0) {
      return res.status(503).json({ error: { code: 'PAYMENT_NOT_CONFIGURED', message: 'Pembayaran online belum dikonfigurasi.' } })
    }
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    if (await isFreeForUser(req.user.id)) {
      // Akun yang mendaftar di masa gratis tidak pernah ditagih; dashboard mengaktifkannya otomatis.
      return res.status(409).json({ error: { code: 'FREE_PLAN', message: 'Akun kamu termasuk paket gratis. Muat ulang dashboard untuk mengaktifkan undangan.' } })
    }
    if (!['draft', 'awaiting_payment', 'pending_verification'].includes(invitation.status)) {
      return res.status(409).json({ error: { code: 'NOT_PAYABLE', message: 'Undangan ini tidak memerlukan pembayaran.' } })
    }

    // Tagihan yang sama (metode & nominal) dalam 30 menit terakhir dipakai ulang supaya tidak dobel.
    const [recent] = await pool.query(
      `SELECT * FROM payments WHERE invitation_id = ? AND provider = 'tako' AND status = 'created'
         AND amount = ? AND created_at > UTC_TIMESTAMP() - INTERVAL ? MINUTE
       ORDER BY id DESC`,
      [invitation.id, amount, REUSE_MINUTES],
    )
    const reusable = recent.find((row) => takoPayload(row).method === method && takoPayload(row).paymentUrl)
    if (reusable) return res.json({ paymentId: Number(reusable.id), paymentUrl: takoPayload(reusable).paymentUrl, reused: true })

    const gift = await createTakoGift({
      name: req.user.displayName || 'Pengguna MarryMe',
      email: req.user.email || 'admin@marryme.web.id',
      amount,
      paymentMethod: method,
      message: `MarryMe #${invitation.id} ${invitation.slug}`,
    })
    const paymentId = await withTransaction(async (connection) => {
      if (invitation.status === 'draft') {
        await transitionInvitation({
          invitationId: invitation.id,
          toStatus: 'awaiting_payment',
          actorType: 'user',
          actorId: req.user.id,
          reason: `Pembayaran Tako dibuat (${method})`,
          connection,
        })
      }
      const [result] = await connection.query(
        `INSERT INTO payments (invitation_id, provider, provider_order_id, amount, status, provider_status, provider_payload)
         VALUES (?, 'tako', ?, ?, 'created', 'pending', ?)`,
        [invitation.id, gift.transactionId, amount, JSON.stringify({ method, giftId: gift.giftId, paymentUrl: gift.paymentUrl })],
      )
      return Number(result.insertId)
    })
    res.status(201).json({ paymentId, paymentUrl: gift.paymentUrl, reused: false })
  } catch (error) {
    if (error instanceof TakoError) {
      console.error('[Tako] create payment failed:', error.status, error.message)
      const message = error.status === 429
        ? 'Terlalu sering. Tunggu sebentar lalu coba lagi.'
        : error.status === 400
          ? `Tako menolak pembayaran: ${error.message}`
          : 'Layanan pembayaran sedang bermasalah. Coba lagi beberapa saat lagi.'
      return res.status(error.status === 429 ? 429 : 502).json({ error: { code: 'TAKO_ERROR', message } })
    }
    next(error)
  }
})

// Dipanggil dashboard saat menunggu/kembali dari halaman bayar Tako: cek langsung ke API Tako
// (menutup risiko callback yang hilang) lalu kembalikan status terbaru.
router.get('/payment/tako/status', requireUser, async (req, res, next) => {
  try {
    const invitation = await ownerInvitation(req.user.id)
    if (!invitation) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' } })
    if (takoConfigured()) {
      for (const id of await openTakoPayments(invitation.id)) {
        try {
          await syncTakoPayment(id)
        } catch (error) {
          console.error(`[Tako] status check payment ${id}:`, error.message)
        }
      }
    }
    const [[latest]] = await pool.query(
      `SELECT id, status, provider_status, provider_payload, UNIX_TIMESTAMP(created_at) AS created_epoch
       FROM payments WHERE invitation_id = ? AND provider = 'tako' ORDER BY id DESC LIMIT 1`,
      [invitation.id],
    )
    const [[inv]] = await pool.query('SELECT status FROM invitations WHERE id = ?', [invitation.id])
    res.json({
      invitationStatus: inv.status,
      payment: latest
        ? {
            id: Number(latest.id),
            status: latest.status,
            providerStatus: latest.provider_status,
            method: takoPayload(latest).method || null,
            paymentUrl: ['created', 'pending'].includes(latest.status) ? takoPayload(latest).paymentUrl || null : null,
            created_at: new Date(Number(latest.created_epoch) * 1000).toISOString(),
          }
        : null,
    })
  } catch (error) {
    next(error)
  }
})

export default router
