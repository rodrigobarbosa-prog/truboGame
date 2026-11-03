import * as THREE from 'three';

// Local, deterministic surface maps. No downloads or remote texture services.
let seed=187;
function noise(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function canvasMap(draw,size=512,color=true,repeat=[1,1]){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(...repeat);map.anisotropy=8;return map;
}
function grainMap(base,variation=12,size=512,color=true,repeat=[1,1]){
  return canvasMap((c,s)=>{const pixels=c.createImageData(s,s);for(let i=0;i<pixels.data.length;i+=4){const n=(noise()-.5)*variation;for(let k=0;k<3;k++)pixels.data[i+k]=base[k]+n;pixels.data[i+3]=255;}c.putImageData(pixels,0,0);},size,color,repeat);
}
let cache;
export function materials(){
  if(cache)return cache;
  const carpetMap=canvasMap((c,s)=>{
    c.fillStyle='#555751';c.fillRect(0,0,s,s);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){c.fillStyle=(row+col)%2?'#575951':'#51544f';c.fillRect(col*s/4,row*s/4,s/4,s/4);}
    for(let i=0;i<110000;i++){
      const x=noise()*s,y=noise()*s,v=55+noise()*65;c.strokeStyle=`rgba(${v},${v+3},${v},.62)`;c.lineWidth=.7+noise();
      c.beginPath();c.moveTo(x,y);c.lineTo(x+noise()*3,y+2+noise()*5);c.stroke();
    }
    c.strokeStyle='#252e2b55';c.lineWidth=1.5;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(i*s/4,0);c.lineTo(i*s/4,s);c.moveTo(0,i*s/4);c.lineTo(s,i*s/4);c.stroke();}
  },1024,true,[7,6]);
  const carpetHeight=carpetMap.clone();carpetHeight.colorSpace=THREE.NoColorSpace;
  const shellMap=canvasMap((c,s)=>{
    const image=c.createImageData(s,s);
    for(let y=0;y<s;y++)for(let x=0;x<s;x++){
      const u=x/s,v=y/s,band=Math.sin(v*25+Math.sin(u*8)*.8),growth=Math.pow(.5+.5*Math.sin(u*480+Math.sin(v*24)*2.5),8);
      const warm=band*.17+growth*.1+(noise()-.5)*.055;
      const i=(y*s+x)*4;image.data[i]=125+warm*140;image.data[i+1]=77+warm*95;image.data[i+2]=40+warm*58;image.data[i+3]=255;
    }c.putImageData(image,0,0);
  },1024);
  const shellBump=shellMap.clone();shellBump.colorSpace=THREE.NoColorSpace;
  const skinMap=canvasMap((c,s)=>{
    c.fillStyle='#a89772';c.fillRect(0,0,s,s);
    for(let i=0;i<16000;i++){const x=noise()*s,y=noise()*s,r=.6+noise()*2.1;c.fillStyle=i%2?'#c7b28b55':'#685e464f';c.beginPath();c.ellipse(x,y,r,r*.75,0,0,Math.PI*2);c.fill();}
  });
  const skinBump=skinMap.clone();skinBump.colorSpace=THREE.NoColorSpace;
  const leafMap=canvasMap((c,s)=>{
    const g=c.createLinearGradient(0,0,s,0);g.addColorStop(0,'#315c2e');g.addColorStop(.48,'#5f8340');g.addColorStop(.5,'#9cab5b');g.addColorStop(.53,'#638b42');g.addColorStop(1,'#315c2e');c.fillStyle=g;c.fillRect(0,0,s,s);
    c.lineWidth=1.8;c.strokeStyle='#b4c98155';for(let y=20;y<s;y+=31){for(const side of [-1,1]){c.beginPath();c.moveTo(s/2,y);c.bezierCurveTo(s/2+side*s*.17,y+15,s/2+side*s*.3,y+55,s/2+side*s*.5,y+90);c.stroke();}}
  });
  const leafBump=leafMap.clone();leafBump.colorSpace=THREE.NoColorSpace;
  const ceilingMap=canvasMap((c,s)=>{c.fillStyle='#c8c8bf';c.fillRect(0,0,s,s);for(let i=0;i<14000;i++){const shade=noise()>.45?'#878a7d55':'#f0eee56b';c.fillStyle=shade;c.fillRect(noise()*s,noise()*s,.5+noise()*1.6,.5+noise()*1.6);}c.strokeStyle='#8a9286';c.lineWidth=3;c.strokeRect(0,0,s,s);},512,true,[28,24]);
  const ceilingBump=ceilingMap.clone();ceilingBump.colorSpace=THREE.NoColorSpace;
  const wallBump=grainMap([150,150,150],65,512,false,[6,3]);
  const concreteBump=grainMap([145,145,145],110,512,false,[2,2]);
  const tableMap=canvasMap((c,s)=>{c.fillStyle='#454d4e';c.fillRect(0,0,s,s);c.lineWidth=1.2;for(let i=0;i<6000;i++){c.strokeStyle=i%2?'#b7b5a70a':'#101a1b0e';const y=noise()*s;c.beginPath();c.moveTo(noise()*s,y);c.lineTo(noise()*s,y+.8);c.stroke();}},512,true,[1,1]);
  const contact=canvasMap((c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(12,17,15,.5)');g.addColorStop(.45,'rgba(12,17,15,.27)');g.addColorStop(1,'rgba(12,17,15,0)');c.fillStyle=g;c.fillRect(0,0,s,s);},128);
  cache={
    carpet:new THREE.MeshStandardMaterial({map:carpetMap,bumpMap:carpetHeight,bumpScale:.035,roughness:.98}),
    wall:new THREE.MeshStandardMaterial({color:'#d5d3c8',bumpMap:wallBump,bumpScale:.008,roughness:.91}),
    concrete:new THREE.MeshStandardMaterial({color:'#85918e',bumpMap:concreteBump,bumpScale:.018,roughness:.92}),
    ceiling:new THREE.MeshStandardMaterial({map:ceilingMap,bumpMap:ceilingBump,bumpScale:.012,roughness:.98}),
    table:new THREE.MeshStandardMaterial({map:tableMap,roughness:.62,metalness:.02}),
    ceramic:new THREE.MeshPhysicalMaterial({color:'#e5e1d7',roughness:.28,clearcoat:.5,clearcoatRoughness:.22}),
    shell:new THREE.MeshPhysicalMaterial({map:shellMap,bumpMap:shellBump,bumpScale:.016,roughness:.93,clearcoat:0,metalness:0,envMapIntensity:.14,specularIntensity:.12}),
    skin:new THREE.MeshPhysicalMaterial({map:skinMap,bumpMap:skinBump,bumpScale:.009,roughness:.38,clearcoat:1,clearcoatRoughness:.12,sheen:.2,sheenColor:new THREE.Color('#d9c6a4')}),
    leaf:new THREE.MeshPhysicalMaterial({map:leafMap,bumpMap:leafBump,bumpScale:.008,roughness:.48,clearcoat:.28,side:THREE.DoubleSide}),
    terracotta:new THREE.MeshStandardMaterial({color:'#a56d4c',bumpMap:concreteBump,bumpScale:.014,roughness:.93}),
    contact:new THREE.MeshBasicMaterial({map:contact,transparent:true,depthWrite:false,opacity:.58})
  };
  return cache;
}

export function leafMesh(group,x,y,z,width,length,angle=0){
  const nx=12,nz=24,vertices=[],uv=[],indices=[];
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const u=i/nx*2-1,v=j/nz,shape=Math.pow(Math.sin(Math.PI*v),.7);
    vertices.push(u*width*.5*shape,.04*(1-u*u)*Math.sin(v*Math.PI)+.018*Math.sin(v*Math.PI*2),(v-.5)*length);uv.push(i/nx,v);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,materials().leaf);mesh.position.set(x,y,z);mesh.rotation.y=angle;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.physical=true;group.add(mesh);return mesh;
}
