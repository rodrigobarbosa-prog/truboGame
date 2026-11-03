import * as THREE from 'three';
import { START, WINDOW, LEDGE_HEIGHT, ledgeSurfaces, stairSurfaces } from './rules.js';
import { materials, leafMesh } from './materials.js';
import {buildDescent} from './descent-world.js';
import {addHangingSpiders} from './hanging-spiders.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness:0.8, ...extra });
const palette = {
  stone:mat('#c8c2ae'), carpet:null, white:mat('#e4e0d3'), metal:mat('#344247',{metalness:.6,roughness:.4}),
  dark:mat('#253338'), wood:mat('#b09a72'), leaf:mat('#587845'), leafLight:mat('#849b4b'), soil:mat('#382b22'),
  amber:mat('#ca8a47'), edge:mat('#daba64'), glass:mat('#bed8d7',{transparent:true,opacity:.16,roughness:.1,depthWrite:false}),
  green:mat('#aad6a9',{emissive:'#6ab978',emissiveIntensity:.5}), concrete:mat('#8e9a96')
};
function texture(draw, size=512) {
  const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
let seed=12;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function box(group, w,h,d,x,y,z, material=palette.white, shadow=true) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;m.userData.physical=true;group.add(m);return m;
}
function ellipsoid(group, x,y,z, sx,sy,sz,material) {
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;m.userData.physical=true;group.add(m);return m;
}
function cylinder(group, r1,r2,h,x,y,z,material) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,20),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.physical=true;group.add(m);return m;
}
function rod(group,a,b,r, material) {
  const direction=new THREE.Vector3().subVectors(b,a), m=cylinder(group,r,r,direction.length(),0,0,0,material);
  m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return m;
}
function sign(group,text,x,y,z,width=2,color='#cce6c4',bg='#214539') {
  const t=texture((c,s)=>{c.fillStyle=bg;c.fillRect(0,0,s,s);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font='bold 70px Arial';c.fillText(text,s/2,s/2,490);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.35),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);group.add(m);return m;
}
function addSolid(zone, x,z,w,d,bottom,top) { zone.solids.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,bottom,top}); }
function plant(group,x,z,scale=1) {
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);group.add(g);
  cylinder(g,.59,.43,1.05,0,.85,0,palette.white);cylinder(g,.55,.55,.05,0,1.38,0,palette.soil);
  for(let i=0;i<13;i++){
    const a=i*2.399,r=.3+(i%3)*.15,y=1.45+(i%4)*.12;
    const p=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
    rod(g,new THREE.Vector3(0,1.2,0),p,.021,palette.leaf);
    const l=leafMesh(g,p.x,p.y,p.z,.48,.9,a);l.rotation.x=.16;
  }
  return g;
}
function desk(zone,x,z,rotation=0,sharedTop=false) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;zone.group.add(g);
  if(!sharedTop){
    box(g,3.7,.12,1.55,0,1.6,0,materials().table);
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(4.5,3.6),materials().contact);contact.rotation.x=-Math.PI/2;contact.position.set(0,.012,.3);g.add(contact);
    for(const xx of [-1.55,1.55])box(g,.1,1.6,1.3,xx,.8,0,palette.metal);
  }
  // Leave 5 cm between the cabinet and the end support. Their outer faces
  // previously coincided at x=1.6, causing depth fighting while orbiting.
  const cabinetX=sharedTop ? .9 : 1.05;
  box(g,.8,1.34,1.2,cabinetX,.67,0,palette.stone);
  for(const yy of [.25,.7,1.1])box(g,.25,.025,.03,cabinetX,yy,.61,palette.metal);
  box(g,1.25,.77,.08,-.35,2.16,-.4,palette.dark);
  box(g,1.09,.61,.015,-.35,2.16,-.35,new THREE.MeshPhysicalMaterial({color:'#101a20',roughness:.18,metalness:.12,clearcoat:1,clearcoatRoughness:.1}));
  rod(g,new THREE.Vector3(-.35,1.65,-.4),new THREE.Vector3(-.35,1.85,-.4),.05,palette.metal);
  box(g,.55,.04,.32,-.35,1.69,-.4,palette.dark);
  box(g,.85,.03,.3,-.4,1.68,.35,palette.dark);
  cylinder(g,.12,.1,.24,.8,1.79,.3,palette.amber);
  box(g,.75,.16,.72,-.1,.8,1.35,palette.dark);
  box(g,.78,.78,.12,-.1,1.25,1.65,palette.dark);
  cylinder(g,.055,.055,.62,-.1,.4,1.35,palette.metal);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod(g,new THREE.Vector3(-.1,.15,1.35),new THREE.Vector3(-.1+Math.cos(a)*.5,.12,1.35+Math.sin(a)*.5),.025,palette.metal);}
  // Rotate furniture collision boxes with each workstation, including the corner desk.
  const c=Math.cos(rotation),s=Math.sin(rotation);
  function furnitureSolid(lx,lz,w,d,bottom,top){
    addSolid(zone,x+lx*c+lz*s,z-lx*s+lz*c,Math.abs(c)*w+Math.abs(s)*d,Math.abs(s)*w+Math.abs(c)*d,bottom,top);
  }
  if(!sharedTop){furnitureSolid(cabinetX,0,.8,1.2,0,1.34);furnitureSolid(-.1,1.35,.9,.9,0,1.6);}
  return g;
}
function sixSeatTable(area,x,z,rotation=Math.PI/2,postsPerSide=3,tableLength=postsPerSide*3.8){
  const table=new THREE.Group();table.position.set(x,0,z);table.rotation.y=rotation;table.name=`Mesa corrida completa · ${postsPerSide*2} puestos`;area.group.add(table);
  // One uninterrupted top, with the configured workstations on each side.
  box(table,tableLength,.12,3.16,0,1.6,0,materials().table);
  box(table,tableLength-.5,.12,.12,0,1.38,0,palette.metal);
  for(const u of [-tableLength/2+.35,0,tableLength/2-.35]){
    for(const v of [-1.35,1.35])box(table,.11,1.54,.11,u,.77,v,palette.metal);
    box(table,.1,.1,2.8,u,1.35,0,palette.metal);
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(tableLength+.8,4.2),materials().contact);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;table.add(shadow);
  for(let i=0;i<postsPerSide;i++){
    const u=(i-(postsPerSide-1)/2)*tableLength/postsPerSide;
    for(const v of [-.8,.8]){
      const station=desk(area,x+u*Math.cos(rotation)+v*Math.sin(rotation),z-u*Math.sin(rotation)+v*Math.cos(rotation),v>0?rotation:rotation+Math.PI,true);
      station.name=`Mesa corrida · puesto ${i*2+(v>0?2:1)}`;
    }
  }
  return table;
}
function column(group,x,z) {
  const t=texture((c,s)=>{
    const gr=c.createLinearGradient(s*.12,s,s*.75,0);gr.addColorStop(0,'#ad3977');gr.addColorStop(.27,'#d75b88');gr.addColorStop(.5,'#c88874');gr.addColorStop(.68,'#d3c467');gr.addColorStop(.86,'#bcbda7');gr.addColorStop(1,'#c8cdca');c.fillStyle=gr;c.fillRect(0,0,s,s);
    const glow=c.createRadialGradient(s*.51,s*.43,0,s*.51,s*.43,s*.52);glow.addColorStop(0,'#d9d66fb0');glow.addColorStop(1,'#d9d66b00');c.fillStyle=glow;c.fillRect(0,0,s,s);
    c.fillStyle='#d1d3ce';c.beginPath();c.moveTo(0,0);c.lineTo(s,0);c.lineTo(s,s*.14);c.bezierCurveTo(s*.72,s*.06,s*.41,s*.35,0,s*.22);c.closePath();c.fill();
    c.fillStyle='#a74c833b';c.beginPath();c.moveTo(0,s*.68);c.bezierCurveTo(s*.27,s*.7,s*.52,s*.93,s,s);c.lineTo(0,s);c.closePath();c.fill();
  });
  return box(group,1.65,5.4,1.65,x,2.7,z,mat('#ffffff',{map:t}));
}
function arrow(group,x,y,z,rotation=0) {
  const g=new THREE.Group();g.userData.nonPhysical=true;group.add(g);g.position.set(x,y,z);g.rotation.y=rotation;
  box(g,.1,.015,.6,0,0,-.04,palette.green,false);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.009,.6,.23,.009,.22,-.23,.009,.22],3));
  geometry.computeVertexNormals();g.add(new THREE.Mesh(geometry,palette.green));
}
function drop(zone,x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);zone.group.add(g);
  const m=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),mat('#93d9dd',{emissive:'#33858b',emissiveIntensity:.6,metalness:.2,roughness:.1}));m.scale.y=1.5;g.add(m);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.27,.012,8,32),palette.green);ring.rotation.x=Math.PI/2;ring.position.y=-.22;g.add(ring);zone.drops.push({mesh:g,x,y,z,taken:false});
}
function zone(){return {group:new THREE.Group(),surfaces:[],solids:[],drops:[],hazards:[]};}
function coffee(area,x,z,y=0,rx=.65,rz=.5){
  const g=new THREE.Group();g.position.set(x,y+.018,z);g.userData.nonPhysical=true;area.group.add(g);
  const liquid=mat('#362015',{roughness:.18,metalness:.08,transparent:true,opacity:.93});
  for(let i=0;i<5;i++){
    const m=new THREE.Mesh(new THREE.CircleGeometry(1,28),liquid);
    m.rotation.x=-Math.PI/2;m.scale.set(rx*(i? .55:1),rz*(i? .6:1),1);
    m.position.set(i?Math.sin(i*2.4)*rx*.65:0,i*.001,i?Math.cos(i*2.4)*rz*.65:0);g.add(m);
  }
  const rim=new THREE.Mesh(new THREE.RingGeometry(.89,1,32),mat('#9a693d',{transparent:true,opacity:.6}));rim.rotation.x=-Math.PI/2;rim.scale.set(rx,rz,1);g.add(rim);
  area.hazards.push({kind:'coffee',mesh:g,x,z,y,rx:rx*1.2,rz:rz*1.2});
}
function largeCoffeeStain(area,x,z){
  const shape=new THREE.Shape(),outline=[];
  for(let i=0;i<=80;i++){
    const a=i/80*Math.PI*2,r=1+.12*Math.sin(a*3)+.065*Math.sin(a*7)+.035*Math.cos(a*11);
    const px=Math.cos(a)*2.35*r,py=Math.sin(a)*3.15*r;
    if(i===0)shape.moveTo(px,py);else shape.lineTo(px,py);
    if(i<80)outline.push({x:px,z:-py});
  }
  const g=new THREE.Group();g.position.set(x,.019,z);area.group.add(g);
  const geometry=new THREE.ShapeGeometry(shape);
  const edge=new THREE.Mesh(geometry,mat('#986c42',{transparent:true,opacity:.63,roughness:.8}));edge.rotation.x=-Math.PI/2;edge.scale.setScalar(1.035);g.add(edge);
  const liquid=new THREE.Mesh(geometry,mat('#3d261a',{transparent:true,opacity:.96,roughness:.2,metalness:.04}));liquid.rotation.x=-Math.PI/2;liquid.position.y=.003;liquid.receiveShadow=true;g.add(liquid);
  for(const [px,pz,rx,rz] of [[.5,.3,.6,.28],[-.8,-.6,.32,.17]]){
    const ring=new THREE.Mesh(new THREE.RingGeometry(.93,1,36),mat('#b18a59',{transparent:true,opacity:.25,roughness:.5}));ring.rotation.x=-Math.PI/2;ring.scale.set(rx,rz,1);ring.position.set(px,.005,pz);g.add(ring);
  }
  area.hazards.push({kind:'coffee',mesh:g,x,z,y:0,rx:2.8,rz:3.7,outline});
}
function carpetBugs(area,x,z,phase=0){
  const g=new THREE.Group();g.position.set(x,.035,z);g.userData.nonPhysical=true;area.group.add(g);
  const glow=mat('#a9f542',{emissive:'#78e72b',emissiveIntensity:1.6,roughness:.7});
  for(let i=0;i<4;i++){
    const b=new THREE.Group();b.position.set(Math.sin(i*2.4)*.23,.045,Math.cos(i*2.4)*.18);g.add(b);
    ellipsoid(b,0,0,0,.06,.045,.11,glow);
    for(const side of [-1,1])for(const z of [-.06,0,.06])rod(b,new THREE.Vector3(side*.03,0,z),new THREE.Vector3(side*.11,-.04,z+.035),.009,palette.dark);
  }
  const halo=new THREE.Mesh(new THREE.CircleGeometry(.46,28),new THREE.MeshBasicMaterial({color:'#96ef45',transparent:true,opacity:.16,depthWrite:false}));halo.rotation.x=-Math.PI/2;g.add(halo);
  area.hazards.push({kind:'bugs',mesh:g,x,z,y:0,rx:.35,rz:.3,patrol:.65,phase});
}
function physicalColliders(area,bounds){
  area.group.updateMatrixWorld(true);
  area.group.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.userData.physical)return;
    for(let parent=mesh;parent;parent=parent.parent)if(parent.userData.nonPhysical)return;
    const b=new THREE.Box3().setFromObject(mesh);
    if(bounds&&(b.max.x<bounds.x1||b.min.x>bounds.x2||b.max.z<bounds.z1||b.min.z>bounds.z2||b.max.y<0))return;
    const climbLayer=area.isOffice&&((b.max.z<-11.4&&b.min.y>.7)||(b.min.x>13.65&&b.max.x<14.15&&b.min.y>.7))?'window':null;
    let door=false;for(let parent=mesh;parent;parent=parent.parent)if(parent.userData.doorLeaf)door=true;
    area.solids.push({x1:b.min.x,x2:b.max.x,z1:b.min.z,z2:b.max.z,bottom:b.min.y,top:b.max.y,stepable:true,climbLayer,door});
    area.surfaces.push({x1:b.min.x,x2:b.max.x,z1:b.min.z,z2:b.max.z,y:b.max.y,door});
  });
}
function corridorFloor(area,x1,x2,z1,z2,floorMaterial=palette.concrete){
  box(area.group,x2-x1,.16,z2-z1,(x1+x2)/2,-.08,(z1+z2)/2,floorMaterial);
  area.surfaces.push({x1,x2,z1,z2,y:0});
  box(area.group,x2-x1,.12,z2-z1,(x1+x2)/2,3.5,(z1+z2)/2,materials().ceiling);
}

export function buildWorld(scene) {
  const surfaces=materials();palette.carpet=surfaces.carpet;palette.stone=surfaces.wall;palette.white=surfaces.ceramic;palette.concrete=surfaces.concrete;
  palette.metal.roughness=.32;palette.metal.metalness=.75;palette.dark.color.set('#222b2c');
  const office=zone(),passage2=zone(),floor14=zone(),stairs=zone(),street=zone();scene.add(office.group,passage2.group,floor14.group,stairs.group,street.group);passage2.group.visible=floor14.group.visible=stairs.group.visible=street.group.visible=false;
  office.isOffice=true;
  // Office proportions and finishes follow the supplied photo. The right-hand plant is interpreted.
  box(office.group,28,.2,24,0,-.1,0,palette.carpet);office.surfaces.push({x1:-14,x2:14,z1:-12,z2:12,y:0});
  box(office.group,28,5.4,.18,0,2.7,12,palette.stone);box(office.group,.18,5.4,24,-14,2.7,0,palette.stone);
  // Leave a real opening to passage 2, rather than putting a black slab
  // and a continuous window collision box across its entrance.
  for(const [z1,z2] of [[-12,7.35],[10.95,12]]){
    box(office.group,.18,1.1,z2-z1,14,.55,(z1+z2)/2,palette.stone);
    addSolid(office,14,(z1+z2)/2,.2,z2-z1,0,6);
  }
  addSolid(office,0,12,28,.2,0,6);addSolid(office,-14,0,.2,24,0,6);addSolid(office,0,-12,28,.2,0,6);
  // Continuous office sill: windows on two faces, then the wall into the left corridor.
  for(const s of ledgeSurfaces()){
    if(s.endY!==undefined)continue;
    box(office.group,s.x2-s.x1,.14,s.z2-s.z1,(s.x1+s.x2)/2,LEDGE_HEIGHT-.07,(s.z1+s.z2)/2,palette.white);
    office.surfaces.push(s);
  }
  office.surfaces.push(ledgeSurfaces().at(-1));
  // The partition facing passage 1 is ribbed, green frosted glazing with
  // pale aluminium profiles; it must not read as an exterior clear window.
  const partitionFrost=mat('#a8d0c1',{roughness:.96,transparent:true,opacity:.94,envMapIntensity:.15});
  box(office.group,.045,2.75,18.1,13.96,2.475,-2.8,partitionFrost,false);
  for(let z=-11.85;z<=6.25;z+=.72)box(office.group,.07,2.85,.035,13.88,2.475,z,palette.white,false);
  box(office.group,.22,1.55,18.1,13.9,4.625,-2.8,palette.stone);
  for(const y of [1.1,3.85])box(office.group,.11,.065,18.1,13.86,y,-2.8,palette.white,false);
  // Full-height end pier, with the pink/yellow graphic only at its top.
  box(office.group,.3,5.4,1.1,13.83,2.7,6.8,palette.stone);
  const cornerGraphic=texture((c,s)=>{
    c.clearRect(0,0,s,s);const gr=c.createLinearGradient(0,0,s,s);
    gr.addColorStop(0,'#d9ca70');gr.addColorStop(.35,'#dd9a8d');gr.addColorStop(.7,'#ca5f9a');gr.addColorStop(1,'#b2669d');
    c.fillStyle=gr;c.beginPath();c.moveTo(0,0);c.lineTo(s,0);c.lineTo(s,s*.87);c.bezierCurveTo(s*.6,s*.6,s*.05,s*.8,s*.18,s*.45);c.bezierCurveTo(s*.55,s*.32,0,s*.25,0,0);c.fill();
  });
  const cornerPatch=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.7),new THREE.MeshBasicMaterial({map:cornerGraphic,transparent:true,depthWrite:false}));
  cornerPatch.position.set(13.668,4.55,6.8);cornerPatch.rotation.y=-Math.PI/2;office.group.add(cornerPatch);
  const partitionBrand=texture((c,s)=>{
    c.clearRect(0,0,s,s);c.font='bold 120px Arial';c.fillText('wpp',s*.57,s*.58);
    const mask=c.getImageData(0,0,s,s).data;c.clearRect(0,0,s,s);c.fillStyle='#4c796b';
    for(let y=190;y<330;y+=10)for(let x=280;x<s;x+=10)if(mask[(y*s+x)*4+3]>100){c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();}
    c.save();c.translate(s*.53,0);c.scale(-1,1);c.font='bold 52px Arial';c.fillText('Production',0,s*.56);c.restore();
  });
  const partitionMark=new THREE.Mesh(new THREE.PlaneGeometry(5.8,2),new THREE.MeshBasicMaterial({map:partitionBrand,transparent:true,depthWrite:false,opacity:.72}));
  partitionMark.position.set(13.85,2.65,-1.4);partitionMark.rotation.y=-Math.PI/2;office.group.add(partitionMark);
  // Clear glazing beyond the aisle opening remains separate from the partition.
  box(office.group,.025,4.3,1.05,13.96,3.25,11.475,palette.glass,false);
  for(let x=-13;x<14;x+=3.5){
    box(office.group,.08,5.3,.16,x,2.65,-11.9,palette.metal);
    box(office.group,3.4,4.8,.025,x+1.73,2.8,-11.97,palette.glass,false);
    box(office.group,3.4,1.6,.04,x+1.73,4.5,-11.8,mat('#dad1ae',{transparent:true,opacity:.85}),true);
    box(office.group,3.4,.045,.075,x+1.73,3.7,-11.75,palette.white,false);
  }
  box(office.group,28,.1,.1,0,.85,-11.88,palette.metal);
  // Port view from the plant window: water, warehouses, containers and cranes.
  box(office.group,130,.12,60,0,-13,-48,mat('#739caa',{roughness:.3}),false);
  for(let i=0;i<7;i++){
    const x=-25+i*8;
    box(office.group,7,3,9,x,-9.5,-22,mat(i%2?'#a6a995':'#889b99'),false);
    box(office.group,7.3,.15,9.3,x,-7.9,-22,palette.stone,false);
    for(let j=0;j<3;j++)box(office.group,2.8,1,1.3,x+j*1.8,-10,-30,mat(['#955e50','#466f78','#9c9e79'][j]),false);
    rod(office.group,new THREE.Vector3(x,-13,-36),new THREE.Vector3(x,-1,-36),.12,palette.edge);
    rod(office.group,new THREE.Vector3(x,-1,-36),new THREE.Vector3(x+6,0,-36),.1,palette.edge);
    rod(office.group,new THREE.Vector3(x+6,0,-36),new THREE.Vector3(x+6,-6,-36),.025,palette.metal);
  }
  // City on the other face of the office; the plant window keeps its open port view.
  for(let i=0;i<22;i++){
    const x=55+random()*30,y=3+random()*21,z=-30+i*3.3;
    const building=box(office.group,2+random()*4,y,3+random()*5,x,y/2-15,z,mat(['#a5a99a','#bbc1ae','#859b9c','#b5b39f'][i%4]),false);
    for(let h=-12;h<y-15;h+=1.6)for(let xx=-.65;xx<1;xx+=.8)box(office.group,.35,.65,.015,x+xx,h,z+2.55,mat('#617f88'),false);
    building.receiveShadow=false;
  }
  // Suspended ceiling grid, recessed fixtures and ventilation panels.
  box(office.group,28,.12,24,0,5.5,0,surfaces.ceiling,true);
  for(let x=-14;x<=14;x+=2)box(office.group,.025,.025,24,x,5.42,0,palette.metal,false);
  for(let z=-12;z<=12;z+=2)box(office.group,28,.025,.025,0,5.42,z,palette.metal,false);
  const lamp=mat('#fff6dd',{emissive:'#fff0d0',emissiveIntensity:1.2});
  for(let x=-10;x<=10;x+=5)for(let z=-8;z<=8;z+=6){
    box(office.group,1.45,.06,.75,x,5.36,z,palette.metal,false);
    for(let k=-.45;k<.6;k+=.3)box(office.group,.1,.025,.65,x+k,5.31,z,lamp,false);
  }
  // Continuous tables extend toward passage 1 with additional workstations.
  const relocatedRunX=-3.4;
  // Preserve 55 cm at the window end, while extending the opposite end
  // to z=8 so the aisle by the vending machines matches the photograph.
  const windowTableZ=-.75;
  // The reference is viewed along the sill from the starting plant toward
  // the opposite end of the office (-X), not across the nearby glazing.
  // The returning sill occupies x=-13.25..-11.95. Keep furniture entirely
  // inside that boundary, including the desk supports and column footprint.
  const backColumnX=-10.8;
  const backColumnZ=-6.6;
  column(office.group,backColumnX,backColumnZ);addSolid(office,backColumnX,backColumnZ,1.65,1.65,0,5.4);
  // Beige wall-mounted speaker near the top of the column in the reference.
  box(office.group,.48,.62,.19,backColumnX-.12,4.75,backColumnZ+.93,mat('#b6aa82',{roughness:.86}));
  // The far-corner bank stays behind the separate end workstation.
  sixSeatTable(office,-8.1,.7,Math.PI/2,4,14.6);
  for(const x of [2,9.8])sixSeatTable(office,x,windowTableZ,Math.PI/2,5,17.5);
  // At that far end, +Z is left in the reference view: column and coat stand
  // on the left, the end workstation on the right beside the window sill.
  // Keep the approved workstation orientation and all six-seat banks.
  const cornerDesk=desk(office,-9.9,-9.1,0);
  cornerDesk.name='Puesto exterior · mirando hacia afuera';
  // Window-wall station beside the colored column; the long bank continues inward.
  sixSeatTable(office,relocatedRunX,windowTableZ,Math.PI/2,5,17.5);
  // Coat stand directly in front of the colored column, as in the photograph.
  const stand=new THREE.Group();stand.position.set(backColumnX+.15,0,backColumnZ+1.32);office.group.add(stand);
  cylinder(stand,.035,.045,2.65,0,1.325,0,palette.dark);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,y=i%2?2.05:2.48;
    const tip=new THREE.Vector3(Math.cos(a)*.38,y+.19,Math.sin(a)*.38);
    rod(stand,new THREE.Vector3(0,y-.12,0),tip,.023,palette.dark);
    ellipsoid(stand,tip.x,tip.y,tip.z,.06,.06,.06,palette.dark);
  }
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(stand,new THREE.Vector3(0,.12,0),new THREE.Vector3(Math.cos(a)*.38,.045,Math.sin(a)*.38),.026,palette.dark);}
  // Small terracotta pots rest on the sill, as in the new window photograph.
  const terracotta=surfaces.terracotta;
  for(const x of [10.7,3.3,-5.5]){
    cylinder(office.group,.24,.18,.43,x,1.47,-11.12,terracotta);
    cylinder(office.group,.255,.255,.055,x,1.675,-11.12,terracotta);
    cylinder(office.group,.217,.217,.025,x,1.69,-11.12,palette.soil);
    for(let i=0;i<5;i++){
      const end=new THREE.Vector3(x+Math.cos(i*2.4)*.22,1.84+(i%2)*.1,-11.12+Math.sin(i*2.4)*.2);
      rod(office.group,new THREE.Vector3(x,1.65,-11.12),end,.015,palette.leaf);
      leafMesh(office.group,end.x,end.y,end.z,.21,.35,i*2.4);
    }
  }
  const leaf=leafMesh(office.group,START.x,1.88,START.z,.92,.62);
  office.surfaces.push({x1:10.05,x2:10.95,z1:-10.95,z2:-10.35,y:START.y});
  // Meeting-room glass along the left corridor and the familiar wall lettering.
  const frosted=mat('#99b8b1',{transparent:true,opacity:.65});
  for(let z=-8;z<8;z+=1.7){
    box(office.group,.06,3.3,1.62,-13.88,2.9,z,frosted,false);
    box(office.group,.08,3.5,.06,-13.75,2.9,z-.83,palette.metal,false);
  }
  const mottoTexture=texture((c,s)=>{
    c.clearRect(0,0,s,s);c.font='bold 100px Arial';
    for(const [i,line] of ['Making','ideas','happen'].entries()){c.fillStyle=i===2?'#cd7957':'#d3628b';c.fillText(line,25,140+i*140);}
  });
  const motto=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),new THREE.MeshBasicMaterial({map:mottoTexture,transparent:true,depthWrite:false}));
  motto.position.set(10.8,2.7,11.88);motto.rotation.y=Math.PI;office.group.add(motto);
  // Vending machines and the blue kitchenette occupy the opposite end of that wall.
  for(const x of [-7,-4.7]){
    box(office.group,1.9,3.3,1.1,x,1.65,10.95,palette.metal);
    box(office.group,1.45,2.3,.035,x,1.95,10.37,palette.dark);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++)box(office.group,.19,.26,.1,x-.48+col*.31,1.1+row*.47,10.3,mat(['#b39a64','#92aa92','#c2876c','#b9a7a0'][col]),false);
    addSolid(office,x,10.95,1.9,1.1,0,3.3);
  }
  box(office.group,4.1,2.7,.12,2,2.1,11.8,mat('#31597a'));
  box(office.group,4.1,.14,1.25,2,1.25,11.15,palette.white);
  box(office.group,4.1,1.1,1.1,2,.55,11.2,palette.stone);
  // Keep this side of the aisle open: the marked partition and column
  // do not exist here in the actual office.
  plant(office.group,-1.2,10.75,.7);
  box(office.group,.75,.8,.75,-1.2,.4,10.75,palette.white);
  cylinder(office.group,.14,.14,.65,.1,.55,11.5,mat('#ab3430'));
  box(office.group,.15,.09,.1,.1,.92,11.5,palette.dark);
  box(office.group,2.2,1.25,.08,5.2,2.65,11.82,palette.dark);
  const length=3.2,height=LEDGE_HEIGHT;
  const ramp=box(office.group,1.3,.065,Math.hypot(length,height),-12.6,height/2,7.1,mat('#d2b450',{roughness:.7}));
  ramp.userData.physical=false;
  ramp.rotation.x=Math.atan(height/length);
  office.solids.push({x1:-13.25,x2:-11.95,z1:5.5,z2:8.7,bottom:0,top:height,stepable:true,ramp:{y:height,endY:0,z1:5.5,z2:8.7}});
  // Cables: small jumpable obstacles; each has a standable top.
  for(const [x,z,w] of [[9,-2,3.8],[-8,7,3.5]]){
    box(office.group,w,.2,.23,x,.1,z,palette.dark);addSolid(office,x,z,w,.23,0,.2);office.surfaces.push({x1:x-w/2,x2:x+w/2,z1:z-.115,z2:z+.115,y:.2});
  }
  for(const z of [7.35,10.95])box(office.group,.14,3.4,.12,13.9,1.7,z,palette.white);
  box(office.group,.14,.15,3.72,13.9,3.4,9.15,palette.white);
  sign(office.group,'PASILLO 2 · PISO 14',13.8,3.7,9.15,2.5).rotation.y=-Math.PI/2;
  for(const [x,z,r] of [[7,-10.7,-1.57],[0,-10.7,-1.57],[-7,-10.7,-1.57],[-12.6,-7,0],[-12.6,0,0]])arrow(office.group,x,LEDGE_HEIGHT+.015,z,r);
  for(const x of [-8,-2,4,10])arrow(office.group,x,.02,8.7,Math.PI/2);
  drop(office,0,LEDGE_HEIGHT+.4,-10.7);drop(office,-12.6,LEDGE_HEIGHT+.4,1);drop(office,9,.4,8.7);
  // Hazards leave room to go around; none block the starting leaf or ramp.
  coffee(office,5.3,-10.62,LEDGE_HEIGHT,.58,.28);
  coffee(office,-8,8.65,0,.7,.55);coffee(office,4.7,9.05,0,.8,.5);
  carpetBugs(office,-3.1,8.4,.4);carpetBugs(office,8,8.75,2.1);
  coffee(office,-.5,9.25,0,.65,.4);coffee(office,-8.8,-10.65,LEDGE_HEIGHT,.5,.3);
  addHangingSpiders(office,{rod,mat});
  carpetBugs(office,-6,8.9,3);carpetBugs(office,11,8.3,4);
  const bulletin=sign(office.group,'wpp production',-13.88,2,4,3,'#e8d0a3','#39484b');bulletin.rotation.y=Math.PI/2;

  // Photo of passage 2: an open-plan office, not a walled zigzag.
  // Looking toward +Z, the aisle and vinyl wall are on the right (-X).
  corridorFloor(passage2,-11.5,10,-11,11.5,palette.carpet);
  for(const [z1,z2] of [[-11,2.3],[5.7,11.5]])box(passage2.group,.18,3.5,z2-z1,-11.6,1.75,(z1+z2)/2,palette.stone);
  box(passage2.group,.18,.4,3.4,-11.6,3.3,4,palette.stone);
  box(passage2.group,.18,3.5,22.5,10.1,1.75,.25,palette.stone);
  const passageBack=box(passage2.group,21.5,3.5,.18,-.75,1.75,-11.1,palette.stone);passageBack.name='passage-entry-back';
  // Irregular coffee stain across the straight aisle, with dry space around
  // the workstation side. Its damage follows the same visible outline.
  largeCoffeeStain(passage2,-9.9,-6.1);
  box(passage2.group,21.5,.65,.18,-.75,.325,11.6,palette.white);
  // Keep the existing inner ends at x=-7.5 and extend the opposite ends
  // to x=8, narrowing the outer aisle beside the wall without moving it.
  for(const z of [-6,0,4.8])sixSeatTable(passage2,.25,z,0,4,15.5);
  const cardMesh=new THREE.Group();cardMesh.position.set(.2,1.68,.95);cardMesh.rotation.y=.22;cardMesh.userData.nonPhysical=true;cardMesh.name='Tarjeta de acceso · Aguada Park';passage2.group.add(cardMesh);
  box(cardMesh,.72,.025,.45,0,0,0,palette.white,false);
  const cardArtwork=texture((c,s)=>{
    c.fillStyle='#f3f1e5';c.fillRect(0,0,s,s);c.fillStyle='#176c73';c.fillRect(0,0,35,s);c.fillRect(0,s-95,s,95);
    c.font='bold 77px Arial';c.fillText('AGUADA',65,125);c.font='bold 73px Arial';c.fillText('PARK',65,215);
    c.fillStyle='#626a68';c.font='30px Arial';c.fillText('TARJETA DE ACCESO',65,295);
    c.fillStyle='#c5b582';c.fillRect(65,330,92,58);
    for(let i=0;i<29;i++)c.fillRect(210+i*8,335,2+(i%3),53);
    c.fillStyle='#ffffff';c.font='bold 36px Arial';c.fillText('PISO 14',65,s-35);
  });
  const cardFace=new THREE.Mesh(new THREE.PlaneGeometry(.7,.43),new THREE.MeshBasicMaterial({map:cardArtwork}));cardFace.rotation.x=-Math.PI/2;cardFace.position.y=.014;cardMesh.add(cardFace);
  const cardHalo=new THREE.Mesh(new THREE.RingGeometry(.43,.46,40),mat('#e3cf8f',{emissive:'#c3a35e',emissiveIntensity:.45,transparent:true,opacity:.7}));cardHalo.rotation.x=-Math.PI/2;cardHalo.position.y=-.012;cardMesh.add(cardHalo);
  const accessCard={mesh:cardMesh,x:.2,y:1.68,z:.95};
  // The same wall vinyl continues beside the aisle, close to the entry.
  const passageMotto=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),new THREE.MeshBasicMaterial({map:mottoTexture,transparent:true,depthWrite:false}));
  passageMotto.position.set(-11.49,1.95,-6.8);passageMotto.rotation.y=Math.PI/2;passage2.group.add(passageMotto);
  for(const z of [-1.6,5.7]){
    const tree=new THREE.Group();tree.position.set(-10.85,0,z);passage2.group.add(tree);
    box(tree,.63,.72,.63,0,.36,0,palette.white);
    cylinder(tree,.24,.24,.025,0,.73,0,palette.soil);
    cylinder(tree,.035,.055,1.6,0,1.48,0,palette.wood);
    for(let i=0;i<15;i++){
      const a=i*2.4,y=1.4+(i%5)*.19,end=new THREE.Vector3(Math.cos(a)*.4,y,Math.sin(a)*.36);
      rod(tree,new THREE.Vector3(0,y-.2,0),end,.012,palette.wood);
      leafMesh(tree,end.x,end.y,end.z,.14,.25,a);
    }
  }
  box(passage2.group,.08,1.05,1.7,-11.45,2.1,7.5,palette.dark);
  cylinder(passage2.group,.12,.12,.55,-11.2,.45,6.8,mat('#ad3434'));
  // Windows and the glazed meeting room at the bright far end.
  for(let x=-11.5;x<10;x+=3.1){
    box(passage2.group,3,2.6,.035,x+1.5,1.95,11.62,palette.glass,false);
    box(passage2.group,.06,2.75,.09,x,1.95,11.55,palette.white);
    box(passage2.group,3,.65,.05,x+1.5,3.15,11.5,palette.stone,false);
  }
  for(let x=-1;x<9;x+=2.5){
    box(passage2.group,2.4,2.6,.035,x,1.7,9.7,palette.glass,false);
    box(passage2.group,.05,2.7,.08,x-1.23,1.7,9.7,palette.white);
  }
  for(let i=0;i<12;i++){
    const x=-15+i*3.2,h=2+(i%5)*1.7;
    const building=box(passage2.group,2.5,h,3,x,h/2-2,20+(i%3)*4,mat(['#9aaab1','#b6b8ae','#a4adb7'][i%3]),false);building.userData.physical=false;
  }
  for(let x=-10;x<=9;x+=2)box(passage2.group,.025,.025,22.5,x,3.42,.25,palette.metal,false);
  for(let z=-10;z<=11;z+=2)box(passage2.group,21.5,.025,.025,-.75,3.42,z,palette.metal,false);
  for(const z of [-7,-1,5,10]){
    box(passage2.group,1.1,.05,.65,-9.7,3.37,z,palette.white,false);
    for(const x of [-10,-9.7,-9.4])box(passage2.group,.09,.02,.55,x,3.33,z,lamp,false);
  }
  // The real wooden double door sits in an alcove on the right wall.
  // Its return wall redirects the straight aisle toward the workstations.
  box(passage2.group,2.5,3.5,.16,-10.35,1.75,1.9,palette.stone);
  const door=new THREE.Group();door.position.set(-11.48,0,4);door.rotation.y=Math.PI/2;passage2.group.add(door);
  const woodGrain=texture((c,s)=>{
    c.fillStyle='#85523f';c.fillRect(0,0,s,s);
    for(let x=0;x<s;x+=2){c.strokeStyle=x%6?'#693a222b':'#e3a26b44';c.lineWidth=1;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+Math.sin(x)*7,s*.3,x+Math.cos(x*.2)*9,s*.7,x,s);c.stroke();}
  });
  const doorWood=mat('#ffffff',{map:woodGrain,roughness:.56});
  const doorMetal=mat('#c3c8c9',{metalness:.85,roughness:.24});
  for(const x of [-1.68,1.68])box(door,.12,3.12,.18,x,1.56,0,doorWood);
  box(door,3.48,.13,.18,0,3.13,0,doorWood);
  const doorLeaves=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.x=side*1.6;hinge.userData.doorLeaf=true;door.add(hinge);doorLeaves.push(hinge);
    const center=-side*.76;
    box(hinge,1.48,3,.1,center,1.5,0,doorWood);
    box(hinge,1.3,2.76,.025,center,1.5,.065,mat('#e0b58f',{map:woodGrain,roughness:.6}));
    for(const y of [.65,1.05,2.1]){const disk=cylinder(hinge,.045,.045,.035,-side*1.31,y,.09,doorMetal);disk.rotation.x=Math.PI/2;}
    rod(hinge,new THREE.Vector3(-side*1.31,1.02,.14),new THREE.Vector3(-side*1.06,1.02,.14),.018,doorMetal);
    box(hinge,.4,.07,.12,center,2.94,.09,doorMetal);
  }
  cylinder(door,.055,.055,.08,0,2.35,.13,palette.green).rotation.x=Math.PI/2;
  box(door,.16,.3,.08,0,3.35,0,palette.white);
  const entryGlow=new THREE.PointLight('#ffdfb4',1.5,5,2);entryGlow.position.set(-9.8,2.9,4);passage2.group.add(entryGlow);
  sign(passage2.group,'SALIDA',-11.39,3.3,4,1.3).rotation.y=Math.PI/2;
  const doorBrand=texture((c,s)=>{c.fillStyle='#dfd2bf';c.fillRect(0,0,s,s);const gr=c.createLinearGradient(0,s,200,200);gr.addColorStop(0,'#c74786');gr.addColorStop(1,'#e4d19d');c.fillStyle=gr;c.beginPath();c.moveTo(0,s);c.lineTo(0,180);c.bezierCurveTo(80,360,20,440,230,s);c.fill();c.fillStyle='#29232e';c.font='bold 85px Arial';c.fillText('WPP',45,175);c.font='bold 59px Arial';c.fillText('Production',35,245);});
  const doorLogo=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.7),new THREE.MeshBasicMaterial({map:doorBrand}));doorLogo.position.set(-10.4,1.75,1.805);doorLogo.rotation.y=Math.PI;passage2.group.add(doorLogo);
  for(const [x,z,r] of [[-6,-9,Math.PI/2],[2,-9,Math.PI/2],[8.5,-4,0],[8.5,3,0],[4,8.5,-Math.PI/2],[-4,8.5,-Math.PI/2],[-10,6,Math.PI]])arrow(passage2.group,x,.02,z,r);
  for(const [x,z] of [[6,-9],[8.5,4],[-7,8.5]])drop(passage2,x,.4,z);
  coffee(passage2,1,-9,0,.7,.4);coffee(passage2,8.5,-1,0,.5,.75);
  carpetBugs(passage2,8.5,6,1);carpetBugs(passage2,-4,8.5,2);
  coffee(passage2,8.1,-5,0,.45,.6);coffee(passage2,2.5,8.3,0,.6,.4);
  carpetBugs(passage2,7.9,-3,3);carpetBugs(passage2,-7,8.4,4);

  // The office exit reaches the shared building corridor, still on floor 14.
  // Photo: wood straight ahead after the office doors; turn right (-X)
  // into the lift bank, which runs along the left side of that corridor.
  const tileMap=texture((c,s)=>{c.fillStyle='#e4dfd1';c.fillRect(0,0,s,s);c.strokeStyle='#bcb7ab';c.lineWidth=2;c.strokeRect(0,0,s,s);});
  tileMap.wrapS=tileMap.wrapT=THREE.RepeatWrapping;tileMap.repeat.set(23,5.75);
  const hallTile=mat('#ffffff',{map:tileMap,roughness:.24,metalness:.06});
  corridorFloor(floor14,-14,4.5,-6,-1.4,hallTile);
  box(floor14.group,18.5,.04,4.6,-4.75,.02,-3.7,hallTile);
  // Solid threshold joins the two room floors under the wooden doorway.
  box(floor14.group,3.4,.16,.35,0,-.08,-6.125,hallTile);
  floor14.surfaces.push({x1:-1.7,x2:1.7,z1:-6.3,z2:-5.95,y:0});
  for(const x of [-14.1,4.6])box(floor14.group,.18,3.5,4.8,x,1.75,-3.7,palette.white);
  for(const [x1,x2] of [[-14,-1.7],[1.7,4.5]])box(floor14.group,x2-x1,3.5,.18,(x1+x2)/2,1.75,-6.1,palette.white);
  box(floor14.group,3.4,.4,.18,0,3.3,-6.1,palette.white);
  box(floor14.group,18.5,3.5,.18,-4.75,1.75,-1.3,palette.white);
  const hallWood=mat('#ffffff',{map:woodGrain,roughness:.38});
  box(floor14.group,6.6,2.9,.08,1.2,1.45,-1.43,hallWood);
  for(const y of [1.9,2.2])sign(floor14.group,y>2?'RETANA TRANSAMERICA S.A.':'SETAM INTERAMERICANA S.A.',.2,y,-1.49,1.75,'#4a4c4b','#c8c5bb').rotation.y=Math.PI;
  rod(floor14.group,new THREE.Vector3(-1.35,.65,-1.55),new THREE.Vector3(-1.35,2.15,-1.55),.025,doorMetal);
  box(floor14.group,.27,.23,.07,-.95,1.15,-1.52,palette.dark);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)box(floor14.group,.025,.025,.015,-1.03+i*.075,1.08+j*.065,-1.565,mat('#627bcb',{emissive:'#35559a',emissiveIntensity:.8}),false);
  // Three brushed-steel lifts and bright metallic panels, as in the reference.
  const liftSteel=mat('#727b7c',{metalness:.72,roughness:.31});
  const mirror=mat('#d8dfdc',{metalness:1,roughness:.07,envMapIntensity:1.2});
  for(const [i,x] of [-3.7,-7.3,-10.9].entries()){
    box(floor14.group,2.55,2.9,.12,x,1.45,-1.48,doorMetal);
    for(const offset of [-.56,.56])box(floor14.group,1.1,2.68,.04,x+offset,1.34,-1.565,liftSteel);
    sign(floor14.group,String.fromCharCode(65+i)+'14',x,1.85,-1.6,.48,'#3d4445','#dddcd3').rotation.y=Math.PI;
    sign(floor14.group,'14',x,3.08,-1.46,.5,'#e09986','#333b3d').rotation.y=Math.PI;
    box(floor14.group,.75,2.87,.035,x-1.65,1.435,-1.51,mirror);
    box(floor14.group,.12,.3,.04,x-1.29,1.1,-1.59,palette.metal);
    box(floor14.group,.04,.04,.015,x-1.29,1.17,-1.62,palette.green,false);
  }
  for(const x of [-4.5,-8.5,-12]){
    box(floor14.group,1.35,2.8,.06,x,1.4,-5.78,hallWood);
    rod(floor14.group,new THREE.Vector3(x+.4,.9,-5.7),new THREE.Vector3(x+.4,1.55,-5.7),.018,doorMetal);
  }
  for(const z of [-5.72,-1.73])box(floor14.group,18.5,.014,.28,-4.75,.047,z,mat('#b4b3a7',{roughness:.3}));
  for(const x of [-12,-8,-4,0,3])for(const z of [-4.9,-2.4])cylinder(floor14.group,.16,.16,.035,x,3.39,z,lamp);
  box(floor14.group,.08,2.9,1.8,-13.98,1.45,-3.5,palette.white);
  rod(floor14.group,new THREE.Vector3(-13.91,.9,-3.1),new THREE.Vector3(-13.91,1.8,-3.1),.02,doorMetal);
  sign(floor14.group,'ESCALERAS ↓',-13.9,3.05,-3.5,1.7).rotation.y=Math.PI/2;
  for(const x of [-2,-6,-10,-13])arrow(floor14.group,x,.02,-3.6,-Math.PI/2);

  // A real, continuous 14-storey switchback staircase: 336 individual steps.
  stairs.surfaces=stairSurfaces();
  for(const s of stairs.surfaces){
    const w=s.x2-s.x1,d=s.z2-s.z1,x=(s.x1+s.x2)/2,z=(s.z1+s.z2)/2;
    box(stairs.group,w,.12,d,x,s.y-.06,z,palette.concrete);
    if(!s.landing&&d<1)box(stairs.group,w,.025,.055,x,s.y+.008,z+d/2-.035,palette.edge,false);
    if(s.landing){
      const number=sign(stairs.group,s.floor===0?'PB · SALIDA':`PISO ${s.floor}`,0,s.y+1.4,-6.1,2.3,'#dce1d3','#536762');
      sign(stairs.group,'↓ SEGUÍ BAJANDO',-1.5,s.y+.5,-6.09,1.8);
      if(s.floor%2===0&&s.floor>0)drop(stairs,-1.5,s.y+.4,-5);
    }
  }
  // Outer walls and rails prevent leaving the staircase; an open central well stays visible.
  box(stairs.group,.15,46,12,-3.4,21,0,palette.stone);
  // Floor-7 doorway to the pantry; all other stair levels retain their walls.
  box(stairs.group,.15,23,12,3.4,9.5,0,palette.stone);
  box(stairs.group,.15,20.2,12,3.4,33.9,0,palette.stone);
  for(const [z1,z2] of [[-6,-5.95],[-4.05,6]])box(stairs.group,.15,2.8,z2-z1,3.4,22.4,(z1+z2)/2,palette.stone);
  box(stairs.group,7,46,.15,0,21,-6.4,palette.concrete);
  addSolid(stairs,-3.25,0,.2,13,-2,45);
  addSolid(stairs,3.25,0,.2,13,-2,21);addSolid(stairs,3.25,0,.2,13,23.8,45);
  for(const [z1,z2] of [[-6.5,-5.95],[-4.05,6.5]])addSolid(stairs,3.25,(z1+z2)/2,.2,z2-z1,21,23.8);
  addSolid(stairs,0,-6.25,7,.2,-2,45);addSolid(stairs,0,6.25,7,.2,-2,45);
  addSolid(stairs,0,0,.22,8,-2,45);
  for(let floor=14;floor>0;floor--){
    const y=floor*3;
    for(const x of [-3.05,-.22]){rod(stairs.group,new THREE.Vector3(x,y+.8,-4),new THREE.Vector3(x,y-.7,4),.035,palette.metal);for(let j=0;j<=4;j++)rod(stairs.group,new THREE.Vector3(x,y-j*.375,-4+j*2),new THREE.Vector3(x,y-j*.375+.8,-4+j*2),.025,palette.metal);}
    for(const x of [.22,3.05]){rod(stairs.group,new THREE.Vector3(x,y-.7,4),new THREE.Vector3(x,y-2.2,-4),.035,palette.metal);for(let j=0;j<=4;j++)rod(stairs.group,new THREE.Vector3(x,y-1.5-j*.375,4-j*2),new THREE.Vector3(x,y-.7-j*.375,4-j*2),.025,palette.metal);}
    sign(stairs.group,'SALIDA ↓',0,y-.55,6.1,1.5).rotation.y=Math.PI;
    const lampM=box(stairs.group,.7,.11,.35,0,y+1.6,-6.1,palette.green,false);lampM.rotation.x=.2;
  }
  box(stairs.group,2.3,2.6,.1,0,1.3,-6.1,palette.dark);sign(stairs.group,'SALIR →',0,1.7,-6.02,1.7);
  const descent=buildDescent(stairs,{box,cylinder,rod,sign,mat,palette,coffee,carpetBugs,drop,sixSeatTable});

  // Ground floor lobby, glass doors, sidewalk and trees for the final escape.
  const marble=mat('#c8c8b8',{roughness:.28,metalness:.12});
  box(street.group,20,.2,18,0,-.1,1,marble);street.surfaces.push({x1:-10,x2:10,z1:-8,z2:10,y:0});
  box(street.group,35,.2,18,0,-.12,18,palette.stone);street.surfaces.push({x1:-17,x2:17,z1:10,z2:27,y:-.02});
  box(street.group,20,5,.15,0,2.5,-8,palette.stone);box(street.group,.2,5,18,-10,2.5,1,palette.stone);box(street.group,.2,5,18,10,2.5,1,palette.stone);
  addSolid(street,-10,1,.2,18,0,6);addSolid(street,10,1,.2,18,0,6);addSolid(street,0,-8,20,.2,0,6);
  for(const x of [-7,-3,3,7]){box(street.group,.12,4.5,.2,x,2.25,9,palette.metal);box(street.group,3.8,4.5,.03,x,2.25,9,palette.glass,false);if(Math.abs(x)>3)addSolid(street,x,9,4,.1,0,5);}
  sign(street.group,'SALIDA',0,3.5,8.9,2.3).rotation.y=Math.PI;
  sign(street.group,'wpp production',0,2.7,-7.88,5,'#e6d1a8','#526363');
  for(const x of [-6,6]){plant(street.group,x,6,1.3);addSolid(street,x,6,1.4,1.4,0,2);}
  for(const z of [-4,0,4,7])arrow(street.group,0,.02,z);
  for(const x of [-12,12])for(const z of [13,22]){cylinder(street.group,.17,.25,4,x,2,z,palette.wood);ellipsoid(street.group,x,4.5,z,2.8,2.3,2.8,palette.leaf);}
  box(street.group,35,.05,3,0,-.15,29,palette.dark);
  drop(street,0,.4,3);
  // Cool sky fill and low, warm window light give the office directional contrast.
  scene.background=new THREE.Color('#c5cbd0');scene.fog=new THREE.Fog('#c5cbd0',42,125);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(120,32,20),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{sunDirection:{value:new THREE.Vector3(-9,7,-22).normalize()}},
    vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vDirection;uniform vec3 sunDirection;
      void main(){vec3 d=normalize(vDirection);float h=max(0.0,d.y);
      vec3 c=mix(vec3(.74,.78,.79),vec3(.20,.38,.60),pow(h,.48));
      c+=vec3(.25,.13,.025)*pow(max(0.0,dot(d,sunDirection)),20.0);
      c+=vec3(1.5,1.15,.63)*pow(max(0.0,dot(d,sunDirection)),900.0);
      float clouds=sin(d.x*25.0+sin(d.z*19.0))*sin(d.z*31.0+sin(d.x*17.0));
      c=mix(c,vec3(.88,.88,.84),smoothstep(.35,.9,clouds)*smoothstep(.04,.17,h)*.19);
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  }));sky.renderOrder=-100;scene.add(sky);
  const ambient=new THREE.HemisphereLight('#c7def4','#75654c',.95);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#ffe0ac',2.7);sun.position.set(-9,7,-22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;sun.shadow.camera.far=90;sun.shadow.normalBias=.008;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight('#cbdcf1',.38);fill.position.set(6,5,8);scene.add(fill);
  // One physical floor: actual geometry, player position and camera all stay
  // in these world coordinates. Returning to either aisle needs no scene swap.
  passageBack.removeFromParent();
  passage2.group.rotation.y=Math.PI/2;passage2.group.position.set(24.9,0,-1.3);
  floor14.group.position.set(28.9,0,16.3);
  for(const part of [passage2,floor14]){
    part.group.visible=true;office.group.add(part.group);office.group.updateMatrixWorld(true);
    for(const surface of part.surfaces){
      const corners=[[surface.x1,surface.z1],[surface.x1,surface.z2],[surface.x2,surface.z1],[surface.x2,surface.z2]].map(([x,z])=>part.group.localToWorld(new THREE.Vector3(x,surface.y,z)));
      office.surfaces.push({x1:Math.min(...corners.map(p=>p.x)),x2:Math.max(...corners.map(p=>p.x)),z1:Math.min(...corners.map(p=>p.z)),z2:Math.max(...corners.map(p=>p.z)),y:corners[0].y});
    }
    for(const drop of part.drops){const at=part.group.localToWorld(new THREE.Vector3(drop.x,drop.y,drop.z));drop.x=at.x;drop.y=at.y;drop.z=at.z;office.drops.push(drop);}
    for(const hazard of part.hazards){const at=part.group.localToWorld(new THREE.Vector3(hazard.x,hazard.y,hazard.z));office.group.attach(hazard.mesh);hazard.x=at.x;hazard.z=at.z;hazard.y=at.y;if(part===passage2){hazard.maxZ=10.2;[hazard.rx,hazard.rz]=[hazard.rz,hazard.rx];if(hazard.outline)hazard.outline=hazard.outline.map(p=>({x:p.z,z:-p.x}));}office.hazards.push(hazard);}
  }
  const cardAt=passage2.group.localToWorld(new THREE.Vector3(accessCard.x,accessCard.y,accessCard.z));accessCard.x=cardAt.x;accessCard.y=cardAt.y;accessCard.z=cardAt.z;
  physicalColliders(office,{x1:-14,x2:46,z1:-12,z2:26});
  physicalColliders(stairs);physicalColliders(street);
  function setOfficeDoor(open){
    office.solids=office.solids.filter(s=>!s.door);office.surfaces=office.surfaces.filter(s=>!s.door);
    doorLeaves.forEach((leaf,i)=>{leaf.rotation.y=open?(i===0?-1:1)*Math.PI/2:0;physicalColliders({group:leaf,solids:office.solids,surfaces:office.surfaces});});
  }
  return {office,passage2,floor14,stairs,street,sun,ambient,sky,setOfficeDoor,accessCard,descent};
}

export function createSnail(scene) {
  const g=new THREE.Group();g.name='Turbo';scene.add(g);
  const size=.8;g.scale.setScalar(size);
  const skin=materials().skin,shell=materials().shell;
  ellipsoid(g,0,.13,.08,.26,.13,.62,skin);
  ellipsoid(g,0,.29,.45,.18,.25,.22,skin);
  ellipsoid(g,0,.49,-.13,.33,.4,.38,shell);
  const points=[];
  for(let i=0;i<180;i++){
    const t=i/179*2.7*Math.PI,r=.018+.033*t;
    const y=Math.cos(t)*r,z=Math.sin(t)*r;
    const x=.33*Math.sqrt(Math.max(.015,1-(y/.4)**2-(z/.38)**2))+.004;
    points.push(new THREE.Vector3(x,.49+y,-.13+z));
  }
  const spiral=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.009,8,false),mat('#61422a',{roughness:.94,envMapIntensity:.12}));g.add(spiral);
  const mirror=spiral.clone();mirror.scale.x=-1;g.add(mirror);
  // Fine growth striations and wet highlights now come from the shell's surface maps.
  const eyes=[];
  for(const x of [-.11,.11]){
    const a=new THREE.Vector3(x,.43,.52),b=new THREE.Vector3(x*1.8,.82,.65);
    const stalk=rod(g,a,b,.024,skin);eyes.push(stalk);ellipsoid(g,b.x,b.y,b.z,.045,.045,.045,palette.dark);
    rod(g,new THREE.Vector3(x,.28,.56),new THREE.Vector3(x*1.8,.36,.77),.015,skin);
  }
  return {group:g,eyes,size};
}

export function createHand(scene) {
  const g=new THREE.Group();g.name='Mano articulada';scene.add(g);
  const skin=new THREE.MeshPhysicalMaterial({color:'#be927a',roughness:.76,clearcoat:0,bumpMap:materials().skin.bumpMap,bumpScale:.0017,envMapIntensity:.3});
  const nails=mat('#dcc3b0',{roughness:.68});
  const sleeve=mat('#26333d',{roughness:.95});
  ellipsoid(g,0,0,-.02,.34,.13,.43,skin);
  ellipsoid(g,-.18,-.025,.02,.17,.12,.24,skin);
  const wrist=cylinder(g,.19,.23,.48,0,.015,-.52,skin);wrist.rotation.x=Math.PI/2;
  const arm=cylinder(g,.24,.3,.9,0,.025,-1.17,sleeve);arm.rotation.x=Math.PI/2;
  const cuff=cylinder(g,.245,.245,.105,0,.025,-.76,sleeve);cuff.rotation.x=Math.PI/2;
  const poses=[];
  for(let i=0;i<4;i++){
    const root=new THREE.Group();root.position.set(-.235+i*.15,-.005,.27);root.rotation.y=(i-1.4)*-.055;g.add(root);
    const lengths=[.23,.27,.25,.19],base=lengths[i],radius=[.066,.072,.068,.056][i];
    let parent=root;const joints=[];
    for(let j=0;j<3;j++){
      const joint=new THREE.Group();parent.add(joint);joints.push(joint);
      const length=base*[1,.72,.58][j],r=radius*(1-j*.14);
      ellipsoid(joint,0,0,length*.48,r,r*.85,length*.57,skin);
      ellipsoid(joint,0,.006,0,r*1.03,r*.85,r*.9,skin);
      if(j===2)ellipsoid(joint,0,r*.77,length*.64,r*.7,.009,length*.28,nails);
      const next=new THREE.Group();next.position.z=length;joint.add(next);parent=next;
    }
    poses.push({joints,bend:[.18,.58,.5],spread:i});
  }
  const thumb=new THREE.Group();thumb.position.set(-.27,-.015,-.05);thumb.rotation.y=-.9;g.add(thumb);
  ellipsoid(thumb,0,0,.12,.10,.095,.19,skin);
  const tip=new THREE.Group();tip.position.z=.25;thumb.add(tip);
  ellipsoid(tip,0,0,.075,.075,.065,.13,skin);ellipsoid(tip,0,.055,.115,.05,.009,.055,nails);
  g.userData.pose=openness=>{
    for(const pose of poses)pose.joints.forEach((joint,j)=>joint.rotation.x=pose.bend[j]*(1-openness)+.045);
    thumb.rotation.x=.3*(1-openness);tip.rotation.x=.5*(1-openness);
  };
  g.userData.pose(0);g.rotation.set(0,Math.PI,-.16);return g;
}
