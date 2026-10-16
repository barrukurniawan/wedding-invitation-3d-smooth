import * as T from './vendor/three.module.js';
import {createCharacter} from './character.js';

export function createFemaleCharacter({detail="full",palette={},customize}={}) {
  const rig=createCharacter({detail,customize(rig){
    const {body,head,elbows,knees,feet,material,mesh,ell,line,lathe,skin,hair}=rig;
    const pink=material(palette.main||'#d982a2',.86),rose=material(palette.skirt||'#ba6689',.9);
    const silk=material(palette.silk||'#ebadc0',.72),thread=material(palette.thread||'#f6c7d4',.78);
    const gold=material(palette.gold||'#c5aa79',.45),pearl=material('#fff2df',.36);
    const remove=[];
    body.traverse(o=>{
      if(!o.isMesh)return;
      if(/Batik shirt|Shirt hem|Button placket|Warm horn button|Folded collar|Collar seam|Chest pocket|Pocket welt|Sleeve piping|trouser|Trouser|Rounded knee|loafer|Loafer|Toe stitching/.test(o.name))remove.push(o);
      if((o.material===hair&&!/underlayer|brow/.test(o.name))||o.name.includes('hair ridge'))remove.push(o);
      if(o.material===rig.batik||/Soft elbow|Forearm/.test(o.name))o.material=pink;
      if(o.name==='Black sole'){o.name='Champagne party sandal sole';o.material=gold;}
    });
    remove.forEach(o=>o.removeFromParent());

    // An ankle-length kain beneath the longer, fitted kebaya top.
    const skirt=lathe(body,'Rose pink ankle-length kain',[[0,.255],[.43,.255],[.48,.28],[.49,.36],[.46,.61],[.405,.89],[.34,1.00],[0,1.00]],rose,.77);
    const p=skirt.geometry.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),f=1+.022*Math.cos(a*14);p.setXYZ(i,x*f,y,z*f);}
    skirt.geometry.computeVertexNormals();
    lathe(body,'Long pink kebaya',[[0,.49],[.43,.49],[.46,.53],[.45,.66],[.38,.92],[.345,1.10],[.385,1.40],[.31,1.55],[.155,1.63],[0,1.63]],pink,.83);
    for(const s of [-1,1]){
      line(body,'Kebaya front embroidered edge',[[s*.14,1.62,.14],[s*.20,1.48,.30],[s*.045,1.17,.309],[s*.045,.94,.335],[s*.16,.66,.366],[s*.29,.50,.296]],.015,thread);
      line(body,'Scalloped kebaya hem',[[s*.045,.53,.372],[s*.13,.51,.363],[s*.23,.52,.334],[s*.32,.51,.283],[s*.41,.54,.20]],.013,silk);
      // Embroidered flowers taper down the two front panels.
      for(let n=0;n<4;n++){
        const y=.67+n*.18,x=s*(.26-n*.018),z=y<1?.338:.294;
        for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ell(body,'Kebaya floral embroidery',thread,x+Math.cos(a)*.022,y+Math.sin(a)*.024,z,.014,.019,.006);}
        ell(body,'Embroidered flower centre',gold,x,y,z+.009,.009,.009,.006);
      }
    }
    for(const y of [1.20,1.04,.88])ell(body,'Pearl kebaya fastening',pearl,0,y,.337,.017,.017,.012);
    for(let i=0;i<2;i++){
      const s=i===0?-1:1;
      lathe(elbows[i],'Lace kebaya sleeve cuff',[[.119,-.219],[.131,-.212],[.130,-.156],[.12,-.146]],silk);
      for(let n=0;n<6;n++){const a=n/6*Math.PI*2;ell(elbows[i],'Cuff pearl',pearl,Math.sin(a)*.132,-.185,Math.cos(a)*.132,.008,.012,.008);}
      lathe(knees[i],'Bare ankle',[[0,-.335],[.095,-.335],[.103,-.12],[.11,.03],[0,.04]],skin);
      ell(feet[i],'Open sandal foot',skin,0,-.021,.10,.154,.078,.224);
      ell(feet[i],'Rounded ankle',skin,0,.048,-.012,.099,.115,.10);
      line(feet[i],'Front satin sandal strap',[[-.151,-.034,.216],[-.108,.042,.237],[0,.057,.249],[.108,.042,.237],[.151,-.034,.216]],.024,gold);
      line(feet[i],'Diagonal party sandal strap',[[-.135,-.026,.06],[-.081,.068,.11],[.01,.069,.164],[.129,.016,.202]],.020,gold);
      const strap=mesh(feet[i],'Sandal ankle strap',new T.TorusGeometry(.108,.015,6,28),gold);strap.rotation.x=Math.PI/2;strap.position.set(0,.075,-.011);
      ell(feet[i],'Sandal pearl buckle',pearl,s*.111,.075,.014,.019,.019,.014);
      ell(head,'Pearl stud earring',pearl,s*.819,-.211,.093,.040,.045,.024);
    }

    // Close-fitting swept hair, tied into a soft bun at the back of the crown.
    ell(head,'Neatly tied black bun',hair,0,.79,-.61,.39,.36,.34);
    ell(head,'Rolled bun centre',hair,.01,.80,-.86,.28,.26,.15);
    const tie=mesh(head,'Rose bun tie',new T.TorusGeometry(.28,.025,8,40),silk);tie.position.set(0,.72,-.59);tie.rotation.x=.42;
    const strands=material('#343139',.88);
    for(const s of [-1,1]){
      line(head,'Smooth side swept hair',[[s*.05,.81,.27],[s*.29,.69,.60],[s*.52,.47,.69],[s*.69,.20,.56]],.10,hair);
      ell(head,'Rounded swept hair end',hair,s*.69,.20,.56,.10,.10,.10);
      ell(head,'Rounded swept hair part',hair,s*.05,.81,.27,.10,.10,.10);
      for(let i=0;i<3;i++)line(head,'Combed hair detail',[[s*(.04+i*.035),.825,.23],[s*(.31+i*.055),.71,.52-i*.08],[s*(.62+i*.035),.41,.51-i*.07],[s*.77,.09,.25-i*.11]],.007,strands);
      line(head,'Neat temple strand',[[s*.69,.28,.45],[s*.77,.10,.32],[s*.76,-.09,.20]],.055,hair);
    }
    for(let i=0;i<5;i++){
      const points=[];for(let k=0;k<=16;k++){
        const a=k/16*Math.PI*1.6,x=Math.sin(a)*(.15+i*.035),y=.80+Math.cos(a)*(.16+i*.036);
        const back=-.61-.34*Math.sqrt(Math.max(0,1-(x/.39)**2-((y-.79)/.36)**2));
        const inner=1-((x-.01)/.28)**2-((y-.80)/.26)**2;
        const rolled=inner>0?-.86-.15*Math.sqrt(inner):back;
        points.push([x,y,Math.min(back,rolled)-.004]);
      }
      line(head,'Coiled bun detail',points,.006,strands);
    }
    customize?.(rig);
  }});
  rig.root.name='Pink kebaya garden guest';
  return rig;
}
