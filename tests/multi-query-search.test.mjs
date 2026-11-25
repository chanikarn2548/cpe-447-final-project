import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {searchAllSources} from '../search-sources.mjs';import {averageQuerySimilarity} from '../multi-query.mjs';
test('public search ranks by both query photos and retains quality metadata',async()=>{
 const photo=await sharp({create:{width:32,height:32,channels:3,background:'#aaa'}}).png().toBuffer(),originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>new Response(url.endsWith('/a')?Buffer.from('A'):Buffer.from('B'));
 try{
  let queryCount=0;const embed=async bytes=>{if(Array.isArray(bytes)){queryCount=bytes.length;return {queryVectors:[[1,0],[0,1]]};}return bytes.toString()==='A'?[1,0]:[Math.SQRT1_2,Math.SQRT1_2];};
  const providers=[{id:'test',name:'Fixture',url:'https://fixture.invalid',load:async()=>['a','b'].map(id=>({species:'cat',url:'https://fixture.invalid/posts/'+id,image:'https://fixture.invalid/multi-test/'+id,source:'Fixture',title:id}))}];
  const cosine=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)/(Math.hypot(...a)*Math.hypot(...b));
  const result=await searchAllSources([photo,photo],'cat',embed,(q,v)=>averageQuerySimilarity(q,v,cosine),providers);
  assert.equal(queryCount,2);assert.equal(result.quality.photos,2);assert.equal(result.groups[0].results[0].title,'b');assert.ok(Math.abs(result.groups[0].results[0].score-Math.SQRT1_2)<1e-12);
 }finally{globalThis.fetch=originalFetch;}
});
