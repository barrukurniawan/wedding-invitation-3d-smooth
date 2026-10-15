import { Router } from 'express'
import pool from '../db.js'
import { verifyTakoSignature } from '../services/tako.js'
import { syncTakoPayment } from '../services/takoPayments.js'

// Callback Tako (Callback URL di dashboard API Key): POST satu kali per pembayaran sukses, tanpa retry.
// Isi callback tidak dipercaya begitu saja: status selalu dicek ulang ke API Tako (syncTakoPayment).
const router = Router()

router.post('/callback', async (req, res) => {
  const secret = process.env.TAKO_CALLBACK_SECRET
  if (secret && !verifyTakoSignature({ rawBody: req.rawBody, body: req.body, signature: req.get('x-tako-signature'), secret })) {
    console.warn('[Tako] callback with invalid signature rejected')
    return res.status(403).json({ ok: false })
  }
  const transactionId = req.body?.data?.id
  if (req.body?.event !== 'payment.success' || typeof transactionId !== 'string') {
    return res.status(200).json({ ok: true, ignored: true })
  }
  try {
    const [rows] = await pool.query("SELECT id FROM payments WHERE provider = 'tako' AND provider_order_id = ? LIMIT 1", [transactionId])
    if (!rows[0]) return res.status(200).json({ ok: true, ignored: true }) // bukan dari MarryMe (mis. hadiah biasa)
    const result = await syncTakoPayment(Number(rows[0].id))
    res.status(200).json({ ok: true, status: result.status })
  } catch (error) {
    // Tako tidak mengulang callback; rekonsiliasi berkala akan memprosesnya.
    console.error('[Tako] callback processing failed:', error.message)
    res.status(200).json({ ok: true, deferred: true })
  }
})

export default router
