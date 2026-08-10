import { writable, derived } from 'svelte/store'

/** player + receptionist + environment critical + pengantin-pria + pengantin-wanita */
export const CRITICAL_TOTAL = 5

export const loadDone = writable(0)
export const fakeProgress = writable(0)
export const realPhase = writable(false)

let fakeTimer: ReturnType<typeof setInterval> | null = null

export function startFakeProgress() {
  if (fakeTimer) return
  fakeProgress.set(0)
  realPhase.set(false)
  fakeTimer = setInterval(() => {
    fakeProgress.update((value) => Math.min(0.6, value + (value < 0.35 ? 0.018 : 0.006)))
  }, 180)
}

export function beginRealProgress() {
  if (fakeTimer) clearInterval(fakeTimer)
  fakeTimer = null
  fakeProgress.set(0.6)
  realPhase.set(true)
}

export function stopFakeProgress() {
  if (fakeTimer) clearInterval(fakeTimer)
  fakeTimer = null
}

export function completeProgress() {
  if (fakeTimer) clearInterval(fakeTimer)
  fakeTimer = null
  fakeProgress.set(1)
  realPhase.set(true)
}

export function bumpCriticalLoaded(count = 1) {
	loadDone.update((n) => Math.min(CRITICAL_TOTAL, n + count))
}

export function resetLoadProgress() {
	stopFakeProgress()
	loadDone.set(0)
	fakeProgress.set(0)
	realPhase.set(false)
}

export const loadProgress = derived([loadDone, fakeProgress, realPhase], ([done, fake, real]) =>
	real ? 0.6 + Math.min(1, done / CRITICAL_TOTAL) * 0.4 : fake
)
