import{test}from'node:test';import assert from'node:assert/strict';import{createHealth,healthStep,stairLightLevel}from'../src/health.js';
test('spiders and glass drain life with a shared cooldown, independent of physics substeps',()=>{
 const health=createHealth();assert.equal(healthStep(health,'spiders',.01).amount,25);assert.equal(health.value,75);
 for(let i=0;i<50;i++)assert.equal(healthStep(health,'glass',.01).hit,false);assert.equal(health.value,75);
 healthStep(health,null,.51);healthStep(health,'glass',.01);assert.equal(health.value,55);
 healthStep(health,null,2);healthStep(health,'spiders',.01);healthStep(health,null,2);healthStep(health,'spiders',.01);healthStep(health,null,2);assert.equal(healthStep(health,'glass',.01).dead,true);assert.equal(health.value,0);
});
test('floors ten and nine are dark while the other landings retain normal light',()=>{for(const y of[30,28.5,27,25.5])assert.equal(stairLightLevel(y),0);for(const y of[42,33,24,21,0])assert.equal(stairLightLevel(y),1);});
