import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIME_LIMIT,TIME_RATE,START,WINDOW,LEDGE_ROUTE,LEDGE_HEIGHT,ledgeSurfaces,WALL_SPEED,onGlass,formatTime,supportHeight,blocked,stairSurfaces,checkpointAt,progressPoints,progressLabel,fatalFall } from '../src/rules.js';

test('48-hour clock lasts 12 real minutes and formats expiry correctly',()=>{
  assert.equal(TIME_LIMIT/TIME_RATE,720);
  assert.equal(formatTime(TIME_LIMIT),'48:00:00');assert.equal(formatTime(1),'00:00:01');assert.equal(formatTime(-50),'00:00:00');
});
test('falling off the sill ends a run; the starting leaf and ordinary jumps remain safe',()=>{
  assert.equal(fatalFall(START.y,LEDGE_HEIGHT),false);
  assert.equal(fatalFall(LEDGE_HEIGHT,0),true);
  assert.equal(fatalFall(LEDGE_HEIGHT+.545,LEDGE_HEIGHT),false);
  assert.equal(fatalFall(42,41.875),false);
  assert.equal(fatalFall(4.5,LEDGE_HEIGHT),true);
  assert.equal(fatalFall(0,-1),true);
});
test('score grows along the office, every stair flight, lobby and street',()=>{
  assert.equal(progressPoints({zone:'office',...START}),0);
  const office=[progressPoints({zone:'office',x:0,y:1.25,z:-10.7}),progressPoints({zone:'office',x:-12.6,y:1.25,z:0,ledgeStage:1}),progressPoints({zone:'office',x:-10,y:1.25,z:10.5,ledgeStage:3})];
  assert.ok(office[0]>0&&office[1]>office[0]);assert.equal(office[2],1600);
  let previous=1000;for(let y=42;y>=0;y-=.125){const next=progressPoints({zone:'stairs',y});assert.ok(next>=previous);previous=next;}
  assert.equal(previous,9500);assert.equal(progressPoints({zone:'street',z:9}),9900);assert.equal(progressPoints({escaped:true}),10000);
  assert.equal(progressLabel(10000),'¡Escapó a la calle!');assert.match(progressLabel(9500),/Planta baja/);
});
test('all 14 floors connect through two flights without gaps or unwalkable rises',()=>{
  const surfaces=stairSurfaces();assert.equal(surfaces.length,365);
  for(let floor=14;floor>0;floor--){
    let y=floor*3;
    for(let z=-5;z<=5;z+=.05){const next=supportHeight(surfaces,-1.5,z,y);assert.ok(Number.isFinite(next));assert.ok(Math.abs(next-y)<.25);y=next;}
    assert.ok(Math.abs(y-(floor*3-1.5))<.01);
    for(let x=-1.5;x<=1.5;x+=.05)assert.equal(supportHeight(surfaces,x,5,y),y);
    for(let z=5;z>=-5;z-=.05){const next=supportHeight(surfaces,1.5,z,y);assert.ok(Number.isFinite(next));assert.ok(Math.abs(next-y)<.25);y=next;}
    assert.ok(Math.abs(y-(floor*3-3))<.01);
    assert.equal(checkpointAt(surfaces,{x:1.5,y,z:-5},floor).floor,floor-1);
    for(let x=1.5;x>=-1.5;x-=.05)assert.equal(supportHeight(surfaces,x,-5,y),y);
  }
});
test('stacked landings never snap a player to a higher floor',()=>{
  const s=stairSurfaces();assert.equal(supportHeight(s,-1.5,-5,21),21);assert.equal(supportHeight(s,-1.5,-5,0),0);
  assert.equal(checkpointAt(s,{x:0,y:21,z:-5},7),undefined);
});
test('obstacles respect body clearance and allow jumping over cables',()=>{
  const solids=[{x1:0,x2:2,z1:0,z2:2,bottom:0,top:.2}];
  assert.equal(blocked(solids,1,1,0),true);assert.equal(blocked(solids,1,1,.3),false);assert.equal(blocked(solids,-1,1,0),false);
  const desk=[{x1:0,x2:2,z1:0,z2:2,bottom:1.5,top:1.7}];assert.equal(blocked(desk,1,1,0),false);
});
test('glass adhesion is free across panes and remains slow',()=>{
  assert.ok(WALL_SPEED<1.8/8);
  assert.equal(onGlass(9.7,2),true);assert.equal(onGlass(-8,3),true);
  assert.equal(onGlass(WINDOW.right+1,2),false);assert.equal(onGlass(0,WINDOW.top+1),false);
});
test('approved office sill leads into the descending ramp and floor-level first aisle',()=>{
  const surfaces=[...ledgeSurfaces(),{x1:-14,x2:14,z1:-12,z2:12,y:0}],corner=LEDGE_ROUTE[0];
  for(let f=0;f<=1;f+=.005)assert.equal(supportHeight(surfaces,START.x+(corner.x-START.x)*f,START.z+(corner.z-START.z)*f,LEDGE_HEIGHT),LEDGE_HEIGHT);
  for(let z=-10.7;z<=5.5;z+=.025)assert.equal(supportHeight(surfaces,-12.6,z,LEDGE_HEIGHT),LEDGE_HEIGHT);
  let y=LEDGE_HEIGHT;
  for(let z=5.5;z<=8.7;z+=.01){const next=supportHeight(surfaces,-12.6,z,y);assert.ok(Number.isFinite(next));assert.ok(Math.abs(next-y)<.05);y=next;}
  assert.ok(y<.02);
  for(let x=-12.6;x<=10.5;x+=.025)assert.equal(supportHeight(surfaces,x,8.7,0),0);
});
