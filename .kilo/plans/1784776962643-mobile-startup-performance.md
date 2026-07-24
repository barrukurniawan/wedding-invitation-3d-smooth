# Rencana: Performa Startup Mobile (Cepat Muncul Semua)

## Jawaban singkat: izinkan RAM 350 → 600 MB?

**Tidak.** Menaikkan “izin” / budget RAM browser (tab, PWA, atau limit OS) **tidak mempercepat** cold open di mobile web.

| Yang diubah | Efek pada “semua terbuka cepat”? |
|---|---|
| RAM budget lebih besar | Hanya mengurangi risiko tab di-kill / stutter saat heap sudah penuh. **Tidak** mempercepat download, parse JS, parse GLB, compile shader, atau upload GPU. |
| Bottleneck saat ini | Jaringan + parse/compile JS + download ~5.8 MB model karakter + banyak nature GLB + kerja main-thread Environment + WebGL. |

RAM 350 MB saat runtime **bukan** penyebab layar hitam / loading lama. Kalau heap naik ke 600 MB karena lebih banyak asset di-load sekaligus, startup bisa **lebih lambat** (lebih banyak parse/upload), bukan lebih cepat.

Fokus: **kurangi work sebelum first ready frame** + **jangan reveal sebelum critical path siap**.

---

## Konteks (kode saat ini vs ANALISIS)

Banyak item di `ANALISIS_PERFORMA_MOBILE.md` **sudah diimplementasi sebagian**:

| Item analisis | Status di repo sekarang |
|---|---|
| Shell HTML awal | **Ada** — `src/app.html` `#startup-shell` |
| Pisah bundle 3D | **Ada** — `App.svelte` dynamic import `World.svelte` |
| Timer 1.5s / progress acak | **Sudah diganti** — `setLoaded(true)` via `onReady` |
| Delay NPC 500 ms | **Sudah hilang** — `Npcs` mount langsung di `Scene.svelte` |
| Low power mobile | **Ada** — `lowPower` (max-width / coarse pointer): `dpr=1`, no SoftShadows, shadows off |
| Readiness | **Parsial** — tunggu `playerReady` + `npcsReady` + `Environment` module mount, **bukan** nature GLB / frame scene lengkap |
| Gzip/Brotli Nginx | **Belum** — `nginx.docker.conf` tidak ada `gzip` / `brotli` |
| Environment readiness | **Belum** — Environment mount = import module; 21+ `<Nature>` + procedural mesh tetap load/parse setelah reveal bisa terjadi |
| Model karakter | ~1.1–1.3 MB × 5 (~5.8 MB), banyak clip animasi |
| Asset dead | `.gltf` duplikat di `static/models/`, banyak nature GLB tidak dipakai |

**Keputusan produk (dari user):** reveal setelah **critical path** siap; vegetasi/hewan jauh boleh pop-in setelah overlay.

---

## Goal

1. Overlay (shell HTML → `LoadingScreen`) **tidak black-screen**; tetap terlihat sampai critical world ready.
2. Setelah fade-out: player + ground/stage dekat spawn + 4 NPC sudah di scene (minim pop-in kritis).
3. Nature jauh / animal deferred; tidak memblokir reveal.
4. Transfer JS lebih kecil di produksi (gzip/Brotli).
5. Cold load mobile terasa “dunia utuh dulu”, bukan “kosong lalu muncul satu-satu” di area spawn.

Non-goal: menaikkan RAM budget; rewrite full SSR Three.js; ubah konten undangan.

---

## Critical path (definisi ready)

**Wajib sebelum `setLoaded(true)`:**

1. `World` + `Canvas` + `Scene` mounted.
2. Player GLB loaded + `onReady` (mesh di scene).
3. 4 NPC GLB loaded + masing-masing `onReady` (`Npcs` count === 4).
4. Environment **critical slice** siap:
   - Ground / path / fog-facing geometry dekat spawn
   - Reception desk area (dekat resepsionis)
   - Stage base yang terlihat dari spawn (opsional jika kamera awal mengarah ke stage)
5. Minimal **2 rAF** setelah di atas (shader/upload frame) — pola yang sudah ada di `Scene.svelte`.

**Deferred (setelah loaded):**

- Nature instances jauh (pohon sisi, grass mass, animals)
- Soft quality extras (jika lowPower: tetap off)
- Non-critical procedural decor

---

## Implementasi (urutan)

### 1. Nginx: gzip (dan Brotli jika image mendukung)

**File:** `nginx.docker.conf` (dan mirror deploy jika ada)

Tambah di server HTTPS:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_min_length 1024;
gzip_types
  text/plain text/css application/javascript application/json
  application/xml image/svg+xml font/woff2;
```

Opsional Brotli module jika image Nginx memilikinya.

**Catatan:** GLB jarang mengecil signifikan; **JS/CSS** (chunk route ~876 KB → ~237 KB gzip per analisis) adalah win utama cold load.

**Validasi:** `curl -I -H 'Accept-Encoding: gzip' https://marryme.web.id/...js` → `Content-Encoding: gzip`.

---

### 2. Split Environment: critical vs deferred

**File utama:** `src/lib/components/threed/Environment.svelte` (1066 baris)

Refactor menjadi:

| Komponen | Isi | Kapan mount |
|---|---|---|
| `EnvironmentCritical.svelte` (baru) atau prop `phase` | Ground, path, colliders visual, desk, stage core, minimal poles/lights dekat spawn | Langsung dengan Scene |
| `EnvironmentDecor.svelte` (baru) | Mass Nature trees/grass, animals, far mountains detail, non-essential flowers | Setelah `isLoaded` **atau** `requestIdleCallback` / timeout pendek pasca-ready |

`Scene.svelte` readiness:

```text
playerReady && npcsReady && envCriticalReady → rAF×2 → onReady
```

Hapus ketergantungan “`Environment` module object exists” sebagai proxy ready; ganti dengan callback eksplisit dari critical env (`onReady` setelah geometry kritis `oncreate` / mount complete).

Nature: **jangan** mount 21 URL sebelum ready. Critical boleh 0–3 nature terdekat spawn saja jika visual spawn butuh; sisanya deferred.

---

### 3. Preload critical GLB paralel saat shell terlihat

**File:** `src/App.svelte` (onMount, sebelum/bersamaan dynamic import World)

Setelah shell/UI hidup, mulai fetch paralel (tanpa menunggu Canvas):

```ts
const CRITICAL = [
  '/models/tamu.glb',
  '/models/resepsionis.glb',
  '/models/pemandu.glb',
  '/models/pengantin-pria.glb',
  '/models/pengantin-wanita.glb',
]
// Promise.allSettled(CRITICAL.map(u => fetch(u))) // atau THREE Cache / useLoader preload
```

Pastikan loader Threlte/`useGltf` memakai cache browser yang sama (HTTP cache + Three Cache jika dipakai). Tujuan: download overlapping dengan parse JS Three chunk.

Opsional: `<link rel="preload" as="fetch" crossorigin>` di `app.html` hanya untuk `tamu.glb` (jangan preload 5× besar-besaran di HTML agar tidak menyaingi JS kritis).

---

### 4. Readiness progress nyata (opsional UX)

**File:** `LoadingScreen.svelte` + store tipis (mis. `loadProgress.svelte.ts`)

- Counter: critical assets done / total (player + 4 NPC + envCritical flag).
- Ganti indeterminate bar dengan width % nyata.
- Tetap hapus `#startup-shell` on mount LoadingScreen (sudah ada).

---

### 5. Optimasi model karakter (batch terpisah, high impact)

Di luar pure code, asset pipeline:

1. Export ulang GLB NPC: **hanya clip yang dipakai** (`Idle` / `Victory`); player: `Idle`+`Walk`+`Run` (+ Jump jika dipakai).
2. Quantize / meshopt jika decode mobile OK (ukur di device nyata).
3. Hapus `static/models/*.gltf` duplikat dari deploy jika build menyalin semuanya.
4. Jangan `immutable` 1y tanpa hash pada GLB — gunakan version query atau rename hashed saat ganti model (`nginx` cache note di analisis).

Target: total critical character download turun signifikan di bawah ~5.8 MB.

---

### 6. Low-power path lebih agresif (runtime, bukan RAM)

Sudah: `dpr=1`, no soft shadows, shadows off.

Tambahan mobile:

| Setting | lowPower |
|---|---|
| Nature instance density | `sparseTrees` lebih agresif / skip animals sampai idle |
| Fog far | sedikit lebih dekat (kurang fill) |
| `castShadow` pada decor kecil | off (sudah global shadows off di lowPower) |
| Deteksi | pertahankan coarse pointer + width; opsional `navigator.deviceMemory <= 4` untuk “veryLow” (bukan “izin 600MB”) |

**Jangan** naikkan DPR/shadow “karena RAM longgar” — itu memperlambat first frame.

---

### 7. Bersihkan deployment asset

- Pastikan build/static hanya nature GLB yang di-referensi Environment.
- Drop unused `.gltf` dari image produksi.
- Dokumentasikan di deploy checklist: enable gzip di VPS.

---

## Alur target

```text
HTML + #startup-shell (langsung)
→ JS SvelteKit kecil + LoadingScreen
→ paralel: fetch critical GLB + dynamic import World (Three/Threlte)
→ Canvas: Player + Npcs + EnvironmentCritical
→ all critical onReady + 2 rAF
→ setLoaded(true) → overlay fade
→ EnvironmentDecor / far Nature / animals
```

---

## File yang disentuh (implementasi)

1. `nginx.docker.conf` — gzip
2. `src/lib/components/threed/Environment.svelte` — split critical/deferred
3. `src/lib/components/threed/Scene.svelte` — readiness envCritical
4. `src/App.svelte` — preload critical GLB; optional progress hooks
5. `src/lib/components/ui/LoadingScreen.svelte` — progress nyata (opsional)
6. Store baru kecil untuk progress (opsional)
7. Asset pipeline / `static/models` (hapus clip & duplikat) — terpisah dari pure Svelte jika butuh Blender/gltf-transform

Tidak mengubah: konten undangan, API guestbook, interaction contracts `triggers.ts` (posisi NPC/zone tetap align).

---

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Spawn terlihat “kosong” tanpa trees | Critical slice harus mencakup ground + 1–2 lining tree dekat kamera awal |
| Preload 5 GLB menyaingi JS | Mulai preload **setelah** World import kicked off, atau prioritaskan player dulu lalu NPC |
| Cache immutable GLB stale | Version URL saat ganti model; long cache hanya untuk hashed assets |
| Decode meshopt lambat di HP lemah | A/B: plain quantize vs meshopt di 1 device mid-range |
| Split Environment regression visual | Bandingkan screenshot desktop high + mobile lowPower sebelum/sesudah |

---

## Validasi

1. `npm run build` + `npm run check`
2. Local: throttle Network “Fast 3G” + CPU 4× slowdown di DevTools mobile
3. Clean cache: pastikan `#startup-shell` muncul **sebelum** chunk 3D selesai
4. Overlay hilang hanya setelah player + 4 NPC + critical env visible (manual + optional console flags)
5. Setelah reveal: far nature boleh muncul 0.5–2s kemudian; spawn area tidak “kosong total”
6. Produksi: response JS punya `Content-Encoding: gzip` (atau br)
7. Lighthouse / WebPageTest mobile cold: bandingkan TTFB, LCP (shell), time-to-interactive scene (custom)

---

## Urutan kerja agent implementasi

1. Gzip Nginx (deploy config) — win transfer JS segera.
2. Scene readiness: envCritical callback + deferred Nature/animals.
3. Preload critical GLB di App onMount.
4. Progress bar berbasis counter (opsional polish).
5. Asset: strip animasi / drop `.gltf` / cache policy.
6. Profiling ulang di HP nyata clean cache; adjust critical slice jika spawn masih jelek.

---

## Out of scope

- Menaikkan alokasi RAM browser/OS sebagai “optimasi”.
- SSR penuh untuk scene Three.js.
- Backend guestbook.
- Estimasi jam/hari pengerjaan.
