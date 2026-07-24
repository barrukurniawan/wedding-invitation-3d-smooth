# Off-stage flower color → white only

## Goal

Uniform **white flower petals** for all flowering plants **below / off the stage** (ground garden, aisle, gate, desk, mailbox, guide).

**Do not change:** leaves, stems, bark, pots, soil, or **any asset on the stage platform** (stage bouquets, backdrop flowers/leaves, stage furniture).

## Scope map (Environment.svelte)

| Zone | Assets | Action |
|------|--------|--------|
| **On stage — leave as-is** | `stageBouquets` + `bouquetBlooms` colors; `backdropFlowers` / `backdropLeaves`; stage chairs/platform | No edits |
| **Off-stage Nature GLBs** | `Flower_3_Group`, `Flower_4_Group`, `Flower_3_Single`, `Flower_4_Single`, `Bush_Common_Flowers` (aisle, gate, stage flanks at y=0, desk/mailbox/guide) | Flowers material → white only |
| **Off-stage procedural** | `aisleGroundPots` bloom colors; `archPostBlooms` / `archCrossBlooms`; `deskGarlandFlowers` petal colors; aisle path `motifPetalMat` / `motifPetalLightMat` | Petals → white (`#ffffff` / soft cream center optional) |
| **Non-flower Nature** | `Fern_1`, `Clover_1`, `Plant_1`, `Plant_1_Big`, `Tree_*`, `Bush_1_A`, animals | No flower recolor (no `Flowers` mat or not flowers) |

**Stage flank GLBs** (`stageFlowerLarge`, `stageBushFlowers` at y=0, \|x\|≳6.4) are ground-level beside stage, not on the platform → **include** in white flowers.

## Why this works technically

Flower GLBs already split materials:

- `Leaves` / `Leaves_NormalTree` — foliage atlas  
- `Flowers` — flower atlas  

`Nature.svelte` already has `applyMaterialColors` (name match) and luminance-based `applyTint` (whole object). Need a **flower-only** path so leaves keep original map/color.

Setting only `mat.color = white` while keeping a multicolored `Flowers` map **will not** look white (multiply). Must desaturate / luminance the **Flowers** map only, then set color white (same idea as `applyTint`, limited to material name).

## Implementation

### 1. `Nature.svelte` — flower material recolor helper

Add optional prop, e.g. `flowerColor?: string`.

When set (e.g. `#ffffff`):

- Traverse prepared scene materials.
- If material name matches `/flower/i` (covers `Flowers`):
  - If `map`: replace with luminance texture (reuse `toLuminanceTexture` / cache).
  - Set `mat.color` to `flowerColor`.
  - `needsUpdate = true`.
- Never touch materials whose names match leaves/bark (`Leaves`, `Bark`, etc.).

Wire order (existing pipeline): after clone → leafColor / materialColors / tintGradient / tint → **then** `flowerColor` so it wins on Flowers only and does not fight global tint (`#ffffff` identity tint already used for these URLs).

### 2. `Environment.svelte` — pass white only on flowering Nature mounts

On these mounts only:

```svelte
<Nature url="/nature/gltf/Flower_3_Group.glb" ... flowerColor="#ffffff" />
<Nature url="/nature/gltf/Flower_4_Group.glb" ... flowerColor="#ffffff" />
<Nature url="/nature/gltf/Bush_Common_Flowers.glb" ... flowerColor="#ffffff" />
<Nature url="/nature/gltf/Flower_3_Single.glb" ... flowerColor="#ffffff" />
<Nature url="/nature/gltf/Flower_4_Single.glb" ... flowerColor="#ffffff" />
```

Do **not** pass `flowerColor` on Fern/Clover/Plant/Tree/Bush_1_A/animals.

### 3. `Environment.svelte` — procedural off-stage petals only

- `potBloomColors` (aisle pots): all `#ffffff` (or white + optional gold center already separate).
- `archPostBlooms` / `archCrossBlooms` petal `c`: `#ffffff`.
- Desk garland flower petal MeshToonMaterial colors (inline in template): white.
- Aisle flat motifs: `motifPetalMat` / `motifPetalLightMat` → white / off-white.

**Do not change:**

- `bouquetBlooms` colors, stage bouquet template, backdrop flower colors.
- `bouquetLeafMat`, stems, pots (`potBodyMat` / rim), centers if user wants centers non-white — keep gold center (`#d9a441`) as non-petal accent (not “bunga” body); only petal spheres go white.

## Out of scope

- Editing GLB files on disk.
- Changing stage confetti / UI / admin gallery.
- Global `NATURE_TINTS` for flower files (would not isolate Flowers vs Leaves cleanly without Nature change).
- Splitting Nature instances into “stage vs path” for different colors (unnecessary if stage platform florals stay procedural).

## Validation

1. `npm run check`
2. Visual: aisle / gate / desk / mailbox / stage-flank ground flowers → white petals, green leaves intact.
3. Visual: stage platform bouquets + backdrop → **unchanged** pink/cream mix.
4. Pots/stems/leaves/arch ivory posts unchanged.
5. Mobile `lowPower` still loads same URLs; only material color path differs.

## Risks

| Risk | Mitigation |
|------|------------|
| Material not named `Flowers` on some asset | Inspect GLB; match `/flower/i` only |
| White looks flat | Luminance map keeps shading |
| Accidental stage recolor | Never edit stage bouquet/backdrop blocks; no shared mutable color constants between stage blooms and aisle if currently shared — **split** if `potBloomColors` were reused for stage (today stage uses `bouquetBlooms`, not `potBloomColors`) |

## Tasks

1. Add `flowerColor` + flower-only luminance tint in `Nature.svelte`.
2. Pass `flowerColor="#ffffff"` on the five flowering Nature URLs in `Environment.svelte`.
3. Set off-stage procedural petal colors to white (pots, arch blooms, desk garland petals, aisle motifs).
4. Leave all stage platform floral code untouched.
5. Run `npm run check`; quick visual pass.
