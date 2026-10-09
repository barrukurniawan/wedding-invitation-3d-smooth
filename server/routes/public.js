// Endpoint publik tanpa login untuk landing page: harga/promo dan angka bukti sosial.
import { Router } from 'express'
import pool from '../db.js'
import { pricingInfo } from '../services/pricing.js'

const router = Router()
const STATS_TTL_MS = 5 * 60 * 1000
let statsCache = { at: 0, value: null }

router.get('/pricing', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.json(pricingInfo())
})

// Hanya angka agregat (tanpa data pribadi), di-cache 5 menit supaya ringan.
router.get('/stats', async (req, res, next) => {
  try {
    if (!statsCache.value || Date.now() - statsCache.at > STATS_TTL_MS) {
      const [[couples], [visits], [wishes]] = await Promise.all([
        pool.query("SELECT COUNT(*) AS n FROM invitations WHERE deleted_at IS NULL AND status = 'active'"),
        pool.query('SELECT COUNT(*) AS n FROM visitor_events WHERE slug IS NOT NULL'),
        pool.query("SELECT COUNT(*) AS n FROM guestbook_entries WHERE status <> 'deleted'"),
      ])
      statsCache = {
        at: Date.now(),
        value: { couples: Number(couples[0]?.n || 0), guestVisits: Number(visits[0]?.n || 0), wishes: Number(wishes[0]?.n || 0) },
      }
    }
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(statsCache.value)
  } catch (error) {
    next(error)
  }
})

export default router
