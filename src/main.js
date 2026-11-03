import * as THREE from 'three';
import { buildWorld, createSnail, createHand } from './world.js';
import { START, TIME_LIMIT, TIME_RATE, WINDOW, LEDGE_HEIGHT, LEDGE_ROUTE, PASSAGE_ROUTE, WALL_SPEED, onGlass, clamp, formatTime, supportHeight, blocked, blockedOnGlass, checkpointAt, progressPoints, progressLabel, fatalFall } from './rules.js';
import { loadRanking, reservePlayer, restorePlayer, rememberedPlayer, forgetActive, stageScore, flushScore, pendingScore, beaconScore, stageAttempt, flushAttempts, pendingAttempts } from './ranking.js';
import { createRenderPipeline } from './render.js';
import { nearestClimbFace, nearbyGlassFace, onFace, climbObstacle, mantlePath, releasePosition } from './climbing.js';
import { hazardContact, exposureStep, EXPOSURE_LIMITS } from './hazards.js';
import {passageToWorld,worldToPassage,inPassage,inLiftLobby,OFFICE_DOOR} from './rules.js';
import {CARD_HINT,canCollectCard,canOpenOfficeDoor} from './access.js';
import {clearCameraPosition} from './camera.js';
import {createHealth,healthStep,CONTACT_DAMAGE,stairLightLevel} from './health.js';
import {inFloor7} from './stealth.js';

const $ = id => document.getElementById(id);
const show = (id, yes = true) => { $(id).hidden = !yes; };
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} catch (e) { fatal('Tu navegador necesita WebGL 2 y aceleración gráfica. Probá con Chrome, Edge o Firefox actualizado. ' + e.message); }
function fatal(message) { $('error-text').textContent = message; show('error'); }
window.addEventListener('error', e => fatal(e.message || 'No se pudo cargar el juego.'));
window.addEventListener('unhandledrejection', e => fatal(String(e.reason)));

if (renderer) init();
function init() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .12, 150);
  const world = buildWorld(scene), snail = createSnail(scene), hand = createHand(scene);
  const zones=['office','passage2','floor14','stairs','street'];
  const visuals=createRenderPipeline(renderer,scene,camera);
  const p = snail.group.position;
  let zoneName = 'office', zone = world.office;
  let mode = 'menu', resumeMode = 'play', cinemaTime = 0, elapsed = 0, remaining = TIME_LIMIT;
  let stamina = 1, velocityY = 0, grounded = true, heading = 0, orbit = Math.PI, pitch = .28, zoom = 4.5;
  let floor = 14, animation = 0, moving = false, toastTimer = 0;
  let fallStartY=null,attemptEnded=false,attemptId='';
  let climbing=false, ledgeStage=0, ledgeComplete=false,passageStage=0;
  let climbFace=null,climbCandidate=null,mantle=null;
  let exposure={coffee:0,bugs:0},lastHazard=null,health=createHealth();
  let officeDoorOpen=false,passageAnnounced=false;
  let hasAccessCard=false;
  let player=rememberedPlayer(),runActive=false,bestPoints=0,pointTime=0,savedPoints=-1,saveTimer=0,saving=false,rankingTimer=0,runId=0;
  let dragging = false, lastX = 0, lastY = 0, interaction = '', audioContext, humGain;
  const keys = new Set(), trails = [], look = new THREE.Vector3(), cameraPosition = new THREE.Vector3(), target = new THREE.Vector3();
  let trailClock = 0;
  const trailMat = new THREE.MeshPhysicalMaterial({color:'#c5d0b8',transparent:true,opacity:.17,depthWrite:false,roughness:.16,clearcoat:1,clearcoatRoughness:.08});
  const trailGeo = new THREE.CircleGeometry(.18,16);
  p.set(START.x,START.y,START.z);snail.group.rotation.y = heading;hand.visible = false;
  $('floor-dots').innerHTML = '<i></i>'.repeat(14);

  function setZone(name) {
    zoneName=name;zone=world[name];for(const k of zones)world[k].group.visible=k===name||(name==='office'&&['passage2','floor14'].includes(k));
    world.sun.intensity=name==='stairs'?1:2.7;world.ambient.intensity=name==='stairs'?1.1:.95;
    world.sky.visible=name!=='stairs';scene.environmentIntensity=name==='stairs'?.32:.55;
    scene.background.set(name==='stairs'?'#62736e':'#c5cbd0');scene.fog.color.copy(scene.background);
    if(name==='stairs') { world.sun.position.set(-6,p.y+9,3);world.sun.target.position.set(0,p.y,0);scene.add(world.sun.target); }
    else {world.sun.position.set(-9,7,-22);world.sun.target.position.set(0,0,0);}
    trails.forEach(t=>{t.visible=false;});
  }
  function announce(text) { $('toast').textContent=text;$('toast').classList.add('show');toastTimer=4; }
  const pointsText=value=>value.toLocaleString('es-UY');
  function identify(){
    $('player-name').value=player?.player.name||'';$('player-name').readOnly=Boolean(player);show('other-player',Boolean(player));
    $('start').replaceChildren(document.createTextNode(player?'Volver a jugar':'Reservar nombre y jugar'),Object.assign(document.createElement('span'),{textContent:'↗'}));
    $('player-status').textContent=player?`${player.player.name}, tu nombre está reservado. Tu mejor avance se conserva entre partidas.`:'El nombre queda reservado. Te reconocemos al volver desde este navegador.';
  }
  function captureProgress(){
    if(!runActive||attemptEnded||fallStartY!==null&&!grounded)return;
    const area=sectionName(),local=area==='passage2'?worldToPassage(p):area==='floor14'?{x:p.x-28.9,y:p.y,z:p.z-16.3}:p;
    const points=progressPoints({zone:area,x:local.x,y:p.y,z:local.z,ledgeStage,passageStage,escaped:['outro','won'].includes(mode)});
    if(points>bestPoints){bestPoints=points;pointTime=Math.round(elapsed*1000);}
  }
  function sectionName(){return zoneName==='office'?(inLiftLobby(p)?'floor14':inPassage(p)?'passage2':'office'):zoneName;}
  async function persistRun(beacon=false){
    if(!player||!runActive)return;
    captureProgress();
    if(bestPoints>savedPoints||pendingScore(player)||pendingAttempts(player).length)stageScore(player,bestPoints,pointTime);
    if(beacon){beaconScore(player);return;}
    if(saving||!pendingScore(player)&&!pendingAttempts(player).length)return;
    const identity=player,submitted=bestPoints,generation=runId;saving=true;
    try{
      await flushScore(identity);await flushAttempts(identity);if(generation===runId)savedPoints=Math.max(savedPoints,submitted);
      $('score-status').textContent=attemptEnded?'Intento registrado. Tu mejor marca se conserva en el ranking.':'Tu mejor avance quedó guardado en el ranking.';show('retry-save',false);
    }catch{$('score-status').textContent='Guardado pendiente. Reintentamos al recuperar la conexión.';show('retry-save');}
    finally{saving=false;}
  }
  async function refreshRanking(){
    try{
      const {scores}=await loadRanking();$('landing-list').replaceChildren();show('landing-empty',!scores.length);
      $('player-count').replaceChildren(document.createTextNode(String(scores.length)),document.createElement('br'),Object.assign(document.createElement('small'),{textContent:scores.length===1?'JUGADOR':'JUGADORES'}));
      for(const [index,score] of scores.entries()){
        const row=document.createElement('li'),place=document.createElement('span'),details=document.createElement('div'),name=document.createElement('strong'),location=document.createElement('small'),bar=document.createElement('div'),fill=document.createElement('i'),points=document.createElement('span'),unit=document.createElement('small');
        place.className='place';place.textContent=String(index+1).padStart(2,'0');details.className='standing-player';name.textContent=score.name+(score.id===player?.player.id?' · vos':'');location.textContent=score.location;bar.className='standing-bar';fill.style.width=`${score.progress/100}%`;bar.append(fill);details.append(name,location,bar);points.className='standing-points';points.textContent=pointsText(score.progress);unit.textContent='PUNTOS';points.append(unit);row.append(place,details,points);row.classList.toggle('me',score.id===player?.player.id);$('landing-list').append(row);
      }
      $('landing-status').textContent='Compartido en la ofi · se guarda tu mejor avance · el tiempo desempata.';
    }catch{$('landing-status').textContent='No pudimos conectar. Usá Actualizar para volver a intentar.';}
  }
  function start() {
    if(!player){resetMenu();return;}
    runId++;
    attemptId=globalThis.crypto?.randomUUID?.()||THREE.MathUtils.generateUUID();attemptEnded=false;fallStartY=null;
    remaining=TIME_LIMIT;elapsed=0;stamina=1;floor=14;velocityY=0;grounded=true;keys.clear();cinemaTime=0;interaction='';
    exposure={coffee:0,bugs:0};lastHazard=null;health=createHealth();
    show('stealth-warning',false);
    $('skip').textContent='Saltar cinemática →';
    officeDoorOpen=false;passageAnnounced=false;world.setOfficeDoor(false);
    hasAccessCard=false;world.accessCard.mesh.visible=true;
    world.descent.reset();
    climbing=false;climbFace=null;climbCandidate=null;mantle=null;ledgeStage=0;ledgeComplete=false;passageStage=0;bestPoints=0;pointTime=0;savedPoints=-1;saveTimer=0;runActive=false;$('score-status').textContent='';show('retry-save',false);
    setZone('office');p.set(START.x,START.y,START.z);
    heading=-Math.PI/2;snail.group.rotation.set(0,heading,0);orbit=Math.PI/2;pitch=.28;zoom=4.5;
    for(const k of zones)for(const d of world[k].drops){d.taken=false;d.mesh.visible=true;}
    for(const id of ['menu','hud','pause','result'])show(id,false);
    show('cinema');mode='intro';document.body.className='cinematic';hand.visible=true;syncHUD();
  }
  function beginPlay() {
    runActive=true;
    hand.visible=false;show('cinema',false);show('hud');mode='play';document.body.className='playing';
    cameraPosition.set(p.x+Math.sin(orbit)*zoom,p.y+2,p.z+Math.cos(orbit)*zoom);
    target.set(p.x,p.y+.45,p.z);camera.position.copy(clearCameraPosition(target,cameraPosition,zone.solids));camera.lookAt(target);
    announce('Sos Turbo. Seguí la repisa; E para adherirte al vidrio, paredes o muebles.');
  }
  function pause() {
    if(!['play','intro','outro','visitor-intro'].includes(mode))return;
    persistRun();
    resumeMode=mode;mode='paused';keys.clear();dragging=false;show('pause');
    if(humGain)humGain.gain.setTargetAtTime(0,audioContext.currentTime,.15);
  }
  function resume() {
    if(mode!=='paused')return;mode=resumeMode;show('pause',false);
    if(humGain&&$('audio').checked)humGain.gain.setTargetAtTime(.035,audioContext.currentTime,.2);
  }
  function resetMenu() {
    const saved=persistRun();runActive=false;
    show('pause',false);show('hud',false);show('cinema',false);show('result',false);show('menu');mode='menu';document.body.className='';
    setZone('office');p.set(START.x,START.y,START.z);heading=0;hand.visible=false;climbing=false;climbFace=null;mantle=null;snail.group.rotation.set(0,0,0);
    identify();Promise.resolve(saved).then(refreshRanking);
  }
  function use() {
    if(mode!=='play')return;
    if(interaction==='climb'&&climbCandidate){
      climbFace=climbCandidate;climbing=true;mantle=null;velocityY=0;fallStartY=null;grounded=false;p.copy(onFace(climbFace,p));
      const normal=new THREE.Vector3(climbFace.nx,0,climbFace.nz),forward=new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(normal,forward);
      snail.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,normal,forward));
      announce(climbFace.kind==='glass'?'Turbo se pegó al vidrio. W/S subir-bajar · A/D lateral · E soltarte.':'Turbo se adhiere. W/S trepar · A/D lateral · E para soltarte.');
    } else if(interaction==='glass'){
      climbFace=null;mantle=null;
      climbing=true;velocityY=0;fallStartY=null;p.z=WINDOW.z;p.y=clamp(p.y,WINDOW.bottom,WINDOW.top);grounded=false;
      snail.group.rotation.set(Math.PI/2,Math.PI,0);
      announce('Pegado al vidrio. W/S subir-bajar · A/D lateral · E para volver a la repisa.');
    } else if(interaction==='dismount'){
      if(climbFace){
        const clear=releasePosition(climbFace,p,zone.solids);
        if(!clear){announce('No hay espacio para soltarte acá. Movete un poco por la superficie.');return;}
        p.copy(clear);orbit=Math.atan2(climbFace.nx,climbFace.nz);heading=orbit+Math.PI;
      }else{p.z=-10.7;heading=-Math.PI/2;orbit=Math.PI/2;}
      climbing=false;climbFace=null;mantle=null;grounded=false;fallStartY=p.y;velocityY=0;snail.group.rotation.set(0,heading,0);
      announce('Turbo se soltó. Cuidado con la altura.');
    } else if(interaction==='passage2'){
      announce('Seguí caminando. El pasillo 2 es parte de esta misma oficina.');
    } else if(interaction==='office-exit'){
      if(!canOpenOfficeDoor(hasAccessCard)){announce(CARD_HINT);return;}
      officeDoorOpen=true;world.setOfficeDoor(true);
      announce('Puerta abierta. Cruzá al pasillo de ascensores: seguís en el piso 14.');
    } else if(interaction==='office-locked'){
      announce(CARD_HINT);
    } else if(interaction==='access-card'&&!hasAccessCard&&canCollectCard(p,world.accessCard)){
      hasAccessCard=true;world.accessCard.mesh.visible=false;
      announce('Tarjeta de Aguada Park conseguida. Volvé a la doble puerta de madera y abrila con E.');chime();
    } else if(interaction==='stairs'){
      setZone('stairs');p.set(-1.5,42,-5);floor=14;orbit=Math.PI;heading=0;velocityY=0;
      fallStartY=null;grounded=true;announce('Piso 14. Bajá el tramo, cruzá el descanso y seguí bajando.');
    } else if(interaction==='lobby'){
      if(!world.descent.ready()){announce(world.descent.objective());return;}
      setZone('street');p.set(0,0,-5);floor=0;orbit=Math.PI;heading=0;velocityY=0;fallStartY=null;grounded=true;
      announce('Planta baja. La calle está del otro lado de las puertas.');
    } else if(interaction==='descent-mission'){
      const event=world.descent.use(p);
      if(event){announce(event.text);if(event.bonus)remaining=Math.min(TIME_LIMIT,remaining+event.bonus);chime();}
    } else if(interaction==='exit')win();
    interaction='';show('prompt',false);syncHUD();
  }
  function win() {
    mode='outro';cinemaTime=0;keys.clear();show('hud',false);show('cinema');document.body.className='cinematic';
    captureProgress();persistRun();
    $('skip').textContent='Ver resultado →';
  }
  function result(success,reason=success?'escaped':'timeout') {
    if(attemptEnded)return;
    mode=success?'won':'lost';show('cinema',false);show('hud',false);show('result');document.body.className='';
    $('result-kicker').textContent=success?'AL FIN · AL AIRE LIBRE':reason==='fall'?'CAÍDA · FIN DEL INTENTO':'DOMINGO · 18:08';
    $('result-title').innerHTML=success?'Pequeño caracol.<br>Gran escape.':reason==='fall'?'Te caíste.<br>Hasta acá llegaste.':'El finde pasó<br>demasiado rápido.';
    $('result-copy').textContent=success?'Catorce pisos después, volvés a sentir el aire. La ciudad nunca se sintió tan cerca.':reason==='fall'?'Este intento terminó. Tu avance queda registrado. Si querés probar otra vez, empezás desde la planta.':'Se terminaron las 48 horas. Tu avance queda registrado.';
    if(reason==='coffee'||reason==='bugs'){
      $('result-kicker').textContent='PELIGRO · FIN DEL INTENTO';
      $('result-title').innerHTML=reason==='coffee'?'Demasiado café.<br>Hasta acá llegaste.':'La alfombra tenía vida.<br>Hasta acá llegaste.';
      $('result-copy').textContent=reason==='coffee'?'Turbo permaneció demasiado tiempo en el café. Tu avance queda registrado. Podés volver a intentarlo desde la planta.':'Los bichitos radiactivos alcanzaron a Turbo. Tu avance queda registrado. Podés volver a intentarlo desde la planta.';
    }
    if(reason==='caught'){
      $('result-kicker').textContent='PISOTÓN · FIN DEL INTENTO';
      $('result-title').innerHTML='Te alcanzaron.<br>Hasta acá llegaste.';
      $('result-copy').textContent='El merodeador persiguió y pisó a Turbo. Tu avance queda registrado. Podés esconderte, salir de su campo de visión o esquivar el pisotón.';
    }
    if(reason==='spiders'||reason==='glass'){
      $('result-kicker').textContent='SIN VIDA · FIN DEL INTENTO';
      $('result-title').innerHTML=reason==='spiders'?'Demasiadas picaduras.<br>Hasta acá llegaste.':'Vidrios rotos.<br>Hasta acá llegaste.';
      $('result-copy').textContent='Turbo perdió toda su vida. Tu avance queda registrado. Esquivá los obstáculos o trepá para buscar otro camino.';
    }
    captureProgress();attemptEnded=true;keys.clear();dragging=false;velocityY=0;moving=false;
    stageAttempt(player,{attemptId,reason,progress:bestPoints,milliseconds:pointTime,durationMs:Math.round(elapsed*1000)});
    $('score-status').textContent='Registrando este intento…';
    $('result-stat').textContent=progressLabel(bestPoints);
    $('again').textContent='Intentar de nuevo desde la planta ↗';
    persistRun();show('result-ranking');
    $('result-points').textContent=`${player?.player.name||''} · ${pointsText(bestPoints)} puntos`;
  }
  function syncHUD() {
    const area=sectionName();
    $('access-card-status').hidden=area!=='passage2'&&area!=='floor14';
    $('access-card-status').textContent=hasAccessCard?'✓ Aguada Park · tarjeta de acceso conseguida':'Aguada Park · buscá la tarjeta sobre un escritorio del medio';
    $('descent-status').hidden=zoneName!=='stairs';
    if(zoneName==='stairs'){
      const state=world.descent.state;
      $('descent-status').textContent=`${state.power?'✓':'○'} Emergencia · ${state.valve?'✓':'○'} Válvula · ${state.salad?'✓':'○'} Ensalada · ${state.key?'✓':'○'} Llave PB${state.luma?' · ✦ Luma rescatada':''}`;
    }
    canvas.dataset.position=`${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
    canvas.dataset.mode=mode;
    canvas.dataset.route=`${zoneName}:${climbing?'glass':'ledge'}:${ledgeStage}:${passageStage}`;
    canvas.dataset.points=String(bestPoints);
    $('timer').textContent=formatTime(remaining);$('time-fill').style.width=`${remaining/TIME_LIMIT*100}%`;
    $('timer').style.color=remaining<4*3600?'#f2a78e':'';
    $('stamina-fill').style.width=`${stamina*100}%`;
    $('health-fill').style.width=`${health.value}%`;$('health-value').textContent=Math.ceil(health.value);
    $('floor').innerHTML=`${floor===0?'PB':floor}<span>${floor===0?'/ CALLE':'/ PB'}</span>`;
    const labels=area==='office'?['LA OFICINA',ledgeStage>=2?'02 / PASILLO 1':'01 / EL BORDECITO',ledgeComplete?'Entrá al siguiente nivel de la oficina. Seguís en el piso 14.':LEDGE_ROUTE[ledgeStage].label]:area==='passage2'?['PASILLO 2 · PISO 14','03 / PASILLO 2',hasAccessCard?'Abrí la puerta de madera con tu tarjeta de Aguada Park.':'Buscá la tarjeta de Aguada Park sobre un escritorio del medio. La mancha bloquea el camino directo.']:area==='floor14'?['FUERA DE LA OFICINA','04 / PISO 14','Girás a la derecha por los ascensores. Las escaleras están al fondo del corredor.']:area==='stairs'?['LAS ESCALERAS','05 / EL DESCENSO',floor>0?'Bajá los tramos y cruzá cada descanso.':'Encontrá la puerta de planta baja.']:['PLANTA BAJA','06 / LA LIBERTAD','Cruzá el hall y abrí la salida a la calle.'];
    $('zone-label').textContent=labels[0];$('chapter').textContent=labels[1];$('objective').textContent=labels[2];
    if(zoneName==='stairs')$('objective').textContent=world.descent.objective();
    $('distance').textContent=climbing?'Turbo adherido · W/S trepar · A/D lateral · E soltarte':area==='office'?(ledgeStage>=2?'Pasillo 1 → pasillo 2 · piso 14':'Seguí la repisa hasta la rampa amarilla'):area==='passage2'?'Oficina continua · vuelta por los escritorios · piso 14':area==='floor14'?'Corredor común del edificio · piso 14':area==='stairs'?`${floor} pisos hasta la calle · Cuidado con las caídas`:`${Math.max(0,Math.round(9-p.z))} m hasta el aire libre`;
    if(area==='office'&&!climbing&&p.x<-11.9&&p.z>-11&&p.z<5.5&&p.y>1)$('distance').textContent='Arañas colgantes · frená y pasá cuando suban';
    $('progress-text').textContent=floor===0?'La libertad está cerca':`${floor} ${floor===1?'piso por descubrir':'pisos por descubrir'}`;
    $('live-score').textContent=`${player?.player.name||''} · ${pointsText(bestPoints)} puntos · ${progressLabel(bestPoints)}`;
    [...$('floor-dots').children].forEach((dot,i)=>dot.classList.toggle('done',i<14-floor));
  }
  function updatePlayer(dt) {
    captureProgress();
    const contact=hazardContact(zone.hazards,p,elapsed);
    if(contact&&contact!==lastHazard)announce(contact==='coffee'?'¡Café! Salí del charco antes de 1 segundo.':contact==='bugs'?'¡Bichitos radiactivos! Tenés 1 segundo para alejarte.':contact==='spiders'?'¡Araña! Las picaduras quitan 25 de vida.':'¡Vidrios rotos! Cada corte quita 20 de vida.');
    lastHazard=contact;
    const fatalHazard=exposureStep(exposure,contact,dt);
    $('hazard-warning').hidden=!contact;
    if(contact)$('hazard-warning').textContent=CONTACT_DAMAGE[contact]?`${contact==='spiders'?'ARAÑA':'VIDRIOS ROTOS'} · VIDA ${health.value}/100 · ¡Alejate!`:`${contact==='coffee'?'CAFÉ CALIENTE':'RADIACIÓN'} · ${Math.round(exposure[contact]/EXPOSURE_LIMITS[contact]*100)}% · ¡Alejate!`;
    if(fatalHazard){result(false,fatalHazard);return;}
    const damage=healthStep(health,contact,dt);
    if(damage.hit){$('health-fill').style.width=`${health.value}%`;$('health-value').textContent=health.value;}
    if(damage.dead){result(false,contact);return;}
    let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    let z=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    moving=Boolean(x||z);
    const boost=moving&&(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&stamina>.015;
    stamina=clamp(stamina+(boost?-.19:.12)*dt,0,1);
    if(climbing&&climbFace){
      const normal=new THREE.Vector3(climbFace.nx,0,climbFace.nz),right=new THREE.Vector3(normal.z,0,-normal.x);
      if(mantle){
        mantle.time+=dt;const f=clamp(mantle.time/.95,0,1),part=f<.2?0:f<.75?1:2;
        const a=[0,.2,.75][part],b=[.2,.75,1][part],u=THREE.MathUtils.smoothstep(f,a,b);
        p.lerpVectors(mantle.points[part],mantle.points[part+1],u);
        if(f>.75){const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.atan2(-normal.x,-normal.z),0));snail.group.quaternion.slerp(rotation,Math.min(1,dt*12));}
        if(f===1){heading=Math.atan2(-normal.x,-normal.z);orbit=Math.atan2(normal.x,normal.z);snail.group.rotation.set(0,heading,0);climbing=false;climbFace=null;mantle=null;grounded=true;fallStartY=null;velocityY=0;announce('Turbo alcanzó la superficie.');}
      }else{
        const speed=boost?WALL_SPEED*1.3:WALL_SPEED,norm=Math.hypot(x,z)||1,delta=right.clone().multiplyScalar(x/norm*speed*dt);delta.y=z/norm*speed*dt;
        const next=p.clone().add(delta);if(climbFace.kind==='glass')next.y=clamp(next.y,climbFace.bottom,climbFace.top);
        const u=climbFace.nx?next.z:next.x;
        if(climbFace.kind!=='glass'&&z>0&&next.y>=climbFace.top-.08)mantle=mantlePath(p,climbFace.solid,normal);
        else if(u>=climbFace.min+.025&&u<=climbFace.max-.025&&next.y>=climbFace.bottom-.03){
          const obstacle=climbObstacle(zone.solids,next,normal,climbFace.solid,p,climbFace.kind==='glass'?'window':null);
          if(!obstacle)p.copy(next);
          else if(climbFace.kind!=='glass'&&z>0&&obstacle.bottom>p.y+.1&&obstacle.top<=climbFace.top+.45)mantle=mantlePath(p,obstacle,normal);
        }
        if(moving){const forward=right.clone().multiplyScalar(x/norm);forward.y=z/norm;const side=new THREE.Vector3().crossVectors(normal,forward);snail.group.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,normal,forward)),Math.min(1,dt*10));}
      }
      interaction=climbing?'dismount':'';show('prompt',climbing);if(climbing)$('prompt').querySelector('span').textContent='Soltar la superficie';
      elapsed+=dt;remaining=Math.max(0,remaining-dt*TIME_RATE);if(remaining<=0)result(false);return;
    }
    if(climbing){
      const speed=boost?WALL_SPEED*1.3:WALL_SPEED, norm=Math.hypot(x,z)||1;
      const nx=p.x+x/norm*speed*dt, ny=p.y+z/norm*speed*dt;
      if(onGlass(nx,p.y)&&!blockedOnGlass(zone.solids,nx,p.y,WINDOW.z))p.x=nx;
      if(onGlass(p.x,ny)&&!blockedOnGlass(zone.solids,p.x,ny,WINDOW.z))p.y=ny;
      p.z=WINDOW.z;
      if(moving){
        const forward=new THREE.Vector3(x/norm,z/norm,0),normal=new THREE.Vector3(0,0,1);
        const right=new THREE.Vector3().crossVectors(normal,forward);
        snail.group.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,normal,forward)),Math.min(1,dt*10));
      }
      interaction='dismount';show('prompt');$('prompt').querySelector('span').textContent='Despegarte del vidrio y volver a la repisa';
      elapsed+=dt;remaining=Math.max(0,remaining-dt*TIME_RATE);if(remaining<=0)result(false);
      return;
    }
    if(moving){
      const norm=Math.hypot(x,z);x/=norm;z/=norm;
      // Orbit is the direction from the snail to the camera; W moves away from it.
      const dx=x*Math.cos(orbit)-z*Math.sin(orbit),dz=-x*Math.sin(orbit)-z*Math.cos(orbit);
      const speed=boost?2.65:1.8;
      const nextX=p.x+dx*speed*dt,nextZ=p.z+dz*speed*dt;
      if(!blocked(zone.solids,nextX,p.z,p.y))p.x=nextX;
      if(!blocked(zone.solids,p.x,nextZ,p.y))p.z=nextZ;
      const desired=Math.atan2(dx,dz);heading+=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading))*Math.min(1,dt*12);
      snail.group.rotation.y=heading;
      if(grounded&&trailClock<=0){
        let t=trails.find(t=>!t.visible);
        if(!t&&trails.length<170){t=new THREE.Mesh(trailGeo,trailMat);t.rotation.x=-Math.PI/2;scene.add(t);trails.push(t);}
        if(t){t.position.set(p.x,p.y+.012,p.z);t.rotation.set(-Math.PI/2,0,heading);t.scale.set(.85,1.8,1);t.visible=true;t.userData.life=9;}
        trailClock=.12;
      }
    }
    const support=supportHeight(zone.surfaces,p.x,p.z,p.y);
    if(grounded&&support!==-Infinity&&p.y-support<.27){p.y=support;velocityY=0;}
    else {fallStartY=Math.max(fallStartY??p.y,p.y);grounded=false;velocityY-=10*dt;const nextY=p.y+velocityY*dt;if(support!==-Infinity&&nextY<=support&&velocityY<=0){p.y=support;grounded=true;velocityY=0;}else p.y=nextY;}
    if(fallStartY!==null&&fatalFall(fallStartY,p.y)){result(false,'fall');return;}
    if(grounded)fallStartY=null;
    if(zoneName==='office'&&!ledgeComplete&&!inPassage(p)&&!inLiftLobby(p)){
      const point=LEDGE_ROUTE[ledgeStage];
      if(Math.hypot(p.x-point.x,p.z-point.z)<.35&&Math.abs(p.y-(ledgeStage===0?LEDGE_HEIGHT:0))<.25){
        p.x=point.x;p.z=point.z;
        ledgeStage++;ledgeComplete=ledgeStage===LEDGE_ROUTE.length;
        orbit=ledgeStage>=2?-Math.PI/2:Math.PI;
        if(ledgeComplete)announce('Pasillo 1 recorrido. La flecha lleva al pasillo 2, dentro del mismo piso 14.');
        else announce(LEDGE_ROUTE[ledgeStage].label);
      }
    }
    if(zoneName==='office'&&inPassage(p)){
      if(!passageAnnounced){passageAnnounced=true;announce('La mancha bloquea el paso directo. Rodeá los escritorios o trepá: la tarjeta de Aguada Park está sobre una mesa del medio.');}
      const point=PASSAGE_ROUTE[passageStage],local=worldToPassage(p);
      if(point&&Math.hypot(local.x-point.x,local.z-point.z)<1.1&&p.y<.3){passageStage++;if(passageStage===PASSAGE_ROUTE.length)announce(hasAccessCard?'Volvé a la puerta de madera: ya tenés la tarjeta para abrirla.':CARD_HINT);else announce('Buscá la tarjeta sobre los escritorios del medio. E para trepar a los muebles.');}
    }
    if(zoneName==='stairs'){
      const c=checkpointAt(zone.surfaces,p,floor);
      if(c){floor=c.floor;announce(floor===0?'Llegaste a planta baja. Buscá la puerta.':`Piso ${floor}`);}
      world.sun.position.y=p.y+9;world.sun.target.position.y=p.y;
    }
    for(const d of zone.drops){
      if(!d.taken&&Math.hypot(p.x-d.x,p.z-d.z)<.55&&Math.abs(p.y-d.y)<.8){d.taken=true;d.mesh.visible=false;stamina=1;remaining=Math.min(TIME_LIMIT,remaining+1200);announce('Una gota de respiro. Impulso completo + 20 minutos.');chime();}
    }
    interaction='';
    climbCandidate=nearestClimbFace(zone.solids,p);if(climbCandidate)interaction='climb';
    if(zoneName==='office'&&p.x<14.15){const glass=nearbyGlassFace(p);if(glass){climbCandidate=glass;interaction='climb';}}
    const doorAt=passageToWorld(OFFICE_DOOR);
    if(zoneName==='office'&&!hasAccessCard&&canCollectCard(p,world.accessCard))interaction='access-card';
    if(zoneName==='office'&&!officeDoorOpen&&Math.hypot(p.x-doorAt.x,p.z-doorAt.z)<1.7)interaction=canOpenOfficeDoor(hasAccessCard)?'office-exit':'office-locked';
    if(zoneName==='office'&&inLiftLobby(p)&&Math.hypot(p.x-15.35,p.z-12.8)<1.3)interaction='stairs';
    if(zoneName==='stairs'&&floor===0&&Math.hypot(p.x,p.z+5.6)<2)interaction='lobby';
    if(zoneName==='stairs'&&world.descent.action(p))interaction='descent-mission';
    if(zoneName==='street'&&Math.abs(p.x)<2.5&&p.z>7.2&&p.z<11)interaction='exit';
    show('prompt',Boolean(interaction));
    if(interaction)$('prompt').querySelector('span').textContent=interaction==='climb'&&climbCandidate?.kind==='glass'?'Pegarte al vidrio':{climb:'Adherirte y trepar',glass:'Pegarte al vidrio',passage2:'Pasar al pasillo 2 · piso 14','office-exit':'Abrir puerta de madera · ascensores','office-locked':CARD_HINT,'access-card':'Recoger tarjeta de acceso · Aguada Park',stairs:'Entrar a las escaleras',lobby:'Abrir la puerta de planta baja',exit:'Salir a la libertad'}[interaction];
    if(interaction==='descent-mission'){
      const action=world.descent.action(p);
      $('prompt').querySelector('span').textContent=action.label+(action.id==='valve'?` · ${Math.round(world.descent.state.valveCharge/2*100)}%`:'');
    }
    if(interaction==='lobby'&&!world.descent.ready())$('prompt').querySelector('span').textContent='Salida bloqueada · '+world.descent.objective();
    elapsed+=dt;remaining=Math.max(0,remaining-dt*TIME_RATE);if(remaining<=0)result(false);
  }
  function jump() {if(mode==='play'&&grounded&&!climbing){fallStartY=p.y;velocityY=3.3;grounded=false;}}
  function playCamera(dt) {
    target.set(p.x,p.y+.45,p.z);
    if(climbing){
      target.set(p.x,p.y+.3,p.z);
      if(climbFace)cameraPosition.set(p.x+climbFace.nx*3.2,p.y+1.25,p.z+climbFace.nz*3.2);
      else cameraPosition.set(p.x+.4,Math.min(5.1,p.y+.35),p.z+4.2);
      camera.position.lerp(clearCameraPosition(target,cameraPosition,zone.solids),1-Math.exp(-6*dt));camera.position.copy(clearCameraPosition(target,camera.position,zone.solids));camera.lookAt(target);return;
    }
    const dist=zoneName==='stairs'?Math.min(zoom,3):zoom;
    cameraPosition.set(p.x+Math.sin(orbit)*Math.cos(pitch)*dist,p.y+.7+Math.sin(pitch)*dist,p.z+Math.cos(orbit)*Math.cos(pitch)*dist);
    // Keep the camera inside the active room to avoid seeing the back of opaque walls.
    if(zoneName==='office'){
      const passage=inPassage(p),lobby=inLiftLobby(p);
      cameraPosition.x=clamp(cameraPosition.x,lobby?15.12:-13.7,lobby?33.2:passage?36.1:14.2);
      cameraPosition.z=clamp(cameraPosition.z,lobby?10.55:passage?-11.1:-15.5,lobby?14.65:passage?10.05:11.65);
      cameraPosition.y=Math.min(passage||lobby?3.15:5.1,cameraPosition.y);
    }
    if(zoneName==='stairs'){
      const pantry=inFloor7(p);
      cameraPosition.x=clamp(cameraPosition.x,pantry?.3:-3.12,pantry?30.8:3.12);cameraPosition.z=clamp(cameraPosition.z,pantry?-11.75:-6.05,pantry?11.75:6.05);
      if(pantry)cameraPosition.y=Math.min(24.1,cameraPosition.y);
      // At a landing the rear wall leaves little room; move sideways instead of zooming into the shell.
      if(!pantry&&Math.hypot(cameraPosition.x-p.x,cameraPosition.z-p.z)<1.9)cameraPosition.x=clamp(p.x+(p.x<0?2.25:-2.25),-3.12,3.12);
    }
    if(zoneName==='passage2'||zoneName==='floor14'){
      let nearest=null,distance=Infinity;
      for(const s of zone.surfaces){if(s.y!==0)continue;const x=clamp(cameraPosition.x,s.x1+.18,s.x2-.18),z=clamp(cameraPosition.z,s.z1+.18,s.z2-.18),d=Math.hypot(x-cameraPosition.x,z-cameraPosition.z);if(d<distance){nearest={x,z};distance=d;}}
      if(nearest){cameraPosition.x=nearest.x;cameraPosition.z=nearest.z;}cameraPosition.y=Math.min(3.15,cameraPosition.y);
      if(zoneName==='passage2'&&Math.hypot(cameraPosition.x-p.x,cameraPosition.z-p.z)<1.9){cameraPosition.x=p.x+2.4;cameraPosition.z=Math.max(-10.8,p.z-.4);}
    }
    if(zoneName==='street'){cameraPosition.x=clamp(cameraPosition.x,-9.7,9.7);cameraPosition.z=Math.max(-7.7,cameraPosition.z);}
    camera.position.lerp(clearCameraPosition(target,cameraPosition,zone.solids),1-Math.exp(-8*dt));camera.position.copy(clearCameraPosition(target,camera.position,zone.solids));camera.lookAt(target);
  }
  function intro(dt) {
    cinemaTime+=dt;const t=cinemaTime;
    const settle=1-THREE.MathUtils.smoothstep(t,0,1.4),release=THREE.MathUtils.smoothstep(t,1.8,3.7),withdraw=THREE.MathUtils.smoothstep(t,3.7,6.2);
    hand.position.set(START.x+.16+withdraw*.7,START.y+.86+settle*.3+withdraw*2.5,START.z-.12+withdraw*.6);hand.rotation.z=-.16+withdraw*.25;hand.userData.pose(release);hand.visible=t<6.4;
    const f=THREE.MathUtils.smoothstep(t,0,11);
    cameraPosition.set(START.x+2.4-f*6,START.y+1.4+f*1.4,START.z+3.4+f*5.5);
    camera.position.copy(cameraPosition);camera.lookAt(START.x-f*3,START.y+.35,START.z+f*1.8);
    $('cinema-kicker').textContent=t<4?'VIERNES · 18:08 · PISO 14':t<8?'WPP PRODUCTION · LA OFICINA SE VACÍA':'UN FIN DE SEMANA PARA VOLVER';
    $('cinema-line').textContent=t<4?'Te llamás Turbo. Te dejaron en el piso 14.':t<8?'Cerraron la puerta. Y se olvidaron de vos.':'Catorce pisos. Cuarenta y ocho horas. Un pequeño gran escape.';
    if(t>=12)beginPlay();
  }
  function startVisitorIntro(){
    world.descent.visitor.introduce();cinemaTime=0;mode='visitor-intro';keys.clear();dragging=false;
    show('hud',false);show('cinema');document.body.className='cinematic';
    $('skip').textContent='Volver a Turbo →';
    $('cinema-kicker').textContent='PISO 7 · SE ESCUCHAN PASOS';
    $('cinema-line').textContent='Alguien de la oficina volvió por algo…';
  }
  function finishVisitorIntro(){
    mode='play';show('cinema',false);show('hud');document.body.className='playing';keys.clear();
    orbit=-Math.PI/2;heading=Math.PI/2;snail.group.rotation.set(0,heading,0);
    target.set(p.x,p.y+.35,p.z);cameraPosition.set(p.x-2.4,p.y+1.4,p.z+.1);camera.position.copy(clearCameraPosition(target,cameraPosition,zone.solids));camera.lookAt(target);
    announce('No dejes que te vea. Escondete detrás de los muebles y esperá a que se dé vuelta.');
    syncHUD();
  }
  function visitorIntro(dt){
    cinemaTime+=dt;world.descent.visitor.tick(dt,p,false);
    const actor=world.descent.visitor.pose();
    camera.position.set(29.5,23.2,-7+cinemaTime*.15);camera.lookAt(actor.x,actor.y+1.1,actor.z);
    $('cinema-line').textContent=cinemaTime<3?'Alguien de WPP volvió a la oficina…':'Si te ve, va a perseguirte. El bol del Blé está en la pecera del tercer pasillo.';
    if(cinemaTime>=6)finishVisitorIntro();
  }
  function outro(dt) {
    cinemaTime+=dt;const t=cinemaTime;
    p.z=Math.min(15,p.z+dt*.85);snail.group.rotation.y=0;
    camera.position.set(p.x+3+Math.sin(t*.15),1.1+t*.1,p.z+3.5);camera.lookAt(p.x,.4,p.z);
    $('cinema-kicker').textContent=t<4?'PLANTA BAJA · LA ÚLTIMA PUERTA':'AFUERA · EL MUNDO VUELVE A EMPEZAR';
    $('cinema-line').textContent=t<4?'Un último esfuerzo. Y el aire cambia.':'No hacía falta ir rápido. Hacía falta seguir.';
    if(t>10)result(true);
  }
  function menuCamera(time) {
    const aim=new THREE.Vector3(START.x,START.y+.35,START.z);
    camera.position.set(START.x+2.35+Math.sin(time*.13)*.15,START.y+1.0,START.z+2.9);
    camera.lookAt(aim);camera.translateX(-1.25); // Composition leaves room for the title on the left.
  }
  function sound(enabled) {
    if(enabled&&!audioContext){
      audioContext=new (window.AudioContext||window.webkitAudioContext)();
      const osc=audioContext.createOscillator();osc.type='sine';osc.frequency.value=80;humGain=audioContext.createGain();humGain.gain.value=0;osc.connect(humGain).connect(audioContext.destination);osc.start();
    }
    if(audioContext){audioContext.resume();humGain.gain.setTargetAtTime(enabled&&mode!=='paused'?.035:0,audioContext.currentTime,.2);}
  }
  function chime(){if(!audioContext||!$('audio').checked)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.frequency.setValueAtTime(530,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(830,audioContext.currentTime+.18);gain.gain.setValueAtTime(.05,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.4);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.4);}
  $('player-form').onsubmit=async e=>{
    e.preventDefault();const button=$('start');button.disabled=true;$('player-status').textContent='Reservando tu nombre…';
    try{player=await reservePlayer($('player-name').value);identify();await flushScore(player).catch(()=>{});$('skip').textContent='Saltar cinemática →';start();}
    catch(error){$('player-status').textContent=error.message;}
    finally{button.disabled=false;}
  };
  $('other-player').onclick=()=>{try{forgetActive();player=null;identify();refreshRanking();$('player-name').focus();}catch(error){$('player-status').textContent=error.message;}};
  $('refresh-ranking').onclick=refreshRanking;
  $('skip').onclick=()=>{if(mode==='intro')beginPlay();else if(mode==='visitor-intro')finishVisitorIntro();else if(mode==='outro')result(true);};
  $('cinema-home').onclick=()=>{if(mode==='outro')result(true);resetMenu();};
  $('pause-btn').onclick=pause;$('resume').onclick=resume;$('restart').onclick=resetMenu;$('again').onclick=start;
  $('help-open').onclick=()=>$('help').showModal();$('pause-help').onclick=()=>$('help').showModal();
  $('result-ranking').onclick=resetMenu;$('retry-save').onclick=()=>persistRun();
  window.addEventListener('online',()=>{if(player)flushScore(player).then(()=>flushAttempts(player)).then(refreshRanking).catch(()=>{});});
  window.addEventListener('pagehide',()=>persistRun(true));
  identify();refreshRanking();
  restorePlayer().then(identity=>{if(mode==='menu'&&identity){player=identity;identify();refreshRanking();}}).catch(()=>{});
  if(player)flushScore(player).then(()=>flushAttempts(player)).then(refreshRanking).catch(()=>{});
  document.querySelectorAll('dialog .close, .close-help').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $('audio').onchange=e=>sound(e.target.checked);
  $('quality').onchange=e=>visuals.quality(e.target.value==='high');
  $('touch-use').onclick=use;
  for(const b of document.querySelectorAll('[data-key]')){
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='Space')jump();});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));
  }
  window.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]'))return;
    if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select')&&e.code!=='Escape')return;
    if(e.code==='Escape'){if(mode==='paused')resume();else pause();return;}
    if(mode!=='play')return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    keys.add(e.code);if(e.code==='Space')jump();if(e.code==='KeyE')use();
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('pointerdown',e=>{if(mode==='play'){dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(dragging&&mode==='play'){orbit-=(e.clientX-lastX)*.006;pitch=clamp(pitch+(e.clientY-lastY)*.004,.08,.95);lastX=e.clientX;lastY=e.clientY;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>dragging=false);
  canvas.addEventListener('wheel',e=>{if(mode==='play'){e.preventDefault();zoom=clamp(zoom+e.deltaY*.004,1.6,7);}}, {passive:false});
  window.addEventListener('blur',()=>{keys.clear();pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();visuals.resize();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();fatal('Se perdió la conexión gráfica. Recargá la página para volver a jugar.');});

  let previous=performance.now(), uiTimer=0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    const active=mode!=='paused';if(active)animation+=dt;
    if(runActive){captureProgress();saveTimer+=dt;if(saveTimer>=2){saveTimer=0;persistRun();}}
    if(mode==='menu'){rankingTimer+=dt;if(rankingTimer>10){rankingTimer=0;refreshRanking();}}
    if(mode==='menu')menuCamera(animation);
    if(mode==='intro')intro(dt);
    if(mode==='visitor-intro')visitorIntro(dt);
    if(mode==='play'){
      // Substeps keep collisions and individual staircase treads stable at low frame rates.
      const steps=Math.ceil(dt/.012);for(let i=0;i<steps&&mode==='play';i++)updatePlayer(dt/steps);
      if(zoneName==='stairs'&&mode==='play'){
        const event=world.descent.tick(dt,p,keys.has('KeyE'));
        if(event){announce(event.text);chime();}
        world.sun.position.y=p.y+9;world.sun.target.position.y=p.y;
        if(!climbing&&grounded&&world.descent.visitor.shouldIntroduce(p))startVisitorIntro();
        else{
          const sight=world.descent.visitor.tick(dt,p,true);
          show('stealth-warning',sight.inside||sight.meter>0);
          $('stealth-warning').textContent=sight.phase==='stomp'?'¡VA A PISARTE! · ¡Esquivá el pie!':sight.phase==='chase'?'¡TE PERSIGUE! · Cortá su visión y buscá cobertura':sight.meter>0?`TE ESTÁ VIENDO · ${Math.round(sight.meter*100)}% · ¡Buscá cobertura!`:'PATRULLA CERCA · Evitá el cono de visión';
          if(sight.caught)result(false,'caught');
        }
      }else show('stealth-warning',false);
      if(mode==='play')playCamera(dt);uiTimer+=dt;if(uiTimer>.1){syncHUD();uiTimer=0;}
    }
    if(zoneName==='stairs'){
      const light=stairLightLevel(p.y);
      world.sun.intensity=.015+.985*light;world.ambient.intensity=.055+1.045*light;scene.environmentIntensity=.025+.295*light;
      scene.background.set('#0e151b').lerp(new THREE.Color('#62736e'),light);scene.fog.color.copy(scene.background);
    }
    if(mode==='outro')outro(dt);
    if(active){
      snail.group.scale.y=snail.size*(1+(moving&&mode==='play'?Math.sin(animation*11)*.018:Math.sin(animation*2)*.008));
      for(const d of zone.drops)if(!d.taken){d.mesh.position.y=d.y+Math.sin(animation*2+d.x)*.055;d.mesh.rotation.y=animation;}
      trailClock-=dt;
      for(const t of trails)if(t.visible){t.userData.life-=dt;if(t.userData.life<=0)t.visible=false;}
      if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
    }
    if(mode!=='paused')visuals.render(dt,animation);
  }
  requestAnimationFrame(frame);
  // Read-only snapshot for manual QA; no teleport, time bypass or gameplay shortcuts.
  window.snailGame=Object.freeze({snapshot:()=>({mode,zone:zoneName,floor,remaining,stamina,grounded,attemptEnded,bestPoints,position:{x:p.x,y:p.y,z:p.z},interaction,render:renderer.info.render})});
}
