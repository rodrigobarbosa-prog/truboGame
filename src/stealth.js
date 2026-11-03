export const FLOOR7={x1:3.5,x2:31,z1:-12,z2:12,y:21};
export const PATROL_POINTS=[{x:26.8,z:-4},{x:28,z:4.8},{x:6,z:4.8},{x:6,z:11.2},{x:21.5,z:11.2}];
export function inFloor7(p){return p.x>3.15&&p.x<31.1&&p.z>-12&&p.z<12&&Math.abs(p.y-21)<2.8;}
export function patrolPose(time){
  const points=[...PATROL_POINTS,...PATROL_POINTS.slice(1,-1).reverse()],speed=1,pause=1.25;
  const lengths=points.map((a,i)=>Math.hypot(points[(i+1)%points.length].x-a.x,points[(i+1)%points.length].z-a.z));
  const cycle=lengths.reduce((s,d)=>s+d/speed+pause,0);let t=((time%cycle)+cycle)%cycle;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],d=lengths[i],travel=d/speed;
    if(t<travel+pause){const f=Math.min(1,t/travel);return{x:a.x+(b.x-a.x)*f,y:21,z:a.z+(b.z-a.z)*f,facingX:(b.x-a.x)/d,facingZ:(b.z-a.z)/d,walking:t<travel};}t-=travel+pause;}
}
export function rayFraction(from,to,solids){
  const d={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z};let nearest=1;
  for(const s of solids){
    if(s.visitor||s.ramp)continue;let near=0,far=1,hit=true;
    for(const [axis,lo,hi]of[['x',s.x1,s.x2],['y',s.bottom,s.top],['z',s.z1,s.z2]]){
      if(Math.abs(d[axis])<1e-8){if(from[axis]<lo||from[axis]>hi){hit=false;break;}continue;}
      let a=(lo-from[axis])/d[axis],b=(hi-from[axis])/d[axis];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far){hit=false;break;}
    }
    if(hit&&near>.002&&near<.995)nearest=Math.min(nearest,near);
  }return nearest;
}
export function visitorCanSee(p,pose,solids){
  if(!inFloor7(p))return false;const dx=p.x-pose.x,dz=p.z-pose.z,d=Math.hypot(dx,dz);
  if(d>7)return false;if(d>.65&&(dx*(pose.facingX||0)+dz*pose.facingZ)/d<Math.cos(Math.PI/4))return false;
  return rayFraction({x:pose.x,y:22.6,z:pose.z},{x:p.x,y:p.y+.25,z:p.z},solids)===1;
}
export function visionOutline(pose,solids){
  const angle=Math.atan2(pose.facingX||0,pose.facingZ),points=[];
  for(let i=0;i<=32;i++){const a=angle-Math.PI/4+i*Math.PI/64,to={x:pose.x+Math.sin(a)*7,y:21.25,z:pose.z+Math.cos(a)*7},f=rayFraction({x:pose.x,y:22.6,z:pose.z},to,solids);points.push({x:pose.x+(to.x-pose.x)*f,z:pose.z+(to.z-pose.z)*f});}return points;
}
export function suspicionStep(current,seen,dt){return Math.max(0,Math.min(1,current+(seen?dt/.6:-dt*1.6)));}
export function shouldIntroduceVisitor(state,p){return !state.visitorIntroduced&&p.x>3.05&&p.x<4.8&&Math.abs(p.y-21)<.8&&p.z>-6.1&&p.z<-3.8;}
// A small navigation grid keeps the pursuer on the floor and outside desks,
// glazing and walls. Targets on furniture resolve to the closest reachable cell.
export function visitorPath(from,to,solids){
  const step=.5,x0=3.75,z0=-11.5,nx=55,nz=47;
  const obstacles=solids.filter(s=>!s.visitor&&!s.ramp&&s.top>21.15&&s.bottom<22.9&&s.x2>3.4&&s.x1<31.2&&s.z2>-12&&s.z1<12);
  const point=id=>({x:x0+(id%nx)*step,z:z0+Math.floor(id/nx)*step});
  const idAt=p=>Math.max(0,Math.min(nx-1,Math.round((p.x-x0)/step)))+nx*Math.max(0,Math.min(nz-1,Math.round((p.z-z0)/step)));
  const free=new Int8Array(nx*nz);free.fill(-1);
  const open=id=>{if(free[id]<0){const p=point(id);free[id]=obstacles.some(s=>p.x>s.x1-.28&&p.x<s.x2+.28&&p.z>s.z1-.28&&p.z<s.z2+.28)?0:1;}return free[id]===1;};
  const start=idAt(from),parents=new Int32Array(nx*nz);parents.fill(-2);parents[start]=-1;const queue=[start];let best=start,bestD=Infinity;
  for(let q=0;q<queue.length;q++){const id=queue[q],p=point(id),d=Math.hypot(p.x-to.x,p.z-to.z);if(d<bestD){best=id;bestD=d;}if(d<.3)break;
    const x=id%nx,z=Math.floor(id/nx);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;const next=zz*nx+xx;if(parents[next]!==-2||!open(next))continue;parents[next]=id;queue.push(next);}
  }
  const path=[];for(let id=best;id!==start&&id!==-1;id=parents[id])path.push(point(id));return path.reverse();
}
export function createVisitorAI(){return{x:26.8,y:21,z:-4,facingX:0,facingZ:1,walking:false,phase:'patrol',meter:0,routeIndex:1,direction:1,path:[],repath:0,lost:0,attackTime:0,cooldown:0,lastSeen:null};}
export function stepVisitor(ai,dt,p,solids,watch=true){
  const seen=watch&&visitorCanSee(p,ai,solids);ai.meter=suspicionStep(ai.meter,seen,dt);ai.cooldown=Math.max(0,ai.cooldown-dt);ai.walking=false;
  if(seen){ai.lastSeen={x:p.x,z:p.z};ai.lost=0;if(ai.phase==='patrol'&&ai.meter>=1){ai.phase='chase';ai.repath=0;ai.path=[];}}else ai.lost+=dt;
  const distance=Math.hypot(ai.x-p.x,ai.z-p.z),inReach=distance<.9&&Math.abs(p.y-21)<.85&&rayFraction({x:ai.x,y:21.5,z:ai.z},{x:p.x,y:p.y+.25,z:p.z},solids)===1;
  if(ai.phase==='stomp'){
    ai.attackTime+=dt;if(ai.attackTime>=.45&&ai.attackTime-dt<.45&&inReach)return{caught:true,seen,phase:ai.phase,meter:ai.meter};
    if(ai.attackTime>=.85){ai.phase='chase';ai.cooldown=.8;ai.repath=0;}return{caught:false,seen,phase:ai.phase,meter:ai.meter};
  }
  if(ai.phase==='chase'&&inReach&&ai.cooldown===0){ai.phase='stomp';ai.attackTime=0;return{caught:false,seen,phase:ai.phase,meter:ai.meter};}
  if(ai.phase==='chase'&&ai.lost>6){ai.phase='patrol';ai.path=[];ai.repath=0;ai.routeIndex=PATROL_POINTS.reduce((best,pt,i)=>Math.hypot(pt.x-ai.x,pt.z-ai.z)<Math.hypot(PATROL_POINTS[best].x-ai.x,PATROL_POINTS[best].z-ai.z)?i:best,0);}
  let target=ai.phase==='chase'?ai.lastSeen:PATROL_POINTS[ai.routeIndex];
  if(ai.phase==='patrol'&&Math.hypot(ai.x-target.x,ai.z-target.z)<.55){if(ai.routeIndex===PATROL_POINTS.length-1)ai.direction=-1;if(ai.routeIndex===0)ai.direction=1;ai.routeIndex+=ai.direction;ai.repath=0;target=PATROL_POINTS[ai.routeIndex];}
  ai.repath-=dt;if(ai.repath<=0){ai.path=visitorPath(ai,target,solids);ai.repath=ai.phase==='chase'?.65:2;}
  const next=ai.path[0];if(next){const dx=next.x-ai.x,dz=next.z-ai.z,d=Math.hypot(dx,dz),move=Math.min(d,dt*(ai.phase==='chase'?2.4:1));if(d>.001){ai.x+=dx/d*move;ai.z+=dz/d*move;ai.facingX=dx/d;ai.facingZ=dz/d;ai.walking=true;}if(d-move<.02)ai.path.shift();}
  return{caught:false,seen,phase:ai.phase,meter:ai.meter};
}
