// Starts an isolated server; never modifies browser cases or stops another server.
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),port=Number(process.env.CHECK_PORT||4189),base=`http://127.0.0.1:${port}`;
const rows=[];let startupError='';
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DISABLE_BG_WORKER:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
child.on('error',e=>{startupError=e.message;});
child.stderr.on('data',b=>{startupError+=b.toString();});
try {
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Server startup timed out: '+startupError)),15000);
  child.stdout.on('data',b=>{if(b.toString().includes(base)){clearTimeout(timer);resolve();}});
  child.once('exit',code=>{clearTimeout(timer);reject(Error(`Server exited ${code}: ${startupError}`));});
 });
 async function check(name,url,options,validate){
  const start=Date.now();try{const response=await fetch(base+url,{...options,signal:AbortSignal.timeout(180000)});const data=(response.headers.get('content-type')||'').includes('json')?await response.json():await response.text();if(!response.ok||!validate(data))throw Error(data.error||`Invalid response (${response.status})`);rows.push({name,passed:true,ms:Date.now()-start});return data;}catch(e){rows.push({name,passed:false,error:e.message});return null;}
 }
 for(const page of ['/','/sources.html','/detect.html','/slides.html'])await check(page,page,{},v=>v.includes('<html'));
 await check('PWA manifest','/manifest.json',{},v=>v.short_name==='Pawtal'&&v.display==='standalone');
 await check('PWA service worker','/sw.js',{},v=>v.includes('CACHE_NAME'));
 await check('Block private DB & backend files','/data/tamnong.sqlite',{},()=>false).catch(()=>{});
 {
   const start=Date.now();
   const blocked=await Promise.all(['/data/tamnong.sqlite','/server.mjs','/.env'].map(p=>fetch(base+p,{signal:AbortSignal.timeout(10000)}).then(r=>r.status)));
   rows.pop();
   const ok=blocked.every(s=>s===404||s===403);
   rows.push({name:'Block private DB & backend files',passed:ok,ms:Date.now()-start,...(ok?{}:{error:'Unexpected status: '+blocked.join(',')})});
 }
 await check('Health check','/healthz',{},v=>v.ok===true&&typeof v.uptimeSec==='number');
 await check('API status','/api/status',{},v=>v.ok===true&&v.ocrReady===true&&v.security?.magicBytesValidation===true&&typeof v.backgroundWorker?.runsCompleted==='number');
 await check('LINE Bot webhook status','/api/line/status',{},v=>v.webhookPath==='/api/line/webhook'&&typeof v.configured==='boolean');
 {
   const start=Date.now();
   const badRes=await fetch(base+'/api/suggest-species',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:Buffer.from('<html>not-an-image</html>'),signal:AbortSignal.timeout(10000)});
   const ok=badRes.status===400;
   rows.push({name:'Magic bytes reject non-image payload',passed:ok,ms:Date.now()-start,...(ok?{}:{error:`Expected 400 got ${badRes.status}`})});
 }
 const photo=await readFile(path.join(root,'assets/lost-cat-sample.jpg'));
 const birdPhoto=await readFile(path.join(root,'assets/samples/bird.jpg'));
 const post={method:'POST',headers:{'Content-Type':'image/jpeg'},body:photo};
 const birdPost={method:'POST',headers:{'Content-Type':'image/jpeg'},body:birdPhoto};
 await check('OCR endpoint (tesseract.js)','/api/ocr?lang=eng',post,v=>v.engine==='tesseract.js'&&Array.isArray(v.phones)&&Array.isArray(v.areas));
 for(const [model,size] of [['pet-base',512],['dino-bird',384]])await check(`Real inference ${model}`,`/api/embed?model=${model}&species=cat`,post,v=>v.embedding?.length===size&&v.embedding.every(Number.isFinite));
 await check('Bird embedding inference','/api/embed?model=dino-bird&species=bird',birdPost,v=>v.embedding?.length===384&&v.embedding.every(Number.isFinite));
 await check('Species head inference','/api/suggest-species',post,v=>v.suggestions?.length>0&&v.needsConfirmation===true&&Boolean(v.coat?.primaryTag));
 await check('Breed head inference + coat tags','/api/suggest-breed?species=cat',post,v=>v.suggestions?.length>0&&v.needsConfirmation===true&&Array.isArray(v.coat?.tags)&&v.coat.tags.length>0);
 await check('Bird breed head inference','/api/suggest-breed?species=bird',birdPost,v=>v.suggestions?.length>0&&v.suggestions[0].thaiName&&v.needsConfirmation===true);
 const detection=await check('Detection status','/api/detection-status',{},v=>typeof v.ready==='boolean');
 if(detection?.ready)await check('Five-class detector inference','/api/detect-pets',post,v=>Array.isArray(v.detections)&&v.detections.length>0&&v.detections[0].label==='cat');
 let sources=null;
 if(process.argv.includes('--online'))sources=await check('Live public source discovery','/api/source-status',{},v=>Array.isArray(v.sources)&&v.sources.some(s=>s.ready));
 if(process.argv.includes('--online'))await check('Live image search and ranking','/api/search-all?species=cat',post,v=>Array.isArray(v.groups)&&v.groups.some(g=>Array.isArray(g.results)&&g.results.length>0&&g.results.every(r=>Number.isFinite(r.score)&&r.url)));
 const report={checkedAt:new Date().toISOString(),checks:rows,passed:rows.every(r=>r.passed),scope:'API smoke test with a sample image; not a browser usability or accuracy test.',customFiveClassDetectorReady:detection?.ready===true,sources:sources?.sources||null,limitations:['Identity accuracy target remains unpassed','Facebook requires authorized Meta credentials','Browser data is local; no central multi-user database']};
 await mkdir(path.join(root,'release'),{recursive:true});await writeFile(path.join(root,'release/check-results.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
} catch(e){console.error(e.message);process.exitCode=1;} finally {child.kill();}
