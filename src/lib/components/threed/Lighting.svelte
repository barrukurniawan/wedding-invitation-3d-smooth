<script lang="ts">
  import { T } from '@threlte/core'
  import type { VenueTheme } from '../../venues'

  let { lighting }: { lighting: VenueTheme['lighting'] } = $props()
</script>

<T.HemisphereLight
  color={lighting.hemisphere.sky}
  groundColor={lighting.hemisphere.ground}
  intensity={lighting.hemisphere.intensity}
/>

<T.AmbientLight color={lighting.ambient.color} intensity={lighting.ambient.intensity} />

<T.DirectionalLight
  position={lighting.sun.position}
  intensity={lighting.sun.intensity}
/>
