import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {queryImages} from '../multi-query.mjs';
const source=fs.readFileSync(new URL('../matching.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function reviewMatch('),source.indexOf('function matchKey('));
test('clue review displays both query views and escapes image attributes',async()=>{
  const s={matchReview:{item:{id:'q',name:'Cat',image:'first.jpg',images:['first.jpg','second".jpg']},rows:[{image:'candidate.jpg'}]},state:{sightings:[]},multiQueryTools:Promise.resolve({queryImages}),safeExternalUrl:()=>'',matchKey:()=>'',escapeHtml:x=>String(x).replaceAll('"','&quot;'),openDialog:(a,b,html)=>{s.html=html;}};
  vm.runInNewContext(fn,s);await s.reviewMatch(0);
  assert.ok(s.html.includes('second&quot;.jpg'));assert.ok(s.html.includes('candidate.jpg'));
  assert.equal((s.html.match(/<img /g)||[]).length,3);
});
test('legacy single-photo case still displays query and candidate',async()=>{
  const s={matchReview:{item:{id:'q',image:'first.jpg'},rows:[{image:'candidate.jpg'}]},state:{sightings:[]},multiQueryTools:Promise.resolve({queryImages}),safeExternalUrl:()=>'',matchKey:()=>'',escapeHtml:String,openDialog:(a,b,html)=>{s.html=html;}};
  vm.runInNewContext(fn,s);await s.reviewMatch(0);assert.equal((s.html.match(/<img /g)||[]).length,2);
});
