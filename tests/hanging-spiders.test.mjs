import{test}from'node:test';import assert from'node:assert/strict';import{HANGING_SPIDERS,SPIDER_CYCLE,hangingSpiderPose,hangingSpiderTouchesHeight}from'../src/spider-timing.js';import{ledgeSurfaces}from'../src/rules.js';import{hazardContact}from'../src/hazards.js';
test('hanging spiders stay over the return ledge and stop short of the ramp',()=>{const ledge=ledgeSurfaces()[1];assert.equal(HANGING_SPIDERS.length,5);for(const s of HANGING_SPIDERS){assert.ok(s.x>ledge.x1&&s.x<ledge.x2&&s.z>ledge.z1&&s.z<ledge.z2-1);}});
test('cycles provide a clear safe window and a dwell at ledge height with staggered timing',()=>{
 for(let t=0;t<SPIDER_CYCLE;t+=.05){const a=hangingSpiderPose(t),b=hangingSpiderPose(t+SPIDER_CYCLE);assert.ok(a.y>=1.48-1e-8&&a.y<=4.85+1e-8);assert.ok(Math.abs(a.y-b.y)<1e-8);}
 assert.equal(hangingSpiderTouchesHeight({y:1.25},hangingSpiderPose(1).y),false);assert.equal(hangingSpiderTouchesHeight({y:1.25},hangingSpiderPose(4.2).y),true);
 assert.equal(hangingSpiderPose(3.9).y,hangingSpiderPose(5).y);assert.notEqual(hangingSpiderPose(3,HANGING_SPIDERS[0].phase).y,hangingSpiderPose(3,HANGING_SPIDERS[2].phase).y);
});
test('contact follows the moving body rather than its silk or old floor height',()=>{
 const vector=()=>({set(x,y,z){this.x=x;this.y=y;this.z=z;}});const h={kind:'spiders',motion:'hanging',x:-12.6,z:-8,phase:0,rx:.64,rz:.46,mesh:{position:vector(),rotation:{}},silk:{position:vector(),scale:{}},marker:{material:{}}};
 assert.equal(hazardContact([h],{x:-12.6,y:1.25,z:-8},1),null);assert.equal(hazardContact([h],{x:-12.6,y:1.25,z:-8},4.2),'spiders');assert.equal(hazardContact([h],{x:-12.6,y:0,z:-8},4.2),null);assert.equal(hazardContact([h],{x:-12.6,y:1.25,z:-6.5},4.2),null);
 assert.ok(h.silk.scale.y>0);assert.ok(Math.abs(h.silk.position.y+h.silk.scale.y/2-5.38)<1e-8);
});
