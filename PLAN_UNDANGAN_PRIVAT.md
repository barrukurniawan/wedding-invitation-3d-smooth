# Rencana: Undangan Privat

Status: **sudah diimplementasikan di branch `undangan_privat`, belum di-merge/deploy**. Tahap 6 (katalog/FAQ) belum. Branch kerja nanti: `undangan_privat` (dari `new_staging`), dites di `<slug>.localhost:5173`, baru merge + deploy setelah disetujui.

## 1. Latar belakang

Customer bertanya "bisa ngga undangannya private?". Di Indonesia, "undangan privat" biasanya berarti:

1. **Link unik per tamu** (paling umum, dipakai Invitera dkk). Tiap tamu dapat link berkode acak. Tanpa kode yang valid, yang tampil hanya "Undangan ini privat".
2. **Satu PIN untuk semua tamu.** Paling gampang, tapi paling lemah karena PIN ikut diteruskan bersama link.
3. **Info sensitif disembunyikan.** Nama dan foto mempelai tetap tampil, tapi alamat, peta, rekening/QRIS, alamat kirim kado, dan buku tamu hanya untuk tamu dengan link resmi.
4. **Tidak muncul di Google** (noindex).

Yang perlu jujur disampaikan ke customer: undangan web tidak bisa 100% dicegah diteruskan. Tapi dengan link unik, undangan tetap menulis "Kepada: [nama tamu asli]", jadi kelihatan kalau diteruskan, dan pasangan bisa menonaktifkan link tamu itu.

## 2. Kondisi sekarang (hasil cek kode)

- Daftar tamu ada di `invitation_contacts` (`name`, `phone`, `gender`; maks 100/undangan, `server/routes/contacts.js`).
- Link WA dibuat di `InvitationSender.svelte`: `https://<slug>.marryme.web.id/?send=Nama&g=m`. `send` hanya personalisasi nama (dibaca `App.svelte` dan diteruskan `Garden2DApp.svelte` ke iframe), **bukan pengaman**.
- Data undangan publik keluar lewat beberapa pintu, semuanya tanpa kontrol akses selain status trial/aktif:
  - `GET /api/config` (`routes/config.js`): termasuk `bank_name`, `bank_account`, `bank_holder`, `qris_image`, `maps_url`, `venue_address`, `resepsi_location`, `gift_shipping`, foto galeri. Juga di-fetch lebih awal di `src/app.html` (`window.__EARLY_CONFIG`).
  - `GET /api/multiplayer/content` (dipakai preset 2D `cms-bootstrap.js`): field yang sama (rekening, maps, dst).
  - `GET/POST /api/guestbook`, `POST /api/wishes/list|send`, `POST /api/join|sync` (multiplayer).
- **Celah yang sudah ada sekarang (perlu diperbaiki terlepas dari fitur ini):** `/api/multiplayer/content` dan `/api/wishes/*` menerima parameter `site=<slug>` dan memprioritaskannya di atas host. Artinya siapa pun bisa membaca rekening/alamat undangan mana pun lewat `?site=slug-lain`, dari host apa pun. Di host undangan, `site` harus diabaikan dan slug diambil dari `req.hostContext`.
- Belum ada `noindex` sama sekali (tidak ada `X-Robots-Tag`, meta robots, atau `robots.txt`).
- File upload foto/musik bernama acak (`<prefix>_<timestamp>_<12 hex>`), jadi URL-nya tidak bisa ditebak. URL foto hanya bocor kalau seseorang sudah membuka undangan dan menyalinnya. Ini batas yang bisa diterima.

## 3. Yang dibangun

### 3.1 Mode privasi per undangan (pilihan pasangan)

Kolom baru `wedding_configs.privacy_mode`:

| Nilai | Pengunjung tanpa kode valid melihat |
|---|---|
| `public` (default) | Seperti sekarang. Semua undangan live tidak berubah. |
| `hide_details` | Undangan tampil (nama, foto, tanggal, musik, dunia 3D/2D), tapi alamat, peta, resepsionis/lokasi, rekening, QRIS, alamat kirim kado, dan isi buku tamu disembunyikan, diganti teks "Info ini khusus tamu undangan". Tidak bisa menulis ucapan. |
| `private` | Hanya layar "Undangan ini privat. Buka lewat link yang dikirim mempelai." Tidak ada nama, foto, atau data apa pun. |

Tampilan di dashboard (diputuskan 2026-11-02): begitu subdomain dibuat, tab Pengaturan `DashboardShell.svelte` menampilkan pilihan **Publik / Privat**, default **Publik**. Kalau Privat dipilih, muncul sub-pilihan "Pengunjung tanpa link khusus:" → "Tidak bisa melihat apa pun" (default, `private`) atau "Bisa lihat undangan, tanpa alamat/rekening/buku tamu" (`hide_details`). Di bawahnya ada batas perangkat (§3.2a) dan link umum (§3.3). Ikut di allowed-fields + zod enum `PATCH /api/my/config`, dan di union TS `api-client.ts`.

### 3.2 Kode akses per tamu

Kolom baru di `invitation_contacts`:

- `access_code VARCHAR(16) NULL` + unique index `(invitation_id, access_code)`. Diisi server (10 karakter base62 dari `crypto.randomBytes`), tidak diisi lewat SQL (UUID() MySQL tidak acak penuh). Kontak lama dapat kode otomatis saat daftar tamu pertama kali dimuat.
- `revoked_at TIMESTAMP NULL`: link dinonaktifkan.
- `first_opened_at TIMESTAMP NULL`, `open_count INT DEFAULT 0`: supaya pasangan lihat "Sudah dibuka" dan bisa curiga kalau satu link dibuka puluhan kali.

Link WA jadi: `https://<slug>.marryme.web.id/?send=Nama&g=m&k=<kode>`. Untuk undangan `public`, `k` tetap dikirim (tidak berbahaya, dan kalau pasangan nanti menyalakan mode privat, link yang sudah terkirim tetap jalan).

### 3.2a Kalau link tamu diteruskan ke nomor lain

Fakta teknis: saat link dibuka, website **tidak tahu nomor WA siapa yang membuka**. WhatsApp tidak mengirim nomor ke situs. Jadi "link hanya bisa dibuka oleh nomor X" tidak mungkin, kecuali tamu diminta verifikasi OTP WA. Itu menambah biaya per pesan dan merepotkan tamu (terutama orang tua), dan hampir tidak dipakai undangan pernikahan di Indonesia.

Pola yang umum di platform Indonesia (Invitera, Ze Guest Management, Invita): link per tamu **tetap bisa dibuka** kalau diteruskan. Pengamanannya ada di tiga hal: nama tamu asli tetap tertulis, pasangan bisa mematikan link, dan masuk ke lokasi acara memakai QR check-in per tamu. Belum ada sumber yang menjelaskan bahwa platform-platform itu benar-benar memblokir link yang diteruskan.

Kebijakan MarryMe:

- **Default:** link yang diteruskan tetap terbuka penuh, tapi tetap menulis "Kepada: <nama tamu asli>". Nama tidak bisa diganti lewat URL. `open_count` dan jumlah perangkat yang membuka terlihat di dashboard, dan pasangan bisa menekan "Nonaktifkan link".
- **Batas perangkat per link tamu: default aktif, maks 2 perangkat** (diputuskan 2026-11-02). Batas ini hanya berlaku di mode `hide_details` dan `private`. Di mode `public` tidak berarti apa-apa, karena undangan memang terbuka tanpa kode. Pasangan bisa mengubah angkanya (1–5) atau mematikannya di Pengaturan. Link umum (§3.3) tidak dibatasi perangkat. Cara kerjanya: saat link dibuka, browser menyimpan ID perangkat acak (localStorage). Server mencatat ID itu per kode (tabel `invitation_contact_devices`). Perangkat ke-(N+1) diperlakukan seperti pengunjung tanpa kode (terbatas/terkunci sesuai mode) dan melihat pesan "Link ini sudah dibuka di perangkat lain. Minta link sendiri ke mempelai." Batasnya ada: tamu yang membuka di HP lalu laptop, ganti browser, atau memakai mode incognito ikut terhitung. Karena itu pasangan bisa mereset perangkat per tamu dari dashboard.
  - Jebakan utama: browser bawaan WhatsApp/Instagram (in-app browser, terutama di iPhone) punya penyimpanan terpisah dari Safari/Chrome. Satu tamu yang membuka dari WA lalu menekan "Buka di browser" bisa langsung memakai 2 jatah. Mitigasi: perangkat baru dengan IP yang sama dengan perangkat yang sudah tercatat, dalam 24 jam, dihitung sebagai perangkat yang sama dan tidak memakai jatah baru.
  - Perangkat ke-3 ditolak dengan sopan, dan pasangan melihat badge "Ditolak 1 perangkat" di daftar tamu. Ini tanda link diteruskan, atau tamu perlu direset.
  - Kolom `wedding_configs.privacy_device_limit TINYINT NULL DEFAULT 2` (NULL = tanpa batas).
- Tidak ada verifikasi OTP WA.

### 3.3 Link umum (untuk tamu di luar daftar)

Daftar tamu dinaikkan dari 100 menjadi **200** (`MAX_CONTACTS` di `contacts.js` + teks "Maks. 100" di dashboard). Tetap saja, sementara banyak pasangan punya tamu lebih banyak atau mau share di grup keluarga. Maka ada **satu link umum** per undangan: kolom `wedding_configs.privacy_general_code`. Dashboard menampilkan link itu + tombol "Buat link baru" (kode lama langsung mati). Tamu lewat link umum melihat "Kepada: Tamu Undangan".

Ini menggantikan opsi PIN bersama: fungsinya sama, tapi tamu tidak perlu mengetik apa pun, dan bisa diganti kapan saja.

### 3.4 Pengecekan di server (inti keamanannya)

Karena frontend statis (adapter-static), penjagaan **harus di API**, bukan di UI.

- Middleware baru `resolveGuestAccess` dipasang setelah `requirePublicInvitation`. Membaca kode dari header `X-Invite-Key` (atau query `k` untuk fetch awal), lalu menetapkan `req.guestAccess = { level: 'full' | 'limited' | 'none', guestName?, gender? }`:
  - `public` → selalu `full`.
  - kode tamu valid dan tidak di-revoke → `full` + nama tamu dari database. Update `open_count` (maks sekali per 30 menit per kode, agar tidak menulis DB di tiap request).
  - kode umum valid → `full`, nama "Tamu Undangan".
  - selain itu → `limited` (mode `hide_details`) atau `none` (mode `private`).
- Rute yang dijaga:
  - `/api/config`: `none` → `{ privacy: 'private' }` saja (status 200 agar frontend tidak menganggap error dan tidak retry). `limited` → field sensitif dihapus. Respons selalu menyertakan `privacy` dan `guest` (nama tamu dari server).
  - `/api/multiplayer/content`: sama seperti config. Abaikan `site` di host undangan (perbaikan celah §2).
  - `/api/guestbook` dan `/api/wishes/*`: `full` saja.
  - `/api/join|sync|leave`: `full` saja untuk mode `private`. Untuk `hide_details` boleh ikut multiplayer.
- Kode salah → rate limit per IP (mis. 30 percobaan gagal / 10 menit) supaya tidak bisa ditebak massal. Dengan 10 karakter base62 (~59 bit) menebak memang tidak realistis, ini lapisan tambahan.
- Respons yang tergantung kode diberi `Cache-Control: private, no-store` + `Vary: X-Invite-Key`, supaya Cloudflare/service worker tidak menyimpan versi lengkap lalu menyajikannya ke orang tanpa kode. **Ini wajib dicek ulang di nginx dan service worker.**

### 3.5 Frontend

- `src/app.html` (fetch awal), `services/config.ts`, `api-client.ts`, dan `cms-bootstrap.js` (preset 2D): ambil `k` dari URL, kirim sebagai `X-Invite-Key`. Kode TIDAK disimpan browser (diputuskan 2026-11-02): tanpa `?k=` di alamat = terkunci; link di riwayat WA/browser tetap membawa `?k=`. `Garden2DApp.svelte` meneruskan `k` ke iframe seperti `send` sekarang.
- Nama tamu: kalau server mengirim `guest.name`, itu yang dipakai (bukan `?send=`). Jadi link yang diteruskan tetap menulis nama tamu asli, dan orang tidak bisa mengganti nama sendiri di URL.
- `TenantBootstrap.svelte`: kalau `privacy === 'private'` dan tidak ada akses → tampilkan layar privat (varian `TenantStateScreen`, gaya sama), jangan load 3D/2D sama sekali.
- Mode `hide_details`: komponen yang menampilkan maps/rekening/QRIS/alamat kado/buku tamu (3D: `WeddingStageModal`, resepsionis, mailbox/`GuestbookModal`; 2D: panel di `cms-bootstrap.js`/`game.js`) harus menangani field kosong dengan teks pengganti, bukan tombol rusak. Perlu inventaris lengkap saat implementasi.
- Preview pemilik: tombol "Lihat undangan" di dashboard memakai link umum, supaya pasangan selalu bisa membuka undangannya sendiri.

### 3.6 Dashboard (Kirim Undangan)

Di `InvitationSender.svelte`, per tamu:

- Badge "Belum dibuka" / "Dibuka 3x".
- Tombol "Salin link" (untuk dikirim lewat selain WA).
- Tombol "Nonaktifkan link" (pakai `ConfirmDialog`-style konfirmasi) dan "Aktifkan lagi". Endpoint baru `PATCH /api/my/contacts/:id` (`{ revoked: boolean }`) + `POST /api/my/contacts/:id/regenerate` (kode baru, link lama mati).

### 3.7 noindex untuk semua undangan

Berlaku untuk semua undangan, termasuk `public` (data pribadi pasangan memang tidak perlu ada di Google):

- nginx: `add_header X-Robots-Tag "noindex, nofollow" always;` untuk host `*.marryme.web.id` (bukan root, bukan `/katalog/`).
- Tanpa `robots.txt Disallow`: kalau Google dilarang merayapi, ia tidak bisa membaca header noindex. Sebagai gantinya ada meta robots di `app.html`.
- Root `marryme.web.id` tetap terindeks (landing + katalog).

## 4. Database (migration baru, idempoten)

`database/migrations/022_undangan_privat.sql` + daftarkan di `server/scripts/migrate.js`. Pola INFORMATION_SCHEMA seperti `012_preset_theme.sql`:

- `wedding_configs.privacy_mode ENUM('public','hide_details','private') NOT NULL DEFAULT 'public'`
- `wedding_configs.privacy_general_code VARCHAR(16) NULL`
- `invitation_contacts.access_code VARCHAR(16) NULL`, `revoked_at TIMESTAMP NULL`, `first_opened_at TIMESTAMP NULL`, `open_count INT NOT NULL DEFAULT 0`
- unique index `(invitation_id, access_code)`

Semua kolom punya default yang membuat perilaku persis sama dengan sekarang. 11 undangan live tidak terpengaruh sampai pasangannya sendiri menyalakan mode privat. Undangan demo #1 (Konten Demo admin) tetap `public`.

## 5. Tahapan (satu commit per tahap)

1. **Perbaikan celah `?site=`** di `routes/multiplayer.js` + noindex (nginx + robots.txt). Kecil, bermanfaat untuk semua undangan, bisa di-deploy duluan kalau mau.
2. Migration 022 + kode akses di `contacts.js` (generate, revoke, regenerate, serialize) + batas 200 tamu + test Express. Tabel `invitation_contact_devices` (kode, device id, IP hash, waktu) dan kolom `privacy_device_limit` ikut di migration ini.
3. Middleware `resolveGuestAccess` + penjagaan di config/content/guestbook/wishes/multiplayer + header cache + test Express (tiap mode × tiap jenis kode).
4. Frontend: kirim `X-Invite-Key` (hanya dari `?k=` di URL, tidak diingat browser), nama tamu dari server, layar privat, penanganan field kosong di 3D dan 2D.
5. Dashboard: pilihan mode privasi di Pengaturan, link umum, badge dibuka + salin/nonaktifkan link.
6. Update teks katalog/tutorial (`static/katalog/index.html`) dan FAQ landing setelah fitur jadi.

## 6. Cara tes di lokal

Di `kia-toni.localhost:5173` (atau slug tes lain), untuk tiap mode `public` / `hide_details` / `private`:

- Buka tanpa `k` → hasil sesuai tabel §3.1.
- Buka dengan `k` tamu → undangan lengkap, "Kepada: <nama dari DB>", walau `?send=` diganti nama lain.
- Revoke tamu → link yang sama jadi terbatas/terkunci.
- Link umum → lengkap, "Tamu Undangan". Buat link baru → link lama mati.
- Reload tanpa `?k=` setelah sekali buka dengan kode → tetap lengkap (localStorage).
- Preset 3D dan 2D, desktop dan HP.
- `curl` langsung ke `/api/config`, `/api/multiplayer/content?site=…`, `/api/guestbook` tanpa header → tidak ada data sensitif.
- Cek header respons: `Cache-Control: private, no-store`, dan `X-Robots-Tag` di subdomain.

## 7. Perlu keputusan kamu

Sudah diputuskan (2026-11-02): fitur **gratis** untuk semua undangan, batas daftar tamu **200**, batas **2 perangkat per link tamu** aktif secara default di mode privat.

Juga diputuskan: di mode `private`, tamu tanpa kode tidak bisa masuk dunia multiplayer. Pilihan Publik/Privat ada di dashboard setelah subdomain dibuat, default Publik.

Masih terbuka:

1. ~~Urutan deploy~~ → diputuskan: perbaikan celah `?site=` + noindex dideploy **sekalian** bersama fitur privat.

## 8. Referensi riset

- Fortune IDN: undangan nikah digital yang aman untuk data pribadi (Invitera, link per tamu)
- Times Indonesia: Ze Guest Management
- detikInet: Invita, undangan dengan QR code
- RSVPify: privasi event invite-only, invitee passcodes
