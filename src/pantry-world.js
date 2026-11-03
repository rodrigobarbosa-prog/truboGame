import * as THREE from 'three';
import {DESCENT_TASKS} from './descent.js';
import {createVisitorAI,stepVisitor,visionOutline,inFloor7,shouldIntroduceVisitor} from './stealth.js';

// Floor seven is a complete office. Alternating openings connect its three
// aisles; the meeting room is at the far end of the last one.
export function buildPantry(area,helpers,getState){
  const {box,cylinder,rod,sign,mat,palette,sixSeatTable}=helpers;
  const white=mat('#d3d0c0'),metal=mat('#9aa8a7',{metalness:.45,roughness:.4}),wood=mat('#987b55');
  box(area.group,27.5,.12,24,17.25,20.94,0,palette.carpet);
  box(area.group,.8,.12,1.9,3.2,20.94,-5,palette.carpet);
  area.surfaces.push({x1:3.5,x2:31,z1:-12,z2:12,y:21},{x1:2.8,x2:3.6,z1:-5.95,z2:-4.05,y:21});
  box(area.group,27.8,.14,24.2,17.25,24.42,0,white);
  box(area.group,.18,3.4,24.2,31.1,22.7,0,white);
  for(const z of [-12.1,12.1])box(area.group,27.8,3.4,.18,17.25,22.7,z,white);
  for(const [z1,z2]of[[-12,-5.95],[-4.05,12]])box(area.group,.18,3.4,z2-z1,3.51,22.7,(z1+z2)/2,white);
  sign(area.group,'7 · WPP PRODUCTION',3.18,23.4,-5,1.7).rotation.y=-Math.PI/2;
  // Staggered partitions force a long route instead of a direct shortcut.
  const frost=mat('#a8c9bd',{roughness:.95,transparent:true,opacity:.83,depthWrite:false});
  function partition(x1,x2,z){
    box(area.group,x2-x1,.8,.15,(x1+x2)/2,21.4,z,white);
    box(area.group,x2-x1,2.25,.055,(x1+x2)/2,22.925,z,frost,false);
    box(area.group,x2-x1,.35,.15,(x1+x2)/2,24.225,z,white);
    for(let x=x1;x<x2;x+=1.5)box(area.group,.045,2.3,.09,x,22.925,z,metal,false);
    for(const y of[21.8,24.05])box(area.group,x2-x1,.055,.08,(x1+x2)/2,y,z,metal,false);
  }
  partition(3.5,25.3,-1);partition(8,31,5.5);
  function officeTable(x,z,posts,length){
    const existing=new Set(area.group.children);
    sixSeatTable(area,x,z,0,posts,length);
    // The shared office builder uses local ground height. Move the complete
    // bank and every workstation sibling to this floor before collider baking.
    for(const child of area.group.children)if(!existing.has(child))child.position.y+=21;
  }
  officeTable(15,-8.6,3,18);
  officeTable(16,1.6,3,18);
  officeTable(14,8.1,2,14);
  for(const [text,x,z]of[['01 · PRODUCCIÓN',15,-.91],['02 · EQUIPOS',17,5.59],['03 · PECERA',25,11.99]]){
    sign(area.group,text,x,23.15,z,3.4,'#e5c57f','#465d5d').rotation.y=Math.PI;
  }
  // Tall glazed meeting room, with a real door opening at the final aisle.
  const glazing=mat('#a8cecf',{transparent:true,opacity:.2,roughness:.2,depthWrite:false});
  for(const[z1,z2]of[[5.6,9.45],[11.9,12]]){
    box(area.group,.055,2.65,z2-z1,23,22.55,(z1+z2)/2,glazing,false);
    for(const z of[z1,z2])box(area.group,.09,3.25,.06,23,22.625,z,metal);
  }
  box(area.group,.08,.45,2.45,23,24.175,10.675,white);
  sign(area.group,'PECERA · REUNIONES',22.94,23.7,10.35,2.2).rotation.y=-Math.PI/2;
  box(area.group,4.8,.12,1.8,27.4,22.6,8.5,wood);
  for(const x of[25.4,29.4])for(const z of[7.85,9.15])box(area.group,.09,1.55,.09,x,21.775,z,metal);
  for(const x of[25.8,27.4,29])for(const z of[6.9,10.15]){
    box(area.group,.65,.12,.65,x,21.65,z,palette.dark);box(area.group,.66,.7,.09,x,22,z+(z<8?-.3:.3),palette.dark);
    cylinder(area.group,.045,.045,.6,x,21.3,z,metal);
  }
  sign(area.group,'WPP Production',28,23.25,11.99,3.5,'#e6b3ce','#e0d9ce').rotation.y=Math.PI;
  const salad=new THREE.Group();salad.position.set(DESCENT_TASKS.salad.x,22.68,DESCENT_TASKS.salad.z);salad.userData.nonPhysical=true;area.group.add(salad);
  const bowl=mat('#ddcbb0',{roughness:.94});cylinder(salad,.37,.25,.22,0,.1,0,bowl);
  sign(salad,'Blé',0,.11,.366,.45,'#382f25','#ddcbb0');
  for(let i=0;i<18;i++){
    const a=i*2.4,leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),mat(i%3?'#61723c':'#836435'));
    leaf.scale.set(.13,.035,.095);leaf.position.set(Math.sin(a)*.24,.22+(i%3)*.025,Math.cos(a)*.23);leaf.rotation.y=a;salad.add(leaf);
  }
  for(const x of[-.12,.11]){const fly=new THREE.Mesh(new THREE.SphereGeometry(.015,6,4),palette.dark);fly.position.set(x,.45,x*.7);salad.add(fly);}
  // Ceiling grid and fixtures match the character of the approved office.
  const fixture=mat('#dce3db',{emissive:'#c8d9cd',emissiveIntensity:.55});
  for(let x=5;x<=30;x+=2)box(area.group,.025,.025,24,x,24.3,0,metal,false);
  for(let z=-12;z<=12;z+=2)box(area.group,27.5,.025,.025,17.25,24.3,z,metal,false);
  for(const x of[8,16,25])for(const z of[-5,4,10.5])box(area.group,1.2,.05,.6,x,24.27,z,fixture,false);
  for(const[x,z]of[[4.5,-10.8],[29,3],[21.5,6.4]]){
    cylinder(area.group,.28,.22,.6,x,21.3,z,white);
    for(let i=0;i<7;i++){const a=i*2.4;rod(area.group,new THREE.Vector3(x,21.6,z),new THREE.Vector3(x+Math.sin(a)*.3,22.5,z+Math.cos(a)*.3),.03,mat('#60774a'));}
  }
  const actor=new THREE.Group();actor.userData.nonPhysical=true;actor.visible=false;area.group.add(actor);
  const skin=mat('#bc947b'),shirt=mat('#8babb9'),pants=mat('#2e3d4c'),hair=mat('#473a32');
  box(actor,.36,.18,.25,0,.85,0,pants);
  box(actor,.44,.6,.28,0,1.24,0,shirt);
  cylinder(actor,.07,.08,.12,0,1.59,0,skin);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12),skin);head.scale.y=1.17;head.position.y=1.79;actor.add(head);
  const scalp=new THREE.Mesh(new THREE.SphereGeometry(.175,16,10,0,Math.PI*2,0,Math.PI/2),hair);scalp.position.y=1.83;actor.add(scalp);
  for(const x of [-.06,.06]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.012,6,4),palette.dark);eye.position.set(x,1.8,.16);actor.add(eye);}
  box(actor,.095,.13,.01,-.1,1.3,.147,palette.white,false);
  const limbs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.105,.82,0);actor.add(leg);
    cylinder(leg,.07,.065,.68,0,-.34,0,pants);box(leg,.15,.09,.26,0,-.73,.055,palette.dark);limbs.push({mesh:leg,phase:side,amount:.32});
    const arm=new THREE.Group();arm.position.set(side*.285,1.46,0);actor.add(arm);
    cylinder(arm,.06,.045,.5,0,-.25,0,shirt);const hand=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),skin);hand.scale.y=1.4;hand.position.y=-.55;arm.add(hand);limbs.push({mesh:arm,phase:-side,amount:.22});
  }
  let clock=0,ai=createVisitorAI();
  const coneMaterial=new THREE.MeshBasicMaterial({color:'#e6b65d',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false});
  const coneGeometry=new THREE.BufferGeometry(),positions=new Float32Array(32*9);coneGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const cone=new THREE.Mesh(coneGeometry,coneMaterial);cone.userData.nonPhysical=true;cone.visible=false;cone.frustumCulled=false;area.group.add(cone);
  const body={x1:0,x2:0,z1:0,z2:0,bottom:-100,top:-99,visitor:true};area.solids.push(body);
  let coneClock=0;
  function updatePose(dt){
    actor.position.set(ai.x,21,ai.z);actor.rotation.y=Math.atan2(ai.facingX,ai.facingZ);
    for(const limb of limbs){limb.mesh.rotation.x=ai.walking?Math.sin(clock*(ai.phase==='chase'?10:6))*limb.phase*limb.amount:0;}
    if(ai.phase==='stomp')limbs[0].mesh.rotation.x=-Math.sin(Math.min(1,ai.attackTime/.45)*Math.PI)*1.4;
    body.x1=ai.x-.24;body.x2=ai.x+.24;body.z1=ai.z-.24;body.z2=ai.z+.24;
    coneClock-=dt;if(coneClock<=0){coneClock=.1;const outline=visionOutline(ai,area.solids);let n=0;for(let i=0;i<32;i++)for(const pt of[{x:ai.x,z:ai.z},outline[i],outline[i+1]]){positions[n++]=pt.x;positions[n++]=21.018;positions[n++]=pt.z;}coneGeometry.attributes.position.needsUpdate=true;}
    coneMaterial.color.set(ai.phase==='patrol'?'#e6b65d':'#ed5744');
  }
  return {
    salad,
    shouldIntroduce:p=>shouldIntroduceVisitor(getState(),p),
    introduce(){getState().visitorIntroduced=true;clock=0;ai=createVisitorAI();actor.visible=cone.visible=true;updatePose(1);},
    reset(){clock=0;ai=createVisitorAI();actor.visible=cone.visible=false;body.bottom=-100;body.top=-99;},
    pose:()=>({...ai}),
    tick(dt,p,watch=true){
      if(!getState().visitorIntroduced){actor.visible=cone.visible=false;body.bottom=-100;body.top=-99;return{meter:0,caught:false,inside:false,phase:'patrol'};}
      actor.visible=cone.visible=true;body.bottom=21;body.top=22.98;clock+=dt;
      const sight=stepVisitor(ai,dt,p,area.solids,watch);updatePose(dt);
      return{...sight,inside:inFloor7(p)};
    }
  };
}
