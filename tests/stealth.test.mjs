import {test}from'node:test';import assert from'node:assert/strict';
import{visitorCanSee,suspicionStep,shouldIntroduceVisitor,createVisitorAI,stepVisitor,visitorPath,visionOutline}from'../src/stealth.js';
import{createDescentState,DESCENT_TASKS}from'../src/descent.js';
const dividers=[{x1:3.5,x2:25.3,z1:-1.08,z2:-.92,bottom:21,top:24.4},{x1:8,x2:31,z1:5.42,z2:5.58,bottom:21,top:24.4}];
test('three office aisles require alternating turns before reaching the far meeting room',()=>{
 const path=visitorPath({x:4,z:-5},DESCENT_TASKS.salad,dividers);
 assert.ok(path.some(p=>p.x>25.6&&p.z<0));assert.ok(path.some(p=>p.x<7.7&&p.z>5.5));assert.ok(path.at(-1).x>27&&path.at(-1).z>8);
 for(const p of path)for(const s of dividers)assert.ok(!(p.x>s.x1-.27&&p.x<s.x2+.27&&p.z>s.z1-.27&&p.z<s.z2+.27));
});
test('visitor vision respects the forward cone, furniture and the expanded office bounds',()=>{
 const pose={x:7,y:21,z:-2,facingX:0,facingZ:-1},p={x:7,y:21,z:-5};assert.equal(visitorCanSee(p,pose,[]),true);assert.equal(visitorCanSee({...p,z:0},pose,[]),false);
 const cabinet={x1:6.4,x2:7.6,z1:-4.2,z2:-3.4,bottom:21,top:22.4};assert.equal(visitorCanSee(p,pose,[cabinet]),false);
 assert.equal(visitorCanSee({...p,x:2},pose,[]),false);assert.ok(visionOutline(pose,[cabinet]).some(v=>v.z>-4.3));
});
test('being seen starts pursuit, not instant death, and the visitor walks toward Turbo',()=>{
 const ai=createVisitorAI();ai.x=10;ai.z=0;ai.facingX=0;ai.facingZ=1;ai.path=[{x:10,z:3}];ai.repath=10;const p={x:10,y:21,z:4};let r;
 for(let i=0;i<7;i++){r=stepVisitor(ai,.1,p,[]);assert.equal(r.caught,false);}assert.equal(ai.phase,'chase');assert.ok(ai.z>0);
});
test('a telegraphed stomp kills on contact but can be dodged',()=>{
 for(const dodge of[false,true]){const ai=createVisitorAI();Object.assign(ai,{x:10,z:0,phase:'chase',lastSeen:{x:10,z:.6}});let p={x:10,y:21,z:.6};assert.equal(stepVisitor(ai,.01,p,[]).caught,false);assert.equal(ai.phase,'stomp');let caught=false;
 for(let i=0;i<8;i++){if(dodge)p={...p,z:2};caught ||=stepVisitor(ai,.1,p,[]).caught;}assert.equal(caught,!dodge);}
});
test('losing sight long enough returns the pursuer to patrol',()=>{
 const ai=createVisitorAI();Object.assign(ai,{x:10,z:0,phase:'chase',lastSeen:{x:10,z:3}});for(let i=0;i<70;i++)stepVisitor(ai,.1,{x:0,y:21,z:0},[]);assert.equal(ai.phase,'patrol');
});
test('warning builds before pursuit and drains behind cover',()=>{assert.equal(suspicionStep(0,true,.3),.5);assert.equal(suspicionStep(.5,false,.5),0);});
test('the entrance cinematic triggers only once per attempt',()=>{const state=createDescentState(),p={x:3.6,y:21,z:-5};assert.equal(shouldIntroduceVisitor(state,p),true);state.visitorIntroduced=true;assert.equal(shouldIntroduceVisitor(state,p),false);});
