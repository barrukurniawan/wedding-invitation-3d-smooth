import * as T from './vendor/three.module.js';

export const WALK_SPEED=2.4*1.2*1.15*1.2;

// Original, soft village-life character. Front +Z; feet rest on y=0.
// Separate rigid pivots retain expressive animation without a skeleton dependency.
export function createCharacter({customize,detail="full",batikPalette={}} = {}) {
  const compact=detail==='compact';
  const root = new T.Group(); root.name = 'Batik Garden Villager';
  const body = new T.Group(); body.name = 'Body'; root.add(body);
  const material = (color, roughness = .82) => new T.MeshStandardMaterial({color, roughness});
  const skin = material('#e8ad7e'), innerEar = material('#d58c6b');
  const hair = material('#24232a', .84);
  const trousers = material('#252731'), seam = material('#353844');
  const shoe = material('#1c1c23', .55), sole = material('#101118'), stitch = material('#52505a');
  const cream = material('#fff9eb'), iris = material('#392b27'), ink = material('#24202a');
  const mouth = material('#6b302c');
  const trim = material('#ad7950'), darkTrim = material('#71482f'), button = material('#e3bd79', .58);
  const sphere = new T.SphereGeometry(1,compact?16:24,compact?10:16);
  function mesh(parent, name, geo, mat) {
    const o = new T.Mesh(geo, mat); o.name = name;
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function ell(parent, name, mat, x,y,z, sx,sy,sz) {
    const o = mesh(parent,name,sphere,mat); o.position.set(x,y,z); o.scale.set(sx,sy,sz); return o;
  }
  function line(parent,name,points,r,mat) {
    return mesh(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),compact?12:20,r,compact?5:6,false),mat);
  }
  function lathe(parent,name,profile,mat,zScale=1) {
    const o=mesh(parent,name,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),compact?20:32),mat); o.scale.z=zScale; return o;
  }
  function patch(parent,name,points,mat,depth=.012) {
    const shape=new T.Shape(); shape.moveTo(points[0][0],points[0][1]);
    points.slice(1).forEach(p=>shape.lineTo(p[0],p[1])); shape.closePath();
    return mesh(parent,name,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,bevelSegments:2,steps:1}),mat);
  }

  // Legible kawung medallions, warm soga colours and tiny wax-resist dots.
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'); ctx.fillStyle=batikPalette.base||'#74462e'; ctx.fillRect(0,0,512,512);
  for(let row=-1;row<5;row++) for(let col=-1;col<5;col++) {
    ctx.save(); ctx.translate(col*128+(row%2)*64,row*128);
    for(let p=0;p<4;p++) {
      ctx.save(); ctx.rotate(Math.PI/4+p*Math.PI/2);
      ctx.fillStyle=batikPalette.petal||'#95633e';ctx.strokeStyle=batikPalette.outline||'#d4aa70';ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(0,-29,15,25,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle=batikPalette.inner||'#bf925d';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(0,-29,9,18,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=batikPalette.dots||'#ebc990';for(const y of [-19,-28,-37]){ctx.beginPath();ctx.arc(0,y,1.8,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    ctx.fillStyle=batikPalette.centre||'#edc887';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
    for(let p=0;p<4;p++){ctx.save();ctx.rotate(p*Math.PI/2);ctx.beginPath();ctx.arc(0,61,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
    ctx.restore();
  }
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(1.55,1.0);tex.anisotropy=4;
  const batik=new T.MeshStandardMaterial({map:tex,roughness:.94});

  // A tailored, gently flared shirt, rather than a straight cylinder.
  lathe(body,'Batik shirt',[[0,.78],[.33,.78],[.40,.80],[.425,.88],[.415,1.10],[.395,1.38],[.355,1.51],[.24,1.60],[.145,1.63],[0,1.63]],batik,.78);
  lathe(body,'Shirt hem',[[.40,.81],[.426,.82],[.426,.855],[.417,.86]],darkTrim,.78);
  ell(body,'Neck',skin,0,1.66,0,.15,.20,.14);
  const placket=mesh(body,'Button placket',new T.BoxGeometry(.052,.67,.019),darkTrim);placket.position.set(0,1.19,.329);
  for(let y=.94;y<1.5;y+=.16)ell(body,'Warm horn button',button,0,y,.35,.018,.018,.010);
  for(const s of [-1,1]) {
    const collar=patch(body,'Folded collar',[[s*.012,1.625],[s*.18,1.60],[s*.255,1.47],[s*.11,1.39]],trim);
    collar.position.z=.25; collar.rotation.x=-.17;
    line(body,'Collar seam',[[s*.026,1.615,.285],[s*.12,1.445,.313],[s*.229,1.483,.290]],.008,darkTrim);
  }
  const pocket=patch(body,'Chest pocket',[[-.31,1.30],[-.13,1.30],[-.13,1.17],[-.22,1.13],[-.31,1.17]],batik);
  pocket.position.z=.299;
  line(body,'Pocket welt',[[-.31,1.30,.329],[-.22,1.297,.342],[-.13,1.30,.339]],.010,trim);

  const head=new T.Group();head.name='Head';head.position.set(0,2.23,0);body.add(head);
  // Soft cheek volume and a rounded jaw follow the supplied reference.
  // A mild superellipsoid keeps a full profile while softening the chin contour.
  const headPower=2.5,headHeight=.70,headDepth=.72;
  const signedPower=(v,p)=>Math.sign(v)*Math.abs(v)**p;
  const faceWidth=y=>.77*(1+.035*Math.exp(-(((y+.25)/.24)**2)));
  const headGeo=new T.SphereGeometry(1,compact?32:48,compact?24:32),headPositions=headGeo.attributes.position;
  for(let i=0;i<headPositions.count;i++){
    const y=headHeight*signedPower(headPositions.getY(i),2/headPower);
    headPositions.setXYZ(i,faceWidth(y)*signedPower(headPositions.getX(i),2/headPower),y,headDepth*signedPower(headPositions.getZ(i),2/headPower));
  }
  headGeo.computeVertexNormals();mesh(head,'Full cheeks and soft rounded jaw',headGeo,skin);
  for(const s of [-1,1]) {
    ell(head,'Soft round ear',skin,s*.755,-.12,.005,.178,.204,.120);
    ell(head,'Warm ear inset',innerEar,s*.801,-.116,.099,.094,.126,.029);
    ell(head,'Ear fold',skin,s*.782,-.149,.123,.045,.066,.016);
  }
  const faceZ=(x,y)=>headDepth*Math.max(.005,1-Math.abs(x/faceWidth(y))**headPower-Math.abs(y/headHeight)**headPower)**(1/headPower);
  function faceOval(parent,name,mat,cx,cy,rx,ry,offset=.007) {
    const geo=new T.CircleGeometry(1,compact?28:40),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const x=cx+p.getX(i)*rx,y=cy+p.getY(i)*ry;p.setXYZ(i,x,y,faceZ(x,y)+offset);}
    geo.computeVertexNormals();const o=mesh(parent,name,geo,mat);o.castShadow=false;return o;
  }
  function faceShape(name,shape,mat,offset=.01){
    const geo=new T.ShapeGeometry(shape,24),p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,faceZ(p.getX(i),p.getY(i))+offset);
    geo.computeVertexNormals();const o=mesh(head,name,geo,mat);o.castShadow=false;return o;
  }
  const cheeks=[.06,.07,.09].map(opacity=>{const m=material('#e79181');m.transparent=true;m.opacity=opacity;m.depthWrite=false;return m});
  const freckle=material('#ba7466');freckle.transparent=true;freckle.opacity=.32;freckle.depthWrite=false;
  const eyes=[];
  for(const s of [-1,1]) {
    for(let i=0;i<3;i++)faceOval(head,'Soft cheek tint',cheeks[i],s*.462,-.207,.161-i*.039,.109-i*.025,.010+i*.002);
    for(const [x,y,r] of [[.398,-.181,.009],[.437,-.167,.007],[.478,-.191,.008],[.512,-.207,.007],[.447,-.223,.008],[.484,-.235,.007]])faceOval(head,'Tiny cheek freckle',freckle,s*x,y,r,r*1.2,.018);
    const eye=new T.Group();eye.name='Blinking eye';head.add(eye);eyes.push(eye);
    faceOval(eye,'Ivory eye',cream,s*.282,-.017,.140,.175,.010);
    faceOval(eye,'Warm dark iris',iris,s*.270,-.030,.098,.139,.014);
    faceOval(eye,'Deep pupil',ink,s*.267,-.026,.080,.121,.018);
    faceOval(eye,'Large eye glint',cream,s*.267-.027,.039,.028,.031,.023);
    faceOval(eye,'Small eye glint',cream,s*.267+.033,-.077,.010,.012,.024);
    eye.children.forEach(o=>o.geometry.translate(-s*.282,.017,0));eye.position.set(s*.282,-.017,0);
    line(head,'Gentle arched brow',[[s*.398,.223,faceZ(s*.398,.223)+.013],[s*.302,.251,faceZ(s*.302,.251)+.013],[s*.201,.226,faceZ(s*.201,.226)+.013]],.022,hair);
  }
  ell(head,'Small rounded nose',skin,0,-.139,faceZ(0,-.139)+.022,.063,.043,.045);
  const noseWarm=material('#e5a17d');
  ell(head,'Warm nose tip',noseWarm,0,-.146,faceZ(0,-.146)+.056,.038,.025,.020);
  const mouthShape=new T.Shape();mouthShape.moveTo(-.209,-.284);mouthShape.quadraticCurveTo(0,-.325,.209,-.284);mouthShape.bezierCurveTo(.196,-.394,.111,-.452,0,-.453);mouthShape.bezierCurveTo(-.114,-.45,-.195,-.393,-.209,-.284);
  faceShape('Wide happy smile',mouthShape,mouth,.010);
  const teeth=new T.Shape();teeth.moveTo(-.171,-.302);teeth.quadraticCurveTo(0,-.334,.172,-.302);teeth.lineTo(.149,-.333);teeth.quadraticCurveTo(0,-.361,-.149,-.333);teeth.closePath();
  faceShape('Friendly smile teeth',teeth,cream,.014);
  const tongue=new T.Shape();tongue.moveTo(-.096,-.422);tongue.quadraticCurveTo(-.090,-.385,.007,-.389);tongue.quadraticCurveTo(.086,-.388,.109,-.421);tongue.quadraticCurveTo(.009,-.467,-.096,-.422);
  faceShape('Soft smile tongue',tongue,material('#d97a7d'),.017);

  // Close-fitting underlayer, covered by rounded, overlapping hair locks.
  const positions=[],uvs=[],indices=[],around=compact?40:64,rows=compact?16:22;
  for(let row=0;row<=rows;row++)for(let col=0;col<=around;col++) {
    const phi=col/around*Math.PI*2,front=Math.max(0,Math.cos(phi)),back=Math.max(0,-Math.cos(phi));
    const limit=1.82+.25*back**2-.68*front**3,theta=.001+(limit-.001)*row/rows;
    positions.push(.81*signedPower(Math.sin(theta)*Math.sin(phi),.82),.065+.785*signedPower(Math.cos(theta),.82),.76*signedPower(Math.sin(theta)*Math.cos(phi),.82));
    uvs.push(col/around,1-row/rows);
    if(row<rows&&col<around){const a=row*(around+1)+col,b=a+around+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const hairGeo=new T.BufferGeometry();hairGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));hairGeo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));hairGeo.setIndex(indices);hairGeo.computeVertexNormals();
  mesh(head,'Soft black hair underlayer',hairGeo,hair);
  const hairRidge=material('#35343c',.87);
  function hairLock(name,points,width,depth,ridges=true) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),pos=[],uv=[],idx=[];
    const steps=compact?18:28,sides=compact?10:16;
    function section(t){
      const p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
      const normal=new T.Vector3(p.x/.81**2,(p.y-.065)/.785**2,p.z/.76**2).normalize();
      normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();
      const side=new T.Vector3().crossVectors(tangent,normal).normalize();
      const fullness=Math.max(.002,Math.sin(Math.PI*t)**.43)*(1-.16*t);
      return {p,side,normal,w:width*fullness,d:depth*fullness};
    }
    for(let i=0;i<=steps;i++){
      const t=i/steps,{p,side,normal,w,d}=section(t);
      for(let j=0;j<=sides;j++){
        const angle=j/sides*Math.PI*2,flute=1+.026*Math.cos(angle*6),q=p.clone().addScaledVector(side,Math.cos(angle)*w*flute).addScaledVector(normal,Math.sin(angle)*d*flute);
        pos.push(q.x,q.y,q.z);uv.push(j/sides,t);
        if(i<steps&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,b,a+1,a+1,b,b+1);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(head,name,g,hair);
    if(ridges)for(const off of [-.35,.35]){
      const points=[];
      for(let k=0;k<=12;k++){const t=.16+k/12*.67,{p,side,normal,w,d}=section(t);points.push(p.clone().addScaledVector(side,w*off).addScaledVector(normal,d*Math.sqrt(1-off*off)*1.025).toArray());}
      line(head,'Subtle sculpted hair ridge',points,.004,hairRidge);
    }
  }
  // Crown-to-nape locks wrap the head, so the hairstyle is full from every view.
  for(let i=0;i<10;i++) {
    const phi=1.03+i*(Math.PI*2-2.06)/9,back=Math.max(0,-Math.cos(phi)),end=1.86+.20*back;
    const points=[.25,.78,1.30,end].map((theta,k)=>{
      const a=phi-.18+k*.06;
      return [.83*signedPower(Math.sin(theta)*Math.sin(a),.82),.070+.81*signedPower(Math.cos(theta),.82),.785*signedPower(Math.sin(theta)*Math.cos(a),.82)];
    });
    hairLock('Rounded side and back lock',points,.151,.084,i%2===0);
  }
  hairLock('Left temple lock',[[-.40,.64,.35],[-.59,.40,.62],[-.69,.10,.61],[-.65,-.15,.44]],.126,.093);
  hairLock('Left swept fringe',[[-.25,.79,.25],[-.37,.60,.62],[-.54,.31,.75],[-.50,.13,.71]],.161,.112);
  hairLock('Centre soft fringe',[[-.13,.84,.30],[-.23,.62,.73],[-.20,.39,.82],[.012,.26,.78]],.166,.115);
  hairLock('Centre right fringe',[[.02,.84,.36],[.12,.67,.72],[.29,.44,.80],[.35,.28,.72]],.159,.114);
  hairLock('Right rounded fringe',[[.23,.78,.32],[.41,.60,.64],[.56,.32,.71],[.53,.08,.62]],.159,.106);
  hairLock('Right temple lock',[[.47,.64,.28],[.65,.39,.43],[.72,.09,.41],[.66,-.15,.39]],.123,.088);
  hairLock('Soft overlapping crown curl',[[-.18,.86,.17],[-.26,.76,.52],[-.12,.65,.81],[.07,.72,.82]],.160,.113);
  hairLock('Upper swept tuft',[[-.11,.89,.17],[.10,.87,.45],[.29,.78,.64],[.47,.66,.57]],.160,.118);
  hairLock('Small playful cowlick',[[-.17,.80,-.10],[-.27,1.00,-.10],[-.21,1.095,-.045],[-.11,1.085,.02]],.068,.063,false);

  const arms=[],legs=[],elbows=[],wrists=[],knees=[],feet=[];
  for(const s of [-1,1]) {
    const arm=new T.Group();arm.name=s<0?'Left arm':'Right arm';arm.position.set(s*.39,1.45,0);arm.rotation.z=s*.12;body.add(arm);arms.push(arm);
    ell(arm,'Rounded shoulder',batik,s*.062,-.06,0,.194,.22,.205);
    const sleeve=lathe(arm,'Batik sleeve',[[.141,-.29],[.163,-.27],[.18,-.20],[.182,-.07],[.135,.07]],batik,1.03);sleeve.position.x=s*.064;
    const cuff=lathe(arm,'Sleeve piping',[[.14,-.283],[.162,-.276],[.164,-.252],[.15,-.245]],trim,1.03);cuff.position.x=s*.064;
    const elbow=new T.Group();elbow.name='Elbow';elbow.position.set(s*.075,-.315,0);arm.add(elbow);elbows.push(elbow);
    ell(elbow,'Soft elbow',skin,0,0,0,.117,.119,.122);
    ell(elbow,'Forearm',skin,0,-.10,0,.118,.16,.124);
    const wrist=new T.Group();wrist.name='Wrist';wrist.position.set(0,-.245,.012);elbow.add(wrist);wrists.push(wrist);
    ell(wrist,'Mitten hand',skin,0,0,0,.144,.153,.14);
    ell(wrist,'Thumb',skin,-s*.066,.027,.110,.061,.079,.061);
    line(wrist,'Hand crease',[[s*.035,-.04,.119],[-s*.002,-.052,.134],[-s*.032,-.036,.134]],.0055,innerEar);

    const leg=new T.Group();leg.name=s<0?'Left thigh':'Right thigh';leg.position.set(s*.216,.835,0);body.add(leg);legs.push(leg);
    lathe(leg,'Upper trousers',[[0,-.365],[.13,-.365],[.153,-.31],[.166,-.04],[.145,.05],[0,.06]],trousers,1.08);
    line(leg,'Upper trouser seam',[[0,-.12,.178],[0,-.23,.174],[0,-.30,.167]],.005,seam);
    const knee=new T.Group();knee.name='Knee';knee.position.y=-.345;leg.add(knee);knees.push(knee);
    ell(knee,'Rounded knee',trousers,0,0,0,.151,.145,.163);
    lathe(knee,'Lower trousers',[[0,-.335],[.135,-.335],[.152,-.285],[.153,-.045],[.14,.025],[0,.035]],trousers,1.08);
    line(knee,'Lower trouser seam',[[0,-.055,.170],[0,-.16,.169],[0,-.25,.166]],.005,seam);
    lathe(knee,'Trouser cuff',[[.139,-.315],[.156,-.305],[.156,-.262],[.150,-.255]],seam,1.08);
    const foot=new T.Group();foot.name='Ankle';foot.position.y=-.335;knee.add(foot);feet.push(foot);
    ell(foot,'Rounded black loafer',shoe,0,.003,.105,.182,.14,.282);
    ell(foot,'Black sole',sole,0,-.114,.101,.188,.041,.288);
    ell(foot,'Loafer vamp',shoe,0,.073,.162,.148,.064,.16);
    line(foot,'Loafer penny strap',[[-.132,.095,.123],[0,.125,.150],[.132,.095,.123]],.022,sole);
    line(foot,'Toe stitching',[[-.137,-.006,.258],[-.106,.041,.336],[0,.055,.365],[.106,.041,.336],[.137,-.006,.258]],.0055,stitch);
  }

  // Consolidate by material within each rigid pivot, keeping blink/limbs movable.
  function batchRigid(group) {
    group.children.filter(o=>o.isGroup).forEach(batchRigid);
    const batches=new Map();
    for(const o of [...group.children])if(o.isMesh){const a=batches.get(o.material)||[];a.push(o);batches.set(o.material,a);}
    for(const [mat,objects] of batches) {
      if(objects.length<2)continue;
      const pos=[],normal=[],uv=[];
      for(const o of objects){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);pos.push(...g.attributes.position.array);normal.push(...g.attributes.normal.array);uv.push(...g.attributes.uv.array);g.dispose();}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeBoundingSphere();
      const joined=mesh(group,objects.map(o=>o.name).join(' / '),geo,mat);joined.castShadow=objects.some(o=>o.castShadow);objects.forEach(o=>group.remove(o));
    }
  }
  customize?.({root,body,head,arms,legs,eyes,elbows,wrists,knees,feet,material,mesh,ell,line,lathe,patch,skin,innerEar,hair,batik,trousers,seam,trim,darkTrim,button,cream});
  batchRigid(body);
  let lastTime=null,blend=0,phase=0,turnLean=0;
  const invBody=new T.Matrix4(),targetFoot=new T.Vector3(),delta=new T.Vector3();
  const chain=new T.Quaternion(),footRotation=new T.Quaternion(),axisX=new T.Vector3(1,0,0);
  const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x)};
  const stance=.5,thighLength=.345,shinLength=.335;
  function poseLeg(i,z,lift,pitch) {
    // Analytic support height of the rounded outsole: heel/toe roll stays above ground.
    const c=Math.cos(pitch),s=Math.sin(pitch);
    const support=.114*c+.101*s+Math.hypot(.041*c,.288*s);
    targetFoot.set(i===0?-.216:.216,support+lift,z).applyMatrix4(invBody);
    delta.copy(targetFoot).sub(legs[i].position);
    const sideways=Math.atan2(delta.x,-delta.y);
    const down=Math.hypot(delta.x,delta.y),forward=delta.z;
    const length=T.MathUtils.clamp(Math.hypot(down,forward),.08,thighLength+shinLength-.00001);
    const alpha=Math.acos(T.MathUtils.clamp((thighLength**2+length**2-shinLength**2)/(2*thighLength*length),-1,1));
    const bend=Math.acos(T.MathUtils.clamp((length**2-thighLength**2-shinLength**2)/(2*thighLength*shinLength),-1,1));
    legs[i].rotation.order='ZXY';legs[i].rotation.set(Math.atan2(-forward,down)-alpha,0,sideways);
    knees[i].rotation.x=bend;
    // Counter the complete pelvis/thigh/shin rotation, not just the sagittal swing.
    chain.copy(body.quaternion).multiply(legs[i].quaternion).multiply(knees[i].quaternion).invert();
    footRotation.setFromAxisAngle(axisX,pitch);feet[i].quaternion.copy(chain).multiply(footRotation);
  }
  const rig={root,body,head,arms,legs,eyes,elbows,wrists,knees,feet,animate(t,motion){
    const dt=typeof motion==='object'?T.MathUtils.clamp(motion.dt,0,.05):lastTime===null?1/60:Math.max(0,Math.min(.05,t-lastTime));lastTime=t;
    const speed=typeof motion==='object'?Math.max(0,motion.speed):motion?WALK_SPEED:0;
    const distance=typeof motion==='object'?Math.max(0,motion.distance):speed*dt;
    const ratio=T.MathUtils.clamp(speed/WALK_SPEED,0,1),active=smooth(speed/.32);
    blend+=(active-blend)*(1-Math.exp(-dt*16));
    turnLean+=((typeof motion==='object'?T.MathUtils.clamp(motion.turn,-5,5):0)-turnLean)*(1-Math.exp(-dt*9));
    const stride=.72+.68*ratio;
    phase=(phase+distance/stride)%1;
    const angle=phase*Math.PI*2,wave=Math.cos(angle),idle=1-blend;
    // Soft weight transfer; head counters the pelvis so the face remains readable.
    body.position.set(Math.sin(angle)*.018*blend,-.012-(.055+.085*ratio)*blend+.010*Math.cos(angle*2)*blend+Math.sin(t*2.1)*.006*idle,0);
    body.rotation.set(.025*blend+.005*Math.sin(t*2.1)*idle,.04*Math.sin(angle)*blend,-.024*Math.sin(angle)*blend-turnLean*.017*blend);
    body.updateMatrix();invBody.copy(body.matrix).invert();
    for(let i=0;i<2;i++) {
      const cycle=(phase+i*.5)%1;
      let z,lift=0,pitch=0;
      const travel=stride*stance;
      if(cycle<stance) {
        const u=cycle/stance;
        // Linear travel cancels actual root translation during planted stance.
        z=travel*(.5-u);
        pitch=-.10*(1-smooth(u/.18))+.16*smooth((u-.76)/.24);
      } else {
        const u=(cycle-stance)/(1-stance),arc=Math.sin(Math.PI*u);
        z=travel*(u-.5)-stride*Math.sin(2*Math.PI*u)/(2*Math.PI);
        lift=(.06+.03*ratio)*arc*arc;
        pitch=.16*(1-smooth(u))-.10*smooth((u-.63)/.37);
      }
      poseLeg(i,z*blend,lift*blend,pitch*blend);
      const sign=i===0?1:-1,swing=sign*wave;
      arms[i].rotation.x=swing*(.20+.16*ratio)*blend-.025*idle;
      arms[i].rotation.z=(i===0?-1:1)*(.12+.017*Math.sin(t*1.6)*idle)-turnLean*.012*blend;
      arms[i].rotation.y=-sign*.045*Math.sin(angle)*blend;
      elbows[i].rotation.x=-.12-(.10+.08*Math.sin(angle+sign*.7))*blend;
      wrists[i].rotation.x=.04*Math.sin(angle-sign*.4)*blend;
      wrists[i].rotation.z=sign*.035*Math.sin(angle-.45)*blend;
    }
    head.rotation.set(-.017*blend+.012*Math.sin(angle*2-.25)*blend,.035*Math.sin(t*.73)*idle-.024*Math.sin(angle)*blend+turnLean*.032,-body.rotation.z*.6+.012*Math.sin(t*1.3)*idle);
    const cycle=t%4.8,pulse=(c,w)=>Math.max(0,1-Math.abs(cycle-c)/w);
    const lid=Math.max(.045,1-Math.max(pulse(3.65,.10),pulse(3.94,.08)));
    eyes.forEach(eye=>eye.scale.y=lid);
  }};
  rig.animate(0,{dt:0,speed:0,distance:0,turn:0});
  return rig;
}
