import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.js';
import {optimizedImages} from '../worker/optimized-images.js';

const ASSETS={async fetch(request){
 const path=new URL(request.url).pathname;
 const bytes=await readFile('public'+path);
 return new Response(request.method==='HEAD'?null:bytes,{headers:{
  'Content-Type':path.endsWith('.webp')?'image/webp':'image/png',
  'ETag':path,'Cache-Control':'public,max-age=0,must-revalidate'
 }});
}};
for(const [source,optimized] of Object.entries(optimizedImages)){
 for(const accept of ['image/avif,image/webp,image/*,*/*;q=0.8','image/png','']){
  const response=await worker.fetch(new Request('https://garden.test'+source,{headers:{Accept:accept}}),{ASSETS});
  const expected=accept.includes('image/webp')?optimized:source;
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Content-Type'),expected.endsWith('.webp')?'image/webp':'image/png');
  assert.match(response.headers.get('Vary'),/Accept/);
  assert.equal(response.headers.get('ETag'),expected);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile('public'+expected));
 }
 const head=await worker.fetch(new Request('https://garden.test'+source,{method:'HEAD',headers:{Accept:'image/webp'}}),{ASSETS});
 assert.equal(head.headers.get('Content-Type'),'image/webp');
 assert.equal((await head.arrayBuffer()).byteLength,0);
}
console.log('PASS: smaller lossless images, original-format fallback, cache variants and HEAD requests');
