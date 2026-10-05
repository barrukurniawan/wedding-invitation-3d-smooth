import {cms,MAIN,availableSite} from './cms.js';
import {optimizedImages} from './optimized-images.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const dirs=new Set(['north','south','east','west','north-east','north-west','south-east','south-west']);
function point(p){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!dirs.has(p.dir))throw Error('invalid');return {x:Math.max(0,Math.min(1536,p.x)),y:Math.max(0,Math.min(1024,p.y)),dir:p.dir,walking:!!p.walking};}
function state(p){const name=String(p.name||'').trim().slice(0,24);if(!name||!['men','woman','pair'].includes(p.character))throw Error('invalid');return {...point(p),name,character:p.character,companion:p.character==='pair'?point(p.companion):null};}
export default {async fetch(request,env){
 const url=new URL(request.url);
 try{const result=await cms(request,env);if(result)return result;}catch(err){console.error('Content unavailable',err);return reply({error:'Konten belum dapat dimuat'},503);}
 if(!url.pathname.startsWith('/api/')){
  const optimized=optimizedImages[url.pathname];
  if(!optimized||!['GET','HEAD'].includes(request.method))return env.ASSETS.fetch(request);
  // Retain original URLs for existing CMS records and original formats for non-WebP clients.
  const assetUrl=new URL(url);if(request.headers.get('Accept')?.includes('image/webp'))assetUrl.pathname=optimized;
  const asset=await env.ASSETS.fetch(new Request(assetUrl,request));
  const response=new Response(asset.body,asset);const vary=response.headers.get('Vary');
  response.headers.set('Vary',vary?vary+', Accept':'Accept');return response;
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return reply({error:'Forbidden'},403);
 let body;try{if(Number(request.headers.get('content-length'))>4096)return reply({error:'Too large'},413);const raw=await request.text();if(raw.length>4096)return reply({error:'Too large'},413);body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}
 if(!env.DB)return reply({error:'Taman bersama belum tersedia'},503);
 try{
 const now=Date.now(),site=typeof body.site==='string'?body.site:MAIN;
 if(!await availableSite(request,env,site,body.preview===true))return reply({error:'Undangan tidak tersedia'},404);
 if(url.pathname==='/api/join'){
  let s;try{s=state(body);}catch{return reply({error:'Nama atau karakter tidak valid'},400);}
  const id=crypto.randomUUID(),token=crypto.randomUUID();
  await env.DB.batch([env.DB.prepare('DELETE FROM garden_players WHERE seen < ?').bind(now-30000),env.DB.prepare('INSERT INTO garden_players (id,token,state,seen,site) VALUES (?,?,?,?,?)').bind(id,token,JSON.stringify(s),now,site)]);
  return reply({id,token});
 }
 if(url.pathname==='/api/wishes/list'){
  if(body.latest===true){const rows=await env.DB.prepare('SELECT id,name,message,created_at FROM wedding_wishes WHERE site=? AND hidden=0 ORDER BY id DESC LIMIT 15').bind(site).all();return reply({wishes:rows.results,hasMore:false});}
  const before=Number.isSafeInteger(body.before)&&body.before>0?body.before:Number.MAX_SAFE_INTEGER;
  const rows=await env.DB.prepare('SELECT id,name,message,created_at FROM wedding_wishes WHERE id < ? AND site=? AND hidden=0 ORDER BY id DESC LIMIT 51').bind(before,site).all();
  return reply({wishes:rows.results.slice(0,50),hasMore:rows.results.length>50});
 }
 if(url.pathname==='/api/wishes/send'){
  if(typeof body.id!=='string'||typeof body.token!=='string')return reply({error:'Session expired'},401);
  const users=await env.DB.prepare('SELECT state FROM garden_players WHERE id=? AND token=? AND site=?').bind(body.id,body.token,site).all();
  if(!users.results.length)return reply({error:'Session expired'},401);
  const message=typeof body.message==='string'?body.message.trim():'';
  const length=Array.from(new Intl.Segmenter('id',{granularity:'grapheme'}).segment(message)).length;
  if(!length||length>50||typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))return reply({error:'Ucapan harus berisi 1–50 karakter'},400);
  const name=JSON.parse(users.results[0].state).name;
  await env.DB.prepare('INSERT INTO wedding_wishes (request_id,name,message,created_at,site) VALUES (?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING').bind(body.requestId,name,message,now,site).run();
  return reply({ok:true});
 }
 if(typeof body.id!=='string'||typeof body.token!=='string')return reply({error:'Session expired'},401);
 if(url.pathname==='/api/leave'){await env.DB.prepare('DELETE FROM garden_players WHERE id=? AND token=? AND site=?').bind(body.id,body.token,site).run();return reply({ok:true});}
 if(url.pathname!=='/api/sync')return reply({error:'Not found'},404);
 let s;try{s=state(body);}catch{return reply({error:'Invalid player'},400);}
 const message=typeof body.message==='string'?Array.from(new Intl.Segmenter('id',{granularity:'grapheme'}).segment(body.message.trim()),v=>v.segment).slice(0,15).join(''):null;
 const update=message===null?env.DB.prepare('UPDATE garden_players SET state=?,seen=? WHERE id=? AND token=? AND site=?').bind(JSON.stringify(s),now,body.id,body.token,site):env.DB.prepare('UPDATE garden_players SET state=?,seen=?,message=?,message_at=? WHERE id=? AND token=? AND site=?').bind(JSON.stringify(s),now,message,now,body.id,body.token,site);
 const results=await env.DB.batch([update,env.DB.prepare('SELECT id,state,message,message_at FROM garden_players WHERE seen > ? AND id != ? AND site=?').bind(now-15000,body.id,site)]);
 if(!results[0].meta.changes)return reply({error:'Session expired'},401);
 return reply({players:results[1].results.map(row=>({id:row.id,...JSON.parse(row.state),message:now-row.message_at<5000?row.message:'',messageRemaining:Math.max(0,5000-(now-row.message_at))}))});
 }catch(err){console.error('Multiplayer unavailable',err);return reply({error:'Koneksi taman terganggu'},503);}
}};
