import sharp from 'sharp';
import {assertValidImageBuffer} from './security.mjs';
// Advisory heuristics only. These are not calibrated match confidence scores.
export async function assessImageQuality(body){
 try{
  assertValidImageBuffer(body);
  const input=sharp(body,{limitInputPixels:40_000_000}),meta=await input.metadata();
  if(!meta.width||!meta.height)throw Error('ไม่พบขนาดรูป');
  const {data,info}=await input.rotate().resize(256,256,{fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).greyscale().raw().toBuffer({resolveWithObject:true});
  let mean=0;for(const v of data)mean+=v;mean/=data.length;
  let sum=0,squares=0,n=0;
  for(let y=1;y<info.height-1;y++)for(let x=1;x<info.width-1;x++){const i=y*info.width+x,v=4*data[i]-data[i-1]-data[i+1]-data[i-info.width]-data[i+info.width];sum+=v;squares+=v*v;n++;}
  const detail=n?squares/n-(sum/n)**2:0,warnings=[];
  if(Math.min(meta.width,meta.height)<160)warnings.push('รูปมีความละเอียดน้อย ลองใช้ไฟล์ต้นฉบับที่เห็นตัวสัตว์ชัดขึ้น');
  if(mean<40)warnings.push('ภาพค่อนข้างมืด ลองใช้ภาพที่เห็นสีและลายขนชัดขึ้น');
  if(detail<20)warnings.push('ภาพอาจเบลอหรือมีรายละเอียดน้อย ลองถ่ายให้เห็นใบหน้าและลายขนชัดขึ้น');
  return {width:meta.width,height:meta.height,warnings,advisory:true};
 }catch(error){const e=new Error('อ่านรูปไม่ได้ หรือขนาดภาพใหญ่เกินกำหนด กรุณาเลือกไฟล์ภาพใหม่');e.statusCode=400;throw e;}
}
