# Fix gray flowers → true white petals

## Symptom

Off-stage Nature flowers (aisle left/right, gate, stage flanks, desk/mailbox/guide) render **gray / ash**, not white. Stage procedural bouquets still look correct (untouched).

## Root cause (confirmed on disk GLBs)

`applyFlowerColor` does:

1. Desaturate `Flowers` baseColor map → **luminance** grayscale  
2. Set `mat.color = #ffffff`

In Three.js PBR: `final ≈ light × map × color`.  
`#ffffff` × mid-gray map = **mid-gray**, not white.

Measured opaque pixels on the shared Flowers atlas (`Flower_*` + `Bush_Common_Flowers`):

| Metric | Value | Effect |
|--------|-------|--------|
| mean RGB | ~(216, 140, 107) pink/salmon | Original looks colored |
| mean **luminance** | ~**159/255** (~0.62) | white × map ≈ **`#9e9e9e`** |
| mean max-channel | ~222/255 | Petals are bright in R, not in luma |
| max luma | ~218/255 | Almost no near-white texels |

So the pipeline is **working as coded** and **wrong for white**: desaturating a mid-tone multicolored flower atlas cannot produce white petals.

Global tint is not the culprit: `NATURE_TINTS` for these files is already `#ffffff` (identity no-op). Material names match (`Flowers`); leaves use separate mats and stay green.

### Per-asset check (below stage)

| Asset | Materials | Used for | Why gray |
|-------|-----------|----------|----------|
| `Flower_3_Group.glb` | `Leaves` + `Flowers` | aisle border low | Flowers map → luma ~0.62 × white |
| `Flower_4_Group.glb` | same | aisle mid, gate, stage flanks y=0 | same shared Flowers atlas |
| `Flower_3_Single.glb` | same | aisle singles, desk, mailbox | same |
| `Flower_4_Single.glb` | same | guide flowers | same |
| `Bush_Common_Flowers.glb` | `Leaves_NormalTree` + `Flowers` | aisle/stage/gate bushes | same Flowers atlas |

Non-flower Nature (`Fern_1`, `Clover_1`, `Plant_*`, trees, `Bush_1_A`) — no `flowerColor`; not this bug.

Procedural off-stage whites (pots, arch blooms, desk garland petals, aisle motifs) use `MeshToonMaterial` solid `#ffffff` / `#fff8f0` — **no atlas multiply**; should already look white. If those also look dull, that is lighting/toon only, not this bug.

Secondary factor: Nature stays on **MeshStandardMaterial** (GLTF); procedural petals use **MeshToonMaterial**. Even a fixed white map will be slightly softer than toon white under the same lights — acceptable; not the main gray.

## Fix (Nature.svelte only)

Change `applyFlowerColor` so white (and light) targets stay bright.

### Recommended algorithm

When `flowerColor` is set and material name matches `/flower/i`:

1. If `mat.map` exists, build a **white-shading** texture (reuse/extend cache key separately from tint luminance):
   - Keep **alpha** from the original map (cutouts).
   - For RGB, use **value** `v = max(R,G,B)` (not Rec.601 luminance) so bright pink petals stay bright.
   - **Normalize** opaque pixels so the high end hits white, e.g. stretch by `1 / p95(v)` (clamp to 1), or remap opaque `v` into roughly `[0.72, 1.0]` so shading remains but body is white.
   - Write grayscale RGB = that remapped value; set `colorSpace` / wrap / filters like `toLuminanceTexture`.
2. Set `mat.color` to `flowerColor` (`#ffffff`).
3. Do **not** touch leaf/bark materials.
4. Keep pipeline order: leafColor → materialColors → tint/tintGradient → **flowerColor last**.

### Explicitly avoid

- Pure `toLuminanceTexture` + white (current — causes gray).
- `mat.map = null` only (flat plastic white; loses petal soft shading / AO from atlas) unless used as last-resort fallback when canvas processing fails.
- Editing GLBs on disk.
- Changing stage `bouquetBlooms` / `backdropFlowerColors`.
- Relying on a brighter hex alone (e.g. still multiplies by dark map).

### Optional polish (only if still soft after normalize)

- Slight `mat.emissive = flowerColor` with low `emissiveIntensity` (~0.05–0.1) — try only after visual check; easy to overdo.
- Leave roughness as authored.

## Files

| Path | Change |
|------|--------|
| `src/lib/components/threed/Nature.svelte` | Fix `applyFlowerColor` map path (value + normalize); optionally rename helper for clarity |
| `src/lib/components/threed/Environment.svelte` | No change required if `flowerColor="#ffffff"` already on the five flowering mounts |
| GLBs / `natureColors.ts` | No change |

## Validation

1. `npm run check`
2. Visual aisle L/R: petals **white/cream**, leaves green, not ash gray.
3. Gate, desk, mailbox, guide, stage-flank ground flowers: same.
4. Stage platform bouquets + backdrop: still pink/cream mix.
5. Gold centers / pots / stems unchanged.
6. Compare one Nature white petal next to aisle pot procedural white — Nature may be slightly softer (Standard vs Toon); should not read as gray.

## Risks

| Risk | Mitigation |
|------|------------|
| Normalize blows out almost-black outline pixels | Only stretch using opaque-pixel stats; keep alpha; clamp |
| Shared luminance cache pollutes tint path | Separate WeakMap or cache key for “white flower shade” textures |
| Canvas CORS / image not ready | Keep null-map fallback only if `to…Texture` fails; GLB embeds usually OK after load |

## Tasks

1. [x] Replace flower recolor map step: max-channel + normalize-to-white (keep alpha), not plain luminance.
2. [x] Keep `mat.color = flowerColor` after map swap.
3. [x] Ensure cache does not reuse gray luminance textures from `applyTint`.
4. [x] `npm run check` + visual pass on aisle sides vs stage bouquets.
