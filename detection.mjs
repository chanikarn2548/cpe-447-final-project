import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import ort from 'onnxruntime-node';

export const classes = ['cat','dog','bird','rabbit','hamster'];
const modelPath=path.join(import.meta.dirname,'models','pets5.onnx');
let pending;
export function detectionStatus(){return {ready:fs.existsSync(modelPath),classes,model:'models/pets5.onnx'};}
export function insidePolygon(point,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    const cross=(point[0]-a[0])*(b[1]-a[1])-(point[1]-a[1])*(b[0]-a[0]);
    if(Math.abs(cross)<1e-9&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function iou(a,b){
  const area=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  return area/(a.width*a.height+b.width*b.height-area||1);
}
export async function detectPets(body){
  if(!fs.existsSync(modelPath)){const error=new Error('ยังไม่มีโมเดลที่เทรน: วาง pets5.onnx ในโฟลเดอร์ models ก่อน');error.statusCode=503;throw error;}
  if(!pending)pending=ort.InferenceSession.create(modelPath).catch(error=>{pending=null;throw error;});
  const session=await pending,original=await sharp(body).rotate().toBuffer(),meta=await sharp(original).metadata();
  const scale=Math.min(640/meta.width,640/meta.height),width=Math.round(meta.width*scale),height=Math.round(meta.height*scale),left=Math.floor((640-width)/2),top=Math.floor((640-height)/2);
  const pixels=await sharp(original).resize(width,height).removeAlpha().toColourspace('srgb').extend({left,right:640-width-left,top,bottom:640-height-top,background:{r:114,g:114,b:114}}).raw().toBuffer();
  const tensor=new Float32Array(3*640*640);
  for(let i=0;i<640*640;i++)for(let c=0;c<3;c++)tensor[c*640*640+i]=pixels[i*3+c]/255;
  const outputs=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',tensor,[1,3,640,640])}),output=outputs[session.outputNames[0]];
  if(output.dims.length!==3||output.dims[1]!==9)throw new Error('รูปแบบโมเดลไม่ตรง: ต้องเป็น YOLO11 Detect 5 คลาส ONNX แบบ raw [1,9,N] ขนาด 640');
  const count=output.dims[2],data=output.data,boxes=[];
  for(let i=0;i<count;i++){
    let classId=0,confidence=0;
    for(let c=0;c<5;c++)if(data[(4+c)*count+i]>confidence){confidence=data[(4+c)*count+i];classId=c;}
    if(confidence<0.25)continue;
    const cx=data[i],cy=data[count+i],w=data[2*count+i],h=data[3*count+i];
    const x=Math.max(0,Math.min(meta.width,(cx-w/2-left)/scale)),y=Math.max(0,Math.min(meta.height,(cy-h/2-top)/scale));
    const right=Math.max(0,Math.min(meta.width,(cx+w/2-left)/scale)),bottom=Math.max(0,Math.min(meta.height,(cy+h/2-top)/scale));
    if(right>x&&bottom>y)boxes.push({classId,label:classes[classId],confidence,x:x/meta.width,y:y/meta.height,width:(right-x)/meta.width,height:(bottom-y)/meta.height});
  }
  boxes.sort((a,b)=>b.confidence-a.confidence);
  const kept=[];for(const box of boxes){if(!kept.some(other=>iou(box,other)>(other.classId===box.classId?0.45:0.65)))kept.push(box);if(kept.length===100)break;}
  return {detections:kept,width:meta.width,height:meta.height};
}
