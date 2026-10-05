# Rencana Teknis: Penggantian Foto Cover 2D & Optimasi Kecepatan Loading Web 2D

Dokumen ini memuat analisis akar masalah dan langkah-langkah implementasi untuk:
1. Mengganti foto kartu cover "Faris & Eliza" di tampilan awal 2D Garden dengan **Foto Utama Pasangan (Cover)** yang diunggah melalui menu **Galeri Foto 3D** di dashboard.
2. Mempercepat loading web 2D yang saat ini memakan waktu sangat lama pada layar *"Membuka taman..."*.

---

## Bagian 1: Analisis Akar Masalah (Root Cause)

### A. Kenapa Foto Faris & Eliza Masih Muncul di Subdomain?
Berdasarkan investigasi kode sumber:
1. **Bug Query SQL di Backend (`server/routes/multiplayer.js:307`):**
   ```javascript
   FROM invitations i
   LEFT JOIN wedding_configs wc ON wc.id = i.id
   WHERE i.slug = ?
   ```
   Tabel `wedding_configs` tidak memiliki kolom `id` (primary key adalah `invitation_id`). Klausa `wc.id = i.id` menyebabkan error SQL di MySQL, sehingga API `/api/multiplayer/content` masuk ke blok `catch` dan selalu mengembalikan data statis bawaan:
   `assets.cover = 'assets/wedding-card.jpg'` (gambar kartu anime Faris & Eliza).

2. **Hardcoded HTML di Index 2D (`static/presets/garden-2d/index.html:13`):**
   ```html
   <div class="title-card">
     <img src="assets/wedding-card.jpg" width="1101" height="1536" alt="..." />
   </div>
   ```
   Sebelum data config diterima lewat `postMessage` atau API, gambar yang tampil default adalah file JPEG anime Faris & Eliza.

3. **Format & Estetika Kartu:**
   File `assets/wedding-card.jpg` adalah sebuah kartu trading bergaya Pokémon portrait lengkap dengan teks nama dan atribut. Jika diganti dengan foto pengguna (misal foto landscape/kamera biasa), diperlukan penyesuaian CSS agar foto tampil anggun seperti kartu undangan berbingkai (`object-fit: cover`, border radius, frame bayangan).

---

### B. Kenapa Web 2D Sangat Lambat Saat "Membuka taman..."?
Game 2D menahan layar hijau *"Membuka taman..."* sampai **7 aset utama tuntas diunduh** (`game.js:528: if (++loaded === 7)`). 

Total ukuran aset awal saat ini mencapai **> 20 MB**:
| Aset | Ukuran Saat Ini | Masalah |
| :--- | :--- | :--- |
| `front-gate.svg` | **4.86 MB** | Berisi base64 PNG raksasa (1536x1024) di dalam SVG, padahal di game hanya berukuran 208x180 px |
| `wedding-song-complete.m4a` | **4.53 MB** | Memakai `<audio preload="auto">` sehingga browser langsung download audio penuh sebelum game bisa jalan |
| `garden.png` | **3.65 MB** | Format PNG berat (sudah ada `garden.webp` 2.7 MB tapi belum dipakai) |
| `seated-guests.png` | **1.70 MB** | PNG resolusi tinggi tanpa kompresi WebP |
| `singer-idle.png` | **1.34 MB** | PNG tidak dikompresi |
| `wedding-hosts.png` | **0.80 MB** | Belum memakai format WebP |
| `wedding-guests-v2.png` | **0.72 MB** | Belum memakai format WebP |

Total aset blocking: **~17.6 MB gambar + 4.5 MB audio = 22.1 MB!**
Pada koneksi seluler biasa di Indonesia, mendownload 22 MB sebelum game terbuka membutuhkan **15 hingga 30 detik**.

---

## Bagian 2: Rencana Eksekusi & Solusi

### Tahap 1: Mengintegrasikan Foto Utama Pasangan (Cover) ke Kartu 2D

1. **Perbaikan Backend API (`server/routes/multiplayer.js`):**
   - Perbaiki relasi join dari `ON wc.id = i.id` menjadi `ON wc.invitation_id = i.id`.
   - Pastikan jika `wc.wedding_photo` terisi, URL foto tersebut dikirimkan pada field `assets.cover`.

2. **Sinkronisasi di Frontend Iframe (`Garden2DApp.svelte` & `cms-bootstrap.js`):**
   - Di `Garden2DApp.svelte`: pastikan `$weddingConfig.wedding_photo` dikirimkan lewat event `postMessage: SET_WEDDING_CONFIG`.
   - Di `cms-bootstrap.js`: update atribut `src` pada elemen kartu jika ada `wedding_photo`.

3. **Styling Kartu Foto yang Rapi & Proporsional (`style.css`):**
   - Tambahkan styling `object-fit: cover; object-position: center; border-radius: 18px;` dengan efek border dan bingkai trading card mewah sehingga foto pasangan (potret maupun lanskap) tetap terlihat pas dan premium.

---

### Tahap 2: Optimasi Kecepatan Loading Web 2D (Dari 22 MB Menjadi ~3-4 MB)

1. **Optimasi Aset Audio (`index.html`):**
   - Ubah `preload="auto"` menjadi `preload="none"`.
   - Audio hanya mulai di-stream saat tombol **"Mulai Permainan"** diklik oleh user.
   - **Penghematan Langsung:** Menghemat **4.53 MB** di awal load.

2. **Optimasi `front-gate.svg` (Dari 4.86 MB Menjadi ~25 KB):**
   - Ekstrak potongan gerbang berukuran 208x180 px dari base64 raksasa dan simpan sebagai file `assets/front-gate.webp`.
   - **Penghematan Langsung:** Menghemat **~4.8 MB** (turun 99%!).

3. **Migrasi Semua Spritesheet ke WebP:**
   - Gunakan `garden.webp`, `seated-guests.webp`, `singer-idle.webp`, `wedding-hosts.webp`, dan `wedding-guests-v2.webp`.
   - Di `cms-bootstrap.js`, arahkan seluruh aset ke ekstensi `.webp`.

4. **Indikator Loading Realistis (Progress Bar):**
   - Tampilkan persentase progres (`0% -> 100%`) agar tamu tahu proses berjalan dengan cepat dan tidak mengira halaman nge-freeze.

---

## Bagian 3: Tabel Estimasi Penurunan Ukuran & Waktu Load

| Komponen | Ukuran Saat Ini | Ukuran Setelah Optimasi | Penghematan |
| :--- | :--- | :--- | :--- |
| **Audio Song** | 4.53 MB (auto preload) | 0 MB (stream on click) | **-100% saat start** |
| **Front Gate** | 4.86 MB (raw base64 SVG) | ~0.03 MB (WebP) | **-99%** |
| **Peta Garden** | 3.65 MB (PNG) | ~1.50 MB (WebP) | **-58%** |
| **Sprites Tamu & NPC** | ~4.50 MB (PNG) | ~2.50 MB (WebP) | **-44%** |
| **TOTAL LOAD AWAL** | **~22.1 MB** | **~4.0 MB** | **Hemat ~82% Bandwidth** |

> **Dampak Kecepatan:** 
> Waktu tunggu loading *"Membuka taman..."* akan berkurang drastis dari **15–25 detik** menjadi hanya **1–3 detik** pada koneksi internet rata-rata.
