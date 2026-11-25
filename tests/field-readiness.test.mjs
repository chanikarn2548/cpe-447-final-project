import test from 'node:test';import assert from 'node:assert/strict';
import {fieldReadiness} from '../training/field-readiness.mjs';import {splitPairs} from '../training/field-pairs.mjs';
const row=(split,id,sameAnimal)=>({split,species:'cat',componentId:id,caseId:id,queryHash:id+'a',candidateHash:id+'b',sameAnimal});
const manifest=pairs=>({format:'tamnong-field-benchmark',pairs});
test('empty data cannot be described as ready',()=>{const r=fieldReadiness(manifest([]));assert.equal(r.species.cat.canRunPilot,false);assert.ok(r.species.cat.missing.includes('test:negative'));});
test('pilot needs both labels in independent validation and test groups',()=>{const rows=[row('validation','v1',true),row('validation','v2',false),row('test','t1',true),row('test','t2',false)];const r=fieldReadiness(manifest(rows));assert.equal(r.species.cat.canRunPilot,true);assert.equal(r.species.dog.canRunPilot,false);});
test('image, case and component overlaps block even apparently complete labels',()=>{for(const key of ['queryHash','caseId','componentId']){const a=row('validation','a',true),b=row('test','b',false);b[key]=a[key];assert.ok(fieldReadiness(manifest([a,b])).blockers.includes('split-overlap'));}});
test('same image cannot be labeled cat and dog across different pairs',()=>{const a=row('train','a',true),b={...row('train','b',false),species:'dog',queryHash:a.queryHash};assert.throws(()=>splitPairs([a,b]),/Conflicting species/);assert.ok(fieldReadiness(manifest([a,b])).blockers.includes('species-conflict'));});
