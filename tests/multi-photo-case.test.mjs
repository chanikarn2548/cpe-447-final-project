import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),start=source.indexOf('async function submitCase(form,type){'),fn=source.slice(start,source.indexOf("document.addEventListener('click'",start));
function setup(ok=true){const s={state:{cases:[{id:'old'}]},FormData:class{entries(){return Object.entries({species:'cat',name:'Kitty'});}},compressedImage:async file=>'data:image/jpeg;base64,'+file,save:()=>ok,renderCases(){},closeDialog(){s.closed=true;},showToast(){},speciesName:()=> 'แมว',safeExternalUrl:x=>x,$:()=>({scrollIntoView(){}}),setTimeout(){}};vm.runInNewContext(fn,s);return s;}
const form=files=>({id:'lostPhotoOnlyForm',dataset:{},querySelector:()=>({files})});
test('search case retains both photos, with the first as cover',async()=>{const s=setup();await s.submitCase(form(['one','two']),'lost');assert.deepEqual([...s.state.cases[0].images],['data:image/jpeg;base64,one','data:image/jpeg;base64,two']);assert.equal(s.state.cases[0].image,s.state.cases[0].images[0]);});
test('storage failure keeps form and existing cases intact',async()=>{const s=setup(false);await assert.rejects(s.submitCase(form(['one','two']),'lost'));assert.equal(s.state.cases.length,1);assert.equal(s.closed,undefined);});
test('more than two query photos are rejected without saving',async()=>{const s=setup();await assert.rejects(s.submitCase(form(['one','two','three']),'lost'));assert.equal(s.state.cases.length,1);});
test('profile search retains its two photos without a new file upload',async()=>{const s=setup(),f=form([]);f.dataset.profileImages=JSON.stringify(['data:image/jpeg;base64,one','data:image/jpeg;base64,two']);await s.submitCase(f,'lost');assert.equal(s.state.cases[0].images.length,2);});
test('backup round trip preserves both query photos and legacy single-photo cases',async()=>{
  const s={state:{cases:[],profiles:[],sightings:[]},initialCases:[],clueStatuses:{},safeExternalUrl:()=>'',mergeClues:x=>x,persistBackupBundle:()=>true,renderCases(){},renderProfiles(){},renderSightings(){},showToast(){}};
  vm.runInNewContext(source.slice(source.indexOf('function cleanBackupImage('),source.indexOf('function persistBackupBundle('))+source.slice(source.indexOf('async function importBackup('),source.indexOf('async function downloadCasePhoto(')),s);
  const images=['data:image/jpeg;base64,YQ==','data:image/jpeg;base64,Yg=='];
  const backup={format:'tamnong-backup',version:1,cases:[{id:'two',type:'lost',species:'cat',image:images[0],images},{id:'one',type:'lost',species:'dog',image:images[0]}],profiles:[],sightings:[]};
  await s.importBackup({size:1000,text:async()=>JSON.stringify(backup)});
  assert.deepEqual([...s.state.cases[0].images],images);assert.deepEqual([...s.state.cases[1].images],[images[0]]);
});
