import{blocked,supportHeight,contains,surfaceY}from'./rules.js';
export function createBugMotion(seed=1){return{seed:seed>>>0||1,heading:0,turnIn:0,pause:0,lastTime:null,speed:.15};}
function random(state){state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;}
export function wanderBug(hazard,time,terrain){
  const state=hazard.motionState??=createBugMotion(hazard.seed||1),position=hazard.mesh.position;
  if(state.lastTime!==null&&time<state.lastTime){hazard.motionState=createBugMotion(hazard.seed||1);position.x=hazard.x;position.z=hazard.z;hazard.y=hazard.spawnY??hazard.y;return wanderBug(hazard,time,terrain);}
  const dt=state.lastTime===null?1/60:Math.max(0,Math.min(.05,time-state.lastTime));state.lastTime=time;
  if(dt===0)return;
  const supported=(x,z)=>{
    if(hazard.maxZ!==undefined&&z>hazard.maxZ-.1)return null;
    if(!terrain)return hazard.y;
    const y=supportHeight(terrain.surfaces,x,z,hazard.y+.16);
    const exactSupport=Number.isFinite(y)&&terrain.surfaces.some(s=>contains(s,x,z)&&Math.abs(surfaceY(s,z)-y)<.001);
    return exactSupport&&Math.abs(y-hazard.y)<=.17&&!blocked(terrain.solids,x,z,y)?y:null;
  };
  if(!state.initialized){
    let y=supported(position.x,position.z);
    for(let i=0;y===null&&i<24;i++){const angle=random(state)*Math.PI*2,r=.2+random(state)*1.1,x=hazard.x+Math.sin(angle)*r,z=hazard.z+Math.cos(angle)*r;y=supported(x,z);if(y!==null){position.x=x;position.z=z;}}
    if(y!==null)hazard.y=y;state.initialized=true;
  }
  state.turnIn-=dt;state.pause=Math.max(0,state.pause-dt);
  if(state.turnIn<=0){state.heading+=(random(state)-.5)*Math.PI*2;state.turnIn=.7+random(state)*2.1;state.speed=.1+random(state)*.14;state.pause=random(state)<.3?.2+random(state)*.7:0;}
  if(state.pause===0){const x=position.x+Math.sin(state.heading)*state.speed*dt,z=position.z+Math.cos(state.heading)*state.speed*dt,y=supported(x,z);if(y===null){state.heading+=Math.PI*.65+random(state);state.turnIn=.3;}else{position.x=x;position.z=z;hazard.y=y;}}
  position.y=hazard.y+.03;hazard.mesh.rotation.y=state.heading;
}
