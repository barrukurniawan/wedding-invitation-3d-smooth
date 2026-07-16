import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { retargetClip } from 'three/addons/utils/SkeletonUtils.js'

const gltfLoader = new GLTFLoader()
const fbxLoader = new FBXLoader()

const cache = new Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }>()

function loadAnimFile(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  const cached = cache.get(url)
  if (cached) return Promise.resolve(cached)

  const isFbx = url.toLowerCase().endsWith('.fbx')

  return new Promise((resolve, reject) => {
    if (isFbx) {
      fbxLoader.load(url, (group) => {
        const result = { scene: group, animations: group.animations }
        cache.set(url, result)
        resolve(result)
      }, undefined, reject)
    } else {
      gltfLoader.load(url, (gltf) => {
        const result = { scene: gltf.scene, animations: gltf.animations }
        cache.set(url, result)
        resolve(result)
      }, undefined, reject)
    }
  })
}

function findSkinnedMesh(root: THREE.Object3D): THREE.SkinnedMesh | undefined {
  let result: THREE.SkinnedMesh | undefined
  root.traverse((obj) => {
    if (!result && (obj as THREE.SkinnedMesh).isSkinnedMesh) {
      result = obj as THREE.SkinnedMesh
    }
  })
  return result
}

function getSourceSkeleton(root: THREE.Group): THREE.Skeleton | undefined {
  const mesh = findSkinnedMesh(root)
  if (mesh?.skeleton) return mesh.skeleton

  const bones: THREE.Bone[] = []
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones.push(obj as THREE.Bone)
  })
  if (bones.length === 0) return undefined

  return new THREE.Skeleton(bones)
}

// TARGET bone name → SOURCE (Mixamo) bone name
const boneMap: Record<string, string> = {
  Hips: 'mixamorigHips',
  Abdomen: 'mixamorigSpine',
  Torso: 'mixamorigSpine1',
  Neck: 'mixamorigNeck',
  Head: 'mixamorigHead',
  ShoulderL: 'mixamorigLeftShoulder',
  UpperArmL: 'mixamorigLeftArm',
  LowerArmL: 'mixamorigLeftForeArm',
  FistL: 'mixamorigLeftHand',
  ShoulderR: 'mixamorigRightShoulder',
  UpperArmR: 'mixamorigRightArm',
  LowerArmR: 'mixamorigRightForeArm',
  FistR: 'mixamorigRightHand',
  UpperLegL: 'mixamorigLeftUpLeg',
  LowerLegL: 'mixamorigLeftLeg',
  FootL: 'mixamorigLeftFoot',
  UpperLegR: 'mixamorigRightUpLeg',
  LowerLegR: 'mixamorigRightLeg',
  FootR: 'mixamorigRightFoot',
}

const clipCache = new Map<string, THREE.AnimationClip[]>()

export async function loadRetargetedClips(
  animUrl: string,
  modelScene: THREE.Object3D
): Promise<THREE.AnimationClip[]> {
  const cached = clipCache.get(animUrl)
  if (cached) return cached

  const animData = await loadAnimFile(animUrl)

  const targetMesh = findSkinnedMesh(modelScene)
  const sourceSkeleton = getSourceSkeleton(animData.scene)

  if (!targetMesh?.skeleton) {
    console.warn('[anim] Model tidak punya SkinnedMesh/skeleton')
    return []
  }
  if (!sourceSkeleton) {
    console.warn('[anim] File animasi tidak punya skeleton')
    return []
  }

  console.log('[anim] Target bones:', targetMesh.skeleton.bones.map((b: THREE.Bone) => b.name).join(', '))
  console.log('[anim] Source bones:', sourceSkeleton.bones.map((b: THREE.Bone) => b.name).slice(0, 10).join(', '), '...')

  const retargeted = animData.animations.map((clip) => {
    const result = retargetClip(targetMesh, sourceSkeleton, clip, {
      names: boneMap,
      hip: 'mixamorigHips',
      hipInfluence: new THREE.Vector3(0, 0, 0),
    })
    console.log(`[anim] Retargeted "${clip.name}": ${result?.tracks.length || 0} tracks`)
    return result
  }).filter((c): c is THREE.AnimationClip => !!c)

  clipCache.set(animUrl, retargeted)
  return retargeted
}
