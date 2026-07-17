# Plan: Perbaikan Visual — Gerbang, Tiang Lampu, Backdrop Pelaminan

Sumber analisa pengguna: gerbang terlihat seperti balok semen kaku, tiang lampu jalan terlalu besar/industrial, dan dinding backdrop pelaminan berwarna pink pekat (terlihat seperti tripleks). Scope rencana = 3 perbaikan eksplisit pengguna. Shader flat/shadow, karpet merah, dan inkonsistensi vegetasi **di luar scope** (bisa jadi tindak lanjut terpisah).

Semua perubahan di satu file: `src/lib/components/threed/Environment.svelte`. SSR nonaktif; semua kode 3D berjalan client-side di dalam `<Canvas>`.

## Keputusan (dari sesi tanya-jawab)
1. Gerbang: ilitan memakai **aset Bush GLB** (bukan tabung heliks primitif). Tiang kotak tetap sebagai inti struktural tapi **di-recolor ke kayu hangat** agar tak terbaca semen.
2. Tiang lampu: **dipertahankan tapi dikecilkan** (scale 0.75 → ~0.5) + **warna dihangatkan**, dan **ditambah kabel melintang antar pohon** dengan bola kecil `MeshBasicMaterial` kuning bersinar.
3. Anchor kabel: **antar pohon baris (X ±5.5)** pada tiap baris Z pohon lining.
4. Backdrop: **hanya ganti warna dinding** → ivory/krem. Tiga cincin emas (Torus) tetap.

---

## Tugas 1 — Gerbang: ilitan Bush GLB + recolor tiang

Lokasi: `Environment.svelte:537-591` (group `<!-- Arch / Gate -->` di `position={[0,0,4]}`).

### 1a. Recolor tiang agar tak terbaca semen
- Tiang kotak (pillars) saat ini `MeshToonMaterial color="#ffffff"` (baris 541, 553). Ubah → `#b58a5a` (kayu hangat).
- Box dasar & crossbar atas (`#fff5f5` / `#ffffff`, baris 545,549,557,561,565) → `#c9a878` (kayu hangat lebih terang) supaya konsisten.
- Half-torus lengkung atas (baris 568, `#fff5f5`) → `#c9a878`.
- Bola dekoratif bunga (5 sphere pink/cream/kuning, baris 573-590) **tetap** (berfungsi sebagai aksen bunga).

### 1b. Tambah ilitan foliage memakai Bush GLB
Tambah array instance baru di blok `<script>` (sekitar baris 60-69, dekat deklarasi lain) lalu render memakai `<Nature>` yang sudah ada.

Posisi world (gate group di `[0,0,4]`, jadi z dunia = z lokal + 4). Pilih aset `Bush_1_A_Color1.glb` (tint default `#23ca7f` hijau) skala kecil:

```ts
const archVines: { position: [number, number, number]; scale: number }[] = [
  // Tiang kiri (naik)
  { position: [-2.05, 0.95, 4], scale: 0.42 },
  { position: [-2.05, 1.85, 4.12], scale: 0.40 },
  { position: [-2.0, 2.75, 4.0], scale: 0.38 },
  // Tiang kanan (naik)
  { position: [2.05, 0.95, 4], scale: 0.42 },
  { position: [2.05, 1.85, 4.12], scale: 0.40 },
  { position: [2.0, 2.75, 4.0], scale: 0.38 },
  // Lengkung atas (half-torus r=1.6 pusat y=3.75): titik sampel 0..π
  { position: [-1.6, 3.78, 4], scale: 0.40 },
  { position: [-1.13, 4.25, 4], scale: 0.42 },
  { position: [0, 5.2, 4], scale: 0.44 },
  { position: [1.13, 4.25, 4], scale: 0.42 },
  { position: [1.6, 3.78, 4], scale: 0.40 },
]
```

Render (taruh setelah block Arch/Gate, ~baris 591):
```svelte
<Nature url="/nature/gltf/Bush_1_A_Color1.glb" scale={1.0} instances={archVines} />
```
Catatan: `Nature` menerima `instances` tanpa `rotationY` (opsional). Pastikan tipenya kompatibel — `rotationY` opsional sudah didukung (`Nature.svelte:18,180`).

### Validasi Tugas 1
- `npm run check` lolos (tidak ada error tipe pada array instance).
- Visual: tiang tak lagi putih/concrete; foliage hijau jelas membelit tiang & lengkung atas; bola bunga masih terlihat sebagai aksen.

---

## Tugas 2 — Tiang lampu lebih kecil + kabel melintang antar pohon

### 2a. Kecilkan & hangatkan tiang (Environment.svelte:708-709)
Baris saat ini:
```svelte
<Nature url="/nature/gltf/Street_Light.glb" scale={0.75} instances={lamps} materialColors={{ Grey: '#ffffff' }} />
```
Ubah →
```svelte
<Nature url="/nature/gltf/Street_Light.glb" scale={0.5} instances={lamps} materialColors={{ Grey: '#efe6d3' }} />
```
(scale 0.75 → 0.5; warna material `Grey` dari putih industrial → ivory hangat). Posisi `lamps` (baris 66-69) **tidak diubah**.

### 2b. Tambah kabel + bola lampu bersinar antar pohon baris
Pohon baris (lining) ada di X=±5.5, Z = [5, 1, -3, -7, -11, -15, -19] (lihat `liningTreesLeft/Right`, Environment.svelte:371-381). Kabel melintang antar dua sisi di tiap baris Z, melengkung (catenary) di atas jalan.

Tambah di `<script>` (dekat deklarasi `lamps`):

```ts
const stringRows = [5, 1, -3, -7, -11, -15, -19]          // Z tiap baris pohon
const stringAnchorX = 5.5                                  // X pohon baris kiri/kanan
const stringHeight = 4.4                                   // tinggi kabel di atas jalan
const stringSag = 0.65                                     // kedalaman melengkung ke bawah

// Titik catenary per span: midpoint turun stringSag.
function cablePoints(z: number): [number, number, number][] {
  const L = -stringAnchorX, R = stringAnchorX
  const n = 14
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const x = L + (R - L) * t
    const sag = 4 * stringSag * t * (1 - t)   // parabola, puncak rata di ujung
    return [x, stringHeight - sag, z] as [number, number, number]
  })
}

// Tiap span: satu tube kabel + bola lampu menggantung di sepanjang kurva.
const stringSpans = stringRows.map((z) => {
  const pts = cablePoints(z)
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
  const bulbStep = 2   // bola tiap 2 titik sampel
  const bulbs: [number, number, number][] = pts
    .filter((_, i) => i % bulbStep === 0)
    .map(([x, y]) => [x, y - 0.12, z] as [number, number, number])
  return { z, curve, bulbs }
})
```
(`THREE` sudah diimpor di file ini, baris 3.)

Render (taruh setelah lampu, ~baris 709):
```svelte
{#each stringSpans as span}
  <T.Mesh>
    <T.TubeGeometry args={[span.curve, 64, 0.018, 6, false]} />
    <T.MeshBasicMaterial color="#3a3a3a" />
  </T.Mesh>
  {#each span.bulbs as b}
    <T.Mesh position={b}>
      <T.SphereGeometry args={[0.07, 8, 6]} />
      <T.MeshBasicMaterial color="#ffd24a" toneMapped={false} />
    </T.Mesh>
  {/each}
{/each}
```
Catatan material:
- Kabel: `MeshBasicMaterial` gelap (tak terkena cahaya, konsisten tipis).
- Bola: `MeshBasicMaterial` warna kuning hangat `#ffd24a` + `toneMapped={false}` supaya tetap terang/bersinar (sesuai spesifikasi pengguna: bola kecil kuning bersinar). MeshBasicMaterial unlit jadi tampak selalu terang tanpa perlu light tambahan.

### 2c. (Opsional, hemat draw call) Instancing bola
Jika 7×~8 ≈ 56 bola dirasa berat, implementer boleh ganti `{#each}` bola dengan satu `InstancedMesh`. Tidak wajib; 56 mesh kecil masih ringan. Pertahankan `{#each}` dulu untuk kesederhanaan & konsistensi style codebase.

### Validasi Tugas 2
- `npm run check` lolos.
- Visual: tiang lebih kecil & ivory; 7 kabel melintang di atas jalan dari pohon kiri ke kanan, masing-masing dengan deret bola kuning bersinar yang melengkung turun ke tengah. Tidak ada error `toneMapped`/`TubeGeometry` di konsol.

---

## Tugas 3 — Backdrop pelaminan: dinding ivory (bukan pink)

Lokasi: `Environment.svelte:651-654` (di group `<!-- Wedding Stage -->`).

```svelte
<T.Mesh position={[0, 3.25, -2.12]} castShadow>
  <T.BoxGeometry args={[9.65, 5.1, 0.25]} />
  <T.MeshToonMaterial color="#e8b6bc" gradientMap={gradient} />   <!-- UBAH INI -->
</T.Mesh>
```
Ubah `color="#e8b6bc"` (pink) → `#f7efe0` (ivory/krem hangat). Material tetap `MeshToonMaterial` (sesuai instruksi). Tiga cincin emas `Torus` (baris 655-666) **tidak diubah**.

### Validasi Tugas 3
- Visual: dinding backdrop krem/ivory, kontras merah karpet & hijau daun lebih senada (tidak "berantem" dengan pink).
- `npm run check` lolos.

---

## Validasi Akhir (semua tugas)
1. `npm run check` — harus lolos tanpa error tipe.
2. `npm run dev` — buka `http://localhost:5173`, verifikasi:
   - Gerbang masuk: tiang kayu hangat + foliage Bush membelit, tak seperti gawang beton.
   - Sepanjang jalan: tiang lampu lebih kecil + kabel melintang dengan bola kuning bersinar.
   - Backdrop pelaminan: ivory/krem, bukan pink.
3. `npm run build` — harus sukses (memastikan tidak ada referensi SSR/material yang rusak).

## Risiko & Mitigasi
- **Bush GLB tak sepenuhnya menutup tiang putih:** sudah dimitigasi oleh recolor tiang ke kayu hangat (1a). Bila masih terlalu kelihatan, implementer dapat tambah 1-2 titik foliage per tiang.
- **`toneMapped` prop pada `T.MeshBasicMaterial`:** Threlte meneruskan props material Three.js; `toneMapped` valid. Bila konsol memperingatkan, gunakan material sebagai instance `<T.MeshBasicMaterial toneMapped={false} />` (sudah demikian di rencana).
- **Tinggi kabel vs pohon:** `stringHeight=4.4` dipilih di bawah kanopi pohon baris; bila menabrak daun, turunkan ke ~3.8 atau geser anchor ke pohon yang lebih tinggi. Verifikasi visual.
- **Lining tree Z tepat:** `stringRows` harus cocok `liningTreesLeft/Right` Z (5,1,-3,-7,-11,-15,-19). Jangan ubah salah satu tanpa yang lain.

## Di Luar Scope (tindak lanjut terpisah, jangan kerjakan di rencana ini)
- Shadow camera bounds pada `DirectionalLight` (`Lighting.svelte`) — analysis menyebut flat/floating, tapi tidak diminta.
- Karpet merah `#b91c3c` (analysis: kontras harsh) — tidak diminta ganti.
- Inkonsistensi style pohon kiri/kanan — tidak diminta.
- Tiga cincin emas backdrop — sengaja tetap (keputusan pengguna).
