import worker from '../worker/index.js';
import {createLocalDb} from './local-db.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const DB=createLocalDb(),root=resolve('public'),objects=new Map();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.m4a':'audio/mp4','.mp3':'audio/mpeg','.ttf':'font/ttf','.woff':'font/woff'};
const ASSETS={async fetch(request){const pathname=decodeURIComponent(new URL(request.url).pathname);const path=resolve(root,'.'+pathname);if(!path.startsWith(root+sep))return new Response('Not found',{status:404});try{return new Response(await readFile(path),{headers:{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}});}catch{return new Response('Not found',{status:404});}}};
const MEDIA={async put(key,body,options){objects.set(key,{body,httpMetadata:options.httpMetadata});},async get(key){return objects.get(key);}};
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers);headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');
// Optional fixture only for local CMS development; never part of the deployed Worker.
if(process.env.CMS_PREVIEW_OWNER==='1'){headers.set('oai-authenticated-user-id','local-owner');headers.set('oai-authenticated-user-email','preview@example.test');}
const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const result=await worker.fetch(request,{DB,ASSETS,MEDIA,CMS_OWNER_EMAIL:'preview@example.test'});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch(e){console.error(e);res.writeHead(500).end('Preview unavailable');}}).listen(Number(process.env.PORT||4173),'0.0.0.0');
