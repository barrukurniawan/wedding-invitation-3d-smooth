// Quiet synthesized surf, distant gull calls and indistinct conversation; independent of the music.
export function createSeasideAmbience({button,status,contextFactory}={}){
  const label=button.querySelector('.ambience-label');let context=null,nodes=null,started=false,wanted=false,request=0,mutedForPanel=false;
  // Every visit starts quietly; only an explicit toggle creates the audio context.
  function sync(){const playing=!!context&&context.state==='running'&&wanted;button.setAttribute('aria-pressed',String(playing));button.setAttribute('aria-label',playing?'Matikan suara suasana':'Nyalakan suara suasana');button.title=playing?'Matikan suara suasana':'Nyalakan suara suasana';label.textContent=playing?'Suasana: Aktif':'Suasana: Mati';}
  function buffer(kind,seconds){
    const rate=22050,b=context.createBuffer(1,seconds*rate,rate),out=b.getChannelData(0);let seed=kind==='surf'?6429:kind==='gulls'?317:825,low=0,phase=0;const voicePhases=[0,0,0];
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
    for(let i=0;i<out.length;i++){
      const t=i/rate,noise=random();let value=0;
      if(kind==='surf'){low+=.045*(noise-low);const swell=.44+.25*Math.sin(t*Math.PI/3)+.13*Math.sin(t*Math.PI/2);value=(low*3.0+noise*.16)*swell;}
      else if(kind==='gulls'){
        for(const start of [2.8,13.4,23.1]){const u=(t-start)/.8;if(u>=0&&u<1){const hz=1050+Math.sin(u*Math.PI)*650-u*350;phase+=Math.PI*2*hz/rate;value+=(Math.sin(phase)+.22*Math.sin(phase*2))*Math.sin(u*Math.PI)**2*.26;}}
      }else{
        // Several soft, overlapping vowel-like syllables, without intelligible speech.
        for(let voice=0;voice<3;voice++){const cycle=(t+voice*4.2)%9,u=cycle/3.8;if(u<1){const hz=130+voice*47+Math.sin(t*3.1+voice)*11,p=(voicePhases[voice]+=Math.PI*2*hz/rate),phrase=Math.sin(u*Math.PI)**2,syllable=Math.max(0,Math.sin(t*(11+voice)+voice))**2;value+=(Math.sin(p)*.35+Math.sin(p*3)*.18+Math.sin(p*5)*.09+noise*.13)*phrase*syllable*.32;}}
      }
      out[i]=value;
    }
    // Cross-fade the noise seam; tonal layers are silent at the loop boundary.
    const fade=Math.min(1102,out.length/2);for(let i=0;i<fade;i++){const u=i/fade;out[i]*=u;out[out.length-1-i]*=u;}
    return b;
  }
  function initialize(){
    const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!contextFactory&&!Constructor)throw new Error('Web Audio unavailable');
    context=contextFactory?contextFactory():new Constructor();
    const master=context.createGain();master.gain.value=0;master.connect(context.destination);
    function layer(kind,seconds,frequency){const source=context.createBufferSource();source.buffer=buffer(kind,seconds);source.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=frequency;const gain=context.createGain();gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();return gain;}
    nodes={master,surf:layer('surf',12,3200),gulls:layer('gulls',28,3800),voices:layer('voices',18,1250)};
  }
  let shore=.3,crowd=.15,lastVolumeAt=-1;
  function volume(){if(!nodes)return;const now=context.currentTime;nodes.master.gain.setTargetAtTime(wanted?(mutedForPanel?.30:.75):0,now,.12);nodes.surf.gain.setTargetAtTime(.12+shore*.24,now,.7);nodes.gulls.gain.setTargetAtTime(.07+shore*.09,now,.7);nodes.voices.gain.setTargetAtTime(crowd*.12,now,.7);}
  async function setEnabled(enabled){
    wanted=enabled;const id=++request;try{localStorage.setItem('wedding-ambience',wanted?'on':'off');}catch{}
    try{if(wanted){if(!context)initialize();await context.resume();}else if(context){volume();await context.suspend();}if(id!==request)return;volume();sync();status.textContent='';}
    catch{if(id!==request)return;wanted=false;sync();status.textContent='Suara suasana belum bisa diputar. Tekan tombol suasana untuk mencoba lagi.';}
  }
  button.addEventListener('click',()=>{void setEnabled(!wanted);});
  document.addEventListener('visibilitychange',()=>{if(!context)return;if(document.hidden)void context.suspend().then(sync);else if(started&&wanted)void context.resume().then(()=>{volume();sync();}).catch(()=>{});});
  function meow(){
    if(!wanted||context?.state!=='running'||!nodes)return;
    const at=context.currentTime,voice=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain();
    voice.type='triangle';voice.frequency.setValueAtTime(620,at);voice.frequency.exponentialRampToValueAtTime(880,at+.14);voice.frequency.exponentialRampToValueAtTime(430,at+.62);
    filter.type='lowpass';filter.frequency.value=1900;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.10,at+.07);gain.gain.exponentialRampToValueAtTime(.001,at+.68);
    voice.connect(filter);filter.connect(gain);gain.connect(nodes.master);voice.onended=()=>{voice.disconnect();filter.disconnect();gain.disconnect();};voice.start(at);voice.stop(at+.7);
  }
  sync();return {meow,start(){started=true;if(wanted)void setEnabled(true);},setEnabled,setPanelOpen(value){mutedForPanel=value;volume();},update(player,guests){if(!context||context.currentTime-lastVolumeAt<.25)return;lastVolumeAt=context.currentTime;shore=Math.max(0,Math.min(1,(Math.max(Math.abs(player.x)/30,Math.abs(player.z)/20)-.55)/.8));let distance=20;for(const g of guests)distance=Math.min(distance,Math.hypot(player.x-g.root.position.x,player.z-g.root.position.z));crowd=Math.max(0,1-distance/9);volume();},get enabled(){return wanted&&context?.state==='running';}};
}
