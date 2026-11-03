export const EXPOSURE_LIMITS={coffee:1,bugs:1};

export function insideSpill(x,z,outline,radius=.16){
  let inside=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[j],b=outline[i],dx=b.x-a.x,dz=b.z-a.z;
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<=radius*radius)return true;
  }
  return inside;
}

export function hazardContact(hazards,p,time){
  let contact=null;
  for(const hazard of hazards){
    if(hazard.kind==='spiders'){
      hazard.mesh.position.x=hazard.x+Math.sin(time*1.3+hazard.phase)*hazard.patrol;
      hazard.mesh.rotation.y=Math.sin(time*1.3+hazard.phase)>0?Math.PI/2:-Math.PI/2;
    }
    if(hazard.kind==='bugs'){
      const angle=time*.9+hazard.phase;
      hazard.mesh.position.x=hazard.x+Math.sin(angle)*hazard.patrol;
      hazard.mesh.position.z=hazard.z+Math.cos(angle*1.3)*.36;
      hazard.mesh.rotation.y=angle;
    }
    const x=hazard.mesh.position.x,z=hazard.mesh.position.z;
    if(hazard.maxZ!==undefined&&p.z>hazard.maxZ)continue;
    if(Math.abs(p.y-hazard.y)>.3)continue;
    const touching=hazard.outline?insideSpill(p.x-x,p.z-z,hazard.outline):hazard.shape==='rect'?Math.abs(p.x-x)<hazard.rx+.16&&Math.abs(p.z-z)<hazard.rz+.16:((p.x-x)/(hazard.rx+.16))**2+((p.z-z)/(hazard.rz+.16))**2<1;
    if(touching)contact=hazard.kind;
  }
  return contact;
}

export function exposureStep(exposure,contact,dt){
  for(const kind of Object.keys(EXPOSURE_LIMITS)){
    exposure[kind]=Math.max(0,(exposure[kind]||0)+(contact===kind?dt:-dt*2));
    if(exposure[kind]>=EXPOSURE_LIMITS[kind])return kind;
  }
  return null;
}
