<script lang="ts">
  import * as THREE from 'three'
  import { T, useTask } from '@threlte/core'
  import { confettiActive } from '../../stores/gameState.svelte'
  import { flowerColors } from '../../constants/triggers'

  let { lowPower = false }: { lowPower?: boolean } = $props()
  const COUNT = $derived(lowPower ? 40 : 72)
  const geo = new THREE.BoxGeometry(0.12, 0.18, 0.03)

  interface P { px: number; py: number; pz: number; vx: number; vy: number; vz: number; rx: number; ry: number; rz: number; spin: number }
  const particles: P[] = []
  const meshes: THREE.Mesh[] = []
  const group = new THREE.Group()
  group.visible = false

  function spawn(p: P) {
    p.px = (Math.random() - 0.5) * 9
    p.py = 2 + Math.random() * 5
    p.pz = -18 + (Math.random() - 0.5) * 4
    p.vx = (Math.random() - 0.5) * 0.045
    p.vy = -0.018 - Math.random() * 0.035
    p.vz = (Math.random() - 0.5) * 0.035
    p.rx = Math.random() * 3
    p.ry = Math.random() * 3
    p.rz = Math.random() * 3
    p.spin = (Math.random() - 0.5) * 0.15
  }

  // Initialize particles after COUNT is resolved
  let initialized = false

  useTask(() => {
    if (initialized) return
    initialized = true
    for (let i = 0; i < COUNT; i++) {
      const p: P = { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, spin: 0 }
      spawn(p)
      particles.push(p)
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(flowerColors[i % flowerColors.length]) }))
      m.castShadow = false
      group.add(m)
      meshes.push(m)
    }
  })

  useTask(() => {
    const active = $confettiActive
    if (group.visible !== active) group.visible = active
    if (!active) return
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i]
      const m = meshes[i]
      p.px += p.vx; p.py += p.vy; p.pz += p.vz
      p.ry += p.spin; p.rx += p.spin * 0.6
      if (p.py < 0.25) spawn(p)
      m.position.set(p.px, p.py, p.pz)
      m.rotation.set(p.rx, p.ry, p.rz)
    }
  })
</script>

<T is={group} />
