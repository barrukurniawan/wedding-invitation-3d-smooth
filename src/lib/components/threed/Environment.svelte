<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { onMount } from 'svelte'
  import { getToonGradient } from '../../utils/toonMaterial'
  import Nature from './Nature.svelte'
  import { GROUND_COLOR } from '../../constants/natureTheme'
  import HangingLights from './HangingLights.svelte'
  import { setOccluderGroup } from '../../stores/cameraOccluders.svelte'
  import { lightPoles } from '../../constants/triggers'
  import { isLoaded } from '../../stores/gameState.svelte'

  let {
    lowPower = false,
    onReady
  }: {
    lowPower?: boolean
    onReady?: () => void
  } = $props()

  let occluders = $state<THREE.Group>()
  let showDecor = $state(false)
  let readySent = false
  $effect(() => setOccluderGroup(occluders ?? null))

  const gradient = getToonGradient()
  // lowPower: thinner vegetation density (less instance work after reveal)
  const sparseTrees = <T,>(items: T[]) =>
    items.filter((_, i) => i % (lowPower ? 12 : 8) === 0)

  // Critical path is procedural geometry only — fire after first paint frames.
  onMount(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (readySent) return
        readySent = true
        onReady?.()
      })
    })
  })

  // Far Nature / animals after overlay dismiss (idle or short timeout).
  $effect(() => {
    if (!$isLoaded || showDecor) return
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => {
        showDecor = true
      }, { timeout: 500 })
    } else {
      setTimeout(() => {
        showDecor = true
      }, 120)
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

  // === BANGUNAN VENUE (tetap primitif) ===
  // Rangkaian bunga besar di sisi pasangan dan sudut depan panggung.
  const stageBouquets = [
    { position: [-3.25, 0.72, -0.65] as [number, number, number], scale: 1.18, rotationY: 0.08 },
    { position: [3.25, 0.72, -0.65] as [number, number, number], scale: 1.18, rotationY: -0.08 },
    { position: [-4.15, 0.72, 1.65] as [number, number, number], scale: 0.82, rotationY: 0.18 },
    { position: [4.15, 0.72, 1.65] as [number, number, number], scale: 0.82, rotationY: -0.18 }
  ]
  const bouquetBlooms = [
    { position: [-0.52, 1.42, 0.02] as [number, number, number], scale: 1.05, color: '#d96f91' },
    { position: [0, 1.72, -0.02] as [number, number, number], scale: 1.2, color: '#f3a7bd' },
    { position: [0.52, 1.4, 0.04] as [number, number, number], scale: 1.0, color: '#f7d9aa' },
    { position: [-0.26, 1.08, 0.12] as [number, number, number], scale: 0.9, color: '#fff3e1' },
    { position: [0.3, 1.08, 0.14] as [number, number, number], scale: 0.92, color: '#d99ac8' },
    { position: [-0.02, 1.32, 0.2] as [number, number, number], scale: 0.88, color: '#ef829f' }
  ]
  const bouquetLeaves = [
    [-0.7, 0.86, 0.02, -0.75], [-0.5, 1.18, -0.08, -0.5], [-0.25, 1.48, -0.12, -0.3],
    [0.7, 0.86, 0.02, 0.75], [0.5, 1.18, -0.08, 0.5], [0.25, 1.48, -0.12, 0.3],
    [-0.58, 0.65, 0.12, -0.9], [0.58, 0.65, 0.12, 0.9]
  ] as const
  const bouquetStemGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.35, 6)
  const bouquetLeafGeo = new THREE.SphereGeometry(0.22, 8, 6)
  const bouquetPetalGeo = new THREE.SphereGeometry(0.2, 10, 8)
  const bouquetCenterGeo = new THREE.SphereGeometry(0.105, 10, 8)
  const bouquetStemMat = new THREE.MeshToonMaterial({ color: '#58755b', gradientMap: gradient })
  const bouquetLeafMat = new THREE.MeshToonMaterial({ color: '#76956f', gradientMap: gradient })
  const bouquetLeafDarkMat = new THREE.MeshToonMaterial({ color: '#4f7658', gradientMap: gradient })
  const bouquetCenterMat = new THREE.MeshToonMaterial({ color: '#d9a441', gradientMap: gradient })

  const backdropHeart = new THREE.Shape()
  backdropHeart.moveTo(0, -0.52)
  backdropHeart.bezierCurveTo(-0.14, -0.34, -0.62, 0.02, -0.62, 0.4)
  backdropHeart.bezierCurveTo(-0.62, 0.82, -0.1, 0.92, 0, 0.52)
  backdropHeart.bezierCurveTo(0.1, 0.92, 0.62, 0.82, 0.62, 0.4)
  backdropHeart.bezierCurveTo(0.62, 0.02, 0.14, -0.34, 0, -0.52)
  const backdropHeartGeo = new THREE.ShapeGeometry(backdropHeart, 18)
  const backdropFlowerPetalGeo = new THREE.SphereGeometry(0.16, 10, 8)
  const backdropFlowerCenterGeo = new THREE.SphereGeometry(0.08, 10, 8)
  const backdropLeafGeo = new THREE.SphereGeometry(0.15, 8, 6)
  const backdropFlowerColors = ['#ef8daa', '#f7bfd0', '#fff0dc', '#e6a8d2', '#f4d79b']
  const backdropFlowers = [
    [-1.08, 4.2, 0.9], [-0.68, 4.42, 0.72], [-0.22, 4.5, 0.82],
    [0.22, 4.5, 0.78], [0.68, 4.42, 0.72], [1.08, 4.2, 0.9],
    [-1.22, 2.12, 0.82], [-0.86, 1.88, 0.7], [0.86, 1.88, 0.7], [1.22, 2.12, 0.82],
    [-2.82, 3.52, 0.72], [-2.62, 2.82, 0.62], [-2.36, 3.12, 0.68],
    [2.82, 3.52, 0.72], [2.62, 2.82, 0.62], [2.36, 3.12, 0.68]
  ] as const
  const backdropLeaves = [
    [-1.42, 4.02, -0.6], [-0.9, 4.48, -0.3], [-0.45, 4.62, -0.2],
    [0.45, 4.62, 0.2], [0.9, 4.48, 0.3], [1.42, 4.02, 0.6],
    [-1.48, 2.22, -0.8], [-1.02, 1.72, -0.45], [1.02, 1.72, 0.45], [1.48, 2.22, 0.8],
    [-3.05, 3.82, -0.65], [-2.92, 2.98, -0.9], [-2.2, 2.72, 0.8],
    [3.05, 3.82, 0.65], [2.92, 2.98, 0.9], [2.2, 2.72, -0.8]
  ] as const
  const deskGarlandFlowers = [
    [-0.82, 0.62, 0.78], [-0.43, 0.52, 0.9], [0, 0.47, 1.08],
    [0.43, 0.52, 0.9], [0.82, 0.62, 0.78]
  ] as const
  const deskGarlandLeaves = [
    [-1.08, 0.72, -0.55], [-0.62, 0.68, 0.45], [-0.22, 0.62, -0.35],
    [0.22, 0.62, 0.35], [0.62, 0.68, -0.45], [1.08, 0.72, 0.55]
  ] as const
  const chairs: [number, number, number, number][] = [
    [-3.75, 0.67, 1.1, 0.25], [-2.75, 0.67, 1.1, 0.16],
    [2.75, 0.67, 1.1, -0.16], [3.75, 0.67, 1.1, -0.25]
  ]

  // === Light pole system — procedural straight poles (shared geometry) ===
  // Tiang vertikal lurus low-poly: base, shaft, gold trim, bracket, hook.
  // Geometri & material dibuat sekali, dipakai untuk semua 10 tiang.
  const poleBaseGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.16, 8)
  const poleShaftGeo = new THREE.CylinderGeometry(0.085, 0.11, 3.62, 8)
  const poleTrimGeo = new THREE.TorusGeometry(0.13, 0.025, 6, 12)
  const poleBracketGeo = new THREE.BoxGeometry(0.42, 0.05, 0.05)
  const poleHookGeo = new THREE.SphereGeometry(0.06, 8, 6)

  const poleBaseMat = new THREE.MeshToonMaterial({ color: '#d9b77b', gradientMap: gradient })
  const poleShaftMat = new THREE.MeshToonMaterial({ color: '#fff3dd', gradientMap: gradient })
  const poleTrimMat = new THREE.MeshToonMaterial({ color: '#d9b77b', gradientMap: gradient })

  // Hook offset toward path center: left = +X, right = -X
  const poleHooks = lightPoles.map((p) => ({
    ...p,
    bracketDir: p.side === 'left' ? 1 : -1
  }))

  // Cable anchors per side: hook world positions for HangingLights
  const cableLeftAnchors: [number, number, number][] = lightPoles
    .filter((p) => p.side === 'left')
    .map((p) => p.hookWorld)
  const cableRightAnchors: [number, number, number][] = lightPoles
    .filter((p) => p.side === 'right')
    .map((p) => p.hookWorld)

  const bulbWarm = ['#ffd24a', '#ffe08a', '#ffca5a']

  // Motif bunga datar di jalur krem, berulang simetris di kedua sisi karpet.
  const aisleMotifs = [7.5, 4.7, 1.9, -0.9, -3.7, -6.5, -9.3, -12.1].flatMap((z, i) => [
    { position: [-1.52, 0.018, z] as [number, number, number], rotationY: i % 2 === 0 ? 0 : Math.PI },
    { position: [1.52, 0.018, z] as [number, number, number], rotationY: i % 2 === 0 ? Math.PI : 0 }
  ])
  const motifPetalGeo = new THREE.CircleGeometry(0.17, 12)
  const motifCenterGeo = new THREE.CircleGeometry(0.1, 12)
  const motifLeafGeo = new THREE.CircleGeometry(0.15, 10)
  const motifStemGeo = new THREE.BoxGeometry(0.035, 0.012, 0.72)
  const motifPetalMat = new THREE.MeshToonMaterial({ color: '#d9899d', gradientMap: gradient })
  const motifPetalLightMat = new THREE.MeshToonMaterial({ color: '#f4b8c7', gradientMap: gradient })
  const motifCenterMat = new THREE.MeshToonMaterial({ color: '#d9b77b', gradientMap: gradient })
  const motifLeafMat = new THREE.MeshToonMaterial({ color: '#789b78', gradientMap: gradient })

  // Wedding arch di kaki tangga (world z≈-14.9). Dua tiang kokoh di X±4.5 (di
  // luar jalur jalan ±1.0), crossbar atas di Y≈3.9. Kabel utama tergantung di
  // antara ujung crossbar — tinggi titik terendah ≥3.6m (di atas kepala karakter
  // & label), tidak memotong wajah pengantin. Bracket kecil menambat ujung kabel.
  const ARCH_POST_X = 4.5
  const ARCH_Z = -14.9
  const ARCH_TOP_Y = 3.9
  const archCable: [number, number, number][] = [
    [-ARCH_POST_X, ARCH_TOP_Y, ARCH_Z], [ARCH_POST_X, ARCH_TOP_Y, ARCH_Z]
  ]


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
  const animalBunny = [{ position: [-8, 0, -1] as [number, number, number], rotationY: 0.8, scale: 0.6 }]
  const animalCat = [{ position: [8, 0, -6] as [number, number, number], rotationY: -1.2, scale: 0.6 }]
  const animalPanda = [{ position: [-6, 0, -12] as [number, number, number], rotationY: 0.3, scale: 0.6 }]

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
<!-- Jalur batu pucat di tengah (lebih terang dari rumput, di bawah karpet) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.02, -7]} receiveShadow>
  <T.PlaneGeometry args={[7.2, 44]} />
  <T.MeshToonMaterial color="#e6d2a2" gradientMap={gradient} />
</T.Mesh>
<!-- Side walk kiri-kanan (batu pucat sedikit lebih gelap dari jalur tengah) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-2.55, -0.015, -7]} receiveShadow>
  <T.PlaneGeometry args={[1.3, 43]} />
  <T.MeshToonMaterial color="#d8c290" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[2.55, -0.015, -7]} receiveShadow>
  <T.PlaneGeometry args={[1.3, 43]} />
  <T.MeshToonMaterial color="#d8c290" gradientMap={gradient} />
</T.Mesh>
<!-- Karpet merah menuju pelaminan (lebih sempit & elegan) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.005, -7]} receiveShadow>
  <T.PlaneGeometry args={[2.0, 43]} />
  <T.MeshToonMaterial color="#b91c3c" gradientMap={gradient} />
</T.Mesh>
<!-- Garis tepi karpet (emas champagne) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-1.03, 0.01, -7]} receiveShadow>
  <T.PlaneGeometry args={[0.06, 43]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[1.03, 0.01, -7]} receiveShadow>
  <T.PlaneGeometry args={[0.06, 43]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<!-- Corak bunga bordir pada jalur krem di kanan-kiri karpet -->
{#each aisleMotifs as motif}
  <T.Group position={motif.position} rotation.y={motif.rotationY}>
    <T.Mesh geometry={motifStemGeo} material={motifLeafMat} position={[0, 0, 0.18]} />
    <T.Mesh geometry={motifLeafGeo} material={motifLeafMat} rotation.x={-Math.PI / 2} position={[-0.1, 0.008, 0.18]} scale={[0.52, 1, 1]} rotation.z={-0.7} />
    <T.Mesh geometry={motifLeafGeo} material={motifLeafMat} rotation.x={-Math.PI / 2} position={[0.1, 0.008, 0.36]} scale={[0.52, 1, 1]} rotation.z={0.7} />
    <T.Mesh geometry={motifPetalGeo} material={motifPetalMat} rotation.x={-Math.PI / 2} position={[0, 0.012, -0.25]} scale={[0.72, 1.18, 1]} />
    <T.Mesh geometry={motifPetalGeo} material={motifPetalMat} rotation.x={-Math.PI / 2} position={[0, 0.012, 0.05]} scale={[0.72, 1.18, 1]} />
    <T.Mesh geometry={motifPetalGeo} material={motifPetalLightMat} rotation.x={-Math.PI / 2} position={[-0.15, 0.013, -0.1]} scale={[1.18, 0.72, 1]} />
    <T.Mesh geometry={motifPetalGeo} material={motifPetalLightMat} rotation.x={-Math.PI / 2} position={[0.15, 0.013, -0.1]} scale={[1.18, 0.72, 1]} />
    <T.Mesh geometry={motifCenterGeo} material={motifCenterMat} rotation.x={-Math.PI / 2} position={[0, 0.018, -0.1]} />
  </T.Group>
{/each}
<!-- Landing carpet persegi panjang di kaki tangga (mengganti oval) — dusty rose + border emas -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.012, -14.9]} receiveShadow>
  <T.PlaneGeometry args={[4.0, 1.6]} />
  <T.MeshToonMaterial color="#c97f93" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[-2.0, 0.014, -14.9]} receiveShadow>
  <T.PlaneGeometry args={[0.07, 1.6]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[2.0, 0.014, -14.9]} receiveShadow>
  <T.PlaneGeometry args={[0.07, 1.6]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.014, -14.1]} receiveShadow>
  <T.PlaneGeometry args={[4.0, 0.07]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.014, -15.7]} receiveShadow>
  <T.PlaneGeometry args={[4.0, 0.07]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
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
  <Nature url="/nature/gltf/Tree_4_A_Color1.glb" scale={1.7} instances={[...sparseTrees(liningTreesLeft), ...sparseTrees(liningTreesRight), ...sparseTrees(redLeafSidesLeft), ...sparseTrees(redLeafSidesRight)]} />
  <Nature url="/nature/gltf/Bush_4_D_Color1.glb" scale={1.3} instances={[...sparseTrees(pineLayer), ...sparseTrees(redPineLeft), ...sparseTrees(redPineRight), ...sparseTrees(redTwistedLeft), ...sparseTrees(redTwistedRight), ...sparseTrees(mailboxTrees), ...sparseTrees(extraTreesLeft), ...sparseTrees(extraTreesRight), ...sparseTrees(pineSidesLeft), ...sparseTrees(pineSidesRight)]} />
  <Nature url="/nature/gltf/Tree_1_A_Color1.glb" scale={1.7} instances={[...sparseTrees(redLeafTrees), ...rockMed2Left, ...rockMed2Right, ...mushroomLaetiLeft, ...mushroomLaetiRight]} />
  <Nature url="/nature/gltf/Bush_1_A_Color1.glb" scale={1.3} instances={[...grassTall, ...bushes, ...grassWispyShortRight, ...grassShortLeft, ...stageBushes]} />
  <Nature url="/nature/gltf/Bush_2_A_Color1.glb" scale={1.3} instances={[...grassWispy, ...grassShortRight, ...grassWispyShortLeft, ...bushFlowersLeft, ...bushFlowersRight]} />
  <Nature url="/nature/gltf/Bush_4_F_Color1.glb" scale={1.3} instances={[...mushrooms, ...rockSidesRight, ...pebbleSidesLeft, ...pebbleSidesRight]} />
  <Nature url="/nature/gltf/Bush_4_E_Color1.glb" scale={1.5} instances={[...plantBigLeft, ...plantBigRight]} />
  <Nature url="/nature/gltf/Grass_2_A_Color1.glb" scale={1.1} instances={flower3} />
  <Nature url="/nature/gltf/Grass_1_C_Color1.glb" scale={1.1} instances={flower4} />
  <Nature url="/nature/gltf/Bush_3_A_Color1.glb" scale={1.2} instances={ferns} />
  <Nature url="/nature/gltf/Bush_4_A_Color1.glb" scale={1.2} instances={plants} />
  <Nature url="/nature/gltf/Tree_2_D_Color1.glb" scale={1.7} instances={pebbles} />
  <Nature url="/nature/gltf/Tree_2_A_Color1.glb" scale={1.7} instances={sparseTrees(sideTreesLeft)} />
  <Nature url="/nature/gltf/Tree_3_A_Color1.glb" scale={1.7} instances={sparseTrees(sideTreesRight)} />
  <Nature url="/nature/gltf/Grass_1_A_Color1.glb" scale={1.1} instances={flowerSingleLeft} />
  <Nature url="/nature/gltf/Grass_2_B_Color1.glb" scale={1.1} instances={flowerSingleRight} />
  <Nature url="/nature/gltf/Grass_1_B_Color1.glb" scale={1.0} instances={cloversLeft} />
  <Nature url="/nature/gltf/Grass_2_C_Color1.glb" scale={1.0} instances={cloversRight} />
  {#if !lowPower}
    <Nature url="/nature/gltf/animal-bunny.glb" scale={0.6} instances={animalBunny} />
    <Nature url="/nature/gltf/animal-cat.glb" scale={0.6} instances={animalCat} />
    <Nature url="/nature/gltf/animal-panda.glb" scale={0.6} instances={animalPanda} />
  {/if}
{/if}

<!-- Receptionist desk (lebih kecil & elegan: panel dusty rose, meja ivory, trim emas) -->
<T.Group position={[4, 0, -4]} rotation.y={Math.PI / 2}>
  <!-- Front panel -->
  <T.Mesh position={[0, 0.5, 0]} castShadow>
    <T.BoxGeometry args={[2.6, 1.0, 0.85]} />
    <T.MeshToonMaterial color="#c97f93" gradientMap={gradient} />
  </T.Mesh>
  <!-- Ivory tabletop -->
  <T.Mesh position={[0, 1.04, 0]} castShadow>
    <T.BoxGeometry args={[2.7, 0.08, 0.95]} />
    <T.MeshToonMaterial color="#fff3dd" gradientMap={gradient} />
  </T.Mesh>
  <!-- Gold trim atas & bawah (sisi depan) -->
  <T.Mesh position={[0, 0.98, 0.45]}>
    <T.BoxGeometry args={[2.6, 0.05, 0.06]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.04, 0.45]}>
    <T.BoxGeometry args={[2.6, 0.05, 0.06]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <!-- Garland bunga dan daun di panel depan meja. -->
  {#each deskGarlandLeaves as leaf, i}
    <T.Mesh
      geometry={backdropLeafGeo}
      material={i % 2 === 0 ? bouquetLeafMat : bouquetLeafDarkMat}
      position={[leaf[0], leaf[1], 0.48]}
      rotation.z={leaf[2]}
      scale={[0.86, 0.34, 0.26]}
      castShadow
    />
  {/each}
  {#each deskGarlandFlowers as flower, i}
    <T.Group position={[flower[0], flower[1], 0.6]} scale={flower[2] * 0.9}>
      {#each [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2] as angle}
        <T.Mesh
          geometry={backdropFlowerPetalGeo}
          position={[Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0]}
          rotation.z={angle}
          scale={[0.9, 0.58, 0.36]}
          castShadow
        >
          <T.MeshToonMaterial color={backdropFlowerColors[(i + 1) % backdropFlowerColors.length]} gradientMap={gradient} />
        </T.Mesh>
      {/each}
      <T.Mesh geometry={backdropFlowerCenterGeo} material={bouquetCenterMat} position={[0, 0, 0.08]} scale={0.82} />
    </T.Group>
  {/each}
  <!-- Pot meja: reuse design stageBouquet, scale kecil -->
  <T.Group position={[0.88, 1.08, 0.04]} scale={0.32} rotation.y={Math.PI + 0.05}>
    <T.Mesh position={[0, 0.24, 0]} castShadow>
      <T.CylinderGeometry args={[0.34, 0.22, 0.48, 10]} />
      <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
    </T.Mesh>
    <T.Mesh position={[0, 0.48, 0]}>
      <T.TorusGeometry args={[0.34, 0.045, 6, 16]} />
      <T.MeshToonMaterial color="#f1d99e" gradientMap={gradient} />
    </T.Mesh>
    {#each [-0.42, -0.2, 0, 0.2, 0.42] as stemX, i}
      <T.Mesh
        geometry={bouquetStemGeo}
        material={bouquetStemMat}
        position={[stemX * 0.62, 0.98 + (i % 2) * 0.1, 0]}
        rotation.z={stemX * -0.42}
      />
    {/each}
    {#each bouquetLeaves as leaf, i}
      <T.Mesh
        geometry={bouquetLeafGeo}
        material={i % 2 === 0 ? bouquetLeafMat : bouquetLeafDarkMat}
        position={[leaf[0], leaf[1], leaf[2]]}
        rotation.z={leaf[3]}
        scale={[0.55, 1.35, 0.38]}
        castShadow
      />
    {/each}
    {#each bouquetBlooms as bloom}
      <T.Group position={bloom.position} scale={bloom.scale}>
        {#each [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3] as angle}
          <T.Mesh
            geometry={bouquetPetalGeo}
            position={[Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0]}
            scale={[1.25, 0.72, 0.5]}
            rotation.z={angle}
            castShadow
          >
            <T.MeshToonMaterial color={bloom.color} gradientMap={gradient} />
          </T.Mesh>
        {/each}
        <T.Mesh geometry={bouquetCenterGeo} material={bouquetCenterMat} position={[0, 0, 0.12]} castShadow />
      </T.Group>
    {/each}
  </T.Group>
  <!-- Nampan / buku tamu kecil (kiri, berseberangan dengan vas) -->
  <T.Mesh position={[-0.8, 1.12, 0.1]} castShadow>
    <T.BoxGeometry args={[0.5, 0.04, 0.34]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
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

<!-- Wedding Stage — berlapis: sub-base, lantai, trim, anak tangga, runner, backdrop ber-frame -->
<T.Group position={[0, 0, -18]}>
  <!-- Sub-base lebih gelap & sedikit lebih besar dari lantai -->
  <T.Mesh position={[0, 0.15, -0.05]} castShadow receiveShadow>
    <T.BoxGeometry args={[10.9, 0.3, 5.1]} />
    <T.MeshToonMaterial color="#6b2a3a" gradientMap={gradient} />
  </T.Mesh>
  <!-- Lantai utama (burgundy lembut, top = 0.7 menyam STAGE.height) -->
  <T.Mesh position={[0, 0.35, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[10.5, 0.7, 4.8]} />
    <T.MeshToonMaterial color="#9c3a52" gradientMap={gradient} />
  </T.Mesh>
  <!-- Trim lantai ivory -->
  <T.Mesh position={[0, 0.73, 0]} receiveShadow>
    <T.BoxGeometry args={[10.2, 0.06, 4.5]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <!-- Skirt emas di sisi depan panggung -->
  <T.Mesh position={[0, 0.35, 2.43]} castShadow>
    <T.BoxGeometry args={[10.5, 0.5, 0.06]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <!-- 3 anak tangga terpisah (kotak bertingkat, riser tegas) sejajar ramp.
       Ramp: world z -15.8 (y=0.7) → -14.7 (y=0); local z 2.2→3.3.
       Tiap step: tinggi 0.23, kedalaman 0.37, lebar 3.5. -->
  <!-- Step 3: sedikit di atas lantai panggung agar bidang yang overlap tidak z-fighting. -->
  <T.Mesh position={[0, 0.595, 2.38]} castShadow receiveShadow>
    <T.BoxGeometry args={[3.5, 0.23, 0.37]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.712, 2.38]} receiveShadow>
    <T.PlaneGeometry args={[1.5, 0.37]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <!-- Step 2 (tengah, top = 0.47) -->
  <T.Mesh position={[0, 0.355, 2.75]} castShadow receiveShadow>
    <T.BoxGeometry args={[3.5, 0.23, 0.37]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.472, 2.75]} receiveShadow>
    <T.PlaneGeometry args={[1.5, 0.37]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <!-- Step 1 (terbawah, top = 0.23, menyentuh tanah) -->
  <T.Mesh position={[0, 0.115, 3.12]} castShadow receiveShadow>
    <T.BoxGeometry args={[3.5, 0.23, 0.37]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.232, 3.12]} receiveShadow>
    <T.PlaneGeometry args={[1.5, 0.37]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <!-- Trim emas pada riser depan tiap step -->
  <T.Mesh position={[0, 0.115, 3.305]}>
    <T.BoxGeometry args={[3.5, 0.04, 0.02]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.355, 2.935]}>
    <T.BoxGeometry args={[3.5, 0.04, 0.02]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 0.595, 2.565]}>
    <T.BoxGeometry args={[3.5, 0.04, 0.02]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <!-- Runner karpet merah di atas panggung + tepi emas -->
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.715, -0.1]} receiveShadow>
    <T.PlaneGeometry args={[2.2, 4.4]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[-1.1, 0.72, -0.1]} receiveShadow>
    <T.PlaneGeometry args={[0.06, 4.4]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[1.1, 0.72, -0.1]} receiveShadow>
    <T.PlaneGeometry args={[0.06, 4.4]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <!-- Backdrop ber-frame & drapery (kedalaman nyata) -->
  <T.Mesh position={[0, 2.5, -2.35]} castShadow>
    <T.BoxGeometry args={[9.4, 4.8, 0.1]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 2.5, -2.2]} receiveShadow>
    <T.BoxGeometry args={[9.0, 4.5, 0.16]} />
    <T.MeshToonMaterial color="#f7efe0" gradientMap={gradient} />
  </T.Mesh>
  <!-- Drapery samping (dusty rose) + valance atas -->
  <T.Mesh position={[-3.7, 2.4, -2.05]} castShadow>
    <T.BoxGeometry args={[1.1, 4.0, 0.12]} />
    <T.MeshToonMaterial color="#d96b7a" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[3.7, 2.4, -2.05]} castShadow>
    <T.BoxGeometry args={[1.1, 4.0, 0.12]} />
    <T.MeshToonMaterial color="#d96b7a" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 4.6, -2.05]} castShadow>
    <T.BoxGeometry args={[6.4, 0.45, 0.14]} />
    <T.MeshToonMaterial color="#d96b7a" gradientMap={gradient} />
  </T.Mesh>
  <!-- Cincin monogram (fitur sekunder) -->
  <T.Mesh position={[0, 3.1, -2.0]}>
    <T.TorusGeometry args={[1.4, 0.14, 10, 28]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[-2.2, 3.05, -1.95]}>
    <T.TorusGeometry args={[0.85, 0.12, 8, 22]} />
    <T.MeshToonMaterial color="#e8c98a" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[2.2, 3.05, -1.95]}>
    <T.TorusGeometry args={[0.85, 0.12, 8, 22]} />
    <T.MeshToonMaterial color="#e8c98a" gradientMap={gradient} />
  </T.Mesh>
  <!-- Simbol cinta berlapis di tengah lingkaran utama. -->
  <T.Mesh geometry={backdropHeartGeo} position={[0, 3.12, -1.82]} scale={[1.18, 1.18, 1]} castShadow>
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh geometry={backdropHeartGeo} position={[0, 3.12, -1.79]} scale={[0.98, 0.98, 1]} castShadow>
    <T.MeshToonMaterial color="#c95778" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh geometry={backdropHeartGeo} position={[0, 3.16, -1.76]} scale={[0.5, 0.5, 1]}>
    <T.MeshToonMaterial color="#f9d7df" gradientMap={gradient} />
  </T.Mesh>
  <!-- Garland daun mengikuti ketiga lingkaran backdrop. -->
  {#each backdropLeaves as leaf, i}
    <T.Mesh
      geometry={backdropLeafGeo}
      material={i % 2 === 0 ? bouquetLeafMat : bouquetLeafDarkMat}
      position={[leaf[0], leaf[1], -1.8]}
      rotation.z={leaf[2]}
      scale={[1.45, 0.58, 0.42]}
      castShadow
    />
  {/each}
  <!-- Bunga berlapis pada bagian atas, bawah, dan lingkaran samping. -->
  {#each backdropFlowers as flower, i}
    <T.Group position={[flower[0], flower[1], -1.72]} scale={flower[2]}>
      {#each [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2] as angle}
        <T.Mesh
          geometry={backdropFlowerPetalGeo}
          position={[Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0]}
          rotation.z={angle}
          scale={[1.18, 0.76, 0.48]}
          castShadow
        >
          <T.MeshToonMaterial color={backdropFlowerColors[i % backdropFlowerColors.length]} gradientMap={gradient} />
        </T.Mesh>
      {/each}
      <T.Mesh geometry={backdropFlowerCenterGeo} material={bouquetCenterMat} position={[0, 0, 0.1]} />
    </T.Group>
  {/each}
  <!-- Cahaya hangat dekat backdrop (tanpa shadow, hemat) -->
  <T.PointLight position={[0, 4.2, -1.6]} color="#ffd9a0" intensity={1.5} distance={14} decay={1.4} />
  <!-- Buket panggung besar: vas emas, foliage bertingkat, dan bunga berlapis. -->
  {#each stageBouquets as bouquet}
    <T.Group position={bouquet.position} scale={bouquet.scale} rotation.y={bouquet.rotationY}>
      <T.Mesh position={[0, 0.24, 0]} castShadow>
        <T.CylinderGeometry args={[0.34, 0.22, 0.48, 10]} />
        <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
      </T.Mesh>
      <T.Mesh position={[0, 0.48, 0]}>
        <T.TorusGeometry args={[0.34, 0.045, 6, 16]} />
        <T.MeshToonMaterial color="#f1d99e" gradientMap={gradient} />
      </T.Mesh>
      {#each [-0.42, -0.2, 0, 0.2, 0.42] as stemX, i}
        <T.Mesh
          geometry={bouquetStemGeo}
          material={bouquetStemMat}
          position={[stemX * 0.62, 0.98 + (i % 2) * 0.1, 0]}
          rotation.z={stemX * -0.42}
        />
      {/each}
      {#each bouquetLeaves as leaf, i}
        <T.Mesh
          geometry={bouquetLeafGeo}
          material={i % 2 === 0 ? bouquetLeafMat : bouquetLeafDarkMat}
          position={[leaf[0], leaf[1], leaf[2]]}
          rotation.z={leaf[3]}
          scale={[0.55, 1.35, 0.38]}
          castShadow
        />
      {/each}
      {#each bouquetBlooms as bloom}
        <T.Group position={bloom.position} scale={bloom.scale}>
          {#each [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3] as angle}
            <T.Mesh
              geometry={bouquetPetalGeo}
              position={[Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0]}
              scale={[1.25, 0.72, 0.5]}
              rotation.z={angle}
              castShadow
            >
              <T.MeshToonMaterial color={bloom.color} gradientMap={gradient} />
            </T.Mesh>
          {/each}
          <T.Mesh geometry={bouquetCenterGeo} material={bouquetCenterMat} position={[0, 0, 0.12]} castShadow />
        </T.Group>
      {/each}
    </T.Group>
  {/each}

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

<!-- Straight_Light_Pole — 10 tiang prosedural lurus (5 kiri, 5 kanan).
     Shared geometry/material; bracket menghadap pusat jalur. Hook = titik tambat kabel. -->
{#each poleHooks as pole}
  <T.Group position={pole.position}>
    <!-- Pole_Base -->
    <T.Mesh geometry={poleBaseGeo} material={poleBaseMat} position={[0, 0.08, 0]} castShadow receiveShadow />
    <!-- Pole_Shaft -->
    <T.Mesh geometry={poleShaftGeo} material={poleShaftMat} position={[0, 1.99, 0]} castShadow receiveShadow />
    <!-- Gold trim band -->
    <T.Mesh geometry={poleTrimGeo} material={poleTrimMat} position={[0, 3.62, 0]} />
    <!-- Pole_Bracket (extends toward path center) -->
    <T.Mesh geometry={poleBracketGeo} material={poleTrimMat} position={[pole.bracketDir * 0.175, 3.72, 0]} />
    <!-- Pole_Cable_Hook -->
    <T.Mesh geometry={poleHookGeo} material={poleTrimMat} position={[pole.bracketDir * 0.35, 3.77, 0]} />
  </T.Group>
{/each}

<!-- Wedding arch di kaki tangga: dua tiang kokoh + crossbar + bracket -->
<T.Group position={[0, 0, ARCH_Z]}>
  {#each [-ARCH_POST_X, ARCH_POST_X] as px}
    <!-- Base lebar -->
    <T.Mesh position={[px, 0.12, 0]} castShadow>
      <T.BoxGeometry args={[0.5, 0.24, 0.5]} />
      <T.MeshToonMaterial color="#e8dcc4" gradientMap={gradient} />
    </T.Mesh>
    <!-- Tiang vertikal ivory -->
    <T.Mesh position={[px, 2.0, 0]} castShadow>
      <T.BoxGeometry args={[0.28, 3.6, 0.28]} />
      <T.MeshToonMaterial color="#fff3dd" gradientMap={gradient} />
    </T.Mesh>
    <!-- Trim emas pada tiang -->
    <T.Mesh position={[px, 0.28, 0.15]}>
      <T.BoxGeometry args={[0.32, 0.05, 0.05]} />
      <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
    </T.Mesh>
    <T.Mesh position={[px, 3.7, 0.15]}>
      <T.BoxGeometry args={[0.32, 0.05, 0.05]} />
      <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
    </T.Mesh>
    <!-- Bracket titik tambat kabel di puncak -->
    <T.Mesh position={[px, ARCH_TOP_Y, 0]}>
      <T.SphereGeometry args={[0.12, 8, 6]} />
      <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
    </T.Mesh>
  {/each}
  <!-- Crossbar atas (menghubungkan kedua tiang) -->
  <T.Mesh position={[0, ARCH_TOP_Y + 0.1, 0]} castShadow>
    <T.BoxGeometry args={[ARCH_POST_X * 2 + 0.4, 0.22, 0.28]} />
    <T.MeshToonMaterial color="#fff3dd" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, ARCH_TOP_Y - 0.06, 0.14]}>
    <T.BoxGeometry args={[ARCH_POST_X * 2 + 0.4, 0.05, 0.04]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
</T.Group>

<!-- Kabel lampu: dua memanjang sisi jalan (5 tiang per sisi, hook Y=3.8m) + satu utama di arch -->
<HangingLights anchors={cableLeftAnchors} sag={0.25} bulbSpacing={1.4} bulbColors={bulbWarm} />
<HangingLights anchors={cableRightAnchors} sag={0.25} bulbSpacing={1.4} bulbColors={bulbWarm} />
<HangingLights anchors={archCable} sag={0.2} bulbSpacing={0.9} bulbColors={bulbWarm} />

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
  <T.Mesh position={[4, 0.5, -4]} visible={false}>
    <T.BoxGeometry args={[0.9, 1.0, 2.7]} />
    <T.MeshBasicMaterial />
  </T.Mesh>
  <!-- Kotak ucapan -->
  <T.Mesh position={[-5, 1.0, -10]} visible={false}>
    <T.BoxGeometry args={[0.8, 1.6, 0.7]} />
    <T.MeshBasicMaterial />
  </T.Mesh>
</T.Group>
