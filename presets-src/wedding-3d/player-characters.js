import {createCharacter} from './character.js';
import {createFemaleCharacter} from './female-character.js';
import {suit} from './guest-character.js';
import {addCharacterHijab} from './character-hijab.js';

export function createPinkHijabCharacter({detail='full'}={}){
  const rig=createFemaleCharacter({detail,customize(rig){
    const remove=[];
    rig.head.traverse(o=>{
      if(o.isMesh&&(/ear|bun|swept hair|hair part|hair end|hair ridge|hair detail|temple strand/i.test(o.name)||(o.material===rig.hair&&!/brow/.test(o.name))))remove.push(o);
    });
    remove.forEach(o=>o.removeFromParent());
    addCharacterHijab(rig,{
      white:rig.material('#dc97b2',.88),
      satin:rig.material('#efbed0',.72),
      pearl:rig.material('#fff2df',.4)
    });
  }});
  rig.root.name='Wanita 1 — pink kebaya and hijab';
  return rig;
}

// Dress the original player rig before batching, keeping the same face and animation.
export function createPeciCharacter({detail='full'}={}){
  const rig=createCharacter({detail,customize(rig){
    suit(rig,{color:'#202127',accent:'#39343c'});
    const {head,hair,material,lathe}=rig,remove=[];
    head.traverse(o=>{
      if(o.isMesh&&((o.material===hair&&!/underlayer|brow/.test(o.name))||/hair ridge/.test(o.name)))remove.push(o);
    });
    remove.forEach(o=>o.removeFromParent());
    const velvet=material('#15161b',.95),band=material('#282930',.86);
    // A brimless, softly rounded oval peci; its flat crown covers the scalp.
    function cap(name,profile,mat){
      const o=lathe(head,name,profile,mat,.94),p=o.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);
        if(r>.001){p.setX(i,Math.sign(x)*Math.pow(Math.abs(x/r),.82)*r);p.setZ(i,Math.sign(z)*Math.pow(Math.abs(z/r),.82)*r);}
      }
      o.geometry.computeVertexNormals();return o;
    }
    cap('Black velvet peci',[[0,.36],[.80,.36],[.838,.38],[.842,.42],[.795,.94],[.777,.97],[0,.97]],velvet);
    cap('Subtle woven peci band',[[.837,.385],[.846,.394],[.844,.439],[.838,.446]],band);
  }});
  rig.root.name='Pria 2 — black suit and peci';
  return rig;
}

export function createSanggulCharacter({detail='full'}={}){
  const rig=createFemaleCharacter({detail,palette:{main:'#86a695',skirt:'#506f65',silk:'#bdd0b4',thread:'#e6dbba',gold:'#c6a466'},customize(rig){
    const {head,hair,material,ell,line}=rig,remove=[];
    head.traverse(o=>{if(/Neatly tied black bun|Rolled bun centre|Rose bun tie|Coiled bun detail/.test(o.name))remove.push(o);});
    remove.forEach(o=>o.removeFromParent());
    ell(head,'Low oval traditional sanggul',hair,0,.10,-.76,.51,.32,.31);
    ell(head,'Soft rolled sanggul centre',hair,0,.11,-.99,.35,.23,.13);
    const strand=material('#343139',.9),gold=material('#c6a466',.48),pearl=material('#fff3dd',.42);
    for(let i=0;i<4;i++){
      const points=[];
      for(let k=0;k<=24;k++){
        const a=k/24*Math.PI*2,rx=.17+i*.072,ry=.10+i*.048,x=Math.cos(a)*rx,y=.11+Math.sin(a)*ry;
        const outside=1-(x/.51)**2-((y-.10)/.32)**2,inside=1-(x/.35)**2-((y-.11)/.23)**2;
        points.push([x,y,Math.min(-.76-.31*Math.sqrt(Math.max(0,outside)),inside>0?-.99-.13*Math.sqrt(inside):0)-.005]);
      }
      line(head,'Coiled low sanggul strand',points,.006,strand);
    }
    line(head,'Gold sanggul hairpin',[[-.38,.19,-.86],[-.49,.30,-.79],[-.54,.41,-.73]],.016,gold);
    for(let k=0;k<5;k++){
      const a=k*Math.PI*2/5;
      ell(head,'Hairpin jasmine petal',pearl,-.54+Math.cos(a)*.054,.42+Math.sin(a)*.054,-.745,.040,.048,.023);
    }
    ell(head,'Hairpin flower centre',gold,-.54,.42,-.771,.028,.028,.021);
  }});
  rig.root.name='Wanita 2 — sage kebaya and sanggul';
  return rig;
}
