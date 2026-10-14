# Rencana: Pilihan Busana "Berhijab / Umum" untuk Preset 2D

Status: **dikerjakan (2026-10-14), menunggu uji lokal.** Branch `busana_umum` (dari `new_staging`).

## Latar belakang
Semua karakter wanita di preset 2D (pengantin, penerima tamu, sebagian tamu, karakter "Woman") berhijab
dan di-hardcode untuk semua undangan. Pasangan non-muslim (mis. vica-kevin, Kristen) tidak bisa
menggantinya. Foto cover dan galeri sudah unggahan mereka sendiri, jadi tidak terdampak.

## Cakupan tahap ini
| Aset | Lama (tetap) | Baru (umum) | Sumber |
|---|---|---|---|
| Pengantin di pelaminan | `mempelai.webp` | `mempelai-umum.webp` | `assets/media-source/garden-2d-umum/pengantin.jpeg` |
| Penerima tamu | `wedding-hosts.webp` | `wedding-hosts-umum.webp` | `.../penerima-tamu.jpeg` |
| Tamu berdiri | `wedding-guests-v2.webp` | `wedding-guests-umum.webp` | `.../tamu-berdiri.jpeg` |
| Tamu duduk | `seated-guests.webp` | `seated-guests-umum.webp` | disusun dari potongan non-hijab yang sudah ada |

| Latar halaman Akad & Resepsi | `ceremony-background.png` | `ceremony-background-umum.webp` | perlu generate (pengantin + 2 tamu berhijab) |
| Kartu cover kosong (tampil hanya bila pasangan belum unggah foto) | `wedding-card-blank.webp` | `wedding-card-blank-umum.webp` | perlu generate |

Gambar latar lain (gallery, gifts, story, wishes), peta taman, gerbang, pianis, dan penyanyi sudah dicek: tidak
ada sosok berhijab. Latar dipilih lewat field yang sudah didukung `game.js` (`place.ceremonyBackground`),
jadi `game.js` tetap tidak diubah. Cover kosong dipilih di `cms-bootstrap.js` (logika `has-custom-photo`).

**Ditunda:** karakter "Woman" yang bisa dimainkan (`woman-atlas`). Masih kurang arah utara, timur,
tenggara, dan timur-laut. Nanti cukup menambah `woman-atlas-umum.png` di bawah pilihan yang sama.
Preset 3D tidak tersentuh.

## A. Pengolahan gambar (skrip, tanpa mengubah game.js)
Skrip `scripts/media/build-garden-umum.py` (Pillow), hasilnya di-commit:
1. Hapus background putih dengan flood fill dari tepi, lalu hapus juga "kantong" putih besar yang
   terkurung di antara karakter. Veil sudah diuji tetap utuh.
2. Potong per karakter/frame berdasarkan grid sumber.
3. Tempatkan ke **kanvas dan kotak crop yang sama persis** dengan aset lama, supaya `game.js` tidak
   perlu diubah:
   - Pengantin: 8 frame, 393×370, 200 ms/frame, loop, dalam bentuk animated WebP (frame disejajarkan
     di kaki supaya tidak goyang).
   - Penerima tamu: kanvas 1254×1254, kotak `hostCrops`.
   - Tamu berdiri: kanvas 1254×1254, kotak `gardenGuests[].crop`.
   - Tamu duduk: kanvas 1536×1024, kotak `seatedCrops`. Ketiga sosok berhijab diganti sosok
     non-hijab dari sheet yang sama (rambut ikal, kepang, plus satu varian warna).
4. Simpan sebagai WebP (`cwebp -q 82`; pixel art dicek dulu, kalau ada artefak pakai lossless).

Sebelum lanjut ke langkah B, hasilnya saya tunjukkan dulu dalam bentuk gambar perbandingan untuk disetujui.

## B. Data: migrasi 018
`018_character_style.sql` (idempoten seperti 015), juga ditambahkan ke `server/scripts/migrate.js`:
```sql
ALTER TABLE wedding_configs ADD COLUMN character_style VARCHAR(16) NOT NULL DEFAULT 'hijab'  -- isi baris lama
ALTER TABLE wedding_configs ALTER COLUMN character_style SET DEFAULT 'umum'                 -- undangan baru
```
Nilai: `umum` | `hijab`. Keputusan (2026-10-14): **undangan baru default Umum**, karena belum tentu
semua pasangan berhijab. **Undangan yang sudah ada tetap Berhijab** (tampilan yang sudah dilihat tamu tidak
berubah tiba-tiba). Fallback di kode untuk nilai kosong/tidak dikenal juga `umum`.

## C. Server
- `server/services/characterStyles.js`: daftar `['hijab','umum']` + `normalizeCharacterStyle()` +
  peta aset per gaya (satu sumber kebenaran).
- `routes/config.js`: kirim `character_style`.
- `routes/tenant-config.js`: zod enum + masuk daftar allowed fields (bisa diubah lewat `PATCH /api/my/config`).
- `routes/invitations.js`: tidak diubah; undangan baru otomatis `umum` dari default kolom.
- `routes/multiplayer.js` (`/content`): `assets.couple/hosts/guests/seated` mengikuti gaya.
- `src/lib/api-client.ts`: tipe `CharacterStyle = 'hijab' | 'umum'` di config.

## D. Preset 2D
- `cms-bootstrap.js` `transformMarryMeConfig`: pilih aset sesuai `c.character_style`. Ini jalur
  yang dipakai live lewat postMessage dari `/api/config`. Harus sinkron dengan `multiplayer.js`.
- `index.html`: `data-src` default pengantin tetap `mempelai.webp`. Dipastikan undangan "umum" tidak
  sempat menampilkan pengantin berhijab sekejap (gambar dekoratif baru dimuat setelah config siap;
  akan dicek). Naikkan `?v=` untuk `cms-bootstrap.js`.
- CDN: tambahkan 4 file baru ke `scripts/assets/cdn-manifest.mjs`, lalu publish tag baru dan update
  `ASSET_CDN_BASE`. Sebelum itu sudah aman: file yang tidak ada di CDN otomatis fallback ke origin.

## E. Dashboard (owner)
- Tab **Pengaturan** → bagian "Tampilan 2D" (hanya tampil untuk preset 2D): kartu pilihan
  **Gaya busana karakter**, berisi "Berhijab" dan "Umum (tanpa hijab)" dengan thumbnail pengantin
  masing-masing. Polanya sama dengan pemilih venue 3D (simpan langsung + pesan "✓ … · Lihat undangan ↗").
- Onboarding: tidak diubah (default Umum; bisa diganti kapan saja di Pengaturan). Bisa ditambah
  nanti kalau perlu.
- Thumbnail: `static/media/busana/hijab.webp` dan `umum.webp` (crop frame pertama pengantin).

## F. Uji lokal
1. `npm --prefix server run migrate` di DB lokal, lalu `npm run dev` + `npm run dev:server`.
2. Undangan 2D lama di lokal (mis. `lalamudi.localhost:5173`) tetap berhijab; undangan 2D baru langsung Umum.
3. Ganti ke "Umum" di Pengaturan, buka ulang undangan: pengantin, penerima tamu, tamu berdiri, dan
   tamu duduk berubah; posisi dan ukuran sama; animasi pengantin halus; tidak ada kilasan gambar lama.
4. Kembali ke "Berhijab": semua kembali seperti semula.
5. Cek mobile 390px (dashboard + undangan), `npm run check`, `npm test`.

## G. Live (setelah disetujui)
Merge ke `new_staging`, backup DB, lalu deploy (`git pull && docker compose build && docker compose up -d`,
service `migrate` menjalankan 018). Setelah itu vica-kevin bisa mengganti sendiri di Pengaturan, atau
kita set lewat SQL **hanya dengan persetujuan**:
`UPDATE wedding_configs SET character_style='umum' WHERE invitation_id=<id vica-kevin>`.

## Urutan commit
1. Skrip + aset WebP baru (setelah gambar perbandingan disetujui).
2. Migrasi 018 + server + api-client.
3. cms-bootstrap + manifest CDN.
4. Dashboard Pengaturan + thumbnail.
