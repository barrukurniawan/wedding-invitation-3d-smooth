# Rencana: Pembayaran Otomatis lewat Tako (alternatif Midtrans)

Status: **dikerjakan (2026-10-15), lolos uji lokal dengan Tako tiruan; menunggu uji bayar asli.** Branch `tako_payment` (dari `new_staging`).

## Latar belakang
Midtrans belum disetujui. Sekarang pemilik undangan membayar manual (transfer → unggah bukti → admin
memeriksa). Tako (`tako.id/marryme`) punya REST API untuk membuat pembayaran (QRIS, GoPay, DANA, PayPal) dan
memberi tahu server kita saat pembayaran sukses, jadi undangan bisa aktif tanpa bukti transfer.

## Ringkasan API Tako (dari `tako.id/api/v1/openapi.json`, v1.0.0)
| Hal | Detail |
|---|---|
| Base URL | `https://tako.id` |
| Header wajib | `Authorization: Bearer <api-key>`, `User-Agent: MarryMe/1.0` (tanpa User-Agent → 403) |
| Buat pembayaran | `POST /api/v1/gift/marryme` body `{ name, email, amount, paymentMethod, message? }` → **206** `{ result: { giftId, transactionId, paymentUrl } }` |
| `paymentMethod` | `qris` \| `gopay` \| `dana` \| `paypal` (saldo kreator tidak bisa lewat API) |
| `amount` | maks 50.000.000; `message` maks 200 karakter |
| Cek status | `GET /api/v1/transactions/{transactionId}` atau `GET /api/v1/gift/{giftId}` → `status`: `pending` \| `success` \| `failed` \| `reversed` \| `on_hold` |
| Callback | Satu kali POST ke Callback URL (https) saat sukses, `{ event: "payment.success", data: { id, status, amount, price, paymentMethod, paymentUrl, createdAt, relatedGiftId } }`. **Tanpa retry.** |
| Tanda tangan | `X-Tako-Signature` = HMAC-SHA256(`JSON.stringify(body)`, Callback Secret), hex |
| Redirect URL | Ke mana pembayar diarahkan setelah sukses (diatur di halaman API Key, bukan per request) |
| Error | 400 data tidak valid, 401 key salah, 403 ditolak, 404 kreator tidak ada, 429 terlalu sering |

Catatan: endpoint `topup` tidak dipakai (itu mengisi saldo akun Tako sendiri). Callback/Redirect/IP diatur
sekali di `tako.id/me/api-keys`. Fitur **Integrasi → Notifikasi Webhook** (pakai Webhook Token) **tidak dipakai**
dan dibiarkan mati, karena tidak membawa `transactionId` yang bisa dicocokkan.

## A. Alur
```
Dashboard (tab Pembayaran)             Server MarryMe                      Tako
 pilih QRIS/GoPay/DANA/PayPal  ─POST /api/my/payment/tako─▶  cek harga, buat baris payments
                                                            ─POST /api/v1/gift/marryme──────▶
                                                            ◀─ transactionId + paymentUrl ────
 diarahkan ke paymentUrl  ◀──────── { paymentUrl } ─────────  simpan transactionId
 bayar di halaman Tako  ───────────────────────────────────────────────────────────────────▶
                                    ◀─ callback payment.success (X-Tako-Signature) ─────────
                                       verifikasi tanda tangan + GET /transactions/{id}
                                       (status success, amount ≥ harga) → undangan aktif
 kembali ke /account?bayar=tako ─▶ dashboard cek status (jaga-jaga callback hilang)
```

## B. Data (tanpa migrasi)
Tabel `payments` sudah mendukung banyak provider:
- `provider='tako'`, `provider_order_id = transactionId` (unik per provider), `amount`, `status`
  (`created` → `received` / `failed`), `provider_status` (status Tako), `provider_payload` (giftId, metode, payload
  callback). Undangan bertransisi lewat `transitionInvitation` (riwayat di `invitation_status_events`).

## C. Server
- `server/services/tako.js`: `createTakoPayment()`, `getTakoTransaction()`, `verifyTakoSignature()` (HMAC dengan
  `timingSafeEqual`; dicoba atas raw body lalu `JSON.stringify(body)` sesuai dokumentasi), timeout 10 dtk.
- `POST /api/my/payment/tako` (`requireUser`, `requireCsrf`, rate limit): hanya bila `PAYMENT_MODE=tako`; harga dari
  `INVITATION_PRICE_IDR` (**tidak pernah dari frontend**); tolak bila undangan sudah aktif. Pembayaran pending
  < 30 menit dengan metode sama dipakai ulang (tidak membuat tagihan dobel). `message` =
  `MarryMe #<invitationId> <slug>` supaya mudah dicocokkan di dashboard Tako.
- `POST /api/payment/tako/callback` (publik): tanda tangan wajib valid (selain itu 403), event harus
  `payment.success`, `data.id` harus ada di `payments`. Status **dicek ulang ke API Tako** (sumber kebenaran),
  `amount` ≥ harga yang tercatat. Idempoten (callback dobel aman). Selalu balas 200 untuk transaksi tak dikenal.
- `GET /api/my/payment/tako/status`: dipanggil dashboard setelah kembali dari Tako; mengecek pembayaran pending
  milik pengguna ke API Tako dan memprosesnya seperti callback (menutup risiko callback hilang).
- Rekonsiliasi berkala di proses API: tiap 5 menit, pembayaran Tako `created` berumur < 24 jam dicek ke API.
  `failed` → kembali ke draft. Lewat 24 jam tanpa sukses → `cancelled`.
- `reversed` / `on_hold` setelah aktif: **tidak** otomatis menonaktifkan undangan; ditandai untuk admin.
- Env baru (`server/.env.docker`): `PAYMENT_MODE=tako`, `TAKO_API_KEY`, `TAKO_CALLBACK_SECRET`,
  `TAKO_USERNAME=marryme`. Kosong = fitur mati, alur manual tetap jalan.

## D. Status undangan setelah bayar (keputusan: langsung aktif)
1. **Langsung aktif** (disarankan): tanda tangan + cek ulang ke API Tako sudah cukup kuat. Pasangan langsung bisa
   menyebar undangan, dan admin tetap melihat riwayatnya.
2. **Menunggu verifikasi admin**: sama seperti alur Midtrans sekarang (`pending_verification`), lebih hati-hati
   tetapi kehilangan keunggulan "otomatis".

## E. Dashboard pemilik (tab Pembayaran, `PaymentManager.svelte`)
- Mode `tako`: kartu "Bayar online" dengan pilihan **QRIS** (default), GoPay, DANA, PayPal, total dari
  `/api/public/pricing`, dan tombol **Bayar Rp…** → buka `paymentUrl` (tab yang sama).
- Kembali dari Tako: "Memeriksa pembayaran…" → "✓ Pembayaran diterima, undangan aktif".
- Tautan kecil "Bayar manual (transfer + bukti)" tetap ada sebagai cadangan bila Tako gangguan.
- Admin (Subdomain detail): sumber pembayaran "Tako · QRIS · <transactionId>" + tautan cek status.

## F. Keamanan
- API key & secret hanya di env server, tidak pernah ke frontend/log. API key dibatasi ke IP VPS
  `95.135.208.186` di dashboard Tako.
- Nominal & penerima ditentukan server. Callback tanpa tanda tangan valid ditolak, dan status selalu dicek ulang
  ke API Tako (callback palsu tidak bisa mengaktifkan undangan).
- Cloudflare: pastikan Bot Fight Mode/WAF tidak memblokir POST dari server Tako ke `/api/payment/tako/callback`
  (cek di Cloudflare → Security → Events setelah tes).

## G. Hal yang harus dipastikan sebelum coding
1. **Syarat & biaya Tako**: boleh dipakai untuk menjual layanan undangan lewat API? Berapa potongan per transaksi
   (apakah `price` ≠ `amount`) dan biaya penarikan? (tanya support Tako).
2. **Tes dari VPS** dengan API key asli: `POST /api/v1/gift/marryme` nominal kecil (mis. Rp1.000, metode QRIS)
   → `paymentUrl` keluar (tidak terblokir anti-bot "Please Wait"), lalu `GET /transactions/{id}` → `pending`.
3. Bayar tes Rp1.000 → callback benar-benar datang ke server dan tanda tangannya cocok.

## H. Uji lokal & live
- Lokal: test unit tanda tangan + alur status (payload contoh dari dokumentasi), callback tiruan bertanda tangan,
  Tako tiruan untuk `getTakoTransaction`. Callback asli tidak bisa ke localhost, jadi uji end-to-end dilakukan di
  live dengan nominal kecil di undangan uji (bukan undangan pasangan).
- Live: tanpa migrasi. Backup → deploy dengan `PAYMENT_MODE` tetap `manual` → tes Rp1.000 → baru ubah ke `tako`.
  Kill switch: kembalikan `PAYMENT_MODE=manual` + restart api.

## Urutan commit
1. `services/tako.js` + test (tanda tangan, parsing, status).
2. Endpoint buat pembayaran + callback + cek status + rekonsiliasi.
3. Dashboard pemilik + tampilan admin.
