import * as T from './vendor/three.module.js';

const LINES=['Selamat datang! Senang kamu datang.','Pengantinnya serasi banget, ya!','Yuk, lihat-lihat tamannya.','Semoga Andi & Ratna selalu bahagia!','Angin pantainya adem banget.','Pemandangannya cantik, ya!','Makanannya enak. Jangan lupa dicoba!','Senang bisa kumpul di sini.'];
export function createGuestGreetings({host,guests}){
  const bubble=document.createElement('div');bubble.className='guest-speech';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');host.append(bubble);
  const position=new T.Vector3(),projected=new T.Vector3(),cooldowns=new Map();let current=null,until=0,next=3,candidate=null,since=0;
  function hide(){bubble.hidden=true;current=null;candidate=null;}
  function update(t,camera,player,width,height){
    if(current&&(t>until||player.distanceToSquared(current.root.position)>8**2)){hide();next=t+7;}
    if(!current&&t>=next){
      let closest=null,best=5**2;
      for(const guest of guests){const d=player.distanceToSquared(guest.root.position);if(d<best&&!guest.moving&&(cooldowns.get(guest)||0)<=t){closest=guest;best=d;}}
      if(closest!==candidate){candidate=closest;since=t;}
      if(candidate&&t-since>.65){current=candidate;until=t+4.5;cooldowns.set(current,t+28);bubble.textContent=LINES[guests.indexOf(current)%LINES.length];}
    }
    if(!current)return;
    camera.updateMatrixWorld();position.copy(current.root.position);position.y+=3.60;projected.copy(position).project(camera);
    const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height,w=Math.min(230,width-36);
    const visible=projected.z>-1&&projected.z<1&&x>w/2+8&&x<width-w/2-8&&y>76&&y<height-110&&camera.position.distanceToSquared(position)<42**2;
    bubble.hidden=!visible;if(visible){bubble.style.width=w+'px';bubble.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`;}
  }
  return {bubble,update,hide};
}
