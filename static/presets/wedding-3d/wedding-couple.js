import * as T from './vendor/three.module.js';
import {createCharacter} from './character.js';
import {addCharacterHijab} from './character-hijab.js';
import {STAGE} from './wedding-stage.js';

// The same head, body dimensions and articulated joints as the playable guest.
function weddingOutfit(bride) {
  return rig => {
    const {body,head,elbows,material,mesh,ell,line,lathe,patch}=rig;
    const white=material('#fffdf7',.88),satin=material('#f4f2ee',.63);
    const piping=material('#deded8',.8),pearl=material('#fffefb',.36);
    const green=material('#5a7952');
    const remove=[];
    body.traverse(o=>{
      if(!o.isMesh)return;
      if([rig.batik,rig.trousers].includes(o.material))o.material=white;
      if([rig.seam,rig.trim,rig.darkTrim].includes(o.material))o.material=piping;
      if(o.material===rig.button)o.material=pearl;
      if(/Shirt hem|Button placket|Warm horn button|Folded collar|Collar seam|Chest pocket|Pocket welt|Sleeve piping/.test(o.name))remove.push(o);
      if(bride&&(o.name==='Batik shirt'||/ear/i.test(o.name)||(o.material===rig.hair&&!o.name.includes('brow'))||o.name.includes('hair ridge')))remove.push(o);
      if(/Soft elbow|Forearm/.test(o.name))o.material=white;
    });
    remove.forEach(o=>o.removeFromParent());
    for(let i=0;i<2;i++) {
      const s=i===0?-1:1;
      const cuff=lathe(elbows[i],'White shirt cuff',[[.118,-.215],[.130,-.21],[.130,-.17],[.120,-.16]],satin);
      ell(elbows[i],'Pearl cuff button',pearl,s*.115,-.185,.052,.018,.018,.014);
    }
    if(!bride) {
      const shirt=patch(body,'Ivory shirt front',[[-.14,1.62],[.14,1.62],[.15,1.26],[0,1.10],[-.15,1.26]],satin);shirt.position.z=.334;
      for(const s of [-1,1]) {
        const lapel=patch(body,'White satin notch lapel',[[s*.14,1.62],[s*.28,1.49],[s*.19,1.42],[s*.26,1.37],[s*.045,1.12]],satin);lapel.position.z=.350;
        line(body,'Tailored lapel edge',[[s*.145,1.60,.365],[s*.195,1.42,.370],[s*.045,1.12,.365]],.007,piping);
        line(body,'Jacket pocket welt',[[s*.14,1.04,.342],[s*.31,1.06,.327]],.013,satin);
        const bow=ell(body,'Ivory bow tie',satin,s*.066,1.57,.390,.078,.046,.029);bow.rotation.z=s*.23;
      }
      ell(body,'Bow tie knot',pearl,0,1.57,.415,.030,.032,.025);
      for(const y of [1.18,1.02,.88])ell(body,'Pearl jacket button',pearl,.022,y,.352,.018,.018,.014);
      // A small white rose and leaves pinned to the left lapel.
      ell(body,'Boutonniere leaf',green,-.27,1.38,.375,.032,.073,.017).rotation.z=-.4;
      for(let n=0;n<5;n++){const a=n*Math.PI*2/5;ell(body,'White rose petal',white,-.25+Math.cos(a)*.032,1.42+Math.sin(a)*.030,.400,.032,.027,.019);}
      ell(body,'Rose centre',pearl,-.25,1.42,.42,.022,.022,.015);
      return;
    }
    // An opaque, fully covering gown with rounded gathered folds and a fitted waist.
    const profile=[[0,.025],[.62,.025],[.72,.045],[.73,.09],[.70,.23],[.60,.53],[.46,.88],[.35,1.12],[.37,1.42],[.29,1.57],[0,1.59]];
    const gown=lathe(body,'White flowing wedding gown',profile,white,.72);
    const gp=gown.geometry.attributes.position;
    for(let i=0;i<gp.count;i++){
      const x=gp.getX(i),y=gp.getY(i),z=gp.getZ(i),a=Math.atan2(z,x);
      const gather=1+.025*Math.cos(a*12)*Math.max(0,1-y/1.16);
      gp.setXYZ(i,x*gather,y,z*gather);
    }
    gown.geometry.computeVertexNormals();
    lathe(body,'Satin gown waistband',[[.355,1.085],[.365,1.10],[.365,1.15],[.358,1.165]],satin,.76);
    lathe(body,'Rounded embroidered dress hem',[[.700,.042],[.734,.055],[.738,.078],[.723,.097]],satin,.72);
    for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2;
      ell(body,'Pearl hem embroidery',pearl,Math.sin(a)*.738,.12,Math.cos(a)*.529,.012,.017,.012);
    }
    addCharacterHijab(rig,{white,satin,pearl});
  };
}

export function createWeddingCouple({detail="full"}={}) {
  const root=new T.Group();root.name='Welcoming newlyweds';
  const groom=createCharacter({detail,customize:weddingOutfit(false)});
  const bride=createCharacter({detail,customize:weddingOutfit(true)});
  const people=[groom,bride];
  people.forEach((rig,i)=>{
    rig.root.name=i?'Bride in white gown and hijab':'Groom in white suit';
    rig.root.position.set(i?1.20:-1.20,STAGE.height+.04,STAGE.coupleZ);
    root.add(rig.root);
  });
  const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x)};
  let greetingStart=-100;
  function update(time,guestPosition) {
    people.forEach((rig,i)=>{
      const t=time+i*1.7,cycle=t%9;
      // Ease into a brief two-hand cheer between long, relaxed greetings.
      const response=smooth((time-greetingStart)/.4)*(1-smooth((time-greetingStart-3.7)/.9));
      const cheer=Math.max(response,smooth((cycle-5.1)/.6)*(1-smooth((cycle-7.15)/.8)));
      const sway=Math.sin(t*1.6);
      rig.body.position.set(0,.008+.014*(1+Math.sin(t*2.8))*cheer,0);
      rig.body.rotation.set(-.014*cheer,.018*sway,.010*sway);
      for(let a=0;a<2;a++){
        const side=a===0?-1:1,outer=a===i;
        const raise=outer?1:cheer;
        rig.arms[a].rotation.set(-.12*raise,0,side*(.12+1.65*raise+.10*Math.sin(t*5.1)*raise));
        rig.elbows[a].rotation.set(-.25*raise,0,side*(.48*raise));
        rig.wrists[a].rotation.set(.07*Math.sin(t*4.4)*raise,0,.24*Math.sin(t*7.1+a)*raise);
      }
      // Subtle gaze toward nearby guests, constrained to a forward welcome pose.
      let look=0;
      if(guestPosition&&guestPosition.z>rig.root.position.z){
        const dx=guestPosition.x-rig.root.position.x,dz=guestPosition.z-rig.root.position.z;
        if(Math.hypot(dx,dz)<12)look=T.MathUtils.clamp(Math.atan2(dx,dz),response>0?-.55:-.30,response>0?.55:.30);
      }
      rig.head.rotation.set(.022*Math.sin(t*2.1)-.025*cheer,look+.035*Math.sin(t*.7),-.025*sway);
      const blink=t%4.9,lid=1-.955*Math.max(0,1-Math.abs(blink-3.6)/.12);
      rig.eyes.forEach(eye=>eye.scale.y=lid);
    });
  }
  update(0);
  return {root,people,center:new T.Vector3(0,STAGE.height+.04,STAGE.coupleZ),update,greet(time){greetingStart=time;},blocks(x,z){return people.some(({root})=>Math.hypot(x-root.position.x,(z-root.position.z)*1.15)<.95)}};
}
