import * as T from './vendor/three.module.js';

export function createAmbientWind(scene,{mobile=false}={}){
  const time={value:0},patched=new Set();
  scene.traverse(o=>{
    if(!o.isMesh)return;
    const name=o.material.name,petals=o.name==='Local flower petals';
    if(!petals&&!/Layered foliage|coconut palm fronds/.test(name))return;
    if(petals)o.material=o.material.clone();
    const material=o.material;if(patched.has(material))return;patched.add(material);
    const palm=name.includes('coconut'),amount=palm?.18:petals?.025:.055;
    material.onBeforeCompile=shader=>{
      shader.uniforms.islandWindTime=time;shader.vertexShader='uniform float islandWindTime;\n'+shader.vertexShader;
      const project=T.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;',`
        vec3 windWorld = (modelMatrix * mvPosition).xyz;
        float windHeight = smoothstep(0.0, ${palm?'5.0':'1.5'}, windWorld.y);
        float breeze = sin(islandWindTime * .85 + windWorld.x * .23 + windWorld.z * .18);
        float flutter = sin(islandWindTime * 1.7 + windWorld.x * 1.1 - windWorld.z * .61);
        mvPosition.x += (breeze + flutter * .22) * ${amount.toFixed(3)} * windHeight;
        mvPosition.z += cos(islandWindTime * .73 + windWorld.x * .19) * ${ (amount*.4).toFixed(3)} * windHeight;
        mvPosition = modelViewMatrix * mvPosition;`);
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',project);
    };
    material.customProgramCacheKey=()=>`island-breeze-${amount}`;material.needsUpdate=true;
  });
  const count=mobile?12:18,geometry=new T.SphereGeometry(1,6,4),mat=new T.MeshStandardMaterial({color:'#f4c5bc',roughness:.9}),petals=new T.InstancedMesh(geometry,mat,count),dummy=new T.Object3D();
  petals.name='Drifting blossom petals';petals.frustumCulled=false;scene.add(petals);
  const sites=[[-7.8,-18.5],[8.6,-18.5],[27.5,17]];
  function update(t){time.value=t;for(let i=0;i<count;i++){const [x,z]=sites[i%3],phase=(t*.10+i*.618)%1,fade=Math.sin(phase*Math.PI);dummy.position.set(x+(phase-.5)*4+Math.sin(i*2.3),.18+(1-phase)*3.7,z+Math.sin(phase*4+i)*.6);dummy.rotation.set(t*.6+i,i+t*.3,t*.7+i);dummy.scale.set(.10*fade,.016*fade,.05*fade);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);}petals.instanceMatrix.needsUpdate=true;}
  update(0);return {update,materials:patched,petals};
}
