import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../matching.js',import.meta.url),'utf8');
const render=source.slice(source.indexOf('function renderMatchPage('),source.indexOf('async function matchCase('));
const cards=source.slice(source.indexOf('function matchingRows('),source.indexOf('async function matchImageAutomatically('));
function setup(n){const s={matchReview:{item:{id:'query'},allRows:Array.from({length:n},(_,i)=>({id:String(i),name:'Pet '+i,image:'test.jpg',score:1-i/100})),external:{},failed:0,localError:''},escapeHtml:String,safeExternalUrl:()=>'',speciesIcon:()=>'',openMatchResults:(title,hint,html)=>{s.output={title,hint,html};}};vm.runInNewContext(cards+render,s);return s;}
test('first popup shows five; more preserves order and correct review indices',()=>{
  const s=setup(12);s.renderMatchPage();assert.equal(s.matchReview.rows.length,5);assert.ok(s.output.html.includes('data-match-more'));
  s.renderMatchPage(10);assert.equal(s.matchReview.rows.length,10);assert.equal(s.matchReview.rows[9].id,'9');assert.ok(s.output.html.includes('data-match-review="9"'));
  s.renderMatchPage(15);assert.equal(s.matchReview.rows.length,12);assert.ok(!s.output.html.includes('data-match-more'));assert.equal(s.matchReview.allRows.length,12);
});
test('short and empty results do not offer nonexistent extra matches',()=>{
  for(const n of [0,3,5]){const s=setup(n);s.renderMatchPage();assert.equal(s.matchReview.rows.length,n);assert.ok(!s.output.html.includes('data-match-more'));}
});
test('Facebook group matches ranked below top five still surface in dedicated showcase section',()=>{
  const rows=[
    ...Array.from({length:6},(_,i)=>({id:String(i),name:'Local '+i,image:'local.jpg',score:0.9-i*0.02})),
    {id:'fb-1',name:'นกค็อกคาเทล',image:'fbbird.jpg',score:0.72,kind:'facebook',groupName:'กลุ่มตามหานกหาย-นกหลุด',sourceLink:'https://www.facebook.com/groups/879535573409695/posts/123'}
  ];
  const s={matchReview:{item:{id:'q',species:'bird',kind:'ค็อกคาเทล'},allRows:rows,external:{linkedGroups:[{name:'ประกาศนกหาย',url:'https://www.facebook.com/groups/261650613992940/'}]},failed:0,localError:''},escapeHtml:String,safeExternalUrl:u=>u||'',speciesIcon:()=>'',speciesName:()=>'นก',openMatchResults:(title,hint,html)=>{s.output={title,hint,html};}};
  vm.runInNewContext(cards+render,s);
  s.renderMatchPage(5);
  assert.ok(s.output.html.includes('fb-match-showcase'));
  assert.ok(s.output.html.includes('กลุ่มตามหานกหาย-นกหลุด'));
  assert.ok(s.output.html.includes('fb-group-chip'));
  assert.equal(s.matchReview.rows.length,6);
  assert.equal(s.matchReview.rows[5].id,'fb-1');
});
