// Share the existing scene and canvas with the chooser and game.
export function createIslandIntro({renderer,scene,camera,onContinue,updateWorld}){
  const panel=document.querySelector('#weddingIntro'),button=document.querySelector('#introStart');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active=true;
  function continueToCharacters(){
    if(!active)return;
    active=false;panel.hidden=true;
    document.body.classList.remove('viewing-intro');
    button.removeEventListener('click',continueToCharacters);
    onContinue();
  }
  button.addEventListener('click',continueToCharacters);
  button.disabled=false;button.focus({preventScroll:true});
  renderer.setScissorTest(false);renderer.setSize(innerWidth,innerHeight);renderer.setViewport(0,0,innerWidth,innerHeight);
  function update(time){
    if(!active)return;
    const t=reducedMotion?0:time,narrow=camera.aspect<.85;
    const angle=.57+Math.sin(t*.035)*.045,distance=narrow?103:96;
    const x=narrow?9:0,z=narrow?5:0;
    camera.position.set(x+Math.sin(angle)*distance,30+Math.sin(t*.045)*.5,z+Math.cos(angle)*distance);
    camera.lookAt(x,8,z);
    updateWorld?.(t);
    renderer.render(scene,camera);
  }
  return {get active(){return active},update};
}
