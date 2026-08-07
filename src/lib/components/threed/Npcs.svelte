<script lang="ts">
  import Character from './Character.svelte'

  let {
    loadWeddingCouple = false,
    onReceptionistReady,
    onCoupleReady,
  }: {
    loadWeddingCouple?: boolean
    onReceptionistReady?: () => void
    onCoupleReady?: () => void
  } = $props()
  let coupleReadyCount = 0

  function markCoupleReady() {
    coupleReadyCount += 1
    if (coupleReadyCount === 2) onCoupleReady?.()
  }

  const S = 0.62
  const STAGE_Y = 0.7

  const skinCream = { skin: '#f0c8a0', hair: '#3a2418' }
  const staffUniform = {
    clothes: '#fffaf2',
    pants: '#fffaf2',
    detail: '#7a1f35',
    shoes: '#7a1f35'
  }
  const receptionist = { ...skinCream, ...staffUniform }
  const groom = { ...skinCream, clothes: '#ffffff', darkClothes: '#e8e8e8', band: '#d4af37', hair: '#1a1a1a' }
  const bride = { ...skinCream, clothes: '#ffffff', darkClothes: '#f5efe6', band: '#e8c4c4', hair: '#ffb340' }
</script>

<!-- Resepsionis -->
<Character
  url="/models/resepsionis.glb"
  position={[4.9, 0, -10]}
  rotationY={-Math.PI / 2}
  scale={S}
  clip="Idle"
  useNod={true}
  appearance={receptionist}
  onReady={onReceptionistReady}
/>

{#if loadWeddingCouple}
  <!-- Pengantin wanita (Kia) -->
  <Character
    url="/models/pengantin-wanita.glb"
    position={[-0.72, STAGE_Y, -18.6]}
    rotationY={0.3}
    scale={S}
    clip="Victory"
    appearance={bride}
    weddingSkirt={true}
    bridalVeil={true}
    onReady={markCoupleReady}
  />

  <!-- Pengantin pria (Toni) -->
  <Character
    url="/models/pengantin-pria.glb"
    position={[0.72, STAGE_Y, -18.6]}
    rotationY={-0.3}
    scale={S}
    clip="Victory"
    appearance={groom}
    onReady={markCoupleReady}
  />
{/if}
