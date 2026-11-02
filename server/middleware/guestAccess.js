// Undangan privat: menentukan apa yang boleh dilihat pengunjung undangan (PLAN_UNDANGAN_PRIVAT.md §3.4).
// Dipasang SETELAH requirePublicInvitation (butuh req.invitation). Hasil: req.guestAccess.
import pool from '../db.js'
import { getUserSession } from '../userAuth.js'
import {
  accessLevel,
  clientIp,
  decideDevice,
  DEVICE_ID_PATTERN,
  hashIp,
  normalizeAccessCode,
  normalizeDeviceLimit,
  normalizePrivacyMode,
  sameCode,
} from '../services/guestAccess.js'

// Pembatas tebakan kode: maks 30 kode salah per IP per 10 menit (di memori; cukup untuk 1 instance api).
const BAD_CODE_LIMIT = 30
const BAD_CODE_WINDOW_MS = 10 * 60 * 1000
const badCodes = new Map() // ipHash -> { count, resetAt }

function tooManyBadCodes(ipHash, now) {
  const entry = badCodes.get(ipHash)
  return Boolean(entry && entry.resetAt > now && entry.count >= BAD_CODE_LIMIT)
}

function recordBadCode(ipHash, now) {
  const entry = badCodes.get(ipHash)
  if (!entry || entry.resetAt <= now) badCodes.set(ipHash, { count: 1, resetAt: now + BAD_CODE_WINDOW_MS })
  else entry.count++
  if (badCodes.size > 10_000) {
    for (const [key, value] of badCodes) if (value.resetAt <= now) badCodes.delete(key)
  }
}

async function loadPrivacy(invitationId) {
  try {
    const [rows] = await pool.query(
      'SELECT privacy_mode, privacy_general_code, privacy_device_limit FROM wedding_configs WHERE invitation_id = ?',
      [invitationId],
    )
    const row = rows[0] || {}
    return {
      mode: normalizePrivacyMode(row.privacy_mode),
      generalCode: row.privacy_general_code || null,
      deviceLimit: normalizeDeviceLimit(row.privacy_device_limit),
    }
  } catch (error) {
    // Migration 022 belum dijalankan: perilaku lama (publik).
    if (error?.code === 'ER_BAD_FIELD_ERROR') return { mode: 'public', generalCode: null, deviceLimit: null }
    throw error
  }
}

async function checkDevice(req, contactId, limit, ipHash, countOpen) {
  const header = req.get('x-invite-device') || ''
  const deviceId = DEVICE_ID_PATTERN.test(header) ? header : `ip-${ipHash}`
  const [rows] = await pool.query(
    `SELECT device_id, ip_hash, counts_slot, UNIX_TIMESTAMP(first_seen_at) * 1000 AS first_seen_ms
     FROM invitation_contact_devices WHERE contact_id = ?`,
    [contactId],
  )
  const devices = rows.map((d) => ({ ...d, first_seen_ms: Number(d.first_seen_ms) }))
  const decision = decideDevice({ limit, devices, deviceId, ipHash })
  if (decision.action === 'register') {
    await pool.query(
      `INSERT IGNORE INTO invitation_contact_devices (contact_id, device_id, ip_hash, counts_slot)
       VALUES (?, ?, ?, ?)`,
      [contactId, deviceId, ipHash, decision.countsSlot ? 1 : 0],
    )
  } else if (decision.action === 'known' && countOpen) {
    await pool.query(
      'UPDATE invitation_contact_devices SET last_seen_at = CURRENT_TIMESTAMP WHERE contact_id = ? AND device_id = ?',
      [contactId, deviceId],
    )
  }
  return decision.action !== 'deny'
}

/**
 * → { mode, level, credential, guest, reason }
 * countOpen: hanya untuk /api/config (sekali per buka halaman) — mencatat statistik buka/ditolak.
 */
export async function computeGuestAccess(req, { countOpen = false } = {}) {
  const invitation = req.invitation
  const privacy = await loadPrivacy(invitation.id)
  const now = Date.now()
  const ipHash = hashIp(clientIp(req), String(invitation.id))
  const code = normalizeAccessCode(req.get('x-invite-key') || req.query?.k)
  let credential = null
  let guest = null
  let reason = null

  if (code && !tooManyBadCodes(ipHash, now)) {
    let contact = null
    try {
      const [rows] = await pool.query(
        'SELECT id, name, gender, revoked_at FROM invitation_contacts WHERE invitation_id = ? AND access_code = ? LIMIT 1',
        [invitation.id, code],
      )
      contact = rows[0] || null
    } catch (error) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
    }

    if (contact && contact.revoked_at) {
      reason = 'LINK_REVOKED'
    } else if (contact) {
      let allowed = true
      // Batas perangkat hanya berarti di mode privat; di mode publik undangan terbuka tanpa kode.
      if (privacy.mode !== 'public' && privacy.deviceLimit != null) {
        allowed = await checkDevice(req, contact.id, privacy.deviceLimit, ipHash, countOpen)
      }
      if (allowed) {
        credential = 'guest'
        guest = { name: contact.name, gender: contact.gender === 'f' ? 'f' : 'm' }
        if (countOpen) {
          await pool.query(
            `UPDATE invitation_contacts
             SET open_count = open_count + 1,
                 first_opened_at = COALESCE(first_opened_at, CURRENT_TIMESTAMP),
                 last_opened_at = CURRENT_TIMESTAMP
             WHERE id = ? AND (last_opened_at IS NULL OR last_opened_at < CURRENT_TIMESTAMP - INTERVAL 30 MINUTE)`,
            [contact.id],
          )
        }
      } else {
        reason = 'DEVICE_LIMIT'
        if (countOpen) await pool.query('UPDATE invitation_contacts SET denied_count = denied_count + 1 WHERE id = ?', [contact.id])
      }
    } else if (sameCode(code, privacy.generalCode)) {
      credential = 'general'
    } else {
      recordBadCode(ipHash, now)
      reason = 'INVALID_CODE'
    }
  }

  // Pemilik yang login (pratinjau dashboard) selalu melihat undangan lengkap.
  if (!credential && privacy.mode !== 'public') {
    const user = await getUserSession(req).catch(() => null)
    if (user && user.id === invitation.owner_user_id) {
      credential = 'owner'
      reason = null
    }
  }

  return { mode: privacy.mode, level: accessLevel(privacy.mode, credential), credential, guest, reason }
}

function markPersonalized(res) {
  // Respons bergantung pada kode/perangkat/cookie: jangan pernah disimpan Cloudflare atau service worker.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Vary', 'X-Invite-Key, X-Invite-Device, Cookie')
}

export function resolveGuestAccess({ countOpen = false } = {}) {
  return async (req, res, next) => {
    try {
      markPersonalized(res)
      req.guestAccess = await computeGuestAccess(req, { countOpen })
      next()
    } catch (error) {
      next(error)
    }
  }
}

const RANK = { none: 0, limited: 1, full: 2 }

/** Tolak bila level akses di bawah minimum (mis. buku tamu butuh `full`). */
export function requireGuestLevel(minimum) {
  return (req, res, next) => {
    const level = req.guestAccess?.level || 'full'
    if (RANK[level] >= RANK[minimum]) return next()
    markPersonalized(res)
    return res.status(403).json({
      error: { code: 'INVITATION_PRIVATE', message: 'Bagian ini khusus tamu undangan. Buka lewat link yang dikirim mempelai.' },
    })
  }
}
