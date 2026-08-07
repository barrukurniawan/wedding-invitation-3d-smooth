import { copyFile, mkdir, mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { prune, resample } from '@gltf-transform/functions'

const root = process.cwd()
const modelDir = path.join(root, 'static', 'models')
const sourceDir = path.join(root, 'assets', 'models', 'source')
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'wedding-models-'))

const models = {
  'tamu.glb': ['Idle', 'Walk', 'Run'],
  'resepsionis.glb': ['Idle'],
  'pengantin-pria.glb': ['Victory'],
  'pengantin-wanita.glb': ['Victory'],
}

const io = new NodeIO()

function animationNames(document) {
  return document.getRoot().listAnimations().map((animation) => animation.getName())
}

async function assertEquivalent(source, runtime, filename) {
  const sourceScene = source.getRoot().listScenes()[0]
  const runtimeScene = runtime.getRoot().listScenes()[0]
  const sourceMeshes = source.getRoot().listMeshes().length
  const runtimeMeshes = runtime.getRoot().listMeshes().length
  const sourceSkins = source.getRoot().listSkins().length
  const runtimeSkins = runtime.getRoot().listSkins().length
  if (sourceMeshes !== runtimeMeshes || sourceSkins !== runtimeSkins) {
    throw new Error(`${filename}: mesh/skin counts changed (${sourceMeshes}/${sourceSkins} -> ${runtimeMeshes}/${runtimeSkins})`)
  }
  if (sourceScene?.listChildren().length !== runtimeScene?.listChildren().length) {
    throw new Error(`${filename}: scene root changed during trim`)
  }
}

try {
  await mkdir(sourceDir, { recursive: true })

  for (const [filename, keep] of Object.entries(models)) {
    const runtimePath = path.join(modelDir, filename)
    const sourcePath = path.join(sourceDir, filename)
    const outputPath = path.join(tempDir, filename)

    try {
      await stat(sourcePath)
    } catch {
      await copyFile(runtimePath, sourcePath)
    }

    const sourceDocument = await io.read(sourcePath)
    const available = animationNames(sourceDocument)
    for (const name of keep) {
      if (!available.includes(name)) throw new Error(`${filename}: required animation ${name} is missing`)
    }

    const document = await io.read(sourcePath)
    for (const animation of document.getRoot().listAnimations()) {
      if (!keep.includes(animation.getName())) animation.dispose()
    }
    await document.transform(resample(), prune())

    const outputDocument = await io.readBinary(await io.writeBinary(document))
    const outputNames = animationNames(outputDocument)
    if (JSON.stringify([...outputNames].sort()) !== JSON.stringify([...keep].sort())) {
      throw new Error(`${filename}: output animation list is invalid: ${outputNames.join(', ')}`)
    }
    await assertEquivalent(sourceDocument, outputDocument, filename)
    await io.write(outputPath, outputDocument)

    const before = (await stat(sourcePath)).size
    const after = (await stat(outputPath)).size
    if (after >= before) throw new Error(`${filename}: trimmed file is not smaller (${before} -> ${after})`)
    console.log(`${filename}: ${before} -> ${after} bytes; kept ${keep.join(', ')}`)
  }

  for (const filename of Object.keys(models)) {
    await rename(path.join(tempDir, filename), path.join(modelDir, filename))
  }
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
