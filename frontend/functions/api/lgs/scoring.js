// FMT and scoring share one implementation across import, recalculation and tests.
export const norm = text => String(text).replace(/[ıİ]/g, 'I').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
export const decode = bytes => { try { return new TextDecoder('utf-8', {fatal:true}).decode(bytes); } catch { return new TextDecoder('windows-1254').decode(bytes); } };
const round = (n, d=2) => Number(n.toFixed(d));
const sum = ns => ns.reduce((a,b)=>a+b,0);
const mean = ns => ns.length ? sum(ns)/ns.length : 0;
const avg = ns => round(mean(ns));
const sd = ns => {const m=mean(ns);return Math.sqrt(mean(ns.map(n=>(n-m)**2)));};
const check = (ok, message) => { if (!ok) throw Object.assign(new Error(message), {status:422}); };
export function validateTemplate(t) {
  check(typeof t.name==='string' && t.name.trim().length>0 && t.name.length<=200, 'Şablon adı gerekli (en fazla 200 karakter).');
  const roles = ['ogrenci_no','ad_soyad','ad','soyad','kitapcik','sinif','sube','tc','veli_tel','cevap','diger'];
  check(Array.isArray(t.fields) && t.fields.length>0 && t.fields.length<=100, 'Şablonda 1–100 alan bulunmalı.');
  for (const f of t.fields) check(typeof f.name==='string' && f.name.length<=200 && roles.includes(f.role) && Number.isInteger(f.start) && f.start>=1 && Number.isInteger(f.length) && f.length>=1 && f.start+f.length<=5001, 'Geçersiz şablon alanı: başlangıç ve uzunluğu kontrol edin.');
  check(t.fields.some(f=>f.role==='cevap'), 'Şablonda cevap alanı gerekli.');
  return t;
}
export function validateType(t) {
  check(typeof t.name==='string' && t.name.trim() && t.name.length<=200, 'Sınav türü adı gerekli.');
  check(Array.isArray(t.subjects) && t.subjects.length>0 && t.subjects.length<=20, '1–20 ders gerekli.');
  check(new Set(t.subjects.map(s=>s.key)).size===t.subjects.length, 'Ders kodları benzersiz olmalı.');
  for (const s of t.subjects) check(/^[a-z][a-z0-9_]{0,39}$/.test(s.key) && typeof s.name==='string' && s.name.length<=100 && Number.isInteger(s.question_count) && s.question_count>0 && s.question_count<=200 && Number.isFinite(s.coefficient) && s.coefficient>0 && s.coefficient<=100 && Number.isFinite(s.mean) && Math.abs(s.mean)<=200 && Number.isFinite(s.sd) && s.sd>=0 && s.sd<=200, 'Dersin soru sayısı, katsayısı veya standart sapması geçersiz.');
  check(sum(t.subjects.map(s=>s.question_count))<=500 && Number.isFinite(t.base_score) && Number.isFinite(t.max_score) && t.base_score>=0 && t.max_score>t.base_score && t.max_score<=1000 && ['manual','exam'].includes(t.sd_source) && [0,3,4].includes(t.default_penalty), 'Puan aralığı veya puanlama yöntemi geçersiz.');
  check((t.tasp_min==null || Number.isFinite(t.tasp_min)) && (t.tasp_max==null || Number.isFinite(t.tasp_max)) && !(t.tasp_min!=null && t.tasp_max!=null && t.tasp_max<=t.tasp_min), 'TASP aralığı geçersiz.');
  return t;
}
function guessRole(name, direction, charset) {
  const n=norm(name), tokens=n.split(/[^A-Z0-9]+/), letters=[...new Set(charset.replace(/ /g,''))];
  if(direction==='Y' && letters.length>=4 && letters.every(c=>'ABCDE'.includes(c)))return 'cevap';
  if(n.includes('KITAP') || tokens.includes('KIT') || n.includes('K.TURU'))return 'kitapcik';
  if(n.includes('OGRENCI') || n.includes('NUMARA') || n==='NO' || n==='OGRNO' || n.includes('OGR')&&tokens.includes('NO'))return 'ogrenci_no';
  if(tokens.includes('TC') || n.includes('T.C') || n.includes('KIMLIK'))return 'tc';
  if(n.includes('TEL'))return n.includes('VELI')?'veli_tel':'diger';
  if(tokens.some(t=>t.startsWith('SOYAD')))return tokens.includes('ADI')||tokens.includes('AD')?'ad_soyad':'soyad';
  if(tokens.includes('ADI')||tokens.includes('AD'))return 'ad';
  if(tokens.includes('SUBE'))return 'sube';
  return tokens.includes('SINIF')&&!tokens.includes('KODU')?'sinif':'diger';
}
export function parseFmt(text) {
  let pos=1; const fields=[], header={};
  for(const [i,line] of text.split(/\r\n|\n|\r/).filter(l=>l.trim()).entries()) {
    const p=line.split('=');
    if(i===0 && p.length>=4 && !/^\d+$/.test(p[3])){Object.assign(header,{rows:p[0],cols:p[1],code:p[2],orientation:p[3],multi_char:p[4]||'*',blank_char:p[5]||' '});continue;}
    if(p.length<7 || !p.slice(0,4).every(v=>/^\d+$/.test(v.trim())))continue;
    const [r1,r2,c1,c2]=p.slice(0,4).map(Number), direction=p[5].trim().toUpperCase(), charset=p[6], name=p.slice(8).find(v=>v.trim())?.trim()||`ALAN ${fields.length+1}`, length=direction==='Y'?r2-r1+1:c2-c1+1;
    fields.push({name,r1,r2,c1,c2,kind:p[4].trim(),direction,charset,start:pos,length,role:guessRole(name,direction,charset)}); pos+=length;
  }
  validateTemplate({name:'FMT',fields});return {header,fields};
}
export function extractStudents(text, fields) {
  check(typeof text==='string' && new TextEncoder().encode(text).length<=1000000, 'Optik veri dosyası en fazla 1 MB olabilir.');
  const lines=text.split(/\r\n|\n|\r/);check(lines.length<=2001,'Tek sınavda en fazla 2000 satır okunabilir.');
  const width=Math.max(...fields.map(f=>f.start+f.length-1));
  return lines.flatMap((line,i)=>{
    if(!line.trim())return [];
    check(line.length>=width, `${i+1}. satır seçilen şablona göre kısa (${line.length}/${width}). Şablonu kontrol edin.`);
    const info={},answers={};
    fields.forEach((f,index)=>{const raw=line.slice(f.start-1,f.start-1+f.length).padEnd(f.length,' ');if(f.role==='cevap')answers[index]=raw.toUpperCase();else if(f.role!=='diger'&&!info[f.role])info[f.role]=raw.replace(/\*/g,' ').replace(/\s+/g,' ').trim();});
    const name=info.ad_soyad||[info.ad,info.soyad].filter(Boolean).join(' '), booklet=(info.kitapcik||'A').toUpperCase().match(/[ABCD]/)?.[0];
    check(booklet,`${i+1}. satırdaki kitapçık geçersiz.`);
    return [{line_no:i+1,student_no:info.ogrenci_no||'',name,sinif:info.sinif||'',sube:info.sube||'',tc:info.tc||'',veli_tel:(info.veli_tel||'').replace(/ /g,''),booklet,answers,is_key:norm(name).includes('CEVAP')}];
  });
}
export function defaultMapping(fields, subjects) {
  const aliases={turkce:['TURK'],matematik:['MAT'],fen:['FEN'],inkilap:['INK','SOS','TARIH'],din:['DIN'],ingilizce:['ING','YAB']}, used=new Set(), mapping={};
  for(const s of subjects){const i=fields.findIndex((f,i)=>f.role==='cevap'&&!used.has(i)&&[...(aliases[s.key]||[]),norm(s.name).slice(0,3)].some(a=>norm(f.name).includes(a)));if(i>=0){mapping[s.key]={field_index:i,start:1};used.add(i);}}
  return mapping;
}
const validMap=(m,n)=>Array.isArray(m)&&m.length===n&&[...m].sort((a,b)=>a-b).every((v,i)=>v===i+1);
export function validateConfig(cfg, fields, students) {
  validateType(cfg);check([0,3,4].includes(cfg.penalty), 'Yanlış kuralı geçersiz.');
  check(cfg.mapping && cfg.answer_keys && cfg.booklet_maps && Object.keys(cfg.answer_keys).every(b=>/^[ABCD]$/.test(b)), 'Cevap anahtarı veya eşleştirme geçersiz.');
  const booklets=[...new Set(students.filter(s=>!s.is_key).map(s=>s.booklet))];check(booklets.length,'Dosyada öğrenci yok.');
  for(const s of cfg.subjects){const n=s.question_count,m=cfg.mapping[s.key],f=fields[m?.field_index];
    check(Number.isInteger(m?.field_index)&&f?.role==='cevap'&&Number.isInteger(m.start)&&m.start>=1&&m.start+n-1<=f.length,`${s.name}: optik alan eşleştirmesi geçersiz.`);
    for(const b of Object.keys(cfg.booklet_maps))if(cfg.booklet_maps[b]?.[s.key]!=null)check(validMap(cfg.booklet_maps[b][s.key],n),`${b} / ${s.name}: soru eşleştirmesinde 1–${n} birer kez kullanılmalı.`);
    for(const b of booklets){const own=cfg.answer_keys[b]?.[s.key],a=cfg.answer_keys.A?.[s.key];
      check(typeof own==='string'&&own.length===n&&/^[ABCDE X*]+$/i.test(own)&&own.trim() || b!=='A'&&validMap(cfg.booklet_maps[b]?.[s.key],n)&&typeof a==='string'&&a.length===n&&/^[ABCDE X*]+$/i.test(a)&&a.trim(),`${b} kitapçığı ${s.name}: tam cevap anahtarı veya A kitapçığıyla soru eşleştirmesi gerekli.`);
    }
  }
}
const bookletKey=(cfg,b,s)=>{const own=cfg.answer_keys[b]?.[s.key];if(own?.trim())return own.toUpperCase();const a=(cfg.answer_keys.A?.[s.key]||'').toUpperCase();return (cfg.booklet_maps[b]?.[s.key]||[]).map(i=>a[i-1]).join('');};
const sp=(net,s)=>50+10*(net-s.mean)/(s.sd>0?s.sd:1);
const scale=(value,lo,hi,base,top)=>hi<=lo?base:round(Math.min(top,Math.max(base,base+(top-base)*(value-lo)/(hi-lo))),3);
export function scoreAll(students,cfg) {
  const rows=students.filter(s=>!s.is_key).map(st=>{const subjects={};for(const s of cfg.subjects){const m=cfg.mapping[s.key],answers=st.answers[m.field_index].slice(m.start-1,m.start-1+s.question_count),key=bookletKey(cfg,st.booklet,s);let d=0,y=0,b=0;[...answers].forEach((a,q)=>{const k=key[q];if(k===' ')return;if(k==='X'||k==='*')d++;else if(a===' ')b++;else if(a===k)d++;else y++;});subjects[s.key]={answers,key,d,y,b,net:round(d-(cfg.penalty?y/cfg.penalty:0))};}return {...st,answers:undefined,is_key:undefined,subjects,branch:[st.sinif,st.sube].filter(Boolean).join(' ')||'Belirtilmemiş'};});
  const subjects=cfg.subjects.map(s=>cfg.sd_source==='exam'?{...s,mean:mean(rows.map(r=>r.subjects[s.key].net)),sd:sd(rows.map(r=>r.subjects[s.key].net))||1}:s), maxW=sum(subjects.map(s=>s.coefficient*s.question_count))||1, tmin=cfg.tasp_min??sum(subjects.map(s=>s.coefficient*sp(0,s))),tmax=cfg.tasp_max??sum(subjects.map(s=>s.coefficient*sp(s.question_count,s)));
  for(const r of rows){r.total_net=round(sum(Object.values(r.subjects).map(x=>x.net)));r.score_raw=scale(sum(subjects.map(s=>s.coefficient*r.subjects[s.key].net)),0,maxW,cfg.base_score,cfg.max_score);r.score_sd=scale(sum(subjects.map(s=>s.coefficient*sp(r.subjects[s.key].net,s))),tmin,tmax,cfg.base_score,cfg.max_score);}
  rows.sort((a,b)=>b.score_sd-a.score_sd||b.score_raw-a.score_raw||b.total_net-a.total_net||a.line_no-b.line_no);
  const branches={};rows.forEach((r,i)=>{r.rank=i+1;r.branch_rank=branches[r.branch]=(branches[r.branch]||0)+1;});return rows;
}
export function analyze(results,cfg) {
  const subjects=cfg.subjects, scores=results.map(r=>r.score_sd), raw=results.map(r=>r.score_raw), booklets=[...new Set(results.map(r=>r.booklet))].sort(), groups=Object.groupBy(results,r=>r.branch);
  const questions={};
  for(const b of [...(booklets.length>1?['TUM']:[]),...booklets]){
    const group=b==='TUM'?results:results.filter(r=>r.booklet===b), out={},unmapped={};
    for(const s of subjects){const n=s.question_count;
      const eligible=group.filter(r=>{if(b!=='TUM'||r.booklet==='A'||validMap(cfg.booklet_maps[r.booklet]?.[s.key],n))return true;(unmapped[s.key]??=[]).push(r.booklet);return false;});
      out[s.key]=Array.from({length:n},(_,q)=>{const counts={A:0,B:0,C:0,D:0,E:0};let blank=0,multi=0,correct=0;const key=b==='TUM'?bookletKey(cfg,'A',s)[q]||' ':group[0]?.subjects[s.key].key[q]||' ';
        for(const r of eligible){const i=b==='TUM'&&r.booklet!=='A'?cfg.booklet_maps[r.booklet][s.key].indexOf(q+1):q,x=r.subjects[s.key],a=x.answers[i],k=x.key[i];if(a===' ')blank++;else if(a in counts)counts[a]++;else multi++;if(k==='X'||k==='*'||a===k&&k!==' ')correct++;}
        return {q:q+1,key,counts,blank,multi,correct_pct:round(100*correct/(eligible.length||1),1),count:eligible.length};});
    }
    questions[b]={count:group.length,subjects:out,unmapped:Object.fromEntries(Object.entries(unmapped).map(([k,v])=>[k,[...new Set(v)].sort()]))};
  }
  return {count:results.length,avg_sd:avg(scores),avg_raw:avg(raw),max_sd:Math.max(0,...scores),min_sd:Math.min(...scores),max_raw:Math.max(0,...raw),min_raw:Math.min(...raw),std_sd:round(sd(scores)),avg_total_net:avg(results.map(r=>r.total_net)),booklets,questions,
    subjects:subjects.map(s=>{const rs=results.map(r=>r.subjects[s.key]),nets=rs.map(r=>r.net);return {...s,avg_d:avg(rs.map(r=>r.d)),avg_y:avg(rs.map(r=>r.y)),avg_b:avg(rs.map(r=>r.b)),avg_net:avg(nets),max_net:Math.max(...nets),min_net:Math.min(...nets),sd_net:round(sd(nets)),success_pct:round(100*avg(nets)/s.question_count,1)};}),
    branches:Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([branch,rs])=>({branch,count:rs.length,avg_sd:avg(rs.map(r=>r.score_sd)),avg_raw:avg(rs.map(r=>r.score_raw)),avg_net:avg(rs.map(r=>r.total_net)),nets:Object.fromEntries(subjects.map(s=>[s.key,avg(rs.map(r=>r.subjects[s.key].net))]))})),
    histogram:Array.from({length:Math.ceil((cfg.max_score-cfg.base_score)/25)},(_,i)=>{const lo=cfg.base_score+i*25,hi=Math.min(cfg.max_score,lo+25);return {range:`${lo}-${hi}`,count:scores.filter(v=>v>=lo&&(v<hi||hi===cfg.max_score&&v===hi)).length};}),
    top:results.slice(0,10).map(({rank,name,branch,score_sd,score_raw,total_net})=>({rank,name,branch,score_sd,score_raw,total_net}))};
}
