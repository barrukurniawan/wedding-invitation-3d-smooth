import { Router } from 'express'
import { createHash } from 'node:crypto'
import pool from '../db.js'
import { transitionInvitation, withTransaction } from '../services/invitationState.js'

const router = Router()

function verifySignature(notification) {
  const { order_id, status_code, gross_amount } = notification
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  if (!serverKey) return false
  const raw = `${order_id}${status_code}${gross_amount}${serverKey}`
  const expected = createHash('sha512').update(raw).digest('hex')
  return notification.signature_key === expected
}

router.post('/webhook', async (req, res, next) => {
  try {
    const notification = req.body

    if (!notification?.order_id) {
      return res.status(400).send('Invalid payload')
    }

    // Verify Midtrans signature to prevent spoofing
    if (!verifySignature(notification)) {
      console.warn('Midtrans webhook: invalid signature for order', notification.order_id)
      return res.status(403).send('Forbidden')
    }

    const { order_id: orderId, transaction_status, fraud_status, gross_amount, status_code } = notification

    // Parse invitation ID from order ID format: "inv_{id}_{timestamp}"
    const match = orderId.match(/^inv_(\d+)_/)
    if (!match) {
      console.warn('Midtrans webhook: unrecognized orderId format:', orderId)
      return res.status(200).send('OK') // Acknowledge but ignore unknown orders
    }
    const invId = Number(match[1])
    await withTransaction(async (connection) => {
      const [paymentRows] = await connection.query(
        `SELECT id, invitation_id, amount, status FROM payments
         WHERE provider = 'midtrans' AND provider_order_id = ? FOR UPDATE`,
        [orderId],
      )
      const payment = paymentRows[0]
      if (!payment || Number(payment.invitation_id) !== invId) {
        console.warn('Midtrans webhook: payment record not found for order', orderId)
        return
      }
      if (Number(payment.amount) !== Number(gross_amount)) {
        console.warn('Midtrans webhook: amount mismatch for order', orderId)
        return
      }

      const received = transaction_status === 'settlement'
        || (transaction_status === 'capture' && fraud_status !== 'challenge')
      const failed = ['cancel', 'deny', 'expire'].includes(transaction_status)
      const paymentStatus = received ? 'received' : failed ? 'failed' : 'pending'
      if (payment.status === paymentStatus && paymentStatus !== 'pending') return
      await connection.query(
        `UPDATE payments
         SET status = ?, provider_status = ?, provider_payload = ?
         WHERE id = ?`,
        [paymentStatus, transaction_status, JSON.stringify({ order_id: orderId, status_code, transaction_status, fraud_status }), payment.id],
      )

      if (received) {
        await connection.query(
          `UPDATE invitations SET payment_submitted_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL`,
          [invId],
        )
        await transitionInvitation({
          invitationId: invId,
          toStatus: 'pending_verification',
          actorType: 'system',
          reason: `Midtrans payment ${transaction_status}; menunggu verifikasi admin`,
          paymentId: payment.id,
          connection,
        })
      } else if (failed) {
        await transitionInvitation({
          invitationId: invId,
          toStatus: 'draft',
          actorType: 'system',
          reason: `Midtrans payment ${transaction_status}`,
          paymentId: payment.id,
          connection,
        })
      }
    })

    res.status(200).send('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    next(error)
  }
})

export default router
