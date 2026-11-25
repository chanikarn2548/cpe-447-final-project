// Pretrained RF-DETR Nano (bird/cat/dog) + trained YOLO11n pets5.onnx (rabbit/hamster & fallback). Localization only, never identity proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import ort from 'onnxruntime-node';
import {detectPets,detectionStatus} from './detection.mjs';

export const detectorFile=path.join(os.tmpdir(),'tamnong-model-cache','rfdetr-nano.onnx');
export const detectorSource='https://huggingface.co/open-noodle/rfdetr-nano/resolve/1618db5f22919339f4347d436da8c43afaf91926/detection/model.onnx';
const ids={bird:16,cat:17,dog:18};
const fiveSpecies=new Set(['cat','dog','bird','rabbit','hamster']);
let pending;
async function session(){
  if(!pending)pending=ort.InferenceSession.create(detectorFile,{intraOpNumThreads:4}).catch(error=>{pending=null;throw error;});
  return pending;
}
async function cropWithPets5(oriented,width,height,species){
  const res=await detectPets(oriented);
  const boxes=res.detections
    .filter(d=>d.label===species&&d.confidence>=0.65&&d.width*width>=24&&d.height*height>=24)
    .map(d=>({box:[d.x,d.y,d.x+d.width,d.y+d.height],score:d.confidence}));
  if(boxes.length===0){
    const solo=res.detections.filter(d=>d.confidence>=0.40&&d.width*width>=24&&d.height*height>=24);
    if(solo.length===1&&solo[0].label===species&&solo[0].confidence>=0.48){
      const d=solo[0];
      boxes.push({box:[d.x,d.y,d.x+d.width,d.y+d.height],score:d.confidence});
    }
  }
  if(boxes.length!==1)return {image:oriented,applied:false,reason:boxes.length?'multiple-animals':'no-reliable-box',detections:boxes,detector:'pets5-yolo11n'};
  const {box}=boxes[0],mx=(box[2]-box[0])*.03,my=(box[3]-box[1])*.03;
  const left=Math.max(0,Math.floor((box[0]-mx)*width)),top=Math.max(0,Math.floor((box[1]-my)*height));
  const right=Math.min(width,Math.ceil((box[2]+mx)*width)),bottom=Math.min(height,Math.ceil((box[3]+my)*height));
  const image=await sharp(oriented).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer();
  return {image,applied:true,reason:'single-animal',box,detections:boxes,detector:'pets5-yolo11n'};
}
export async function cropPet(body,species){
  if(!fiveSpecies.has(species))return {image:body,applied:false,reason:'unsupported-species'};
  const oriented=await sharp(body,{limitInputPixels:40_000_000}).rotate().png().toBuffer();
  const {width,height}=await sharp(oriented).metadata();
  if(!(species in ids)){
    if(!detectionStatus().ready)return {image:body,applied:false,reason:'detector-unavailable'};
    return cropWithPets5(oriented,width,height,species);
  }
  try{
    await fs.access(detectorFile);
  }catch{
    if(detectionStatus().ready)return cropWithPets5(oriented,width,height,species);
    throw new Error('Missing detector weights');
  }
  const n=384,plane=n*n;
  const rgb=await sharp(oriented).resize(n,n,{fit:'fill'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const input=new Float32Array(plane*3),mean=[.485,.456,.406],std=[.229,.224,.225];
  for(let c=0;c<3;c++)for(let i=0;i<plane;i++)input[c*plane+i]=(rgb[i*3+c]/255-mean[c])/std[c];
  const result=await (await session()).run({input:new ort.Tensor('float32',input,[1,3,n,n])});
  if(String(result.dets?.dims)!=='1,300,4'||String(result.labels?.dims)!=='1,300,91')throw new Error('Unexpected detector output');
  const boxes=[];
  for(let i=0;i<300;i++){
    const score=1/(1+Math.exp(-result.labels.data[i*91+ids[species]]));
    if(score<.65)continue;
    const [cx,cy,w,h]=Array.from(result.dets.data.slice(i*4,i*4+4));
    if(![cx,cy,w,h,score].every(Number.isFinite)||w<=0||h<=0)continue;
    const box=[Math.max(0,cx-w/2),Math.max(0,cy-h/2),Math.min(1,cx+w/2),Math.min(1,cy+h/2)];
    if((box[2]-box[0])*width<24||(box[3]-box[1])*height<24)continue;
    boxes.push({box,score});
  }
  // Do not guess which animal the user means when several are visible.
  if(boxes.length!==1){
    if(boxes.length===0&&detectionStatus().ready){
      const fallback=await cropWithPets5(oriented,width,height,species);
      if(fallback.applied)return fallback;
    }
    return {image:body,applied:false,reason:boxes.length?'multiple-animals':'no-reliable-box',detections:boxes,detector:'rfdetr-nano'};
  }
  const {box}=boxes[0],mx=(box[2]-box[0])*.03,my=(box[3]-box[1])*.03;
  const left=Math.max(0,Math.floor((box[0]-mx)*width)),top=Math.max(0,Math.floor((box[1]-my)*height));
  const right=Math.min(width,Math.ceil((box[2]+mx)*width)),bottom=Math.min(height,Math.ceil((box[3]+my)*height));
  const image=await sharp(oriented).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer();
  return {image,applied:true,reason:'single-animal',box,detections:boxes,detector:'rfdetr-nano'};
}
