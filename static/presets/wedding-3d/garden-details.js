import {lagoonDistance} from './lagoon.js';
import {LAWN_LEVEL} from './island.js';
import {createLawnGeometry,grassSandBlend} from './ground-surface.js';
// Detailed low-poly garden assets. Native mesh geometry, shared instancing and seeded layout.
export function enrichGarden({T,scene,mesh,box,ball,cyl,beam,tube,mat,GEO,rand,rnd,treeLocations,gardenPaths,waterMat,performanceProfile,groundMaterial}){
 const mobile=performanceProfile.mobile;
 const samples=gardenPaths.map(p=>({points:p.curve.getPoints(160),r:p.width/2}));
 function pathDist(x,z){let nearest=Infinity;for(const p of samples){for(const q of p.points){const d=Math.hypot(q.x-x,q.z-z)-p.r;if(d<nearest)nearest=d}}return Math.min(nearest,Math.hypot(x,z+1.5)-8)}
 const inPond=(x,z)=>lagoonDistance(x,z)<3.2;
 function occupied(x,z){return inPond(x,z)||(x>-23.5&&x<-12.5&&z>-15.1&&z<-6)||(x>11.8&&x<28&&z>-15.1&&z<-4.8)||(x>18&&x<26.2&&z>3.9&&z<10.2)||(Math.abs(x)<6.8&&z< -5.2)||(x>5&&x<9&&z>9&&z<11)||(z>15.1&&z<16.8)}
 // The lawn and coast share colour, world-aligned texture and exact edge normals.
 const terrain=createLawnGeometry(mobile,LAWN_LEVEL);mesh(terrain,groundMaterial,0,0,0).castShadow=false;
 // Short, curved blades with rounded ends instead of long triangular spikes.
 const gv=[],gc=[];
 for(let blade=0;blade<3;blade++){
  const a=blade*Math.PI*2/3,dx=Math.cos(a),dz=Math.sin(a),height=.28+blade*.018;
  const rows=[];for(let k=0;k<=(mobile?3:6);k++){const t=k/(mobile?3:6),w=.05*Math.sqrt(Math.max(.015,1-t*t)),lean=.065*t*t;rows.push([[-dx*w+dz*lean,t*height,-dz*w-dx*lean],[dx*w+dz*lean,t*height,dz*w-dx*lean]]);}
  for(let k=0;k<(mobile?3:6);k++)for(const p of [rows[k][0],rows[k][1],rows[k+1][0],rows[k+1][0],rows[k][1],rows[k+1][1]]){gv.push(...p);const t=p[1]/height;gc.push(.52+.10*t,.70+.12*t,.34+.09*t);}
 }
 const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(gv,3));gg.setAttribute('color',new T.Float32BufferAttribute(gc,3));gg.computeVertexNormals();
 const gm=new T.MeshStandardMaterial({color:'#9db975',vertexColors:true,side:T.DoubleSide,roughness:1});const wind={value:0};gm.onBeforeCompile=shader=>{shader.uniforms.uWindTime=wind;shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(uWindTime*1.6 + instanceMatrix[3].x*.7 + instanceMatrix[3].z*.5)*position.y*position.y*.18;');};gm.customProgramCacheKey=()=> 'garden-grass-wind-v1';
 const tufts=[];for(let i=0;i<(mobile?3800:9000);i++){const x=rand(-29.5,29.5),z=rand(-19.5,19.5);if(pathDist(x,z)<.50||occupied(x,z))continue;const patch=Math.sin(x*1.1+z*.53)+Math.cos(z*1.4-x*.36);if(patch<-.2&&rnd()<.85)continue;tufts.push({x,z,s:rand(.30,.58),a:rand(0,6.28)})}
 const grass=new T.InstancedMesh(gg,gm,tufts.length);const dummy=new T.Object3D(),tuftColor=new T.Color();tufts.forEach((p,i)=>{dummy.position.set(p.x,.025,p.z);const s=p.s*(1-.65*grassSandBlend(p.x,p.z));dummy.scale.set(s,s,s);dummy.rotation.set(0,p.a,0);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);const tint=.88+.16*Math.sin(p.x*.9+p.z*.67);tuftColor.setRGB(tint,tint*1.025,tint*.93);grass.setColorAt(i,tuftColor)});grass.name="Meadow grass";grass.receiveShadow=!mobile;grass.castShadow=false;scene.add(grass);
 // Rounded stones, shaped leaves, fern fans and small flowering meadow patches.
 const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.22,.18,0,.6);leafShape.quadraticCurveTo(-.22,.18,0,0);const lg=new T.ShapeGeometry(leafShape,8);const leafmat=new T.MeshStandardMaterial({color:'#558646',side:T.DoubleSide,roughness:1,flatShading:false});const fern=[];
 for(let i=0;i<(mobile?45:90);i++){const x=rand(-28,28),z=rand(-18,18);if(pathDist(x,z)<.8||occupied(x,z))continue;for(let j=0;j<7;j++)fern.push({x,z,a:j*.897,h:rand(.55,1.0)})}
 const ferns=new T.InstancedMesh(lg,leafmat,fern.length);fern.forEach((p,i)=>{dummy.position.set(p.x,.04,p.z);dummy.rotation.set(-.45,p.a,.12);dummy.scale.set(p.h,p.h,p.h);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);const tint=.92+.12*Math.sin(p.x*.43+p.z*.61);ferns.setColorAt(i,new T.Color().setRGB(tint,tint*1.03,tint*.94))});ferns.receiveShadow=!mobile;scene.add(ferns);
 // Soft contact shading anchors trees, planting and buildings to the soil.
 const sg=new T.PlaneGeometry(1,1);sg.rotateX(-Math.PI/2);const sm=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=(1.-smoothstep(.0,1.,r))*.22;gl_FragColor=vec4(.07,.13,.045,a);}'});for(const p of treeLocations){const m=mesh(sg,sm,p.x,.033,p.z,p.h*.62,1,p.h*.62);m.castShadow=false;m.receiveShadow=false}
 // Stone edging along the paths, spaced pebbles and occasional worn paving chips.
 const pebbleColors=['#b6a98a','#c8b899','#d8c8a9'];for(const path of gardenPaths){const p={r:path.width/2,points:path.curve.getSpacedPoints(Math.ceil(path.curve.getLength()/.64))};for(let i=1;i<p.points.length-1;i++){const q=p.points[i],next=p.points[i+1],ang=Math.atan2(next.z-q.z,next.x-q.x)+Math.PI/2;for(const side of [-1,1]){const x=q.x+Math.cos(ang)*(p.r+.13)*side,z=q.z+Math.sin(ang)*(p.r+.13)*side;if(Math.abs(x)>29.5||Math.abs(z)>19.6||Math.hypot(x,z+1.5)<7.8||inPond(x,z)||pathDist(x,z)<.035)continue;const o=ball(pebbleColors[i%3],x,.055,z,.22,.08,.15);o.rotation.y=ang}}}
 for(let i=0;i<120;i++){const x=rand(-28,28),z=rand(-18,18);const d=pathDist(x,z);if(d>-.2||occupied(x,z)||Math.hypot(x,z+1.5)<2.7)continue;const o=mesh(GEO.small,'#d4bc8d',x,.051,z,rand(.025,.08),.012,rand(.02,.05));o.castShadow=false}
 // Pavilion: thick overlapping individual roof tiles, ridge caps and timber fascias.
 const px=-18,pz=-10.5;const tileColors=['#bf704b','#b96544','#ce7d53','#c2724e'];
 for(const side of [-1,1])for(let row=0;row<8;row++)for(let col=0;col<14;col++){const x=side*(.36+row*.6),z=-3.86+col*.59;const tile=box(tileColors[(row+col)%4],px+x,6.93-Math.abs(x)*.56,pz+z,.69,.11,.565);tile.rotation.z=-side*.51;}
 for(let i=0;i<14;i++){const o=mesh(new T.CylinderGeometry(.19,.19,.59,8,1,false,0,Math.PI), '#a65b38',px,6.99,pz-3.86+i*.59);o.rotation.x=Math.PI/2}
 for(const side of [-1,1])beam([px+side*4.92,4.10,pz-4.15],[px+side*4.92,4.10,pz+4.15],.13,'#aa7944');
 // Planked floor with alternating wood tones and visible joints.
 for(let i=0;i<24;i++)box(i%3===0?'#ba9864':'#c4a774',px-4.48+i*.39,.518,pz,.37,.035,6.8);
 for(const z of [-3.24,3.24])for(const side of [-1,1]){box('#77552f',px+side*4.2,.79,pz+z,.47,.36,.47);box('#c7a675',px+side*4.2,.59,pz+z,.63,.16,.63);beam([px+side*4.2,2.9,pz+z],[px+side*3.2,4.18,pz+z],.10,'#a77a42')}
 // Timber lattice side panels and brass fasteners; front entrance stays open.
 for(const side of [-1,1]){for(let j=0;j<9;j++)box('#9c7544',px+side*4.2,1.05,pz-2.8+j*.7,.09,.90,.07);beam([px+side*4.2,1.53,pz-3.1],[px+side*4.2,1.53,pz+3.1],.07,'#bf955c');for(const z of [-3.24,3.24])for(const y of [2.8,4.1])ball('#d9b969',px+side*4.2,y,pz+z+.15,.042)}
 for(let i=0;i<3;i++)box('#cab28c',px,.10+i*.13,pz+4.05-i*.27,5.1-i*.20,.18,.62);
 // Ceiling rafters visible from the open pavilion.
 for(let z=-3;z<=3;z+=1.1){beam([px-4.3,4.2,pz+z],[px,6.5,pz+z],.09,'#7b572f');beam([px,6.5,pz+z],[px+4.3,4.2,pz+z],.09,'#7b572f')}
 // Marquee: pleated scalloped valance, tie-backs, floor paving and buffet details.
 const tx=20,tz=-10;for(let i=0;i<36;i++){const x=tx-9+i*.51;if(x>28)continue;box(i%2?'#f6e6c7':'#eddbb6',x,4.68,tz+4.55,.53,.30,.07);ball('#f6e6c7',x,4.48,tz+4.55,.255,.18,.045);}
 for(const x of [-6,0,6])for(const z of [-4,4]){const m=mesh(new T.TorusGeometry(.36,.065,6,16), '#b7a078',tx+x,2,tz+z);m.rotation.x=Math.PI/2;for(let j=0;j<2;j++)beam([tx+x+.24,1.97,tz+z],[tx+x+.36+j*.1,1.35,tz+z+.1],.045,'#d8bd83')}
 for(let x=13;x<27.5;x+=.90)for(let z=-14;z<-5.8;z+=.90)box((Math.round(x+z)*7)%3?'#d8c3a2':'#cbb492',x,.326,z,.86,.018,.86);
 for(const dx of [-5.5,0,5.5]){for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=tx+dx+Math.cos(a)*1.13,z=tz+Math.sin(a)*1.13;box('#c5a86a',x+.16,1.584,z,.025,.015,.30);box('#c5a86a',x-.16,1.584,z,.025,.015,.30);const napkin=box('#c4aa84',x,1.585,z+.15,.21,.016,.17);napkin.rotation.y=a}cyl('#e6d5af',tx+dx,1.75,tz,.12,.42);ball('#fff0cc',tx+dx,2.04,tz,.07,.14,.07)}
 // Slender floral aisle pedestals lead to the raised wedding stage.
 for(const z of [-12.1,-8.9,-5.7])for(const side of [-1,1]){const x=side*2.3;cyl('#d8c6a4',x,.25,z,.25,.22);cyl('#d9c9aa',x,.74,z,.12,.87);cyl('#e7d9bb',x,1.21,z,.29,.14);for(let i=0;i<6;i++){const a=i*1.047;ball(i%2?'#efd2ba':'#d99794',x+Math.cos(a)*.18,1.41,z+Math.sin(a)*.18,.14,.13,.14)}}
 // Pergola: lattice trellis and multiple members make its structure readable.
 const gx=22,gz=7;for(const side of [-1,1])for(let z=-1.8;z<=1.8;z+=.55){beam([gx+side*2.78,.6,gz+z],[gx+side*2.78,2.5,gz+Math.min(2,z+1)],.035,'#ab8249');beam([gx+side*2.78,2.5,gz+z],[gx+side*2.78,.6,gz+Math.min(2,z+1)],.035,'#ab8249')}
 for(let x=-2.4;x<=2.4;x+=.6)for(let z=-1.6;z<=1.6;z+=.8)box('#d1bf9b',gx+x,.401,gz+z,.57,.022,.76);
 for(const x of [-2.8,2.8])for(const z of [-2,2]){box('#c5ab7d',gx+x,.41,gz+z,.5,.23,.5);beam([gx+x,3.3,gz+z],[gx+x-Math.sign(x)*.6,4.12,gz+z],.075,'#ad8350')}
 // Fountain coping blocks and circular cobbled apron.
 for(let i=0;i<40;i++){const a=i*Math.PI/20,r=2.42;const m=box(i%2?'#cfbd98':'#bfae8b',Math.cos(a)*r,.10,-1.5+Math.sin(a)*r,.39,.10,.32);m.rotation.y=-a;}
 // A lighter second row of flower beds anchors perimeter planting without filling paths.
 const rocks=[];for(let i=0;i<110;i++){const x=rand(-29,29),z=rand(-19,19);if(pathDist(x,z)<.5||occupied(x,z))continue;rocks.push({x,z,s:rand(.07,.18)})}const rockMesh=new T.InstancedMesh(GEO.small,mat('#a3aa7c'),rocks.length);rocks.forEach((p,i)=>{dummy.position.set(p.x,.04,p.z);dummy.scale.set(p.s,p.s*.55,p.s*.8);dummy.rotation.set(0,i,0);dummy.updateMatrix();rockMesh.setMatrixAt(i,dummy.matrix)});rockMesh.receiveShadow=true;scene.add(rockMesh);
 // Trimmed, layered hedges and oversized daisies echo the cozy miniature reference.
 for(const [x,z,w,d] of [[-7.5,10,5,.75],[10.8,10.3,4,.75],[-9,-10,.65,5],[10.4,-9,.65,5],[-24.1,-9,.6,4],[17.9,6,.6,3]]){box('#587843',x,.26,z,w+.22,.43,d+.2);box('#75964d',x,.65,z,w,.67,d);box('#8aa854',x,.94,z,w-.12,.20,d-.10)}
 const blooms=[[-5.6,11],[-9.3,11.3],[5.1,11.6],[12.8,9.8],[-11.5,-5.5],[-23.8,-5.7],[10.2,-3.6],[25.6,2.8],[17.8,9.8],[-7.3,4.7],[-27.1,11.4],[5.8,-15.5],[-7,-15.4]];
 for(const [bx,bz] of blooms)for(let j=0;j<3;j++){const x=bx+j*.40-.4,z=bz+(j%2)*.30,h=.44+j*.14;beam([x,.02,z],[x,h,z],.035,'#5c833c');for(let k=0;k<5;k++){const a=k*Math.PI*2/5;const o=ball('#fff0cf',x+Math.cos(a)*.19,h+Math.sin(a)*.17,z,.13,.18,.075);o.rotation.z=-a+Math.PI/2;}ball('#e4b443',x,h,z+.09,.115,.115,.08);ball('#7f9f46',x-.12,h*.38,z,.13,.07,.075);ball('#789342',x+.10,h*.3,z,.12,.06,.07)}
 // Chunky lantern housings with luminous cream panes.
 for(const [x,z] of [[-6,15],[6,15],[-8,-4],[8,-4],[-10.4,13.9],[12,12],[-11,-13],[11,-13]]){cyl('#ad8752',x,2.0,z,.23,.1);cyl('#d8ac6b',x,2.63,z,.28,.13);cyl('#8c693d',x,2.32,z,.21,.53);const pane=new T.MeshStandardMaterial({color:'#ffe7a2',emissive:'#ffd072',emissiveIntensity:.35,roughness:.7});cyl(pane,x,2.34,z,.215,.35);for(let k=0;k<4;k++){const a=k*Math.PI/2;beam([x+Math.cos(a)*.21,2.08,z+Math.sin(a)*.21],[x+Math.cos(a)*.21,2.58,z+Math.sin(a)*.21],.028,'#9d7946')}}
 return {grassCount:tufts.length,update(t){wind.value=t}};
}
