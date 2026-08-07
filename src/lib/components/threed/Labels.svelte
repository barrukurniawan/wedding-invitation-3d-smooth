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

  useTask(() => {
    const cam = camera.current
    const r = renderer
    if (!cam || !r) return
    const w = r.domElement.clientWidth
    const h = r.domElement.clientHeight
    const labels: { id: string; text: string; x: number; y: number; behind: boolean; opacity: number; objective: boolean }[] = []
    
    const bride = $weddingConfig.bride_name || 'Kia'
    const groom = $weddingConfig.groom_name || 'Toni'

    for (const def of labelDefs) {
      const dist = Math.hypot(def.world[0] - playerPos.x, def.world[2] - playerPos.z)
      const opacity = def.showBeforeMove || $playerMoving ? opacityFor(dist) : 0
      if (opacity <= 0) continue
      _v3.set(def.world[0], def.world[1], def.world[2])
      _v3.project(cam)
      const behind = _v3.z > 1
      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h
      
      const text = def.text.replace(/{bride}/g, bride).replace(/{groom}/g, groom)
      labels.push({ id: def.id, text, x, y, behind, opacity, objective: def.objective ?? false })
    }

    if ($playerLabel) {
      _v3.set(playerPos.x, playerPos.y + 2.35, playerPos.z)
      _v3.project(cam)
      const behind = _v3.z > 1
      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h
      labels.push({ id: 'player', text: $playerLabel, x, y, behind, opacity: 1, objective: false })
    }

    screenLabels.set(labels)
  })
</script>
