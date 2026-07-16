import * as THREE from 'three'

let cached: THREE.AnimationClip | null = null

export function createWaveClip(): THREE.AnimationClip {
  if (cached) return cached

  // Wave gesture: angkat lengan kanan, oscillasi pergelangan
  // Target bones: Shoulder.R, UpperArm.R, LowerArm.R, Fist.R
  const times = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

  // Shoulder.R: angkat lengan keluar dan ke atas (Z rotation besar)
  const shoulderEuler = [
    [0, 0, 0.45],   // rest
    [0, 0, 0.9],    // raise
    [0, 0, 1.0],    // up
    [0, 0, 1.0],
    [0, 0, 1.0],
    [0, 0, 1.0],
    [0, 0, 1.0],
    [0, 0, 0.9],
    [0, 0, 0.45],   // back to rest
  ]

  // UpperArm.R: bengkokan siku agar tangan dekat kepala
  const upperArmEuler = [
    [0, 0, 0],
    [-0.6, 0, 0],
    [-1.0, 0, 0],
    [-1.0, 0, 0],
    [-1.0, 0, 0],
    [-1.0, 0, 0],
    [-1.0, 0, 0],
    [-0.6, 0, 0],
    [0, 0, 0],
  ]

  // LowerArm.R: oscillasi untuk gerakan "dadah"
  const lowerArmEuler = [
    [0, 0, 0],
    [0, 0, -0.4],
    [0, 0, 0.4],
    [0, 0, -0.4],
    [0, 0, 0.4],
    [0, 0, -0.4],
    [0, 0, 0.4],
    [0, 0, -0.2],
    [0, 0, 0],
  ]

  // Fist.R: sedikit rotasi tangan
  const fistEuler = [
    [0, 0, 0],
    [0, 0, -0.2],
    [0, 0, 0.2],
    [0, 0, -0.2],
    [0, 0, 0.2],
    [0, 0, -0.2],
    [0, 0, 0.2],
    [0, 0, -0.1],
    [0, 0, 0],
  ]

  const tracks: THREE.KeyframeTrack[] = []

  function eulerToQuatValues(eulers: number[][]): number[] {
    const vals: number[] = []
    for (const e of eulers) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]))
      vals.push(q.x, q.y, q.z, q.w)
    }
    return vals
  }

  tracks.push(new THREE.QuaternionKeyframeTrack('Shoulder.R', times, eulerToQuatValues(shoulderEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('UpperArm.R', times, eulerToQuatValues(upperArmEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('LowerArm.R', times, eulerToQuatValues(lowerArmEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('Fist.R', times, eulerToQuatValues(fistEuler)))

  cached = new THREE.AnimationClip('Wave', 2.0, tracks)
  return cached
}
