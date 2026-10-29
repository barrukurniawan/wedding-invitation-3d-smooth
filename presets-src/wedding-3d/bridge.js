// One geometry definition drives the visible deck, details, rail collision and foot height.
export const BRIDGE={start:-26.85,end:-9.1,z:7.3,width:2.2,walkHalfWidth:.78,segments:54};
export function bridgeHeight(x){const t=Math.max(0,Math.min(1,(x-BRIDGE.start)/(BRIDGE.end-BRIDGE.start)));return .08+1.45*Math.sin(Math.PI*t)**2}
export function onBridge(x,z){return x>=BRIDGE.start&&x<=BRIDGE.end&&Math.abs(z-BRIDGE.z)<=BRIDGE.walkHalfWidth}
export function bridgeRail(x,z){return x>BRIDGE.start+.35&&x<BRIDGE.end-.35&&Math.abs(z-BRIDGE.z)>BRIDGE.walkHalfWidth&&Math.abs(z-BRIDGE.z)<BRIDGE.width/2+.2}
export function bridgeEntrance(x,z){return Math.abs(z-BRIDGE.z)<1.4&&x>BRIDGE.start-1&&x<BRIDGE.end+1}
export function buildBridge({box,cyl,tube,beam}){
 const b=BRIDGE,length=b.end-b.start,step=length/b.segments,rails=[b.z-b.width/2+.1,b.z+b.width/2-.1];
 for(let i=0;i<=b.segments;i++){const x=b.start+i*step,y=bridgeHeight(x);const plank=box(i%3?'#b37b3c':'#bf8b49',x,y-.09,b.z,step+.035,.18,b.width);const slope=(bridgeHeight(x+.02)-bridgeHeight(x-.02))/.04;plank.rotation.z=Math.atan(slope);for(const z of [b.z-.83,b.z+.83])cyl('#594d37',x,y+.009,z,.025,.016);if(i%3===0)for(const z of rails)cyl('#98622e',x,y+.52,z,.075,1.14)}
 for(const z of rails){for(const level of [.48,1.04]){const points=[];for(let i=0;i<=b.segments;i++){const x=b.start+i*step;points.push([x,bridgeHeight(x)+level,z])}tube(points,.075,'#ac7637')}
 const stringer=[];for(let i=0;i<=b.segments;i++){const x=b.start+i*step;stringer.push([x,bridgeHeight(x)-.14,z])}tube(stringer,.10,'#79532f');
 for(let i=0;i<b.segments;i+=3){const x=b.start+i*step,x2=x+3*step;beam([x,bridgeHeight(x)+.48,z],[x2,bridgeHeight(x2)+1.04,z],.028,'#876030')}
 for(const x of [b.start+3,b.end-3]){const h=bridgeHeight(x),bottom=-2.14;cyl('#785334',x,(h+bottom)/2,z,.12,h-bottom)}}
}
