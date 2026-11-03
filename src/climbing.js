import * as THREE from 'three';
import { blocked, RADIUS } from './rules.js';

// Release beyond the walking collision radius, not just beyond the skin of
// the climbing mesh. Search sideways too when another object is beside it.
export function releasePosition(face,p,solids){
  const normal=new THREE.Vector3(face.nx,0,face.nz),side=new THREE.Vector3(normal.z,0,-normal.x);
  for(const distance of [RADIUS+.08,.45,.65,.9,1.2]){
    for(const lateral of [0,.35,-.35,.7,-.7]){
      const next=p.clone().addScaledVector(side,lateral);
      if(face.nx)next.x=face.plane+normal.x*distance;
      else next.z=face.plane+normal.z*distance;
      if(!blocked(solids,next.x,next.z,next.y))return next;
    }
  }
  return null;
}

export function nearestClimbFace(solids,p){
  let nearest=null,best=.8;
  for(const solid of solids){
    if(solid.visitor)continue;
    if(solid.climbLayer==='window')continue;
    if(solid.ramp||solid.top<p.y+.12||solid.bottom>p.y+.65||solid.top-solid.bottom<.08)continue;
    const faces=[
      {nx:1,nz:0,plane:solid.x2,min:solid.z1,max:solid.z2},
      {nx:-1,nz:0,plane:solid.x1,min:solid.z1,max:solid.z2},
      {nx:0,nz:1,plane:solid.z2,min:solid.x1,max:solid.x2},
      {nx:0,nz:-1,plane:solid.z1,min:solid.x1,max:solid.x2}
    ];
    for(const f of faces){
      if(f.max-f.min<.3)continue;
      const distance=f.nx?(p.x-f.plane)*f.nx:(p.z-f.plane)*f.nz;
      const u=f.nx?p.z:p.x,gap=Math.max(f.min-u,0,u-f.max);
      if(distance<-.025||gap>.18)continue;
      const score=Math.hypot(distance,gap);
      if(score<best){best=score;nearest={...f,bottom:solid.bottom,top:solid.top,solid,kind:'object'};}
    }
  }
  return nearest;
}
export function onFace(face,p){
  const u=THREE.MathUtils.clamp(face.nx?p.z:p.x,face.min+.04,face.max-.04);
  return new THREE.Vector3(face.nx?face.plane+face.nx*.035:u,Math.max(face.bottom,p.y),face.nx?u:face.plane+face.nz*.035);
}
export function nearbyGlassFace(p){
  if(p.y<1.2||p.y>4.85)return null;
  const faces=[
    {nx:0,nz:1,plane:-11.62,min:-13.1,max:13.1,bottom:1.25,top:4.85},
    {nx:-1,nz:0,plane:13.55,min:-11.4,max:11.5,bottom:1.25,top:4.85}
  ];
  let result=null,best=1.7;
  for(const face of faces){if(face.nx&&p.z>7.35&&p.z<10.95&&p.y<3.4)continue;const u=face.nx?p.z:p.x,distance=face.nx?(p.x-face.plane)*face.nx:(p.z-face.plane)*face.nz;if(distance>=-.1&&distance<best&&u>=face.min&&u<=face.max){best=distance;result={...face,kind:'glass',solid:null};}}
  return result;
}
export function climbObstacle(solids,p,normal,ignore,previous=null,ignoreLayer=null){
  function bounds(at){
    const b={x1:at.x-.22,x2:at.x+.22,z1:at.z-.22,z2:at.z+.22,bottom:at.y-.03,top:at.y+.7};
    if(normal.x>0){b.x1=at.x+.025;b.x2=at.x+.65;}
    if(normal.x<0){b.x1=at.x-.65;b.x2=at.x-.025;}
    if(normal.z>0){b.z1=at.z+.025;b.z2=at.z+.65;}
    if(normal.z<0){b.z1=at.z-.65;b.z2=at.z-.025;}
    return b;
  }
  const b=bounds(p),old=previous?bounds(previous):null;
  const overlap=(a,s)=>Math.max(0,Math.min(a.x2,s.x2)-Math.max(a.x1,s.x1))*Math.max(0,Math.min(a.z2,s.z2)-Math.max(a.z1,s.z1))*Math.max(0,Math.min(a.top,s.top-.015)-Math.max(a.bottom,s.bottom+.015));
  return solids.find(s=>{
    if(s===ignore||ignoreLayer&&s.climbLayer===ignoreLayer)return false;
    const nextDepth=overlap(b,s);if(nextDepth<=0)return false;
    // Attaching next to a leaf can start slightly overlapped. Allow escape,
    // while still rejecting movement that enters or penetrates another object.
    if(old){const oldDepth=overlap(old,s);if(oldDepth>0&&nextDepth<=oldDepth+1e-8)return false;}
    return true;
  });
}
export function mantlePath(p,solid,normal){
  const clamp=THREE.MathUtils.clamp;
  const outside=p.clone();
  if(normal.x)outside.x=(normal.x>0?solid.x2:solid.x1)+normal.x*.1;
  else outside.z=(normal.z>0?solid.z2:solid.z1)+normal.z*.1;
  const high=outside.clone();high.y=solid.top+.035;
  const end=high.clone().addScaledVector(normal,-.4);
  end.x=clamp(end.x,solid.x1+.025,solid.x2-.025);end.z=clamp(end.z,solid.z1+.025,solid.z2-.025);
  return {points:[p.clone(),outside,high,end],time:0,normal:normal.clone()};
}
