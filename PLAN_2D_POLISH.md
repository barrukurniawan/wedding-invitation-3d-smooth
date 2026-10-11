# Rencana Perbaikan Tampilan Undangan 2D (3 issue)

Status: **P1–P4 selesai di lokal (2026-10-11), belum di-deploy.** P5 (nama panggilan) ditunda. Branch `polish_2d`. Dilaporkan user 2026-10-11 dari HP (diikaatikaa, salman-raisa).

## Issue 1: Kartu judul selalu "Faris & Eliza"
**Penyebab:** jika pasangan belum mengunggah foto utama (`wedding_photo` kosong), preset memakai gambar contoh `wedding-card.webp`, yang nama "Faris & Eliza" serta tahun 2025-nya tercetak di dalam gambar. Data diikaatikaa: `wedding_photo` kosong.

**Saran (gabungan A + C):**
- **A. Kartu default tanpa teks + nama asli ditimpa di atasnya.** Satu gambar kartu "kosong" (ilustrasi pasangan + bingkai holo yang sama, area nama, tahun, dan teks kemampuan dikosongkan), lalu nama pasangan, tanggal/tahun, dan "Bride & Groom" dirender sebagai teks HTML di posisi yang sama. Hasilnya tiap undangan otomatis punya kartu dengan nama sendiri, tanpa perlu upload.
  - Butuh: versi gambar kartu tanpa teks. Saya bisa membersihkan teksnya, atau kamu kirim versi tanpa teks dari sumber aslinya (hasilnya lebih rapi).
  - Nama panjang otomatis mengecil (lihat Issue 2).
- **B. (alternatif cepat)** Kalau belum ada foto: tampilkan kartu sederhana bergaya taman (ornamen bunga + inisial "M & R" + nama), murni CSS, tanpa ilustrasi pasangan. Lebih cepat dibuat, tapi kurang "wow".
- **C. Ajak upload foto.** Di dashboard pengguna, checklist sudah punya "Foto Utama & Galeri"; tambahkan pratinjau kartu 2D + catatan "Tanpa foto, kartu memakai ilustrasi default". Pasangan yang upload foto tetap memakai fotonya (perilaku sekarang).

Rekomendasi: **A + C**.

## Issue 2: Nama di peta terpotong
**Penyebab:** judul di peta (`.map-wedding-title`) dipaksa satu baris (`white-space: nowrap`) dengan font tetap 31px di HP, jadi "Muhammad andhika putra & Rai kartika" melewati layar dan tertutup tombol ♫ / ?.

**Saran:**
1. **Ukuran otomatis + maksimal 2 baris:** lebar judul dibatasi sampai sebelum tombol kanan; font mengecil bertahap (31 → minimal ~20px); kalau masih tidak muat, pecah jadi 2 baris dengan pemisah "&" di baris kedua:
   ```
   The Wedding of
   Muhammad Andhika Putra
   & Rai Kartika
   ```
2. **Kapitalisasi rapi otomatis** (input "Muhammad andhika putra" → "Muhammad Andhika Putra") untuk tampilan judul.
3. **(Disarankan, tahap berikutnya) "Nama panggilan" opsional** di dashboard (mis. "Andhika" & "Rai"). Jika diisi, judul peta dan kartu memakai nama panggilan; nama lengkap tetap di Info pernikahan. Ini butuh 2 kolom baru di database (migrasi kecil, non-destruktif), jadi dipisah dari perbaikan 1–2.
4. Judul di layar pembuka ("The Wedding of ...") juga diberi batas ukuran yang sama agar tidak terlalu raksasa pada nama panjang.

## Issue 3: Layar "Membuka taman…" kosong
**Penyebab:** layar hanya latar hijau polos + teks + persen di bawah; tidak ada visual atau animasi, jadi ±10 detik terasa lama dan seperti macet.

**Saran desain (tetap ringan, tanpa gambar besar):**
- **Latar:** pratinjau taman buram ukuran mini (WebP ~5–10 KB, di-inline/preload pertama) supaya langsung terasa "tamannya sedang dibuka", bukan layar hijau kosong.
- **Animasi:** karakter pixel kecil berjalan di tempat (memakai sprite sheet karakter yang memang sudah diunduh untuk game, jadi 0 KB tambahan) + hati/kelopak kecil melayang (CSS).
- **Progress bar** bergaya kayu/krem yang terisi halus (bukan hanya angka), dengan persen di dalamnya.
- **Teks berganti tiap ±2 detik:** "Menyiapkan taman…", "Mengundang tamu…", "Menata kursi…", "Memanggil pianis…", supaya terasa ada kemajuan.
- **Nama pasangan** ditampilkan di layar loading ("Undangan Andhika & Rai").
- **Satu loader berkesinambungan:** saat ini ada 2 layar berbeda ("Menyiapkan undangan" dari aplikasi utama lalu "Membuka taman" dari game). Disamakan gayanya (warna, posisi progress bar) supaya terasa satu proses, bukan dua kali loading.
- Hormati `prefers-reduced-motion` (animasi dimatikan, progress bar tetap).

## Tahapan (satu commit per langkah, tes lokal desktop + HP, lalu deploy dengan izin)
| Langkah | Isi | Database |
|---|---|---|
| P1 | Judul peta: auto-fit + 2 baris + kapitalisasi (Issue 2.1, 2.2, 2.4) | tidak |
| P2 | Layar loading baru + penyatuan gaya dengan loader utama (Issue 3) | tidak |
| P3 | Kartu default tanpa teks + nama/tahun ditimpa (Issue 1A) | tidak |
| P4 | Dashboard: pratinjau kartu + ajakan upload foto (Issue 1C) | tidak |
| P5 | (Opsional) Nama panggilan di dashboard + dipakai di 2D/3D (Issue 2.3) | migrasi 017, tambah 2 kolom |

Catatan teknis: file preset yang diubah diberi `?v=` baru (cache 1 tahun di Cloudflare); aset baru (kartu kosong, pratinjau buram) dalam WebP.

## Perlu keputusan
1. Kartu default: **A (ilustrasi tanpa teks + nama ditimpa)** atau **B (kartu CSS sederhana)**? Untuk A: kamu punya versi gambar kartu tanpa teks, atau saya yang bersihkan?
2. Nama panggilan (P5) dikerjakan sekarang atau nanti?
