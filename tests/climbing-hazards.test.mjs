import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {releasePosition} from '../src/climbing.js';
import {blocked} from '../src/rules.js';
import {hazardContact,exposureStep} from '../src/hazards.js';

test('release clears the body radius on all four wall normals, allowing walking away',()=>{
  const wall={x1:-1,x2:1,z1:-1,z2:1,bottom:0,top:5};
  for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p=new THREE.Vector3(nx*1.035,1,nz*1.035);
    const next=releasePosition({nx,nz,plane:nx||nz},p,[wall]);
    assert.ok(next);assert.equal(blocked([wall],next.x,next.z,next.y),false);
    assert.equal(blocked([wall],next.x+nx*.02,next.z+nz*.02,next.y),false);
    assert.equal(next.y,p.y);
  }
});
test('release refuses an enclosed space instead of embedding Turbo',()=>{
  const cage={x1:-3,x2:3,z1:-3,z2:3,bottom:0,top:4};
  assert.equal(releasePosition({nx:1,nz:0,plane:0},new THREE.Vector3(.035,1,0),[cage]),null);
});
test('coffee is escapable; sustained contact ends the run, including across frames',()=>{
  const exposure={coffee:0,bugs:0};
  assert.equal(exposureStep(exposure,'coffee',.75),null);
  assert.equal(exposureStep(exposure,null,.125),null);assert.equal(exposure.coffee,.5);
  assert.equal(exposureStep(exposure,'coffee',.4),null);
  assert.equal(exposureStep(exposure,'coffee',.11),'coffee');
  assert.equal(exposureStep({coffee:0,bugs:0},'bugs',.99),null);
  for(const kind of ['coffee','bugs'])assert.equal(exposureStep({coffee:0,bugs:0},kind,1),kind);
});
test('hazards detect height and movement instead of harming a snail above them',()=>{
  const mesh={position:{x:0,z:0},rotation:{y:0}};
  const coffee={kind:'coffee',mesh,x:0,z:0,y:0,rx:.6,rz:.4};
  assert.equal(hazardContact([coffee],{x:0,y:1,z:0},0),null);
  assert.equal(hazardContact([coffee],{x:0,y:0,z:0},0),'coffee');
  assert.equal(hazardContact([coffee],{x:2,y:0,z:0},0),null);
  const bug={...coffee,kind:'bugs',patrol:.65,phase:0};
  hazardContact([bug],{x:10,y:0,z:10},2);assert.notEqual(mesh.position.x,0);
});
