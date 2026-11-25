export function queryImages(item){return [...new Set([item?.image,...(Array.isArray(item?.images)?item.images:[])].filter(x=>typeof x==='string'&&x))].slice(0,2);}
export function averageQuerySimilarity(query,candidate,similarity){
 if(Array.isArray(query))return similarity(query,candidate);
 const vectors=query?.queryVectors;if(!Array.isArray(vectors)||!vectors.length||vectors.length>2)throw Error('Invalid query images');
 return vectors.reduce((total,vector)=>total+similarity(vector,candidate),0)/vectors.length;
}
// Called only by Node HTTP handlers, never fetches URLs supplied in JSON.
export function parseSearchImages(body,contentType=''){
 if(!contentType.toLowerCase().startsWith('application/json'))return body;
 const invalid=message=>Object.assign(Error(message),{statusCode:400});let data;
 try{data=JSON.parse(body.toString('utf8'));}catch{throw invalid('ข้อมูลรูปภาพไม่ถูกต้อง');}
 if(!Array.isArray(data.images)||data.images.length<1||data.images.length>2)throw invalid('เลือกภาพสัตว์ตัวเดียวกันได้ 1–2 รูป');
 return [...new Set(data.images)].map(value=>{
  if(typeof value!=='string'||value.length>7_000_000)throw invalid('รูปภาพใหญ่เกินกำหนด');
  const match=value.match(/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw invalid('ต้องส่งไฟล์ภาพ ไม่ใช่ลิงก์เว็บไซต์');
  const bytes=Buffer.from(match[1],'base64');if(!bytes.length||bytes.length>5_000_000)throw invalid('ขนาดรูปภาพไม่ถูกต้อง');return bytes;
 });
}
