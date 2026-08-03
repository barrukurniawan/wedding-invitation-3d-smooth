import { Router } from 'express'
import pool from '../db.js'

const router = Router()

router.post('/webhook', async (req, res, next) => {
  try {
    const notification = req.body

    // Simple webhook processing for Midtrans
    // In production, we should verify signature key:
    // sha512(order_id + status_code + gross_amount + ServerKey)

    const orderId = notification.order_id
    const transactionStatus = notification.transaction_status
    const fraudStatus = notification.fraud_status

    if (!orderId) {
      return res.status(400).send('Invalid payload')
    }

    let paymentStatus = ''

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        paymentStatus = 'challenge'
      } else if (fraudStatus === 'accept') {
        paymentStatus = 'success'
      }
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'success'
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      paymentStatus = 'failed'
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'pending'
    }

    if (paymentStatus === 'success') {
      // Aktifkan undangan
      // orderId corresponds to invitation.id (e.g. inv_123)
      const invId = orderId.replace('inv_', '')
      await pool.query(
        `UPDATE invitations
         SET status = 'active',
             payment_submitted_at = UTC_TIMESTAMP(),
             activated_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [invId]
      )
    }

    res.status(200).send('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).send('Internal Server Error')
  }
})

export default router
