# Remove aisle pots + whiten Nature flowers further

## Goal

1. **Remove** procedural potted plants along the left/right of the aisle carpet (user: jelek).
2. **Push Nature white petals** closer to true white (still light gray after max-channel + p95 stretch).

Stage bouquets / backdrop / arch florals stay as-is.

## Scope

| Path | Change |
|------|--------|
| `src/lib/components/threed/Environment.svelte` | Delete aisle ground pots data + markup + pot-only geos/mats |
| `src/lib/components/threed/Nature.svelte` | Stronger white-shade remap + light flower emissive |

No GLB edits. No `natureColors.ts`. No stage `bouquetBlooms` / `backdropFlowerColors`.

---

## 1. Remove aisle ground pots (`Environment.svelte`)

**Target (confirmed):** procedural block at ~L382–395 data and ~L568–587 markup:

- `aisleGroundPots` — positions at `x = ±5.35`, z along aisle
- Markup: `{#each aisleGroundPots as pot}` (body + rim + sphere blooms + gold center)

**Delete entirely:**

- `aisleGroundPots`
- `potBodyGeo`, `potRimGeo`, `potBodyMat`, `potRimMat`, `potBloomGeo`
- The `{#each aisleGroundPots …}` block

**Keep (shared / not aisle pots):**

- `potBloomColors` — still used by `archCrossBlooms` (`c: potBloomColors[i % …]`)
- `archPostBlooms` / `archCrossBlooms` and their render loops

Do **not** remove Nature aisle flowers (`Flower_*`, `Bush_Common_Flowers`) — only the procedural pots.

---

## 2. Whiter Nature petals (`Nature.svelte`)

Current `toWhiteShadeTexture`: `v = max(R,G,B)`, stretch by `255/p95(v)`, grayscale RGB. Still reads soft gray under MeshStandard + scene lights.

### A. Stronger map remap (primary)

In `toWhiteShadeTexture`, replace pure linear scale with a **lifted** opaque remap:

1. Still compute `v = max(R,G,B)` per opaque pixel (`a >= 16`).
2. Use a **lower high percentile** for stretch, e.g. **p90** (more aggressive than p95; avoid p50 blowout).
3. After `scaled = min(255, v * (255 / p90))`, apply floor lift so body is near white while soft shading remains:

   ```
   // opaque only; keep alpha
   const t = scaled / 255
   const lifted = FLOOR + (1 - FLOOR) * t   // FLOOR ≈ 0.88–0.92
   RGB = round(lifted * 255)
   ```

Recommended start: **p90 + FLOOR = 0.90**. If still gray after visual, implementer may nudge FLOOR to `0.92` or p90→p85 without redesign.

Transparent / zero-alpha: keep RGB 0, alpha unchanged.

Cache: keep **separate** `whiteShadeCache` (do not use `luminanceCache`).

### B. Light emissive on flower mats (secondary)

In `applyFlowerColor`, after map + `mat.color = flowerColor`:

```ts
mat.emissive = target.clone() // or new THREE.Color(color)
mat.emissiveIntensity = 0.08  // stay low; avoid glowing plastic
```

Only materials matching `/flower/i`. Leaves untouched.

### Explicitly avoid

- `mat.map = null` as default (only keep as canvas-failure fallback)
- Raising global lights or changing toon materials for this task
- Editing stage procedural pink/cream bouquets

---

## Pipeline order (unchanged)

`leafColor` → `materialColors` → tint / tintGradient → **`flowerColor` last**

---

## Validation

1. `npm run check`
2. Aisle L/R: **no** ceramic pots + sphere clusters at ±5.35
3. Nature white flowers (aisle, gate, desk, mailbox, guide, stage flanks): **whiter**, not ash
4. Leaves stay green
5. Stage platform bouquets + backdrop: still pink/cream
6. Arch post/cross blooms still present (not removed with pots)

## Risks

| Risk | Mitigation |
|------|------------|
| Lift too high → flat plastic white | FLOOR ≤ 0.92; keep map for soft AO |
| Emissive too strong | Cap ~0.08–0.1; visual check |
| Accidental delete of arch color array | Keep `potBloomColors` when removing pot geos |

## Tasks

1. [x] Remove `aisleGroundPots` + pot-only resources + `{#each}` markup in `Environment.svelte`; keep `potBloomColors` for arch.
2. [x] Strengthen `toWhiteShadeTexture`: p90 + opaque floor lift (~0.90).
3. [x] Add low `emissive` / `emissiveIntensity` on flower materials in `applyFlowerColor`.
4. [x] `npm run check` + visual aisle vs stage.
