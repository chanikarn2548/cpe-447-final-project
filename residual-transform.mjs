// Runtime-independent residual projection; weights must match the embedding backbone.
export function createResidualTransform(head){
 const {rank,a,b}=head;
 if(head.format!=='residual-512'||head.species!=='cat'||![16,32,64].includes(rank)||!Array.isArray(a)||!Array.isArray(b)||a.length!==512*rank||b.length!==512*rank||!a.every(Number.isFinite)||!b.every(Number.isFinite))throw Error('Invalid residual head');
 return vector=>{
  if(!Array.isArray(vector)||vector.length!==512||!vector.every(Number.isFinite)||!Math.hypot(...vector))throw Error('Invalid embedding');
  const hidden=new Float64Array(rank);for(let j=0;j<rank;j++)for(let k=0;k<512;k++)hidden[j]+=a[j*512+k]*vector[k];
  const result=vector.slice();for(let j=0;j<512;j++)for(let k=0;k<rank;k++)result[j]+=b[j*rank+k]*hidden[k];
  const norm=Math.hypot(...result);if(!norm||!Number.isFinite(norm))throw Error('Invalid projected embedding');return result.map(x=>x/norm);
 };
}
