import{test}from'node:test';import assert from'node:assert/strict';import{createHealth,healthStep,stairLightLevel}from'../src/health.js';
test('spiders remove half the life and the shared cooldown prevents repeated substep damage',()=>{
 const health=createHealth();assert.equal(healthStep(health,'spiders',.01).amount,50);assert.equal(health.value,50);
 for(let i=0;i<50;i++)assert.equal(healthStep(health,'glass',.01).hit,false);assert.equal(health.value,50);
 healthStep(health,null,.51);assert.equal(healthStep(health,'spiders',.01).dead,true);assert.equal(health.value,0);
 const mixed=createHealth();healthStep(mixed,'glass',.01);assert.equal(mixed.value,80);healthStep(mixed,null,1.1);healthStep(mixed,'spiders',.01);assert.equal(mixed.value,30);
});
test('floors ten and nine are dark while the other landings retain normal light',()=>{for(const y of[30,28.5,27,25.5])assert.equal(stairLightLevel(y),0);for(const y of[42,33,24,21,0])assert.equal(stairLightLevel(y),1);});

