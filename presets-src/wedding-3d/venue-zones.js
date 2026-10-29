import {STAGE} from './wedding-stage.js';
export const VENUES=[
 {id:'story',place:'pond',location:'Our Story',title:'Our Story',action:'Baca cerita kami',icon:'book',bounds:[-27,1,-9,14],center:[-18,-1.075,7.3],ring:[9,6.3],anchor:[-9.1,3.7,7.3],overviewAnchor:[-18,3.7,7.3]},
 {id:'gallery',place:'pavilion',location:'Gallery',title:'Gallery',action:'Lihat galeri',icon:'image',bounds:[-23.1,-14.6,-12.9,-6.1],center:[-18,.54,-10.5],ring:[5.2,4.3],anchor:[-18,3.8,-5.7],overviewAnchor:[-18,8.6,-12.5]},
 {id:'events',place:'reception',location:'Jadwal Acara',title:'Jadwal Acara',action:'Lihat jadwal acara',icon:'calendar',bounds:[12,-14.7,28,-5],center:[20,.35,-10],ring:[8.1,4.8],anchor:[20,3.8,-4.6],overviewAnchor:[20,8.6,-12.5]},
 {id:'gifts',place:'gazebo',location:'Hadiah',title:'Hadiah',action:'Lihat informasi hadiah',icon:'gift',bounds:[18.4,4.3,25.6,9.7],center:[22,.43,7],ring:[3.8,2.9],anchor:[22,3.8,10.1],overviewAnchor:[22,5.2,7]},
 {id:'wishes',place:'ceremony',location:'Pengantin',title:'Ucapan Bahagia',action:'Kirim ucapan',icon:'envelope',bounds:[-STAGE.halfWidth,STAGE.back,STAGE.halfWidth,STAGE.front],center:[0,STAGE.height+.028,(STAGE.front+STAGE.back)/2],ring:[3.3,1.8],anchor:[0,STAGE.height+4.1,STAGE.front+.7],overviewAnchor:[0,STAGE.height+6,STAGE.coupleZ]}
];
export function findNearbyVenue(x,z){
 let selected=null,best=Infinity;
 for(const venue of VENUES){const [minX,minZ,maxX,maxZ]=venue.bounds,distance=Math.hypot(Math.max(minX-x,0,x-maxX),Math.max(minZ-z,0,z-maxZ));
  const score=distance+Math.hypot(x-venue.center[0],z-venue.center[2])*.001;
  if(distance<=2.3&&score<best){selected=venue;best=score;}
 }
 return selected;
}
