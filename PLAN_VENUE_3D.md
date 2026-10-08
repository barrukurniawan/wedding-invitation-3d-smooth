# Rencana Pilihan Venue 3D + Optimasi Render (Garden → + Pantai Sunset)

Branch kerja: `new_staging_refactor` (dibuat dari `new_staging` @ `a01e02f`).

## 1. Tujuan

Undangan 3D (`preset = '3d_summer'`) saat ini hanya punya satu venue: taman outdoor dengan gunung dan pepohonan. Kita tambahkan **pilihan venue** per undangan, dimulai dari:

| ID | Nama | Status |
|---|---|---|
| `garden` | Taman Musim Panas (venue sekarang) | Ada, jadi default |
| `beach` | Pantai Sunset | Baru (fase ini) |

Venue berikutnya (Pendopo/Joglo, Taman Malam, Ballroom) **di luar scope** dokumen ini, tetapi arsitekturnya disiapkan supaya venue baru cukup berupa satu folder baru.

Syarat utama:
- Undangan yang sudah live **tidak berubah sama sekali** (default `garden`).
- Layout gameplay (karpet, pelaminan, resepsionis, buku tamu, collider, trigger) **identik di semua venue**. Yang berganti hanya sekeliling, tanah, langit, kabut, lighting, dan palet dekorasi.
- Tamu hanya mengunduh aset venue yang dipakai (lazy import per venue).

## 2. Kondisi Sekarang (hasil audit)

**Alur data tenant → 3D**
- Subdomain → `src/lib/routing/host.ts` → `TenantBootstrap.svelte` → `loadConfig()` (`stores/weddingConfig.svelte.ts`) → `GET /api/config` (`server/routes/config.js`).
- `TenantBootstrap.svelte:16-22` memilih app: `2d_garden` → `twod/Garden2DApp.svelte`, selain itu → `App.svelte` (3D).
- Di dalam scene 3D belum ada data tenant selain nama mempelai (`Labels.svelte` membaca `$weddingConfig`). Warna alam berasal dari env build-time (`natureTheme.ts`, `natureColors.ts`).

**Komposisi scene**
- `Scene.svelte` mengatur background + fog (hardcode), `Sky` (gradient shader, hardcode), `Lighting` (hardcode), lalu lazy-import `Environment.svelte`.
- `Environment.svelte` (sekitar 1.100 baris) mencampur dua jenis isi:
  - **Inti venue** (prosedural, dibuat dengan bantuan AI): jalur dan karpet merah, motif bunga di jalur, landing carpet, pelaminan + backdrop + bouquet + kursi, meja resepsionis, kotak surat, arch, 10 tiang lampu + `HangingLights`, dan proxy occluder kamera.
  - **Sekeliling** (spesifik garden): 3 bidang tanah rumput (gradien pink/`GROUND_COLOR`), 3 lapis gunung, vegetasi `Nature` (aset gratis dari `nature-pack.glb` + `Bush_Common*.gltf`), dan hewan (bunny/cat/panda).
- Aset gratis (karakter, pohon, rumput, batu) ada di `static/models/` dan `static/nature/gltf/`. **Tidak ada pohon kelapa**, jadi aset pantai harus dibuat atau ditambahkan.

**Audit performa (diukur 2026-10-08, live `kia-toni.marryme.web.id`, Chrome + `?perf`)**

| Profil | Draw call | Triangle | FPS (Mac M4) |
|---|---|---|---|
| Desktop retina (DPR render 1,25) | 812 | ~168 rb | 60 |
| Desktop biasa (DPR 1) | 812 | ~169 rb | 60 |
| Mobile, `lowPower` | 772 | ~164 rb | 60 |

Asal draw call di desktop:

| Sumber | Draw call | Catatan |
|---|---|---|
| Mesh dekorasi prosedural (non-instanced) | **747 (92%)** | 441 Sphere (kelopak/daun/bohlam), 112 Circle (motif jalur), 66 Box, 64 Cylinder, 20 Torus, 20 Plane, dll. |
| Karakter (skinned) | 27 | Pemain + NPC; tidak disentuh |
| Vegetasi `Nature` + hewan | ~38 | Sudah `InstancedMesh` (226 instance) |

Temuan:
- 747 mesh memakai **424 material unik** (72 `<T.MeshToonMaterial>` inline di `Environment.svelte` yang dibuat ulang di setiap `{#each}`) dan 181 geometri unik.
- Mode `lowPower` hampir tidak mengurangi draw call (812 → 772), karena yang dipangkas hanya vegetasi yang sudah murah.
- Di Mac M4 masih 60 FPS walau CPU diperlambat 6x, tetapi ~800 draw call per frame tetap jadi beban utama di laptop atau HP yang lebih lemah. Ini titik optimasi paling besar.
- Bohlam `HangingLights` dibuat 1 mesh + 1 material per bohlam.
- Banyak mesh diberi `castShadow`, tetapi tidak ada lampu yang memancarkan bayangan, jadi flag itu tidak berpengaruh.

**Penyimpanan preset**
- `wedding_configs.preset VARCHAR(32) DEFAULT '3d_summer'` (migrasi `012_preset_theme.sql`).
- Diubah lewat `PATCH /api/my/config` (`server/routes/tenant-config.js`, enum zod + daftar field yang diizinkan).
- Dipilih di `OnboardingWizard.svelte` dan di pengaturan `DashboardShell.svelte:1172-1200`.
- Migrasi terakhir `014_nullable_wedding_date.sql`. Runner `server/scripts/migrate.js` memakai **array hardcode** dan checksum: file baru wajib didaftarkan, dan file lama tidak boleh diedit.

## 3. Keputusan Desain

### 3.1 Kolom `venue` terpisah, bukan nilai preset baru
`preset` menentukan *mesin* (2D vs 3D), sedangkan `venue` menentukan *dunia* di dalam mesin 3D. Kalau dibuat `3d_beach` sebagai preset, setiap pengecekan `preset === '3d_summer'` / `!== '2d_garden'` harus diubah, dan kombinasi preset × venue akan meledak saat venue bertambah.

→ Kolom baru `wedding_configs.venue VARCHAR(32) NOT NULL DEFAULT 'garden'`, hanya dipakai saat preset 3D.

### 3.2 Registry venue di frontend
`src/lib/venues/index.ts` menjadi satu-satunya sumber kebenaran:

```ts
export type VenueId = 'garden' | 'beach'

export interface VenueTheme {
  background: string            // scene.background
  fog: { color: string; near: number; far: number; nearLow: number; farLow: number }
  sky: { horizon: string; top: string }
  lighting: {
    hemi: { sky: string; ground: string; intensity: number }
    ambient: { color: string; intensity: number }
    sun: { position: [number, number, number]; color: string; intensity: number }
  }
  core: {                       // palet bagian inti yang boleh beda per venue
    pathCenter: string          // jalur batu tengah (#e6d2a2 di garden)
    pathSide: string            // side walk (#d8c290)
    groundUnderPath: string     // tanah di bawah jalur (#a3c98f)
    poleStyle: 'classic' | 'bamboo'
  }
}

export interface VenueDef {
  id: VenueId
  label: string
  theme: VenueTheme
  loadSurroundings: () => Promise<{ default: Component<SurroundingsProps> }>
}
```

Fungsi `resolveVenue(id)` mengembalikan `garden` untuk nilai kosong atau tidak dikenal, supaya tidak pernah crash.

### 3.3 Pecah `Environment.svelte`

```
src/lib/components/threed/
  Environment.svelte           → pembungkus: pilih venue, render VenueCore + Surroundings
  venue/VenueCore.svelte       → semua elemen gameplay & dekorasi inti (dipindah apa adanya)
  venues/garden/GardenSurroundings.svelte  → tanah rumput, gunung, Nature, hewan
  venues/beach/BeachSurroundings.svelte    → pasir, laut, kelapa, dst.
  venues/beach/Sea.svelte, PalmTrees.svelte, ...
```

- `Sky.svelte`, `Lighting.svelte`, serta background/fog di `Scene.svelte` menerima `theme` dari registry; nilai garden = nilai hardcode sekarang.
- Kontrak `onReady` / `showDecor` (vegetasi ditunda setelah overlay loading hilang) dipertahankan di setiap Surroundings.
- Proxy occluder kamera tetap di `VenueCore` (posisi inti sama). Kalau sebuah venue menambah objek tinggi dekat jalur, venue itu boleh menambah occluder sendiri.

### 3.4 Kenapa "Pantai Sunset" dulu
Ruang terbuka dengan kamera dan collider yang sama, jadi tidak ada risiko kamera menabrak dinding (berbeda dengan ballroom). Perbedaan visualnya besar walau perubahan kodenya relatif kecil, sehingga cocok untuk membuktikan sistem venue.

## 4. Desain Venue Pantai Sunset

| Elemen | Garden (sekarang) | Beach (rencana) | Cara bikin |
|---|---|---|---|
| Langit | Biru `#8ed3f7` → `#eaf8ff` | Sunset: atas ungu-biru `#7d8fd1`, horizon peach `#ffc49a` | Uniform shader `Sky` |
| Kabut | `#dff3fb` | Peach `#f7d2b6` | Theme |
| Matahari | Putih hangat, tinggi | Oranye `#ffb070`, rendah dari arah belakang pelaminan | Theme lighting |
| Tanah samping | Gradien pink/hijau | Gradien pasir `#e9cf9f` → `#f6e6c4` | `createGroundGradient` dengan stop pasir |
| Latar belakang pelaminan | 3 lapis gunung | **Laut** + garis horizon + piringan matahari | Plane + toon shader animasi pita gelombang (murah) |
| Pohon | Nature pack | **Pohon kelapa** (6 variasi) | Aset CC-BY: `palm_tree_low_poly` + `PALM1–5` (lihat 4.1), InstancedMesh |
| Semak/rumput | Banyak instance | Sedikit rumput pantai + batu | `ROCKS` dari paket pantai + `Grass_*` yang sudah ada |
| Detail sisi | Hewan | Payung pantai, papan selancar, handuk, kursi pantai | Aset CC-BY dari paket pantai |
| Latar laut | — | Yacht, pelampung, menara penjaga pantai di kejauhan | Aset CC-BY dari paket pantai |
| Detail kecil | — | Kerang, bintang laut, obor tiki | Prosedural sederhana |
| Tiang lampu | Klasik krem/emas | Varian bambu (opsional, fase 2) | `poleStyle` di theme, posisi tetap |
| Bunga/karpet/pelaminan | Pink-krem | Sama (fase 1); palet coral opsional (fase 2) | Theme `core` |

### 4.1 Aset pantai yang tersedia (ditambahkan user 2026-10-08)

Sudah dicek: dirender dengan `MeshToonMaterial` + gradient 3 tone + lighting garden, dan gayanya cocok dengan scene sekarang (low-poly, warna flat, tanpa tekstur kecuali kursi).

| File | Isi | Triangle | Ukuran | Pakai? |
|---|---|---|---|---|
| `assets/models/source/palm_tree_low_poly.glb` | 1 pohon kelapa melengkung, 3 material warna flat | 1.077 | 72 KB | **Ya**, pohon utama (InstancedMesh). Skala asli sangat kecil (tinggi ~0,11), perlu dinormalisasi |
| `static/nature/gltf/scene.gltf` + `scene.bin` ("Low Poly Beach Assets") | 31 objek dalam satu scene | 12.311 | 1,1 MB | **Sebagian**, lihat di bawah |
| `assets/models/source/beach_chair.glb` | Kursi pantai kayu, kain garis merah-putih | 728 | 257 KB (tekstur JPEG/PNG) | **Opsional**, dekorasi sisi. Tekstur bisa diganti warna flat supaya < 30 KB |

Isi paket "Low Poly Beach Assets" yang direncanakan dipakai:
- `PALM1`–`PALM5` sebagai variasi kelapa (852/672 tri), dicampur dengan `palm_tree_low_poly`.
- `UMBRELLA1–3`, `ROCKS`, `SURFBOARD`/`SURFBOARD2`, `TOWEL1–3`, dan `B_CHAIR1–2` sebagai dekorasi sisi.
- `YACHT` dan `FLOAT1–2` di laut belakang pelaminan.
- `CABIN` (menara penjaga pantai) sebagai landmark jauh.

Yang tidak dipakai:
- `SAND`, `SEA`, `FOAM`, dan `Plane_007`: tanah dan laut dibuat sendiri supaya ukurannya sesuai layout.
- `SHARK`, `VOLLEYBALL`, `BALL`, `FRIDGE`, dan `FLAG`: kurang cocok untuk suasana pernikahan. Bisa dipertimbangkan lagi.

**Pipeline aset:**
1. File sumber disimpan di `assets/models/source/` (tidak disajikan ke publik). `scene.gltf`/`scene.bin` dipindah dari `static/nature/gltf/` ke `assets/models/source/beach-assets/`. Saat ini file 1,1 MB itu ikut ter-deploy walau tidak dipakai, dan namanya `scene` terlalu umum.
2. Skrip `scripts/build-beach-pack.cjs` (pola sama dengan `build-nature-pack.cjs`):
   - Mengambil node yang dipakai saja, lalu menormalkan skala dan titik pusat ke tanah (y = 0).
   - Mengganti nama node supaya bisa dipanggil lewat `modelName`.
   - Membuang `KHR_materials_clearcoat`, lalu `dedup` + `prune` + kuantisasi.
   - Hasilnya `static/nature/gltf/beach-pack.glb`, perkiraan ≤ 250 KB.
3. Dipasang di `npm run build` di samping `build:nature`. Karena Dockerfile menyalin seluruh repo (`COPY . .`), skrip ini juga jalan saat build Docker.
4. `beach-pack.glb` **hanya dimuat oleh venue beach**. Tamu venue garden tidak mengunduhnya.
5. Dimuat lewat `Nature.svelte` yang sudah ada (instancing + tint material per nama). Kursi pantai bisa lewat jalur yang sama.

### 4.2 Lisensi & kredit (wajib)

Ketiga aset berlisensi **CC-BY-4.0**: boleh dipakai komersial **dengan syarat menyebut pembuat, judul, sumber, dan lisensinya**. Tanpa kredit, kita melanggar lisensi.

| Aset | Pembuat | Sumber |
|---|---|---|
| Palm Tree Low Poly | Connor_Appleton | sketchfab.com/3d-models/palm-tree-low-poly-6198f5dd302644a2bc5e1d31fef46fb0 |
| Low Poly Beach Assets | EdwinRC | sketchfab.com/3d-models/low-poly-beach-assets-66c18ecd7a834d4a99dabc46b5ee6e4a |
| Beach chair | Cookie (ChocoCookie) | sketchfab.com/3d-models/beach-chair-0f370dedfa5d43c8b14658dfc5c46273 |

Rencana:
- `CREDITS.md` di repo berisi semua aset pihak ketiga, termasuk aset garden yang sudah ada.
- Tautan kecil "Kredit aset 3D" di undangan (mis. di menu pengaturan atau footer loading screen). Isinya daftar yang dibaca dari satu file data, mis. `src/lib/constants/credits.ts`.
- Metadata `extras` (author/license/source) di `beach-pack.glb` dipertahankan.
- Catatan: aset garden yang sudah live juga belum punya kredit di aplikasi. Perlu dicek lisensinya masing-masing; `Stylized_Nature/License_Standard.txt` punya syarat sendiri.

**Aset buatan sendiri (prosedural)** tetap dipakai untuk elemen yang tidak ada di paket: laut dengan shader gelombang, tanah pasir, piringan matahari, obor tiki, kerang, dan bintang laut.

**Anggaran performa:** draw call beach ≤ garden setelah Fase 0 (≤ 150). Pohon kelapa dan objek berulang memakai `InstancedMesh`, dekorasi statis dibungkus `StaticBatch`, material lewat `toonMat()`, dan laut cukup satu plane dengan shader murah. Mode `lowPower` mengurangi kepadatan dengan pola `sparseTrees`.

## 5. Tahapan Kerja

### Fase 0: Refactor + optimasi, tanpa perubahan visual

Semua dikerjakan dan diuji **di lokal** pada branch `new_staging_refactor`. Tidak ada merge ke `new_staging` atau deploy sampai kamu mencoba sendiri dan menyetujui. Fase 0 dipecah menjadi 4 langkah, masing-masing satu commit, supaya kalau ada masalah mudah ditelusuri dan di-revert.

**Target Fase 0**

| Metrik | Sekarang | Target |
|---|---|---|
| Draw call desktop | 812 | **≤ 150** |
| Draw call mobile (`lowPower`) | 772 | **≤ 140** |
| Material unik (dekorasi) | 424 | **≤ 60** |
| Tampilan | — | Identik (selisih pixel hanya dari animasi karakter/lampu) |
| Gameplay | — | Trigger, collider, klik kotak surat, dan kamera tidak berubah |

#### 0.1 Baseline & alat ukur (dev-only)
1. Tambah `scripts/perf/measure-scene.mjs` (Node + `puppeteer-core` sebagai devDependency, memakai Chrome yang sudah terpasang). Fungsinya:
   - Membuka `http://kia-toni.localhost:5173/?perf` dengan 3 profil: desktop retina, desktop biasa, dan mobile.
   - Mencatat draw call, triangle, FPS, dan p95 frame time, juga dengan CPU diperlambat 4x/6x.
   - Membuat breakdown draw call per jenis objek (lewat hook `__THREE_DEVTOOLS__`, cara yang sama dengan audit di atas).
   - Mengambil screenshot dari 3 posisi kamera: spawn, dekat resepsionis, dan depan pelaminan. Posisi diatur lewat query dev-only, mis. `?perf&spawn=receptionist`, yang hanya aktif di mode dev.
2. Simpan hasil baseline ke `.perf/baseline/` (masuk `.gitignore`), dipakai pembanding di setiap langkah berikutnya.
3. Tambah script npm `perf:measure`.

Commit: `chore(perf): add local scene measurement script`

#### 0.2 Pecah `Environment.svelte` (murni pindah kode)
1. `src/lib/venues/index.ts`: registry + tema `garden` yang menyalin semua nilai hardcode sekarang (sky, fog, background, lighting, warna jalur).
2. `Sky`, `Lighting`, serta background/fog di `Scene` membaca tema. Nilainya tetap sama persis.
3. `Environment.svelte` dipecah menjadi:
   - `venue/VenueCore.svelte`: jalur, karpet, motif, landing, pelaminan, resepsionis, kotak surat, arch, tiang, dan lampu gantung.
   - `venue/VenueOccluders.svelte`: proxy collision kamera.
   - `venues/garden/GardenSurroundings.svelte`: tanah, gunung, `Nature`, dan hewan.
4. Belum ada perubahan cara render.

Verifikasi: draw call harus **tetap 812** dan screenshot identik dengan baseline. Kalau angkanya berubah, berarti ada yang hilang atau dobel saat dipindah.

Commit: `refactor(3d): split environment into venue core and garden surroundings`

#### 0.3 Optimasi: gabungkan dekorasi statis (perubahan terbesar)
1. **`StaticBatch.svelte`**, wrapper untuk dekorasi yang tidak bergerak:
   - Isinya tetap ditulis deklaratif seperti sekarang (`<T.Mesh>`, `{#each}`), jadi kode dekorasi tetap mudah dibaca dan diubah.
   - Setelah children ter-mount, wrapper menelusuri semua mesh dan mengelompokkannya per "tanda tangan material" (tipe, warna, map, gradientMap, transparent, opacity, side) serta set atribut geometri.
   - Transform dunia di-bake ke geometri, lalu digabung dengan `BufferGeometryUtils.mergeGeometries` (three 0.185 sudah menyediakan). Hasilnya 1 mesh per kelompok dengan 1 material bersama.
   - Mesh asli disembunyikan (`visible = false`), **tidak dihapus**. Svelte/Threlte tetap memiliki objeknya, jadi cleanup saat unmount aman.
   - Saat unmount, geometri dan material gabungan di-`dispose()`.
2. Yang **masuk** batch: jalur, karpet, motif bunga, landing carpet, pelaminan (lantai, tangga, backdrop, bunga, bouquet, kursi), meja resepsionis + garland, arch, dan tiang lampu.
3. Yang **tidak masuk** batch:
   - Kotak surat, karena punya `onclick`/hover.
   - Proxy occluder kamera.
   - Karakter.
   - Vegetasi `Nature`, karena sudah instanced.
   - Gunung, karena tetap di Surroundings. Bisa dibatch terpisah di Surroundings kalau perlu.
4. **`HangingLights`**: bohlam diganti `InstancedMesh` dengan warna per instance (`setColorAt`). Satu draw call per kabel, bukan satu per bohlam. Kabel tetap `TubeGeometry`.
5. Material toon dibuat dari cache bersama (`toonMat(color)` di `utils/toonMaterial.ts`), supaya surroundings venue baru tidak mengulang masalah 424 material.
6. Bersihkan flag `castShadow` yang tidak berefek, atau dokumentasikan bahwa scene tidak memakai shadow map.

Perkiraan hasil: sekitar 747 draw call dekorasi turun menjadi kira-kira 40–60 kelompok material. Total sekitar 27 karakter + 38 vegetasi + 50 dekorasi + beberapa lampu, sekitar **120–130 draw call**.

Verifikasi:
- Draw call ≤ 150, dan tidak turun FPS saat CPU diperlambat 6x.
- Screenshot dibandingkan dengan baseline (pixel diff). Area statis harus sama; yang boleh beda hanya karakter dan bohlam yang beranimasi.
- Klik kotak surat membuka buku tamu, dan klik/dekat resepsionis membuka dialog.
- Kamera tetap tertahan occluder (jalan mepet ke pelaminan dan arch).
- Tidak ada error/warning baru di console; `npm run check` lolos.

Commit: `perf(3d): batch static venue decor and instance hanging light bulbs`

#### 0.4 Uji di lokalmu (gate sebelum lanjut Fase 1)
Checklist yang kamu jalankan sendiri:
1. `npm run dev:server` dan `npm run dev`, lalu buka `kia-toni.localhost:5173`.
2. Bandingkan dengan `kia-toni.marryme.web.id` (live) berdampingan: warna, posisi, dan bunga harus sama.
3. Jalan ke resepsionis, kotak surat, dan pelaminan. Modal, confetti, dan tombol tutup harus berfungsi.
4. Lari dengan Shift di area pepohonan (|X| ≥ 6). Di karpet tetap jalan.
5. DevTools → FPS meter, di Mac-mu dengan Energy Saver **aktif** dan **nonaktif**.
6. Mode mobile (DevTools device toolbar, atau buka dari HP di jaringan yang sama).
7. Jalankan `npm run perf:measure` dan bandingkan dengan baseline.

Lanjut ke Fase 1 hanya setelah kamu menyatakan OK.

#### Opsional setelah Fase 0
- Merge `new_staging_refactor` (hanya Fase 0) ke `new_staging` dan deploy lebih dulu, sebelum ada fitur venue. Semua tamu langsung mendapat versi yang lebih ringan, dan risiko rilis venue nanti lebih kecil. Ini perlu persetujuanmu.

### Fase 1: Data venue end-to-end
1. `database/migrations/015_wedding_venue.sql`: tambah kolom `venue` secara idempotent (pola cek `INFORMATION_SCHEMA` seperti 012) dan daftarkan di `server/scripts/migrate.js`.
2. `server/routes/config.js`: SELECT `venue`, default `'garden'`.
3. `server/routes/tenant-config.js`: enum zod `['garden','beach']` + masukkan ke daftar field yang diizinkan.
4. `server/routes/invitations.js`: terima `venue` opsional saat create (default `garden`).
5. `src/lib/api-client.ts`: tipe `venue?: VenueId` + default.
6. `Scene.svelte`/`Environment.svelte` membaca `$weddingConfig.venue` → `resolveVenue()`.
7. Tes server (`npm test`) untuk validasi enum dan default.

### Fase 2: Venue Pantai
1. `scripts/build-beach-pack.cjs` → `static/nature/gltf/beach-pack.glb` (lihat 4.1); pindahkan `scene.gltf`/`scene.bin` ke `assets/models/source/beach-assets/`.
2. `CREDITS.md` + data kredit + tautan "Kredit aset 3D" di undangan (lihat 4.2). Wajib selesai sebelum rilis.
3. `BeachSurroundings.svelte`: tanah pasir, laut (shader), kelapa dan dekorasi dari `beach-pack.glb`, serta detail prosedural.
4. Tema beach di registry.
3. Iterasi visual berdasarkan screenshot dari kamu (target 2–4 putaran).
4. Cek performa mobile (mode lowPower) dan bandingkan FPS dengan garden.

### Fase 3: Pemilih venue di dashboard
1. `DashboardShell.svelte` pengaturan: kartu pilihan venue (thumbnail + nama), hanya tampil saat preset 3D.
2. `OnboardingWizard.svelte`: pilihan venue setelah memilih preset 3D (opsional, bisa diubah nanti).
3. Thumbnail `static/media/venues/{garden,beach}.webp` (diambil dari screenshot scene).
4. (Opsional) Katalog di landing page menampilkan venue pantai.

### Fase 4: Rilis
1. Merge `new_staging_refactor` → `new_staging` (branch live di VPS) setelah disetujui.
2. Deploy sesuai `deploy-docker-vps.md`. Migrasi 015 non-destruktif dan semua tenant lama otomatis `garden`.
3. Smoke test: satu subdomain garden lama (tidak berubah), satu subdomain test diset `beach`.

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Refactor merusak tampilan garden yang live | Fase 0 wajib zero-diff visual, dengan commit terpisah sehingga mudah di-revert |
| Batch salah menggabungkan material yang mirip tapi beda (opacity, side, transparan) | Tanda tangan material mencakup semua properti itu; diff screenshot per langkah |
| Mesh gabungan tidak ikut frustum culling | Scene kecil dan hampir selalu terlihat utuh; ukur FPS sebelum/sesudah |
| Objek interaktif ikut ter-batch dan tidak bisa diklik | Kotak surat dan semua mesh ber-event dikecualikan; cek manual di 0.4 |
| Venue baru mengulang pola material inline | Cache `toonMat()` + bungkus dekorasi statis dengan `StaticBatch` jadi aturan di AGENTS.md |
| Trigger/collider tidak sejajar | `VenueCore` tidak boleh menggeser posisi; `triggers.ts` tetap satu untuk semua venue |
| Bundle membesar untuk semua tamu | Surroundings di-lazy-import per venue; aset beach hanya diminta di venue beach |
| Aset CC-BY dipakai tanpa kredit (pelanggaran lisensi) | `CREDITS.md` + tautan kredit di undangan jadi syarat rilis Fase 2 |
| `beach-pack.glb` terlalu besar untuk mobile | Hanya node terpakai, dedup/prune/kuantisasi; target ≤ 250 KB; hanya dimuat venue beach |
| Migrasi diedit setelah dijalankan → runner throw (checksum) | Jangan pernah mengedit 015 setelah ter-apply; perbaikan lewat 016 |
| Cache HTML Cloudflare (2 jam) | Hanya mempengaruhi shell; aset `_app/immutable` ber-hash dan `/api/config` no-store |

## 7. Pertanyaan Terbuka

1. ~~**Branch deploy:**~~ Terjawab: VPS live memakai `new_staging` (dicek 2026-10-08). Rilis = merge `new_staging_refactor` → `new_staging`.
2. **Siapa yang memilih venue:** pengantin di dashboard (rekomendasi) atau hanya admin?
3. **Monetisasi:** apakah venue tertentu berbayar/premium? Kalau ya, perlu flag di registry + pengecekan di API.
4. **Palet inti di beach:** pelaminan dan bunga tetap pink-krem, atau disesuaikan (coral/putih)?
