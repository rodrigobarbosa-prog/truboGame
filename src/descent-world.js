import * as THREE from 'three';
import {DESCENT_TASKS,createDescentState,descentActionAt,applyDescentAction,advanceValve,descentExitReady,descentGoal,flightHeight} from './descent.js';
import {buildPantry} from './pantry-world.js';
import {buildStairHazards} from './stair-hazards.js';
import {stairLightLevel} from './health.js';

// Additions are confined to the staircase at floor 13 and below.
export function buildDescent(area,{box,cylinder,rod,sign,mat,palette,coffee,carpetBugs,drop,sixSeatTable}){
  let state=createDescentState(),time=0;
  const metal=mat('#9aa9a8',{metalness:.65,roughness:.38}),cardboard=mat('#a67b49'),danger=mat('#cb6c53'),mint=mat('#a9db99',{emissive:'#6da25b',emissiveIntensity:.65});
  const taskMeshes={},gates=[];
  const addCrate=(x,y,z,w=.8,h=.45,d=.8)=>{
    const mesh=box(area.group,w,h,d,x,y+h/2,z,cardboard);
    box(area.group,w+.008,.035,d+.008,x,y+h*.55,z,mat('#d4b988'));
    return mesh;
  };
  function gate(floor,id){
    const y=floor*3,g=new THREE.Group();g.userData.nonPhysical=true;area.group.add(g);
    for(const z of [-5.9,-4.1])box(g,.1,2.65,.09,0,y+1.325,z,metal);
    for(let z=-5.7;z<-4.1;z+=.22)box(g,.055,2.55,.035,0,y+1.275,z,danger);
    for(const h of [.1,1.3,2.6])box(g,.09,.06,1.9,0,y+h,-5,metal);
    const solid={x1:-.08,x2:.08,z1:-5.98,z2:-4.02,bottom:y,top:y+2.65,gateId:id};
    gates.push({id,mesh:g,solid});area.solids.push(solid);
  }
  for(let floor=13;floor>=1;floor--){
    const y=floor*3,color=floor>=10?'#b99264':floor>=6?'#6b9aa3':'#8b9b72';
    for(const x of [-3.29,3.29])box(area.group,.035,.24,floor===7&&x>0?10:11.9,x,y+.28,floor===7&&x>0?.95:0,mat(color));
    const title=floor>=10?'DEPÓSITOS':floor>=6?'MANTENIMIENTO':'SERVICIOS';
    sign(area.group,`${floor} · ${title}`,0,y+2.1,-6.08,2.4,'#f5e9cf',color);
    // Alternating crates leave the opposite half of each flight clear.
    if([13,11,9,7,5,3,1].includes(floor)){
      const x=floor%4===1?-2.35:-.95,z=.3;
      addCrate(x,flightHeight(floor,-1,z),z,.72,.42,.5);
    }
    if([12,10,8,6,4,2].includes(floor)){
      const z=-.6,x=floor%4?2.35:.95;
      addCrate(x,flightHeight(floor,1,z),z,.72,.38,.5);
    }
    // Coffee at intermediate landings can be avoided along their edges.
    if([13,10,7,5,2].includes(floor))coffee(area,0,5,y-1.5,.55,.32);
    if([11,9,6,3,1].includes(floor)){
      const z=1.3;carpetBugs(area,1.55,z,floor*.7,flightHeight(floor,1,z));
    }
    if([13,9,5,1].includes(floor))drop(area,1.3,y+.35,-5.2);
    // Low cables can be jumped; the remaining width stays unobstructed.
    if([10,6,2].includes(floor)){
      const z=2.6,y0=flightHeight(floor,-1,z);
      box(area.group,.95,.28,.12,-2.3,y0+.14,z,palette.dark);
      box(area.group,.95,.025,.13,-2.3,y0+.285,z,mint,false);
    }
  }
  // Floor 12: retrieve the fuse from a climbable box, then install it.
  addCrate(2.15,36,-5.4,.85,.45,.85);
  const fuse=new THREE.Group();fuse.position.set(2.15,36.49,-5.4);fuse.userData.nonPhysical=true;area.group.add(fuse);
  const fuseBody=cylinder(fuse,.065,.065,.35,0,0,0,mint);fuseBody.rotation.z=Math.PI/2;
  for(const x of [-.18,.18])box(fuse,.08,.14,.14,x,0,0,metal);
  taskMeshes.fuse=fuse;
  box(area.group,.14,.95,.72,3.08,37.05,-4.75,palette.dark);
  sign(area.group,'FUSIBLE · E',2.98,37.05,-4.75,1).rotation.y=-Math.PI/2;
  sign(area.group,'12 · ACTIVA LA EMERGENCIA',1.9,37.9,-6.07,2.1);
  gate(12,'power');

  // Optional floor-10 rescue: a firefly trapped beneath a plastic cup.
  addCrate(2.1,30,-5.35,.85,.45,.85);
  const rescue=new THREE.Group();rescue.position.set(2.1,30.49,-5.35);rescue.userData.nonPhysical=true;area.group.add(rescue);
  cylinder(rescue,.19,.25,.38,0,.18,0,mat('#c6ddd0',{transparent:true,opacity:.25,roughness:.3}));
  const firefly=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),mint);firefly.position.y=.13;rescue.add(firefly);taskMeshes.luma=rescue;
  sign(area.group,'LUMA · RESCATE OPCIONAL',1.8,31.7,-6.07,2.2);

  // Floor 8: close the leaking maintenance valve by holding E.
  const pipeMat=mat('#668c99',{metalness:.3,roughness:.7});
  cylinder(area.group,.08,.08,2.25,3.02,25.125,-5.05,pipeMat);
  const wheel=new THREE.Mesh(new THREE.TorusGeometry(.25,.035,8,24),danger);wheel.rotation.y=Math.PI/2;wheel.position.set(2.9,25.05,-5.05);area.group.add(wheel);
  for(const y of [24.8,25.3])rod(area.group,new THREE.Vector3(2.9,y,-5.05),new THREE.Vector3(2.9,25.05,-5.05),.015,metal);
  const leak=new THREE.Mesh(new THREE.CircleGeometry(.45,28),mat('#6d9ea4',{transparent:true,opacity:.5,roughness:.2}));leak.rotation.x=-Math.PI/2;leak.position.set(2.5,24.014,-4.7);area.group.add(leak);
  sign(area.group,'8 · CERRÁ LA VÁLVULA',1.9,25.9,-6.07,2.1);
  gate(8,'valve');
  const pantry=buildPantry(area,{box,cylinder,rod,sign,mat,palette,sixSeatTable},()=>state);
  for(const[x,z,phase]of[[9,-5.2,7.2],[27,4.8,8.3],[8,11.1,9.4]])carpetBugs(area,x,z,phase,21);
  buildStairHazards(area,{cylinder,rod,mat,palette});
  taskMeshes.salad=pantry.salad;
  sign(area.group,'7 · BUSCÁ LAS PROVISIONES',1.85,22.9,-6.07,2.1);
  gate(7,'salad');

  // Floor 4: a service key on the highest of three climbable crates.
  for(const [z,h] of [[-4.55,.3],[-5.1,.6],[-5.65,.9]])addCrate(2.15,12,z,.8,h,.5);
  const key=new THREE.Group();key.position.set(2.15,12.96,-5.65);key.userData.nonPhysical=true;area.group.add(key);
  const keyMat=mat('#ddbb67',{metalness:.55,roughness:.32});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,8,20),keyMat);ring.rotation.x=Math.PI/2;key.add(ring);
  box(key,.04,.035,.28,0,0,.22,keyMat);box(key,.12,.035,.04,.04,0,.3,keyMat);taskMeshes.key=key;
  sign(area.group,'4 · LLAVE DE PLANTA BAJA',1.85,13.9,-6.07,2.1);
  gate(4,'key');
  sign(area.group,'PB · LLAVE Y SISTEMAS LISTOS',0,2.1,-6.03,2.8);

  const lamp=new THREE.PointLight('#dbe8bf',0,8,2);area.group.add(lamp);
  const rescueGlow=new THREE.PointLight('#c5e68b',.65,3,2);rescueGlow.position.set(2.1,30.7,-5.35);area.group.add(rescueGlow);
  const companion=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),mint);companion.visible=false;area.group.add(companion);
  function sync(){
    for(const id of ['fuse','salad','key','luma'])taskMeshes[id].visible=!state[id];
    for(const gate of gates){
      gate.mesh.visible=!state[gate.id];
      area.solids=area.solids.filter(s=>s.gateId!==gate.id);
      if(!state[gate.id])area.solids.push(gate.solid);
    }
    leak.visible=!state.valve;
    rescueGlow.visible=!state.luma;
    wheel.rotation.x=state.valve?Math.PI*2:state.valveCharge*Math.PI;
  }
  return {
    get state(){return state;},
    reset(){state=createDescentState();time=0;companion.visible=false;lamp.intensity=0;pantry.reset();sync();},
    visitor:pantry,
    objective:()=>descentGoal(state),
    ready:()=>descentExitReady(state),
    action:p=>descentActionAt(state,p),
    use(p){const action=descentActionAt(state,p);if(!action)return null;const result=applyDescentAction(state,action.id);sync();return result;},
    tick(dt,p,holding){
      time+=dt;const action=descentActionAt(state,p),completed=advanceValve(state,dt,holding&&action?.id==='valve');
      companion.visible=state.luma;companion.position.set(p.x+.45,p.y+.85+Math.sin(time*3)*.1,p.z+.15);
      lamp.position.set(p.x,p.y+1,p.z);lamp.intensity=p.y<40?(state.luma?5:.04+stairLightLevel(p.y)*.4):0;
      if(completed){sync();return {text:'Válvula cerrada. La fuga se detuvo y la reja del piso 8 se abrió.'};}
      if(action?.id==='valve')wheel.rotation.x=state.valveCharge*Math.PI;
      return null;
    }
  };
}
