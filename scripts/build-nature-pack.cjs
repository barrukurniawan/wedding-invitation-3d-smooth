const { NodeIO } = require('@gltf-transform/core')
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions')
const { mergeDocuments, dedup, prune, unpartition } = require('@gltf-transform/functions')
const path = require('path')

const files = [
  'Tree_1_A_Color1.glb',
  'Tree_2_A_Color1.glb',
  'Tree_2_D_Color1.glb',
  'Tree_3_A_Color1.glb',
  'Tree_4_A_Color1.glb',
  'Bush_1_A_Color1.glb',
  'Bush_2_A_Color1.glb',
  'Bush_3_A_Color1.glb',
  'Bush_4_A_Color1.glb',
  'Bush_4_D_Color1.glb',
  'Bush_4_E_Color1.glb',
  'Bush_4_F_Color1.glb',
  'Grass_1_A_Color1.glb',
  'Grass_1_B_Color1.glb',
  'Grass_1_C_Color1.glb',
  'Grass_2_A_Color1.glb',
  'Grass_2_B_Color1.glb',
  'Grass_2_C_Color1.glb'
]

async function buildNaturePack() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  let targetDoc = null
  const baseDir = path.join(__dirname, '../static/nature/gltf')

  for (const file of files) {
    const filePath = path.join(baseDir, file)
    const srcDoc = await io.read(filePath)
    const modelName = file.replace('.glb', '')
    srcDoc.getRoot().listNodes().forEach((n) => {
      n.setName(modelName)
    })
    if (!targetDoc) {
      targetDoc = srcDoc
    } else {
      mergeDocuments(targetDoc, srcDoc)
    }
  }

  const root = targetDoc.getRoot()
  const mainScene = root.listScenes()[0] || targetDoc.createScene('Scene')
  root.listScenes().forEach((s) => {
    if (s !== mainScene) {
      s.listChildren().forEach((c) => mainScene.addChild(c))
      s.dispose()
    }
  })

  await targetDoc.transform(unpartition(), dedup(), prune())

  const outputPath = path.join(baseDir, 'nature-pack.glb')
  await io.write(outputPath, targetDoc)
  console.log(`[build-nature-pack] Successfully generated ${outputPath}`)
}

buildNaturePack().catch((err) => {
  console.error('[build-nature-pack] Error:', err)
  process.exit(1)
})
