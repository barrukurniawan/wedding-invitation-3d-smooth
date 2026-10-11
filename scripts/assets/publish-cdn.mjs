// Publikasikan aset desain ke repo publik marryme-assets lalu verifikasi lewat jsDelivr.
//
//   node scripts/assets/publish-cdn.mjs            # salin, commit, tag, push, verifikasi
//   node scripts/assets/publish-cdn.mjs --verify vYYYY.MM.DD-n   # verifikasi tag yang sudah ada
//
// Hasil akhir: nilai ASSET_CDN_BASE untuk server/.env.docker. Saklar CDN baru boleh dinyalakan
// bila SEMUA file di CDN identik (SHA-256) dengan file lokal.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { STATIC_DIR, manifestFiles } from './cdn-manifest.mjs'

const REPO_URL = 'https://github.com/barrukurniawan/marryme-assets.git'
const CDN_ROOT = 'https://cdn.jsdelivr.net/gh/barrukurniawan/marryme-assets'
const WORK_DIR = path.resolve(process.env.ASSETS_REPO_DIR || '../marryme-assets')
const args = process.argv.slice(2)
const verifyOnly = args[0] === '--verify' ? args[1] : null

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const git = (...a) => execFileSync('git', a, { cwd: WORK_DIR, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function localHashes() {
  return Object.fromEntries(manifestFiles().map((f) => [f, sha256(readFileSync(path.join(STATIC_DIR, f)))]))
}

function nextTag() {
  const d = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10).replaceAll('-', '.')
  const existing = git('tag', '--list', `v${d}-*`).split('\n').filter(Boolean)
  const n = existing.map((t) => Number(t.split('-').pop()) || 0).reduce((a, b) => Math.max(a, b), 0) + 1
  return `v${d}-${n}`
}

function listRepoFiles(dir = WORK_DIR, rel = '') {
  return readdirSync(path.join(dir, rel)).flatMap((name) => {
    if (rel === '' && (name === '.git' || name === 'README.md' || name === 'cdn-ok.json')) return []
    const r = rel ? `${rel}/${name}` : name
    return statSync(path.join(dir, r)).isDirectory() ? listRepoFiles(dir, r) : [r]
  })
}

async function fetchWithRetry(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) return Buffer.from(await res.arrayBuffer())
      if (res.status !== 404 && res.status < 500) throw new Error(`HTTP ${res.status}`)
    } catch (error) {
      if (i === tries - 1) throw error
    }
    await sleep(2000 * (i + 1))
  }
  throw new Error(`gagal mengambil ${url}`)
}

async function verify(tag, expected) {
  const base = `${CDN_ROOT}@${tag}`
  console.log(`\nVerifikasi ${Object.keys(expected).length} file di ${base} ...`)
  const ok = JSON.parse((await fetchWithRetry(`${base}/cdn-ok.json`)).toString())
  if (ok.version !== tag) throw new Error(`cdn-ok.json versi ${ok.version} != ${tag}`)
  let bad = 0
  const files = Object.entries(expected)
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(files.slice(i, i + 8).map(async ([f, hash]) => {
      try {
        const got = sha256(await fetchWithRetry(`${base}/${f}`))
        if (got !== hash) { bad++; console.error(`  BEDA  ${f}`) }
      } catch (error) { bad++; console.error(`  GAGAL ${f}: ${error.message}`) }
    }))
    process.stdout.write(`  ${Math.min(i + 8, files.length)}/${files.length}\r`)
  }
  console.log('')
  if (bad) throw new Error(`${bad} file tidak cocok di CDN. Saklar CDN JANGAN dinyalakan.`)
  console.log(`Semua file identik. ASSET_CDN_BASE=${base}`)
  return base
}

async function publish() {
  if (!existsSync(path.join(WORK_DIR, '.git'))) {
    console.log(`Clone ${REPO_URL} -> ${WORK_DIR}`)
    execFileSync('git', ['clone', '-q', REPO_URL, WORK_DIR], { stdio: 'inherit' })
  }
  git('fetch', '-q', '--tags', 'origin')
  try { git('checkout', '-q', 'main'); git('pull', '-q', '--ff-only', 'origin', 'main') } catch { /* repo kosong */ }

  const hashes = localHashes()
  // Sinkronkan isi repo persis dengan manifest (hapus file yang tidak lagi ada di manifest).
  for (const f of listRepoFiles()) if (!(f in hashes)) rmSync(path.join(WORK_DIR, f))
  for (const f of Object.keys(hashes)) {
    const dst = path.join(WORK_DIR, f)
    mkdirSync(path.dirname(dst), { recursive: true })
    copyFileSync(path.join(STATIC_DIR, f), dst)
  }
  const tag = nextTag()
  writeFileSync(path.join(WORK_DIR, 'cdn-ok.json'), JSON.stringify({ version: tag, files: hashes }, null, 0))
  writeFileSync(path.join(WORK_DIR, 'README.md'), '# marryme-assets\n\nAset desain publik MarryMe (model 3D, gambar taman 2D, media landing), disajikan lewat jsDelivr.\nTidak berisi data pengguna. Dikelola otomatis oleh `scripts/assets/publish-cdn.mjs` di repo aplikasi.\n')

  git('add', '-A')
  const changed = git('status', '--porcelain')
  if (!changed) console.log('Tidak ada perubahan aset; tetap membuat tag baru untuk cdn-ok.json.')
  git('-c', 'user.name=Barru Kurniawan', '-c', 'user.email=barru@motionpay.id', 'commit', '-q', '--allow-empty', '-m', `assets ${tag}`)
  git('tag', tag)
  console.log(`Push ${tag} ...`)
  execFileSync('git', ['push', '-q', 'origin', 'HEAD:main', '--tags'], { cwd: WORK_DIR, stdio: 'inherit' })
  return verify(tag, hashes)
}

try {
  if (verifyOnly) await verify(verifyOnly, localHashes())
  else await publish()
} catch (error) {
  console.error(`\n${error.message}`)
  process.exit(1)
}
