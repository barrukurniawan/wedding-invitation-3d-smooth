import * as T from './vendor/three.module.js';

// All portraits share the garden's WebGL canvas; only the chosen rig enters the map.
export function createCharacterSelection({renderer,host,characters,onStart,deferOpen=false}) {
  const panel=document.querySelector('#characterSelection');
  const form=document.querySelector('#characterForm');
  const grid=document.querySelector('#characterChoices');
  const layer=document.querySelector('#characterPreviews');
  const start=document.querySelector('#startGame');
  const controls=document.querySelector('#gameControls');
  let started=false,opened=false,selected=null,width=0,height=0;
  const views=Object.entries(characters).map(([id,rig])=>{
    const scene=new T.Scene();scene.add(rig.root);rig.root.position.set(0,0,0);
    scene.add(new T.HemisphereLight('#f5f5ff','#c4a795',2.3));
    const key=new T.DirectionalLight('#fff0dc',2.8);key.position.set(-3,5,6);scene.add(key);
    const fill=new T.DirectionalLight('#d7e6ff',1.1);fill.position.set(4,3,-4);scene.add(fill);
    const camera=new T.OrthographicCamera(-1.3,1.3,1.9,-1.9,.1,30);
    camera.position.set(0,2.05,8);camera.lookAt(0,1.67,0);
    return {id,rig,scene,camera,slot:document.querySelector(`[data-preview="${id}"]`)};
  });
  function open(){
    if(opened||started)return;
    opened=true;panel.hidden=false;
    layer.appendChild(renderer.domElement);
    renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';
    renderer.setClearColor(0x000000,0);
    document.querySelector('input[name="character"]').focus({preventScroll:true});
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function choose(event){
    if(!opened||event.target.name!=='character')return;
    selected=Object.hasOwn(characters,event.target.value)?event.target.value:null;
    start.disabled=!selected;
  }
  form.addEventListener('change',choose);
  function begin(event){
    event.preventDefault();
    if(!opened||started||!selected)return;
    started=true;
    const rig=characters[selected];rig.root.removeFromParent();rig.root.rotation.set(0,0,0);
    host.appendChild(renderer.domElement);
    renderer.setScissorTest(false);renderer.setSize(innerWidth,innerHeight);renderer.setViewport(0,0,innerWidth,innerHeight);
    panel.hidden=true;controls.inert=false;host.inert=false;
    document.body.classList.remove('choosing-character');
    form.removeEventListener('change',choose);form.removeEventListener('submit',begin);
    renderer.domElement.focus({preventScroll:true});
    onStart(rig);
  }
  form.addEventListener('submit',begin);
  // Expose native radio navigation once the scene is ready, without picking for the user.
  if(!deferOpen)open();
  function update(time){
    if(!opened||started)return;
    const bounds=grid.getBoundingClientRect(),w=Math.round(bounds.width),h=Math.round(bounds.height);
    if(w<1||h<1)return;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);}
    renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();renderer.setScissorTest(true);
    for(const view of views){
      const rect=view.slot.getBoundingClientRect(),x=rect.left-bounds.left,y=h-(rect.bottom-bounds.top);
      if(rect.width<1||rect.height<1)continue;
      const aspect=rect.width/rect.height,halfHeight=Math.max(1.93,1.12/aspect);
      Object.assign(view.camera,{left:-halfHeight*aspect,right:halfHeight*aspect,top:halfHeight,bottom:-halfHeight});view.camera.updateProjectionMatrix();
      view.rig.animate(reducedMotion?0:time,false);
      view.rig.root.rotation.y=view.id.startsWith('male')?.12:-.18;
      renderer.setViewport(x,y,rect.width,rect.height);renderer.setScissor(x,y,rect.width,rect.height);
      renderer.render(view.scene,view.camera);
    }
  }
  return {get started(){return started},get opened(){return opened},open,update};
}
