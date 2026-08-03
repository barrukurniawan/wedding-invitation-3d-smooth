import { Router } from 'express'
import { createHash } from 'node:crypto'
import pool from '../db.js'

const router = Router()

function verifySignature(notification) {
  const { order_id, status_code, gross_amount } = notification
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  if (!serverKey) return true // Skip verification if no key configured (dev mode)
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

    const { order_id: orderId, transaction_status, fraud_status } = notification

    // Parse invitation ID from order ID format: "inv_{id}_{timestamp}"
    const match = orderId.match(/^inv_(\d+)_/)
    if (!match) {
      console.warn('Midtrans webhook: unrecognized orderId format:', orderId)
      return res.status(200).send('OK') // Acknowledge but ignore unknown orders
    }
    const invId = match[1]

    let newStatus = null

    if (transaction_status === 'capture') {
      newStatus = fraud_status === 'challenge' ? null : 'pending_verification'
    } else if (transaction_status === 'settlement') {
      // Auto-activate on settlement (card payments)
      newStatus = 'active'
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      // Revert back to draft so user can retry
      newStatus = 'draft'
    }
    // 'pending' — no status change needed

    if (newStatus === 'active') {
      await pool.query(
        `UPDATE invitations
         SET status = 'active',
             payment_submitted_at = UTC_TIMESTAMP(),
             activated_at = UTC_TIMESTAMP()
         WHERE id = ? AND deleted_at IS NULL`,
        [invId],
      )
      console.log(`Midtrans: invitation ${invId} activated via webhook`)
    } else if (newStatus === 'pending_verification') {
      await pool.query(
        `UPDATE invitations
         SET status = 'pending_verification',
             payment_submitted_at = UTC_TIMESTAMP()
         WHERE id = ? AND deleted_at IS NULL`,
        [invId],
      )
      console.log(`Midtrans: invitation ${invId} set to pending_verification`)
    } else if (newStatus === 'draft') {
      await pool.query(
        `UPDATE invitations SET status = 'draft' WHERE id = ? AND status = 'awaiting_payment' AND deleted_at IS NULL`,
        [invId],
      )
      console.log(`Midtrans: invitation ${invId} reverted to draft (payment ${transaction_status})`)
    }

    res.status(200).send('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    next(error)
  }
})

export default router
