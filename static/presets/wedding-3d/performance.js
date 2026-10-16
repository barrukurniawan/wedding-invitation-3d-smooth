// Keep a crisp drawing buffer on phones without rendering at an expensive native 3x DPR.
function displayScale(mobile,width,height,pixelRatio){
  const budget=mobile?Math.max(1,Math.sqrt(1000000/Math.max(1,width*height))):1.65;
  const maximum=Math.min(pixelRatio,mobile?1.5:1.65,budget);
  return {pixelRatio:maximum,minimumPixelRatio:Math.min(maximum,mobile?1.25:maximum)};
}
export function createPerformanceProfile({coarse=matchMedia('(pointer: coarse)').matches,width=innerWidth,height=innerHeight,pixelRatio=devicePixelRatio}={}) {
  const mobile=coarse||Math.min(width,height)<650;
  return {mobile,characterDetail:mobile?'compact':'full',...displayScale(mobile,width,height,pixelRatio),shadowSize:mobile?1024:2048};
}

export function createResolutionController(renderer,profile){
  let ratio=profile.pixelRatio,elapsed=0,slow=0,fast=0;
  let minimum=profile.minimumPixelRatio;
  return {sample(seconds){
    if(!profile.mobile)return;
    // Exclude pauses and tab switches from the running workload estimate.
    if(seconds<=0||seconds>1){elapsed=slow=fast=0;return;}
    seconds=Math.min(seconds,.15);
    elapsed+=seconds;
    if(seconds>1/38)slow+=seconds;
    if(seconds<1/55)fast+=seconds;
    if(elapsed<3)return;
    let next=ratio;
    if(slow/elapsed>.55)next=Math.max(minimum,ratio-.1);
    else if(fast/elapsed>.85)next=Math.min(profile.pixelRatio,ratio+.1);
    elapsed=slow=fast=0;
    if(Math.abs(next-ratio)>.01){ratio=next;renderer.setPixelRatio(ratio);}
  },resize(width,height,pixelRatio=devicePixelRatio){
    Object.assign(profile,displayScale(profile.mobile,width,height,pixelRatio));minimum=profile.minimumPixelRatio;
    const next=Math.min(profile.pixelRatio,Math.max(minimum,ratio));elapsed=slow=fast=0;
    if(Math.abs(next-ratio)>.001){ratio=next;renderer.setPixelRatio(ratio);}
  },reset(){elapsed=slow=fast=0},get ratio(){return ratio}};
}

export function addContactShadow(T,scene,rig){
  // A tiny unlit contact patch follows each character without a live shadow pass.
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;void main(){float a=(1.-smoothstep(.15,.5,length(vUv-.5)))*.24;gl_FragColor=vec4(.13,.10,.075,a);}'});
  const geometry=new T.PlaneGeometry(1.1,.78);geometry.rotateX(-Math.PI/2);
  const shadow=new T.Mesh(geometry,material);shadow.name='Character contact shadow';scene.add(shadow);
  rig.root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  return {update(){shadow.position.copy(rig.root.position);shadow.position.y+=.008;shadow.rotation.y=rig.root.rotation.y;}};
}
