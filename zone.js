export function insidePolygon(point,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j],cross=(point[0]-a[0])*(b[1]-a[1])-(point[1]-a[1])*(b[0]-a[0]);
    if(Math.abs(cross)<1e-9&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function isSimplePolygon(points){
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-9&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
  let area=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6)return false;area+=a[0]*b[1]-b[0]*a[1];
    for(let j=i+1;j<points.length;j++){
      if(j===i+1||(i===0&&j===points.length-1))continue;
      const c=points[j],d=points[(j+1)%points.length];
      if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return false;
    }
  }
  return points.length>=3&&Math.abs(area)>1e-6;
}
export function nearestVertexIndex(point,polygon,threshold=0.045){
  if(!Array.isArray(polygon)||!polygon.length)return -1;
  let best=-1,bestDist=threshold;
  for(let i=0;i<polygon.length;i++){
    const d=Math.hypot(point[0]-polygon[i][0],point[1]-polygon[i][1]);
    if(d<=bestDist){bestDist=d;best=i;}
  }
  return best;
}
