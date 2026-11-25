import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync(new URL('../case-tools.js',import.meta.url),'utf8'),context={};vm.runInNewContext(src.slice(src.indexOf('function trainingPairReadiness('),src.indexOf('function renderTrainingReadiness(')),context);
test('readiness excludes demo, unreviewed and incomplete pairs while separating positive/negative',()=>{
 const cases=[{id:'real',species:'cat',image:'a'},{id:'demo',species:'dog',image:'a',isDemo:true}],clue={caseId:'real',image:'b',status:'confirmed',reviewedAt:'2026-11-15'};
 const r=context.trainingPairReadiness(cases,[clue,{...clue,status:'rejected'},{...clue,status:'pending'},{...clue,image:''},{...clue,caseId:'demo'},{...clue,reviewedAt:''}]);
 assert.equal(r.counts.cat.same,1);assert.equal(r.counts.cat.different,1);assert.equal(r.counts.dog.same,0);assert.equal(r.pending,1);assert.equal(r.incomplete,2);
});
