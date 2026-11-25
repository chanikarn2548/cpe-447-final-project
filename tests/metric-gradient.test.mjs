import test from 'node:test';import assert from 'node:assert/strict';
import {sim,stats} from '../training/metric-learning.mjs';
test('weighted cosine derivative matches independent finite difference',()=>{
 const a=Array.from({length:512},(_,i)=>Math.sin(i+1)),b=Array.from({length:512},(_,i)=>Math.cos(i*1.7)),w=Array.from({length:512},(_,i)=>.5+(i%7)/10),r=stats(a,b,w);
 for(const d of [0,1,33,255,511]){const eps=1e-5,up=[...w],down=[...w];up[d]+=eps;down[d]-=eps;const numeric=(sim(a,b,up)-sim(a,b,down))/(2*eps),analytic=a[d]*b[d]/r.den-.5*r.s*(a[d]**2/r.aa+b[d]**2/r.bb);assert.ok(Math.abs(numeric-analytic)<1e-7);}
});
test('square-root weight transform gives the same cosine used by the trained metric',()=>{
 const a=Array.from({length:512},(_,i)=>Math.sin(i)),b=Array.from({length:512},(_,i)=>Math.cos(i)),w=Array.from({length:512},(_,i)=>.2+i/100);
 const transformed=v=>{const t=v.map((x,i)=>x*Math.sqrt(w[i])),n=Math.hypot(...t);return t.map(x=>x/n);};const x=transformed(a),y=transformed(b),dot=x.reduce((s,v,i)=>s+v*y[i],0);assert.ok(Math.abs(dot-sim(a,b,w))<1e-10);
});
