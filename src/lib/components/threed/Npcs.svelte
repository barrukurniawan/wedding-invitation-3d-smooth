<script lang="ts">
  import Character from './Character.svelte'

  const S = 0.62
  const STAGE_Y = 0.7

  const skinCream = { skin: '#f0c8a0', hair: '#3a2418' }
  const guideSkin = { skin: '#f5ede0', hair: '#3a2418', hat: '#5a4a3a' }
  const groom = { ...skinCream, clothes: '#ffffff', darkClothes: '#e8e8e8', band: '#d4af37', hair: '#1a1a1a' }
  const bride = { ...skinCream, clothes: '#ffffff', darkClothes: '#f5efe6', band: '#e8c4c4', hair: '#ffb340' }
</script>

<!-- Resepsionis -->
<Character
  url="/models/resepsionis.gltf"
  position={[0, 0, -4.9]}
  rotationY={0}
  scale={S}
  clip="Idle"
  appearance={skinCream}
/>

<!-- Pemandu -->
<Character
  url="/models/pemandu.gltf"
  position={[4, 0, -10]}
  rotationY={-Math.PI / 2}
  scale={S}
  clip="Idle"
  useNod={true}
  appearance={guideSkin}
/>

<!-- Pengantin wanita (Kia) -->
<Character
  url="/models/pengantin-wanita.gltf"
  position={[-0.72, STAGE_Y, -18.6]}
  rotationY={0.3}
  scale={S}
  clip="Victory"
  appearance={bride}
  weddingSkirt={true}
/>

<!-- Pengantin pria (Toni) -->
<Character
  url="/models/pengantin-pria.gltf"
  position={[0.72, STAGE_Y, -18.6]}
  rotationY={-0.3}
  scale={S}
  clip="Victory"
  appearance={groom}
/>
