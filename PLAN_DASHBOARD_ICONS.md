# Rencana Ikon Custom MarryMe (ganti emoji di dashboard)

Status: **Opsi B dipilih, I1–I3 selesai di lokal (2026-10-12), belum di-deploy.** Urutan tab baru: Detail Undangan, Buku Tamu, Kirim Undangan, Tema, Pembayaran (dulu "Pembayaran & Paket").

## Masalah
Dashboard memakai ±40 emoji berbeda (✏️ 💾 💳 🎨 📲 💍 📅 🖼️ 🎶 ⚠️ 💡 🎉 dll.). Gaya, warna, dan ukurannya tidak seragam antar perangkat, tidak senada dengan maroon, dan beberapa terasa aneh (pensil untuk "Detail Undangan", disket untuk "Simpan").

## Solusi
Satu set ikon SVG buatan sendiri, inline (tanpa library, ±0 KB request tambahan), grid 24px, sudut membulat.
- **Opsi B (rekomendasi): duotone** = garis maroon `#8f1d45` + isian blush `#f6c5d2` + aksen emas `#f5b942` (sama dengan emas progress bar). Di tombol/tab aktif maroon otomatis menjadi putih + emas.
- Opsi A: garis maroon saja (lebih kalem, seperti admin).

Pemetaan utama: Detail Undangan → amplop berhati, Buku Tamu → buku berhati, Pembayaran → kartu, Tema → palet, Kirim Undangan → pesawat kertas, Data Mempelai → cincin, Detail Acara → kalender berhati, Amplop Digital → amplop + koin, Kirim Hadiah → kado, Galeri → foto, Quote → balon kutipan, Musik → nada, **Simpan → dokumen bercentang** (bukan disket), Tips → lampu berbintang, Peringatan → segitiga, Berhasil → konfeti, Taman → daun, Pantai → pohon kelapa, Pria/Wanita → figur dasi kupu-kupu / kerudung.

## Teknis
- `src/lib/components/icons/Icon.svelte` (komponen bersama, `name` bertipe union, `size`). Admin `admin/ui/Icon.svelte` tetap jalan (bisa disatukan belakangan).
- Ganti emoji di: DashboardShell, WorkspaceDashboard, OnboardingWizard, SupportChat, dashboard/* (Guestbook, InvitationSender, PaymentManager), editor/* (Envelope, EventDetails, Gallery, Location, Music).
- Emoji di dalam teks yang dikirim ke tamu (template WhatsApp) dan undangan 3D/2D **tidak** diubah.
- Tanpa perubahan database/server. Tes: `npm run check`, screenshot desktop + HP.

## Tahapan
| Langkah | Isi |
|---|---|
| I1 | Komponen `Icon.svelte` + set ikon |
| I2 | Tab & sub-tab dashboard + tombol Simpan |
| I3 | Sisa emoji (tips, peringatan, status, editor, onboarding, chat) |
