import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import pool from '../db.js'
import { RESERVED_SLUGS, SLUG_PATTERN } from '../services/host.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const trackSchema = z.object({
  slug: z
    .string()
    .regex(SLUG_PATTERN)
    .max(64)
    .refine((slug) => !RESERVED_SLUGS.has(slug))
    .nullish(),
  path: z.string().max(255).regex(/^\/[^\s]*$/),
  visitId: z.string().regex(UUID_PATTERN),
  referrer: z.string().max(512).nullish(),
})

export function parseTrackPayload(body) {
  const parsed = trackSchema.safeParse({
    slug: typeof body?.slug === 'string' && body.slug !== '' ? body.slug : null,
    path: typeof body?.path === 'string' ? body.path : undefined,
    visitId: typeof body?.visitId === 'string' ? body.visitId : undefined,
    referrer: typeof body?.referrer === 'string' && body.referrer !== '' ? body.referrer.slice(0, 512) : null,
  })
  return parsed.success ? parsed.data : null
}

const trackLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false })

const router = Router()

router.post('/', trackLimit, (req, res) => {
  const data = parseTrackPayload(req.body)
  res.status(204).end()
  if (!data) return

  const hostSlug = req.hostContext?.type === 'invitation' ? req.hostContext.slug : null
  const slug = hostSlug || data.slug
  if (!slug) {
    void pool
      .query('INSERT INTO visitor_events (invitation_id, slug, path, visit_id, referrer) VALUES (NULL, NULL, ?, ?, ?)', [
        data.path.slice(0, 255),
        data.visitId.toLowerCase(),
        data.referrer,
      ])
      .catch(() => {})
    return
  }

  void pool
    .query('SELECT id FROM invitations WHERE slug = ? AND deleted_at IS NULL LIMIT 1', [slug])
    .then(([rows]) => {
      const invitationId = rows[0] ? rows[0].id : null
      return pool.query(
        'INSERT INTO visitor_events (invitation_id, slug, path, visit_id, referrer) VALUES (?, ?, ?, ?, ?)',
        [invitationId, slug, data.path.slice(0, 255), data.visitId.toLowerCase(), data.referrer],
      )
    })
    .catch(() => {})
})

export default router
