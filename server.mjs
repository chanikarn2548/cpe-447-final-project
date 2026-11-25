import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import ort from 'onnxruntime-node';
import sharp from 'sharp';
import {validModelSize} from './model-file.mjs';
import {detectPets,detectionStatus} from './detection.mjs';
import {collectSources,searchAllSources} from './search-sources.mjs';
import {getDiscoveredFacebookGroups} from './additional-sources.mjs';
import {suggestSpecies} from './species-classifier.mjs';
import {suggestBreed} from './breed-classifier.mjs';
import {isValidClassifierHead,scoreClassifierLogits} from './classifier-head.mjs';
import {assessImageQuality} from './image-quality.mjs';
import {cropPet} from './pet-crop.mjs';
import {averageQuerySimilarity,parseSearchImages} from './multi-query.mjs';
import {getDatabaseState,syncDatabaseState,getDatabaseStats,uploadsDir,deleteCaseRecord,updateCaseRecord,verifyCaseOwnerPin,closeDatabase,listAlerts,createAlert,deleteAlert,markAlertsRead,evaluateAlertsForCases,listFacebookGroups,createFacebookGroup,deleteFacebookGroup,syncDiscoveredFacebookGroups,getCachedEmbedding,setCachedEmbedding} from './storage.mjs';
import {assertValidImageBuffer,createRateLimiter} from './security.mjs';
import {computeHybridScore} from './hybrid-ranking.mjs';
import {analyzeCoatPattern} from './coat-tagging.mjs';
import {createBackgroundWorker} from './background-worker.mjs';
import {extractImageText,parseOcrFindings,terminateOcrWorker} from './ocr-extract.mjs';
import {verifyLineSignature,handleLineWebhookEvents} from './line-bot.mjs';
import {fetchSocialLinkPreview} from './social-links.mjs';

const root = path.resolve(import.meta.dirname);
const vendorRoot = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
const cacheRoot = path.join(os.tmpdir(), 'tamnong-model-cache');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.wasm':'application/wasm'};
const models = {
  'pet-base': {url:'https://huggingface.co/open-noodle/pet-recognition-base/resolve/main/recognition/model.onnx',file:'pet-recognition-base.onnx',size:348108213},
  'dino-bird': {url:'https://huggingface.co/onnx-community/dinov2-small/resolve/main/onnx/model_q4.onnx',file:'dinov2-small-q4.onnx',size:16900000}
};
const downloads = new Map();
const sessions = new Map();
const metaPageCache = new Map();
const metaCacheTtlMs = 5 * 60 * 1000;
const modelInfo = {petBase:{state:'not-loaded'},birdDino:{state:'not-loaded'}};

function loadLocalEnv(){
  try{for(const line of fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/)){const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');}}catch{}
}
loadLocalEnv();

async function getModel(modelKey) {
  const spec=models[modelKey];
  if(!spec) throw new Error('Unknown model');
  await fsp.mkdir(cacheRoot,{recursive:true});
  const file=path.join(cacheRoot,spec.file);
  try { const stat=await fsp.stat(file); if(validModelSize(stat.size,spec.size))return {file,size:stat.size,cached:true}; } catch {}
  if(downloads.has(modelKey))return downloads.get(modelKey);
  const task=(async()=>{
    const partial=file+'.part';
    const response=await fetch(spec.url,{redirect:'follow'});
    if(!response.ok||!response.body)throw new Error(`Model download failed (${response.status})`);
    await pipeline(response.body,fs.createWriteStream(partial));
    const stat=await fsp.stat(partial);
    if(!validModelSize(stat.size,spec.size)){await fsp.rm(partial,{force:true});throw new Error('Downloaded model looks incomplete');}
    await fsp.rename(partial,file);
    return {file,size:stat.size,cached:false};
  })().finally(()=>downloads.delete(modelKey));
  downloads.set(modelKey,task);return task;
}
async function getSession(modelKey) {
  if(sessions.has(modelKey))return sessions.get(modelKey);
  const promise=(async()=>{
    const cached=await getModel(modelKey);
    const session=await ort.InferenceSession.create(cached.file);
    modelInfo[modelKey==='pet-base'?'petBase':'birdDino']={state:'ready',cached:cached.cached,bytes:cached.size,inputs:session.inputNames,outputs:session.outputNames};
    return session;
  })();
  sessions.set(modelKey,promise);
  try{return await promise;}catch(error){sessions.delete(modelKey);modelInfo[modelKey==='pet-base'?'petBase':'birdDino']={state:'error',message:error.message};throw error;}
}
async function readBody(req,limit=2_000_000){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>limit){const error=new Error('รูปมีขนาดข้อมูลใหญ่เกินไป');error.statusCode=413;throw error;}chunks.push(chunk);}
  return Buffer.concat(chunks,size);
}
async function imageEmbeddingFromBuffer(body,modelKey,flip=false){
  let img=sharp(body).rotate();
  if(flip)img=img.flop();
  const resized=await img.resize(224,224,{fit:'fill'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const pixels=new Float32Array(3*224*224),mean=[0.485,0.456,0.406],std=[0.229,0.224,0.225],plane=224*224;
  for(let i=0;i<plane;i++){
    pixels[i]=(resized[i*3]/255-mean[0])/std[0];
    pixels[plane+i]=(resized[i*3+1]/255-mean[1])/std[1];
    pixels[plane*2+i]=(resized[i*3+2]/255-mean[2])/std[2];
  }
  const session=await getSession(modelKey),inputName=session.inputNames[0],input=new ort.Tensor('float32',pixels,[1,3,224,224]),result=await session.run({[inputName]:input}),output=result[session.outputNames[0]],dims=output.dims,raw=output.data;
  const width=dims[dims.length-1],embedding=dims.length>=3?Array.from(raw.slice(0,width)):Array.from(raw),norm=Math.sqrt(embedding.reduce((sum,value)=>sum+value*value,0));
  if(!Number.isFinite(norm)||norm===0)throw new Error('โมเดลสร้างเวกเตอร์ภาพไม่สำเร็จ');
  return embedding.map(value=>value/norm);
}
async function imageEmbeddingWithTta(body,modelKey){
  const [orig,flipped]=await Promise.all([imageEmbeddingFromBuffer(body,modelKey,false),imageEmbeddingFromBuffer(body,modelKey,true)]);
  const summed=orig.map((v,i)=>v+flipped[i]),norm=Math.hypot(...summed)||1;
  return summed.map(v=>v/norm);
}
async function coatAppearanceVector(croppedBuf){
  const meta=await sharp(croppedBuf).rotate().metadata();
  const w=meta.width||224,h=meta.height||224;
  const left=Math.round(w*0.20),top=Math.round(h*0.20);
  const cw=Math.max(1,w-2*left),ch=Math.max(1,h-2*top);
  const raw=await sharp(croppedBuf).rotate().extract({left,top,width:cw,height:ch}).resize(32,32,{fit:'fill'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const rawFeat=[],colorBins=new Float32Array(16);
  for(let gy=0;gy<4;gy++){
    for(let gx=0;gx<4;gx++){
      let lSum=0,rgSum=0,ybSum=0,satSum=0,lSq=0,wSum=0;
      for(let y=gy*8;y<(gy+1)*8;y++){
        for(let x=gx*8;x<(gx+1)*8;x++){
          const dx=(x-15.5)/15.5,dy=(y-15.5)/15.5,gw=Math.exp(-(dx*dx+dy*dy)*1.1);
          const idx=(y*32+x)*3;
          const r=raw[idx]/255,g=raw[idx+1]/255,b=raw[idx+2]/255;
          const l=0.299*r+0.587*g+0.114*b,rg=r-g,yb=0.5*(r+g)-b,sat=Math.hypot(rg,yb);
          lSum+=gw*(l-0.5);lSq+=gw*l*l;rgSum+=gw*rg*2.5;ybSum+=gw*yb*2.5;satSum+=gw*(sat-0.15);wSum+=gw;
          const vZone=gy<2?0:8;
          if(l>0.72&&sat<0.16)colorBins[vZone+0]+=gw;
          else if(l<0.25&&sat<0.18)colorBins[vZone+1]+=gw;
          else if(yb<-0.05&&sat>=0.11)colorBins[vZone+7]+=gw*1.35;
          else if(rg<-0.04&&yb>-0.06&&sat>=0.11)colorBins[vZone+6]+=gw*1.35;
          else if(rg>0.12&&yb>0.12)colorBins[vZone+2]+=gw*1.4;
          else if(rg>0.04&&yb>0.06&&l<0.55)colorBins[vZone+3]+=gw;
          else if(sat<0.11)colorBins[vZone+4]+=gw;
          else colorBins[vZone+5]+=gw;
        }
      }
      const lMean=lSum/wSum+0.5,contrast=Math.sqrt(Math.max(0,lSq/wSum-lMean*lMean))-0.12;
      rawFeat.push(lSum/wSum,rgSum/wSum,ybSum/wSum,satSum/wSum,contrast*2.0);
    }
  }
  const binMean=colorBins.reduce((a,b)=>a+b,0)/colorBins.length;
  for(const v of colorBins)rawFeat.push((v-binMean)/120);
  const norm=Math.hypot(...rawFeat)||1;
  return rawFeat.map(v=>v/norm);
}
let breedHeadCache=null,birdHeadCache=null;
function getBreedHeadSync(){
  if(!breedHeadCache){
    try{breedHeadCache=JSON.parse(fs.readFileSync(path.join(root,'models/breed-head.json'),'utf8'));}catch{}
  }
  return breedHeadCache;
}
function getBirdHeadSync(){
  if(!birdHeadCache){
    try{birdHeadCache=JSON.parse(fs.readFileSync(path.join(root,'models/bird-head.json'),'utf8'));}catch{}
  }
  return birdHeadCache;
}
function computeHeadProfile(vector,head,dimensions,classCount){
  if(!isValidClassifierHead(head,dimensions,classCount))return null;
  const logits=scoreClassifierLogits(vector,head);
  const mean=logits.reduce((a,b)=>a+b,0)/classCount;
  const centered=logits.map(v=>v-mean);
  const norm=Math.hypot(...centered)||1;
  return centered.map(v=>v/norm);
}
function computeBreedProfile(deep512){
  return computeHeadProfile(deep512,getBreedHeadSync(),512,37);
}
function computeBirdProfile(deep384){
  const head=getBirdHeadSync(),cCount=head?.labels?.length||0;
  return cCount>=2?computeHeadProfile(deep384,head,384,cCount):null;
}
async function appearanceEmbeddingFromBuffer(croppedBody,modelKey,species=''){
  const deep=await imageEmbeddingFromBuffer(croppedBody,modelKey),coat=await coatAppearanceVector(croppedBody);
  if(modelKey==='pet-base'){
    const breedVec=computeBreedProfile(deep);
    let dinoVec=null;
    try{dinoVec=await imageEmbeddingFromBuffer(croppedBody,'dino-bird');}catch{}
    if(breedVec&&dinoVec){
      // 223 dims pet-base + 37 dims breed profile + 156 dims DINOv2 + 96 dims coat = 512 dims
      const dSlice=deep.slice(0,223),dNorm=Math.hypot(...dSlice)||1;
      const dinoSlice=dinoVec.slice(0,156),diNorm=Math.hypot(...dinoSlice)||1;
      const wDeep=Math.sqrt(0.35),wBreed=Math.sqrt(0.20),wDino=Math.sqrt(0.15),wCoat=Math.sqrt(0.30);
      const fused=[
        ...dSlice.map(v=>(v/dNorm)*wDeep),
        ...breedVec.map(v=>v*wBreed),
        ...dinoSlice.map(v=>(v/diNorm)*wDino),
        ...coat.map(v=>v*wCoat)
      ];
      const fNorm=Math.hypot(...fused)||1;
      return fused.map(v=>v/fNorm);
    }
  }
  if(modelKey==='dino-bird'&&species==='bird'){
    const birdVec=computeBirdProfile(deep);
    if(birdVec&&deep.length-coat.length-birdVec.length>=64){
      const deepSlice=deep.slice(0,deep.length-coat.length-birdVec.length),dNorm=Math.hypot(...deepSlice)||1;
      const wDeep=Math.sqrt(0.45),wBird=Math.sqrt(0.25),wCoat=Math.sqrt(0.30);
      const fused=[...deepSlice.map(v=>(v/dNorm)*wDeep),...birdVec.map(v=>v*wBird),...coat.map(v=>v*wCoat)];
      const fNorm=Math.hypot(...fused)||1;
      return fused.map(v=>v/fNorm);
    }
  }
  const keep=deep.length-coat.length,deepSlice=deep.slice(0,keep),dNorm=Math.hypot(...deepSlice)||1;
  const wDeep=Math.sqrt(0.55),wCoat=Math.sqrt(0.45);
  const fused=[...deepSlice.map(v=>(v/dNorm)*wDeep),...coat.map(v=>v*wCoat)];
  const fNorm=Math.hypot(...fused)||1;
  return fused.map(v=>v/fNorm);
}
async function matchingImage(body,species){
  try{return await cropPet(body,species);}catch(error){
    console.warn('Pet crop fallback:',error.message);
    return {image:body,applied:false,reason:'detector-unavailable'};
  }
}
async function matchingEmbedding(body,model,species){
  if(Array.isArray(body)){const queryVectors=[];for(const photo of body)queryVectors.push(await matchingEmbedding(photo,model,species));return {queryVectors};}
  return appearanceEmbeddingFromBuffer((await matchingImage(body,species)).image,model,species);
}
function matchingSimilarity(query,candidate){return averageQuerySimilarity(query,candidate,cosineSimilarity);}
function cosineSimilarity(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||!a.length||a.length!==b.length)throw new Error('ข้อมูลภาพใช้โมเดลต่างกัน กรุณาประมวลผลภาพใหม่');
  let dot=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw new Error('ข้อมูลภาพไม่สมบูรณ์ กรุณาประมวลผลใหม่');dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  const norm=Math.sqrt(aa*bb);if(!Number.isFinite(norm)||norm===0)throw new Error('ข้อมูลภาพไม่สมบูรณ์ กรุณาประมวลผลใหม่');
  return Math.max(-1,Math.min(1,dot/norm));
}
function safeHttpUrl(value){try{const url=new URL(value);return url.protocol==='https:'?url.toString():'';}catch{return '';}}
async function getMetaPagePosts(pageId){
  const cached=metaPageCache.get(pageId),now=Date.now();
  if(cached&&cached.expiresAt>now)return cached.promise;
  const version=process.env.META_GRAPH_API_VERSION||'v27.0',fields='id,message,created_time,permalink_url,full_picture,attachments{media,subattachments}',params=new URLSearchParams({fields,limit:'50'});
  const promise=(async()=>{
    const response=await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/published_posts?${params}`,{headers:{Authorization:`Bearer ${process.env.META_ACCESS_TOKEN}`},signal:AbortSignal.timeout(15000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error?.message||`Meta Graph API แจ้งข้อผิดพลาด (${response.status})`);
    return Array.isArray(data.data)?data.data:[];
  })();
  if(!cached&&metaPageCache.size>=50)metaPageCache.delete(metaPageCache.keys().next().value);
  metaPageCache.set(pageId,{expiresAt:now+metaCacheTtlMs,promise});
  try{return await promise;}catch(error){if(metaPageCache.get(pageId)?.promise===promise)metaPageCache.delete(pageId);throw error;}
}
function postImageUrl(post){
  if(post.full_picture)return safeHttpUrl(post.full_picture);
  const attachments=post.attachments?.data||[];
  for(const attachment of attachments){
    const image=attachment.media?.image?.src;if(image)return safeHttpUrl(image);
    const nested=attachment.subattachments?.data||[];for(const child of nested){const childImage=child.media?.image?.src;if(childImage)return safeHttpUrl(childImage);}
  }
  return '';
}
const embeddingCacheStore={get:getCachedEmbedding,set:setCachedEmbedding};
const searchLimiter=createRateLimiter({windowMs:60_000,max:20});
const aiLimiter=createRateLimiter({windowMs:60_000,max:60});
const writeLimiter=createRateLimiter({windowMs:60_000,max:60});
const adminLimiter=createRateLimiter({windowMs:60_000,max:6});
const bgWorker=createBackgroundWorker({collectSources,syncDiscoveredFacebookGroups,getDiscoveredFacebookGroups,matchingEmbedding,cacheStore:embeddingCacheStore});
function clientIp(req){
  const fwd=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return fwd||req.socket?.remoteAddress||'local';
}
function enforceRateLimit(req,res,limiter){
  if(process.env.DISABLE_RATE_LIMIT==='1')return true;
  const check=limiter(clientIp(req));
  if(check.allowed)return true;
  res.writeHead(429,{...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':String(check.retryAfterSec)});
  res.end(JSON.stringify({error:`ส่งคำขอถี่เกินกำหนด กรุณารอ ${check.retryAfterSec} วินาทีแล้วลองใหม่`,retryAfterSec:check.retryAfterSec}));
  return false;
}
function validateQueryImages(body){
  for(const buf of (Array.isArray(body)?body:[body]))assertValidImageBuffer(buf);
}
const securityHeaders={'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer'};
const allowedStaticFiles=new Set([
  'index.html','detect.html','sources.html','slides.html','source-catalog.json','manifest.json','sw.js',
  'styles.css','pet-ui.css','readable-ui.css','detect.css','sources.css',
  'app.js','case-data.js','case-tools.js','matching.js','welcome.js','detect.js','sources.js','zone.js',
  'case-map.mjs','multi-query.mjs','fb-groups.mjs','social-links.mjs','hybrid-ranking.mjs','poster-generator.mjs',
  'training/train_pets5.ipynb','training/train_pets5_openimages.ipynb'
]);
function isAllowedStaticPath(relative){
  const norm=relative.replace(/\\/g,'/');
  if(!norm||norm.includes('..')||norm.startsWith('.'))return false;
  if(allowedStaticFiles.has(norm))return true;
  if(norm.startsWith('assets/')||norm.startsWith('data/uploads/'))return true;
  return false;
}
function sendJson(res,status,data){res.writeHead(status,{...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function sendFile(res,file,contentType){
  const stat=fs.statSync(file);res.writeHead(200,{...securityHeaders,'Content-Type':contentType||mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/suggest-species'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,aiLimiter))return;
      const body=await readBody(req,12_000_000);assertValidImageBuffer(body);
      const quality=await assessImageQuality(body),model=await getModel('dino-bird');
      let targetBuf=body;
      try{
        const det=await detectPets(body);
        if(det.detections?.length===1&&det.detections[0].confidence>=0.45){
          const d=det.detections[0],oriented=await sharp(body).rotate().toBuffer();
          const left=Math.max(0,Math.floor(d.x*det.width)),top=Math.max(0,Math.floor(d.y*det.height));
          const w=Math.min(det.width-left,Math.ceil(d.width*det.width)),h=Math.min(det.height-top,Math.ceil(d.height*det.height));
          if(w>=24&&h>=24)targetBuf=await sharp(oriented).extract({left,top,width:w,height:h}).png().toBuffer();
        }
      }catch{}
      const [spResult,coat]=await Promise.all([
        suggestSpecies(await imageEmbeddingFromBuffer(targetBuf,'dino-bird'),model.file),
        analyzeCoatPattern(targetBuf).catch(()=>null)
      ]);
      sendJson(res,200,{...spResult,coat,quality});return;
    }
    if(url.pathname==='/api/suggest-breed'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,aiLimiter))return;
      const species=url.searchParams.get('species');if(!['cat','dog','bird'].includes(species)){sendJson(res,400,{error:'เลือกชนิดสุนัข แมว หรือนก ก่อนดูสายพันธุ์'});return;}
      const modelKey=species==='bird'?'dino-bird':'pet-base';
      const body=await readBody(req,12_000_000);assertValidImageBuffer(body);
      const quality=await assessImageQuality(body),crop=await matchingImage(body,species),model=await getModel(modelKey);
      const [vec,coat]=await Promise.all([
        species==='bird'?imageEmbeddingWithTta(crop.image,modelKey):imageEmbeddingFromBuffer(crop.image,modelKey),
        analyzeCoatPattern(crop.image).catch(()=>null)
      ]);
      sendJson(res,200,{...await suggestBreed(vec,species,model.file),coat,quality,cropped:crop.applied});return;
    }
    if(url.pathname==='/api/source-status'){
      const {sources}=await collectSources();
      syncDiscoveredFacebookGroups(getDiscoveredFacebookGroups());
      const pages=(process.env.META_PUBLIC_PAGE_IDS||'').split(',').map(x=>x.trim()).filter(x=>/^\d+$/.test(x)).slice(0,8);
      const linkedGroups=listFacebookGroups();
      if(linkedGroups.count)sources.push({id:'facebook-linked-groups',name:'กลุ่ม Facebook ในระบบ',ready:true,posts:linkedGroups.count,message:`เชื่อมเข้าระบบไว้แล้ว ${linkedGroups.count} กลุ่ม (กดค้นต่อด้วยคำค้น AI และ Pawsociety ดึงโพสต์กลุ่มเข้าเทียบอัตโนมัติ)`});
      if(!process.env.META_ACCESS_TOKEN||!pages.length)sources.push({id:'facebook',name:'Facebook API (เพจสาธารณะ)',ready:false,message:'ยังไม่ได้ตั้ง Token ของ Meta (จึงใช้วิธีเชื่อมลิงก์กลุ่ม + วางรูปเทียบ AI แทน)'});
      else for(const pageId of pages){try{const posts=await getMetaPagePosts(pageId);sources.push({name:`Facebook Page ${pageId}`,ready:true,posts:posts.length,message:`อ่านโพสต์ได้ ${posts.length} รายการ`});}catch(error){sources.push({name:`Facebook Page ${pageId}`,ready:false,message:error.message});}}
      sendJson(res,200,{sources});return;
    }
    if(url.pathname==='/api/search-all'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,searchLimiter))return;
      const species=url.searchParams.get('species');
      if(!['dog','cat','bird','rabbit','hamster'].includes(species)){sendJson(res,400,{error:'เลือกชนิดสัตว์ก่อนค้นหา'});return;}
      const area=(url.searchParams.get('area')||'').trim();
      const latParam=url.searchParams.get('lat'),lonParam=url.searchParams.get('lon');
      const queryMeta={area,lat:latParam!==null&&latParam!==''?Number(latParam):null,lon:lonParam!==null&&lonParam!==''?Number(lonParam):null};
      const body=parseSearchImages(await readBody(req,12_000_000),req.headers['content-type']);
      validateQueryImages(body);
      const rawRes=await searchAllSources(body,species,matchingEmbedding,matchingSimilarity,undefined,embeddingCacheStore);
      const groups=(rawRes.groups||[]).map(group=>({
        ...group,
        results:(group.results||[]).map(row=>{
          const hyb=computeHybridScore(row.score,queryMeta,row);
          return {...row,score:hyb.score,visualScore:hyb.visualScore,distanceKm:hyb.distanceKm,ageDays:hyb.ageDays,hybridBadge:hyb.badge};
        }).sort((a,b)=>b.score-a.score)
      }));
      sendJson(res,200,{...rawRes,groups,hybridRanking:{enabled:true,queryArea:area,hasGps:Number.isFinite(queryMeta.lat)&&Number.isFinite(queryMeta.lon)}});return;
    }
    if(url.pathname==='/healthz'&&req.method==='GET'){sendJson(res,200,{ok:true,uptimeSec:Math.round(process.uptime())});return;}
    if(url.pathname==='/api/detection-status'){sendJson(res,200,detectionStatus());return;}
    if(url.pathname==='/api/database/stats'&&req.method==='GET'){sendJson(res,200,getDatabaseStats());return;}
    if(url.pathname==='/api/database'){
      if(req.method==='GET'){sendJson(res,200,getDatabaseState());return;}
      if(req.method==='POST'){
        if(!enforceRateLimit(req,res,writeLimiter))return;
        const body=JSON.parse((await readBody(req,15_000_000)).toString('utf8'));
        const synced=syncDatabaseState(body);
        const matches=evaluateAlertsForCases(body.cases||[]);
        if(matches.length)dispatchAlertWebhooks(matches).catch(()=>{});
        sendJson(res,200,{...synced,alertsTriggered:matches.length});return;
      }
    }
    if(url.pathname.startsWith('/api/cases/')&&url.pathname.endsWith('/verify-pin')&&req.method==='POST'){
      const caseId=decodeURIComponent(url.pathname.slice('/api/cases/'.length,-'/verify-pin'.length));
      const payload=JSON.parse((await readBody(req,10_000)).toString('utf8')||'{}');
      const check=verifyCaseOwnerPin(caseId,payload.pin||'');
      if(check.notFound){sendJson(res,404,{ok:false,error:'ไม่พบประกาศนี้ในระบบ'});return;}
      if(!check.ok){sendJson(res,403,{ok:false,hasOwnerPin:true,error:'รหัส PIN เจ้าของประกาศไม่ถูกต้อง'});return;}
      sendJson(res,200,{ok:true,hasOwnerPin:check.hasOwnerPin});return;
    }
    if(url.pathname.startsWith('/api/cases/')&&req.method==='PATCH'){
      if(!enforceRateLimit(req,res,writeLimiter))return;
      const caseId=decodeURIComponent(url.pathname.slice('/api/cases/'.length));
      const payload=JSON.parse((await readBody(req,100_000)).toString('utf8')||'{}');
      const pin=String(req.headers['x-owner-pin']||payload.pin||'').trim();
      const updated=updateCaseRecord(caseId,payload,pin);
      if(!updated){sendJson(res,404,{ok:false,error:'ไม่พบประกาศนี้ในระบบ'});return;}
      sendJson(res,200,{ok:true,case:updated});return;
    }
    if(url.pathname.startsWith('/api/cases/')&&req.method==='DELETE'){
      const caseId=decodeURIComponent(url.pathname.slice('/api/cases/'.length));
      let pin=String(req.headers['x-owner-pin']||'').trim();
      if(!pin&&(req.headers['content-type']||'').includes('application/json')){
        try{const payload=JSON.parse((await readBody(req,10_000)).toString('utf8')||'{}');pin=String(payload.pin||'').trim();}catch{}
      }
      sendJson(res,200,{ok:deleteCaseRecord(caseId,pin)});return;
    }
    if(url.pathname==='/api/alerts'){
      if(req.method==='GET'){sendJson(res,200,listAlerts());return;}
      if(req.method==='POST'){
        const body=JSON.parse((await readBody(req,200_000)).toString('utf8'));
        sendJson(res,200,createAlert(body));return;
      }
    }
    if(url.pathname==='/api/alerts/read'&&req.method==='POST'){sendJson(res,200,markAlertsRead());return;}
    if(url.pathname.startsWith('/api/alerts/')&&req.method==='DELETE'){
      const alertId=decodeURIComponent(url.pathname.slice('/api/alerts/'.length));
      sendJson(res,200,{ok:deleteAlert(alertId)});return;
    }
    if(url.pathname==='/api/facebook-groups'){
      if(req.method==='GET'){syncDiscoveredFacebookGroups(getDiscoveredFacebookGroups());sendJson(res,200,listFacebookGroups());return;}
      if(req.method==='POST'){
        try{
          const body=JSON.parse((await readBody(req,200_000)).toString('utf8'));
          sendJson(res,200,createFacebookGroup(body));
        }catch(error){sendJson(res,400,{error:error.message||'ลิงก์กลุ่ม Facebook ไม่ถูกต้อง'});}
        return;
      }
    }
    if(url.pathname.startsWith('/api/facebook-groups/')&&req.method==='DELETE'){
      const groupId=decodeURIComponent(url.pathname.slice('/api/facebook-groups/'.length));
      sendJson(res,200,deleteFacebookGroup(groupId));return;
    }
    if(url.pathname==='/api/detect-pets'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,aiLimiter))return;
      const body=await readBody(req,12_000_000);assertValidImageBuffer(body);
      const resData=await detectPets(body);
      try{
        const model=await getModel('dino-bird'),oriented=await sharp(body).rotate().toBuffer();
        const classList=['cat','dog','bird','rabbit','hamster'];
        for(const d of resData.detections){
          if(d.confidence<0.78){
            const left=Math.max(0,Math.floor(d.x*resData.width)),top=Math.max(0,Math.floor(d.y*resData.height));
            const w=Math.min(resData.width-left,Math.ceil(d.width*resData.width)),h=Math.min(resData.height-top,Math.ceil(d.height*resData.height));
            if(w>=24&&h>=24){
              const cropBuf=await sharp(oriented).extract({left,top,width:w,height:h}).png().toBuffer();
              const spRes=await suggestSpecies(await imageEmbeddingFromBuffer(cropBuf,'dino-bird'),model.file);
              const topSp=spRes.suggestions?.[0]?.species;
              if(topSp&&classList.includes(topSp)){
                d.label=topSp;d.classId=classList.indexOf(topSp);
              }
            }
          }
        }
      }catch{}
      sendJson(res,200,resData);return;
    }
    if(url.pathname==='/api/status'){const pages=(process.env.META_PUBLIC_PAGE_IDS||'').split(',').map(x=>x.trim()).filter(x=>/^\d+$/.test(x));const publicBaseUrl=(process.env.PUBLIC_BASE_URL||(process.env.RAILWAY_PUBLIC_DOMAIN?`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`:'')).replace(/\/+$/,'');sendJson(res,200,{ok:true,models:modelInfo,modelCache:cacheRoot,publicBaseUrl,metaPublicSearchReady:Boolean(process.env.META_ACCESS_TOKEN&&pages.length),metaPublicPageCount:pages.length,linkedFacebookGroupCount:listFacebookGroups().count,backgroundWorker:bgWorker.getStatus(),ocrReady:true,lineBotConfigured:Boolean(process.env.LINE_CHANNEL_SECRET&&process.env.LINE_CHANNEL_ACCESS_TOKEN),security:{rateLimit:process.env.DISABLE_RATE_LIMIT!=='1',magicBytesValidation:true,ownerPinProtection:true}});return;}
    if(url.pathname==='/api/ocr'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,aiLimiter))return;
      const body=await readBody(req,12_000_000);assertValidImageBuffer(body);
      const lang=url.searchParams.get('lang')==='eng'?'eng':'tha+eng';
      const ocr=await extractImageText(body,{lang});
      sendJson(res,200,ocr);return;
    }
    if(url.pathname==='/api/social-preview'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,writeLimiter))return;
      const body=JSON.parse((await readBody(req,16_000)).toString('utf8')||'{}');
      const preview=await fetchSocialLinkPreview(body.url);
      const parsed=parseOcrFindings(`${preview.title||''} ${preview.description||''}`);
      sendJson(res,200,{...preview,areaHint:parsed.areas?.[0]||'',phones:parsed.phones||[],lineIds:parsed.lineIds||[]});return;
    }
    if(url.pathname==='/api/line/status'&&req.method==='GET'){
      sendJson(res,200,{configured:Boolean(process.env.LINE_CHANNEL_SECRET&&process.env.LINE_CHANNEL_ACCESS_TOKEN),webhookPath:'/api/line/webhook',hasChannelSecret:Boolean(process.env.LINE_CHANNEL_SECRET),hasAccessToken:Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN)});return;
    }
    if(url.pathname==='/api/line/webhook'&&req.method==='POST'){
      const secret=process.env.LINE_CHANNEL_SECRET||'',token=process.env.LINE_CHANNEL_ACCESS_TOKEN||'';
      if(!secret||!token){sendJson(res,503,{error:'ยังไม่ได้ตั้งค่า LINE_CHANNEL_SECRET และ LINE_CHANNEL_ACCESS_TOKEN ใน .env หรือตัวแปรสภาพแวดล้อม',setupRequired:true});return;}
      const rawBody=await readBody(req,1_000_000);
      const sig=String(req.headers['x-line-signature']||'');
      if(!verifyLineSignature(rawBody,sig,secret)){sendJson(res,401,{error:'Invalid LINE signature'});return;}
      const payload=JSON.parse(rawBody.toString('utf8')||'{}');
      const events=Array.isArray(payload.events)?payload.events:[];
      if(!events.length){sendJson(res,200,{ok:true,verified:true,processed:0});return;}
      const baseUrl=process.env.PUBLIC_BASE_URL||(process.env.RAILWAY_PUBLIC_DOMAIN?`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`:`http://${req.headers.host||`127.0.0.1:${port}`}`);
      const analyzeImage=async(imgBuf)=>{
        assertValidImageBuffer(imgBuf);
        const dinoModel=await getModel('dino-bird');
        const [spRes,coat,ocr]=await Promise.all([
          suggestSpecies(await imageEmbeddingFromBuffer(imgBuf,'dino-bird'),dinoModel.file).catch(()=>({suggestions:[]})),
          analyzeCoatPattern(imgBuf).catch(()=>null),
          extractImageText(imgBuf).catch(()=>null)
        ]);
        const species=spRes.suggestions?.[0]?.species||'dog';
        let breed='';
        if(['cat','dog','bird'].includes(species)){
          try{
            const mk=species==='bird'?'dino-bird':'pet-base',m=await getModel(mk),cr=await matchingImage(imgBuf,species);
            const bv=species==='bird'?await imageEmbeddingWithTta(cr.image,mk):await imageEmbeddingFromBuffer(cr.image,mk);
            const br=await suggestBreed(bv,species,m.file),top=br.suggestions?.[0];
            if(top)breed=top.thaiName||top.name||'';
          }catch{}
        }
        const queryArea=ocr?.areas?.[0]||'';
        const searchRes=await searchAllSources(imgBuf,species,matchingEmbedding,matchingSimilarity,undefined,embeddingCacheStore).catch(()=>({groups:[]}));
        const matches=(searchRes.groups||[]).flatMap(g=>g.results||[]).map(row=>{
          const hyb=computeHybridScore(row.score,{area:queryArea},row);
          return {...row,score:hyb.score,hybridBadge:hyb.badge};
        }).sort((a,b)=>b.score-a.score).slice(0,5);
        return {species,breed,coat,ocr,matches};
      };
      const outcome=await handleLineWebhookEvents({events,channelAccessToken:token,baseUrl,analyzeImage});
      sendJson(res,200,{ok:true,...outcome});return;
    }
    if(url.pathname==='/api/admin/warm-cache'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,adminLimiter))return;
      const reqKey=String(req.headers['x-admin-key']||'').trim();
      if(process.env.ADMIN_API_KEY&&reqKey!==process.env.ADMIN_API_KEY){sendJson(res,403,{error:'ต้องระบุ X-Admin-Key ที่ถูกต้อง'});return;}
      if(url.searchParams.get('wait')==='1'){sendJson(res,200,{ok:true,status:await bgWorker.runOnce()});return;}
      bgWorker.runOnce().catch(()=>{});
      sendJson(res,202,{ok:true,started:true,status:bgWorker.getStatus()});return;
    }
    if(url.pathname==='/api/embed'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,aiLimiter))return;
      const key=url.searchParams.get('model');
      if(!['pet-base','dino-bird'].includes(key)){sendJson(res,400,{error:'ชนิดโมเดลไม่ถูกต้อง'});return;}
      const body=await readBody(req,12_000_000);assertValidImageBuffer(body);
      const species=url.searchParams.get('species');
      if(species&&!['cat','dog','bird','rabbit','hamster'].includes(species)){sendJson(res,400,{error:'ชนิดสัตว์ไม่ถูกต้อง'});return;}
      const crop=await matchingImage(body,species);
      const embedding=await appearanceEmbeddingFromBuffer(crop.image,key,species||'');
      sendJson(res,200,{embedding,model:key,dimensions:embedding.length,preprocessing:{version:'pet-crop-v4',applied:crop.applied,reason:crop.reason,box:crop.box}});return;
    }
    if(url.pathname==='/api/facebook-public-search'&&req.method==='POST'){
      if(!enforceRateLimit(req,res,searchLimiter))return;
      const pageIds=(process.env.META_PUBLIC_PAGE_IDS||'').split(',').map(x=>x.trim()).filter(x=>/^\d+$/.test(x)).slice(0,8);
      if(!process.env.META_ACCESS_TOKEN||!pageIds.length){sendJson(res,503,{error:'ยังไม่ได้ตั้งค่า Meta access token และ Facebook Page IDs',setupRequired:true});return;}
      const requestedSpecies=url.searchParams.get('species'),speciesList=requestedSpecies==='unknown'?['dog','cat','bird','rabbit','hamster']:[requestedSpecies];
      if(!speciesList.every(species=>['dog','cat','bird','rabbit','hamster'].includes(species))){sendJson(res,400,{error:'ชนิดสัตว์ไม่ถูกต้อง'});return;}
      const body=parseSearchImages(await readBody(req,12_000_000),req.headers['content-type']);
      validateQueryImages(body);
      const warnings=[],pages=await Promise.all(pageIds.map(async pageId=>{try{return {pageId,posts:await getMetaPagePosts(pageId)};}catch(error){warnings.push(`เพจ ${pageId}: ${error.message}`);return {pageId,posts:[]};}}));
      const candidates=[...new Map(pages.flatMap(({pageId,posts})=>posts.map(post=>({post,pageId,image:safeHttpUrl(postImageUrl(post)),url:safeHttpUrl(post.permalink_url)})).filter(item=>item.image&&item.url).map(item=>[item.url,{kind:'facebook',species:'',title:(item.post.message||'โพสต์ Facebook สาธารณะ').slice(0,180),url:item.url,image:item.image,source:`Facebook Page ${item.pageId}`,date:item.post.created_time||''}]))).values()].slice(0,24);
      const groups=await Promise.all(speciesList.map(async species=>{
        const modelKey=['dog','cat'].includes(species)?'pet-base':'dino-bird',queryVector=await matchingEmbedding(body,modelKey,species),scored=new Array(candidates.length);let cursor=0;
        await Promise.all(Array.from({length:Math.min(3,candidates.length)},async()=>{while(cursor<candidates.length){const index=cursor++,candidate=candidates[index];try{const response=await fetch(candidate.image,{redirect:'follow',signal:AbortSignal.timeout(10000)});if(!response.ok)continue;const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>5_000_000)continue;const embedding=await matchingEmbedding(bytes,modelKey,species);scored[index]={...candidate,species,score:matchingSimilarity(queryVector,embedding)};}catch{}}}));
        return {species,model:modelKey,results:scored.filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12)};
      }));
      if(warnings.length===pageIds.length){sendJson(res,502,{error:warnings.join(' · ')});return;}
      sendJson(res,200,{groups,sourcePages:pageIds.length-warnings.length,postsChecked:candidates.length,warnings});return;
    }
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).replace(/^[/\\]+/,'');
    if(!isAllowedStaticPath(relative)){res.writeHead(404,securityHeaders);res.end('Not found');return;}
    let file;
    if(relative.startsWith('data/uploads/')){
      const name=relative.slice('data/uploads/'.length);
      file=path.resolve(uploadsDir,name);
      if(!file.startsWith(uploadsDir+path.sep)){res.writeHead(403,securityHeaders);res.end('Forbidden');return;}
    }else{
      file=path.resolve(root,relative);
      if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403,securityHeaders);res.end('Forbidden');return;}
    }
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,securityHeaders);res.end('Not found');return;}
    sendFile(res,file);
  }catch(error){res.writeHead(error.statusCode||502,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:error.message||'Request failed'}));}
});
async function dispatchAlertWebhooks(matches){
  for(const m of matches){
    if(!m.webhookUrl)continue;
    try{
      const payload=JSON.stringify({event:'pawtal.match_alert',text:`🐾 [Pawtal] ${m.title}: ${m.message}`,content:`🐾 [Pawtal] ${m.title}\n${m.message}`,alert:m});
      await fetch(m.webhookUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,signal:AbortSignal.timeout(8000)});
    }catch{}
  }
}
const host = process.env.HOST || (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN ? '0.0.0.0' : '127.0.0.1');
server.listen(port,host,()=>{console.log(`ตามน้อง MVP เปิดที่ http://${host}:${port}`);bgWorker.start();});
let shuttingDown=false;
async function gracefulShutdown(signal){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(`Received ${signal}, shutting down Pawtal cleanly...`);
  bgWorker.stop();
  await terminateOcrWorker().catch(()=>{});
  server.close(()=>{closeDatabase();process.exit(0);});
  setTimeout(()=>{closeDatabase();process.exit(0);},5000).unref?.();
}
process.on('SIGTERM',()=>gracefulShutdown('SIGTERM'));
process.on('SIGINT',()=>gracefulShutdown('SIGINT'));
