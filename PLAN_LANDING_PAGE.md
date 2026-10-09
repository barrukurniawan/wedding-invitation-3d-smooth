# Rencana Landing Page Baru (marryme.web.id)

Status: **L1–L6 selesai di lokal (2026-10-09), belum di-deploy.** Branch `landing_v2` (dari `new_staging` fb65175).

Keputusan user (2026-10-09):
- **Jalur B**: gratis selama promo peluncuran, hitung mundur ke **14 Oktober 2026 23:59 WIB**.
- Harga normal **Rp 299.999** (dicoret). Setelah promo berakhir berlaku harga promo **Rp 49.999** (ditampilkan sebagai "setelah 14 Okt: Rp 49.999"; `INVITATION_PRICE_IDR` baru diubah ke 49999 saat tanggal itu tiba).
- WhatsApp CTA: **6282122126254**.
- Testimoni & sosmed: belum ada → bagian testimoni disembunyikan sampai ada; footer tanpa sosmed dulu.

## 1. Audit: kenapa sekarang "kurang menarik"

| galleryou.com | marryme.web.id sekarang |
|---|---|
| Hero: satu kalimat jualan + 2 CTA + "Disukai oleh 274 pemilik acara" + mockup HP dengan callout fitur | Hero: judul puitis + kartu login di kanan. Tidak ada angka, tidak ada CTA selain login |
| Nav: Fitur · Harga · **Promo Oktober 10:10** (ditandai) | Tidak ada nav |
| 5 blok fitur bergantian, tiap blok gradasi pastel beda + mockup HP + chip fitur + link "Lihat …" | 3 kartu teks kecil "Mengapa undangan 3D?" |
| Grid use-case dengan foto | Tidak ada |
| Harga: 3 paket, **harga coret + badge "10:10" + "PROMO –Rp 234.000"**, paket tengah "Paling banyak dipilih" | **Tidak ada bagian harga sama sekali**; katalog preset tanpa harga |
| FAQ akordeon | Tidak ada |
| CTA penutup + footer lengkap (sosmed, legal) | CTA penutup ada; footer 1 baris |
| Hitung mundur promo: **tidak ada** (hanya label) | Tidak ada |

Yang MarryMe punya tapi belum "dijual": dunia 3D yang benar-benar bisa dijalani, venue Taman + Pantai, versi 2D ringan, buku tamu/RSVP, kirim undangan WA + QR, chat bantuan. Semua ini belum ditampilkan sebagai fitur bergambar.

## 2. Keputusan penting: harga harus nyata

Konfigurasi live: `PAYMENT_MODE=manual`, `INVITATION_PRICE_IDR=0` → undangan gratis dan langsung aktif. Harga coret hanya boleh tampil kalau salah satu ini berlaku:

- **Jalur A — mulai berbayar (promo nyata).** Set `INVITATION_PRICE_IDR` ke harga promo (mis. 99.000). Alur bayar manual (upload bukti transfer → verifikasi admin) **sudah ada** dan baru dipercantik di admin baru. Landing menampilkan ~~harga normal~~ harga promo + hitung mundur ke tanggal promo berakhir. Setelah tanggal itu, kamu ubah env ke harga normal.
- **Jalur B — tetap gratis selama peluncuran.** Landing menampilkan "~~Rp 299.000~~ **GRATIS** selama promo peluncuran" + hitung mundur ke tanggal gratisnya berakhir. Jujur selama setelah tanggal itu memang mulai berbayar (jalur A).

Hitung mundur **harus ke tanggal sungguhan** (disimpan di config), bukan timer yang reset tiap kunjungan. Kalau tanggal lewat dan belum diubah, bagian promo otomatis sembunyi (tidak menampilkan "00:00:00").

Undangan yang sudah aktif (11 subdomain) **tidak terpengaruh** apa pun pilihannya; harga hanya berlaku untuk undangan baru.

## 3. Konfigurasi promo (tanpa migrasi)
Nilai di env, dibaca server dan diekspos lewat `GET /api/public/pricing` (tanpa login, cache 5 menit):
```
PRICE_NORMAL_IDR=299999        # harga coret
INVITATION_PRICE_IDR=0         # harga yang benar-benar ditagih sekarang (0 = gratis)
PRICE_AFTER_PROMO_IDR=49999    # info "setelah promo" (hanya teks; tidak menagih)
PROMO_LABEL="Promo Peluncuran"
PROMO_ENDS_AT=2026-10-14T23:59:59+07:00
WHATSAPP_NUMBER=6282122126254
```
Frontend tidak lagi membaca `VITE_INVITATION_PRICE_IDR` (sekarang nilai harga ter-bake saat build; dengan API, ganti harga cukup restart `api`, tanpa rebuild). `PaymentManager` ikut memakai API ini.

## 4. Struktur halaman baru (urutan dari atas)

1. **Nav tipis & sticky:** MarryMe · Fitur · Desain · Harga · FAQ · [Masuk/Google]. Di tengah ada pill **"🎉 Promo Peluncuran: hemat 67% · berakhir 21h 04m"** (hitung mundur hidup, klik → bagian harga).
2. **Hero** (2 kolom):
   - Kiri: eyebrow "Undangan pernikahan 3D pertama di Indonesia", judul "Undangan yang bisa **dijelajahi** tamu, bukan cuma dibaca", sub 1 kalimat, CTA "Buat undangan gratis" (Jalur B) / "Mulai Rp 99.000" (Jalur A) + "Coba demo 3D", baris bukti: avatar pasangan + "**Dipakai N pasangan** · 4.9★" (N dari DB, bukan angka karangan).
   - Kanan: mockup HP memutar video/animasi dunia 3D (sudah ada `preview.mp4`), dengan 3 callout mengambang: "Tamu jalan-jalan ke pelaminan", "RSVP & ucapan masuk sendiri", "Pilih venue Taman / Pantai".
   - Kartu login Google dipindah ke dalam modal/drawer saat klik CTA (tidak menguasai hero).
3. **Strip hitung mundur promo** (penuh lebar, marun): "Promo peluncuran berakhir dalam **12 : 04 : 33 : 21**" + harga coret + CTA. Hilang otomatis saat tanggal lewat.
4. **Katalog desain** (yang sudah ada, dirombak): kartu 3D Summer Island, 3D Pantai Sunset (baru, pakai `media/venues/beach.webp`), 2D Pixel Garden. Tiap kartu: badge ("Terlaris", "Baru", "Ringan"), thumbnail, 3 chip fitur, **harga: ~~Rp 299.000~~ Rp 99.000** (atau GRATIS), tombol "Demo" + "Pilih desain".
5. **Blok fitur bergantian** (gaya galleryou, gradasi pastel beda tiap blok, mockup HP/laptop pakai screenshot asli):
   - Dunia 3D yang bisa dijalani (joystick, pelaminan, confetti)
   - Dua venue: Taman & Pantai Sunset (ganti kapan saja)
   - Buku tamu & RSVP masuk sendiri
   - Kirim undangan: daftar tamu, WhatsApp, QR, nama tamu di link
   - Versi 2D super ringan untuk HP lama
6. **Bukti sosial:** angka asli dari API (`pasangan terdaftar`, `kunjungan tamu`, `ucapan masuk`) + 3–6 testimoni **asli** (kamu kumpulkan dari pasangan yang sudah pakai; sebelum ada, bagian ini disembunyikan, bukan diisi testimoni karangan).
7. **Harga** (gaya galleryou): 1 paket utama "Undangan 3D" dengan ~~harga normal~~ harga promo, badge promo, daftar fitur centang, "Sekali bayar, aktif sampai hari-H + 30 hari" (sesuai `expires_at`/retensi yang ada). Kalau nanti ada tier Dasar/Premium (baju adat, dll.), tinggal tambah kartu.
8. **Cara kerja 4 langkah** (yang sudah ada, dipadatkan).
9. **FAQ akordeon:** 8 pertanyaan (perlu install? bisa di HP lama? berapa lama aktif? bisa ganti desain? bayar bagaimana? data tamu aman? bisa pakai domain sendiri? ada bantuan?).
10. **CTA penutup** + **tombol WhatsApp mengambang** (kalau nomor diisi) di kiri bawah (chat bantuan tetap di kanan bawah, hanya untuk yang login).
11. **Footer:** kolom Produk / Bantuan / Legal, Instagram/TikTok, © 2026.

Mobile: semua blok menumpuk, strip promo jadi bar kecil sticky di atas, CTA utama sticky di bawah.

## 5. Gaya
- Tetap brand MarryMe: Playfair Display (judul) + Outfit (teks), marun `#8f1d45`, krem.
- Ambil dari galleryou: judul besar dan tegas, blok fitur dengan latar gradasi pastel (blush, peach, lavender, mint), mockup HP, chip fitur bulat, badge promo ungu→di MarryMe emas `#f5b942` supaya kontras dengan marun.
- Animasi: hitung mundur hidup, angka bukti sosial menghitung naik saat terlihat, blok fitur fade-in saat scroll (`IntersectionObserver`), hormati `prefers-reduced-motion`.
- Performa: screenshot/mockup sebagai WebP ≤ 150 KB, video hero `preview.mp4` lazy + poster; tidak memuat three.js di landing.

## 6. Implementasi
- Komponen baru di `src/lib/components/platform/landing/`: `LandingNav`, `PromoBar` (+ `useCountdown`), `Hero`, `DesignCatalog`, `FeatureBlock`, `SocialProof`, `Pricing`, `Faq`, `LandingFooter`, `WhatsAppFab`. `DashboardShell` hanya menyusun; bagian logged-in tidak disentuh.
- `LandingPage.svelte` / `LandingShell.svelte` lama (tidak dipakai) dihapus.
- Server: `server/services/pricing.js` + `GET /api/public/pricing` + `GET /api/public/stats` (jumlah pasangan aktif, total kunjungan, total ucapan — angka agregat saja, tanpa data pribadi) + tes.
- Promo via env → ganti harga/tanggal = edit `.env` + `docker compose up -d api` (tanpa rebuild web).

## 7. Tahapan (satu commit per langkah, dites lokal, screenshot desktop + mobile)
| Langkah | Isi |
|---|---|
| L1 | Backend: pricing + stats endpoint, env baru, `PaymentManager` baca harga dari API |
| L2 | Nav sticky + PromoBar hitung mundur + Hero baru (login jadi modal) |
| L3 | Katalog desain dengan harga coret, badge, kartu Pantai Sunset |
| L4 | Blok fitur bergantian + aset mockup (screenshot asli, WebP) |
| L5 | Harga + FAQ + bukti sosial (angka asli) + CTA penutup + footer + WhatsApp FAB |
| L6 | Mobile polish, Lighthouse (target perf ≥ 85 mobile), cek tidak ada error console |

Deploy setelah kamu setuju; backup dulu seperti biasa. Branch: `landing_v2` dari `new_staging`.

## 8. Yang perlu kamu putuskan / sediakan
1. Jalur A (mulai berbayar) atau Jalur B (gratis selama promo)?
2. Harga normal & harga promo, dan tanggal promo berakhir.
3. Nomor WhatsApp untuk CTA (opsional).
4. Testimoni asli (nama + 1–2 kalimat + boleh dicantumkan) — bisa menyusul; bagian ini disembunyikan sampai ada.
5. Instagram/TikTok MarryMe untuk footer (opsional).

## 9. Catatan hasil
- Harga/promo dibaca dari `GET /api/public/pricing` (env server), angka bukti sosial dari `GET /api/public/stats` (cache 5 menit). `VITE_PAYMENT_MODE`/`VITE_INVITATION_PRICE_IDR` dihapus; ganti harga/tanggal promo = edit `server/.env.docker` lalu `docker compose up -d api`.
- Bug lama ikut diperbaiki: `created_at` TIMESTAMP diserialisasi sebagai `String(Date)` → "Invalid Date" di Buku Tamu/kontak dashboard pengguna dan daftar undangan admin (`server/services/dates.js`).
- Video hero dikompres 7,1 MB → 0,65 MB (`hero.mp4`, 960px, 14 dtk); video lama & demo 2D (53 MB, tidak terpakai) dihapus dari repo.
- Kode landing lama (`LandingPage.svelte`, `LandingShell.svelte`, `landing.css`, 142 rule di `dashboard.css`) dihapus; dashboard login diverifikasi tidak berubah.
- Testimoni belum ada → bagian testimoni tidak dibuat; demo venue Pantai belum ada subdomain live → kartu Pantai tanpa tombol Demo (saran: buat subdomain demo pantai setelah deploy).
