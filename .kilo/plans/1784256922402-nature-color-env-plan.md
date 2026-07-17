# Plan: Pewarnaan Aset Nature via `.env` (Tint per-kategori)

## Konteks & Keputusan
- **Tujuan**: Atur warna pohon/bush/grass/animal lewat `.env` (hex/RGB) tanpa mengubah kode saat dikonfigurasi ulang.
- **Mekanisme apply**: `.env` + Vite (`import.meta.env.VITE_*`), **build-time**. Project static (`prerender=true`, `ssr=false`) → ganti warna butuh **restart dev / rebuild**. Bukan live-edit.
- **Cara pewarnaan**: **Tint (multiply)** — `material.color = warnaEnv`. Hasil = `tekstur atlas × warnaEnv`. Detail tekstur (batang vs daun dari atlas) tetap; batang ikut terskala. Default `#ffffff` = identity (tidak ada perubahan visual).
- **Granularitas**: 4 var per-kategori: `VITE_COLOR_TREE`, `VITE_COLOR_BUSH`, `VITE_COLOR_GRASS`, `VITE_COLOR_ANIMAL`. Batu tidak termasuk (sudah diganti pohon).

## Temuan Kritis (mendasari desain)
1. Aset Kenney (`tree.glb`, `Bush_*`, `Grass_*`, `animal-*`, `Tree_*_Color1`) pakai **SATU material PBR** + atlas tekstur (`baseColorTexture`), nama material `"colormap"`/`"forest"`. **Tidak ada** material `"Leaves"` terpisah.
2. Akibatnya: `leafColor` yang ada di `Nature.svelte` (hanya target material `name.includes('Leaves')`) adalah **no-op** di semua aset Kenney. Ada 10 pemakaian `leafColor=` di `Environment.svelte` yang sudah mati.
3. `tree.glb` & `tree-high.glb` sudah di-bake pink (recolor tekstur manual sebelumnya) → tint akan **menumpuk** dengan pink tsb. (Lihat "Keterbatasan".)

## Pendekatan: Auto-derive kategori dari URL (diff kecil, risiko rendah)
Nature.svelte menderivasi kategori dari nama file URL (case-insensitive: `tree`/`Tree`, `bush`/`Bush`, `grass`/`Grass`, `animal`) dan ambil warna dari theme module. **Environment.svelte TIDAK perlu diubah** untuk fitur inti (cukup Nature.svelte + theme module + .env.example). Mapping konsisten: `tree`/`tree-high`/`Tree_*` → tree; `Bush_*` → bush; `Grass_*` → grass; `animal-*` → animal.

## File Changes

### 1. NEW `src/lib/constants/natureTheme.ts`
- Baca `import.meta.env.VITE_COLOR_{TREE,BUSH,GRASS,ANIMAL}`.
- Validasi hex (`/^#?[0-9a-fA-F]{6}$/`), fallback `#ffffff` bila kosong/invalid. Normalize jadi `#rrggbb`.
- Export:
  - `NATURE_COLORS: { tree: string; bush: string; grass: string; animal: string }`
  - `getNatureTint(url: string): string` — derivasi kategori dari URL, return warna; default `#ffffff`.

### 2. EDIT `src/lib/components/threed/Nature.svelte`
- Tambah prop opsional `tint?: string`. Jika tidak diberikan → `getNatureTint(url)`.
- Tambah fungsi `applyTint(ref, color)` mirip `applyLeafColor` tapi set `material.color = new THREE.Color(color)` pada **semua** material (traverse semua mesh), tanpa filter nama. Hanya apply jika color bukan `#ffffff` (opsional optimasi; white = identity).
- Panggil `applyTint(clone, tint)` per-clone (ikuti pola `applyLeafColor` saat ini; menghindari mutasi scene cached bersama).
- Pertahankan prop `leafColor` (no-op di Kenney, tak merusak) — jangan dihapus di sini.

### 3. EDIT `.env.example`
- Tambah 4 var + komentar default `#ffffff` (= pakai tekstur asli). Contoh:
  ```
  VITE_COLOR_TREE=#ffffff
  VITE_COLOR_BUSH=#ffffff
  VITE_COLOR_GRASS=#ffffff
  VITE_COLOR_ANIMAL=#ffffff
  ```

### 4. EDIT `src/app.d.ts` (type safety, opsional tapi direkomendasi)
- Extend `interface ImportMetaEnv` dengan 4 var `VITE_COLOR_*: string` + `readonly [key: string]: any`. Tambah `/// <reference types="vite/client" />` bila belum ada.

### 5. (Cleanup opsional) EDIT `src/lib/components/threed/Environment.svelte`
- Hapus 10 prop `leafColor="..."` yang sudah no-op. Bukan syarat fitur; hanya merapikan. Rendah risiko.

## Data Flow
`.env` (VITE_*) → baked saat `vite dev/build` → `import.meta.env` → `natureTheme.ts` (`NATURE_COLORS`/`getNatureTint`) → `Nature.svelte` (`tint` prop / auto-derive) → `material.color` (multiply dengan `baseColorTexture`) → render.

## Edge Cases & Validasi
- Var kosong/invalid → fallback `#ffffff` (tidak crash, tidak ubah visual).
- Default (`#ffffff`) = identity multiply → **zero visual change** (backward compatible).
- Model multi-material (mis. animal beberapa mesh) → traverse semua material.
- `useGltf` cache scene bersama antar komponen `Nature` → apply tint **per-clone** (bukan di source) agar tidak bocor ke komponen lain.
- Kategori tidak dikenali di URL → `#ffffff`.

## Validation Plan
1. `npm run check` → 0 error/warning.
2. `npm run dev` → buka localhost:5173, verifikasi default = tampilan saat ini (tidak berubah).
3. Set `VITE_COLOR_TREE=#ff6b9d` di `.env` → **restart** `npm run dev` → verifikasi pohon tint pinkish, bush/grass/animal tidak berubah.
4. Uji tiap kategori independen: set `VITE_COLOR_GRASS=#7CFC00`, restart, verifikasi hanya grass berubah.
5. Uji invalid: `VITE_COLOR_BUSH=bukanwarna` → fallback putih, tidak crash.

## Keterbatasan (out of scope, didokumentasi)
- **Tint menumpuk dengan warna atlas**: `tree.glb`/`tree-high.glb` sudah baked pink → tint pink × pink = lebih jenuh; aset lain (atlas hijau/ungu) × pink = berbeda. Tidak akan seragam antar aset dalam kategori yang sama. Solusi penuh = re-bake atlas ke grayscale netral (di luar scope plan ini).
- Tint mewarnai seluruh model (batang + daun) karena material tunggal. Tidak bisa "daun saja" tanpa recolor pixel-level.
- `.env` = build-time; butuh restart/rebuild. Override runtime via admin dashboard tidak termasuk.
- Aset nature tetap PBR (`MeshStandardMaterial`), sedikit tak konsisten dengan toon scene; konsistensi penuh butuh ganti material ke `MeshToonMaterial` (di luar scope; pilihan "Flat toon" yang ditolak).

## Open / Out of Scope
- Normalisasi atlas tekstur ke grayscale untuk tint seragam.
- Runtime override via `weddingConfig`/admin dashboard.
- Granularitas per-aset.
- Migrasi material nature ke `MeshToonMaterial`.
