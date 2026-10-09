# Rencana Chat Bantuan (pengguna ↔ admin)

Status: **disetujui user 2026-10-09**, dikerjakan di branch `support_chat`. Permintaan user (2026-10-09): chat yang sangat sederhana. Setiap pemilik akun bisa mengirim pesan ke admin (misalnya melaporkan error) lewat tombol pop-up di kanan bawah dashboard mereka. Admin membalas dari `/admin`.

## 1. Cakupan (versi sederhana)
- **Satu percakapan per akun.** Tanpa tiket, kategori, lampiran, atau status "selesai".
- **Teks saja**, maksimal 2.000 karakter per pesan.
- **Tanpa realtime/websocket.** Pakai polling: setiap 8 detik saat panel terbuka, setiap 60 detik saat tertutup (untuk badge pesan baru). Cukup untuk volume sekarang dan tidak menambah infrastruktur.
- Tamu undangan (tanpa akun) **tidak** bisa chat. Chat hanya ada di dashboard pemilik akun (`marryme.web.id`).

## 2. Data (migrasi baru, non-destruktif)
`database/migrations/016_support_messages.sql`: membuat tabel baru, tidak menyentuh tabel lain.
```sql
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,          -- pemilik percakapan
  sender ENUM('user','admin') NOT NULL,
  body TEXT NOT NULL,
  context VARCHAR(255) NULL,                 -- mis. subdomain + menu saat pesan dikirim
  read_at TIMESTAMP NULL,                    -- dibaca oleh pihak lawan
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_user_time (user_id, id),
  INDEX idx_support_unread (sender, read_at),
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```
Didaftarkan di `server/scripts/migrate.js`. Migrasi berjalan otomatis saat deploy (service `migrate`), sama seperti 015.

## 3. API
**Pengguna** (`/api/support`, root host, `requireUser`; kirim pesan juga wajib `requireCsrf`):
- `GET /api/support/messages?after=<id>`: pesan percakapan sendiri (100 terakhir, atau yang lebih baru dari `after`), plus jumlah balasan admin yang belum dibaca. Membuka panel = menandai balasan admin sudah dibaca.
- `POST /api/support/messages` `{ body, context? }`: validasi zod (1–2.000 karakter). Rate limit 10 pesan per menit per akun.

**Admin** (`/api/admin/support`, `requireAdmin`):
- `GET /threads`: daftar akun yang pernah chat: nama, email, subdomain, pesan terakhir, waktu, jumlah belum dibaca. Urut dari aktivitas terbaru.
- `GET /threads/:userId/messages?after=<id>`: isi percakapan (menandai pesan pengguna sudah dibaca).
- `POST /threads/:userId/messages` `{ body }`: balasan admin.
- `GET /unread-count`: badge di menu admin.

Keamanan: pengguna hanya bisa membaca percakapannya sendiri (`user_id` diambil dari sesi, bukan dari request). Isi pesan ditampilkan sebagai teks biasa (tanpa HTML), jadi aman dari XSS.

## 4. Tampilan
**Dashboard pengguna** (`DashboardShell.svelte`, hanya saat login), komponen baru `platform/SupportChat.svelte`:
```
                                        ┌──────────────────────────┐
                                        │ Bantuan MarryMe       ✕ │
                                        │ Biasanya dibalas < 1 hari│
                                        │──────────────────────────│
                                        │ 👋 Halo! Ada kendala?    │
                                        │ Ceritakan di sini.       │
                                        │          [pesan saya] ▸ │
                                        │ ◂ [balasan admin]        │
                                        │──────────────────────────│
                                        │ [ketik pesan...]  [Kirim]│
                                        └──────────────────────────┘
                                                         ( 💬 2 )  ← tombol bulat kanan bawah + badge
```
- Tombol bulat marun di kanan bawah. Badge muncul bila ada balasan admin yang belum dibaca.
- Panel ~360×520 px di desktop, layar penuh di mobile.
- Enter untuk kirim, Shift+Enter untuk baris baru. Status "Terkirim ✓". Pesan gagal bisa dikirim ulang.
- Konteks otomatis (subdomain + tab yang sedang dibuka) ikut tersimpan, supaya admin tahu error-nya di mana.

**Admin** (`/admin`): menu baru ke-7 **Pesan**, dengan badge jumlah belum dibaca.
- Kiri: daftar percakapan (avatar, nama/email, subdomain, potongan pesan terakhir, waktu, badge).
- Kanan: isi percakapan dan kotak balasan. Di mobile, daftar dan isi percakapan tampil bergantian.
- Gaya mengikuti desain admin baru (kartu putih, aksen marun).

## 5. Tahapan (satu commit per langkah, dites di lokal)
| Langkah | Isi |
|---|---|
| C1 | Migrasi 016 + `server/routes/support.js` (pengguna) + rute admin + tes (validasi, akses hanya percakapan sendiri) |
| C2 | Widget `SupportChat.svelte` di dashboard pengguna |
| C3 | Menu **Pesan** di admin (daftar percakapan + balasan + badge) |
| C4 | Uji ujung-ke-ujung di lokal (akun uji kirim → admin balas → badge pengguna), screenshot desktop + mobile |

Branch: `support_chat`, dibuat dari `admin_ui` karena butuh tampilan admin baru.

## 6. Nanti (tidak di versi ini)
- Notifikasi email/Telegram ke admin saat ada pesan baru.
- Lampiran screenshot.
- Tandai percakapan selesai.
