# Rencana Redesain Admin Dashboard (`/admin`)

Status: **A1–A7 selesai di lokal (2026-10-09), belum di-deploy.** Dikerjakan di branch `admin_ui` (dibuat dari `new_staging_refactor`, sehingga venue pantai bisa dirilis duluan).

## 1. Tujuan
Tampilan admin (`localhost:5173/admin`, `marryme.web.id/admin`) dirombak total mengikuti referensi "Finexy" dari user:
- terang dan bersih;
- kartu putih membulat di atas latar abu muda;
- navigasi pill di atas, rail ikon di kiri;
- kartu KPI dengan kartu "hero" bergradasi;
- grafik batang;
- tabel aktivitas dengan pencarian dan filter.

Tambahan permintaan user (2026-10-09): tampilkan **semua subdomain** (bukan hanya 10 terpopuler) beserta **email pembuatnya**, **trafik semua web** (marryme.web.id + tiap subdomain), dan info pendukung lainnya.

Aturan data: **tidak ada perubahan skema/migrasi dan tidak ada penulisan data baru.** Hanya endpoint admin *baca* (SELECT) yang ditambah. Semua aksi lama (aktifkan, tolak, simpan, upload, hapus ucapan) tetap memanggil fungsi yang sama.

## 2. Kondisi sekarang (audit)
- `src/routes/admin/+page.svelte` (323 baris): login, tab, tombol simpan. Tema gelap `stone-950`, aksen rose.
- `src/lib/components/admin/*Tab.svelte` (10 tab, kecil-kecil), `StatCard.svelte`, `styles.ts` (kelas input gelap).
- Bug tampilan yang terlihat di screenshot user:
  1. "Halaman Terkunjungi": URL panjang (`?fbclid=…`, `?utm_…`) meluber keluar kartu, dan tiap link iklan dihitung sebagai halaman terpisah.
  2. Verifikasi: gambar bukti transfer yang gagal dimuat tampil sebagai ikon rusak.
  3. Status tampil mentah (`active`, `pending_verification`).
- Temuan penting: tab Pengantin, Acara, Pembayaran, Lokasi, Galeri, Ucapan, dan Statistik **hanya mengedit undangan #1** (demo lama, `invitation_id = 1` di `server/routes/admin.js`), bukan undangan pilihan. Perilaku ini tidak diubah di redesain, hanya diberi label jelas "Undangan Demo (#1)" supaya tidak menyesatkan.

## 3. Desain

### 3.1 Gaya (dari referensi)
| Elemen | Nilai |
|---|---|
| Latar halaman | abu hangat sangat muda `#f3f3f1`, bingkai aplikasi putih membulat besar (radius 28px) di desktop |
| Kartu | putih, radius 20px, border tipis `#ececea`, tanpa bayangan berat |
| Teks | hitam lembut `#151515`, sekunder `#6b6b6b`; font Outfit (sudah dipakai platform) |
| Aksen | **marun MarryMe** (keputusan user): hero/aktif `#8f1d45` → `#5e1230`, sekunder rose `#f4a7b9`/`#fde7ec`, grafik rose + hitam |
| Kontrol | tombol pill (radius penuh); nav aktif = pill hitam/hijau tua dengan teks putih |
| Status | titik warna + teks: Aktif (hijau), Menunggu verifikasi (kuning), Draft (abu), Ditolak (merah), Kedaluwarsa (abu gelap) |

### 3.2 Kerangka halaman (semua tab)
```
┌───────────────────────────────────────────────────────────────┐
│ (M) MarryMe Admin  [Ringkasan][Subdomain][Trafik][Konten Demo]│
│                    [Ucapan][Keamanan]         ⟳  ⎋  (A) admin │
├──┬────────────────────────────────────────────────────────────┤
│◉ │ Selamat siang, Admin                                       │
│▣ │ Pantau platform, verifikasi undangan, dan kelola konten.   │
│✉ │ ┌──────────┐┌──────────┐┌──────────┐┌──────────────────┐  │
│⚙ │ │ kartu    ││ kartu    ││ kartu    ││ grafik           │  │
│  │ └──────────┘└──────────┘└──────────┘└──────────────────┘  │
└──┴────────────────────────────────────────────────────────────┘
```
- 10 tab sekarang digabung jadi **6 menu atas**:
  - **Ringkasan** = Monitoring + Statistik.
  - **Subdomain** = semua undangan + verifikasi (3.4).
  - **Trafik** = trafik semua web (3.5).
  - **Konten Demo** = Pengantin, Acara, Pembayaran, Lokasi, Galeri, sebagai sub-tab pill.
  - **Ucapan**.
  - **Keamanan**.
- Rail ikon kiri = pintasan menu yang sama; disembunyikan di mobile.
- Salam sesuai jam (pagi/siang/sore/malam).
- Mobile (≤ 640px): nav pill bisa di-scroll horizontal, kartu ditumpuk satu kolom, tabel jadi daftar kartu.

### 3.3 Ringkasan (Monitoring)
- **Baris KPI** (meniru "Total Earnings / Spending / Income / Revenue"):
  - Kartu hero hijau bergradasi: **Undangan Aktif** (+ total subdomain).
  - Kartu lain:
    - Total User (+N 30 hari);
    - Menunggu Verifikasi (+ draft);
    - Pembayaran Diterima (Rp);
    - RSVP Hadir / Ragu / Tidak hadir (satu kartu dengan 3 angka);
    - Pembayaran Pending.
  - Tiap kartu punya chip ikon di pojok kanan atas dan pill kecil keterangan.
- **Kartu grafik "Kunjungan"** (meniru "Total Income"):
  - batang pageviews (warna aksen) dan visitor unik (hitam), sumbu-Y bertanda, label tanggal;
  - toggle 7H / 30H sebagai pill; tooltip angka saat hover.
- **Tabel "Subdomain Terpopuler"** gaya "Recent Activities":
  - kolom Subdomain (link ke undangan), Views, Unik, bar proporsi;
  - kotak cari.
- **Registrasi Terbaru:** daftar dengan avatar inisial.
- **Halaman Terkunjungi:**
  - parameter iklan (`fbclid`, `utm_*`, `gclid`, `authError`) dibuang lalu dijumlahkan, jadi `/` menyerap semua link iklan;
  - teks panjang dipotong dengan tooltip. Perapian ini terjadi di frontend saja.
- Statistik ucapan undangan demo digabung ke sini sebagai kartu kecil.

### 3.4 Subdomain (semua undangan + verifikasi)
Satu tabel berisi **semua subdomain terdaftar** (termasuk yang belum pernah dikunjungi), gaya "Recent Activities":

| Kolom | Isi |
|---|---|
| Subdomain | `slug.marryme.web.id` (link buka undangan) |
| Pemilik | nama + **email pembuat** (akun Google) |
| Pasangan | nama mempelai |
| Desain | preset (3D/2D) + venue (Taman/Pantai) |
| Status | titik warna (Aktif, Menunggu verifikasi, Draft, Ditolak, Kedaluwarsa) |
| Kunjungan | views + visitor unik dalam rentang terpilih (7/30/90 hari) dan total sepanjang waktu |
| Terakhir dikunjungi | waktu kunjungan terakhir |
| Ucapan/RSVP | jumlah ucapan + hadir/ragu/tidak |
| Dibuat | tanggal daftar, tanggal aktif, masa berlaku |
| Aksi | Aktifkan / Tolak / lihat bukti |

- Header tabel: kotak cari (subdomain, nama, email), filter pill status dengan jumlah per status, urutkan per kolom (terbaru, kunjungan terbanyak, terakhir dikunjungi), toggle rentang 7H/30H/90H.
- Klik baris membuka **panel detail subdomain**:
  - grafik kunjungan harian subdomain itu;
  - sumber trafik (Instagram, Facebook, WhatsApp, Threads, Google, langsung);
  - ringkasan RSVP;
  - bukti transfer (pratinjau besar, dengan fallback "Bukti tidak bisa dimuat" jika gambar gagal);
  - tombol Aktifkan / Tolak.
- Baris menunggu verifikasi ditonjolkan dan selalu di atas.
- `confirm()` / `prompt()` diganti dialog di halaman (alasan penolakan wajib); aksinya tetap sama.
- Mobile: tiap baris jadi kartu.

### 3.5 Trafik (semua web)
- **Kartu KPI:**
  - total kunjungan dan visitor unik untuk semua web dalam rentang;
  - pembagian **marryme.web.id (platform/landing)** vs **semua subdomain undangan**;
  - rata-rata halaman per kunjungan;
  - subdomain teraktif hari ini.
- **Grafik harian bertumpuk:** platform vs undangan (seperti grafik "Profit and Loss" di referensi), dengan toggle 7H / 30H / 90H.
- **Sumber trafik:** dari `referrer` + `utm_source` (Instagram, Facebook, WhatsApp, Threads, Google, langsung, lainnya), dalam bar horizontal.
- **Halaman platform terkunjungi:** path dirapikan, parameter iklan (`fbclid`, `utm_*`, `gclid`) dibuang lalu dijumlahkan.
- **Tabel trafik semua subdomain:** kunjungan, unik, terakhir dikunjungi, termasuk yang 0 kunjungan.

### 3.6 Konten Demo (Pengantin, Acara, Pembayaran, Lokasi, Galeri)
- Banner info: "Mengedit undangan demo (#1)".
- Form dibagi dalam kartu putih per kelompok, input terang (border abu, fokus aksen), upload foto dengan pratinjau.
- Tombol **Simpan Perubahan** jadi bar menempel di bawah layar, dengan status "Tersimpan ✓" / error.

### 3.7 Ucapan & Keamanan
- **Ucapan:** daftar kartu dengan badge kehadiran, kotak cari, hapus lewat dialog konfirmasi.
- **Keamanan:** kartu form ganti password dengan gaya baru.

### 3.8 Login
- Halaman terang: kartu login di tengah dengan logo MarryMe, salam, dua input pill, tombol hijau.
- Pesan error di dalam kartu.

## 4. Implementasi
- Semua gaya admin di satu file `src/lib/components/admin/admin.css` dengan token CSS (`--adm-*`) dan kelas komponen. Tidak memengaruhi halaman lain; tetap pakai Tailwind untuk tata letak.
- Komponen kecil baru di `src/lib/components/admin/ui/`:
  - `AdminShell` (bingkai, nav, rail);
  - `KpiCard`, `HeroKpiCard`;
  - `BarChart`;
  - `DataTable` (cari + filter);
  - `StatusDot`;
  - `ConfirmDialog`;
  - `SaveBar`.
- Ikon: SVG inline (tanpa library baru).
- **Backend, hanya baca (tanpa migrasi):**
  - `GET /api/admin/subdomains?days=7|30|90`: semua undangan (`deleted_at IS NULL`) LEFT JOIN `users` (email pembuat), `wedding_configs` (pasangan, preset, venue), agregat `visitor_events` per `invitation_id` (views/unik dalam rentang, total, terakhir dikunjungi), agregat `guestbook_entries` (ucapan + RSVP).
  - `GET /api/admin/subdomains/:id/traffic?days=`: seri harian + sumber trafik untuk satu subdomain.
  - `GET /api/admin/analytics/traffic?days=`: seri harian platform vs undangan, sumber trafik, path platform.
  - Klasifikasi sumber (referrer/utm → Instagram/Facebook/WhatsApp/…) di `server/services/trafficSource.js` + unit test.
  - Semua di belakang `requireAdmin`. Data tidak diubah.
  - Index yang ada (`idx_ve_slug_time`, `idx_ve_created`) cukup untuk volume sekarang.
- `StatCard.svelte` dan `styles.ts` lama diganti.
- `api-client.ts`: tambah fungsi + tipe untuk 3 endpoint baru.

## 5. Tahapan (satu commit per langkah, dites di lokal)
| Langkah | Isi |
|---|---|
| A1 | Token + `admin.css`, `AdminShell` (nav 6 menu, rail, salam, tombol keluar/refresh), halaman login baru |
| A2 | Backend baca: 3 endpoint + `trafficSource.js` + tes; tipe di `api-client.ts` |
| A3 | Ringkasan: KPI, grafik kunjungan, registrasi terbaru, statistik ucapan |
| A4 | Subdomain: tabel semua subdomain + email pemilik + trafik + cari/filter/urut, panel detail, dialog aktifkan/tolak |
| A5 | Trafik: KPI platform vs undangan, grafik bertumpuk, sumber trafik, path dirapikan, tabel semua subdomain |
| A6 | Konten Demo + Ucapan + Keamanan: form terang, save bar, dialog hapus |
| A7 | Rapikan mobile (390px) + desktop (1440px), screenshot sebelum/sesudah, cek tidak ada error console |

Pengujian di lokal:
- `npm run check`.
- Login admin lokal.
- Klik semua tab.
- Aktifkan / tolak / simpan diuji pada **data lokal saja**.
- Screenshot desktop + mobile dibandingkan dengan referensi.

Deploy ke VPS hanya setelah user setuju (frontend + endpoint baca, tanpa migrasi).

## 6. Keputusan user (2026-10-09)
1. Warna aksen: **marun MarryMe** dengan tata letak referensi.
2. Menu: **6 menu** (Ringkasan, Subdomain, Trafik, Konten Demo, Ucapan, Keamanan).
3. Branch: **`admin_ui`** terpisah.

## 7. Catatan hasil
- Statistik ucapan undangan demo dipindah ke menu **Ucapan** (bukan Ringkasan) supaya tidak tertukar dengan RSVP seluruh platform.
- Tombol Aktifkan/Tolak hanya muncul untuk status `pending_verification` (satu-satunya status yang diterima API; UI lama menampilkan Aktifkan untuk semua status non-aktif dan berakhir 409).
- Waktu dari endpoint baru dikirim dengan zona eksplisit (TIMESTAMP lewat `UNIX_TIMESTAMP`, DATETIME UTC diberi `Z`) karena zona sesi MySQL lokal (+07) dan VPS bisa berbeda.
- Ditemukan, belum diperbaiki: `/api/public/photos/<file>` membalas 500 (bukan 404) bila file foto tidak ada.
