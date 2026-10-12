# Rencana: Kartu Progres Marun + Alamat Kirim Hadiah

Status: **rencana (2026-10-12), belum ada kode.** Branch `dashboard_gift`.

## A. Kartu progres dashboard jadi marun (tanpa database)
Kartu paling atas di `/account` (nama pasangan, "Progress Kelengkapan", status) diubah:
- Latar gradasi marun `#a52552 → #8f1d45 → #5e1230` (sama dengan strip promo landing).
- Nama pasangan: putih (Playfair); teks progres: krem `#fde7ec`, angka % emas `#f5b942`.
- Progress bar: track putih transparan, isian emas → krem.
- Badge status ("AKTIF"): pill putih transparan, teks putih.
- Kotak status di dalamnya (hijau/kuning/ungu sekarang): kaca putih transparan + teks putih; warna status
  dipertahankan sebagai garis kiri & ikon supaya tetap bisa dibedakan (aktif/draft/menunggu).
- Mobile tetap rapi (diuji 390px).

## B. Alamat kirim hadiah (opsional)
### Temuan
- Undangan **3D**: modal Amplop Digital hanya QRIS + rekening, **tidak ada alamat hadiah**.
- Undangan **2D**: bagian "Pengiriman Hadiah" sudah ada, tapi **alamatnya diambil dari alamat venue acara**
  (`venue_address`), bukan alamat rumah. Tamu bisa salah mengirim hadiah ke gedung resepsi. → bug, diperbaiki di sini.
- Gambar QRIS di editor masih berupa kolom teks URL (bukan unggah gambar) — kurang ramah pengguna (lihat C).

### Data (migrasi 017, hanya menambah kolom, semua opsional)
`wedding_configs`:
| Kolom | Tipe | Isi |
|---|---|---|
| `gift_recipient` | VARCHAR(255) NULL | Nama penerima paket |
| `gift_address` | TEXT NULL | Alamat lengkap (jalan, RT/RW, kel., kec., kota, kode pos) |
| `gift_phone` | VARCHAR(32) NULL | No. HP penerima untuk kurir (opsional, boleh tidak ditampilkan) |
| `gift_note` | VARCHAR(255) NULL | Catatan, mis. "Mohon konfirmasi via WhatsApp sebelum mengirim" |
Alamat kosong = bagian kirim hadiah **tidak ditampilkan** ke tamu (undangan lama tidak berubah).

### Dashboard (tab Detail → Amplop Digital & Bank)
Judul baru: **Amplop Digital & Kirim Hadiah**. Dua kartu:
1. *Transfer & QRIS* (yang sekarang).
2. *Alamat Kirim Hadiah (opsional)*: penerima, alamat, no. HP (+ centang "tampilkan no. HP ke tamu", default mati),
   catatan; pratinjau kecil tampilan di undangan; peringatan: "Alamat ini terlihat oleh siapa pun yang membuka
   undangan. Gunakan mode Privat jika ingin membatasi" (nyambung ke rencana undangan privat).

### Tampilan ke tamu
- **3D** (`WeddingStageModal`, layar Amplop Digital): kartu baru "Kirim Hadiah" di bawah rekening — penerima,
  alamat, catatan, tombol **Salin alamat**; no. HP hanya bila diizinkan.
- **2D** (tempat "Hadiah" di taman): bagian "Pengiriman Hadiah" memakai kolom baru; hilang bila alamat kosong
  (tidak lagi memakai alamat venue).

### Server
- `routes/config.js`, `routes/multiplayer.js` (konten 2D), `routes/tenant-config.js` (zod + allowed list),
  `api-client.ts` (tipe), validasi panjang & pembersihan spasi; tes unit.

## C. Saran tambahan (opsional, bisa dipilih)
1. **Unggah gambar QRIS** (seperti foto utama), bukan tempel URL.
2. **Rekening kedua** (mis. rekening mempelai wanita) — banyak pasangan memakai dua rekening.

## Tahapan
| Langkah | Isi | DB |
|---|---|---|
| G1 | Kartu progres marun | tidak |
| G2 | Migrasi 017 + server + tes | ya (tambah kolom) |
| G3 | Editor dashboard alamat hadiah | tidak |
| G4 | Tampilan 3D + perbaikan 2D | tidak |
| G5 | (Opsional) Unggah QRIS / rekening kedua | (rekening kedua: ya) |
Tes lokal desktop + HP, lalu deploy dengan prosedur standar (backup, migrasi otomatis, cek semua subdomain).
