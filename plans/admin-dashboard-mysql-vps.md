# Implementation Plan: Dashboard Admin MySQL untuk VPS

## Tujuan

Menghapus Supabase sepenuhnya dan menjadikan MySQL pada VPS sebagai satu-satunya database persisten untuk:

- konfigurasi undangan yang dikelola di `/admin`;
- buku tamu yang dikirim dari halaman undangan;
- autentikasi administrator.

Frontend SvelteKit tetap berupa static SPA. Karena browser tidak boleh terhubung langsung ke MySQL, aplikasi membutuhkan Express API yang berjalan pada VPS sebagai satu-satunya penghubung antara frontend dan MySQL. Nginx menyajikan hasil build dan meneruskan request `/api/*` ke Express pada jaringan lokal VPS.

## Kondisi Saat Ini dan Gap

Komponen dasar migrasi sudah ada, tetapi belum menjadi satu alur yang konsisten:

| Area | Kondisi saat ini | Perubahan yang diperlukan |
| --- | --- | --- |
| Database | `database/schema.sql` telah mendefinisikan `wedding_config` dan `guestbook` | Ganti penyimpanan password plaintext dengan tabel kredensial terpisah dan hash bcrypt. |
| API | Express, `mysql2`, dan route config/guestbook sudah tersedia di `server/` | Tambahkan autentikasi sesi, validasi input, pagination, error contract, dan hardening produksi. |
| Frontend client | `src/lib/api-client.ts` telah memakai `fetch` dan fallback localStorage | Jadikan satu sumber API, gunakan cookie sesi, dan hapus fallback localStorage untuk mode production. |
| Dashboard | `/admin` masih import type dan service Supabase; login membandingkan password dari config yang diambil publik | Pindahkan login/logout/check-session ke API dan jangan pernah mengirim hash/password ke browser. |
| Service publik | `src/lib/services/api.ts` dan `config.ts` masih memakai Supabase | Alihkan keduanya ke client HTTP MySQL API. |
| Dependensi | `@supabase/supabase-js`, `src/lib/supabase.ts`, dan schema lama masih ada | Hapus setelah seluruh call site berpindah dan build lolos. |

## Arsitektur Target

```text
Browser
  | GET /, /admin, /assets
  v
Nginx :80/:443
  | static files: /var/www/wedding-summer/current/build
  | /api/* reverse proxy (localhost only)
  v
Express API :3001 (PM2, localhost:3001)
  | mysql2 connection pool
  v
MySQL 8 :3306 (localhost only)
```

Kebijakan akses endpoint:

| Endpoint | Konsumen | Akses |
| --- | --- | --- |
| `GET /api/config/public` | halaman undangan | publik, hanya field yang diperlukan pengunjung |
| `GET /api/guestbook` | halaman undangan dan admin | publik, hasil terpaginasikan |
| `POST /api/guestbook` | halaman undangan | publik, dibatasi dan divalidasi |
| `POST /api/admin/session` | halaman login admin | publik, rate-limited |
| `GET /api/admin/session` | dashboard | sesi admin wajib |
| `DELETE /api/admin/session` | dashboard | sesi admin wajib |
| `GET /api/admin/config` | dashboard | sesi admin wajib, data edit lengkap tanpa hash password |
| `PUT /api/admin/config` | dashboard | sesi admin wajib |
| `GET /api/admin/guestbook` | dashboard | sesi admin wajib, mendukung filter dan pagination |
| `DELETE /api/admin/guestbook/:id` | dashboard | sesi admin wajib |
| `GET /api/admin/stats` | dashboard | sesi admin wajib |
| `POST /api/admin/password` | dashboard | sesi admin wajib dan password lama benar |
| `GET /api/health` | monitoring VPS | hanya status layanan, tanpa rahasia |

Gunakan path relatif `/api` saat production. Dengan ini cookie `HttpOnly` bersifat same-origin, CORS tidak diperlukan pada deployment normal, dan `VITE_API_URL` tidak perlu menyimpan URL publik. Untuk pengembangan yang memisahkan port Vite dan API, gunakan proxy Vite untuk `/api`, bukan `cors()` terbuka.

## Keputusan Keamanan

1. Jangan simpan `admin_password` pada `wedding_config` dan jangan kirim password atau hash melalui endpoint konfigurasi publik.
2. Simpan satu akun admin di MySQL dengan `password_hash` yang dibuat menggunakan `bcrypt` (cost minimal 12). Password awal hanya diberikan sekali lewat environment variable atau command seed, bukan SQL yang dikomit.
3. Login menghasilkan token acak kriptografis. Simpan hanya SHA-256 token tersebut di tabel sesi; cookie menyimpan token asli dengan atribut `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/api`, dan masa aktif eksplisit.
4. Semua endpoint tulis dan semua endpoint `/api/admin/*` harus memverifikasi sesi. Header `X-Admin-Password` dihapus.
5. Terapkan rate limit pada login dan submit buku tamu. Batasi ukuran request JSON, panjang field, dan jumlah item galeri.
6. MySQL dan Express hanya mendengar localhost. Firewall membuka hanya `22`, `80`, dan `443`; akses SSH dibatasi sesuai kebijakan VPS.
7. Nilai rahasia berada di `server/.env`, owner user deploy, permission `600`, dan tercantum di `.gitignore`. Tidak ada default password database atau admin di source code.
8. Gunakan HTTPS sebelum cookie `Secure` diaktifkan. Tambahkan security headers di Nginx dan nonaktifkan pesan error internal ke browser.

## Skema Database dan Migrasi

Buat migration bernomor di `database/migrations/`, bukan satu file schema yang berubah-ubah. Contoh urutan:

1. `001_initial_schema.sql`
   - Buat database dengan `utf8mb4` dan tabel `wedding_config` satu baris (`id = 1`).
   - Buat tabel `guestbook` dengan UUID string, `name`, `attendance`, `message`, `created_at`.
   - Buat index `(created_at, id)` untuk daftar buku tamu yang diurutkan terbaru.
   - Gunakan `JSON` untuk `gallery_photos`; API bertanggung jawab melakukan parse/stringify secara aman.
2. `002_admin_auth.sql`
   - Hapus kolom `admin_password` dari `wedding_config` bila sudah ada.
   - Buat `admin_users`: `id`, `username` unik, `password_hash`, `created_at`, `updated_at`.
   - Buat `admin_sessions`: `id`, `user_id`, `token_hash` unik, `expires_at`, `created_at`, `last_seen_at`; index `token_hash` dan `expires_at`.
3. `003_guestbook_moderation.sql` (opsional tetapi direkomendasikan)
   - Tambah `status ENUM('visible','hidden') DEFAULT 'visible'`, `moderated_at`, `moderated_by`.
   - Halaman publik hanya mengembalikan entri `visible`; admin dapat menyembunyikan/menghapus spam tanpa kehilangan audit data.

Field konfigurasi tetap mengikuti data yang digunakan oleh `weddingConfig` dan modal undangan: pasangan, orang tua, foto, tanggal, detail akad/resepsi, QRIS, rekening, peta, alamat, galeri, dan quote. Definisikan batas panjang berdasarkan UI/API (misalnya nama 255, message 2.000, URL 2.048 karakter) agar database dan validasi sinkron.

Seed dijalankan melalui command Node terpisah, misalnya `npm run seed-admin -- --username admin`, yang meminta password secara interaktif atau membaca `ADMIN_INITIAL_PASSWORD`. Command tersebut memakai bcrypt, melakukan upsert secara aman, dan tidak menampilkan password dalam log.

## Implementasi API Express

### Struktur Server

Refactor `server/` menjadi:

```text
server/
  src/
    app.js                 # middleware dan mounting routes
    index.js               # startup dan graceful shutdown
    db.js                  # mysql2 pool dari environment wajib
    config.js              # parse/validasi environment saat boot
    middleware/
      requireAdmin.js      # resolve cookie token dan sesi aktif
      errorHandler.js      # response error konsisten
      rateLimit.js         # limit login dan guestbook
    routes/
      publicConfig.js
      publicGuestbook.js
      adminAuth.js
      adminConfig.js
      adminGuestbook.js
      adminStats.js
    schemas/               # Zod schemas untuk body/query/params
    services/              # query database dan business rules
  scripts/seed-admin.js
  .env.example
  package.json
```

Tambahkan dependensi server: `bcrypt`, `cookie-parser`, `helmet`, `express-rate-limit`, dan `zod`. Pertahankan `express`, `mysql2`, serta `dotenv`; hapus `cors` bila proxy Vite dipakai untuk development. `uuid` tidak diperlukan bila Node runtime mendukung `crypto.randomUUID()`.

### Contract dan Perilaku Endpoint

- Semua response JSON memakai bentuk konsisten: data sukses langsung atau `{ "error": { "code", "message" } }` untuk kegagalan. Jangan mengekspos SQL error.
- `POST /api/admin/session`: validasi username/password, lakukan compare bcrypt, buat sesi, set cookie, jawab `204`. Respons login selalu generik saat kredensial salah.
- `GET /api/admin/session`: jawab `{ authenticated: true, user: { id, username } }` atau `401`; dashboard menggunakannya saat mount untuk memulihkan sesi.
- `DELETE /api/admin/session`: hapus sesi database dan clear cookie. Logout juga terjadi bila sesi kedaluwarsa.
- `GET /api/config/public`: lakukan SELECT allowlist, sehingga data auth tidak dapat bocor walau kolom baru ditambahkan di masa depan.
- `PUT /api/admin/config`: parse body melalui schema, gunakan allowlist kolom, transaksi bila diperlukan, dan kembalikan konfigurasi terbaru. Jangan menerima `id`, timestamp, atau field auth dari browser.
- `POST /api/guestbook`: trim string, tolak attendance di luar tiga pilihan UI, batasi panjang, lalu insert parameterized query. Kembalikan entry baru dengan `201`.
- Endpoint daftar menerima `page` dan `limit` dengan batas maksimum (contoh 50), serta mengembalikan `{ items, page, limit, total }`. Untuk dataset besar, ganti ke cursor pagination sebagai peningkatan lanjutan.
- `GET /api/admin/stats`: hitung total dan jumlah per attendance langsung dengan agregasi SQL, bukan seluruh daftar dipindah ke browser.
- `DELETE /api/admin/guestbook/:id`: pilih soft hide bila migration moderasi dipakai; jika tetap delete permanen, balas `404` jika ID tidak ada.
- Startup API menguji koneksi pool (`SELECT 1`) dan menolak start bila environment wajib hilang. Tambahkan penanganan `SIGTERM`/`SIGINT` untuk menutup pool saat PM2 deploy/restart.

## Implementasi Frontend dan Dashboard

### Client Data

1. Jadikan `src/lib/api-client.ts` satu source of truth untuk type domain dan fungsi `fetch`.
2. Pecah fungsi menjadi client publik (`getPublicConfig`, `submitGuestbook`, `getPublicGuestbook`) dan client admin (`login`, `logout`, `getSession`, `getAdminConfig`, `updateAdminConfig`, `getAdminGuestbook`, `deleteGuestbookEntry`, `getStats`, `changePassword`). Semua request admin memakai `credentials: 'same-origin'`.
3. Ubah `src/lib/services/config.ts` dan `src/lib/services/api.ts` menjadi facade tipis atau hapus dan update seluruh caller langsung ke client baru. Jangan pertahankan jalur Supabase maupun import Supabase.
4. Update `src/lib/stores/weddingConfig.svelte.ts` untuk import type/default dari `api-client.ts` dan mengambil konfigurasi publik.
5. Perbaiki `GuestbookModal.svelte` agar timestamp MySQL ISO string diproses dengan `new Date(ts)`, bukan format Firebase `ts.seconds`. Tampilkan error submit kepada pengguna dan cegah submit ganda saat request berjalan.
6. LocalStorage boleh dipertahankan hanya sebagai mode demo yang dipilih eksplisit lewat `VITE_DATA_MODE=local`; production harus fail visibly apabila API tidak dapat dihubungi agar data tidak tampak tersimpan lokal tetapi hilang untuk pengunjung lain.

### Alur Admin `/admin`

1. Saat route dimuat, panggil `GET /api/admin/session`.
2. Jika `401`, tampilkan form username/password. Form mengirim `POST /api/admin/session`; password tidak disimpan di `$state`, localStorage, query parameter, atau log browser setelah request selesai.
3. Jika sesi valid, ambil konfigurasi admin, statistik, dan halaman pertama buku tamu secara paralel.
4. Pecah `src/routes/admin/+page.svelte` menjadi bagian kecil sesuai tab bila ukurannya menghambat perawatan: `AdminLogin`, `ConfigEditor`, `GuestbookManager`, `StatsPanel`, dan `PasswordForm`.
5. Pertahankan tab bisnis saat ini: Pengantin, Acara, Pembayaran, Lokasi, Galeri, Ucapan, Statistik. Tambahkan tab/section Keamanan untuk perubahan password yang memerlukan password saat ini dan konfirmasi password baru.
6. Save konfigurasi hanya mengirim field tab yang berubah. Tampilkan loading, sukses, validasi field, dan kegagalan jaringan yang jelas. Disable tombol saat request aktif.
7. Manager buku tamu menggunakan pagination, refresh, filter kehadiran/status, dan dialog konfirmasi sebelum hide/hapus. Statistik di-refresh setelah perubahan moderasi.
8. Logout memanggil endpoint logout kemudian menghapus state konfigurasi, entries, dan tab sensitif di memory.
9. Dashboard tetap `ssr = false` dan `prerender = false`; halaman undangan tetap static melalui adapter-static.

## Penghapusan Supabase

Setelah seluruh frontend dan API memakai MySQL API:

1. Hapus `src/lib/supabase.ts`.
2. Hapus `supabase_schema.sql`.
3. Hapus `@supabase/supabase-js` dari root `package.json`, lalu perbarui `package-lock.json` dengan `npm install`.
4. Cari kembali `supabase|Supabase|getSupabase` di source, dokumentasi, dan environment template; tidak boleh ada hasil pada runtime source.
5. Perbarui `README.md` agar menjelaskan MySQL/Express dan deployment VPS, bukan Firebase/Supabase.

## Konfigurasi Local Development

1. Buat `.env.example` pada root dengan `VITE_DATA_MODE=api`; gunakan Vite `server.proxy['/api'] = 'http://127.0.0.1:3001'` untuk development.
2. Buat `server/.env.example` tanpa nilai rahasia nyata: `PORT`, `NODE_ENV`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_TTL_HOURS`, `COOKIE_SECURE`.
3. Tambahkan `.env`, `.env.*`, dan `server/.env` ke `.gitignore`, dengan pengecualian aman untuk `.env.example`.
4. Tambahkan root script orkestrasi, misalnya `dev:api`, agar frontend dan API dapat dijalankan terpisah dengan jelas. MySQL lokal dapat berupa service host atau Docker Compose khusus development.

## Deployment VPS

### Provisioning Sekali

1. Buat user deploy non-root, install Node.js LTS, MySQL 8, Nginx, Certbot, dan PM2. Jangan gunakan instalasi `npm -g` yang tidak dipin Node version manager tanpa mendokumentasikan versinya.
2. Konfigurasikan MySQL bind ke `127.0.0.1`; buat user `wedding_app` khusus aplikasi dengan privilege minimum pada satu database. Jangan gunakan root dan jangan gunakan password contoh.
3. Jalankan migration berurutan dan seed admin. Simpan backup terenkripsi sebelum migration yang mengubah schema.
4. Taruh source/release di `/var/www/wedding-summer`, build static di release directory, dan symlink `current` agar rollback dapat dilakukan dengan mengembalikan symlink ke release sebelumnya.
5. Jalankan Express melalui PM2 memakai `deploy/ecosystem.config.cjs`, `NODE_ENV=production`, log yang dibatasi/dirotasi, autorestart, dan startup systemd.
6. Nginx menyajikan `build/`, memakai `try_files $uri $uri/ /index.html` untuk SPA, proxy `/api/` ke `127.0.0.1:3001`, menambahkan timeout wajar dan security headers. Hindari cache HTML; cache asset ber-hash jangka panjang.
7. Aktifkan TLS Lets Encrypt sebelum `COOKIE_SECURE=true`. Verifikasi auto-renew certificate.
8. Pasang firewall dan monitoring sederhana: `pm2 status`, endpoint health internal, log Nginx/API, ruang disk, serta cron backup MySQL.

### Prosedur Deploy Rilis

1. Di CI atau mesin deploy, jalankan `npm ci`, `npm run check`, dan `npm run build`; jalankan juga `npm ci` pada `server/` dan test API.
2. Upload release immutable beserta `build/`, `server/`, migration baru, dan lockfiles; jangan upload `.env`.
3. Jalankan migration dengan akun database migration yang sesuai, setelah backup tervalidasi.
4. Jalankan/reload PM2, lalu cek `GET /api/health` melalui localhost dan domain HTTPS.
5. Ganti symlink static release, reload Nginx setelah `nginx -t`, lalu smoke test pengunjung dan admin.
6. Jika gagal, kembalikan symlink static dan PM2 ke release sebelumnya. Migration destructive hanya boleh dilakukan setelah ada rencana rollback data yang teruji.

## Backup dan Operasional

- Jalankan `mysqldump --single-transaction` harian ke storage di luar VPS, encrypt backup, dan rotasi retensi (contoh harian 14 hari, mingguan 8 minggu).
- Uji restore berkala pada database non-produksi. Backup tanpa uji restore tidak cukup untuk menyatakan recovery siap.
- Bersihkan sesi kedaluwarsa melalui job harian (`DELETE FROM admin_sessions WHERE expires_at < NOW()`).
- Catat error aplikasi dan kegagalan login tanpa menyimpan password, token sesi, maupun data koneksi database.

## Urutan Pengerjaan

1. Audit dan putuskan contract API final serta model moderasi buku tamu.
2. Buat migration bernomor, command seed admin, dan prosedur backup/migration lokal.
3. Refactor server: environment validation, pool, schema validation, auth session, endpoint publik/admin, error handling, dan rate limit.
4. Tambahkan test API untuk auth, otorisasi, validasi body, query config, submit/list/moderasi buku tamu, dan statistik.
5. Refactor `api-client.ts`, service, store, dan modal buku tamu untuk contract API baru.
6. Refactor dashboard `/admin` ke autentikasi sesi, data admin terproteksi, password change, state error/loading, dan pagination buku tamu.
7. Hapus Supabase dari source, dependency, schema, environment, serta dokumentasi.
8. Tambahkan konfigurasi Vite proxy, PM2, Nginx, environment templates, firewall/backup guide, dan deploy procedure.
9. Jalankan verifikasi lokal serta staging VPS sebelum production cutover.

## Kriteria Penerimaan dan Verifikasi

- `rg 'supabase|Supabase|getSupabase' src package.json` tidak memiliki hasil.
- `npm run check` dan `npm run build` root berhasil; dependensi server terkunci dan server dapat start dengan environment valid.
- Request publik dapat membaca konfigurasi/guestbook dan mengirim buku tamu valid; input invalid mendapat `400` tanpa insert.
- Request admin tanpa cookie mendapat `401`; password salah tidak dapat mengubah config atau menghapus buku tamu.
- Setelah login, browser menerima cookie `HttpOnly`; refresh `/admin` mempertahankan sesi sampai expiry; logout dan expiry membatalkan akses.
- Endpoint konfigurasi publik tidak pernah berisi password, password hash, token, atau kolom sesi.
- Perubahan konfigurasi melalui dashboard terlihat dari halaman undangan pada browser/incognito lain setelah reload.
- Guestbook yang disubmit terlihat di dashboard dan statistik agregat cocok dengan data MySQL.
- Production domain hanya membuka HTTPS, `/api` berfungsi melalui Nginx, MySQL tidak bisa diakses dari jaringan publik, dan PM2 memulihkan API setelah restart.
- Backup dapat dipulihkan ke instance uji dan menghasilkan data config/guestbook yang dapat dibaca API.

## Hal yang Tidak Dicakup

- Upload file/image biner. Dashboard saat ini memakai URL foto/QRIS; bila upload dibutuhkan kemudian, gunakan object storage atau direktori upload terproteksi dengan validasi MIME/size, bukan BLOB MySQL tanpa kebutuhan yang jelas.
- Multi-tenant/multi-wedding dan role admin bertingkat. Rencana ini sengaja mengoptimalkan satu undangan dan satu/sejumlah kecil admin.
- Realtime guestbook. Polling manual/periodik cukup untuk volume acara pernikahan; WebSocket tidak diperlukan untuk migrasi ini.
