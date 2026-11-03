export const DESCENT_TASKS=Object.freeze({
  fuse:{x:2.15,y:36.49,z:-5.4,label:'Recoger fusible de emergencia'},
  power:{x:2.6,y:36,z:-4.65,label:'Colocar fusible · activar emergencia'},
  valve:{x:2.35,y:24,z:-5.05,label:'Mantené E · cerrar la válvula'},
  salad:{x:28.3,y:22.68,z:8.5,label:'Recoger bol del Blé · ensalada vieja'},
  key:{x:2.15,y:12.96,z:-5.65,label:'Recoger llave de planta baja'},
  luma:{x:2.1,y:30.49,z:-5.35,label:'Liberar a Luma · rescate opcional'}
});
export function createDescentState(){return {fuse:false,power:false,valve:false,valveCharge:0,salad:false,key:false,luma:false,visitorIntroduced:false};}
export function descentActionAt(state,p){
  for(const [id,task] of Object.entries(DESCENT_TASKS)){
    if(state[id])continue;
    const height=['power','valve'].includes(id)?.65:.28;
    if(Math.hypot(p.x-task.x,p.z-task.z)<.85&&Math.abs(p.y-task.y)<height)return {id,...task};
  }
  return null;
}
export function applyDescentAction(state,id){
  if(state[id])return null;
  if(id==='fuse'){state.fuse=true;return {text:'Fusible conseguido. Colocalo en el panel de la pared con E.'};}
  if(id==='power'){
    if(!state.fuse)return {text:'Falta el fusible. Está sobre la caja del descanso del piso 12.'};
    state.power=true;return {text:'Emergencia activada. La reja del piso 12 se abrió.'};
  }
  if(id==='valve')return {text:'Mantené E junto a la válvula durante 2 segundos para cerrarla.'};
  if(id==='salad'){state.salad=true;return {text:'Ensalada recuperada. Turbo tiene provisiones y la reja del piso 7 se abrió. ¡Volvé sin que te vean!',bonus:900};}
  if(id==='key'){state.key=true;return {text:'Llave de planta baja conseguida. Ya podés continuar el descenso.'};}
  if(id==='luma'){state.luma=true;return {text:'¡Luma está libre! Te acompaña con su luz. Ganaste 30 minutos de juego.',bonus:1800};}
  return null;
}
export function advanceValve(state,dt,holding){
  if(state.valve)return false;
  state.valveCharge=holding?Math.min(2,state.valveCharge+dt):0;
  if(state.valveCharge>=2){state.valve=true;return true;}
  return false;
}
export function descentExitReady(state){return state.power&&state.valve&&state.salad&&state.key;}
export function descentGoal(state){
  if(!state.power)return 'Piso 12: buscá el fusible sobre la caja y activá el panel de emergencia.';
  if(!state.valve)return 'Piso 8: cerrá la válvula de mantenimiento para liberar la siguiente reja.';
  if(!state.salad)return 'Piso 7: recorré los tres pasillos de WPP. El bol del Blé está sobre la mesa de la pecera, al fondo. Evitá al merodeador.';
  if(!state.key)return 'Piso 4: trepá a las cajas y recuperá la llave de planta baja.';
  return 'Todo listo. Bajá hasta PB y abrí la salida con la llave.';
}
export function flightHeight(floor,side,z){
  const step=Math.max(0,Math.min(11,Math.floor((side<0?z+4:4-z)/(2/3))));
  return floor*3-(side<0?0:1.5)-(step+1)*.125;
}
