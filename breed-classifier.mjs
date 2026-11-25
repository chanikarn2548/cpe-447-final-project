import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {isValidClassifierHead,scoreClassifierLogits} from './classifier-head.mjs';
const cats=new Set(['abyssinian','bengal','birman','bombay','british_shorthair','egyptian_mau','maine_coon','persian','ragdoll','russian_blue','siamese','sphynx']);
export function rankBreeds(vector,head,species){
 if(!['cat','dog'].includes(species))throw Error('รองรับสายพันธุ์หมาและแมวเท่านั้น');
 if(!isValidClassifierHead(head,512,37))throw Error('ข้อมูลโมเดลสายพันธุ์ไม่ครบ');
 if(!Array.isArray(vector)||vector.length!==512||!vector.every(Number.isFinite)||!Math.hypot(...vector))throw Error('ข้อมูลภาพไม่ถูกต้อง');
 const scores=scoreClassifierLogits(vector,head);
 return head.labels.map((label,c)=>({label,species:cats.has(label)?'cat':'dog',score:scores[c]})).filter(r=>r.species===species).sort((a,b)=>b.score-a.score).slice(0,3).map(({label})=>({label,name:label.replaceAll('_',' ')}));
}
export function rankBirdBreeds(vector,head){
 const count=Array.isArray(head?.labels)?head.labels.length:0;
 if(count<2||!isValidClassifierHead(head,384,count))throw Error('ข้อมูลโมเดลสายพันธุ์นกไม่ครบ');
 if(!Array.isArray(vector)||vector.length!==384||!vector.every(Number.isFinite)||!Math.hypot(...vector))throw Error('ข้อมูลภาพนกไม่ถูกต้อง');
 const thai=head.thaiNames||{},eng=head.englishNames||{},scores=scoreClassifierLogits(vector,head);
 return head.labels.map((label,c)=>({
  label,
  name:eng[label]||label.replaceAll('_',' '),
  thaiName:thai[label]||'',
  score:scores[c]
 })).sort((a,b)=>b.score-a.score).slice(0,3).map(({label,name,thaiName})=>({label,name,thaiName}));
}
const pendingHeads=new Map();
async function loadHead(headFile,backbonePath){
 const key=`${headFile}:${backbonePath}`;
 if(!pendingHeads.has(key)){
  pendingHeads.set(key,(async()=>{
   const head=JSON.parse(await fs.readFile(path.join(import.meta.dirname,headFile)));
   const hash=crypto.createHash('sha256').update(await fs.readFile(backbonePath)).digest('hex');
   if(head.modelHash!==hash)throw Error('รุ่นโมเดลภาพไม่ตรงกับชุดฝึกสายพันธุ์');
   return head;
  })().catch(error=>{pendingHeads.delete(key);throw error;}));
 }
 return pendingHeads.get(key);
}
export async function suggestBreed(vector,species,backbonePath){
 if(species==='bird'){
  const head=await loadHead('models/bird-head.json',backbonePath);
  return {suggestions:rankBirdBreeds(vector,head),modelVersion:head.release||'bird24-v1',needsConfirmation:true,scope:'24 common pet and urban bird species; rare morphs map to nearest species'};
 }
 const head=await loadHead('models/breed-head.json',backbonePath);
 return {suggestions:rankBreeds(vector,head,species),modelVersion:head.release||'oxford37',needsConfirmation:true,scope:'37 known pure breeds; not mixed-breed identification or animal identity verification'};
}
