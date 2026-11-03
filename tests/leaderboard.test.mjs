import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createLeaderboard,validScore} from '../leaderboard.mjs';
import {RACE_ROUTE} from '../src/rules.js';
import {randomUUID} from 'node:crypto';

async function fixture(work){
  const directory=await mkdtemp(path.join(tmpdir(),'snail-rank-'));
  try{await work(createLeaderboard(directory),directory);}
  finally{assert.equal(path.dirname(path.resolve(directory)),path.resolve(tmpdir()));assert.ok(path.basename(directory).startsWith('snail-rank-'));await rm(directory,{recursive:true,force:true});}
}
const score=(identity,progress,milliseconds)=>({playerId:identity.player.id,token:identity.token,route:RACE_ROUTE,progress,milliseconds});

test('names reserve atomically, ignore case and persist across restarts',()=>fixture(async(board,directory)=>{
  const results=await Promise.allSettled([board.reserve({name:' Acero '}),board.reserve({name:'acero'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected')[0].reason.status,409);
  const identity=results.find(r=>r.status==='fulfilled').value;
  const reopened=createLeaderboard(directory);
  assert.deepEqual((await reopened.reserve({name:'ACERO',token:identity.token})).player,identity.player);
  assert.deepEqual((await reopened.resume({id:identity.player.id,token:identity.token})).player,identity.player);
  assert.equal(await reopened.resume({id:identity.player.id,token:'otra-clave'}),null);
  await assert.rejects(reopened.reserve({name:'Acero',token:'otra-clave'}),{status:409});
  assert.equal((await reopened.list())[0].progress,0);
  const persisted=await readFile(path.join(directory,'players.json'),'utf8');assert.ok(!persisted.includes(identity.token));
}));

test('partial runs rank by furthest progress, retain best and use time only for ties',()=>fixture(async(board,directory)=>{
  await writeFile(path.join(directory,'ranking.json'),'[{"legacy":true}]');
  const a=await board.reserve({name:'Acero'}),b=await board.reserve({name:'Lau'});
  await board.add(score(a,3000,90000));await board.add(score(b,4000,140000));
  let rows=await board.list();assert.equal(rows[0].name,'Lau');assert.match(rows[0].location,/Piso/);
  await board.add(score(a,1000,10000));assert.equal((await board.list()).find(p=>p.name==='Acero').progress,3000);
  await board.add(score(a,4000,100000));rows=await board.list();assert.equal(rows[0].name,'Acero');
  await board.add(score(a,4000,150000));assert.equal((await board.list())[0].milliseconds,100000);
  assert.equal((await createLeaderboard(directory).list())[0].progress,4000);
  assert.equal(await readFile(path.join(directory,'ranking.json'),'utf8'),'[{"legacy":true}]');
  assert.ok(!JSON.stringify(rows).includes('token'));assert.ok(!JSON.stringify(rows).includes(a.token));
}));

test('only the owner can update a reserved player',()=>fixture(async board=>{
  const a=await board.reserve({name:'Acero'}),b=await board.reserve({name:'Lau'});
  await assert.rejects(board.add({...score(a,9000,100000),token:b.token}),{status:403});
  await assert.rejects(board.add({...score(a,9000,100000),token:undefined}),{status:403});
  assert.equal((await board.list()).find(p=>p.name==='Acero').progress,0);
}));
test('every fallen attempt is recorded once while the ranking retains the furthest run',()=>fixture(async(board,directory)=>{
  const player=await board.reserve({name:'Caracol de prueba'});
  const first={...score(player,560,12000),attemptId:randomUUID(),durationMs:15000,reason:'fall'};
  const second={...score(player,220,8000),attemptId:randomUUID(),durationMs:10000,reason:'fall'};
  await board.finish(first);await board.finish(first);await board.finish(second);
  assert.equal((await board.list())[0].progress,560);
  const saved=JSON.parse(await readFile(path.join(directory,'players.json'),'utf8')).players[0];
  assert.equal(saved.attempts.length,2);assert.deepEqual(saved.attempts.map(a=>a.progress),[560,220]);
  assert.equal(saved.attempts[0].reason,'fall');
  await assert.rejects(board.finish({...second,attemptId:randomUUID(),token:'incorrecto'}),{status:403});
}));

test('coffee and radioactive insect attempts persist their cause and best progress',()=>fixture(async(board,directory)=>{
  const player=await board.reserve({name:'Turbo peligro'});
  for(const reason of ['coffee','bugs','caught','spiders','glass'])await board.finish({...score(player,1200,15000),attemptId:randomUUID(),durationMs:20000,reason});
  const saved=JSON.parse(await readFile(path.join(directory,'players.json'),'utf8')).players[0];
  assert.deepEqual(saved.attempts.map(a=>a.reason),['coffee','bugs','caught','spiders','glass']);
  assert.equal((await board.list())[0].progress,1200);
}));

test('reject malformed progress, times, names and outdated routes',async()=>{
  for(const input of [{progress:-1,milliseconds:1000,route:RACE_ROUTE},{progress:10001,milliseconds:1000,route:RACE_ROUTE},{progress:20,milliseconds:-1,route:RACE_ROUTE},{progress:100,milliseconds:1000,route:'old'}])assert.throws(()=>validScore(input));
  await fixture(async board=>{await assert.rejects(board.reserve({name:' '}));await assert.rejects(board.reserve({name:'x'.repeat(25)}));});
});
