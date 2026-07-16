import * as THREE from 'three'

// 3-tone gradient map untuk MeshToonMaterial (cel-shading lembut)
let cached: THREE.DataTexture | null = null

export function getToonGradient(): THREE.DataTexture {
  if (cached) return cached
  const colors = new Uint8Array([60, 130, 200, 255])
  const tex = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat)
  tex.needsUpdate = true
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  cached = tex
  return tex
}
