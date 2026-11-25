let catalog=[],linkedGroups=[],statuses=new Map();
const cards=document.querySelector('#sourceCards'),summary=document.querySelector('#sourceSummary'),filter=document.querySelector('#sourceMode'),refresh=document.querySelector('#refreshSources');
const speciesThai={all:'ทุกชนิด',cat:'แมว',dog:'สุนัข',bird:'นก',rabbit:'กระต่าย',hamster:'แฮมสเตอร์'};
function element(tag,text,className){const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;}
function render(){
 cards.replaceChildren();
 for(const source of catalog.filter(s=>filter.value==='all'||s.mode===filter.value)){
  const card=element('article','','source-card'),state=statuses.get(source.id)||statuses.get(source.name);
  card.append(element('span',source.mode==='auto'?'เชื่อมกับ AI แล้ว':'เปิดค้นต่อ · ยังไม่เชื่อม AI','source-tag '+source.mode),element('h2',source.name),element('p',source.note));
  if(source.mode==='auto')card.append(element('p',state?(state.ready?`✓ อ่านได้ ${state.posts} รายการ`:`○ ${state.message}`):'กดตรวจการเชื่อมต่อเพื่อดูสถานะล่าสุด','source-status'));
  const a=element('a','เปิด '+source.name+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);cards.append(card);
 }
 if(filter.value==='all'||filter.value==='app'||filter.value==='manual'){
  for(const g of linkedGroups){
   const card=element('article','','source-card');
   card.append(element('span','กลุ่ม Facebook ในระบบ','source-tag auto'),element('h2',g.name),element('p',`หมวด: ${speciesThai[g.species]||g.species||'ทุกชนิด'}${g.area?` · พื้นที่ ${g.area}`:''} (เปิดค้นด้วยคำค้น AI หรือวางรูปเทียบในหน้าแรกได้ทันที)`));
   const a=element('a','เปิดกลุ่ม Facebook นี้ ↗');a.href=g.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);cards.append(card);
  }
 }
}
filter.addEventListener('change',render);
refresh.addEventListener('click',async()=>{
 refresh.disabled=true;summary.textContent='กำลังตรวจการอ่านประกาศจริง…';
 try{const r=await fetch('/api/source-status');if(!r.ok)throw Error('ตรวจสถานะไม่สำเร็จ');const data=await r.json();statuses=new Map(data.sources.map(s=>[s.id||s.name,s]));render();summary.textContent=`ตรวจล่าสุด ${new Date().toLocaleTimeString('th-TH')} · แสดงผลตามที่แต่ละแหล่งตอบกลับ`;}
 catch(error){summary.textContent=error.message;}finally{refresh.disabled=false;}
});
(async()=>{try{const [catRes,grpRes]=await Promise.all([fetch('/source-catalog.json'),fetch('/api/facebook-groups').catch(()=>null)]);if(!catRes.ok)throw Error('โหลดรายชื่อไม่ได้');const data=await catRes.json();catalog=data.sources;if(grpRes?.ok){const gd=await grpRes.json();linkedGroups=Array.isArray(gd.groups)?gd.groups:[];}render();summary.textContent=`รวม ${catalog.length} แหล่ง/ช่องทาง${linkedGroups.length?` + ${linkedGroups.length} กลุ่ม Facebook ที่คุณเชื่อมไว้`:''} · เชื่อมอ่านประกาศอัตโนมัติ ${catalog.filter(s=>s.mode==='auto').length} แหล่ง · สำรวจ ${data.reviewedAt}`;}catch(error){summary.textContent=error.message;}})();
