# Plan: Tint per-Jenis Pohon (1 warna per tipe)

## Konteks & temuan analisis
- Inspeksi semua GLB di `static/nature/gltf/`: aset `Tree_*`, `Bush_*`, `Grass_*`, `Rock_*` memakai **SATU material `"forest"`** + **satu atlas tekstur**. `tree-high.glb`/`tree.glb`/`animal-*` memakai satu material `"colormap"`. Tidak ada vertex color (`COLOR_0`), satu primitive per mesh.
- Akibatnya: daun & batang menyatu di tekstur atlas. `material.color` mengalikan **seluruh atlas seragam** → daun DAN batang ikut satu warna. **Pemisahan warna daun vs batang TIDAK mungkin** via material/vertex (kecuali re-export aset).
- Keputusan user: jalur **tint per-jenis (1 warna per tipe pohon)** — andah & code-only.
- Tint saat ini kasar per-kategori (4 kategori dari `VITE_COLOR_*` di `.env`) via `getNatureTint(url)` di `natureTheme.ts`, dipakai hanya di `Nature.svelte:73`.

## Aset nature yang DIPAKAI (key config = basename lowercase)
Pohon: `tree-high.glb`, `tree.glb`, `Tree_1_A_Color1.glb`, `Tree_2_A_Color1.glb`, `Tree_2_D_Color1.glb`, `Tree_3_A_Color1.glb`, `Tree_4_A_Color1.glb`
Semak: `Bush_1_A_Color1.glb`, `Bush_2_A_Color1.glb`, `Bush_3_A_Color1.glb`, `Bush_4_A_Color1.glb`, `Bush_4_D_Color1.glb`, `Bush_4_E_Color1.glb`, `Bush_4_F_Color1.glb`
Rumput/bunga: `Grass_1_A_Color1.glb`, `Grass_1_B_Color1.glb`, `Grass_1_C_Color1.glb`, `Grass_2_A_Color1.glb`, `Grass_2_B_Color1.glb`, `Grass_2_C_Color1.glb`
Hewan: `animal-bunny.glb`, `animal-cat.glb`, `animal-panda.glb`
Lampu: `Street_Light.glb` (sudah ditangani `materialColors` — putih via material `Grey`)

## Task list

### 1. Buat `src/lib/constants/natureColors.ts`
- Export `NATURE_TINTS: Record<string, string>` key = **basename lowercase** → hex.
- Kelompokkan dengan komentar per keluarga (Pohon / Semak / Rumput / Hewan).
- Seed default = replika tampilan sekarang (dari `.env`): pohon `#27cd46`, semak `#23ca7f`, rumput `#39f239`, hewan `#ffff2c`, Street_Light `#ffffff`. Tidak ada regresi visual.
- Sertakan juga varian pohon yang tersedia tapi belum dipakai (Tree_1_B/C, Tree_2_B/C/E, Tree_3_B/C, Tree_4_B/C, Tree_Bare_*) di grup Pohon agar siap dipakai nanti.
- Export `getNatureTintForUrl(url): string`:
  - `seg = basename(url).toLowerCase()`
  - if `NATURE_TINTS[seg]` ada → return `normalizeHex(it)` (reuse `normalizeHex` dari `natureTheme.ts` — perlu di-`export`).
  - else fallback `getNatureTint(url)` (kategori env) → `#ffffff` default.

### 2. `src/lib/constants/natureTheme.ts`
- Export `normalizeHex` (saat ini internal) supaya `natureColors.ts` bisa pakai. Tidak ubah logika lain.

### 3. `src/lib/components/threed/Nature.svelte`
- Import `getNatureTintForUrl` (ganti/temani `getNatureTint`).
- Baris 73: `const resolvedTint = tint ?? getNatureTintForUrl(url)`.
- Prioritas tint final: prop `tint` (per-instance) > `NATURE_TINTS[basename]` (per-jenis) > kategori env > `#ffffff`.
- `applyTint` & `materialColors` prop tetap (Street_Light pakai `materialColors`). `leafColor` dibiarkan (dead untuk aset atlas, tapi harmless; cleanup opsional, di-luar scope).

### 4. (Tidak ada perubahan) `Environment.svelte`
- Tidak ada pemanggilan `<Nature tint=...>` saat ini → semua otomatis pakai lookup baru. Tidak perlu sentuh.

## Cara pakai (untuk user)
- Edit `src/lib/constants/natureColors.ts`, ubah hex per key. Mis. `Tree_1_A_Color1.glb: '#ff6b9d'`. Reload dev untuk lihat efek.
- `#ffffff` = pakai warna atlas asli (identity, tanpa tint).

## Validasi
- `npm run check` (svelte-check) → 0 error.
- Review: buka scene, pastikan tampilan default TIDAK berubah (karena seed = nilai env lama). Lalu ubah satu key di config → verifikasi hanya jenis itu yang berubah warna.

## Risiko / batasan
- Tint berlaku seragam ke daun + batang (batasan aset, sudah disepakati user).
- `NATURE_TINTS` case-insensitive (key lowercase); URL `Street_Light.glb` tidak di-tint (putih via `materialColors`, set `#ffffff` di map agar `applyTint` skip).
- Nilai hex dianggap valid literal; `normalizeHex` jaga format. Default tetap aman via fallback.

## Out of scope
- Pemisahan daun/batang (perlu re-export aset 3D).
- Migrasi penuh dari `.env` kategori (env tetap sebagai fallback).
