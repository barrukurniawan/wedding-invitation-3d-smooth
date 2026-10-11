# Rencana Undangan Privat (link pribadi per tamu)

Status: **rencana disimpan (2026-10-11), belum dikerjakan.** Menunggu persetujuan user.

## Konsep
- Mode undangan **Publik** (default, perilaku sekarang) atau **Privat**, diatur pasangan di tab Tema.
- Saat Privat: undangan hanya terbuka lewat link berkode unik per kontak dari menu Kirim Undangan
  (`?send=Ayu&k=<kode>`). Tanpa/ salah kode → layar "Undangan ini privat".
- Pasangan melihat status per kontak: "Belum dibuka" / "Dibuka 2× · kemarin".

## Dampak ke undangan existing
- Tidak ada: semua undangan lama & baru default Publik; migrasi hanya menambah kolom.
- Catatan: jika pasangan sudah menyebar link lama lalu menyalakan Privat, link lama tanpa kode berhenti
  berfungsi → peringatan jelas + jumlah kontak yang perlu dikirim ulang.

## Tahapan
| Langkah | Isi |
|---|---|
| V1 | Migrasi 017: `wedding_configs.access_mode` ENUM('public','private') DEFAULT 'public'; `invitation_contacts.access_code` (unik, dibuat otomatis untuk kontak lama), `opened_count`, `last_opened_at` |
| V2 | Server: saat privat, `/api/config`, `/api/multiplayer/content`, `/api/guestbook` mensyaratkan kode valid (header/param); catat buka; 403 `INVITATION_PRIVATE` |
| V3 | Frontend 2D & 3D: teruskan kode dari URL; layar "Undangan ini privat" |
| V4 | Dashboard: toggle Publik/Privat (+ peringatan); link berkode otomatis; status dibuka per kontak |
| V5 | Tes (publik tetap normal, privat tanpa/dengan kode, 2D & 3D) + deploy prosedur standar |

## Batasan
- Foto unggahan memakai URL acak (sulit ditebak) tapi tetap publik bila alamat persisnya diketahui.
- Opsi lanjutan: PIN untuk tamu undangan cetak/QR.
