import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DESCENT_TASKS,createDescentState,descentActionAt,applyDescentAction,advanceValve,descentExitReady,flightHeight} from '../src/descent.js';
import {stairSurfaces,supportHeight} from '../src/rules.js';

test('emergency requires retrieving the fuse above the crate before installation',()=>{
  const state=createDescentState(),fuse=DESCENT_TASKS.fuse;
  applyDescentAction(state,'power');assert.equal(state.power,false);
  assert.notEqual(descentActionAt(state,{...fuse,y:36})?.id,'fuse');
  assert.equal(descentActionAt(state,{...fuse,y:36.45}).id,'fuse');
  applyDescentAction(state,'fuse');applyDescentAction(state,'power');
  assert.equal(state.power,true);assert.equal(descentExitReady(state),false);
});
test('valve requires a continuous hold; releasing E interrupts it',()=>{
  const state=createDescentState();
  assert.equal(advanceValve(state,1,true),false);
  advanceValve(state,.01,false);assert.equal(state.valveCharge,0);
  assert.equal(advanceValve(state,1.9,true),false);
  assert.equal(advanceValve(state,.11,true),true);assert.equal(state.valve,true);
  assert.equal(advanceValve(state,1,true),false);
});
test('ground floor requires all four missions; optional rescue rewards once',()=>{
  const state=createDescentState();applyDescentAction(state,'key');assert.equal(descentExitReady(state),false);
  applyDescentAction(state,'fuse');applyDescentAction(state,'power');advanceValve(state,2,true);
  assert.equal(descentExitReady(state),false);applyDescentAction(state,'salad');
  assert.equal(descentExitReady(state),true);
  assert.equal(applyDescentAction(state,'luma').bonus,1800);assert.equal(applyDescentAction(state,'luma'),null);
  assert.equal(descentExitReady(createDescentState()),false);
});
test('old salad must be reached on the counter and rewards provisions once',()=>{
  const state=createDescentState(),salad=DESCENT_TASKS.salad;
  assert.equal(descentActionAt(state,{...salad,y:21}),null);
  assert.equal(descentActionAt(state,{...salad,y:22.66}).id,'salad');
  assert.equal(applyDescentAction(state,'salad').bonus,900);assert.equal(state.salad,true);
  assert.equal(applyDescentAction(state,'salad'),null);
});
test('obstacles and insects are placed on actual treads from floor 13 to 1',()=>{
  const surfaces=stairSurfaces();
  for(let floor=13;floor>=1;floor--)for(const side of [-1,1])for(const z of [.3,-.6,1.3]){
    const y=flightHeight(floor,side,z);
    assert.ok(Math.abs(supportHeight(surfaces,side*1.5,z,y)-y)<1e-8);
  }
});

