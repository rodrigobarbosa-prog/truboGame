import{fail,playerName,canonical,validScore,validAttempt}from'../leaderboard-rules.mjs';
import{RACE_ROUTE,progressLabel}from'../src/rules.js';
const hash=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),v=>v.toString(16).padStart(2,'0')).join('');
async function owns(row,token){if(!row||typeof token!=='string'||token.length>128)return false;const actual=await hash(token);let different=actual.length^row.token_hash.length;for(let i=0;i<actual.length;i++)different|=actual.charCodeAt(i)^row.token_hash.charCodeAt(i);return different===0;}
const publicScore=row=>{const current=row.best_route===RACE_ROUTE,progress=current?row.best_progress:0;return{id:row.id,name:row.name,progress,location:progressLabel(progress),milliseconds:current?row.best_milliseconds:0,date:row.best_date};};
const publicAttempt=row=>({id:row.id,route:row.route,progress:row.progress,milliseconds:row.milliseconds,reason:row.reason,durationMs:row.duration_ms,location:row.location,date:row.date});
export function createCloudLeaderboard(db){
  const player=id=>db.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
  async function owner(input){if(typeof input.playerId!=='string'||typeof input.token!=='string')fail('No pudimos reconocer al jugador. Volvé a ingresar desde la portada.',403);const row=await player(input.playerId);if(!await owns(row,input.token))fail('No pudimos reconocer al jugador. Volvé a ingresar desde la portada.',403);return row;}
  return{
    async reserve(input){
      const name=playerName(input?.name),key=canonical(name),id=crypto.randomUUID(),bytes=crypto.getRandomValues(new Uint8Array(32)),token=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
      const results=await db.batch([
        db.prepare('INSERT INTO players(id,name,canonical_name,token_hash,best_route,best_progress,best_milliseconds,best_date) VALUES(?,?,?,?,?,0,0,?) ON CONFLICT(canonical_name) DO NOTHING').bind(id,name,key,await hash(token),RACE_ROUTE,new Date().toISOString()),
        db.prepare('SELECT * FROM players WHERE canonical_name=?').bind(key)
      ]);
      const row=results[1].results[0];if(row.id===id)return{player:{id:row.id,name:row.name},token};
      if(!await owns(row,input.token))fail('Ese nombre ya está reservado. Elegí otro.',409);
      return{player:{id:row.id,name:row.name},token:input.token};
    },
    async resume({id,token}){const row=await player(id);return await owns(row,token)?{player:{id:row.id,name:row.name},token}:null;},
    async list(){const{results}=await db.prepare('SELECT * FROM players ORDER BY CASE WHEN best_route=? THEN best_progress ELSE 0 END DESC, CASE WHEN best_route=? THEN best_milliseconds ELSE 0 END, best_date LIMIT 100').bind(RACE_ROUTE,RACE_ROUTE).all();return results.map(publicScore);},
    async add(input){
      const valid=validScore(input);await owner(input);const result=await db.prepare('UPDATE players SET best_route=?,best_progress=?,best_milliseconds=?,best_date=? WHERE id=? AND (best_route<>? OR best_progress<? OR (best_progress=? AND best_milliseconds>?))').bind(valid.route,valid.progress,valid.milliseconds,new Date().toISOString(),input.playerId,valid.route,valid.progress,valid.progress,valid.milliseconds).run();
      return{score:publicScore(await player(input.playerId)),improved:result.meta.changes>0};
    },
    async finish(input){
      const valid=validAttempt(input);await owner(input);const id=input.playerId,attemptId=input.attemptId;
      // Both operations are one D1 transaction. The best is updated from the
      // stored attempt, so retrying an id cannot change that attempt's score.
      const results=await db.batch([
        db.prepare('INSERT INTO attempts(player_id,id,route,progress,milliseconds,reason,duration_ms,location,date) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(player_id,id) DO NOTHING').bind(id,attemptId,valid.route,valid.progress,valid.milliseconds,input.reason,input.durationMs,progressLabel(valid.progress),new Date().toISOString()),
        db.prepare(`UPDATE players SET (best_route,best_progress,best_milliseconds,best_date)=(SELECT route,progress,milliseconds,date FROM attempts WHERE player_id=? AND id=?) WHERE id=? AND EXISTS(SELECT 1 FROM attempts a WHERE a.player_id=? AND a.id=? AND (players.best_route<>a.route OR players.best_progress<a.progress OR (players.best_progress=a.progress AND players.best_milliseconds>a.milliseconds)))`).bind(id,attemptId,id,id,attemptId),
        db.prepare('SELECT * FROM attempts WHERE player_id=? AND id=?').bind(id,attemptId),
        db.prepare('SELECT * FROM players WHERE id=?').bind(id)
      ]);
      return{attempt:publicAttempt(results[2].results[0]),score:publicScore(results[3].results[0])};
    }
  };
}
