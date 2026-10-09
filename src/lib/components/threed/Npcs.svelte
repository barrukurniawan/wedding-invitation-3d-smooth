<script lang="ts">
  import Character from './Character.svelte'
  import { nearbyTrigger, openModal } from '../../stores/gameState.svelte'

  let {
    loadWeddingCouple = true,
    onReceptionistReady,
    onGroomReady,
    onBrideReady,
    onError,
  }: {
    loadWeddingCouple?: boolean
    onReceptionistReady?: () => void
    onGroomReady?: () => void
    onBrideReady?: () => void
    onError?: () => void
  } = $props()

  const S = 0.62
  const STAGE_Y = 0.7

  // Gerakan pengantin: 'Wave' (melambai ke tamu; wanita tangan kanan, pria tangan kiri)
  // atau 'Victory' (dua tangan terangkat). Keduanya ada di model; ganti di sini.
  // Dev-only: `?gesture=victory` / `?gesture=wave` untuk membandingkan langsung.
  type CoupleGesture = 'Wave' | 'Victory'
  const COUPLE_GESTURE: CoupleGesture = 'Wave'
  const devGesture = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('gesture') : null
  const coupleClip: CoupleGesture = devGesture === 'victory' ? 'Victory' : devGesture === 'wave' ? 'Wave' : COUPLE_GESTURE

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
  onError={onError}
  onClick={() => {
    if ($nearbyTrigger?.id === 'receptionist') {
      openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
    }
  }}
/>

{#if loadWeddingCouple}
  <!-- Pengantin wanita (Kia) -->
  <Character
    url="/models/pengantin-wanita.glb"
    position={[-0.72, STAGE_Y, -18.6]}
    rotationY={0.3}
    scale={S}
    clip={coupleClip}
    appearance={bride}
    weddingSkirt={true}
    bridalVeil={true}
    onReady={onBrideReady}
    onError={onError}
    onClick={() => {
      if ($nearbyTrigger?.id === 'weddingStage') {
        openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
      }
    }}
  />

  <!-- Pengantin pria (Toni) -->
  <Character
    url="/models/pengantin-pria.glb"
    position={[0.72, STAGE_Y, -18.6]}
    rotationY={-0.3}
    scale={S}
    clip={coupleClip}
    appearance={groom}
    onReady={onGroomReady}
    onError={onError}
    onClick={() => {
      if ($nearbyTrigger?.id === 'weddingStage') {
        openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
      }
    }}
  />
{/if}
