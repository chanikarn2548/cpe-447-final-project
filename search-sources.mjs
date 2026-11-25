import {getPublicPosts,rankPublicPosts} from './public-posts.mjs';
import {getIFoundPetPosts} from './ifoundpet.mjs';
import {getPetFindHomePosts} from './petfindhome.mjs';
import {getKwanmaPosts,getPetHubPosts,getFM91Posts,getFoundyPosts,getPetFFPosts,getPawsocietyPosts,getPetioPosts,getBirdBackPosts,getPantipPosts} from './additional-sources.mjs';
import {assessImageQuality} from './image-quality.mjs';
export const publicSources=[
 {id:'fm91',name:'FM91',url:'https://fm91bkk.com/lostandfound',load:getFM91Posts},
 {id:'foundy',name:'Foundy',url:'https://foundy.pet/lost-pets',load:getFoundyPosts},
 {id:'js100',name:'JS100',url:'https://www.js100.com/en/site/lost_found',load:getPublicPosts},
 {id:'ifoundpet',name:'iFoundPet',url:'https://ifoundpet.com/announcement/find',load:getIFoundPetPosts},
 {id:'petfindhome',name:'PetFindHome',url:'https://petfindhome.com/',load:getPetFindHomePosts},
 {id:'kwanma',name:'Kwanma',url:'https://www.kwanma.com/map',load:getKwanmaPosts},
 {id:'pethubthai',name:'PetHub Thai',url:'https://pethubthai.com/',load:getPetHubPosts},
 {id:'petff',name:'PetFinder (PetFF)',url:'https://www.petff.in.th/list/lost',load:getPetFFPosts},
 {id:'pawsociety',name:'Pawsociety',url:'https://pawsociety.pet/',load:getPawsocietyPosts},
 {id:'petio',name:'Petio',url:'https://petio.care/social-watch',load:getPetioPosts},
 {id:'birdback',name:'BirdBack',url:'https://tagme.love/lost_birds.php',load:getBirdBackPosts},
 {id:'pantip',name:'Pantip (จตุจักร)',url:'https://pantip.com/forum/jatujak',load:getPantipPosts}
];
export function canonicalUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:')return '';u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|mibextid)$|^(__cft__|__tn__)/.test(key))u.searchParams.delete(key);u.searchParams.sort();return u.href;}catch{return '';}
}
export function dedupePosts(posts){
 const rows=[],byUrl=new Map(),byImage=new Map();let duplicatesRemoved=0;
 for(const p of posts){
  const url=canonicalUrl(p.url),image=canonicalUrl(p.image);if(!url||!image)continue;
  const imageKey=p.species+':'+image,existing=byUrl.get(url)||byImage.get(imageKey);
  if(existing){duplicatesRemoved++;if(!existing.origins.some(x=>x.url===url))existing.origins.push({name:p.source,url});byUrl.set(url,existing);byImage.set(imageKey,existing);continue;}
  const row={...p,url,image,origins:[{name:p.source,url}]};rows.push(row);byUrl.set(url,row);byImage.set(imageKey,row);
 }return {posts:rows,duplicatesRemoved};
}
export async function collectSources(species='unknown',providers=publicSources){
 const results=await Promise.all(providers.map(async p=>{
  try{const posts=await p.load(species),selected=posts.filter(x=>species==='unknown'||x.species===species);return {posts:selected,status:{id:p.id,name:p.name,url:p.url,ready:true,posts:posts.length,eligible:selected.length,message:posts.length?`อ่านได้ ${posts.length} ประกาศ · ตรงชนิดสัตว์ ${selected.length}`:'เชื่อมต่อได้ แต่ยังไม่มีประกาศหาย/พบที่อ่านได้'}};}
  catch(error){return {posts:[],status:{id:p.id,name:p.name,url:p.url,ready:false,posts:0,eligible:0,message:error.message}};}
 }));
 return {...dedupePosts(results.flatMap(r=>r.posts)),sources:results.map(r=>r.status),checkedAt:new Date().toISOString()};
}
export async function searchAllSources(body,species,embed,similarity,providers=publicSources,cacheStore=null){
 const qualities=await Promise.all((Array.isArray(body)?body:[body]).map(assessImageQuality));
 const quality={...qualities[0],photos:qualities.length,warnings:[...new Set(qualities.flatMap((q,i)=>q.warnings.map(w=>qualities.length>1?`รูป ${i+1}: ${w}`:w)))]};
 const collected=await collectSources(species,providers);
 const ranked=await rankPublicPosts(body,species,embed,similarity,async()=>collected.posts,cacheStore);
 return {...ranked,quality,sources:collected.sources,duplicatesRemoved:collected.duplicatesRemoved,checkedAt:collected.checkedAt,scope:'รายการล่าสุดจากแหล่งสาธารณะที่เชื่อมไว้ ไม่ใช่ทุกโพสต์บนอินเทอร์เน็ต'};
}
