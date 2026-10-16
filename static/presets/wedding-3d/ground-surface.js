import * as T from './vendor/three.module.js';
import {lagoonGroundHeight,lagoonSandBlend} from './lagoon.js';

export const groundGrid=mobile=>[80,54];

// The coast starts at the exact same vertices as the lawn, including its corners.
export function groundBoundary(mobile){
 const [nx,nz]=groundGrid(mobile),points=new Map();
 const add=(x,z)=>{x=Math.fround(x);z=Math.fround(z);points.set(`${x}:${z}`,[x,z]);};
 for(let i=0;i<=nx;i++){const x=-30+60*i/nx;add(x,-20);add(x,20);}
 for(let i=0;i<=nz;i++){const z=-20+40*i/nz;add(-30,z);add(30,z);}
 const angle=([x,z])=>(Math.atan2(z,x)+Math.PI*2)%(Math.PI*2);
 const edge=[...points.values()].sort((a,b)=>angle(a)-angle(b));edge.push(edge[0]);return edge;
}

export function grassSandBlend(x,z){
 // Rounded, gently uneven vegetation edge, independent of the rectangular mesh join.
 const qx=Math.abs(x)-22,qz=Math.abs(z)-12;
 const distance=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-8;
 const patches=1.35*Math.sin(x*.24+z*.12)+.8*Math.sin(z*.46-x*.18)+.45*Math.cos(x*.71+z*.39);
 return Math.max(T.MathUtils.smoothstep(distance+patches,-4.5,5.5),lagoonSandBlend(x,z));
}

const dune=new T.Color('#b9bf87'),drySand=new T.Color('#f1dfae'),wetSand=new T.Color('#c4b485');
export function groundColor(x,z,height,out=new T.Color()){
 const blend=grassSandBlend(x,z);
 out.setHSL(.235+Math.sin(x*.17+z*.21)*.009,.36,.31+Math.sin(x*.24)*Math.cos(z*.19)*.034+Math.sin(x*.72+z*.57)*.009);
 out.lerp(dune,T.MathUtils.smoothstep(blend,0,.62));
 out.lerp(drySand,T.MathUtils.smoothstep(blend,.24,1));
 out.lerp(wetSand,T.MathUtils.smoothstep(-height,.50,1.45));
 return out.multiplyScalar(1+.014*Math.sin(x*.45+z*.38)+.012*Math.cos(x*.9-z*.32));
}

export function decorateGroundGeometry(geometry){
 const p=geometry.attributes.position,n=geometry.attributes.normal,color=new T.Color(),colors=[],uv=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);groundColor(x,z,p.getY(i),color);
  colors.push(color.r,color.g,color.b);uv.push(x/3,z/3);
  if((Math.abs(Math.abs(x)-30)<.0001&&Math.abs(z)<=20.0001)||(Math.abs(Math.abs(z)-20)<.0001&&Math.abs(x)<=30.0001))n.setXYZ(i,0,1,0);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return geometry;
}

export function createLawnGeometry(mobile,height){
 const [nx,nz]=groundGrid(mobile),geometry=new T.PlaneGeometry(60,40,nx,nz);geometry.rotateX(-Math.PI/2);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),edge=Math.max(0,Math.min(30-Math.abs(x),20-Math.abs(z)));
  p.setY(i,lagoonGroundHeight(x,z,height)+(Math.sin(x*.62)+Math.cos(z*.71)+Math.sin(x*.3+z*.42))*.002*T.MathUtils.smoothstep(edge,0,2.4));
 }
 geometry.computeVertexNormals();return decorateGroundGeometry(geometry);
}
