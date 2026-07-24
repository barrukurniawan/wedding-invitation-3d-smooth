# Desktop vs Mobile: Kualitas Visual (Konfirmasi)

## Jawaban singkat

**Ya, pandanganmu benar.** Desktop/laptop sengaja lebih tajam & detail; HP sengaja lebih “kasar/buram” agar cold open + frame rate tetap cepat. Itu **by design**, bukan bug render.

## Apa yang membedakan (kode sekarang)

Deteksi di `App.svelte`:

```ts
lowPower = matchMedia('(max-width: 768px), (pointer: coarse)').matches
```

Artinya: layar ≤768px **atau** pointer kasar (touch) → mode `lowPower`.

| Aspek | Desktop (`lowPower=false`) | Mobile (`lowPower=true`) | Efek visual |
|---|---|---|---|
| **DPR** (`World.svelte`) | `[1, 2]` — hingga 2× pixel density | **fixed `1`** | HP retina (2–3×) → canvas under-sampled → **buram / “pecah”** |
| **Shadows** | on + SoftShadows | off | Desktop lebih “volume”; HP flat, lebih murah GPU |
| **Fog** (`Scene.svelte`) | near 18 / far 54 | near 14 / far 42 | HP sedikit lebih kabut-dekat (fill lebih murah) |
| **Nature density** | `i % 8` | `i % 12` | HP lebih jarang pohon/rumput |
| **Animals** | on (setelah loaded) | **skip** | HP tanpa bunny/cat/panda |

Geometry low-poly, toon material, ground/stage/desk **sama** di kedua mode. Yang beda: **resolusi canvas + shadow + densitas decor**.

## Kenapa buram di HP terasa kuat

1. **DPR=1 di layar 2–3×** = tiap pixel CSS digambar 1 pixel WebGL, lalu di-stretch ke banyak pixel fisik → soft/blur.
2. **Tanpa shadow** → siluet & ground “lebih flat”, detail terasa kurang “hidup”.
3. **Fog lebih dekat + vegetasi sparser** → background sedikit lebih kosong/kabur.

Performa “waw cepat” di keduanya adalah hasil trade-off ini (plus readiness critical-path, deferred Nature, gzip, preload GLB).

## Keputusan user (sesi ini)

- **Hanya konfirmasi** — tidak mengubah kualitas mobile.
- Tidak naikkan DPR, tidak samakan ke desktop, tidak 3-tier.

## Out of scope (kecuali diminta nanti)

- Naikkan `dpr` lowPower ke ~1.25–1.5
- Tier mid/high via `deviceMemory` / GPU heuristics
- Soft shadows ringan di flagship mobile
- Toggle “Kualitas tinggi” di UI

## Validasi (manual, jika ingin cek sendiri)

1. Desktop DevTools → toggle device emulation: `lowPower` aktif → canvas lebih soft.
2. Desktop normal: SoftShadows + dpr 2 → tajam.
3. HP nyata: sharp enough for invite, FPS stabil; bukan target “game AAA”.
