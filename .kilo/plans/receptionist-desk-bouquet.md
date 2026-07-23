# Redesign pot bunga meja resepsionis

## Goal
Ganti pot + isi bunga di atas meja resepsionis agar **visualnya sama** dengan buket panggung (`stageBouquets`), tapi **skala lebih kecil** supaya proporsional dengan meja.

## Context (kode saat ini)

File: `src/lib/components/threed/Environment.svelte`

| Item | Lokasi | Desain |
|------|--------|--------|
| Buket panggung (referensi) | L63–89 data + L958–1004 mesh | Vas emas, 5 stem, `bouquetLeaves`, 6 bloom × 6 petal |
| Pot meja (yang aneh) | L124–127 `deskBouquetFlowers` + L738–777 | Vas ivory, 4 stem, 5 bunga × 4 petal (style backdrop) |
| Garland panel depan | L116–123 + L711–737 | Tetap — **bukan** pot di atas meja |

Meja: group `position={[4, 0, -4]}` `rotation.y={π/2}`.  
Tabletop Y≈1.04; pot lama di local `[0.88, 1.08, 0.04]` scale `0.72`.

## Decisions

1. **Scope:** hanya pot di atas meja. Garland panel depan **tidak diubah**.
2. **Reuse:** pakai geometry/material stage yang sudah ada (`bouquetStemGeo`, `bouquetLeafGeo`, `bouquetPetalGeo`, `bouquetCenterGeo`, mats, `bouquetLeaves`, `bouquetBlooms`) — **jangan** duplikasi mesh baru.
3. **Scale desk:** `~0.32` (vs stage 0.82–1.18). Target tinggi visual ~0.55–0.7 m di atas tabletop; tidak menabrak label resepsionis / nampan kiri.
4. **Posisi:** kanan meja, local `[0.88, 1.08, 0.04]` (sama area pot lama), `rotationY` kecil opsional `0.05`.
5. **Cleanup:** hapus `deskBouquetFlowers` jika tidak terpakai lagi.

## Implementation tasks

1. **Hapus** blok pot lama L738–777 (group vas ivory + stem + `deskBouquetFlowers`).
2. **Hapus** const `deskBouquetFlowers` (L124–127) bila unused.
3. **Tambah** satu instance pola stage di group meja resepsionis, contoh:

```svelte
<!-- Pot meja: reuse design stageBouquet, scale kecil -->
<T.Group position={[0.88, 1.08, 0.04]} scale={0.32} rotation.y={0.05}>
  <!-- sama persis struktur di dalam {#each stageBouquets}: vas + rim + stems + leaves + blooms -->
</T.Group>
```

4. **Opsional (lebih bersih):** ekstrak inner markup stage bouquet ke snippet/komponen lokal atau loop data:

```ts
const deskStageBouquet = {
  position: [0.88, 1.08, 0.04] as [number, number, number],
  scale: 0.32,
  rotationY: 0.05
}
```

Lalu render dengan markup yang sama seperti `stageBouquets` (boleh `{#each [deskStageBouquet] ...}` di dalam group meja, atau shared `{#snippet bouquet(...)}` jika Svelte 5 snippet dipakai di file ini). Preferensi: **copy struktur stage sekali** di group meja dulu (minimal risk); refactor snippet hanya jika tidak menambah kompleksitas.

5. **Jangan** ubah: collider meja, trigger `receptionist`, garland, nampan/buku tamu kiri, NPC, stage bouquets.

## Validation

- Dev: `npm run dev` — pot meja terlihat seperti mini stage bouquet (emas + foliage + 6 bloom).
- Proporsi: pot tidak menutupi nampan kiri; tidak “mengambang” di luar meja.
- Stage bouquets tidak berubah.
- `npm run check` lolos (tidak ada unused var).

## Out of scope

- Redesain meja / garland panel
- Ganti asset glTF bunga
- Deploy VPS

## Risks

| Risk | Mitigation |
|------|------------|
| Scale 0.32 terlalu besar/kecil | Sesuaikan 0.28–0.38 setelah lihat di browser |
| Stem geometry tinggi (1.35 unit) | Scale group menangani; cek Y lokal stem masih di dalam vas |
| Duplikasi markup stage | Accept short-term; snippet jika diulang lagi |
