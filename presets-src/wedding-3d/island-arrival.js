import * as T from './vendor/three.module.js';
import {createGuestCharacter} from './guest-character.js';
import {PIER,pierHeight} from './island-life.js';
import {addContactShadow} from './performance.js';
import {weddingInfo} from './venue-data.js';

export const ARRIVAL={x:PIER.x+.15,z:36.5,hostX:PIER.x-.85,hostZ:33.6};
export function createArrivalHost({scene,detail}){
  const rig=createGuestCharacter({name:'Petugas penyambut dan RSVP',outfit:'suit',color:'#526b60',accent:'#c8a366',skin:'#d9a47b'},{detail});
  rig.root.position.set(ARRIVAL.hostX,pierHeight(ARRIVAL.hostZ)+.089,ARRIVAL.hostZ);rig.root.rotation.y=.32;scene.add(rig.root);
  const shadow=addContactShadow(T,scene,rig);shadow.update();
  const headY=rig.body.position.y;
  return {rig,blocks(x,z){return Math.hypot(x-ARRIVAL.hostX,z-ARRIVAL.hostZ)<.68;},update(t,player,talking){
    rig.body.position.y=headY+Math.sin(t*1.5)*.009;rig.head.rotation.x=Math.sin(t*1.7)*.035;
    if(player){const a=Math.atan2(player.x-ARRIVAL.hostX,player.z-ARRIVAL.hostZ)-rig.root.rotation.y;rig.head.rotation.y=T.MathUtils.clamp(Math.atan2(Math.sin(a),Math.cos(a)),-.55,.55);}
    const blink=t%4.8;rig.eyes.forEach(eye=>eye.scale.y=1-.955*Math.max(0,1-Math.abs(blink-3.65)/.11));
    for(const {arm,elbow,wrist,side} of rig.gestures){arm.rotation.x=-.16;arm.rotation.z=side*.15;elbow.rotation.x=-.32;elbow.rotation.z=0;wrist.rotation.z=0;if(side===1){const wave=talking?1:Math.max(0,Math.sin(t*.6));arm.rotation.z+=wave*1.15;elbow.rotation.x-=wave*.45;elbow.rotation.z=wave*(.85+Math.sin(t*4)*.13);wrist.rotation.z=Math.sin(t*4)*wave*.16;}}
  }};
}

const element=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
const count=value=>Array.from(new Intl.Segmenter('id',{granularity:'grapheme'}).segment(value)).length;
const RSVP_ENABLED=false,INTRO_STEP=3;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function createArrivalExperience({host,getPlayer,getEnabled,onPause,onComplete,onResume}){
  const dialog=document.getElementById('arrivalDialog'),content=document.getElementById('arrivalContent'),title=document.getElementById('arrivalTitle'),stepLabel=document.getElementById('arrivalStep'),back=document.getElementById('arrivalBack'),next=document.getElementById('arrivalNext'),close=document.getElementById('arrivalClose'),status=document.getElementById('arrivalStatus');
  const marker=element('button','arrival-marker','Petugas · RSVP');marker.type='button';marker.hidden=true;host.append(marker);
  let active=false,completed=false,revisiting=false,step=0,sending=false,near=false;
  let saved={};try{saved=JSON.parse(localStorage.getItem('wedding-island-rsvp')||'{}')||{};}catch{}
  const draft={guestId:uuid.test(saved.guestId)?saved.guestId:crypto.randomUUID(),name:typeof saved.name==='string'?saved.name:'',attendance:['attending','not_attending'].includes(saved.attendance)?saved.attendance:''};
  let confirmed={...draft};
  const remember=()=>{try{localStorage.setItem('wedding-island-rsvp',JSON.stringify(draft));}catch{}};remember();
  function focusTitle(){title.focus({preventScroll:true});}
  function show(){
    content.replaceChildren();status.textContent='';dialog.scrollTop=0;
    stepLabel.textContent=step===5?'RSVP TERSIMPAN':RSVP_ENABLED?`SELAMAT DATANG · ${Math.min(step+1,5)} / 5`:'SELAMAT DATANG';
    back.hidden=!RSVP_ENABLED||revisiting||step===0||step===5;next.hidden=step===4;close.hidden=!revisiting;next.textContent=step===5||(!RSVP_ENABLED&&step===INTRO_STEP)?'Jelajahi pulau':step===3?'Konfirmasi kehadiran':'Lanjut';
    if(step===0){title.textContent='Selamat datang di pulau kami!';content.append(element('p','','Halo! Saya petugas penyambut di pulau pernikahan Andi & Ratna. Senang sekali kamu sudah tiba dengan selamat di dermaga.'),element('p','','Sebelum berjalan-jalan, yuk kenalan dengan pulau ini dan kedua mempelai. Setelah itu, saya akan mencatat nama dan konfirmasi kehadiranmu.'));}
    if(step===1){title.textContent='Jalan santai, temukan ceritanya';const list=element('ul','arrival-guide');
      for(const [label,text] of [['Berjalan',matchMedia('(pointer: coarse)').matches?'Gerakkan joystick di kiri bawah layar.':'Gunakan WASD atau tombol panah untuk berjalan.'],['Melihat sekeliling','Geser layar untuk memutar kamera. Cubit layar atau gunakan tombol + dan − untuk mengatur jarak.'],['Berinteraksi','Dekati venue, lalu sentuh papan tombol yang muncul di map. Di komputer, kamu juga bisa menekan E.']]){const item=element('li','');item.append(element('strong','',label),element('span','',text));list.append(item);}content.append(list);}
    if(step===2){title.textContent='Ada banyak yang bisa kamu kunjungi';const list=element('dl','arrival-places');for(const [name,description] of [['Our Story','Cerita Andi & Ratna di laguna.'],['Gallery','Kenangan berdua di pendopo.'],['Jadwal Acara','Informasi akad dan resepsi.'],['Hadiah','Informasi hadiah di gazebo.'],['Pengantin','Sapa pengantin di panggung dan kirim ucapan.']])list.append(element('dt','',name),element('dd','',description));content.append(list,element('p','arrival-note','Kamu juga bisa menikmati pantai, menyapa tamu, dan berfoto.'));}
    if(step===3){title.textContent='Mari berkenalan dengan mempelai';const family=element('div','arrival-family');for(const p of weddingInfo.partners){const card=element('article','');card.append(element('h3','',p.name),element('p','arrival-note',`Nama panggilan: ${p.nickname}`),element('p','',p.description));family.append(card);}content.append(family,element('p','arrival-note','Dua keluarga, satu hari bahagia. Terima kasih sudah menjadi bagian dari cerita mereka.'));}
    if(step===4){title.textContent=revisiting?'Perbarui konfirmasi kehadiran':'Boleh saya catat kehadiranmu?';content.append(element('p','','Konfirmasi ini untuk kehadiranmu pada acara pernikahan. Setelah tercatat, kamu tetap bisa menikmati pulau ini.'));
      const form=element('form','arrival-form');form.id='arrivalForm';
      const label=element('label','','Nama tamu'),input=element('input','');input.id='arrivalName';input.name='name';input.type='text';input.autocomplete='name';input.required=true;input.value=draft.name;input.placeholder='Tulis nama kamu';input.setAttribute('aria-describedby','arrivalNameHelp');label.htmlFor=input.id;
      const help=element('small','arrival-note','Maksimal 32 karakter.');help.id='arrivalNameHelp';
      input.oninput=()=>{draft.name=input.value;input.setCustomValidity('');};
      const fieldset=element('fieldset','arrival-attendance');fieldset.append(element('legend','','Apakah kamu akan hadir?'));
      for(const [value,text] of [['attending','Ya, saya hadir'],['not_attending','Maaf, tidak hadir']]){const option=element('label',''),radio=element('input','');radio.type='radio';radio.name='attendance';radio.value=value;radio.required=true;radio.checked=draft.attendance===value;radio.onchange=()=>draft.attendance=value;option.append(radio,element('span','',text));fieldset.append(option);}
      const submit=element('button','arrival-primary','Simpan konfirmasi');submit.type='submit';submit.id='arrivalSubmit';form.append(label,input,help,fieldset,submit);form.addEventListener('submit',save);content.append(form);
    }
    if(step===5){title.textContent=`Terima kasih, ${draft.name}!`;content.append(element('p','arrival-confirmation',draft.attendance==='attending'?'Kehadiranmu sudah tercatat. Sampai bertemu di hari bahagia Andi & Ratna!':'Konfirmasi tidak hadir sudah tercatat. Terima kasih atas kabar dan doa baikmu.'),element('p','','Silakan jelajahi pulau sesukamu. Kalau ingin mengubah konfirmasi, kembali dan temui saya di dermaga.'));next.textContent=revisiting?'Kembali menjelajah':'Jelajahi pulau';}
    focusTitle();
  }
  async function save(event){event.preventDefault();if(sending||step!==4)return;const name=draft.name.trim(),input=document.getElementById('arrivalName');if(!name||count(name)>32){input.setCustomValidity('Isi nama, maksimal 32 karakter.');input.reportValidity();return;}if(!draft.attendance)return;
    draft.name=name;sending=true;status.textContent='Mencatat konfirmasimu…';const form=document.getElementById('arrivalForm');form.setAttribute('aria-busy','true');form.querySelectorAll('input,button').forEach(el=>el.disabled=true);back.disabled=true;close.disabled=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch('/api/rsvp',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft),signal:controller.signal});const result=await response.json().catch(()=>({}));if(!response.ok||!result.rsvp)throw Error(result.error||'RSVP belum tersimpan. Silakan coba lagi.');confirmed={...draft};remember();step=5;show();}
    catch(error){status.textContent=error.name==='AbortError'?'Koneksi terlalu lama. Coba simpan lagi; isianmu tetap ada.':error.message||'Koneksi terputus. Coba simpan lagi.';form.querySelectorAll('input,button').forEach(el=>el.disabled=false);document.getElementById('arrivalSubmit').focus();}
    finally{clearTimeout(timeout);sending=false;back.disabled=false;close.disabled=false;form.removeAttribute('aria-busy');}
  }
  function open(revisit=false){if(active)return;revisiting=revisit;step=revisit?4:RSVP_ENABLED?0:INTRO_STEP;active=true;near=false;marker.hidden=true;document.body.classList.add('arriving-island');onPause();dialog.showModal();show();}
  function finish(){Object.assign(draft,confirmed);active=false;dialog.close();document.body.classList.remove('arriving-island');if(!completed){completed=true;onComplete({...draft});}else onResume({...draft});}
  back.onclick=()=>{if(sending||step<=0)return;step--;show();};next.onclick=()=>{if(sending)return;if(step===5||(!RSVP_ENABLED&&step===INTRO_STEP))finish();else if(step<4){step++;show();}};close.onclick=()=>{if(revisiting&&!sending)finish();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(revisiting&&!sending)finish();});
  marker.onclick=()=>{if(near&&getEnabled())open(true);};
  addEventListener('keydown',event=>{if(event.key.toLowerCase()!=='e'||event.repeat||['INPUT','TEXTAREA','BUTTON','SELECT'].includes(event.target.tagName)||event.target.isContentEditable)return;if(near&&getEnabled()&&!active){event.preventDefault();open(true);}});
  const location=new T.Vector3(ARRIVAL.hostX,pierHeight(ARRIVAL.hostZ),ARRIVAL.hostZ),anchor=location.clone().add(new T.Vector3(0,3.6,0)),projected=new T.Vector3();
  return {get active(){return active;},get completed(){return completed;},start(){open();},update(camera,width,height){
    near=RSVP_ENABLED&&completed&&!active&&getEnabled()&&getPlayer().root.position.distanceToSquared(location)<5**2;
    if(!near){marker.hidden=true;return;}projected.copy(anchor).project(camera);const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;marker.hidden=projected.z<-1||projected.z>1||x<90||x>width-90||y<60||y>height-105;if(!marker.hidden)marker.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;
  }};
}
