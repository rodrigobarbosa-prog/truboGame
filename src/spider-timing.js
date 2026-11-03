export const HANGING_SPIDERS=Object.freeze([-8,-5.2,-2.4,.4,3.2].map((z,i)=>({x:-12.6,z,phase:i*1.15})));
export const SPIDER_CYCLE=6.4;
export function hangingSpiderPose(time,phase=0){
  const t=((time+phase)%SPIDER_CYCLE+SPIDER_CYCLE)%SPIDER_CYCLE;
  const ease=u=>u*u*(3-2*u),low=1.48,high=4.85;
  // Hold high, descend visibly, wait on the ledge, then retract.
  const y=t<2.6?high:t<3.7?high+(low-high)*ease((t-2.6)/1.1):t<5.2?low:low+(high-low)*ease((t-5.2)/1.2);
  return{y,ceiling:5.38,warning:t>=2.15&&t<5.6};
}
export function hangingSpiderTouchesHeight(p,y){return p.y+.6>y-.2&&p.y<y+.25;}
