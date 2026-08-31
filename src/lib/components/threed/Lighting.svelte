<script lang="ts">
  import { onMount } from 'svelte'
  import { T } from '@threlte/core'
  import * as THREE from 'three'

  let { lowPower = false }: { lowPower?: boolean } = $props()

  let shadowMapSize = $state(512)
  let enableShadow = $state(!lowPower)

  onMount(() => {
    // Only enable shadows on desktop (non-lowPower)
    enableShadow = !lowPower
  })
</script>

<T.HemisphereLight
  color="#ffe8c4"
  groundColor="#6a8b5a"
  intensity={2.0}
/>

<T.AmbientLight color="#fff3dd" intensity={0.5} />

<T.DirectionalLight
  position={[-12, 20, 8]}
  intensity={2.0}
  castShadow={enableShadow}
  shadow.mapSize={shadowMapSize}
  shadow.camera.near={0.5}
  shadow.camera.far={50}
  shadow.camera.left={-20}
  shadow.camera.right={20}
  shadow.camera.top={20}
  shadow.camera.bottom={-20}
  shadow.bias={-0.0005}
  shadow.normalBias={0.02}
/>
