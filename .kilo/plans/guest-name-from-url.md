# Plan: Guest name from `?send=` URL query param

## Context (verified)
- Greeting lives in `WeddingStageModal.svelte:65`: `<p>Halo, {$guestName}.</p>`
- `guestName` store default = `'Tamu Undangan'` (`gameState.svelte.ts:10`).
- `setGuestName(name)` already exists (`gameState.svelte.ts:32`): trims, falls back to `'Tamu Undangan'` if empty.
- `App.svelte` `onMount` is the established init point (already calls `loadConfig()`). `ssr=false` + `prerender=true` → client-only, safe to read `window`.
- Only hardcoded "Tamu Undangan" occurrences are in `gameState.svelte.ts` (default + setGuestName fallback) — no other greeting sites.

## Decisions
1. **Format = query param `?send=`** (NOT path `/send=...`). A path-style URL 404s under SvelteKit routing; query param is correct. (User already corrected to `?send=` in the latest message.)
2. **Auto Title Case per word** — matches user's example `adinda rahma` → "Adinda Rahma". Implement minimal: split on whitespace, capitalize first char of each token, lowercase rest of token. Simple + sufficient.
3. **Robust parse** — wrap param read in `try/catch` because `URLSearchParams`/`decodeURIComponent` throw on malformed percent-encoding. On any error → fall back to default name (no crash).
4. **Empty / whitespace-only `?send=`** → default `'Tamu Undangan'` (setGuestName already handles this).

## Vite dev limitation (NOT fixable in app code)
- URL with malformed percent-encoding (e.g. `%s`, `%zz`) crashes Vite's `viteTransformMiddleware` via `decodeURI` BEFORE the Svelte app loads. This is an upstream Vite dev-server behavior; no app-code or vite.config option reliably prevents it. Setting `server.hmr.overlay = false` only hides the error UI, the page still fails to load.
- **Implication:** the feature works for valid URLs. Malformed `%` is a dev-only artifact; production (static build served by Nginx) handles/rejects bad encoding at the server, so it's not a production concern.
- Document this in the plan only — do NOT attempt to patch Vite.

## Task list

### 1. `src/App.svelte` — read `?send=` on mount
- Import `setGuestName` from `./lib/stores/gameState.svelte`.
- In the existing `onMount` block, after `loadConfig()`:
  ```ts
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('send')
    if (raw) {
      const titleCased = raw.trim().split(/\s+/).map((w) =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ')
      setGuestName(titleCased)
    }
  } catch {
    // Malformed percent-encoding in dev — keep default guest name.
  }
  ```
- `setGuestName` already guards empty → default, so no extra guard needed.

### 2. No change to `gameState.svelte.ts`
- `setGuestName` already trims + falls back. Title-casing handled at call site to keep store logic unchanged.

### 3. No change to `WeddingStageModal.svelte`
- Already renders `{$guestName}`; once the store is set, greeting updates automatically.

## Validation
- `npm run check` → 0 errors.
- Manual (dev): `?send=adinda%20rahma` → open stage dialog → greeting reads "Halo, Adinda Rahma.".
- `?send=` (empty) → "Halo, Tamu Undangan."
- No param → "Halo, Tamu Undangan." (default unchanged).
- Known limitation: `?send=agus%supriyatna` (malformed `%s`) → Vite dev crash (expected, documented above).

## Out of scope
- Pre-filling the GuestbookModal name input from the URL name (user only asked for the stage greeting). Can be added later if desired.
- Any Vite middleware patching for malformed URLs.
