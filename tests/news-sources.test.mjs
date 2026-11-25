import test from 'node:test';import assert from 'node:assert/strict';
import {parseFM91,parseFoundy,parsePetFF,parsePawsociety,parsePetio,parseBirdBack,parsePantipSearch} from '../additional-sources.mjs';
test('FM91 filters non-pet and resolved news and rejects foreign images',()=>{
 const card=(title,image='upload/cat.webp')=>`<a href="https://fm91bkk.com/newsarticle/1"><img data-src="${image}"><p class="card-text">${title}</p><p class="text-muted">15 Nov</p></a>`;
 const rows=parseFM91(card('ตามหาแมวหาย')+card('แมวหาย ได้คืนแล้ว')+card('กระเป๋าหาย')+card('แมวหาย','https://other.invalid/a.jpg'));
 assert.equal(rows.length,1);assert.equal(rows[0].species,'cat');assert.equal(rows[0].image,'https://fm91bkk.com/upload/cat.webp');
});
test('Foundy uses species badge, retains area and excludes closed cases',()=>{
 const card=title=>`<a href="/pet/123"><img src="https://api.foundy.pet/uploads/cat.webp"><h3>${title}</h3><span>แมว</span><p>กรุงเทพ</p><p>15 Nov</p></a>`;
 const rows=parseFoundy(card('น้องนก')+card('กลับบ้านแล้ว'));
 assert.equal(rows.length,1);assert.equal(rows[0].species,'cat');assert.equal(rows[0].area,'กรุงเทพ');assert.equal(rows[0].type,'lost');
 assert.throws(()=>parseFoundy('<html></html>'));
});
test('PetFF parses open RSC cards, skips closed cases and rejects foreign images',()=>{
 const rscCard=(href,img,title,desc)=>`{\\"data-slot\\":\\"card\\",\\"children\\":[\\"imageUrl\\":\\"${img}\\",\\"href\\":\\"${href}\\",\\"data-slot\\":\\"card-title\\",\\"children\\":\\"${title}\\",\\"data-slot\\":\\"card-description\\",\\"children\\":\\"${desc}\\"]}`;
 const html=rscCard('/lost-pets/abc-1','https://vsldfdagwtitzpsvgvxv.supabase.co/storage/v1/object/public/pet/lost/1.jpg','โมโม่','แมว (ไทย)')
  +rscCard('/lost-pets/abc-2','https://vsldfdagwtitzpsvgvxv.supabase.co/storage/v1/object/public/pet/lost/2.jpg','กลับบ้านแล้ว','สุนัข')
  +rscCard('/found-pets/abc-3','https://untrusted.invalid/3.jpg','สุนัข','พุดเดิ้ล');
 const rows=parsePetFF(html);
 assert.equal(rows.length,1);assert.equal(rows[0].species,'cat');assert.equal(rows[0].type,'lost');
 assert.equal(rows[0].url,'https://www.petff.in.th/lost-pets/abc-1');
 assert.throws(()=>parsePetFF('<html><body>changed</body></html>'));
});
test('Pawsociety parses open posts, maps Facebook links and rejects invalid hosts',()=>{
 const rows=parsePawsociety([
  {id:'1',name:'สปินเตอร์',pet_type:'แมว',color:'ส้ม',location:'บุรีรัมย์',text:'ตามหาแมวหาย',images:['https://api.pawsociety.pet/storage/v1/object/public/post-images/a.jpg'],source_url:'https://www.facebook.com/groups/123/posts/456/?__cft__[0]=abc'},
  {id:'2',name:'แก้ว',pet_type:'นกแก้ว (ซันคอนัวร์)',location:'นนทบุรี',text:'พบนกแก้วหลง',images:['https://api.pawsociety.pet/storage/v1/object/public/post-images/b.jpg']},
  {id:'3',name:'ปิดเคส',pet_type:'สุนัข',text:'กลับบ้านแล้ว',images:['https://api.pawsociety.pet/storage/v1/object/public/post-images/c.jpg']},
  {id:'4',name:'ปลอม',pet_type:'แมว',text:'แมวหาย',images:['https://other.invalid/d.jpg']}
 ],'lost');
 assert.equal(rows.length,2);
 assert.equal(rows[0].species,'cat');assert.equal(rows[0].source,'Pawsociety · กลุ่ม Facebook');
 assert.equal(rows[1].species,'bird');assert.equal(rows[1].url,'https://pawsociety.pet/?post=2');
 assert.throws(()=>parsePawsociety({bad:true}));
});
test('Petio parses posts with valid cdn images and rejects missing images or bad payload',()=>{
 const rows=parsePetio({success:true,data:[
  {id:'p1',source:'petio',postStatus:'lost',petName:'พีช',content:'แถวบ้านทา',petInfo:{species:['cat']},petImage:'https://cdn.petio.care/pets/a.webp',extractedLocation:'แม่ทา',extractedProvince:'ลำพูน',postedAt:'2026-11-17T04:00:00Z'},
  {id:'p2',source:'facebook',postStatus:'lost',content:'ไม่มีรูป',petInfo:{species:['dog']},petImage:null},
  {id:'p3',source:'petio',postStatus:'rehoming',petInfo:{species:['cat']},petImage:'https://cdn.petio.care/pets/b.webp'},
  {id:'p4',source:'petio',postStatus:'found',content:'พบ',petInfo:{species:['dog']},petImage:'https://evil.invalid/c.webp'}
 ]});
 assert.equal(rows.length,1);assert.equal(rows[0].species,'cat');assert.equal(rows[0].url,'https://petio.care/found-pets/p1');
 assert.throws(()=>parsePetio({success:false}));
});
test('BirdBack parses lost bird cards with photos and excludes resolved or foreign images',()=>{
 const card=(id,name,img='https://tagme.love/uploads/lost_birds/a.jpg',badge='กำลังตามหา')=>`<a href="https://tagme.love/lost_detail.php?id=${id}" class="bird-card"><img src="${img}"><div class="bird-card-body"><div class="bird-card-title">${name}</div><div class="bird-card-meta">ค็อกคาเทล</div><div class="bird-card-meta">หลักสี่, กทม.</div><span class="badge">${badge}</span></div></a>`;
 const rows=parseBirdBack(card(69,'Taitan')+card(68,'กลับบ้านแล้ว','https://tagme.love/uploads/lost_birds/b.jpg','ได้คืน')+card(67,'Fake','https://other.invalid/c.jpg'));
 assert.equal(rows.length,1);assert.equal(rows[0].species,'bird');assert.equal(rows[0].title,'Taitan (ค็อกคาเทล)');assert.equal(rows[0].area,'หลักสี่, กทม.');
});
test('Pantip parses genuine lost-pet Jatujak posts with ptcdn images and excludes advice or fortune posts',()=>{
 const rows=parsePantipSearch({success:true,data:[
  {id:'1',title:'{{em}}ตามหาแมวหาย{{eem}}',detail:'แมวส้มหายแถวสำโรง',url:'https://pantip.com/topic/1',cover_img:'https://f.ptcdn.info/1/a.jpg',created_time:1765000000},
  {id:'2',title:'แนะนำหมอดู ตามหาน้องแมวหาย',detail:'ช่วยดูดวงให้หน่อย',url:'https://pantip.com/topic/2',cover_img:'https://f.ptcdn.info/2/b.jpg'},
  {id:'3',title:'ตามหาสุนัขหาย',detail:'ไม่มีรูป',url:'https://pantip.com/topic/3',cover_img:null}
 ]});
 assert.equal(rows.length,1);assert.equal(rows[0].species,'cat');assert.equal(rows[0].source,'Pantip · ห้องจตุจักร');
 assert.throws(()=>parsePantipSearch({success:false}));
});
