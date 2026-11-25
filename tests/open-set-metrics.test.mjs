import test from 'node:test';import assert from 'node:assert/strict';
import {openSetScores,calibrateThreshold,summarizeOpenSet,weightedCosine} from '../training/open-set-metrics.mjs';
test('unknown score excludes every positive and pixel duplicates',()=>{
 const q=[{id:'a',name:'q',pixelHash:'q',x:[1,0]}];
 const g=[{id:'a',pixelHash:'q',x:[1,0]},{id:'a',pixelHash:'a1',x:[1,0]},{id:'a',pixelHash:'a2',x:[.9,.1]},{id:'b',pixelHash:'b',x:[0,1]}];
 const rows=openSetScores(q,g,[1,1]);assert.equal(rows[0].knownTopScore,1);assert.equal(rows[0].unknownTopScore,0);
 assert.equal(summarizeOpenSet(rows,.5).knownCorrectAccept,1);assert.equal(summarizeOpenSet(rows,.5).unknownFalseAccept,0);
});
test('threshold ties do not exceed calibration false acceptance rate',()=>{
 const rows=Array.from({length:20},(_,i)=>({unknownTopScore:i<18?.3:.9,knownTopScore:1,knownCorrect:true}));const t=calibrateThreshold(rows);assert.equal(t,.9);assert.equal(summarizeOpenSet(rows,t).unknownFalseAccept,0);
});
test('metric guards invalid vector lengths and nonpositive weights',()=>{
 assert.throws(()=>weightedCosine([1],[1,0],[1]));assert.throws(()=>weightedCosine([1],[1],[0]));assert.throws(()=>calibrateThreshold([]));
});
