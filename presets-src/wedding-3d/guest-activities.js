import * as T from './vendor/three.module.js';
import {islandSurfaceHeight} from './island.js';

export const SEATED_GUESTS=[
  {name:'Jas biru resepsi',outfit:'suit',color:'#3d5879',accent:'#b58a58',skin:'#d2a07b',x:15.575,z:-8.1380453819,angle:-Math.PI*5/6,activity:'seated',seatRoot:.265},
  {name:'Kebaya biru resepsi',outfit:'kebaya',color:'#719aab',accent:'#f2d4a7',skin:'#edb98f',x:24.425,z:-8.1380453819,angle:-Math.PI*7/6,activity:'seated',seatRoot:.265,refreshment:'cake'},
];
export const GUEST_ROUTES={
  'Batik biru':[[28.8,-7.2],[30.2,-5.8],[30.6,-.5],[29.7,2.2]],
  'Batik marun':[[8.8,24.8],[12.5,23.3],[16,23.1],[18.5,24]],
};
export function createPatrol(points,{speed=.8,pause=8}={}){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z))),length=curve.getLength();
  let distance=0,direction=1,wait=pause,velocity=0;
  const next=new T.Vector3();
  return {curve,length,get wait(){return wait},get speed(){return velocity},update(dt,root,player,canWalk,identity){
    wait=Math.max(0,wait-dt);
    const close=player&&Math.hypot(player.x-root.position.x,player.z-root.position.z)<2.1;
    const desired=wait>0||close?0:speed;velocity+=(desired-velocity)*(1-Math.exp(-dt*6));
    let step=velocity*dt;if(wait>0||close)step=0;
    const proposed=T.MathUtils.clamp(distance+direction*step,0,length);curve.getPointAt(proposed/length,next);
    if(step>0&&(!canWalk||canWalk(next.x,next.z,identity))&&(!player||Math.hypot(next.x-player.x,next.z-player.z)>1.7)){
      const moved=Math.hypot(next.x-root.position.x,next.z-root.position.z);
      const angle=Math.atan2(next.x-root.position.x,next.z-root.position.z),error=Math.atan2(Math.sin(angle-root.rotation.y),Math.cos(angle-root.rotation.y));
      root.rotation.y+=error*(1-Math.exp(-dt*6));root.position.x=next.x;root.position.z=next.z;distance=proposed;
      if(distance===0||distance===length){direction*=-1;wait=pause;velocity=0;}
      return moved;
    }
    if(step>0)velocity=0;return 0;
  }};
}

export function prepareGuestActivities(guests){
  for(const g of guests){const route=GUEST_ROUTES[g.spec.name];if(route)g.patrol=createPatrol(route,{speed:.82,pause:9});}
}
export function updateGuestActivity(g,t,dt,player,canWalk,index){
  if(g.patrol){
    const distance=g.patrol.update(dt,g.root,player,canWalk,g);g.root.position.y=islandSurfaceHeight(g.root.position.x,g.root.position.z)+.089;
    g.animate(t,{dt,speed:distance/Math.max(dt,.0001),distance,turn:0});g.moving=distance>.0001;
    return true;
  }
  if(g.spec.activity==='seated'){
    g.root.position.y=g.spec.seatRoot;
    const phase=t+index*2.4,sip=T.MathUtils.smoothstep(Math.sin(phase*.48),.18,.88);
    g.body.position.y=Math.sin(phase*1.8)*.005;g.body.rotation.set(.025+Math.sin(phase*.8)*.018,Math.sin(phase*.42)*.025,Math.sin(phase*.9)*.008);
    for(let i=0;i<2;i++){
      g.legs[i].rotation.set(-Math.PI/2,0,(i?1:-1)*.06);g.knees[i].rotation.set(Math.PI/2+Math.sin(phase*1.3+i)*.035,0,0);g.feet[i].rotation.set(-Math.sin(phase*1.3+i)*.035,0,0);
      g.arms[i].rotation.set(i?-.40-1.1*sip:-.32,i?-.25-.25*sip:0,(i?1:-1)*.14);
      g.elbows[i].rotation.set(i?-1.30-.20*sip:-1.05,0,0);
      g.wrists[i].rotation.set(i?1.70+1.14*sip:g.spec.refreshment==='cake'?1.37:.1,0,Math.sin(phase*1.2+i)*.025);
    }
    return true;
  }
  return false;
}
