// Bangun static/nature/gltf/beach-pack.glb (di-commit) untuk venue "beach" dari aset
// sumber CC-BY-4.0 di assets/models/source (lihat CREDITS.md).
//
// Tiap model diambil dari node sumbernya, transform dunia di-bake ke vertex,
// dinormalkan ke meter (berdiri di y=0, pusat XZ di 0), lalu primitive
// dengan material sama digabung supaya tiap model hanya butuh sedikit draw call.
// Jalankan manual (`npm run build:beach`) setiap aset sumber berubah: folder
// sumber dikecualikan dari konteks Docker, jadi build VPS memakai file hasil.
// Node hasil dipanggil lewat <Nature modelName="Beach_Palm_1" url=".../beach-pack.glb">.

const { Logger, NodeIO, getBounds } = require('@gltf-transform/core')
const { ALL_EXTENSIONS, KHRMaterialsClearcoat } = require('@gltf-transform/extensions')
const { mergeDocuments, dedup, prune, join, meshopt, transformMesh, unpartition, weld } = require('@gltf-transform/functions')
const { MeshoptEncoder } = require('meshoptimizer')
const path = require('path')

const SOURCE_DIR = path.join(__dirname, '../assets/models/source')
const PACK = path.join(SOURCE_DIR, 'beach-assets/scene.gltf')
const PALM = path.join(SOURCE_DIR, 'palm_tree_low_poly.glb')

// [nama hasil, file sumber, node sumber (null = seluruh scene), ukuran target, sumbu ukur, anchor]
// Sumbu 'y' = tinggi; 'xz' = sisi horizontal terpanjang.
// Anchor 'base' = titik (0,0,0) di pangkal (rata-rata vertex terbawah), untuk objek
// miring seperti kelapa; default 'center' = tengah kotak pembatas.
const MODELS = [
  ['Beach_Palm_1', PACK, 'PALM1', 7.0, 'y', 'base'],
  ['Beach_Palm_2', PACK, 'PALM2', 7.5, 'y', 'base'],
  ['Beach_Palm_4', PACK, 'PALM4', 8.0, 'y', 'base'],
  ['Beach_Palm_5', PACK, 'PALM5', 6.0, 'y', 'base'],
  ['Beach_Palm_6', PALM, null, 7.5, 'y', 'base'],
  ['Beach_Umbrella_1', PACK, 'UMBRELLA1', 2.6, 'y'],
  ['Beach_Umbrella_3', PACK, 'UMBRELLA3', 2.6, 'y'],
  ['Beach_Chair_1', PACK, 'B_CHAIR1', 1.7, 'xz'],
  ['Beach_Towel_1', PACK, 'TOWEL1', 1.9, 'xz'],
  ['Beach_Towel_3', PACK, 'TOWEL3', 1.9, 'xz'],
  ['Beach_Surfboard_1', PACK, 'SURFBOARD', 2.1, 'y'],
  ['Beach_Surfboard_2', PACK, 'SURFBOARD2', 2.1, 'y'],
  ['Beach_Rocks', PACK, 'ROCKS', 2.4, 'xz'],
  ['Beach_Float_1', PACK, 'FLOAT1', 1.1, 'xz'],
  ['Beach_Yacht', PACK, 'YACHT', 9.0, 'xz'],
  ['Beach_Lifeguard_Tower', PACK, 'CABIN', 4.6, 'y']
]

function worldMatrix(node) {
  return node.getWorldMatrix()
}

// Rata-rata XZ vertex di 5% bagian terbawah model (pangkal batang).
function baseCenter(root, bounds) {
  const limit = bounds.min[1] + (bounds.max[1] - bounds.min[1]) * 0.05
  let sx = 0
  let sz = 0
  let n = 0
  for (const part of root.listChildren()) {
    for (const prim of part.getMesh().listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      const v = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v)
        if (v[1] <= limit) {
          sx += v[0]
          sz += v[2]
          n++
        }
      }
    }
  }
  return n ? [sx / n, sz / n] : [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[2] + bounds.max[2]) / 2]
}

// Bangun dokumen berisi satu node root `name` yang memuat salinan mesh
// dari subtree sumber, dengan transform dunia sudah di-bake.
async function extractModel(io, [name, file, nodeName, targetSize, axis, anchor = 'center']) {
  const doc = await io.read(file)
  doc.setLogger(new Logger(Logger.Verbosity.WARN))
  const root = doc.getRoot()
  const scene = root.listScenes()[0]
  const source = nodeName ? root.listNodes().find((n) => n.getName() === nodeName) : null
  if (nodeName && !source) throw new Error(`Node ${nodeName} tidak ditemukan di ${file}`)

  const out = doc.createNode(name)
  const parts = []
  const visit = (node) => {
    const mesh = node.getMesh()
    if (mesh) {
      const copy = mesh.clone()
      transformMesh(copy, worldMatrix(node))
      parts.push(doc.createNode(`${name}_part`).setMesh(copy))
    }
    node.listChildren().forEach(visit)
  }
  if (source) visit(source)
  else scene.listChildren().forEach(visit)
  parts.forEach((p) => out.addChild(p))

  // Kosongkan scene lalu pasang hanya model ini.
  scene.listChildren().forEach((c) => scene.removeChild(c))
  scene.addChild(out)
  await doc.transform(prune())

  // Normalisasi: pusat XZ = 0, alas = 0, skala ke ukuran target.
  const b = getBounds(out)
  const size = axis === 'y' ? b.max[1] - b.min[1] : Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2])
  const s = targetSize / size
  const [cx, cz] = anchor === 'base' ? baseCenter(out, b) : [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2]
  const t = [-cx, -b.min[1], -cz]
  // Matriks column-major: geser dulu, lalu skala seragam.
  const m = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, s * t[0], s * t[1], s * t[2], 1]
  for (const part of out.listChildren()) transformMesh(part.getMesh(), m)

  // Matte low-poly: tanpa logam/clearcoat supaya menyatu dengan scene toon.
  for (const material of root.listMaterials()) {
    material.setMetallicFactor(0).setRoughnessFactor(1)
    material.setExtension('KHR_materials_clearcoat', null)
  }
  doc.getRoot().listExtensionsUsed().forEach((ext) => {
    if (ext.extensionName === KHRMaterialsClearcoat.EXTENSION_NAME) ext.dispose()
  })

  // Model berwarna flat: UV/vertex color tidak dipakai, buang supaya file kecil.
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMaterial()?.getBaseColorTexture()) continue
      for (const semantic of prim.listSemantics()) {
        if (semantic.startsWith('TEXCOORD_') || semantic.startsWith('COLOR_')) prim.setAttribute(semantic, null)
      }
    }
  }

  // Gabung primitive bermaterial sama di antara sibling part.
  await doc.transform(join({ keepNamed: false }))
  return doc
}

async function buildBeachPack() {
  await MeshoptEncoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  let target = null
  for (const model of MODELS) {
    const doc = await extractModel(io, model)
    if (!target) target = doc
    else mergeDocuments(target, doc)
  }

  const root = target.getRoot()
  const mainScene = root.listScenes()[0]
  root.listScenes().forEach((s) => {
    if (s !== mainScene) {
      s.listChildren().forEach((c) => mainScene.addChild(c))
      s.dispose()
    }
  })
  // Pertahankan atribusi CC-BY di metadata file.
  root.getAsset().extras = {
    credits: [
      'Low Poly Beach Assets by EdwinRC (https://sketchfab.com/3d-models/low-poly-beach-assets-66c18ecd7a834d4a99dabc46b5ee6e4a), CC-BY-4.0',
      'Palm Tree Low Poly by Connor_Appleton (https://sketchfab.com/3d-models/palm-tree-low-poly-6198f5dd302644a2bc5e1d31fef46fb0), CC-BY-4.0'
    ]
  }

  target.setLogger(new Logger(Logger.Verbosity.WARN))
  await target.transform(unpartition(), dedup(), prune(), weld(), meshopt({ encoder: MeshoptEncoder }))
  // Nature.svelte sudah memasang MeshoptDecoder untuk file ini.

  const outputPath = path.join(__dirname, '../static/nature/gltf/beach-pack.glb')
  await io.write(outputPath, target)
  for (const node of mainScene.listChildren()) {
    const b = getBounds(node)
    const dims = [0, 1, 2].map((i) => (b.max[i] - b.min[i]).toFixed(2)).join(' x ')
    const prims = node.listChildren().reduce((n, c) => n + (c.getMesh()?.listPrimitives().length ?? 0), 0)
    console.log(`  ${node.getName().padEnd(22)} ${dims} m, ${prims} draw call`)
  }
  console.log(`[build-beach-pack] Successfully generated ${outputPath}`)
}

buildBeachPack().catch((err) => {
  console.error('[build-beach-pack] Error:', err)
  process.exit(1)
})
