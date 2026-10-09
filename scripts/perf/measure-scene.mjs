#!/usr/bin/env node
// Dev-only: ukur draw call / FPS dan ambil screenshot scene 3D lokal untuk
// membandingkan sebelum/sesudah refactor (lihat PLAN_VENUE_3D.md, Fase 0).
//
// Pakai (dev server + API lokal harus jalan):
//   npm run perf:measure -- --label baseline
//   npm run perf:measure -- --label after-split --compare baseline
// Opsi:
//   --url <url>        default http://kia-toni.localhost:5173/
//   --profiles a,b     default desktop-retina,desktop,mobile
//   --no-throttle      lewati uji FPS dengan CPU diperlambat
//   --venue <id>       paksa venue (dev-only ?venue=), mis. beach
// Hasil: .perf/<label>/report.json + <profile>-<spawn>.png (+ diff-*.png saat --compare)

import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const flag = (name) => args.includes(`--${name}`)

const label = opt('label', 'run')
const compare = opt('compare')
const baseUrl = opt('url', 'http://kia-toni.localhost:5173/')
const venue = opt('venue')
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const outDir = path.resolve('.perf', label)
fs.mkdirSync(outDir, { recursive: true })

const PROFILES = {
  'desktop-retina': { viewport: { width: 1456, height: 832, deviceScaleFactor: 2 } },
  desktop: { viewport: { width: 1456, height: 832, deviceScaleFactor: 1 } },
  mobile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  }
}
const SPAWNS = ['default', 'receptionist', 'stage', 'side']
const THROTTLES = flag('no-throttle') ? [1] : [1, 4, 6]
const profiles = opt('profiles', Object.keys(PROFILES).join(',')).split(',')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
})

async function openScene(profile, spawn) {
  const page = await browser.newPage()
  const errors = []
  // Service worker SvelteKit memang gagal register di mode dev; bukan error scene.
  const ignored = (msg) => msg.includes('ServiceWorker')
  page.on('pageerror', (e) => !ignored(e.message) && errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !ignored(m.text()) && errors.push(m.text()))
  await page.setViewport(profile.viewport)
  if (profile.userAgent) await page.setUserAgent(profile.userAgent)
  // Hook resmi three.js untuk devtools: tangkap objek Scene untuk breakdown.
  await page.evaluateOnNewDocument(() => {
    const target = new EventTarget()
    window.__perfScenes = []
    target.addEventListener('observe', (e) => {
      if (e.detail?.isScene) window.__perfScenes.push(e.detail)
    })
    window.__THREE_DEVTOOLS__ = target
  })
  const url = new URL(baseUrl)
  url.searchParams.set('perf', '')
  if (spawn !== 'default') url.searchParams.set('spawn', spawn)
  if (venue) url.searchParams.set('venue', venue)
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' })

  // Tunggu sampai draw call stabil (vegetasi deferred ikut termuat).
  let last = -1
  let stable = 0
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await sleep(500)
    const calls = await page.evaluate(() => window.__threePerf?.calls ?? -1)
    stable = calls > 0 && calls === last ? stable + 1 : 0
    last = calls
    if (stable >= 6) break
  }
  if (stable < 6) errors.push(`draw call tidak stabil dalam 90 dtk (terakhir ${last})`)
  return { page, errors }
}

async function measureFps(page, rate) {
  const cdp = await page.createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await sleep(1000)
  const result = await page.evaluate(async () => {
    const frames = []
    let prev = performance.now()
    const start = prev
    await new Promise((resolve) => {
      const step = () => {
        const now = performance.now()
        frames.push(now - prev)
        prev = now
        if (now - start < 4000) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
    frames.sort((a, b) => a - b)
    return {
      fps: +(frames.length / 4).toFixed(1),
      p95ms: +frames[Math.floor(frames.length * 0.95)].toFixed(1)
    }
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  return result
}

async function breakdown(page) {
  return page.evaluate(() => {
    const scene = window.__perfScenes?.find((s) => s.children.length > 3)
    if (!scene) return null
    const byKind = {}
    const materials = new Set()
    const geometries = new Set()
    let drawables = 0
    scene.traverseVisible((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine)) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      let kind
      if (o.isSkinnedMesh) kind = 'character'
      else if (o.isInstancedMesh) kind = 'instanced'
      else if (mats[0]?.isShaderMaterial) kind = 'shader'
      else kind = `mesh:${o.geometry.type.replace('Geometry', '')}`
      byKind[kind] = (byKind[kind] || 0) + mats.length
      drawables += mats.length
      mats.forEach((m) => materials.add(m.uuid))
      geometries.add(o.geometry.uuid)
    })
    return {
      drawables,
      uniqueMaterials: materials.size,
      uniqueGeometries: geometries.size,
      byKind: Object.fromEntries(Object.entries(byKind).sort((a, b) => b[1] - a[1]))
    }
  })
}

async function screenshot(page, file) {
  // Hanya canvas: sembunyikan HUD/label/countdown supaya diff tidak berisik.
  await page.addStyleTag({ content: 'body * { visibility: hidden !important } canvas { visibility: visible !important }' })
  await sleep(300)
  await page.screenshot({ path: file })
}

const report = { label, url: baseUrl, date: new Date().toISOString(), profiles: {} }

for (const name of profiles) {
  const profile = PROFILES[name]
  if (!profile) throw new Error(`Profil tidak dikenal: ${name}`)
  const entry = { shots: {}, errors: [] }
  for (const spawn of SPAWNS) {
    const { page, errors } = await openScene(profile, spawn)
    entry.errors.push(...errors.map((e) => `[${spawn}] ${e}`))
    if (spawn === 'default') {
      entry.perf = await page.evaluate(() => window.__threePerf)
      entry.breakdown = await breakdown(page)
      entry.fps = {}
      for (const rate of THROTTLES) entry.fps[`cpu_x${rate}`] = await measureFps(page, rate)
    }
    const file = `${name}-${spawn}.png`
    await screenshot(page, path.join(outDir, file))
    entry.shots[spawn] = file
    await page.close()
  }
  report.profiles[name] = entry
  const fps = Object.entries(entry.fps).map(([k, v]) => `${k} ${v.fps}fps p95 ${v.p95ms}ms`).join(' | ')
  console.log(`${name.padEnd(15)} calls ${entry.perf?.calls}  tris ${entry.perf?.triangles}  materials ${entry.breakdown?.uniqueMaterials}  ${fps}`)
  if (entry.errors.length) console.log(`  errors: ${entry.errors.join('; ')}`)
}

if (compare) {
  const refDir = path.resolve('.perf', compare)
  const ref = JSON.parse(fs.readFileSync(path.join(refDir, 'report.json'), 'utf8'))
  report.compare = { against: compare, profiles: {} }
  const page = await browser.newPage()
  console.log(`\nBanding dengan "${compare}":`)
  for (const [name, entry] of Object.entries(report.profiles)) {
    const refEntry = ref.profiles[name]
    if (!refEntry) continue
    const diffs = {}
    for (const [spawn, file] of Object.entries(entry.shots)) {
      const refFile = path.join(refDir, file)
      if (!fs.existsSync(refFile)) continue
      const a = fs.readFileSync(refFile).toString('base64')
      const b = fs.readFileSync(path.join(outDir, file)).toString('base64')
      // Diff di browser: tidak perlu dependency PNG tambahan.
      const { pct, diffPng } = await page.evaluate(async (a, b) => {
        const load = (src) =>
          new Promise((res) => {
            const img = new Image()
            img.onload = () => res(img)
            img.src = `data:image/png;base64,${src}`
          })
        const [ia, ib] = await Promise.all([load(a), load(b)])
        const w = ia.width
        const h = ia.height
        const px = (img) => {
          const c = new OffscreenCanvas(w, h)
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          return ctx.getImageData(0, 0, w, h).data
        }
        const da = px(ia)
        const db = px(ib)
        const out = new OffscreenCanvas(w, h)
        const octx = out.getContext('2d')
        const od = octx.createImageData(w, h)
        let changed = 0
        for (let i = 0; i < da.length; i += 4) {
          const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]))
          const hit = d > 24
          if (hit) changed++
          const g = (da[i] + da[i + 1] + da[i + 2]) / 9
          od.data[i] = hit ? 255 : g
          od.data[i + 1] = hit ? 0 : g
          od.data[i + 2] = hit ? 0 : g
          od.data[i + 3] = 255
        }
        octx.putImageData(od, 0, 0)
        const blob = await out.convertToBlob({ type: 'image/png' })
        const buf = new Uint8Array(await blob.arrayBuffer())
        let bin = ''
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
        return { pct: +((changed / (w * h)) * 100).toFixed(2), diffPng: btoa(bin) }
      }, a, b)
      fs.writeFileSync(path.join(outDir, `diff-${file}`), Buffer.from(diffPng, 'base64'))
      diffs[spawn] = pct
    }
    report.compare.profiles[name] = {
      calls: { before: refEntry.perf?.calls, after: entry.perf?.calls },
      materials: { before: refEntry.breakdown?.uniqueMaterials, after: entry.breakdown?.uniqueMaterials },
      pixelDiffPct: diffs
    }
    const d = Object.entries(diffs).map(([k, v]) => `${k} ${v}%`).join(', ')
    console.log(`${name.padEnd(15)} calls ${refEntry.perf?.calls} -> ${entry.perf?.calls}  materials ${refEntry.breakdown?.uniqueMaterials} -> ${entry.breakdown?.uniqueMaterials}  pixel diff: ${d}`)
  }
  await page.close()
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\nHasil: ${path.relative(process.cwd(), outDir)}/`)
await browser.close()
