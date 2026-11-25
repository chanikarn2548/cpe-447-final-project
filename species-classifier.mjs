import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {isValidClassifierHead,scoreClassifierLogits} from './classifier-head.mjs';
let pending;
const expectedLabels=['cat','dog','bird','rabbit','hamster'];
export async function suggestSpecies(vector,backbonePath){
  if(!pending)pending=(async()=>{
    const head=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'models','species5-head.json'),'utf8'));
    const hash=crypto.createHash('sha256').update(await fs.readFile(backbonePath)).digest('hex');
    if(head.modelHash!==hash||JSON.stringify(head.labels)!==JSON.stringify(expectedLabels)||!isValidClassifierHead(head,384,5))throw Error('โมเดลเสนอชนิดสัตว์ไม่ตรงกับรุ่นที่ฝึก');
    return head;
  })().catch(error=>{pending=null;throw error;});
  const head=await pending;
  if(!Array.isArray(vector)||vector.length!==head.dimensions||!vector.every(Number.isFinite))throw Error('ข้อมูลลักษณะภาพไม่ถูกต้อง');
  const scores=scoreClassifierLogits(vector,head);
  const ranked=head.labels.map((species,c)=>({species,score:scores[c]})).sort((a,b)=>b.score-a.score);
  return {suggestions:ranked.slice(0,3).map(({species})=>({species})),needsConfirmation:true,modelVersion:head.release||'species5-v1',scope:'cat,dog,bird,rabbit,hamster only; not identity verification'};
}
