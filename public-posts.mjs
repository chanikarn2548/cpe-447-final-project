import {load} from 'cheerio';
const listing='https://www.js100.com/en/site/lost_found';
let cached;
function allowedUrl(value){if(!value)return '';try{const url=new URL(value,listing);return url.protocol==='https:'&&url.hostname==='www.js100.com'?url.href:'';}catch{return '';}}
function animalInTitle(title){
  if(/กระต่าย/.test(title))return 'rabbit';if(/แฮมสเตอร์/.test(title))return 'hamster';
  if(/แมว/.test(title))return 'cat';if(/สุนัข|หมาหาย|หมาพลัดหลง/.test(title))return 'dog';if(/นกหาย|นกแก้ว|นกพลัดหลง/.test(title))return 'bird';return '';
}
export function parsePublicPosts(html){
  const $=load(html),posts=new Map();
  $('#news_list > li').each((_,li)=>{
    const node=$(li),link=node.find('a[href*="/lost_found/view/"]').filter((_,a)=>$(a).text().trim().length>0).first();
    const title=link.text().replace(/\s+/g,' ').trim(),species=animalInTitle(title),url=allowedUrl(link.attr('href')),image=allowedUrl(node.find('img').first().attr('src'));
    if(!species||!url||!image||/เจ้าของมารับ|พบเจ้าของแล้ว|เจอเจ้าของแล้ว/.test(title))return;
    posts.set(url,{kind:'public-web',species,title:title.slice(0,220),url,image,source:'JS100 · ประกาศสาธารณะ',date:node.find('.news_date').text().replace(/\s+/g,' ').trim()});
  });
  return [...posts.values()].slice(0,16);
}
export async function getPublicPosts(){
  if(cached&&cached.until>Date.now())return cached.promise;
  const promise=(async()=>{
    const response=await fetch(listing,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Tamnong-Student-Prototype/0.2 (+public lost-pet photo matching)'}});
    if(!response.ok)throw new Error(`แหล่งประกาศ JS100 ตอบ ${response.status}`);
    const html=await response.text();if(html.length>2_000_000)throw new Error('หน้ารายการประกาศมีขนาดใหญ่เกินกำหนด');
    if(!html.includes('news_list'))throw new Error('รูปแบบหน้า JS100 เปลี่ยนไป ยังอ่านรายการประกาศไม่ได้');
    return parsePublicPosts(html);
  })();cached={until:Date.now()+10*60_000,promise};
  try{return await promise;}catch(error){if(cached?.promise===promise)cached=null;throw error;}
}
const vectorCache=new Map();
const EMBED_CACHE_VERSION='v5-resmlp';
async function candidateVector(post,model,embed,cacheStore){
  const key=`${EMBED_CACHE_VERSION}:${model}:${post.species}:${post.image}`,existing=vectorCache.get(key);if(existing)return existing;
  if(cacheStore?.get){
    const persisted=cacheStore.get(key);
    if(persisted){
      if(vectorCache.size>=700)vectorCache.delete(vectorCache.keys().next().value);
      const resolved=Promise.resolve(persisted);
      vectorCache.set(key,resolved);
      return resolved;
    }
  }
  const promise=(async()=>{
    const response=await fetch(post.image,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('อ่านรูปประกาศไม่ได้');
    const chunks=[];let size=0;
    for await(const chunk of response.body){size+=chunk.length;if(size>5_000_000)throw new Error('รูปประกาศใหญ่เกินไป');chunks.push(chunk);}
    const vec=await embed(Buffer.concat(chunks,size),model,post.species);
    try{cacheStore?.set?.(key,model,post.species,vec);}catch{}
    return vec;
  })();
  if(vectorCache.size>=700)vectorCache.delete(vectorCache.keys().next().value);vectorCache.set(key,promise);
  try{return await promise;}catch(error){if(vectorCache.get(key)===promise)vectorCache.delete(key);throw error;}
}
export async function rankPublicPosts(body,species,embed,similarity,provider=getPublicPosts,cacheStore=null){
  const posts=(await provider()).filter(post=>species==='unknown'||post.species===species),groups=[],queries=new Map(),warnings=[];let failed=0;
  for(const animal of (species==='unknown'?['dog','cat','bird','rabbit','hamster']:[species])){
    const pool=posts.filter(post=>post.species===animal);if(!pool.length)continue;
    const model=['dog','cat'].includes(animal)?'pet-base':'dino-bird',results=[];let query;
    try{
      const queryKey=model+':'+animal;
      if(!queries.has(queryKey))queries.set(queryKey,embed(body,model,animal));
      query=await queries.get(queryKey);
    }catch{failed+=pool.length;warnings.push(`ยังเทียบกลุ่ม ${animal} ไม่สำเร็จ: โมเดลไม่พร้อม กรุณาลองใหม่`);continue;}
    // Process candidate image downloads in small bounded batches across providers.
    for(let i=0;i<pool.length;i+=4){
      const batch=pool.slice(i,i+4);
      await Promise.all(batch.map(async post=>{
        try{const vector=await candidateVector(post,model,embed,cacheStore);results.push({...post,score:similarity(query,vector)});}
        catch{failed++;}
      }));
    }
    groups.push({species:animal,results:results.sort((a,b)=>b.score-a.score).slice(0,12)});
  }
  return {groups,postsChecked:posts.length,failedImages:failed,warnings};
}
