// Shared automatic flow: local cases + photos returned by connected public Pages.
let matchingSequence=0;
let matchReview=null;
const hybridRankingTools=typeof window!=='undefined'?import('./hybrid-ranking.mjs').catch(()=>null):null;
async function reviewMatch(index){
  const context=matchReview,row=context?.rows[index];if(!row)return;
  const {queryImages}=await multiQueryTools;
  if(matchReview!==context)return;
  const queryPhotos=queryImages(context.item);
  const source=safeExternalUrl(row.sourceLink),saved=state.sightings.some(s=>s.caseId===context.item.id&&s.matchKey===matchKey(row));
  const hybridInfo=row.hybridBadge?`<br><span class="hybrid-badge">${escapeHtml(row.hybridBadge)}</span>`:'';
  openDialog('เทียบรูปก่อนเก็บเบาะแส','ซูมดูรายละเอียดและคลิกบนภาพเพื่อปักหมุดเทียบจุดตำหนิได้',`<div class="compare-toolbar"><span>🔍 ซูมตรวจจุดตำหนิ:</span><div class="compare-zoom-btns"><button type="button" class="compare-zoom-btn active" data-compare-zoom="1">1x</button><button type="button" class="compare-zoom-btn" data-compare-zoom="1.5">1.5x</button><button type="button" class="compare-zoom-btn" data-compare-zoom="2">2x</button><button type="button" class="compare-zoom-btn" data-compare-zoom="3">3x</button></div><button type="button" class="compare-clear-btn" data-compare-clear-pins>📍 ล้างหมุด (0)</button></div><div class="match-photo-pair compare-pair" data-compare-zoom-level="1"><figure><div class="match-query-views">${queryPhotos.map((photo,i)=>`<div class="compare-stage" data-compare-stage="q-${i}"><div class="compare-canvas"><img src="${escapeHtml(photo)}" alt="รูปสัตว์ที่กำลังค้นหา มุมที่ ${i+1}"><div class="compare-pins"></div></div>${queryPhotos.length>1?`<small>มุมที่ ${i+1}</small>`:""}</div>`).join("")}</div><figcaption>รูปที่ค้นหา · ${escapeHtml(context.item.name||'สัตว์ของคุณ')}</figcaption></figure><figure><div class="compare-stage" data-compare-stage="c-0"><div class="compare-canvas"><img src="${escapeHtml(row.image)}" alt="รูปจากผลค้นหา"><div class="compare-pins"></div></div></div><figcaption>${escapeHtml(row.name||'ภาพที่พบ')}</figcaption></figure></div><div class="form-note">คลิกบนภาพซ้าย–ขวาเพื่อปักหมุดเลขจุดสังเกต (เช่น รอยแผล สีตา ปลายหาง) · ภาพนี้เป็นเบาะแสสำหรับช่วยตรวจสอบเบื้องต้น<br>${escapeHtml(row.originLabel||'เคสในระบบ')} · ${escapeHtml(row.area||row.when||'ไม่ระบุพื้นที่/เวลา')}${hybridInfo}</div>${source?`<a class="post-source" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">เปิดประกาศต้นทาง ↗</a>`:''}${row.recordType==='case'?`<button class="text-link" data-action="detail" data-id="${escapeHtml(row.id)}">ดูเคสและช่องทางติดต่อ</button>`:''}<div class="form-note">คุณสามารถกดบันทึกเก็บไว้เป็นเบาะแสของเคสนี้เพื่อดูย้อนหลังได้</div><div class="form-actions"><button class="btn btn-light" data-match-back>กลับผลค้นหา</button><button class="btn btn-dark" data-match-save="${index}" ${saved?'disabled':''}>${saved?'เก็บเบาะแสแล้ว':'เก็บเป็นเบาะแสของเคส'}</button></div>`);
}
function matchKey(row){
  const source=safeExternalUrl(row.sourceLink);if(source)return source;
  if(row.id)return `${row.recordType}:${row.id}`;
  const image=String(row.image||'');let hash=2166136261;
  for(let i=0;i<image.length;i++)hash=Math.imul(hash^image.charCodeAt(i),16777619);
  return `${row.recordType}:${hash>>>0}:${image.length}`;
}
function updateComparePinCounter(){
  const clearBtn=document.querySelector('[data-compare-clear-pins]');
  if(!clearBtn)return;
  const total=document.querySelectorAll('.compare-pin').length;
  clearBtn.textContent=`📍 ล้างหมุด (${total})`;
}
document.addEventListener('click',event=>{
  const zoomBtn=event.target.closest('[data-compare-zoom]');
  if(zoomBtn){
    const level=Number(zoomBtn.dataset.compareZoom||1);
    document.querySelectorAll('[data-compare-zoom]').forEach(b=>b.classList.toggle('active',b===zoomBtn));
    const pair=document.querySelector('.compare-pair');
    if(pair){
      pair.dataset.compareZoomLevel=String(level);
      pair.querySelectorAll('.compare-canvas').forEach(cv=>{cv.style.width=`${Math.round(level*100)}%`;});
    }
    return;
  }
  if(event.target.closest('[data-compare-clear-pins]')){
    document.querySelectorAll('.compare-pin').forEach(p=>p.remove());
    updateComparePinCounter();
    return;
  }
  const existingPin=event.target.closest('.compare-pin');
  if(existingPin){
    existingPin.remove();
    updateComparePinCounter();
    return;
  }
  const compareCanvas=event.target.closest('.compare-canvas');
  if(compareCanvas){
    const pinsBox=compareCanvas.querySelector('.compare-pins');
    const rect=compareCanvas.getBoundingClientRect();
    if(pinsBox&&rect.width>0&&rect.height>0){
      const xPct=Math.max(2,Math.min(98,((event.clientX-rect.left)/rect.width)*100));
      const yPct=Math.max(2,Math.min(98,((event.clientY-rect.top)/rect.height)*100));
      const num=pinsBox.querySelectorAll('.compare-pin').length+1;
      const pin=document.createElement('button');
      pin.type='button';
      pin.className='compare-pin';
      pin.style.left=`${xPct.toFixed(1)}%`;
      pin.style.top=`${yPct.toFixed(1)}%`;
      pin.title=`หมุดจุดสังเกต #${num} (คลิกเพื่อลบ)`;
      pin.textContent=String(num);
      pinsBox.appendChild(pin);
      updateComparePinCounter();
    }
    return;
  }
  const review=event.target.closest('[data-match-review]'),back=event.target.closest('[data-match-back]'),button=event.target.closest('[data-match-save]');
  if(event.target.closest('[data-match-more]')&&matchReview?.allRows){renderMatchPage(matchReview.visibleCount+5);return;}
  if(review){reviewMatch(Number(review.dataset.matchReview));return;}
  if(back&&matchReview){openDialog(matchReview.title,matchReview.hint,matchReview.html);return;}
  if(!button||!matchReview)return;
  const {item,rows}=matchReview,row=rows[Number(button.dataset.matchSave)];
  if(!row||!state.cases.some(c=>c.id===item.id)){showToast('ไม่พบเคสสำหรับบันทึกเบาะแส');return;}
  const key=matchKey(row);
  if(state.sightings.some(s=>s.caseId===item.id&&s.matchKey===key)){button.disabled=true;button.textContent='เก็บเบาะแสแล้ว';return;}
  const clue={caseId:item.id,matchKey:key,title:`${item.name||'เคส'}: ${row.name||'ภาพคล้ายจากผลค้นหา'}`,info:`${row.area||row.when||'ไม่ระบุพื้นที่/เวลา'} · รอตรวจสอบว่าเป็นตัวเดียวกัน`,area:row.originLabel||'ผลค้นหาในโปรเจกต์',image:row.image,sourceLink:safeExternalUrl(row.sourceLink),createdAt:new Date().toISOString()};
  state.sightings.unshift(clue);
  if(!save('sightings',state.sightings)){state.sightings.shift();showToast('พื้นที่จัดเก็บเต็ม ยังไม่ได้เก็บเบาะแส กรุณาสำรองข้อมูลก่อน');return;}
  renderSightings();button.disabled=true;button.textContent='เก็บเบาะแสแล้ว';showToast('เก็บเบาะแสแล้ว เปิดดูได้ในรายละเอียดเคส');
});
async function readPublicPostMatches(item){
  try{
    let status={},fbGrpData={groups:[]};
    try{[status,fbGrpData]=await Promise.all([fetch('/api/status').then(r=>r.json()).catch(()=>({})),fetch('/api/facebook-groups').then(r=>r.json()).catch(()=>({groups:[]}))]);}catch{}
    const request=await searchPhotoRequest(item),params=new URLSearchParams({species:item.species||'unknown'});
    if(item.area)params.set('area',item.area);
    if(item.lat!==null&&item.lat!==undefined&&Number.isFinite(Number(item.lat)))params.set('lat',String(item.lat));
    if(item.lon!==null&&item.lon!==undefined&&Number.isFinite(Number(item.lon)))params.set('lon',String(item.lon));
    const providers=[{url:'/api/search-all',name:'รวมแหล่งสาธารณะ'}];
    if(status.metaPublicSearchReady)providers.push({url:'/api/facebook-public-search',name:'เพจ Facebook'});
    const responses=await Promise.all(providers.map(async provider=>{try{const response=await fetch(`${provider.url}?${params}`,{method:'POST',headers:request.headers,body:request.body}),data=await response.json();if(!response.ok)throw new Error(data.error||'อ่านแหล่งโพสต์ไม่ได้');return {...data,note:(data.sources?data.sources.map(s=>`${s.name}: ${s.message}`).join(' · ')+` · รวมรายการซ้ำออก ${data.duplicatesRemoved||0} รายการ · `:'')+`${provider.name}: มีรูปให้เทียบ ${data.postsChecked||0} รายการ${data.failedImages?` (เทียบไม่สำเร็จ ${data.failedImages} รายการ)`:''}${data.warnings?.length?' · '+data.warnings.join(' · '):''}`};}catch(error){return {groups:[],note:`${provider.name}: ${error.message}`};}}));
    const allLinked=Array.isArray(fbGrpData?.groups)?fbGrpData.groups:[];
    const linkedGroups=allLinked.filter(g=>g.species===item.species||g.species==='all').sort((a,b)=>(a.species===item.species?0:1)-(b.species===item.species?0:1)).slice(0,4);
    return {groups:responses.flatMap(data=>data.groups||[]),linkedGroups,linkedGroupsCount:allLinked.length,qualityWarnings:[...new Set(responses.flatMap(data=>data.quality?.warnings||[]))],sources:responses.flatMap(data=>data.sources||[]),note:responses.map(data=>data.note).join(' · ')+(status.metaPublicSearchReady?'':' · กลุ่ม Facebook ดึงผ่าน Pawsociety & ค้นต่อจากกลุ่มที่เชื่อมในระบบแล้ว')};
  }catch(error){return {groups:[],linkedGroups:[],linkedGroupsCount:0,note:`ค้นประกาศสาธารณะไม่สำเร็จ: ${error.message} ยังแสดงผลจากข้อมูลในโปรเจกต์ได้`};}
}
function matchingRows(rows){
  return rows.map(row=>{
    const index=matchReview.rows.push(row)-1;
    const linkStr=String(row.sourceLink||'').toLowerCase(),originStr=String(row.origin||'');
    const isFb=row.kind==='facebook'||Boolean(row.groupName)||linkStr.includes('facebook.com')||linkStr.includes('fb.com');
    let socialTag='';
    if(isFb)socialTag=`<span class="fb-match-tag">📘 กลุ่ม Facebook${row.groupName?` · ${escapeHtml(row.groupName)}`:''}</span>`;
    else if(linkStr.includes('instagram.com')||linkStr.includes('instagr.am')||originStr.includes('Instagram'))socialTag=`<span class="social-match-tag social-tag-ig">📸 Instagram</span>`;
    else if(linkStr.includes('tiktok.com')||originStr.includes('TikTok'))socialTag=`<span class="social-match-tag social-tag-tt">🎵 TikTok</span>`;
    else if(linkStr.includes('x.com/')||linkStr.includes('twitter.com')||originStr.includes('X (Twitter)'))socialTag=`<span class="social-match-tag social-tag-x">𝕏 X</span>`;
    else if(linkStr.includes('threads.net')||linkStr.includes('threads.com')||originStr.includes('Threads'))socialTag=`<span class="social-match-tag social-tag-th">🧵 Threads</span>`;
    else if(linkStr.includes('line.me')||linkStr.includes('lin.ee')||originStr.includes('LINE'))socialTag=`<span class="social-match-tag social-tag-line">💚 LINE</span>`;
    const hybTag=row.hybridBadge?`<span class="hybrid-badge">${escapeHtml(row.hybridBadge)}</span>`:'';
    return `<div class="result-card" data-similarity="${Number(row.score)}"><img src="${escapeHtml(row.image)}" referrerpolicy="no-referrer" alt="ภาพ ${escapeHtml(row.name||'สัตว์ในโพสต์')}"><div>${socialTag}${hybTag}<b>${speciesIcon(row.species)} ${escapeHtml(row.name||'โพสต์ภาพสัตว์')}</b><small>${escapeHtml(row.originLabel||'เคสในโปรเจกต์')} · ${escapeHtml(row.area||row.when||'')}${row.matchedPhotoCount?` · AI เทียบ ${row.matchedPhotoCount} รูป`:''}</small>${row.recordType==='case'?`<button class="text-link" data-action="detail" data-id="${escapeHtml(row.id)}">ดูเคสและติดต่อ →</button>`:''}${safeExternalUrl(row.sourceLink)?`<a class="post-source" href="${escapeHtml(safeExternalUrl(row.sourceLink))}" target="_blank" rel="noopener noreferrer">${isFb?'เปิดโพสต์ในกลุ่ม ↗':'เปิดโพสต์ต้นทาง ↗'}</a>`:''}<button class="text-link" data-match-review="${index}">🔍 ซูมเทียบ / เก็บเบาะแส →</button></div></div>`;
  }).join('');
}
async function matchImageAutomatically(item,anySpecies=false){
  if(!item?.image){showToast('เลือกรูปก่อนค้นหา');return;}
  if(!Object.hasOwn(speciesLabels,item.species)){identifyCaseForm(item);return;}
  const {averageQuerySimilarity}=await multiQueryTools;
  const hybridMod=await hybridRankingTools;
  anySpecies=false;
  const ticket=String(++matchingSequence),speciesList=anySpecies||item.species==='unknown'?Object.keys(speciesLabels):[item.species];
  const seenLocalKeys=new Set();
  const candidates=[];
  for(const x of state.cases){
    if(x.status==='resolved'||($('#hideDemo')?.checked&&x.isDemo)||x.id===item.id||!x.image)continue;
    if(item.type&&x.type===item.type&&x.image===item.image)continue;
    const dedupeKey=`${x.type||''}:${x.species||''}:${x.image}`;
    if(seenLocalKeys.has(dedupeKey))continue;
    seenLocalKeys.add(dedupeKey);
    candidates.push({...x,recordType:'case',originLabel:x.sourceLink?'โพสต์ที่บันทึกไว้':x.type==='found'?'เคสแจ้งพบในระบบ':'เคสสัตว์หายในระบบ'});
  }
  candidates.push(...state.profiles.filter(x=>x.image||(x.images||[]).length).map(x=>({...x,recordType:'profile',originLabel:'โปรไฟล์สัตว์เลี้ยง',description:x.color||x.kind||''})));
  openDialog('กำลังเทียบภาพอัตโนมัติ','ค้นรวมหลายเว็บไซต์และเคสในระบบ (Hybrid ภาพ + พื้นที่ + เวลา)',`<div class="match-loading"><span class="spinner"></span><b id="matchProgress">กำลังเตรียมรูปและอ่านโพสต์…</b><small>ครั้งแรกอาจต้องดาวน์โหลดโมเดล</small></div>`);
  $('#dialogBody').dataset.matchRun=ticket;
  const active=()=>dialog.open&&$('#dialogBody').dataset.matchRun===ticket;
  const publicTask=readPublicPostMatches(item),groups={};let failed=0,localError='';
  for(const species of speciesList){
    groups[species]=[];const pool=candidates.filter(x=>x.species===species);if(!pool.length)continue;
    try{
      const query=await caseQueryEmbedding(item,species);
      for(let i=0;i<pool.length;i++){
        if(!active())return;
        $('#matchProgress').textContent=`กำลังเทียบ${speciesName(species)} ${i+1}/${pool.length} และค้นประกาศจากแหล่งภายนอก…`;
        try{
          const candidateImages=[...new Set([pool[i].image,...(Array.isArray(pool[i].images)?pool[i].images:[])].filter(Boolean))].slice(0,4);
          const settled=await Promise.allSettled(candidateImages.map(async image=>({image,score:averageQuerySimilarity(query,await imageEmbedding(image,species),cosineSimilarity)})));
          const usable=settled.filter(r=>r.status==='fulfilled').map(r=>r.value).sort((a,b)=>b.score-a.score);
          failed+=settled.length-usable.length;
          if(usable.length){
            const hyb=hybridMod?.computeHybridScore?hybridMod.computeHybridScore(usable[0].score,{area:item.area,description:item.description,lat:item.lat,lon:item.lon},pool[i]):{score:usable[0].score,visualScore:usable[0].score,badge:''};
            groups[species].push({...pool[i],...usable[0],score:hyb.score,visualScore:hyb.visualScore,distanceKm:hyb.distanceKm,ageDays:hyb.ageDays,hybridBadge:hyb.badge,matchedPhotoCount:usable.length});
          }
        }catch{failed++;}
      }
    }catch(error){failed+=pool.length;localError=error.message;}
  }
  const external=await publicTask;if(!active())return;
  for(const group of external.groups||[]){
    if(!groups[group.species])continue;
    const seen=new Set(groups[group.species].map(x=>safeExternalUrl(x.sourceLink)).filter(Boolean));
    for(const row of group.results||[]){const url=safeExternalUrl(row.url);if(!url||seen.has(url)||!Number.isFinite(Number(row.score)))continue;seen.add(url);groups[group.species].push({...row,name:row.title,sourceLink:url,recordType:'public-post',originLabel:`อัตโนมัติ · ${row.groupName?`กลุ่ม Facebook: ${row.groupName}`:(row.source||(row.kind==='facebook'?'Facebook':'ประกาศสาธารณะ'))}`,when:row.date});}
  }
  const allRows=Object.values(groups).flat().sort((a,b)=>b.score-a.score);
  matchReview={item,rows:[],allRows,external,failed,localError,visibleCount:0};
  renderMatchPage(5);
}
function renderMatchPage(limit=5){
  const context=matchReview;if(!context?.allRows)return;
  const {item,allRows,external,failed,localError}=context;
  context.visibleCount=Math.min(limit,allRows.length);
  context.rows=[];
  const topSlice=allRows.slice(0,context.visibleCount);
  const cards=matchingRows(topSlice);
  const remaining=allRows.length-context.visibleCount;
  const more=remaining?`<button class="btn btn-dark" data-match-more>ดูเพิ่มเติม · อีก ${Math.min(5,remaining)} รายการ</button>`:'';
  const isFb=r=>r&&(r.kind==='facebook'||Boolean(r.groupName)||String(r.sourceLink||'').includes('facebook.com'));
  const fbMatches=allRows.filter(isFb);
  const topSet=new Set(topSlice);
  const fbExtraRows=fbMatches.filter(r=>!topSet.has(r)).slice(0,3);
  const linkedGroups=Array.isArray(external?.linkedGroups)?external.linkedGroups:[];
  const spText=typeof speciesName==='function'?speciesName(item?.species):'';
  const cleanBreed=String(item?.kind||'').replace(/\([^)]*\)/g,'').trim();
  const qTerms=[spText,cleanBreed,item?.area].map(v=>String(v||'').trim()).filter(v=>v&&!/ไม่ระบุ|ตัวอย่าง|ส่งต่อ|จากห้องตรวจจับ/.test(v));
  const groupHref=url=>{
    const m=String(url||'').match(/^(https:\/\/www\.facebook\.com\/groups\/[^/?#]+\/?)/i);
    return (m&&qTerms.length)?`${m[1].replace(/\/?$/,'/')}search/?q=${encodeURIComponent([...new Set(qTerms)].join(' ').slice(0,80))}`:url;
  };
  const cleanArea=String(item?.area||'').replace(/ไม่ระบุ|ตัวอย่าง|ส่งต่อ|จากห้องตรวจจับ|ยังไม่ระบุบริเวณ/g,'').trim().slice(0,36);
  const igTagMap={cat:'แมวหาย',dog:'หมาหาย',bird:'นกหาย',rabbit:'กระต่ายหาย',hamster:'แฮมสเตอร์หาย'};
  const altWordMap={cat:'แมวหาย',dog:'สุนัขหาย',bird:'นกหาย',rabbit:'กระต่ายหาย',hamster:'แฮมสเตอร์หาย'};
  const igTag=igTagMap[item?.species]||'สัตว์เลี้ยงหาย';
  const baseWord=altWordMap[item?.species]||spText||'สัตว์เลี้ยงหาย';
  const xQuery=[...new Set([baseWord,cleanArea].filter(Boolean))].join(' ');
  const ttQuery=[...new Set([baseWord,cleanBreed,cleanArea].filter(Boolean))].join(' ');
  const crossAppLinks=[
    {cls:'ig',label:`📸 Instagram #${igTag} ↗`,url:`https://www.instagram.com/explore/tags/${encodeURIComponent(igTag)}/`},
    {cls:'x',label:`𝕏 X ล่าสุด “${xQuery}” ↗`,url:`https://x.com/search?q=${encodeURIComponent(xQuery)}&f=live`},
    {cls:'tt',label:`🎵 TikTok “${ttQuery}” ↗`,url:`https://www.tiktok.com/search?q=${encodeURIComponent(ttQuery)}`},
    {cls:'th',label:`🧵 Threads “${xQuery}” ↗`,url:`https://www.threads.net/search?q=${encodeURIComponent(xQuery)}&serp_type=default`}
  ];
  const crossAppHtml=`<section class="social-cross-strip"><b>📱 ค้นข้ามแอปโซเชียลทันที 1 คลิก (ไม่ต้องขอ API)</b><div class="social-chip-row">${crossAppLinks.map(l=>`<a class="social-chip ${l.cls}" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`).join('')}</div></section>`;
  let fbShowcase='';
  if(fbMatches.length||linkedGroups.length){
    const fbCardsHtml=fbExtraRows.length?`<div class="fb-match-grid">${matchingRows(fbExtraRows)}</div>`:'';
    const fbSummary=fbMatches.length
      ?(fbExtraRows.length?`📘 แนะนำสัตว์ที่คล้ายกันจากกลุ่ม Facebook (พบทั้งหมด ${fbMatches.length} รายการ)`:`📘 พบสัตว์คล้ายในกลุ่ม Facebook ${fbMatches.length} รายการ (แสดงอยู่ในรายการแนะนำด้านบนแล้ว)`)
      :'📘 ค้นเพิ่มในกลุ่ม Facebook ที่เชื่อมไว้ในระบบ';
    const chipHtml=linkedGroups.length?`<div class="fb-group-chips">${linkedGroups.map(g=>`<a class="fb-group-chip" href="${escapeHtml(groupHref(g.url))}" target="_blank" rel="noopener noreferrer">🔍 ${escapeHtml(g.name)} ↗</a>`).join('')}</div>`:'';
    fbShowcase=`<section class="fb-match-showcase"><b>${fbSummary}</b>${fbCardsHtml}${chipHtml}</section>`;
  }
  const nextStepsHtml=`<section class="match-next-step-box"><b>ยังไม่เจอภาพที่ใช่? ขั้นต่อไปที่แนะนำ:</b><div class="form-actions" style="margin-top:8px"><button class="btn btn-lime" data-action="poster" data-id="${escapeHtml(item.id)}">🖼️ สร้างโปสเตอร์ QR แชร์ต่อ</button><button class="btn btn-soft-green" data-action="alertforcase" data-id="${escapeHtml(item.id)}">🔔 ตั้งแจ้งเตือนพื้นที่นี้</button><button class="btn btn-light" data-action="publicsearch" data-id="${escapeHtml(item.id)}">🔗 โซเชียล &amp; กลุ่ม FB (${external?.linkedGroupsCount||linkedGroups.length||10})</button><button class="btn btn-dark" data-close>ปิด</button></div></section>`;
  openMatchResults(allRows.length?'พบประกาศที่หน้าตาคล้ายกัน':'ยังไม่พบประกาศที่คล้ายกัน',`แสดง ${context.visibleCount} จาก ${allRows.length} รายการ · เรียงภาพที่คล้ายที่สุดก่อน`,
    `<p class="form-note">กดดูภาพเทียบเพื่อตรวจสอบลายขน ใบหน้า และจุดสังเกตของน้อง</p>${external.qualityWarnings?.length?`<div class="form-note" role="status">${external.qualityWarnings.map(escapeHtml).join('<br>')}</div>`:''}${cards||'<div class="empty">ยังไม่พบภาพที่คล้ายกัน ลองอัปโหลดรูปที่เห็นตัวน้องชัดเจนขึ้น หรือกลับมาเช็กอีกครั้งภายหลัง</div>'}${crossAppHtml}${fbShowcase}<div class="form-actions">${more}</div><details class="match-search-details"><summary>รายละเอียดแหล่งข้อมูลที่ค้นหา</summary><p class="form-note">${escapeHtml(external.note||'')}${failed?`<br>มีรูป ${failed} ภาพที่เทียบไม่สำเร็จ ${escapeHtml(localError)}`:''}</p></details>${nextStepsHtml}`);
}
async function matchCase(item){return matchImageAutomatically(item,item.species==='unknown');}
async function matchAnySpecies(item){return matchImageAutomatically(item,true);}
async function refreshPublicSourceStatus(){
  const element=$('#publicSourceStatus');if(!element)return;
  try{const response=await fetch('/api/status'),status=await response.json();element.textContent='ค้นหาอัตโนมัติจาก JS100, iFoundPet, Kwanma, PetHub Thai, PetFindHome, FM91, Foundy, PetFinder (PetFF), Pawsociety, Petio, BirdBack และ Pantip (จตุจักร)'+(status.metaPublicSearchReady?` · เพจ Facebook (${status.metaPublicPageCount} เพจ)`:'');}
  catch{element.textContent='ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้';}
}
refreshPublicSourceStatus();

function openMatchResults(title,hint,html){const photos=[...new Set([matchReview.item.image,...(Array.isArray(matchReview.item.images)?matchReview.item.images:[])].filter(Boolean))].slice(0,2);hint=`ใช้รูปค้นหา ${photos.length} รูป · ${hint}`;Object.assign(matchReview,{title,hint,html});openDialog(title,hint,html);}

