<script lang="ts">
  import { T } from '@threlte/core'

  let { shadows = true }: { shadows?: boolean } = $props()

  // Pencahayaan hangat ala Summer Afternoon (sore hari)
  // HemisphereLight: langit hangat / tanah hijau lembut
  // DirectionalLight: matahari sore, soft shadow
  // AmbientLight: fill hangat rendah
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
  castShadow={shadows}
/>
