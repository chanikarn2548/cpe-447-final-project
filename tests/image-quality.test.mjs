import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {assessImageQuality} from '../image-quality.mjs';
test('small dark featureless image gets advisory warnings without being rejected',async()=>{
 const bytes=await sharp({create:{width:64,height:64,channels:3,background:'#111111'}}).png().toBuffer();
 const r=await assessImageQuality(bytes);assert.equal(r.width,64);assert.equal(r.advisory,true);assert.equal(r.warnings.length,3);
});
test('well lit detailed image does not get quality warnings',async()=>{
 const pixels=Buffer.alloc(256*256*3);for(let y=0;y<256;y++)for(let x=0;x<256;x++)for(let c=0;c<3;c++)pixels[(y*256+x)*3+c]=((x>>3)+(y>>3))%2?220:60;
 const r=await assessImageQuality(await sharp(pixels,{raw:{width:256,height:256,channels:3}}).png().toBuffer());assert.equal(r.warnings.length,0);
});
test('invalid photo rejected with a client error',async()=>{
 await assert.rejects(()=>assessImageQuality(Buffer.from('not-image')),e=>e.statusCode===400);
});
