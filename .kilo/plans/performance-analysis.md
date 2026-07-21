# Performance Analysis: Wedding Invitation 3D

## Masalah yang Dilaporkan
- **Laptop**: lag, RAM sampai 900 MB
- **Mobile**: render pertama lambat, NPC muncul lama
- Umum: initial load berat

---

## Root Cause Analysis (Verified dari Source Code)

### 1. JS Bundle 941 KB — Single Monolithic Chunk (KRITIS)

`nodes/3.D0ZnWaqD.js` = **941 KB** (minified, ~250 KB gzip). Ini komponen halaman utama yang berisi:
- Semua array posisi vegetasi (treeLayerB, redLeafTrees, pineLayer, dll.)
- Semua procedural geometry (arch, desk, mailbox, stage, backdrop, bouquets)
- Semua material definitions (30+ MeshToonMaterial instances)
- `Environment.svelte` = **1126 baris** kode — satu komponen raksasa

**Impact**: Browser harus parse & execute 941 KB JS sebelum render apa pun. Di mobile = 2–5 detik blocking.

### 2. 49 `<Nature>` Components → ~200 Deep Clones → ~200 Draw Calls (KRITIS)

```
Environment.svelte: 49× <Nature> component
├── useGltf(url) — cached by @threlte/core (promise cache, key=[GLTFLoader, url])
│   → HTTP request hanya sekali per URL (20 unique URLs)
│   → TAPI: gltf parsing + scene setup tetap per component
└── scene.clone(true) — DEEP CLONE per instance
    → ~200 total instances (avg 4 per component)
    → 200× mesh + material objects di scene
    → 200+ draw calls per frame
```

**Key finding**: `useGltf` **sudah punya cache** (via `@threlte/core` `useCache` — promise cache per Canvas context). Jadi HTTP fetch hanya 20× (satu per URL unik), bukan 49×. TAPI:

- `scene.clone(true)` tetap deep clone geometry + material untuk setiap instance
- Setiap clone = mesh terpisah di scene graph = 1 draw call
- 200 draw calls di mobile GPU = frame drop signifikan

**Solusi**: `THREE.InstancedMesh` — satu draw call per mesh per material per glb. Dari ~200 draw calls → ~20.

### 3. 5 Character Models × 2MB = 10MB Download (KRITIS)

| Model | Size | Format |
|-------|------|--------|
| `tamu.gltf` (player) | 1.99 MB | JSON + base64 buffer (926 KB binary) |
| `resepsionis.gltf` | 2.10 MB | JSON + base64 |
| `pemandu.gltf` | 1.99 MB | JSON + base64 |
| `pengantin-wanita.gltf` | 2.21 MB | JSON + base64 |
| `pengantin-pria.gltf` | 1.99 MB | JSON + base64 |
| **Total** | **10.3 MB** | |

Semua `.gltf` (JSON text + base64 encoded binary). Base64 menambah ~33% overhead. Konversi ke `.glb` (binary) → est. **6–7 MB** total.

**NPC loading lambat**: Semua 5 model di-download bersamaan saat mount. Player + 4 NPC = 10 MB sebelum karakter pertama terlihat.

### 4. SoftShadows samples=12 — Berat di Mobile (SEDANG)

```svelte
<SoftShadows size={28} samples={12} focus={0.6} />
```

12 samples per shadow map pixel. Di mobile GPU (low core count), ini sangat berat. Per frame: 12 × shadow resolution × 1 directional light.

### 5. Procedural Geometry di Environment (SEDANG)

Environment.svelte membuat geometry secara procedural di script block:
- Arch posts, crossbar, brackets
- Stage: sub-base, floor, stairs, carpet, backdrop, drapery, valance, rings, heart
- Desk: panel, tabletop, trim, garland, vase, bouquet
- Mailbox, light poles (10 poles × 5 parts each)
- ~30+ `THREE.MeshToonMaterial` instances

Semua ini di-bundle ke JS dan di-compile ke single chunk 941 KB.

### 6. Per-Frame Foot Bone Computation (RENDAH)

`Character.svelte` dan `Player.svelte` punya `useTask` yang:
```js
group.updateMatrixWorld(true)  // force full matrix update
group.traverse((obj) => { /* bone check */ })
```
5 karakter × 1 task. Setelah offset computed → no-op, tapi task tetap registered.

---

## Ringkasan Total Resource

| Resource | Count | Impact |
|----------|-------|--------|
| JS bundle (main page) | 941 KB | Parse/execute blocking |
| GLB/GLTF downloads | 10.3 MB (karakter) + 6.8 MB (nature) | Network + parse |
| Scene meshes | ~200 (nature) + ~10 (venue) + ~5 (karakter) | Draw calls |
| Draw calls per frame | ~215+ | GPU bound di mobile |
| Materials | ~30 procedural + ~200 cloned | Memory |
| Shadow maps | 1 (directional) × 12 samples | GPU compute |
| useTask per frame | ~10 (5 karakter + camera + scene + confetti + labels + interaction) | CPU |

---

## Prioritas Perbaikan

### P0 — Quick Wins (Impact tinggi, effort rendah)

**T1: Defer NPC Loading** — `Npcs.svelte`
Mount NPC setelah player loaded + delay 500ms. Ini memotong 8 MB dari initial load.
```svelte
// App.svelte atau Scene.svelte
let showNpcs = $state(false)
$effect(() => { setTimeout(() => showNpcs = true, 500) })
{#if showNpcs} <Npcs /> {/if}
```

**T2: Reduce SoftShadows untuk Mobile** — `Scene.svelte`
```ts
const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)
```
```svelte
<SoftShadows size={isMobile ? 16 : 28} samples={isMobile ? 4 : 12} focus={0.6} />
```

**T3: Convert Character .gltf → .glb** — `static/models/`
Gunakan `gltf-transform` atau Blender:
```bash
npx @gltf-transform/cli optimize tamu.gltf tamu.glb --compress draco
```
Estimasi: 10.3 MB → 5–7 MB. Update path di `Player.svelte` dan `Npcs.svelte`.

### P1 — Medium Effort (Impact tinggi)

**T4: Merge Nature Components per URL** — `Environment.svelte`
Daripada 49 `<Nature>` komponen, group by URL:
```svelte
<!-- BEFORE: 7 components untuk Bush_4_D_Color1.glb -->
<Nature url="Bush_4_D_Color1.glb" instances={sparseTrees(pineLayer)} />
<Nature url="Bush_4_D_Color1.glb" instances={sparseTrees(redPineLeft)} />
...

<!-- AFTER: 1 component, instances digabung -->
<Nature url="Bush_4_D_Color1.glb" instances={[...sparseTrees(pineLayer), ...sparseTrees(redPineLeft), ...]} />
```
Dari 49 → ~20 komponen. Mengurangi overhead clone setup.

**T5: Disable Shadows untuk Nature Objects**
Nature objects (trees, bushes, grass) tidak perlu `castShadow`/`receiveShadow`. Hapus dari `Nature.svelte`:
```svelte
<!-- BEFORE -->
<T is={clones[i]} castShadow receiveShadow />

<!-- AFTER: nature tidak cast shadow -->
<T is={clones[i]} receiveShadow />
```
Mengurangi shadow map computations signifikan.

### P2 — High Effort (Impact sangat tinggi)

**T6: InstancedMesh untuk Nature** — Refactor `Nature.svelte`
Ganti `scene.clone(true)` dengan `THREE.InstancedMesh`:
- Extract mesh dari loaded gltf scene
- Buat 1 `InstancedMesh` per mesh-material combo
- Set instance matrix per instance
- **200 draw calls → ~20 draw calls**

Complexity: tinggi — perlu refactor cara gltf scene di-traverse, extract geometry, buat InstancedMesh.

**T7: Code-Split Environment** — Dynamic import
```svelte
// Scene.svelte
const EnvironmentVegetation = lazy(() => import('./EnvironmentVegetation.svelte'))
```
Pisahkan venue core (kecil) dari vegetation (besar) ke chunk terpisah. User bisa lihat venue dasar sambil vegetation load di background.

### P3 — Nice to Have

**T8: Draco Compression untuk Nature GLB**
Nature GLB files (50–140 KB each) bisa di-compress dengan Draco: est. 30–50% lebih kecil.

**T9: Single AnimationMixer**
Alih-alih 5 mixer per karakter, buat 1 global mixer di Scene.

---

## Validation

| Metric | Before (est.) | Target |
|--------|---------------|--------|
| Initial JS parse | ~3 detik (mobile) | < 1 detik |
| Total download | ~17 MB | < 10 MB |
| Time-to-first-NPC | ~5–8 detik | < 3 detik |
| Draw calls/frame | ~215 | < 50 |
| RAM (laptop) | ~900 MB | < 400 MB |
| FPS (mobile) | ~15–20 | 30+ |

## Open Questions

1. **Target FPS mobile**: 30 fps cukup atau harus 60 fps?
2. **Apakah `.glb` conversion aman** untuk rig/animasi karakter? Perlu test di Blender.
3. **Apakah boleh reduce vegetasi** (kurangi jumlah instance) atau harus tetap sama?
4. **Prioritas**: mana yang duluan — T1–T3 (quick wins) atau T6 (InstancedMesh)?
