# Rencana Pilihan Venue 3D (Garden → + Pantai Sunset)

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
| Pohon | Nature pack | **Pohon kelapa** | Prosedural: batang lengkung (silinder bertumpuk) + daun (plane/cone pipih), dengan InstancedMesh |
| Semak/rumput | Banyak instance | Sedikit rumput pantai + batu | Pakai `Rock_*` / `Grass_*` yang sudah ada |
| Detail | Hewan | Kerang, bintang laut, obor tiki, kano kecil di pasir (opsional) | Prosedural sederhana |
| Tiang lampu | Klasik krem/emas | Varian bambu (opsional, fase 2) | `poleStyle` di theme, posisi tetap |
| Bunga/karpet/pelaminan | Pink-krem | Sama (fase 1); palet coral opsional (fase 2) | Theme `core` |

**Aset kelapa: prosedural dulu.** Gayanya otomatis konsisten dengan toon material, tidak ada file tambahan untuk diunduh, dan tidak ada urusan lisensi. Kalau hasilnya kurang bagus setelah dua kali iterasi screenshot, fallback ke paket CC0 (mis. Quaternius) yang digabung ke `static/nature/gltf/beach-pack.glb` lewat skrip seperti `build-nature-pack.cjs`.

**Anggaran performa:** draw call dan jumlah instance beach ≤ garden. Semua objek berulang memakai instancing, laut cukup satu plane dengan shader murah, dan mode `lowPower` mengurangi kepadatan dengan pola `sparseTrees`.

## 5. Tahapan Kerja

### Fase 0: Refactor tanpa perubahan visual
1. Buat `src/lib/venues/index.ts` + tema `garden` (salin nilai hardcode sekarang).
2. Parameterisasi `Sky`, `Lighting`, dan background/fog di `Scene` dengan `theme`.
3. Pecah `Environment.svelte` → `VenueCore` + `GardenSurroundings` (pindah kode, jangan ubah angka).
4. Verifikasi: screenshot sebelum/sesudah di `kia-toni.localhost:5173` dari 3 titik (spawn, dekat resepsionis, depan pelaminan) di desktop + mobile, harus identik. Jalankan `npm run check`.
5. Commit tersendiri: `refactor(3d): split environment into venue core and garden surroundings`.

### Fase 1: Data venue end-to-end
1. `database/migrations/015_wedding_venue.sql`: tambah kolom `venue` secara idempotent (pola cek `INFORMATION_SCHEMA` seperti 012) dan daftarkan di `server/scripts/migrate.js`.
2. `server/routes/config.js`: SELECT `venue`, default `'garden'`.
3. `server/routes/tenant-config.js`: enum zod `['garden','beach']` + masukkan ke daftar field yang diizinkan.
4. `server/routes/invitations.js`: terima `venue` opsional saat create (default `garden`).
5. `src/lib/api-client.ts`: tipe `venue?: VenueId` + default.
6. `Scene.svelte`/`Environment.svelte` membaca `$weddingConfig.venue` → `resolveVenue()`.
7. Tes server (`npm test`) untuk validasi enum dan default.

### Fase 2: Venue Pantai
1. `BeachSurroundings.svelte`: tanah pasir, laut, kelapa, batu, dan detail.
2. Tema beach di registry.
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
| Trigger/collider tidak sejajar | `VenueCore` tidak boleh menggeser posisi; `triggers.ts` tetap satu untuk semua venue |
| Bundle membesar untuk semua tamu | Surroundings di-lazy-import per venue; aset beach hanya diminta di venue beach |
| Kelapa prosedural terlihat "murahan" | Batas 2 iterasi, lalu fallback paket CC0 |
| Migrasi diedit setelah dijalankan → runner throw (checksum) | Jangan pernah mengedit 015 setelah ter-apply; perbaikan lewat 016 |
| Cache HTML Cloudflare (2 jam) | Hanya mempengaruhi shell; aset `_app/immutable` ber-hash dan `/api/config` no-store |

## 7. Pertanyaan Terbuka

1. ~~**Branch deploy:**~~ Terjawab: VPS live memakai `new_staging` (dicek 2026-10-08). Rilis = merge `new_staging_refactor` → `new_staging`.
2. **Siapa yang memilih venue:** pengantin di dashboard (rekomendasi) atau hanya admin?
3. **Monetisasi:** apakah venue tertentu berbayar/premium? Kalau ya, perlu flag di registry + pengecekan di API.
4. **Palet inti di beach:** pelaminan dan bunga tetap pink-krem, atau disesuaikan (coral/putih)?
