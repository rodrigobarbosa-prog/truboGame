import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PASSAGE_ROUTE,OFFICE_DOOR,passageToWorld,worldToPassage,inPassage,inLiftLobby,progressPoints} from '../src/rules.js';

test('one office coordinate system supports crossing and returning without a teleport',()=>{
  for(const local of [{x:-10,z:-10.7},{x:8.5,z:8.5},OFFICE_DOOR]){
    const at=passageToWorld(local),back=worldToPassage(at);
    assert.ok(Math.abs(back.x-local.x)<1e-8&&Math.abs(back.z-local.z)<1e-8);
    assert.equal(inPassage(at),true);
  }
  assert.equal(inPassage({x:12,z:8.7}),false);
  assert.equal(inLiftLobby({x:28.9,z:12}),true);
});
test('score follows the ordered loop; the straight route does not complete it',()=>{
  assert.ok(PASSAGE_ROUTE.length>=4);
  let previous=1599,from={x:-10,z:-10.7};
  PASSAGE_ROUTE.forEach((to,stage)=>{
    for(let j=0;j<=20;j++){
      const f=j/20,score=progressPoints({zone:'passage2',x:from.x+(to.x-from.x)*f,z:from.z+(to.z-from.z)*f,passageStage:stage});
      assert.ok(score>=previous);previous=score;
    }
    from=to;
  });
  assert.equal(progressPoints({zone:'passage2',...OFFICE_DOOR,passageStage:PASSAGE_ROUTE.length}),2600);
  assert.ok(progressPoints({zone:'passage2',...OFFICE_DOOR,passageStage:0})<2000);
});
test('lift lobby follows the photographed right turn instead of the old forward corridor',()=>{
  for(const p of [{x:28.9,z:11.8},{x:24,z:12.8},{x:15.35,z:12.8}])assert.equal(inLiftLobby(p),true);
  assert.equal(inLiftLobby({x:28.9,z:24}),false);
  let previous=2600;
  for(let x=0;x>=-13.5;x-=.25){const score=progressPoints({zone:'floor14',x,z:-3.5});assert.ok(score>=previous);previous=score;}
  assert.equal(previous,2800);
});
