# Wedding Summer Decoration Style

Panduan ini menyimpan bahasa visual dan pola implementasi dekorasi venue saat ini. Gunakan sebagai acuan ketika menambah atau mengubah jalan, pelaminan, backdrop, bunga, lampu, furnitur, dan elemen dekoratif lain agar hasilnya tetap konsisten.

## Arah Visual

Nama gaya: **Summer Afternoon Romantic Garden**.

Karakter utama:

- Romantis, hangat, elegan, dan sedikit whimsical.
- Bentuk sederhana dengan volume yang jelas, cocok dengan dunia low-poly/toon.
- Dekorasi kaya detail tetapi komposisi tetap rapi dan simetris.
- Warna lembut dipadukan dengan aksen burgundy dan emas champagne.
- Bunga menjadi aksen utama; foliage hijau sage menjaga komposisi tetap natural.
- Hindari hasil yang terlalu realistis, tajam, gelap, neon, atau penuh ornamen kecil tanpa fokus.

## Palet Utama

Gunakan warna berikut sebagai fondasi. Variasi kecil diperbolehkan selama hue dan tingkat kehangatannya tetap serupa.

| Peran | Warna | Hex yang digunakan |
| --- | --- | --- |
| Burgundy utama | Karpet dan panggung | `#9c2a40`, `#9c3a52`, `#b91c3c` |
| Dusty rose | Panel dan dekorasi romantis | `#c97f93`, `#d96b7a`, `#d9899d` |
| Pink bunga | Kelopak utama | `#d96f91`, `#ef829f`, `#ef8daa`, `#f3a7bd` |
| Blush muda | Kelopak sekunder | `#f4b8c7`, `#f7bfd0`, `#f9d7df` |
| Mauve lembut | Variasi bunga | `#d99ac8`, `#e6a8d2` |
| Ivory | Dinding, tangga, dan penyeimbang | `#fff0dc`, `#fff3dd`, `#f7efe0` |
| Champagne gold | Trim, vas, pusat bunga | `#d9b77b`, `#e8c98a`, `#f1d99e` |
| Sage green | Daun utama | `#76956f`, `#789b78` |
| Forest sage | Daun gelap dan batang | `#4f7658`, `#58755b` |
| Cream path | Jalan utama | `#e6d2a2`, `#d8c290` |

Aturan warna:

- Satu komposisi bunga idealnya menggunakan 3-5 warna bunga, 2 warna foliage, dan 1 aksen emas.
- Gunakan ivory untuk memberi ruang visual di antara pink dan burgundy.
- Emas adalah aksen, bukan warna dominan.
- Variasikan pink tua, pink muda, ivory, dan mauve agar bunga tidak terlihat seperti satu massa warna.

## Material Dan Geometri

- Gunakan `THREE.MeshToonMaterial` dengan `gradientMap` dari `getToonGradient()`.
- Gunakan geometri sederhana: `SphereGeometry`, `CircleGeometry`, `CylinderGeometry`, `TorusGeometry`, `BoxGeometry`, dan `ShapeGeometry`.
- Aktifkan `castShadow` pada bunga atau vas besar yang membutuhkan volume.
- Dekorasi permukaan seperti motif jalan dibuat sangat tipis dan tidak perlu menjadi collider.
- Buat geometry dan material yang berulang satu kali di `<script>`, lalu gunakan kembali pada semua mesh.
- Hindari membuat geometri baru di dalam loop jika bentuknya sama.
- Pertahankan jumlah segmen rendah-menengah agar gaya toon dan performa tetap baik.

Contoh pola:

```ts
const petalGeo = new THREE.SphereGeometry(0.2, 10, 8)
const leafGeo = new THREE.SphereGeometry(0.22, 8, 6)
const leafMat = new THREE.MeshToonMaterial({
  color: '#76956f',
  gradientMap: gradient
})
```

## Resep Bunga

### Bunga Berlapis 3D

- Susun 4-6 kelopak mengelilingi pusat bunga.
- Gunakan sphere yang dipipihkan sebagai kelopak.
- Putar setiap kelopak menghadap keluar dari pusat.
- Tambahkan pusat bunga kecil berwarna emas hangat.
- Variasikan skala bunga sekitar 10-25 persen dalam satu buket.

Pola posisi kelopak:

```ts
const angle = (Math.PI * 2 * index) / petalCount
const x = Math.cos(angle) * radius
const y = Math.sin(angle) * radius
```

### Daun

- Gunakan sphere yang dipanjangkan dan dipipihkan.
- Pakai dua shade hijau secara selang-seling.
- Arahkan daun keluar dari pusat buket.
- Tempatkan daun di belakang bunga agar bunga tetap menjadi fokus.

### Buket Panggung

Susunan dari bawah ke atas:

1. Vas atau pedestal emas/ivory.
2. Batang hijau dengan arah sedikit menyebar.
3. Daun besar di sisi luar dan daun kecil dekat pusat.
4. Bunga besar di bagian atas dan tengah.
5. Bunga lebih kecil mengisi celah bagian bawah.

Buket utama harus terlihat jelas dari kamera, tetapi tidak boleh menutup pasangan pengantin atau jalur masuk panggung.

## Komposisi Dan Penempatan

### Prinsip Umum

- Mulai dengan komposisi simetris kiri-kanan.
- Tambahkan variasi kecil pada rotasi, skala, dan urutan warna agar tidak terlihat disalin mentah.
- Jaga satu pusat perhatian utama pada setiap area.
- Sisakan negative space di sekitar karakter, label, tombol interaksi, dan jalur berjalan.
- Dekorasi tinggi ditempatkan di sisi luar; dekorasi rendah boleh mendekati jalur.
- Pastikan posisi lokal dan posisi dunia dipahami ketika elemen berada di dalam `<T.Group>`.

### Jalan Menuju Pelaminan

- Karpet merah tetap menjadi garis fokus utama.
- Motif diletakkan pada jalan cream di kanan dan kiri karpet.
- Motif dibuat datar, berulang, dan simetris.
- Gunakan pola bunga kecil dengan batang dan dua daun.
- Selang-seling orientasi pola agar jalur terasa hidup.
- Jangan tambahkan collider untuk ornamen datar.

### Lantai Panggung

- Pasangan pengantin berada di tengah dan harus selalu terlihat jelas.
- Buket besar ditempatkan di sisi luar pasangan.
- Buket tambahan di sudut depan dibuat lebih rendah atau lebih kecil.
- Area runner tengah dan akses tangga harus tetap lapang.
- Dekorasi panggung memakai skala besar agar terbaca dari jarak kamera permainan.

### Backdrop Tiga Lingkaran

- Lingkaran besar tengah adalah fokus utama.
- Simbol hati ditempatkan di pusat lingkaran besar.
- Gunakan bentuk hati berlapis: outline emas, badan dusty rose, dan highlight blush.
- Garland bunga mengikuti sebagian kontur lingkaran, bukan menutup seluruh lingkaran.
- Bagian atas dan bawah lingkaran besar menerima bunga paling banyak.
- Lingkaran kecil kiri-kanan menerima cluster bunga sekunder.
- Tempatkan elemen sedikit di depan backdrop untuk menghindari z-fighting.
- Semua dekorasi backdrop tetap berada di belakang kepala pasangan.

## Kedalaman Dan Layering

Gunakan perbedaan posisi kecil untuk menghasilkan volume dan mencegah permukaan bertabrakan:

- Dinding backdrop berada paling belakang.
- Ring emas berada sedikit di depan dinding.
- Daun berada di depan ring.
- Kelopak berada di depan daun.
- Pusat bunga berada sedikit di depan kelopak.
- Simbol hati berlapis menggunakan offset Z kecil pada setiap lapisan.

Untuk bidang horizontal seperti motif jalan, gunakan offset Y kecil di atas jalan dan karpet agar tidak terjadi z-fighting.

## Skala Dan Keterbacaan

- Nilai detail harus disesuaikan dengan kamera permainan, bukan hanya tampilan close-up.
- Bunga panggung perlu lebih besar daripada ukuran realistis agar bentuknya terbaca.
- Kelopak kecil sebaiknya memiliki perbedaan warna yang cukup dari daun dan backdrop.
- Jangan mengandalkan tekstur halus; siluet dan blok warna harus sudah terlihat bagus.
- Uji desktop dan mobile karena detail kecil dapat hilang pada layar sempit.

## Kontrak Interaksi

- Jangan memindahkan pasangan pengantin tanpa memperbarui komposisi dekorasi.
- Jangan menutup trigger `weddingStage` atau jalur menuju tangga.
- Jangan menambah collider untuk dekorasi visual kecil.
- Jika menambah objek besar di lantai, evaluasi apakah collider baru diperlukan.
- Pertahankan area tengah panggung, runner, dan tangga sebagai jalur yang dapat dilalui.
- Pastikan dekorasi tidak menghalangi kamera atau label interaksi.

## Praktik Implementasi

- Tempat utama dekorasi venue adalah `src/lib/components/threed/Environment.svelte`.
- Posisi pasangan berada di `src/lib/components/threed/Npcs.svelte`.
- Posisi trigger dan collision berada di `src/lib/constants/triggers.ts`.
- Gunakan array data untuk posisi, warna, skala, dan rotasi elemen berulang.
- Gunakan shared geometry dan material untuk mengurangi alokasi Three.js.
- Pertahankan perubahan sekecil mungkin dan ikuti struktur scene yang sudah ada.
- Jangan memakai aset realistis jika bentuk prosedural toon sudah cukup.

## Checklist Dekorasi Baru

- Apakah warna mengikuti palet romantic garden?
- Apakah bunga memiliki variasi warna, ukuran, dan kedalaman?
- Apakah komposisi seimbang tetapi tidak terlalu identik?
- Apakah karakter utama dan wajahnya tetap terlihat?
- Apakah jalan, tangga, runner, dan trigger tetap bebas?
- Apakah objek berulang memakai shared geometry/material?
- Apakah tidak ada z-fighting pada bidang datar atau backdrop?
- Apakah bentuknya terbaca dari kamera permainan dan layar mobile?
- Apakah `npm run check` lulus tanpa error dan warning?
- Apakah `npm run build` berhasil?

## Definisi Selesai

Dekorasi dianggap selesai jika terlihat romantis dan kaya dari kamera permainan, menyatu dengan palet panggung, tidak mengganggu karakter atau interaksi, menggunakan sumber daya Three.js secara wajar, serta lulus `npm run check` dan `npm run build`.
