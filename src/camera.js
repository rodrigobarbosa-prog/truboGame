// Keep the camera on Turbo's side of solid surfaces, including frosted glass.
export function clearCameraPosition(target,desired,solids){
  const direction={x:desired.x-target.x,y:desired.y-target.y,z:desired.z-target.z};
  const length=Math.hypot(direction.x,direction.y,direction.z);
  let nearest=1;
  for(const solid of solids){
    if(solid.ramp)continue;
    const lower={x:solid.x1-.08,y:solid.bottom-.08,z:solid.z1-.08};
    const upper={x:solid.x2+.08,y:solid.top+.08,z:solid.z2+.08};
    let enter=0,leave=1,hit=true;
    for(const axis of ['x','y','z']){
      if(Math.abs(direction[axis])<1e-9){if(target[axis]<lower[axis]||target[axis]>upper[axis]){hit=false;break;}continue;}
      let a=(lower[axis]-target[axis])/direction[axis],b=(upper[axis]-target[axis])/direction[axis];
      if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);leave=Math.min(leave,b);
      if(enter>leave){hit=false;break;}
    }
    // A target already touching its climbing surface must remain viewable.
    if(hit&&enter>.001)nearest=Math.min(nearest,Math.max(0,enter-.06/(length||1)));
  }
  return desired.clone().lerpVectors(target,desired,nearest);
}
