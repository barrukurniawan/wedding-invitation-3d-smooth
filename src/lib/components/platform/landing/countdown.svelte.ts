// Hitung mundur reaktif ke satu tanggal ISO. Dipakai di nav (ringkas) dan strip promo (besar).
import { splitRemaining, type CountdownParts } from './format'

export class Countdown {
  now = $state(Date.now())
  #target: () => string | null

  constructor(target: () => string | null) {
    this.#target = target
  }

  // Panggil di onMount; mengembalikan fungsi pembersih.
  start(intervalMs = 1000) {
    const id = setInterval(() => (this.now = Date.now()), intervalMs)
    return () => clearInterval(id)
  }

  get target(): number | null {
    const iso = this.#target()
    if (!iso) return null
    const t = new Date(iso).getTime()
    return Number.isNaN(t) ? null : t
  }

  get parts(): CountdownParts | null {
    const t = this.target
    return t == null ? null : splitRemaining(t - this.now)
  }

  // Masih berjalan: ada target dan belum habis.
  get active(): boolean {
    return (this.parts?.total ?? 0) > 0
  }
}
