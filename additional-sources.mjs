import {load} from 'cheerio';
const caches=new Map();
const discoveredGroups=new Map();
const KNOWN_FB_GROUP_NAMES={
 '217672018379895':'รวมหมาแมวหาย หมาแมวหลง',
 '4465234313758768':'แมวหมา-สัตว์เลี้ยงหายทั่วไทย',
 '261650613992940':'ประกาศนกหาย ตามหาเจ้าของ',
 '879535573409695':'กลุ่มตามหานกหาย-นกหลุด (Pawsociety)',
 '330370007395358':'ตามหาแมวหาย ตามหาบ้านให้น้องเหมียว',
 '1583911722984023':'หมาหลง แมวหาย ตามหาเจ้าของ',
 'petbackhomegroup':'Pet Back Home (สัตว์หายได้กลับบ้าน)',
 '912622389504022':'กลุ่มสัตว์เลี้ยงหาย หมา แมว นก',
 '1146955245921778':'กลุ่มตามหาแมว-สุนัขหาย',
 '143685079175348':'กลุ่มตามหาสุนัข-แมวหาย',
 '274604807660778':'ตามหานกหาย หมาหาย แมวหาย และสัตว์เลี้ยงทุกชนิด',
 '530073320391399':'ศูนย์รวมประกาศสุนัขหาย',
 '399858348018822':'หมาแมวหายได้กลับบ้าน',
 '578917096096516':'หมาแมวหลง/หาย @นนทบุรี',
 '1619330234961719':'กลุ่มคนรักหมาแมว นครปฐม',
 '1128441937342674':'หมาหายชลบุรี',
 '1781374372076187':'ตามหาหมาแมวหลงพัทยา',
 '1689605884677727':'ประกาศแมวหาย สุนัขล่องหน เชียงใหม่',
 '624353101509966':'หมาแมวหลง-หาย (ใส่ #จังหวัด)',
 '1633976433538628':'หมา-แมวหลง-หาย เชียงราย',
 '657874584313907':'หมา แมว หายในโคราช'
};
export function getDiscoveredFacebookGroups(){return [...discoveredGroups.values()];}
function rememberFacebookGroup(url,name='',species='all',area=''){
 const m=String(url||'').match(/^https:\/\/(?:www\.|m\.)?facebook\.com\/groups\/([^/?#]+)/i);
 if(!m)return;
 const cleanUrl=`https://www.facebook.com/groups/${m[1]}/`;
 const prev=discoveredGroups.get(cleanUrl);
 const cleanName=String(name||'').trim();
 if(!prev||(!prev.name&&cleanName))discoveredGroups.set(cleanUrl,{url:cleanUrl,name:cleanName||prev?.name||'',species,area:String(area||'').trim()});
}
const closedCaseRe=/ได้คืน|กลับบ้านแล้ว|พบเจ้าของแล้ว|พบแล้ว|เจอเจ้าของแล้ว|ตัวอย่าง|ทดสอบ|\[AI\]/i;
function speciesFrom(text){
 const matches=[['cat',/แมว/],['dog',/สุนัข|หมา/],['bird',/นก/],['rabbit',/กระต่าย/],['hamster',/แฮมสเตอร์/]].filter(([,re])=>re.test(text));
 return matches.length===1?matches[0][0]:null;
}
function speciesAny(raw){
 const direct=speciesFrom(String(raw||''));if(direct)return direct;
 const s=String(raw||'').toLowerCase().trim();
 if(['cat','cats'].includes(s))return 'cat';
 if(['dog','dogs'].includes(s))return 'dog';
 if(['bird','birds','parrot'].includes(s))return 'bird';
 if(['rabbit','rabbits'].includes(s))return 'rabbit';
 if(['hamster','hamsters'].includes(s))return 'hamster';
 return null;
}
function httpsOn(value,base,hosts){if(typeof value!=='string'||!value.trim())return '';try{const u=new URL(value,base);return u.protocol==='https:'&&hosts.includes(u.hostname)?u.href:'';}catch{return '';}}
function decodeRscText(text){
 return String(text||'').replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\"/g,'"').replace(/\\\\/g,'\\');
}
export function parseFM91(html){
 const $=load(html),cards=$('a[href*="/newsarticle/"]').filter((_,e)=>$(e).find('img').length),posts=[];
 if(!cards.length)throw Error('ยังอ่านรายการข่าว FM91 ไม่ได้');
 cards.each((_,el)=>{const c=$(el),title=c.find('.card-text').text().trim(),species=speciesFrom(title),type=/ตามหาเจ้าของ|พบ.*หลง/.test(title)?'found':/หาย|ตามหา/.test(title)?'lost':null;
 const url=httpsOn(c.attr('href'),'https://fm91bkk.com/',['fm91bkk.com']),image=httpsOn(c.find('img').attr('data-src')||c.find('img').attr('src'),'https://fm91bkk.com/',['fm91bkk.com']);
 if(!species||!type||!url||!image||/ได้คืน|กลับบ้านแล้ว|พบเจ้าของแล้ว|พบแล้ว/.test(title))return;
 posts.push({kind:'public-web',species,type,title:title.slice(0,180),url,image,source:'FM91',date:c.find('.text-muted').text().trim()});
 });return posts;
}
export function parseFoundy(html,defaultType='lost'){
 const $=load(html),cards=$('a[href^="/pet/"]').filter((_,e)=>$(e).find('img').length),posts=[];
 if(!cards.length)throw Error('ยังอ่านรายการ Foundy ไม่ได้');
 cards.each((_,el)=>{const c=$(el),title=c.find('h3').text().trim(),species=speciesFrom(c.find('span').text());
 const url=httpsOn(c.attr('href'),'https://foundy.pet/',['foundy.pet']),image=httpsOn(c.find('img').attr('src'),'https://foundy.pet/',['api.foundy.pet']);
 if(!species||!url||!image||closedCaseRe.test(c.text()))return;
 posts.push({kind:'public-web',species,type:defaultType,title:title.slice(0,180),url,image,source:'Foundy',area:c.find('p').first().text().trim(),date:c.find('p').last().text().trim()});
 });return posts;
}
export function parseKwanma(html){
 const $=load(html),cards=$('a.pet-card[href^="/pet/"]'),posts=[];
 if(!cards.length)throw Error('ยังอ่านการ์ดประกาศ Kwanma ไม่ได้');
 cards.each((_,el)=>{
  const c=$(el),title=c.find('.pet-card-title').text().trim(),detail=c.find('.pet-card-detail').text();
  const type=c.find('.pet-card-badge__lost').length?'lost':c.find('.pet-card-badge__found').length?'found':null;
  const species=speciesFrom(title+' '+detail);
  const url=httpsOn(c.attr('href'),'https://www.kwanma.com',['www.kwanma.com']);
  const image=httpsOn(c.find('img').attr('src'),'https://www.kwanma.com',['mwkhbqehhbizhrizzlqd.supabase.co']);
  if(!type||!species||!url||!image||/\[AI\]|พบเจ้าของแล้ว|กลับบ้านแล้ว/.test(title))return;
  posts.push({kind:'public-web',species,type,title:title.slice(0,180),url,image,source:'Kwanma',area:c.find('.pet-card-location').first().text().trim(),date:c.find('.pet-card-time').text().trim()});
 });return posts;
}
export function parsePetHub(html){
 const $=load(html),cards=$('a[href^="/post/"]').filter((_,e)=>$(e).find('img').length),posts=[];
 if(!cards.length)throw Error('ยังอ่านการ์ดประกาศ PetHub Thai ไม่ได้');
 cards.each((_,el)=>{
  const c=$(el),title=c.find('h3').text().trim(),badge=c.find('.badge').text().trim(),text=c.text();
  const type=badge==='หาย'?'lost':badge==='พบ'?'found':null,species=speciesFrom(text);
  const url=httpsOn(c.attr('href'),'https://pethubthai.com',['pethubthai.com']);
  const image=httpsOn(c.find('img').attr('src'),'https://pethubthai.com',['api.pethubthai.com']);
  if(!type||!species||!url||!image||closedCaseRe.test(text))return;
  posts.push({kind:'public-web',species,type,title:title.slice(0,180),url,image,source:'PetHub Thai',date:c.find('.space-y-1\\.5 > div').last().text().trim()});
 });return posts;
}
export function parsePetFF(html){
 const rscBlocks=html.split(/\{\\"data-slot\\":\\"card\\"|{"data-slot":"card"/).slice(1),posts=[];
 if(rscBlocks.length){
  for(const raw of rscBlocks){
   const b=decodeRscText(raw);
   const href=b.match(/"href"\s*:\s*"(\/(?:lost|found)-pets\/[a-zA-Z0-9-]+)"/)?.[1]||'';
   const imgRaw=b.match(/"imageUrl"\s*:\s*"(https:\/\/[^"]+)"/)?.[1]||'';
   const title=b.match(/"data-slot"\s*:\s*"card-title"[^}]*?"children"\s*:\s*"([^"]*)"/)?.[1]||'';
   const desc=b.match(/"data-slot"\s*:\s*"card-description"[^}]*?"children"\s*:\s*"([^"]*)"/)?.[1]||'';
   const area=b.match(/lucide-map-pin[\s\S]{0,600}?"className"\s*:\s*"truncate"\s*,\s*"children"\s*:\s*"([^"]*)"/)?.[1]||'';
   const datePair=b.match(/lucide-calendar[\s\S]{0,600}?"children"\s*:\s*\["([^"]*)","([^"]*)"\]/);
   const date=datePair?`${datePair[1]}${datePair[2]}`.trim():'';
   const type=href.startsWith('/found-pets/')?'found':href.startsWith('/lost-pets/')?'lost':null;
   const species=speciesFrom(`${title} ${desc}`);
   const url=httpsOn(href,'https://www.petff.in.th',['www.petff.in.th','petff.in.th']);
   const image=httpsOn(imgRaw,'https://www.petff.in.th',['vsldfdagwtitzpsvgvxv.supabase.co','www.petff.in.th']);
   const fullText=`${title} ${desc} ${area} ${date}`;
   if(!type||!species||!url||!image||closedCaseRe.test(fullText))continue;
   posts.push({kind:'public-web',species,type,title:`${title}${desc?` · ${desc}`:''}`.trim().slice(0,180),url,image,source:'PetFinder (PetFF)',area:area.trim(),date});
  }
  return posts;
 }
 const $=load(html),cards=$('[data-slot="card"]');
 if(!cards.length)throw Error('ยังอ่านรายการประกาศ PetFinder (PetFF) ไม่ได้');
 cards.each((_,el)=>{
  const c=$(el),a=c.find('a[href*="-pets/"]').first(),href=a.attr('href')||'';
  const title=c.find('[data-slot="card-title"]').text().trim(),desc=c.find('[data-slot="card-description"]').text().trim();
  const type=href.startsWith('/found-pets/')?'found':href.startsWith('/lost-pets/')?'lost':null;
  const species=speciesFrom(`${title} ${desc}`);
  const url=httpsOn(href,'https://www.petff.in.th',['www.petff.in.th','petff.in.th']);
  const image=httpsOn(c.find('img').first().attr('src'),'https://www.petff.in.th',['vsldfdagwtitzpsvgvxv.supabase.co','www.petff.in.th']);
  if(!type||!species||!url||!image||closedCaseRe.test(c.text()))return;
  posts.push({kind:'public-web',species,type,title:`${title}${desc?` · ${desc}`:''}`.trim().slice(0,180),url,image,source:'PetFinder (PetFF)',date:''});
 });
 return posts;
}
export function parsePawsociety(rows,defaultType='lost'){
 if(!Array.isArray(rows))throw Error('ยังอ่านข้อมูลประกาศ Pawsociety ไม่ได้');
 const posts=[];
 for(const r of rows){
  if(!r||typeof r!=='object')continue;
  const text=String(r.text||''),name=String(r.name||'').trim(),species=speciesAny(r.pet_type)||speciesFrom(`${name} ${r.breed||''}`);
  if(!species||closedCaseRe.test(`${name} ${text}`)||/ตามหาบ้านให|รอบ้านใหม|เปิดหาบ้าน/.test(text))continue;
  const images=Array.isArray(r.images)?r.images:[];
  const image=images.map(img=>httpsOn(img,'https://api.pawsociety.pet',['api.pawsociety.pet'])).find(Boolean);
  if(!image)continue;
  const fbOrPaw=httpsOn(r.source_url,'https://pawsociety.pet',['www.facebook.com','facebook.com','m.facebook.com','pawsociety.pet','www.pawsociety.pet']);
  const url=fbOrPaw||httpsOn(`/?post=${encodeURIComponent(String(r.id||''))}`,'https://pawsociety.pet',['pawsociety.pet']);
  if(!url)continue;
  const isFacebook=/facebook\.com/.test(url);
  const grpSlug=url.match(/facebook\.com\/groups\/([^/?#]+)/i)?.[1]||'';
  const groupUrl=grpSlug?`https://www.facebook.com/groups/${grpSlug}/`:'';
  const groupName=grpSlug?(KNOWN_FB_GROUP_NAMES[grpSlug]||`กลุ่ม Facebook #${grpSlug}`):'';
  const titleParts=[name&&name!=='น้อง'?name:'',r.pet_type||'',r.color||''].filter(Boolean);
  const snippet=text.replace(/\s+/g,' ').trim().slice(0,120);
  const title=(titleParts.length?titleParts.join(' · '):snippet||'ประกาศสัตว์เลี้ยง').slice(0,180);
  posts.push({
   kind:isFacebook?'facebook':'public-web',
   species,
   type:defaultType,
   title,
   url,
   image,
   source:isFacebook?'Pawsociety · กลุ่ม Facebook':'Pawsociety',
   groupName,
   groupUrl,
   area:String(r.location||'').trim(),
   date:String(r.last_seen||r.created_at||'').slice(0,40)
  });
 }
 return posts;
}
export function parsePetio(payload){
 const data=typeof payload==='string'?JSON.parse(payload):payload;
 if(!data?.success||!Array.isArray(data.data))throw Error('ยังอ่านข้อมูลประกาศ Petio ไม่ได้');
 const posts=[];
 for(const r of data.data){
  if(!r||!['lost','found'].includes(r.postStatus))continue;
  const image=httpsOn(r.petImage,'https://petio.care',['cdn.petio.care']);
  if(!image)continue;
  const rawSpecies=Array.isArray(r.petInfo?.species)?r.petInfo.species:[r.petInfo?.species];
  const speciesList=rawSpecies.map(speciesAny).filter(Boolean);
  const species=speciesList.length===1?speciesList[0]:speciesFrom(r.content||'');
  const titleText=`${r.petName||''} ${r.content||''}`.replace(/\s+/g,' ').trim();
  if(!species||closedCaseRe.test(titleText))continue;
  const postPath=r.source==='petio'&&/^[a-zA-Z0-9_-]+$/.test(String(r.id||''))?`/found-pets/${r.id}`:'/social-watch';
  const url=httpsOn(postPath,'https://petio.care',['petio.care']);
  if(!url)continue;
  const area=[r.extractedLocation,r.extractedProvince].filter(Boolean).join(', ');
  posts.push({
   kind:'public-web',
   species,
   type:r.postStatus,
   title:(titleText||'ประกาศสัตว์เลี้ยง Petio').slice(0,180),
   url,
   image,
   source:'Petio',
   area,
   date:String(r.postedAt||'').slice(0,10)
  });
 }
 return posts;
}
async function readTextLimited(response,limit=2_000_000){
 let size=0;const chunks=[];
 for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('หน้าประกาศใหญ่เกินกำหนด');chunks.push(chunk);}
 return Buffer.concat(chunks).toString('utf8');
}
async function cachedPages(id,urls,parser){
 const old=caches.get(id);if(old&&old.until>Date.now())return old.promise;
 const promise=(async()=>{const rows=[];
  for(const url of urls){
   const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Tamnong-Student-Prototype/0.2'}});
   if(!r.ok)throw Error(`${id} ตอบ ${r.status}`);
   rows.push(...parser(await readTextLimited(r)).slice(0,24));
  }return [...new Map(rows.map(p=>[p.url,p])).values()];
 })();caches.set(id,{promise,until:Date.now()+600000});
 try{return await promise;}catch(error){if(caches.get(id)?.promise===promise)caches.delete(id);throw error;}
}
const PAW_SPECIES_QUERY={dog:'สุนัข',cat:'แมว',bird:'นก',rabbit:'กระต่าย',hamster:'แฮมสเตอร์'};
export async function getPawsocietyPosts(species='unknown'){
 const pawQ=PAW_SPECIES_QUERY[species]||null;
 const cacheKey='Pawsociety:'+(pawQ||'all');
 const old=caches.get(cacheKey);if(old&&old.until>Date.now())return old.promise;
 const promise=(async()=>{
  const homeRes=await fetch('https://pawsociety.pet/',{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Tamnong-Student-Prototype/0.2'}});
  if(!homeRes.ok)throw Error(`Pawsociety ตอบ ${homeRes.status}`);
  const homeHtml=await readTextLimited(homeRes);
  const bundlePath=homeHtml.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
  const bundleUrl=httpsOn(bundlePath,'https://pawsociety.pet',['pawsociety.pet']);
  if(!bundleUrl)throw Error('ไม่พบสคริปต์สาธารณะของ Pawsociety');
  const bundleRes=await fetch(bundleUrl,{signal:AbortSignal.timeout(15000)});
  if(!bundleRes.ok)throw Error(`Pawsociety bundle ตอบ ${bundleRes.status}`);
  const bundleJs=await readTextLimited(bundleRes,3_000_000);
  const anonKey=bundleJs.match(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/)?.[0];
  if(!anonKey)throw Error('ไม่พบ public client key ของ Pawsociety');
  const headers={apikey:anonKey,Authorization:`Bearer ${anonKey}`,'Content-Type':'application/json'};
  const rpc=(fn,limit,q)=>fetch(`https://api.pawsociety.pet/rest/v1/rpc/${fn}`,{method:'POST',headers,body:JSON.stringify({p_limit:limit,p_offset:0,p_q:q}),signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error(`Pawsociety ${fn} ตอบ ${r.status}`);return r.json();});
  const calls=[rpc('list_lost_pets',40,null),rpc('list_found_pets',40,null)];
  if(pawQ)calls.push(rpc('list_lost_pets',50,pawQ),rpc('list_found_pets',50,pawQ));
  const [lostAll,foundAll,lostSp=[],foundSp=[]]=await Promise.all(calls);
  const lostRows=[...lostSp,...lostAll],foundRows=[...foundSp,...foundAll];
  for(const row of [...lostRows,...foundRows])rememberFacebookGroup(row?.source_url,'',speciesAny(row?.pet_type)||'all',row?.location||'');
  return [...new Map([...parsePawsociety(lostRows,'lost'),...parsePawsociety(foundRows,'found')].map(p=>[p.url,p])).values()];
 })();caches.set(cacheKey,{promise,until:Date.now()+600000});
 try{return await promise;}catch(error){if(caches.get(cacheKey)?.promise===promise)caches.delete(cacheKey);throw error;}
}
export const getKwanmaPosts=()=>cachedPages('Kwanma',['https://www.kwanma.com/map?status=lost','https://www.kwanma.com/map?status=found'],parseKwanma);
export const getPetHubPosts=()=>cachedPages('PetHub Thai',['https://pethubthai.com/'],parsePetHub);
export const getFM91Posts=()=>cachedPages('FM91',['https://fm91bkk.com/lostandfound','https://fm91bkk.com/lostandfound?page=2','https://fm91bkk.com/lostandfound?page=3'],parseFM91);
export const getFoundyPosts=()=>cachedPages('Foundy',['https://foundy.pet/lost-pets','https://foundy.pet/found-pets'],html=>parseFoundy(html,html.includes('แจ้งพบสัตว์')||html.includes('found-pets')?'found':'lost'));
export const getPetFFPosts=()=>cachedPages('PetFinder (PetFF)',['https://www.petff.in.th/list/lost','https://www.petff.in.th/list/lost?page=2','https://www.petff.in.th/list/found','https://www.petff.in.th/list/found?page=2'],parsePetFF);
export async function getPetioPosts(){
 const old=caches.get('Petio');if(old&&old.until>Date.now())return old.promise;
 const promise=(async()=>{
  const r=await fetch('https://petio.care/api/pet-hub/scraped-posts?limit=150',{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Tamnong-Student-Prototype/0.2'}});
  if(!r.ok)throw Error(`Petio ตอบ ${r.status}`);
  const payload=JSON.parse(await readTextLimited(r));
  for(const row of payload?.data||[]){
   const spList=Array.isArray(row?.petInfo?.species)?row.petInfo.species:[];
   const sp=spList.length===1?speciesAny(spList[0])||'all':'all';
   rememberFacebookGroup(row?.groupUrl,row?.groupName||'',sp,row?.extractedProvince||'');
  }
  return parsePetio(payload).slice(0,24);
 })();caches.set('Petio',{promise,until:Date.now()+600000});
 try{return await promise;}catch(error){if(caches.get('Petio')?.promise===promise)caches.delete('Petio');throw error;}
}
export function parseBirdBack(html,defaultType='lost'){
 const $=load(html),cards=$('a.bird-card[href*="detail.php"]'),posts=[];
 if(!cards.length)throw Error('ยังอ่านประกาศนกจาก BirdBack ไม่ได้');
 cards.each((_,el)=>{
  const c=$(el),title=c.find('.bird-card-title').text().trim(),metas=c.find('.bird-card-meta').map((__,m)=>$(m).text().replace(/\s+/g,' ').trim()).get();
  const fullText=`${title} ${metas.join(' ')} ${c.find('.badge').text()}`;
  const url=httpsOn(c.attr('href'),'https://tagme.love',['tagme.love']);
  const image=httpsOn(c.find('img').first().attr('src'),'https://tagme.love',['tagme.love']);
  const area=metas[1]||'';const breed=metas[0]||'';const date=metas[2]||'';
  if(!url||!image||closedCaseRe.test(fullText))return;
  posts.push({
   kind:'public-web',
   species:'bird',
   type:defaultType,
   title:`${title||'นก'}${breed&&breed!==title?` (${breed})`:''}`.slice(0,180),
   url,
   image,
   source:'BirdBack (เพื่อนรักนกของเรา)',
   area,
   date
  });
 });
 return posts;
}
export async function getBirdBackPosts(){
 const old=caches.get('BirdBack');if(old&&old.until>Date.now())return old.promise;
 const promise=(async()=>{
  const pages=[
   {url:'https://tagme.love/lost_birds.php?page=1',type:'lost'},
   {url:'https://tagme.love/lost_birds.php?page=2',type:'lost'},
   {url:'https://tagme.love/lost_birds.php?page=3',type:'lost'},
   {url:'https://tagme.love/found_birds.php',type:'found'}
  ];
  const batches=await Promise.all(pages.map(async p=>{
   const r=await fetch(p.url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Tamnong-Student-Prototype/0.2'}});
   if(!r.ok)throw Error(`BirdBack ตอบ ${r.status}`);
   return parseBirdBack(await readTextLimited(r),p.type);
  }));
  return [...new Map(batches.flat().map(p=>[p.url,p])).values()];
 })();caches.set('BirdBack',{promise,until:Date.now()+600000});
 try{return await promise;}catch(error){if(caches.get('BirdBack')?.promise===promise)caches.delete('BirdBack');throw error;}
}
const PANTIP_EXCLUDE_RE=/ดูดวง|หมอดู|ความเชื่อ|เคล็ดลับ|แชร์เว็บไซต์|วิธีตามหา|อาการซึม|เตือน\s*!|โดน.*ย่าง|ทำยังไงดี|ถามผู้รู้|ปรึกษา/i;
const PANTIP_INTENT_RE=/(?:ตามหา|ประกาศ.*หาย|พลัดหลง|พบ.*หลง|เจอ.*หลง).*(?:สุนัข|หมา|แมว|นก|กระต่าย|แฮมสเตอร์)|(?:สุนัขหาย|หมาหาย|แมวหาย|นกหาย|กระต่ายหาย|แฮมสเตอร์หาย)/i;
export function parsePantipSearch(payload){
 const data=typeof payload==='string'?JSON.parse(payload):payload;
 if(!data?.success||!Array.isArray(data.data))throw Error('ยังอ่านผลค้นหา Pantip ไม่ได้');
 const posts=[];
 for(const r of data.data){
  if(!r||typeof r!=='object')continue;
  const clean=t=>String(t||'').replace(/\{\{e?em\}\}/g,'').replace(/\s+/g,' ').trim();
  const title=clean(r.title),detail=clean(r.detail),text=`${title} ${detail}`;
  if(!title||PANTIP_EXCLUDE_RE.test(text)||closedCaseRe.test(text)||!PANTIP_INTENT_RE.test(text))continue;
  const species=speciesFrom(text);
  const url=httpsOn(r.url,'https://pantip.com',['pantip.com']);
  const image=httpsOn(r.cover_img||r.thumbnail_url,'https://pantip.com',['f.ptcdn.info']);
  if(!species||!url||!image)continue;
  const type=/พบ.*หลง|เจอ.*หลง|หาเจ้าของ/.test(text)&&!/หาย/.test(title)?'found':'lost';
  const ts=Number(r.created_time);
  const date=Number.isFinite(ts)&&ts>0?new Date(ts*1000).toISOString().slice(0,10):'';
  posts.push({kind:'public-web',species,type,title:title.slice(0,180),url,image,source:'Pantip · ห้องจตุจักร',date});
 }
 return posts;
}
const PANTIP_QUERIES={dog:['ตามหาสุนัขหาย'],cat:['ตามหาแมวหาย'],bird:['ตามหานกหาย'],rabbit:['กระต่ายหาย'],hamster:['แฮมสเตอร์หาย']};
export async function getPantipPosts(species='unknown'){
 const queries=PANTIP_QUERIES[species]||['ตามหาสุนัขหาย','ตามหาแมวหาย','ตามหานกหาย'];
 const cacheKey='Pantip:'+queries.join(',');
 const old=caches.get(cacheKey);if(old&&old.until>Date.now())return old.promise;
 const promise=(async()=>{
  const headers={'ptauthorize':'Basic dGVzdGVyOnRlc3Rlcg==','Content-Type':'application/json','User-Agent':'Tamnong-Student-Prototype/0.2'};
  const batches=await Promise.all(queries.map(async keyword=>{
   const r=await fetch('https://pantip.com/api/search-service/search/getresult',{method:'POST',headers,body:JSON.stringify({keyword,limit:15,page:1,rooms:['jatujak']}),signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error(`Pantip ตอบ ${r.status}`);
   return parsePantipSearch(await readTextLimited(r));
  }));
  return [...new Map(batches.flat().map(p=>[p.url,p])).values()];
 })();caches.set(cacheKey,{promise,until:Date.now()+600000});
 try{return await promise;}catch(error){if(caches.get(cacheKey)?.promise===promise)caches.delete(cacheKey);throw error;}
}
