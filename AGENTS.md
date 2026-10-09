# Wedding Summer (SvelteKit + Threlte)

## Commands
- `npm run dev` starts the app (Vite dev server).
- `npm run build` creates a static production build (`build/`, adapter-static).
- `npm run preview` serves the production build.
- `npm run check` runs `svelte-check` (typecheck). No lint script.
- `npm test` runs the Express API tests (`server/`). `npm run dev:server` starts the API locally.
- `npm run build` first runs `build:nature` (`scripts/build-nature-pack.cjs` merges static nature glb files into `static/nature/gltf/nature-pack.glb`).
- Local tenant testing: open `<slug>.localhost:5173` (e.g. `kia-toni.localhost:5173`); the root host renders the platform dashboard.

## Stack
- SvelteKit (Svelte 5 runes) + Vite, adapter-static, SSR disabled (`+layout.ts`: `ssr = false`, `prerender = true`).
- Three.js + @threlte/core + @threlte/extras (declarative Three.js for Svelte).
- GSAP, Tailwind CSS.

## Runtime Structure
- `src/App.svelte` composes the `<Canvas>` (client-only, browser) with HUD + modals.
- Multi-tenant SaaS (live at `marryme.web.id`, invitations on `*.marryme.web.id`). `src/routes/+page.svelte` classifies the host (`src/lib/routing/host.ts`): root → `platform/DashboardShell`, invitation → `tenant/TenantBootstrap`, invalid → `TenantStateScreen`.
- `TenantBootstrap.svelte` calls `loadConfig()` (`stores/weddingConfig.svelte.ts` → `GET /api/config`) then picks the app by `preset`: `2d_garden` → `twod/Garden2DApp.svelte`, otherwise `App.svelte` (3D). `+layout.svelte` imports global CSS.
- Layer 3D lives in `src/lib/components/threed/`: `Scene.svelte` (composes + render loop), `Lighting`, `Environment`, `Player`, `Character`, `Npcs`, `CameraRig`, `Confetti`, `Labels`.
- Layer UI in `src/lib/components/ui/`: modals (`NpcDialog`, `GuestbookModal`, `WeddingStageModal`), `MobileControls`, `InteractionHint`, `LoadingScreen`, `AudioPlayer`.
- Logic stores in `src/lib/stores/` (port of old composables): `gameState.svelte.ts`, `playerMovement.svelte.ts`, `labelStore.svelte.ts`. Player position/angle/moving are module-level shared state read in the render loop.
- `src/lib/constants/triggers.ts` defines `triggerZones`, `colliders`, stage/ramp geometry, palettes. Trigger positions must stay aligned with 3D object positions in `Environment.svelte` / `Npcs.svelte`.
- `src/lib/utils/interaction.ts` computes proximity (hypot dx,dz). `src/lib/services/api.ts` wraps `src/lib/api-client.ts` (real Express API).
- Inside the 3D tree, tenant data is read from the `$weddingConfig` store directly (not props); `World.svelte` only receives quality flags.

## Backend & Data
- Express API in `server/` (`server/index.js`), MySQL 8. Tenant resolved per request by host (`attachHostContext`, `middleware/tenant.js` `requirePublicInvitation`).
- Per-invitation settings live in `wedding_configs`. `preset` (`'3d_summer' | '2d_garden'`, default `3d_summer`) is exposed by `routes/config.js`, updated via `PATCH /api/my/config` (`routes/tenant-config.js`: zod enum + allowed-fields list), set on create in `routes/invitations.js`. Keep the TS union in `api-client.ts` in sync.
- Migrations: `database/migrations/NNN_snake_case.sql`, sequential. Must also be appended to the hardcoded array in `server/scripts/migrate.js`. The runner stores checksums: never edit an applied migration; add a new one. Write migrations idempotent (INFORMATION_SCHEMA checks, see `012_preset_theme.sql`).

## Interaction Contracts
- Same as the prior Nuxt repo: `triggerZones` define interactive locations; `action` matches `ModalType`; NPC zones require `npcData`.
- Opening `weddingStage` enables confetti; always close via `closeModal()` to reset modal, NPC data, and confetti.
- Guestbook entries are persisted via `/api/guestbook` (scoped to the tenant).

## 3D / Assets
- Character models are rigged glTF in `static/models/` (embedded, 17 clips each: Idle, Walk, Run, Jump, Victory, ...). Loaded via `useGltf` + `useGltfAnimations` from `@threlte/extras`.
- `Player.svelte` crossfades `Walk`/`Idle` based on `playerMoving` and updates position per frame via `useTask`.
- `Character.svelte` is the generic animated NPC (single clip).
- Asset provenance: characters, trees, bushes, grass, rocks, animals are free downloaded packs (`static/models/`, `static/nature/gltf/`, `Stylized_Nature/` has its own license file). Venue structures (carpet/aisle, light poles + `HangingLights`, stage/backdrop, bouquets, receptionist desk, mailbox, arch, mountains) are procedural Three.js primitives in `Environment.svelte` (AI-generated code). New venue decor should follow the same procedural toon style; only fall back to CC0 packs for complex models.
- Nature models are loaded by name from the merged `nature-pack.glb` (`Nature.svelte` `modelName`); adding a model to the pack means editing the file list in `scripts/build-nature-pack.cjs`.
- Vegetation/decor is deferred (`showDecor` after the loading overlay) and thinned in `lowPower`; keep new scenery off the critical `onReady` path.
- Venue layout: `threed/Environment.svelte` composes `venue/VenueCore.svelte` (shared gameplay layout), `venue/VenueOccluders.svelte` (camera proxies) and the venue's surroundings from the registry `src/lib/venues/index.ts` (theme for sky/fog/lighting + lazy `loadSurroundings`).
- Venues: `garden` (default) and `beach` (Pantai Sunset: `venues/beach/BeachSurroundings.svelte`, animated `Sea.svelte`, models from `static/nature/gltf/beach-pack.glb`). The venue comes from `wedding_configs.venue` (migration 015; server list `server/services/venues.js` must match `VenueId`). Dev-only `?venue=beach` forces a venue locally. Venue core colors are remapped through `theme.corePalette` (`c('#hex')` in VenueCore); garden uses no remap.
- `beach-pack.glb` is committed and rebuilt manually with `npm run build:beach` (sources in `assets/models/source/`, excluded from the Docker context). Third-party assets need an entry in `CREDITS.md` and in the venue's `credits` (shown in the stage modal).
- Draw-call budget ≤150. Wrap static, non-interactive procedural decor in `<StaticBatch>` (merges meshes per material after mount). Never put objects with events (mailbox `onclick`), animation, or late-mounted content (deferred `Nature`) inside it. Measure with `npm run perf:measure -- --label X --compare baseline` (dev server + API running).
- Multi-venue work (garden + beach) is planned in `PLAN_VENUE_3D.md`: shared `VenueCore` (gameplay layout identical across venues) + per-venue lazy-loaded surroundings + theme registry.
- Environment uses `MeshToonMaterial` with a 3-tone gradient map (`src/lib/utils/toonMaterial.ts`) + warm hemisphere/directional lighting + soft shadows + fog for the Summer Afternoon look.

## Build Config Notes
- `vite.config.ts`: `ssr.noExternal` includes three/@threlte packages; `optimizeDeps` includes three.
- three is browser-only; keep all Three/Threlte work inside `<Canvas>` / `onMount` / `browser` guards.

## Deploy & Branches
- Ops runbook: `deploy-docker-vps.md` (Docker Compose on VPS: `db`, `migrate`, `api`, `web`/Nginx; Cloudflare in front is required). Never run `docker compose down -v`.
- Branches: `new_staging` is the branch deployed live on the VPS. `staging` is an old, stale line (not deployed). `main` = stable release, `development` = experiments. Feature work goes on separate branches (e.g. `new_staging_refactor` for venues) and is merged into `new_staging` only when the user approves.
