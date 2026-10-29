import * as T from './vendor/three.module.js';
import {VENUES} from './venue-zones.js';
import {createVenueIcon} from './venue-icons.js';

// Native touch/keyboard buttons projected from fixed points in the 3D world.
// No layout reads, raycasts, extra render passes or texture creation per frame.
export function createVenueMarkers({scene,host,onSelect}){
 const layer=document.createElement('div');layer.id='venueMarkers';layer.setAttribute('role','group');layer.setAttribute('aria-label','Informasi venue pada map');layer.hidden=true;host.append(layer);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(128,128,0,128,128,128);
 for(const [stop,alpha] of [[0,0],[.59,0],[.67,.06],[.73,.24],[.765,.6],[.79,.72],[.815,.48],[.87,.15],[.95,.025],[1,0]])gradient.addColorStop(stop,`rgba(255,255,255,${alpha})`);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const geometry=new T.PlaneGeometry(1,1),projected=new T.Vector3(),world=new T.Vector3(),overview=new T.Vector3();
 const markers=VENUES.map(venue=>{
  const button=document.createElement('button');button.type='button';button.className='venue-marker';button.hidden=true;button.dataset.venue=venue.id;
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','venueDialog');button.setAttribute('aria-label',`${venue.action} — ${venue.location}`);button.title=`${venue.location} · ${venue.action}`;
  const icon=document.createElement('span');icon.className='venue-marker-icon';icon.setAttribute('aria-hidden','true');icon.append(createVenueIcon(venue.icon));
  const label=document.createElement('span');label.className='venue-marker-label';
  const location=document.createElement('small');location.textContent=venue.location;
  const action=document.createElement('strong');action.textContent=venue.action;
  const key=document.createElement('kbd');key.textContent='E';key.setAttribute('aria-hidden','true');label.append(location,action);button.append(icon,label,key);
  button.onclick=()=>onSelect(venue);layer.append(button);
  const glow=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture,color:0xffffff,transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  glow.renderOrder=3;glow.name=`White venue glow: ${venue.id}`;glow.position.set(...venue.center);glow.rotation.x=-Math.PI/2;glow.scale.set(venue.ring[0]*2.6,venue.ring[1]*2.6,1);scene.add(glow);
  return {venue,button,glow,state:''};
 });
 const candidates=[],occupied=[];
 return {
  markers,
  setVisible(visible){layer.hidden=!visible;},
  update(camera,nearby,time,width,height){
   camera.updateMatrixWorld();candidates.length=0;occupied.length=0;
   for(const marker of markers){
    const {venue,button,glow}=marker,isNear=venue.id===nearby?.id;
    glow.material.opacity=isNear?.86+Math.sin(time*1.8)*.055:.43;
    world.set(...venue.anchor);const distance=camera.position.distanceTo(world),distant=distance>65,expanded=isNear&&!distant;
    // On the island overview, pin the small badge to the roof/venue centre.
    // Blend between the two world anchors while zooming, without screen clamping.
    world.lerp(overview.set(...venue.overviewAnchor),T.MathUtils.smoothstep(distance,45,65));
    const state=expanded?'nearby':distant?'distant':'local';
    const w=expanded?(width<=600?210:236):distant?44:venue.id==='events'?166:140,h=expanded?72:distant?44:48;
    if(marker.state!==state||marker.width!==w){marker.state=state;marker.width=w;button.dataset.state=state;button.style.width=w+'px';button.style.height=h+'px';}
    projected.copy(world).project(camera);
    const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;
    // Off-screen markers disappear instead of becoming docked HUD controls.
    if(projected.z<=-1||projected.z>=1||!Number.isFinite(x+y)||x-w/2<8||x+w/2>width-8||y-h<8||y>height-96){button.hidden=true;continue;}
    marker.x=x;marker.y=y;const gap=distant?2:5,tail=distant?2:13;marker.rect=[x-w/2-gap,y-h-gap,x+w/2+gap,y+tail];marker.priority=isNear?-1:distance;candidates.push(marker);
   }
   candidates.sort((a,b)=>a.priority-b.priority);
   for(const marker of candidates){
    const r=marker.rect,overlap=occupied.some(o=>r[0]<o[2]&&r[2]>o[0]&&r[1]<o[3]&&r[3]>o[1]);
    marker.button.hidden=overlap;if(overlap)continue;
    occupied.push(r);marker.button.style.transform=`translate3d(${marker.x.toFixed(2)}px,${marker.y.toFixed(2)}px,0) translate(-50%,-100%)`;
   }
  }
 };
}
