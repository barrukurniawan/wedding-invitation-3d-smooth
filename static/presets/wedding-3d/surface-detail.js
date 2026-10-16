import * as T from './vendor/three.module.js';

// Small shared, seamless surface maps: generated once, with no per-frame texture work.
export function createSurfaceDetail({mobile=false}={}) {
  const size=256,tau=Math.PI*2;
  function field(u,v){return Math.sin(tau*(u*2+v))*Math.cos(tau*(v*2-u))*.48+Math.cos(tau*(u*3-v*2))*.30+Math.sin(tau*(u*7+v*5))*.15;}
  function softNoise(u,v,count){
    const x=u*count,y=v*count,ix=Math.floor(x),iy=Math.floor(y);
    const fade=t=>t*t*(3-2*t),fx=fade(x-ix),fy=fade(y-iy);
    const value=(a,b)=>{let h=Math.imul(a%count+17,374761393)^Math.imul(b%count+31,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
    return T.MathUtils.lerp(T.MathUtils.lerp(value(ix,iy),value(ix+1,iy),fx),T.MathUtils.lerp(value(ix,iy+1),value(ix+1,iy+1),fx),fy)*2-1;
  }
  function texture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
    let seed=kind==='path'?7123:kind==='foliage'?2981:537;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size,n=field(u,v),grain=(random()-.5),i=(y*size+x)*4;
      let value;
      if(kind==='path')value=234+n*13+grain*15;
      else if(kind==='foliage')value=234+softNoise(u,v,6)*22+softNoise(u,v,18)*10+grain*3;
      else if(kind==='ground')value=237+softNoise(u,v,12)*14+softNoise(u,v,48)*8+grain*16;
      else{
        const ridge=Math.sin(tau*(u*14+.23*Math.sin(tau*u*3)+.13*Math.sin(tau*v)+.07*Math.sin(tau*v*3)));
        value=225+n*9-Math.max(0,ridge)**8*28+grain*5;
      }
      value=Math.max(160,Math.min(255,value));pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    if(kind==='path'){
      // Fine, shallow gravel flecks rather than separate pebble meshes.
      for(let i=0;i<650;i++){
        const x=random()*size,y=random()*size,r=.35+random()*1.1;
        ctx.fillStyle=i%3?'rgba(97,78,49,0.10)':'rgba(255,255,244,0.44)';
        ctx.beginPath();ctx.ellipse(x,y,r,r*.65,random()*Math.PI,0,tau);ctx.fill();
      }
    }
    const map=new T.CanvasTexture(canvas);map.name=`Shared ${kind} surface`;
    map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
    return map;
  }
  const pathMap=texture('path'),leafMap=texture('foliage'),barkMap=texture('bark');
  const groundMaterial=new T.MeshStandardMaterial({map:texture('ground'),vertexColors:true,roughness:1});
  groundMaterial.name='Continuous grass-to-sand ground';groundMaterial.userData.batchable=true;
  const pathMaterial=new T.MeshStandardMaterial({color:'#ffffff',map:pathMap,vertexColors:true,roughness:.98,side:T.DoubleSide});
  pathMaterial.name='Warm sand and pale stone path';pathMaterial.userData.batchable=true;
  const pathDark=new T.Color('#bda377'),pathLight=new T.Color('#ecd4a4'),pathWarm=new T.Color('#d6b58a');
  function pathColor(x,z){
    const broad=.50+.23*Math.sin(x*.31+z*.13)+.17*Math.cos(z*.38-x*.16)+.08*Math.sin(x*.9+z*.72);
    return pathDark.clone().lerp(pathLight,T.MathUtils.clamp(broad,0,1)).lerp(pathWarm,.13+.11*Math.sin(x*.19-z*.27));
  }
  function pathGeometry(geometry,offset=new T.Vector3()){
    const p=geometry.attributes.position,colors=[],uv=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i)+offset.x,z=p.getZ(i)+offset.z,c=pathColor(x,z);
      colors.push(c.r,c.g,c.b);uv.push(x/3.2,z/3.2);
    }
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    return geometry;
  }
  const materials=new Map();
  function plantMaterial(source,kind='foliage'){
    const key=`${kind}:${source.uuid}`;
    if(!materials.has(key)){
      const m=source.clone();m.map=kind==='bark'?barkMap:leafMap;m.vertexColors=true;
      m.name=kind==='bark'?'Warm textured bark':'Layered foliage colour';m.userData.batchable=true;materials.set(key,m);
    }
    return materials.get(key);
  }
  function plantGeometry(geometry,kind='foliage',phase=0){
    const g=geometry.clone(),p=g.attributes.position,colors=[];g.computeBoundingBox();
    const box=g.boundingBox,range=Math.max(.001,box.max.y-box.min.y);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),height=(y-box.min.y)/range;
      const patch=Math.sin(x*3.1+z*2.4+phase)*Math.cos(y*3.3-x*1.2)+.4*Math.sin(z*6.2+y*4.1+phase);
      const brightness=kind==='bark'?.82+.23*height+.045*patch:.77+.29*height+.075*patch;
      colors.push(brightness*(kind==='bark'?1:1.015),brightness,brightness*(kind==='bark'?.97:.91));
    }
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
  }
  function decoratePlant(object,kind='foliage'){
    object.geometry=plantGeometry(object.geometry,kind,object.position.x*.63+object.position.z*.37);
    object.material=plantMaterial(object.material,kind);return object;
  }
  return {groundMaterial,pathMaterial,pathGeometry,plantMaterial,plantGeometry,decoratePlant};
}
