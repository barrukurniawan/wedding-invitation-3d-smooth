<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { labelDefs, screenLabels } from '../../stores/labelStore.svelte'
  import { playerLabel } from '../../stores/gameState.svelte'
  import { playerMoving, playerPos } from '../../stores/playerMovement.svelte'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  const { camera, renderer } = useThrelte()
  const _v3 = new THREE.Vector3()

  // Label hanya terbaca saat mendekat; semakin jauh semakin memudar lalu hilang
  // supaya dunia tidak terlihat seperti scene editor yang penuh penanda.
  const LABEL_FULL = 9 // jarak di mana label tampil penuh
  const LABEL_MAX = 15 // jarak di mana label mulai memakai opacity dasar
  const LABEL_BASE_OPACITY = 0.34

  function opacityFor(distance: number): number {
    if (distance <= LABEL_FULL) return 1
    if (distance >= LABEL_MAX) return LABEL_BASE_OPACITY
    return LABEL_BASE_OPACITY + (1 - LABEL_BASE_OPACITY) * (1 - (distance - LABEL_FULL) / (LABEL_MAX - LABEL_FULL))
  }

  function buildParsedDefs() {
    const bride = $weddingConfig.bride_name || 'Kia'
    const groom = $weddingConfig.groom_name || 'Toni'
    return labelDefs.map(def => ({
      ...def,
      parsedText: def.text.replace(/{bride}/g, bride).replace(/{groom}/g, groom)
    }))
  }

  // Inisialisasi langsung (sinkron) supaya tersedia saat useTask pertama kali jalan
  let parsedDefs: any[] = buildParsedDefs()
  
  $effect(() => {
    // Re-parse saat nama mempelai berubah
    parsedDefs = buildParsedDefs()
    // Reset lastLength supaya store di-update ulang
    lastLength = -1
  })

  // Re-use objects (mencegah alokasi memori tiap milidetik)
  const activeLabels: { id: string; text: string; x: number; y: number; behind: boolean; opacity: number; objective: boolean }[] = []
  const labelPool: Record<string, any> = {}
  const labelElements: Record<string, HTMLElement> = {}
  let lastLength = -1; // -1 = force update pertama kali
  let elementsCached = false

  useTask(() => {
    const cam = camera.current
    const r = renderer
    if (!cam || !r) return
    const w = r.domElement.clientWidth
    const h = r.domElement.clientHeight
    
    // Cache DOM elements once
    if (!elementsCached) {
      for (const def of parsedDefs) {
        labelElements[def.id] = document.getElementById('label-' + def.id)!
      }
      labelElements['player'] = document.getElementById('label-player')!
      labelElements['receptionist-guide-arrow'] = document.getElementById('receptionist-guide-arrow')!
      elementsCached = true
    }
    
    activeLabels.length = 0 // Kosongkan array tanpa membuang referensinya

    for (let i = 0; i < parsedDefs.length; i++) {
      const def = parsedDefs[i]
      const dist = Math.hypot(def.world[0] - playerPos.x, def.world[2] - playerPos.z)
      const opacity = def.showBeforeMove || $playerMoving ? opacityFor(dist) : 0
      
      if (opacity <= 0) continue
      
      _v3.set(def.world[0], def.world[1], def.world[2])
      _v3.project(cam)
      const behind = _v3.z > 1
      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h
      
      let obj = labelPool[def.id]
      if (!obj) {
        obj = { id: def.id, text: def.parsedText, x, y, behind, opacity, objective: def.objective ?? false }
        labelPool[def.id] = obj
      } else {
        const el = labelElements[def.id]
        if (el) {
          el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 100%), 0)`
          el.style.opacity = behind ? '0' : opacity.toString()
        }
      }
      activeLabels.push(obj)
    }

    if ($playerLabel) {
      _v3.set(playerPos.x, playerPos.y + 2.35, playerPos.z)
      _v3.project(cam)
      const behind = _v3.z > 1
      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h
      
      let obj = labelPool['player']
      if (!obj) {
        obj = { id: 'player', text: $playerLabel, x, y, behind, opacity: 1, objective: false }
        labelPool['player'] = obj
      } else {
        const el = labelElements['player']
        if (el) {
          el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 100%), 0)`
          el.style.opacity = behind ? '0' : '1'
        }
      }
      activeLabels.push(obj)
    }

    // Hanya update Svelte store jika jumlah label berubah (misal saat inisialisasi)
    // Selebihnya, DOM di-update langsung via native JS di atas!
    if (activeLabels.length !== lastLength) {
      screenLabels.set([...activeLabels])
      lastLength = activeLabels.length
    }

    // Kalkulasi posisi screen resepsionis → update DOM langsung (zero-overhead, tanpa Svelte store)
    _v3.set(4.9, 2.45, -10)
    _v3.project(cam)
    const rx = (_v3.x * 0.5 + 0.5) * w
    const ry = (-_v3.y * 0.5 + 0.5) * h
    const rVisible = _v3.z < 1 && rx > -50 && rx < w + 50 && ry > -50 && ry < h + 50

    const arrowEl = labelElements['receptionist-guide-arrow']
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
