<script lang="ts">
  // Inti venue: semua elemen gameplay & dekorasi yang sama di setiap venue
  // (jalur, karpet, pelaminan, resepsionis, kotak surat, arch, tiang + lampu).
  // Posisi wajib selaras dengan triggerZones/colliders di constants/triggers.ts.
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import { getToonGradient } from '../../../utils/toonMaterial'
  import HangingLights from '../HangingLights.svelte'
  import { ARCH_POST_X, ARCH_TOP_Y, ARCH_Z, lightPoles } from '../../../constants/triggers'
  import { nearbyTrigger, openModal } from '../../../stores/gameState.svelte'

  const gradient = getToonGradient()

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
  const archCable: [number, number, number][] = [
    [-ARCH_POST_X, ARCH_TOP_Y, ARCH_Z], [ARCH_POST_X, ARCH_TOP_Y, ARCH_Z]
  ]
</script>

<!-- Jalur batu pucat di tengah (lebih terang dari rumput, di bawah karpet) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, -0.02, -10]}>
  <T.PlaneGeometry args={[7.2, 40]} />
  <T.MeshToonMaterial color="#e6d2a2" gradientMap={gradient} />
</T.Mesh>
<!-- Side walk kiri-kanan (batu pucat sedikit lebih gelap dari jalur tengah) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-2.55, -0.015, -10]}>
  <T.PlaneGeometry args={[1.3, 40]} />
  <T.MeshToonMaterial color="#d8c290" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[2.55, -0.015, -10]}>
  <T.PlaneGeometry args={[1.3, 40]} />
  <T.MeshToonMaterial color="#d8c290" gradientMap={gradient} />
</T.Mesh>
<!-- Karpet merah menuju pelaminan (lebih sempit & elegan) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.005, -8]}>
  <T.PlaneGeometry args={[2.0, 36]} />
  <T.MeshToonMaterial color="#b91c3c" gradientMap={gradient} />
</T.Mesh>
<!-- Garis tepi karpet (emas champagne) -->
<T.Mesh rotation.x={-Math.PI / 2} position={[-1.03, 0.01, -8]}>
  <T.PlaneGeometry args={[0.06, 36]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[1.03, 0.01, -8]}>
  <T.PlaneGeometry args={[0.06, 36]} />
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
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.012, -14.9]}>
  <T.PlaneGeometry args={[4.0, 1.6]} />
  <T.MeshToonMaterial color="#c97f93" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[-2.0, 0.014, -14.9]}>
  <T.PlaneGeometry args={[0.07, 1.6]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[2.0, 0.014, -14.9]}>
  <T.PlaneGeometry args={[0.07, 1.6]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.014, -14.1]}>
  <T.PlaneGeometry args={[4.0, 0.07]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>
<T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.014, -15.7]}>
  <T.PlaneGeometry args={[4.0, 0.07]} />
  <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
</T.Mesh>

<!-- Receptionist desk (lebih kecil & elegan: panel dusty rose, meja ivory, trim emas) -->
<T.Group position={[4, 0, -10]} rotation.y={Math.PI / 2}>
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
<T.Group
  position={[-5, 0, -10]}
  onclick={(e: any) => {
    e.stopPropagation()
    if ($nearbyTrigger?.id === 'mailbox') {
      openModal($nearbyTrigger.action, $nearbyTrigger.npcData)
    }
  }}
  onpointerenter={() => { document.body.style.cursor = 'pointer' }}
  onpointerleave={() => { document.body.style.cursor = 'default' }}
>
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
  <T.Mesh position={[0, 0.15, -0.05]}>
    <T.BoxGeometry args={[10.9, 0.3, 5.1]} />
    <T.MeshToonMaterial color="#6b2a3a" gradientMap={gradient} />
  </T.Mesh>
  <!-- Lantai utama (burgundy lembut, top = 0.7 menyam STAGE.height) -->
  <T.Mesh position={[0, 0.35, 0]}>
    <T.BoxGeometry args={[10.5, 0.7, 4.8]} />
    <T.MeshToonMaterial color="#9c3a52" gradientMap={gradient} />
  </T.Mesh>
  <!-- Trim lantai ivory -->
  <T.Mesh position={[0, 0.73, 0]}>
    <T.BoxGeometry args={[10.2, 0.06, 4.5]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <!-- Skirt emas di sisi depan panggung -->
  <T.Mesh position={[0, 0.35, 2.43]}>
    <T.BoxGeometry args={[10.5, 0.5, 0.06]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <!-- 3 anak tangga terpisah (kotak bertingkat, riser tegas) sejajar ramp.
       Ramp: world z -15.8 (y=0.7) → -14.7 (y=0); local z 2.2→3.3.
       Tiap step: tinggi 0.23, kedalaman 0.37, lebar 3.5. -->
  <!-- Step 3: sedikit di atas lantai panggung agar bidang yang overlap tidak z-fighting. -->
  <T.Mesh position={[0, 0.595, 2.38]}>
    <T.BoxGeometry args={[3.5, 0.23, 0.37]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.712, 2.38]}>
    <T.PlaneGeometry args={[1.5, 0.37]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <!-- Step 2 (tengah, top = 0.47) -->
  <T.Mesh position={[0, 0.355, 2.75]}>
    <T.BoxGeometry args={[3.5, 0.23, 0.37]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.472, 2.75]}>
    <T.PlaneGeometry args={[1.5, 0.37]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <!-- Step 1 (terbawah, top = 0.23, menyentuh tanah) -->
  <T.Mesh position={[0, 0.115, 3.12]}>
    <T.BoxGeometry args={[3.5, 0.23, 0.37]} />
    <T.MeshToonMaterial color="#fff0dc" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.232, 3.12]}>
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
  <T.Mesh rotation.x={-Math.PI / 2} position={[0, 0.715, -0.1]}>
    <T.PlaneGeometry args={[2.2, 4.4]} />
    <T.MeshToonMaterial color="#9c2a40" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[-1.1, 0.72, -0.1]}>
    <T.PlaneGeometry args={[0.06, 4.4]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh rotation.x={-Math.PI / 2} position={[1.1, 0.72, -0.1]}>
    <T.PlaneGeometry args={[0.06, 4.4]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <!-- Backdrop ber-frame & drapery (kedalaman nyata) -->
  <T.Mesh position={[0, 2.5, -2.35]}>
    <T.BoxGeometry args={[9.4, 4.8, 0.1]} />
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 2.5, -2.2]}>
    <T.BoxGeometry args={[9.0, 4.5, 0.16]} />
    <T.MeshToonMaterial color="#f7efe0" gradientMap={gradient} />
  </T.Mesh>
  <!-- Drapery samping (dusty rose) + valance atas -->
  <T.Mesh position={[-3.7, 2.4, -2.05]}>
    <T.BoxGeometry args={[1.1, 4.0, 0.12]} />
    <T.MeshToonMaterial color="#d96b7a" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[3.7, 2.4, -2.05]}>
    <T.BoxGeometry args={[1.1, 4.0, 0.12]} />
    <T.MeshToonMaterial color="#d96b7a" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh position={[0, 4.6, -2.05]}>
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
  <T.Mesh geometry={backdropHeartGeo} position={[0, 3.12, -1.82]} scale={[1.18, 1.18, 1]}>
    <T.MeshToonMaterial color="#d9b77b" gradientMap={gradient} />
  </T.Mesh>
  <T.Mesh geometry={backdropHeartGeo} position={[0, 3.12, -1.79]} scale={[0.98, 0.98, 1]}>
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
            >
              <T.MeshToonMaterial color={bloom.color} gradientMap={gradient} />
            </T.Mesh>
          {/each}
          <T.Mesh geometry={bouquetCenterGeo} material={bouquetCenterMat} position={[0, 0, 0.12]} />
        </T.Group>
      {/each}
    </T.Group>
  {/each}

  {#each chairs as chair, i}
    <T.Group position={[chair[0], chair[1], chair[2]]} rotation.y={chair[3]}>
      <T.Mesh position={[0, -0.21, 0]}>
        <T.BoxGeometry args={[0.62, 0.12, 0.62]} />
        <T.MeshToonMaterial color="#fff5df" gradientMap={gradient} />
      </T.Mesh>
      <T.Mesh position={[0, 0.13, 0.26]}>
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
    <T.Mesh geometry={poleBaseGeo} material={poleBaseMat} position={[0, 0.08, 0]} />
    <!-- Pole_Shaft -->
    <T.Mesh geometry={poleShaftGeo} material={poleShaftMat} position={[0, 1.99, 0]} />
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
    <T.Mesh position={[px, 0.12, 0]}>
      <T.BoxGeometry args={[0.5, 0.24, 0.5]} />
      <T.MeshToonMaterial color="#e8dcc4" gradientMap={gradient} />
    </T.Mesh>
    <!-- Tiang vertikal ivory -->
    <T.Mesh position={[px, 2.0, 0]}>
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
  <T.Mesh position={[0, ARCH_TOP_Y + 0.1, 0]}>
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
