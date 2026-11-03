import { RACE_ROUTE } from './rules.js';
const storageKey='snail-player-v1';
function read(){try{return JSON.parse(localStorage.getItem(storageKey))||{players:[],active:null};}catch{return {players:[],active:null};}}
function write(data){try{localStorage.setItem(storageKey,JSON.stringify(data));}catch{throw Error('Habilitá el almacenamiento de este navegador para reservar tu nombre.');}}
export function rememberedPlayer(){const data=read();return data.players.find(p=>p.player.id===data.active)||null;}
export function forgetActive(){const data=read();data.active=null;write(data);}
export async function restorePlayer(){
  const old=rememberedPlayer();if(old)return reservePlayer(old.player.name);
  const response=await fetch('/api/player',{cache:'no-store'});if(!response.ok)return null;
  const {identity}=await response.json();if(!identity)return null;
  const stored=read();stored.players=stored.players.filter(p=>p.player.id!==identity.player.id);stored.players.push(identity);stored.active=identity.player.id;write(stored);return identity;
}
async function post(url,payload){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'No pudimos conectar con el servidor de la ofi.');return data;
}
export async function reservePlayer(name){
  const stored=read(),canonical=name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
  const old=stored.players.find(p=>p.player.name.toLocaleLowerCase('es')===canonical);
  write(stored);
  const identity=await post('/api/player',{name,token:old?.token});
  stored.players=stored.players.filter(p=>p.player.id!==identity.player.id);stored.players.push(identity);stored.active=identity.player.id;write(stored);return identity;
}
export async function loadRanking(){const response=await fetch('/api/ranking',{cache:'no-store'});if(!response.ok)throw Error('No pudimos conectar con el ranking de la ofi.');return response.json();}
export function pendingScore(identity){try{const value=JSON.parse(localStorage.getItem('snail-pending-'+identity.player.id));return value?.route===RACE_ROUTE?value:null;}catch{return null;}}
export function stageScore(identity,progress,milliseconds){
  const payload={playerId:identity.player.id,token:identity.token,route:RACE_ROUTE,progress,milliseconds};
  const old=pendingScore(identity);
  if(!old||old.progress<progress||(old.progress===progress&&old.milliseconds>milliseconds)){
    try{localStorage.setItem('snail-pending-'+identity.player.id,JSON.stringify(payload));}catch{}
  }
  return pendingScore(identity)||payload;
}
export async function flushScore(identity){
  const payload=pendingScore(identity);if(!payload)return null;
  const result=await post('/api/ranking',payload);
  const latest=pendingScore(identity);
  if(latest&&latest.progress===payload.progress&&latest.milliseconds===payload.milliseconds)try{localStorage.removeItem('snail-pending-'+identity.player.id);}catch{}
  return result;
}
const attemptCache=new Map();
export function pendingAttempts(identity){try{return (JSON.parse(localStorage.getItem('snail-attempts-'+identity.player.id))||attemptCache.get(identity.player.id)||[]).filter(a=>a.route===RACE_ROUTE);}catch{return (attemptCache.get(identity.player.id)||[]).filter(a=>a.route===RACE_ROUTE);}}
export function stageAttempt(identity,attempt){
  const entries=pendingAttempts(identity);
  if(!entries.some(a=>a.attemptId===attempt.attemptId))entries.push({...attempt,playerId:identity.player.id,token:identity.token,route:RACE_ROUTE});
  attemptCache.set(identity.player.id,entries);
  try{localStorage.setItem('snail-attempts-'+identity.player.id,JSON.stringify(entries));}catch{}
}
export async function flushAttempts(identity){
  for(const attempt of pendingAttempts(identity)){
    await post('/api/attempt',attempt);
    const remaining=pendingAttempts(identity).filter(a=>a.attemptId!==attempt.attemptId);
    attemptCache.set(identity.player.id,remaining);
    try{localStorage.setItem('snail-attempts-'+identity.player.id,JSON.stringify(remaining));}catch{}
  }
}
export function beaconScore(identity){
  const pending=pendingScore(identity);if(pending)navigator.sendBeacon('/api/ranking',new Blob([JSON.stringify(pending)],{type:'application/json'}));
  for(const attempt of pendingAttempts(identity))navigator.sendBeacon('/api/attempt',new Blob([JSON.stringify(attempt)],{type:'application/json'}));
}
