<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { labelDefs, screenLabels } from '../../stores/labelStore.svelte'
  import { playerLabel } from '../../stores/gameState.svelte'
  import { playerPos } from '../../stores/playerMovement.svelte'

  const { camera, renderer } = useThrelte()
  const _v3 = new THREE.Vector3()

  useTask(() => {
    const cam = camera.current
    const r = renderer
    if (!cam || !r) return
    const w = r.domElement.clientWidth
    const h = r.domElement.clientHeight
    const labels: { id: string; text: string; x: number; y: number; behind: boolean }[] = []
    for (const def of labelDefs) {
      _v3.set(def.world[0], def.world[1], def.world[2])
      _v3.project(cam)
      const behind = _v3.z > 1
      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h
      labels.push({ id: def.id, text: def.text, x, y, behind })
    }

    if ($playerLabel) {
      _v3.set(playerPos.x, playerPos.y + 2.35, playerPos.z)
      _v3.project(cam)
      const behind = _v3.z > 1
      const x = (_v3.x * 0.5 + 0.5) * w
      const y = (-_v3.y * 0.5 + 0.5) * h
      labels.push({ id: 'player', text: $playerLabel, x, y, behind })
    }

    screenLabels.set(labels)
  })
</script>
