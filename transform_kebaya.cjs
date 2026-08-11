/**
 * transform_kebaya.cjs v5
 * 
 * Restore ke kondisi v2:
 * - Rok kerucut solid di atas
 * - Kaki/legging asli (Brown pants) TETAP ADA di bawah (warna coklat)
 * - Skin mesh TIDAK dimodifikasi (kaki asli tetap ada)
 * - Warna rok & kaos dalam = coklat (#5C3A1B)
 * - Batik texture di jas
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const inputPath = path.join(__dirname, 'static/models/Doctor_Female_Old.gltf');
const gltf = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rawBuf = Buffer.from(gltf.buffers[0].uri.split(',')[1], 'base64');

function readAccessor(accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0);
  const count = acc.count;
  const typeMap = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array };
  const Ctor = typeMap[acc.componentType];
  const elemSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  return {
    data: new Ctor(rawBuf.buffer, rawBuf.byteOffset + offset, count * elemSize),
    count, elemSize, acc
  };
}

function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

let appendOffset = 0;
const allChunks = [];

function startBuffer(existingBuf) {
  const padded = Buffer.alloc((existingBuf.length + 3) & ~3);
  existingBuf.copy(padded);
  allChunks.push(padded);
  appendOffset = padded.length;
}

function appendData(typedArray) {
  const buf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
  const offset = appendOffset;
  allChunks.push(buf);
  appendOffset += buf.length;
  const padLen = ((appendOffset + 3) & ~3) - appendOffset;
  if (padLen > 0) { allChunks.push(Buffer.alloc(padLen)); appendOffset += padLen; }
  return { offset, length: buf.length };
}

startBuffer(rawBuf);


// ═══════════════════════════════════════════════════════════════
// STEP 1: Build skirt cone ON TOP of existing Brown pants (legging)
// Kita TIDAK ubah Brown primitive - kita TAMBAH sebuah primitive baru untuk rok
// Tapi karena GLTF mesh primitive must share same material per primitive,
// kita ganti Brown primitive jadi rok + PANTS tetap ada di Skin / kaki aslinya
//
// Strategi: 
// - Brown primitive -> HANYA rok (replace dengan cone skirt)
// - Pants/kaki hitam yang asli -> ini adalah Skin primitive bagian bawah (kaki)
//   yang masih ada karena kita TIDAK modifikasi Skin primitive sama sekali
// 
// Tapi kaki yang "legging hitam" asalnya adalah Brown material (pants).
// Kita perlu KEEP pants triangles DAN tambah skirt cone di atas.
// Merge: pants + skirt cone = satu primitive baru untuk Brown material
// ═══════════════════════════════════════════════════════════════

const brownPrim = gltf.meshes[0].primitives[5]; // Brown = pants + shoes
const brownPos = readAccessor(brownPrim.attributes.POSITION);
const brownNorm = readAccessor(brownPrim.attributes.NORMAL);
const brownJoints = readAccessor(brownPrim.attributes.JOINTS_0);
const brownWeights = readAccessor(brownPrim.attributes.WEIGHTS_0);
const brownIdx = readAccessor(brownPrim.indices);

// Keep ALL original brown triangles (pants + shoes = the "legging" effect)
// Just remap as-is
const origVertCount = brownPos.count;
const origIdxCount = brownIdx.data.length;

// ── Build skirt cone ──────────────────────────────────────────
const SEGMENTS = 16;
const RINGS = 6;
const WAIST_Y = 1.10;       // slightly above waist
const HEM_Y = 0.44;         // ke bawah sedikit (sama seperti v2, sampai knee)
const WAIST_R = 0.21;       // sedikit lebih lebar dari celana (radius celana ~0.19)
const HEM_R = 0.38;         // melebar ke bawah

const BONE_HIPS = 3, BONE_BODY = 2, BONE_ROOT = 0;
const BONE_UL_L = 16, BONE_UL_R = 18;

const skirtVertCount = (SEGMENTS + 1) * (RINGS + 1);
const skirtTriCount = SEGMENTS * RINGS * 2;
const skirtPos = new Float32Array(skirtVertCount * 3);
const skirtNorm = new Float32Array(skirtVertCount * 3);
const skirtJ = new Uint8Array(skirtVertCount * 4);
const skirtW = new Float32Array(skirtVertCount * 4);
const skirtIndices = new Uint16Array(skirtTriCount * 3);

for (let ring = 0; ring <= RINGS; ring++) {
  const t = ring / RINGS;
  const y = WAIST_Y + (HEM_Y - WAIST_Y) * t;
  const r = WAIST_R + (HEM_R - WAIST_R) * Math.pow(t, 0.55);

  for (let seg = 0; seg <= SEGMENTS; seg++) {
    const angle = (seg / SEGMENTS) * Math.PI * 2;
    const vi = ring * (SEGMENTS + 1) + seg;

    skirtPos[vi*3] = Math.sin(angle) * r;
    skirtPos[vi*3+1] = y;
    skirtPos[vi*3+2] = Math.cos(angle) * r;

    const nx = Math.sin(angle), nz = Math.cos(angle), ny = -0.15 * t;
    const nLen = Math.sqrt(nx*nx + ny*ny + nz*nz);
    skirtNorm[vi*3] = nx/nLen; skirtNorm[vi*3+1] = ny/nLen; skirtNorm[vi*3+2] = nz/nLen;

    if (t < 0.35) {
      skirtJ[vi*4] = BONE_HIPS; skirtJ[vi*4+1] = BONE_BODY; skirtJ[vi*4+2] = BONE_ROOT; skirtJ[vi*4+3] = BONE_ROOT;
      skirtW[vi*4] = 0.65; skirtW[vi*4+1] = 0.35; skirtW[vi*4+2] = 0.0; skirtW[vi*4+3] = 0.0;
    } else {
      const legBlend = (t - 0.35) / 0.65 * 0.25;
      const isLeft = Math.sin(angle) < 0;
      skirtJ[vi*4] = BONE_HIPS;
      skirtJ[vi*4+1] = isLeft ? BONE_UL_L : BONE_UL_R;
      skirtJ[vi*4+2] = BONE_BODY; skirtJ[vi*4+3] = BONE_ROOT;
      skirtW[vi*4] = 0.7 - legBlend; skirtW[vi*4+1] = legBlend;
      skirtW[vi*4+2] = 0.3; skirtW[vi*4+3] = 0.0;
    }
  }
}

let triI = 0;
for (let ring = 0; ring < RINGS; ring++) {
  for (let seg = 0; seg < SEGMENTS; seg++) {
    const a = ring*(SEGMENTS+1)+seg, b = a+1, c = a+(SEGMENTS+1), d = c+1;
    skirtIndices[triI++] = a; skirtIndices[triI++] = c; skirtIndices[triI++] = b;
    skirtIndices[triI++] = b; skirtIndices[triI++] = c; skirtIndices[triI++] = d;
  }
}

// ── Merge: original pants+shoes + skirt cone ──────────────────
const totalVerts = origVertCount + skirtVertCount;
const totalIdx = origIdxCount + skirtTriCount * 3;

const mPos = new Float32Array(totalVerts * 3);
const mNorm = new Float32Array(totalVerts * 3);
const mJ = new Uint8Array(totalVerts * 4);
const mW = new Float32Array(totalVerts * 4);
const mIdx = new Uint16Array(totalIdx);

// Copy original pants+shoes
for (let i = 0; i < origVertCount; i++) {
  for (let c = 0; c < 3; c++) { mPos[i*3+c] = brownPos.data[i*3+c]; mNorm[i*3+c] = brownNorm.data[i*3+c]; }
  for (let c = 0; c < 4; c++) { mJ[i*4+c] = brownJoints.data[i*4+c]; mW[i*4+c] = brownWeights.data[i*4+c]; }
}
for (let i = 0; i < origIdxCount; i++) mIdx[i] = brownIdx.data[i];

// Append skirt
mPos.set(skirtPos, origVertCount * 3);
mNorm.set(skirtNorm, origVertCount * 3);
mJ.set(skirtJ, origVertCount * 4);
mW.set(skirtW, origVertCount * 4);
for (let i = 0; i < skirtIndices.length; i++) mIdx[origIdxCount + i] = skirtIndices[i] + origVertCount;

const bMin = [Infinity,Infinity,Infinity], bMax = [-Infinity,-Infinity,-Infinity];
for (let i = 0; i < totalVerts; i++) for (let c = 0; c < 3; c++) {
  bMin[c] = Math.min(bMin[c], mPos[i*3+c]); bMax[c] = Math.max(bMax[c], mPos[i*3+c]);
}

console.log(`✓ Pants (legging) original: ${origVertCount} verts, ${origIdxCount/3} tris`);
console.log(`✓ Skirt cone added: ${skirtVertCount} verts, ${skirtTriCount} tris`);
console.log(`✓ Total merged: ${totalVerts} verts, ${totalIdx/3} tris`);

// Append to buffer
const bPosC = appendData(mPos);
const bNormC = appendData(mNorm);
const bJC = appendData(mJ);
const bWC = appendData(mW);
const bIdxC = appendData(mIdx);

const bBvStart = gltf.bufferViews.length;
gltf.bufferViews.push(
  { buffer: 0, byteOffset: bPosC.offset, byteLength: bPosC.length, target: 34962 },
  { buffer: 0, byteOffset: bNormC.offset, byteLength: bNormC.length, target: 34962 },
  { buffer: 0, byteOffset: bJC.offset, byteLength: bJC.length, target: 34962 },
  { buffer: 0, byteOffset: bWC.offset, byteLength: bWC.length, target: 34962 },
  { buffer: 0, byteOffset: bIdxC.offset, byteLength: bIdxC.length, target: 34963 }
);

const bAccStart = gltf.accessors.length;
gltf.accessors.push(
  { bufferView: bBvStart, componentType: 5126, count: totalVerts, type: 'VEC3', min: bMin, max: bMax },
  { bufferView: bBvStart+1, componentType: 5126, count: totalVerts, type: 'VEC3' },
  { bufferView: bBvStart+2, componentType: 5121, count: totalVerts, type: 'VEC4' },
  { bufferView: bBvStart+3, componentType: 5126, count: totalVerts, type: 'VEC4' },
  { bufferView: bBvStart+4, componentType: 5123, count: totalIdx, type: 'SCALAR' }
);

brownPrim.attributes.POSITION = bAccStart;
brownPrim.attributes.NORMAL = bAccStart+1;
brownPrim.attributes.JOINTS_0 = bAccStart+2;
brownPrim.attributes.WEIGHTS_0 = bAccStart+3;
brownPrim.indices = bAccStart+4;


// ═══════════════════════════════════════════════════════════════
// STEP 2: Batik texture + UV untuk jacket (Main)
// ═══════════════════════════════════════════════════════════════

const TEX_SIZE = 256;
const pixels = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
// Grayscale base (white) and pattern (dark gray) so it can be tinted by THREE.Color
const baseR = 255, baseG = 255, baseE = 255;
const patR = 100, patG = 100, patB = 100;

for (let i = 0; i < TEX_SIZE * TEX_SIZE; i++) {
  pixels[i*4] = baseR; pixels[i*4+1] = baseG; pixels[i*4+2] = baseE; pixels[i*4+3] = 255;
}
function drawDot(cx, cy, r, intensity) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const dist = Math.sqrt(dx*dx+dy*dy); if(dist>r) continue;
    const px=((cx+dx)%TEX_SIZE+TEX_SIZE)%TEX_SIZE, py=((cy+dy)%TEX_SIZE+TEX_SIZE)%TEX_SIZE;
    const idx=(py*TEX_SIZE+px)*4, blend=(1-dist/r)*intensity*0.6;
    pixels[idx]=Math.round(pixels[idx]*(1-blend)+patR*blend);
    pixels[idx+1]=Math.round(pixels[idx+1]*(1-blend)+patG*blend);
    pixels[idx+2]=Math.round(pixels[idx+2]*(1-blend)+patB*blend);
  }
}
const spacing = 32;
for (let gy=0; gy<TEX_SIZE; gy+=spacing) for (let gx=0; gx<TEX_SIZE; gx+=spacing) {
  const cx=gx+(Math.floor(gy/spacing)%2)*(spacing/2), cy=gy;
  drawDot(cx,cy,3,0.9);
  drawDot(cx+10,cy,7,0.5); drawDot(cx-10,cy,7,0.5); drawDot(cx,cy+10,7,0.5); drawDot(cx,cy-10,7,0.5);
  drawDot(cx+7,cy+7,3,0.4); drawDot(cx-7,cy+7,3,0.4); drawDot(cx+7,cy-7,3,0.4); drawDot(cx-7,cy-7,3,0.4);
}
for (let y=0; y<TEX_SIZE; y++) {
  for (const x of [Math.round(TEX_SIZE/4+Math.sin(y*0.08)*12), Math.round(TEX_SIZE*3/4+Math.cos(y*0.12+1.5)*8)]) {
    for (let t=-1; t<=1; t++) {
      const px=((x+t)%TEX_SIZE+TEX_SIZE)%TEX_SIZE, idx=(y*TEX_SIZE+px)*4;
      pixels[idx]=Math.round(pixels[idx]*0.6+patR*0.4); pixels[idx+1]=Math.round(pixels[idx+1]*0.6+patG*0.4); pixels[idx+2]=Math.round(pixels[idx+2]*0.6+patB*0.4);
    }
  }
}
function createPNG(w,h,rgba){
  const raw=Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;Buffer.from(rgba).copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}
  const comp=zlib.deflateSync(Buffer.from(raw));
  function crc32(b){let c=0xffffffff;for(let i=0;i<b.length;i++){c^=b[i];for(let j=0;j<8;j++)c=(c>>>1)^(c&1?0xedb88320:0);}return(c^0xffffffff)>>>0;}
  function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c]);}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',comp),chunk('IEND',Buffer.alloc(0))]);
}
fs.writeFileSync(path.join(__dirname,'static/models/batik_kebaya.png'),createPNG(TEX_SIZE,TEX_SIZE,Buffer.from(pixels)));
console.log('✓ Batik texture saved');

const mainPrim = gltf.meshes[0].primitives[3];
const mainPos = readAccessor(mainPrim.attributes.POSITION);
const uvData = new Float32Array(mainPos.count * 2);
for (let i = 0; i < mainPos.count; i++) {
  const x=mainPos.data[i*3], y=mainPos.data[i*3+1], z=mainPos.data[i*3+2];
  uvData[i*2] = ((Math.atan2(z,x)+Math.PI)/(2*Math.PI))*3;
  uvData[i*2+1] = ((y-0.7)/(2.1-0.7))*3;
}
const uvChunk = appendData(uvData);
const uvBvIdx = gltf.bufferViews.length;
gltf.bufferViews.push({ buffer:0, byteOffset:uvChunk.offset, byteLength:uvChunk.length, target:34962 });
const uvAccIdx = gltf.accessors.length;
gltf.accessors.push({ bufferView:uvBvIdx, componentType:5126, count:mainPos.count, type:'VEC2', min:[0,0], max:[3,3] });
mainPrim.attributes.TEXCOORD_0 = uvAccIdx;

if (!gltf.images) gltf.images=[];
gltf.images.push({ uri:'batik_kebaya.png', mimeType:'image/png' });
if (!gltf.samplers) gltf.samplers=[];
if (!gltf.samplers.length) gltf.samplers.push({ magFilter:9729, minFilter:9987, wrapS:10497, wrapT:10497 });
if (!gltf.textures) gltf.textures=[];
gltf.textures.push({ source:gltf.images.length-1, sampler:0 });
gltf.materials[3].pbrMetallicRoughness.baseColorTexture = { index:gltf.textures.length-1, texCoord:0 };
delete gltf.materials[3].pbrMetallicRoughness.baseColorFactor;


// ═══════════════════════════════════════════════════════════════
// STEP 3: Colors — coklat untuk rok & kaos dalam
// ═══════════════════════════════════════════════════════════════

// Brown/Skirt material → Coklat (#5C3A1B)
gltf.materials[5].pbrMetallicRoughness.baseColorFactor = [
  srgbToLinear(0x5C), srgbToLinear(0x3A), srgbToLinear(0x1B), 1
];
gltf.materials[5].name = 'Skirt';

// Black (kaos dalam) → Coklat sama (#5C3A1B)
gltf.materials[4].pbrMetallicRoughness.baseColorFactor = [
  srgbToLinear(0x5C), srgbToLinear(0x3A), srgbToLinear(0x1B), 1
];


// ═══════════════════════════════════════════════════════════════
// STEP 4: Save
// ═══════════════════════════════════════════════════════════════

const fullBuffer = Buffer.concat(allChunks);
gltf.buffers[0].uri = 'data:application/octet-stream;base64,' + fullBuffer.toString('base64');
gltf.buffers[0].byteLength = fullBuffer.length;

const outputPath = path.join(__dirname, 'static/models/tamu-wanita-kebaya.gltf');
fs.writeFileSync(outputPath, JSON.stringify(gltf));
console.log('✓ Saved:', outputPath);
console.log('\n═══ Done v5 ═══');
console.log('• Pants/legging ORIGINAL tetap ada (warna coklat)');
console.log('• Rok kerucut DITAMBAHKAN di atas celana');
console.log('• Skin mesh tidak dimodifikasi (kaki sinkron dengan badan)');
console.log('• Warna rok & kaos dalam = coklat #5C3A1B');
