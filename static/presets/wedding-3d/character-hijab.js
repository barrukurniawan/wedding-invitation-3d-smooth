import * as T from './vendor/three.module.js';

// Shared with the bride so every hijab follows the same rounded head and open face contour.
export function addCharacterHijab(rig,{white,satin,pearl}){
  const {body,head,mesh,ell,line,lathe}=rig;
    // Hood wraps around the sides and back with a true open face aperture.
    const vertices=[],uv=[],indices=[],rows=24,cols=64,pow=v=>Math.sign(v)*Math.abs(v)**.8;
    for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
      const theta=1.00+(Math.PI-1.00)*r/rows,phi=c/cols*Math.PI*2;
      vertices.push(.855*pow(Math.sin(theta)*Math.sin(phi)),.055+.91*pow(Math.sin(theta)*Math.cos(phi)),.815*pow(Math.cos(theta)));
      uv.push(c/cols,r/rows);
      if(r<rows&&c<cols){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    // Join the hood to the face contour without intersecting the cheeks or forehead.
    const inset=[],insetUV=[],insetIndices=[];
    for(let row=0;row<=6;row++)for(let col=0;col<=64;col++){
      const phi=col/64*Math.PI*2,u=row/6;
      const x=.69*Math.sin(phi),y=-.005+.635*Math.cos(phi);
      const width=.77*(1+.035*Math.exp(-(((y+.25)/.24)**2)));
      const z=.72*Math.max(.005,1-Math.abs(x/width)**2.5-Math.abs(y/.70)**2.5)**.4+.013;
      const ox=.855*pow(Math.sin(1)*Math.sin(phi)),oy=.055+.91*pow(Math.sin(1)*Math.cos(phi)),oz=.815*pow(Math.cos(1));
      inset.push(T.MathUtils.lerp(x,ox,u),T.MathUtils.lerp(y,oy,u),T.MathUtils.lerp(z,oz,u));insetUV.push(col/64,u);
      if(row<6&&col<64){const a=row*65+col,b=a+65;insetIndices.push(a,a+1,b,a+1,b+1,b);}
    }
    const insetGeo=new T.BufferGeometry();insetGeo.setAttribute('position',new T.Float32BufferAttribute(inset,3));insetGeo.setAttribute('uv',new T.Float32BufferAttribute(insetUV,2));insetGeo.setIndex(insetIndices);insetGeo.computeVertexNormals();
    mesh(head,'Fitted white hijab face surround',insetGeo,white);
    mesh(head,'White hijab hood',geo,white);
    const edge=[];
    for(let i=0;i<=64;i++){const p=i/64*Math.PI*2;edge.push([.858*pow(Math.sin(1)*Math.sin(p)),.055+.913*pow(Math.sin(1)*Math.cos(p)),.819*pow(Math.cos(1))]);}
    line(head,'Soft satin hijab face binding',edge,.018,satin);
    lathe(body,'Hijab shoulder drape',[[.27,1.35],[.45,1.39],[.50,1.48],[.43,1.64],[.28,1.82],[.20,1.91]],white,.88);
    for(const s of [-1,1])line(body,'Soft scarf fold',[[s*.19,1.84,.19],[s*.30,1.65,.31],[s*.24,1.47,.38],[s*.07,1.38,.27]],.012,satin);
    ell(body,'Small pearl hijab pin',pearl,.13,1.47,.413,.028,.028,.020);
    // Small floral pearls on one side, kept below the top of the shared silhouette.
    for(let i=0;i<5;i++)ell(head,'Pearl hijab accent',pearl,.68+i*.019,.30-i*.078,.57,.019,.019,.018);
}
