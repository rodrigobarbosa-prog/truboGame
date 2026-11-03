export const MAX_HEALTH=100;
export const CONTACT_DAMAGE={spiders:25,glass:20};
export function createHealth(){return{value:MAX_HEALTH,cooldown:0};}
// A shared invulnerability interval prevents physics substeps from multiplying
// damage, and stops crossing adjacent shards from draining an entire life.
export function healthStep(state,contact,dt){
  state.cooldown=Math.max(0,state.cooldown-dt);
  const amount=CONTACT_DAMAGE[contact]||0;
  if(!amount||state.cooldown>0)return{hit:false,dead:false};
  state.value=Math.max(0,state.value-amount);state.cooldown=1;
  return{hit:true,dead:state.value===0,amount};
}
export function stairLightLevel(y){
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  return 1-smooth((y-24)/.65)*smooth((31.3-y)/.65);
}
