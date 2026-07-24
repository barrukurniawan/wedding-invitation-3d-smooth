# Fix: lag parah + ground/langit “hilang” setelah nambah asset

## Diagnosis (bukan “karpet dihapus”)

Kode ground **masih ada** di `Environment.svelte` (plane rumput kiri/tengah/kanan, cream, red carpet). `Scene.svelte` masih set:

- `scene.background = '#bfe3f0'`
- `scene.fog = Fog('#fcd9a0', …)`

`Lighting.svelte` tidak diubah. Diff `natureTheme` / `natureColors` hanya **tint identity `#ffffff`** — tidak mengubah ground/langit.

Gejala “langit total beda, karpet/rumput 1 warna, lag parah” cocok dengan **GPU/VRAM thrashing + overdraw**, bukan penghapusan mesh ground:

| Penyebab | Bukti di disk |
|----------|----------------|
| **Poly bomb** | `white_flower.glb` ~**223k tris** × ~**78** instance ≈ **17.4M tris** hanya dari 1 asset |
| **Load berat** | `wedding_gate` 6.7MB / 86k tris; `gazebo` 2.4MB / 38k tris × 45 mesh → **45 InstancedMesh**; `1jasmine` 2MB |
| **Deferred dump** | Semua masuk `{#if showDecor}` sekaligus → spike memory + hitch |
| **Ground “flat”** | Saat VRAM/texture gagal atau frame drop ekstrem, gradient map/toon + fog terlihat “satu warna”; model besar juga bisa menutup view |

User intent: **tambah asset, keep beauty** — tapi densitas/poly saat ini **tidak WebGL-safe**.

`decorate_stage_flower.glb` (32MB, bounds raksasa) **belum** dipasang — **jangan** pasang.

---

## Goal

1. **Pulihkan performa** (FPS playable desktop; mobile tidak meledak).
2. **Jaga landmark** yang user mau: 1× wedding gate, 2× gazebo, bunga putih/jasmine/lavender **dengan densitas wajar**.
3. **Jangan sentuh** ground planes, sky/fog, lighting, motif cream muda, stage procedural.
4. Visual ground/langit kembali normal sebagai efek samping dari mengurangi load (bukan “recolor ground”).

---

## Scope of change

| Path | Action |
|------|--------|
| `src/lib/components/threed/Environment.svelte` | **Utama**: potong instance + scale; optional delay heavy props |
| `src/lib/constants/triggers.ts` | Sesuaikan collider gate/gazebo jika posisi/scale diubah |
| `Nature.svelte` / ground / Scene / Lighting | **No change** kecuali terbukti bug terpisah |
| GLB files | **No re-export** in this pass (optional later) |

---

## Implementation plan

### 1. Hard cap densitas asset baru (wajib)

Di `Environment.svelte`, ganti layout heavy assets:

| Asset | Sekarang (desktop) | Target |
|-------|-------------------|--------|
| `wedding_gate` | 1 @ scale 2.1, z=7.4 | **Tetap 1**; scale start **1.6–1.9** (lebar ~3.5–4m, gang tengah free) |
| `gazebo` | 2 @ 0.14 | **Tetap 2**; scale **0.11–0.13**; pastikan di luar jalur jalan |
| `white_flower` | ~78 | **≤ 16–24 total** (sparse outer lawn only; **bukan** full aisle every 1.55m) |
| `1jasmine` | 14 | **≤ 6–8** (pair L/R accents) |
| `lavender` | 20 | **≤ 10–12** |
| Modular pack (`Bush_Common_Flowers`, Flower_*, dll.) | biarkan | **Jangan naikkan** di pass ini |

Contoh strategy `whiteFlowerFill`:

- Hapus grid 4-per-z-step; ganti **few fixed clusters** di outer grass (`|x| ≥ 7`, z sparse: spawn, mid, near stage).
- Jangan taruh di cream path / red carpet / desk footprint.

### 2. Mobile (`lowPower`)

- Gate + 2 gazebo: tetap (landmark).
- `white_flower` / jasmine / lavender: **lebih agresif** — half of desktop cap, atau skip lavender di lowPower.
- Existing `sparseDecor` (1/3) tetap; pastikan new arrays sudah kecil **sebelum** sparse.

### 3. Performance hygiene (tanpa refactor besar)

- **Jangan** load `decorate_stage_flower.glb`.
- Keep `castShadow/receiveShadow = false` on Nature (sudah).
- Optional light touch: load gate+gazebo dulu, flowers 1 frame later — only if still hitch after density cut.
- **Out of scope this pass**: Draco/meshopt re-export, texture resize (follow-up if still heavy).

### 4. Colliders

Setelah scale/posisi final:

- Gate posts: center aisle **walkable** (buka |x| < ~1.0).
- Gazebo boxes match footprint (~4–5m).

### 5. Explicit non-goals

- Jangan ubah `scene.background` / fog “supaya kelihatan beda”.
- Jangan ubah `GROUND_COLOR` / plane colors sebagai “fix”.
- Jangan hapus motif cream muda (`aisleMotifs`).
- Jangan pasang `decorate_stage_flower`.

---

## Validation

1. `npm run check`
2. Desktop: spawn → walk to stage; FPS terasa normal; **red carpet + cream + green grass** terbaca jelas; sky blue-warm tetap.
3. Gate di depan spawn; 1 gazebo kiri + 1 kanan.
4. White flowers/jasmine/lavender ada tapi **tidak** menutup seluruh lawn.
5. Mobile/lowPower: tidak freeze saat `showDecor` true.
6. DevTools (optional): draw calls / GPU memory tidak lonjak gila vs sebelum asset dump.

---

## Risks

| Risk | Mitigation |
|------|------------|
| User bilang “kurang penuh” | Tambah instance **bertahap** (+4 white_flower), jangan loncat ke 78 |
| Gate terlalu kecil/besar | Adjust scale sekali setelah visual |
| Masih lag | Cut white_flower ke 8–12; consider replace fill dengan `Bush_Common_Flowers` (0.4MB, low poly) |

---

## Tasks

1. Slash `whiteFlowerFill` + `whiteFlowerAccents` → ≤24 desktop instances; outer grass only.
2. Cap jasmine ≤8, lavender ≤12; keep gate=1, gazebo=2; retune scales slightly down if needed.
3. Align colliders with final transforms.
4. `npm run check` + visual pass ground/sky/carpet + lag.
5. (If still lag) further cut white_flower or defer flower Nature mounts one tick after gate/gazebo.

## Root-cause one-liner for user

> Asset-nya bagus, tapi `white_flower` sendirian ~17M triangle + load multi-MB sekaligus — itu yang bikin lag dan bikin ground/langit “aneh”, bukan karena karpet dihapus dari kode.
