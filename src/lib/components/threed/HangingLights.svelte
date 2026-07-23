<script lang="ts">
  import { T } from '@threlte/core'
  import { untrack } from 'svelte'
  import * as THREE from 'three'

  // Sistem kabel lampu berbasis anchor (titik dunia). Kabel mengikuti kurva
  // Catmull-Rom yang melewati tiap anchor + titik tengah yang diturunkan oleh
  // `sag`, sehingga tali terlihat menyangga alami di antara tiang. Bohlam
  // ditempatkan tepat di kurva pada interval tetap — selalu stabil lintas frame.
  //
  // Material kabel & bohlam memakai MeshBasicMaterial (bukan toon) supaya:
  //   1. bohlam terlihat bersinar (emissive-like, toneMapped=false), dan
  //   2. kabel & bohlam diabaikan oleh camera collision raycast (lihat
  //      CameraRig.svelte::isDecorative) — tidak memicu glitch zoom.

  export type LightAnchor = [number, number, number]

  let {
    anchors,
    sag = 0.25,
    bulbSpacing = 1.4,
    bulbColors = ['#ffd24a'],
    cableColor = '#3a3a3a',
    cableRadius = 0.018,
    bulbRadius = 0.07,
    skipEndBulbs = true
  }: {
    anchors: LightAnchor[]
    sag?: number
    bulbSpacing?: number
    bulbColors?: string[]
    cableColor?: string
    cableRadius?: number
    bulbRadius?: number
    skipEndBulbs?: boolean
  } = $props()

  // Bangun titik kontrol: anchor diselingi titik tengah yang diturunkan = sag.
  function buildControlPoints(): THREE.Vector3[] {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < anchors.length; i++) {
      pts.push(new THREE.Vector3(...anchors[i]))
      if (i < anchors.length - 1) {
        const a = anchors[i]
        const b = anchors[i + 1]
        pts.push(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2))
      }
    }
    return pts
  }

  // Props adalah konfigurasi statis; bangun kabel sekali di init (bukan reaktif).
  const { curve, bulbs, bulbCount } = untrack(() => {
    const ctrl = buildControlPoints()
    const c = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.5)
    const len = c.getLength()
    const count = Math.max(1, Math.round(len / bulbSpacing))
    // getSpacedPoints menyertakan titik ujung (anchor/tiang); buang ujung agar
    // bohlam tidak menumpuk dengan kepala lampu tiang.
    const sampled = c.getSpacedPoints(count)
    const bs = (skipEndBulbs ? sampled.slice(1, -1) : sampled).map(
      (p) => p.toArray() as [number, number, number]
    )
    return { curve: c, bulbs: bs, bulbCount: count }
  })
</script>

<!-- Kabel -->
<T.Mesh>
  <T.TubeGeometry args={[curve, Math.max(8, bulbCount * 4), cableRadius, 5, false]} />
  <T.MeshBasicMaterial color={cableColor} />
</T.Mesh>

<!-- Bohlam menempel pada kurva -->
{#each bulbs as b, i}
  <T.Mesh position={b}>
    <T.SphereGeometry args={[bulbRadius, 8, 6]} />
    <T.MeshBasicMaterial color={bulbColors[i % bulbColors.length]} toneMapped={false} />
  </T.Mesh>
{/each}
