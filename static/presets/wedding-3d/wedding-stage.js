// The visible stage, stair treads, movement and venue anchors share these dimensions.
export const STAGE={halfWidth:5.2,front:-14,back:-19.6,height:1.5,coupleZ:-17.25,archZ:-18.35,archHalfWidth:3.55,stairs:{outer:8.6,z:-15.7,halfWidth:1.3,steps:8}};
export function stageHeightAt(x,z){
  const s=STAGE,a=Math.abs(x);
  if(a<=s.halfWidth&&z>=s.back&&z<=s.front)return s.height;
  if(a>=s.halfWidth&&a<=s.stairs.outer&&Math.abs(z-s.stairs.z)<=s.stairs.halfWidth){
    const tread=(s.stairs.outer-s.halfWidth)/s.stairs.steps;
    return Math.min(s.stairs.steps,Math.max(1,Math.ceil((s.stairs.outer-a)/tread)))*s.height/s.stairs.steps;
  }
  return null;
}
export function stageCanMove(x,z,nextX,nextZ){
  const from=stageHeightAt(x,z),to=stageHeightAt(nextX,nextZ);
  // Ground level approaches are confined to the low end of each staircase.
  // Tall faces and unguarded drops cannot be crossed as though they were flat lawn.
  return Math.abs((to??0)-(from??0))<=STAGE.height/STAGE.stairs.steps+.015;
}
export function stageBlocks(x,z){
  const s=STAGE,a=Math.abs(x),stairSide=Math.abs(z-s.stairs.z);
  if(a>=s.halfWidth-.15&&a<=s.stairs.outer+.12&&stairSide>s.stairs.halfWidth-.24&&stairSide<s.stairs.halfWidth+.2)return true;
  if(a<=s.halfWidth+.12&&z>=s.back-.12&&z<s.back+.33)return true;
  if(Math.abs(a-s.halfWidth)<.25&&z>=s.back&&z<=s.front&&stairSide>s.stairs.halfWidth-.24)return true;
  if(z>s.archZ-.4&&z<s.archZ+.42&&Math.abs(a-s.archHalfWidth)<.62)return true;
  return [1,-1].some(side=>Math.hypot(x-side*4.38,z+18.85)<.65);
}
export function createWeddingStage({box,cyl,beam,bouquet}){
  const s=STAGE,depth=s.front-s.back,center=(s.front+s.back)/2;
  box('#c7b38e',0,.68,center,s.halfWidth*2,1.36,depth);
  box('#f2e5cc',0,1.40,center,s.halfWidth*2,.20,depth);
  // Framed floor with a quiet blush centre, leaving room beside the newlyweds.
  box('#dfcba2',0,1.501,center,9.98,.008,depth-.34);
  box('#fff1d8',0,1.510,center,9.70,.012,depth-.58);
  box('#e7c5b7',0,1.519,-16.6,3.3,.006,4.05);
  for(const x of [-1.58,1.58])box('#e4c783',x,1.524,-16.6,.035,.004,4.0);
  // Draped front fascia and gold edging are kept below the walkable deck.
  box('#b79b60',0,1.30,s.front+.025,10.34,.055,.06);
  box('#b79b60',0,.13,s.front+.025,10.34,.07,.06);
  for(let i=0;i<24;i++)cyl(i%2?'#fff1d8':'#e7d9bb',-4.95+i*.43,.70,s.front+.03,.075,1.05);
  for(const x of [-4.38,4.38]){
    cyl('#d8c6a4',x,1.64,-18.85,.31,.27);cyl('#fff1d8',x,1.97,-18.85,.23,.45);bouquet(x,2.2,-18.85,.60);
  }
  // Back and side balustrades frame the platform without closing stair entrances.
  const railY=s.height+.98;
  beam([-s.halfWidth,railY,s.back],[s.halfWidth,railY,s.back],.055,'#b79b60');
  for(let x=-s.halfWidth;x<=s.halfWidth+.01;x+=1.3)cyl('#eee0b9',x,s.height+.48,s.back,.045,.96);
  for(const side of [-1,1]){
    const x=side*s.halfWidth;
    for(const [a,b] of [[s.back,s.stairs.z-s.stairs.halfWidth],[s.stairs.z+s.stairs.halfWidth,s.front]]){
      beam([x,railY,a],[x,railY,b],.055,'#b79b60');
      const count=Math.max(1,Math.ceil((b-a)/.8));for(let i=0;i<=count;i++)cyl('#eee0b9',x,s.height+.48,a+(b-a)*i/count,.045,.96);
    }
    const tread=(s.stairs.outer-s.halfWidth)/s.stairs.steps,rise=s.height/s.stairs.steps;
    for(let i=0;i<s.stairs.steps;i++){
      const height=(i+1)*rise,xx=side*(s.stairs.outer-(i+.5)*tread);
      box(i%2?'#e7d9bb':'#f2e5cc',xx,height/2,s.stairs.z,tread+.006,height,s.stairs.halfWidth*2);
      box('#b79b60',side*(s.stairs.outer-i*tread-.045),height+.003,s.stairs.z,.045,.007,s.stairs.halfWidth*2-.14);
    }
    for(const edge of [-1,1]){
      const z=s.stairs.z+edge*(s.stairs.halfWidth-.08);
      beam([side*(s.stairs.outer-.08),rise+.95,z],[side*s.halfWidth,s.height+.95,z],.05,'#b79b60');
      for(let i=0;i<=4;i++){const d=i/4*(s.stairs.outer-s.halfWidth),xx=side*(s.stairs.outer-d),height=stageHeightAt(xx,s.stairs.z),hand=rise+.95+(s.height-rise)*i/4;cyl('#eee0b9',xx,(height+hand)/2,z,.046,hand-height);}
    }
  }
  return {heightAt:stageHeightAt,canMove:stageCanMove,blocks:stageBlocks};
}
