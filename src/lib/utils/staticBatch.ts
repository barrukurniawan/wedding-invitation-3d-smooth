import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Gabungkan semua mesh statis di bawah `root` menjadi satu mesh per material
// yang identik secara visual. Ratusan kelopak/daun/tiang prosedural yang
// tadinya 1 draw call per mesh menjadi 1 draw call per warna/material.
// Mesh asli hanya disembunyikan (bukan dihapus) supaya Threlte tetap
// memilikinya dan cleanup saat unmount berjalan normal.

export interface StaticBatchResult {
  meshCount: number
  batchCount: number
  dispose: () => void
}

function materialKey(material: THREE.Material): string {
  const m = material as THREE.Material & {
    color?: THREE.Color
    emissive?: THREE.Color
    map?: THREE.Texture | null
    gradientMap?: THREE.Texture | null
    toneMapped?: boolean
    vertexColors?: boolean
    wireframe?: boolean
    flatShading?: boolean
  }
  return [
    m.type,
    m.color?.getHexString() ?? '',
    m.emissive?.getHexString() ?? '',
    m.map?.uuid ?? '',
    m.gradientMap?.uuid ?? '',
    m.transparent,
    m.opacity,
    m.side,
    m.toneMapped,
    m.vertexColors,
    m.wireframe,
    m.flatShading,
    m.depthWrite,
    m.depthTest
  ].join('|')
}

function geometryKey(geometry: THREE.BufferGeometry): string {
  const attrs = Object.keys(geometry.attributes)
    .sort()
    .map((name) => {
      const a = geometry.getAttribute(name)
      return `${name}:${a.itemSize}:${a.normalized}`
    })
  return `${geometry.index ? 'i' : 'n'}|${attrs.join(',')}`
}

function isBatchable(object: THREE.Object3D): object is THREE.Mesh {
  const mesh = object as THREE.Mesh
  return (
    mesh.isMesh === true &&
    !(mesh as THREE.InstancedMesh).isInstancedMesh &&
    !(mesh as THREE.SkinnedMesh).isSkinnedMesh &&
    !Array.isArray(mesh.material) &&
    Object.keys(mesh.geometry.morphAttributes).length === 0
  )
}

export function batchStaticMeshes(root: THREE.Object3D): StaticBatchResult {
  root.updateWorldMatrix(true, true)
  const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const relative = new THREE.Matrix4()

  const groups = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>()
  root.traverseVisible((object) => {
    if (object === root || !isBatchable(object)) return
    const material = object.material as THREE.Material
    const key = `${materialKey(material)}#${geometryKey(object.geometry)}`
    const group = groups.get(key)
    if (group) group.meshes.push(object)
    else groups.set(key, { material, meshes: [object] })
  })

  const batches: THREE.Mesh[] = []
  const hidden: THREE.Mesh[] = []
  for (const { material, meshes } of groups.values()) {
    if (meshes.length < 2) continue
    const parts = meshes.map((mesh) => {
      relative.multiplyMatrices(toLocal, mesh.matrixWorld)
      const geometry = mesh.geometry.clone()
      geometry.applyMatrix4(relative)
      // Transform bercermin membalik winding; balik index agar face culling tetap benar.
      if (relative.determinant() < 0 && geometry.index) {
        const index = geometry.index.array
        for (let i = 0; i < index.length; i += 3) {
          const t = index[i + 1]
          index[i + 1] = index[i + 2]
          index[i + 2] = t
        }
      }
      return geometry
    })
    const merged = mergeGeometries(parts, false)
    parts.forEach((geometry) => geometry.dispose())
    if (!merged) continue

    const batch = new THREE.Mesh(merged, material.clone())
    batch.name = `static-batch-${batches.length}`
    batch.matrixAutoUpdate = false
    root.add(batch)
    batches.push(batch)
    for (const mesh of meshes) {
      mesh.visible = false
      hidden.push(mesh)
    }
  }

  return {
    meshCount: hidden.length,
    batchCount: batches.length,
    dispose() {
      for (const batch of batches) {
        root.remove(batch)
        batch.geometry.dispose()
        ;(batch.material as THREE.Material).dispose()
      }
      for (const mesh of hidden) mesh.visible = true
    }
  }
}
