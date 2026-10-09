// Rekam video gameplay landing (karakter berjalan di karpet menuju pelaminan).
// Frame diambil lewat CDP screencast (timestamp asli), lalu ffmpeg menyusunnya jadi 30 fps konstan.
// Pakai: dev server + API jalan, lalu
//   node scripts/media/record-gameplay.mjs garden   -> static/media/hero-garden.mp4
//   node scripts/media/record-gameplay.mjs beach    -> static/media/hero-beach.mp4
// Opsional: WALK_MS (lama berjalan, default 4100), CRF (kualitas x264, default 29), CHROME_PATH.
import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
const [, , venue = 'garden', w = '1280', h = '752'] = process.argv
const outDir = path.join(tmpdir(), 'marryme-record')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const frameDir = `${outDir}/rec/${venue}`
rmSync(frameDir, { recursive: true, force: true }); mkdirSync(frameDir, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 })
await page.goto(`http://kia-toni.localhost:5173/?perf&venue=${venue}`, { waitUntil: 'domcontentloaded' })
let last = -1, stable = 0
for (let i = 0; i < 180 && stable < 6; i++) { await sleep(500); const c = await page.evaluate(() => window.__threePerf?.calls ?? -1); stable = c > 0 && c === last ? stable + 1 : 0; last = c }
await page.addStyleTag({ content: '.render-diagnostics{display:none!important}' })
await sleep(1500)
const cdp = await page.createCDPSession()
const frames = []
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ data, t: metadata.timestamp })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 })
// Skrip gerakan: diam sebentar, jalan lurus ke pelaminan, belok sedikit, berhenti menikmati pelaminan.
const WALK = Number(process.env.WALK_MS || 4100)
await sleep(1000)
await page.keyboard.down('KeyW'); await sleep(WALK * 0.5)
await page.keyboard.down('KeyA'); await sleep(380); await page.keyboard.up('KeyA')
await sleep(WALK * 0.15)
await page.keyboard.down('KeyD'); await sleep(Number(process.env.RIGHT_MS || 380)); await page.keyboard.up('KeyD')
await sleep(WALK * 0.35 - 900)
await page.keyboard.up('KeyW')
await sleep(2800)
await cdp.send('Page.stopScreencast')
await sleep(300)
await browser.close()
// Frame bisa tiba tidak berurutan: urutkan per timestamp sebelum ditulis.
frames.sort((a, b) => a.t - b.t)
let list = ''
frames.forEach((f, i) => {
  const name = `f${String(i).padStart(5, '0')}.jpg`
  writeFileSync(`${frameDir}/${name}`, Buffer.from(f.data, 'base64'))
  const dur = i < frames.length - 1 ? Math.max(0.001, frames[i + 1].t - f.t) : 1 / 30
  list += `file '${name}'\nduration ${dur.toFixed(5)}\n`
})
list += `file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`
writeFileSync(`${frameDir}/list.txt`, list)
const span = frames.at(-1).t - frames[0].t
const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t)
console.log(venue, `frames ${frames.length}`, `durasi ${span.toFixed(2)}s`, `rata-rata ${(frames.length / span).toFixed(1)} fps`, `gap terbesar ${(Math.max(...gaps) * 1000).toFixed(0)}ms`)

const out = path.resolve(`static/media/hero-${venue}.mp4`)
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
  '-vf', 'fps=30,scale=1280:-2:flags=lanczos,format=yuv420p', '-an', '-c:v', 'libx264', '-profile:v', 'high',
  '-crf', process.env.CRF || '29', '-preset', 'slow', '-g', '60', '-movflags', '+faststart', out], { cwd: frameDir, stdio: 'inherit' })
console.log('ditulis:', out)
