# Rencana: Admin Bisa Mulai Chat Duluan (1-on-1 ke setiap pemilik undangan)

Status: **rencana (2026-10-15), belum ada kode.** Branch `admin_chat` (dari `new_staging`).

## Latar belakang
Sekarang admin hanya bisa membalas akun yang sudah chat duluan. Menu **Pesan** di `/admin` hanya menampilkan
akun yang punya baris di `support_messages`. Live saat ini ada 15 akun (13 punya undangan), tapi baru 1 yang
pernah chat. Admin ingin bisa menyapa setiap pemilik undangan langsung, satu per satu.

## Temuan
- **Server sebenarnya sudah mendukung.** `POST /api/admin/support/threads/:userId/messages` menerima pesan ke
  akun mana pun yang tidak `deleted`, tanpa syarat sudah ada percakapan. Yang membatasi hanya UI admin.
- Data: satu percakapan per akun (`support_messages.user_id`), pengirim `user` atau `admin`. Pesan pertama dari
  admin cukup jadi baris `sender='admin'`. **Tidak perlu migrasi.**
- Sisi pemilik: widget `SupportChat.svelte` mengecek balasan tiap 60 detik (panel tertutup) dan menampilkan badge.
  Jadi pesan admin **hanya terlihat kalau pemilik sedang/akan membuka dashboard**.
- Email: `server/services/email.js` (nodemailer) ada, tapi **SMTP belum dikonfigurasi di VPS**, jadi notifikasi
  email belum bisa dikirim. No. HP pemilik juga tidak disimpan di `users`.

## A. API admin (baru, read-only)
`GET /api/admin/support/accounts`: semua akun pemilik (tidak `deleted`), untuk memulai chat:
| Field | Isi |
|---|---|
| `user_id`, `name`, `email` | dari `users` |
| `slug`, `public_url`, `status`, `preset` | undangan terbaru milik akun (bisa kosong bila belum buat undangan) |
| `last_login_at` | supaya admin tahu siapa yang masih aktif |
| `total`, `unread`, `last_body`, `last_sender`, `last_at` | ringkasan percakapan (kosong bila belum pernah chat) |

Urutan: yang punya pesan belum dibaca dulu, lalu aktivitas chat terbaru, lalu akun tanpa chat (login terbaru dulu).
Endpoint lama `/support/threads` tetap ada (dipakai badge & kompatibilitas).

## B. Tampilan admin (menu Pesan)
```
┌ Pesan Bantuan ───────────────┐┌ Kia & Toni · kia-toni.marryme.web.id ─────┐
│ [ Percakapan | Semua akun ]  ││                                            │
│ 🔍 Cari nama, email, subdomain││   (belum ada pesan)                        │
│ ● Vica & Kevin    2 baru     ││   Mulai percakapan dengan Kia & Toni.      │
│   Mudi & Lala     kemarin    ││   Pesan muncul di dashboard mereka.        │
│   Salman & Raisa  belum chat ││                                            │
│   ...                        ││ [ketik pesan...]                  [Kirim]  │
└──────────────────────────────┘└────────────────────────────────────────────┘
```
- Tab **Percakapan** (seperti sekarang) dan tab baru **Semua akun** (semua pemilik, termasuk yang belum pernah chat).
- Membuka akun tanpa percakapan menampilkan keadaan kosong + kolom kirim. Pesan pertama memakai endpoint POST yang
  sudah ada. Setelah terkirim, akun pindah ke tab Percakapan.
- Label kecil: status undangan (aktif/draft/kedaluwarsa), preset 2D/3D, "login terakhir 3 hari lalu".
- Info kecil di header percakapan: "Pesan muncul saat pemilik membuka dashboard" + email pemilik (bisa disalin)
  supaya admin bisa follow-up manual.
- Template cepat (opsional, tombol kecil di atas kolom ketik), mis. "Halo {nama}, terima kasih sudah membuat
  undangan di MarryMe! Ada yang bisa kami bantu?". Admin tetap mengedit sebelum mengirim; tidak ada kirim otomatis.

## C. Sisi pemilik (dashboard)
Widget sudah menampilkan badge, tapi pesan pertama dari admin perlu lebih terlihat:
- Bila ada pesan admin belum dibaca saat dashboard dibuka: tampilkan **gelembung pratinjau** di atas tombol chat
  ("💬 Admin MarryMe: Halo Kia & Toni, …"), bisa ditutup, klik = buka panel. Tidak membuka panel otomatis
  (tidak mengganggu).
- Teks sambutan panel disesuaikan bila percakapan dimulai admin (tidak lagi hanya "Ada error atau kendala?").
- Polling tetap: 60 dtk tertutup, 8 dtk terbuka. Tanpa websocket.

## D. Di luar cakupan / keputusan nanti
1. **Kirim ke banyak sekaligus (broadcast):** tidak termasuk. Permintaannya 1-on-1. Kalau nanti perlu, tetap
   disimpan sebagai pesan 1-on-1 terpisah per akun, dengan konfirmasi jumlah penerima.
2. **Notifikasi email** untuk pemilik yang jarang membuka dashboard: lihat bagian H.
3. **WhatsApp:** no. HP pemilik tidak disimpan, jadi tidak ada tombol WA otomatis.

## H. Notifikasi email dari admin@marryme.web.id (tahap 2, setelah setup email selesai)
DNS `marryme.web.id` dikelola di **Cloudflare** (NS `gannon`/`hera.ns.cloudflare.com`), bukan di IDwebhost.
Belum ada MX/SPF/DKIM/DMARC.
- **Kirim:** Resend (gratis 3.000 email/bulan, 100/hari; cukup untuk volume sekarang) lewat SMTP
  `smtp.resend.com:465`. Domain diverifikasi dengan record DKIM/SPF dari Resend di Cloudflare DNS.
- **Terima balasan:** Cloudflare Email Routing (gratis): `admin@marryme.web.id` diteruskan ke Gmail admin.
- **DMARC:** `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:admin@marryme.web.id`.
- Env baru di `server/.env.docker`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
  `MAIL_FROM="MarryMe <admin@marryme.web.id>"`. `email.js` sekarang memakai `SMTP_USER` sebagai alamat pengirim;
  harus diganti ke `MAIL_FROM` (untuk Resend, `SMTP_USER` bernilai `resend`).
- **Email hanya dikirim bila admin mencentangnya per pesan** (keputusan 2026-10-15):
  ```
  ┌──────────────────────────────────────────────────────────────┐
  │ [ketik pesan...                                   ]          │
  │                          ☐ ✉ email   [ ➤ ]     │
  └──────────────────────────────────────────────────────────────┘
  ```
  - Centang "Kirim juga ke email" di sebelah tombol kirim (➤). **Default tidak tercentang**, dan otomatis kembali
    tidak tercentang setelah setiap pesan terkirim (harus dicentang lagi untuk pesan berikutnya).
  - Tooltip menampilkan alamat tujuan (email pemilik). Centang dinonaktifkan dengan keterangan bila SMTP belum
    dipasang di server atau akun tidak punya email.
  - Setelah kirim: status kecil di bawah pesan, "✉ Terkirim ke email" atau "✉ Email gagal terkirim" (pesan chat
    tetap tersimpan; email gagal tidak menggagalkan chat).
  - Pesan yang dikirim ke email diberi tanda ✉ di riwayat percakapan admin.
- API: `POST /api/admin/support/threads/:userId/messages` menerima `{ body, sendEmail?: boolean }` (default false),
  respons menambah `email: 'sent' | 'failed' | 'skipped'`. `GET /api/admin/support/config` (atau field di
  `/support/accounts`) memberi tahu UI apakah email aktif.
- Data: migrasi kecil `019_support_message_email.sql`: kolom `emailed_at TIMESTAMP NULL` di `support_messages`
  (untuk tanda ✉ di riwayat). Non-destruktif, idempoten.
- Isi email: subjek "Pesan dari Admin MarryMe", isi pesan lengkap (teks biasa, HTML di-escape), tombol
  "Balas di dashboard" ke `https://marryme.web.id`, `Reply-To: admin@marryme.web.id`. Tidak ada throttle otomatis
  karena setiap email dipilih manual oleh admin.
- Uji: kirim ke email sendiri dulu, cek tidak masuk spam (SPF/DKIM "pass" di Gmail → Show original).

## E. Keamanan
- Endpoint baru di bawah `requireAdmin`, hanya membaca. Kirim pesan memakai endpoint yang sudah ada.
- Pemilik tetap hanya bisa membaca percakapannya sendiri (`user_id` dari sesi).
- Isi pesan tetap teks biasa (tanpa HTML).

## F. Uji lokal
1. `/admin` → Pesan → tab Semua akun: semua akun lokal muncul, termasuk yang belum pernah chat; pencarian jalan.
2. Kirim pesan pertama ke akun tanpa percakapan → pindah ke tab Percakapan.
3. Login sebagai pemilik itu → gelembung pratinjau + badge muncul ≤ 60 dtk; buka panel → pesan terbaca;
   di admin status berubah "Dibaca".
4. Pemilik membalas → admin melihat badge belum dibaca seperti biasa.
5. Mobile 390px untuk admin dan dashboard; `npm test`, `npm run check`.

## G. Live
Tahap 1 (tab Semua akun + gelembung) tanpa migrasi. Tahap 2 (email) membawa migrasi 019 + env SMTP. Merge ke `new_staging` + deploy biasa (backup dulu) setelah disetujui.

## Urutan commit
1. API `GET /support/accounts` + test.
2. Admin: tab Semua akun + keadaan kosong + template cepat.
3. Dashboard pemilik: gelembung pratinjau + teks sambutan.
4. (Tahap 2) Migrasi 019 + `MAIL_FROM` di `email.js` + `sendEmail` di POST admin + centang "Kirim juga ke email".
