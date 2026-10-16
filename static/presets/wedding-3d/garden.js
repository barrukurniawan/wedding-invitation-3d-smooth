import {lagoonBlocks,decorateLagoon} from './lagoon.js';
import {bridgeHeight,onBridge,bridgeRail,buildBridge} from './bridge.js';
import {createAtmosphere} from './atmosphere.js';
import {createIsland,insideIsland,islandSurfaceHeight} from './island.js';
import {createIslandLife} from './island-life.js';
import {createWeddingDecor} from './wedding-decor.js';
import {STAGE,createWeddingStage} from './wedding-stage.js';
import {createAmbientWind} from './ambient-wind.js';
import {createGuestGreetings} from './guest-greetings.js';
import {createSeasideAmbience} from './seaside-ambience.js';
import {createIslandMoments} from './island-moments.js';
import {createPhotoMode} from './photo-mode.js';
import {createSurfaceDetail} from './surface-detail.js';
import {enrichGarden} from './garden-details.js';
import {createCharacter,WALK_SPEED} from './character.js';
import {createPeciCharacter,createSanggulCharacter,createPinkHijabCharacter} from './player-characters.js';
import {createWeddingCouple} from './wedding-couple.js';
import {createCharacterSelection} from './character-selection.js';
import {createIslandIntro} from './island-intro.js';
import {ARRIVAL,createArrivalHost,createArrivalExperience} from './island-arrival.js';
import {createIslandInterface} from './island-interface.js';
import {createVenueExperience} from './venues.js';
import {createVenueMarkers} from './venue-markers.js';
import * as T from './vendor/three.module.js';
import {createPerformanceProfile,createResolutionController,addContactShadow} from './performance.js';
const performanceProfile=createPerformanceProfile();
const surfaces=createSurfaceDetail(performanceProfile);
if(performanceProfile.mobile)document.body.classList.add('mobile-performance');
const host=document.querySelector('#scene');
const ambience=createSeasideAmbience({button:document.querySelector('#ambienceToggle'),status:document.querySelector('#ambienceStatus')});
let renderer;
try{renderer=new T.WebGLRenderer({antialias:!performanceProfile.mobile,alpha:true,powerPreference:'high-performance'});}catch(e){document.querySelector('#loading').textContent='Taman 3D memerlukan WebGL. Coba buka dengan Chrome atau browser terbaru.';throw e;}
renderer.setPixelRatio(performanceProfile.pixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=!performanceProfile.mobile;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.20;host.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#7cbdeb');scene.fog=new T.Fog('#acd2eb',180,850);
const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,2400);
scene.add(new T.HemisphereLight('#d6e8ff','#c0967d',1.45));const sun=new T.DirectionalLight('#ffd09a',3.8);sun.position.set(-56,46,36);sun.castShadow=true;sun.shadow.mapSize.set(performanceProfile.shadowSize,performanceProfile.shadowSize);Object.assign(sun.shadow.camera,{left:-50,right:50,top:46,bottom:-46,near:1,far:180});sun.shadow.radius=2.8;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);const skyFill=new T.DirectionalLight('#ccddff',.45);skyFill.position.set(26,18,-24);scene.add(skyFill);
const mats=new Map();function mat(c,roughness=.85){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness,flatShading:false}));return mats.get(c)}
function softBox(){const g=new T.BoxGeometry(1,1,1,...Array(3).fill(performanceProfile.mobile?3:4)),p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),q=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);for(const axis of ['x','y','z'])if(Math.abs(v[axis])===.25)v[axis]=Math.sign(v[axis])*.39;q.set(T.MathUtils.clamp(v.x,-.39,.39),T.MathUtils.clamp(v.y,-.39,.39),T.MathUtils.clamp(v.z,-.39,.39));v.sub(q).normalize();n.setXYZ(i,v.x,v.y,v.z);q.addScaledVector(v,.11);p.setXYZ(i,q.x,q.y,q.z)}return g}
const GEO={box:softBox(),ball:new T.SphereGeometry(1,performanceProfile.mobile?10:12,performanceProfile.mobile?7:8),small:new T.IcosahedronGeometry(1,1),cyl:new T.CylinderGeometry(1,1,1,16),cone:new T.ConeGeometry(1,1,8)};
function mesh(g,c,x,y,z,sx=1,sy=sx,sz=sx,parent=scene){const m=new T.Mesh(g,typeof c==='string'?mat(c):c);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
const box=(c,x,y,z,a,b,d,p)=>mesh(GEO.box,c,x,y,z,a,b,d,p);const ball=(c,x,y,z,r,sy=r,sz=r,p)=>mesh(GEO.ball,c,x,y,z,r,sy,sz,p);const cyl=(c,x,y,z,r,h,p)=>mesh(GEO.cyl,c,x,y,z,r,h,r,p);
function beam(a,b,r,c,p=scene){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const m=cyl(c,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,v.length(),p);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m}
function tube(points,r,c,p=scene){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return mesh(new T.TubeGeometry(curve,Math.max(12,points.length*(performanceProfile.mobile?2:5)),r,performanceProfile.mobile?5:6,false),c,0,0,0,1,1,1,p)}
let seed=487;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}const rand=(a,b)=>a+(b-a)*rnd();
const palette={grass:'#67823d',stone:'#cbb58b',wood:'#80502d',cream:'#f7e6bd',leaf:'#2f642f',gold:'#bc914a',pink:'#e89a91'};
// Garden and beach share a continuous ground surface with no enclosing walls or pedestal.
const island=createIsland({scene,surfaces,mobile:performanceProfile.mobile});
// Paths follow the source map: central aisle, fountain circle and two southern garden loops.
const gardenPaths=[];
function ribbon(points,width){
 const cv=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.025,z)));gardenPaths.push({curve:cv,width});
 const vs=[],idx=[],rows=100,across=4;
 for(let i=0;i<=rows;i++){
  const t=i/rows,p=cv.getPoint(t),v=cv.getTangent(t),n=new T.Vector3(-v.z,0,v.x).multiplyScalar(width/2);
  for(let j=0;j<=across;j++){const side=j/across*2-1;vs.push(p.x+n.x*side,p.y,p.z+n.z*side);}
  if(i<rows)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;idx.push(a,a+1,b,a+1,b+1,b);}
 }
 // Keep the narrow triangles on the inside of a bend facing upward too.
 for(let k=0;k<idx.length;k+=3){const a=idx[k]*3,b=idx[k+1]*3,c=idx[k+2]*3;if((vs[b+2]-vs[a+2])*(vs[c]-vs[a])-(vs[b]-vs[a])*(vs[c+2]-vs[a+2])<0)[idx[k+1],idx[k+2]]=[idx[k+2],idx[k+1]];}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setIndex(idx);g.computeVertexNormals();surfaces.pathGeometry(g);
 const m=mesh(g,surfaces.pathMaterial,0,0,0);m.name='Graded garden path';m.castShadow=false;
}
ribbon([[0,18.85],[0,15],[0,7],[0,0],[0,-8],[0,-17]],4.2);ribbon([[-28.85,-4],[-20,-3.4],[-10,-2.6],[0,-2],[11,-2],[22,-2],[28.85,-2]],4.3);ribbon([[0,15.2],[-9,15.2],[-20,15.5],[-27.5,11.4],[-27.6,7.3]],2.5);ribbon([[0,13],[10,13.8],[21,12.3],[25,8],[23,5]],2.8);
const apronGeometry=new T.RingGeometry(0,8,64,8);apronGeometry.rotateX(-Math.PI/2);surfaces.pathGeometry(apronGeometry,new T.Vector3(0,.04,-1.5));
const apron=mesh(apronGeometry,surfaces.pathMaterial,0,.04,-1.5);apron.name='Graded fountain apron';apron.castShadow=false;
ribbon([[-9.1,7.3],[-5,7.3],[0,7.3]],2.2);
// Flower and leaf instances keep the dense garden inexpensive to draw.
const petals=[],leaves=[],trunks=[];function leaf(x,y,z,s=.3){leaves.push({x,y,z,s,c:['#24592e','#477d37','#729547'][Math.floor(rnd()*3)]})}function flower(x,y,z,s=.15){const c=['#ffdfbc','#e78591','#fff1d2','#f2b7a2'][Math.floor(rnd()*4)];petals.push({x,y,z,s,c});}
function bouquet(x,y,z,s=.8){for(let i=0;i<15;i++){const a=rand(0,Math.PI*2),r=rand(0,s);const xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,yy=y+rand(0,.55*s);leaf(xx,yy,zz,s*.32);if(i%2===0)flower(xx,yy+s*.23,zz,s*.19)}}
function flowerLine(a,b,n,s=.5){for(let i=0;i<n;i++){const t=i/(n-1);bouquet(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,s)}}
const treeLocations=[];
function tree(x,z,h=5,color='#3d783b',type='round'){
 treeLocations.push({x,z,h,color});
 const crown=(...args)=>surfaces.decoratePlant(ball(...args));
 const bark=['#795231','#91663d','#674b2e'];
 function taper(a,b,rb,rt){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=mesh(new T.CylinderGeometry(rt,rb,v.length(),7),bark[0],...av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return surfaces.decoratePlant(o,'bark')}
 const lean=rand(-.25,.25);taper([x,.05,z],[x+lean,h*.61,z+.08],h*.065,h*.024);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5; taper([x+Math.cos(a)*h*.14,.05,z+Math.sin(a)*h*.14],[x,h*.16,z],h*.023,h*.04)}
 for(let i=0;i<4;i++){const a=i*Math.PI/2;beam([x+Math.cos(a)*h*.06,h*.12,z+Math.sin(a)*h*.06],[x+lean+Math.cos(a)*h*.036,h*.54,z+Math.sin(a)*h*.036],.022,bark[i%3])}
 if(type==='pine'){
  for(let i=0;i<3;i++){
   const radius=h*(.235-i*.054),height=h*.36;
   const profile=[[0,-.16],[.65,-.16],[.92,-.12],[1,-.055],[.97,.015],[.78,.10],[.58,.23],[.39,.38],[.23,.52],[.12,.63],[.05,.69],[0,.71]];
   const geometry=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r*radius,y*height)),16);
   surfaces.decoratePlant(mesh(geometry,i%2?'#397447':'#326b40',x+lean,h*(.36+i*.19),z));
  }
  return;
 }
 const pink=color==='#e59a9c'||color==='#eba9a1'||color==='#f0bfad',ivory=color==='#f2e7ce';
 const shades=pink?[color,'#f6c5b6','#d78a91']:ivory?[color,'#fff1d2','#d7dac0']:[color,'#618847','#4d7e40','#72934e'];
 for(let i=0;i<5;i++){const a=i*2.399,r=h*rand(.15,.23);const xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,yy=h*rand(.60,.88);taper([x+lean,h*.40,z],[xx,yy,zz],h*.027,h*.009);const o=crown(shades[i%shades.length],xx,yy,zz,h*.23,h*.22,h*.22);o.rotation.set(rand(-.3,.3),a,rand(-.2,.2));for(let j=0;j<1;j++){const angle=a+j*2.1;crown(shades[(i+j+1)%shades.length],xx+Math.cos(angle)*h*.13,yy+rand(-.04,.14)*h,zz+Math.sin(angle)*h*.13,h*rand(.10,.15),h*.12,h*.14)}}
 crown(shades[1],x,h*.96,z,h*.19,h*.17,h*.20);
}
// Six small accent trees frame the outer corners; venue interiors and approaches stay open.
for(const [x,z,h,color] of [[-28,-17.5,4.4,'#427334'],[28,-18,4,'#50803b'],[-7.8,-18.5,3.2,'#e59a9c'],[8.6,-18.5,3.5,'#f2e7ce'],[-28,18,3.5,'#4a7937'],[27.5,17,3.3,'#eba9a1']])tree(x,z,h,color);
// Floral gates have real open passages, curtain folds and woody arch geometry.
function arch(x,z,w,h,base=0){const p=new T.Group();p.position.set(x,base,z);scene.add(p);[-1,1].forEach(s=>{cyl('#b9945a',s*w/2,h*.46,0,.14,h*.92,p);for(let j=0;j<5;j++)cyl('#fff0d1',s*w/2+(j-2)*.11,h*.39,.04,.11,h*.78,p);box('#c5a469',s*w/2,h*.35,.18,.58,.14,.2,p)});const pts=[];for(let i=0;i<=20;i++){let a=Math.PI-i*Math.PI/20;pts.push([Math.cos(a)*w/2,h*.68+Math.sin(a)*h*.35,0])}tube(pts,.17,'#795c32',p);pts.forEach(([xx,yy,zz])=>bouquet(x+xx,yy+base,z+zz,.48));for(let yy=.5;yy<h*.75;yy+=.45){bouquet(x-w/2-.12,yy+base,z,.35);bouquet(x+w/2+.12,yy+base,z,.35)}}
const weddingStage=createWeddingStage({box,cyl,beam,bouquet});
arch(0,STAGE.archZ,STAGE.archHalfWidth*2,4.5,STAGE.height);
// Ceremony benches facing the floral altar.
function bench(x,z,w=3.6,rot=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box('#eee0b9',0,.68,0,w,.15,.68,g);for(let j=0;j<3;j++)box('#e5d4a8',0,1.03+j*.19,.3,w,.15,.10,g);[-1,1].forEach(s=>{box('#a8905e',s*(w/2-.28),.35,0,.13,.7,.55,g);box('#a8905e',s*(w/2-.28),.91,.34,.12,1.18,.13,g)})}
for(let z=-12;z<=-6;z+=1.55){bench(-4.4,z);bench(4.4,z)}
// Central tiered fountain, water rings and falling streams.
const rippleCanvas=document.createElement('canvas');rippleCanvas.width=rippleCanvas.height=128;const rippleCtx=rippleCanvas.getContext('2d'),ripplePixels=rippleCtx.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;ripplePixels.data[i]=128+Math.sin(x*Math.PI/16+y*Math.PI/32)*15;ripplePixels.data[i+1]=128+Math.cos(y*Math.PI/16-x*Math.PI/32)*15;ripplePixels.data[i+2]=254;ripplePixels.data[i+3]=255}rippleCtx.putImageData(ripplePixels,0,0);const rippleTexture=new T.CanvasTexture(rippleCanvas);rippleTexture.wrapS=rippleTexture.wrapT=T.RepeatWrapping;rippleTexture.repeat.set(.3,.3);
const waterMat=new T.MeshStandardMaterial({color:'#66bab7',metalness:.04,roughness:.15,transparent:true,opacity:.70,depthWrite:false,normalMap:rippleTexture,normalScale:new T.Vector2(.24,.24),envMapIntensity:.65});
function torus(x,y,z,r,t,c){const m=mesh(new T.TorusGeometry(r,t,8,48),c,x,y,z);m.rotation.x=Math.PI/2;return m}
const fx=0,fz=-1.5;cyl('#a89972',fx,.2,fz,2.32,.4);cyl('#d5c29a',fx,.39,fz,2.15,.22);cyl(waterMat,fx,.54,fz,1.93,.08);torus(fx,.57,fz,2.09,.15,'#decca7');cyl('#ad976e',fx,1.06,fz,.28,1.2);cyl('#d8c69a',fx,1.52,fz,1.08,.2);cyl(waterMat,fx,1.64,fz,.94,.05);torus(fx,1.65,fz,1.04,.1,'#d8c69a');cyl('#c0aa7f',fx,1.99,fz,.17,.7);cyl('#dfcba2',fx,2.35,fz,.53,.15);ball('#d7c298',fx,2.67,fz,.17);
const streams=[];for(let i=0;i<9;i++){const a=i*Math.PI*2/9;streams.push(tube([[Math.cos(a)*.95,1.68,fz+Math.sin(a)*.95],[Math.cos(a)*1.16,1.2,fz+Math.sin(a)*1.16],[Math.cos(a)*1.2,.6,fz+Math.sin(a)*1.2]],.027,'#b4edf0'))}for(let i=0;i<34;i++){const a=i*Math.PI*2/34;bouquet(Math.cos(a)*2.78,.10,fz+Math.sin(a)*2.78,.34)}
// Timber pavilion on the north-west side, open front, pitched tile roof, sofa and chandelier.
const px=-18,pz=-10.5;box('#b4a281',px,.18,pz,10,.36,8);box('#d2bc92',px,.42,pz,9.5,.16,7.4);box('#b48c58',px,2.4,pz-3.3,8.5,4,.2);for(let x=-4;x<=4;x+=.38)box('#987041',px+x,2.35,pz-3.12,.045,3.8,.06);
for(const x of [-4.2,4.2])for(const z of [-3.2,3.2]){box('#81552c',px+x,2.35,pz+z,.27,4,.27);beam([px+x,3.35,pz+z],[px+x-Math.sign(x)*.8,4.35,pz+z],.1,'#b2894b')}
for(const z of [-3.3,3.3]){beam([px-4.7,4.25,pz+z],[px,6.9,pz+z],.17,'#a97c42');beam([px,6.9,pz+z],[px+4.7,4.25,pz+z],.17,'#a97c42');beam([px-4.3,4.25,pz+z],[px+4.3,4.25,pz+z],.14,'#80532d')}
for(const s of [-1,1]){const roof=box('#a95739',px+s*2.43,5.5,pz,5.65,.18,8.2);roof.rotation.z=s*-.51;}beam([px,6.9,pz-4.15],[px,6.9,pz+4.15],.13,'#b78b4b');
box('#d8b281',px,1.05,pz-1.2,3.8,.75,1.15);box('#f1ddbf',px,1.68,pz-1.7,3.8,.9,.3);[-1,1].forEach(s=>box('#e7cba7',px+s*1.8,1.4,pz-1.2,.35,.65,1.3));for(let x=-1.2;x<=1.3;x+=1.2)box('#f4e6ca',px+x,1.47,pz-1.15,1.06,.24,.9);box('#b56f45',px,.53,pz+.5,3.8,.035,1.8);for(let x of [-2.7,2.7]){cyl('#9a773f',px+x,.95,pz, .55,.1);cyl('#815b31',px+x,.75,pz,.12,.45);bouquet(px+x,1.07,pz,.5)}
beam([px,6,pz],[px,3.5,pz],.028,'#b28b43');torus(px,3.55,pz,.65,.05,'#bb944c');for(let i=0;i<6;i++){const a=i*Math.PI/3;ball('#ffdc83',px+Math.cos(a)*.65,3.75,pz+Math.sin(a)*.65,.105)}
flowerLine([px-4.3,.6,pz+3.25],[px-4.3,4.3,pz+3.25],10,.48);flowerLine([px+4.3,.6,pz+3.25],[px+4.3,4.3,pz+3.25],10,.48);flowerLine([px-4.3,4.4,pz+3.25],[px,6.75,pz+3.25],10,.45);flowerLine([px,6.75,pz+3.25],[px+4.3,4.4,pz+3.25],10,.45);
// Reception marquee with three peaked canvas bays; scalloped edges and tied curtains.
const tx=20,tz=-10;box('#cbb797',tx,.16,tz,15,.3,9);for(let x=-6;x<=6;x+=6){for(let z of [-4,4]){cyl('#ad8350',tx+x,2.6,tz+z,.11,5);ball('#c09a56',tx+x,5.25,tz+z,.14)}const vertices=[],indices=[],segments=16;
for(let i=0;i<=segments;i++)for(let j=0;j<=segments;j++){const u=i/segments*2-1,v=j/segments*2-1;vertices.push(u*3.2,4.8+2.08*(1-u*u)*(1-v*v),v*4.6);if(i<segments&&j<segments){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}}
const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const cloth=mat('#f7e7c7');cloth.side=T.DoubleSide;mesh(geo,cloth,tx+x,0,tz);
for(const i of [-1,1])for(const j of [-1,1]){const points=[];for(let k=0;k<=12;k++){const t=k/12;points.push([tx+x+i*3.2*t,4.82+2.08*(1-t*t)**2,tz+j*4.6*t]);}tube(points,.018,'#e9d9b9');}ball('#c39d52',tx+x,6.96,tz,.075);}

for(const x of [-6,0,6])for(const z of [-4,4]){for(let j=0;j<5;j++){const m=cyl('#fff1d5',tx+x+(j-2)*.13,2.6,tz+z,.12,4.5);m.rotation.z=(j-2)*.025}box('#b79b60',tx+x,2,tz+z+.12,.8,.12,.2);bouquet(tx+x,4.6,tz+z,.55)}
flowerLine([tx-7,4.75,tz+4.35],[tx+7,4.75,tz+4.35],35,.40);
function chair(x,z,angle,occupied=false){const g=new T.Group();g.position.set(x,.25,z);g.rotation.y=angle+Math.PI;if(occupied)g.scale.set(1.5,1,1.35);scene.add(g);box('#b68b4c',0,.61,0,.57,.13,.55,g);for(const xx of [-.23,.23])for(const zz of [-.22,.22])box('#8f612f',xx,.28,zz,.075,.58,.075,g);for(const xx of [-.23,.23])box('#a57538',xx,1.0,.22,.07,.8,.07,g);box('#c19453',0,1.28,.23,.55,.16,.07,g)}
for(const dx of [-5.5,0,5.5]){cyl('#b69b73',tx+dx,.86,tz, .18,1.3);cyl('#fff1d8',tx+dx,1.43,tz,1.65,.19);cyl('#ece0c7',tx+dx,1.24,tz,1.58,.29);bouquet(tx+dx,1.57,tz,.46);for(let i=0;i<6;i++){const a=i*Math.PI/3;chair(tx+dx+Math.cos(a)*2.15,tz+Math.sin(a)*2.15,-a-Math.PI/2,(dx===-5.5&&i===1)||(dx===5.5&&i===2));cyl('#fcf7e9',tx+dx+Math.cos(a)*1.16,1.55,tz+Math.sin(a)*1.16,.23,.04);cyl('#cca759',tx+dx+Math.cos(a+.2)*1.16,1.67,tz+Math.sin(a+.2)*1.16,.08,.21)}}
box('#f3e5c9',tx-4,.86,tz+4.8,2.4,1.45,.8);for(let i=0;i<3;i++)cyl('#e4c783',tx-4+i*.55-.55,1.8,tz+4.8,.16,.35);
// The lagoon is carved into the island itself and shares the ocean's water level.
decorateLagoon({ball,beam,mesh,groundHeight:islandSurfaceHeight});
// The original timber bridge connects both sandy shores.
buildBridge({box,cyl,tube,beam});
// East garden pergola and hanging wooden swing.
const gx=22,gz=7;box('#c6b28b',gx,.2,gz,7.2,.38,5.4);for(const x of [-2.8,2.8])for(const z of [-2,2])box('#876232',gx+x,2.2,gz+z,.2,4,.2);for(let i=-3;i<=3;i++)beam([gx+i,4.3,gz-2.6],[gx+i,4.3,gz+2.6],.11,'#9c7439');for(const z of [-2,2])beam([gx-3.3,4.1,gz+z],[gx+3.3,4.1,gz+z],.16,'#89612d');
bench(gx,gz,3.1);for(const x of [-1.45,1.45])beam([gx+x,1.1,gz],[gx+x,4.2,gz],.025,'#635842');flowerLine([gx-3,4.4,gz+2],[gx+3,4.4,gz+2],16,.55);for(const x of [-2.8,2.8])flowerLine([gx+x,.5,gz+2],[gx+x,4,gz+2],10,.48);
// Welcome sign, scattered planting, lanterns and warm festoon lights.
const signx=7,signz=10;box('#bd945b',signx,1.45,signz,3.3,1.85,.17);for(const x of [-1.45,1.45])cyl('#73572f',signx+x,1.3,signz,.11,2.6);flowerLine([signx-1.7,2.45,signz],[signx+1.7,2.45,signz],9,.28);
function textSign(){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#bd945b';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#f3dbab';ctx.lineWidth=4;ctx.strokeRect(16,16,480,224);ctx.fillStyle='#453b28';ctx.textAlign='center';ctx.font='24px Georgia';ctx.fillText('WELCOME TO',256,83);ctx.font='43px Georgia';ctx.fillText('Andi & Ratna',256,146);ctx.font='20px Georgia';ctx.fillText('OUR LITTLE WEDDING WORLD',256,194);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(3.25,1.8),new T.MeshBasicMaterial({map:tex}));m.position.set(signx,1.45,signz+.1);scene.add(m)}textSign();
for(let i=0;i<140;i++){let x=rand(-28,28),z=rand(-18,18);if(Math.abs(x)<3.4||Math.abs(z+2)<3||Math.hypot(x,z+1.5)<4||x<-9&&z>0&&z<15||x<-11&&z<-5||x>12&&z<-4||x>16&&z>3&&z<11||z>11&&z<15)continue;bouquet(x,.13,z,rand(.3,.65))}
// MarryMe: tiang lampu dipindah ke pinggiran pulau (≥5 unit dari jalur mana pun) supaya tidak ada tiang di area jalan.
const LAMP_POSTS=[[-26,-18],[-18,-18],[18,-18],[26,-18],[-28,-12],[28,-12],[-29,19],[29,19]];
for(const [x,z] of LAMP_POSTS){cyl('#425438',x,1.1,z,.06,2.2);box('#b98f48',x,2.3,z,.34,.56,.34);box('#ffe2a0',x,2.3,z+.18,.23,.37,.01);mesh(GEO.cone,'#4a6040',x,2.72,z,.28,.3,.28)}
for(const [x1,z1,x2,z2] of [[11,-16,28,-16],[-27,-16,-10,-16]]){const ps=[];for(let i=0;i<=24;i++){const t=i/24;const x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,y=5.8-Math.sin(t*Math.PI)*1.2;ps.push([x,y,z]);if(i%2===0)ball('#ffdf93',x,y-.13,z,.08)}tube(ps,.018,'#675731')}
// Spatial foliage clusters let the GPU skip flowers and leaves outside the camera view.
function instances(data,geom,foliage=false){
 if(foliage)geom=surfaces.plantGeometry(geom);
 const groups=new Map();
 for(const d of data){const key=performanceProfile.mobile?`${Math.floor(d.x/12)}:${Math.floor(d.z/12)}`:'all';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
 for(const ds of groups.values()){
  const im=new T.InstancedMesh(geom,foliage?surfaces.plantMaterial(mat('#ffffff')):mat('#ffffff'),ds.length),o=new T.Object3D(),color=new T.Color();
  ds.forEach((d,i)=>{o.position.set(d.x,d.y,d.z);o.scale.setScalar(d.s);o.rotation.set(i*.36,i*.71,i*.27);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,color.set(d.c))});
  im.name=foliage?'Local flower-bed foliage':'Local flower petals';im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);
 }
}
instances(leaves,performanceProfile.mobile?new T.SphereGeometry(1,8,5):GEO.ball,true);instances(petals,performanceProfile.mobile?new T.IcosahedronGeometry(1,0):GEO.small);
const detailState=enrichGarden({LAMP_POSTS,T,scene,mesh,box,ball,cyl,beam,tube,mat,GEO,rand,rnd,treeLocations,gardenPaths,waterMat,performanceProfile,groundMaterial:surfaces.groundMaterial});
const weddingDecor=createWeddingDecor({scene,mobile:performanceProfile.mobile});
// Batch static geometry by material to keep mobile draw calls low.
scene.updateMatrixWorld(true);
const batches=new Map(),oldMeshes=[];
scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material!==waterMat&&!o.material.isShaderMaterial&&((!o.material.map&&!o.material.vertexColors)||o.material.userData.batchable)){let list=batches.get(o.material);if(!list)batches.set(o.material,list=[]);list.push(o);oldMeshes.push(o)}});
for(const [material,list] of batches){
 let count=0;const parts=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);count+=g.attributes.position.count;return g});
 const pos=new Float32Array(count*3),nor=new Float32Array(count*3),uv=material.map?new Float32Array(count*2):null,colors=material.vertexColors?new Float32Array(count*3):null;
 let off=0;for(const g of parts){pos.set(g.attributes.position.array,off*3);nor.set(g.attributes.normal.array,off*3);if(uv)uv.set(g.attributes.uv.array,off*2);if(colors)colors.set(g.attributes.color.array,off*3);off+=g.attributes.position.count;g.dispose();}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));if(uv)g.setAttribute('uv',new T.BufferAttribute(uv,2));if(colors)g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeBoundingSphere();
 const m=new T.Mesh(g,material);m.name=material.name||'Batched garden geometry';m.castShadow=list.some(o=>o.castShadow);m.receiveShadow=list.some(o=>o.receiveShadow);scene.add(m);
}
oldMeshes.forEach(m=>m.removeFromParent());
// Freeze local transforms of static meshes after construction.
scene.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
const atmosphere=createAtmosphere(scene);
const ambientWind=createAmbientWind(scene,performanceProfile);
const islandLife=createIslandLife({scene,mobile:performanceProfile.mobile,detail:performanceProfile.characterDetail});
const arrivalHost=createArrivalHost({scene,detail:performanceProfile.characterDetail});
const guestGreetings=createGuestGreetings({host,guests:islandLife.guests});
let avatar=createCharacter({detail:performanceProfile.characterDetail});scene.add(avatar.root);avatar.root.position.set(0,.08,12.6);
const weddingCouple=createWeddingCouple({detail:performanceProfile.characterDetail});scene.add(weddingCouple.root);
const coupleShadows=performanceProfile.mobile?weddingCouple.people.map(rig=>addContactShadow(T,scene,rig)):[];
coupleShadows.forEach(shadow=>shadow.update());
let playerShadow=null;
let arrival=null,islandInterface=null;let gameStarted=false;let venueUI=null;let venueMarkers=null;let moments=null,photoMode=null;
let followPlayer=true;const keys=new Set();const stick={x:0,y:0};
const obstacles=[[-5.5,-13,-2.4,-5.4],[2.4,-13,6.4,-5.4],[-22.4,-14,-13.6,-13.5],[-20.2,-12.4,-15.8,-10.4],[20.2,6.4,23.8,7.7],[5.2,9.6,8.8,10.4]];
function walkable(x,z,ignoreGuest){if(arrivalHost.blocks(x,z))return false;if(weddingStage.blocks(x,z))return false;if(weddingDecor.blocks(x,z)||weddingCouple.blocks(x,z)||islandLife.blocks(x,z,ignoreGuest))return false;if(bridgeRail(x,z))return false;if((!insideIsland(x,z)&&!islandLife.onPier(x,z))||island.blocks(x,z))return false;if(Math.hypot(x,z+1.5)<2.9)return false;if(obstacles.some(([a,b,c,d])=>x>a-.3&&x<c+.3&&z>b-.3&&z<d+.3))return false;if(lagoonBlocks(x,z)&&!onBridge(x,z))return false;for(const dx of [-5.5,0,5.5])if(Math.hypot(x-(20+dx),z+10)<1.95)return false;return true}
const velocity=new T.Vector2();
// MarryMe: pemain 30% lebih cepat dari WALK_SPEED dasar (NPC tetap); langkah kaki ikut jarak tempuh.
const PLAYER_SPEED=WALK_SPEED*1.3;
function moveAvatar(dt,t){
  if(!gameStarted||arrival?.active||venueUI?.isOpen||photoMode?.active||moments?.busy)return;
  let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+stick.x;
  let dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+stick.y;
  const len=Math.hypot(dx,dz),input=len>.08;
  dx=input?dx/Math.max(1,len):0;dz=input?dz/Math.max(1,len):0;
  const wantedX=(dx*Math.cos(az)+dz*Math.sin(az))*PLAYER_SPEED,wantedZ=(-dx*Math.sin(az)+dz*Math.cos(az))*PLAYER_SPEED;
  const rate=input?11:19,decay=Math.exp(-rate*dt);
  const stepX=wantedX*dt+(velocity.x-wantedX)*(1-decay)/rate;
  const stepZ=wantedZ*dt+(velocity.y-wantedZ)*(1-decay)/rate;
  velocity.set(wantedX+(velocity.x-wantedX)*decay,wantedZ+(velocity.y-wantedZ)*decay);
  const p=avatar.root.position,oldX=p.x,oldZ=p.z;
  if(walkable(p.x+stepX,p.z)&&weddingStage.canMove(p.x,p.z,p.x+stepX,p.z))p.x+=stepX;else velocity.x=0;
  if(walkable(p.x,p.z+stepZ)&&weddingStage.canMove(p.x,p.z,p.x,p.z+stepZ))p.z+=stepZ;else velocity.y=0;
  const actualX=p.x-oldX,actualZ=p.z-oldZ,distance=Math.hypot(actualX,actualZ),speed=distance/Math.max(dt,.0001);
  let turn=0;
  if(distance>.00001){
    const angle=Math.atan2(actualX,actualZ),error=Math.atan2(Math.sin(angle-avatar.root.rotation.y),Math.cos(angle-avatar.root.rotation.y));
    const rotation=error*(1-Math.exp(-dt*13));avatar.root.rotation.y+=rotation;turn=rotation/Math.max(dt,.0001);
    if(!followPlayer&&input){followPlayer=true;goalDist=innerWidth<650?24:20;document.querySelectorAll('[data-place]').forEach(b=>b.classList.toggle('active',b.dataset.place==='player'));}
  }
  if(!input&&velocity.length()<.012)velocity.set(0,0);
  p.y=islandSurfaceHeight(p.x,p.z)+.089;const stageFloor=weddingStage.heightAt(p.x,p.z);if(stageFloor!==null)p.y=stageFloor+.04;else if(onBridge(p.x,p.z))p.y=bridgeHeight(p.x);
  else if(islandLife.onPier(p.x,p.z))p.y=islandLife.pierHeight(p.z)+.089;
  else if(p.x>-13.4&&p.x<-10.1&&p.z>9.4&&p.z<12.3)p.y=.58;
  else if(p.x>-23&&p.x<-13&&p.z>-14.5&&p.z<-6.5)p.y=.51;
  else if(p.x>12.5&&p.x<27&&p.z>-14.5&&p.z<-5.5)p.y=.32;
  else if(p.x>18.4&&p.x<25.6&&p.z>4.3&&p.z<9.7)p.y=.4;
  avatar.animate(t,{dt,speed,distance,turn});if(followPlayer)goal.set(p.x,p.y+1.1,p.z);
}
addEventListener('keydown',e=>{if(!gameStarted||arrival?.active||venueUI?.isOpen||photoMode?.active||moments?.busy)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();velocity.set(0,0);stick.x=stick.y=0;resetStick()});
const joy=document.querySelector('#joystick'),knob=document.querySelector('#knob');let joyPointer=null;function resetStick(){stick.x=stick.y=0;knob.style.transform='translate(0,0)'}function steer(e){const r=joy.getBoundingClientRect();let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const d=Math.hypot(x,y),m=34;if(d>m){x*=m/d;y*=m/d}stick.x=x/m;stick.y=y/m;knob.style.transform=`translate(${x}px,${y}px)`}joy.addEventListener('pointerdown',e=>{if(!gameStarted||arrival?.active||venueUI?.isOpen||photoMode?.active||moments?.busy)return;e.preventDefault();joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);steer(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)steer(e)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(ev,e=>{if(e.pointerId===joyPointer){joyPointer=null;resetStick()}});
// Camera: orbit, pinch, pan, named destination focus and keyboard support.
let az=0,el=.36,dist=innerWidth<650?24:20,target=new T.Vector3(0,1.2,12.6),goal=target.clone(),goalDist=dist,auto=false;
const places={all:[0,0,0,Math.max(110,49/(Math.tan(Math.PI*21/180)*(innerWidth/innerHeight)))],ceremony:[0,2.8,-16.4,28],pavilion:[-18,2,-10,25],reception:[20,2,-10,31],pond:[-18,0,7,28],gazebo:[22,1,7,22]};
function focus(id){followPlayer=id==='player';const v=followPlayer?[avatar.root.position.x,avatar.root.position.y+1.1,avatar.root.position.z,innerWidth<650?24:20]:places[id];goal.set(v[0],v[1],v[2]);goalDist=v[3];el=id==='all'?.70:id==='player'?.36:.60;az=0;document.querySelectorAll('[data-place]').forEach(b=>b.classList.toggle('active',b.dataset.place===id))}
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>focus(b.dataset.place));document.querySelector('#home').onclick=()=>focus('all');document.querySelector('#zoomIn').onclick=()=>goalDist=Math.max(12,goalDist*.82);document.querySelector('#zoomOut').onclick=()=>goalDist=Math.min(360,goalDist*1.22);document.querySelector('#rotate').onclick=e=>{auto=!auto;e.currentTarget.setAttribute('aria-pressed',String(auto))};document.querySelector('#top').onclick=()=>{el=1.48;az=0};
const pointers=new Map();const canvas=renderer.domElement;canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(!gameStarted||arrival?.active||venueUI?.isOpen||moments?.busy||photoMode?.resultOpen)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;if(pointers.size===2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);goalDist=T.MathUtils.clamp(goalDist*before/Math.max(1,after),12,360);pan(dx*.45,dy*.45)}else if(e.buttons===2||e.shiftKey){pan(dx,dy)}else{az-=dx*.006;el=T.MathUtils.clamp(el+dy*.005,.20,1.49)}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>pointers.delete(e.pointerId));
function pan(dx,dy){followPlayer=false;const k=dist*.0013;goal.x+=(-Math.cos(az)*dx+Math.sin(az)*dy)*k;goal.z+=(Math.sin(az)*dx+Math.cos(az)*dy)*k;goal.x=T.MathUtils.clamp(goal.x,-46,46);goal.z=T.MathUtils.clamp(goal.z,-36,36)}canvas.addEventListener('wheel',e=>{e.preventDefault();if(!gameStarted||arrival?.active)return;goalDist=T.MathUtils.clamp(goalDist*Math.exp(e.deltaY*.001),12,360)},{passive:false});addEventListener('keydown',e=>{if(!gameStarted||arrival?.active||venueUI?.isOpen||photoMode?.active||moments?.busy||['BUTTON','INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;if(e.key==='+'||e.key==='=')goalDist=Math.max(12,goalDist*.9);if(e.key==='-')goalDist=Math.min(360,goalDist*1.1);if(e.key==='Home')focus('all')});
if(matchMedia('(pointer:fine)').matches)document.querySelector('#hint').textContent='WASD / ↑↓←→ untuk berjalan · Klik penanda venue atau tekan E saat dekat';
addEventListener('resize',()=>{resolution.resize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(gameStarted||intro.active)renderer.setSize(innerWidth,innerHeight);if(arrival?.active)frameArrivalCamera();places.all[3]=Math.max(110,49/(Math.tan(Math.PI*21/180)*(innerWidth/innerHeight)))});
const selection=createCharacterSelection({renderer,host,deferOpen:true,characters:{male:avatar,male2:createPeciCharacter({detail:performanceProfile.characterDetail}),female:createPinkHijabCharacter({detail:performanceProfile.characterDetail}),female2:createSanggulCharacter({detail:performanceProfile.characterDetail})},onStart(rig){
  avatar=rig;scene.add(avatar.root);avatar.root.position.set(ARRIVAL.x,islandLife.pierHeight(ARRIVAL.z)+.089,ARRIVAL.z);
  avatar.root.rotation.y=Math.atan2(ARRIVAL.hostX-ARRIVAL.x,ARRIVAL.hostZ-ARRIVAL.z);
  clearMovement();gameStarted=true;ambience.start();arrival.start();
  if(performanceProfile.mobile){playerShadow=addContactShadow(T,scene,avatar);playerShadow.update();renderer.shadowMap.needsUpdate=true;}
}});
const intro=createIslandIntro({renderer,scene,camera,onContinue(){selection.open();},updateWorld(t){
  atmosphere.update(t);island.update(t);detailState.update(t);ambientWind.update(t);
  islandLife.update(t,camera,null,walkable);weddingCouple.update(t);arrivalHost.update(t,null,false);
}});
renderer.domElement.tabIndex=0;
venueUI=createVenueExperience({getEnabled:()=>gameStarted&&!arrival?.active&&!photoMode?.active&&!moments?.busy,onPause(){moments?.hide();guestGreetings.hide();ambience.setPanelOpen(true);venueMarkers?.setVisible(false);keys.clear();velocity.set(0,0);resetStick();joyPointer=null;pointers.clear();},onResume(){ambience.setPanelOpen(false);venueMarkers?.setVisible(true);keys.clear();velocity.set(0,0);resetStick();clock.getDelta();lastFrame=null;resolution.reset();renderer.domElement.focus({preventScroll:true});}});
venueMarkers=createVenueMarkers({scene,host,onSelect:venue=>{if(!photoMode?.active&&!moments?.busy)venueUI.openPlace(venue.place)}});
venueMarkers.markers.forEach(m=>m.glow.visible=false);
const clock=new T.Clock();const resolution=createResolutionController(renderer,performanceProfile);
let elapsed=0,lastFrame=null;
function clearMovement(){keys.clear();velocity.set(0,0);resetStick();joyPointer=null;pointers.clear();}
moments=createIslandMoments({scene,host,cat:islandLife.cat,couple:weddingCouple,getPlayer:()=>avatar,getTime:()=>elapsed,getEnabled:()=>gameStarted&&!arrival?.active&&!venueUI.isOpen&&!photoMode?.active,canWalk:walkable,onLock:clearMovement,onMeow:()=>ambience.meow(),mobile:performanceProfile.mobile});
let photoCamera=null;
function restorePhotoCamera(){if(!photoCamera)return;({az,el,dist,goalDist,auto,followPlayer}=photoCamera);target.copy(photoCamera.target);goal.copy(photoCamera.goal);avatar.root.rotation.y=photoCamera.facing;camera.position.set(target.x+Math.sin(az)*Math.cos(el)*dist,target.y+Math.sin(el)*dist,target.z+Math.cos(az)*Math.cos(el)*dist);camera.lookAt(target);}
photoMode=createPhotoMode({renderer,scene,camera,getEnabled:()=>gameStarted&&!arrival?.active&&!venueUI.isOpen,isBusy:()=>moments.busy,isNearCouple:()=>moments.nearCouple(),onChange(active){
  clearMovement();guestGreetings.hide();moments.hide();venueMarkers.setVisible(!active);
  if(active)islandInterface?.close();
  for(const marker of venueMarkers.markers)marker.glow.visible=!active;
  if(active){photoCamera={az,el,dist,goalDist,auto,followPlayer,target:target.clone(),goal:goal.clone(),facing:avatar.root.rotation.y};auto=false;followPlayer=false;}
  else{restorePhotoCamera();photoCamera=null;clock.getDelta();lastFrame=null;resolution.reset();}
},onAngle(angle){
  if(angle==='free'){restorePhotoCamera();auto=false;followPlayer=false;return;}
  const p=avatar.root.position;
  if(angle==='portrait'){az=avatar.root.rotation.y;el=.12;goal.set(p.x,p.y+1.65,p.z);goalDist=10;}
  else if(moments.nearCouple()){
    const center=weddingCouple.center,minX=Math.min(-2,p.x-.8),maxX=Math.max(2,p.x+.8),middleZ=(center.z+p.z)/2;
    az=0;el=.23;goal.set((minX+maxX)/2,(center.y+p.y)/2+1.65,middleZ);goalDist=Math.max(12,(maxX-minX)/(.767*camera.aspect)*1.45,Math.abs(p.z-center.z)+8);avatar.root.rotation.y=0;
  }
  target.copy(goal);dist=goalDist;camera.position.set(target.x+Math.sin(az)*Math.cos(el)*dist,target.y+Math.sin(el)*dist,target.z+Math.cos(az)*Math.cos(el)*dist);camera.lookAt(target);
}});
function finishArrival(record){
  document.querySelector('#gameControls').inert=false;host.inert=false;clearMovement();
  venueMarkers.markers.forEach(m=>m.glow.visible=true);ambience.setPanelOpen(false);focus('player');
  venueUI.setGuestName(record.name);clock.getDelta();lastFrame=null;resolution.reset();canvas.focus({preventScroll:true});
  islandInterface?.update();
}
function frameArrivalCamera(){
  const landscape=innerHeight<=520&&innerWidth>600;
  auto=false;followPlayer=false;az=-.32;el=.27;goalDist=landscape?19:17;dist=goalDist;
  target.set(landscape?10.8:5.8,landscape?1:-1.7,34.7);goal.copy(target);
}
arrival=createArrivalExperience({host,getPlayer:()=>avatar,getEnabled:()=>gameStarted&&!venueUI.isOpen&&!photoMode.active&&!moments.busy,
  onPause(){
    clearMovement();islandInterface?.close();document.querySelector('#gameControls').inert=true;host.inert=true;guestGreetings.hide();moments.hide();venueMarkers.setVisible(false);venueMarkers.markers.forEach(m=>m.glow.visible=false);ambience.setPanelOpen(true);
    frameArrivalCamera();
  },onComplete:finishArrival,onResume:finishArrival});
islandInterface=createIslandInterface({getEnabled:()=>gameStarted&&!arrival.active&&!venueUI.isOpen&&!photoMode.active&&!moments.busy});
function frame(timestamp=0){
  requestAnimationFrame(frame);
  if(document.hidden)return;
  islandInterface.update();
  const interval=!gameStarted?1000/30:performanceProfile.mobile?1000/60:0;
  if(lastFrame!==null&&interval&&timestamp-lastFrame<interval-.5)return;
  if(lastFrame!==null&&interval)lastFrame=timestamp-(Math.max(0,timestamp-lastFrame-interval)%interval);else lastFrame=timestamp;
  const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05);
  if(!gameStarted){elapsed+=dt;if(intro.active)intro.update(elapsed);else selection.update(elapsed);return;}
  if(venueUI.isOpen||photoMode.resultOpen)return;
  elapsed+=dt;
  resolution.sample(rawDt);atmosphere.update(elapsed);island.update(elapsed);detailState.update(elapsed);ambientWind.update(elapsed);moveAvatar(dt,elapsed);if(photoMode.active||arrival.active)avatar.animate(elapsed,{dt,speed:0,distance:0,turn:0});
  playerShadow?.update();
  const nearbyVenue=venueUI.update(avatar.root.position);
  // The couple's idle motion is only needed near the current camera view.
  if(camera.position.distanceTo(weddingCouple.people[0].root.position)<48)weddingCouple.update(elapsed,avatar.root.position);
  target.lerp(goal,1-Math.exp(-dt*7));dist+=(goalDist-dist)*(1-Math.exp(-dt*7));if(auto)az+=dt*.11;
  camera.position.set(target.x+Math.sin(az)*Math.cos(el)*dist,target.y+Math.sin(el)*dist,target.z+Math.cos(az)*Math.cos(el)*dist);camera.lookAt(target);
  islandLife.update(elapsed,camera,avatar.root.position,walkable);
  arrivalHost.update(elapsed,avatar.root.position,arrival.active);arrival.update(camera,innerWidth,innerHeight);
  if(arrival.active||photoMode.active||moments.busy)guestGreetings.hide();else guestGreetings.update(elapsed,camera,avatar.root.position,innerWidth,innerHeight);ambience.update(avatar.root.position,islandLife.guests);
  venueMarkers.setVisible(!arrival.active&&!photoMode.active&&!moments.busy);if(!arrival.active&&!photoMode.active)venueMarkers.update(camera,nearbyVenue,elapsed,innerWidth,innerHeight);
  moments.update(elapsed,dt,camera,innerWidth,innerHeight);playerShadow?.update();
  rippleTexture.offset.set(elapsed*.014,elapsed*.009);waterMat.color.setHSL(.49,.37,.55+Math.sin(elapsed*.8)*.008);renderer.render(scene,camera);
}
addEventListener('visibilitychange',()=>{clock.getDelta();lastFrame=null;resolution.reset();if(document.hidden){keys.clear();velocity.set(0,0);resetStick();}});
frame();document.querySelector('#loading').classList.add('hide');window.gardenReady=true;
