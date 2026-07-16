<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { getToonGradient } from '../../utils/toonMaterial'
  import Nature from './Nature.svelte'

  const gradient = getToonGradient()
  const sparseTrees = <T,>(items: T[]) => items.filter((_, i) => i % 8 === 0)

  function createPinkGradient(reverse = false) {
    const width = 256
    const data = new Uint8Array(width * 4)
    const stops = [
      new THREE.Color('#B92F59'),
      new THREE.Color('#E45178'),
      new THREE.Color('#F26B8A'),
      new THREE.Color('#FFB3C5')
    ]

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

  const pinkGradientLeft = createPinkGradient()
  const pinkGradientRight = createPinkGradient(true)

  // === BANGUNAN VENUE (tetap primitif) ===
  const stageFlowers: [number, number, number][] = [
    [-4.1, 1.05, -1.82], [-3.7, 1.33, -1.79], [-3.25, 1.12, -1.8],
    [3.25, 1.12, -1.8], [3.7, 1.33, -1.79], [4.1, 1.05, -1.82],
    [-4.5, 0.85, 1.65], [4.5, 0.85, 1.65]
  ]
  const flowerColors = ['#f08aa4', '#ffe3a3', '#f9b3c6', '#ffffff', '#d995c3']
  const chairs: [number, number, number, number][] = [
    [-3.75, 0.67, 1.1, 0.25], [-2.75, 0.67, 1.1, 0.16],
    [2.75, 0.67, 1.1, -0.16], [3.75, 0.67, 1.1, -0.25]
  ]
  const lamps: [number, number, number][] = [
    [-2.55, 0, 1], [2.55, 0, 1], [-2.55, 0, -7.5], [2.55, 0, -7.5],
    [-2.55, 0, -13.5], [2.55, 0, -13.5]
  ]

  // === POHON — hutan padat di pinggir venue ===
  // CommonTree (pohon lebar) di sisi kiri-kanan venue
  const treeLayerA = [
    [-10, 0, 2, 0.45, 0.3], [10, 0, 2, 0.42, -0.6], [-16, 0, -10, 0.5, 1.2],
    [-12, 0, 8, 0.4, 0.8], [12, 0, 8, 0.38, -0.4],
    [-15, 0, -3, 0.42, 1.5], [15, 0, -3, 0.45, -0.9],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

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
    [-4, 0, 2.5], [4, 0, 2.5], [-6.5, 0, -6], [6.5, 0, -6],
    [-5, 0, -12], [5, 0, -12],
    [-7, 0, -3], [7, 0, -3], [-9, 0, -8], [9, 0, -8],
    [-8, 0, 2], [8, 0, 2],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.45 + (i % 3) * 0.08, rotationY: i * 0.7 }))

  const grassWispy = [
    [-4.5, 0, 1], [4.5, 0, 1], [-5.5, 0, -3], [5.5, 0, -3],
    [-7.5, 0, -10], [7.5, 0, -10], [-6.5, 0, -15], [6.5, 0, -15],
    [-9.5, 0, -5], [9.5, 0, -5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.38 + (i % 3) * 0.06, rotationY: i * 0.9 }))

  // === BUNGA — berkelompok di tepi jalan ===
  const flower3 = [
    [-4.2, 0, 3], [4.2, 0, 3], [-5.8, 0, -7], [5.8, 0, -7],
    [-7.5, 0, -12], [7.5, 0, -12],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.4, rotationY: i * 0.5 }))

  const flower4 = [
    [-7, 0, -11.5], [7, 0, -11.5], [-5.6, 0, -16.5], [5.6, 0, -16.5],
    [-3.8, 0, 4.5], [3.8, 0, 4.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.4, rotationY: i * 0.6 }))

  // === SEMAK & TANAMAN ===
  const bushes = [
    [-3, 0, 3.5], [3, 0, 3.5], [-6, 0, 0], [6, 0, 0],
    [-8.5, 0, -6], [8.5, 0, -6],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.5, rotationY: i * 0.5 }))

  const ferns = [
    [-9, 0, 6, 0.3], [9, 0, 6, 0.35], [-13, 0, -3, 0.3], [13, 0, -3, 0.3],
    [-15, 0, -13, 0.25], [15, 0, -13, 0.28],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[0] * 0.3 }))

  const plants = [
    [-5, 0, 4], [5, 0, 4], [-8, 0, -2], [8, 0, -2],
    [-6.5, 0, -9], [6.5, 0, -9],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: 0.5, rotationY: i * 0.7 }))

  // === BATU & PEBBLE ===
  const rocks = [
    [-9, 0, 5, 0.35], [9, 0, 5, 0.4], [-14, 0, -7, 0.3], [14, 0, -7, 0.35],
    [-16, 0, -14, 0.25], [16, 0, -14, 0.3],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[0] * 0.2 }))

  const pebbles = [
    [-2, 0, 5.5, 0.5], [2, 0, 5.5, 0.5],
    [-3.5, 0, -1, 0.5], [3.5, 0, -1, 0.5],
    [-1.5, 0, -8, 0.5], [1.5, 0, -8, 0.5],
    [-3, 0, -14, 0.5], [3, 0, -14, 0.5],
    [-5, 0, 3, 0.4], [5, 0, 3, 0.4],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 1.3 }))

  // === JAMUR ===
  const mushrooms = [
    [-4.5, 0, 0, 0.4], [4.5, 0, 0, 0.45], [-7, 0, -5, 0.4], [7, 0, -5, 0.35],
    [-9, 0, -11, 0.45], [9, 0, -11, 0.4], [-6, 0, -14, 0.35], [6, 0, -14, 0.4],
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
    [-6, 0, 3, 0.2, 0.6], [-14, 0, 0, 0.18, -0.3],
    [-11, 0, -16, 0.22, 0.8], [-7, 0, -6, 0.2, -0.5],
    [-16, 0, -8, 0.2, 0.7], [-9, 0, -16, 0.22, -0.2], [-13, 0, -4, 0.2, 0.5],
  ].map((a) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))

  const redTwistedRight = [
    [16, 0, 2, 0.22, -0.4], [8, 0, -12, 0.2, 0.6],
    [12, 0, 6, 0.2, -0.9], [15, 0, -5, 0.22, -0.3],
    [10, 0, -2, 0.18, 0.8], [17, 0, -14, 0.2, -0.5],
    [9, 0, 8, 0.2, -0.2], [13, 0, -20, 0.22, 0.4],
    [6, 0, 3, 0.2, -0.6], [14, 0, 0, 0.18, 0.3],
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

  // Batu Rock_Medium_2 — BANYAK di kiri & kanan
  const rockMed2Left = [
    [-7, 0, 2, 0.35, 0.3], [-12, 0, -3, 0.4, -0.5], [-9, 0, -8, 0.38, 0.8],
    [-14, 0, -10, 0.32, 0.2], [-6, 0, -14, 0.4, -0.6], [-11, 0, 6, 0.36, 0.4],
    [-15, 0, 4, 0.3, -0.3], [-8, 0, -18, 0.38, 0.7],
    [-5, 0, -5, 0.3, 0.4], [-8, 0, -1, 0.36, -0.8], [-10, 0, -15, 0.32, 0.6],
    [-13, 0, 2, 0.38, -0.2], [-16, 0, -3, 0.34, 0.9], [-7, 0, -20, 0.3, -0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.5 }))

  const rockMed2Right = [
    [7, 0, 2, 0.35, -0.3], [12, 0, -3, 0.4, 0.5], [9, 0, -8, 0.38, -0.8],
    [14, 0, -10, 0.32, -0.2], [6, 0, -14, 0.4, 0.6], [11, 0, 6, 0.36, -0.4],
    [15, 0, 4, 0.3, 0.3], [8, 0, -18, 0.38, -0.7],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.5 }))

  // Rumput pendek di sisi
  const grassShortLeft = [
    [-5, 0, 1, 0.45], [-7, 0, -3, 0.5], [-4, 0, -7, 0.42], [-8, 0, -10, 0.48],
    [-6, 0, -15, 0.45], [-9, 0, 5, 0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.6 }))

  const grassShortRight = [
    [5, 0, 1, 0.45], [7, 0, -3, 0.5], [4, 0, -7, 0.42], [8, 0, -10, 0.48],
    [6, 0, -15, 0.45], [9, 0, 5, 0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.7 }))

  const grassWispyShortLeft = [
    [-4.5, 0, -1, 0.4], [-6.5, 0, -8, 0.38], [-7.5, 0, -12, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.9 }))

  const grassWispyShortRight = [
    [4.5, 0, -1, 0.4], [6.5, 0, -8, 0.38], [7.5, 0, -12, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.8 }))

  // Bunga tunggal di sisi
  const flowerSingleLeft = [
    [-5, 0, 3, 0.38], [-6, 0, -6, 0.4], [-4, 0, -11, 0.36], [-7, 0, 2, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.5 }))

  const flowerSingleRight = [
    [5, 0, 3, 0.38], [6, 0, -6, 0.4], [4, 0, -11, 0.36], [7, 0, 2, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.6 }))

  // Clover di sisi
  const cloversLeft = [
    [-4, 0, 0, 0.4], [-5.5, 0, -4, 0.42], [-6, 0, -9, 0.38],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.7 }))

  const cloversRight = [
    [4, 0, 0, 0.4], [5.5, 0, -4, 0.42], [6, 0, -9, 0.38],
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

  // Batu besar tambahan
  const rockSidesLeft = [
    [-10, 0, 0, 0.35], [-14, 0, -10, 0.3], [-12, 0, -22, 0.32],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.4 }))

  const rockSidesRight = [
    [10, 0, 0, 0.35], [14, 0, -10, 0.3], [12, 0, -22, 0.32],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.4 }))

  // Pebble tambahan
  const pebbleSidesLeft = [
    [-4.5, 0, -2, 0.5], [-6, 0, -6, 0.55], [-5, 0, -10, 0.48], [-7, 0, -14, 0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 1.1 }))

  const pebbleSidesRight = [
    [4.5, 0, -2, 0.5], [6, 0, -6, 0.55], [5, 0, -10, 0.48], [7, 0, -14, 0.5],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -1.2 }))

  // Jalur batu tepi jalan
  const rockPathSidesLeft = [
    [-3.5, 0, 4, 0.55], [-3.5, 0, -2, 0.55], [-3.5, 0, -8, 0.55], [-3.5, 0, -14, 0.55],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.5 }))

  const rockPathSidesRight = [
    [3.5, 0, 4, 0.55], [3.5, 0, -2, 0.55], [3.5, 0, -8, 0.55], [3.5, 0, -14, 0.55],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.5 }))

  // Jamur Laetiporus
  const mushroomLaetiLeft = [
    [-5, 0, -1, 0.4], [-7, 0, -9, 0.35], [-6, 0, -13, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.8 }))

  const mushroomLaetiRight = [
    [5, 0, -1, 0.4], [7, 0, -9, 0.35], [6, 0, -13, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.8 }))


  // === POHON BERJAJAR di perbatasan venue (tepi kiri & kanan jalan) ===
  // Jarak cukup dari jalan (X=±5.5) dan tidak terlalu rapat antar pohon
  const liningTreesLeft = [
    [-5.5, 0, 5, 0.4], [-5.5, 0, 1, 0.42], [-5.5, 0, -3, 0.4],
    [-5.5, 0, -7, 0.42], [-5.5, 0, -11, 0.4], [-5.5, 0, -15, 0.42],
    [-5.5, 0, -19, 0.4],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * 0.3 }))

  const liningTreesRight = [
    [5.5, 0, 5, 0.42], [5.5, 0, 1, 0.4], [5.5, 0, -3, 0.42],
    [5.5, 0, -7, 0.4], [5.5, 0, -11, 0.42], [5.5, 0, -15, 0.4],
    [5.5, 0, -19, 0.42],
  ].map((a, i) => ({ position: [a[0], 0, a[2]] as [number, number, number], scale: a[3], rotationY: i * -0.3 }))

  // === GUNUNG di belakang panggung (dipulihkan) ===
  const mountains: [number, number, number, number, number][] = [
    [-18, 4, -27, 8, 13],
    [-9, 3, -29, 7, 11],
    [3, 4, -28, 9, 14],
    [14, 3, -27, 8, 12],
    [22, 4, -30, 10, 15]
  ]

  const stageBushes = [
    [-5.8, 0, -15.5, 0.5, 0.3], [5.8, 0, -15.5, 0.5, -0.3],
    [-5.8, 0, -20.5, 0.5, 0.5], [5.8, 0, -20.5, 0.5, -0.5],
    [-5.8, 0, -18, 0.48, 0.2], [5.8, 0, -18, 0.48, -0.2],
    [-6.2, 0, -17, 0.45, 0.4], [6.2, 0, -17, 0.45, -0.4],
  ].map((a) => ({ position: [a[0], a[1], a[2]] as [number, number, number], scale: a[3], rotationY: a[4] }))


</script>

<!-- Ground: rumput kiri -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-15.3, -0.04, -7]} receiveShadow>
  <T.PlaneGeometry args={[23.4, 54]} />
  <T.MeshToonMaterial color="#ffffff" map={pinkGradientLeft} gradientMap={gradient} />
</T.Mesh>
<!-- Ground: rumput tengah (hijau muda, di bawah jalan) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.04, -7]} receiveShadow>
  <T.PlaneGeometry args={[7.2, 54]} />
  <T.MeshToonMaterial color="#a3c98f" gradientMap={gradient} />
</T.Mesh>
<!-- Ground: rumput kanan -->
<T.Mesh rotation.x={-Math.PI / 2} position={[15.3, -0.04, -7]} receiveShadow>
  <T.PlaneGeometry args={[23.4, 54]} />
  <T.MeshToonMaterial color="#ffffff" map={pinkGradientRight} gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.02, -7]} receiveShadow>
  <T.PlaneGeometry args={[7.2, 44]} />
  <T.MeshToonMaterial color="#e6d2a2" gradientMap={gradient} />
</T.Mesh>
<!-- Karpet merah menuju pelaminan -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.005, -7]} receiveShadow>
  <T.PlaneGeometry args={[2.7, 43]} />
  <T.MeshToonMaterial color="#b91c3c" gradientMap={gradient} />
</T.Mesh>
<!-- Garis tepi karpet (emas) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-1.38, 0.01, -7]} receiveShadow>
  <T.PlaneGeometry args={[0.08, 43]} />
  <T.MeshToonMaterial color="#d4af37" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[1.38, 0.01, -7]} receiveShadow>
  <T.PlaneGeometry args={[0.08, 43]} />
  <T.MeshToonMaterial color="#d4af37" gradientMap={gradient} />
</T.Mesh>

<!-- GUNUNG di belakang panggung -->
{#each mountains as m, i}
  <T.Group position={[m[0], m[1], m[2]]}>
    <T.Mesh castShadow>
      <T.ConeGeometry args={[m[3], m[4], 5]} />
      <T.MeshToonMaterial color={i % 2 ? '#6a9276' : '#789c7b'} gradientMap={gradient} />
    </T.Mesh>
  </T.Group>
{/each}

<!-- POHON BERJAJAR di perbatasan venue (tepi jalan) -->
<Nature url="/nature/gltf/CommonTree_5.gltf" instances={sparseTrees(liningTreesLeft)} />
<Nature url="/nature/gltf/CommonTree_5.gltf" instances={sparseTrees(liningTreesRight)} />

<!-- POHON: CommonTree lebar -->
<Nature url="/nature/gltf/CommonTree_1.gltf" instances={sparseTrees(treeLayerA)} />
<!-- Tiga pohon non-merah dikurangi agar total pohon menjadi 30 -->

<!-- POHON: Pine / Cemara di latar belakang -->
<Nature url="/nature/gltf/Pine_3.gltf" instances={sparseTrees(pineLayer)} />

<!-- POHON berdaun merah (autumn) -->
<Nature url="/nature/gltf/CommonTree_1.gltf" instances={sparseTrees(redLeafTrees)} leafColor="#c0392b" />
<Nature url="/nature/gltf/CommonTree_5.gltf" instances={sparseTrees(redLeafSidesLeft)} leafColor="#d4252b" />
<Nature url="/nature/gltf/CommonTree_5.gltf" instances={sparseTrees(redLeafSidesRight)} leafColor="#c0392b" />
<Nature url="/nature/gltf/Pine_1.gltf" instances={sparseTrees(redPineLeft)} leafColor="#d4252b" />
<Nature url="/nature/gltf/Pine_1.gltf" instances={sparseTrees(redPineRight)} leafColor="#c0392b" />
<Nature url="/nature/gltf/TwistedTree_3.gltf" instances={sparseTrees(redTwistedLeft)} leafColor="#b03a2e" />
<Nature url="/nature/gltf/TwistedTree_3.gltf" instances={sparseTrees(redTwistedRight)} leafColor="#d4252b" />
<!-- Pohon berdaun merah dekat Kotak Ucapan -->
<Nature url="/nature/gltf/TwistedTree_3.gltf" instances={sparseTrees(mailboxTrees)} leafColor="#b03a2e" />
<Nature url="/nature/gltf/TwistedTree_3.gltf" instances={sparseTrees(extraTreesLeft)} leafColor="#c0392b" />
<Nature url="/nature/gltf/TwistedTree_3.gltf" instances={sparseTrees(extraTreesRight)} leafColor="#b03a2e" />
<!-- Batu Rock_Medium_2 banyak -->
<Nature url="/nature/gltf/Rock_Medium_2.gltf" instances={rockMed2Left} />
<Nature url="/nature/gltf/Rock_Medium_2.gltf" instances={rockMed2Right} />

<!-- RUMPUT padat -->
<Nature url="/nature/gltf/Bush_Common.gltf" instances={grassTall} />
<Nature url="/nature/gltf/Bush_Common_Flowers.gltf" instances={grassWispy} />

<!-- BUNGA berkelompok -->
<Nature url="/nature/gltf/Flower_3_Group.gltf" instances={flower3} />
<Nature url="/nature/gltf/Flower_4_Group.gltf" instances={flower4} />

<!-- SEMAK & TANAMAN -->
<Nature url="/nature/gltf/Bush_Common.gltf" instances={bushes} />
<Nature url="/nature/gltf/Fern_1.gltf" instances={ferns} />
<Nature url="/nature/gltf/Plant_1.gltf" instances={plants} />

<!-- BATU besar -->
<Nature url="/nature/gltf/Rock_Medium_1.gltf" instances={rocks} />

<!-- PEBBLE kecil di tepi jalan -->
<Nature url="/nature/gltf/Pebble_Round_1.gltf" instances={pebbles} />

<!-- JAMUR -->
<Nature url="/nature/gltf/Mushroom_Common.gltf" instances={mushrooms} />

<!-- ========== TAMBAHAN: VEGETASI SISI KIRI-KANAN ========== -->

<!-- POHON tambahan sisi -->
<Nature url="/nature/gltf/CommonTree_2.gltf" instances={sparseTrees(sideTreesLeft)} />
<Nature url="/nature/gltf/CommonTree_4.gltf" instances={sparseTrees(sideTreesRight)} />
<Nature url="/nature/gltf/Pine_1.gltf" instances={sparseTrees(pineSidesLeft)} />
<Nature url="/nature/gltf/Pine_2.gltf" instances={sparseTrees(pineSidesRight)} />
<!-- Pohon twisted non-merah sisi dihilangkan; pohon merah tetap dipertahankan -->
<!-- (DeadTree sides diganti pohon berdaun merah di atas) -->

<!-- RUMPUT pendek sisi -->
<Nature url="/nature/gltf/Bush_Common.gltf" instances={grassShortLeft} />
<Nature url="/nature/gltf/Bush_Common_Flowers.gltf" instances={grassShortRight} />
<Nature url="/nature/gltf/Bush_Common_Flowers.gltf" instances={grassWispyShortLeft} />
<Nature url="/nature/gltf/Bush_Common.gltf" instances={grassWispyShortRight} />

<!-- BUNGA tunggal & clover sisi -->
<Nature url="/nature/gltf/Flower_3_Single.gltf" instances={flowerSingleLeft} />
<Nature url="/nature/gltf/Flower_4_Single.gltf" instances={flowerSingleRight} />
<Nature url="/nature/gltf/Clover_1.gltf" instances={cloversLeft} />
<Nature url="/nature/gltf/Clover_2.gltf" instances={cloversRight} />

<!-- SEMAK berbunga & tanaman besar sisi -->
<Nature url="/nature/gltf/Bush_Common_Flowers.gltf" instances={bushFlowersLeft} />
<Nature url="/nature/gltf/Bush_Common_Flowers.gltf" instances={bushFlowersRight} />
<Nature url="/nature/gltf/Plant_1_Big.gltf" instances={plantBigLeft} />
<Nature url="/nature/gltf/Plant_1_Big.gltf" instances={plantBigRight} />

<!-- BATU & pebble tambahan sisi -->
<Nature url="/nature/gltf/Rock_Medium_2.gltf" instances={rockSidesLeft} />
<Nature url="/nature/gltf/Rock_Medium_3.gltf" instances={rockSidesRight} />
<Nature url="/nature/gltf/Pebble_Round_2.gltf" instances={pebbleSidesLeft} />
<Nature url="/nature/gltf/Pebble_Round_3.gltf" instances={pebbleSidesRight} />

<!-- JALUR BATU tepi jalan -->
<Nature url="/nature/gltf/RockPath_Round_Small_1.gltf" instances={rockPathSidesLeft} />
<Nature url="/nature/gltf/RockPath_Round_Small_2.gltf" instances={rockPathSidesRight} />

<!-- JAMUR Laetiporus sisi -->
<Nature url="/nature/gltf/Mushroom_Laetiporus.gltf" instances={mushroomLaetiLeft} />
<Nature url="/nature/gltf/Mushroom_Laetiporus.gltf" instances={mushroomLaetiRight} />

<!-- Arch / Gate -->
<T.Group position={[0, 0, 4]}>
  <T.Mesh position={[-2.0, 1.7, 0]} castShadow>
    <T.BoxGeometry args={[0.5, 3.4, 0.5]} />
    <T.MeshToonMaterial color="#ffffff" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-2.0, 3.48, 0]}>
    <T.BoxGeometry args={[0.62, 0.14, 0.62]} />
    <T.MeshToonMaterial color="#fff5f5" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-2.0, 0.08, 0]}>
    <T.BoxGeometry args={[0.65, 0.16, 0.65]} />
    <T.MeshToonMaterial color="#fff5f5" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[2.0, 1.7, 0]} castShadow>
    <T.BoxGeometry args={[0.5, 3.4, 0.5]} />
    <T.MeshToonMaterial color="#ffffff" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[2.0, 3.48, 0]}>
    <T.BoxGeometry args={[0.62, 0.14, 0.62]} />
    <T.MeshToonMaterial color="#fff5f5" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[2.0, 0.08, 0]}>
    <T.BoxGeometry args={[0.65, 0.16, 0.65]} />
    <T.MeshToonMaterial color="#fff5f5" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 3.55, 0]} castShadow>
    <T.BoxGeometry args={[4.5, 0.2, 0.5]} />
    <T.MeshToonMaterial color="#ffffff" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 3.75, 0]}>
    <T.TorusGeometry args={[1.6, 0.08, 8, 16, Math.PI]} />
    <T.MeshToonMaterial color="#fff5f5" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-2.0, 3.6, 0.28]}>
    <T.SphereGeometry args={[0.18, 8, 6]} />
    <T.MeshToonMaterial color="#f9b3c6" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[2.0, 3.6, 0.28]}>
    <T.SphereGeometry args={[0.18, 8, 6]} />
    <T.MeshToonMaterial color="#f9b3c6" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-0.8, 3.8, 0.15]}>
    <T.SphereGeometry args={[0.16, 8, 6]} />
    <T.MeshToonMaterial color="#f08aa4" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0.8, 3.8, 0.15]}>
    <T.SphereGeometry args={[0.16, 8, 6]} />
    <T.MeshToonMaterial color="#f08aa4" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 3.9, 0.15]}>
    <T.SphereGeometry args={[0.18, 8, 6]} />
    <T.MeshToonMaterial color="#ffe3a3" gradientMap={gradient} />
  </T.Mesh>
</T.Group>

<!-- Receptionist desk -->
<T.Group position={[0, 0, -4]}>
  <T.Mesh position={[0, 0.57, 0]} castShadow>
    <T.BoxGeometry args={[3.3, 1.14, 0.9]} />
    <T.MeshToonMaterial color="#be5c75" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 1.18, 0.08]}>
    <T.BoxGeometry args={[3.45, 0.16, 1]} />
    <T.MeshToonMaterial color="#fff3dd" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-1.12, 1.47, 0.02]}>
    <T.CylinderGeometry args={[0.25, 0.18, 0.55, 10]} />
    <T.MeshToonMaterial color="#f5bb75" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[1.1, 1.45, 0.04]}>
    <T.SphereGeometry args={[0.2, 8, 6]} />
    <T.MeshToonMaterial color="#f6adc1" gradientMap={gradient} />
  </T.Mesh>
</T.Group>

<!-- Mailbox / Guestbook -->
<T.Group position={[-5, 0, -10]}>
  <T.Mesh position={[0, 0.72, 0]} castShadow>
    <T.CylinderGeometry args={[0.09, 0.11, 1.44, 8]} />
    <T.MeshToonMaterial color="#72503d" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 1.38, 0]} castShadow>
    <T.BoxGeometry args={[0.78, 0.48, 0.65]} />
    <T.MeshToonMaterial color="#d1677e" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 1.44, 0.34]}>
    <T.BoxGeometry args={[0.34, 0.06, 0.02]} />
    <T.MeshToonMaterial color="#ffe9bd" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.16, 0]}>
    <T.CylinderGeometry args={[0.6, 0.75, 0.18, 10]} />
    <T.MeshToonMaterial color="#70975d" gradientMap={gradient} />
  </T.Mesh>
</T.Group>

<!-- Wedding Stage -->
<T.Group position={[0, 0, -18]}>
  <T.Mesh position={[0, 0.32, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[10.5, 0.64, 4.8]} />
    <T.MeshToonMaterial color="#b91c3c" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.67, 0.1]}>
    <T.BoxGeometry args={[9.9, 0.12, 4.35]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.22, 2.75]} castShadow receiveShadow>
    <T.BoxGeometry args={[3.1, 0.44, 1.15]} />
    <T.MeshToonMaterial color="#d98b9b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.48, 2.22]} castShadow receiveShadow>
    <T.BoxGeometry args={[2.65, 0.12, 0.42]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 3.25, -2.12]} castShadow>
    <T.BoxGeometry args={[9.65, 5.1, 0.25]} />
    <T.MeshToonMaterial color="#e8b6bc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 3.25, -1.95]}>
    <T.TorusGeometry args={[1.55, 0.16, 10, 24]} />
    <T.MeshToonMaterial color="#fff2cf" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-2.35, 3.2, -1.85]}>
    <T.TorusGeometry args={[0.92, 0.12, 8, 20]} />
    <T.MeshToonMaterial color="#f6d9ae" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[2.35, 3.2, -1.85]}>
    <T.TorusGeometry args={[0.92, 0.12, 8, 20]} />
    <T.MeshToonMaterial color="#f6d9ae" gradientMap={gradient} />
  </T.Mesh>
  {#each stageFlowers as flower, i}
    <T.Mesh position={flower}>
      <T.SphereGeometry args={[0.28, 8, 6]} />
      <T.MeshToonMaterial color={flowerColors[i % flowerColors.length]} gradientMap={gradient} />
    </T.Mesh>
  {/each}
  <T.Mesh position={[0, 1.34, -0.12]}>
    <T.SphereGeometry args={[0.25, 8, 6]} />
    <T.MeshToonMaterial color="#f1b7c7" gradientMap={gradient} />
  </T.Mesh>

  {#each chairs as chair, i}
    <T.Group position={[chair[0], chair[1], chair[2]]} rotation.y={chair[3]}>
      <T.Mesh position={[0, -0.21, 0]} castShadow>
        <T.BoxGeometry args={[0.62, 0.12, 0.62]} />
        <T.MeshToonMaterial color="#fff5df" gradientMap={gradient} />
      </T.Mesh>
      <T.Mesh position={[0, 0.13, 0.26]} castShadow>
        <T.BoxGeometry args={[0.62, 0.67, 0.1]} />
        <T.MeshToonMaterial color="#d68a9b" gradientMap={gradient} />
      </T.Mesh>
      <T.Mesh position={[-0.24, -0.42, -0.23]}>
        <T.CylinderGeometry args={[0.035, 0.035, 0.5, 5]} />
        <T.MeshToonMaterial color="#80583d" gradientMap={gradient} />
      </T.Mesh>
      <T.Mesh position={[0.24, -0.42, -0.23]}>
        <T.CylinderGeometry args={[0.035, 0.035, 0.5, 5]} />
        <T.MeshToonMaterial color="#80583d" gradientMap={gradient} />
      </T.Mesh>
    </T.Group>
  {/each}
</T.Group>

<!-- Bush di sekeliling panggung -->
<Nature url="/nature/gltf/Bush_Common.gltf" instances={stageBushes} />

<!-- Lamps -->
{#each lamps as lamp, i}
  <T.Group position={lamp}>
    <T.Mesh position={[0, 1.28, 0]}>
      <T.CylinderGeometry args={[0.045, 0.06, 2.56, 6]} />
      <T.MeshToonMaterial color="#4f443e" gradientMap={gradient} />
    </T.Mesh>
    <T.Mesh position={[0, 2.56, 0]}>
      <T.SphereGeometry args={[0.17, 10, 8]} />
      <T.MeshStandardMaterial color="#fff2aa" emissive="#f5b942" emissiveIntensity={1.6} />
    </T.Mesh>
  </T.Group>
{/each}
