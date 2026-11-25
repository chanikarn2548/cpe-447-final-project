function commitCaseChange(item,patch){
  const previous={...item};Object.assign(item,patch);
  if(!save('cases',state.cases)){Object.keys(item).forEach(key=>delete item[key]);Object.assign(item,previous);showToast('พื้นที่จัดเก็บเต็ม ยังไม่ได้บันทึก');return false;}
  renderCases();return true;
}
function caseTools(item){return item.followupNote?`<div class="form-note"><b>📝 บันทึกการติดตาม</b><br>${escapeHtml(item.followupNote).replaceAll('\n','<br>')}</div>`:'';}
function clueActions(clue,index){return `<div class="clue-controls"><label>ผลตรวจสอบ <select data-clue-status="${index}">${Object.entries(clueStatuses).map(([key,label])=>`<option value="${key}" ${(clue.status||'pending')===key?'selected':''}>${label}</option>`).join('')}</select></label><button class="text-link" data-clue-note="${index}">จดบันทึก / แก้ไข</button>${clue.note?`<p>${escapeHtml(clue.note).replaceAll('\n','<br>')}</p>`:''}</div>`;}
const originalDetail=detail;
detail=function(item){if(!item)return;originalDetail(item);const noteHtml=caseTools(item);if(noteHtml)$('#dialogBody').insertAdjacentHTML('afterbegin',noteHtml);};
let breedRun=0;
async function showBreedSuggestion(item){
 const run=String(++breedRun);openDialog('AI ช่วยดูสายพันธุ์','กำลังเทียบกับสายพันธุ์หมา–แมวในชุดฝึก',`<div class="match-loading"><span class="spinner"></span>กำลังดูรูปน้อง…</div>`);$('#dialogBody').dataset.breedRun=run;
 const active=()=>dialog.open&&$('#dialogBody').dataset.breedRun===run;
 try{const photo=await fetch(item.image);if(!photo.ok)throw Error('เปิดรูปไม่สำเร็จ');const blob=await photo.blob(),response=await fetch('/api/suggest-breed?species='+encodeURIComponent(item.species),{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob}),data=await response.json();if(!response.ok)throw Error(data.error||'วิเคราะห์รูปไม่สำเร็จ');if(!active())return;
 openDialog('สายพันธุ์และสี/ลายขนที่ใกล้เคียง',item.name,`<img class="detail-img" src="${escapeHtml(item.image)}" alt="รูปสัตว์ที่วิเคราะห์">${data.coat?.tags?.length?`<div class="form-note"><b>🎨 ลักษณะสีและลายขน (เหมาะกับสัตว์พันธุ์ผสมในไทย):</b> ${data.coat.tags.map(escapeHtml).join(' · ')}</div>`:''}<ol>${data.suggestions.map(s=>`<li>${escapeHtml(s.thaiName?`${s.thaiName} (${s.name})`:s.name)}</li>`).join('')}</ol><div class="form-note">เป็นตัวเลือกให้ตรวจสอบจากรูปร่างและขน โมเดลรู้จัก 37 สายพันธุ์ในชุดฝึก พร้อมวิเคราะห์โทนสีและลายขนสำหรับสัตว์พันธุ์ผสมในไทย ผลนี้ยังไม่ยืนยันตัวตนของน้อง</div>${data.quality?.warnings?.length?`<div class="form-note">${data.quality.warnings.map(escapeHtml).join('<br>')}</div>`:''}<button class="btn btn-dark" data-close>ปิด</button>`);
 }catch(error){if(active())openDialog('ยังดูสายพันธุ์ไม่ได้','ลองใช้ภาพที่เห็นตัวน้องชัด',`<div class="form-note">${escapeHtml(error.message)}</div><button class="btn btn-dark" data-close>ปิด</button>`);}
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-breed-suggest]');if(button){const item=state.cases.find(r=>r.id===button.dataset.breedSuggest);if(item)showBreedSuggestion(item);}});
document.addEventListener('click',event=>{
  const favorite=event.target.closest('[data-case-favorite]'),notes=event.target.closest('[data-case-notes]'),clueButton=event.target.closest('[data-clue-note]');
  if(favorite){const item=state.cases.find(row=>row.id===favorite.dataset.caseFavorite);if(item&&commitCaseChange(item,{favorite:!item.favorite}))detail(item);}
  if(notes){const item=state.cases.find(row=>row.id===notes.dataset.caseNotes);if(!item)return;openDialog('บันทึกการติดตาม',item.name,`<form id="caseNotesForm" data-id="${escapeHtml(item.id)}"><div class="field"><label>สิ่งที่ตรวจสอบแล้ว / ขั้นตอนถัดไป</label><textarea name="note" maxlength="3000">${escapeHtml(item.followupNote||'')}</textarea></div>${formButtons('บันทึก')}</form>`);}
  if(clueButton){const index=Number(clueButton.dataset.clueNote),row=state.sightings[index];if(!row)return;openDialog('บันทึกเบาะแส',row.title,`<form id="clueNotesForm" data-index="${index}"><div class="field"><label>จุดสังเกตหรือผลการติดต่อ</label><textarea name="note" maxlength="3000">${escapeHtml(row.note||'')}</textarea></div>${formButtons('บันทึก')}</form>`);}
});
function commitClue(index,patch){
  const previous=state.sightings[index];if(!previous)return false;
  state.sightings[index]={...previous,...patch,reviewedAt:new Date().toISOString()};
  if(!save('sightings',state.sightings)){state.sightings[index]=previous;showToast('พื้นที่จัดเก็บเต็ม ยังไม่ได้บันทึก');return false;}
  renderSightings();return true;
}
document.addEventListener('change',event=>{
  if(!event.target.matches('[data-clue-status]'))return;
  const index=Number(event.target.dataset.clueStatus),row=state.sightings[index];if(!row)return;
  if(!Object.hasOwn(clueStatuses,event.target.value))return;
  if(commitClue(index,{status:event.target.value})){showToast('บันทึกผลตรวจสอบแล้ว');}else event.target.value=row.status||'pending';
});
document.addEventListener('submit',event=>{
  const form=event.target;if(!['caseNotesForm','clueNotesForm'].includes(form.id))return;event.preventDefault();
  const note=new FormData(form).get('note').trim();
  if(form.id==='caseNotesForm'){const item=state.cases.find(row=>row.id===form.dataset.id);if(item&&commitCaseChange(item,{followupNote:note}))detail(item);}
  else {const index=Number(form.dataset.index),row=state.sightings[index];if(row&&commitClue(index,{note})){const item=state.cases.find(c=>c.id===row.caseId);if(item)detail(item);else closeDialog();}}
});
for(const id of ['hideDemo','favoritesOnly','caseSort'])$('#'+id)?.addEventListener('change',()=>renderCases());
$('#resetCaseFilters')?.addEventListener('click',()=>{
  for(const id of ['caseSearch','areaFilter'])$('#'+id).value='';
  $('#speciesFilter').value='all';$('#caseSort').value='recent';$('#favoritesOnly').checked=false;$('#hideDemo').checked=false;caseQuery='';renderCases('all');
});
$('#exportCaseCsv')?.addEventListener('click',()=>{
  const rows=currentCaseSelection(),header=['ชื่อ','ประเภท','ชนิดสัตว์','พื้นที่','เวลา','สถานะ','ช่องทางติดต่อ','เบาะแส','บันทึกการติดตาม'];
  const csv='\uFEFF'+[header,...rows.map(row=>[row.name,typeLabel(row.type),speciesName(row.species),row.area,row.when,row.status==='resolved'?'ปิดเคส':'เปิดเคส',row.contact,state.sightings.filter(s=>s.caseId===row.id).length,row.followupNote])].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='tamnong-cases.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast(`ส่งออก ${rows.length} เคสตามตัวกรองแล้ว`);
});
renderCases();renderSightings();

function trainingPairReadiness(cases,sightings){
 const counts=Object.fromEntries(['cat','dog','bird','rabbit','hamster'].map(s=>[s,{same:0,different:0}]));let pending=0,incomplete=0;
 for(const clue of sightings){const item=cases.find(c=>c.id===clue.caseId);if(!item||item.isDemo)continue;
  if(!['confirmed','rejected'].includes(clue.status)){pending++;continue;}
  if(!item.image||!clue.image||!clue.reviewedAt||!counts[item.species]){incomplete++;continue;}
  counts[item.species][clue.status==='confirmed'?'same':'different']++;
 }return {counts,pending,incomplete};
}
function renderTrainingReadiness(){
 const button=$('#exportTrainingPairs');if(!button)return;
 let panel=$('#trainingReadiness');if(!panel){button.insertAdjacentHTML('afterend','<div id="trainingReadiness" class="form-note" role="status" aria-live="polite"></div>');panel=$('#trainingReadiness');}
 const {counts,pending,incomplete}=trainingPairReadiness(state.cases,state.sightings),total=Object.values(counts).reduce((n,c)=>n+c.same+c.different,0);
 panel.innerHTML=`<b>คู่ภาพสำหรับประเมิน AI: ${total} คู่ที่บันทึกผลตรวจแล้ว</b><br>${Object.entries(counts).map(([species,c])=>`${escapeHtml(speciesName(species))}: ตัวเดียวกัน ${c.same} · คนละตัว ${c.different}`).join('<br>')}<br>รอตรวจสอบ ${pending} · ข้อมูลหรือรูปไม่ครบ ${incomplete}<br>เปิดเคส → เพิ่มหรือเก็บเบาะแส → ตรวจสอบตัวตนจริง → เลือกผล “ตรง / ไม่ตรง” → ส่งออกคู่ภาพ<br><small>จำนวนนี้ยังไม่หักคู่ซ้ำหรือรูปต้นทางที่เปิดไม่ได้ และไม่ใช่คะแนนความแม่นยำ AI</small>`;
}
const renderSightingsBeforeReadiness=renderSightings;
renderSightings=function(){renderSightingsBeforeReadiness();renderTrainingReadiness();};
renderTrainingReadiness();

$('#exportTrainingPairs')?.addEventListener('click',async event=>{
 const button=event.currentTarget;button.disabled=true;
 try{
 renderTrainingReadiness();
 const pairs=state.sightings.filter(s=>['confirmed','rejected'].includes(s.status)&&s.image).flatMap(s=>{
  const item=state.cases.find(c=>c.id===s.caseId);if(!item?.image||item.isDemo)return [];
  if(!['cat','dog','bird','rabbit','hamster'].includes(item.species)||!s.reviewedAt)return [];
  return [{caseId:item.id,species:item.species,queryImage:item.image,candidateImage:s.image,sameAnimal:s.status==='confirmed',reviewedAt:s.reviewedAt}];
 });
 if(!pairs.length){showToast('ยังไม่มีภาพคู่ที่ตรวจสอบแล้ว เลือกสถานะตรง / ไม่ตรงในเบาะแสก่อน');return;}
 const snapshots=new Map();async function snapshot(src){
  if(snapshots.has(src))return snapshots.get(src);
  const promise=(async()=>{if(src.startsWith('data:image/'))return src;
   if(!src.startsWith('assets/')&&!safeExternalUrl(src))throw Error('ไม่สามารถเปิดรูปได้');
   const response=await fetch(src,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('เปิดภาพต้นทางไม่ได้');
   const blob=await response.blob();if(!blob.type.startsWith('image/')||blob.size>3_500_000)throw Error('ไฟล์ภาพไม่รองรับหรือใหญ่เกินไป');
   return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});})();snapshots.set(src,promise);return promise;
 }
 const ready=[];let failed=0;for(const pair of pairs)try{ready.push({...pair,queryImage:await snapshot(pair.queryImage),candidateImage:await snapshot(pair.candidateImage)});}catch{failed++;}
 if(!ready.length){showToast('อ่านรูปไม่ได้ กรุณาแนบรูปจากเครื่องในเบาะแสแล้วส่งออกใหม่');return;}
 const payload={format:'tamnong-identity-pairs',version:1,exportedAt:new Date().toISOString(),pairs:ready};
 if(new Blob([JSON.stringify(payload)]).size>25_000_000){showToast('ข้อมูลภาพเกิน 25 MB กรุณาลดขนาดรูปก่อนส่งออก');return;}
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='tamnong-identity-pairs.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast(`ส่งออกพร้อมภาพ ${ready.length} คู่${failed?` · อ่านรูปไม่ได้ ${failed} คู่`:''}`);
 }catch(error){showToast(error.message||'ส่งออกไม่สำเร็จ');}finally{button.disabled=false;}
});
