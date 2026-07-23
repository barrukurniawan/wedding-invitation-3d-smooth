import * as THREE from 'three'

// Penyangga untuk grup proxy collision kamera. CameraRig hanya menembak sinar
// ke grup ini (beberapa kotak invisible), BUKAN seluruh scene — menghindari
// traversing ratusan mesh klon vegetasi glTF yang membebani memori/GC.
let group: THREE.Group | null = null

export function setOccluderGroup(g: THREE.Group | null) {
  group = g
}

export function getOccluderGroup(): THREE.Group | null {
  return group
}
