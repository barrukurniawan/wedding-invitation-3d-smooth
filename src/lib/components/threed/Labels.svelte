<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { labelDefs, screenLabels } from '../../stores/labelStore.svelte'
  import { playerLabel } from '../../stores/gameState.svelte'
  import { playerMoving, playerPos } from '../../stores/playerMovement.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  const { camera, renderer } = useThrelte()
  const _v3 = new THREE.Vector3()

  function opacityFor(distance: number, fullDist = 8, maxDist = 15): number {
    if (distance <= fullDist) return 1
    if (distance >= maxDist) return 0
    return (maxDist - distance) / (maxDist - fullDist)
  }

  function buildParsedDefs() {
    const bride = $weddingConfig.bride_name || 'Kia Anindya'
    const groom = $weddingConfig.groom_name || 'Toni Pratama'
    return labelDefs.map(def => ({
      ...def,
      parsedText: def.text.replace(/{bride}/g, bride).replace(/{groom}/g, groom)
    }))
  }

  let parsedDefs = buildParsedDefs()

  // Inisialisasi screenLabels store HANYA saat konfigurasi/nama berubah
  // sehingga Svelte merender elemen DOM sekali saja, tanpa re-render per frame.
  $effect(() => {
    parsedDefs = buildParsedDefs()
    const initial = parsedDefs.map(def => ({
      id: def.id,
      text: def.parsedText,
      x: -9999,
      y: -9999,
      behind: false,
      opacity: 0,
      objective: def.objective ?? false
    }))
    if ($playerLabel) {
      initial.push({
        id: 'player',
        text: $playerLabel,
        x: -9999,
        y: -9999,
        behind: false,
        opacity: 0,
        objective: false
      })
    }
    screenLabels.set(initial)

    // Reset DOM cache agar re-bind jika DOM dibuat ulang
    for (const key in labelElements) {
      delete labelElements[key]
    }
  })

  // Fast DOM element cache (referensi DOM langsung, lookup O(1) tanpa memicu DOM query berulang)
  const labelElements: Record<string, HTMLElement | null> = {}

  function getElement(id: string): HTMLElement | null {
    const existing = labelElements[id]
    if (existing && existing.isConnected) return existing
    const el = document.getElementById('label-' + id)
    if (el) labelElements[id] = el
    return el
  }

  useTask(() => {
    const cam = camera.current
    const r = renderer
    if (!cam || !r) return
    const w = r.domElement.clientWidth
    const h = r.domElement.clientHeight

    const moving = $playerMoving

    for (let i = 0; i < parsedDefs.length; i++) {
      const def = parsedDefs[i]
      const el = getElement(def.id)
      if (!el) continue

      const dist = Math.hypot(def.world[0] - playerPos.x, def.world[2] - playerPos.z)
      const isCouple = def.id === 'bride' || def.id === 'groom'
      const opacity = def.showBeforeMove || moving
        ? opacityFor(dist, isCouple ? 7 : 8, isCouple ? 12 : 16)
        : 0

      if (opacity <= 0) {
        if (el.style.opacity !== '0') el.style.opacity = '0'
        continue
      }

      _v3.set(def.world[0], def.world[1], def.world[2])
      _v3.project(cam)

      // Di belakang kamera (z > 1 dalam NDC space)
      if (_v3.z > 1) {
        if (el.style.opacity !== '0') el.style.opacity = '0'
        continue
      }

      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h

      el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 100%), 0)`
      const opStr = opacity.toString()
      if (el.style.opacity !== opStr) el.style.opacity = opStr
    }

    // Player label (jika ada)
    if ($playerLabel) {
      const el = getElement('player')
      if (el) {
        _v3.set(playerPos.x, playerPos.y + 2.35, playerPos.z)
        _v3.project(cam)
        if (_v3.z > 1) {
          if (el.style.opacity !== '0') el.style.opacity = '0'
        } else {
          const x = (_v3.x * 0.5 + 0.5) * w
          const y = (-_v3.y * 0.5 + 0.5) * h
          el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 100%), 0)`
          if (el.style.opacity !== '1') el.style.opacity = '1'
        }
      }
    }

    // Kalkulasi posisi screen resepsionis untuk guide arrow
    _v3.set(4.9, 2.45, -10)
    _v3.project(cam)
    const rx = (_v3.x * 0.5 + 0.5) * w
    const ry = (-_v3.y * 0.5 + 0.5) * h
    const rVisible = _v3.z < 1 && rx > -50 && rx < w + 50 && ry > -50 && ry < h + 50

    let arrowEl = labelElements['receptionist-guide-arrow']
    if (!arrowEl || !arrowEl.isConnected) {
      arrowEl = document.getElementById('receptionist-guide-arrow')
      if (arrowEl) labelElements['receptionist-guide-arrow'] = arrowEl
    }

    if (arrowEl) {
      if (!rVisible) {
        const cx = w / 2
        const cy = h / 2
        const angle = Math.atan2(ry - cy, rx - cx) * (180 / Math.PI) + 90
        arrowEl.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-38vmin)`
        arrowEl.style.display = 'flex'
      } else {
        arrowEl.style.display = 'none'
      }
    }
  })
</script>
