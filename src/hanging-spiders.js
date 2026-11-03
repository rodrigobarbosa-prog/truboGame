import * as THREE from 'three';
import{HANGING_SPIDERS,hangingSpiderPose}from'./spider-timing.js';
export function addHangingSpiders(area,{rod,mat}){
  const body=mat('#29232e',{roughness:.8}),eyes=mat('#dc795c',{emissive:'#b84b34',emissiveIntensity:.8});
  const silkMaterial=new THREE.MeshStandardMaterial({color:'#e1dbcd',roughness:1,transparent:true,opacity:.8});
  for(const spec of HANGING_SPIDERS){
    const spider=new THREE.Group();spider.userData.nonPhysical=true;spider.name='Araña colgante · repisa del pasillo 1';area.group.add(spider);
    const abdomen=new THREE.Mesh(new THREE.SphereGeometry(.25,16,12),body);abdomen.scale.set(1,.7,1.15);spider.add(abdomen);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.15,12,10),body);head.position.z=-.29;spider.add(head);
    for(const x of[-.065,.065]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.034,8,6),eyes);eye.position.set(x,.035,-.425);spider.add(eye);}
    for(const side of[-1,1])for(let i=0;i<4;i++){
      const z=-.23+i*.13,knee=new THREE.Vector3(side*.38,.12,z+(i-1.5)*.09),foot=new THREE.Vector3(side*.58,-.19,z+(i-1.5)*.15);
      rod(spider,new THREE.Vector3(side*.12,0,z),knee,.025,body);rod(spider,knee,foot,.021,body);
    }
    const silk=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,1,6),silkMaterial);silk.userData.nonPhysical=true;area.group.add(silk);
    const marker=new THREE.Mesh(new THREE.CircleGeometry(.64,32),new THREE.MeshBasicMaterial({color:'#d1a25b',transparent:true,opacity:.08,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.set(spec.x,1.265,spec.z);marker.userData.nonPhysical=true;area.group.add(marker);
    const hazard={kind:'spiders',motion:'hanging',mesh:spider,silk,marker,x:spec.x,z:spec.z,phase:spec.phase,y:1.25,rx:.64,rz:.46};area.hazards.push(hazard);animateHangingSpider(hazard,0);
  }
}
export function animateHangingSpider(hazard,time){
  const pose=hangingSpiderPose(time,hazard.phase);hazard.mesh.position.set(hazard.x,pose.y,hazard.z);hazard.mesh.rotation.y=Math.sin((time+hazard.phase)*1.1)*.12;
  const attachment=pose.y+.14,length=pose.ceiling-attachment;hazard.silk.position.set(hazard.x,attachment+length/2,hazard.z);hazard.silk.scale.y=length;
  hazard.marker.material.opacity=pose.warning?.19+.07*Math.sin(time*8):.045;
  return pose;
}
