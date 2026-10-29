// Bundel preset demo "Little Wedding Island" (wedding-3d).
// Source: presets-src/wedding-3d/ (±37 modul ES + 5 CSS + vendor/three.module.js).
// Output: static/presets/wedding-3d/{index.html, app-[hash].js, app-[hash].css}; assets/ tetap di static.
// Satu file JS ber-hash menggantikan rantai import berantai (tiap putaran bisa ~0,9 dtk dari origin Amsterdam).
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'presets-src/wedding-3d')
const out = join(root, 'static/presets/wedding-3d')

const html = readFileSync(join(src, 'index.html'), 'utf8')
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1])
const jsFiles = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map((m) => m[1])
if (!cssFiles.length || !jsFiles.length) throw new Error('index.html: link/script entri tidak ditemukan')

const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10)

// Urutan eksekusi modul sama dengan urutan <script type="module"> di index.html.
const js = await build({
  stdin: { contents: jsFiles.map((f) => `import './${f}';`).join('\n'), resolveDir: src, sourcefile: 'entry.js' },
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
  write: false,
})
const css = await build({
  stdin: { contents: cssFiles.map((f) => `@import './${f}';`).join('\n'), resolveDir: src, loader: 'css', sourcefile: 'entry.css' },
  bundle: true,
  minify: true,
  external: ['assets/*', '*.woff', '*.woff2'],
  write: false,
})
const jsText = js.outputFiles[0].text
const cssText = css.outputFiles[0].text
const jsName = `app-${hash(jsText)}.js`
const cssName = `app-${hash(cssText)}.css`

for (const f of readdirSync(out)) if (/^app-[0-9a-f]{10}\.(js|css)$/.test(f)) unlinkSync(join(out, f))
writeFileSync(join(out, jsName), jsText)
writeFileSync(join(out, cssName), cssText)

let page = html
cssFiles.forEach((f, i) => {
  page = page.replace(`<link rel="stylesheet" href="${f}">`, i === 0 ? `<link rel="stylesheet" href="${cssName}">` : '')
})
jsFiles.forEach((f, i) => {
  page = page.replace(`<script type="module" src="${f}"></script>`, i === 0 ? `<script type="module" src="${jsName}"></script>` : '')
})
page = page.replace('<meta charset="utf-8">', `<meta charset="utf-8"><link rel="modulepreload" href="${jsName}">`)
writeFileSync(join(out, 'index.html'), page)

console.log(`wedding-3d: ${jsName} (${(jsText.length / 1024).toFixed(0)} KB), ${cssName} (${(cssText.length / 1024).toFixed(0)} KB)`)
