import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSources,dedupePosts} from '../search-sources.mjs';
import {parsePetFindHome} from '../petfindhome.mjs';
import {parseKwanma,parsePetHub} from '../additional-sources.mjs';
const post={species:'cat',url:'https://example.com/post?utm_source=x',image:'https://example.com/a.jpg',source:'A'};
test('Kwanma only accepts open cases with an unambiguous species and allowed image host',()=>{
 const card=(title,status='lost',host='mwkhbqehhbizhrizzlqd.supabase.co')=>`<a class="pet-card" href="/pet/test"><img src="https://${host}/pic.jpg"><h3 class="pet-card-title">${title}</h3><span class="pet-card-badge__${status}"></span></a>`;
 assert.equal(parseKwanma(card('แมวหาย')).length,1);
 assert.equal(parseKwanma(card('หมาหาย','found'))[0].type,'found');
 assert.equal(parseKwanma(card('แมวหาย','resolved')).length,0);
 assert.equal(parseKwanma(card('แมวและหมาหาย')).length,0);
 assert.equal(parseKwanma(card('แมวหาย','lost','untrusted.example')).length,0);
});
test('PetHub excludes AI-labelled examples and closed cases',()=>{
 const card=(title,badge='หาย')=>`<a href="/post/test"><img src="https://api.pethubthai.com/uploads/pic.jpg"><h3>${title}</h3><span class="badge">${badge}</span>แมว</a>`;
 assert.equal(parsePetHub(card('น้องเอ')).length,1);
 assert.equal(parsePetHub(card('น้องเอ [AI]')).length,0);
 assert.equal(parsePetHub(card('น้องเอ','พบแล้ว')).length,0);
});
test('duplicates retain distinct source links and strip tracking',()=>{
 const r=dedupePosts([post,{...post,url:'https://example.com/post'},{...post,url:'https://example.org/other',source:'B'}]);
 assert.equal(r.posts.length,1);assert.equal(r.duplicatesRemoved,2);assert.equal(r.posts[0].origins.length,2);
});
test('one provider failure leaves other results available; wrong species excluded',async()=>{
 const r=await collectSources('cat',[{id:'a',name:'A',load:async()=>[post,{...post,species:'dog'}]},{id:'b',name:'B',load:async()=>{throw Error('offline');}}]);
 assert.equal(r.posts.length,1);assert.equal(r.sources[0].posts,2);assert.equal(r.sources[0].eligible,1);assert.equal(r.sources[1].ready,false);
});
test('empty source is distinct from failed source',async()=>{
 const r=await collectSources('cat',[{id:'empty',load:async()=>[]}]);assert.equal(r.sources[0].ready,true);assert.equal(r.posts.length,0);
});
test('PetFindHome excludes adoption and detects changed layout',()=>{
 const nav='<a href="/?listingType=LOST">lost</a>';
 const card=text=>`<a href="/pets/one"><img src="/pic.jpg"><h3>น้อง</h3>${text}</a>`;
 assert.equal(parsePetFindHome(nav+card('แมว พบสัตว์หลง')).length,1);
 assert.equal(parsePetFindHome(nav+card('แมว หาบ้านให้น้อง')).length,0);
 assert.equal(parsePetFindHome(nav+card('แมว พบสัตว์หลง พบเจ้าของแล้ว')).length,0);
 assert.throws(()=>parsePetFindHome('<html>changed</html>'));
});
