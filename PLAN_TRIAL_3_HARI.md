# Rencana: Uji Coba 3 Hari, Bayar Sekali Aktif Selamanya

Status: **rencana (2026-10-15), belum ada kode.** Lanjutan branch `tako_payment` (dikerjakan sebelum Tako naik live,
supaya pengguna berbayar pertama langsung memakai model ini).

## Model baru (permintaan)
| | Sekarang | Baru |
|---|---|---|
| Belum bayar | Undangan **tidak bisa dibuka tamu** (draft), pemilik bisa edit & pratinjau | **Semua fitur jalan, undangan bisa dibuka tamu selama 3 hari** |
| Setelah 3 hari, belum bayar | – | Tamu melihat "Undangan sedang tidak aktif"; pemilik tetap bisa edit & bayar kapan saja |
| Sudah bayar | Aktif sampai 7 hari setelah tanggal resepsi | **Aktif selamanya** (tidak ada batas tanggal resepsi) |
| Akun lama (`free_plan`, daftar saat gratis) | Aktif sampai 7 hari setelah resepsi | Diperlakukan sama dengan **sudah bayar** (lihat keputusan K1) |

## Temuan sistem saat ini
- Batas tamu ada di `middleware/tenant.js`: status `active` + `expires_at` (= resepsi + 7 hari) → lewat itu 410.
- `expires_at` ikut berubah saat tanggal pernikahan diedit (`tenant-config.js`).
- Tidak ada job yang menghapus data berdasarkan `retention_until` (kolom informatif saja).
- Satu akun hanya bisa punya satu undangan (`owner_user_id` unik), jadi satu akun = satu kali uji coba.

## A. Data: migrasi 021
`invitations`:
| Kolom | Isi |
|---|---|
| `trial_ends_at DATETIME NULL` | Akhir uji coba (UTC). `NULL` = bukan uji coba (sudah bayar / akun gratis) |
| `paid_at DATETIME NULL` | Kapan pembayaran berhasil (informasi & laporan) |
Undangan yang sudah ada: kolom baru `NULL` → **tidak berubah** (semuanya akun gratis).

## B. Aturan
1. **Buat undangan** (akun bukan `free_plan`, harga > 0): langsung `active` + `trial_ends_at = sekarang + 3 hari`.
   Tidak ada lagi status `draft` untuk pengguna baru. (Durasi dari env `TRIAL_DAYS=3`, bisa diubah tanpa deploy.)
2. **Tamu membuka undangan** (`requirePublicInvitation`):
   - `trial_ends_at` sudah lewat → 403 `TRIAL_ENDED` → layar "Undangan ini sedang tidak aktif" (tanpa menyebut
     pembayaran ke tamu). Pemilik yang login tetap bisa pratinjau.
   - Sudah bayar / akun gratis → **batas `expires_at` diabaikan** (aktif selamanya).
   - Status `suspended` (oleh admin) tetap memblokir seperti sekarang.
3. **Bayar via Tako berhasil** (`syncTakoPayment`): `trial_ends_at = NULL`, `paid_at = sekarang`, status tetap/
   menjadi `active`. Undangan yang uji cobanya sudah habis langsung bisa dibuka lagi.
4. **Akun gratis lama**: aktif selamanya (K1).
5. Edit tanggal pernikahan tidak memengaruhi uji coba maupun status "selamanya".

## C. Dashboard pemilik
Banner di atas dashboard (semua tab) saat uji coba:
```
⏳ Mode uji coba: undangan bisa dibuka tamu sampai Sab, 18 Okt 14:30 (sisa 2 hari 5 jam).
   Bayar Rp 49.999 sekali agar undangan aktif selamanya.            [ Bayar sekarang ]
```
Setelah habis (merah):
```
⛔ Masa uji coba berakhir. Tamu tidak bisa membuka undangan kalian.
   Bayar sekali untuk mengaktifkannya kembali, semua isi tetap tersimpan.   [ Bayar sekarang ]
```
- Tombol membuka tab Pembayaran. Kartu progres/status ("Status: Draft…") disesuaikan: "Uji coba" / "Aktif selamanya".
- Tab Pembayaran: judul "Aktifkan selamanya", sisa waktu uji coba, tombol Tako yang sudah ada.
- Setelah bayar: "✓ Aktif selamanya" (tanpa tanggal kedaluwarsa).
- Email pengingat (opsional, K3): 1 email saat sisa 24 jam via Resend.

## D. Landing & FAQ
- Promo/Harga: "Coba gratis 3 hari, semua fitur. Bayar sekali, aktif selamanya."
- CTA: "Coba gratis 3 hari" (saat harga > 0).
- FAQ "Berapa lama undangan aktif?": "Uji coba 3 hari bisa dibuka tamu. Setelah bayar, aktif selamanya."
- FAQ cara bayar: tetap "Bayar via QRIS, GoPay & aktivasi secara otomatis."

## E. Admin
- Daftar Subdomain: label "Uji coba (sisa 2 hari)" / "Uji coba habis" / "Berbayar" / "Gratis (akun lama)".
- Admin bisa memperpanjang uji coba atau menandai berbayar manual (mis. bayar via transfer) — K4.

## F. Uji lokal
- Akun Google baru + harga Rp10.000: undangan langsung bisa dibuka tamu, banner sisa waktu tampil.
- Majukan `trial_ends_at` ke masa lalu di DB lokal → tamu melihat layar tidak aktif, pemilik tetap bisa pratinjau.
- Bayar (Tako asli, nominal kecil) → undangan bisa dibuka lagi, banner hilang, "Aktif selamanya".
- Akun lama: tidak ada banner, tidak pernah diblokir oleh tanggal resepsi.
- `npm test` (aturan akses tamu dibuat fungsi murni + test), `npm run check`, mobile 390px.

## Keputusan yang dibutuhkan
- **K1.** Akun lama (gratis) ikut **aktif selamanya**, atau tetap sampai 7 hari setelah resepsi seperti sekarang?
- **K2.** 3 hari dihitung sejak **undangan dibuat** (saran) atau sejak pertama kali dibuka tamu?
- **K3.** Kirim email pengingat saat sisa 24 jam? (saran: ya, satu kali)
- **K4.** Perlu tombol admin "perpanjang uji coba" / "tandai sudah bayar"? (saran: ya, untuk kasus bayar manual)
- Catatan: satu akun Google = satu uji coba. Orang bisa membuat akun Google baru untuk uji coba lagi; dengan
  3 hari dan undangan berganti alamat, risikonya kecil, jadi tidak dibatasi lebih jauh.
