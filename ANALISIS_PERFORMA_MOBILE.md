# Analisis Performa Startup Mobile `marryme.web.id`

Tanggal analisis: 21 Juli 2026

## Ringkasan Eksekutif

Ada dua masalah yang berbeda pada proses pembukaan website:

1. Sebelum halaman loading muncul, browser masih mengunduh, memproses, dan menjalankan JavaScript aplikasi. Karena SSR dimatikan, HTML pertama tidak mengandung halaman loading. Selama proses ini pengguna hanya melihat warna background hitam.
2. Setelah halaman loading muncul, overlay tersebut ditutup otomatis setelah 1,5 detik tanpa menunggu semua asset 3D siap. Model player, environment, dan NPC masih dimuat sehingga objek terlihat muncul satu per satu.

Perbedaan desktop dan mobile terjadi karena mobile umumnya memiliki jaringan, CPU, GPU, dan kemampuan kompilasi JavaScript/WebGL yang lebih lambat. Clean cache memperjelas masalah karena semua JavaScript dan model harus diunduh ulang.

## Gejala

### Mobile

- Layar hitam dapat terlihat sampai sekitar 10 detik.
- Setelah itu baru muncul halaman "Halo, Undangan yang Terhormat".
- Loading screen kemudian cepat menghilang.
- Saat masuk dunia 3D, NPC dan objek environment muncul bertahap.

### Desktop

- Layar hitam tetap muncul saat cold load, tetapi hanya sekitar 2 detik.
- Dunia 3D dan objek-objeknya tampil lebih cepat.

## Kesimpulan Utama

Layar hitam bukan disebabkan oleh browser yang sedang merender NPC. Pada fase tersebut browser terutama sedang:

- Membuka koneksi ke server.
- Mengunduh HTML dan JavaScript.
- Menyelesaikan module preload SvelteKit.
- Parse dan compile JavaScript.
- Menjalankan bootstrap SvelteKit.
- Memuat Three.js dan Threlte.
- Membuat komponen aplikasi pertama.

Baru setelah seluruh proses bootstrap cukup jauh, `LoadingScreen.svelte` dipasang ke DOM.

Setelah loading screen tampil, barulah pemuatan asset 3D, parsing GLB, pembuatan geometry/material, shader compilation, dan upload data ke GPU menjadi beban utama.

## Penyebab Layar Hitam

### 1. SSR Dimatikan

Konfigurasi di `src/routes/+layout.ts`:

```ts
export const prerender = true
export const ssr = false
```

Karena `ssr = false`, HTML produksi tidak berisi markup halaman loading. HTML awal hanya berisi script untuk memulai SvelteKit.

Alur saat browser membuka website:

1. Browser menerima HTML kosong dari sisi UI.
2. Browser mengunduh module JavaScript SvelteKit.
3. Browser mengunduh route utama.
4. Browser memproses Three.js, Threlte, dan komponen aplikasi.
5. SvelteKit baru memasang halaman ke DOM.
6. `LoadingScreen` baru terlihat.

### 2. Background Awal Memang Hitam

Di `src/app.css`:

```css
body {
  background-color: #0c0a09;
}
```

Container utama di `src/App.svelte` juga hitam:

```svelte
<div class="relative h-screen w-full overflow-hidden bg-[#0c0a09]">
```

Karena belum ada UI pada HTML awal, warna inilah yang terlihat pengguna.

### 3. Loading Screen Tergantung Bundle 3D

`src/App.svelte` mengimpor Canvas dan scene secara statis:

```ts
import { Canvas } from '@threlte/core'
import Scene from './lib/components/threed/Scene.svelte'
```

Pada saat yang sama, loading screen berada di dalam komponen tersebut:

```svelte
<Canvas shadows>
  <Scene />
</Canvas>

<LoadingScreen />
```

Walaupun loading screen secara visual ringan, browser tetap harus memproses module graph `App.svelte`, termasuk dependency 3D, sebelum loading screen bisa dipasang.

## Ukuran Bundle JavaScript

Hasil production build menunjukkan chunk route utama berukuran:

```text
876,13 KB minified
236,65 KB jika gzip aktif
```

Vite juga memberi peringatan:

```text
Some chunks are larger than 500 kB after minification
```

Chunk tersebut berisi Three.js, Threlte, scene, dan sebagian besar kode halaman utama. Browser mobile tidak hanya perlu mengunduhnya, tetapi juga parse dan compile seluruh JavaScript tersebut.

## Konfigurasi Server Produksi

Server produksi sudah menggunakan:

- HTTPS.
- HTTP/2.
- Cache asset selama satu tahun.
- `Cache-Control: public, immutable` untuk asset statis.

Namun, respons produksi belum menggunakan gzip atau Brotli. Pada pemeriksaan response header tidak ditemukan:

```text
Content-Encoding: gzip
```

Akibatnya chunk JavaScript sekitar 876 KB dikirim sebagai sekitar 876 KB, bukan sekitar 237 KB hasil gzip.

Ini sangat berpengaruh pada cold load mobile.

## Pengukuran Produksi

Pengukuran dari `https://marryme.web.id/` saat analisis:

### HTML

```text
TTFB  : sekitar 0,78 detik
Ukuran: 1.910 byte
```

### Chunk Route Utama

```text
Ukuran transfer: 876.174 byte
Waktu transfer : sekitar 1,95 detik
```

### Model Player

```text
File           : /models/tamu.glb
Ukuran transfer: 1.170.816 byte
Waktu transfer : sekitar 1,80 detik
```

### Model NPC Terbesar

```text
File           : /models/pengantin-wanita.glb
Ukuran transfer: 1.319.212 byte
Waktu transfer : sekitar 2,72 detik
```

Angka tersebut hanya menggambarkan transfer jaringan. Setelah file diterima masih ada biaya parsing GLB, pembuatan objek Three.js, skeleton, animation mixer, shader, dan upload data ke GPU.

## Loading Screen Tidak Menunggu Asset

Di `src/App.svelte`, loading screen ditutup dengan timer tetap:

```ts
const t = setTimeout(() => setLoaded(true), 1500)
```

Artinya loading screen hilang 1,5 detik setelah aplikasi berhasil mount, tanpa memeriksa apakah:

- Player sudah siap.
- Environment sudah siap.
- NPC sudah siap.
- Seluruh GLB sudah selesai diproses.
- Shader sudah selesai dikompilasi.
- Frame pertama dunia 3D sudah berhasil dirender.

## Progress Bar Hanya Simulasi

Di `src/lib/components/ui/LoadingScreen.svelte`:

```ts
const interval = setInterval(() => {
  progress = Math.min(95, progress + Math.random() * 12)
}, 200)
```

Progress tersebut tidak berhubungan dengan network request atau kesiapan scene. Persentase dapat mencapai nilai tinggi walaupun model masih belum selesai dimuat.

Alur yang terjadi sekarang:

```text
Bootstrap selesai
-> loading screen tampil
-> timer 1,5 detik berjalan
-> loading screen ditutup
-> asset 3D masih dimuat dan diproses
-> objek muncul satu per satu
```

## Mengapa NPC Muncul Belakangan

NPC memang sengaja ditunda di `src/lib/components/threed/Scene.svelte`:

```ts
$effect(() => {
  if (!playerReady) return
  const t = setTimeout(() => {
    void import('./Npcs.svelte').then((module) => {
      Npcs = module.default
    })
  }, 500)
})
```

Urutan yang terjadi:

1. Browser mengunduh model player.
2. Player diproses dan dibuat.
3. `playerReady` berubah menjadi `true`.
4. Aplikasi menunggu 500 ms.
5. Baru mengunduh chunk komponen NPC.
6. Baru memulai request empat model NPC.

Setiap NPC memiliki promise pemuatan sendiri melalui `useGltf()` dan blok `{#await}`. Model yang selesai lebih dulu langsung muncul, sedangkan model lain masih menunggu. Hal inilah yang menyebabkan NPC tampil satu per satu.

## Ukuran Model Karakter

Model yang digunakan aplikasi:

```text
resepsionis.glb        sekitar 1,2 MB
pemandu.glb            sekitar 1,1 MB
pengantin-pria.glb     sekitar 1,1 MB
pengantin-wanita.glb   sekitar 1,3 MB
```

Total model karakter yang perlu diunduh sekitar 5,8 MB.

Model karakter memiliki sekitar 17 animation clip. NPC biasanya hanya menggunakan satu clip seperti `Idle` atau `Victory`, sehingga kemungkinan ada banyak data animasi yang diunduh dan diproses tetapi tidak digunakan.

## Mengapa Environment Muncul Bertahap

Environment diimpor secara dinamis setelah scene mount:

```ts
onMount(() => {
  void import('./Environment.svelte').then((module) => {
    Environment = module.default
  })
})
```

`Environment.svelte` kemudian membuat sekitar 21 komponen `<Nature>` dengan file GLB berbeda. Setiap komponen melakukan proses sendiri:

1. Mengirim request GLB.
2. Menunggu download selesai.
3. Parse GLB.
4. Clone scene.
5. Clone geometry.
6. Clone material.
7. Traverse object tree.
8. Membuat `InstancedMesh`.
9. Menghitung bounding box dan bounding sphere.
10. Memasang hasil ke scene.

Karena setiap model selesai pada waktu berbeda, vegetasi dan hewan muncul bertahap.

Penggunaan `InstancedMesh` sudah merupakan optimasi yang baik untuk jumlah draw call, tetapi persiapan setiap model tetap membutuhkan CPU dan memori.

## Beban Main Thread dan GPU

Selain download asset, mobile harus menjalankan pekerjaan berikut:

- Parse JavaScript yang cukup besar.
- Compile JavaScript.
- Membuat WebGL context.
- Parse GLB.
- Clone geometry dan material.
- Membuat skeleton dan animation mixer.
- Membuat banyak object procedural.
- Menghitung bounding volume.
- Compile shader WebGL.
- Upload vertex buffer dan texture ke GPU.
- Render shadow map.

`Environment.svelte` berukuran lebih dari seribu baris dan menghasilkan banyak mesh, geometry, material, dekorasi bunga, tiang, lampu, kabel, panggung, dan nature instances. Pembuatan awal semua objek ini dapat memblokir main thread mobile.

## Beban Shadow di Mobile

Canvas selalu mengaktifkan shadow:

```svelte
<Canvas shadows>
```

Directional light juga selalu menghasilkan shadow:

```svelte
<T.DirectionalLight castShadow />
```

`SoftShadows` tetap aktif pada mobile, hanya jumlah sample yang dikurangi:

```svelte
<SoftShadows
  size={isMobile ? 16 : 28}
  samples={isMobile ? 4 : 12}
  focus={0.6}
/>
```

Ini bukan penyebab utama layar hitam, tetapi menambah biaya shader compilation dan rendering frame pertama.

Deteksi mobile saat ini hanya berdasarkan user agent:

```ts
/Mobi|Android/i.test(navigator.userAgent)
```

Pendekatan ini dapat gagal untuk tablet, iPad mode desktop, atau perangkat dengan user agent yang tidak cocok.

## Ukuran Build dan Asset Tidak Terpakai

Ukuran output build:

```text
build total   sekitar 29 MB
build/_app    sekitar 2,9 MB
build/models  sekitar 16 MB
build/nature  sekitar 6,8 MB
```

Folder model masih berisi format `.glb` dan `.gltf`, walaupun aplikasi menggunakan `.glb`. Folder nature juga membawa banyak file yang tidak digunakan halaman aktif.

Browser tidak otomatis mengunduh seluruh 29 MB, sehingga hal ini bukan penyebab langsung startup. Namun asset yang tidak digunakan membuat deployment lebih besar dan menyulitkan audit performa.

## Catatan Cache Asset

Nginx memberi cache satu tahun dan `immutable` untuk file seperti:

```text
/models/tamu.glb
```

Nama model tersebut tidak mengandung content hash. Jika file diganti tetapi URL tetap sama, browser pengguna bisa tetap menggunakan file lama selama periode cache.

Untuk asset non-hashed, sebaiknya:

- Jangan gunakan `immutable` satu tahun; atau
- Tambahkan version/hash pada nama atau URL file setiap revisi.

Masalah ini bukan penyebab lambat, tetapi dapat menyebabkan deployment baru tidak segera terlihat oleh pengguna lama.

## Prioritas Perbaikan

### Prioritas 1: Tampilkan Loading Shell dari HTML Awal

Tambahkan markup dan CSS loading langsung di `src/app.html`, atau aktifkan SSR untuk shell UI yang tidak membutuhkan Three.js.

Tujuannya agar teks "Halo, Undangan yang Terhormat" terlihat segera setelah HTML diterima, sebelum JavaScript utama selesai diproses.

### Prioritas 2: Pisahkan UI Loading dari Bundle 3D

Jangan membuat loading screen bergantung pada import statis berikut:

```ts
import { Canvas } from '@threlte/core'
import Scene from './lib/components/threed/Scene.svelte'
```

Tampilkan shell loading ringan terlebih dahulu, kemudian lakukan dynamic import untuk komponen dunia 3D.

### Prioritas 3: Gunakan Readiness Sebenarnya

Hapus timer tetap 1,5 detik. Loading screen sebaiknya ditutup hanya setelah minimal:

- Player siap.
- Environment kritis dekat spawn siap.
- NPC kritis siap.
- Canvas sudah menghasilkan frame pertama.

Progress bar harus berdasarkan status atau jumlah asset yang benar-benar selesai.

### Prioritas 4: Preload Asset Kritis

Selama loading screen terlihat, mulai request secara paralel untuk:

- Player.
- Environment dekat titik spawn.
- Resepsionis.
- Pemandu.
- Asset panggung yang terlihat dari posisi awal jika diperlukan.

Asset dekorasi jauh dapat dimuat belakangan.

### Prioritas 5: Hilangkan Delay NPC 500 ms

Delay tersebut menambah waktu sebelum request NPC dimulai. Jika tujuannya mengurangi blocking, request dapat dimulai lebih awal tetapi mounting ke scene dilakukan setelah kelompok asset kritis siap.

### Prioritas 6: Aktifkan Gzip atau Brotli

Nginx perlu mengompresi JavaScript, CSS, JSON, SVG, dan file teks lainnya. Berdasarkan hasil build, chunk utama dapat turun dari sekitar 876 KB menjadi sekitar 237 KB menggunakan gzip.

GLB tidak selalu mendapat pengurangan besar dari gzip karena merupakan format biner, tetapi JavaScript dan CSS akan mendapat manfaat signifikan.

### Prioritas 7: Optimalkan Model Karakter

Beberapa opsi:

- Hapus animation clip yang tidak digunakan.
- Buat versi model NPC yang hanya membawa satu atau dua animasi.
- Kurangi polygon jika terlalu tinggi.
- Optimalkan skeleton dan keyframe animation.
- Evaluasi Meshopt atau Draco berdasarkan pengujian nyata di mobile.
- Pertimbangkan model kualitas berbeda untuk mobile.

Kompresi geometry perlu diuji karena ukuran download yang lebih kecil dapat menambah biaya decode pada CPU mobile.

### Prioritas 8: Turunkan Kualitas Render Mobile

Pertimbangkan konfigurasi mobile seperti:

- DPR maksimal 1 sampai 1,5.
- Shadow sederhana atau dinonaktifkan.
- Soft shadow samples lebih sedikit.
- Dekorasi procedural lebih sedikit.
- Object jauh dimuat setelah scene utama siap.
- Material dan shader lebih sederhana.

Kualitas sebaiknya ditentukan berdasarkan kemampuan perangkat, bukan user agent saja.

### Prioritas 9: Kurangi Material dan Shadow Caster

Semakin banyak variasi material, semakin banyak shader program yang mungkin perlu dikompilasi. Dekorasi kecil sebaiknya tidak menggunakan `castShadow` jika dampak visualnya kecil.

Geometry dan material yang sama sebaiknya dibagi dan digunakan ulang.

### Prioritas 10: Bersihkan Asset Deployment

- Hapus format model lama yang tidak digunakan.
- Hapus nature asset yang tidak dipakai.
- Hapus file dokumentasi dari image produksi jika tidak dibutuhkan.
- Pastikan asset non-hashed memiliki strategi cache yang aman.

## Alur Startup yang Disarankan

```text
HTML diterima
-> loading shell langsung terlihat
-> JavaScript UI kecil aktif
-> bundle Three.js diunduh di belakang loading overlay
-> Canvas dibuat
-> player, environment dekat spawn, dan NPC kritis dipreload
-> shader dan frame awal disiapkan di balik overlay
-> status readiness terpenuhi
-> overlay melakukan fade out
-> dunia muncul dalam keadaan utuh
-> dekorasi jauh dilanjutkan secara bertahap
```

Dengan alur tersebut, waktu loading total di mobile mungkin masih beberapa detik, tetapi pengguna tidak lagi melihat layar hitam atau dunia dalam keadaan setengah jadi.

## Urutan Implementasi yang Direkomendasikan

1. Tambahkan loading shell statis di `src/app.html`.
2. Pisahkan komponen dunia 3D menjadi dynamic import setelah shell terlihat.
3. Buat store atau loading manager untuk status asset sebenarnya.
4. Hapus timer loading 1,5 detik dan progress random.
5. Preload player, environment kritis, dan NPC secara paralel.
6. Tahan fade-out sampai frame pertama scene lengkap selesai.
7. Aktifkan gzip/Brotli di Nginx.
8. Profiling ulang di perangkat mobile dengan clean cache.
9. Optimalkan GLB karakter dan konfigurasi shadow berdasarkan hasil profiling.
10. Bersihkan asset yang tidak digunakan dan perbaiki strategi cache model.

## Verifikasi Saat Analisis

- `npm run build` berhasil.
- Build memperingatkan chunk JavaScript lebih besar dari 500 KB.
- `npm run check` berhasil dengan 0 error dan 0 warning.
- Produksi menggunakan HTTP/2 dan cache asset satu tahun.
- Produksi belum menggunakan gzip atau Brotli.
- Chunk route utama produksi sekitar 876 KB tanpa compression.
- Total model karakter yang digunakan sekitar 5,8 MB.
- Loading screen saat ini menggunakan timer 1,5 detik dan progress acak.
- NPC baru mulai dimuat setelah player siap ditambah delay 500 ms.
