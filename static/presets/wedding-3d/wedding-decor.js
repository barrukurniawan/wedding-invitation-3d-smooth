import * as T from './vendor/three.module.js';

// Small, static decorations, batched by venue. No extra lights or animation loops.
export function createWeddingDecor({scene,mobile=false}){
  const root=new T.Group();root.name='Wedding venue decorations';scene.add(root);
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.83,side:T.DoubleSide});
  const glow=new T.MeshStandardMaterial({vertexColors:true,roughness:.7,emissive:'#ffe1a0',emissiveIntensity:.28});
  const sphere=new T.SphereGeometry(1,mobile?8:12,mobile?6:8),cylinder=new T.CylinderGeometry(1,1,1,12),box=new T.BoxGeometry(1,1,1),torus=new T.TorusGeometry(1,.065,5,24);
  const colliders=[],zones=[],temporary=new Set([sphere,cylinder,box,torus]);
  const cream='#fff0d9',pink='#d99b9e',sage='#8da891',gold='#c29d63',wood='#997448';
  function group(parent,name,x=0,y=0,z=0,angle=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);return g;}
  function zone(name){const g=group(root,name);zones.push(g);return g;}
  function part(parent,geo,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,mat=material){const m=new T.Mesh(geo,mat);m.userData.tint=color;m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const ell=(p,c,x,y,z,a,b=a,d=a)=>part(p,sphere,c,x,y,z,a,b,d);
  const block=(p,c,x,y,z,a,b,d)=>part(p,box,c,x,y,z,a,b,d);
  const cyl=(p,c,x,y,z,r,h)=>part(p,cylinder,c,x,y,z,r,h,r);
  function curve(parent,color,points,r=.018){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,r,5,false);temporary.add(g);return part(parent,g,color);}
  function beam(parent,color,a,b,r){const av=new T.Vector3(...a),bv=new T.Vector3(...b),direction=bv.clone().sub(av);const o=cyl(parent,color,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,direction.length());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());}
  function bow(parent,x,y,z,size=.4,color=pink,angle=0){
    const g=group(parent,'Satin ribbon bow',x,y,z,angle);
    for(const s of [-1,1]){ell(g,color,s*size*.38,0,0,size*.44,size*.22,size*.10).rotation.z=s*.35;const tail=block(g,color,s*size*.17,-size*.36,-.025,size*.17,size*.65,.025);tail.rotation.z=s*.20;ell(g,'#efc7ba',s*size*.42,.035,.038,size*.21,size*.085,.018).rotation.z=s*.35;}
    ell(g,color,0,0,.06,size*.16,size*.17,size*.12);return g;
  }
  function flower(parent,x,y,z,size,color){
    const g=group(parent,'Layered rose',x,y,z);g.rotation.set(-.20,.4,.15);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const p=ell(g,color,Math.cos(a)*size*.5,.018,Math.sin(a)*size*.5,size*.48,size*.25,size*.34);p.rotation.y=-a;}
    ell(g,cream,0,size*.16,0,size*.25,size*.22,size*.25);
  }
  function flowers(parent,x,y,z,size=.7){
    for(let i=0;i<7;i++){const a=i*2.399;const leaf=ell(parent,i%2?sage:'#587b58',x+Math.cos(a)*size*.5,y-.05+Math.sin(i)*.06,z+Math.sin(a)*size*.5,size*.27,size*.10,size*.13);leaf.rotation.y=-a;}
    for(let i=0;i<5;i++){const a=i*2.399,r=i===0?0:size*.43;flower(parent,x+Math.cos(a)*r,y+(i===0?.12:0),z+Math.sin(a)*r,size*.29,i%2?pink:cream);}
  }
  function urn(parent,x,z){
    const g=group(parent,'Floral aisle urn',x,.03,z);cyl(g,'#d8c19c',0,.11,0,.30,.20);cyl(g,cream,0,.56,0,.13,.82);cyl(g,gold,0,.91,0,.23,.055);ell(g,cream,0,1.08,0,.37,.22,.37);flowers(g,0,1.30,0,.82);bow(g,0,.83,.20,.27);
    colliders.push({x,z,r:.62});return g;
  }
  function lantern(parent,x,y,z,size=1){
    const g=group(parent,'Brass wedding lantern',x,y,z);g.scale.setScalar(size);
    block(g,gold,0,.045,0,.45,.09,.45);block(g,gold,0,.67,0,.45,.075,.45);
    for(const a of [-1,1])for(const b of [-1,1])block(g,wood,a*.19,.36,b*.19,.035,.58,.035);
    cyl(g,cream,0,.26,0,.10,.36);part(g,sphere,'#fff1c3',0,.49,0,.055,.11,.055,glow);
    const cap=part(g,new T.ConeGeometry(.33,.18,4),gold,0,.78,0);temporary.add(cap.geometry);cap.rotation.y=Math.PI/4;
    const handle=part(g,torus,gold,0,.96,0,.13,.13,.13);return g;
  }
  function paperLantern(parent,x,y,z,color,size=.40){
    const g=group(parent,'Pleated paper lantern',x,y,z);ell(g,color,0,0,0,size,size*1.14,size);
    for(let i=-2;i<=2;i++){const yy=i*.29,r=Math.sqrt(1-yy*yy)*size;const ring=part(g,torus,i%2?cream:'#ddc9a8',0,yy*size*1.14,0,r,r,r);ring.rotation.x=Math.PI/2;}
    cyl(g,gold,0,size*1.1,0,size*.23,.05);cyl(g,gold,0,-size*1.1,0,size*.22,.05);
    beam(g,gold,[0,-size*1.12,0],[0,-size*1.58,0],.018);
  }
  const ceremony=zone('Ceremony ribbons and flowers');
  for(let z=-12;z<=-6;z+=1.55)for(const x of [-4.4,4.4]){block(ceremony,pink,x,1.25,z+.365,3.45,.16,.032);bow(ceremony,x,1.26,z+.40,.48);}
  for(const side of [-1,1]){urn(ceremony,side*7.2,-12.5);lantern(ceremony,side*7.85,.03,-11.65,.85);colliders.push({x:side*7.85,z:-11.65,r:.40});}
  // Loose petals hug the aisle edges, leaving the centre clear.
  for(let i=0;i<44;i++){const side=i%2?1:-1,x=side*(1.65+(i%5)*.07),z=-13.1+(i/44)*7.2;const petal=ell(ceremony,i%3?cream:pink,x,.057,z,.075,.014,.042);petal.rotation.y=i*2.399;}

  const pavilion=zone('Pavilion celebration canopy');
  for(const [x,y,c] of [[-20.7,4.45,cream],[-18,4.78,pink],[-15.3,4.45,cream]]){paperLantern(pavilion,x,y,-10.5,c,.36);beam(pavilion,wood,[x,y+.42,-10.5],[x,5.8,-10.5],.016);}
  const bunting=[];for(let i=0;i<=12;i++){const t=i/12;bunting.push([-21.3+6.6*t,4.9-Math.sin(Math.PI*t)*.32,-7.04]);}curve(pavilion,wood,bunting,.015);
  for(let i=0;i<9;i++){const t=(i+.5)/9,x=-21.3+6.6*t,y=4.9-Math.sin(Math.PI*t)*.32;const shape=new T.Shape();shape.moveTo(-.20,0);shape.lineTo(.20,0);shape.lineTo(0,-.31);shape.closePath();const geo=new T.ShapeGeometry(shape);temporary.add(geo);part(pavilion,geo,[cream,pink,sage][i%3],x,y,-7.04);}

  const reception=zone('Reception satin bows and cake');
  for(const dx of [-5.5,0,5.5])for(let i=0;i<6;i++){const a=i*Math.PI/3,rot=-a+Math.PI/2,x=20+dx+Math.cos(a)*2.15,z=-10+Math.sin(a)*2.15;const occupied=(dx===-5.5&&i===1)||(dx===5.5&&i===2),depth=occupied?1.35:1;bow(reception,x+Math.sin(rot)*.275*depth,1.48,z+Math.cos(rot)*.275*depth,occupied?.30:.23,i%2?sage:pink,rot);}
  // A small cake table beside the existing buffet, outside the through-path.
  const cake=group(reception,'Wedding cake table',24.1,.03,-5.03);cyl(cake,gold,0,.62,0,.12,1.22);cyl(cake,gold,0,.12,0,.47,.16);cyl(cake,cream,0,1.19,0,.77,.19);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;ell(cake,i%2?'#ebdcca':cream,Math.cos(a)*.73,1.05,Math.sin(a)*.73,.105,.23,.10);}
  cyl(cake,gold,0,1.32,0,.57,.065);
  for(const [r,y,h] of [[.49,1.53,.35],[.35,1.84,.27],[.23,2.09,.23]]){cyl(cake,cream,0,y,0,r,h);cyl(cake,pink,0,y-h/2+.055,0,r+.008,.067);for(let i=0;i<12;i++){const a=i*Math.PI/6;ell(cake,'#fff9e9',Math.cos(a)*(r+.007),y+h/2-.025,Math.sin(a)*(r+.007),.032,.024,.032);}}
  flower(cake,-.30,1.75,.27,.18,pink);flower(cake,.20,2.00,.16,.14,pink);
  for(const x of [-.10,.10])part(cake,torus,gold,x,2.37,0,.15,.15,.15);
  colliders.push({x:24.1,z:-5.03,r:1.03});
  for(const [x,z,size,color] of [[25.40,-5.14,.53,sage],[26.0,-5.10,.38,pink]]){const g=group(reception,'Ribbon wrapped wedding favour',x,.03,z);block(g,color,0,size/2,0,size,size,size*.8);block(g,cream,0,size+.025,0,size*1.04,.07,size*.84);block(g,gold,0,size/2,.008,size*.12,size+.10,size*.85);block(g,gold,0,size+.068,0,size*1.05,.014,size*.12);bow(g,0,size+.105,0,size*.38,cream);colliders.push({x,z,r:size*.72+.25});}

  const gazebo=zone('Gazebo floral keepsakes');
  for(const x of [19.2,24.8])bow(gazebo,x,2.60,9.16,.47,pink);
  for(const x of [19.8,24.2]){lantern(gazebo,x,.42,5.65,.68);colliders.push({x,z:5.65,r:.38});}
  const wreath=part(gazebo,torus,gold,22,3.40,4.95,.60,.60,.60);
  beam(gazebo,gold,[22,4.0,4.95],[22,4.15,4.95],.016);
  for(let i=0;i<5;i++){const a=Math.PI*.10+i*.38;flower(gazebo,22+Math.cos(a)*.60,3.4+Math.sin(a)*.60,5.04,.18,i%2?pink:cream);}

  // Two small gift stacks frame the bench, leaving the central approach open.
  function gift(x,y,z,w,h,d,color,ribbon,angle=0,ground=true){
    const g=group(gazebo,'Wrapped gift with satin bow',x,y,z,angle);
    block(g,color,0,h/2,0,w,h,d);
    block(g,color,0,h+.035,0,w*1.055,.07,d*1.055);
    block(g,ribbon,0,(h+.08)/2,0,w*.12,h+.08,d*1.065);
    block(g,ribbon,0,(h+.08)/2,0,w*1.065,h+.08,d*.12);
    const knot=bow(g,0,h+.10,0,Math.min(w,d)*.43,ribbon);knot.rotation.x=-Math.PI/2;
    const tag=block(g,cream,w*.25,h*.68,d/2+.017,.14,.19,.018);tag.rotation.z=-.2;
    ell(g,gold,w*.23,h*.77,d/2+.032,.012,.012,.008);
    if(ground)colliders.push({x,z,r:Math.hypot(w,d)/2+.19});
  }
  gift(19.85,.42,8.25,1,.74,.8,sage,cream,-.08);
  gift(19.85,1.23,8.25,.68,.50,.60,pink,gold,.10,false);
  gift(20.15,.42,9.16,.61,.49,.55,cream,pink,.16);
  gift(24.05,.42,8.25,.86,.67,.80,'#a6bbc5',cream,.07);
  gift(24.05,1.16,8.25,.56,.44,.54,cream,gold,-.12,false);
  gift(23.62,.42,9.15,.63,.48,.52,pink,cream,-.13);

  // A single canvas atlas serves the small wooden direction boards.
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d');
  const labels=['Our Story','Gallery','Jadwal Acara','Hadiah','Kirim Ucapan'];
  ctx.fillStyle=cream;ctx.fillRect(0,0,1024,1024);ctx.fillStyle='#3c291d';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 96px Arial, sans-serif';labels.forEach((text,i)=>ctx.fillText(text,512,i*128+64,940));
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  // Keep the lettering contrast stable under the warm sun and cast shadows.
  const labelMaterial=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  const signage=zone('Wedding wayfinding signs');
  function signpost(x,z,rows){const g=group(signage,'Flower trimmed wayfinding post',x,.03,z);cyl(g,wood,0,1.30,0,.09,2.60);ell(g,gold,0,2.66,0,.12);cyl(g,'#c8ae85',0,.06,0,.22,.10);
    // The board encloses the post (radius .09), so neither face is obscured.
    rows.forEach(([row,side],i)=>{const y=2.33-i*.51;block(g,wood,0,y,0,2.28,.44,.24);const arrow=new T.Shape();arrow.moveTo(side*1.12,-.22);arrow.lineTo(side*1.40,0);arrow.lineTo(side*1.12,.22);arrow.closePath();const ag=new T.ExtrudeGeometry(arrow,{depth:.24,bevelEnabled:false,steps:1});temporary.add(ag);part(g,ag,wood,0,y,-.12);
      const pg=new T.PlaneGeometry(2.18,.36),uv=pg.attributes.uv;for(let j=0;j<uv.count;j++)uv.setY(j,1-(row+1-uv.getY(j))/8);temporary.add(pg);
      part(g,pg,'#ffffff',0,y,.131,1,1,1,labelMaterial);
      const back=part(g,pg,'#ffffff',0,y,-.131,1,1,1,labelMaterial);back.rotation.y=Math.PI;
    });flowers(g,-.48,.20,-.08,.48);colliders.push({x,z,w:1.7,d:.48});}
  signpost(-3.9,10.15,[[0,-1],[1,-1],[2,1]]);signpost(14.4,8.6,[[3,1],[4,-1]]);

  root.updateMatrixWorld(true);
  let triangles=0,draws=0;
  for(const z of zones){
    const buckets=new Map();z.traverse(o=>{if(o.isMesh){if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(o);}});
    for(const [mat,meshes] of buckets){const positions=[],normals=[],colors=[],uvs=[];
      for(const m of meshes){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);const tint=new T.Color(m.userData.tint);positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);if(mat.map)uvs.push(...g.attributes.uv.array);else for(let i=0;i<g.attributes.position.count;i++)colors.push(tint.r,tint.g,tint.b);triangles+=g.attributes.position.count/3;g.dispose();m.removeFromParent();}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));if(mat.map)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));else g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();const m=new T.Mesh(g,mat);m.name=z.name+(mat===glow?' candle glow':'');m.castShadow=mat!==glow&&!mat.isMeshBasicMaterial;m.receiveShadow=!mat.isMeshBasicMaterial;root.add(m);draws++;
    }
    z.removeFromParent();
  }
  for(const g of temporary)g.dispose();
  return {root,colliders,triangles,draws,blocks(x,z){return colliders.some(p=>p.w?Math.abs(x-p.x)<p.w&&Math.abs(z-p.z)<p.d:(x-p.x)**2+(z-p.z)**2<p.r**2);}};
}
