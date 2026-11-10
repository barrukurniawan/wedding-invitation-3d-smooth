import express from 'express'
import crypto from 'node:crypto'
import pool from '../db.js'
import { assetCdnBase } from '../services/assetCdn.js'
import { publicGiftShipping } from '../services/giftShipping.js'
import { characterStyleAssets } from '../services/characterStyles.js'
import { eventTitles } from '../services/eventTitles.js'
import { requirePublicInvitation } from '../middleware/tenant.js'
import { computeGuestAccess } from '../middleware/guestAccess.js'
import { clientIp, normalizeAccessCode, publicAccessInfo, resolveSite } from '../services/guestAccess.js'
import { normalizeWish, toWishItem } from '../services/wishes2d.js'
import { validateGuestbookContent } from '../services/profanityFilter.js'

const router = express.Router()

// ── Akses (PLAN_UNDANGAN_PRIVAT.md) ─────────────────────────────────────────────────────
// Slug TIDAK lagi diambil dari parameter `site` klien (dulu siapa pun bisa membaca data undangan
// lain lewat ?site=slug-lain). Subdomain undangan → slug dari host + aturan akses tamu;
// domain utama → hanya demo. Hasil dicache 30 dtk per pengunjung karena /sync dipanggil terus-menerus.
const ACCESS_RANK = { none: 0, limited: 1, full: 2 }
const ACCESS_CACHE_TTL_MS = 30_000
const accessCache = new Map() // key -> { expires, invitation, invitationTrial, guestAccess }

function accessCacheKey(req, site) {
  const code = normalizeAccessCode(req.get('x-invite-key') || req.query?.k) || ''
  const device = String(req.get('x-invite-device') || '').slice(0, 64)
  const session = req.cookies ? Object.keys(req.cookies).sort().map((k) => `${k}=${req.cookies[k]}`).join(';') : ''
  return crypto.createHash('sha256').update(`${site}|${code}|${device}|${req.get('cf-connecting-ip') || req.ip}|${session}`).digest('hex')
}

function privateError(res) {
  res.setHeader('Cache-Control', 'no-store, private')
  return res.status(403).json({ error: 'Bagian ini khusus tamu undangan.', code: 'INVITATION_PRIVATE' })
}

function siteAccess(minimum = 'none') {
  return (req, res, next) => {
    const site = resolveSite(req.hostContext)
    req.site = site
    if (req.hostContext?.type !== 'invitation') {
      req.guestAccess = { mode: 'public', level: 'full', credential: null, guest: null, reason: null }
      return next()
    }
    res.setHeader('Vary', 'X-Invite-Key, X-Invite-Device, Cookie')
    const now = Date.now()
    const key = accessCacheKey(req, site)
    const cached = accessCache.get(key)
    const finish = () => (ACCESS_RANK[req.guestAccess.level] >= ACCESS_RANK[minimum] ? next() : privateError(res))
    if (cached && cached.expires > now) {
      req.invitation = cached.invitation
      req.invitationTrial = cached.invitationTrial
      req.guestAccess = cached.guestAccess
      return finish()
    }
    requirePublicInvitation(req, res, async (err) => {
      if (err) return next(err)
      try {
        req.guestAccess = await computeGuestAccess(req)
        if (accessCache.size > 5000) {
          for (const [k, v] of accessCache) if (v.expires <= now) accessCache.delete(k)
        }
        accessCache.set(key, {
          expires: now + ACCESS_CACHE_TTL_MS,
          invitation: req.invitation,
          invitationTrial: req.invitationTrial,
          guestAccess: req.guestAccess,
        })
        finish()
      } catch (error) {
        next(error)
      }
    })
  }
}

// In-memory fallback store for offline development and lightning-fast state sync
const memoryPlayers = new Map() // site -> Map(id -> { id, token, site, state, name, character, message, message_at, seen })
const memoryWishes = new Map() // site -> Array({ id, name, message, hidden, created_at, request_id })

const dirs = new Set(['north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'])

function sanitizePoint(p) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !dirs.has(p.dir)) {
    throw new Error('invalid coordinates or direction')
  }
  return {
    x: Math.max(0, Math.min(1536, p.x)),
    y: Math.max(0, Math.min(1024, p.y)),
    dir: p.dir,
    walking: Boolean(p.walking),
  }
}

function sanitizeState(p) {
  const name = String(p.name || '').trim().slice(0, 24)
  const character = ['men', 'woman', 'pair'].includes(p.character) ? p.character : 'men'
  if (!name) throw new Error('invalid player name')
  return {
    ...sanitizePoint(p),
    name,
    character,
    companion: character === 'pair' && p.companion ? sanitizePoint(p.companion) : null,
  }
}

// Cleanup stale players periodically (older than 30s)
function cleanupMemoryPlayers(now) {
  for (const [site, siteMap] of memoryPlayers.entries()) {
    for (const [id, player] of siteMap.entries()) {
      if (player.seen < now - 30_000) {
        siteMap.delete(id)
      }
    }
    if (siteMap.size === 0) {
      memoryPlayers.delete(site)
    }
  }
}

// POST /join
router.post(['/join', '/api/join'], siteAccess('limited'), async (req, res) => {
  try {
    const body = req.body || {}
    const now = Date.now()
    const site = req.site
    
    let state
    try {
      state = sanitizeState(body)
    } catch {
      return res.status(400).json({ error: 'Nama atau karakter tidak valid' })
    }

    const id = crypto.randomUUID()
    const token = crypto.randomUUID()

    // Always update memory store
    cleanupMemoryPlayers(now)
    if (!memoryPlayers.has(site)) memoryPlayers.set(site, new Map())
    memoryPlayers.get(site).set(id, {
      id,
      token,
      site,
      name: state.name,
      character: state.character,
      state,
      message: null,
      message_at: null,
      seen: now,
    })

    // Try persisting to DB if available
    try {
      await pool.query('DELETE FROM garden_players WHERE seen < ?', [now - 30_000])
      await pool.query(
        'INSERT INTO garden_players (id, token, site, name, character_type, state, seen) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, token, site, state.name, state.character, JSON.stringify(state), now],
      )
    } catch {
      // DB optional fallback, memory already handles it
    }

    return res.setHeader('Cache-Control', 'no-store').json({ id, token })
  } catch (err) {
    console.error('Multiplayer join error:', err)
    return res.status(500).json({ error: 'Koneksi taman terganggu' })
  }
})

// POST /sync
router.post(['/sync', '/api/sync'], siteAccess('limited'), async (req, res) => {
  try {
    const body = req.body || {}
    const now = Date.now()
    const site = req.site

    if (typeof body.id !== 'string' || typeof body.token !== 'string') {
      return res.status(401).json({ error: 'Session expired' })
    }

    let state
    try {
      state = sanitizeState(body)
    } catch {
      return res.status(400).json({ error: 'Invalid player' })
    }

    const rawMessage = typeof body.message === 'string' ? body.message.trim().slice(0, 15) : null
    const siteMap = memoryPlayers.get(site)
    const existingMemory = siteMap?.get(body.id)

    if (existingMemory && existingMemory.token !== body.token) {
      return res.status(401).json({ error: 'Session expired' })
    }

    // Update memory
    if (!memoryPlayers.has(site)) memoryPlayers.set(site, new Map())
    const currentMsg = rawMessage !== null ? rawMessage : (existingMemory?.message || null)
    const currentMsgAt = rawMessage !== null ? now : (existingMemory?.message_at || null)

    memoryPlayers.get(site).set(body.id, {
      id: body.id,
      token: body.token,
      site,
      name: state.name,
      character: state.character,
      state,
      message: currentMsg,
      message_at: currentMsgAt,
      seen: now,
    })

    // Collect active players from memory
    const activePlayers = []
    for (const [otherId, p] of memoryPlayers.get(site).entries()) {
      if (otherId !== body.id && p.seen > now - 15_000) {
        const hasRecentMsg = p.message && p.message_at && (now - p.message_at < 5000)
        activePlayers.push({
          id: p.id,
          ...p.state,
          name: p.name,
          character: p.character,
          message: hasRecentMsg ? p.message : '',
          messageRemaining: hasRecentMsg ? Math.max(0, 5000 - (now - p.message_at)) : 0,
        })
      }
    }

    // Attempt DB async update in background (non-blocking)
    try {
      if (rawMessage !== null) {
        await pool.query(
          'UPDATE garden_players SET state = ?, seen = ?, message = ?, message_at = ? WHERE id = ? AND token = ? AND site = ?',
          [JSON.stringify(state), now, rawMessage, now, body.id, body.token, site],
        )
      } else {
        await pool.query(
          'UPDATE garden_players SET state = ?, seen = ? WHERE id = ? AND token = ? AND site = ?',
          [JSON.stringify(state), now, body.id, body.token, site],
        )
      }
    } catch {
      // Ignored for performance & resilience
    }

    return res.setHeader('Cache-Control', 'no-store').json({ players: activePlayers })
  } catch (err) {
    console.error('Multiplayer sync error:', err)
    return res.status(500).json({ error: 'Koneksi taman terganggu' })
  }
})

// POST /leave
router.post(['/leave', '/api/leave'], (req, res, next) => { req.site = resolveSite(req.hostContext); next() }, async (req, res) => {
  try {
    const body = req.body || {}
    const site = req.site

    if (body.id && memoryPlayers.has(site)) {
      memoryPlayers.get(site).delete(body.id)
    }

    try {
      if (body.id && body.token) {
        await pool.query('DELETE FROM garden_players WHERE id = ? AND token = ? AND site = ?', [
          body.id,
          body.token,
          site,
        ])
      }
    } catch {
      // Ignore DB error on leave
    }

    return res.setHeader('Cache-Control', 'no-store').json({ ok: true })
  } catch {
    return res.json({ ok: true })
  }
})

// POST /wishes/send
// Subdomain undangan: simpan ke guestbook_entries (buku tamu yang sama dengan 3D → tampil di dashboard
// pasangan beserta kehadiran). Domain utama (demo Faris & Eliza): hanya di memori, seperti dulu.
const wishSendLog = new Map() // ip -> [timestamps]
function tooManyWishes(ip, now) {
  const recent = (wishSendLog.get(ip) || []).filter((t) => now - t < 15 * 60_000)
  if (wishSendLog.size > 10_000) wishSendLog.clear()
  if (recent.length >= 15) { wishSendLog.set(ip, recent); return true }
  recent.push(now)
  wishSendLog.set(ip, recent)
  return false
}

router.post(['/wishes/send', '/api/wishes/send'], siteAccess('full'), async (req, res) => {
  try {
    const body = req.body || {}
    const now = Date.now()
    const site = req.site

    if (typeof body.id !== 'string' || typeof body.token !== 'string') {
      return res.status(401).json({ error: 'Session expired' })
    }

    const player = memoryPlayers.get(site)?.get(body.id)
    const parsed = normalizeWish(body, player?.name)
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const wish = parsed.value

    if (tooManyWishes(clientIp(req), now)) {
      return res.status(429).json({ error: 'Terlalu banyak ucapan. Coba lagi beberapa menit lagi.' })
    }

    if (req.invitation) {
      const moderation = validateGuestbookContent({ name: wish.name, message: wish.message })
      if (!moderation.isValid) return res.status(400).json({ error: moderation.error || 'Ucapan mengandung kata yang tidak pantas.' })
      await pool.query(
        `INSERT INTO guestbook_entries (id, invitation_id, name, attendance, message, status, request_id)
         VALUES (?, ?, ?, ?, ?, 'visible', ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [crypto.randomUUID(), req.invitation.id, wish.name, wish.attendance, wish.message, wish.requestId],
      )
      return res.setHeader('Cache-Control', 'no-store').json({ ok: true })
    }

    // Demo di domain utama: memori saja (tidak ada undangan di database).
    if (!memoryWishes.has(site)) memoryWishes.set(site, [])
    const wishesList = memoryWishes.get(site)
    if (!wishesList.some((w) => w.request_id === wish.requestId)) {
      wishesList.unshift({ id: now, request_id: wish.requestId, name: wish.name, message: wish.message, attendance: wish.attendance, hidden: 0, created_at: now })
      if (wishesList.length > 200) wishesList.length = 200
    }
    return res.setHeader('Cache-Control', 'no-store').json({ ok: true })
  } catch (err) {
    console.error('Multiplayer wish error:', err)
    return res.status(500).json({ error: 'Gagal mengirim ucapan' })
  }
})

// POST /wishes/list
router.post(['/wishes/list', '/api/wishes/list'], siteAccess('full'), async (req, res) => {
  try {
    const site = req.site
    if (req.invitation) {
      const [rows] = await pool.query(
        `SELECT id, name, attendance, message, created_at FROM guestbook_entries
         WHERE invitation_id = ? AND status = 'visible'
         ORDER BY created_at DESC LIMIT 50`,
        [req.invitation.id],
      )
      return res.setHeader('Cache-Control', 'no-store').json({ wishes: rows.map(toWishItem), hasMore: false })
    }

    // Demo: contoh ucapan + kiriman pengunjung demo (memori).
    if (!memoryWishes.has(site)) {
      memoryWishes.set(site, [
        { id: 1, name: 'Bpk. Hendra & Keluarga', message: 'Selamat berbahagia selalu untuk kedua mempelai! ♡', attendance: 'Hadir', hidden: 0, created_at: Date.now() - 3600000 },
        { id: 2, name: 'Siti & Sahabat', message: 'Barakallahu lakuma, semoga langgeng dan samawa yaa ✨', attendance: 'Hadir', hidden: 0, created_at: Date.now() - 1800000 },
      ])
    }
    const list = memoryWishes.get(site).filter((w) => !w.hidden)
    return res.setHeader('Cache-Control', 'no-store').json({ wishes: list.slice(0, 50), hasMore: false })
  } catch (err) {
    console.error('Multiplayer wishes list error:', err)
    return res.status(500).json({ error: 'Gagal memuat ucapan' })
  }
})

// GET /content
router.get(['/content', '/api/content'], siteAccess('none'), async (req, res) => {
  try {
    const site = req.site
    const access = req.guestAccess
    const accessInfo = publicAccessInfo(access)
    if (access.level === 'none') {
      // Undangan privat tanpa kode valid: tidak ada data (frontend utama sudah menampilkan layar privat).
      return res.setHeader('Cache-Control', 'no-store, private').json({ site, revision: 1, config: null, ...accessInfo })
    }
    const hidden = access.level === 'limited'
    const HIDDEN_TEXT = 'Khusus tamu undangan'
    
    // Check if we have tenant config in MySQL
    try {
      const [invRows] = await pool.query(
        `SELECT i.id, i.slug, wc.bride_name, wc.groom_name, wc.wedding_date, wc.wedding_photo,
                wc.akad_date, wc.akad_time, wc.akad_location, wc.resepsi_date, wc.resepsi_time,
                wc.resepsi_location, wc.bank_name, wc.bank_account, wc.bank_holder, wc.maps_url,
                wc.venue_address, wc.gallery_photos, wc.quote, wc.bgm_url,
                wc.gift_recipient, wc.gift_address, wc.gift_phone, wc.gift_phone_public, wc.gift_note,
                wc.character_style, wc.akad_title, wc.resepsi_title, wc.resepsi_enabled
         FROM invitations i
         LEFT JOIN wedding_configs wc ON wc.invitation_id = i.id
         WHERE i.slug = ? AND i.deleted_at IS NULL
         LIMIT 1`,
        [site],
      )

      if (invRows && invRows.length > 0) {
        const c = invRows[0]
        // Mode hide_details tanpa kode: alamat/peta/rekening/kado diganti teks "Khusus tamu undangan"
        // (bukan dikosongkan, karena kolom kosong jatuh ke data contoh seperti 'BCA'/'Jakarta').
        const gift = hidden ? null : publicGiftShipping(c)
        const titles = eventTitles(c)
        const style = characterStyleAssets(c.character_style)
        let gallery = []
        try {
          gallery = typeof c.gallery_photos === 'string' ? JSON.parse(c.gallery_photos) : (c.gallery_photos || [])
        } catch {
          gallery = []
        }

        const config = {
          demo: false,
          profile: {
            groom: c.groom_name || 'Toni',
            bride: c.bride_name || 'Kia',
            titlePrefix: 'The Wedding of',
            startButton: 'Mulai Permainan',
          },
          assets: {
            cover: c.wedding_photo || 'assets/wedding-card.webp',
            map: 'assets/garden.webp',
            gate: 'assets/front-gate.webp',
            couple: style.couple,
            coverBlank: style.coverBlank,
            pianistIdle: 'assets/pianist-idle.webp',
            pianistPlaying: 'assets/pianist.webp',
            singerIdle: 'assets/singer-idle.webp',
            singerPlaying: 'assets/singer.webp',
            guests: style.guests,
            seated: style.seated,
            hosts: style.hosts,
            music: c.bgm_url || 'assets/wedding-song-complete.m4a',
            click: 'assets/button-pop.mp3',
          },
          characters: {
            men: { atlas: 'assets/character-atlas.png', frames: 9 },
            woman: { atlas: style.womanAtlas, frames: 7 },
          },
          places: [
            {
              id: 'ceremony',
              title: titles.placeTitle,
              subtitle: 'Jadwal hari bahagia kami',
              symbol: '♡',
              x: 0.5,
              y: 0.27,
              description: '',
              fields: [],
              ceremonyBackground: style.ceremonyBackground,
              events: [
                {
                  title: titles.first,
                  short: titles.firstShort,
                  date: c.akad_date || 'Rabu, 15 Juli 2026',
                  time: c.akad_time || '08:00 - 10:00 WIB',
                  venue: hidden ? HIDDEN_TEXT : c.akad_location || 'Kediaman Mempelai Wanita',
                  address: hidden ? 'Buka lewat link yang dikirim mempelai.' : c.venue_address || 'Jakarta',
                  mapsUrl: hidden ? '' : c.maps_url || '',
                  restricted: hidden,
                },
                ...(titles.secondEnabled ? [{
                  title: titles.second,
                  date: c.resepsi_date || 'Rabu, 15 Juli 2026',
                  time: c.resepsi_time || '11:00 - 14:00 WIB',
                  venue: hidden ? HIDDEN_TEXT : c.resepsi_location || 'Gedung Serbaguna',
                  address: hidden ? 'Buka lewat link yang dikirim mempelai.' : c.venue_address || 'Jakarta',
                  mapsUrl: hidden ? '' : c.maps_url || '',
                  restricted: hidden,
                }] : []),
              ],
            },
            {
              id: 'gifts',
              title: 'Hadiah',
              subtitle: 'Tanda kasih untuk mempelai',
              symbol: '♡',
              x: 0.78,
              y: 0.35,
              description: 'Kehadiran dan doa restu Anda merupakan hadiah terindah bagi kami.',
              fields: [],
              sections: hidden ? [
                {
                  title: 'Amplop digital',
                  fields: [['Rekening & alamat kado', HIDDEN_TEXT + '. Buka lewat link yang dikirim mempelai.']],
                },
              ] : [
                {
                  title: 'Rekening ' + (c.groom_name || 'Pengantin'),
                  fields: [
                    ['Bank', c.bank_name || 'BCA'],
                    ['Nomor rekening', c.bank_account || '-'],
                    ['Atas nama', c.bank_holder || c.groom_name || '-'],
                  ],
                },
                // Alamat kirim hadiah hanya tampil bila diisi pasangan (dulu memakai alamat venue: keliru).
                ...(gift
                  ? [{
                      title: 'Kirim Hadiah',
                      fields: [
                        ['Penerima', gift.recipient || `${c.groom_name || 'Pengantin'} & ${c.bride_name || 'Pengantin'}`],
                        ['Alamat', gift.address],
                        ...(gift.phone ? [['No. HP', gift.phone]] : []),
                        ...(gift.note ? [['Catatan', gift.note]] : []),
                      ],
                    }]
                  : []),
              ],
            },
            {
              id: 'wishes',
              title: 'Ucapan Bahagia',
              subtitle: 'Sepucuk doa dari orang tersayang',
              symbol: '✉',
              x: 0.23,
              y: 0.32,
              description: `Titipkan doa dan harapan manismu untuk ${c.groom_name || 'Toni'} & ${c.bride_name || 'Kia'}.`,
              fields: [],
            },
            {
              id: 'story',
              title: 'Cerita Kami',
              subtitle: 'Perjalanan menuju selamanya',
              symbol: '♥',
              x: 0.25,
              y: 0.67,
              description: c.quote || 'Cinta bukan tentang mencari orang yang sempurna, melainkan saling melengkapi dalam kebahagiaan.',
              fields: [
                ['Hari bahagia', `${c.akad_date || '15 Juli 2026'} — mengikat janji suci`],
              ],
            },
            {
              id: 'gallery',
              title: 'Galeri Foto',
              subtitle: 'Momen indah dalam bingkai',
              symbol: '▧',
              x: 0.77,
              y: 0.69,
              description: `Koleksi momen bahagia ${c.groom_name || 'Toni'} & ${c.bride_name || 'Kia'}.`,
              fields: [],
              photos: gallery.length > 0
                ? gallery.map((url, i) => ({ src: url, alt: `Foto ${i + 1}`, credit: '', url: '' }))
                : [
                    { src: 'assets/gallery-1.jpg', alt: 'Momen Bahagia', credit: '', url: '' },
                    { src: 'assets/gallery-2.jpg', alt: 'Momen Bahagia', credit: '', url: '' },
                    { src: 'assets/gallery-3.jpg', alt: 'Momen Bahagia', credit: '', url: '' },
                  ],
            },
            {
              id: 'welcome',
              title: 'Selamat Datang',
              subtitle: 'Senang sekali kamu hadir',
              symbol: '✉',
              x: 0.5,
              y: 0.79,
              description: `Selamat datang di dunia kecil pernikahan kami. Nikmati suasananya dan jelajahi taman bahagia kami.`,
              fields: [
                ['Undanganmu', `Pernikahan ${c.groom_name || 'Toni'} & ${c.bride_name || 'Kia'}`],
                ['Hari bahagia', c.akad_date || 'Rabu, 15 Juli 2026'],
                ['Lokasi', hidden ? HIDDEN_TEXT : c.akad_location || 'Kediaman Mempelai'],
                ['Jelajahi taman', 'Ada enam tempat untuk dikunjungi'],
              ],
            },
          ],
        }

        return res.setHeader('Cache-Control', 'no-store, private').json({ site, revision: 1, config, assetCdn: assetCdnBase(), ...accessInfo })
      }
    } catch {
      // Fall through to default
    }

    // Default configuration (demo Faris & Eliza): gaya busana Umum, sama dengan default undangan baru.
    const demoStyle = characterStyleAssets('umum')
    const defaultConfig = {
      demo: true,
      profile: {
        groom: 'Faris',
        bride: 'Eliza',
        titlePrefix: 'The Wedding of',
        startButton: 'Mulai Permainan',
      },
      assets: {
        cover: 'assets/wedding-card.webp',
        map: 'assets/garden.webp',
        gate: 'assets/front-gate.webp',
        couple: demoStyle.couple,
        coverBlank: demoStyle.coverBlank,
        pianistIdle: 'assets/pianist-idle.webp',
        pianistPlaying: 'assets/pianist.webp',
        singerIdle: 'assets/singer-idle.webp',
        singerPlaying: 'assets/singer.webp',
        guests: demoStyle.guests,
        seated: demoStyle.seated,
        hosts: demoStyle.hosts,
        music: 'assets/wedding-song-complete.m4a',
        click: 'assets/button-pop.mp3',
      },
      characters: {
        men: { atlas: 'assets/character-atlas.png', frames: 9 },
        woman: { atlas: demoStyle.womanAtlas, frames: 7 },
      },
      places: [
        {
          id: 'ceremony',
          title: 'Akad & Resepsi',
          subtitle: 'Jadwal hari bahagia kami',
          symbol: '♡',
          x: 0.5,
          y: 0.27,
          description: '',
          fields: [],
          ceremonyBackground: demoStyle.ceremonyBackground,
          events: [
            {
              title: 'Akad Nikah',
              date: 'Minggu, 4 Oktober 2026',
              time: '08.00–12.00 WIB',
              venue: 'Hotel Borobudur Jakarta',
              address: 'Jl. Lapangan Banteng Selatan No. 1, Jakarta Pusat',
            },
            {
              title: 'Resepsi',
              date: 'Minggu, 4 Oktober 2026',
              time: '13.00–16.00 WIB',
              venue: 'Hotel Borobudur Jakarta',
              address: 'Jl. Lapangan Banteng Selatan No. 1, Jakarta Pusat',
            },
          ],
        },
        {
          id: 'gifts',
          title: 'Hadiah',
          subtitle: 'Tanda kasih untuk mempelai',
          symbol: '♡',
          x: 0.78,
          y: 0.35,
          description: 'Kehadiran dan doa kamu adalah hadiah terindah.',
          fields: [],
          sections: [
            {
              title: 'Rekening Faris',
              fields: [
                ['Bank', 'BCA (contoh)'],
                ['Nomor rekening', '0000000000 (dummy)'],
                ['Atas nama', 'Faris (contoh)'],
              ],
            },
            {
              title: 'Rekening Eliza',
              fields: [
                ['Bank', 'Mandiri (contoh)'],
                ['Nomor rekening', '0000000000000 (dummy)'],
                ['Atas nama', 'Eliza (contoh)'],
              ],
            },
            {
              title: 'Pengiriman hadiah',
              fields: [
                ['Penerima', 'Faris & Eliza (contoh)'],
                ['Alamat pengiriman', 'Jl. Taman Bahagia No. 12, Kebayoran Baru, Jakarta Selatan'],
              ],
            },
          ],
        },
        {
          id: 'wishes',
          title: 'Ucapan Bahagia',
          subtitle: 'Sepucuk doa dari orang tersayang',
          symbol: '✉',
          x: 0.23,
          y: 0.32,
          description: 'Titipkan doa dan harapan manismu untuk Faris & Eliza. Semua tamu bisa membaca ucapan di sini.',
          fields: [],
        },
        {
          id: 'story',
          title: 'Cerita kami',
          subtitle: 'Perjalanan menuju selamanya',
          symbol: '♥',
          x: 0.25,
          y: 0.67,
          description: 'Berawal dari pertemuan sederhana melalui teman, obrolan kami tumbuh menjadi rasa nyaman. Kini, kami siap memulai babak baru bersama.',
          fields: [
            ['Pertemuan pertama', 'Juni 2022 — berkenalan di acara seorang teman'],
            ['Menjalin hubungan', 'Januari 2023 — memutuskan melangkah bersama'],
            ['Lamaran', 'Mei 2026 — mempertemukan dua keluarga'],
            ['Hari bahagia', '4 Oktober 2026 — mengikat janji pernikahan'],
          ],
        },
        {
          id: 'gallery',
          title: 'Galeri Foto',
          subtitle: 'Momen indah dalam bingkai',
          symbol: '▧',
          x: 0.77,
          y: 0.69,
          description: 'Koleksi foto pernikahan pilihan sebagai contoh galeri Faris & Eliza.',
          fields: [],
          photos: [
            { src: 'assets/gallery-1.jpg', alt: 'Pasangan Pengantin', credit: 'Jennifer Kalenberg', url: '' },
            { src: 'assets/gallery-2.jpg', alt: 'Momen Bahagia', credit: 'Dallas Rogers', url: '' },
            { src: 'assets/gallery-3.jpg', alt: 'Buket Bunga', credit: 'Meg Jenson', url: '' },
          ],
        },
        {
          id: 'welcome',
          title: 'Selamat datang',
          subtitle: 'Senang sekali kamu hadir',
          symbol: '✉',
          x: 0.5,
          y: 0.79,
          description: 'Selamat datang di dunia kecil pernikahan kami. Nikmati suasananya, jelajahi taman, dan temukan rencana hari bahagia kami.',
          fields: [
            ['Undanganmu', 'Pernikahan Faris & Eliza'],
            ['Hari bahagia', 'Minggu, 4 Oktober 2026'],
            ['Lokasi', 'Hotel Borobudur Jakarta'],
            ['Jelajahi taman', 'Ada enam tempat untuk dikunjungi'],
          ],
        },
      ],
    }

    return res.setHeader('Cache-Control', 'no-store').json({ site, revision: 1, config: defaultConfig, assetCdn: assetCdnBase() })
  } catch (err) {
    console.error('Content fetch error:', err)
    return res.status(500).json({ error: 'Gagal memuat konten' })
  }
})

export default router
