import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {clearCameraPosition} from '../src/camera.js';

test('starting camera stays in front of the frosted partition',()=>{
  const target=new Vector3(10.5,2.37,-10.65),desired=new Vector3(15,3.92,-10.65);
  const glass={x1:13.94,x2:13.98,z1:-11.85,z2:6.25,bottom:1.1,top:3.85};
  const safe=clearCameraPosition(target,desired,[glass]);
  assert.ok(safe.x<13.86&&safe.x>target.x);
  assert.equal(clearCameraPosition(target,safe,[glass]).x,safe.x);
  assert.equal(desired.x,15);
});
test('orbit cannot cross window panes; a clear line stays unchanged',()=>{
  const target=new Vector3(2,2,-10.6),pane={x1:-13,x2:13,z1:-12,z2:-11.95,bottom:1,top:5};
  assert.ok(clearCameraPosition(target,new Vector3(2,3,-14),[pane]).z>-11.87);
  const clear=new Vector3(5,3,-10);
  assert.deepEqual(clearCameraPosition(target,clear,[pane]),clear);
});
