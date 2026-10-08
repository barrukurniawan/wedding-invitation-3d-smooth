<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { setOccluderGroup } from '../../../stores/cameraOccluders.svelte'
  import { ARCH_POST_X, ARCH_Z } from '../../../constants/triggers'

  let occluders = $state<THREE.Group>()
  $effect(() => setOccluderGroup(occluders ?? null))
</script>

<!-- Proxy collision untuk kamera (invisible). Hanya grup ini yang
     di-raycast CameraRig — bukan seluruh scene — agar tidak membebani memori.
     Koordinat dunia; material diperlukan agar Mesh.raycast berfungsi. -->
<T.Group bind:ref={occluders}>
  <!-- Panggung -->
  <T.Mesh position={[0, 0.35, -18]} visible={false}>
    <T.BoxGeometry args={[10.5, 0.7, 4.8]} />
    <T.MeshBasicMaterial />
  </T.Mesh>
  <!-- Tiang arch kiri/kanan -->
  <T.Mesh position={[-ARCH_POST_X, 2.0, ARCH_Z]} visible={false}>
    <T.BoxGeometry args={[0.4, 4.0, 0.4]} />
    <T.MeshBasicMaterial />
  </T.Mesh>
  <T.Mesh position={[ARCH_POST_X, 2.0, ARCH_Z]} visible={false}>
    <T.BoxGeometry args={[0.4, 4.0, 0.4]} />
    <T.MeshBasicMaterial />
  </T.Mesh>
  <!-- Meja resepsionis (dirotasi 90° → footprint dunia: z lebar, x sempit) -->
  <T.Mesh position={[4, 0.5, -10]} visible={false}>
    <T.BoxGeometry args={[0.9, 1.0, 2.7]} />
    <T.MeshBasicMaterial />
  </T.Mesh>
  <!-- Kotak ucapan sengaja tidak menjadi occluder kamera agar spring-arm tidak
       zoom jitter saat pemain mendekat dari sisi depan maupun belakang. -->
</T.Group>
