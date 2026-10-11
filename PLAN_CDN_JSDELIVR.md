# Rencana CDN Aset via jsDelivr (dengan cadangan ke server sendiri)

Status: **rencana (2026-10-12), belum ada kode.** Branch: `cdn_jsdelivr`.

## 1. Latar belakang (diukur dari koneksi user, Indonesia)
| | Dilayani dari | Kecepatan |
|---|---|---|
| jsDelivr (`cdn.jsdelivr.net`) | Cloudflare **CGK (Jakarta)** | 2,5–3,4 MB/s |
| marryme.web.id (Cloudflare Free) | HKG / SIN | 0,07–0,75 MB/s, sangat naik-turun (bahkan saat HIT) |

Hambatan utama ada di jalur tamu ke edge Cloudflare yang melayani paket Free, bukan di VPS. jsDelivr (mitra Cloudflare/Fastly) dilayani dari Jakarta.

## 2. Prinsip keamanan (3 lapis cadangan)
Undangan **tidak boleh pernah rusak** karena CDN. Urutan pengaman:

1. **Saklar darurat (server):** alamat CDN disimpan di env server `ASSET_CDN_BASE` dan dikirim lewat `/api/config` + `/api/public/pricing`. Kosongkan env lalu `docker compose up -d api`, maka semua tamu kembali memakai server sendiri. Tanpa rebuild, berlaku ≤ 1 menit.
2. **Cek kesehatan per kunjungan (browser):** sebelum memakai CDN, browser mengambil file kecil `cdn-ok.json` dari CDN (timeout 2,5 dtk). Jika gagal/lambat/isinya tidak cocok versi, seluruh kunjungan itu memakai server sendiri (diingat di `sessionStorage`).
3. **Cadangan per file:** jika satu file gagal dari CDN (error/404/timeout), file itu otomatis diminta ulang dari server sendiri (`marryme.web.id/...`, lewat Cloudflare seperti sekarang). Berlaku untuk gambar taman 2D, sprite, model 3D, tekstur, video.

Selain itu:
- Semua file **tetap ada di server sendiri** (tidak dihapus), jadi cadangan selalu tersedia.
- URL CDN dikunci per versi (`@v2026.10.12-1`): isi tidak bisa berubah diam-diam; update aset = versi baru.
- Sebelum saklar dinyalakan, skrip memverifikasi **setiap file di CDN identik byte-per-byte** (SHA-256) dengan file di server.

## 3. Apa yang dipindah / tidak
**Dipindah ke CDN (aset desain bawaan, memang sudah publik):**
| Folder | Isi | Ukuran |
|---|---|---|
| `presets/garden-2d/assets/` (yang dipakai saja) | peta, sprite, kartu, pengantin/pianis/penyanyi, latar, font, suara klik | ±5,3 MB |
| `nature/gltf/` (tanpa .obj/.mtl) | pohon, semak, beach-pack | ±8,0 MB |
| `models/` | karakter 3D | ±6,3 MB |
| `media/` | video hero, gambar landing | ±3,7 MB |
| **Total** | | **±23 MB** (batas jsDelivr GitHub ±50 MB/paket, 20 MB/file) |

**Tetap di server sendiri:**
- HTML, JS/CSS aplikasi (`_app/immutable`, kecil & ber-hash), file preset yang ber-`?v=` (index.html, game.js, cms-bootstrap.js, style.css).
- **Semua data & unggahan pengguna** (`/api/...`, foto pasangan, bukti transfer): tidak pernah ke repo publik.
- Lagu (`/audio`, 22 MB): melebihi anggaran paket; diputar setelah tamu mulai, jadi tidak menghambat loading. (Opsional nanti: 1 lagu default saja.)

## 4. Desain teknis
### 4.1 Repo aset publik
- Repo GitHub **publik terpisah** `marryme-assets` (isi hanya aset di tabel atas + `cdn-ok.json` berisi versi & daftar hash).
- URL: `https://cdn.jsdelivr.net/gh/<akun>/marryme-assets@<tag>/presets/garden-2d/assets/garden.webp`.
- Skrip `npm run assets:publish`:
  1. salin daftar file (allowlist) dari `static/` ke folder kerja repo aset;
  2. tulis `cdn-ok.json` = `{ version, files: { path: sha256 } }`;
  3. commit + tag `vYYYY.MM.DD-n` + push;
  4. pemanasan cache jsDelivr (request tiap file sekali);
  5. **verifikasi** hash tiap file dari CDN == lokal; jika ada yang beda → berhenti, saklar tidak boleh dinyalakan.
  6. cetak nilai `ASSET_CDN_BASE` baru.

### 4.2 Server
- `server/services/assetCdn.js`: baca `ASSET_CDN_BASE` (validasi harus `https://cdn.jsdelivr.net/gh/.../marryme-assets@...`), ekspos `asset_cdn` di `/api/config` dan `/api/public/pricing`. Kosong = nonaktif. + unit test.

### 4.3 Frontend (SvelteKit, undangan 3D & landing)
- `src/lib/utils/assets.ts`:
  - `initAssetCdn(base)` → jalankan cek kesehatan (lapis 2), set mode `cdn` / `origin`.
  - `assetUrl('/models/tamu.glb')` → URL CDN atau path lokal.
  - `withFallback(url)` → untuk loader yang bisa dicoba ulang.
- 3D: `useGltf` dipanggil dengan `assetUrl(...)`. Jika error, komponen memuat ulang dari path lokal (wrapper kecil di `Character`, `Player`, `Nature`). Tekstur relatif (.gltf → .bin/.png) otomatis ikut dari lokasi yang sama.
- Preload di `TenantBootstrap` & `app.html` memakai URL hasil `assetUrl`.
- Landing (`Hero`, `DesignCatalog`, `FeatureBlocks`): `<img>`/`<video>` dengan `onerror` → ganti ke path lokal.

### 4.4 Preset 2D (iframe garden-2d)
- `cms-bootstrap.js` menerima `asset_cdn` dari config, jalankan cek kesehatan yang sama, lalu menulis `WEDDING.assets.*` / atlas karakter sebagai URL CDN.
- `game.js` `loadImage`: `onerror` → coba sekali lagi dari `assets/...` lokal sebelum menampilkan error "Taman belum berhasil dimuat".
- `<link rel="preload">` gambar inti di `index.html` diganti preload dinamis sesuai mode (CDN/lokal).
- CSS `url(assets/...)` (latar dialog, font) tetap lokal di tahap 1 (dimuat belakangan).

### 4.5 Service worker
- Aturan cache-first diperluas ke `https://cdn.jsdelivr.net/gh/<akun>/marryme-assets@...` (respons CORS). Cache tetap dibersihkan tiap deploy.

### 4.6 Header & keamanan
- jsDelivr mengirim `Access-Control-Allow-Origin: *` → aman untuk tekstur WebGL & canvas (`crossOrigin='anonymous'` pada `Image` dan loader three).
- CSP situs saat ini tidak membatasi img/connect (hanya `frame-ancestors`), jadi tidak perlu diubah. Jika nanti CSP diperketat, tambahkan `https://cdn.jsdelivr.net`.

## 5. Tahapan (satu commit per langkah, dites lokal, deploy bertahap dengan izin)
| Langkah | Isi | Risiko |
|---|---|---|
| J0 | User membuat repo publik `marryme-assets` + memberi akses push (token/SSH) | — |
| J1 | Skrip `assets:publish` + `assets:verify`, publish versi pertama; verifikasi hash | nol (belum dipakai situs) |
| J2 | Server: `ASSET_CDN_BASE` + ekspos di config (default kosong = mati) + tes | nol (saklar mati) |
| J3 | Preset 2D: cek kesehatan + URL CDN + cadangan per file | rendah |
| J4 | Tes lokal: normal, **CDN diblokir total**, CDN lambat, satu file 404, versi tidak cocok → semua harus tetap terbuka | — |
| J5 | Deploy dengan saklar **mati** → nyalakan saklar untuk 2D saja → ukur 2–3 hari | rendah, bisa dimatikan ≤1 menit |
| J6 | 3D: model, nature, beach-pack lewat CDN + cadangan | sedang (diuji sama seperti J4) |
| J7 | Landing media + service worker CDN | rendah |

## 6. Rollback
- Darurat: kosongkan `ASSET_CDN_BASE` di `server/.env.docker` → `docker compose up -d api`. Semua tamu kembali ke server sendiri.
- Kode: revert ke commit sebelum J3 (file aset di server tidak pernah dihapus).

## 7. Risiko yang diterima
- Kebijakan jsDelivr menyasar proyek terbuka; jika suatu saat repo dibatasi, lapis 2 & 3 otomatis mengalihkan ke server sendiri (lebih lambat, tapi tidak rusak). Alternatif berbayar siap pakai: Bunny CDN (±$1/bulan, POP Jakarta) memakai saklar yang sama.
- Aset desain menjadi bisa diunduh dari GitHub (sebelumnya pun sudah bisa diunduh dari situs). Tidak ada data pribadi di repo aset.
- jsDelivr bisa beberapa menit lambat saat cache pertama kali dibangun → skrip melakukan pemanasan sebelum saklar dinyalakan.

## 8. Yang perlu dari user
1. Buat repo GitHub **publik** `marryme-assets` (boleh kosong).
2. Akses push dari mesin ini: Personal Access Token (fine-grained, hanya repo itu, izin Contents: Read & Write) atau SSH key. `gh` CLI belum terpasang di mesin ini.
