<script lang="ts">
  // Sekeliling venue "garden": tanah rumput, gunung, vegetasi Nature, dan hewan.
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { getToonGradient } from '../../../../utils/toonMaterial'
  import Nature from '../../Nature.svelte'
  import { GROUND_COLOR } from '../../../../constants/natureTheme'
  import { isLoaded } from '../../../../stores/gameState.svelte'
  import type { SurroundingsProps } from '../../../../venues'

  let { lowPower = false, renderQuality = 'desktop' }: SurroundingsProps = $props()

  let showDecor = $state(false)

  const gradient = getToonGradient()
  // lowPower: thinner vegetation density (less instance work after reveal)
  const sparseTrees = <T,>(items: T[]) =>
    items.filter((_, i) => i % (lowPower ? 12 : renderQuality === 'desktop-retina' ? 12 : 8) === 0)
  // Far Nature / animals after overlay dismiss (idle or short timeout).
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

  function createGroundGradient(reverse = false) {
    const width = 256
    const data = new Uint8Array(width * 4)
    let stops: THREE.Color[]
    if (GROUND_COLOR) {
      // Derive 4 stop dari warna dasar: jaga hue & saturasi, variasi lightness (gelap -> terang).
      const base = new THREE.Color(GROUND_COLOR)
      const hsl = { h: 0, s: 0, l: 0 }
      base.getHSL(hsl)
      const lightnesses = [0.38, 0.52, 0.66, 0.82]
      stops = lightnesses.map((l) => new THREE.Color().setHSL(hsl.h, hsl.s, l))
    } else {
      // Default: gradien pink (kompabilitas balik).
      stops = [
        new THREE.Color('#B92F59'),
        new THREE.Color('#E45178'),
        new THREE.Color('#F26B8A'),
        new THREE.Color('#FFB3C5')
      ]
    }

    for (let x = 0; x < width; x++) {
      const t = (reverse ? width - 1 - x : x) / (width - 1)
      const scaled = t * (stops.length - 1)
      const index = Math.min(Math.floor(scaled), stops.length - 2)
      const color = stops[index].clone().lerp(stops[index + 1], scaled - index)
      const offset = x * 4
      data[offset] = Math.round(color.r * 255)
      data[offset + 1] = Math.round(color.g * 255)
      data[offset + 2] = Math.round(color.b * 255)
      data[offset + 3] = 255
    }

    const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat)
    texture.colorSpace = THREE.LinearSRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }

  const pinkGradientLeft = createGroundGradient()
  const pinkGradientRight = createGroundGradient(true)

  const aisleFlowerBushes = Array.from({ length: 8 }, (_, i) => 7.5 - i * 2.8).flatMap((z, i) => [
    { position: [-2.5, 0.02, z] as [number, number, number], rotationY: i % 2 === 0 ? 0.12 : -0.12 },
    { position: [2.5, 0.02, z] as [number, number, number], rotationY: i % 2 === 0 ? 0.12 : -0.12 }
  ])
  const aisleCommonBushes = Array.from({ length: 7 }, (_, i) => 7.5 - i * 2.8 - 0.7).flatMap((z, i) => [
    { position: [-2.55, 0.02, z] as [number, number, number], rotationY: i % 2 === 0 ? -0.2 : 0.2, scale: 0.85 },
    { position: [2.55, 0.02, z] as [number, number, number], rotationY: i % 2 === 0 ? -0.2 : 0.2, scale: 0.85 }
  ])

  // === POHON — hutan padat di pinggir venue ===
  const treeLayerB = [
    [16, 0, -12, 0.36, -0.4], [-17, 0, -16, 0.38, 0.6],
    [-13, 0, -22, 0.4, 1.0], [13, 0, -22, 0.4, -0.5],
    [17, 0, 6, 0.35, 0.3],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pine (cemara tinggi) di latar belakang
  const pineLayer = [
    [-12, 0, -5, 0.4, 0.8], [12, 0, -5, 0.38, -1.0],
    [-11, 0, -15, 0.4, 0.5], [11, 0, -15, 0.42, -0.3],
    [-9, 0, -21, 0.38, 1.1], [9, 0, -21, 0.4, -0.7],
    [-14, 0, -25, 0.42, 0.4], [14, 0, -25, 0.4, -0.8],
    [0, 0, -27, 0.45, 0.2], [-7, 0, -28, 0.4, 1.2], [7, 0, -28, 0.42, -0.6],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pohon berdaun merah (autumn) — banyak, tersebar di venue
  const redLeafTrees = [
    [-16, 0, 4, 0.4, 0.5], [16, 0, 4, 0.38, -0.7], [-17, 0, -8, 0.42, 1.0],
    [-14, 0, 6, 0.36, 0.8], [14, 0, 6, 0.4, -0.5],
    [-13, 0, -2, 0.38, 0.3], [13, 0, -2, 0.4, -1.0],
    [-15, 0, -16, 0.36, 0.6], [15, 0, -16, 0.38, -0.4],
    [-10, 0, 8, 0.35, 0.9], [10, 0, 8, 0.37, -0.8],
    [-17, 0, -12, 0.34, 0.4], [17, 0, -12, 0.36, -0.6],
    [-11, 0, -20, 0.4, 0.7], [11, 0, -20, 0.38, -0.9],
    [-6, 0, 9, 0.36, 0.2], [6, 0, 9, 0.38, -0.3],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // === RUMPUT — tersebar padat di sepanjang jalan ===
  const grassTall = [
    [-6, 0, -8], [6, 0, -8], [-8, 0, -13], [8, 0, -13],
    [-7, 0, 2.5], [7, 0, 2.5], [-7.5, 0, -6], [7.5, 0, -6],
    [-7, 0, -12], [7, 0, -12], [-7.5, 0, -3], [7.5, 0, -3]
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.45 + (i % 3) * 0.08, rotationY: i * 0.7 }))

  const grassWispy = [
    [-6.5, 0, 1], [6.5, 0, 1], [-7, 0, -3], [7, 0, -3],
    [-7.5, 0, -10], [7.5, 0, -10]
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.38 + (i % 3) * 0.06, rotationY: i * 0.9 }))

  // === BUNGA — berkelompok di tepi jalan ===
  const flower3 = [
    [-7, 0, 3], [7, 0, 3], [-6.5, 0, -7], [6.5, 0, -7],
    [-7.5, 0, -12], [7.5, 0, -12],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.4, rotationY: i * 0.5 }))

  const flower4 = [
    [-7, 0, -11.5], [7, 0, -11.5], [-6.5, 0, -16.5], [6.5, 0, -16.5],
    [-7, 0, 4.5], [7, 0, 4.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.4, rotationY: i * 0.6 }))

  // === SEMAK & TANAMAN ===
  const bushes = [
    [-6.5, 0, 3.5], [6.5, 0, 3.5], [-6, 0, 0], [6, 0, 0],
    [-8.5, 0, -6], [8.5, 0, -6],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.5, rotationY: i * 0.5 }))

  const ferns = [
    [-9, 0, 6, 0.3], [9, 0, 6, 0.35], [-13, 0, -3, 0.3], [13, 0, -3, 0.3],
    [-15, 0, -13, 0.25], [15, 0, -13, 0.28],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[0] * 0.3 }))

  const plants = [
    [-7, 0, 4], [7, 0, 4], [-8, 0, -2], [8, 0, -2],
    [-7.5, 0, -9], [7.5, 0, -9],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.5, rotationY: i * 0.7 }))

  // === PEBBLE ===
  const pebbles = [
    [-7, 0, 3, 0.4], [7, 0, 3, 0.4],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 1.3 }))

  // === JAMUR ===
  const mushrooms = [
    [-7, 0, 0, 0.4], [7, 0, 0, 0.45], [-7.5, 0, -5, 0.4], [7.5, 0, -5, 0.35],
    [-9, 0, -11, 0.45], [9, 0, -11, 0.4], [-7, 0, -14, 0.35], [7, 0, -14, 0.4],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.8 }))

  // ============================================================
  // === TAMBAHAN: Vegetasi sisi kiri-kanan (hutan padat) ===
  // ============================================================

  // Pohon CommonTree tambahan di sisi
  const sideTreesLeft = [
    [-8, 0, 6, 0.4, 0.5], [-13, 0, -2, 0.38, 1.1], [-7, 0, -8, 0.42, 0.3],
    [-14, 0, -18, 0.36, -0.6], [-6, 0, 3, 0.4, 0.8],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const sideTreesRight = [
    [8, 0, 6, 0.42, -0.4], [13, 0, -2, 0.38, 0.9], [7, 0, -8, 0.4, -1.2],
    [14, 0, -18, 0.36, 0.5], [6, 0, 3, 0.4, -0.7],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pine tambahan di sisi
  const pineSidesLeft = [
    [-10, 0, -10, 0.38, 0.6], [-16, 0, -6, 0.4, -0.5], [-12, 0, -20, 0.42, 1.0],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const pineSidesRight = [
    [10, 0, -10, 0.38, -0.8], [16, 0, -6, 0.4, 0.4], [12, 0, -20, 0.42, -1.1],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // TwistedTree (sangat tinggi H=15-17, scale kecil 0.18-0.22)
  const twistedSidesLeft = [
    [-15, 0, -12, 0.18, 0.7], [-9, 0, -16, 0.2, -0.4],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const twistedSidesRight = [
    [15, 0, -12, 0.18, -0.8], [9, 0, -16, 0.2, 0.5],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pohon berdaun merah tambahan di sisi
  const redLeafSidesLeft = [
    [-11, 0, 1, 0.38, 0.6], [-13, 0, -14, 0.36, -0.9],
    [-9, 0, -5, 0.4, 0.3], [-12, 0, -9, 0.38, 0.8],
    [-7, 0, 4, 0.36, -0.4], [-14, 0, -18, 0.34, 0.5],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const redLeafSidesRight = [
    [11, 0, 1, 0.38, -0.5], [13, 0, -14, 0.36, 0.8],
    [9, 0, -5, 0.4, -0.3], [12, 0, -9, 0.38, -0.8],
    [7, 0, 4, 0.36, 0.4], [14, 0, -18, 0.34, -0.5],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pine berdaun merah
  const redPineLeft = [
    [-15, 0, -10, 0.38, 0.5], [-10, 0, -18, 0.4, -0.7],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const redPineRight = [
    [15, 0, -10, 0.38, -0.5], [10, 0, -18, 0.4, 0.7],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // TwistedTree_3 berdaun merah — BANYAK di kiri & kanan
  const redTwistedLeft = [
    [-16, 0, 2, 0.22, 0.4], [-8, 0, -12, 0.2, -0.6],
    [-12, 0, 6, 0.2, 0.9], [-15, 0, -5, 0.22, 0.3],
    [-10, 0, -2, 0.18, -0.8], [-17, 0, -14, 0.2, 0.5],
    [-9, 0, 8, 0.2, 0.2], [-13, 0, -20, 0.22, -0.4],
    [-7.5, 0, 3, 0.2, 0.6], [-14, 0, 0, 0.18, -0.3],
    [-11, 0, -16, 0.22, 0.8], [-7, 0, -6, 0.2, -0.5],
    [-16, 0, -8, 0.2, 0.7], [-9, 0, -16, 0.22, -0.2], [-13, 0, -4, 0.2, 0.5],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const redTwistedRight = [
    [16, 0, 2, 0.22, -0.4], [8, 0, -12, 0.2, 0.6],
    [12, 0, 6, 0.2, -0.9], [15, 0, -5, 0.22, -0.3],
    [10, 0, -2, 0.18, 0.8], [17, 0, -14, 0.2, -0.5],
    [9, 0, 8, 0.2, -0.2], [13, 0, -20, 0.22, 0.4],
    [7.5, 0, 3, 0.2, -0.6], [14, 0, 0, 0.18, 0.3],
    [11, 0, -16, 0.22, -0.8], [7, 0, -6, 0.2, 0.5],
    [16, 0, -8, 0.2, -0.7], [9, 0, -16, 0.22, 0.2], [13, 0, -4, 0.2, -0.5],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pohon berdaun merah dekat Kotak Ucapan (mailbox di [-5,0,-10])
  const mailboxTrees = [
    [-7.5, 0, -8, 0.2, 0.5], [-8.5, 0, -11, 0.22, -0.3], [-6.5, 0, -13, 0.2, 0.8],
    [-9, 0, -9, 0.18, -0.6], [-7, 0, -12, 0.2, 0.4],
    [-7, 0, -7, 0.2, 0.6], [-8.5, 0, -6, 0.22, -0.4], [-6, 0, -5, 0.2, 0.8],
    [-9.8, 0, -5.2, 0.19, -0.7], [-10.5, 0, -14.5, 0.22, 0.2], [-6.8, 0, -16.5, 0.2, 0.9],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pohon tambahan menyebar — KIRI (banyak)
  const extraTreesLeft = [
    [-9.5, 0, -7, 0.2, 0.3], [-10.5, 0, -10, 0.22, -0.5], [-8, 0, -14, 0.2, 0.7],
    [-11, 0, -8, 0.18, 0.9], [-7, 0, -15, 0.22, -0.3], [-9, 0, -12, 0.2, 0.5],
    [-10, 0, -6, 0.18, -0.7], [-12, 0, -3, 0.2, 0.4], [-8, 0, -2, 0.22, -0.8],
    [-13, 0, -6, 0.18, 0.6], [-11, 0, -13, 0.2, -0.2], [-6, 0, -8, 0.22, 0.3],
    [-14, 0, -4, 0.2, 0.7], [-9, 0, 6, 0.18, -0.5], [-15, 0, -2, 0.22, 0.4],
    [-7, 0, 5, 0.2, 0.8], [-12, 0, 2, 0.18, -0.6], [-16, 0, 0, 0.2, 0.3],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pohon tambahan menyebar — KANAN (banyak)
  const extraTreesRight = [
    [9.5, 0, -7, 0.2, -0.3], [10.5, 0, -10, 0.22, 0.5], [8, 0, -14, 0.2, -0.7],
    [11, 0, -8, 0.18, -0.9], [7, 0, -15, 0.22, 0.3], [9, 0, -12, 0.2, -0.5],
    [10, 0, -6, 0.18, 0.7], [12, 0, -3, 0.2, -0.4], [8, 0, -2, 0.22, 0.8],
    [13, 0, -6, 0.18, -0.6], [11, 0, -13, 0.2, 0.2], [6, 0, -8, 0.22, -0.3],
    [14, 0, -4, 0.2, -0.7], [9, 0, 6, 0.18, 0.5], [15, 0, -2, 0.22, -0.4],
    [7, 0, 5, 0.2, -0.8], [12, 0, 2, 0.18, 0.6], [16, 0, 0, 0.2, -0.3],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // Pohon (dari batu) — BANYAK di kiri & kanan
  const rockMed2Left = [
    [-7, 0, 2, 0.35, 0.3], [-12, 0, -3, 0.4, -0.5], [-9, 0, -8, 0.38, 0.8],
    [-14, 0, -10, 0.32, 0.2], [-7.5, 0, -14, 0.4, -0.6], [-11, 0, 6, 0.36, 0.4],
    [-15, 0, 4, 0.3, -0.3], [-8, 0, -18, 0.38, 0.7],
    [-6.5, 0, -5, 0.3, 0.4], [-8, 0, -1, 0.36, -0.8], [-10, 0, -15, 0.32, 0.6],
    [-13, 0, 2, 0.38, -0.2], [-16, 0, -3, 0.34, 0.9], [-7, 0, -20, 0.3, -0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.5 }))

  const rockMed2Right = [
    [7, 0, 2, 0.35, -0.3], [12, 0, -3, 0.4, 0.5], [9, 0, -8, 0.38, -0.8],
    [14, 0, -10, 0.32, -0.2], [7.5, 0, -14, 0.4, 0.6], [11, 0, 6, 0.36, -0.4],
    [15, 0, 4, 0.3, 0.3], [8, 0, -18, 0.38, -0.7],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.5 }))

  // Rumput pendek di sisi
  const grassShortLeft = [
    [-7, 0, 1, 0.45], [-8, 0, -3, 0.5], [-7, 0, -7, 0.42], [-8.5, 0, -10, 0.48],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.6 }))

  const grassShortRight = [
    [7, 0, 1, 0.45], [8, 0, -3, 0.5], [7, 0, -7, 0.42], [8.5, 0, -10, 0.48],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.7 }))

  const grassWispyShortLeft = [
    [-7, 0, -1, 0.4], [-7.5, 0, -8, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.9 }))

  const grassWispyShortRight = [
    [7, 0, -1, 0.4], [7.5, 0, -8, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.8 }))

  // Bunga tunggal di sisi
  const flowerSingleLeft = [
    [-7, 0, 3, 0.38], [-7.5, 0, -6, 0.4], [-7, 0, -11, 0.36], [-8, 0, 2, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.5 }))

  const flowerSingleRight = [
    [7, 0, 3, 0.38], [7.5, 0, -6, 0.4], [7, 0, -11, 0.36], [8, 0, 2, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.6 }))

  // Clover di sisi
  const cloversLeft = [
    [-7, 0, 0, 0.4], [-7.5, 0, -4, 0.42], [-7.5, 0, -9, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.7 }))

  const cloversRight = [
    [7, 0, 0, 0.4], [7.5, 0, -4, 0.42], [7.5, 0, -9, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.7 }))

  // Semak berbunga
  const bushFlowersLeft = [
    [-8, 0, 4, 0.5], [-9, 0, -7, 0.5], [-10, 0, -13, 0.48],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.5 }))

  const bushFlowersRight = [
    [8, 0, 4, 0.5], [9, 0, -7, 0.5], [10, 0, -13, 0.48],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.5 }))

  // Tanaman besar (H=3.76, scale 0.3)
  const plantBigLeft = [
    [-12, 0, -5, 0.3], [-11, 0, -17, 0.28],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.6 }))

  const plantBigRight = [
    [12, 0, -5, 0.3], [11, 0, -17, 0.28],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.6 }))

  const rockSidesRight = [
    [10, 0, 0, 0.35], [14, 0, -10, 0.3], [12, 0, -22, 0.32],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.4 }))

  // Pebble tambahan
  const pebbleSidesLeft = [
    [-4.5, 0, -2, 0.5], [-6, 0, -6, 0.55], [-5, 0, -10, 0.48], [-7, 0, -14, 0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 1.1 }))

  const pebbleSidesRight = [
    [5.5, 0, -2, 0.5], [6, 0, -6, 0.55], [5, 0, -10, 0.48], [7, 0, -14, 0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -1.2 }))

  // Jalur batu tepi jalan
  // Jamur Laetiporus
  const mushroomLaetiLeft = [
    [-9, 0, -1, 0.4], [-10, 0, -9, 0.35], [-9, 0, -13, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.8 }))

  const mushroomLaetiRight = [
    [9, 0, -1, 0.4], [10, 0, -9, 0.35], [9, 0, -13, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.8 }))


  // === POHON BERJAJAR di perbatasan venue (tepi kiri & kanan jalan) ===
  // Beri ruang dari tiang lampu di X=±4 agar batang dan kanopi tidak bertabrakan.
  const liningTreesLeft = [
    [-7, 0, 5, 0.4], [-7, 0, 1, 0.42], [-7, 0, -3, 0.4],
    [-7, 0, -7, 0.42], [-7, 0, -11, 0.4], [-7, 0, -15, 0.42],
    [-7, 0, -19, 0.4],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.3 }))

  const liningTreesRight = [
    [7, 0, 5, 0.42], [7, 0, 1, 0.4], [7, 0, -3, 0.42],
    [7, 0, -7, 0.4], [7, 0, -11, 0.42], [7, 0, -15, 0.4],
    [7, 0, -19, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.3 }))

  // === GUNUNG di belakang panggung — 3 lapis kedalaman ===
  // Lapisan jauh pucat & berkabut (fog meredupkannya), lapisan tengah sage,
  // lapisan dekat sedikit lebih gelap dengan silhouette bervariasi. Skala,
  // rotasi, dan jumlah segmen kerucut dibuat berbeda agar tidak repetitif.
  type Mtn = { x: number; y: number; z: number; r: number; h: number; seg: number }
  const mtnFar: Mtn[] = [
    { x: -20, y: 3.5, z: -31, r: 6, h: 9, seg: 4 }, { x: -8, y: 3, z: -33, r: 5, h: 8, seg: 5 },
    { x: 6, y: 3.5, z: -32, r: 7, h: 10, seg: 4 }, { x: 18, y: 3, z: -33, r: 6, h: 9, seg: 5 },
    { x: 26, y: 3.5, z: -35, r: 7, h: 11, seg: 4 }
  ]
  const mtnMid: Mtn[] = [
    { x: -16, y: 3, z: -27, r: 5, h: 8, seg: 5 }, { x: -4, y: 2.5, z: -28, r: 4.5, h: 7, seg: 6 },
    { x: 9, y: 3, z: -27, r: 5.5, h: 8, seg: 5 }, { x: 19, y: 2.5, z: -29, r: 5, h: 7, seg: 4 }
  ]
  const mtnNear: Mtn[] = [
    { x: -13, y: 2.5, z: -23, r: 3.5, h: 5.5, seg: 5 }, { x: 12, y: 2.5, z: -24, r: 3.8, h: 6, seg: 6 },
    { x: -2, y: 2, z: -25, r: 3.2, h: 5, seg: 4 }
  ]

  const stageBushes = [
    [-7.5, 0, -15.5, 0.5, 0.3], [7.5, 0, -15.5, 0.5, -0.3],
    [-7.5, 0, -20.5, 0.5, 0.5], [7.5, 0, -20.5, 0.5, -0.5],
    [-7.5, 0, -18, 0.48, 0.2], [7.5, 0, -18, 0.48, -0.2],
    [-8, 0, -17, 0.45, 0.4], [8, 0, -17, 0.45, -0.4],
  ].map((a) => ({ position: [a[0], a[1], a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  // === HEWAN ===
  const animalBunny = [{ position: [-5.5, 0, -3.5] as [number, number, number], rotationY: 0.8, scale: 0.6 }]
  const animalCat = [{ position: [5.5, 0, -8.5] as [number, number, number], rotationY: -1.2, scale: 0.6 }]
  const animalPanda = [{ position: [-5.5, 0, -12.5] as [number, number, number], rotationY: 0.3, scale: 0.6 }]
</script>

<!-- Ground: rumput kiri -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-15.3, -0.04, -12]}>
  <T.PlaneGeometry args={[23.4, 44]} />
  <T.MeshToonMaterial color="#ffffff" map={pinkGradientLeft} gradientMap={gradient} />
</T.Mesh>
<!-- Ground: rumput tengah (hijau muda, di bawah jalan) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.04, -12]}>
  <T.PlaneGeometry args={[7.2, 44]} />
  <T.MeshToonMaterial color="#a3c98f" gradientMap={gradient} />
</T.Mesh>
<!-- Ground: rumput kanan -->
<T.Mesh rotation.x={-Math.PI / 2} position={[15.3, -0.04, -12]}>
  <T.PlaneGeometry args={[23.4, 44]} />
  <T.MeshToonMaterial color="#ffffff" map={pinkGradientRight} gradientMap={gradient} />
</T.Mesh>

<!-- GUNUNG di belakang panggung — 3 lapis kedalaman (fog meredupkan lapisan jauh) -->
{#each mtnFar as m}
  <T.Group position={[m.x, m.y, m.z]}>
    <T.Mesh>
      <T.ConeGeometry args={[m.r, m.h, m.seg]} />
      <T.MeshToonMaterial color="#c9d3c2" gradientMap={gradient} />
    </T.Mesh>
  </T.Group>
{/each}
{#each mtnMid as m}
  <T.Group position={[m.x, m.y, m.z]}>
    <T.Mesh castShadow>
      <T.ConeGeometry args={[m.r, m.h, m.seg]} />
      <T.MeshToonMaterial color="#8aa890" gradientMap={gradient} />
    </T.Mesh>
  </T.Group>
{/each}
{#each mtnNear as m}
  <T.Group position={[m.x, m.y, m.z]}>
    <T.Mesh castShadow>
      <T.ConeGeometry args={[m.r, m.h, m.seg]} />
      <T.MeshToonMaterial color="#6f8b75" gradientMap={gradient} />
    </T.Mesh>
  </T.Group>
{/each}

<!-- VEGETASI deferred — not on critical ready path (pop-in after overlay OK) -->
{#if showDecor}
  <Nature modelName="Tree_4_A_Color1" scale={1.7} instances={[...sparseTrees(liningTreesLeft), ...sparseTrees(liningTreesRight), ...sparseTrees(redLeafSidesLeft), ...sparseTrees(redLeafSidesRight)]} />
  <Nature modelName="Bush_4_D_Color1" scale={1.3} instances={[...sparseTrees(pineLayer), ...sparseTrees(redPineLeft), ...sparseTrees(redPineRight), ...sparseTrees(redTwistedLeft), ...sparseTrees(redTwistedRight), ...sparseTrees(mailboxTrees), ...sparseTrees(extraTreesLeft), ...sparseTrees(extraTreesRight), ...sparseTrees(pineSidesLeft), ...sparseTrees(pineSidesRight)]} />
  <Nature modelName="Tree_1_A_Color1" scale={1.7} instances={[...sparseTrees(redLeafTrees), ...rockMed2Left, ...rockMed2Right, ...mushroomLaetiLeft, ...mushroomLaetiRight]} />
  <Nature modelName="Bush_1_A_Color1" scale={1.3} instances={[...grassTall, ...bushes, ...grassWispyShortRight, ...grassShortLeft, ...stageBushes]} />
  <Nature modelName="Bush_2_A_Color1" scale={1.3} instances={[...grassWispy, ...grassShortRight, ...grassWispyShortLeft, ...bushFlowersLeft, ...bushFlowersRight]} />
  <Nature modelName="Bush_4_F_Color1" scale={1.3} instances={[...mushrooms, ...rockSidesRight, ...pebbleSidesLeft, ...pebbleSidesRight]} />
  <Nature modelName="Bush_4_E_Color1" scale={1.5} instances={[...plantBigLeft, ...plantBigRight]} />
  <Nature modelName="Grass_2_A_Color1" scale={1.1} instances={flower3} />
  <Nature modelName="Grass_1_C_Color1" scale={1.1} instances={flower4} />
  <Nature modelName="Bush_3_A_Color1" scale={1.2} instances={ferns} />
  <Nature modelName="Bush_4_A_Color1" scale={1.2} instances={plants} />
  <Nature modelName="Tree_2_D_Color1" scale={1.7} instances={pebbles} />
  <Nature modelName="Tree_2_A_Color1" scale={1.7} instances={sparseTrees(sideTreesLeft)} />
  <Nature modelName="Tree_3_A_Color1" scale={1.7} instances={sparseTrees(sideTreesRight)} />
  <Nature modelName="Grass_1_A_Color1" scale={1.1} instances={flowerSingleLeft} />
  <Nature modelName="Grass_2_B_Color1" scale={1.1} instances={flowerSingleRight} />
  <Nature modelName="Grass_1_B_Color1" scale={1.0} instances={cloversLeft} />
  <Nature modelName="Grass_2_C_Color1" scale={1.0} instances={cloversRight} />
  <Nature
    url="/nature/gltf/Bush_Common_Flowers.gltf"
    scale={0.55}
    tint="#ffffff"
    materialColors={{ Flowers: '#FF8DA1' }}
    materialDuotones={{ Leaves_NormalTree: { light: '#F5EDD8', dark: '#D4BA8A' } }}
    instances={aisleFlowerBushes}
  />
  <Nature
    url="/nature/gltf/Bush_Common.gltf"
    scale={0.55}
    tint="#ffffff"
    instances={aisleCommonBushes}
  />
  {#if !lowPower}
    <Nature url="/nature/gltf/animal-bunny.glb" scale={0.6} instances={animalBunny} />
    <Nature url="/nature/gltf/animal-cat.glb" scale={0.6} instances={animalCat} />
    <Nature url="/nature/gltf/animal-panda.glb" scale={0.6} instances={animalPanda} />
  {/if}
{/if}
