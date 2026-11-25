import test from 'node:test';import assert from 'node:assert/strict';import {rankBreeds,rankBirdBreeds} from '../breed-classifier.mjs';
const head={dimensions:512,labels:['bengal','beagle',...Array.from({length:35},(_,i)=>'fixture-breed-'+i)],weights:Array(37*513).fill(0)},v=Array(512).fill(0);v[0]=1;
test('known species filter prevents cat results for dog and vice versa',()=>{const h={...head,weights:[...head.weights]};h.weights[h.labels.indexOf('bengal')*513+512]=100;h.weights[h.labels.indexOf('beagle')*513+512]=90;assert.equal(rankBreeds(v,h,'cat')[0].label,'bengal');assert.equal(rankBreeds(v,h,'dog')[0].label,'beagle');assert.equal('score' in rankBreeds(v,h,'cat')[0],false);});
test('invalid vector, species, or corrupt weights are rejected',()=>{assert.throws(()=>rankBreeds([1],head,'cat'));assert.throws(()=>rankBreeds(v,head,'bird'));assert.throws(()=>rankBreeds(v,{...head,weights:[NaN]},'cat'));});
test('rankBirdBreeds ranks 384-dim bird vectors with Thai and English names without exposing raw score',()=>{
  const labels=['budgerigar','cockatiel','sun_conure'];
  const bh={dimensions:384,labels,thaiNames:{budgerigar:'หงส์หยก',cockatiel:'ค็อกคาเทล',sun_conure:'ซันคอนัวร์'},englishNames:{budgerigar:'Budgerigar',cockatiel:'Cockatiel',sun_conure:'Sun Conure'},weights:Array(3*385).fill(0)};
  bh.weights[1*385+0]=5;
  const bv=Array(384).fill(0);bv[0]=1;
  const res=rankBirdBreeds(bv,bh);
  assert.equal(res[0].label,'cockatiel');
  assert.equal(res[0].thaiName,'ค็อกคาเทล');
  assert.equal(res[0].name,'Cockatiel');
  assert.equal('score' in res[0],false);
  assert.throws(()=>rankBirdBreeds([1],bh));
  assert.throws(()=>rankBirdBreeds(bv,{...bh,weights:[NaN]}));
});

test('residual-mlp-v1 heads rank breeds and reject malformed layers cleanly', () => {
  const mlpBird = {
    arch: 'residual-mlp-v1',
    hiddenDim: 2,
    activation: 'gelu-tanh',
    normEps: 1e-5,
    dimensions: 384,
    labels: ['budgerigar', 'cockatiel', 'sun_conure'],
    thaiNames: { budgerigar: 'หงส์หยก', cockatiel: 'ค็อกคาเทล', sun_conure: 'ซันคอนัวร์' },
    englishNames: { budgerigar: 'Budgerigar', cockatiel: 'Cockatiel', sun_conure: 'Sun Conure' },
    members: [{
      fc1Weight: Array(2 * 384).fill(0),
      fc1Bias: [1, -1],
      lnWeight: [1, 1],
      lnBias: [0, 0],
      fc2Weight: [0, 0, 1, 0, 0, 0],
      fc2Bias: [0, 2, 0],
      skipWeight: Array(3 * 384).fill(0),
      skipBias: [0, 0, 0]
    }]
  };
  const bv = Array(384).fill(0);
  bv[0] = 1;
  const res = rankBirdBreeds(bv, mlpBird);
  assert.equal(res[0].label, 'cockatiel');
  assert.equal(res[0].thaiName, 'ค็อกคาเทล');
  assert.throws(() => rankBirdBreeds(bv, { ...mlpBird, members: [] }));
});
