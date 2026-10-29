// Crisp, matching outline icons with no image downloads or extra 3D draws.
const paths={
  book:['M12 5.5C9 3.5 5.8 3.5 2.5 4.5v14c3.3-1 6.5-1 9.5 1 3-2 6.2-2 9.5-1v-14c-3.3-1-6.5-1-9.5 1Z','M12 5.5v14','M5.5 8h3.5M5.5 11h3.5M15 8h3.5M15 11h3.5'],
  image:['M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z','M3.5 16.5l5.5-5.5 4 4 3-3 4.5 4.5','M16.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z'],
  calendar:['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z','M7 3v4M17 3v4M3 10h18','M7 14h2M13 14h2M7 17h2M13 17h2'],
  gift:['M3 8h18v4H3ZM5 12v8h14v-8M12 8v12','M12 8H8a2.5 2.5 0 1 1 2.5-2.5L12 8Zm0 0h4a2.5 2.5 0 1 0-2.5-2.5L12 8Z'],
  envelope:['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z','M3 7l9 7 9-7']
};
export function createVenueIcon(name){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(key,value);
  for(const d of paths[name]||paths.envelope){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);}
  return svg;
}
