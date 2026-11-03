import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { RACE_ROUTE, progressLabel } from './src/rules.js';
import {fail,playerName,canonical,validScore,validAttempt} from './leaderboard-rules.mjs';
export {validScore} from './leaderboard-rules.mjs';
const hash=token=>createHash('sha256').update(token).digest();
function owns(player,token){
  if(typeof token!=='string'||token.length>128)return false;
  return timingSafeEqual(Buffer.from(player.tokenHash,'hex'),hash(token));
}
export function createLeaderboard(directory){
  // Previous time-only rankings remain untouched in ranking.json.
  const file=path.join(directory,'players.json');let queue=Promise.resolve();
  async function read(){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {version:1,players:[]};throw e;}}
  async function write(data){await mkdir(directory,{recursive:true});await writeFile(file+'.tmp',JSON.stringify(data,null,2));await rename(file+'.tmp',file);}
  function transaction(work){const pending=queue.then(async()=>work(await read()));queue=pending.catch(()=>{});return pending;}
  const publicScore=player=>{const best=player.best.route===RACE_ROUTE?player.best:{progress:0,milliseconds:0,date:player.best.date};return {id:player.id,name:player.name,progress:best.progress,location:progressLabel(best.progress),milliseconds:best.milliseconds,date:best.date};};
  return {
    async resume({id,token}){
      await queue;const data=await read(),player=data.players.find(p=>p.id===id);
      if(!player||!owns(player,token))return null;
      return {player:{id:player.id,name:player.name},token};
    },
    async reserve(input){
      const name=playerName(input?.name);
      return transaction(async data=>{
        const old=data.players.find(p=>canonical(p.name)===canonical(name));
        if(old){if(!owns(old,input.token))fail('Ese nombre ya está reservado. Elegí otro.',409);return {player:{id:old.id,name:old.name},token:input.token};}
        const token=randomBytes(32).toString('base64url');
        const player={id:randomUUID(),name,tokenHash:hash(token).toString('hex'),best:{route:RACE_ROUTE,progress:0,milliseconds:0,date:new Date().toISOString()}};
        data.players.push(player);await write(data);return {player:{id:player.id,name:player.name},token};
      });
    },
    async list(){
      await queue;const data=await read();
      return data.players.map(publicScore).sort((a,b)=>b.progress-a.progress||a.milliseconds-b.milliseconds||a.date.localeCompare(b.date)).slice(0,100);
    },
    async add(input){
      const valid=validScore(input);
      return transaction(async data=>{
        const player=data.players.find(p=>p.id===input.playerId);
        if(!player||!owns(player,input.token))fail('No pudimos reconocer al jugador. Volvé a ingresar desde la portada.',403);
        const old=player.best;
        const improved=old.route!==RACE_ROUTE||valid.progress>old.progress||(valid.progress===old.progress&&valid.milliseconds<old.milliseconds);
        if(improved){if(old.route!==valid.route){player.previousBests??=[];player.previousBests.push(old);}player.best={...valid,date:new Date().toISOString()};await write(data);}
        return {score:publicScore(player),improved};
      });
    },
    async finish(input){
      const valid=validAttempt(input);
      return transaction(async data=>{
        const player=data.players.find(p=>p.id===input.playerId);
        if(!player||!owns(player,input.token))fail('No pudimos reconocer al jugador.',403);
        player.attempts??=[];
        const existing=player.attempts.find(a=>a.id===input.attemptId);
        if(existing)return {attempt:existing,score:publicScore(player)};
        const attempt={id:input.attemptId,...valid,reason:input.reason,durationMs:input.durationMs,location:progressLabel(valid.progress),date:new Date().toISOString()};
        player.attempts.push(attempt);
        const old=player.best;
        if(old.route!==RACE_ROUTE||valid.progress>old.progress||valid.progress===old.progress&&valid.milliseconds<old.milliseconds){if(old.route!==valid.route){player.previousBests??=[];player.previousBests.push(old);}player.best={...valid,date:attempt.date};}
        await write(data);return {attempt,score:publicScore(player)};
      });
    }
  };
}

