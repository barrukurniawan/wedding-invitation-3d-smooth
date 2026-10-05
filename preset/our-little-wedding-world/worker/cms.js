import DEFAULT from './default-config.js';
import {invitationHtml,adminHtml} from './page-templates.js';
export const MAIN='faris-eliza';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export function isAdmin(request,env){const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');return !!(id&&email&&env.CMS_OWNER_EMAIL&&email.toLowerCase()===env.CMS_OWNER_EMAIL.toLowerCase());}
export async function siteRecord(env,slug){const rows=await env.DB.prepare('SELECT * FROM cms_sites WHERE slug=?').bind(slug).all();return rows.results[0]||(slug===MAIN?{slug:MAIN,title:'Faris & Eliza',draft:JSON.stringify(DEFAULT),published:JSON.stringify(DEFAULT),active:1,revision:0,updated_at:0}:null);}
export async function availableSite(request,env,slug,preview=false){const row=await siteRecord(env,slug);return row&&(preview&&isAdmin(request,env)||row.active&&row.published)?row:null;}
function slugValue(value){if(typeof value!=='string'||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)||value.length>60)fail('Alamat undangan harus 3–60 huruf kecil, angka, atau tanda hubung.');if(value.length<3)fail('Alamat undangan terlalu pendek.');return value;}
function text(value,max=2000){if(typeof value!=='string'||value.length>max)fail('Teks tidak valid atau terlalu panjang.');return value;}
function mediaPath(value,slug){text(value,400);if(!/^\/assets\/[a-zA-Z0-9_.-]+$/.test(value)&&!new RegExp('^/media/'+slug+'/[a-f0-9-]{36}\\.(png|jpg|gif|webp|mp3|m4a|wav|ogg)$').test(value))fail('Media harus diunggah melalui CMS untuk undangan ini.');}
function webUrl(value,maps=false){if(!value)return;let url;try{url=new URL(value);}catch{fail('Tautan tidak valid.');}if(url.protocol!=='https:'||maps&&!['www.google.com','maps.google.com','maps.app.goo.gl','goo.gl'].includes(url.hostname))fail('Gunakan tautan HTTPS yang sesuai.');}
function validate(config,slug){if(!config||typeof config!=='object')fail('Konten tidak valid.');if(JSON.stringify(config).length>200000)fail('Konten terlalu besar.');
 for(const key of ['groom','bride','titlePrefix','startButton']){text(config.profile?.[key],100);if(!config.profile[key].trim())fail('Nama dan teks halaman awal wajib diisi.');}
 if(!Array.isArray(config.places)||config.places.length!==6)fail('Enam venue harus tetap tersedia.');
 const ids=DEFAULT.places.map(p=>p.id);for(let i=0;i<6;i++){const p=config.places[i];if(p.id!==ids[i])fail('Urutan venue tidak valid.');for(const k of ['title','subtitle','description','symbol'])text(p[k],k==='description'?4000:150);if(!Array.isArray(p.fields)||p.fields.length>30)fail('Informasi venue tidak valid.');const fields=items=>{for(const pair of items){if(!Array.isArray(pair)||pair.length!==2)fail('Baris informasi tidak valid.');pair.forEach(x=>text(x));}};fields(p.fields);
 if(p.sections){if(!Array.isArray(p.sections)||p.sections.length>20)fail('Bagian terlalu banyak.');for(const x of p.sections){text(x.title,150);if(!Array.isArray(x.fields)||x.fields.length>30)fail('Baris informasi tidak valid.');fields(x.fields);}}
 if(p.giftsBackground!==undefined)mediaPath(p.giftsBackground,slug);
 if(p.ceremonyBackground!==undefined)mediaPath(p.ceremonyBackground,slug);
 if(p.wishesBackground!==undefined)mediaPath(p.wishesBackground,slug);
 if(p.galleryBackground!==undefined)mediaPath(p.galleryBackground,slug);
 if(p.storyBackground!==undefined)mediaPath(p.storyBackground,slug);
 if(p.timeline!==undefined){if(p.id!=='story'||!Array.isArray(p.timeline)||p.timeline.length>30)fail('Maksimal 30 momen cerita.');for(const m of p.timeline){if(!m||typeof m!=='object')fail('Momen tidak valid.');text(m.time,100);text(m.title,150);text(m.description,500);}}
 if(p.events){if(!Array.isArray(p.events)||p.events.length>10)fail('Jadwal terlalu banyak.');for(const e of p.events){for(const k of ['title','date','time','venue','address'])text(e[k],500);webUrl(e.mapsUrl,true);}}
 if(p.photos){if(!Array.isArray(p.photos)||p.photos.length>30)fail('Maksimal 30 foto.');for(const f of p.photos){mediaPath(f.src,slug);text(f.alt,500);text(f.credit,150);webUrl(f.url);}}
 }
 for(const k of Object.keys(DEFAULT.assets))mediaPath(config.assets?.[k],slug);
 for(const k of ['men','woman']){mediaPath(config.characters?.[k]?.atlas,slug);if(config.characters[k].frames!==DEFAULT.characters[k].frames)fail('Jumlah frame karakter tidak sesuai.');}
 config.demo=!!config.demo;return config;
}
async function bodyJson(request){const raw=await request.text();if(raw.length>230000)fail('Konten terlalu besar.',413);try{return JSON.parse(raw);}catch{fail('Data tidak valid.');}}
const noSite=()=>json({error:'Undangan belum diterbitkan atau tidak ditemukan.'},404);
export async function cms(request,env){const u=new URL(request.url),p=u.pathname;
 if(p==='/admin.html')return Response.redirect(new URL('/admin',u),302);
 if(p==='/admin'||p==='/admin/'){
  if(!isAdmin(request,env)){const signed=!!request.headers.get('oai-authenticated-user-id');return new Response(`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/admin.css"><title>Wedding Studio · Masuk</title><main class="login-card"><span class="brand">WEDDING STUDIO</span><h1>${signed?'Akun ini belum memiliki akses':'Kelola setiap hari bahagia.'}</h1><p>${signed?'Gunakan akun ChatGPT pemilik website untuk membuka CMS.':'Masuk dengan akun ChatGPT pemilik website untuk mengelola undangan.'}</p><a class="primary" href="${signed?'/signout-with-chatgpt?return_to=%2Fadmin':'/signin-with-chatgpt?return_to=%2Fadmin'}" target="_top">${signed?'Ganti akun':'Masuk dengan ChatGPT'}</a></main></html>`,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});}
  return new Response(adminHtml,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 }
 if(p==='/api/content'){
  const slug=u.searchParams.get('site')||MAIN,preview=u.searchParams.get('preview')==='1';
  if(preview&&!isAdmin(request,env))return json({error:'Masuk sebagai admin untuk pratinjau.'},403);
  const row=await availableSite(request,env,slug,preview);if(!row)return noSite();return json({site:slug,revision:row.revision,config:JSON.parse(preview?row.draft:row.published)});
 }
 if(p.startsWith('/media/')){const parts=p.split('/'),slug=parts[2];if(!await availableSite(request,env,slug,isAdmin(request,env)))return noSite();if(!env.MEDIA)return json({error:'Media belum tersedia'},503);const obj=await env.MEDIA.get(parts.slice(2).join('/'));if(!obj)return new Response('Tidak ditemukan',{status:404});return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});}
 if(p==='/'||p==='/index.html'||/^\/w\/[a-z0-9-]+\/?$/.test(p)){
  const slug=p.startsWith('/w/')?p.split('/')[2]:MAIN,preview=u.searchParams.get('preview')==='1';if(preview&&!isAdmin(request,env))return Response.redirect(new URL('/signin-with-chatgpt?return_to='+encodeURIComponent(p+'?preview=1'),u),302);
  if(!await availableSite(request,env,slug,preview))return new Response('Undangan ini belum tersedia.',{status:404,headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'}});
  return new Response(invitationHtml.replace('<head>','<head><base href="/">'),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 }
 if(!p.startsWith('/api/admin/'))return null;
 if(!isAdmin(request,env))return json({error:'Hanya pemilik website yang dapat mengakses CMS.'},request.headers.has('oai-authenticated-user-id')?403:401);
 if(request.method==='POST'&&request.headers.get('Origin')!==u.origin)return json({error:'Permintaan tidak diizinkan.'},403);
 try{
 const route=p.slice(11);
 if(route==='sites'&&request.method==='GET'){const rows=(await env.DB.prepare("SELECT slug,title,published IS NOT NULL AS live,active,revision,updated_at,json_extract(COALESCE(published,draft),'$.assets.cover') AS cover FROM cms_sites ORDER BY updated_at DESC").all()).results;if(!rows.some(r=>r.slug===MAIN))rows.unshift({slug:MAIN,title:'Faris & Eliza',live:1,active:1,revision:0,updated_at:0});return json({sites:rows,owner:request.headers.get('oai-authenticated-user-email')});}
 if(route==='site'&&request.method==='GET'){const row=await siteRecord(env,u.searchParams.get('site'));if(!row)return noSite();return json({...row,draft:JSON.parse(row.draft),published:row.published?JSON.parse(row.published):null,defaults:{assets:DEFAULT.assets,characters:DEFAULT.characters}});}
 if(route==='media'&&request.method==='GET'){return json({media:(await env.DB.prepare('SELECT * FROM cms_media WHERE site=? ORDER BY created_at DESC LIMIT 100').bind(u.searchParams.get('site')).all()).results});}
 if(route==='wishes'&&request.method==='GET'){return json({wishes:(await env.DB.prepare('SELECT id,name,message,hidden,created_at FROM wedding_wishes WHERE site=? ORDER BY id DESC LIMIT 500').bind(u.searchParams.get('site')).all()).results});}
 if(route==='upload'&&request.method==='POST')return await upload(request,env,u);
 if(request.method!=='POST')return json({error:'Metode tidak tersedia'},405);
 const b=await bodyJson(request),slug=slugValue(b.site);
 if(route==='create'){
  if(await siteRecord(env,slug))return json({error:'Alamat undangan sudah dipakai.'},409);
  const source=await siteRecord(env,MAIN),config=JSON.parse(source.draft);config.assets=structuredClone(DEFAULT.assets);config.characters=structuredClone(DEFAULT.characters);config.places.find(x=>x.id==='gallery').photos=structuredClone(DEFAULT.places.find(x=>x.id==='gallery').photos);
  delete config.places.find(p=>p.id==='story').storyBackground;delete config.places.find(p=>p.id==='gallery').galleryBackground;delete config.places.find(p=>p.id==='wishes').wishesBackground;delete config.places.find(p=>p.id==='gifts').giftsBackground;delete config.places.find(p=>p.id==='ceremony').ceremonyBackground;
  text(b.groom,80);text(b.bride,80);if(!b.groom.trim()||!b.bride.trim())fail('Nama kedua mempelai wajib diisi.');const old=config.profile;const replaceNames=value=>typeof value==='string'?value.split(old.groom).join(b.groom).split(old.bride).join(b.bride):Array.isArray(value)?value.map(replaceNames):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceNames(v)])):value;const replaced=replaceNames(config);replaced.profile.groom=b.groom;replaced.profile.bride=b.bride;const content=JSON.stringify(validate(replaced,slug));
  await env.DB.prepare('INSERT INTO cms_sites (slug,title,draft,published,revision,active,updated_at) VALUES (?,?,?,NULL,1,1,?)').bind(slug,b.groom+' & '+b.bride,content,Date.now()).run();return json({ok:true,site:slug});
 }
 if(route==='moderate'){if(!Number.isInteger(b.id))fail('Ucapan tidak valid.');await env.DB.prepare('UPDATE wedding_wishes SET hidden=? WHERE site=? AND id=?').bind(b.hidden?1:0,slug,b.id).run();return json({ok:true});}
 const row=await siteRecord(env,slug);if(!row)return noSite();if(b.revision!==row.revision)return json({error:'Konten telah diubah di tab lain. Muat ulang sebelum menyimpan.'},409);
 if(!['save','publish','visibility','restore'].includes(route))return json({error:'Tidak ditemukan'},404);
 const config=route==='restore'?JSON.parse(row.published||row.draft):['save','publish'].includes(route)?validate(b.config,slug):JSON.parse(row.draft);
 const content=JSON.stringify(config),published=route==='publish'?content:row.published,active=route==='visibility'?(b.active?1:0):route==='publish'?1:row.active;
 if(row.revision===0){await env.DB.prepare('INSERT INTO cms_sites (slug,title,draft,published,revision,active,updated_at) VALUES (?,?,?,?,1,?,?)').bind(slug,config.profile.groom+' & '+config.profile.bride,content,published,active,Date.now()).run();}
 else {const result=await env.DB.prepare('UPDATE cms_sites SET title=?,draft=?,published=?,revision=revision+1,active=?,updated_at=? WHERE slug=? AND revision=?').bind(config.profile.groom+' & '+config.profile.bride,content,published,active,Date.now(),slug,row.revision).run();if(!result.meta.changes)return json({error:'Konten berubah. Muat ulang sebelum menyimpan.'},409);}
 return json({ok:true,revision:row.revision+1});
 }catch(e){console.error('CMS request failed',e.message);return json({error:e.status?e.message:'Perubahan belum tersimpan. Coba lagi.'},e.status||503);}
}
async function upload(request,env,url){if(!env.MEDIA)fail('Penyimpanan media belum tersedia.',503);const slug=slugValue(url.searchParams.get('site'));if(!await siteRecord(env,slug))fail('Simpan undangan sebelum mengunggah media.');const cap=20*1024*1024;if(Number(request.headers.get('Content-Length'))>cap+10000)fail('Maksimal 20 MB.',413);
 const reader=request.body.getReader(),chunks=[];let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>cap+10000){await reader.cancel();fail('Maksimal 20 MB.',413);}chunks.push(value);}const form=await new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData(),file=form.get('file');if(!file||typeof file.arrayBuffer!=='function'||file.size>cap)fail('Pilih file maksimal 20 MB.');const bytes=new Uint8Array(await file.arrayBuffer()),ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));let mime='',ext='';
 if(bytes[0]===137&&ascii(1,4)==='PNG'&&bytes[4]===13){mime='image/png';ext='png';}else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){mime='image/jpeg';ext='jpg';}else if(['GIF87a','GIF89a'].includes(ascii(0,6))){mime='image/gif';ext='gif';}else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'){mime='image/webp';ext='webp';}else if(ascii(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224){mime='audio/mpeg';ext='mp3';}else if(ascii(4,8)==='ftyp'){mime='audio/mp4';ext='m4a';}else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE'){mime='audio/wav';ext='wav';}else if(ascii(0,4)==='OggS'){mime='audio/ogg';ext='ogg';}else fail('Format file tidak didukung. Gunakan PNG, JPG, GIF, WebP atau audio.');
 const slot=String(form.get('slot')||'gallery'),dimensions={map:[1536,1024],men:[680,544],woman:[544,544],guests:[1254,1254],seated:[1536,1024],hosts:[1254,1254]};
 if(![...Object.keys(DEFAULT.assets),'men','woman','gallery'].includes(slot))fail('Jenis media tidak valid.');if(['music','click'].includes(slot)!==mime.startsWith('audio/'))fail('Pilih tipe file sesuai kolom.');
 if(dimensions[slot]){if(mime!=='image/png'||bytes.length<24)fail('Aset ini harus berupa PNG dengan ukuran yang sesuai.');const dv=new DataView(bytes.buffer);if(dv.getUint32(16)!==dimensions[slot][0]||dv.getUint32(20)!==dimensions[slot][1])fail('Ukuran wajib '+dimensions[slot].join(' × ')+' piksel.');}
 const key=slug+'/'+crypto.randomUUID()+'.'+ext;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:mime}});await env.DB.prepare('INSERT INTO cms_media (key,site,name,mime,size,created_at) VALUES (?,?,?,?,?,?)').bind(key,slug,String(file.name).slice(0,180),mime,file.size,Date.now()).run();return json({url:'/media/'+key,name:file.name,mime});
}
