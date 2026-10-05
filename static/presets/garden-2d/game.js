(() => {
'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),W=1536,H=1024;
let map=new Image();
const $=s=>document.querySelector(s),places=window.WEDDING.places.filter(p=>p.id!=='welcome');
function setText(element,value){if(element.textContent!==value)element.textContent=value;}
function setStyle(element,key,value){if(element.style[key]!==value)element.style[key]=value;}
function setAttribute(element,key,value){if(element.getAttribute(key)!==value)element.setAttribute(key,value);}
// A small reusable pool allows quick successive clicks without cutting off the last pop.
const buttonSoundPool=Array.from({length:4},()=>{
  const clip=new Audio(window.WEDDING.assets.click);clip.preload='auto';clip.volume=.34;return clip;
});
let nextButtonSound=0;
function playButtonSound(){
  const clip=buttonSoundPool[nextButtonSound++%buttonSoundPool.length];
  clip.pause();clip.currentTime=0;clip.play().catch(()=>{});
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(button&&!button.disabled&&button.id!=='joystick')playButtonSound();
},true);

let frontGate=new Image(),guestSprites=new Image(),seatedSprites=new Image(),hostSprites=new Image();
let playerName='';
const hostCrops=[[138,106,484,1070],[685,178,332,998]];
function drawHosts(){
  hostCrops.forEach(([sx,sy,sw,sh],i)=>{const x=hosts.x-20+i*40,y=hosts.y,height=46.92,width=55.2*sw/sh;ctx.fillStyle='#1d352655';ctx.beginPath();ctx.ellipse(x,y,12,4,0,0,Math.PI*2);ctx.fill();ctx.drawImage(hostSprites,sx,sy,sw,sh,x-width/2,y-height,width,height);});
}
const seatedCrops=[[71,74,260,394],[469,84,225,386],[848,95,239,373],[1220,84,259,390],[70,555,254,398],[449,537,268,418],[843,554,250,398],[1221,563,252,391]];
// A few occupied seats on each bench, leaving the central aisle and spare seats clear.
const seatedGuests=[[631,194,0],[679,194,1],[661,220,2],[622,247,3],[679,247,4],[650,276,5],[854,194,6],[900,194,7],[875,220,3],[850,247,1],[901,247,5],[887,276,2]];
function drawSeatedGuests(){
  for(const [x,y,style] of seatedGuests){
    const [sx,sy,sw,sh]=seatedCrops[style],height=34.1,width=height*sw/sh;
    ctx.fillStyle='#27342745';ctx.beginPath();ctx.ellipse(x,y-.5,9.35,2.31,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(seatedSprites,sx,sy,sw,sh,x-width/2,y-height,width,height);
  }
}
const gardenGuests=[
  {x:933,y:564,crop:[221,134,317,505]},
  {x:985,y:567,crop:[772,145,278,504]},
  {x:1130,y:365,crop:[230,692,277,505]},
  {x:1175,y:369,crop:[745,698,306,506]}
];
function drawGuests(){
  for(const guest of gardenGuests){
    const [sx,sy,sw,sh]=guest.crop,height=47.04,width=height*sw/sh;
    ctx.save();ctx.translate(guest.x,guest.y);ctx.fillStyle='#182a2528';ctx.beginPath();ctx.ellipse(0,1,12.6,4.2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#182a255c';ctx.beginPath();ctx.ellipse(0,1,8.4,2.66,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(guestSprites,sx,sy,sw,sh,-width/2,-height,width,height);ctx.restore();
  }
}
const playerCanvas=$('#playerLayer'),playerContext=playerCanvas.getContext('2d');
const positions=[[767,294],[1280,375],[326,348],[575,740],[1303,697],[833,741]];
places.forEach((p,i)=>{p.x=positions[i][0];p.y=positions[i][1]});
const pianist={id:'pianist',title:'Pianis & penyanyi',x:555,y:365};
// Beside the central path, clear of the welcome sign and the walking corridor.
const hosts={id:'hosts',title:'Petugas penyambutan',x:870,y:625};
const targets=[...places,pianist,hosts],pianistButton=$('#pianist'),pianistImage=$('#pianistImage');
const nodes=[[768,966],[768,844],[768,764],[768,655],[768,565],[648,533],[606,454],[652,384],[767,341],[892,384],[939,455],[888,531],[767,294],[767,184],[548,428],[465,402],[362,394],[326,348],[302,319],[986,418],[1072,397],[1206,415],[1280,375],[1280,351],[662,748],[575,740],[868,749],[949,779],[1048,805],[1170,800],[1269,743],[1303,697],[1311,649]];
const links=[[0,1,36],[1,2,31],[2,3,34],[3,4,40],[4,5,33],[5,6,30],[6,7,29],[7,8,31],[8,9,31],[9,10,32],[10,11,31],[11,4,35],[8,12,28],[12,13,25],[6,14,30],[14,15,28],[15,16,29],[16,17,29],[17,18,30],[10,19,30],[19,20,28],[20,21,30],[21,22,28],[22,23,33],[2,24,27],[24,25,27],[2,26,26],[26,27,26],[27,28,26],[28,29,27],[29,30,27],[30,31,28],[31,32,29]];
// Match the open lower pond loop and the broad horizontal garden paths.
nodes.push([475,790],[300,800],[150,760],[120,680],[175,640],[305,620],[435,650],[30,385],[1490,415]);
links.push([25,33,70],[33,34,70],[34,35,70],[35,36,70],[36,37,55],[37,38,45],[38,39,45],[39,25,55],[16,40,65],[22,41,65]);
// Wide forgiving corridors; use the union at junctions to avoid sticky corners.
links.forEach((edge,i)=>{if(i<33)edge[2]=70;});
const player={x:768,y:919,dir:'south',walking:false},keys=new Set(),visited=new Set();
let path=[],pendingPlace=null,nearby=null,last=0,t=0,view={scale:1,x:0,y:0,w:0,h:0},markerHits=[],ready=false,goal=null,walkClock=0;

const remotePlayers=new Map();let session=null,networkBusy=false,nextSync=0,queuedMessage=null;
// Interpret the CMS's Indonesian event date and starting time independently of the guest's timezone.
function ceremonyStart(config){
 const events=config.places.find(p=>p.id==='ceremony')?.events||[],event=events.find(e=>/akad/i.test(e.title))||events[0];
 const months=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
 const date=event?.date?.toLowerCase().match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/),time=event?.time?.match(/\b(\d{1,2})[.:](\d{2})\b/);
 if(!date||!time)return null;
 const day=Number(date[1]),month=months.indexOf(date[2]),year=Number(date[3]),hour=Number(time[1]),minute=Number(time[2]);
 if(month<0||year<100||hour>23||minute>59)return null;
 const local=Date.UTC(year,month,day,hour,minute),check=new Date(local);
 if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month||check.getUTCDate()!==day)return null;
 const zone=event.time.match(/\b(WIB|WITA|WIT)\b/i)?.[1].toUpperCase()||'WIB',offset={WIB:7,WITA:8,WIT:9}[zone];
 return local-offset*3600000;
}
function countdownText(start,now){
 if(start===null)return 'Jadwal akad segera hadir';
 if(now>=start)return 'Akad telah dimulai';
 const seconds=Math.ceil((start-now)/1000),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),remaining=seconds%60;
 const pad=value=>String(value).padStart(2,'0');return `${days} hari · ${pad(hours)}:${pad(minutes)}:${pad(remaining)}`;
}
const ceremonyCountdown=document.createElement('div'),countdownHeading=document.createElement('span'),countdownValue=document.createElement('strong');
ceremonyCountdown.id='ceremonyCountdown';ceremonyCountdown.setAttribute('role','timer');ceremonyCountdown.setAttribute('aria-live','off');countdownHeading.textContent='Menuju akad';ceremonyCountdown.append(countdownHeading,countdownValue);document.querySelector('main').append(ceremonyCountdown);
function updateCountdown(){setText(countdownValue,countdownText(ceremonyStart(window.WEDDING),Date.now()));}
updateCountdown();setInterval(()=>{if(!document.hidden)updateCountdown();},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCountdown();});
function localState(){return {name:playerName,character:pairMode?'pair':selectedCharacter,x:player.x,y:player.y,dir:player.dir,walking:player.walking&&!document.querySelector('dialog[open]'),companion:pairMode?{...companion}:null};}
async function api(route,data){const response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,site:window.CMS_SITE,preview:window.CMS_PREVIEW}),signal:AbortSignal.timeout(8000)});if(!response.ok){if(response.status===401)session=null;throw Error('connection');}return response.json();}
async function syncPlayers(){
 if(phase!=='playing'||networkBusy||Date.now()<nextSync)return;
 if(location.protocol==='file:')return;
 networkBusy=true;const pending=queuedMessage;
 try{
  if(!session)session=await api('join',localState());
  const data=await api('sync',{...localState(),...session,...(pending?{message:pending.text}:{})});
  if(queuedMessage===pending)queuedMessage=null;
  if(data.siteClosed){return;}const ids=new Set(),receivedAt=performance.now();
  for(const item of data.players){
    ids.add(item.id);let r=remotePlayers.get(item.id);
    if(!r){r={x:item.x,y:item.y,companion:item.companion?{...item.companion}:null,receivedAt};remotePlayers.set(item.id,r);}
    const elapsed=Math.max(.08,(receivedAt-r.receivedAt)/1000),velocity=(a,b,walking)=>walking?Math.max(-125,Math.min(125,(a-b)/elapsed)):0;
    const vx=velocity(item.x,r.targetX??item.x,item.walking),vy=velocity(item.y,r.targetY??item.y,item.walking);
    const previous=r.targetCompanion,partner=item.companion;
    Object.assign(r,{name:item.name,character:item.character,dir:item.dir,walking:item.walking,targetX:item.x,targetY:item.y,vx,vy,receivedAt,targetCompanion:partner,partnerVx:partner&&previous?velocity(partner.x,previous.x,partner.walking):0,partnerVy:partner&&previous?velocity(partner.y,previous.y,partner.walking):0,message:item.message,messageUntil:receivedAt+item.messageRemaining});
  }
  for(const id of remotePlayers.keys())if(!ids.has(id))remotePlayers.delete(id);
  nextSync=Date.now()+260;
 }catch{remotePlayers.clear();nextSync=Date.now()+2500;}
 finally{networkBusy=false;}
}
let lastRemoteFrame=performance.now();
function drawRemotePlayers(ctx){
 const now=performance.now(),dt=Math.min((now-lastRemoteFrame)/1000,.1);lastRemoteFrame=now;
 // Move toward the latest position plus a short, speed-limited prediction. This
 // keeps motion continuous between network updates and eases into a stop.
 const blend=1-Math.exp(-dt/.115);
 for(const r of remotePlayers.values()){
  const age=Math.min(.5,Math.max(0,(now-r.receivedAt)/1000));
  const aimX=r.targetX+r.vx*age,aimY=r.targetY+r.vy*age;
  if(Math.hypot(aimX-r.x,aimY-r.y)>180){r.x=r.targetX;r.y=r.targetY;}
  else{r.x+=(aimX-r.x)*blend;r.y+=(aimY-r.y)*blend;}
  r.walking=r.walking&&now-r.receivedAt<1100;
  drawCharacter(ctx,r,r.character==='pair'?'men':r.character,t);
  if(r.targetCompanion){
   if(!r.companion)r.companion={...r.targetCompanion};
   const partner=r.targetCompanion;
   r.companion.x+=(partner.x+r.partnerVx*age-r.companion.x)*blend;
   r.companion.y+=(partner.y+r.partnerVy*age-r.companion.y)*blend;
   r.companion.dir=partner.dir;r.companion.walking=partner.walking&&now-r.receivedAt<1100;
   drawCharacter(ctx,r.companion,'woman',t);
  }
 }
}
function drawRemoteLabels(ctx,scale){
 for(const r of remotePlayers.values()){
  const x=r.x*scale+view.x,y=r.y*scale+view.y;
  ctx.font='800 14px Nunito, sans-serif';ctx.textAlign='center';const width=ctx.measureText(r.name).width+18;ctx.fillStyle='#233c31d9';ctx.beginPath();ctx.roundRect(x-width/2,y+8,width,24,7);ctx.fill();ctx.fillStyle='#fff9e2';ctx.fillText(r.name,x,y+25);
  if(r.message&&performance.now()<r.messageUntil){const w=ctx.measureText(r.message).width+28,top=y-73*scale-38;ctx.fillStyle='#fff7e7';ctx.strokeStyle='#b68e68';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-w/2,top,w,38,12);ctx.fill();ctx.stroke();ctx.fillStyle='#61432f';ctx.fillText(r.message,x,top+24);}
 }ctx.textAlign='left';
}
setInterval(syncPlayers,150);
window.addEventListener('pagehide',()=>{if(session)navigator.sendBeacon('/api/leave',new Blob([JSON.stringify({...session,site:window.CMS_SITE,preview:window.CMS_PREVIEW})],{type:'application/json'}));session=null;});

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let phase='title',selectedCharacter='men',pairMode=false,pairTime=0;
let pairTrail=[];
const companion={x:800,y:919,dir:'south',walking:false,clock:0};
function resetCompanion(){pairTime=0;pairTrail=[{time:0,x:player.x,y:player.y,dir:player.dir}];Object.assign(companion,{x:player.x+32,y:player.y,dir:'south',walking:false,clock:0});}
function followCompanion(dt){
  if(!pairMode||phase!=='playing'||document.querySelector('dialog[open]')){companion.walking=false;return;}
  pairTime+=dt;pairTrail.push({time:pairTime,x:player.x,y:player.y,dir:player.dir});
  const delayed=pairTime-1;
  while(pairTrail.length>2&&pairTrail[1].time<=delayed)pairTrail.shift();
  const a=pairTrail[0],b=pairTrail[1]||a,u=Math.max(0,Math.min(1,(delayed-a.time)/(b.time-a.time||1)));
  let x=a.x+(b.x-a.x)*u+32,y=a.y+(b.y-a.y)*u;
  if(!canWalk(x,y)){const q=closest({x,y});x=q.x;y=q.y;}
  const dx=x-companion.x,dy=y-companion.y;companion.walking=Math.hypot(dx,dy)>.01;
  if(companion.walking)companion.dir=directionFor(dx,dy);
  companion.x=x;companion.y=y;companion.clock=companion.walking?companion.clock+dt:0;
}
const characters=Object.fromEntries(Object.entries(window.WEDDING.characters).map(([id,config])=>[id,{...config,image:new Image()}]));
const directions=['east','south-east','south','south-west','west','north-west','north','north-east'];
function directionFor(dx,dy){return directions[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];}
const joystick=$('#joystick'),thumb=$('#joystickThumb');
const stick={x:0,y:0,pointer:null};
const action=$('#interact'),proximityRadius=120;
let actionStation=null;
function resetStick(){const pointer=stick.pointer;stick.pointer=null;stick.x=0;stick.y=0;thumb.style.transform='translate(0px, 0px)';joystick.classList.remove('engaged');if(pointer!==null&&joystick.hasPointerCapture(pointer))joystick.releasePointerCapture(pointer);}
function clearMovement(){keys.clear();resetStick();}
function stickVector(dx,dy,radius=44){const length=Math.hypot(dx,dy),distance=Math.min(length,radius),deadzone=6;const strength=distance<=deadzone?0:(distance-deadzone)/(radius-deadzone);return {x:length?dx/length*strength:0,y:length?dy/length*strength:0,knobX:length?dx/length*distance:0,knobY:length?dy/length*distance:0};}
function updateStick(e){const r=joystick.getBoundingClientRect(),v=stickVector(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);stick.x=v.x;stick.y=v.y;thumb.style.transform=`translate(${v.knobX}px, ${v.knobY}px)`;}

function project(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p.x-a[0])*vx+(p.y-a[1])*vy)/(vx*vx+vy*vy)));return{x:a[0]+u*vx,y:a[1]+u*vy};}
function closest(p){let best={dist:Infinity};links.forEach(([a,b,r],i)=>{const q=project(p,nodes[a],nodes[b]);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<best.dist)best={...q,dist:d,edge:i,a,b,r}});return best;}
function canWalk(x,y){if(x<24||x>W-24||y<24||y>H-24)return false;return links.some(([a,b,r])=>{const q=project({x,y},nodes[a],nodes[b]);return Math.hypot(q.x-x,q.y-y)<r;});}
function clearWalkLine(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));for(let i=0;i<=steps;i++){const u=i/steps;if(!canWalk(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u))return false;}return true;}
function simplifyPath(points){const result=[];let origin=player,index=0;while(index<points.length){let next=points.length-1;while(next>index&&!clearWalkLine(origin,points[next]))next--;result.push(points[next]);origin=points[next];index=next+1;}return result;}
function routeTo(x,y,place=null){const start=closest(player),end=closest({x,y});const graph=nodes.map(()=>[]);links.forEach(([a,b])=>{const d=Math.hypot(nodes[a][0]-nodes[b][0],nodes[a][1]-nodes[b][1]);graph[a].push([b,d]);graph[b].push([a,d])});const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),used=new Set();for(const n of [start.a,start.b])dist[n]=Math.hypot(player.x-nodes[n][0],player.y-nodes[n][1]);while(used.size<nodes.length){let u=-1;dist.forEach((d,i)=>{if(!used.has(i)&&(u===-1||d<dist[u]))u=i});if(u<0||!Number.isFinite(dist[u]))break;used.add(u);for(const [v,c] of graph[u])if(dist[u]+c<dist[v]){dist[v]=dist[u]+c;prev[v]=u}}
const target=[end.a,end.b].sort((a,b)=>dist[a]+Math.hypot(nodes[a][0]-end.x,nodes[a][1]-end.y)-dist[b]-Math.hypot(nodes[b][0]-end.x,nodes[b][1]-end.y))[0];const list=[];for(let n=target;n!==-1;n=prev[n])list.unshift({x:nodes[n][0],y:nodes[n][1]});path=start.edge===end.edge?[{x:end.x,y:end.y}]:[...list,{x:end.x,y:end.y}];path=simplifyPath(path);pendingPlace=place;goal={x:end.x,y:end.y};$('#travelStatus').textContent=place?`Berjalan menuju ${place.title.toLowerCase()}…`:'Sedang menjelajah…';dismissWelcome();}
function interactTarget(p){if(p===hosts){startWelcome();return;}if(p===pianist){path=[];goal=null;pendingPlace=null;player.walking=false;clearMovement();toggleMusic();}else openPlace(p);}
window.addEventListener('wedding-content-updated',()=>{for(let i=0;i<places.length;i++){const old=places[i],next=window.WEDDING.places.find(p=>p.id===old.id);Object.assign(old,next,{x:old.x,y:old.y});const button=document.querySelector(`[data-place="${old.id}"]`);if(button){button.querySelector('strong').textContent=old.title;button.querySelector('small').textContent=old.subtitle;}}});
function storyMoments(place){
 if(Array.isArray(place.timeline))return place.timeline;
 return (place.fields||[]).map(([title,value])=>{const parts=value.split(/\s+[—–]\s+/);return {time:parts.length>1?parts.shift():'',title,description:parts.join(' — ')};});
}
let storyIntroVersion=0,storyIntroTimer;
function resetStoryIntro(){storyIntroVersion++;clearTimeout(storyIntroTimer);$('#details').classList.remove('story-ready');}
$('#details').addEventListener('close',resetStoryIntro);
function startStoryIntro(src){
 const version=storyIntroVersion,image=new Image();
 const reveal=()=>requestAnimationFrame(()=>{if(version!==storyIntroVersion||!$('#details').open)return;clearTimeout(storyIntroTimer);$('#details').classList.add('story-ready');});
 image.onload=reveal;image.onerror=reveal;image.src=src;
 storyIntroTimer=setTimeout(reveal,8000);
}
function renderStory(place,parent){
 const moments=storyMoments(place);let index=0;
 const carousel=document.createElement('section');carousel.className='story-carousel';carousel.setAttribute('aria-label','Momen cerita kami');
 const previous=document.createElement('button'),next=document.createElement('button'),card=document.createElement('article'),time=document.createElement('p'),title=document.createElement('h3'),description=document.createElement('p'),count=document.createElement('p');
 previous.type=next.type='button';previous.className=next.className='story-arrow';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Momen sebelumnya');next.setAttribute('aria-label','Momen berikutnya');
 card.className='story-slide';card.setAttribute('aria-live','polite');card.setAttribute('aria-atomic','true');time.className='story-slide-time';description.className='story-slide-description';count.className='story-slide-count';card.append(time,title,description,count);
 function show(){const m=moments[index];time.textContent=m?.time||'';time.hidden=!m?.time;title.textContent=m?.title||'Cerita segera hadir';description.textContent=m?.description||'';description.hidden=!m?.description;count.textContent=m?'Momen '+(index+1)+' dari '+moments.length:'';previous.disabled=index===0;next.disabled=index>=moments.length-1;}
 previous.onclick=()=>{if(index>0){index--;show();}};next.onclick=()=>{if(index<moments.length-1){index++;show();}};
 carousel.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const control=event.key==='ArrowLeft'?previous:next;if(!control.disabled)control.click();}};
 carousel.append(previous,card,next);parent.append(carousel);show();
 const background=place.storyBackground||'/assets/story-background.png';
 $('#details').style.setProperty('--story-background','url('+JSON.stringify(background)+')');startStoryIntro(background);
}
function renderGifts(place,parent){
 const items=[...(place.fields?.length?[{title:place.title,fields:place.fields}]:[]),...(place.sections||[])];let index=0;
 const carousel=document.createElement('section'),previous=document.createElement('button'),next=document.createElement('button'),card=document.createElement('article'),title=document.createElement('h3'),rows=document.createElement('dl'),note=document.createElement('p'),count=document.createElement('p');
 carousel.className='story-carousel gift-carousel';carousel.setAttribute('aria-label','Informasi hadiah');previous.type=next.type='button';previous.className=next.className='story-arrow';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Informasi hadiah sebelumnya');next.setAttribute('aria-label','Informasi hadiah berikutnya');card.className='story-slide gift-slide';card.setAttribute('aria-live','polite');card.setAttribute('aria-atomic','true');rows.className='gift-information';note.className='gift-note';note.textContent=place.description;note.hidden=!place.description;count.className='story-slide-count';card.append(title,rows,note,count);
 function show(){const item=items[index];title.textContent=item?.title||'Informasi hadiah segera hadir';rows.replaceChildren();for(const [label,value] of item?.fields||[]){const row=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;row.append(term,detail);rows.append(row);}count.textContent=item?'Informasi '+(index+1)+' dari '+items.length:'';previous.disabled=index===0;next.disabled=index>=items.length-1;}
 previous.onclick=()=>{if(index>0){index--;show();}};next.onclick=()=>{if(index<items.length-1){index++;show();}};carousel.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const control=e.key==='ArrowLeft'?previous:next;if(!control.disabled)control.click();}};carousel.append(previous,card,next);parent.append(carousel);show();
 const background=place.giftsBackground||'/assets/gifts-background.png';$('#details').style.setProperty('--story-background','url('+JSON.stringify(background)+')');startStoryIntro(background);
}
function renderCeremony(place,parent){
 const items=place.events||[];let index=0;
 const carousel=document.createElement('section'),previous=document.createElement('button'),next=document.createElement('button'),card=document.createElement('article'),title=document.createElement('h3'),date=document.createElement('p'),time=document.createElement('p'),venue=document.createElement('p'),address=document.createElement('p'),link=document.createElement('a'),count=document.createElement('p');
 carousel.className='story-carousel ceremony-carousel';carousel.setAttribute('aria-label','Jadwal akad dan resepsi');previous.type=next.type='button';previous.className=next.className='story-arrow';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Acara sebelumnya');next.setAttribute('aria-label','Acara berikutnya');card.className='story-slide ceremony-slide';card.setAttribute('aria-live','polite');card.setAttribute('aria-atomic','true');date.className='event-date';time.className='event-time';venue.className='event-venue';address.className='event-address';link.className='event-map-link';link.textContent='Buka Google Maps';link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',playButtonSound);count.className='story-slide-count';card.append(title,date,time,venue,address,link,count);
 function show(){const event=items[index];title.textContent=event?.title||'Jadwal segera hadir';date.textContent=event?.date||'';time.textContent=event?.time?'Pukul '+event.time:'';venue.textContent=event?.venue||'';address.textContent=event?.address||'';link.hidden=!event;link.href=event?.mapsUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((event?.venue||'')+', '+(event?.address||''));count.textContent=event?'Acara '+(index+1)+' dari '+items.length:'';previous.disabled=index===0;next.disabled=index>=items.length-1;}
 previous.onclick=()=>{if(index>0){index--;show();}};next.onclick=()=>{if(index<items.length-1){index++;show();}};carousel.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const control=e.key==='ArrowLeft'?previous:next;if(!control.disabled)control.click();}};carousel.append(previous,card,next);parent.append(carousel);show();
 const background=place.ceremonyBackground||'/assets/ceremony-background.png';$('#details').style.setProperty('--story-background','url('+JSON.stringify(background)+')');startStoryIntro(background);
}
function openPlace(p){resetStoryIntro();$('#details').classList.toggle('has-ceremony',p.id==='ceremony');$('#details').classList.toggle('has-gifts',p.id==='gifts');$('#details').classList.toggle('has-story',p.id==='story');if($('#journal').open)$('#journal').close();path=[];goal=null;pendingPlace=null;player.walking=false;clearMovement();visited.add(p.id);$('#detailCategory').textContent=window.WEDDING.demo?'INFORMASI PERNIKAHAN · DATA CONTOH':'INFORMASI PERNIKAHAN';$('#detailTitle').textContent=p.title;$('#detailSymbol').textContent=p.symbol;$('#detailDescription').textContent=p.description;$('#detailDescription').hidden=!p.description;$('#details').classList.toggle('has-events',!!p.events);const fields=$('#detailFields');fields.replaceChildren();const appendFields=(items,parent)=>items.forEach(([label,value])=>{const row=document.createElement('div');row.className='detail-row';const l=document.createElement('span'),v=document.createElement('b');l.textContent=label;v.textContent=value;row.append(l,v);parent.append(row)});if(p.id==='story')renderStory(p,fields);else if(p.id==='gifts')renderGifts(p,fields);else if(p.id==='ceremony')renderCeremony(p,fields);else appendFields(p.fields,fields);(['story','gifts','ceremony'].includes(p.id)?[]:p.sections||[]).forEach(section=>{const group=document.createElement('section');group.className='detail-section';const heading=document.createElement('h3');heading.textContent=section.title;group.append(heading);appendFields(section.fields,group);fields.append(group)});(p.id==='ceremony'?[]:p.events||[]).forEach(event=>{const card=document.createElement('section');card.className='event-card';const title=document.createElement('h3'),date=document.createElement('p'),time=document.createElement('p'),venue=document.createElement('p'),address=document.createElement('p'),link=document.createElement('a');title.textContent=event.title;date.className='event-date';date.textContent=event.date;time.className='event-time';time.textContent='Pukul '+event.time;venue.className='event-venue';venue.textContent=event.venue;address.className='event-address';address.textContent=event.address;link.className='event-map-link';link.textContent='Buka Google Maps';link.href=event.mapsUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(event.venue+', '+event.address);link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',playButtonSound);card.append(title,date,time,venue,address,link);fields.append(card)});renderGallery(p);openWishBoard(p);updateJournal();$('#details').classList.toggle('has-gallery',p.id==='gallery');$('#details').showModal();$('#travelStatus').textContent='Cerita baru telah ditemukan';}
let wishRequest=null,wishSending=false,wishLoading=false,wishIndex=0;
const wishItems=new Map();
function selectWishTab(tab){
 const reading=tab==='read',writing=tab==='write';$('#wishChoice').hidden=reading||writing;$('#backWishChoice').hidden=!reading&&!writing;$('#writeWishPanel').hidden=!writing;$('#readWishPanel').hidden=!reading;
 if(reading){wishIndex=0;wishItems.clear();renderWishes();$('#wishListStatus').textContent='Memuat ucapan…';loadWishes();}
}
$('#writeWishTab').onclick=()=>{selectWishTab('write');$('#wishInput').focus({preventScroll:true});};$('#readWishTab').onclick=()=>selectWishTab('read');$('#backWishChoice').onclick=()=>{selectWishTab('choice');$('#writeWishTab').focus({preventScroll:true});};
function wishCharacters(value){return Array.from(new Intl.Segmenter('id',{granularity:'grapheme'}).segment(value),s=>s.segment);}
function updateWishInput(){const input=$('#wishInput');input.value=wishCharacters(input.value).slice(0,50).join('');$('#wishCount').textContent=`${wishCharacters(input.value).length} / 50`;$('#sendWish').disabled=wishSending||!input.value.trim();}
function renderWishes(){
 const items=[...wishItems.values()].sort((a,b)=>b.id-a.id).slice(0,15),list=$('#wishList');list.replaceChildren();if(!items.length)return;wishIndex=Math.max(0,Math.min(wishIndex,items.length-1));
 const previous=document.createElement('button'),next=document.createElement('button'),card=document.createElement('article'),message=document.createElement('p'),signature=document.createElement('footer'),count=document.createElement('small');
 previous.type=next.type='button';previous.className=next.className='story-arrow';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Ucapan sebelumnya');next.setAttribute('aria-label','Ucapan berikutnya');card.className='wish-paper wish-message';card.setAttribute('aria-live','polite');card.setAttribute('aria-atomic','true');count.className='wish-page-count';const pin=document.createElement('span');pin.className='wish-note-pin';pin.setAttribute('aria-hidden','true');pin.textContent='📌';card.append(pin,message,signature);
 function show(){const item=items[wishIndex];message.textContent=item.message;signature.textContent='— '+item.name;count.textContent='Ucapan '+(wishIndex+1)+' dari '+items.length;previous.disabled=wishIndex===0;next.disabled=wishIndex===items.length-1;}
 previous.onclick=()=>{if(wishIndex>0){wishIndex--;show();}};next.onclick=()=>{if(wishIndex<items.length-1){wishIndex++;show();}};list.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const control=e.key==='ArrowLeft'?previous:next;if(!control.disabled)control.click();}};list.append(previous,card,next,count);show();
}
async function loadWishes(){if(wishLoading)return;wishLoading=true;$('#moreWishes').hidden=true;
 try{const selected=[...wishItems.values()].sort((a,b)=>b.id-a.id)[wishIndex]?.id,data=await api('wishes/list',{latest:true});wishItems.clear();for(const item of data.wishes.slice(0,15))wishItems.set(item.id,item);const index=data.wishes.findIndex(item=>item.id===selected);wishIndex=index<0?0:index;renderWishes();$('#wishListStatus').textContent=wishItems.size?'':'Belum ada ucapan. Jadilah yang pertama!';}
 catch{$('#wishListStatus').textContent='Ucapan belum bisa dimuat. Daftar akan dicoba lagi sebentar.';}
 finally{wishLoading=false;}}
function openWishBoard(place){const active=place.id==='wishes';$('#wishBoard').hidden=!active;$('#details').classList.toggle('has-wishes',active);if(!active)return;$('#detailCategory').textContent='UCAPAN & DOA';$('#wishSignature').textContent=playerName;updateWishInput();selectWishTab('choice');const background=place.wishesBackground||'/assets/wishes-background.png';$('#details').style.setProperty('--story-background','url('+JSON.stringify(background)+')');startStoryIntro(background);}
$('#wishInput').addEventListener('input',()=>{wishRequest=null;updateWishInput();});

$('#wishForm').addEventListener('submit',async event=>{event.preventDefault();if(wishSending||!$('#wishInput').value.trim())return;wishSending=true;$('#wishInput').readOnly=true;updateWishInput();$('#wishStatus').textContent='Mengirim ucapan…';wishRequest??=crypto.randomUUID();
 try{if(!session){$('#wishStatus').textContent='Sedang menghubungkan. Coba kirim lagi sebentar, ya.';return;}await api('wishes/send',{...session,requestId:wishRequest,message:$('#wishInput').value.trim()});$('#wishInput').value='';wishRequest=null;await loadWishes();$('#wishStatus').textContent='Ucapanmu sudah tersimpan. Terima kasih!';}
 catch{$('#wishStatus').textContent='Ucapan belum terkirim. Tulisanmu tetap tersimpan di kartu; coba kirim lagi.';}
 finally{wishSending=false;$('#wishInput').readOnly=false;updateWishInput();}});
setInterval(()=>{if($('#details').open&&!$('#wishBoard').hidden&&!$('#readWishPanel').hidden&&!wishSending)loadWishes();},8000);
function renderGallery(place){
 const gallery=$('#detailGallery');gallery.replaceChildren();gallery.hidden=place.id!=='gallery';if(gallery.hidden)return;
 const photos=place.photos||[];let index=0;
 const previous=document.createElement('button'),next=document.createElement('button'),figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption'),credit=document.createElement('a'),count=document.createElement('p'),error=document.createElement('p');
 previous.type=next.type='button';previous.className=next.className='story-arrow';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Foto sebelumnya');next.setAttribute('aria-label','Foto berikutnya');
 gallery.setAttribute('aria-label','Galeri foto');figure.className='gallery-slide';figure.setAttribute('aria-live','polite');image.className='gallery-single-image';image.width=800;image.height=900;credit.target='_blank';credit.rel='noopener noreferrer';count.className='gallery-count';error.className='gallery-error';error.hidden=true;figure.append(image,error,caption,credit,count);
 image.onerror=()=>{image.hidden=true;error.hidden=false;error.textContent='Foto belum dapat dimuat. Silakan lihat foto lainnya.';};image.onload=()=>{image.hidden=false;error.hidden=true;};
 function show(){const photo=photos[index];previous.disabled=index===0;next.disabled=index>=photos.length-1;image.hidden=!photo;caption.textContent=photo?.alt||'';caption.hidden=!photo?.alt;credit.textContent=photo?.credit||'';credit.hidden=!photo?.credit;if(photo?.url)credit.href=photo.url;else credit.removeAttribute('href');count.textContent=photo?'Foto '+(index+1)+' dari '+photos.length:'';error.hidden=!!photo;if(photo){error.textContent='';image.alt=photo.alt||'Foto pernikahan';image.src=photo.src;}else error.textContent='Foto akan segera hadir.';}
 previous.onclick=()=>{if(index>0){index--;show();}};next.onclick=()=>{if(index<photos.length-1){index++;show();}};
 gallery.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const control=e.key==='ArrowLeft'?previous:next;if(!control.disabled)control.click();}};
 gallery.append(previous,figure,next);show();
 const background=place.galleryBackground||'/assets/gallery-background.png';$('#details').style.setProperty('--story-background','url('+JSON.stringify(background)+')');startStoryIntro(background);
}
$('#closePhoto').onclick=()=>$('#photoViewer').close();
function updateJournal(){places.forEach(p=>{const b=document.querySelector(`[data-place="${p.id}"]`);b.classList.toggle('visited',visited.has(p.id));b.querySelector('.number').textContent=visited.has(p.id)?'✓':p.symbol;b.setAttribute('aria-label',`${p.title}${visited.has(p.id)?', sudah dikunjungi':''}`)});$('#progressText').textContent=`${visited.size} / ${places.length}`;$('#progressFill').style.width=`${visited.size/places.length*100}%`;}
places.forEach((p,i)=>{const b=document.createElement('button');b.className='place';b.dataset.place=p.id;const n=document.createElement('span');n.className='number';n.textContent=p.symbol;const body=document.createElement('span'),title=document.createElement('strong'),sub=document.createElement('small'),arrow=document.createElement('span');title.textContent=p.title;sub.textContent=p.subtitle;arrow.className='arrow';arrow.textContent='↗';body.append(title,sub);b.append(n,body,arrow);b.onclick=()=>openPlace(p);$('#places').append(b)});
const welcomeLines=[
  {person:0,text:`Selamat datang di taman pernikahan ${window.WEDDING.profile.groom} & ${window.WEDDING.profile.bride}! Kami senang kamu hadir. Yuk, kenali tamannya sebentar.`},
  {person:1,text:'Geser analog di kiri bawah untuk berjalan, atau ketuk jalan tujuanmu. Kalau memakai keyboard, gunakan WASD atau tombol panah.'},
  {person:0,text:'Ketuk nama tempat untuk membaca informasi pernikahan. Kamu juga bisa langsung membuka tombol Info pernikahan tanpa perlu berjalan.'},
  {person:1,text:'Atur musik lewat tombol nada di pojok atas atau temui pianis dan penyanyi. Selamat menjelajah! Sapa kami lagi kalau butuh panduan.'}
];
let welcomePage=0;
function renderWelcome(){
  const line=welcomeLines[welcomePage];$('#welcomeSpeaker').textContent=line.person?'Petugas wanita':'Petugas pria';$('#welcomeText').textContent=line.text;
  $('#welcomeProgress').textContent=`${welcomePage+1} / ${welcomeLines.length}`;$('#nextWelcome').textContent=welcomePage===welcomeLines.length-1?'Jelajahi taman':'Lanjut →';
  const c=$('#welcomePortrait').getContext('2d');c.clearRect(0,0,112,112);c.imageSmoothingEnabled=false;
  const crop=line.person?[685,178,332,420]:[264,106,340,420];c.drawImage(hostSprites,...crop,10,0,92,112);
}
function startWelcome(){
  if($('#welcomeDialog').open)return;
  path=[];goal=null;pendingPlace=null;player.walking=false;companion.walking=false;clearMovement();welcomePage=0;renderWelcome();$('#welcomeDialog').showModal();
}
$('#nextWelcome').onclick=()=>{if(welcomePage<welcomeLines.length-1){welcomePage++;renderWelcome();}else $('#welcomeDialog').close();};
$('#skipWelcome').onclick=()=>$('#welcomeDialog').close();
$('#welcomeDialog').addEventListener('close',()=>{clearMovement();canvas.focus({preventScroll:true});});
function dismissWelcome(){$('#moveHint').hidden=true;}
function closeDetails(){$('#details').close();canvas.focus({preventScroll:true})}$('#closeDetails').onclick=closeDetails;$('#backToGarden').onclick=closeDetails;
let speechTimer;
const chatInput=$('#chatInput'),speechBubble=$('#speechBubble');
const chatSegments=typeof Intl.Segmenter==='function'?new Intl.Segmenter('id',{granularity:'grapheme'}):null;
function messageCharacters(value){return chatSegments?Array.from(chatSegments.segment(value),s=>s.segment):Array.from(value);}
function updateChatInput(){
  const letters=messageCharacters(chatInput.value);if(letters.length>15)chatInput.value=letters.slice(0,15).join('');
  $('#chatCount').textContent=`${messageCharacters(chatInput.value).length} / 15`;
  $('#sendChat').disabled=!chatInput.value.trim();
}
chatInput.addEventListener('input',e=>{if(!e.isComposing)updateChatInput();});
chatInput.addEventListener('compositionend',updateChatInput);
$('#chatButton').onclick=()=>{clearMovement();path=[];goal=null;pendingPlace=null;chatInput.value='';updateChatInput();$('#chatDialog').showModal();chatInput.focus();};
$('#closeChat').onclick=()=>$('#chatDialog').close();
$('#chatDialog').addEventListener('close',()=>{clearMovement();canvas.focus({preventScroll:true});});
$('#chatForm').addEventListener('submit',e=>{
  e.preventDefault();updateChatInput();const message=chatInput.value.trim();if(!message)return;
  queuedMessage={text:message};nextSync=0;syncPlayers();speechBubble.textContent=message;speechBubble.hidden=false;clearTimeout(speechTimer);
  speechTimer=setTimeout(()=>{speechBubble.hidden=true;speechBubble.textContent='';},5000);
  $('#chatDialog').close();
});
function positionSpeech(){
  if(speechBubble.hidden)return;
  const x=player.x*view.scale+view.x,y=(player.y-73)*view.scale+view.y;
  const half=speechBubble.offsetWidth/2;
  speechBubble.style.left=`${Math.max(half+8,Math.min(view.w-half-8,x))}px`;
  speechBubble.style.top=`${Math.max(speechBubble.offsetHeight+8,y)}px`;
}
$('#journalButton').onclick=()=>{clearMovement();$('#journal').showModal()};$('#closeJournal').onclick=()=>{$('#journal').close();canvas.focus({preventScroll:true})};
$('#guideButton').onclick=()=>{clearMovement();$('#guide').showModal()};$('#closeGuide').onclick=()=>$('#guide').close();$('#startExploring').onclick=()=>{$('#guide').close();canvas.focus({preventScroll:true});dismissWelcome()};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
$('#interact').onclick=()=>{if(nearby)interactTarget(nearby)};
$('#recenter').onclick=()=>{$('#guide').close();player.x=768;player.y=919;player.dir='south';player.walking=false;walkClock=0;path=[];goal=null;pendingPlace=null;clearMovement();resetCompanion();$('#travelStatus').textContent='Kembali di pintu masuk taman'};
const keyDirs={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
window.addEventListener('keydown',e=>{if(phase!=='playing'||document.querySelector('dialog[open]'))return;if(keyDirs[e.key]){e.preventDefault();keys.add(keyDirs[e.key]);path=[];goal=null;pendingPlace=null;dismissWelcome()}if((e.key==='e'||e.key==='E')&&nearby&&!e.repeat){e.preventDefault();interactTarget(nearby)}});
window.addEventListener('keyup',e=>{if(keyDirs[e.key])keys.delete(keyDirs[e.key])});window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMovement()});
joystick.addEventListener('pointerdown',e=>{if(phase!=='playing'||!ready||stick.pointer!==null||e.button!==0)return;e.preventDefault();stick.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystick.classList.add('engaged');path=[];goal=null;pendingPlace=null;keys.clear();dismissWelcome();updateStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId!==stick.pointer)return;e.preventDefault();updateStick(e);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,e=>{if(e.pointerId===stick.pointer)resetStick();});
joystick.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(phase!=='playing'||!ready||stick.pointer!==null)return;canvas.focus({preventScroll:true});const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=markerHits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);if(hit){playButtonSound();if(hit.p!==pianist||Math.hypot(player.x-hit.p.x,player.y-hit.p.y)<proximityRadius)interactTarget(hit.p);else routeTo(hit.p.x,hit.p.y,hit.p)}else routeTo((x-view.x)/view.scale,(y-view.y)/view.scale)});
function resize(){clearMovement();const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);view.w=r.width;view.h=r.height;ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false;playerCanvas.width=canvas.width;playerCanvas.height=canvas.height;playerContext.setTransform(d,0,0,d,0,0);playerContext.imageSmoothingEnabled=false;}new ResizeObserver(resize).observe(canvas);
function movement(dt){
  const wasWalking=player.walking;player.walking=false;
  if(phase!=='playing'||document.querySelector('dialog[open]')){walkClock=0;return;}
  const oldX=player.x,oldY=player.y,held=d=>keys.has(d);
  let dx=(held('right')?1:0)-(held('left')?1:0),dy=(held('down')?1:0)-(held('up')?1:0);
  if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;}else{dx=stick.x;dy=stick.y;}
  if(dx||dy){dx*=112*dt;dy*=112*dt;if(canWalk(player.x+dx,player.y))player.x+=dx;if(canWalk(player.x,player.y+dy))player.y+=dy;}
  else if(path.length){const p=path[0],dist=Math.hypot(p.x-player.x,p.y-player.y),step=116*dt;dx=p.x-player.x;dy=p.y-player.y;if(dist<=step){player.x=p.x;player.y=p.y;path.shift();}else{player.x+=dx/dist*step;player.y+=dy/dist*step;}}
  const movedX=player.x-oldX,movedY=player.y-oldY;
  if(Math.hypot(movedX,movedY)>.001){player.walking=true;player.dir=directionFor(movedX,movedY);}
  if(!path.length&&goal){goal=null;$('#travelStatus').textContent='Nikmati setiap momen kecil';if(pendingPlace){$('#travelStatus').textContent=pendingPlace===pianist?'Tiba di pianis dan penyanyi. Ketuk tombol musik atau tekan E.':`Tiba di ${pendingPlace.title.toLowerCase()}. Ketuk tombol Lihat info untuk membukanya.`;pendingPlace=null;}}
  walkClock=player.walking?(wasWalking?walkClock+dt:0):0;
  const candidates=targets.map(p=>({p,d:Math.hypot(player.x-p.x,player.y-p.y)})).filter(c=>c.d<proximityRadius).sort((a,b)=>a.d-b.d);
  const previous=nearby;
  const oldDistance=nearby?Math.hypot(player.x-nearby.x,player.y-nearby.y):Infinity;
  if(candidates.length&&(!nearby||candidates[0].d+14<oldDistance))nearby=candidates[0].p;
  else if(oldDistance>proximityRadius+14)nearby=candidates[0]?.p||null;
  if(nearby!==previous&&nearby){dismissWelcome();$('#travelStatus').textContent=nearby===pianist?'Pianis dan penyanyi ada di dekatmu. Ketuk tombol musik atau tekan E.':`${nearby.title} ada di dekatmu. Ketuk Lihat info atau tekan E.`;}

}
function drawCharacter(ctx,actor=player,character=selectedCharacter,clock=walkClock){
  const row=directions.indexOf(actor.dir),col=actor.walking?1+Math.floor(clock/.25)%characters[character].frames:0,unit=1.2;
  ctx.save();ctx.translate(Math.round(actor.x),Math.round(actor.y));
  ctx.fillStyle='#1d352655';ctx.beginPath();ctx.ellipse(0,1,12,4,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(characters[character].image,col*68,row*68,68,68,-34*unit,-57*unit,68*unit,68*unit);
  ctx.restore();
}
function drawParty(ctx){
  if(pairMode&&companion.y<player.y)drawCharacter(ctx,companion,'woman',companion.clock);
  drawCharacter(ctx);
  if(pairMode&&companion.y>=player.y)drawCharacter(ctx,companion,'woman',companion.clock);
}
// World-space feedback stays attached to a station while the camera moves.
function drawStationGlow(){
  if(document.querySelector('dialog[open]'))return;
  for(const p of targets){
    const distance=Math.hypot(player.x-p.x,player.y-p.y);
    const intensity=p===nearby?1:Math.max(0,1-distance/proximityRadius);
    if(!intensity)continue;
    const pulse=reduced?1:.88+.12*Math.sin(t*3);
    ctx.save();ctx.translate(p.x,p.y-18);ctx.scale(1,.72);
    const halo=ctx.createRadialGradient(0,0,8,0,0,86);
    halo.addColorStop(0,`rgba(255,239,151,${.40*intensity*pulse})`);
    halo.addColorStop(.55,`rgba(255,213,99,${.23*intensity*pulse})`);halo.addColorStop(1,'rgba(255,213,99,0)');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,86,0,Math.PI*2);ctx.fill();
    ctx.shadowColor='#ffeaa0';ctx.shadowBlur=18;ctx.strokeStyle=`rgba(255,239,174,${.9*intensity*pulse})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,12,48,32,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}
function positionStationAction(){
  const show=phase==='playing'&&nearby&&!document.querySelector('dialog[open]');
  if(action.hidden!==!show)action.hidden=!show;
  if(!show){actionStation=null;return;}
  if(actionStation!==nearby){actionStation=nearby;action.querySelector('strong').textContent=nearby.title;action.dataset.station=nearby.id;}
  setText(action.querySelector('small'),nearby===hosts?'Sapa petugas':nearby===pianist?(sound?'Matikan musik':'Nyalakan musik'):'Lihat info');
  setAttribute(action,'aria-label',nearby===hosts?'Sapa petugas penyambutan':nearby===pianist?(sound?'Matikan musik lewat musisi':'Nyalakan musik lewat musisi'):`Lihat info ${nearby.title.toLowerCase()}`);
  const sx=nearby.x*view.scale+view.x,sy=nearby.y*view.scale+view.y;
  const width=action.offsetWidth,height=action.offsetHeight,pad=14,topLimit=view.h<500?96:128;
  let left=Math.max(pad,Math.min(view.w-width-pad,sx-width/2));
  let top=Math.max(topLimit,Math.min(view.h-height-pad,sy-82*view.scale-height));
  const px=player.x*view.scale+view.x,py=player.y*view.scale+view.y;
  if(left<px+24*view.scale&&left+width>px-24*view.scale&&top<py+18&&top+height>py-66*view.scale){
    const right=px+24*view.scale+12,leftSide=px-24*view.scale-width-12;
    if(right+width<=view.w-pad)left=right;
    else if(leftSide>=pad)left=leftSide;
    else top=Math.max(topLimit,py-66*view.scale-height-12);
  }
  // Keep the action clear of the sound/menu buttons and the thumbstick.
  for(const obstacle of [$('.game-tools'),joystick,$('#journalButton'),$('#chatButton')]){
    const box=obstacle.getBoundingClientRect();
    if(left<box.right+8&&left+width>box.left-8&&top<box.bottom+8&&top+height>box.top-8){
      if(obstacle===joystick||obstacle.id==='journalButton'||obstacle.id==='chatButton')top=Math.max(topLimit,box.top-height-14);
      else if(box.left-width-14>=pad)left=box.left-width-14;
      else top=box.bottom+14;
    }
  }
  top=Math.max(pad,Math.min(view.h-height-pad,top));
  setStyle(action,'left',`${Math.round(left)}px`);setStyle(action,'top',`${Math.round(top)}px`);
  const pointerX=`${Math.max(18,Math.min(width-18,sx-left))}px`;if(action.style.getPropertyValue('--pointer-x')!==pointerX)action.style.setProperty('--pointer-x',pointerX);
  // A short tether makes the target clear even when the button is edge-clamped.
  ctx.save();ctx.strokeStyle='#fff0b5cc';ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.beginPath();
  ctx.moveTo(Math.max(left+18,Math.min(left+width-18,sx)),top+height+6);ctx.lineTo(sx,sy-22*view.scale);ctx.stroke();ctx.restore();
}
function positionWeddingCouple(){
  const element=$('#weddingCouple');
  // Main character opaque height: 46 atlas pixels at 1.2 world scale.
  // Couple GIF opaque height: 367 pixels in a 370-pixel canvas.
  const height=(46*1.2)*(370/367)*view.scale,width=height*393/370;
  const x=768*view.scale+view.x-width/2,y=145*view.scale+view.y-height;
  const hidden=phase!=='playing'||x+width<0||x>view.w||y+height<0||y>view.h;if(element.hidden!==hidden)element.hidden=hidden;
  setStyle(element,'width',`${width}px`);setStyle(element,'height',`${height}px`);
  setStyle(element,'transform',`translate(${x}px,${y}px)`);
}
function positionPianist(){
  const width=118.976*view.scale,height=59.488*view.scale;
  const x=pianist.x*view.scale+view.x-width/2,y=pianist.y*view.scale+view.y-height;
  const hidden=phase!=='playing'||x+width<0||x>view.w||y+height<0||y>view.h;if(pianistButton.hidden!==hidden)pianistButton.hidden=hidden;
  setStyle(pianistButton,'width',`${width}px`);setStyle(pianistButton,'height',`${height}px`);
  setStyle(pianistButton,'transform',`translate(${x}px,${y}px)`);
  setAttribute(pianistButton,'aria-label',Math.hypot(player.x-pianist.x,player.y-pianist.y)<proximityRadius?(sound?'Matikan musik lewat musisi':'Nyalakan musik lewat musisi'):'Dekati pianis dan penyanyi');
}
pianistButton.onclick=()=>{if(phase!=='playing'||document.querySelector('dialog[open]'))return;if(Math.hypot(player.x-pianist.x,player.y-pianist.y)<proximityRadius)interactTarget(pianist);else routeTo(pianist.x,pianist.y,pianist);};
function syncPianist(playing){
  for(const image of [pianistImage,$('#singerImage')]){
    const next=playing?image.dataset.playing:image.dataset.idle;
    if(image.getAttribute('src')!==next)image.setAttribute('src',next);
  }
  pianistButton.dataset.state=playing?'playing':'idle';
}
function cameraFor(vw,vh,x,y){
  const compact=vw<760;
  const scale=compact?Math.max(1.2,Math.min(vw,vh)/360):Math.max(1,vw/1200,vh/850);
  return {scale,x:Math.min(0,Math.max(vw-W*scale,vw/2-x*scale)),y:Math.min(0,Math.max(vh-H*scale,vh*.52-y*scale))};
}
// Cache a water-only mask so ripples never cover bridges, plants or stonework.
const waterLayer=document.createElement('canvas'),waterMask=document.createElement('canvas');
waterLayer.width=waterMask.width=740;waterLayer.height=waterMask.height=420;
const waterCtx=waterLayer.getContext('2d'),maskCtx=waterMask.getContext('2d');
function prepareWater(){
  maskCtx.drawImage(map,90,380,740,420,0,0,740,420);
  const pixels=maskCtx.getImageData(0,0,740,420),d=pixels.data;
  for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];d[i+3]=(g>r*1.22&&b>r*1.35&&b>65)?255:0;}
  maskCtx.putImageData(pixels,0,0);
}
function drawWater(){
  if(reduced||(830*view.scale+view.x<0)||(90*view.scale+view.x>view.w)||(800*view.scale+view.y<0)||(380*view.scale+view.y>view.h))return;
  const w=waterCtx;w.clearRect(0,0,740,420);w.save();w.translate(-90,-380);
  // Slow downstream highlights with staggered fades rather than flashing.
  for(let i=0;i<85;i++){
    const cycle=(t*.19+i*.618)%1,x=115+(i*73)%470+cycle*24,y=515+(i*47)%272+cycle*7;
    w.globalAlpha=Math.sin(cycle*Math.PI)*.28;w.fillStyle=i%3?'#b7eef0':'#e4fbeb';
    w.fillRect(Math.round(x),Math.round(y),8+i%13,2);
    if(i%3===0)w.fillRect(Math.round(x+5),Math.round(y+3),7,1);
  }
  // Expanding rings below the cascade and around the fountain basin.
  for(const [x,y,rx,ry] of [[210,527,32,11],[768,452,44,19]]){
    for(let i=0;i<3;i++){const u=(t*.42+i/3)%1;w.globalAlpha=(1-u)*.5;w.strokeStyle='#d3f9f0';w.lineWidth=1.5;w.beginPath();w.ellipse(x,y,5+rx*u,2+ry*u,0,0,Math.PI*2);w.stroke();}
  }
  w.restore();w.globalAlpha=1;w.globalCompositeOperation='destination-in';w.drawImage(waterMask,0,0);w.globalCompositeOperation='source-over';
  ctx.drawImage(waterLayer,90,380);
  // Falling droplets stay inside the existing waterfall and fountain streams.
  ctx.save();ctx.fillStyle='#e5ffff';
  for(let i=0;i<13;i++){const u=(t*.9+i*.173)%1;ctx.globalAlpha=.2+.3*Math.sin(u*Math.PI);ctx.fillRect(186+i%6*5,489+u*27,1.5,3.5);}
  for(const x of [746,751,788,792]){const u=(t*1.05+x*.13)%1;ctx.globalAlpha=.45;ctx.fillRect(x,429+u*19,1.5,3);}
  ctx.restore();
}
function draw(){const vw=view.w,vh=view.h;if(!vw||!vh)return;ctx.clearRect(0,0,vw,vh);const camera=cameraFor(vw,vh,player.x,player.y),scale=camera.scale;Object.assign(view,camera);ctx.save();ctx.translate(view.x,view.y);ctx.scale(scale,scale);ctx.drawImage(map,0,0,W,H);drawWater();if(phase==='playing'){drawGuests();drawSeatedGuests();drawHosts();}
if(goal){ctx.strokeStyle='#fff8da';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(goal.x,goal.y,10,5,0,0,Math.PI*2);ctx.stroke()}
if(!reduced){for(let i=0;i<16;i++){const x=150+(i*197)%1250+Math.sin(t*.35+i)*17,y=170+(i*131)%700+Math.cos(t*.4+i)*13;ctx.globalAlpha=.25+.3*(.5+.5*Math.sin(t*1.2+i));ctx.fillStyle='#ffecb7';ctx.fillRect(x,y,3,3)}ctx.globalAlpha=1;}
if(phase==='playing'){drawStationGlow();}ctx.restore();markerHits=[];positionPianist();positionWeddingCouple();positionStationAction();drawPlayerLayer();positionSpeech();if(phase!=='playing')return;
targets.forEach(p=>{
  if(p===nearby)return;
  const x=p.x*scale+view.x,y=p.y*scale+view.y-(p===hosts?105:49)*scale;
  ctx.font='800 14px Nunito, sans-serif';
  const text=p.title,w=Math.max(116,ctx.measureText(text).width+32),h=44;
  const left=Math.max(8,Math.min(vw-w-8,Math.round(x-w/2))),top=Math.round(y);
  if(top<135||top+h>vh-86||x+w/2<0||x-w/2>vw)return;
  ctx.save();ctx.beginPath();ctx.roundRect(left,top+4,w,h,19);ctx.fillStyle='#b68e68';ctx.fill();
  const gloss=ctx.createLinearGradient(0,top,0,top+h);
  gloss.addColorStop(0,'#fff5e4');gloss.addColorStop(.18,'#faedd9');gloss.addColorStop(.5,'#f4e5ce');gloss.addColorStop(1,'#eed9bc');
  ctx.beginPath();ctx.roundRect(left,top,w,h,19);ctx.fillStyle=gloss;ctx.fill();ctx.strokeStyle='#c6a580';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.roundRect(left+7,top+5,w-14,11,7);ctx.fillStyle='#fffaf160';ctx.fill();
  ctx.fillStyle='#61432f';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,left+w/2,top+h/2+1);ctx.restore();
  markerHits.push({x:left,y:top,w,h:h+6,p});
});
}
function drawPlayerLayer(){
  const ctx=playerContext,scale=view.scale;
  ctx.clearRect(0,0,view.w,view.h);
  if(phase!=='playing')return;
  ctx.save();ctx.translate(view.x,view.y);ctx.scale(scale,scale);drawRemotePlayers(ctx);drawParty(ctx);ctx.restore();
  drawRemoteLabels(ctx,scale);const x=player.x*scale+view.x,y=player.y*scale+view.y+18;ctx.font='800 14px Nunito, sans-serif';const nameWidth=ctx.measureText(playerName).width+18,nameX=Math.max(nameWidth/2+4,Math.min(view.w-nameWidth/2-4,x));ctx.textAlign='center';ctx.fillStyle='#233c31d9';ctx.beginPath();ctx.roundRect(nameX-nameWidth/2,y-10,nameWidth,24,7);ctx.fill();ctx.fillStyle='#fff9e2';ctx.fillText(playerName,nameX,y+7);ctx.textAlign='left';
  ctx.save();ctx.translate(view.x,view.y);ctx.scale(scale,scale);ctx.drawImage(frontGate,665,780,208,180);ctx.restore();}
// The map is covered by dialogs; keep audio and network timers running without redrawing it.
function frame(now){const dt=Math.min((now-last)/1000,.035);last=now;if(ready){if(document.hidden||document.querySelector('dialog[open]')){player.walking=false;companion.walking=false;walkClock=0;}else{t+=dt;movement(dt);followCompanion(dt);draw();}}requestAnimationFrame(frame)}
window.addEventListener('wedding-content-updated',async event=>{
  updateCountdown();
 welcomeLines[0].text=`Selamat datang di taman pernikahan ${window.WEDDING.profile.groom} & ${window.WEDDING.profile.bride}! Kami senang kamu hadir. Yuk, kenali tamannya sebentar.`;
 if(!event.detail?.mediaChanged)return;
 const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
 try{const a=window.WEDDING.assets,c=window.WEDDING.characters;const images=await Promise.all([a.map,a.gate,a.guests,a.seated,a.hosts,c.men.atlas,c.woman.atlas].map(loadImage));[map,frontGate,guestSprites,seatedSprites,hostSprites]=images;characters.men.image=images[5];characters.woman.image=images[6];prepareWater();for(const clip of buttonSoundPool)clip.src=a.click;drawCharacterPreviews();if(sound&&phase==='playing')startMusic();}
 catch{$('#travelStatus').textContent='Gambar baru belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.';}
});
function drawCharacterPreviews(){
 for(const [id,c] of Object.entries(characters)){const preview=$(`#${id}Preview`),pctx=preview.getContext('2d');pctx.clearRect(0,0,136,136);pctx.imageSmoothingEnabled=false;pctx.drawImage(c.image,0,136,68,68,0,0,136,136);}
 const pairCtx=$('#pairPreview').getContext('2d');pairCtx.clearRect(0,0,204,136);pairCtx.imageSmoothingEnabled=false;pairCtx.drawImage(characters.men.image,0,136,68,68,0,0,136,136);pairCtx.drawImage(characters.woman.image,0,136,68,68,68,0,136,136);
}
let loaded=0;
function assetLoaded(){
  const percent = Math.min(100, Math.round((++loaded / 7) * 100));
  const loadEl = $('#loading');
  if(loadEl && !ready){loadEl.innerHTML = `Membuka taman… <span style="display:inline-block;margin-left:6px;font-weight:700;opacity:0.9;">${percent}%</span>`;}
  if(loaded===7){ready=true;if(loadEl)loadEl.hidden=true;resize();
  for(const [id,c] of Object.entries(characters)){const preview=$(`#${id}Preview`),pctx=preview.getContext('2d');pctx.imageSmoothingEnabled=false;pctx.drawImage(c.image,0,2*68,68,68,0,0,136,136);}
  const pairCtx=$('#pairPreview').getContext('2d');pairCtx.imageSmoothingEnabled=false;
  pairCtx.drawImage(characters.men.image,0,136,68,68,0,0,136,136);pairCtx.drawImage(characters.woman.image,0,136,68,68,68,0,136,136);
  document.querySelectorAll('[data-character]').forEach(b=>b.disabled=false);
}}
function assetError(){$('#loading').textContent='Taman belum berhasil dimuat. Muat ulang halaman untuk mencoba lagi.';}
hostSprites.onload=assetLoaded;hostSprites.onerror=assetError;hostSprites.src=window.WEDDING.assets.hosts;
seatedSprites.onload=assetLoaded;seatedSprites.onerror=assetError;seatedSprites.src=window.WEDDING.assets.seated;
guestSprites.onload=assetLoaded;guestSprites.onerror=assetError;guestSprites.src=window.WEDDING.assets.guests;
frontGate.onload=assetLoaded;frontGate.onerror=assetError;frontGate.src=window.WEDDING.assets.gate;
map.onload=()=>{prepareWater();assetLoaded();};map.onerror=assetError;map.src=window.WEDDING.assets.map;
for(const c of Object.values(characters)){c.image.onload=assetLoaded;c.image.onerror=assetError;c.image.src=c.atlas;}
function showPhase(next){phase=next;document.body.dataset.phase=next;$('#titleScreen').hidden=next!=='title';$('#characterScreen').hidden=next!=='choose';$('#opening').hidden=next==='playing';canvas.inert=next!=='playing';clearMovement();}
$('#continueButton').onclick=()=>{startMusic();showPhase('choose');$('#playerName').focus({preventScroll:true});};
$('#playerName').addEventListener('input',()=>{$('#nameError').hidden=true;$('#playerName').removeAttribute('aria-invalid');});
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{if(!ready)return;const name=$('#playerName').value.trim().replace(/\s+/g,' ');if(!name){$('#nameError').textContent='Isi namamu dulu, ya.';$('#nameError').hidden=false;$('#playerName').setAttribute('aria-invalid','true');$('#playerName').focus();return;}playerName=name;player.x=744+Math.random()*48;player.y=890+Math.random()*48;pairMode=b.dataset.character==='pair';selectedCharacter=pairMode?'men':b.dataset.character;player.dir='south';player.walking=false;walkClock=0;resetCompanion();showPhase('playing');canvas.focus({preventScroll:true});startWelcome();});
requestAnimationFrame(frame);
// Music is enabled by default; Continue provides the browser's required audio gesture.
const audio=$('#gardenMusic');let sound=true,playRequest=0;
audio.loop=true;
audio.addEventListener('ended',()=>{if(sound){audio.currentTime=0;startMusic();}});
function updateSoundButton(){$('#soundButton').setAttribute('aria-pressed',String(sound));$('#soundButton').setAttribute('aria-label',sound?'Matikan musik':'Nyalakan musik');$('#soundButton span').textContent=sound?'Musik menyala':'Musik mati';}
async function startMusic(){if(!sound)return;const request=++playRequest;try{await audio.play();if(!sound)audio.pause();}catch{if(request===playRequest&&sound){sound=false;updateSoundButton();}}}
function toggleMusic(){sound=!sound;updateSoundButton();if(sound)startMusic();else{++playRequest;audio.pause();syncPianist(false);}}
$('#soundButton').onclick=toggleMusic;
audio.addEventListener('playing',()=>syncPianist(sound&&!audio.paused));
for(const event of ['pause','waiting','ended','error'])audio.addEventListener(event,()=>syncPianist(false));
syncPianist(false);
audio.addEventListener('error',()=>{++playRequest;sound=false;updateSoundButton();});
})();
