import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canCollectCard,canOpenOfficeDoor,CARD_HINT} from '../src/access.js';
import {insideSpill,hazardContact} from '../src/hazards.js';

test('card pickup requires reaching the desktop, not walking beneath it',()=>{
  const card={x:25.85,y:1.68,z:-1.5};
  assert.equal(canCollectCard({...card,y:0},card),false);
  assert.equal(canCollectCard({...card,y:1.66},card),true);
  assert.equal(canCollectCard({...card,x:card.x+1},card),false);
});
test('door requires the access card and explains what to find',()=>{
  assert.equal(canOpenOfficeDoor(false),false);
  assert.equal(canOpenOfficeDoor(true),true);
  assert.match(CARD_HINT,/tarjeta de acceso/);assert.match(CARD_HINT,/ascensores/);
});
test('irregular coffee uses its visible outline, including concave dry areas',()=>{
  const outline=[{x:0,z:0},{x:3,z:0},{x:3,z:1},{x:1,z:1},{x:1,z:3},{x:0,z:3}];
  assert.equal(insideSpill(.5,2,outline),true);
  assert.equal(insideSpill(2,2,outline),false);
  const stain={kind:'coffee',mesh:{position:{x:10,z:5}},x:10,z:5,y:0,outline};
  assert.equal(hazardContact([stain],{x:10.5,y:0,z:7},0),'coffee');
  assert.equal(hazardContact([stain],{x:12,y:0,z:7},0),null);
  assert.equal(hazardContact([stain],{x:10.5,y:.5,z:7},0),null);
});
