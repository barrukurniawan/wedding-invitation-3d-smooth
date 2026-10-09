<script lang="ts">
  // Sekeliling venue "beach" (Pantai Sunset): pasir, laut, matahari terbenam,
  // kelapa & dekorasi pantai dari beach-pack.glb (CC-BY-4.0, lihat CREDITS.md).
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { getToonGradient } from '../../../../utils/toonMaterial'
  import Nature from '../../Nature.svelte'
  import StaticBatch from '../../StaticBatch.svelte'
  import Sea from './Sea.svelte'
  import { isLoaded } from '../../../../stores/gameState.svelte'
  import type { SurroundingsProps } from '../../../../venues'

  let { lowPower = false, renderQuality = 'desktop' }: SurroundingsProps = $props()

  const PACK = '/nature/gltf/beach-pack.glb'
  const SHORE_Z = -25
  // Pasir dari depan spawn (z=+10) sampai bibir pantai.
  const SAND_LENGTH = 10 - SHORE_Z
  const SAND_CENTER_Z = (10 + SHORE_Z) / 2

  const gradient = getToonGradient()
  let showDecor = $state(false)

  // lowPower: kurangi kepadatan pohon (sama dengan pola garden).
  const sparse = <T,>(items: T[]) =>
    lowPower || renderQuality === 'desktop-retina' ? items.filter((_, i) => i % 2 === 0) : items

  // Vegetasi & dekorasi muncul setelah overlay loading hilang (tidak di jalur kritis).
  $effect(() => {
    if (!$isLoaded || showDecor) return
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => {
        showDecor = true
      }, { timeout: renderQuality === 'desktop-retina' ? 700 : 100 })
    } else {
      setTimeout(() => {
        showDecor = true
      }, renderQuality === 'desktop-retina' ? 700 : 60)
    }
  })

  // Gradasi pasir melintang: lebih hangat dekat jalur, lebih terang ke tepi.
  function createSandGradient(reverse = false) {
    const stops = ['#e3c08b', '#ebcd9c', '#f2dcb2', '#f8e9cc'].map((hex) => new THREE.Color(hex))
    const width = 256
    const data = new Uint8Array(width * 4)
    for (let x = 0; x < width; x++) {
      const t = (reverse ? width - 1 - x : x) / (width - 1)
      const scaled = t * (stops.length - 1)
      const index = Math.min(Math.floor(scaled), stops.length - 2)
      const color = stops[index].clone().lerp(stops[index + 1], scaled - index)
      data.set([color.r * 255, color.g * 255, color.b * 255, 255].map(Math.round), x * 4)
    }
    const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat)
    texture.colorSpace = THREE.LinearSRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }
  const sandLeft = createSandGradient(true)
  const sandRight = createSandGradient()

  type Instance = { position: [number, number, number]; rotationY?: number; scale?: number }
  const at = (x: number, z: number, rotationY = 0, scale = 1): Instance => ({ position: [x, 0, z], rotationY, scale })

  // === KELAPA — berjajar renggang di batas venue (|X|≈7.5) + rumpun di sisi luar ===
  const palmsLining = [4, -4, -12, -19].flatMap((z, i) => [
    at(-7.6, z, 0.4 + i * 1.3, 0.85 + (i % 3) * 0.08),
    at(7.6, z + 1, -0.6 - i * 1.1, 0.88 + ((i + 1) % 3) * 0.07)
  ])
  const palmsOuter = [
    at(-12, 5, 1.2, 1.0), at(12.5, 3, -2.1, 0.95), at(-14, -6, 2.6, 1.1), at(15, -5, -0.4, 1.05),
    at(-16.5, -14, -1.4, 1.1), at(16, -14, 1.9, 0.95), at(-18, 1, 2.0, 1.0), at(18.5, -1, -1.0, 1.1),
    at(-6.8, -22.8, 1.5, 0.9), at(6.8, -23.2, -1.2, 0.9)
  ]
  // Bagi rata ke beberapa variasi kelapa supaya tidak seragam. Tiap variasi =
  // draw call tambahan, jadi pilih yang paling berbeda saja (anggaran ≤150).
  const palmVariants = ['Beach_Palm_1', 'Beach_Palm_2', 'Beach_Palm_4', 'Beach_Palm_6']
  const palmsByVariant = palmVariants.map((name, v) => ({
    name,
    instances: sparse([...palmsLining, ...palmsOuter]).filter((_, i) => i % palmVariants.length === v)
  }))
  // Kelapa miring (Palm_5) condong ke luar venue di dekat bibir pantai.
  const leaningPalms = [at(-9, -23.5, Math.PI * 0.15, 0.9), at(9.5, -23.8, Math.PI * 1.1, 0.95)]

  // === DEKORASI PANTAI di sisi luar jalur ===
  // Satu variasi dipakai berulang (instancing) supaya draw call tetap hemat.
  const umbrellas = [
    { name: 'Beach_Umbrella_1', instances: [at(-11.5, -3.5, 0.3), at(-12.5, -15.5, 1.1)] },
    { name: 'Beach_Umbrella_3', instances: [at(12, -8.5, -0.5)] }
  ]
  const chairs = [
    { name: 'Beach_Chair_1', instances: [at(-10.5, -5, -0.3), at(13.2, -10, 0.4), at(-12.6, -5.2, 0.2), at(-11.2, -17.2, -0.5)] }
  ]
  const towels = [
    { name: 'Beach_Towel_1', instances: [at(10.8, -6.8, 0.6), at(-13.8, -14.2, -0.3)] },
    { name: 'Beach_Towel_3', instances: [at(-9.6, -1.8, 0.9)] }
  ]
  const surfboards = [
    { name: 'Beach_Surfboard_1', instances: [at(14.2, -18.2, 0.3)] },
    { name: 'Beach_Surfboard_2', instances: [at(15.1, -18.6, -0.4)] }
  ]
  const rocks = [at(-10, -24, 0.4, 1.1), at(13.5, -24.5, 2.0, 0.9), at(-16, -23.5, 1.2, 1.3), at(4.5, -24.6, 0.8, 0.6)]
  const tower = [at(17.5, -20.5, -0.5)]
  // Di laut: yacht dan pelampung.
  const yacht = [at(-16, -46, 1.1)]
  const floats = [{ name: 'Beach_Float_1', instances: [at(7, -29, 0.4), at(-5.5, -31, 1.2)] }]

  // Semak bunga di tepi jalur (sama dengan garden), bunga bernuansa coral.
  const aisleFlowerBushes = Array.from({ length: 8 }, (_, i) => 7.5 - i * 2.8).flatMap((z, i) => [
    { position: [-2.5, 0.02, z] as [number, number, number], rotationY: i % 2 === 0 ? 0.12 : -0.12 },
    { position: [2.5, 0.02, z] as [number, number, number], rotationY: i % 2 === 0 ? 0.12 : -0.12 }
  ])
</script>

<StaticBatch>
  <!-- Pasir kiri / tengah / kanan -->
  <T.Mesh rotation.x={-Math.PI / 2} position={[-15.3, -0.04, SAND_CENTER_Z]}>
    <T.PlaneGeometry args={[23.4, SAND_LENGTH]} />
    <T.MeshToonMaterial color="#ffffff" map={sandLeft} gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.04, SAND_CENTER_Z]}>
    <T.PlaneGeometry args={[7.2, SAND_LENGTH]} />
    <T.MeshToonMaterial color="#e3c08b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[15.3, -0.04, SAND_CENTER_Z]}>
    <T.PlaneGeometry args={[23.4, SAND_LENGTH]} />
    <T.MeshToonMaterial color="#ffffff" map={sandRight} gradientMap={gradient} />
  </T.Mesh>
  <!-- Pasir basah di bibir pantai -->
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.035, SHORE_Z + 1.2]}>
    <T.PlaneGeometry args={[54, 2.4]} />
    <T.MeshToonMaterial color="#d6b07c" gradientMap={gradient} />
  </T.Mesh>
</StaticBatch>

<Sea shoreZ={SHORE_Z} />

<!-- Matahari terbenam di kiri pelaminan; tidak terkena kabut supaya tetap bersinar. -->
<T.Mesh position={[-26, 13, -96]}>
  <T.CircleGeometry args={[11, 40]} />
  <T.MeshBasicMaterial color="#ffd9a3" transparent opacity={0.35} fog={false} toneMapped={false} />
</T.Mesh>
<T.Mesh position={[-26, 13, -95.9]}>
  <T.CircleGeometry args={[7, 40]} />
  <T.MeshBasicMaterial color="#ffe7bf" fog={false} toneMapped={false} />
</T.Mesh>

{#if showDecor}
  {#each palmsByVariant as palm (palm.name)}
    <Nature url={PACK} modelName={palm.name} tint="#ffffff" instances={palm.instances} />
  {/each}
  <Nature url={PACK} modelName="Beach_Palm_5" tint="#ffffff" instances={leaningPalms} />
  {#each [...umbrellas, ...chairs, ...towels, ...surfboards, ...floats] as item (item.name)}
    <Nature url={PACK} modelName={item.name} tint="#ffffff" instances={item.instances} />
  {/each}
  <Nature url={PACK} modelName="Beach_Rocks" tint="#ffffff" instances={rocks} />
  <Nature url={PACK} modelName="Beach_Lifeguard_Tower" tint="#ffffff" instances={tower} />
  <Nature url={PACK} modelName="Beach_Yacht" tint="#ffffff" instances={yacht} />
  <Nature
    url="/nature/gltf/Bush_Common_Flowers.gltf"
    scale={0.55}
    tint="#ffffff"
    materialColors={{ Flowers: '#FF8A73' }}
    materialDuotones={{ Leaves_NormalTree: { light: '#F5EDD8', dark: '#D4BA8A' } }}
    instances={aisleFlowerBushes}
  />
{/if}
