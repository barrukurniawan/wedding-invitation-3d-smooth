<script lang="ts">
  import { useTask } from '@threlte/core'
  import * as THREE from 'three'

  let { root }: { root: THREE.Object3D } = $props()

  let veilAnchor: THREE.Group | null = null
  let elapsed = 0

  const VEIL_LENGTH = 1.48
  const VEIL_TOP_WIDTH = 0.22
  const VEIL_SHOULDER_WIDTH = 0.74
  const VEIL_BOTTOM_WIDTH = 1.05
  const VEIL_Z = -0.18

  function smoothstep(value: number) {
    return value * value * (3 - 2 * value)
  }

  function widthAt(v: number, topWidth: number, shoulderWidth: number, bottomWidth: number) {
    if (v <= 0.3) {
      return THREE.MathUtils.lerp(topWidth, shoulderWidth, smoothstep(v / 0.3))
    }
    return THREE.MathUtils.lerp(shoulderWidth, bottomWidth, smoothstep((v - 0.3) / 0.7))
  }

  function panel(
    length: number,
    topWidth: number,
    shoulderWidth: number,
    bottomWidth: number,
    zOffset: number,
    opacity: number,
  ) {
    const columns = 6
    const rows = 7
    const vertices: number[] = []
    const indices: number[] = []

    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows
      const eased = smoothstep(v)
      const halfWidth = widthAt(v, topWidth, shoulderWidth, bottomWidth)
      for (let column = 0; column <= columns; column += 1) {
        const centered = (column / columns) * 2 - 1
        vertices.push(
          centered * halfWidth,
          0.43 - v * length,
          zOffset - eased * 0.28 - centered * centered * 0.055,
        )
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = row * (columns + 1) + column
        const b = a + 1
        const c = a + columns + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: '#f9ece8',
        transparent: true,
        opacity,
        roughness: 0.86,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    mesh.name = 'BridalVeilPanel'
    mesh.frustumCulled = false
    return mesh
  }

  function trim(
    length: number,
    topWidth: number,
    shoulderWidth: number,
    bottomWidth: number,
    zOffset: number,
  ) {
    const group = new THREE.Group()
    group.name = 'BridalVeilTrim'
    const material = new THREE.MeshStandardMaterial({
      color: '#e8c4c4',
      transparent: true,
      opacity: 0.88,
      roughness: 0.62,
      depthWrite: false,
    })
    const pointAt = (side: -1 | 1, v: number) => {
      const eased = smoothstep(v)
      return new THREE.Vector3(
        side * widthAt(v, topWidth, shoulderWidth, bottomWidth),
        0.43 - v * length,
        zOffset - eased * 0.28 - 0.012,
      )
    }

    for (const side of [-1, 1] as const) {
      const curve = new THREE.CatmullRomCurve3([
        pointAt(side, 0),
        pointAt(side, 0.35),
        pointAt(side, 0.7),
        pointAt(side, 1),
      ])
      const edge = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.014, 4, false), material)
      edge.renderOrder = 4
      group.add(edge)
    }

    const bottomCurve = new THREE.CatmullRomCurve3([
      pointAt(-1, 1),
      new THREE.Vector3(0, 0.395 - length, zOffset - 0.31),
      pointAt(1, 1),
    ])
    const bottom = new THREE.Mesh(new THREE.TubeGeometry(bottomCurve, 12, 0.016, 4, false), material)
    bottom.renderOrder = 4
    group.add(bottom)
    return group
  }

  function comb() {
    const group = new THREE.Group()
    group.name = 'BridalVeilComb'
    group.position.set(0, 0.3, -0.13)
    group.rotation.x = -0.18

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.018, 5, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#d7ad58', roughness: 0.42, metalness: 0.3 }),
    )
    band.rotation.z = Math.PI / 2
    group.add(band)

    const blush = new THREE.MeshStandardMaterial({ color: '#f2c5cf', roughness: 0.78 })
    const ivory = new THREE.MeshStandardMaterial({ color: '#fff8ea', roughness: 0.8 })
    const gold = new THREE.MeshStandardMaterial({ color: '#d4a84f', roughness: 0.48, metalness: 0.18 })

    for (const [index, x] of [-0.12, 0, 0.12].entries()) {
      const flower = new THREE.Group()
      flower.position.set(x, index === 1 ? 0.055 : 0.02, 0.025)
      const petals = index === 1 ? 6 : 5
      for (let i = 0; i < petals; i += 1) {
        const angle = (i / petals) * Math.PI * 2
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 4), index === 1 ? ivory : blush)
        petal.scale.set(1.35, 0.72, 0.5)
        petal.position.set(Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, 0)
        petal.rotation.z = angle
        flower.add(petal)
      }
      flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), gold))
      group.add(flower)
    }
    return group
  }

  function dispose(object: THREE.Object3D) {
    const disposed = new Set<THREE.Material>()
    object.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (!disposed.has(material)) material.dispose()
        disposed.add(material)
      }
    })
  }

  $effect(() => {
    const head = root.getObjectByName('Head')
    const neck = root.getObjectByName('Neck') || root.getObjectByName('Torso') || root
    if (!head) return

    const cloth = new THREE.Group()
    cloth.name = 'BridalVeil'
    cloth.position.y = 0.03
    cloth.rotation.x = -0.035
    const backLayer = panel(
      VEIL_LENGTH,
      VEIL_TOP_WIDTH,
      VEIL_SHOULDER_WIDTH,
      VEIL_BOTTOM_WIDTH,
      VEIL_Z,
      0.5,
    )
    const innerLayer = panel(1.14, 0.18, 0.62, 0.84, VEIL_Z + 0.035, 0.32)
    backLayer.renderOrder = 2
    innerLayer.renderOrder = 3
    cloth.add(
      backLayer,
      innerLayer,
      trim(VEIL_LENGTH, VEIL_TOP_WIDTH, VEIL_SHOULDER_WIDTH, VEIL_BOTTOM_WIDTH, VEIL_Z),
    )

    const headComb = comb()
    neck.add(cloth)
    head.add(headComb)
    veilAnchor = cloth

    return () => {
      veilAnchor = null
      neck.remove(cloth)
      head.remove(headComb)
      dispose(cloth)
      dispose(headComb)
    }
  })

  useTask((delta) => {
    if (!veilAnchor) return
    elapsed += Math.min(delta, 0.05)
    veilAnchor.rotation.x = -0.035 + Math.sin(elapsed * 0.85) * 0.012
    veilAnchor.rotation.z = Math.sin(elapsed * 0.62 + 0.7) * 0.01
    veilAnchor.position.x = Math.sin(elapsed * 0.55) * 0.008
    veilAnchor.position.y = 0.03
  })
</script>
