const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const dialog = $('#dialog');
const toastEl = $('#toast');
const STORE = 'tamnong-demo-v1';

const initialCases = [
  {id:'tungthong',type:'lost',species:'dog',name:'ถุงทอง',kind:'ไทยผสม',area:'อารีย์, พญาไท',when:'หายเมื่อวาน · 17:30 น.',description:'สีน้ำตาลอ่อน อกขาว ใส่ปลอกคอสีน้ำเงิน หางงอเล็กน้อย ขี้กลัวแต่เป็นมิตร',image:'assets/samples/dog.jpg',position:'center',updated:'มีคนแจ้งเบาะแส 2 รายการ'},
  {id:'found-dog-demo',type:'found',species:'dog',name:'สุนัขสีน้ำตาลที่พบ · ตัวอย่าง',kind:'สุนัขไทยผสม',area:'อารีย์, พญาไท',when:'พบวันนี้ · 10:42 น.',description:'ข้อมูลตัวอย่างสำหรับลองจับคู่ภาพ ไม่ใช่เคสจริง',image:'assets/hero-pets.png',position:'72% 58%',updated:'ข้อมูลตัวอย่างสำหรับเดโม'},
  {id:'mali',type:'found',species:'cat',name:'แมวลายส้มที่พบ',kind:'ลายส้มขาว',area:'สะพานควาย, พญาไท',when:'พบวันนี้ · 09:15 น.',description:'พบเดินอยู่หน้าร้านสะดวกซื้อ ดูเชื่องและสะอาด มีปลอกคอสีเขียว ไม่ทราบชื่อ',image:'assets/lost-cat-sample.jpg',position:'center',updated:'รอเจ้าของติดต่อ'},
  {id:'lucky',type:'lost',species:'cat',name:'ลัคกี้',kind:'แมวไทย · ขาวส้ม',area:'จตุจักร, กรุงเทพฯ',when:'หาย 2 วันที่แล้ว',description:'ตัวเล็ก ขนขาวส้ม มีแต้มส้มที่หน้าผาก ไม่มีปลอกคอ กลัวเสียงดัง',image:'assets/match-cat.png',position:'58% center',updated:'ประกาศโดยเจ้าของ'},
  {id:'gray-cat-demo',type:'found',species:'cat',name:'แมวสีเทาที่พบ · ตัวอย่าง',kind:'แมวขนสั้นสีเทา',area:'บางนา, กรุงเทพฯ',when:'พบวันนี้ · 13:00 น.',description:'พบแมวสีเทาเข้ม ตาสีเหลือง เชื่องมาก นั่งหลบฝนอยู่หน้าบ้าน',image:'assets/samples/cat.jpg',position:'center',updated:'ข้อมูลตัวอย่างสำหรับเดโม'},
  {id:'bird-demo',type:'found',species:'bird',name:'นกหลงที่พบ · ตัวอย่าง',kind:'นกสวยงาม',area:'บางซื่อ, กรุงเทพฯ',when:'พบวันนี้ · 11:20 น.',description:'พบนกเชื่องเกาะอยู่ริมระเบียง ขนสะอาด รอเจ้าของติดต่อ',image:'assets/samples/bird.jpg',position:'center',updated:'ข้อมูลตัวอย่างสำหรับเดโม'},
  {id:'rabbit-demo',type:'found',species:'rabbit',name:'กระต่ายสีน้ำตาลที่พบ · ตัวอย่าง',kind:'กระต่ายเลี้ยง',area:'ลาดพร้าว, กรุงเทพฯ',when:'พบวันนี้ · 08:45 น.',description:'พบกระต่ายสีน้ำตาลในสวนหมู่บ้าน เชื่องคุ้นคน',image:'assets/samples/rabbit.jpg',position:'center',updated:'ข้อมูลตัวอย่างสำหรับเดโม'},
  {id:'hamster-demo',type:'found',species:'hamster',name:'แฮมสเตอร์สีน้ำตาลที่พบ · ตัวอย่าง',kind:'ไจแอนท์แฮมสเตอร์',area:'พญาไท, กรุงเทพฯ',when:'พบวันนี้ · 14:10 น.',description:'พบแฮมสเตอร์ตัวอ้วนสีน้ำตาล เชื่อง ไม่กัด',image:'assets/samples/hamster.jpg',position:'center',updated:'ข้อมูลตัวอย่างสำหรับเดโม'}
];
initialCases.forEach(item=>item.isDemo=true);
const state = loadState();
let activeFilter = 'all';
let caseVisibleLimit = 5;
let caseQuery = '';
let caseViewMode = 'grid';
let toastTimer;
const mapModule = typeof window !== 'undefined' ? import('./case-map.mjs').catch(() => null) : null;
const posterModule = typeof window !== 'undefined' ? import('./poster-generator.mjs').catch(() => null) : null;

function loadState(){
  const readList=(key,normalize=value=>value)=>{
    try {
      const value=JSON.parse(localStorage.getItem(STORE+':'+key)||'[]');
      return Array.isArray(value)?value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map(normalize):[];
    } catch { return []; }
  };
  const savedCases=readList('cases',normalizeRecord),profiles=readList('profiles',normalizeRecord),sightings=readList('sightings');
  const savedById=new Map(savedCases.filter(item=>item.id).map(item=>[item.id,item])),initialIds=new Set(initialCases.map(item=>item.id));
  const cases=initialCases.map(item=>savedById.has(item.id)?{...savedById.get(item.id),isDemo:true}:item).concat(savedCases.filter(item=>!initialIds.has(item.id)));
  return {cases,profiles,sightings};
}
function safeExternalUrl(value=''){try{const url=new URL(value);return url.protocol==='https:'?url.toString():'';}catch{return '';}}
function normalizeRecord(record){return {...record,species:record.species||speciesFromText(record.kind||record.description||''),sourceLink:safeExternalUrl(record.sourceLink||'')};}
function speciesFromText(text=''){return /กระต่าย|rabbit/i.test(text)?'rabbit':/แฮมสเตอร์|hamster/i.test(text)?'hamster':/นก|bird/i.test(text)?'bird':/แมว|cat/i.test(text)?'cat':'dog';}
const speciesLabels={dog:'สุนัข',cat:'แมว',bird:'นก',rabbit:'กระต่าย',hamster:'แฮมสเตอร์'};
function speciesName(species){return speciesLabels[species]||'สัตว์เลี้ยง';}
function speciesIcon(species){return ({dog:'🐕',cat:'🐈',bird:'🦜',rabbit:'🐇',hamster:'🐹'})[species]||'🐾';}
function speciesSelect(name='species',value='dog',required=true,includeUnknown=false){return `<select name="${name}" ${required?'required':''}>${includeUnknown?`<option value="unknown" ${value==='unknown'?'selected':''}>ยังไม่ระบุ</option>`:''}${Object.entries(speciesLabels).map(([key,label])=>`<option value="${key}" ${value===key?'selected':''}>${label}</option>`).join('')}</select>`;}
function save(key,value){
  try{
    const stripPin=list=>Array.isArray(list)?list.map(x=>{if(!x||typeof x!=='object'||!x.ownerPin)return x;const {ownerPin,...rest}=x;return rest;}):list;
    const localVal=key==='cases'?stripPin(value):value;
    localStorage.setItem(STORE+':'+key,JSON.stringify(localVal));
    if((key==='cases'||key==='sightings'||key==='profiles')&&typeof fetch==='function'){
      const casesSource=key==='cases'?value:(state.cases||[]);
      const sightingsSource=key==='sightings'?value:(state.sightings||[]);
      const profilesSource=key==='profiles'?value:(state.profiles||[]);
      const serverCases=(Array.isArray(casesSource)?casesSource:[]).filter(x=>!x.isDemo);
      fetch('/api/database',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cases:serverCases,sightings:sightingsSource,profiles:profilesSource})}).then(r=>r.ok?r.json():null).then(res=>{
        let compacted=false;
        const byId=new Map((res?.cases||[]).map(c=>[c.id,c]));
        for(const c of state.cases||[]){
          if(c?.ownerPin){c.hasOwnerPin=true;delete c.ownerPin;}
          const srv=byId.get(c?.id);
          if(srv?.image&&typeof c.image==='string'&&c.image.startsWith('data:image/')){
            c.image=srv.image;
            if(Array.isArray(srv.images)&&srv.images.length)c.images=srv.images;
            compacted=true;
          }
        }
        if(compacted){try{localStorage.setItem(STORE+':cases',JSON.stringify(stripPin(state.cases)));}catch{}}
        if(res?.alertsTriggered>0){refreshAlertBadge();showToast(`🔔 พบประกาศใหม่ตรงกับคำแจ้งเตือน ${res.alertsTriggered} รายการ!`);}
      }).catch(()=>{});
    }
    return true;
  }catch{return false;}
}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showToast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2800);}
function typeLabel(type){return type==='lost'?'กำลังตามหา':'แจ้งพบ';}
function currentCaseSelection(){return selectCases(state.cases,{filter:activeFilter,species:$('#speciesFilter')?.value||'all',area:$('#areaFilter')?.value||'',query:caseQuery,hideDemo:$('#hideDemo')?.checked||false,favorites:$('#favoritesOnly')?.checked||false,sort:$('#caseSort')?.value||'recent'});}
function renderCases(filter=activeFilter){
  activeFilter=filter;
  const list=currentCaseSelection(),visible=list.slice(0,caseVisibleLimit),remaining=list.length-visible.length;
  const count=$('#caseResultCount');if(count)count.textContent=caseViewMode==='map'?`พบ ${list.length} ประกาศบนแผนที่`:remaining>0?`แสดง ${visible.length} จาก ${list.length} ประกาศ`:`พบ ${list.length} ประกาศ`;
  const listEl=$('#caseList'),mapEl=$('#caseMapContainer'),pager=$('#casePagination');
  if(caseViewMode==='map'&&mapEl){
    if(listEl)listEl.hidden=true;
    if(pager)pager.style.display='none';
    mapEl.hidden=false;
    mapModule?.then(mod=>mod?.renderCaseMap(mapEl,list,id=>{const found=state.cases.find(x=>x.id===id);if(found)detail(found);}));
  }else{
    if(mapEl)mapEl.hidden=true;
    if(listEl)listEl.hidden=false;
    if(pager)pager.style.display='flex';
    listEl.innerHTML=visible.length?visible.map(item=>`<article class="case-card">
      <div class="case-image"><img src="${escapeHtml(item.image)}" style="object-position:${escapeHtml(item.position||'center')}" alt="รูป ${escapeHtml(item.name)}"><span class="case-type ${item.type==='lost'?'lost':'found'}">${item.status==='resolved'?'✓ กลับบ้านแล้ว':item.type==='lost'?'🔎 สัตว์หาย':'📷 พบสัตว์'}</span></div>
      <div class="case-content"><div class="case-title"><h3>${item.favorite?'★ ':''}${speciesIcon(item.species)} ${escapeHtml(item.name)}</h3><span>${escapeHtml(item.kind||speciesName(item.species))}</span></div><p>${escapeHtml(item.description)}</p><div class="case-meta"><span>📍 ${escapeHtml(item.area||'ยังไม่ระบุบริเวณ')}</span><span>🕒 ${escapeHtml(item.when)}</span></div><div class="case-footer"><div class="case-card-actions"><button class="btn btn-soft-green" data-action="detail" data-id="${escapeHtml(item.id)}">ดูรายละเอียด</button><button class="btn btn-light case-mini-btn" data-action="match" data-id="${escapeHtml(item.id)}" title="เทียบภาพหาประกาศคล้ายด้วย AI">✦ หาคล้าย</button><button class="btn btn-light case-mini-btn" data-action="poster" data-id="${escapeHtml(item.id)}" title="สร้างโปสเตอร์ประกาศพร้อม QR Code">🖼️ โปสเตอร์</button></div></div></div>
    </article>`).join(''):'<div class="empty">ยังไม่มีประกาศในหมวดนี้ ลองเลือก “ทั้งหมด” หรือแจ้งประกาศใหม่ได้เลย 🐾</div>';
    if(pager){
      pager.innerHTML=remaining>0
        ?`<button type="button" class="btn btn-light" id="showMoreCases">ดูประกาศเพิ่มเติม (+${Math.min(5,remaining)} · เหลืออีก ${remaining}) ↓</button><button type="button" class="text-link" id="showAllCases">ดูทั้งหมด (${list.length})</button>`
        :(caseVisibleLimit>5&&list.length>5?'<button type="button" class="btn btn-light" id="collapseCases">ย่อเหลือ 5 ประกาศ ↑</button>':'');
    }
  }
  $$('.filter[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
  $$('.view-btn[data-case-view]').forEach(b=>b.classList.toggle('active',b.dataset.caseView===caseViewMode));
}
function updateTrackingSummary(){const el=$('#trackingSummaryCount');if(!el)return;const s=state.sightings.length,p=state.profiles.length;el.textContent=(s||p)?`(${s} เบาะแส · ${p} โปรไฟล์)`:'';}
function renderSightings(){
  const items=state.sightings;if(typeof updateTrackingSummary==='function')updateTrackingSummary();
  $('#sightings').innerHTML=items.length?`<div class="timeline">${items.map(x=>`<div class="timeline-item"><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.info)}</small><em>${escapeHtml(clueStatuses[x.status]||clueStatuses.pending)} · ${escapeHtml(x.area||'')}</em>${x.caseId?`<button class="text-link" data-action="detail" data-id="${escapeHtml(x.caseId)}">เปิดเคสและติดตาม →</button>`:''}</div>`).join('')}</div>`:'<div class="empty">ยังไม่มีเบาะแสที่บันทึกไว้ ค้นหารูปแล้วเลือกเก็บผลที่ต้องการติดตามได้</div>';
}
function renderProfiles(){
  const box=$('#profiles');if(typeof updateTrackingSummary==='function')updateTrackingSummary();
  $('#emptyProfile').style.display=state.profiles.length?'none':'block';
  box.innerHTML=state.profiles.map((p,index)=>{const images=[...new Set([p.image,...(p.images||[])].filter(Boolean))];return `<div class="profile-row">${images[0]?`<img class="profile-thumb" src="${escapeHtml(images[0])}" alt="รูป ${escapeHtml(p.name)}">`:`<span class="profile-thumb">${speciesIcon(p.species)}</span>`}<div><b>${speciesIcon(p.species)} ${escapeHtml(p.name)}</b><small>${speciesName(p.species)} · ${escapeHtml(p.kind||p.color||'ยังไม่ได้ระบุลักษณะ')} · ${images.length} รูปหลายมุม</small><span class="tag">มีโปรไฟล์พร้อมใช้</span><button class="text-link" data-action="editprofile" data-index="${index}">แก้ข้อมูล / รูป →</button><button class="text-link" data-action="profilelost" data-index="${index}">ลงประกาศจากโปรไฟล์นี้ →</button></div></div>`}).join('');
}
function openDialog(title,hint,html){dialog.classList.remove('poster-wide-dialog');delete $('#dialogBody').dataset.matchRun;delete $('#dialogBody').dataset.breedRun;$('#dialogTitle').textContent=title;$('#dialogHint').textContent=hint||'';$('#dialogBody').innerHTML=html;dialog.showModal();}
function closeDialog(){dialog.close();}
function formButtons(label='บันทึก'){return `<div class="form-actions"><button type="button" class="btn btn-light" data-close>ยกเลิก</button><button class="btn btn-dark" type="submit">${label}</button></div>`;}
function imageField(note='รูปช่วยให้เจ้าของจำแนกน้องได้ง่ายขึ้น',required=false,capture=false,multiple=false){return `<div class="field full-field"><label>รูปภาพ ${required?'*':'(ถ้ามี)'}</label><div class="upload-box"><div class="${multiple?'query-photo-previews':''}"><img class="preview" alt="ตัวอย่างรูปที่เลือก">${multiple?'<img class="preview" alt="ตัวอย่างรูปมุมที่สอง">':''}</div><input type="file" name="photo" accept="image/*" ${multiple?'multiple data-max-photos="2"':capture?'capture="environment"':''} ${required?'required':''}><div class="camera-quick-row"><button type="button" class="btn btn-light camera-capture-btn" data-camera-trigger>📸 ถ่ายรูปจากกล้องทันที</button><button type="button" class="btn btn-light camera-capture-btn" data-ocr-scan>🔤 อ่านเบอร์/ข้อความในภาพ (OCR)</button><input type="file" accept="image/*" capture="environment" class="camera-capture-input" hidden></div><small>${note}</small>${multiple?'<small data-query-photo-count>เลือกได้ 1–2 รูปของสัตว์ตัวเดียวกัน</small>':''}<div class="quick-sample-picks" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center"><small style="width:100%;color:#7b6b49">หรือคลิกเลือกรูปตัวอย่าง 5 ชนิดเพื่อทดลองสแกนทันที:</small><button type="button" class="text-link" data-sample-photo="assets/samples/dog.jpg" data-sample-species="dog" data-sample-name="บราวนี่ (สุนัข)">🐶 สุนัข</button><button type="button" class="text-link" data-sample-photo="assets/samples/user-cat.jpg" data-sample-species="cat" data-sample-name="ส้มจี๊ด (แมวส้ม)">🐱 แมว</button><button type="button" class="text-link" data-sample-photo="assets/samples/bird.jpg" data-sample-species="bird" data-sample-name="ฟ้าใส (นก)">🐦 นก</button><button type="button" class="text-link" data-sample-photo="assets/samples/rabbit.jpg" data-sample-species="rabbit" data-sample-name="ปุยฝ้าย (กระต่าย)">🐰 กระต่าย</button><button type="button" class="text-link" data-sample-photo="assets/samples/hamster.jpg" data-sample-species="hamster" data-sample-name="โกลด์ดี้ (แฮมสเตอร์)">🐹 แฮมสเตอร์</button></div></div></div>`;}
function foundForm(){
  openDialog('แจ้งพบสัตว์พลัดหลง','ลงแค่รูปน้องก่อนได้ ระบบจะสแกนหาเจ้าของให้อัตโนมัติ',`<form id="foundForm"><div class="form-grid">
    ${imageField('ถ่ายให้เห็นตัวน้องชัดๆ แนะนำให้มีสัตว์ตัวเดียวในภาพ',true,true)}
    <details class="optional-fields full-field"><summary>เพิ่มรายละเอียดเพิ่มเติม (ไม่บังคับ)</summary><div class="form-grid optional-grid">
      <div class="field"><label>สัตว์ที่พบ</label>${speciesSelect('species','unknown',false,true)}</div>
      <div class="field"><label>สายพันธุ์ / ชนิดย่อย</label><input name="breed" placeholder="เช่น ไทยผสม / หงส์หยก"></div>
      <div class="field"><label>สี / ลักษณะเด่น</label><input name="color" placeholder="เช่น ส้มขาว มีปลอกคอเขียว"></div>
      <div class="field"><label>บริเวณที่พบ</label><div class="area-gps-row"><input name="area" placeholder="เช่น อารีย์ ซอย 2"><button type="button" class="btn btn-light gps-btn" data-gps-fill title="ดึงพิกัด GPS ปัจจุบัน">📍 GPS</button></div><input type="hidden" name="lat"><input type="hidden" name="lon"></div>
      <div class="field"><label>เวลาที่พบ</label><input name="time" type="datetime-local"></div>
      <div class="field"><label>ช่องทางติดต่อกลับ</label><input name="contact" placeholder="เบอร์โทรหรือไลน์ (ถ้าสะดวก)"></div>
      <div class="field"><label>รหัส PIN เจ้าของ (4–6 หลัก · ป้องกันคนอื่นลบ)</label><input name="ownerPin" inputmode="numeric" pattern="\\d{4,6}" maxlength="6" placeholder="เช่น 1234 (ไม่บังคับ)"></div>
      <div class="field full-field"><label>รายละเอียดเพิ่ม</label><textarea name="description" placeholder="พฤติกรรม ปลอกคอ หรือจุดสังเกตอื่น ๆ"></textarea></div>
      <div class="field full-field"><label>ลิงก์โพสต์ต้นทาง (ถ้าพบจากโซเชียล)</label><input name="sourceLink" type="url" placeholder="วางลิงก์โพสต์ Facebook หรือเว็บต้นทาง (ถ้ามี)"></div>
    </div></details>
  </div><div class="form-note">ส่งรูปแล้วระบบจะช่วยสแกนสีขน ชนิดสัตว์ และค้นหาประกาศที่หน้าตาคล้ายกันให้ทันที</div>${formButtons('ส่งรูปและค้นหาเจ้าของ')}</form>`);
  bindImagePreview();
}
function lostForm(species='unknown'){
  lostPhotoOnlyForm(species);
}
function lostPhotoOnlyForm(species='unknown'){
  openDialog('ค้นหาสัตว์หายจากรูปภาพ','อัปโหลดรูปน้อง 1–2 มุม ระบบจะสแกนหาประกาศที่คล้ายกันให้ทันที',`<form id="lostPhotoOnlyForm"><div class="form-grid">
    ${imageField('แนะนำให้ใช้รูปเห็นหน้าตรง 1 รูป และรูปเห็นสีขนลำตัว 1 รูป (ต้องเป็นน้องตัวเดียวกัน)',true,false,true)}
    <details class="optional-fields"><summary>ระบุชื่อ พื้นที่ หรือช่องทางติดต่อเพิ่ม (ไม่บังคับ)</summary><div class="form-grid optional-grid">
      <div class="field"><label>ประเภทสัตว์</label>${speciesSelect('species',species,false,true)}</div>
      <div class="field"><label>บริเวณที่หาย</label><div class="area-gps-row"><input name="area" placeholder="เขต / ย่าน"><button type="button" class="btn btn-light gps-btn" data-gps-fill title="ดึงพิกัด GPS ปัจจุบัน">📍 GPS</button></div><input type="hidden" name="lat"><input type="hidden" name="lon"></div>
      <div class="field"><label>ชื่อน้อง</label><input name="name" placeholder="ชื่อเล่น (ถ้าทราบ)"></div>
      <div class="field"><label>ช่องทางติดต่อกลับ</label><input name="contact" placeholder="เบอร์โทรหรือ Line (ถ้าต้องการ)"></div>
      <div class="field"><label>รหัส PIN เจ้าของ (4–6 หลัก · ป้องกันคนอื่นลบ)</label><input name="ownerPin" inputmode="numeric" pattern="\\d{4,6}" maxlength="6" placeholder="เช่น 1234 (ไม่บังคับ)"></div>
      <div class="field full-field"><label>รายละเอียดเพิ่ม</label><textarea name="description" placeholder="สี จุดสังเกต หรือเวลาโดยประมาณ"></textarea></div>
  </div></details>
  </div><div class="form-note">ไม่ต้องกรอกข้อมูลเยอะ ระบบจะตรวจชนิดสัตว์และค้นหาประกาศที่คล้ายกันจากทั้งในเว็บและแหล่งภายนอกให้อัตโนมัติ</div>${formButtons('🔎 สแกนรูปและค้นหาเบาะแส')}</form>`);bindImagePreview();
}
function registerForm(){
  openDialog('เตรียมโปรไฟล์น้อง','บันทึกจุดสังเกตไว้ก่อน เผื่อจำเป็นต้องตามหา',`<form id="profileForm"><div class="form-grid">
    <div class="field"><label>ชื่อสัตว์ *</label><input name="name" required placeholder="เช่น โมจิ"></div><div class="field"><label>สัตว์เลี้ยง *</label>${speciesSelect()}</div>
    <div class="field"><label>สายพันธุ์ / ชนิดย่อย</label><input name="breed" placeholder="เช่น ไทยผสม / หงส์หยก"></div>
    <div class="field"><label>สีและจุดสังเกต *</label><input name="color" required placeholder="เช่น ขาวส้ม มีแต้มที่จมูก"></div><div class="field"><label>พื้นที่อาศัย</label><input name="area" placeholder="เขต / ย่าน"></div>
    <div class="field full-field"><label>ข้อมูลสุขภาพหรือหมายเหตุ</label><textarea name="notes" placeholder="โรคประจำตัว ยาที่ใช้ หรือพฤติกรรมที่ควรรู้"></textarea></div>
    <div class="field full-field"><label>รูปน้องหลายมุม</label><div class="upload-box"><input type="file" name="photos" accept="image/*" multiple><small>เพิ่มได้สูงสุด 4 รูป เช่น หน้า ด้านข้าง และด้านบน ระบบใช้ทุกภาพช่วยเทียบ</small><div class="profile-photo-previews"></div></div></div>
  </div><div class="form-note">บันทึกข้อมูลและรูปหลายมุมไว้ล่วงหน้า เพื่อช่วยให้ระบบเทียบภาพได้แม่นยำขึ้นเมื่อจำเป็น</div>${formButtons('บันทึกโปรไฟล์')}</form>`);bindImagePreview();
  const input=$('input[name="photos"]',dialog);input.addEventListener('change',()=>{const files=[...input.files].slice(0,4);if(input.files.length>4){showToast('เลือกได้สูงสุด 4 รูป');input.value='';return;}$('.profile-photo-previews',dialog).innerHTML=files.map(file=>`<img alt="ตัวอย่างภาพที่เลือก" src="${URL.createObjectURL(file)}" style="width:72px;height:72px;object-fit:cover;border-radius:12px;margin:6px">`).join('');});
}
function editProfileForm(index){
  const p=state.profiles[index];if(!p)return;const images=[...new Set([p.image,...(p.images||[])].filter(Boolean))];
  openDialog('แก้โปรไฟล์และรูปน้อง','เก็บรูปต่างมุมได้สูงสุด 4 รูป',`<form id="editProfileForm" data-index="${index}"><div class="form-grid"><div class="field"><label>ชื่อสัตว์ *</label><input name="name" required value="${escapeHtml(p.name)}"></div><div class="field"><label>ประเภทสัตว์ *</label>${speciesSelect('species',p.species)}</div><div class="field"><label>สายพันธุ์ / ชนิดย่อย</label><input name="breed" value="${escapeHtml(p.kind||'')}"></div><div class="field"><label>สีและจุดสังเกต *</label><input name="color" required value="${escapeHtml(p.color||'')}"></div><div class="field"><label>พื้นที่อาศัย</label><input name="area" value="${escapeHtml(p.area||'')}"></div><div class="field full-field"><label>หมายเหตุ</label><textarea name="notes">${escapeHtml(p.notes||'')}</textarea></div><div class="field full-field"><label>เลือกเก็บรูปเดิมไว้</label>${images.map((src,i)=>`<label style="display:inline-flex;align-items:center;gap:5px;margin:5px"><img src="${escapeHtml(src)}" alt="รูป ${i+1}" style="width:70px;height:70px;object-fit:cover;border-radius:10px"><input type="checkbox" name="keepPhoto" value="${i}" checked> เก็บ</label>`).join('')}<div class="upload-box"><input type="file" name="photos" accept="image/*" multiple><small>เพิ่มรูปใหม่ได้จนเต็ม 4 รูป</small></div></div></div>${formButtons('บันทึกโปรไฟล์')}</form>`);
}
function facebookPostForm(){
  openDialog('นำโพสต์จากโซเชียลมาให้ AI เทียบ','รองรับ Instagram, TikTok, X, Threads, LINE และ Facebook — ระบบจะค้นหาเคสที่คล้ายกันทันที',`<form id="facebookForm"><div class="form-grid">
    <div class="field"><label>โพสต์นี้เป็นประกาศแบบไหน *</label><select name="type" required><option value="lost">สัตว์หาย / ตามหา</option><option value="found">พบสัตว์ / เจอเบาะแส</option></select></div>
    <div class="field"><label>สัตว์ประเภทไหน *</label>${speciesSelect()}</div>
    <div class="field"><label>ชื่อสัตว์ (ถ้าทราบ)</label><input name="name" placeholder="เช่น โมจิ"></div>
    <div class="field"><label>สายพันธุ์ / ชนิดย่อย</label><input name="breed" placeholder="เช่น ไทยผสม / หงส์หยก"></div>
    <div class="field full-field"><label>ลิงก์โพสต์โซเชียลต้นทาง *</label><input name="sourceLink" type="url" required placeholder="วางลิงก์โพสต์จาก Instagram / TikTok / X / Threads / Facebook / LINE"></div>
    <div class="field"><label>บริเวณในโพสต์</label><input name="area" placeholder="เขต / ย่าน / สถานที่ใกล้เคียง"></div>
    <div class="field"><label>วันที่ / เวลาในโพสต์</label><input name="time" type="datetime-local"></div>
    <div class="field full-field"><label>ลักษณะจากโพสต์ *</label><textarea name="description" required placeholder="สี ลาย ปลอกคอ จุดสังเกต หรือข้อความสำคัญ"></textarea></div>
    ${imageField('อัปโหลดรูปจากโพสต์หรือแคปหน้าจอที่พบ',true)}
  </div><div class="form-note">สามารถนำลิงก์โพสต์และรูปจาก IG, TikTok, X, Threads, LINE หรือ Facebook มาบันทึกเพื่อใช้เทียบความคล้ายกับประกาศในระบบได้ทันที</div>${formButtons('บันทึกโพสต์และจับคู่')}</form>`);bindImagePreview();
}
async function suggestBreedForBlob(blob,speciesHint,form){
  if(!blob||!form?.isConnected)return;
  const note=form.querySelector('.form-note');
  try{
    let sp=Object.hasOwn(speciesLabels,speciesHint)?speciesHint:'';
    let coatTag='';
    if(!sp){
      const sr=await fetch('/api/suggest-species',{method:'POST',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob});
      if(sr.ok){
        const sd=await sr.json();
        if(Object.hasOwn(speciesLabels,sd.suggestions?.[0]?.species))sp=sd.suggestions[0].species;
        if(sd.coat?.primaryTag)coatTag=sd.coat.tags?.join(' · ')||sd.coat.primaryTag;
      }
    }
    if(!form.isConnected||!sp)return;
    const spField=form.elements?.namedItem('species');
    if(spField&&(!spField.value||spField.value==='unknown'))spField.value=sp;
    let breedLabel='';
    if(['cat','dog','bird'].includes(sp)){
      const br=await fetch(`/api/suggest-breed?species=${encodeURIComponent(sp)}`,{method:'POST',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob});
      if(br.ok){
        const bd=await br.json(),top=bd.suggestions?.[0];
        if(bd.coat?.primaryTag)coatTag=bd.coat.tags?.join(' · ')||bd.coat.primaryTag;
        if(top){
          const eng=String(top.name||'').replace(/\b\w/g,c=>c.toUpperCase());
          breedLabel=top.thaiName?`${top.thaiName} (${eng})`:eng;
          form.dataset.suggestedBreed=breedLabel;
          const breedInput=form.elements?.namedItem('breed');
          if(breedInput&&!breedInput.value)breedInput.value=breedLabel;
        }
      }
    }
    if(coatTag){
      form.dataset.suggestedCoat=coatTag;
      const colorInput=form.elements?.namedItem('color');
      if(colorInput&&!colorInput.value)colorInput.value=coatTag;
    }
    if(form.isConnected&&note){
      note.textContent=`🤖 AI วิเคราะห์จากรูปเบื้องต้น: ${speciesName(sp)}${breedLabel?` · พันธุ์ ${breedLabel}`:''}${coatTag?` · 🎨 สี/ลาย: ${coatTag}`:''} (แก้ไขได้)`;
    }
  }catch{}
}
function bindImagePreview(){
  const input=$('input[type=file][name="photo"]',dialog)||$('input[type=file]',dialog);if(!input)return;
  input.addEventListener('change',()=>{const limit=Number(input.dataset.maxPhotos||1),files=[...input.files];input.setCustomValidity(files.length>limit?`เลือกได้ไม่เกิน ${limit} รูป`:'');if(files.length>limit){showToast(`เลือกได้ไม่เกิน ${limit} รูป`);return;}dialog.querySelectorAll('.preview').forEach((img,i)=>{if(img.dataset.previewUrl)URL.revokeObjectURL(img.dataset.previewUrl);const file=files[i];if(!file){img.style.display='none';return;}img.dataset.previewUrl=URL.createObjectURL(file);img.src=img.dataset.previewUrl;img.style.display='block';});const count=dialog.querySelector('[data-query-photo-count]');if(count)count.textContent=files.length?`เลือกแล้ว ${files.length} รูป · ต้องเป็นสัตว์ตัวเดียวกัน`:'เลือกได้ 1–2 รูปของสัตว์ตัวเดียวกัน';const form=input.closest('form');if(files[0]&&form){delete form.dataset.suggestedBreed;delete form.dataset.suggestedCoat;suggestBreedForBlob(files[0],form.elements?.namedItem('species')?.value,form);}});
  const camBtn=dialog.querySelector('[data-camera-trigger]'),camInput=dialog.querySelector('.camera-capture-input');
  if(camBtn&&camInput){
    camBtn.addEventListener('click',()=>camInput.click());
    camInput.addEventListener('change',async()=>{
      const file=camInput.files?.[0];if(!file)return;
      try{
        const dataUrl=await compressedImage(file),form=camBtn.closest('form');
        if(!form)return;
        delete form.dataset.suggestedBreed;delete form.dataset.suggestedCoat;
        form.dataset.profileImages=JSON.stringify([dataUrl]);
        form.dataset.profileImage=dataUrl;
        input.required=false;
        const preview=dialog.querySelector('.preview');
        if(preview){preview.src=dataUrl;preview.style.display='block';}
        const count=dialog.querySelector('[data-query-photo-count]');
        if(count)count.textContent='รับภาพจากกล้องแล้ว 1 รูป · กดสแกนค้นหาได้ทันที';
        suggestBreedForBlob(file,form.elements?.namedItem('species')?.value,form);
      }catch(err){showToast(err.message||'รับภาพจากกล้องไม่สำเร็จ');}finally{camInput.value='';}
    });
  }
  const ocrBtn=dialog.querySelector('[data-ocr-scan]');
  if(ocrBtn){
    ocrBtn.addEventListener('click',async()=>{
      const form=ocrBtn.closest('form');if(!form)return;
      let blob=input.files?.[0]||null;
      if(!blob&&form.dataset.profileImage){try{blob=await fetch(form.dataset.profileImage).then(r=>r.blob());}catch{}}
      if(!blob){showToast('กรุณาเลือกรูปภาพก่อนอ่านข้อความ (OCR)');return;}
      ocrBtn.disabled=true;ocrBtn.textContent='กำลังอ่านข้อความ OCR…';
      try{
        const r=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob});
        const data=await r.json();if(!r.ok)throw new Error(data.error||'อ่านข้อความไม่สำเร็จ');
        const details=form.querySelector('details');if(details)details.open=true;
        const contactInput=form.elements?.namedItem('contact');
        const areaInput=form.elements?.namedItem('area');
        const descInput=form.elements?.namedItem('description');
        const contactAuto=[...(data.phones||[]),...(data.lineIds||[]).map(x=>`LINE: ${x}`)].join(' / ');
        if(contactAuto&&contactInput&&!contactInput.value)contactInput.value=contactAuto;
        if(data.areas?.[0]&&areaInput&&!areaInput.value)areaInput.value=data.areas[0];
        if(data.text&&descInput&&!descInput.value)descInput.value=data.text.slice(0,300);
        if(data.text)form.dataset.ocrText=data.text.slice(0,1500);
        const note=form.querySelector('.form-note');
        if(note){
          note.textContent=data.summary?`🔤 OCR อ่านพบ: ${data.summary} (เติมลงฟอร์มให้อัตโนมัติแล้ว)`:(data.text?`🔤 OCR อ่านข้อความได้: "${data.text.slice(0,120)}"`:'🔤 ไม่พบข้อความหรือเบอร์โทรที่อ่านได้ชัดเจนในภาพนี้');
        }
        showToast(data.summary?`OCR พบ: ${data.summary}`:(data.text?'อ่านข้อความจากภาพสำเร็จ':'ไม่พบข้อความในภาพนี้'));
      }catch(err){showToast(err.message||'อ่านข้อความไม่สำเร็จ');}
      finally{ocrBtn.disabled=false;ocrBtn.textContent='🔤 อ่านเบอร์/ข้อความในภาพ (OCR)';}
    });
  }
  const gpsBtn=dialog.querySelector('[data-gps-fill]');
  if(gpsBtn){
    gpsBtn.addEventListener('click',()=>{
      if(!navigator.geolocation){showToast('อุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS');return;}
      const form=gpsBtn.closest('form');if(!form)return;
      gpsBtn.disabled=true;gpsBtn.textContent='กำลังหา…';
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat=Number(pos.coords.latitude.toFixed(5)),lon=Number(pos.coords.longitude.toFixed(5));
        const latIn=form.elements?.namedItem('lat'),lonIn=form.elements?.namedItem('lon'),areaIn=form.elements?.namedItem('area');
        if(latIn)latIn.value=String(lat);
        if(lonIn)lonIn.value=String(lon);
        if(areaIn&&!areaIn.value.trim())areaIn.value=`พิกัด GPS (${lat}, ${lon})`;
        gpsBtn.disabled=false;gpsBtn.textContent='✓ GPS';
        showToast(`บันทึกพิกัด GPS (${lat}, ${lon}) แล้ว`);
      },()=>{
        gpsBtn.disabled=false;gpsBtn.textContent='📍 GPS';
        showToast('ไม่ได้รับสิทธิ์เข้าถึงพิกัด GPS หรือดึงตำแหน่งไม่สำเร็จ');
      },{enableHighAccuracy:true,timeout:10000});
    });
  }
  dialog.querySelectorAll('[data-sample-photo]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      try{
        const res=await fetch(btn.dataset.samplePhoto),blob=await res.blob(),file=new File([blob],'sample.jpg',{type:blob.type||'image/jpeg'});
        const dataUrl=await compressedImage(file),form=btn.closest('form');
        if(!form)return;
        delete form.dataset.suggestedBreed;delete form.dataset.suggestedCoat;
        form.dataset.profileImages=JSON.stringify([dataUrl]);
        form.dataset.profileImage=dataUrl;
        input.required=false;
        const preview=dialog.querySelector('.preview');
        if(preview){preview.src=dataUrl;preview.style.display='block';}
        const spField=form.elements?.namedItem('species');
        if(spField&&btn.dataset.sampleSpecies)spField.value=btn.dataset.sampleSpecies;
        const nameField=form.elements?.namedItem('name');
        if(nameField&&!nameField.value&&btn.dataset.sampleName)nameField.value=btn.dataset.sampleName;
        const count=dialog.querySelector('[data-query-photo-count]');
        if(count)count.textContent=`เลือกรูปตัวอย่าง: ${btn.dataset.sampleName}`;
        suggestBreedForBlob(blob,btn.dataset.sampleSpecies,form);
      }catch{}
    });
  });
}
async function compressedImage(file){
  if(!file)return '';
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      try{
        const scale=Math.min(1,700/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const context=canvas.getContext('2d');if(!context)throw new Error('เบราว์เซอร์เปิดพื้นที่ประมวลผลรูปไม่ได้');
        context.drawImage(img,0,0,canvas.width,canvas.height);const result=canvas.toDataURL('image/jpeg',.72);URL.revokeObjectURL(url);resolve(result);
      }catch(error){URL.revokeObjectURL(url);reject(new Error(`ประมวลผลรูปไม่สำเร็จ: ${error.message}`));}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ กรุณาเลือกรูปภาพไฟล์อื่น'));};
    img.src=url;
  });
}
function buildShareCaption(item,contactOverride='',rewardOverride=''){
  const title=item.type==='lost'?`🐾 ช่วยตามหา${speciesName(item.species)}${item.name&&item.name!=='ยังไม่ระบุชื่อ'?`ชื่อ “${item.name}”`:''}`:`📍 พบ${speciesName(item.species)}ที่อาจพลัดหลง`;
  const contact=String(contactOverride||item.contact||'').trim();
  const reward=String(rewardOverride||item.reward||'').trim();
  return [title,item.kind?`สายพันธุ์/สี: ${item.kind}`:'',item.description||'',reward?`🏆 ${reward}`:'',item.area?`📍 บริเวณ: ${item.area}`:'',item.when&&item.when!=='ไม่ระบุเวลา'?`🕒 เวลาที่หาย/พบ: ${item.when}`:'',contact?`☎️ ติดต่อ: ${contact}`:'','',`หากพบเห็นหรือมีเบาะแส กรุณาคอมเมนต์หรือส่งข้อความถึงผู้โพสต์${contact?' และช่วยแชร์ต่อ':' และช่วยแชร์ต่อเพื่อให้น้องได้กลับบ้าน'}`].filter(Boolean).join('\n');
}
function shareCase(item=state.cases.find(x=>x.id==='tungthong')){
  const text=buildShareCaption(item);
  const identity=item.name&&item.name!=='ยังไม่ระบุชื่อ'?` · ${speciesName(item.species)} “${item.name}”`:` · ${speciesName(item.species)}`;
  const nextAction=item.species==='unknown'?`<button class="btn btn-dark" data-action="identifycase" data-id="${escapeHtml(item.id)}">ระบุชนิดแล้วให้ AI เทียบ</button>`:`<button class="btn btn-dark" data-action="match" data-id="${escapeHtml(item.id)}">หาเคสคล้ายด้วย AI</button>`;
  openDialog('ตัวอย่างข้อความประกาศ',`ระบบร่างจากรูปและข้อมูลที่มี${identity}`, `<div class="fb-post-preview"><div class="fb-post-head"><span class="fb-avatar">🐾</span><span><b>ประกาศจาก Pawtal (พอลทัล)</b><small>ตัวอย่างโพสต์ · นำไปแชร์ต่อได้ทันที</small></span></div><p id="sharePreviewText">${escapeHtml(text).replaceAll('\n','<br>')}</p><img src="${escapeHtml(item.image||'assets/hero-pets.png')}" alt="รูป ${escapeHtml(item.name)}"><div class="fb-post-actions"><span>♡ ถูกใจ</span><span>☏ แสดงความคิดเห็น</span><span>↗ แชร์</span></div></div><div class="field"><label>แก้ข้อความก่อนคัดลอกได้</label><textarea id="shareText">${escapeHtml(text)}</textarea></div><div class="form-note">คัดลอกข้อความหรือสร้างโปสเตอร์พร้อม QR Code เพื่อนำไปแชร์ใน Facebook, LINE หรือพิมพ์ติดในชุมชนได้เลย</div><div class="form-actions"><button class="btn btn-soft-green" data-action="copyshare">คัดลอกข้อความ</button><button class="btn btn-lime" data-action="poster" data-id="${escapeHtml(item.id)}">🖼️ สร้างโปสเตอร์ QR</button><button class="btn btn-light" data-action="downloadphoto" data-id="${escapeHtml(item.id)}">ดาวน์โหลดรูป</button>${nextAction}</div>`);
  $('#shareText').addEventListener('input',e=>{$('#sharePreviewText').innerHTML=escapeHtml(e.target.value).replaceAll('\n','<br>');});
}
async function openPosterModal(item){
  const activeCases=state.cases.filter(x=>x.status!=='resolved'&&x.image);
  let currentItem=item||activeCases[0]||state.cases[0];
  if(!currentItem){showToast('ยังไม่มีประกาศสำหรับสร้างโปสเตอร์');return;}
  let currentTheme=currentItem.type==='found'?'found':'urgent';
  let currentMode='social';
  const caseOptions=(activeCases.length?activeCases:state.cases).slice(0,25).map(c=>`<option value="${escapeHtml(c.id)}" ${c.id===currentItem.id?'selected':''}>${speciesIcon(c.species)} ${escapeHtml(c.name)} (${escapeHtml(c.area||typeLabel(c.type))})</option>`).join('');
  openDialog('สตูดิโอโปสเตอร์ประกาศพร้อม QR Code',`${currentItem.name} · เลือกโหมดโซเชียลโปร่งแสง หรือ A4 สำหรับพิมพ์ติดพื้นที่ได้ทันที`,`<div class="poster-studio-layout">
    <div class="poster-studio-preview">
      <canvas id="petPosterCanvas" class="poster-preview-canvas" width="1080" height="1350"></canvas>
      <div class="form-note" id="posterMetaNote" style="margin:8px 0 0;width:100%">กำลังเรนเดอร์โปสเตอร์และสร้าง QR Code…</div>
    </div>
    <div class="poster-studio-panel">
      <div class="poster-studio-controls" style="margin-bottom:10px">
        <div class="field full-field"><label>เลือกประกาศที่จะทำโปสเตอร์</label><select id="posterCaseSelect">${caseOptions}</select></div>
        <div class="poster-mode-row" role="group" aria-label="เลือกขนาดโปสเตอร์">
          <button type="button" class="poster-mode-btn active" data-poster-mode="social">📱 โซเชียล 4:5 (โปร่งแสง)</button>
          <button type="button" class="poster-mode-btn" data-poster-mode="a4">🖨️ พิมพ์ A4 (ประหยัดหมึก)</button>
        </div>
        <div class="poster-theme-row" role="group" aria-label="เลือกธีมสีโปสเตอร์">
          <button type="button" class="poster-theme-btn ${currentTheme==='urgent'?'active':''}" data-poster-theme="urgent">🔴 เร่งด่วน</button>
          <button type="button" class="poster-theme-btn ${currentTheme==='pawtal'?'active':''}" data-poster-theme="pawtal">💛 ธีม Pawtal</button>
          <button type="button" class="poster-theme-btn ${currentTheme==='found'?'active':''}" data-poster-theme="found">🟢 พบสัตว์</button>
        </div>
        <div class="form-grid" style="margin-top:8px">
          <div class="field"><label>📞 เบอร์โทร / LINE (ตัวใหญ่พิเศษ)</label><input id="posterContactInput" value="${escapeHtml(currentItem.contact||'')}" placeholder="เช่น 081-234-5678"></div>
          <div class="field"><label>📋 เพศ / อายุ / ทำหมัน</label><input id="posterMetaInput" value="${escapeHtml(currentItem.petMeta||'')}" placeholder="เช่น เพศผู้ · 2 ปี · ทำหมันแล้ว"></div>
          <div class="field full-field"><label>⚠️ พฤติกรรม / คำเตือนเมื่อพบเห็น</label>
            <input id="posterBehaviorInput" placeholder="เช่น ⚠️ ขี้กลัว · ห้ามวิ่งไล่ หรือ ✅ เป็นมิตร · เรียกชื่อได้">
            <div class="poster-preset-row" id="posterBehaviorPresets">
              <button type="button" class="poster-preset-chip" data-behavior-preset="⚠️ ขี้กลัว · ห้ามวิ่งไล่">⚠️ ขี้กลัว ห้ามวิ่งไล่</button>
              <button type="button" class="poster-preset-chip" data-behavior-preset="✅ เป็นมิตร · เรียกชื่อได้">✅ เป็นมิตร เรียกชื่อได้</button>
              <button type="button" class="poster-preset-chip" data-behavior-preset="⚡ ตกใจง่าย · อย่าจับแรง">⚡ ตกใจง่าย</button>
              <button type="button" class="poster-preset-chip" data-behavior-preset="🍖 ใช้ขนม/อาหารล่อได้">🍖 ใช้ขนมล่อได้</button>
              <button type="button" class="poster-preset-chip" data-behavior-preset="">✕ ไม่แสดง</button>
            </div>
          </div>
          <div class="field full-field"><label>🏆 สินน้ำใจ / ข้อความเน้น (ไม่บังคับ)</label>
            <input id="posterRewardInput" value="${escapeHtml(currentItem.reward||'')}" placeholder="เช่น มีสินน้ำใจให้ผู้พบเห็น">
            <small class="poster-safety-tip">🛡️ แนะนำให้ใส่ “มีสินน้ำใจให้ผู้พบเห็น” แทนตัวเลขสูงๆ เพื่อป้องกันมิจฉาชีพโทรหลอก</small>
          </div>
        </div>
      </div>
      <div class="poster-studio-actions">
        <button type="button" class="btn btn-dark" id="downloadPosterBtn" disabled>⬇️ ดาวน์โหลดโปสเตอร์ (.png)</button>
        <button type="button" class="btn btn-soft-green" id="copyPosterCaptionBtn">📋 คัดลอกข้อความโพสต์แชร์</button>
        <button type="button" class="btn btn-light" id="copyCaseUrlBtn">🔗 คัดลอกลิงก์ QR</button>
        <button type="button" class="btn btn-light" data-close>ปิด</button>
      </div>
    </div>
  </div>`);
  dialog.classList.add('poster-wide-dialog');
  try{
    const [mod,statusRes]=await Promise.all([posterModule,fetch('/api/status').then(r=>r.json()).catch(()=>({}))]);
    if(!mod)throw new Error('โหลดตัวสร้างโปสเตอร์ไม่สำเร็จ');
    const publicBaseUrl=statusRes?.publicBaseUrl||'';
    const canvas=$('#petPosterCanvas'),note=$('#posterMetaNote'),dlBtn=$('#downloadPosterBtn'),copyBtn=$('#copyCaseUrlBtn'),capBtn=$('#copyPosterCaptionBtn');
    const caseSel=$('#posterCaseSelect'),contactIn=$('#posterContactInput'),rewardIn=$('#posterRewardInput'),metaIn=$('#posterMetaInput'),behaviorIn=$('#posterBehaviorInput');
    if(!canvas)return;
    const syncBehaviorDefault=c=>{
      if(!behaviorIn)return;
      behaviorIn.value=mod.inferBehaviorBadge?.(c)?.text||'';
    };
    syncBehaviorDefault(currentItem);
    let latestUrl='',renderSeq=0,debounceId=null;
    const draw=async()=>{
      const seq=++renderSeq;
      const {caseUrl,qrVersion,mode,isPublicFallback}=await mod.renderPetPosterCanvas(
        {...currentItem,breed:currentItem.kind||'',color:currentItem.color||''},
        {canvas,theme:currentTheme,mode:currentMode,publicBaseUrl,contact:contactIn?.value||'',reward:rewardIn?.value||'',petMeta:metaIn?.value||'',behavior:behaviorIn?.value||''}
      );
      if(seq!==renderSeq||!canvas.isConnected)return;
      latestUrl=caseUrl;
      const modeLabel=mode==='a4'?'A4 แนวตั้งสำหรับพิมพ์ (1240×1754 px · ประหยัดหมึก)':'โซเชียล 4:5 กระจกฝ้าโปร่งแสง (1080×1350 px)';
      const fallbackHint=isPublicFallback?' <span style="color:#786a82">(ใช้ URL เว็บสาธารณะแทน 127.0.0.1 เพื่อให้สแกนได้จริง)</span>':'';
      if(note)note.innerHTML=`<b>พร้อมใช้งาน · โหมด ${modeLabel}</b><br>ลิงก์ใน QR Code (ISO v${qrVersion}): <code>${escapeHtml(caseUrl)}</code>${fallbackHint}`;
      if(dlBtn){dlBtn.disabled=false;dlBtn.textContent=mode==='a4'?'⬇️ ดาวน์โหลดไฟล์ A4 (.png)':'⬇️ ดาวน์โหลดโปสเตอร์ (.png)';}
    };
    const scheduleDraw=()=>{clearTimeout(debounceId);debounceId=setTimeout(draw,120);};
    dialog.querySelectorAll('[data-poster-mode]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentMode=btn.dataset.posterMode;
        dialog.querySelectorAll('[data-poster-mode]').forEach(b=>b.classList.toggle('active',b===btn));
        draw();
      });
    });
    dialog.querySelectorAll('[data-poster-theme]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentTheme=btn.dataset.posterTheme;
        dialog.querySelectorAll('[data-poster-theme]').forEach(b=>b.classList.toggle('active',b===btn));
        draw();
      });
    });
    dialog.querySelectorAll('[data-behavior-preset]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(behaviorIn){behaviorIn.value=btn.dataset.behaviorPreset||'';draw();}
      });
    });
    caseSel?.addEventListener('change',()=>{
      const picked=state.cases.find(x=>x.id===caseSel.value);
      if(!picked)return;
      currentItem=picked;
      currentTheme=picked.type==='found'?'found':'urgent';
      dialog.querySelectorAll('[data-poster-theme]').forEach(b=>b.classList.toggle('active',b.dataset.posterTheme===currentTheme));
      if(contactIn)contactIn.value=picked.contact||'';
      if(rewardIn)rewardIn.value=picked.reward||'';
      if(metaIn)metaIn.value=picked.petMeta||'';
      syncBehaviorDefault(picked);
      $('#dialogHint').textContent=`${picked.name} · เลือกโหมดโซเชียลโปร่งแสง หรือ A4 สำหรับพิมพ์ติดพื้นที่ได้ทันที`;
      draw();
    });
    [contactIn,rewardIn,metaIn,behaviorIn].forEach(el=>el?.addEventListener('input',scheduleDraw));
    if(dlBtn){
      dlBtn.onclick=()=>{
        const safeId=String(currentItem.id||'pet').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)||'pet';
        const a=document.createElement('a');
        a.download=`pawtal-poster-${safeId}-${currentMode}.png`;
        a.href=canvas.toDataURL('image/png');
        a.click();
        showToast(currentMode==='a4'?'ดาวน์โหลดโปสเตอร์ A4 สำหรับพิมพ์แล้ว':'ดาวน์โหลดโปสเตอร์ QR (.png) แล้ว พร้อมแชร์ได้ทันที');
      };
    }
    if(capBtn){
      capBtn.onclick=async()=>{
        const extra=[metaIn?.value?.trim()?`📋 ข้อมูลน้อง: ${metaIn.value.trim()}`:'',behaviorIn?.value?.trim()?`คำแนะนำเมื่อพบเห็น: ${behaviorIn.value.trim()}`:''].filter(Boolean).join('\n');
        const caption=`${buildShareCaption(currentItem,contactIn?.value||'',rewardIn?.value||'')}${extra?`\n${extra}`:''}\n\n🔗 แจ้งเบาะแสโดยตรง: ${latestUrl}`;
        try{await navigator.clipboard.writeText(caption);showToast('คัดลอกข้อความประกาศพร้อมลิงก์แจ้งเบาะแสแล้ว');}
        catch{shareCase(currentItem);}
      };
    }
    if(copyBtn){
      copyBtn.onclick=async()=>{
        try{await navigator.clipboard.writeText(latestUrl);showToast('คัดลอกลิงก์แจ้งเบาะแสแล้ว');}
        catch{showToast(latestUrl);}
      };
    }
    await draw();
  }catch(err){showToast(err.message||'สร้างโปสเตอร์ไม่สำเร็จ');}
}
function identifyCaseForm(item){
  openDialog('เติมข้อมูลก่อนให้ AI จับคู่','ระบุชนิดสัตว์ก่อน เพื่อเทียบกับเคสที่ถูกประเภท',`<form id="identifyCaseForm" data-id="${escapeHtml(item.id)}"><div class="form-grid"><div class="field"><label>ประเภทสัตว์ *</label><select name="species" required><option value="" selected disabled>เลือกประเภทสัตว์</option><option value="dog">สุนัข</option><option value="cat">แมว</option><option value="bird">นก</option><option value="rabbit">กระต่าย</option><option value="hamster">แฮมสเตอร์</option></select></div><div class="field"><label>บริเวณที่หาย (ถ้าทราบ)</label><input name="area" placeholder="เขต / ย่าน"></div><div class="field full-field"><label>ชื่อ (ถ้าต้องการ)</label><input name="name" placeholder="ชื่อเล่นน้อง"></div></div><div id="speciesSuggestion" class="form-note" role="status" aria-live="polite">AI กำลังช่วยดูชนิดสัตว์ในรูป… คุณเลือกเองได้ทันที</div><div class="form-note">ตรวจสอบชนิดก่อนค้นหา ระบบรองรับแมว สุนัข นก กระต่าย และแฮมสเตอร์</div>${formButtons('บันทึกและหาเคสคล้าย')}</form>`);
  suggestCaseSpecies(item,$('#identifyCaseForm'));
}
async function copyShare(){const text=$('#shareText')?.value||'';try{await navigator.clipboard.writeText(text);showToast('คัดลอกแล้ว นำไปวางในโพสต์ Facebook ได้เลย');}catch{const area=$('#shareText');area?.select();document.execCommand('copy');showToast('คัดลอกแล้ว นำไปวางในโพสต์ Facebook ได้เลย');}}
function exportBackup(){
  const backup={format:'tamnong-backup',version:1,exportedAt:new Date().toISOString(),cases:state.cases,profiles:state.profiles,sightings:state.sightings};
  const blob=new Blob([JSON.stringify(backup)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=`tamnong-backup-${new Date().toISOString().slice(0,10)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('ดาวน์โหลดไฟล์สำรองแล้ว เก็บไว้ในที่ปลอดภัย');
}
function cleanBackupImage(value){
  if(typeof value!=='string')return '';
  if(/^assets\/[a-zA-Z0-9._/-]+$/.test(value)&&!value.includes('..'))return value;
  if(value.length<=5_000_000&&/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value))return value;
  return safeExternalUrl(value);
}
function cleanBackupText(value,max=1000){return typeof value==='string'?value.slice(0,max):'';}
function persistBackupBundle(bundle){
  const keys=Object.keys(bundle),previous=new Map(keys.map(key=>[key,localStorage.getItem(STORE+':'+key)]));
  try{for(const key of keys)localStorage.setItem(STORE+':'+key,JSON.stringify(bundle[key]));return true;}
  catch{for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(STORE+':'+key);else localStorage.setItem(STORE+':'+key,value);}catch{}}return false;}
}
async function importBackup(file){
  if(!file)return;
  if(file.size>25_000_000){showToast('ไฟล์สำรองใหญ่เกินไป (จำกัด 25 MB)');return;}
  try{
    const backup=JSON.parse(await file.text());
    if(backup?.format!=='tamnong-backup'||backup.version!==1||!Array.isArray(backup.cases)||!Array.isArray(backup.profiles)||!Array.isArray(backup.sightings))throw new Error('รูปแบบไฟล์ไม่ใช่ข้อมูลสำรองของตามน้อง');
    const species=['dog','cat','bird','rabbit','hamster','unknown'];
    const cases=backup.cases.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'&&['lost','found'].includes(x.type)&&species.includes(x.species)&&cleanBackupImage(x.image)).map(x=>({id:cleanBackupText(x.id,100),type:x.type,species:x.species,name:cleanBackupText(x.name,120)||'ยังไม่ระบุชื่อ',kind:cleanBackupText(x.kind,200),area:cleanBackupText(x.area,200),when:cleanBackupText(x.when,100),description:cleanBackupText(x.description,1500),contact:cleanBackupText(x.contact,200),image:cleanBackupImage(x.image),images:[...new Set([cleanBackupImage(x.image),...(Array.isArray(x.images)?x.images.slice(0,2).map(cleanBackupImage):[])].filter(Boolean))].slice(0,2),status:x.status==='resolved'?'resolved':'active',sourceLink:safeExternalUrl(x.sourceLink||''),origin:cleanBackupText(x.origin,80),position:'center',updated:cleanBackupText(x.updated,100),createdAt:cleanBackupText(x.createdAt,40),favorite:x.favorite===true,isDemo:initialCases.some(item=>item.id===x.id),followupNote:cleanBackupText(x.followupNote,3000)}));
    const profiles=backup.profiles.filter(x=>x&&typeof x==='object'&&typeof x.name==='string'&&species.includes(x.species)).map(x=>{const images=[...new Set([cleanBackupImage(x.image),...(Array.isArray(x.images)?x.images.slice(0,4).map(cleanBackupImage):[])].filter(Boolean))].slice(0,4);return {name:cleanBackupText(x.name,120),species:x.species,kind:cleanBackupText(x.kind,200),color:cleanBackupText(x.color,200),notes:cleanBackupText(x.notes,1500),area:cleanBackupText(x.area,200),image:images[0]||'',images};});
    const sightings=backup.sightings.filter(x=>x&&typeof x==='object'&&typeof x.title==='string').map(x=>({caseId:cleanBackupText(x.caseId,100),title:cleanBackupText(x.title,500),info:cleanBackupText(x.info,300),area:cleanBackupText(x.area,300),image:cleanBackupImage(x.image),sourceLink:safeExternalUrl(x.sourceLink||''),id:cleanBackupText(x.id,100),matchKey:cleanBackupText(x.matchKey,1000),status:Object.hasOwn(clueStatuses,x.status)?x.status:'pending',note:cleanBackupText(x.note,3000),createdAt:cleanBackupText(x.createdAt,40),reviewedAt:cleanBackupText(x.reviewedAt,40)}));
    const mergedCases=[...new Map([...state.cases,...cases].map(item=>[item.id,item])).values()],unique=items=>[...new Map(items.map(item=>[JSON.stringify(item),item])).values()],mergedProfiles=unique([...state.profiles,...profiles]),mergedSightings=mergeClues([...state.sightings,...sightings]);
    if(!persistBackupBundle({cases:mergedCases,profiles:mergedProfiles,sightings:mergedSightings})){showToast('กู้คืนไม่สำเร็จ พื้นที่จัดเก็บในเบราว์เซอร์เต็ม');return;}
    state.cases=mergedCases;state.profiles=mergedProfiles;state.sightings=mergedSightings;renderCases();renderProfiles();renderSightings();
    showToast(`กู้คืนแล้ว ${cases.length} เคส · ${profiles.length} โปรไฟล์ · ${sightings.length} เบาะแส`);
  }catch(error){showToast(error.message||'อ่านไฟล์สำรองไม่สำเร็จ');}
}
async function downloadCasePhoto(id){const item=state.cases.find(x=>x.id===id);if(!item?.image){showToast('เคสนี้ไม่มีรูปให้ดาวน์โหลด');return;}try{const response=await fetch(item.image),blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a'),ext=blob.type.includes('png')?'png':'jpg';a.href=url;a.download=`tamnong-${item.id}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);showToast('ดาวน์โหลดรูปแล้ว แนบรูปนี้ตอนโพสต์ Facebook');}catch{showToast('ดาวน์โหลดรูปไม่สำเร็จ');}}
function socialBadgeInfo(url,origin=''){
  const u=String(url||'').toLowerCase(),o=String(origin||'');
  if(u.includes('instagram.com')||u.includes('instagr.am')||o.includes('Instagram'))return {id:'instagram',badge:'📸 Instagram',cls:'social-tag-ig'};
  if(u.includes('tiktok.com')||o.includes('TikTok'))return {id:'tiktok',badge:'🎵 TikTok',cls:'social-tag-tt'};
  if(u.includes('x.com/')||u.includes('twitter.com')||o.includes('X (Twitter)')||o.startsWith('𝕏'))return {id:'x',badge:'𝕏 X',cls:'social-tag-x'};
  if(u.includes('threads.net')||u.includes('threads.com')||o.includes('Threads'))return {id:'threads',badge:'🧵 Threads',cls:'social-tag-th'};
  if(u.includes('line.me')||u.includes('lin.ee')||o.includes('LINE'))return {id:'line',badge:'💚 LINE',cls:'social-tag-line'};
  if(u.includes('facebook.com')||u.includes('fb.com')||u.includes('fb.watch')||o.includes('Facebook'))return {id:'facebook',badge:'📘 Facebook',cls:'fb-match-tag'};
  if(u)return {id:'web',badge:'🌐 โพสต์ภายนอก',cls:'social-tag-web'};
  return null;
}
function detail(item){
  const safeSrc=safeExternalUrl(item.sourceLink||'');
  const sb=safeSrc||item.origin?socialBadgeInfo(safeSrc,item.origin):null;
  const sourceFact=safeSrc?`<a class="detail-source-link" href="${escapeHtml(safeSrc)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sb?sb.badge:'🔗 โพสต์ต้นทาง')} · เปิดโพสต์ต้นทาง ↗</a>`:(sb&&item.origin?`<span>${escapeHtml(sb.badge)}</span>`:'');
  const photoToolsHtml=`<div class="detail-ai-tools"><span>เครื่องมือวิเคราะห์รูปนี้:</span>${['cat','dog','bird'].includes(item.species)?`<button type="button" class="ai-tool-chip" data-breed-suggest="${escapeHtml(item.id)}">🧬 ดูสายพันธุ์ &amp; สีขน</button>`:''}<button type="button" class="ai-tool-chip" data-action="ocr" data-id="${escapeHtml(item.id)}">🔤 อ่านเบอร์/ป้าย (OCR)</button><button type="button" class="ai-tool-chip" data-action="publicsearch" data-id="${escapeHtml(item.id)}">🔗 ค้นข้าม IG / X / FB</button></div>`;
  openDialog(item.name,`${speciesName(item.species)} · ${typeLabel(item.type)} · ${item.kind||''}`,`<img class="detail-img" src="${escapeHtml(item.image)}" style="object-position:${escapeHtml(item.position||'center')}" alt="${escapeHtml(item.name)}"><div class="detail-facts"><span>📍 ${escapeHtml(item.area||'ยังไม่ระบุบริเวณ')}</span><span>🕒 ${escapeHtml(item.when)}</span>${item.hasOwnerPin?'<span>🔒 ป้องกันด้วยรหัส PIN เจ้าของ</span>':''}${sourceFact}</div>${photoToolsHtml}<p style="font-size:13px;line-height:1.7;color:#4a554c">${escapeHtml(item.description||'ยังไม่มีรายละเอียดเพิ่มเติม')}</p>${item.contact?`<div class="form-note"><b>ช่องทางติดต่อเจ้าของประกาศ</b><br>${escapeHtml(item.contact)}</div>`:''}${caseSightings(item)}<div class="detail-primary-actions"><button class="btn btn-dark" data-action="match" data-id="${escapeHtml(item.id)}">✦ หาเคสคล้าย (AI)</button><button class="btn btn-soft-green" data-action="sighting" data-id="${escapeHtml(item.id)}">＋ ส่งเบาะแสที่พบ</button><button class="btn btn-lime" data-action="poster" data-id="${escapeHtml(item.id)}">🖼️ โปสเตอร์ QR &amp; แชร์</button></div><details class="optional-fields" style="margin-top:10px"><summary>⚙️ สำหรับเจ้าของประกาศ (แก้ไข / กลับบ้านแล้ว / บันทึกติดตาม / ลบ)</summary><div class="form-actions" style="margin-top:8px"><button class="btn btn-light" data-action="editcase" data-id="${escapeHtml(item.id)}">✎ แก้ไขข้อมูล</button><button class="btn btn-light" data-action="resolve" data-id="${escapeHtml(item.id)}">${item.status==='resolved'?'เปิดเคสอีกครั้ง':'✓ ปิดเคส (กลับบ้านแล้ว)'}</button><button class="btn btn-light" data-case-favorite="${escapeHtml(item.id)}">${item.favorite?'★ เอาออกจากเคสโปรด':'☆ เก็บเป็นเคสโปรด'}</button><button class="btn btn-light" data-case-notes="${escapeHtml(item.id)}">📝 บันทึกการติดตาม</button><button class="btn btn-light" data-action="share" data-id="${escapeHtml(item.id)}">↗ แก้ข้อความโพสต์แชร์</button>${item.isDemo?'':`<button class="btn btn-light" data-action="deletecase" data-id="${escapeHtml(item.id)}" style="color:#a33945;border-color:#efc2cb">🗑️ ลบประกาศ</button>`}</div></details>`);
}
async function openOcrModal(item){
  if(!item?.image){showToast('เคสนี้ไม่มีรูปให้สแกน OCR');return;}
  openDialog('อ่านข้อความ / ป้ายชื่อ / เบอร์โทรในภาพ (OCR)',`${item.name} · Tesseract OCR (ไทย + อังกฤษ)`,`<div class="match-loading"><span class="spinner"></span><b>กำลังสแกนข้อความในภาพ…</b><small>ครั้งแรกอาจโหลดชุดภาษาไทยเพิ่มเติมสักครู่</small></div>`);
  try{
    const blob=await fetch(item.image).then(r=>r.blob());
    const r=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob});
    const data=await r.json();if(!r.ok)throw new Error(data.error||'สแกน OCR ไม่สำเร็จ');
    openDialog('ผลอ่านข้อความจากภาพ (OCR)',`${item.name} · ภาษา: ${data.lang} · ความมั่นใจ ~${data.confidence}%`,`<img class="detail-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"><div class="form-note"><b>สรุปเบาะแสที่ดึงได้อัตโนมัติ:</b><br>• เบอร์โทร: ${data.phones?.length?escapeHtml(data.phones.join(', ')):'ไม่พบ'}<br>• LINE ID: ${data.lineIds?.length?escapeHtml(data.lineIds.join(', ')):'ไม่พบ'}<br>• พื้นที่ที่ตรงคำสำคัญ: ${data.areas?.length?escapeHtml(data.areas.join(', ')):'ไม่พบ'}${data.hints?.length?`<br>• คีย์เวิร์ด: ${escapeHtml(data.hints.join(' · '))}`:''}</div><div class="field"><label>ข้อความทั้งหมดที่อ่านได้</label><textarea readonly>${escapeHtml(data.text||'ไม่พบข้อความที่ชัดเจนในภาพนี้')}</textarea></div><div class="form-actions"><button class="btn btn-light" data-action="detail" data-id="${escapeHtml(item.id)}">← กลับหน้ารายละเอียด</button><button class="btn btn-dark" data-close>ปิด</button></div>`);
  }catch(err){openDialog('อ่านข้อความ (OCR) ไม่สำเร็จ',item.name,`<div class="form-note">${escapeHtml(err.message)}</div><button class="btn btn-dark" data-close>ปิด</button>`);}
}
function requireOwnerPin(item,actionLabel,onVerified){
  if(!item?.hasOwnerPin){onVerified('');return;}
  openDialog('ยืนยันรหัส PIN เจ้าของประกาศ',`กรอกรหัส PIN 4–6 หลักก่อน${actionLabel}ประกาศ “${item.name}”`,`<form id="verifyPinForm"><div class="field"><label>รหัส PIN เจ้าของประกาศ *</label><input name="pin" type="password" inputmode="numeric" pattern="\\d{4,6}" maxlength="6" required autocomplete="off" placeholder="กรอกตัวเลข 4–6 หลัก"></div><div id="verifyPinError" class="form-note" hidden style="color:#a33945;background:#fff1f2"></div>${formButtons('ยืนยันรหัส PIN')}</form>`);
  const f=$('#verifyPinForm');
  f?.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const pin=String(new FormData(f).get('pin')||'').trim();
    const errEl=$('#verifyPinError');
    try{
      const r=await fetch(`/api/cases/${encodeURIComponent(item.id)}/verify-pin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
      const json=await r.json().catch(()=>({}));
      if(!r.ok||!json.ok){if(errEl){errEl.textContent=json.error||'รหัส PIN ไม่ถูกต้อง';errEl.hidden=false;}return;}
      onVerified(pin);
    }catch{if(errEl){errEl.textContent='ตรวจสอบรหัส PIN ไม่สำเร็จ กรุณาลองใหม่';errEl.hidden=false;}}
  });
}
function editCaseForm(item,verifiedPin=''){
  openDialog('เติมข้อมูลเคสภายหลัง','ข้อมูลทุกช่องเป็นตัวเลือก สามารถบันทึกเฉพาะสิ่งที่ทราบ',`<form id="editCaseForm" data-id="${escapeHtml(item.id)}" data-pin="${escapeHtml(verifiedPin)}"><div class="form-grid"><div class="field"><label>ชนิดสัตว์</label>${speciesSelect('species',item.species||'unknown',false,true)}</div><div class="field"><label>ชื่อ / หัวข้อ</label><input name="name" value="${escapeHtml(item.name==='ยังไม่ระบุชื่อ'?'':item.name)}" placeholder="ชื่อเล่นหรือหัวข้อสั้น ๆ"></div><div class="field"><label>สายพันธุ์ / สี</label><input name="kind" value="${escapeHtml(item.kind||'')}" placeholder="เช่น ส้มขาว ปลอกคอเขียว"></div><div class="field"><label>บริเวณ</label><input name="area" value="${escapeHtml(item.area||'')}" placeholder="เขต / ย่าน / สถานที่"></div><div class="field"><label>เวลา</label><input name="when" value="${escapeHtml(item.when==='ไม่ระบุเวลา'?'':item.when)}" placeholder="เช่น วันนี้ประมาณ 10 โมง"></div><div class="field"><label>ช่องทางติดต่อ</label><input name="contact" value="${escapeHtml(item.contact||'')}" placeholder="เบอร์โทรหรือ Line (ถ้าสะดวก)"></div><div class="field full-field"><label>รายละเอียดเพิ่มเติม</label><textarea name="description" placeholder="จุดสังเกตหรือข้อมูลที่ทราบ">${escapeHtml(item.description||'')}</textarea></div></div><div class="form-note">ข้อมูลจะถูกบันทึกอัตโนมัติ และสามารถกลับมาแก้ไขได้ภายหลัง</div>${formButtons('บันทึกข้อมูล')}</form>`);
}
function caseSightings(item){
  const records=state.sightings.filter(s=>s.caseId===item.id);
  return `<section class="case-sightings"><h4>เบาะแสของเคสนี้ (${records.length})</h4>${records.length?records.map(s=>`<article class="saved-clue">${s.image?`<img src="${escapeHtml(s.image)}" alt="รูปเบาะแส">`:''}<div><b>${escapeHtml(s.title)}</b><p>${escapeHtml(s.info)}</p>${clueActions(s,state.sightings.indexOf(s))}${s.sourceLink?`<a href="${escapeHtml(safeExternalUrl(s.sourceLink))}" target="_blank" rel="noopener noreferrer">เปิดโพสต์ต้นทาง ↗</a>`:''}</div></article>`).join(''):'<p>ยังไม่มีเบาะแสที่ส่งให้เคสนี้</p>'}</section>`;
}
async function toggleResolved(item,verifiedPin=''){
  const nextStatus=item.status==='resolved'?'active':'resolved';
  if(!item.isDemo&&typeof fetch==='function'){
    try{
      const headers={'Content-Type':'application/json',...(verifiedPin?{'X-Owner-Pin':verifiedPin}:{})};
      const r=await fetch(`/api/cases/${encodeURIComponent(item.id)}`,{method:'PATCH',headers,body:JSON.stringify({status:nextStatus})});
      if(r.status===403){showToast('รหัส PIN เจ้าของประกาศไม่ถูกต้อง');return;}
    }catch{}
  }
  item.status=nextStatus;item.updated=item.status==='resolved'?'ปิดเคสแล้ว · พบเจ้าของ/กลับบ้านแล้ว':'เปิดเคสอีกครั้ง';
  const persisted=save('cases',state.cases);renderCases();closeDialog();showToast(persisted?item.updated:'เปลี่ยนสถานะในหน้านี้แล้ว แต่พื้นที่เก็บข้อมูลเต็ม');
}
function startFromProfile(index){
  const profile=state.profiles[index];if(!profile)return;
  lostPhotoOnlyForm(profile.species);
  const form=$('#lostPhotoOnlyForm');
  for(const [name,value] of Object.entries({name:profile.name,area:profile.area,description:[profile.kind,profile.color,profile.notes].filter(Boolean).join(' · ')})){const field=form.elements.namedItem(name);if(field)field.value=value||'';}
  const details=form.querySelector('details');if(details)details.open=true;
  const photos=[...new Set([profile.image,...(Array.isArray(profile.images)?profile.images:[])].filter(x=>typeof x==='string'&&x.startsWith('data:image/')))].slice(0,2);
  if(photos.length){form.dataset.profileImages=JSON.stringify(photos);form.querySelector('[type=file]').required=false;form.querySelectorAll('.preview').forEach((preview,i)=>{if(photos[i]){preview.src=photos[i];preview.style.display='block';}});form.querySelector('[data-query-photo-count]').textContent=`ใช้ ${photos.length} รูปจากโปรไฟล์ · เลือกรูปใหม่เพื่อแทนที่ได้`;}
}
function sightingForm(id){const item=state.cases.find(x=>x.id===id)||state.cases[0];openDialog('ส่งเบาะแสให้เคส “'+item.name+'”','เพิ่มรูปที่เห็นจากพื้นที่หรือจากโพสต์ Facebook แล้วให้ AI ช่วยเทียบ',`<form id="sightingForm" data-id="${escapeHtml(item.id)}"><div class="form-grid"><div class="field"><label>บริเวณที่พบ *</label><input name="area" required placeholder="ชื่อถนน ซอย หรือสถานที่"></div><div class="field"><label>วันที่และเวลาที่พบ *</label><input name="time" type="datetime-local" required></div><div class="field full-field"><label>รายละเอียด *</label><textarea name="description" required placeholder="เห็นน้องทำอะไร มีลักษณะตรงกับประกาศอย่างไร"></textarea></div>${imageField('อัปโหลดภาพที่พบหรือภาพหน้าจอจากโพสต์ Facebook',true)}<div class="field full-field"><label>ลิงก์โพสต์ Facebook ต้นทาง (ไม่บังคับ)</label><input name="sourceLink" type="url" placeholder="วางลิงก์โพสต์ที่เห็น"></div></div><div class="form-note">สามารถอัปโหลดภาพที่พบ หรือแคปหน้าจอจากโพสต์ที่เห็น เพื่อให้ระบบช่วยเทียบความคล้ายกับประกาศนี้ได้ทันที</div>${formButtons('ส่งเบาะแสและเทียบภาพ')}</form>`);bindImagePreview();}
async function searchPublicSources(item){
  let status=null,linked={groups:[]};
  try{[status,linked]=await Promise.all([fetch('/api/status').then(r=>r.json()).catch(()=>null),fetch('/api/facebook-groups').then(r=>r.json()).catch(()=>({groups:[]}))]);}catch{}
  if(!status?.metaPublicSearchReady){
    await openFacebookGroupsModal({targetItem:item});
    return;
  }
  openDialog('กำลังค้นโพสต์จากเพจสาธารณะ','กำลังเทียบรูปกับโพสต์ในเพจ Facebook ที่เชื่อมไว้',`<div class="match-loading"><span class="spinner"></span><b>กำลังอ่านโพสต์สาธารณะ…</b><small>ค้นจากเพจที่ตั้งค่าไว้เท่านั้น</small></div>`);
  try{
    const request=await searchPhotoRequest(item),params=new URLSearchParams({species:item.species}),response=await fetch(`/api/facebook-public-search?${params}`,{method:'POST',headers:request.headers,body:request.body}),data=await response.json();
    if(!response.ok&&data.setupRequired){openDialog('ตั้งค่าเพจ Facebook','ใส่ Meta access token และ Page IDs ของเพจสาธารณะที่ต้องการค้นในไฟล์ .env แล้วเปิดเซิร์ฟเวอร์ใหม่',`<div class="form-note">เพิ่ม <code>META_ACCESS_TOKEN=โทเคน</code> และ <code>META_PUBLIC_PAGE_IDS=รหัสเพจ1,รหัสเพจ2</code> ในไฟล์ .env บนเครื่องนี้ ระบบจะค้นเฉพาะโพสต์ที่ Meta API อนุญาตให้แอปอ่านได้ โทเคนจะไม่ส่งไปหน้าเว็บ</div><div class="form-actions"><button class="btn btn-soft-green" data-action="${item.species==='unknown'?'matchall':'match'}" data-id="${escapeHtml(item.id)}">เทียบข้อมูลในโปรเจกต์แทน</button><button class="btn btn-dark" data-close>ปิด</button></div>`);return;}
    if(!response.ok)throw new Error(data.error||'ค้นโพสต์ Facebook ไม่สำเร็จ');
    const groups=data.groups||[],allResults=groups.flatMap(group=>group.results||[]),sections=groups.map(group=>{const rows=(group.results||[]).map(result=>`<article class="web-result-card"><a class="web-result-image" href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(result.image)}" alt="ภาพจาก ${escapeHtml(result.source)}" loading="lazy"></a><div class="web-result-copy"><span class="web-source-tag">เพจ Facebook สาธารณะ · ${speciesIcon(result.species)}</span><b><a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.title||'โพสต์ Facebook')}</a></b><small>${escapeHtml(result.source)}${result.date?` · ${escapeHtml(result.date)}`:''}</small><a class="post-source" href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">เปิดโพสต์ ↗</a></div><span class="score">${Number(result.score).toFixed(3)}</span></article>`).join('');return rows?`<h4 class="match-section-heading">${speciesIcon(group.species)} ผลเทียบ${speciesName(group.species)}</h4>${rows}`:'';}).join('');
    openDialog(allResults.length?'พบโพสต์ที่มีภาพคล้าย':'ยังไม่พบโพสต์ภาพที่คล้าย',`${allResults.length} ภาพที่จัดอันดับจาก ${data.postsChecked||0} โพสต์ใน ${data.sourcePages||0} เพจ`,`${sections||'<div class="empty">ไม่พบโพสต์ที่มีรูปภาพจากเพจที่เชื่อมไว้</div>'}<div class="form-note">ค้นจากเพจสาธารณะที่กำหนดไว้และ API อนุญาตเท่านั้น ไม่ได้ค้นทุกเพจหรือกลุ่มปิด คะแนนคือความคล้ายของภาพ ไม่ยืนยันว่าเป็นสัตว์ตัวเดียวกัน</div><div class="form-actions"><button class="btn btn-light" data-action="${item.species==='unknown'?'matchall':'match'}" data-id="${escapeHtml(item.id)}">เทียบเคสในโปรเจกต์</button><button class="btn btn-dark" data-close>ปิด</button></div>`);
  }catch(error){openDialog('ค้น Facebook ไม่สำเร็จ','ตรวจ Meta access token, สิทธิ์เพจ และ Page IDs ใน .env',`<div class="form-note">${escapeHtml(error.message)}</div><div class="form-actions"><button class="btn btn-light" data-action="${item.species==='unknown'?'matchall':'match'}" data-id="${escapeHtml(item.id)}">เทียบข้อมูลในโปรเจกต์แทน</button><button class="btn btn-dark" data-close>ปิด</button></div>`);}
}
const embeddingCache=new Map();
const multiQueryTools=import('./multi-query.mjs');
async function caseQueryEmbedding(item,species){const {queryImages}=await multiQueryTools;return {queryVectors:await Promise.all(queryImages(item).map(image=>imageEmbedding(image,species)))};}
async function searchPhotoRequest(item){
  const {queryImages}=await multiQueryTools,images=queryImages(item);if(!images.length)throw Error('เลือกรูปก่อนค้นหา');
  const photos=await Promise.all(images.map(async image=>{const response=await fetch(image);if(!response.ok)throw Error('เปิดรูปที่เลือกไม่ได้');return response.blob();}));
  if(photos.length===1)return {body:photos[0],headers:{'Content-Type':photos[0].type||'application/octet-stream'}};
  const encoded=await Promise.all(photos.map(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('อ่านรูปไม่สำเร็จ'));reader.readAsDataURL(blob);})));return {body:JSON.stringify({images:encoded}),headers:{'Content-Type':'application/json'}};
}
async function imageEmbedding(imageUrl,species){
  const model=['dog','cat'].includes(species)?'pet-base':'dino-bird',key=`pet-crop-v4:${model}:${species}:${imageUrl}`;
  if(embeddingCache.has(key))return embeddingCache.get(key);
  const pending=(async()=>{const image=await fetch(imageUrl);if(!image.ok)throw new Error('เปิดภาพที่เลือกไม่ได้');const blob=await image.blob();const response=await fetch(`/api/embed?model=${model}&species=${encodeURIComponent(species)}`,{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});const data=await response.json();if(!response.ok)throw new Error(data.error||'โมเดลประมวลผลภาพไม่สำเร็จ');return data.embedding;})();
  embeddingCache.set(key,pending);try{return await pending;}catch(error){embeddingCache.delete(key);throw error;}
}
function cosineSimilarity(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||!a.length||a.length!==b.length)throw new Error('ข้อมูลภาพใช้โมเดลต่างกัน กรุณาประมวลผลภาพใหม่');
  let dot=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw new Error('ข้อมูลภาพไม่สมบูรณ์ กรุณาประมวลผลใหม่');dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  const norm=Math.sqrt(aa*bb);if(!Number.isFinite(norm)||norm===0)throw new Error('ข้อมูลภาพไม่สมบูรณ์ กรุณาประมวลผลใหม่');
  return Math.max(-1,Math.min(1,dot/norm));
}
async function compareSighting(image,item){openDialog('กำลังเทียบเบาะแสกับประกาศ',`ภาพของ${speciesName(item.species)} · ${item.name}`,`<div class="match-loading"><span class="spinner"></span><b>กำลังสแกนเปรียบเทียบภาพทั้งสอง…</b></div>`);try{const [a,b]=await Promise.all([imageEmbedding(image,item.species),imageEmbedding(item.image,item.species)]),score=cosineSimilarity(a,b);openDialog('ผลเปรียบเทียบภาพเบาะแส',`${speciesName(item.species)} · ${item.name}`,`<div class="result-card"><img src="${escapeHtml(image)}" alt="ภาพเบาะแส"><div><b>เทียบกับเคส “${escapeHtml(item.name)}”</b><small>ค่าความคล้ายของภาพ (Similarity Score: ยิ่งใกล้ 1.000 ยิ่งมีสีขนและรูปร่างคล้ายกัน)</small></div><span class="score">${score.toFixed(3)}</span></div><div class="form-note">คะแนนนี้คำนวณจากโครงหน้า ลวดลาย และสีขน เพื่อช่วยคัดกรองเบื้องต้น แนะนำให้ตรวจจุดสังเกตและบริเวณที่พบประกอบกัน</div><button class="btn btn-dark" data-close>เรียบร้อย</button>`);}catch(error){openDialog('เทียบภาพไม่สำเร็จ','เปิดแอปด้วย npm start แล้วลองใหม่',`<div class="form-note">${escapeHtml(error.message)}</div><button class="btn btn-dark" data-close>ปิด</button>`);}}
async function autoDetectSpecies(imageUrl){
  if(!imageUrl||typeof fetch!=='function')return 'unknown';
  try{
    const photo=await fetch(imageUrl);if(!photo.ok)return 'unknown';
    const blob=await photo.blob();
    const response=await fetch('/api/suggest-species',{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
    if(!response.ok)return 'unknown';
    const data=await response.json(),suggested=data.suggestions?.[0]?.species;
    return Object.hasOwn(speciesLabels,suggested)?suggested:'unknown';
  }catch{return 'unknown';}
}
async function submitCase(form,type){
  const data=Object.fromEntries(new FormData(form).entries()),files=[...(form.querySelector('[type=file]')?.files||[])],limit=form.id==='lostPhotoOnlyForm'?2:1;
  if(files.length>limit)throw Error(`เลือกได้ไม่เกิน ${limit} รูป`);
  const savedPhotos=form.dataset.profileImages?JSON.parse(form.dataset.profileImages):[form.dataset.profileImage].filter(Boolean),images=files.length?(await Promise.all(files.map(compressedImage))).filter(Boolean):savedPhotos.slice(0,limit),image=images[0]||'';
  if(!image)throw new Error('เลือกรูปสัตว์ก่อนบันทึก');
  type=data.type||type;
  let species=data.species||(form.id==='lostPhotoOnlyForm'?'unknown':'dog');
  if(species==='unknown'&&form.id!=='facebookForm'){
    showToast('กำลังสแกนชนิดสัตว์และเตรียมค้นหา...');
    const detected=await autoDetectSpecies(image);
    if(detected!=='unknown')species=detected;
  }
  const ownerPin=String(data.ownerPin||'').trim();
  if(ownerPin&&!/^\d{4,6}$/.test(ownerPin))throw new Error('รหัส PIN เจ้าของประกาศต้องเป็นตัวเลข 4–6 หลัก');
  const coatText=data.color||form.dataset.suggestedCoat||'';
  const latVal=data.lat!==undefined&&data.lat!==''&&Number.isFinite(Number(data.lat))?Number(data.lat):null;
  const lonVal=data.lon!==undefined&&data.lon!==''&&Number.isFinite(Number(data.lon))?Number(data.lon):null;
  const name=(type==='lost'?data.name:data.name||`${speciesName(species)}ที่พบ`)||'ยังไม่ระบุชื่อ',area=data.area||(form.id==='facebookForm'?'พื้นที่จากโพสต์ Facebook':''),item={id:'case-'+Date.now(),createdAt:new Date().toISOString(),type,species,name,kind:data.breed||form.dataset.suggestedBreed||coatText||'',color:coatText,area,lat:latVal,lon:lonVal,ocrText:form.dataset.ocrText||'',when:data.time?new Date(data.time).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'ไม่ระบุเวลา',description:data.description||coatText||'',contact:data.contact||'',image,sourceLink:safeExternalUrl(data.sourceLink||''),origin:form.id==='facebookForm'?'Facebook':'ผู้ใช้เว็บ',position:'center',updated:form.id==='facebookForm'?'นำเข้าจากโพสต์ Facebook':'เพิ่มใหม่',hasOwnerPin:Boolean(ownerPin)};
  if(ownerPin)item.ownerPin=ownerPin;
  item.images=images;const next=[item,...state.cases];if(!save('cases',next))throw Error('พื้นที่จัดเก็บเต็ม กรุณาลดขนาดรูปหรือสำรองข้อมูลก่อน');state.cases=next;
  renderCases();closeDialog();$('#cases').scrollIntoView({behavior:'smooth'});
  showToast(type==='lost'&&form.id!=='facebookForm'?'รับรูปแล้ว กำลังค้นหาเบาะแสที่คล้ายกัน...':'บันทึกเคสแล้ว กำลังหาเคสที่คล้ายกัน...');
  setTimeout(()=>{if(item.species==='unknown')matchAnySpecies(item);else matchCase(item);},180);
}

function openTrackingGuide(){
  openDialog('วิธีใช้ “เบาะแสของฉัน & โปรไฟล์สัตว์เลี้ยง”','ทำความเข้าใจสั้นๆ ก่อนเปิดใช้งานส่วนติดตามผล',`<div class="form-note" style="line-height:1.85">
    <b>1. ไทม์ไลน์เบาะแสที่ติดตาม (ด้านซ้าย):</b><br>
    รวมประกาศที่หน้าตาคล้ายกับน้องซึ่งคุณกดปุ่ม <i>“เก็บเป็นเบาะแส”</i> หลังสแกนรูป (หรือมีผู้พบแจ้งเข้ามา) เพื่อให้คุณกลับมาเปรียบเทียบซ้ำและเลือกสถานะ (รอตรวจสอบ / กำลังติดตาม / ตัวเดียวกัน / ไม่ใช่) รวมถึงมีปุ่ม <b>เตรียมข้อความแชร์</b> ลงโซเชียลให้ทันที<br><br>
    <b>2. ทะเบียนสัตว์เลี้ยงของฉัน (ด้านขวา):</b><br>
    ใช้บันทึกรูปหลายมุม (สูงสุด 4 รูป) และจุดสังเกตของน้องเก็บไว้ล่วงหน้า เผื่อเกิดเหตุฉุกเฉินจะได้กดสร้างประกาศตามหาได้ทันทีในคลิกเดียว
  </div>
  <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13.5px;color:#625645;cursor:pointer"><input type="checkbox" id="skipTrackingGuide"> ไม่ต้องแสดงคำแนะนำนี้อีก</label>
  <div class="form-actions"><button type="button" class="btn btn-light" data-close>ปิด</button><button type="button" class="btn btn-dark" id="confirmOpenTracking">เข้าใจแล้ว · เปิดดูเลย →</button></div>`);
}
function openDockPanel(panelId){
  const panel=panelId==='tracking'?$('#tracking'):$('#flow');
  if(!panel)return;
  const title=panelId==='tracking'?'เบาะแสที่บันทึกไว้ & โปรไฟล์สัตว์เลี้ยงของฉัน':'รายละเอียดโครงงาน · เบื้องหลัง AI · เครื่องมือระบบ';
  const hint=panelId==='tracking'?'ติดตามสถานะเบาะแสและจัดการโปรไฟล์สัตว์เลี้ยงของคุณ':'ดูสรุปโมเดล AI แหล่งประกาศ 12 เว็บ และจัดการฐานข้อมูล';
  openDialog(title,hint,'');
  $('#dialogBody').appendChild(panel);
}
if(typeof dialog!=='undefined'&&dialog?.addEventListener){
  dialog.addEventListener('close',()=>{
    const dock=$('#dockPanels');
    if(!dock)return;
    ['#tracking','#flow'].forEach(sel=>{const el=$(sel,$('#dialogBody'));if(el)dock.appendChild(el);});
  });
}
document.addEventListener('click',e=>{
  const close=e.target.closest('[data-close]');if(close){closeDialog();return;}
  if(e.target.closest('.left-dock-handle')){$('#sideDock')?.classList.toggle('open');return;}
  if(!e.target.closest('.left-dock'))$('#sideDock')?.classList.remove('open');
  const openPanelBtn=e.target.closest('[data-open-panel]');
  if(openPanelBtn){
    const targetPanel=openPanelBtn.dataset.openPanel;
    $('#sideDock')?.classList.remove('open');
    if(targetPanel==='tracking'){
      let skip=false;try{skip=localStorage.getItem('pawtal-tracking-intro')==='skip';}catch{}
      if(!skip){openTrackingGuide();return;}
    }
    openDockPanel(targetPanel);
    return;
  }
  const trackingNav=e.target.closest('a[href="#tracking"]');
  if(trackingNav){
    e.preventDefault();
    let skip=false;try{skip=localStorage.getItem('pawtal-tracking-intro')==='skip';}catch{}
    if(!skip){openTrackingGuide();return;}
    openDockPanel('tracking');
    return;
  }
  if(e.target.closest('#showTrackingGuide')){openTrackingGuide();return;}
  if(e.target.closest('#confirmOpenTracking')){
    try{if($('#skipTrackingGuide')?.checked)localStorage.setItem('pawtal-tracking-intro','skip');}catch{}
    closeDialog();
    openDockPanel('tracking');
    return;
  }
  if(e.target.closest('#showMoreCases')){caseVisibleLimit+=5;renderCases();return;}
  if(e.target.closest('#showAllCases')){caseVisibleLimit=Infinity;renderCases();return;}
  if(e.target.closest('#collapseCases')){caseVisibleLimit=5;renderCases();$('#cases').scrollIntoView({behavior:'smooth'});return;}
  const viewBtn=e.target.closest('[data-case-view]');if(viewBtn){caseViewMode=viewBtn.dataset.caseView;renderCases();return;}
  const filter=e.target.closest('[data-filter]');if(filter){caseVisibleLimit=5;renderCases(filter.dataset.filter);return;}
  const action=e.target.closest('[data-action]');if(!action)return;
  const id=action.dataset.id,item=state.cases.find(x=>x.id===id)||state.cases.find(x=>x.id==='tungthong');
  switch(action.dataset.action){case'publicsearch':searchPublicSources(item);break;case'resolve':requireOwnerPin(item,'เปลี่ยนสถานะ',pin=>toggleResolved(item,pin));break;case'deletecase':confirmDeleteCase(item);break;case'profilelost':startFromProfile(Number(action.dataset.index));break;case'editprofile':editProfileForm(Number(action.dataset.index));break;case'found':foundForm();break;case'lost':lostForm();break;case'lostspecies':lostForm(action.dataset.species||'unknown');break;case'lostphotoonly':lostPhotoOnlyForm();break;case'register':registerForm();break;case'sighting':sightingForm(id||'tungthong');break;case'detail':detail(item);break;case'editcase':requireOwnerPin(item,'แก้ไขข้อมูล',pin=>editCaseForm(item,pin));break;case'share':shareCase(item);break;case'poster':openPosterModal(item);break;case'quickposter':openPosterModal(null);break;case'openalerts':openAlertsModal();break;case'alertforcase':openAlertsModal({species:item?.species,area:item?.area,label:item?`ตามหา${speciesName(item.species)} ${item.name&&item.name!=='ยังไม่ระบุชื่อ'?item.name:''}${item.area?` (${item.area})`:''}`.trim():''});break;case'ocr':openOcrModal(item);break;case'match':matchCase(item);break;case'matchall':matchAnySpecies(item);break;case'identifycase':identifyCaseForm(item);break;case'facebookpost':facebookPostForm();break;case'fbgroups':openFacebookGroupsModal();break;case'copyshare':copyShare();break;case'downloadphoto':downloadCasePhoto(id);break;case'exportbackup':exportBackup();break;case'importbackup':$('#backupFile').click();break;case'all':caseViewMode='grid';caseVisibleLimit=Infinity;renderCases('all');$('#cases').scrollIntoView({behavior:'smooth'});break;}
});
$('#backupFile').addEventListener('change',async e=>{await importBackup(e.target.files[0]);e.target.value='';});
$('#caseSearch')?.addEventListener('input',e=>{caseQuery=e.target.value;caseVisibleLimit=5;renderCases();});
$('#clearSearch')?.addEventListener('click',()=>{$('#caseSearch').value='';caseQuery='';caseVisibleLimit=5;renderCases();$('#caseSearch').focus();});
dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog();});
document.addEventListener('submit',async e=>{
  const form=e.target;if(!form.matches('#foundForm,#lostForm,#lostPhotoOnlyForm,#identifyCaseForm,#editCaseForm,#facebookForm,#profileForm,#editProfileForm,#sightingForm'))return;e.preventDefault();
  try{
  if(form.id==='foundForm'){await submitCase(form,'found');return;}if(form.id==='lostForm'){await submitCase(form,'lost');return;}if(form.id==='facebookForm'){await submitCase(form,'found');return;}
  if(form.id==='lostPhotoOnlyForm'){await submitCase(form,'lost');return;}
  if(form.id==='editCaseForm'){
    const data=Object.fromEntries(new FormData(form).entries()),item=state.cases.find(x=>x.id===form.dataset.id);if(!item)return;
    const patch={species:data.species||'unknown',name:data.name?.trim()||`${speciesName(data.species||item.species)}${item.type==='lost'?'ที่หาย':'ที่พบ'}`,kind:data.kind?.trim()||'',area:data.area?.trim()||'',when:data.when?.trim()||'ไม่ระบุเวลา',contact:data.contact?.trim()||'',description:data.description?.trim()||''};
    if(!item.isDemo&&typeof fetch==='function'){
      const pin=form.dataset.pin||'';
      const headers={'Content-Type':'application/json',...(pin?{'X-Owner-Pin':pin}:{})};
      const r=await fetch(`/api/cases/${encodeURIComponent(item.id)}`,{method:'PATCH',headers,body:JSON.stringify(patch)});
      if(r.status===403){showToast('รหัส PIN เจ้าของประกาศไม่ถูกต้อง ไม่สามารถแก้ไขได้');return;}
    }
    Object.assign(item,patch,{updated:'แก้ไขข้อมูลล่าสุด'});
    const persisted=save('cases',state.cases);renderCases();closeDialog();showToast(persisted?'บันทึกข้อมูลเพิ่มเติมแล้ว':'แก้ข้อมูลในหน้านี้แล้ว แต่พื้นที่จัดเก็บเต็ม อาจหายเมื่อปิดหน้า');return;
  }
  if(form.id==='identifyCaseForm'){const data=Object.fromEntries(new FormData(form).entries()),item=state.cases.find(x=>x.id===form.dataset.id);if(!item)return;item.species=data.species;item.area=data.area||item.area;item.name=data.name?.trim()||item.name;if(!item.kind&&form.dataset.suggestedBreed)item.kind=form.dataset.suggestedBreed;item.updated='ระบุชนิดสัตว์แล้ว';const persisted=save('cases',state.cases);renderCases();if(!persisted)showToast('แก้ข้อมูลในหน้านี้แล้ว แต่พื้นที่จัดเก็บเต็ม อาจหายเมื่อปิดหน้า');closeDialog();matchCase(item);return;}
  if(form.id==='profileForm'){const data=Object.fromEntries(new FormData(form).entries()),photos=[...form.querySelector('[name="photos"]').files].slice(0,4),images=(await Promise.all(photos.map(compressedImage))).filter(Boolean),image=images[0]||'';state.profiles.unshift({name:data.name,species:data.species||'dog',kind:data.breed||'',color:data.color,area:data.area,notes:data.notes||'',image,images});const persisted=save('profiles',state.profiles);renderProfiles();closeDialog();showToast(persisted?`บันทึกโปรไฟล์พร้อมรูป ${images.length} มุมแล้ว`:'เพิ่มโปรไฟล์แล้ว แต่พื้นที่จัดเก็บเต็ม อาจหายเมื่อปิดหน้า');return;}
  if(form.id==='editProfileForm'){
    const index=Number(form.dataset.index),p=state.profiles[index];if(!p)return;
    const d=Object.fromEntries(new FormData(form).entries()),old=[...new Set([p.image,...(p.images||[])].filter(Boolean))];
    const keep=[...form.querySelectorAll('[name="keepPhoto"]:checked')].map(x=>old[Number(x.value)]).filter(Boolean),files=[...form.querySelector('[name="photos"]').files],room=Math.max(0,4-keep.length);
    if(files.length>room){showToast('รูปที่เพิ่มเกินจำนวนช่องว่าง');return;}
    const added=(await Promise.all(files.map(compressedImage))).filter(Boolean),images=[...keep,...added];
    const updated={...p,name:d.name.trim(),species:d.species,kind:d.breed||'',color:d.color.trim(),area:d.area||'',notes:d.notes||'',image:images[0]||'',images};
    const next=state.profiles.map((row,i)=>i===index?updated:row);
    if(!save('profiles',next)){showToast('พื้นที่จัดเก็บเต็ม กรุณาลดจำนวนรูปหรือสำรองข้อมูลก่อน');return;}
    state.profiles=next;renderProfiles();closeDialog();showToast('อัปเดตโปรไฟล์พร้อมรูปแล้ว');return;
  }
  if(form.id==='sightingForm'){
    const data=Object.fromEntries(new FormData(form).entries()),item=state.cases.find(x=>x.id===form.dataset.id);
    if(!item)throw Error('ไม่พบเคสสำหรับบันทึกเบาะแส');
    const image=await compressedImage(form.querySelector('[type=file]')?.files[0]);
    const date=data.time?new Date(data.time).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'ไม่ระบุเวลา',sourceLink=safeExternalUrl(data.sourceLink||'');
    const clue={caseId:item.id,title:`${item.name}: ${data.description||''}`,info:`${date} · ${data.area||''}`,area:sourceLink?'เบาะแสจากโพสต์':'เบาะแสจากผู้ใช้',image,sourceLink,status:'pending',createdAt:new Date().toISOString()};
    const next=[clue,...state.sightings];if(!save('sightings',next)){showToast('พื้นที่จัดเก็บเต็ม ยังไม่ได้บันทึกเบาะแส');return;}
    state.sightings=next;renderSightings();closeDialog();showToast('บันทึกเบาะแสแล้ว');if(image)await compareSighting(image,item);return;
  }
  }catch(error){showToast(error.message||'บันทึกข้อมูลไม่สำเร็จ');}
});
renderCases();renderSightings();renderProfiles();
if(typeof fetch==='function'){
  fetch('/api/database').then(r=>r.ok?r.json():null).then(db=>{
    if(!db)return;
    let changed=false;
    if(Array.isArray(db.cases)&&db.cases.length){
      const existingIds=new Set(state.cases.map(x=>x.id));
      for(const c of db.cases){if(c?.id&&!existingIds.has(c.id)){state.cases.push(normalizeRecord(c));changed=true;}}
    }
    if(Array.isArray(db.sightings)&&db.sightings.length){
      const existingKeys=new Set(state.sightings.map(x=>(x.caseId||'')+':'+(x.matchKey||x.createdAt||x.title)));
      for(const s of db.sightings){const k=(s?.caseId||'')+':'+(s?.matchKey||s?.createdAt||s?.title);if(s?.title&&!existingKeys.has(k)){state.sightings.push(s);changed=true;}}
    }
    if(changed){renderCases();renderSightings();}
    openCaseFromQueryParam();
  }).catch(()=>{});
}
async function showDatabaseInspector(){
  try{
    const [r,stRes]=await Promise.all([fetch('/api/database/stats'),fetch('/api/status').catch(()=>null)]);
    if(!r.ok)throw Error('อ่านสถานะฐานข้อมูลไม่สำเร็จ');
    const st=await r.json(),srv=stRes?.ok?await stRes.json().catch(()=>null):null,bg=srv?.backgroundWorker;
    openDialog('สถาปัตยกรรมฐานข้อมูล (SQLite + Media Storage)',st.engine,`<div class="form-note"><b>1. ฐานข้อมูลเชิงสัมพันธ์ (Relational Database):</b> <code>${escapeHtml(st.databaseFile)}</code> (${(st.dbSizeBytes/1024).toFixed(1)} KB)<br>• ตาราง <code>cases</code> (เคสสัตว์หาย/พบ): <b>${st.tables.cases}</b> รายการ<br>• ตาราง <code>sightings</code> (เบาะแสที่แจ้ง): <b>${st.tables.sightings}</b> รายการ<br>• ตาราง <code>profiles</code> (ทะเบียนสัตว์เลี้ยง): <b>${st.tables.profiles}</b> รายการ<br>• ตาราง <code>embedding_cache</code> (แคชเวกเตอร์ AI ถาวร): <b>${st.tables.embedding_cache}</b> รายการ<br>• ตาราง <code>facebook_groups</code> (กลุ่ม Facebook ในระบบ): <b>${st.tables.facebook_groups??0}</b> กลุ่ม · <code>alerts</code> (แจ้งเตือน): <b>${st.tables.alerts??0}</b> รายการ</div><div class="form-note"><b>2. ที่เก็บไฟล์รูปภาพแยกจากตาราง (Media Object Storage):</b> <code>${escapeHtml(st.uploadsDirectory)}</code><br>• แปลงรูป Base64 เป็นไฟล์รูป <code>.jpg/.png</code> อ้างอิงด้วยค่าแฮช SHA-256 จำนวน <b>${st.mediaStorage.files}</b> ไฟล์ (${(st.mediaStorage.bytes/1024).toFixed(1)} KB)</div><div class="form-note"><b>3. Background Worker &amp; ความปลอดภัย (Production Readiness):</b><br>• Pre-embedding Worker: ${bg?`${bg.enabled?'เปิดทำงานอัตโนมัติทุก 20 นาที':'ปิดชั่วคราว'} · รันแล้ว ${bg.runsCompleted} รอบ · แคชรอบล่าสุด +${bg.lastCachedNewVectors} เวกเตอร์`:'พร้อมทำงาน'}<br>• ความปลอดภัย: Rate Limiter, Magic Bytes Check, Owner PIN (scrypt), Strict Static Allowlist</div><div class="form-actions"><button type="button" class="btn btn-light" id="triggerWarmCacheBtn">⚡ อุ่นแคชเวกเตอร์ 12 เว็บทันที</button><button class="btn btn-dark" data-close>ปิดหน้าต่าง</button></div>`);
  }catch(e){showToast(e.message);}
}
$('#checkDatabaseStats')?.addEventListener('click',showDatabaseInspector);

$('#speciesFilter')?.addEventListener('change',()=>{caseVisibleLimit=5;renderCases();});
$('#areaFilter')?.addEventListener('input',()=>{caseVisibleLimit=5;renderCases();});

async function suggestCaseSpecies(item,form){
  if(!form||!item.image)return;
  let touched=false;const select=form.elements.species;
  select.addEventListener('change',()=>{touched=true;},{once:true});
  const note=form.querySelector('#speciesSuggestion');
  try{
    const photo=await fetch(item.image);if(!photo.ok)throw Error('image');
    const blob=await photo.blob();
    const response=await fetch('/api/suggest-species',{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
    if(!response.ok)throw Error('model');const data=await response.json();
    if(!form.isConnected||document.getElementById('identifyCaseForm')!==form)return;
    const suggested=data.suggestions?.[0]?.species;
    if(!Object.hasOwn(speciesLabels,suggested))throw Error('label');
    if(!touched&&!select.value)select.value=suggested;
    let breedNote='';
    if(['cat','dog','bird'].includes(suggested)){
      try{
        const br=await fetch(`/api/suggest-breed?species=${encodeURIComponent(suggested)}`,{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
        if(br.ok){
          const bd=await br.json(),top=bd.suggestions?.[0];
          if(top){
            const eng=String(top.name||'').replace(/\b\w/g,c=>c.toUpperCase());
            const label=top.thaiName?`${top.thaiName} (${eng})`:eng;
            form.dataset.suggestedBreed=label;
            breedNote=` · คาดว่าเป็นพันธุ์ ${label}`;
          }
        }
      }catch{}
    }
    if(form.isConnected)note.textContent=`AI แนะนำว่าเป็น${speciesName(suggested)}${breedNote} · ช่วยตรวจสอบจากรูปอีกครั้ง หากไม่ตรงสามารถเลือกแก้ได้ก่อนค้นหา`+(data.quality?.warnings?.length?' · '+data.quality.warnings.join(' · '):'');
  }catch{
    if(form.isConnected)note.textContent='AI ยังช่วยระบุชนิดไม่ได้ กรุณาเลือกชนิดสัตว์จากรูปก่อนค้นหา';
  }
}

function confirmDeleteCase(item){
  if(!item||item.isDemo)return;
  const pinHtml=item.hasOwnerPin?`<div class="field" style="margin-top:10px"><label>🔒 กรอกรหัส PIN เจ้าของประกาศ (4–6 หลัก) *</label><input id="deleteOwnerPinInput" type="password" inputmode="numeric" maxlength="6" placeholder="กรอกรหัส PIN ที่ตั้งไว้ตอนโพสต์" autocomplete="off"></div><div id="deletePinError" class="form-note" hidden style="color:#a33945;background:#fff1f2"></div>`:'';
  openDialog('ยืนยันการลบประกาศ',`ต้องการลบประกาศ “${item.name}” ออกจากระบบและฐานข้อมูล SQLite หรือไม่?`,
    `<div class="form-note">การลบจะลบข้อมูลประกาศนี้และเบาะแสที่ผูกไว้ทั้งหมด</div>${pinHtml}<div class="form-actions"><button type="button" class="btn btn-light" data-close>ยกเลิก</button><button type="button" class="btn btn-dark" id="confirmDeleteCaseBtn" data-id="${escapeHtml(item.id)}" data-needs-pin="${item.hasOwnerPin?'1':'0'}" style="background:#b43643;border-color:#b43643">ยืนยันลบประกาศ</button></div>`);
}
async function refreshAlertBadge(){
  const badge=$('#alertBadge');if(!badge||typeof fetch!=='function')return;
  try{
    const r=await fetch('/api/alerts');if(!r.ok)return;
    const data=await r.json();const count=Number(data.unreadCount||0);
    badge.textContent=String(count);badge.hidden=count<=0;
  }catch{}
}
async function openAlertsModal(prefill=null){
  try{
    const data=await fetch('/api/alerts').then(r=>r.json());
    const alerts=data.alerts||[],notifs=data.notifications||[];
    const pf=prefill&&typeof prefill==='object'&&!('target' in prefill)?prefill:{};
    const pfSp=Object.hasOwn(speciesLabels,pf.species)?pf.species:'all';
    const pfArea=String(pf.area||'').replace(/ยังไม่ระบุบริเวณ|จาก\s+.+/g,'').trim();
    const pfName=String(pf.label||'').trim();
    openDialog('ระบบแจ้งเตือนประกาศใหม่ & Webhook','รับแจ้งเตือนอัตโนมัติเมื่อมีประกาศสัตว์หาย/พบตรงพื้นที่ที่สนใจ',`
      <form id="alertForm">
        <div class="form-grid">
          <div class="field"><label>ชื่อรายการแจ้งเตือน *</label><input name="name" required value="${escapeHtml(pfName)}" placeholder="เช่น ตามหาแมวส้ม ลาดพร้าว"></div>
          <div class="field"><label>ชนิดสัตว์</label><select name="species"><option value="all" ${pfSp==='all'?'selected':''}>ทุกชนิด</option><option value="cat" ${pfSp==='cat'?'selected':''}>แมว</option><option value="dog" ${pfSp==='dog'?'selected':''}>สุนัข</option><option value="bird" ${pfSp==='bird'?'selected':''}>นก</option><option value="rabbit" ${pfSp==='rabbit'?'selected':''}>กระต่าย</option><option value="hamster" ${pfSp==='hamster'?'selected':''}>แฮมสเตอร์</option></select></div>
          <div class="field"><label>พื้นที่ที่สนใจ (ไม่บังคับ)</label><input name="area" value="${escapeHtml(pfArea)}" placeholder="เช่น ลาดพร้าว / อารีย์ / เชียงใหม่"></div>
          <div class="field"><label>ลิงก์ Webhook (ไม่บังคับ · https://)</label><input name="webhookUrl" type="url" placeholder="Discord / Slack / LINE Webhook URL"></div>
        </div>
        <div class="form-actions"><button type="submit" class="btn btn-dark">＋ บันทึกแจ้งเตือน</button></div>
      </form>
      <div style="margin-top:12px"><b>รายการที่ติดตามอยู่ (${alerts.length})</b><div class="alert-list">${alerts.length?alerts.map(a=>`<div class="alert-row"><div><b>${escapeHtml(a.name)}</b><small>${escapeHtml(a.species==='all'?'ทุกชนิด':speciesName(a.species))} · ${escapeHtml(a.area||'ทุกพื้นที่')}${a.webhook_url?' · 🔗 Webhook พร้อมส่ง':''}</small></div><button type="button" class="text-link" data-delete-alert="${escapeHtml(a.id)}" style="color:#a33945">ลบ</button></div>`).join(''):'<p style="font-size:13px;color:#786a80">ยังไม่มีรายการแจ้งเตือน ตั้งค่าด้านบนได้เลย</p>'}</div></div>
      <div style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center"><b>ประวัติการแจ้งเตือน (${notifs.length})</b>${data.unreadCount?`<button type="button" class="text-link" id="markAlertsReadBtn">✓ ทำเครื่องหมายอ่านแล้วทั้งหมด</button>`:''}</div><div class="alert-list">${notifs.length?notifs.map(n=>`<div class="alert-row ${n.seen?'':'unread'}"><div><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.message)} · ${new Date(n.created_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}</small></div>${n.case_id?`<button type="button" class="text-link" data-action="detail" data-id="${escapeHtml(n.case_id)}">ดูเคส →</button>`:''}</div>`).join(''):'<p style="font-size:13px;color:#786a80">ยังไม่มีการแจ้งเตือนใหม่</p>'}</div></div>`);
  }catch{showToast('โหลดข้อมูลแจ้งเตือนไม่สำเร็จ');}
}
const fbGroupTools=typeof window!=='undefined'?import('./fb-groups.mjs').catch(()=>null):null;
const socialTools=typeof window!=='undefined'?import('./social-links.mjs').catch(()=>null):null;
let fbGroupTargetItem=null,fbGroupPasteQueue=[],socialPreviewMeta=null;
async function refreshFbGroupBadge(){
  const countEl=$('#fbGroupCount');if(!countEl||typeof fetch!=='function')return;
  try{
    const r=await fetch('/api/facebook-groups');if(!r.ok)return;
    const data=await r.json(),count=Number(data.count||0);
    countEl.textContent=count>0?`(${count})`:'';
  }catch{}
}
async function openFacebookGroupsModal({targetItem=null,selectedGroupId=''}={}){
  fbGroupTargetItem=targetItem||null;fbGroupPasteQueue=[];socialPreviewMeta=null;
  try{
    const [data,tools,sTools]=await Promise.all([fetch('/api/facebook-groups').then(r=>r.json()),fbGroupTools,socialTools]);
    const rawGroups=data.groups||[];
    const spTarget=targetItem?.species||'';
    const groups=[...rawGroups].sort((a,b)=>{
      const rank=g=>spTarget&&g.species===spTarget?0:g.species==='all'?1:2;
      return rank(a)-rank(b);
    });
    const searchHint=targetItem?{species:targetItem.species||'',speciesLabel:speciesName(targetItem.species),breed:targetItem.kind||'',area:targetItem.area||''}:{};
    const searchPreview=[searchHint.speciesLabel,String(searchHint.breed||'').replace(/\([^)]*\)/g,'').trim(),searchHint.area].filter(Boolean).join(' ').trim();
    const crossLinks=sTools?sTools.buildCrossAppSearchLinks(searchHint):[];
    const crossHtml=crossLinks.length?`
      <div class="social-cross-strip" style="margin-top:0">
        <b>📱 ค้นหาข้ามแอปโซเชียลทันที 1 คลิก (ไม่ต้องขอ API Key)</b>
        <small style="display:block;color:#625672;font-size:12px;margin-bottom:8px">กดเปิดค้นใน IG / X / TikTok / Threads ได้เลย พอเจอโพสต์ที่คล้ายกันให้แคปภาพหรือก๊อปลิงก์มาวางด้านล่าง</small>
        <div class="social-chip-row">${crossLinks.map(l=>`<a class="social-chip ${escapeHtml(l.chipClass)}" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)} ↗</a>`).join('')}</div>
      </div>`:'';
    openDialog('เชื่อมโซเชียลข้ามแอป & กลุ่ม Facebook',targetItem?`ค้น “${speciesName(targetItem.species)}${targetItem.kind?` · ${targetItem.kind}`:''}” ข้าม IG / X / TikTok / Threads และ ${groups.length} กลุ่ม FB (ไม่ต้องขอ API)`:`เชื่อม IG · TikTok · X · Threads · LINE + ${groups.length} กลุ่ม Facebook โดยไม่ต้องขอ API Key`, `
      ${crossHtml}
      <div class="fb-group-section" id="fbPasteSection">
        <b>📥 นำเข้าโพสต์จาก IG / TikTok / X / Threads / LINE / Facebook ให้ AI เทียบไว (รองรับ Ctrl+V)</b>
        <div class="form-grid" style="margin-top:8px">
          <div class="field"><label>แหล่งที่มา / แอป</label><select id="fbPasteGroup">
            <optgroup label="แอปโซเชียลยอดนิยม (วางลิงก์ + Ctrl+V รูปได้ทันที)">
              <option value="__ig" ${selectedGroupId==='__ig'?'selected':''}>📸 Instagram (ไอจี)</option>
              <option value="__tiktok" ${selectedGroupId==='__tiktok'?'selected':''}>🎵 TikTok</option>
              <option value="__x" ${selectedGroupId==='__x'?'selected':''}>𝕏 X (Twitter)</option>
              <option value="__threads" ${selectedGroupId==='__threads'?'selected':''}>🧵 Threads</option>
              <option value="__line" ${selectedGroupId==='__line'?'selected':''}>💚 LINE OpenChat / แชต</option>
              <option value="__manual" ${selectedGroupId==='__manual'?'selected':''}>📘 กลุ่ม/เพจ Facebook อื่น</option>
            </optgroup>
            <optgroup label="กลุ่ม Facebook ในระบบ (${groups.length} กลุ่ม)">
              ${groups.map(g=>`<option value="${escapeHtml(g.id)}" ${g.id===selectedGroupId?'selected':''}>📘 ${escapeHtml(g.name)}</option>`).join('')}
            </optgroup>
          </select></div>
          <div class="field"><label>ประเภทโพสต์</label><select id="fbPasteType"><option value="found">พบสัตว์ / เจอเบาะแส</option><option value="lost">สัตว์หาย / ตามหา</option></select></div>
          <div class="field full-field"><label>ลิงก์โพสต์ต้นทางจาก IG / TikTok / X / Threads / FB / LINE (ถ้ามี)</label>
            <div class="social-url-row">
              <input id="fbPastePostUrl" type="url" placeholder="เช่น https://www.instagram.com/p/... หรือลิงก์ TikTok / X / FB">
              <button type="button" class="btn btn-light" id="socialPreviewBtn">🔎 ตรวจลิงก์</button>
            </div>
            <small id="socialUrlHint" class="social-url-hint">วางลิงก์แล้วระบบจะตรวจชื่อแอปให้อัตโนมัติ และช่วยอ่านหัวข้อ/พื้นที่จากแหล่งที่เปิดสาธารณะ</small>
          </div>
          <div class="field full-field"><label>พื้นที่ในโพสต์ (ไม่บังคับ · ใช้จับคู่ระยะทาง &amp; 🔔 แจ้งเตือน)</label><input id="fbPasteArea" placeholder="เช่น อารีย์ / ลาดพร้าว / เชียงใหม่"></div>
        </div>
        <div id="fbDropzone" class="fb-group-dropzone" tabindex="0">
          <b>คลิกเลือกรูป / ลากมาวาง / กด Ctrl+V วางภาพแคปจาก IG, TikTok, X, LINE หรือ Facebook ได้ทันที</b>
          <small style="display:block;color:#786a80;margin-top:4px">เลือกหรือวางได้สูงสุด 6 รูปทีเดียว AI จะสแกนชนิดสัตว์ + สายพันธุ์ + สีขน และเทียบกับ 12 เว็บให้ทันที</small>
          <input id="fbQuickFiles" type="file" accept="image/*" multiple hidden>
          <div id="fbPastePreviews" class="fb-group-previews"></div>
        </div>
        <div class="quick-sample-picks" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center">
          <small style="color:#7b6b49">หรือลองนำเข้าด้วยรูปตัวอย่าง:</small>
          <button type="button" class="text-link" data-social-sample="assets/samples/user-cat.jpg">🐱 แมว</button>
          <button type="button" class="text-link" data-social-sample="assets/samples/dog.jpg">🐶 สุนัข</button>
          <button type="button" class="text-link" data-social-sample="assets/samples/bird.jpg">🐦 นก</button>
        </div>
        <div class="form-actions"><button type="button" class="btn btn-light" data-action="facebookpost">กรอกโพสต์แบบละเอียด</button><button type="button" class="btn btn-dark" id="fbRunImportBtn" disabled>🤖 นำเข้า &amp; ให้ AI เทียบทันที</button></div>
      </div>
      <div class="fb-group-section">
        <b>📘 กลุ่ม Facebook ที่เชื่อมเข้าระบบอัตโนมัติ (${groups.length} กลุ่ม)</b>
        <div class="alert-list" id="fbLinkedGroupList">${groups.length?groups.map(g=>{
          const qUrl=tools?tools.buildGroupSearchUrl(g.url,searchHint):g.url;
          const btnText=searchPreview&&qUrl!==g.url?`🔍 ค้น “${searchPreview}” ↗`:'🔍 เปิดกลุ่ม ↗';
          return `<div class="alert-row"><div><b>${escapeHtml(g.name)}</b><small>${escapeHtml(g.species==='all'?'ทุกชนิด':speciesName(g.species))}${g.area?` · ${escapeHtml(g.area)}`:''}</small></div><div class="fb-group-actions"><a class="btn btn-soft-green" href="${escapeHtml(qUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(btnText)}</a><button type="button" class="btn btn-light" data-select-fb-group="${escapeHtml(g.id)}">📥 วางรูป</button>${String(g.id).startsWith('fbg_sys_')?'':`<button type="button" class="text-link" data-delete-fb-group="${escapeHtml(g.id)}" style="color:#a33945">ลบ</button>`}</div></div>`;
        }).join(''):'<p style="font-size:13px;color:#786a80;margin:6px 0 0">กำลังเตรียมรายชื่อกลุ่ม...</p>'}</div>
      </div>
      <details class="optional-fields" style="margin-top:12px"><summary>＋ เพิ่มลิงก์กลุ่ม Facebook เฉพาะพื้นที่เพิ่มเติม (ไม่บังคับ)</summary>
        <form id="fbGroupForm" style="margin-top:10px">
          <div class="form-grid">
            <div class="field full-field"><label>วางลิงก์กลุ่มหรือเพจ Facebook *</label><input name="url" type="url" required placeholder="https://www.facebook.com/groups/ชื่อหรือเลขกลุ่ม"></div>
            <div class="field"><label>ชื่อกลุ่ม (ไม่บังคับ)</label><input name="name" placeholder="เช่น กลุ่มตามหานกหาย เชียงใหม่"></div>
            <div class="field"><label>หมวดสัตว์</label><select name="species"><option value="all">ทุกชนิด</option><option value="bird">นก</option><option value="cat">แมว</option><option value="dog">สุนัข</option><option value="rabbit">กระต่าย</option><option value="hamster">แฮมสเตอร์</option></select></div>
            <div class="field full-field"><label>พื้นที่ของกลุ่ม</label><input name="area" placeholder="เช่น กรุงเทพฯ / เชียงใหม่"></div>
          </div>
          <div class="form-actions"><button type="submit" class="btn btn-dark">＋ บันทึกเพิ่มเข้าระบบ</button></div>
        </form>
      </details>
      <div class="form-note" style="margin-top:10px"><b>เชื่อมข้ามแอปโดยไม่ต้องขอ API Key:</b> Instagram, TikTok, X และ Threads จำกัดไม่ให้เว็บภายนอกดูดฟีดอัตโนมัติโดยไม่มีสัญญา API ระบบจึงเชื่อมผ่าน <b>1) ปุ่มค้นข้ามแอป 1 คลิกด้วยคำค้น AI</b> + <b>2) วางลิงก์และ Ctrl+V ภาพมาให้ AI เทียบทันที</b> ส่วนเว็บสาธารณะ 12 แห่งและกลุ่ม FB ผ่าน Pawsociety ดึงเข้า AI อัตโนมัติอยู่แล้วครับ</div>
    `);
  }catch{showToast('เปิดหน้าเชื่อมโซเชียลไม่สำเร็จ');}
}
function addFbPasteImages(list){
  const previews=$('#fbPastePreviews'),runBtn=$('#fbRunImportBtn');
  if(!previews||!runBtn)return;
  Promise.all([...list].filter(f=>f?.type?.startsWith('image/')).slice(0,Math.max(0,6-fbGroupPasteQueue.length)).map(compressedImage)).then(urls=>{
    fbGroupPasteQueue.push(...urls.filter(Boolean));
    fbGroupPasteQueue=fbGroupPasteQueue.slice(0,6);
    previews.innerHTML=fbGroupPasteQueue.map(u=>`<img src="${escapeHtml(u)}" alt="ภาพโพสต์จากโซเชียล">`).join('');
    runBtn.disabled=!fbGroupPasteQueue.length;
    runBtn.textContent=`🤖 นำเข้า ${fbGroupPasteQueue.length} รูป & ให้ AI เทียบทันที`;
  }).catch(()=>{});
}
async function inspectSocialUrlInput({fetchPreview=false}={}){
  const urlEl=$('#fbPastePostUrl'),hintEl=$('#socialUrlHint'),grpSel=$('#fbPasteGroup'),areaEl=$('#fbPasteArea');
  if(!urlEl||!hintEl)return;
  const raw=urlEl.value.trim();
  if(!raw){socialPreviewMeta=null;hintEl.textContent='วางลิงก์แล้วระบบจะตรวจชื่อแอปให้อัตโนมัติ และช่วยอ่านหัวข้อ/พื้นที่จากแหล่งที่เปิดสาธารณะ';hintEl.className='social-url-hint';return;}
  const sTools=await socialTools;
  const detected=sTools?sTools.detectSocialPlatform(raw):socialBadgeInfo(raw);
  if(!detected){
    hintEl.textContent='⚠️ รูปแบบลิงก์ไม่ถูกต้อง กรุณาวางลิงก์ที่ขึ้นต้นด้วย https://';
    hintEl.className='social-url-hint warn';
    return;
  }
  const presetMap={instagram:'__ig',tiktok:'__tiktok',x:'__x',threads:'__threads',line:'__line'};
  if(grpSel&&presetMap[detected.id])grpSel.value=presetMap[detected.id];
  if(!fetchPreview){
    hintEl.textContent=`✓ ตรวจพบลิงก์ ${detected.badge}${detected.handle?` (${detected.handle})`:''} · กด “🔎 ตรวจลิงก์” หรือ Ctrl+V ภาพจากโพสต์ได้เลย`;
    hintEl.className='social-url-hint ok';
    return;
  }
  const btn=$('#socialPreviewBtn');
  if(btn){btn.disabled=true;btn.textContent='กำลังตรวจ…';}
  try{
    const r=await fetch('/api/social-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:raw})});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||'ตรวจลิงก์ไม่สำเร็จ');
    socialPreviewMeta=data;
    if(data.url)urlEl.value=data.url;
    if(grpSel&&presetMap[data.platform?.id])grpSel.value=presetMap[data.platform.id];
    if(data.areaHint&&areaEl&&!areaEl.value.trim())areaEl.value=data.areaHint;
    const extra=[data.title?`หัวข้อ: “${data.title.slice(0,90)}”`:'',data.areaHint?`📍 ${data.areaHint}`:'',data.phones?.length?`📞 ${data.phones.join(', ')}`:''].filter(Boolean).join(' · ');
    hintEl.textContent=extra?`✓ ${data.platform?.badge||''} · ${extra}`:`✓ ${data.note||'ตรวจพบลิงก์โซเชียลเรียบร้อย'}`;
    hintEl.className='social-url-hint ok';
  }catch(err){
    hintEl.textContent=`⚠️ ${err.message||'ตรวจลิงก์ไม่สำเร็จ'}`;
    hintEl.className='social-url-hint warn';
  }finally{if(btn){btn.disabled=false;btn.textContent='🔎 ตรวจลิงก์';}}
}
$('#openAlertsBtn')?.addEventListener('click',openAlertsModal);
document.addEventListener('input',e=>{
  if(e.target?.id==='fbPastePostUrl')inspectSocialUrlInput({fetchPreview:false});
});
document.addEventListener('paste',e=>{
  if(!dialog.open||!$('#fbDropzone'))return;
  const files=[...(e.clipboardData?.files||[])];
  if(files.length){e.preventDefault();addFbPasteImages(files);}
});
document.addEventListener('change',e=>{
  if(e.target?.id==='fbQuickFiles'&&e.target.files?.length){addFbPasteImages(e.target.files);e.target.value='';}
});
document.addEventListener('click',async e=>{
  if(e.target?.id==='fbQuickFiles')return;
  if(e.target.closest('#socialPreviewBtn')){inspectSocialUrlInput({fetchPreview:true});return;}
  const socialSampleBtn=e.target.closest('[data-social-sample]');
  if(socialSampleBtn){
    try{
      const res=await fetch(socialSampleBtn.dataset.socialSample),blob=await res.blob();
      addFbPasteImages([new File([blob],'social-sample.jpg',{type:blob.type||'image/jpeg'})]);
    }catch{showToast('โหลดรูปตัวอย่างไม่สำเร็จ');}
    return;
  }
  if(e.target.closest('#fbDropzone')){$('#fbQuickFiles')?.click();return;}
  const selGrp=e.target.closest('[data-select-fb-group]');
  if(selGrp){const sel=$('#fbPasteGroup');if(sel)sel.value=selGrp.dataset.selectFbGroup;$('#fbDropzone')?.scrollIntoView({behavior:'smooth'});return;}
  const delGrp=e.target.closest('[data-delete-fb-group]');
  if(delGrp){
    await fetch(`/api/facebook-groups/${encodeURIComponent(delGrp.dataset.deleteFbGroup)}`,{method:'DELETE'}).catch(()=>{});
    refreshFbGroupBadge();openFacebookGroupsModal({targetItem:fbGroupTargetItem});return;
  }
  if(e.target.closest('#fbRunImportBtn')){
    const btn=$('#fbRunImportBtn');if(!btn||!fbGroupPasteQueue.length)return;
    btn.disabled=true;btn.textContent='AI กำลังสแกนรูปจากโซเชียล…';
    try{
      const grpSel=$('#fbPasteGroup'),selVal=grpSel?.value||'__ig',type=$('#fbPasteType')?.value||'found';
      const [grpData,sTools]=await Promise.all([fetch('/api/facebook-groups').then(r=>r.json()).catch(()=>({groups:[]})),socialTools]);
      const groups=grpData.groups||[];
      const linkedGrp=groups.find(g=>g.id===selVal);
      const rawPostUrl=$('#fbPastePostUrl')?.value?.trim()||'';
      const normalizedPostUrl=sTools?sTools.normalizeSocialPostUrl(rawPostUrl):safeExternalUrl(rawPostUrl);
      const urlPlatform=normalizedPostUrl&&(sTools?sTools.detectSocialPlatform(normalizedPostUrl):socialBadgeInfo(normalizedPostUrl));
      const preset=sTools?sTools.getPlatformPreset(selVal):null;
      const sourceLink=normalizedPostUrl||safeExternalUrl(linkedGrp?.url||'')||'';
      const platformLabel=urlPlatform?urlPlatform.label:(preset?preset.label:(linkedGrp?`กลุ่ม Facebook · ${linkedGrp.name}`:'โซเชียล'));
      const originBadge=urlPlatform?urlPlatform.badge:(preset?preset.badge:`📘 กลุ่ม Facebook · ${linkedGrp?.name||'Facebook'}`);
      const manualArea=($('#fbPasteArea')?.value||'').trim();
      const area=manualArea||socialPreviewMeta?.areaHint||linkedGrp?.area||`จาก ${platformLabel}`;
      const previewCaption=[socialPreviewMeta?.title,socialPreviewMeta?.author?`(${socialPreviewMeta.author})`:''].filter(Boolean).join(' ').trim();
      const imported=[];
      for(let i=0;i<fbGroupPasteQueue.length;i++){
        const dataUrl=fbGroupPasteQueue[i];
        let species=linkedGrp?.species&&linkedGrp.species!=='all'?linkedGrp.species:'unknown',breed='',coat='';
        try{
          const b=await fetch(dataUrl).then(r=>r.blob());
          const sr=await fetch('/api/suggest-species',{method:'POST',headers:{'Content-Type':b.type||'image/jpeg'},body:b});
          if(sr.ok){
            const sd=await sr.json();
            if(Object.hasOwn(speciesLabels,sd.suggestions?.[0]?.species))species=sd.suggestions[0].species;
            if(sd.coat?.primaryTag)coat=sd.coat.tags?.join(' · ')||sd.coat.primaryTag;
          }
          if(['cat','dog','bird'].includes(species)){
            const br=await fetch(`/api/suggest-breed?species=${encodeURIComponent(species)}`,{method:'POST',headers:{'Content-Type':b.type||'image/jpeg'},body:b});
            if(br.ok){const bd=await br.json(),top=bd.suggestions?.[0];if(top){const eng=String(top.name||'').replace(/\b\w/g,c=>c.toUpperCase());breed=top.thaiName?`${top.thaiName} (${eng})`:eng;}if(!coat&&bd.coat?.primaryTag)coat=bd.coat.tags?.join(' · ')||bd.coat.primaryTag;}
          }
        }catch{}
        const descParts=[`นำเข้าจาก ${originBadge}`,previewCaption,coat?`สี/ลาย: ${coat}`:''].filter(Boolean);
        imported.push({id:`social-${Date.now()}-${i}`,createdAt:new Date().toISOString(),type,species,name:`${speciesName(species)}${breed?` · ${breed}`:''}`,kind:[breed,coat].filter(Boolean).join(' · '),area,when:`นำเข้าจาก ${platformLabel}`,description:descParts.join(' · '),contact:socialPreviewMeta?.phones?.join(', ')||'',image:dataUrl,images:[dataUrl],sourceLink,origin:originBadge,position:'center',updated:`นำเข้าจาก ${originBadge}`});
      }
      const next=[...imported,...state.cases];state.cases=next;save('cases',next);renderCases();
      const target=fbGroupTargetItem||imported[0];
      closeDialog();
      showToast(`นำเข้า ${imported.length} โพสต์จาก ${originBadge} แล้ว · กำลังเทียบด้วย AI...`);
      setTimeout(()=>{if(target.species==='unknown')matchAnySpecies(target);else matchCase(target);},150);
    }catch(err){showToast(err.message||'นำเข้าภาพไม่สำเร็จ');btn.disabled=false;btn.textContent='🤖 นำเข้า & ให้ AI เทียบทันที';}
    return;
  }
  if(e.target.closest('#triggerWarmCacheBtn')){
    const b=e.target.closest('#triggerWarmCacheBtn');b.disabled=true;b.textContent='กำลังอุ่นแคชในพื้นหลัง…';
    try{const r=await fetch('/api/admin/warm-cache',{method:'POST'});if(r.ok)showToast('เริ่มอุ่นแคชเวกเตอร์ AI จาก 12 เว็บในพื้นหลังแล้ว');else showToast('เริ่มงานพื้นหลังไม่สำเร็จ');}catch{showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');}
    return;
  }
  const delCase=e.target.closest('#confirmDeleteCaseBtn');
  if(delCase){
    const id=delCase.dataset.id,needsPin=delCase.dataset.needsPin==='1';
    const pin=String($('#deleteOwnerPinInput')?.value||'').trim(),errEl=$('#deletePinError');
    if(needsPin&&!pin){if(errEl){errEl.textContent='กรุณากรอกรหัส PIN เจ้าของประกาศก่อนลบ';errEl.hidden=false;}return;}
    try{
      const headers=pin?{'X-Owner-Pin':pin}:{};
      const resp=await fetch(`/api/cases/${encodeURIComponent(id)}`,{method:'DELETE',headers});
      if(!resp.ok){
        const json=await resp.json().catch(()=>({}));
        if(errEl){errEl.textContent=json.error||'รหัส PIN ไม่ถูกต้อง ไม่สามารถลบประกาศได้';errEl.hidden=false;}
        else showToast(json.error||'ไม่สามารถลบประกาศได้');
        return;
      }
    }catch{}
    state.cases=state.cases.filter(x=>x.id!==id);state.sightings=state.sightings.filter(s=>s.caseId!==id);
    save('cases',state.cases);save('sightings',state.sightings);
    renderCases();renderSightings();closeDialog();showToast('ลบประกาศออกจากระบบแล้ว');return;
  }
  const delAlert=e.target.closest('[data-delete-alert]');
  if(delAlert){
    await fetch(`/api/alerts/${encodeURIComponent(delAlert.dataset.deleteAlert)}`,{method:'DELETE'}).catch(()=>{});
    refreshAlertBadge();openAlertsModal();return;
  }
  if(e.target.closest('#markAlertsReadBtn')){
    await fetch('/api/alerts/read',{method:'POST'}).catch(()=>{});
    refreshAlertBadge();openAlertsModal();
  }
});
document.addEventListener('submit',async e=>{
  if(e.target?.id==='fbGroupForm'){
    e.preventDefault();
    try{
      const d=Object.fromEntries(new FormData(e.target).entries());
      const r=await fetch('/api/facebook-groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
      const json=await r.json();if(!r.ok)throw Error(json.error||'เชื่อมกลุ่มไม่สำเร็จ');
      refreshFbGroupBadge();openFacebookGroupsModal({targetItem:fbGroupTargetItem,selectedGroupId:json.group?.id||''});
      showToast(`เชื่อมกลุ่ม “${json.group?.name||'Facebook'}” เข้า Pawtal แล้ว!`);
    }catch(err){showToast(err.message);}
    return;
  }
  if(e.target?.id!=='alertForm')return;
  e.preventDefault();
  try{
    const d=Object.fromEntries(new FormData(e.target).entries());
    const r=await fetch('/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    const json=await r.json();if(!r.ok)throw Error(json.error||'บันทึกแจ้งเตือนไม่สำเร็จ');
    refreshAlertBadge();openAlertsModal();
    showToast(json.initialMatches?`บันทึกแจ้งเตือนแล้ว · พบ ${json.initialMatches} เคสที่ตรงกันทันที!`:'บันทึกแจ้งเตือนแล้ว');
  }catch(err){showToast(err.message);}
});
refreshAlertBadge();
refreshFbGroupBadge();
function openTrackingFromHash(){
  if(typeof location==='undefined'||location.hash!=='#tracking')return;
  const w=$('#welcomeDialog');if(w?.open)w.close();
  let skip=false;try{skip=localStorage.getItem('pawtal-tracking-intro')==='skip';}catch{}
  if(!skip)openTrackingGuide();else openDockPanel('tracking');
  try{history.replaceState(null,'',location.pathname+location.search);}catch{}
}
let deepLinkHandled=false;
function openCaseFromQueryParam(){
  if(deepLinkHandled||typeof location==='undefined')return;
  const params=new URLSearchParams(location.search);
  const caseId=params.get('case'),action=params.get('action');
  if(caseId){
    const found=state.cases.find(x=>x.id===caseId);
    if(found){
      deepLinkHandled=true;
      const w=$('#welcomeDialog');if(w?.open)w.close();
      detail(found);
      try{history.replaceState(null,'',location.pathname);}catch{}
    }
    return;
  }
  if(action==='lost'||action==='found'){
    deepLinkHandled=true;
    const w=$('#welcomeDialog');if(w?.open)w.close();
    if(action==='lost')lostForm();else foundForm();
    try{history.replaceState(null,'',location.pathname);}catch{}
  }
}
if(typeof window!=='undefined'){
  window.addEventListener('hashchange',openTrackingFromHash);
  setTimeout(openTrackingFromHash,60);
  setTimeout(openCaseFromQueryParam,90);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}
(async function runDetectHandoff(){
  let raw=null;
  try{raw=sessionStorage.getItem('pawtal-handoff');if(!raw)return;sessionStorage.removeItem('pawtal-handoff');}catch{return;}
  try{
    const data=JSON.parse(raw||'{}');
    if(!data?.image)return;
    try{localStorage.setItem('tamnong-welcome-v1','seen');}catch{}
    const w=$('#welcomeDialog');if(w?.open)w.close();
    let species=Object.hasOwn(speciesLabels,data.species)?data.species:'unknown';
    if(species==='unknown')species=await autoDetectSpecies(data.image);
    const item={id:'case-'+Date.now(),createdAt:new Date().toISOString(),type:'lost',species,name:data.name||`${speciesName(species)}จากห้องตรวจจับ`,kind:data.breed||'',area:data.area||'ส่งต่อจากห้องตรวจจับ 5 ชนิด',when:'เมื่อสักครู่',description:data.breed?`สายพันธุ์ที่คาดว่าตรง: ${data.breed} (ส่งต่อจากห้องตรวจจับ AI)`:'ส่งรูปจากห้องตรวจจับ 5 ชนิด',contact:'',image:data.image,images:[data.image],sourceLink:'',origin:'ห้องตรวจจับ AI',position:'center',updated:'ส่งต่อจากห้องตรวจจับ AI'};
    const next=[item,...state.cases];state.cases=next;save('cases',next);renderCases();
    showToast('รับรูปจากห้องตรวจจับแล้ว · กำลังเทียบใน 12 เว็บ...');
    setTimeout(()=>{if(item.species==='unknown')matchAnySpecies(item);else matchCase(item);},150);
  }catch{}
})();
