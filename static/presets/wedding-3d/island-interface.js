import {weddingInfo} from './venue-data.js';

export function countdownParts(startsAt,now=Date.now()){
  const total=Math.max(0,Math.ceil((Date.parse(startsAt)-now)/1000));
  return {days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60,started:total===0};
}
export function createIslandInterface({getEnabled}){
  const root=document.getElementById('islandMenu'),toggle=document.getElementById('menuToggle'),panel=document.getElementById('menuPanel');
  let expanded=false,lastEnabled=null;
  function close(restoreFocus=false){expanded=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Buka menu');if(restoreFocus)toggle.focus({preventScroll:true});}
  function update(){const enabled=getEnabled();if(enabled===lastEnabled)return;lastEnabled=enabled;panel.querySelectorAll('.view-tools button').forEach(button=>button.disabled=!enabled);}
  toggle.onclick=()=>{if(expanded){close();return;}update();expanded=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Tutup menu');};
  document.addEventListener('pointerdown',event=>{if(expanded&&!root.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(expanded&&event.key==='Escape'){event.preventDefault();close(true);}});
  root.addEventListener('focusout',event=>{if(expanded&&event.relatedTarget&&!root.contains(event.relatedTarget))close();});
  panel.addEventListener('click',event=>{if(event.target.closest('#photoToggle'))close();else if(event.target.closest('[data-place],#top'))close(true);});
  const startsAt=weddingInfo.events[0].startsAt,label=document.getElementById('countdownLabel'),accessible=document.getElementById('countdownAccessible');
  let previous='';
  function tick(){
    const time=countdownParts(startsAt);
    for(const [part,id] of [['days','countdownDays'],['hours','countdownHours'],['minutes','countdownMinutes'],['seconds','countdownSeconds']])document.getElementById(id).textContent=String(time[part]).padStart(2,'0');
    label.textContent=time.started?'Akad sudah dimulai ♡':'Menuju akad · 20 Januari 2027';
    const text=time.started?'Akad sudah dimulai.':`Menuju akad: ${time.days} hari, ${time.hours} jam, ${time.minutes} menit. Akad Rabu, 20 Januari 2027 pukul 08.00 WIB.`;
    if(text!==previous){accessible.textContent=text;previous=text;}
  }
  tick();update();const interval=setInterval(tick,1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  return {close,update,get expanded(){return expanded;},dispose(){clearInterval(interval);}};
}
