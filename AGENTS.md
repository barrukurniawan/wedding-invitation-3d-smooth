# Wedding Summer (SvelteKit + Threlte)

## Commands
- `npm run dev` starts the app (Vite dev server).
- `npm run build` creates a static production build (`build/`, adapter-static).
- `npm run preview` serves the production build.
- `npm run check` runs `svelte-check` (typecheck). No standalone lint/test scripts.

## Stack
- SvelteKit (Svelte 5 runes) + Vite, adapter-static, SSR disabled (`+layout.ts`: `ssr = false`, `prerender = true`).
- Three.js + @threlte/core + @threlte/extras (declarative Three.js for Svelte).
- GSAP, Tailwind CSS.

## Runtime Structure
- `src/App.svelte` composes the `<Canvas>` (client-only, browser) with HUD + modals.
- `src/routes/+page.svelte` mounts `App.svelte`; `+layout.svelte` imports global CSS.
- Layer 3D lives in `src/lib/components/threed/`: `Scene.svelte` (composes + render loop), `Lighting`, `Environment`, `Player`, `Character`, `Npcs`, `CameraRig`, `Confetti`, `Labels`.
- Layer UI in `src/lib/components/ui/`: modals (`NpcDialog`, `GuestbookModal`, `WeddingStageModal`), `MobileControls`, `InteractionHint`, `LoadingScreen`, `AudioPlayer`.
- Logic stores in `src/lib/stores/` (port of old composables): `gameState.svelte.ts`, `playerMovement.svelte.ts`, `labelStore.svelte.ts`. Player position/angle/moving are module-level shared state read in the render loop.
- `src/lib/constants/triggers.ts` defines `triggerZones`, `colliders`, stage/ramp geometry, palettes. Trigger positions must stay aligned with 3D object positions in `Environment.svelte` / `Npcs.svelte`.
- `src/lib/utils/interaction.ts` computes proximity (hypot dx,dz). `src/lib/services/api.ts` is the guestbook backend stub (TODO: wire real backend before production).

## Interaction Contracts
- Same as the prior Nuxt repo: `triggerZones` define interactive locations; `action` matches `ModalType`; NPC zones require `npcData`.
- Opening `weddingStage` enables confetti; always close via `closeModal()` to reset modal, NPC data, and confetti.
- Guestbook submit is presentation-only (alert + stub); add a server/API path before representing saved data.

## 3D / Assets
- Character models are rigged glTF in `static/models/` (embedded, 17 clips each: Idle, Walk, Run, Jump, Victory, ...). Loaded via `useGltf` + `useGltfAnimations` from `@threlte/extras`.
- `Player.svelte` crossfades `Walk`/`Idle` based on `playerMoving` and updates position per frame via `useTask`.
- `Character.svelte` is the generic animated NPC (single clip).
- Environment uses `MeshToonMaterial` with a 3-tone gradient map (`src/lib/utils/toonMaterial.ts`) + warm hemisphere/directional lighting + soft shadows + fog for the Summer Afternoon look.

## Build Config Notes
- `vite.config.ts`: `ssr.noExternal` includes three/@threlte packages; `optimizeDeps` includes three.
- three is browser-only; keep all Three/Threlte work inside `<Canvas>` / `onMount` / `browser` guards.
