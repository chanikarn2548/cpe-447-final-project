import {load} from 'cheerio';
const origin='https://petfindhome.com';
let cached;
export function parsePetFindHome(html){
 const $=load(html),posts=[];
 if(!$('a[href*="listingType=LOST"]').length)throw Error('รูปแบบหน้า PetFindHome เปลี่ยนไป');
 $('a[href^="/pets/"]').each((_,el)=>{
  const card=$(el),text=card.text();
  if(!card.find('img').length||/หาบ้านให้น้อง|กลับบ้านแล้ว|พบเจ้าของแล้ว/.test(text))return;
  const type=/ประกาศสัตว์หาย/.test(text)?'lost':/พบสัตว์หลง/.test(text)?'found':null;
  const species=/แมว/.test(text)?'cat':/สุนัข|หมา/.test(text)?'dog':null;
  if(!type||!species)return;
  try{
   const url=new URL(card.attr('href'),origin),image=new URL(card.find('img').attr('src'),origin);
   if(url.origin!==origin||image.origin!==origin)return;
   const nested=image.searchParams.get('url');
   if(nested&&new URL(nested).hostname!=='res.cloudinary.com')return;
   // Use a bounded resolution already supported by the site's image optimizer.
   if(image.pathname==='/_next/image')image.searchParams.set('w','640');
   posts.push({kind:'public-web',species,type,title:card.find('h3').text().trim().slice(0,180),url:url.href,image:image.href,source:'PetFindHome',date:''});
  }catch{}
 });return posts;
}
export async function getPetFindHomePosts(){
 if(cached&&cached.until>Date.now())return cached.promise;
 const promise=(async()=>{
  const posts=[];
  for(const type of ['LOST','FOUND']){
   const r=await fetch(`${origin}/?listingType=${type}`,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Tamnong-Student-Prototype/0.2'}});
   if(!r.ok)throw Error(`PetFindHome ตอบ ${r.status}`);
   const html=await r.text();if(html.length>2_000_000)throw Error('หน้าประกาศใหญ่เกินกำหนด');
   posts.push(...parsePetFindHome(html));
  }return [...new Map(posts.map(p=>[p.url,p])).values()].slice(0,20);
 })();cached={until:Date.now()+600000,promise};
 try{return await promise;}catch(error){if(cached?.promise===promise)cached=null;throw error;}
}
