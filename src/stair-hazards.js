import * as THREE from 'three';
import {flightHeight} from './descent.js';
export function buildStairHazards(area,{cylinder,rod,mat,palette}){
  const black=mat('#302c36',{roughness:.58}),red=mat('#c97061',{emissive:'#81352d',emissiveIntensity:.5});
  const glass=mat('#b1e0dc',{transparent:true,opacity:.7,metalness:.2,roughness:.17,side:THREE.DoubleSide});
  for(let floor=13;floor>=1;floor--){
    const y=floor*3;
    if(floor%2===1||floor===10){
      const x=floor%4===1?1.65:-1.65,z=-5.1,g=new THREE.Group();g.position.set(x,y+.025,z);g.userData.nonPhysical=true;area.group.add(g);
      const abdomen=new THREE.Mesh(new THREE.SphereGeometry(.15,14,10),black);abdomen.scale.set(1,.65,1.25);g.add(abdomen);abdomen.position.y=.13;
      const head=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),black);head.position.set(0,.13,-.2);g.add(head);
      for(const xx of[-.045,.045]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.025,7,5),red);eye.position.set(xx,.17,-.285);g.add(eye);}
      for(const side of[-1,1])for(let i=0;i<4;i++){
        const z0=-.16+i*.095,knee=new THREE.Vector3(side*(.27+i*.02),.19,z0+(i-1.5)*.07),foot=new THREE.Vector3(side*.42,.015,z0+(i-1.5)*.1);
        rod(g,new THREE.Vector3(side*.07,.12,z0),knee,.018,black);rod(g,knee,foot,.014,black);
      }
      area.hazards.push({kind:'spiders',mesh:g,x,z,y,rx:.43,rz:.42,phase:floor*.7,patrol:.5});
    }
    for(const side of[-1,1]){
      const z=side<0?1.1:-1.6,yy=flightHeight(floor,side,z),x=side*(floor%2?1.1:2.2),g=new THREE.Group();g.userData.nonPhysical=true;g.position.set(x,yy+.008,z);area.group.add(g);
      for(let i=0;i<13;i++){
        const a=i*2.399,r=.08+(i%4)*.075,geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.1,0,-.05,.11,.015,.025,-.02,.045,.12],3));geometry.computeVertexNormals();
        const shard=new THREE.Mesh(geometry,glass);shard.position.set(Math.cos(a)*r,0,Math.sin(a)*r*.45);shard.rotation.y=a;g.add(shard);
        const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:'#d3f2ed',transparent:true,opacity:.9}));shard.add(edge);
      }
      area.hazards.push({kind:'glass',mesh:g,x,z,y:yy,rx:.43,rz:.24});
    }
  }
}
