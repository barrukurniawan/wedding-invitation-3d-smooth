import * as T from './vendor/three.module.js';

// One distance field drives the carved shore, sand, water tint and walk boundary.
// Negative values are inside the lagoon; the western inlet continues beyond the coast.
const inlet=[[-23.4,4.8,1.5],[-30,1.3,1.65],[-39,1,2.1],[-50,-.5,3.3]];
const smoothMin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
export function lagoonDistance(x,z){
  if(x>-8||z<-8||z>17)return 20;
  let d=(Math.hypot((x+18.2)/6.5,(z-7.8)/4.2)-1)*4.2;
  d+=.12*Math.sin(x*.83+z*.62)*Math.cos(z*.7);
  for(let i=1;i<inlet.length;i++){
    const a=inlet[i-1],b=inlet[i],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
    const channel=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)-T.MathUtils.lerp(a[2],b[2],t);
    d=smoothMin(d,channel,1.2);
  }
  return d;
}
export function lagoonGroundHeight(x,z,base){
  const d=lagoonDistance(x,z);
  if(d>=1.8)return base;
  return Math.min(base,-2.12+2.111*T.MathUtils.smoothstep(d,-1.8,1.8));
}
export const lagoonSandBlend=(x,z)=>1-T.MathUtils.smoothstep(lagoonDistance(x,z),1.5,3.5);
const rockSites=[[-23.5,1.1,.66],[-21.7,2.25,.45],[-16.9,2.25,.55],[-14.5,12.5,.48],[-28.7,-1.9,.68],[-33.1,4.6,.84],[-39.2,-3.2,.70],[-39.6,5.1,.52]];
export const lagoonBlocks=(x,z)=>lagoonDistance(x,z)<.50||rockSites.some(([a,b,r])=>Math.hypot(x-a,z-b)<r+.25);

// A small, static set of coastal details is merged with the garden's existing batches.
export function decorateLagoon({ball,beam,mesh,groundHeight}){
  for(const [x,z,r] of rockSites){
    const y=groundHeight(x,z),o=ball('#a7aaa0',x,y+r*.34,z,r,r*.58,r*.78);o.name='Weathered lagoon rock';o.rotation.y=x*.4;
    ball('#c3c4b4',x+r*.8,y+r*.12,z+.28,r*.38,r*.24,r*.31).name='Small coastal pebble';
  }
  for(const [x,z] of [[-22.2,12.4],[-18.5,13.1],[-14,3.5],[-27.1,-1.3],[-31.4,4.5],[-36.2,-2.1],[-38.4,4.1]]){
    const y=groundHeight(x,z);
    for(let j=0;j<5;j++){
      const a=j*2.4,h=.23+(j%3)*.08;
      beam([x+.06*Math.cos(a),y,z+.06*Math.sin(a)],[x+.18*Math.cos(a),y+h,z+.18*Math.sin(a)],.018,j%2?'#8b9c62':'#b2b779').name='Lagoon dune grass';
    }
  }
  const shellMat=new T.MeshStandardMaterial({color:'#fff0d9',roughness:.88});
  for(const [i,[x,z]] of [[-21.2,12.7],[-17.1,13.5],[-13.5,11.9],[-14.4,2.7],[-28.4,-1.4],[-33.9,4.3],[-37.4,-2.9],[-40,4.1]].entries()){
    const shell=new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),p=shell.attributes.position;
    for(let k=0;k<p.count;k++){const angle=Math.atan2(p.getZ(k),p.getX(k)),f=1+.09*Math.cos(angle*9);p.setX(k,p.getX(k)*f);p.setZ(k,p.getZ(k)*f);}
    shell.computeVertexNormals();const o=mesh(shell,shellMat,x,groundHeight(x,z)+.014,z,.19,.065,.14);o.name='Ivory ridged seashell';o.rotation.y=i*1.7;o.castShadow=false;
  }
}
