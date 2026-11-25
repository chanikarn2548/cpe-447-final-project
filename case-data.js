const clueStatuses={pending:'รอตรวจสอบ',following:'กำลังติดตาม',confirmed:'ตรวจสอบแล้วว่าตรง',rejected:'ตรวจสอบแล้วว่าไม่ตรง'};
function clueIdentity(row){return row.id||JSON.stringify([row.caseId,row.matchKey||row.sourceLink||'',row.title,row.info]);}
function mergeClues(rows){return [...new Map(rows.map(row=>[clueIdentity(row),row])).values()];}
function selectCases(rows,{filter='all',species='all',area='',query='',hideDemo=false,favorites=false,sort='recent'}={}){
  const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase('th');
  const words=normalize(query).split(/\s+/).filter(Boolean);
  const selected=rows.filter(row=>
    (filter==='resolved'?row.status==='resolved':row.status!=='resolved'&&(filter==='all'||row.type===filter))&&
    (species==='all'||row.species===species)&&(!hideDemo||!row.isDemo)&&(!favorites||row.favorite)&&
    normalize(row.area).includes(normalize(area).trim())&&
    words.every(word=>normalize([row.name,row.kind,row.area,row.description,row.contact,row.ocrText,({cat:'แมว',dog:'สุนัข หมา',bird:'นก',rabbit:'กระต่าย',hamster:'แฮมสเตอร์'})[row.species]].join(' ')).includes(word)));
  if(sort==='name')selected.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th'));
  if(sort==='recent')selected.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  return selected;
}
function csvCell(value){const text=String(value??'');return '"'+(/^(?:\s*[=+@-]|[\t\r])/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
