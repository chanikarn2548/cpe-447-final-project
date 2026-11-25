import {insidePolygon,isSimplePolygon,nearestVertexIndex} from './zone.js';

const $=id=>document.getElementById(id),
  names=['แมว','สุนัข','นก','กระต่าย','แฮมสเตอร์'],
  classes=['cat','dog','bird','rabbit','hamster'];
const canvas=$('canvas'),ctx=canvas.getContext('2d'),records=[];
let current=-1,image=null,mode='inspect',zone=[],drag=null,dragVertex=null,detections=[];
let streamActive=false,streamScanning=true,streamRaf=0,camStream=null,lastDetectAt=0,detectBusy=false,lastZoneState='';
let demoAnimRaf=0,demoStream=null,demoObjectUrl=null,lastBreedAt=0,lastBreedText='',audioCtx=null,lastAudioAt=0;
const liveVideo=$('liveVideo');

function message(text){if($('message'))$('message').textContent=text;}
function titleCase(text=''){return text.replace(/\b\w/g,c=>c.toUpperCase());}
function playOutChime(){
  if(!$('soundAlertToggle')?.checked)return;
  const now=Date.now();
  if(now-lastAudioAt<2200)return;
  lastAudioAt=now;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    audioCtx=audioCtx||new Ctx();
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    const t=audioCtx.currentTime;
    [660,880].forEach((freq,i)=>{
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,t+i*0.11);
      gain.gain.setValueAtTime(0.001,t+i*0.11);
      gain.gain.exponentialRampToValueAtTime(0.06,t+i*0.11+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001,t+i*0.11+0.18);
      osc.connect(gain);gain.connect(audioCtx.destination);
      osc.start(t+i*0.11);osc.stop(t+i*0.11+0.2);
    });
  }catch{}
}
function logZoneEvent(text,isOut=false){
  const box=$('zoneAlertLog');if(!box)return;
  const row=document.createElement('div');
  row.className='zone-alert-item'+(isOut?' out':'');
  row.textContent=`[${new Date().toLocaleTimeString('th-TH',{hour12:false})}] ${text}`;
  box.prepend(row);
  while(box.children.length>15)box.lastChild.remove();
}
function stopStream({keepFrame=true}={}){
  streamActive=false;cancelAnimationFrame(streamRaf);cancelAnimationFrame(demoAnimRaf);demoAnimRaf=0;
  if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}
  if(demoStream){demoStream.getTracks().forEach(t=>t.stop());demoStream=null;}
  if(demoObjectUrl){URL.revokeObjectURL(demoObjectUrl);demoObjectUrl=null;}
  if(liveVideo){liveVideo.pause();liveVideo.loop=false;liveVideo.removeAttribute('src');liveVideo.srcObject=null;}
  $('streamControls')?.setAttribute('hidden','');
  if($('toggleCam'))$('toggleCam').textContent='📷 กล้องสด / CCTV';
  if(!keepFrame)draw();
}
function updateZoneBadge(){
  const zp=$('zoneProgress');if(!zp)return;
  zp.textContent=zone.length===5?'✓ ครบ 5 มุมแล้ว':`วางแล้ว ${zone.length} / 5 มุม`;
  zp.classList.toggle('ready',zone.length===5);
}
function drawOverlay(){
  updateZoneBadge();
  if(zone.length){
    ctx.beginPath();
    zone.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0]*canvas.width,p[1]*canvas.height));
    if(zone.length===5)ctx.closePath();
    if(zone.length===5){ctx.fillStyle='#ffc3002e';ctx.fill();}
    ctx.strokeStyle='#e79a00';ctx.lineWidth=4;
    ctx.setLineDash(zone.length===5?[]:[10,6]);ctx.stroke();ctx.setLineDash([]);
    zone.forEach((p,i)=>{
      const x=p[0]*canvas.width,y=p[1]*canvas.height,active=dragVertex?.idx===i;
      ctx.beginPath();ctx.arc(x,y,active?14:11,0,Math.PI*2);ctx.fillStyle=active?'#2058d4':'#e79a00';ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(String(i+1),x,y+0.5);
    });
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
  }
  function box(b,color,title){
    ctx.strokeStyle=color;ctx.lineWidth=3.5;
    ctx.strokeRect(b.x*canvas.width,b.y*canvas.height,b.width*canvas.width,b.height*canvas.height);
    if(title){
      ctx.font='bold 17px sans-serif';
      const tw=ctx.measureText(title).width+14;
      ctx.fillStyle=color;
      ctx.fillRect(b.x*canvas.width,Math.max(0,b.y*canvas.height-28),tw,28);
      ctx.fillStyle='#ffffff';
      ctx.fillText(title,b.x*canvas.width+7,Math.max(20,b.y*canvas.height-7));
    }
  }
  if(!streamActive&&current>=0&&records[current]){
    for(const b of records[current].boxes)box(b,'#2058d4',`Label: ${names[b.classId]}`);
  }
  let anyOut=false;
  for(const b of detections){
    const within=zone.length===5?insidePolygon([b.x+b.width/2,b.y+b.height/2],zone):null;
    if(within===false)anyOut=true;
    const thName=names[b.classId]||b.label;
    box(b,within===false?'#cd3434':'#088247',`${thName} ${(b.confidence*100).toFixed(0)}%${within===null?'':within?' · ในเขต IN':' · นอกเขต OUT'}`);
  }
  if(drag)box({x:Math.min(drag.a[0],drag.b[0]),y:Math.min(drag.a[1],drag.b[1]),width:Math.abs(drag.a[0]-drag.b[0]),height:Math.abs(drag.a[1]-drag.b[1])},'#2058d4','');
  $('labels').textContent=(!streamActive&&current>=0&&records[current]?.boxes.map(b=>names[b.classId]).join(' · '))||'ยังไม่มีกรอบ Label (ลากกรอบบนภาพทางซ้าย)';
  const resEl=$('results');
  resEl.classList.toggle('out-state',anyOut);
  if(!detections.length){
    resEl.textContent='ยังไม่พบสัตว์ในภาพนี้ (ลองเปลี่ยนมุมหรือภาพที่เห็นตัวสัตว์ชัดขึ้น)';
  }else{
    resEl.textContent=detections.map(b=>{
      const status=zone.length!==5?'ยังไม่ได้วางเขต 5 มุม (ลองกดปุ่มขั้นที่ 2)':insidePolygon([b.x+b.width/2,b.y+b.height/2],zone)?'อยู่ในเขตพื้นที่ (IN) ✓':'หลุดออกนอกเขต (OUT) ⚠️';
      return `พบ ${names[b.classId]||b.label} (มั่นใจ ${(b.confidence*100).toFixed(1)}%) — ${status}`;
    }).join('  |  ');
  }
  if(detections.length&&zone.length===5){
    const key=(anyOut?'OUT:':'IN:')+detections.map(d=>d.label).join(',');
    if(key!==lastZoneState){
      lastZoneState=key;
      if(anyOut)playOutChime();
      logZoneEvent(anyOut?`⚠️ ออกนอกพื้นที่ 5 มุม (OUT): ${detections.map(d=>names[d.classId]||d.label).join(', ')}`:`✓ อยู่ในพื้นที่ (IN): ${detections.map(d=>names[d.classId]||d.label).join(', ')}`,anyOut);
    }
  }
}
function point(event){
  const r=canvas.getBoundingClientRect();
  return [Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))];
}
function draw(){
  if(streamActive&&liveVideo?.readyState>=2){ctx.drawImage(liveVideo,0,0,canvas.width,canvas.height);drawOverlay();return;}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!image)return;
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  drawOverlay();
}

const formatBreedPick=s=>s.thaiName?`${s.thaiName} (${titleCase(s.name)})`:titleCase(s.name);
async function updateBreedSuggestion(blob,list){
  const box=$('breedResult');
  const top=list?.find(d=>d.label==='cat'||d.label==='dog'||d.label==='bird');
  if(!box||!top||!blob){
    lastBreedText='';
    if(box){box.hidden=true;box.textContent='';}
    return;
  }
  try{
    const res=await fetch(`/api/suggest-breed?species=${encodeURIComponent(top.label)}`,{method:'POST',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob});
    if(!res.ok)return;
    const data=await res.json();
    const picks=(data.suggestions||[]).slice(0,3);
    if(!picks.length){lastBreedText='';box.hidden=true;return;}
    lastBreedText=formatBreedPick(picks[0]);
    box.replaceChildren();
    const spTh=names[classes.indexOf(top.label)]||top.label;
    const lead=document.createElement('span');
    lead.textContent=top.label==='bird'?'🦜 คาดว่าเป็นพันธุ์นก: ':`🧬 คาดว่าเป็นสายพันธุ์ (${spTh}): `;
    const primary=document.createElement('strong');
    primary.textContent=lastBreedText;
    lead.append(primary);
    if(picks.length>1){
      const rest=document.createElement('span');
      rest.textContent=` · ใกล้เคียง: ${picks.slice(1).map(formatBreedPick).join(', ')}`;
      lead.append(rest);
    }
    if(data.coat?.tags?.length){
      const coatEl=document.createElement('span');
      coatEl.textContent=` · 🎨 สี/ลายขน: ${data.coat.tags.join(' · ')}`;
      lead.append(coatEl);
    }
    box.append(lead);
    box.hidden=false;
  }catch{}
}
async function select(index){
  stopStream();
  current=index;detections=[];drag=null;dragVertex=null;lastZoneState='';lastBreedText='';
  if($('breedResult')){$('breedResult').hidden=true;$('breedResult').textContent='';}
  image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=records[index].image;});
  canvas.width=image.width;canvas.height=image.height;draw();
}
async function addImageFromDataUrl(name,data){
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data;});
  const c=document.createElement('canvas'),ratio=Math.min(1,1600/Math.max(img.width,img.height));
  c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  records.push({name,image:c.toDataURL('image/jpeg',.9),boxes:[]});
  const option=document.createElement('option');option.value=records.length-1;option.textContent=name;
  $('imageList').append(option);
  $('imageList').value=records.length-1;
  if($('imagePickerRow'))$('imagePickerRow').hidden=records.length<=1;
  await select(records.length-1);
}

async function runDetection(){
  if(streamActive){await scanStreamFrame();draw();return;}
  if(current<0)return message('เลือกรูปก่อน');
  $('detect').disabled=true;message('กำลังสแกนหาตัวสัตว์…');
  try{
    const requestIndex=current,blob=await fetch(records[current].image).then(r=>r.blob()),response=await fetch('/api/detect-pets',{method:'POST',body:blob}),data=await response.json();
    if(!response.ok)throw new Error(data.error);
    if(current!==requestIndex)return;
    detections=data.detections||[];draw();
    await updateBreedSuggestion(blob,detections);
    message(detections.length?`สแกนเสร็จ: พบ ${detections.length} ตัว`:'สแกนเสร็จ (ไม่พบตัวสัตว์ในภาพ)');
  }catch(error){message(error.message);}finally{$('detect').disabled=false;}
}

function setMode(value){
  mode=value;
  $('labelMode')?.classList.toggle('active',value==='label');
  $('zoneMode')?.classList.toggle('active',value==='zone');
  canvas.style.cursor=value==='inspect'?'default':'crosshair';
  $('hint').textContent=value==='zone'
    ?`โหมดวางเขตพื้นที่: คลิกจุดที่ ${Math.min(5,zone.length+1)} จาก 5 มุมบนภาพ (ครบแล้วจะปิดเส้นอัตโนมัติ)`
    :value==='label'
      ?'โหมดสอน AI: เลือกชนิดสัตว์ด้านขวา แล้วลากกรอบสี่เหลี่ยมครอบตัวสัตว์บนภาพ'
      :'เลือกรูปตัวอย่างด้านบน อัปโหลดรูปใหม่ หรือกดลองปุ่ม “อยู่ในเขต / ออกนอกเขต” ทางขวาได้เลย';
}

function switchTab(tab){
  const isTrain=tab==='train';
  document.querySelectorAll('[data-studio-tab]').forEach(b=>{
    const active=b.dataset.studioTab===tab;
    b.classList.toggle('active',active);
    b.setAttribute('aria-selected',String(active));
  });
  $('tabUse').hidden=isTrain;
  $('tabTrain').hidden=!isTrain;
  setMode(isTrain?'label':'inspect');
}
document.querySelectorAll('[data-studio-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.studioTab)));

$('photos').addEventListener('change',async e=>{
  try{
    let added=0;
    for(const file of e.target.files){
      const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
      await addImageFromDataUrl(file.name,data);added++;
    }
    if(added)await runDetection();
  }catch{message('มีไฟล์ที่เปิดเป็นรูปไม่ได้');}finally{e.target.value='';}
});
$('imageList').onchange=async e=>{await select(Number(e.target.value));await runDetection();};
$('labelMode')?.addEventListener('click',()=>setMode(mode==='label'?'inspect':'label'));
$('zoneMode')?.addEventListener('click',()=>{if(zone.length===5)zone=[];setMode('zone');draw();});

canvas.onpointerdown=e=>{
  if(current<0&&!streamActive)return;
  const p=point(e);
  if(zone.length&&(mode==='inspect'||zone.length===5)&&mode!=='label'){
    const hit=nearestVertexIndex(p,zone,0.045);
    if(hit>=0){
      canvas.setPointerCapture(e.pointerId);
      dragVertex={idx:hit,prev:[...zone[hit]]};
      canvas.style.cursor='grabbing';
      message(`กำลังเลื่อนมุมที่ ${hit+1} (ปล่อยเมาส์เพื่อบันทึกตำแหน่ง)`);
      draw();return;
    }
  }
  if(mode==='zone'){
    if(zone.length>=5){zone=[p];lastZoneState='';}
    else zone.push(p);
    if(zone.length===5&&!isSimplePolygon(zone)){zone.pop();message('เส้นพื้นที่ตัดกันเอง กรุณาวางจุดเรียงวนรอบแทน');}
    if(zone.length===5){setMode('inspect');message('วางครบ 5 มุมแล้ว! ลากมุม 1–5 เพื่อปรับได้');}
    else setMode('zone');
    draw();return;
  }
  if(mode==='label'&&!streamActive){canvas.setPointerCapture(e.pointerId);drag={a:p,b:p};}
};
canvas.onpointermove=e=>{
  const p=point(e);
  if(dragVertex){zone[dragVertex.idx]=p;draw();return;}
  if(drag){drag.b=p;draw();return;}
  if(zone.length&&(mode==='inspect'||zone.length===5)&&mode!=='label'){
    const hit=nearestVertexIndex(p,zone,0.045);
    canvas.style.cursor=hit>=0?'grab':(mode==='inspect'?'default':'crosshair');
  }
};
canvas.onpointerup=e=>{
  if(dragVertex){
    const idx=dragVertex.idx,prev=dragVertex.prev;
    zone[idx]=point(e);
    if(zone.length===5&&!isSimplePolygon(zone)){
      zone[idx]=prev;
      message(`มุมที่ ${idx+1} ทำให้เส้นพื้นที่ตัดกัน จึงคืนตำแหน่งเดิม`);
    }else{
      lastZoneState='';
      message(`ปรับตำแหน่งมุมที่ ${idx+1} แล้ว`);
    }
    dragVertex=null;canvas.style.cursor='default';draw();return;
  }
  if(!drag)return;
  drag.b=point(e);
  const b={classId:Number($('animal').value),x:Math.min(drag.a[0],drag.b[0]),y:Math.min(drag.a[1],drag.b[1]),width:Math.abs(drag.a[0]-drag.b[0]),height:Math.abs(drag.a[1]-drag.b[1])};
  if(b.width>.005&&b.height>.005&&current>=0&&records[current])records[current].boxes.push(b);
  drag=null;draw();
};
canvas.onpointercancel=()=>{
  if(dragVertex){zone[dragVertex.idx]=dragVertex.prev;dragVertex=null;}
  drag=null;canvas.style.cursor=mode==='inspect'?'default':'crosshair';draw();
};
$('undo').onclick=()=>{zone.pop();lastZoneState='';if(mode==='zone')setMode('zone');draw();};
$('undoLabelBtn')?.addEventListener('click',()=>{if(current>=0&&records[current])records[current].boxes.pop();draw();});
$('clearZone').onclick=()=>{zone=[];lastZoneState='';draw();message('ล้างเส้นพื้นที่ 5 มุมแล้ว');};
$('detect').onclick=runDetection;

async function scanStreamFrame(){
  if(!streamActive||!streamScanning||detectBusy||liveVideo.readyState<2)return;
  detectBusy=true;
  try{
    const off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;
    off.getContext('2d').drawImage(liveVideo,0,0,off.width,off.height);
    const blob=await new Promise(res=>off.toBlob(res,'image/jpeg',.85));
    const response=await fetch('/api/detect-pets',{method:'POST',body:blob});
    if(response.ok&&streamActive){
      const data=await response.json();detections=data.detections||[];
      message(`สแกนสด: พบ ${detections.length} ตัว`);
      if(detections.some(d=>d.label==='cat'||d.label==='dog'||d.label==='bird')&&Date.now()-lastBreedAt>3500){
        lastBreedAt=Date.now();
        updateBreedSuggestion(blob,detections);
      }
    }
  }catch{}finally{detectBusy=false;}
}
function streamLoop(ts){
  if(!streamActive)return;
  draw();
  if(streamScanning&&ts-lastDetectAt>850){lastDetectAt=ts;scanStreamFrame();}
  streamRaf=requestAnimationFrame(streamLoop);
}
function startVideoStreamLoop(statusText){
  streamActive=true;streamScanning=true;detections=[];lastZoneState='';lastDetectAt=0;lastBreedAt=0;
  canvas.width=Math.min(1280,liveVideo.videoWidth||960);canvas.height=Math.min(720,liveVideo.videoHeight||560);
  $('streamControls')?.removeAttribute('hidden');
  if($('toggleScanLoop'))$('toggleScanLoop').textContent='⏸️ หยุดสแกนอัตโนมัติ';
  message(statusText);streamRaf=requestAnimationFrame(streamLoop);
}
$('videoFile')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  stopStream();
  try{
    demoObjectUrl=URL.createObjectURL(file);liveVideo.muted=true;liveVideo.playsInline=true;liveVideo.src=demoObjectUrl;liveVideo.loop=true;
    await new Promise((res,rej)=>{liveVideo.onloadedmetadata=res;liveVideo.onerror=rej;});
    await liveVideo.play();
    startVideoStreamLoop(`สแกนวิดีโอ: ${file.name}`);
  }catch{stopStream();message('เปิดไฟล์วิดีโอนี้ไม่ได้ รองรับ .mp4 / .webm');}
});
$('demoWalkVideo')?.addEventListener('click',async()=>{
  stopStream();
  try{
    message('กำลังสร้างวิดีโอสาธิตสัตว์เดินข้ามเขต…');
    const petImg=new Image();
    await new Promise((res,rej)=>{petImg.onload=res;petImg.onerror=rej;petImg.src='/assets/samples/dog.jpg';});
    const off=document.createElement('canvas');off.width=960;off.height=560;
    const octx=off.getContext('2d');
    if(!off.captureStream)throw Error('เบราว์เซอร์ไม่รองรับวิดีโอสาธิต');
    zone=[[0.04,0.14],[0.50,0.14],[0.54,0.56],[0.28,0.90],[0.04,0.65]];
    lastZoneState='';setMode('inspect');
    const petW=300,petH=Math.round(300*(petImg.height/petImg.width)),startTs=performance.now();
    const paintDemoFrame=now=>{
      const t=((now-startTs)%8000)/8000,phase=0.5-0.5*Math.cos(t*Math.PI*2);
      octx.fillStyle='#dff0d4';octx.fillRect(0,0,500,560);
      octx.fillStyle='#f3ebdf';octx.fillRect(500,0,460,560);
      octx.strokeStyle='#b6c7aa';octx.lineWidth=3;octx.setLineDash([12,10]);
      octx.beginPath();octx.moveTo(500,0);octx.lineTo(500,560);octx.stroke();octx.setLineDash([]);
      octx.font='bold 18px sans-serif';
      octx.fillStyle='#2a6a3f';octx.fillText('เขตบ้าน (IN)',24,42);
      octx.fillStyle='#a84434';octx.fillText('ถนนหน้าบ้าน (OUT)',524,42);
      const x=70+phase*510,y=Math.round((560-petH)/2+Math.sin(t*Math.PI*8)*8);
      octx.save();
      octx.shadowColor='rgba(30,24,18,0.28)';octx.shadowBlur=18;octx.shadowOffsetY=8;
      octx.drawImage(petImg,x,y,petW,petH);
      octx.restore();
    };
    paintDemoFrame(startTs);
    demoStream=off.captureStream(20);
    liveVideo.muted=true;liveVideo.playsInline=true;liveVideo.srcObject=demoStream;
    const tick=now=>{paintDemoFrame(now);demoAnimRaf=requestAnimationFrame(tick);};
    demoAnimRaf=requestAnimationFrame(tick);
    await liveVideo.play();
    startVideoStreamLoop('🎬 วิดีโอสาธิต: ดูสุนัขเดินข้ามเส้นส้มจาก IN → OUT');
    setTimeout(()=>{if(streamActive)scanStreamFrame();},180);
  }catch(err){stopStream();message('เปิดวิดีโอสาธิตไม่สำเร็จ: '+(err.message||''));}
});
$('searchFromDetect')?.addEventListener('click',()=>{
  let dataUrl='';
  if(streamActive&&liveVideo.readyState>=2){
    const off=document.createElement('canvas'),scale=Math.min(1,900/Math.max(canvas.width,canvas.height));
    off.width=Math.max(1,Math.round(canvas.width*scale));off.height=Math.max(1,Math.round(canvas.height*scale));
    off.getContext('2d').drawImage(liveVideo,0,0,off.width,off.height);
    dataUrl=off.toDataURL('image/jpeg',.88);
  }else if(current>=0&&records[current]){
    dataUrl=records[current].image;
  }
  if(!dataUrl)return message('เลือกรูปหรือเปิดวิดีโอก่อนส่งไปค้นหา');
  const sp=detections[0]?.label;
  const species=['cat','dog','bird','rabbit','hamster'].includes(sp)?sp:'unknown';
  sessionStorage.setItem('pawtal-handoff',JSON.stringify({
    image:dataUrl,
    species,
    breed:lastBreedText||'',
    name:lastBreedText?`${names[classes.indexOf(species)]||''} (${lastBreedText})`:'รูปจากห้องตรวจจับ AI',
    area:'ส่งต่อจากห้องตรวจจับ 5 ชนิด',
    at:Date.now()
  }));
  location.href='/';
});
$('toggleCam')?.addEventListener('click',async()=>{
  if(streamActive&&camStream){stopStream({keepFrame:false});message('ปิดกล้องสดแล้ว');return;}
  stopStream();
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('เบราว์เซอร์ไม่รองรับการเปิดกล้อง');
    camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    liveVideo.srcObject=camStream;await liveVideo.play();
    $('toggleCam').textContent='⏹️ ปิดกล้องสด';
    startVideoStreamLoop('สแกนจากกล้องสดต่อเนื่อง…');
  }catch(err){stopStream();message('เปิดกล้องไม่ได้: '+(err.message||'ไม่ได้รับอนุญาต'));}
});
$('toggleScanLoop')?.addEventListener('click',()=>{
  streamScanning=!streamScanning;
  $('toggleScanLoop').textContent=streamScanning?'⏸️ หยุดสแกนอัตโนมัติ':'▶️ สแกนต่อเนื่อง';
  message(streamScanning?'สแกนเฟรมต่อเนื่องแล้ว':'พักการสแกน (คลิกวาง 5 มุมได้)');
});
$('captureStreamFrame')?.addEventListener('click',async()=>{
  if(!streamActive||liveVideo.readyState<2)return;
  const off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;
  off.getContext('2d').drawImage(liveVideo,0,0,off.width,off.height);
  const dataUrl=off.toDataURL('image/jpeg',.9);
  stopStream();
  await addImageFromDataUrl(`frame-${new Date().toLocaleTimeString('th-TH',{hour12:false}).replaceAll(':','')}.jpg`,dataUrl);
  await runDetection();
});

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('export').onclick=()=>{
  if(!records.length)return message('เพิ่มรูปก่อน');
  const counts=classes.map((_,i)=>records.reduce((n,r)=>n+r.boxes.filter(b=>b.classId===i).length,0));
  if(counts.some(n=>!n))message('ยังมีชนิดสัตว์ที่ไม่มี Label: '+names.filter((_,i)=>!counts[i]).join(', '));
  else message('ดาวน์โหลด Dataset (.json) แล้ว');
  download(new Blob([JSON.stringify({format:'pets5-dataset',version:1,classes,images:records})],{type:'application/json'}),'pets5-dataset.json');
};
$('saveImage').onclick=()=>{if(image||streamActive)canvas.toBlob(blob=>download(blob,'pets5-demo.png'));};

function applyPresetIn(){
  const d=detections[0],cx=d?d.x+d.width/2:0.5,cy=d?d.y+d.height/2:0.5,rx=d?Math.max(0.18,d.width*0.58):0.3,ry=d?Math.max(0.18,d.height*0.58):0.3;
  zone=[
    [Math.max(0.03,cx-rx),Math.max(0.04,cy-ry*0.7)],
    [Math.min(0.97,cx+rx),Math.max(0.04,cy-ry*0.7)],
    [Math.min(0.97,cx+rx*1.04),Math.min(0.96,cy+ry*0.5)],
    [cx,Math.min(0.97,cy+ry)],
    [Math.max(0.03,cx-rx*1.04),Math.min(0.96,cy+ry*0.5)]
  ];
  lastZoneState='';setMode('inspect');draw();
  message('จำลองเขต 5 มุมรอบตัวสัตว์: สถานะ IN ✓');
}
$('presetZoneIn')?.addEventListener('click',applyPresetIn);
$('presetZoneOut')?.addEventListener('click',()=>{
  const d=detections[0],cx=d?d.x+d.width/2:0.5;
  const ox=cx>0.5?0.16:0.84,oy=0.18;
  zone=[[ox-0.12,oy-0.10],[ox+0.12,oy-0.10],[ox+0.14,oy+0.06],[ox,oy+0.14],[ox-0.14,oy+0.06]];
  lastZoneState='';setMode('inspect');draw();
  message('จำลองเขต 5 มุมแยกจากตัวสัตว์: สถานะ OUT ⚠️');
});

async function loadSample(sp,{withZone=false}={}){
  document.querySelectorAll('[data-sample]').forEach(b=>b.classList.toggle('active',b.dataset.sample===sp));
  const baseSp=sp==='user-cat'?'cat':sp,idx=classes.indexOf(baseSp);
  if(idx>=0&&$('animal'))$('animal').value=String(idx);
  try{
    message(`กำลังสแกนตัวอย่าง (${sp==='user-cat'?'แมวส้ม':names[idx]})…`);
    const res=await fetch(`/assets/samples/${sp}.jpg`),blob=await res.blob();
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
    await addImageFromDataUrl(`sample-${sp}.jpg`,dataUrl);
    await runDetection();
    if(withZone)applyPresetIn();
  }catch{message('โหลดภาพตัวอย่างไม่สำเร็จ');}
}
document.querySelectorAll('[data-sample]').forEach(btn=>btn.addEventListener('click',()=>loadSample(btn.dataset.sample,{withZone:zone.length===5})));

fetch('/api/detection-status').then(r=>r.json()).then(s=>{
  $('modelStatus').textContent=s.ready?'✓ โมเดล 5 ชนิดพร้อมใช้งาน':'⚠️ ยังไม่มีไฟล์โมเดล pets5.onnx';
}).catch(()=>{$('modelStatus').textContent='เชื่อมเซิร์ฟเวอร์ไม่ได้ เปิดด้วย npm start ก่อน';});

setMode('inspect');
loadSample('user-cat',{withZone:true});
