<script lang="ts">
  import * as THREE from 'three'
  import { useTask, useThrelte } from '@threlte/core'
  import { SoftShadows } from '@threlte/extras'
  import CameraRig from './CameraRig.svelte'
  import Lighting from './Lighting.svelte'
  import Environment from './Environment.svelte'
  import Player from './Player.svelte'
  import Npcs from './Npcs.svelte'
  import Confetti from './Confetti.svelte'
  import Labels from './Labels.svelte'
  import { tick, playerPos } from '../../stores/playerMovement.svelte'
  import { setNearbyTrigger, confettiActive } from '../../stores/gameState.svelte'
  import { getNearbyTrigger } from '../../utils/interaction'

  const { scene } = useThrelte()

  // Background langit hangat + fog lembut ala Summer Afternoon
  $effect(() => {
    scene.background = new THREE.Color('#bfe3f0')
    scene.fog = new THREE.Fog('#fcd9a0', 18, 54)
  })

  // Render loop utama: gerakan -> deteksi proximity
  useTask(() => {
    tick()
    setNearbyTrigger(getNearbyTrigger(playerPos.x, playerPos.z))
  })
</script>

<SoftShadows size={28} samples={12} focus={0.6} />

<CameraRig />
<Lighting />
<Environment />
<Player appearance={{ skin: '#f0c8a0', hair: '#1a1a1a', black: '#1a1a1a', shirt: '#ffffff', details: '#d4af37', shoes: '#1a1a1a' }} />
<Npcs />
<Confetti />
<Labels />
