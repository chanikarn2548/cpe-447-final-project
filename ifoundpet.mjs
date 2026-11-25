import {load} from 'cheerio';
let cached;
export async function getIFoundPetPosts(){
  if(cached&&cached.until>Date.now())return cached.promise;
  const promise=(async()=>{
    const posts=[];
    for(const page of ['https://ifoundpet.com/announcement/find','https://ifoundpet.com/announcement']){
    const response=await fetch(page,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(`iFoundPet ตอบ ${response.status}`);
    const html=await response.text();if(html.length>2_000_000)throw Error('หน้าประกาศใหญ่เกินกำหนด');
    const $=load(html);
    $('a.ann-card').slice(0,20).each((_,el)=>{
      const card=$(el),breed=card.find('.ann-card-breed').text().trim();
      const species=/แมว/.test(breed)?'cat':/หมา|สุนัข/.test(breed)?'dog':/กระต่าย/.test(breed)?'rabbit':/แฮมสเตอร์/.test(breed)?'hamster':/นก/.test(breed)?'bird':'';
      try{
        const url=new URL(card.attr('href'),'https://ifoundpet.com'),image=new URL(card.find('img').attr('src'),'https://ifoundpet.com');
        if(!species||url.origin!=='https://ifoundpet.com'||!/^\/announcement\/(?:find\/)?detail\/\d+$/.test(url.pathname)||image.protocol!=='https:'||!['ifoundpet.com','imagedelivery.net'].includes(image.hostname))return;
        posts.push({kind:'public-web',species,type:page.endsWith('/find')?'found':'lost',title:`${card.find('.ann-card-name').text().trim()} · ${breed}`,url:url.href,image:image.href,source:'iFoundPet',date:card.find('.ann-card-time').text().trim()});
      }catch{}
    });
    if(!$('a.ann-card').length)throw Error('ยังอ่านรายการ iFoundPet ไม่ได้');
    }
    return posts;
  })();
  cached={until:Date.now()+600000,promise};
  try{return await promise;}catch(error){if(cached?.promise===promise)cached=null;throw error;}
}
