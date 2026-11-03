import {RACE_ROUTE} from './src/rules.js';
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function playerName(value){
  if(typeof value!=='string'||/[\p{Cc}\p{Cf}]/u.test(value))fail('Elegí un nombre de jugador de 1 a 24 caracteres.');
  const name=value.normalize('NFKC').trim().replace(/\s+/g,' ');
  if(!name||name.length>24)fail('Elegí un nombre de jugador de 1 a 24 caracteres.');return name;
}
export const canonical=name=>name.toLocaleLowerCase('es');
export function validScore(input){
  if(!input||input.route!==RACE_ROUTE)fail('Actualizá el juego para guardar tu avance.');
  if(!Number.isSafeInteger(input.progress)||input.progress<0||input.progress>10000)fail('El avance no es válido.');
  if(!Number.isSafeInteger(input.milliseconds)||input.milliseconds<0||input.milliseconds>1800000)fail('El tiempo no es válido.');
  return{route:RACE_ROUTE,progress:input.progress,milliseconds:input.milliseconds};
}
export function validAttempt(input){
  const valid=validScore(input);
  if(typeof input.attemptId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.attemptId))fail('El identificador del intento no es válido.');
  if(!['fall','timeout','escaped','coffee','bugs','caught','spiders','glass'].includes(input.reason))fail('El motivo de fin de intento no es válido.');
  if(!Number.isSafeInteger(input.durationMs)||input.durationMs<0||input.durationMs>1800000)fail('La duración no es válida.');
  return valid;
}
