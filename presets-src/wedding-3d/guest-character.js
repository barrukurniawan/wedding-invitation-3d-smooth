import * as T from './vendor/three.module.js';
import {createCharacter} from './character.js';
import {createFemaleCharacter} from './female-character.js';
import {addCharacterHijab} from './character-hijab.js';

const shade=(color,factor)=>new T.Color(color).multiplyScalar(factor);
const solidMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.82});

// Keep every authored triangle, UV, normal and animated pivot. Only consolidate draw submissions.
function batchGuest(rig,articulated){
  rig.root.updateMatrixWorld(true);
  // Seated/standing idle guests never walk, so the leg pivots can share the torso draw.
  if(!articulated)for(const leg of rig.legs){const meshes=[];leg.traverse(o=>{if(o.isMesh)meshes.push(o);});for(const mesh of meshes)rig.body.attach(mesh);leg.removeFromParent();}
  function merge(group){
    group.children.filter(o=>o.isGroup).forEach(merge);
    const meshes=group.children.filter(o=>o.isMesh&&!o.material.map&&!o.material.transparent);
    if(!meshes.length)return;
    let count=0;const parts=meshes.map(o=>{o.updateMatrix();const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrix);count+=geometry.attributes.position.count;return {geometry,color:o.material.color};});
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*3);let offset=0;
    for(const {geometry,color} of parts){positions.set(geometry.attributes.position.array,offset*3);normals.set(geometry.attributes.normal.array,offset*3);for(let i=0;i<geometry.attributes.position.count;i++){const k=(offset+i)*3;colors[k]=color.r;colors[k+1]=color.g;colors[k+2]=color.b;}offset+=geometry.attributes.position.count;geometry.dispose();}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,solidMaterial);mesh.name=meshes.map(o=>o.name).join(' / ');group.add(mesh);meshes.forEach(o=>o.removeFromParent());
  }
  merge(rig.body);
  // The existing contact patches avoid additional dynamic shadow passes on every device.
  rig.root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
}

function skinTone(rig,spec){
  rig.skin.color.set(spec.skin);rig.innerEar.color.copy(shade(spec.skin,.79));
  rig.head.traverse(o=>{if(o.name==='Warm nose tip')o.material.color.copy(shade(spec.skin,.94));});
}
export function suit(rig,spec){
  const {body,elbows,material,ell,line,lathe,patch}=rig;
  const jacket=material(spec.color,.85),satin=material(shade(spec.color,1.28),.64),shirt=material('#fff8ec',.76),tie=material(spec.accent,.67),metal=material('#d4bf8b',.47);
  const remove=[];
  body.traverse(o=>{
    if(!o.isMesh)return;
    if(o.material===rig.batik||/Soft elbow|Forearm/.test(o.name))o.material=jacket;
    if(/Shirt hem|Button placket|Warm horn button|Folded collar|Collar seam|Chest pocket|Pocket welt|Sleeve piping/.test(o.name))remove.push(o);
  });remove.forEach(o=>o.removeFromParent());
  const front=patch(body,'Tailored ivory shirt front',[[-.14,1.62],[.14,1.62],[.15,1.26],[0,1.10],[-.15,1.26]],shirt);front.position.z=.334;
  for(const s of [-1,1]){
    const lapel=patch(body,'Notched satin suit lapel',[[s*.14,1.62],[s*.28,1.49],[s*.19,1.42],[s*.26,1.37],[s*.045,1.12]],satin);lapel.position.z=.350;
    line(body,'Stitched lapel edge',[[s*.145,1.60,.365],[s*.195,1.42,.370],[s*.045,1.12,.365]],.007,jacket);
    line(body,'Tailored jacket pocket',[[s*.14,1.04,.342],[s*.31,1.06,.327]],.013,satin);
  }
  const necktie=patch(body,'Formal silk tie',[[-.028,1.51],[.028,1.51],[.047,1.24],[0,1.18],[-.047,1.24]],tie,.008);necktie.position.z=.382;
  ell(body,'Silk tie knot',tie,0,1.55,.384,.035,.04,.027);
  const square=patch(body,'Folded ivory pocket square',[[-.30,1.36],[-.27,1.41],[-.23,1.37],[-.18,1.40],[-.16,1.35]],shirt,.005);square.position.z=.337;
  for(const y of [1.12,.95])ell(body,'Metal jacket button',metal,.022,y,.352,.018,.018,.014);
  for(const [i,elbow] of elbows.entries()){lathe(elbow,'Ivory shirt cuff',[[.118,-.215],[.130,-.21],[.130,-.17],[.120,-.16]],shirt);ell(elbow,'Polished cufflink',metal,(i?1:-1)*.115,-.185,.052,.018,.018,.014);}
}

export function createGuestCharacter(spec,{detail='full'}={}){
  const customize=rig=>{
    skinTone(rig,spec);
    if(spec.outfit==='suit')suit(rig,spec);
    else if(spec.outfit==='batik'){
      rig.trim.color.copy(shade(spec.color,1.28));rig.darkTrim.color.copy(shade(spec.color,.77));rig.button.color.set(spec.accent);
    }
    if(spec.hijab){
      const remove=[];rig.head.traverse(o=>{if(o.isMesh&&(/ear|bun|swept hair|hair part|hair end|hair ridge|hair detail|temple strand/i.test(o.name)||(o.material===rig.hair&&!/brow/.test(o.name))))remove.push(o);});remove.forEach(o=>o.removeFromParent());
      addCharacterHijab(rig,{white:rig.material('#e8d8bd',.88),satin:rig.material('#f2e5cc',.70),pearl:rig.material('#fff5dd',.4)});
    }
    if(spec.activity==='seated'){
      // A seated kain follows the lap and then hangs below the knees.
      if(spec.outfit==='kebaya')for(const mesh of rig.body.children){
        if(!mesh.isMesh||!/kebaya|kain|embroider|flower centre/i.test(mesh.name))continue;
        // Helpers share sphere geometry with hair, hands and ears. Deform a private copy in torso space.
        mesh.updateMatrix();mesh.geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
        mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
        const p=mesh.geometry.attributes.position;
        for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>=.95)continue;const f=T.MathUtils.clamp((.95-y)/.72,0,1),lap=Math.min(f/.55,1),drop=Math.max(0,(f-.55)/.45);p.setXYZ(i,p.getX(i),.95-.10*lap-.48*drop,p.getZ(i)+.42*(lap*lap*(3-2*lap)));}
        mesh.geometry.computeVertexNormals();
      }
      const porcelain=rig.material('#fff5df',.48),tea=rig.material('#9b683e',.72);
      if(spec.refreshment==='cake'){
        const silver=rig.material('#bcbdb5',.40),cake=rig.material('#d9aa75',.90);
        const fork=rig.mesh(rig.wrists[1],'Small dessert fork',new T.CylinderGeometry(.013,.013,.18,8),silver);fork.position.set(0,.12,.14);
        for(const x of [-.025,0,.025]){const tine=rig.mesh(rig.wrists[1],'Dessert fork tine',new T.CylinderGeometry(.006,.006,.065,6),silver);tine.position.set(x,.23,.14);}
        const bite=rig.mesh(rig.wrists[1],'A bite of wedding cake',new T.BoxGeometry(.09,.065,.08),cake);bite.position.set(0,.245,.14);
        rig.ell(rig.wrists[1],'Cake cream',porcelain,0,.286,.14,.047,.016,.042);
        const plate=rig.lathe(rig.wrists[0],'Small dessert plate',[[0,0],[.19,0],[.21,.015],[.20,.035],[0,.035]],porcelain);plate.position.set(0,.025,.11);
      }else{
      const cup=rig.lathe(rig.wrists[1],'Porcelain teacup',[[0,0],[.10,0],[.12,.025],[.14,.19],[.12,.19],[.10,.04],[0,.04]],porcelain);
      cup.position.set(0,.04,.15);
      rig.ell(rig.wrists[1],'Tea surface',tea,0,.218,.15,.117,.008,.117);
      const handle=rig.mesh(rig.wrists[1],'Porcelain cup handle',new T.TorusGeometry(.061,.015,6,18),porcelain);handle.position.set(.15,.16,.15);
      }
    }
  };
  const rig=spec.outfit==='kebaya'
    ?createFemaleCharacter({detail,palette:{main:spec.color,skirt:shade(spec.color,.77),silk:shade(spec.color,1.35),thread:spec.accent,gold:'#c5aa79'},customize})
    :createCharacter({detail,batikPalette:{base:spec.color,petal:shade(spec.color,1.45).getStyle(),outline:spec.accent,inner:'#ba9a67',dots:'#f5dcad',centre:spec.accent},customize});
  batchGuest(rig,!!spec.activity);rig.root.name=spec.name;
  return {...rig,spec,gestures:rig.arms.map((arm,i)=>({arm,elbow:rig.elbows[i],wrist:rig.wrists[i],side:i?1:-1}))};
}
