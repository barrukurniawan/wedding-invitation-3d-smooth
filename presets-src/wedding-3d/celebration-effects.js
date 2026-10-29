import * as T from './vendor/three.module.js';

// One small instanced draw, active only during the congratulation.
export function createCelebrationEffects(scene,{mobile=false,reducedMotion=false}={}){
  const count=reducedMotion?0:mobile?36:60;
  const material=new T.MeshBasicMaterial({side:T.DoubleSide,transparent:true,depthWrite:false});
  const mesh=new T.InstancedMesh(new T.PlaneGeometry(.075,.16),material,count);
  mesh.name='Brief wedding confetti';mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
  const dummy=new T.Object3D(),origin=new T.Vector3(),colors=['#f5d58c','#f4a9ba','#fff6df','#94bca3'];
  const particles=Array.from({length:count},(_,i)=>({angle:i*2.39996,speed:.7+(i%7)*.18,lift:1.8+(i%5)*.22}));
  particles.forEach((_,i)=>mesh.setColorAt(i,new T.Color(colors[i%colors.length])));
  let start=-100;
  return {mesh,burst(time,position){start=time;origin.copy(position);},update(time){
    const age=time-start;mesh.visible=count>0&&age>=0&&age<3.6;if(!mesh.visible)return;
    material.opacity=1-T.MathUtils.smoothstep(age,2.3,3.6);
    particles.forEach((p,i)=>{dummy.position.set(origin.x+Math.cos(p.angle)*p.speed*age,origin.y+2.8+p.lift*age-.8*age*age,origin.z+Math.sin(p.angle)*p.speed*age*.6);dummy.rotation.set(age*(2+i%3),p.angle+age*2,age*3);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;
  }};
}
