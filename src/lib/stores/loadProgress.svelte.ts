import { writable, derived } from 'svelte/store'

/** player + 4 NPC + environment critical */
export const CRITICAL_TOTAL = 6

export const loadDone = writable(0)

export function bumpCriticalLoaded(count = 1) {
	loadDone.update((n) => Math.min(CRITICAL_TOTAL, n + count))
}

export function resetLoadProgress() {
	loadDone.set(0)
}

export const loadProgress = derived(loadDone, (done) =>
	Math.min(1, done / CRITICAL_TOTAL)
)
