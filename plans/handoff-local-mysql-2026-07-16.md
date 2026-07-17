# Handoff: Local MySQL dan Dashboard Admin

Tanggal: 16 Juli 2026

## Status Saat Ini

Migrasi Supabase ke MySQL lokal sudah diimplementasikan dan database lokal sudah berhasil disiapkan.

- Database MySQL: `wedding_db`.
- Tabel tersedia: `wedding_config`, `guestbook`, `admin_users`, dan `admin_sessions`.
- User aplikasi: `wedding` pada `localhost`, dengan akses ke `wedding_db`.
- Konfigurasi rahasia lokal disimpan pada `server/.env` dan tidak boleh di-commit.
- Akun admin awal berhasil dibuat lewat `npm run seed-admin`.
- Username admin: `admin`.
- Password admin memakai nilai `ADMIN_INITIAL_PASSWORD` di `server/.env`; jangan menuliskan password pada dokumen atau Git.

## Layanan Lokal yang Sudah Jalan

Saat handoff dibuat, dua service telah dinyalakan di background:

| Layanan | URL | Status tervalidasi |
| --- | --- | --- |
| Express API | `http://127.0.0.1:3001` | `GET /api/health` dan `GET /api/config` berhasil |
| Svelte/Vite frontend | `http://127.0.0.1:5173` | route `/admin` mengembalikan HTTP 200 |

Log proses sementara:

- API: `/var/folders/bc/pzd8d8ms6vd2kfwbj_k1r5840000gn/T/opencode/wedding-api.log`
- Frontend: `/var/folders/bc/pzd8d8ms6vd2kfwbj_k1r5840000gn/T/opencode/wedding-frontend.log`

Service dapat berhenti setelah restart Mac atau saat sesi terminal berakhir. Jalankan ulang dengan langkah pada bagian "Resume Besok" bila tidak dapat diakses.

## Yang Sudah Diimplementasikan

### Backend MySQL dan Express

- Schema fresh database: `database/schema.sql`.
- Migration legacy untuk schema lama yang pernah memiliki kolom password plaintext: `database/migrations/002_admin_auth.sql`.
- MySQL connection pool dengan environment wajib: `server/db.js`.
- API publik:
  - `GET /api/health`
  - `GET /api/config`
  - `GET /api/guestbook`
  - `POST /api/guestbook`
- API admin berbasis cookie sesi:
  - `POST`, `GET`, `DELETE /api/admin/session`
  - `GET`, `PUT /api/admin/config`
  - `GET`, `DELETE /api/admin/guestbook`
  - `GET /api/admin/stats`
  - `POST /api/admin/password`
- Password admin disimpan sebagai hash bcrypt dalam `admin_users`.
- Sesi admin memakai token acak yang hanya dikirim sebagai cookie `HttpOnly`; database hanya menyimpan hash token.
- Rate limit diterapkan untuk login dan submit buku tamu.
- Seeder admin: `server/scripts/seed-admin.js` dengan command `npm run seed-admin`.

### Frontend

- Source client HTTP tunggal: `src/lib/api-client.ts`.
- Supabase dihapus dari source runtime dan root dependency.
- Dashboard `src/routes/admin/+page.svelte` memakai sesi admin server untuk login/logout, edit konfigurasi, hapus ucapan, statistik, dan ganti password.
- Buku tamu publik memakai API MySQL dan menampilkan error bila submit gagal.
- Vite mem-proxy `/api` ke `http://127.0.0.1:3001` untuk local development: `vite.config.ts`.

### Deploy Persiapan

- Template environment frontend: `.env.example`.
- Template environment backend: `server/.env.example`.
- Template Nginx VPS: `deploy/nginx.conf`.
- Template PM2 VPS: `deploy/ecosystem.config.cjs`.
- Panduan backend: `server/README.md`.

## Verifikasi yang Sudah Berhasil

- `npm run check`: berhasil tanpa error, ada warning aksesibilitas label form yang sudah ada di dashboard.
- `npm run build`: berhasil.
- `node --check` untuk entrypoint, auth, routes, dan seeder backend: berhasil.
- Koneksi MySQL memakai user aplikasi `wedding`: berhasil.
- `npm run seed-admin`: berhasil.
- `GET /api/health`: berhasil.
- `GET /api/config`: berhasil dan membaca row konfigurasi dari MySQL.

## Resume Besok

1. Pastikan MySQL Homebrew aktif:

```bash
brew services start mysql
mysqladmin -u root -p ping
```

2. Jalankan API pada terminal pertama:

```bash
cd "/Users/barrukurniawan/Documents/wedding-summer/server"
npm run dev
```

3. Jalankan frontend pada terminal kedua:

```bash
cd "/Users/barrukurniawan/Documents/wedding-summer"
npm run dev
```

4. Buka dan uji:

- Halaman undangan: `http://localhost:5173`
- Dashboard: `http://localhost:5173/admin`
- Health API: `http://127.0.0.1:3001/api/health`

5. Uji manual yang disarankan:

- Login dashboard.
- Ubah satu field konfigurasi dan klik `Simpan Perubahan`.
- Reload halaman utama untuk memastikan data berasal dari MySQL.
- Kirim satu buku tamu dari halaman utama.
- Buka tab `Ucapan` dan `Statistik` di admin untuk memastikan data tampil.
- Hapus ucapan test dari dashboard bila tidak ingin menyimpannya.
- Uji logout dan login kembali.

## Hal yang Perlu Dilanjutkan

- Hubungkan seluruh konten modal undangan yang masih hardcoded ke `weddingConfig` bila dashboard diharapkan mengubah semua konten visual halaman utama. Saat ini API/database/dashboard sudah bekerja, namun `WeddingStageModal.svelte` masih memiliki beberapa konten contoh statis.
- Perbaiki warning a11y pada `src/routes/admin/+page.svelte` dengan memasangkan setiap `<label>` ke `id` input terkait.
- Uji penuh CRUD lewat browser sebelum deploy.
- Siapkan VPS: MySQL, Node LTS, Nginx, PM2, firewall, HTTPS Certbot, lalu sesuaikan `server/.env` production dan `deploy/nginx.conf` (`server_name`).
- Jangan gunakan password lokal untuk production. Buat password database dan admin baru yang unik pada VPS.
- Sebelum commit, review perubahan workspace karena ada file user yang sudah dimodifikasi sebelum pekerjaan ini dimulai. Jangan commit `server/.env` atau `.env`.

## Catatan MySQL Lokal

- MySQL diinstal via Homebrew pada Apple Silicon (`/opt/homebrew`).
- Password root MySQL pernah di-reset hari ini.
- Schema awal sempat gagal karena MySQL lokal menolak default pada `TEXT`/`JSON`, lalu karena ukuran row `VARCHAR` terlalu besar. File `database/schema.sql` sudah diperbaiki: field panjang memakai `TEXT` tanpa default dan row seed memasukkan string kosong secara eksplisit.
- Untuk database baru gunakan hanya `database/schema.sql`. Jangan menjalankan migration legacy `002_admin_auth.sql` pada database fresh karena migration tersebut khusus menghapus kolom `admin_password` yang tidak lagi ada pada schema baru.
