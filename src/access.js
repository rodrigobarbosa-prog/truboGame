export const CARD_HINT='Buscá la tarjeta de acceso para poder abrir la puerta y salir al pasillo de ascensores.';
export function canCollectCard(p,card){
  return Math.hypot(p.x-card.x,p.z-card.z)<.75&&Math.abs(p.y-card.y)<.35;
}
export function canOpenOfficeDoor(hasCard){return hasCard===true;}
