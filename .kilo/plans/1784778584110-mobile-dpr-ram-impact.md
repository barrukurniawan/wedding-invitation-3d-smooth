# Mobile Tier B — dpr 1.5 (sharp mid)

## Keputusan

- User pilih **Tier B**: naikkan resolusi mobile saja.
- **Loading / “semua tampil muncul cepat”:** **ya, ≈ sama seperti sekarang.**
- **Visual mobile:** **lebih bagus dari baseline** (lebih tajam), **bukan** setara desktop.
- Shadows, SoftShadows, densitas nature, animals: **tetap off / sparse** di `lowPower` (tidak ikut Tier B).

## Ekspektasi visual (Tier B vs sekarang vs desktop)

| Aspek | Sekarang (dpr 1) | Tier B (dpr 1.5) | Desktop (dpr ≤2 + shadow + denser) |
|---|---|---|---|
| Ketajaman 3D (karakter, stage, ground) | Soft/pixelated di retina | **Jelas lebih tajam** (~2.25× pixel) | Paling tajam |
| Edge anti-alias look | Kasar di layar 2–3× | **Lebih halus** | Masih di atas B |
| Shadow / SoftShadows | Off | **Tetap off** | On |
| Densitas pohon / animals | Sparse / no animals | **Sama** | Lebih padat + animals |
| Fog / lighting path | Mobile fog | **Sama** | Desktop fog |

**Ya — tampilan mobile web lebih bagus dari sekarang**, terutama “blurry canvas” di iPhone/Android retina. Yang **tidak** berubah: soft shadow, world density, animals. Jangan expect “mirip desktop penuh”.

## Jawaban ke pertanyaan user

| Yang ditanya | Tier B |
|---|---|
| Loading screen dismiss | **≈ sama** — gate tidak baca `dpr` |
| 5 character GLB (player + 4 NPC) ready | **Sama** unduh/parse |
| Env procedural critical | **Sama** (2× rAF) |
| Nature / animals setelah enter | **Sama seperti sekarang** (deferred `showDecor`; animals tetap skip di lowPower) |
| Visual lebih bagus? | **Ya (ketajaman)**; shadow/nature/animals **tidak** ikut |
| Yang berubah di runtime | Canvas **lebih tajam** (`dpr` 1 → **1.5**); fill GPU **~2.25×** → risiko FPS/thermal di HP lama, **bukan** loading lebih lama |

**Bukan bottleneck loading:** `dpr` hanya ukuran framebuffer WebGL. Ready path di `Scene.svelte` = `playerReady` + `npcsReady` (4) + `envCriticalReady` → `onReady` → `setLoaded(true)`. Tidak ada dependensi ke `dpr`.

**Bottleneck nyata Tier B:** frame time setelah overlay hilang (fill-rate/fog/toon), terutama mid/low Android & iOS thermal — validasi di device nyata, bukan DevTools saja.

## Baseline → target

| File | Sekarang (`lowPower`) | Tier B |
|---|---|---|
| `World.svelte` | `dpr={1}`, `shadows={false}` | `dpr={1.25}` **→ user chose 1.5:** `dpr={1.5}`, `shadows={false}` tetap |
| `Scene` / `Environment` / animals | fog ketat, sparse trees, no SoftShadows, no animals | **tidak diubah** |

Satu baris implementasi:

```svelte
<!-- World.svelte -->
<Canvas shadows={!lowPower} dpr={lowPower ? 1.5 : [1, 2]}>
```

Opsional (hanya jika nanti perlu cap native rendah):  
`dpr={lowPower ? Math.min(1.5, devicePixelRatio) : [1, 2]}` — **bukan** bagian minimal; default plan = literal `1.5`.

## Out of scope

- SoftShadows / `Canvas shadows` di mobile
- Naik densitas nature / enable animals di lowPower
- Tier D desktop parity
- Gate lewat `deviceMemory` / UA
- Deploy

## Validasi (setelah implement)

1. Cold open mobile: waktu sampai loading dismiss vs baseline — toleransi mundur **≤ ~100–200 ms** (biasanya ≈ 0).
2. Walk 20–30s: FPS/thermal mid + low phone; Safari iOS tidak crash.
3. Screenshot sharpness stage/label vs dpr 1.
4. `npm run check` (+ build jika agent biasanya validate).

## Tasks (implement agent)

1. Edit `src/lib/components/threed/World.svelte`: `dpr={lowPower ? 1.5 : [1, 2]}` — shadows prop **jangan** diubah.
2. Jangan sentuh `Scene` SoftShadows, `Environment` density/animals, `App` preload list.
3. `npm run check` (dan build jika diminta).
4. Manual device check per validasi di atas; jika FPS drop parah di HP target undangan → rollback ke **1.25** (Tier A) tanpa ubah shadow/nature.

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| FPS drop / panas di HP lama | Rollback `1.5` → `1.25`; jangan tambah shadow |
| Salah sangka “loading lambat” | Bandingkan network tab: critical GLB count/size harus identik |
| Scope creep | Satu file, satu prop |

## Referensi

- Prior analysis: sections RAM/FB & loading di histori plan ini (Tier A–D table).
- Related: `.kilo/plans/1784777318163-desktop-vs-mobile-quality.md` — jangan reintroduce UA-only quality raise.
