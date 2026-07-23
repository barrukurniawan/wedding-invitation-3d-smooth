# Prompt Generator 3D — Wedding Stage (Meshy / Tripo)

Dokumen ini berisi prompt untuk merekam desain panggung pernikahan **yang ada saat ini** di `Environment.svelte` (tangga, gerbang/arch, tali lampu menggantung, dekorasi dinding/backdrop) sehingga bisa dihasilkan sebagai **satu model GLB yang dioptimalkan** lewat Meshy atau Tripo, lalu menggantikan geometri primitif yang berat/laggy.

> Semua nilai di bawah diambil dari geometry aktual di `src/lib/components/threed/Environment.svelte`. Skala dunia nyata (meter). Saat ini panggung berada di world `x=0, z=-18`, menghadap −Z (ke arah pemain). Origin model = tengah lantai panggung, Y=0.

---

## Palet warna (dari kode saat ini)

| Peran | Warna | Hex |
|---|---|---|
| Ivory / warm white (lantai, trim, panel, tiang) | ivory | `#fff0dc` / `#fff3dd` / `#f7efe0` |
| Burgundy lembut (lantai utama) | muted burgundy | `#9c3a52` |
| Burgundy gelap (sub-base/sisi) | deep burgundy | `#6b2a3a` |
| Dusty rose (drapery, landing) | dusty rose | `#d96b7a` / `#c97f93` |
| Champagne gold (frame, trim, riser, tiang trim, cincin) | champagne gold | `#d9b77b` / `#e8c98a` |
| Runner karpet (merah-burgundy) | runner red | `#9c2a40` |
| Bohlam hangat | warm yellow emissive | `#ffd24a` |

---

## Dimensi aktual saat ini

- Lebar keseluruhan: ~10.5 m (sub-base 10.9 m)
- Kedalaman: ~4.8 m (sub-base 5.1 m)
- Tinggi backdrop (puncak valance): ~5.0 m
- Tinggi lantai panggung (top): 0.7 m
- Tangga: 3 step × (lebar 3.5 m, tinggi 0.23 m, kedalaman 0.37 m)
- Arch (gerbang) di kaki tangga: tiang di X = ±4.5 m, crossbar atas di Y ≈ 3.9–4.0 m
- Landing carpet di depan tangga: 4.0 × 1.6 m

---

## Prompt utama (text-to-3D)

```text
Create a complete stylized low-poly 3D wedding stage for a browser-based Three.js/Threlte wedding invitation. Optimized for real-time WebGL on desktop and mobile.

Art direction:
- Elegant stylized low-poly garden wedding, soft pastel, premium, warm, romantic, welcoming
- Cozy polished 3D game look, not realistic, not photoreal, not cartoonish
- Clean readable silhouettes from a third-person camera ~6 m away

Color palette:
- Ivory / warm white (#fff0dc, #fff3dd, #f7efe0)
- Muted burgundy (#9c3a52) and darker sub-base (#6b2a3a)
- Dusty rose (#d96b7a)
- Champagne gold (#d9b77b, #e8c98a)
- Runner red (#9c2a40)
- Small accents of warm yellow emissive bulbs (#ffd24a)

Build one modular wedding stage with these layers:

1. Lower foundation (sub-base):
   - Rectangular platform, slightly larger and darker than the main floor (deep burgundy #6b2a3a)
   - Grounded and stable

2. Main stage floor:
   - Raised rectangular floor, muted burgundy #9c3a52, top surface at 0.7 m
   - Ivory trim band around the top edge
   - Champagne-gold skirt panel on the front face

3. Front stairs:
   - THREE separate shallow rectangular steps, centered, total width 3.5 m
   - Each step: height 0.23 m, depth 0.37 m, ivory warm-beige stone
   - A dusty-rose / runner-red runner strip centered on top of each step
   - Champagne-gold thin trim on the front riser of each step
   - Bottom step touches the ground, top step reaches the stage floor (0.7 m)
   - Clean distinct risers, readable shadow lines, NOT a sloped wedge, NOT one block

4. Landing carpet:
   - A centered rectangular landing area in FRONT of the stairs, 4.0 x 1.6 m
   - Dusty rose #c97f93 with a champagne-gold border on all four sides
   - Aligns exactly with the central aisle

5. Stage runner carpet:
   - A centered runner (#9c2a40) continuing up the stairs and onto the stage floor
   - Width ~2.2 m, with thin champagne-gold edges
   - Keeps the front interaction area open

6. Side flower arrangements:
   - Two balanced low-poly floral clusters on left and right of the stage front
   - Spherical low-poly blooms in pink (#f08aa4), peach (#ffe3a3), blush (#f9b3c6), white, lilac
   - Frame the couple without blocking them, no scattered random flowers

7. Backdrop (layered, NOT a single flat plane):
   - Champagne-gold outer frame panel (#d9b77b)
   - Warm ivory main panel (#f7efe0) set slightly in front of the frame for real depth
   - Two dusty-rose side drapery panels (#d96b7a) at the left and right edges
   - A dusty-rose valance across the top
   - Two interlocking champagne-gold wedding rings as a central monogram above the couple
   - Keep the central lower area empty for the bride and groom

8. Wedding arch / gate (portal in front of the stairs):
   - Two grounded ivory side posts at x = +-4.5 m, with wider low-poly bases
   - Slightly thicker vertical posts (ivory painted wood) with subtle champagne-gold trim bands
   - A horizontal crossbar / upper frame connecting the two posts at ~4.0 m height
   - Small champagne-gold bracket knobs at the top of each post as visible cable attachment points
   - Frames the stage and the couple, keeps the central view open, stands OUTSIDE the walking path

9. Hanging decorative lights:
   - ONE main cable hanging between the two arch-top brackets (between the posts, at ~3.9 m)
   - Small controlled sag in the middle, warm yellow emissive bulbs evenly spaced along the cable
   - Cable ends MUST connect to the brackets, no floating/disconnected ends
   - Lowest point of cable at least 3.6 m above ground (above character head height)
   - Do NOT run cables across the couple's faces or across the backdrop
   - Use emissive material for bulbs, NO per-bulb real-time shadow lights

10. Couple standing area:
    - Clear central flat area for two stylized character models, side by side
    - No large props in front, backdrop visible behind them

Geometry requirements:
- Low-poly, clean, modular, mobile-friendly
- Target 10,000-25,000 triangles total, fewer than 12 material slots
- Prefer vertex colors / simple PBR; textures only if needed (512-1024px, compressed)
- Matte / semi-matte; metallic only for champagne-gold accents
- Works with Three.js MeshStandardMaterial and MeshToonMaterial

Model structure (named objects):
  Stage_SubBase
  Stage_Floor
  Stage_Trim
  Stage_Skirt
  Stage_Stairs (3 steps)
  Stage_Carpet
  Landing_Carpet
  Backdrop_Frame
  Backdrop_Panel
  Backdrop_Drapery_Left
  Backdrop_Drapery_Right
  Backdrop_Valance
  Wedding_Rings
  Flower_Arrangement_Left
  Flower_Arrangement_Right
  Wedding_Arch_Left
  Wedding_Arch_Right
  Wedding_Arch_Crossbar
  Arch_Bracket_Left
  Arch_Bracket_Right
  Hanging_Lights_Cable
  Hanging_Lights_Bulbs
  Monogram_Plaque (empty, no baked text)

Scale and orientation:
- Real-world meters, overall ~10.5 m wide, ~4.8 m deep, ~5.0 m tall
- Ground at Y = 0, stage floor top at Y = 0.7
- Front faces negative Z
- Origin at the center of the stage floor
- Apply location, rotation, scale transforms
- Clean normals, consistent winding

Export:
- Single optimized GLB, embedded textures, applied transforms
- No cameras, no scene lights (use emissive bulbs only), no sky/terrain/floor outside the stage
- No baked text, no baked names, no logos, no human characters
- Keep couple area empty, keep front interaction area open, stairs walkable
```

---

## Negative prompt

```text
Avoid photorealistic architecture, high-poly sculpting, dense baroque ornament, gothic style,
church/palace architecture, dark horror mood, neon lighting, overly saturated red, mirror gold,
glass-heavy surfaces, dense flower petals, tiny unreadable ornaments, giant flowers blocking the couple,
single flat backdrop plane, sloped wedge stairs, one-block stairs, floating steps, disconnected cable ends,
cables crossing faces or labels, cables lower than 3 m, random thin floating wires, excessive real-time
shadow lights, transparent materials, baked text, baked lighting, hidden cameras, hidden lights,
non-manifold geometry, broken normals, unapplied transforms, unused textures, objects without names.
```

---

## Versi image-to-3D (lebih ketat, jika pakai screenshot sebagai referensi)

```text
Convert the uploaded front-view reference into a game-ready stylized low-poly wedding stage. The image is a design reference, not a texture; reconstruct it as real 3D geometry with visible depth.

Required proportions: width ~10.5 m, depth ~4.8 m, height ~5.0 m, ground Y=0, stage floor top 0.7 m, front faces negative Z, origin at center of stage floor.

Build separate modular parts:
- Deep-burgundy sub-base slightly larger than the floor
- Muted-burgundy main floor with ivory trim and champagne-gold front skirt
- THREE centered shallow rectangular steps (3.5 m wide, 0.23 m tall, 0.37 m deep each), ivory stone, dusty-rose runner on top, gold riser trim
- Rectangular dusty-rose landing carpet (4.0 x 1.6 m) in front of the stairs with gold border
- Centered runner-red carpet continuing up the stairs and onto the stage, gold edges
- Layered backdrop: champagne-gold frame + ivory panel + dusty-rose side drapes + top valance + two interlocking gold rings
- Balanced low-poly flower clusters left and right
- A wedding arch/gate in front of the stairs: two grounded ivory posts at +-4.5 m with gold trim and a top crossbar at ~4.0 m, gold bracket knobs at the post tops
- ONE hanging cable between the two arch-top brackets with small sag and evenly spaced warm-yellow emissive bulbs, both ends attached to the brackets, lowest point >=3.6 m, no cable crossing faces

Keep the bride-and-groom central area empty and the front interaction area open.
Low-poly, <12 materials, <4 textures, GLB export, applied transforms, correct normals, no cameras, no scene lights, no environment, no characters, no baked text.
```

---

## Adaptasi agar cocok dengan venue yang sudah ada

```text
Adapt the wedding stage model to fit the existing stylized low-poly wedding venue.

The venue uses:
- A red/dusty-rose central wedding aisle aligned on world X = 0
- A third-person player camera
- A stage interaction trigger in front of the platform (world z ~ -14 to -14.9)
- AABB movement collision and a ramp letting the player walk up the stage

The stage must:
- Center on world X = 0
- Face the player approaching from negative Z
- Align its central carpet exactly with the existing aisle
- Keep the front edge, landing, and stairs clear for player movement
- Keep the interaction area (~2 m in front of the stairs) unobstructed
- Keep poles/arch outside the walking path (aisle is only ~+-1.0 m wide)
- Not overlap the player spawn, NPC triggers, or existing colliders
- Use ~10.5 m max width, ~4.8 m depth
- Include simple invisible collision proxy boxes (named Collider_*) for: stage floor, each stair step, backdrop, and the two arch posts
- Export optimized GLB with named objects and applied transforms, front facing negative Z, origin at stage floor center
```

---

## Catatan sinkronisasi setelah model jadi

Setelah GLB diimpor untuk menggantikan geometry primitif di `Environment.svelte`, pastikan yang berikut tetap selaras (geometri primitif saat ini dipakai sebagai acuan posisi):

- Trigger zone pelaminan: `src/lib/constants/triggers.ts` → `weddingStage` posisi `[0, 0, -18]`, radius `3.5`. Pertahankan.
- Collider AABB: `colliders` di `triggers.ts` (meja resepsionis, kotak ucapan, pemandu) tidak terpengaruh. Tambah collider baru untuk arch/tangga hanya jika movement perlu mencegah menembus tiang arch.
- Ramp naik panggung: `STAGE` (`minX -5.25, maxX 5.25, minZ -20.4, maxZ -15.55, height 0.7`) + `RAMP` (`minZ -15.8, maxZ -14.7`). Tangga visual baru harus sejajar rentang ramp ini (world z −15.8 → −14.7) supaya pemain naik mulus.
- Karpet mendarat (landing) di world z ≈ −14.9; arch di world z ≈ −14.9 (X ±4.5).
- Kabel lampu: komponen `HangingLights.svelte` (anchor-based). Bila kabel pindah ke dalam GLB, hapus kabel arch di Environment dan pertahankan 2 kabel memanjang sisi jalan (di tiang Street_Light) sebagai bagian venue.
- Cincin monogram + drapery + bunga backdrop: pindahkan ke GLB; hapus mesh primitif terkait di Environment agar tidak dobel.
- `CameraRig.svelte` raycast hanya ke grup proxy occluder (`cameraOccluders.svelte.ts`) — bila panggung jadi satu GLB, tambahkan 1 proxy box untuk seluruh panggung (bukan per-mesh) agar raycast tetap murah.

## Validasi

- GLB buka tanpa error, skala meter, depan −Z, origin tengah lantai.
- Tidak ada kabel ujungnya menggantung / terputus; titik terendah kabel ≥ 3.6 m.
- Karpet tengah sejajar jalur merah; area depan tangga terbuka.
- Pasangan (bride/groom) tetap terlihat; backdrop tidak menutupi.
- Triangle < 25.000, material < 12; berjalan mulus di desktop & mobile (target kembali ke ~200 MB RAM, bukan ~600 MB).
```
