import * as T from './vendor/three.module.js';
import {islandSurfaceHeight,SEA_LEVEL} from './island.js';
import {createGuestCharacter} from './guest-character.js';
import {SEATED_GUESTS,GUEST_ROUTES,prepareGuestActivities,updateGuestActivity} from './guest-activities.js';
import {createIslandCat} from './island-cat.js';

// Shared geometry and vertex colours: one draw per moving body part, no new textures or lights.
const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.84});
const sphere=new T.SphereGeometry(1,12,8),box=new T.BoxGeometry(1,1,1);
const cylinder=new T.CylinderGeometry(1,1,1,10);
function part(parent,name){const g=new T.Group();g.name=name;parent.add(g);return g;}
function shape(parent,geometry,color,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){
  const o=new T.Mesh(geometry,material);o.userData.tint=color;o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
}
const ell=(p,c,x,y,z,sx,sy=sx,sz=sx)=>shape(p,sphere,c,x,y,z,sx,sy,sz);
const block=(p,c,x,y,z,sx,sy,sz)=>shape(p,box,c,x,y,z,sx,sy,sz);
function line(p,c,points,r=.025){return shape(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),10,r,5,false),c);}
function panel(p,c,points){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();return shape(p,g,c);}
function beam(p,c,a,b,r){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),o=shape(p,cylinder,c,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,d.length(),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function bake(group){
  for(const child of group.children.filter(o=>o.isGroup))bake(child);
  const meshes=group.children.filter(o=>o.isMesh);if(!meshes.length)return;
  const pos=[],normal=[],colors=[],v=new T.Color();
  for(const m of meshes){m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);pos.push(...g.attributes.position.array);normal.push(...g.attributes.normal.array);v.set(m.userData.tint);for(let i=0;i<g.attributes.position.count;i++)colors.push(v.r,v.g,v.b);g.dispose();m.removeFromParent();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
  const mesh=new T.Mesh(g,material);mesh.name=group.name+' coloured geometry';mesh.receiveShadow=true;group.add(mesh);
}

export const GUESTS=[
  {name:'Batik biru',outfit:'batik',color:'#294967',accent:'#e9c684',skin:'#bd8460',x:28.8,z:-7.2,angle:-1.1},
  {name:'Kebaya hijau',outfit:'kebaya',color:'#36746a',accent:'#edcc87',skin:'#e5ad84',x:26.7,z:-5.1,angle:2.2},
  {name:'Jas arang',outfit:'suit',color:'#3d4654',accent:'#ad7788',skin:'#e2ac83',x:-10.6,z:1.1,angle:.65},
  {name:'Kebaya mauve',outfit:'kebaya',color:'#a57491',accent:'#f1d5a0',skin:'#c88f67',x:-8.7,z:2.0,angle:-2.3},
  {name:'Batik marun',outfit:'batik',color:'#864c4e',accent:'#edbd76',skin:'#d9a47b',x:8.8,z:24.8,angle:1.15},
  {name:'Kebaya terakota dan hijab',outfit:'kebaya',color:'#bd806b',accent:'#f1d7ae',skin:'#efbb95',hijab:true,x:11.1,z:25.4,angle:-1.85},
];

export const PIER={x:5.8,halfWidth:1.55,start:26,end:39,deck:-.25};
export function onPier(x,z){return Math.abs(x-PIER.x)<PIER.halfWidth-.32&&z>=PIER.start&&z<PIER.end-.38;}
export function pierHeight(z){return T.MathUtils.lerp(islandSurfaceHeight(PIER.x,PIER.start)+.025,PIER.deck,T.MathUtils.clamp((z-PIER.start)/3,0,1));}
function pierBlocks(x,z){return z>PIER.start+2.6&&z<PIER.end+.3&&((Math.abs(x-PIER.x)>PIER.halfWidth-.32&&Math.abs(x-PIER.x)<PIER.halfWidth+.32)||z>PIER.end-.38&&Math.abs(x-PIER.x)<PIER.halfWidth+.32);}
function makePier(root){
  const dock=part(root,'Timber ferry pier');
  for(let i=0;i<39;i++){const z=PIER.start+(i+.5)/3;block(dock,i%3?'#c29a68':'#b48a5a',PIER.x,pierHeight(z)-.10,z,PIER.halfWidth*2,.20,.334);}
  for(const s of [-1,1]){
    for(let z=29;z<=39;z+=2){shape(dock,cylinder,'#8d6945',PIER.x+s*1.55,-.61,z,.105,2.12,.105);ell(dock,'#d7b27b',PIER.x+s*1.55,.48,z,.13,.065,.13);}
    for(let z=29;z<39;z+=2)line(dock,'#dec7a1',[[PIER.x+s*1.55,.37,z],[PIER.x+s*1.55,.25,z+1],[PIER.x+s*1.55,.37,z+2]],.035);
  }
  line(dock,'#dec7a1',[[PIER.x-1.55,.37,39],[PIER.x,.25,39],[PIER.x+1.55,.37,39]],.035);
  bake(dock);dock.traverse(o=>{if(o.isMesh)o.castShadow=true;});return dock;
}
function makeFerry(root){
  const ferry=part(root,'Cream coastal ferry');ferry.position.set(PIER.x+5,SEA_LEVEL,38.9);ferry.scale.setScalar(1.5);
  // Closed tapered hull: a pointed bow, rounded chine and gently flared gunwales.
  const hull=part(ferry,'Ferry hull and cabin'),rings=[[-.40,.62],[-.04,.88],[.53,1],[.75,1.02]],outline=[[-1,-3.5],[1,-3.5],[1.53,-2.6],[1.55,1.8],[1.1,3.1],[0,4.3],[-1.1,3.1],[-1.55,1.8],[-1.53,-2.6]];
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<outline.length;i++){
    const k=(i+1)%outline.length,[y,a]=rings[j],[yy,b]=rings[j+1],p=[outline[i][0]*a,y,outline[i][1]],q=[outline[k][0]*a,y,outline[k][1]],r=[outline[k][0]*b,yy,outline[k][1]],s=[outline[i][0]*b,yy,outline[i][1]];
    panel(hull,j===0?'#456879':j===1?'#fbedd4':'#547f93',[p,r,q,p,s,r]);
  }
  for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];panel(hull,'#dbc09a',[[0,.755,0],[b[0]*1.02,.755,b[1]],[a[0]*1.02,.755,a[1]]]);panel(hull,'#456879',[[0,-.4,0],[a[0]*.62,-.4,a[1]],[b[0]*.62,-.4,b[1]]]);}
  block(hull,'#fff4de',0,1.65,-.65,2.40,1.78,3.35);block(hull,'#efe4cc',0,2.63,-.62,2.75,.20,3.85);
  block(hull,'#b29368',0,2.76,-.62,2.51,.05,3.59);
  for(const s of [-1,1]){
    for(let j=0;j<3;j++){block(hull,'#557d8e',s*1.208,1.94,-1.65+j*.97,.018,.75,.71);block(hull,'#a6c7cd',s*1.222,2.20,-1.64+j*.97,.014,.065,.63);}
    for(let z=-3;z<3.1;z+=.85)beam(hull,'#f5e8d0',[s*(z>2?1.1:1.44),.80,z],[s*(z>2?1.1:1.44),1.37,z],.032);
    line(hull,'#fbefd6',[[s*1.44,1.37,-3.1],[s*1.44,1.37,1.65],[s*1.03,1.37,3.0],[0,1.37,4.0]],.036);
    for(const z of [-2.1,.35]){const tire=shape(hull,new T.TorusGeometry(.24,.066,6,16),'#404b50',s*1.54,.60,z);tire.rotation.y=Math.PI/2;}
    const lifeRing=shape(hull,new T.TorusGeometry(.29,.067,6,18),'#d77853',s*1.24,1.28,-.55);lifeRing.rotation.y=Math.PI/2;
    ell(hull,'#fff2d6',s*1.245,1.57,-.55,.07,.057,.07);ell(hull,'#fff2d6',s*1.245,.99,-.55,.07,.057,.07);
  }
  for(const x of [-.61,.61])block(hull,'#456e80',x,1.99,1.035,.97,.73,.022);
  block(hull,'#3d6578',0,1.53,-2.343,.60,1.32,.025);block(hull,'#ebd09b',.18,1.49,-2.365,.035,.09,.015);
  beam(hull,'#b29a74',[0,2.8,-.8],[0,4.25,-.8],.046);
  ell(hull,'#d8ac60',0,4.28,-.8,.078);
  const flag=part(ferry,'Ferry pennant');flag.position.set(0,4.05,-.8);
  panel(flag,'#cc8b84',[[0,0,0],[.72,-.17,0],[0,-.34,0],[0,-.34,.01],[.72,-.17,.01],[0,0,.01]]);
  bake(ferry);return {root:ferry,flag};
}
function makeGull(root,index){
  const bird=part(root,'Coastal seagull '+(index+1)),wings=[];
  ell(bird,'#fff9e7',0,0,0,.12,.14,.34);ell(bird,'#fff9e7',0,.10,.26,.12);
  ell(bird,'#d5a45c',0,.09,.42,.047,.035,.13);
  for(const s of [-1,1]){
    ell(bird,'#39434c',s*.098,.13,.32,.014);
    const wing=part(bird,'Gull wing');wing.position.x=s*.09;
    const a=[0,.01,.14],b=[s*.45,.09,-.04],c=[s*.92,.015,-.36],d=[s*.35,-.015,-.22];
    panel(wing,'#f9f4df',[a,b,d,a,d,b,b,c,d,b,d,c]);
    panel(wing,'#8c9b9e',[[s*.70,.04,-.22],c,d,[s*.70,.04,-.22],d,c]);wings.push({wing,side:s});
  }
  ell(bird,'#e5e7dc',0,-.005,-.36,.16,.045,.20);bake(bird);return {root:bird,wings,index};
}

export function createIslandLife({scene,mobile=false,detail=mobile?'compact':'full'}){
  const root=new T.Group();root.name='Wedding island life';scene.add(root);
  const guests=[...GUESTS,...SEATED_GUESTS].map(source=>{const spec={...source,activity:source.activity||(GUEST_ROUTES[source.name]?'walking':undefined)},g=createGuestCharacter(spec,{detail});g.root.position.set(spec.x,islandSurfaceHeight(spec.x,spec.z)+.089,spec.z);g.root.rotation.y=spec.angle;root.add(g.root);return g;});
  prepareGuestActivities(guests);const cat=createIslandCat(root);
  const dock=makePier(root),ferry=makeFerry(root),birds=Array.from({length:4},(_,i)=>makeGull(root,i));
  // Stationary guests use a single shared contact-shadow material, with no live shadow pass.
  const shadowMaterial=new T.MeshBasicMaterial({color:'#554630',transparent:true,opacity:.16,depthWrite:false});
  const shadowGeometry=new T.CircleGeometry(.49,16);shadowGeometry.rotateX(-Math.PI/2);
  for(const g of [...guests,cat]){const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.name='Guest contact patch';shadow.position.copy(g.root.position);shadow.position.y-=.077;shadow.scale.z=.72;root.add(shadow);g.shadow=shadow;}
  cat.shadow.scale.set(.65,1,1.25);
  let lastTime=0;
  function update(t,camera,player,canWalk){
    const dt=T.MathUtils.clamp(t-lastTime,0,.05);lastTime=t;
    ferry.root.position.y=SEA_LEVEL+Math.sin(t*.76)*.055;ferry.root.rotation.z=Math.sin(t*.60)*.012;ferry.root.rotation.x=Math.sin(t*.49)*.009;ferry.flag.rotation.y=Math.sin(t*2.7)*.17;
    for(const b of birds){const a=t*.048+b.index*1.57,r=37+b.index*2.4;b.root.position.set(Math.cos(a)*r,11+b.index*.8+Math.sin(t*.5+b.index)*.55,Math.sin(a)*(r*.76));b.root.rotation.set(Math.sin(t*.3+b.index)*.07,Math.atan2(-Math.sin(a)*r,Math.cos(a)*r*.76),Math.sin(t*.42+b.index)*.10);for(const {wing,side} of b.wings)wing.rotation.z=side*Math.sin(t*3.3+b.index)*.26;}
    cat.update(t,dt,player,canWalk);cat.shadow.position.copy(cat.root.position);cat.shadow.position.y=cat.groundHeight+.012;
    for(const [i,g] of guests.entries()){
      const activePose=updateGuestActivity(g,t,dt,player,canWalk,i);
      g.shadow.position.copy(g.root.position);g.shadow.position.y=g.spec.activity==='seated'?.325:islandSurfaceHeight(g.root.position.x,g.root.position.z)+.012;
      if(camera&&camera.position.distanceToSquared(g.root.position)>72**2)continue;
      const phase=t*1.25+i*1.7,near=player&&player.distanceToSquared(g.root.position)<6.5**2;
      const wave=(Math.sin(t*.47+i*2)>.38)&&near;
      const blend=wave?1:0;g.wave=(g.wave||0)+(blend-(g.wave||0))*.13;
      if(!activePose){g.body.rotation.z=Math.sin(phase)*.014;g.body.position.y=Math.sin(phase*1.4)*.008;}
      g.head.rotation.x=Math.sin(phase*.9)*.034;g.head.rotation.z=Math.sin(phase*.7)*.023;
      let look=Math.sin(phase*.46)*.12;
      if(near){const angle=Math.atan2(player.x-g.root.position.x,player.z-g.root.position.z)-g.root.rotation.y;look=T.MathUtils.clamp(Math.atan2(Math.sin(angle),Math.cos(angle)),-.55,.55);}
      g.head.rotation.y+=(look-g.head.rotation.y)*.10;
      const blink=(t+i*.77)%4.8,lid=1-.955*Math.max(0,1-Math.abs(blink-3.65)/.11);g.eyes.forEach(eye=>eye.scale.y=lid);
      if(!activePose)for(const {arm,elbow,wrist,side} of g.gestures){arm.rotation.x=-.15+Math.sin(phase+side)*.07;arm.rotation.z=side*(.13+Math.sin(phase*.8+side)*.025);elbow.rotation.x=-.28+Math.sin(phase+side)*.15;if(side===1){arm.rotation.z+=g.wave*1.35;elbow.rotation.z=g.wave*(.90+Math.sin(t*6+i)*.21);elbow.rotation.x-=g.wave*.60;wrist.rotation.z=Math.sin(t*6+i)*g.wave*.23;}}
    }
  }
  update(0,null,null);
  return {root,guests,cat,dock,ferry,birds,update,onPier,pierHeight,blocks(x,z,ignore){return pierBlocks(x,z)||guests.some(g=>g!==ignore&&(x-g.root.position.x)**2+(z-g.root.position.z)**2<.9**2)||(ignore!==cat&&(x-cat.root.position.x)**2+(z-cat.root.position.z)**2<.55**2);}};
}
