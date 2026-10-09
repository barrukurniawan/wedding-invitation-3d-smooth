// Tambah animasi "Wave" (melambai ke tamu) ke model pengantin runtime di
// static/models, tanpa membuang "Victory" (bisa ganti-ganti di Npcs.svelte).
//
// Gerakan dibangun dari animasi sumber (assets/models/source):
// - seluruh badan mengikuti "Idle" (bernapas/bergoyang halus),
// - lengan yang melambai memakai pose lengan terangkat dari puncak "Victory",
// - lengan bawah & kepalan diayun kiri-kanan berulang (dadah-dadah).
// Durasi = durasi Idle dengan jumlah ayunan bulat supaya loop mulus.
//
// Jalankan: npm run models:wave  (idempotent: Wave lama diganti).
// Opsi: --axis x|y|z (sumbu ayunan lokal), --amp <radian>, --bias <radian>, --out <dir>.
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { prune } from '@gltf-transform/functions'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const root = process.cwd()
const AXIS = opt('axis', 'x')
const AMPLITUDE = Number(opt('amp', '0.42'))
// Geser titik tengah ayunan ke arah luar supaya tangan tidak menyentuh kepala.
const BIAS = Number(opt('bias', '0.22'))
const OUT_DIR = path.resolve(opt('out', path.join(root, 'static', 'models')))
const FPS = 24
const WAVE_CYCLES = 6

// Pengantin wanita melambai dengan tangan kanan, pria dengan tangan kiri.
const MODELS = [
  { file: 'pengantin-wanita.glb', side: 'R' },
  { file: 'pengantin-pria.glb', side: 'L' }
]

// --- Quaternion helpers ([x, y, z, w]) ---
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
]
const qaxis = (axis, angle) => {
  const s = Math.sin(angle / 2)
  return [axis === 'x' ? s : 0, axis === 'y' ? s : 0, axis === 'z' ? s : 0, Math.cos(angle / 2)]
}
const qangle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])))
function qnlerp(a, b, t) {
  const sign = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1
  const q = a.map((v, i) => v + (b[i] * sign - v) * t)
  const len = Math.hypot(...q)
  return q.map((v) => v / len)
}

// Sampel linear keyframe pada waktu t (dibatasi ke rentang klip).
function sample(sampler, t, isRotation) {
  const input = sampler.getInput().getArray()
  const output = sampler.getOutput().getArray()
  const size = output.length / input.length
  const at = (i) => Array.from(output.slice(i * size, i * size + size))
  if (t <= input[0]) return at(0)
  if (t >= input[input.length - 1]) return at(input.length - 1)
  let i = 0
  while (input[i + 1] < t) i++
  const f = (t - input[i]) / (input[i + 1] - input[i])
  const a = at(i)
  const b = at(i + 1)
  return isRotation ? qnlerp(a, b, f) : a.map((v, k) => v + (b[k] - v) * f)
}

// Rotasi disimpan sebagai int16 ternormalisasi (diizinkan glTF untuk output rotasi).
const packOutput = (values, isRotation) =>
  isRotation ? Int16Array.from(values, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767)) : new Float32Array(values)

const duration = (animation) =>
  Math.max(...animation.listSamplers().map((s) => {
    const input = s.getInput().getArray()
    return input[input.length - 1]
  }))

async function addWave(io, { file, side }) {
  const source = await io.read(path.join(root, 'assets', 'models', 'source', file))
  const runtime = await io.read(path.join(root, 'static', 'models', file))
  const find = (doc, name) => doc.getRoot().listAnimations().find((a) => a.getName() === name)
  const idle = find(source, 'Idle')
  const victory = find(source, 'Victory')
  if (!idle || !victory) throw new Error(`${file}: butuh animasi Idle & Victory di file sumber`)

  // Idempotent: buang Wave lama beserta accessor-nya sebelum membuat yang baru.
  // Animation.dispose() tidak ikut membuang sampler/accessor, jadi buang manual.
  const previous = find(runtime, 'Wave')
  if (previous) {
    const accessors = previous.listSamplers().flatMap((s) => [s.getInput(), s.getOutput()])
    previous.listChannels().forEach((c) => c.dispose())
    previous.listSamplers().forEach((s) => s.dispose())
    previous.dispose()
    new Set(accessors).forEach((a) => a?.dispose())
    await runtime.transform(prune())
  }

  const channelOf = (animation, bone) =>
    animation.listChannels().find((c) => c.getTargetNode()?.getName() === bone && c.getTargetPath() === 'rotation')

  // Puncak Victory = saat lengan atas paling jauh dari pose awalnya (tangan terangkat).
  const upper = channelOf(victory, `UpperArm.${side}`).getSampler()
  const vTimes = upper.getInput().getArray()
  const first = sample(upper, vTimes[0], true)
  let peak = vTimes[0]
  for (const t of vTimes) if (qangle(sample(upper, t, true), first) > qangle(sample(upper, peak, true), first)) peak = t
  const raised = (bone) => sample(channelOf(victory, bone).getSampler(), peak, true)

  const total = duration(idle)
  const frames = Math.round(total * FPS)
  const times = new Float32Array(frames + 1).map((_, i) => (i / frames) * total)
  // Rotasi negatif pada sumbu ini menjauhkan tangan dari kepala (kedua sisi sama).
  const swing = (t, phase = 0) => -BIAS + AMPLITUDE * Math.sin((2 * Math.PI * WAVE_CYCLES * t) / total + phase)

  const waveRotation = {
    [`Shoulder.${side}`]: () => raised(`Shoulder.${side}`),
    [`UpperArm.${side}`]: () => raised(`UpperArm.${side}`),
    [`LowerArm.${side}`]: (t) => qmul(raised(`LowerArm.${side}`), qaxis(AXIS, swing(t))),
    [`Fist.${side}`]: (t) => qmul(raised(`Fist.${side}`), qaxis(AXIS, 0.5 * swing(t, 0.7)))
  }

  const buffer = runtime.getRoot().listBuffers()[0]
  const nodesByName = new Map(runtime.getRoot().listNodes().map((n) => [n.getName(), n]))
  const input = runtime.createAccessor('Wave_time').setType('SCALAR').setArray(times).setBuffer(buffer)
  // Channel yang tidak berubah cukup satu keyframe (hemat ukuran file).
  const inputStatic = runtime.createAccessor('Wave_time_static').setType('SCALAR').setArray(new Float32Array([0])).setBuffer(buffer)
  const wave = runtime.createAnimation('Wave')

  for (const channel of idle.listChannels()) {
    const bone = channel.getTargetNode()?.getName()
    const target = nodesByName.get(bone)
    if (!target) continue
    const targetPath = channel.getTargetPath()
    const isRotation = targetPath === 'rotation'
    const custom = isRotation ? waveRotation[bone] : undefined
    const values = []
    for (const t of times) values.push(...(custom ? custom(t) : sample(channel.getSampler(), t, isRotation)))
    const size = isRotation ? 4 : 3
    const isStatic = values.every((v, i) => Math.abs(v - values[i % size]) < 1e-5)
    const output = runtime
      .createAccessor(`Wave_${bone}_${targetPath}`)
      .setType(isRotation ? 'VEC4' : 'VEC3')
      .setArray(packOutput(isStatic ? values.slice(0, size) : values, isRotation))
      .setNormalized(isRotation)
      .setBuffer(buffer)
    const sampler = runtime
      .createAnimationSampler()
      .setInput(isStatic ? inputStatic : input)
      .setOutput(output)
      .setInterpolation(isStatic ? 'STEP' : 'LINEAR')
    wave.addSampler(sampler).addChannel(
      runtime.createAnimationChannel().setTargetNode(target).setTargetPath(targetPath).setSampler(sampler)
    )
  }

  await mkdir(OUT_DIR, { recursive: true })
  await io.write(path.join(OUT_DIR, file), runtime)
  const names = runtime.getRoot().listAnimations().map((a) => a.getName()).join(', ')
  console.log(`${file}: Wave ditambahkan (tangan ${side === 'R' ? 'kanan' : 'kiri'}, ${total.toFixed(2)}s, ${WAVE_CYCLES} ayunan, sumbu ${AXIS}) -> animasi: ${names}`)
}

await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
for (const model of MODELS) await addWave(io, model)
