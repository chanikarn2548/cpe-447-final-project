import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf("document.addEventListener('submit',async e=>{"),source.indexOf('renderCases();renderSightings();renderProfiles();'));
function setup(ok=true){
 const s={state:{cases:[{id:'case1',name:'Milo'}],profiles:[{name:'Old',image:'old',images:['old']}],sightings:[]},document:{addEventListener:(_,cb)=>s.submit=cb},FormData:class{entries(){return Object.entries({name:'New',species:'cat',color:'white',description:'Seen',area:'Park'});}},save:()=>ok,compressedImage:async()=> 'photo',safeExternalUrl:x=>x,renderProfiles(){},renderSightings(){},closeDialog(){s.closed=true;},showToast:x=>{s.toast=x;},compareSighting:async()=>{s.compared=true;}};
 vm.runInNewContext(handler,s);return s;
}
test('failed profile persistence retains old state and keeps form open',async()=>{
 const s=setup(false),form={id:'editProfileForm',dataset:{index:'0'},matches:()=>true,querySelectorAll:()=>[{value:'0'}],querySelector:()=>({files:[]})};
 await s.submit({target:form,preventDefault(){}});assert.equal(s.state.profiles[0].name,'Old');assert.equal(s.closed,undefined);assert.ok(s.toast);
});
test('manual sighting persists and reaches image comparison',async()=>{
 const s=setup(),form={id:'sightingForm',dataset:{id:'case1'},matches:()=>true,querySelector:()=>({files:[{}]})};
 await s.submit({target:form,preventDefault(){}});assert.equal(s.state.sightings.length,1);assert.equal(s.state.sightings[0].caseId,'case1');assert.equal(s.compared,true);
});
test('failed sighting persistence does not add an unsaved clue',async()=>{
 const s=setup(false),form={id:'sightingForm',dataset:{id:'case1'},matches:()=>true,querySelector:()=>({files:[{}]})};
 await s.submit({target:form,preventDefault(){}});assert.equal(s.state.sightings.length,0);assert.equal(s.compared,undefined);assert.equal(s.closed,undefined);
});
test('profile list exposes edit action with correct index',()=>{
 const box={innerHTML:''},s={state:{profiles:[{name:'Milo',image:'photo',images:['photo']}]},$:selector=>selector==='#profiles'?box:{style:{}},escapeHtml:String,speciesIcon:()=>'',speciesName:()=>''};
 vm.runInNewContext(source.slice(source.indexOf('function renderProfiles(){'),source.indexOf('function openDialog(')),s);s.renderProfiles();assert.match(box.innerHTML,/data-action="editprofile" data-index="0"/);
});
