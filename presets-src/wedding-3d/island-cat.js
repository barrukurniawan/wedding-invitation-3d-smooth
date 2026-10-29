import * as T from './vendor/three.module.js';
import {createPatrol} from './guest-activities.js';

// Open aisle inside the pavilion, clear of the sofa, side tables and front posts.
export const CAT_FLOOR=.50;
export const CAT_ROUTE=[[-21,-8.2],[-19,-8.6],[-16.5,-8.6],[-14.9,-8.1]];
export function createIslandCat(parent){
  const root=new T.Group();root.name='Kucing ginger di pendopo';parent.add(root);
  const body=new T.Group();root.add(body);const head=new T.Group();head.position.set(0,.80,.39);body.add(head);
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.85}),sphere=new T.SphereGeometry(1,16,10),legs=[],eyes=[];
  function add(p,g,c,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new T.Mesh(g,material);m.userData.color=c;m.position.set(x,y,z);m.scale.set(sx,sy,sz);p.add(m);return m;}
  const ell=(p,c,x,y,z,a,b=a,d=a)=>add(p,sphere,c,x,y,z,a,b,d);
  const line=(p,c,points,r)=>add(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),16,r,6,false),c);
  ell(body,'#dc8b40',0,.48,0,.29,.31,.53).userData.tabby='body';ell(body,'#ffe7c2',0,.48,.27,.245,.28,.28);
  ell(head,'#e8a056',0,0,0,.35,.31,.30).userData.tabby='head';ell(head,'#ffe7c2',0,-.12,.23,.245,.145,.12);
  for(const s of [-1,1]){
    const ear=add(head,new T.ConeGeometry(.16,.29,4,1),'#cf823b',s*.23,.27,-.03);ear.rotation.z=-s*.18;ear.rotation.y=Math.PI/4;
    const inset=add(head,new T.ConeGeometry(.096,.20,3,1),'#e8b4a5',s*.23,.279,.052);inset.rotation.z=-s*.18;
    const eye=new T.Group();eye.position.set(s*.145,.01,.266);head.add(eye);eyes.push(eye);
    ell(eye,'#584731',0,0,0,.088,.11,.025);ell(eye,'#a5b485',0,0,.016,.065,.082,.017);ell(eye,'#292626',0,0,.033,.024,.076,.010);ell(eye,'#fff8e6',-.021,.04,.044,.014,.019,.006);
    ell(head,'#efbb86',s*.20,-.12,.264,.043,.021,.006);
    for(let i=0;i<2;i++)line(head,'#c4b499',[[s*.17,-.11-i*.043,.314],[s*.31,-.10-i*.05,.30],[s*.43,-.085-i*.08,.24]],.007);
  }
  ell(head,'#b27d76',0,-.11,.34,.047,.033,.024);
  line(head,'#85644f',[[0,-.14,.337],[0,-.18,.331],[-.045,-.196,.32]],.009);line(head,'#85644f',[[0,-.18,.331],[.045,-.196,.32]],.009);
  const collar=add(body,new T.TorusGeometry(.24,.028,6,24),'#647e84',0,.64,.29);collar.rotation.x=1.07;
  ell(body,'#d8b267',0,.53,.52,.060,.068,.038);
  for(let i=0;i<4;i++){
    const leg=new T.Group();leg.position.set(i%2?.19:-.19,.39,i<2?.29:-.32);body.add(leg);
    ell(leg,'#de9147',0,-.14,0,.10,.20,.10).userData.tabby='leg';ell(leg,'#f2c58b',0,-.31,.03,.12,.09,.15);legs.push(leg);
  }
  const tail=new T.Group();tail.position.set(0,.57,-.42);body.add(tail);
  line(tail,'#d88b3e',[[0,0,0],[.04,.18,-.22],[.13,.42,-.34],[.27,.59,-.26],[.35,.56,-.11]],.072).userData.tabby='tail';
  ell(tail,'#b96a30',.35,.56,-.11,.073);
  function bake(group){
    group.children.filter(o=>o.isGroup).forEach(bake);const meshes=group.children.filter(o=>o.isMesh);if(!meshes.length)return;
    const pos=[],nor=[],colors=[];
    for(const m of meshes){m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);const c=new T.Color(m.userData.color);for(let i=0;i<g.attributes.position.count;i++){let color=c;if(m.userData.tabby){const p=g.attributes.position,x=p.getX(i),y=p.getY(i),z=p.getZ(i),kind=m.userData.tabby;const phase=kind==='body'?z*34+(y-.5)*8+Math.abs(x)*5:kind==='head'?x*39+y*9:kind==='leg'?y*50:y*31-z*4;const mask=kind==='body'?T.MathUtils.smoothstep(y,.32,.48):kind==='head'?T.MathUtils.smoothstep(y,.07,.21):1;const stripe=T.MathUtils.smoothstep(Math.sin(phase),.35,.9)*mask;color=c.clone().lerp(new T.Color('#a95927'),stripe*.72);}colors.push(color.r,color.g,color.b);}g.dispose();m.removeFromParent();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();const m=new T.Mesh(g,material);m.name='Ginger tabby cat detail';group.add(m);
  }
  bake(root);root.position.set(CAT_ROUTE[0][0],CAT_FLOOR+.07,CAT_ROUTE[0][1]);root.rotation.y=-.4;
  const patrol=createPatrol(CAT_ROUTE,{speed:.65,pause:2.8});let stride=0,sleep=0,petStart=-100;
  const cat={root,body,head,legs,eyes,tail,patrol,groundHeight:CAT_FLOOR,pet(t){petStart=t;},update(t,dt,player,canWalk){
    const petting=t-petStart<3.6;
    const moved=petting?0:patrol.update(dt,root,player,canWalk,cat),walking=moved>.0001,near=player&&Math.hypot(player.x-root.position.x,player.z-root.position.z)<3;
    if(petting&&player){const a=Math.atan2(player.x-root.position.x,player.z-root.position.z)-root.rotation.y;root.rotation.y+=Math.atan2(Math.sin(a),Math.cos(a))*(1-Math.exp(-dt*5));}
    stride+=moved*9;sleep+=((!walking&&!near&&patrol.wait>4?1:0)-sleep)*(1-Math.exp(-dt*2));
    root.position.y=CAT_FLOOR+.07;
    body.position.y=-.23*sleep+(walking?Math.cos(stride*2)*.013:Math.sin(t*1.4)*.006);
    body.rotation.z=Math.sin(stride)*.02*(walking?1:0);
    for(let i=0;i<4;i++)legs[i].rotation.x=(walking?Math.sin(stride+(i===0||i===3?0:Math.PI))*.40:0)-sleep*1.2;
    head.position.y=.8-.18*sleep;head.rotation.x=.18*sleep-(near?.12:0)+Math.sin(t*.9)*.025;head.rotation.z=.23*sleep;
    let look=0;if(near){const a=Math.atan2(player.x-root.position.x,player.z-root.position.z)-root.rotation.y;look=T.MathUtils.clamp(Math.atan2(Math.sin(a),Math.cos(a)),-.6,.6);}head.rotation.y+=(look-head.rotation.y)*(1-Math.exp(-dt*4));
    const lid=1-.92*sleep-(1-sleep)*.92*Math.max(0,1-Math.abs((t%5)-3.9)/.12);eyes.forEach(e=>e.scale.y=Math.max(.055,lid));
    tail.rotation.set(-sleep*.8,Math.sin(t*1.4)*.22*(1-sleep),sleep*.65);
    if(petting){const ease=T.MathUtils.smoothstep(t-petStart,0,.5)*(1-T.MathUtils.smoothstep(t-petStart,3,3.6));head.rotation.x-=.15*ease;head.rotation.z=Math.sin(t*3)*.09*ease;eyes.forEach(e=>e.scale.y=T.MathUtils.lerp(e.scale.y,.24,ease));tail.rotation.y=Math.sin(t*5)*.30;}
  }};return cat;
}
