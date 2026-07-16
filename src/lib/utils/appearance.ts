import * as THREE from 'three'

export interface Appearance {
  skin?: string
  shirt?: string
  clothes?: string
  darkClothes?: string
  band?: string
  black?: string
  details?: string
  pants?: string
  shoes?: string
  hair?: string
  hat?: string
  detail?: string
}

const defaults: Appearance = {
  skin: '#f0c8a0',
  shirt: '#ffffff',
  clothes: '#446b88',
  darkClothes: '#2b2f3a',
  band: '#3a3a3a',
  black: '#1a1a1a',
  details: '#2a2a2a',
  pants: '#2b2f3a',
  shoes: '#1a1a1a',
  hair: '#2b1d16',
  hat: '#3a3a3a',
  detail: '#3a3a3a'
}

export function applyAppearance(root: THREE.Object3D, overrides: Partial<Appearance> = {}) {
  const cfg = { ...defaults, ...overrides }
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshBasicMaterial)) continue
      const name = mat.name
      const normalizedName = name.toLowerCase()
      let target: THREE.Color | null = null
      if (name === 'Face' || normalizedName.includes('eye') || normalizedName.includes('brow')) target = new THREE.Color('#000000')
      else if (name === 'Skin') target = new THREE.Color(cfg.skin!)
      else if (name === 'Shirt' || name === 'Clothes') target = new THREE.Color(cfg.clothes!)
      else if (name === 'DarkClothes') target = new THREE.Color(cfg.darkClothes!)
      else if (name === 'Band') target = new THREE.Color(cfg.band!)
      else if (name === 'Black') target = new THREE.Color(cfg.black!)
      else if (name === 'Details') target = new THREE.Color(cfg.details!)
      else if (name === 'Pants') target = new THREE.Color(cfg.pants!)
      else if (name === 'Belt') target = new THREE.Color(cfg.shoes!)
      else if (name === 'Hair') target = new THREE.Color(cfg.hair!)
      else if (name === 'Hat') target = new THREE.Color(cfg.hat!)
      else if (name === 'Detail') target = new THREE.Color(cfg.detail!)
      if (target) {
        ;(mat as THREE.MeshStandardMaterial).color = target
        mat.needsUpdate = true
      }
    }
  })
}
