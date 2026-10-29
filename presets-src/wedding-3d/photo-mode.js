import {weddingInfo} from './venue-data.js';

// Copy the freshly rendered canvas synchronously. No persistent WebGL buffer,
// second renderer or extra render target is needed for snapshots.
export function makePhotoPostcard(source,createCanvas=()=>document.createElement('canvas')){
  const output=createCanvas(),scale=Math.min(1,1600/Math.max(source.width,source.height));
  const width=Math.max(1,Math.round(source.width*scale)),height=Math.max(1,Math.round(source.height*scale));
  const border=Math.round(Math.max(12,width*.027)),footer=Math.round(Math.max(84,width*.13));
  output.width=width+border*2;output.height=height+border*2+footer;
  const ctx=output.getContext('2d');ctx.fillStyle='#fff8eb';ctx.fillRect(0,0,output.width,output.height);
  ctx.drawImage(source,border,border,width,height);
  ctx.strokeStyle='#d8bd95';ctx.lineWidth=1;ctx.strokeRect(border-.5,border-.5,width+1,height+1);
  ctx.textAlign='center';ctx.fillStyle='#957459';ctx.font=`${Math.max(11,width*.018)}px Arial`;
  ctx.fillText('THE WEDDING OF',output.width/2,height+border+footer*.31);
  ctx.fillStyle='#69523d';ctx.font=`${Math.max(26,width*.044)}px Georgia`;
  ctx.fillText(weddingInfo.couple,output.width/2,height+border+footer*.73,width*.88);
  return output;
}

export function createPhotoMode({renderer,scene,camera,getEnabled,isBusy,isNearCouple,onChange,onAngle}){
  const openButton=document.createElement('button');openButton.id='photoToggle';openButton.type='button';openButton.title='Mode foto';openButton.setAttribute('aria-label','Buka mode foto');openButton.setAttribute('aria-pressed','false');
  openButton.setAttribute('aria-controls','photoMode');
  openButton.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 6l1.5-2h5L16 6h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/><circle cx="12" cy="12.5" r="4"/></svg><span>Mode foto</span>';
  document.querySelector('.view-tools').append(openButton);
  const panel=document.createElement('section');panel.id='photoMode';panel.hidden=true;panel.setAttribute('aria-label','Mode foto');
  panel.innerHTML=`<div class="photo-top"><span>Mode foto</span><button type="button" id="photoExit">Kembali ke pulau <span aria-hidden="true">×</span></button></div><div class="photo-viewfinder" aria-hidden="true"></div><div class="photo-controls"><p id="photoHint">Geser layar untuk mengatur sudut foto.</p><div class="photo-angles" role="group" aria-label="Sudut foto"><button type="button" data-photo-angle="free" aria-pressed="true">Sudut sekarang</button><button type="button" data-photo-angle="portrait" aria-pressed="false">Potret karakter</button><button type="button" data-photo-angle="couple" aria-pressed="false">Bersama pengantin</button></div><button type="button" id="photoShutter">Ambil foto</button><p id="photoStatus" role="status" aria-live="polite"></p></div>`;
  const dialog=document.createElement('dialog');dialog.id='photoResult';dialog.setAttribute('aria-labelledby','photoResultTitle');dialog.innerHTML='<div class="photo-result-sheet"><h2 id="photoResultTitle">Kenangan dari pulau</h2><img id="photoImage" alt="Foto kenangan di pulau pernikahan Andi dan Ratna"><p>Simpan fotonya, atau ambil lagi dengan sudut berbeda.</p><div class="photo-result-actions"><a id="photoDownload" download="Andi-Ratna-kenangan.png">Simpan foto</a><button type="button" id="photoRetake">Ambil lagi</button></div><button type="button" id="photoDone">Kembali ke pulau</button></div>';
  document.body.append(panel,dialog);
  const $=id=>document.getElementById(id),shutter=$('photoShutter'),status=$('photoStatus'),hint=$('photoHint'),coupleButton=panel.querySelector('[data-photo-angle="couple"]');
  const hiddenControls=[document.querySelector('#gameControls'),document.querySelector('#islandMenu')];
  let active=false,processing=false,url=null,generation=0,inertBefore=[];
  function revoke(){if(url){URL.revokeObjectURL(url);url=null;}}
  function close(){if(!active)return;active=false;generation++;processing=false;shutter.disabled=false;if(dialog.open)dialog.close();panel.hidden=true;document.body.classList.remove('taking-photo');hiddenControls.forEach((el,i)=>el.inert=inertBefore[i]);openButton.setAttribute('aria-pressed','false');revoke();$('photoImage').removeAttribute('src');onChange(false);document.querySelector('#menuToggle').focus({preventScroll:true});}
  function open(){if(active||!getEnabled()||isBusy())return;active=true;status.textContent='';panel.hidden=false;document.body.classList.add('taking-photo');inertBefore=hiddenControls.map(el=>el.inert);hiddenControls.forEach(el=>el.inert=true);openButton.setAttribute('aria-pressed','true');const near=isNearCouple();coupleButton.disabled=!near;hint.textContent=near?'Geser layar untuk mengatur sudut foto.':'Geser untuk mengatur sudut. Dekati pengantin untuk foto bersama.';panel.querySelectorAll('[data-photo-angle]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.photoAngle==='free')));onChange(true);shutter.focus({preventScroll:true});}
  async function capture(){
    if(!active||processing||dialog.open)return;processing=true;shutter.disabled=true;status.textContent='Menyiapkan foto…';const request=++generation;
    try{
      // render and drawImage must share the same event turn before WebGL clears.
      renderer.render(scene,camera);const postcard=makePhotoPostcard(renderer.domElement);
      const blob=await new Promise((resolve,reject)=>postcard.toBlob(b=>b?resolve(b):reject(new Error('Empty photo')),'image/png'));
      if(!active||request!==generation)return;
      revoke();url=URL.createObjectURL(blob);$('photoImage').src=url;$('photoDownload').href=url;dialog.showModal();$('photoDownload').focus();status.textContent='';
    }catch{if(active&&request===generation)status.textContent='Foto belum tersimpan. Coba ambil lagi.';}
    finally{if(request===generation){processing=false;shutter.disabled=false;}}
  }
  openButton.addEventListener('click',open);$('photoExit').addEventListener('click',close);$('photoDone').addEventListener('click',close);shutter.addEventListener('click',capture);
  $('photoRetake').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{if(active)shutter.focus({preventScroll:true});});
  panel.querySelectorAll('[data-photo-angle]').forEach(button=>button.addEventListener('click',()=>{onAngle(button.dataset.photoAngle);panel.querySelectorAll('[data-photo-angle]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));}));
  addEventListener('keydown',e=>{if(!active||dialog.open)return;if(e.key==='Escape'){e.preventDefault();close();}});
  return {open,close,capture,get active(){return active;},get resultOpen(){return dialog.open;}};
}
