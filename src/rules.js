// World units are metres; time is expressed in in-game seconds.
export const DAY = 86400;
export const TIME_LIMIT = 2 * DAY;
export const TIME_RATE = 240;
export const RACE_ROUTE = 'floor14-passages-v4';
export function progressPoints({zone,x,y,z,ledgeStage=0,passageStage=0,escaped=false}) {
  if(escaped)return 10000;
  if(zone==='street')return 9500+Math.floor(400*clamp((z+5)/14,0,1));
  if(zone==='stairs')return 2800+Math.floor(6700*clamp((42-y)/42,0,1));
  if(zone==='floor14')return 2600+Math.floor(200*clamp((clamp(z+6,0,2.5)+clamp(-x,0,13.5))/16,0,1));
  if(zone==='passage2'){
    const from=passageStage?PASSAGE_ROUTE[Math.min(passageStage,PASSAGE_ROUTE.length)-1]:{x:-10,z:-10.7};
    let walked=0,total=0,previous={x:-10,z:-10.7};
    for(let i=0;i<PASSAGE_ROUTE.length;i++){const next=PASSAGE_ROUTE[i],length=Math.hypot(next.x-previous.x,next.z-previous.z);total+=length;if(i<passageStage)walked+=length;previous=next;}
    if(passageStage<PASSAGE_ROUTE.length){const to=PASSAGE_ROUTE[passageStage],dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);walked+=clamp(((x-from.x)*dx+(z-from.z)*dz)/length,0,length);}
    return 1600+Math.floor(1000*clamp(walked/total,0,1));
  }
  let distance=0;
  if(ledgeStage===0)distance=clamp(10.5-x,0,23.1);
  else if(ledgeStage===1)distance=23.1+clamp(z+10.7,0,19.4);
  else if(ledgeStage===2)return 1000+Math.floor(600*clamp((x+12.6)/23.1,0,1));
  else return 1600;
  return Math.floor(1000*clamp(distance/42.5,0,1));
}
export function progressLabel(points){
  if(points>=10000)return '¡Escapó a la calle!';
  if(points>=9500)return 'Planta baja · hall de salida';
  if(points>=2800){const floor=Math.max(0,Math.ceil(14*(1-(points-2800)/6700)));return `Piso ${floor} · escaleras`;}
  if(points>=2600)return 'Piso 14 · fuera de la oficina';
  if(points>=1600)return 'Piso 14 · pasillo 2';
  if(points>=1000)return 'Piso 14 · pasillo 1';
  if(points>=925)return 'Piso 14 · rampa';
  if(points>0)return 'Piso 14 · repisa de los ventanales';
  return 'Piso 14 · en la hoja';
}
export const START = Object.freeze({ x: 10.5, y: 1.92, z: -10.65 });
export const RADIUS = 0.23;
export const STEP = 0.24;
// Walking off the starting leaf drops 0.67 m; descending stairs/ramp is also safe.
// A fall from the sill to the office floor is fatal, including after the last corner.
export const FATAL_DROP = .9;
export function fatalFall(highestY,footY){return highestY-footY>FATAL_DROP;}
export const WINDOW = Object.freeze({ left:-13.1, right:13.1, bottom:1.25, top:4.9, z:-11.62 });
export const WALL_SPEED = .22;
export const LEDGE_HEIGHT = 1.25;
export const LEDGE_ROUTE = Object.freeze([
  {x:-12.6,z:-10.7,label:'Seguí el bordecito de los ventanales hacia la izquierda.'},
  {x:-12.6,z:8.7,label:'Rodeá la oficina hasta la rampa amarilla de la esquina.'},
  {x:10.5,z:8.7,label:'Pasillo 1: seguí hasta el acceso al siguiente nivel del piso 14.'}
]);
export const PASSAGE_ROUTE=Object.freeze([
  {x:8.5,z:-9},{x:8.5,z:8.5},{x:-9.8,z:8.5},{x:-10,z:4}
]);
export const OFFICE_DOOR=Object.freeze({x:-10,z:4});
export function passageToWorld(p){return {x:24.9+p.z,y:p.y??0,z:-1.3-p.x};}
export function worldToPassage(p){return {x:-p.z-1.3,y:p.y??0,z:p.x-24.9};}
export function inPassage(p){return p.x>13.35&&p.x<36.6&&p.z<10.5;}
export function inLiftLobby(p){return p.x>14.7&&p.x<33.6&&p.z>=10.5&&p.z<15.2;}
export function onGlass(x,y) {
  return x>=WINDOW.left&&x<=WINDOW.right&&y>=WINDOW.bottom&&y<=WINDOW.top;
}
export function ledgeSurfaces() {
  return [
    {x1:-13.25,x2:13.3,z1:-11.7,z2:-10.05,y:LEDGE_HEIGHT},
    {x1:-13.25,x2:-11.95,z1:-11.7,z2:5.5,y:LEDGE_HEIGHT},
    {x1:-13.25,x2:-11.95,z1:5.5,z2:8.7,y:LEDGE_HEIGHT,endY:0}
  ];
}
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function formatTime(seconds) {
  const t = Math.max(0, Math.ceil(seconds));
  return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map(v => String(v).padStart(2, '0')).join(':');
}
export function contains(surface, x, z, margin = 0) {
  return x >= surface.x1 - margin && x <= surface.x2 + margin && z >= surface.z1 - margin && z <= surface.z2 + margin;
}
export function surfaceY(s, z) {
  return s.endY === undefined ? s.y : s.y + (s.endY - s.y) * clamp((z - s.z1) / (s.z2 - s.z1), 0, 1);
}
export function supportHeight(surfaces, x, z, footY) {
  let highest = -Infinity;
  for (const s of surfaces) {
    if (!contains(s, x, z, 0.025)) continue;
    const y = surfaceY(s, z);
    if (y <= footY + STEP && y > highest) highest = y;
  }
  return highest;
}
export function blocked(solids, x, z, y) {
  return solids.some(s => {
    if(!contains(s,x,z,RADIUS))return false;
    const top=s.ramp?surfaceY(s.ramp,z):s.top,bottom=s.ramp?top-.065:s.bottom;
    return y<top-(s.stepable?STEP:.08)&&y+.6>bottom+.015;
  });
}
export function blockedOnGlass(solids,x,y,z){
  return solids.some(s=>x+.23>s.x1&&x-.23<s.x2&&y+.75>s.bottom&&y-.04<s.top&&z+.65>s.z1&&z+.025<s.z2);
}
export function stairSurfaces() {
  const surfaces = [{ x1:-3, x2:3, z1:-6, z2:-4, y:42, floor:14, landing:true }];
  for (let floor = 14; floor > 0; floor--) {
    const top = floor * 3;
    for (let step = 0; step < 12; step++) {
      surfaces.push({ x1:-3, x2:-0.25, z1:-4 + step * 2/3, z2:-4 + (step+1) * 2/3, y:top - (step+1) * 0.125 });
      surfaces.push({ x1:0.25, x2:3, z1:4 - (step+1) * 2/3, z2:4 - step * 2/3, y:top - 1.5 - (step+1) * 0.125 });
    }
    surfaces.push({ x1:-3, x2:3, z1:4, z2:6, y:top-1.5 });
    surfaces.push({ x1:-3, x2:3, z1:-6, z2:-4, y:top-3, floor:floor-1, landing:true });
  }
  return surfaces;
}
export function checkpointAt(surfaces, position, currentFloor) {
  return surfaces.find(s => s.landing && s.floor < currentFloor && contains(s, position.x, position.z) && Math.abs(s.y - position.y) < 0.18);
}
