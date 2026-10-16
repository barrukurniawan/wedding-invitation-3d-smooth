import * as T from './vendor/three.module.js';
import {groundBoundary,decorateGroundGeometry} from './ground-surface.js';
import {lagoonGroundHeight,lagoonDistance,lagoonSandBlend} from './lagoon.js';

export const SEA_LEVEL=-1.10;
const TAU=Math.PI*2;

// A softly irregular superellipse leaves a generous beach around every garden corner.
// The water shader uses the same outline, so its shallows and foam follow the sand.
export function coastRadius(a){
  return Math.pow(Math.pow(Math.abs(Math.cos(a))/43,4)+Math.pow(Math.abs(Math.sin(a))/32,4),-.25)
    *(1+.022*Math.sin(a*3+.5)+.027*Math.sin(a*5-1.2)+.009*Math.sin(a*9));
}
function gardenRadius(a){return Math.min(30/Math.max(.00001,Math.abs(Math.cos(a))),20/Math.max(.00001,Math.abs(Math.sin(a))));}
export const LAWN_LEVEL=-.009;
const baseRings=[[0,LAWN_LEVEL],[.12,-.09],[.25,-.17],[.43,-.25],[.66,-.44],[.83,-.69],[.94,-.93],[1,SEA_LEVEL],[1.08,-1.85]];
const rings=baseRings.flatMap((r,i)=>i===baseRings.length-1?[r]:[r,[(r[0]+baseRings[i+1][0])/2,(r[1]+baseRings[i+1][1])/2]]);
export function beachHeight(x,z){
  const a=Math.atan2(z,x),inside=gardenRadius(a),f=(Math.hypot(x,z)-inside)/(coastRadius(a)-inside);
  if(f<=0)return rings[0][1];
  for(let i=1;i<rings.length;i++)if(f<=rings[i][0])return T.MathUtils.lerp(rings[i-1][1],rings[i][1],(f-rings[i-1][0])/(rings[i][0]-rings[i-1][0]));
  return rings.at(-1)[1];
}

// The boundary follows the visible shore, with room for the character's feet.
export function insideIsland(x,z){return Math.hypot(x,z)<=coastRadius(Math.atan2(z,x))-.65;}
export function islandSurfaceHeight(x,z){return lagoonGroundHeight(x,z,Math.abs(x)<=30&&Math.abs(z)<=20?LAWN_LEVEL:beachHeight(x,z));}

export function createIsland({scene,surfaces,mobile=false}){
  // An independent seed preserves the established garden's planting and venues.
  let seed=10987;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+(b-a)*random();
  const material=(name,options={})=>{const m=new T.MeshStandardMaterial({roughness:.95,vertexColors:true,...options});m.name=name;m.userData.batchable=true;return m;};
  const sandMat=surfaces.groundMaterial,boundary=groundBoundary(mobile);
  const segments=boundary.length-1,positions=[],indices=[];
  for(let j=0;j<rings.length;j++)for(let i=0;i<=segments;i++){
    const [bx,bz]=boundary[i],a=Math.atan2(bz,bx),[f,y]=rings[j],inner=Math.hypot(bx,bz),radius=T.MathUtils.lerp(inner,coastRadius(a),f),x=j===0?bx:Math.cos(a)*radius,z=j===0?bz:Math.sin(a)*radius;
    positions.push(x,lagoonGroundHeight(x,z,y),z);
    if(j<rings.length-1&&i<segments){const k=j*(segments+1)+i,n=k+segments+1;indices.push(k,k+1,n,k+1,n+1,n);}
  }
  const beachGeometry=new T.BufferGeometry();beachGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));beachGeometry.setIndex(indices);beachGeometry.computeVertexNormals();decorateGroundGeometry(beachGeometry);
  const beach=new T.Mesh(beachGeometry,sandMat);beach.name='Continuous sloping island beach';beach.receiveShadow=true;scene.add(beach);

  const trunkMat=material('Ringed coconut palm trunks');
  const frondMat=material('Two-tone coconut palm fronds',{side:T.DoubleSide});
  const rockMat=material('Smooth granite coastal rocks');
  const coconutMat=material('Golden green coconuts');
  const grassMat=material('Sparse dune grass',{side:T.DoubleSide});
  function tint(g,base,amount=.15){
    g.computeBoundingBox();const p=g.attributes.position,b=g.boundingBox,cs=[],baseColor=new T.Color(base);
    for(let i=0;i<p.count;i++){
      const t=(p.getY(i)-b.min.y)/Math.max(.01,b.max.y-b.min.y),c=baseColor.clone().multiplyScalar(1-amount+t*amount*1.6+.025*Math.sin(p.getX(i)*7+p.getZ(i)*3));cs.push(c.r,c.g,c.b);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(cs,3));return g;
  }
  function add(g,mat,x=0,y=0,z=0){const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  function frondGeometry(root,angle,length,lift){
    const pos=[],col=[],dir=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new T.Vector3(-Math.sin(angle),0,Math.cos(angle));
    const point=t=>root.clone().addScaledVector(dir,t*length).add(new T.Vector3(0,Math.sin(t*Math.PI)*lift-t*t*length*.43,0));
    const dark=new T.Color('#377348'),light=new T.Color('#79a44c');
    function triangle(a,b,c,tone){for(const v of [a,b,c]){pos.push(...v.toArray());col.push(tone.r,tone.g,tone.b);}}
    // Paired broad leaflets have a small gap and a raised central fold, like a cartoon coconut frond.
    for(let j=0;j<11;j++){
      const t=.035+j*.083,base=point(t),next=point(Math.min(1,t+.09));
      triangle(base.clone().addScaledVector(side,-.025),base.clone().addScaledVector(side,.025),next,light);
      for(const sign of [-1,1]){
        const width=Math.sin(Math.PI*(t*.88+.055))**.72*length*.23;
        const tip=point(Math.min(1,t+.19)).addScaledVector(side,sign*width);tip.y-=width*.21;
        const ridge=base.clone().lerp(tip,.55);ridge.y+=.065;
        const heel=point(Math.min(1,t+.066));
        triangle(base,ridge,heel,sign<0?dark:light);triangle(ridge,tip,heel,sign<0?light:dark);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
  }
  const coconutGeo=tint(new T.IcosahedronGeometry(1,1),'#969044');
  const palms=[];
  // Clear the entrance sightline; groves sit along the sides and in four beach coves.
  const palmSites=[[-35.2,12.5],[-34.6,17.8],[-34.8,-9],[-35.5,-15],[-23.5,-25.8],[-18,-26.6],[2,-26.5],[8,-26.8],[29.8,-23.3],[34.1,-17],[36,1.4],[35.3,8],[30.4,22.5],[25.7,25.5],[-24,26],[-18.5,26.8]];
  for(const [x,z] of palmSites){
    const y=beachHeight(x,z),height=range(5.5,7.8),angle=Math.atan2(z,x)+range(-.7,.7),lean=range(.9,1.9),dx=Math.cos(angle)*lean,dz=Math.sin(angle)*lean;
    const curve=new T.CatmullRomCurve3([new T.Vector3(x,y,z),new T.Vector3(x+dx*.12,y+height*.34,z+dz*.12),new T.Vector3(x+dx*.45,y+height*.7,z+dz*.45),new T.Vector3(x+dx,y+height,z+dz)]);
    const trunk=new T.TubeGeometry(curve,16,.22,7,false),p=trunk.attributes.position;
    // Taper each cross-section and emboss the familiar coconut trunk rings in the geometry.
    for(let j=0;j<=16;j++){
      const center=curve.getPointAt(j/16),taper=1.20-j/16*.49+(j%2===0?.08:0);
      for(let k=0;k<=7;k++){const index=j*8+k,v=new T.Vector3().fromBufferAttribute(p,index).sub(center).multiplyScalar(taper).add(center);p.setXYZ(index,v.x,v.y,v.z);}
    }
    trunk.computeVertexNormals();tint(trunk,'#ab8960',.2);
    const trunkColors=trunk.attributes.color;
    for(let j=0;j<=16;j++)for(let k=0;k<=7;k++){const i=j*8+k,f=j%2===0?.83:1;trunkColors.setXYZ(i,trunkColors.getX(i)*f,trunkColors.getY(i)*f,trunkColors.getZ(i)*f);}
    add(trunk,trunkMat);const top=curve.getPoint(1);
    for(let j=0;j<8;j++)add(frondGeometry(top,j*TAU/8+angle,range(2.65,3.55),range(.58,1.04)),frondMat);
    for(let j=0;j<3;j++){const a=j*TAU/3;const coconut=add(coconutGeo,coconutMat,top.x+Math.cos(a)*.24,top.y-.23,top.z+Math.sin(a)*.24);coconut.scale.set(.23,.29,.23);}
    palms.push({x,z,height,ground:y,radius:.70});
  }

  const rockGeo=tint(new T.SphereGeometry(1,10,7),'#9b9c91',.19),rockPositions=rockGeo.attributes.position;
  for(let i=0;i<rockPositions.count;i++){const x=rockPositions.getX(i),y=rockPositions.getY(i),z=rockPositions.getZ(i),f=1+.065*Math.sin(x*7+z*5)*Math.cos(y*4);rockPositions.setXYZ(i,x*f,y*f,z*f);}
  rockGeo.computeVertexNormals();
  const rocks=[];
  for(const a of [.11,.58,1.05,2.10,2.69,3.13,3.65,4.13,4.99,5.55]){
    const radius=coastRadius(a)-range(.9,2.1),x=Math.cos(a)*radius,z=Math.sin(a)*radius;
    for(let i=0;i<5;i++){
      const xx=x+range(-1.6,1.6),zz=z+range(-1.4,1.4),r=i===0?range(1.15,1.65):range(.35,.85),ground=beachHeight(xx,zz),yy=Math.max(ground,-1.45)+r*.34;
      const rock=add(rockGeo,rockMat,xx,yy,zz);rock.scale.set(r,r*range(.52,.8),r*range(.72,1.15));rock.rotation.set(range(-.2,.2),range(0,TAU),range(-.16,.16));if(lagoonDistance(xx,zz)<r+1.3){rock.removeFromParent();continue;}rocks.push({x:xx,z:zz,radius:Math.max(rock.scale.x,rock.scale.z)*1.07+.34});
    }
  }
  // Sparse, low-cost grass at the back of the dunes connects the lawn and the sand.
  const grassPos=[],grassColors=[];
  for(let i=0;i<115;i++){
    const a=random()*TAU,inner=gardenRadius(a),r=T.MathUtils.lerp(inner,coastRadius(a),range(.10,.25)),x=Math.cos(a)*r,z=Math.sin(a)*r;
    if((Math.abs(x)<4&&z>0)||lagoonSandBlend(x,z)>.05)continue;
    const y=beachHeight(x,z);
    for(let j=0;j<4;j++){
      const angle=range(0,TAU),h=range(.16,.39),w=.055,c=new T.Color(j%2?'#9fa566':'#7c8c4b'),dx=Math.cos(angle)*w,dz=Math.sin(angle)*w;
      grassPos.push(x-dx,y,z-dz,x+dx,y,z+dz,x+Math.sin(angle)*h*.3,y+h,z+Math.cos(angle)*h*.3);
      for(let k=0;k<3;k++)grassColors.push(c.r,c.g,c.b);
    }
  }
  const grassGeometry=new T.BufferGeometry();grassGeometry.setAttribute('position',new T.Float32BufferAttribute(grassPos,3));grassGeometry.setAttribute('color',new T.Float32BufferAttribute(grassColors,3));grassGeometry.computeVertexNormals();add(grassGeometry,grassMat).castShadow=false;

  // One ocean draw, no render targets, reflection passes or per-frame geometry work.
  const oceanMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},shallow:{value:new T.Color('#65c9c6')},lagoon:{value:new T.Color('#289db8')},deep:{value:new T.Color('#16739e')},horizon:{value:new T.Color('#acd2eb')},sunDirection:{value:new T.Vector3(-28,23,18).normalize()}},vertexShader:`
    varying vec3 vWorld;
    void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}
  `,fragmentShader:`
    uniform float time;uniform vec3 shallow;uniform vec3 lagoon;uniform vec3 deep;uniform vec3 horizon;uniform vec3 sunDirection;
    varying vec3 vWorld;
    float coast(float a){vec2 d=abs(vec2(cos(a),sin(a)))/vec2(43.,32.);return pow(dot(d*d,d*d),-.25)*(1.+.022*sin(a*3.+.5)+.027*sin(a*5.-1.2)+.009*sin(a*9.));}
    float smin(float a,float b){float h=max(1.2-abs(a-b),0.)/1.2;return min(a,b)-h*h*.3;}
    float inlet(vec2 p,vec3 a,vec3 b){vec2 v=b.xy-a.xy;float t=clamp(dot(p-a.xy,v)/dot(v,v),0.,1.);return length(p-a.xy-v*t)-mix(a.z,b.z,t);}
    float lagoonEdge(vec2 p){
      if(p.x> -8.||p.y< -8.||p.y>17.)return 20.;
      float d=(length((p-vec2(-18.2,7.8))/vec2(6.5,4.2))-1.)*4.2;
      d+=.12*sin(p.x*.83+p.y*.62)*cos(p.y*.7);
      d=smin(d,inlet(p,vec3(-23.4,4.8,1.5),vec3(-30.,1.3,1.65)));
      d=smin(d,inlet(p,vec3(-30.,1.3,1.65),vec3(-39.,1.,2.1)));
      return smin(d,inlet(p,vec3(-39.,1.,2.1),vec3(-50.,-.5,3.3)));
    }
    void main(){
      vec2 p=vWorld.xz;float angle=atan(p.y,p.x),shore=length(p)-coast(angle),viewDistance=length(cameraPosition-vWorld);
      float a=dot(p,vec2(.72,.34))*1.6+time*.70,b=dot(p,vec2(-.25,.91))*2.6-time*.46;
      float detail=1.-smoothstep(45.,150.,viewDistance);
      vec3 n=normalize(vec3((.036*cos(a)+.022*cos(b))*detail,1.,(.028*cos(b)-.024*cos(a))*detail));
      vec3 color=mix(shallow,lagoon,smoothstep(0.,12.,shore));color=mix(color,deep,smoothstep(10.,60.,shore));
      float ripple=sin(a+sin(b)*.35)*.5+.5;color*=1.+(ripple-.5)*.065*detail;
      vec3 view=normalize(cameraPosition-vWorld);float sparkle=pow(max(dot(reflect(-sunDirection,n),view),0.),90.);
      color+=vec3(1.,.78,.46)*sparkle*.24*detail;
      float foamWave=pow(max(0.,sin(shore*3.1+time*.76+sin(angle*17.)*.28)),12.);
      float foam=(1.-smoothstep(.10,.38,abs(shore)))*.45+foamWave*(1.-smoothstep(.6,3.2,shore))*.43;
      foam*=smoothstep(-.15,.15,shore);color=mix(color,vec3(.88,.97,.91),foam);
      float flecks=pow(ripple,24.)*.045*detail*smoothstep(2.,8.,shore);color+=vec3(flecks);
      color=mix(color,horizon,smoothstep(130.,850.,viewDistance));
      float ld=lagoonEdge(p),cove=(1.-smoothstep(0.,2.,ld))*smoothstep(-49.,-44.,p.x);
      vec3 turquoise=mix(vec3(.27,.64,.58),vec3(.025,.39,.43),smoothstep(.0,2.8,-ld));
      turquoise*=1.+(ripple-.5)*.055;
      float lace=(1.-smoothstep(.02,.16,abs(ld+.02)))*(.35+.12*sin(time*.8+p.x*.7));
      turquoise=mix(turquoise,vec3(.83,.94,.85),lace);
      color=mix(color,turquoise,cove*.82);
      gl_FragColor=vec4(color,mix(1.,.80,cove));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `});
  oceanMat.name='Endless blue ocean with shoreline foam';
  const ocean=new T.Mesh(new T.PlaneGeometry(8000,8000),oceanMat);ocean.name='Ocean to the horizon';ocean.rotation.x=-Math.PI/2;ocean.position.y=SEA_LEVEL;ocean.renderOrder=1;scene.add(ocean);
  const beachObstacles=[...palms,...rocks];
  return {ocean,beach,palms,rocks,blocks(x,z){return beachObstacles.some(o=>(x-o.x)**2+(z-o.z)**2<o.radius**2);},update(t){oceanMat.uniforms.time.value=t;}};
}
