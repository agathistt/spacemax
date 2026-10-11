import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,editDimension,confirmDimension,displayValue,measurementErrors,makeBrief,validStoredState} from '../dist/planner-model.js';
test('manual upload starts without sample dimensions or obstacles',()=>{const s=createState();assert.deepEqual(s.dimensions,{width:null,height:null,depth:null});assert.equal(s.obstacle.enabled,false);assert.equal(s.photo,null)});
test('unit display never changes canonical measurements or confirmation',()=>{const s=createState();editDimension(s,'width','30.1');confirmDimension(s,'width',true);for(let i=0;i<100;i++){s.units='in';displayValue(s.dimensions.width,s.units);s.units='cm';displayValue(s.dimensions.width,s.units)}assert.equal(s.dimensions.width,301);assert.equal(s.statuses.width,'confirmed');assert.equal(displayValue(s.dimensions.width,s.units),'30.1')});
test('editing a confirmed measurement clears only its confirmation',()=>{const s=createState('example');confirmDimension(s,'width',true);confirmDimension(s,'depth',true);editDimension(s,'width','80');assert.equal(s.statuses.width,'entered');assert.equal(s.statuses.depth,'confirmed')});
test('manual depth must be confirmed; prepared demo may stay demo',()=>{const s=createState('example');assert.deepEqual(measurementErrors(s),[]);editDimension(s,'depth','40');assert.match(measurementErrors(s).join(' '),/confirm/);confirmDimension(s,'depth',true);assert.deepEqual(measurementErrors(s),[])});
test('stored plans validate and briefs retain truth labels',()=>{const s=createState('example');assert.equal(validStoredState(s),true);assert.match(makeBrief(s),/Demo sample/);assert.match(makeBrief(s),/not an order/);assert.equal(validStoredState({...s,photo:'javascript:bad'}),false)});
test('typing or pasting a height produces the same proportional default shelf',()=>{
  const typed=createState(),pasted=createState();
  for(const value of ['6','65'])editDimension(typed,'height',value);
  editDimension(pasted,'height','65');
  assert.equal(typed.shelfEdited,false);
  assert.equal(typed.shelfHeight,312);
  assert.equal(typed.shelfHeight,pasted.shelfHeight);
  for(const value of ['','1','10','100'])editDimension(typed,'height',value);
  assert.equal(typed.shelfHeight,480);
});
test('an explicitly adjusted shelf retains its height unless the new space requires clamping',()=>{
  const s=createState('example');s.shelfHeight=420;s.shelfEdited=true;
  editDimension(s,'height','80');
  assert.equal(s.shelfHeight,420);
  editDimension(s,'width','100');
  assert.equal(s.shelfHeight,420);
  editDimension(s,'height','30');
  assert.equal(s.shelfHeight,275);
  assert.equal(s.shelfEdited,true);
});
test('previously saved concepts without shelfEdited retain their existing shelf value',()=>{
  const s=createState('example');delete s.shelfEdited;s.shelfHeight=375;
  assert.equal(validStoredState(s),true);
  editDimension(s,'height','80');
  assert.equal(s.shelfHeight,375);
  assert.equal(s.shelfEdited,undefined);
});
