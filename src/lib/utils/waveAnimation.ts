import * as THREE from 'three'

let waveCached: THREE.AnimationClip | null = null

function eulerToQuatValues(eulers: number[][]): number[] {
  const vals: number[] = []
  for (const e of eulers) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]))
    vals.push(q.x, q.y, q.z, q.w)
  }
  return vals
}

export function createWaveClip(): THREE.AnimationClip {
  if (waveCached) return waveCached

  const times = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

  const shoulderEuler = [
    [0, 0, 0.45], [0, 0, 0.9], [0, 0, 1.0], [0, 0, 1.0],
    [0, 0, 1.0], [0, 0, 1.0], [0, 0, 1.0], [0, 0, 0.9], [0, 0, 0.45],
  ]

  const upperArmEuler = [
    [0, 0, 0], [-0.6, 0, 0], [-1.0, 0, 0], [-1.0, 0, 0],
    [-1.0, 0, 0], [-1.0, 0, 0], [-1.0, 0, 0], [-0.6, 0, 0], [0, 0, 0],
  ]

  const lowerArmEuler = [
    [0, 0, 0], [0, 0, -0.4], [0, 0, 0.4], [0, 0, -0.4],
    [0, 0, 0.4], [0, 0, -0.4], [0, 0, 0.4], [0, 0, -0.2], [0, 0, 0],
  ]

  const fistEuler = [
    [0, 0, 0], [0, 0, -0.2], [0, 0, 0.2], [0, 0, -0.2],
    [0, 0, 0.2], [0, 0, -0.2], [0, 0, 0.2], [0, 0, -0.1], [0, 0, 0],
  ]

  const tracks: THREE.KeyframeTrack[] = []
  tracks.push(new THREE.QuaternionKeyframeTrack('ShoulderR.quaternion', times, eulerToQuatValues(shoulderEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('UpperArmR.quaternion', times, eulerToQuatValues(upperArmEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('LowerArmR.quaternion', times, eulerToQuatValues(lowerArmEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('FistR.quaternion', times, eulerToQuatValues(fistEuler)))

  waveCached = new THREE.AnimationClip('Wave', 2.0, tracks)
  return waveCached
}

let nodCached: THREE.AnimationClip | null = null

export function createNodClip(): THREE.AnimationClip {
  if (nodCached) return nodCached

  const times = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8]

  const neckEuler = [
    [0.0, 0, 0], [0.15, 0, 0], [-0.1, 0, 0],
    [0.12, 0, 0], [-0.08, 0, 0], [0.05, 0, 0], [0.0, 0, 0],
  ]

  const headEuler = [
    [0.0, 0, 0], [0.25, 0, 0], [-0.18, 0, 0],
    [0.2, 0, 0], [-0.12, 0, 0], [0.08, 0, 0], [0.0, 0, 0],
  ]

  const tracks: THREE.KeyframeTrack[] = []
  tracks.push(new THREE.QuaternionKeyframeTrack('Neck.quaternion', times, eulerToQuatValues(neckEuler)))
  tracks.push(new THREE.QuaternionKeyframeTrack('Head.quaternion', times, eulerToQuatValues(headEuler)))

  nodCached = new THREE.AnimationClip('Nod', 1.8, tracks)
  return nodCached
}
