import * as T from './vendor/three.module.js';
import {createCelebrationEffects} from './celebration-effects.js';

const flatDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createIslandMoments({scene,host,cat,couple,getPlayer,getTime,getEnabled,canWalk,onLock,onMeow,mobile=false}){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const effects=createCelebrationEffects(scene,{mobile,reducedMotion});
  const layer=document.createElement('div');layer.id='islandMoments';layer.hidden=true;host.append(layer);
  const button=document.createElement('button');button.id='momentAction';button.type='button';button.className='moment-action';button.hidden=true;
  const bubble=document.createElement('div');bubble.className='moment-response';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
  layer.append(button,bubble);
  const center=couple.center,anchor=new T.Vector3(),projected=new T.Vector3();let action=null,nextCat=0,nextCouple=0,bubbleUntil=0,bubbleKind=null,available=null;
  function nearest(time){const player=getPlayer().root.position;if(flatDistance(player,cat.root.position)<=2.2&&Math.abs(player.y-cat.root.position.y)<1&&time>=nextCat)return 'cat';if(flatDistance(player,center)<=5.5&&player.z>center.z-.5&&time>=nextCouple)return 'couple';return null;}
  function trigger(){
    const time=getTime();if(!getEnabled()||action)return false;const kind=nearest(time);if(!kind)return false;
    onLock();action={kind,start:time,end:time+(kind==='cat'?3.6:4.6)};bubbleKind=kind;bubbleUntil=action.end;button.hidden=true;
    if(kind==='cat'){cat.pet(time);nextCat=time+7;bubble.textContent='♥  Mrrr… meong!';bubble.dataset.kind='cat';onMeow();}
    else{couple.greet(time);effects.burst(time,center);nextCouple=time+9;bubble.textContent='Terima kasih sudah hadir! — Andi & Ratna';bubble.dataset.kind='couple';}
    return true;
  }
  button.addEventListener('click',trigger);
  addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='f'||e.repeat||['INPUT','TEXTAREA','BUTTON','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;if(trigger())e.preventDefault();});
  function place(element,position,camera,width,height,w,h){projected.copy(position).project(camera);const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;const visible=projected.z>-1&&projected.z<1&&x>w/2+8&&x<width-w/2-8&&y>h+12&&y<height-100&&camera.position.distanceToSquared(position)<45**2;element.hidden=!visible;if(visible){element.style.width=w+'px';element.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`;}return visible;}
  function update(time,dt,camera,width,height){
    effects.update(time);
    if(action&&time>=action.end){getPlayer().elbows.forEach(elbow=>elbow.rotation.z=0);action=null;onLock();}
    layer.hidden=!getEnabled();if(layer.hidden){button.hidden=true;bubble.hidden=true;return;}
    const rig=getPlayer(),p=rig.root.position;
    if(action){
      const age=time-action.start,to=action.kind==='cat'?cat.root.position:center;let distance=0;
      if(action.kind==='cat'&&age<.8){const gap=flatDistance(p,to),step=Math.min(Math.max(0,gap-1.2),dt*1.8);if(step>0){const x=p.x+(to.x-p.x)/gap*step,z=p.z+(to.z-p.z)/gap*step;if(canWalk(x,z)){p.x=x;p.z=z;distance=step;}}}
      rig.animate(time,{dt,speed:distance/Math.max(dt,.0001),distance,turn:0});
      const direction=Math.atan2(to.x-p.x,to.z-p.z)-rig.root.rotation.y;rig.root.rotation.y+=Math.atan2(Math.sin(direction),Math.cos(direction))*(1-Math.exp(-dt*8));
      const strength=T.MathUtils.smoothstep(age,.25,.85)*(1-T.MathUtils.smoothstep(time,action.end-.45,action.end));
      if(action.kind==='cat'){
        rig.body.rotation.x+=.20*strength;rig.head.rotation.x+=.20*strength;
        rig.arms[1].rotation.x-=.85*strength;rig.arms[1].rotation.z-=.40*strength;rig.elbows[1].rotation.x-=(.25+Math.sin(age*9)*.10)*strength;rig.wrists[1].rotation.x+=.25*strength;
      }else{rig.arms[1].rotation.z+=1.8*strength;rig.elbows[1].rotation.z=.45*strength;rig.wrists[1].rotation.z=Math.sin(age*7)*.25*strength;}
    }
    camera.updateMatrixWorld();available=action?null:nearest(time);
    if(available){const label=available==='cat'?'Elus kucing':'Beri selamat';if(button.dataset.kind!==available){button.dataset.kind=available;button.innerHTML=`<span aria-hidden="true">${available==='cat'?'♡':'✿'}</span> ${label} <kbd>F</kbd>`;button.setAttribute('aria-label',label);}
      if(available==='cat')anchor.copy(cat.root.position).add(new T.Vector3(0,1.9,0));else anchor.set(center.x,center.y+1.63,center.z+1.86);
      place(button,anchor,camera,width,height,180,48);
    }else button.hidden=true;
    if(time<bubbleUntil){if(bubbleKind==='cat')anchor.copy(cat.root.position).add(new T.Vector3(0,2.05,0));else anchor.set(center.x,center.y+4.18,center.z);place(bubble,anchor,camera,width,height,bubbleKind==='cat'?165:Math.min(268,width-32),70);}else bubble.hidden=true;
  }
  return {update,trigger,button,bubble,effects,hide(){layer.hidden=true;button.hidden=true;bubble.hidden=true;},get busy(){return !!action;},get activeKind(){return action?.kind||null;},nearCouple(){return flatDistance(getPlayer().root.position,center)<=6.5&&getPlayer().root.position.z>center.z-.5;}};
}
