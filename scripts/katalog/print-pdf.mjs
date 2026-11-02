#!/usr/bin/env node
// Cetak static/katalog/index.html ke PDF A4 lewat Chrome headless.
// Harga & nomor WA diambil live dari API (default: produksi), jadi PDF = snapshot hari ini.
//
//   node scripts/katalog/print-pdf.mjs [output.pdf]
//   API_ORIGIN=http://localhost:3001 node scripts/katalog/print-pdf.mjs   # pakai API lokal
//   CHROME=/path/to/chrome node scripts/katalog/print-pdf.mjs
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { basename, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../../static', import.meta.url)))
const out = resolve(process.argv[2] || 'MarryMe-Katalog.pdf')
const apiOrigin = (process.env.API_ORIGIN || 'https://marryme.web.id').replace(/\/$/, '')
const chrome =
  process.env.CHROME ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync)
if (!chrome) throw new Error('Chrome tidak ditemukan; set env CHROME')

const types = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' }

const tmp = mkdtempSync(join(tmpdir(), 'katalog-'))
const run = (cmd, args) =>
  new Promise((ok) => {
    let out = ''
    const p = spawn(cmd, args)
    p.stdout.on('data', (d) => (out += d))
    p.on('close', (code) => ok(code === 0 ? out : null))
  })
// WebP tanpa alpha -> JPEG (sips bawaan macOS). Gambar transparan tetap WebP.
async function toJpeg(file) {
  const info = await run('sips', ['-g', 'hasAlpha', file])
  if (!info || /hasAlpha: yes/.test(info)) return null
  const dest = join(tmp, basename(file) + '.jpg')
  const ok = await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', file, '--out', dest])
  return ok === null ? null : readFile(dest)
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  // Hanya endpoint publik yang dipakai halaman katalog.
  if (path.startsWith('/api/public/')) {
    try {
      const r = await fetch(apiOrigin + path, { headers: { Accept: 'application/json' } })
      res.writeHead(r.status, { 'content-type': 'application/json' })
      res.end(await r.text())
    } catch {
      res.writeHead(502).end()
    }
    return
  }
  const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path))
  if (!file.startsWith(root)) return res.writeHead(403).end()
  try {
    // Chrome menyimpan WebP di PDF tanpa kompresi (~8 MB); JPEG diteruskan apa adanya.
    if (extname(file) === '.webp' && process.platform === 'darwin') {
      const jpg = await toJpeg(file)
      if (jpg) {
        res.writeHead(200, { 'content-type': 'image/jpeg' })
        res.end(jpg)
        return
      }
    }
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
})

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address()
  const url = `http://127.0.0.1:${port}/katalog/`
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=15000',
    `--print-to-pdf=${out}`,
    url,
  ]
  const p = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  p.stderr.on('data', (d) => (err += d))
  p.on('close', (code) => {
    server.close()
    rmSync(tmp, { recursive: true, force: true })
    if (code !== 0 || !existsSync(out)) {
      console.error(err)
      process.exit(code || 1)
    }
    console.log(`PDF: ${out} (harga dari ${apiOrigin})`)
  })
})
