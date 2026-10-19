import { json, errorResponse } from '../utils.js';
import { decode, norm, parseFmt, extractStudents, defaultMapping, validateTemplate, validateType, validateConfig, scoreAll, analyze } from '../lgs/scoring.js';
import { reportPdf, reportExcel } from '../lgs/reports.js';

const fail=(message,status=422)=>{throw Object.assign(new Error(message),{status});};
const uuid=()=>crypto.randomUUID();
const parse=row=>row?{...JSON.parse(row.document),id:row.id,revision:row.revision}:null;
const results=rows=>rows.map(r=>parse(r));
const strongKey=r=>{
  const d=String(r.tc).split('').map(Number),sum=ns=>ns.reduce((a,b)=>a+b,0);
  const tc=/^[1-9]\d{10}$/.test(r.tc)&&!/^([0-9])\1{10}$/.test(r.tc)&&((sum(d.slice(0,9).filter((_,i)=>i%2===0))*7-sum(d.slice(0,9).filter((_,i)=>i%2===1)))%10+10)%10===d[9]&&sum(d.slice(0,10))%10===d[10];
  return tc&&r.name?`tc:${r.tc}:${norm(r.name)}`:r.student_no&&r.name?`no:${norm(r.student_no)}:${norm(r.name)}`:'';
};
const config=e=>({...e.exam_type,penalty:e.penalty,mapping:e.mapping,answer_keys:e.answer_keys,booklet_maps:e.booklet_maps||{}});
const publicAnalysis=a=>({count:a.count,avg_sd:a.avg_sd,avg_raw:a.avg_raw,avg_total_net:a.avg_total_net,subjects:a.subjects.map(({key,avg_net})=>({key,avg_net}))});
const attachment=(data,name,type)=>new Response(data,{headers:{'Content-Type':type,'Content-Disposition':`attachment; filename="${name}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
async function body(request){if(Number(request.headers.get('content-length'))>1500000)fail('İstek çok büyük.',413);const text=await request.text();if(new TextEncoder().encode(text).length>1500000)fail('İstek çok büyük.',413);try{return JSON.parse(text);}catch{fail('Geçersiz JSON.');}}
const revision=(b,row)=>{if(!Number.isInteger(b.expected_revision)||b.expected_revision!==row.revision)fail('Kayıt başka bir ekranda değişmiş. Yeniden açıp güncel sürümle kaydedin.',409);};

export async function handleLgsRoutes(ctx){
  const {request,db,url,user}=ctx;if(!ctx.path.startsWith('/lgs/'))return null;
  const path=ctx.path.slice(4),method=request.method,parts=path.split('/').filter(Boolean);
  try {
    async function getExam(id,withRaw=false){const row=await db.prepare(`SELECT id,document,analysis,summary,revision${withRaw?',raw_text':''} FROM lgs_exams WHERE id=? AND deleted=0`).bind(id).first();if(!row)fail('Sınav bulunamadı.',404);return row;}
    async function getResult(id){const row=await db.prepare('SELECT r.* FROM lgs_results r JOIN lgs_exams e ON e.id=r.exam_id WHERE r.id=? AND e.deleted=0').bind(id).first();if(!row)fail('Karne bulunamadı.',404);return row;}
    async function examResults(id){return results((await db.prepare('SELECT id,document,revision FROM lgs_results WHERE exam_id=? ORDER BY rank').bind(id).all()).results||[]);}
    const publicPath=parts[0]==='public'&&parts[1]==='karne'&&parts.length>=3&&parts.length<=4;
    if(publicPath){
      if(method!=='GET'||!/^[a-f0-9-]{36}$/.test(parts[2])||parts[3]&&parts[3]!=='pdf')return errorResponse('Karne bulunamadı.',404);
      const row=await db.prepare('SELECT r.document AS result,e.document AS exam,e.analysis FROM lgs_results r JOIN lgs_exams e ON e.id=r.exam_id WHERE r.share_token=? AND r.shared=1 AND e.deleted=0').bind(parts[2]).first();
      if(!row)fail('Karne bulunamadı.',404);const r=JSON.parse(row.result),e=JSON.parse(row.exam),a=JSON.parse(row.analysis);
      const safe=Object.fromEntries(['name','branch','booklet','subjects','total_net','score_raw','score_sd','rank','branch_rank'].map(k=>[k,r[k]]));
      if(parts[3]==='pdf')return attachment(reportPdf(e,[safe],a),'karne.pdf','application/pdf');
      return json({result:safe,exam:{name:e.name,date:e.date,type:e.exam_type.name,subjects:e.exam_type.subjects},analysis:publicAnalysis(a)},200,{'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});
    }
    if(!user)return errorResponse('Oturum açmanız gerekiyor.',401);
    if(user.role!=='admin')return errorResponse('Deneme analizi yalnızca yönetici tarafından kullanılabilir.',403);

    if(parts[0]==='templates'||parts[0]==='exam-types'){
      const table=parts[0]==='templates'?'lgs_templates':'lgs_exam_types',isTemplate=table==='lgs_templates',id=parts[1],manual=id==='manual';
      if(method==='GET'&&!id){const rows=(await db.prepare(`SELECT id,document,revision FROM ${table} WHERE deleted=0 ORDER BY id LIMIT 201`).all()).results||[];if(rows.length>200)fail('En fazla 200 etkin kayıt desteklenir; kullanılmayan şablon/türleri arşivleyin.',409);return json(results(rows));}
      if(method==='POST'&&isTemplate&&!id&&request.headers.get('content-type')?.includes('multipart/form-data')){
        const fd=await request.formData(),files=fd.getAll('files');if(!files.length||files.length>10)fail('1–10 FMT dosyası seçin.');const docs=[];
        for(const file of files){if(typeof file==='string'||file.size>200000)fail('FMT dosyası en fazla 200 KB olabilir.');const doc={id:uuid(),name:file.name.replace(/\.fmt$/i,''),file_name:file.name,...parseFmt(decode(await file.arrayBuffer()))};validateTemplate(doc);docs.push(doc);}
        await db.batch(docs.map(doc=>db.prepare(`INSERT INTO ${table}(id,document) VALUES(?,?)`).bind(doc.id,JSON.stringify(doc))));return json(docs,201);
      }
      const row=id&&!manual?await db.prepare(`SELECT * FROM ${table} WHERE id=? AND deleted=0`).bind(id).first():null;
      if(id&&!manual&&!row)fail('Kayıt bulunamadı.',404);
      if(method==='GET'&&row)return json(parse(row));
      if(method==='POST'&&(!id||manual)||method==='PUT'&&row){
        const b=await body(request);if(method==='PUT')revision(b,row);
        if(method==='POST'&&!/^[a-f0-9-]{36}$/.test(b.request_id||''))fail('İşlem kimliği gerekli.');
        const doc={...b,id:method==='PUT'?id:b.request_id};delete doc.request_id;delete doc.expected_revision;delete doc.revision;isTemplate?validateTemplate(doc):validateType(doc);
        if(method==='POST'){
          const prior=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(doc.id).first();
          if(prior){if(prior.deleted||prior.document!==JSON.stringify(doc))fail('Bu işlem kimliği başka bir kayıtta kullanıldı.',409);return json(parse(prior));}
        }
        const res=method==='PUT'?await db.prepare(`UPDATE ${table} SET document=?,revision=revision+1 WHERE id=? AND revision=? AND deleted=0`).bind(JSON.stringify(doc),id,row.revision).run():await db.prepare(`INSERT INTO ${table}(id,document) VALUES(?,?) ON CONFLICT(id) DO NOTHING`).bind(doc.id,JSON.stringify(doc)).run();
        if(!res.meta.changes)fail('Kayıt değişti. Yenileyin.',409);return json({...doc,revision:method==='PUT'?row.revision+1:1},method==='PUT'?200:201);
      }
      if(method==='DELETE'&&row){const b=await body(request);revision(b,row);const res=await db.prepare(`UPDATE ${table} SET deleted=1,revision=revision+1 WHERE id=? AND revision=?`).bind(id,row.revision).run();if(!res.meta.changes)fail('Kayıt değişti.',409);return json({ok:true});}
    }
    if(path==='/parse'&&method==='POST'){
      const fd=await request.formData(),file=fd.get('file');if(!file||typeof file==='string'||file.size>1000000)fail('En fazla 1 MB optik veri dosyası seçin.');
      const [t,e]=await db.batch([db.prepare('SELECT document FROM lgs_templates WHERE id=? AND deleted=0').bind(fd.get('template_id')),db.prepare('SELECT document FROM lgs_exam_types WHERE id=? AND deleted=0').bind(fd.get('exam_type_id'))]);
      if(!t.results[0]||!e.results[0])fail('Şablon veya sınav türü bulunamadı.',404);const tpl=JSON.parse(t.results[0].document),et=JSON.parse(e.results[0].document),text=decode(await file.arrayBuffer()),students=extractStudents(text,tpl.fields);
      if(!students.length)fail('Dosyada okunabilir satır yok.');return json({text,file_name:file.name,total:students.length,students:students.slice(0,300),key_rows:students.filter(s=>s.is_key),booklets:[...new Set(students.filter(s=>!s.is_key).map(s=>s.booklet))].sort(),answer_fields:tpl.fields.map((f,index)=>({...f,index})).filter(f=>f.role==='cevap'),mapping:defaultMapping(tpl.fields,et.subjects)});
    }
    if(path==='/dashboard'&&method==='GET'){
      const data=await db.batch([db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(json_extract(summary,\'$.count\')),0) AS reads FROM lgs_exams WHERE deleted=0'),db.prepare('SELECT COUNT(*) AS n FROM lgs_templates WHERE deleted=0'),db.prepare('SELECT COUNT(*) AS n FROM lgs_exam_types WHERE deleted=0'),db.prepare('SELECT id,summary,revision FROM lgs_exams WHERE deleted=0 ORDER BY created_at DESC,id DESC LIMIT 6')]);
      return json({exam_count:data[0].results[0].n,student_reads:data[0].results[0].reads,template_count:data[1].results[0].n,exam_type_count:data[2].results[0].n,recent:data[3].results.map(r=>({...JSON.parse(r.summary),id:r.id,revision:r.revision}))});
    }
    if(path==='/exams'&&method==='GET'){
      const [date,id]=(url.searchParams.get('before')||'9999|zzzz').split('|'),rows=(await db.prepare('SELECT id,summary,revision,created_at FROM lgs_exams WHERE deleted=0 AND (created_at,id)<(?,?) ORDER BY created_at DESC,id DESC LIMIT 101').bind(date,id||'').all()).results;
      return json({items:rows.slice(0,100).map(r=>({...JSON.parse(r.summary),id:r.id,revision:r.revision})),next:rows.length>100?`${rows[99].created_at}|${rows[99].id}`:null});
    }
    if(parts[0]==='exams'&&(method==='POST'&&parts.length===1||method==='PUT'&&parts.length===2)){
      const b=await body(request),id=method==='POST'?b.request_id:parts[1];if(!/^[a-f0-9-]{36}$/.test(id||''))fail('Geçerli işlem kimliği gerekli.');
      const current=method==='PUT'?await getExam(id,true):await db.prepare('SELECT * FROM lgs_exams WHERE id=?').bind(id).first();
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(b))))].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(method==='POST'&&current){if(JSON.parse(current.document).creation_hash!==hash||current.deleted)fail('Bu işlem kimliği başka bir kayıt için kullanılmış.',409);return json(parse(current));}
      if(method==='PUT')revision(b,current);
      const templates=await db.batch([db.prepare('SELECT document FROM lgs_templates WHERE id=? AND deleted=0').bind(b.template_id),db.prepare('SELECT document FROM lgs_exam_types WHERE id=? AND deleted=0').bind(b.exam_type_id)]);
      const old=current?parse(current):null,tpl=old&&old.template_id===b.template_id?{name:old.template_name,fields:old.template_fields}:templates[0].results[0]?JSON.parse(templates[0].results[0].document):null,et=templates[1].results[0]?JSON.parse(templates[1].results[0].document):old?.exam_type_id===b.exam_type_id?old.exam_type:null;
      if(!tpl||!et)fail('Şablon veya sınav türü bulunamadı.',404);
      if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date)fail('Sınav adı ve geçerli tarih gerekli.');
      if(old&&b.template_id!==old.template_id)fail('Mevcut sınavın veri şablonu değiştirilemez. Yeni bir sınav olarak okuyun.');
      const e={id,name:b.name.trim(),date:b.date,exam_type_id:b.exam_type_id,exam_type:et,template_id:b.template_id,template_name:tpl.name,template_fields:tpl.fields,penalty:b.penalty,mapping:b.mapping,answer_keys:b.answer_keys,booklet_maps:b.booklet_maps||{},file_name:old?.file_name||b.file_name||'',created_at:old?.created_at||new Date().toISOString(),creation_hash:old?.creation_hash||hash};
      const raw=old?current.raw_text:b.raw_text,students=extractStudents(raw,tpl.fields),cfg=config(e);
      e.source_hash=old?.source_hash||[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(n=>n.toString(16).padStart(2,'0')).join('');
      if(!old && b.allow_duplicate!==true && await db.prepare("SELECT id FROM lgs_exams WHERE json_extract(document,'$.source_hash')=? AND deleted=0 AND json_extract(document,'$.name')=? AND json_extract(document,'$.date')=? LIMIT 1").bind(e.source_hash,e.name,e.date).first())return errorResponse('Aynı ad, tarih ve veri dosyasıyla bir sınav zaten kayıtlı. Yeniden okumak istediğinizi onaylayın.',409,'DUPLICATE_EXAM');
      validateConfig(cfg,tpl.fields,students);const scored=scoreAll(students,cfg),a=analyze(scored,cfg);e.student_count=scored.length;e.summary=Object.fromEntries(['count','avg_sd','avg_raw','max_sd','avg_total_net'].map(k=>[k,a[k]]));
      const summary={id,name:e.name,date:e.date,created_at:e.created_at,exam_type:{name:et.name},student_count:scored.length,summary:e.summary,count:scored.length},writeToken=uuid(),statements=[];
      if(old)statements.push(db.prepare('UPDATE lgs_exams SET document=?,analysis=?,summary=?,revision=revision+1,write_token=? WHERE id=? AND revision=? AND deleted=0').bind(JSON.stringify(e),JSON.stringify(a),JSON.stringify(summary),writeToken,id,current.revision));
      else statements.push(db.prepare('INSERT INTO lgs_exams(id,document,raw_text,analysis,summary,created_at,write_token) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,JSON.stringify(e),raw,JSON.stringify(a),JSON.stringify(summary),e.created_at,writeToken));
      // ponytail: 100 results per JSON bind keeps D1 statement/bind sizes bounded; 2000-row import ceiling.
      for(let i=0;i<scored.length;i+=100){const docs=scored.slice(i,i+100).map(r=>({...r,id:`${id}_${r.line_no}`,exam_id:id,student_key:strongKey(r),share_token:uuid()}));
        statements.push(db.prepare(`INSERT INTO lgs_results(id,exam_id,line_no,rank,student_key,document,share_token)
          SELECT json_extract(value,'$.id'),?,json_extract(value,'$.line_no'),json_extract(value,'$.rank'),json_extract(value,'$.student_key'),json_remove(value,'$.student_key','$.share_token'),json_extract(value,'$.share_token') FROM json_each(?)
          WHERE EXISTS(SELECT 1 FROM lgs_exams WHERE id=? AND write_token=?)
          ON CONFLICT(id) DO UPDATE SET document=excluded.document,rank=excluded.rank,student_key=excluded.student_key,revision=lgs_results.revision+1`).bind(id,JSON.stringify(docs),id,writeToken));
      }
      const saved=await db.batch(statements);
      if(!saved[0].meta.changes){
        if(!old){const prior=await db.prepare('SELECT * FROM lgs_exams WHERE id=?').bind(id).first();if(prior&&!prior.deleted&&JSON.parse(prior.document).creation_hash===hash)return json(parse(prior));}
        fail('Sınav başka bir ekranda değişti. Güncel sürümü açın.',409);
      }
      return json({...e,revision:old?current.revision+1:1},old?200:201);
    }
    if(parts[0]==='exams'&&parts[1]){
      const row=await getExam(parts[1]),exam=parse(row);
      if(method==='DELETE'){const b=await body(request);revision(b,row);const r=await db.prepare('UPDATE lgs_exams SET deleted=1,revision=revision+1 WHERE id=? AND revision=?').bind(row.id,row.revision).run();if(!r.meta.changes)fail('Sınav değişti.',409);return json({ok:true});}
      if(method==='GET'){
        if(parts.length===2)return json(exam);
        const a=JSON.parse(row.analysis);if(parts[2]==='analysis')return json(a);
        const rs=await examResults(row.id);
        if(parts[2]==='bundle')return json({exam,analysis:a,results:rs});
        if(parts[2]==='results')return json(rs);
        if(parts[2]==='export'){
          if(parts[3]==='excel')return attachment(reportExcel(exam,rs),'sonuclar.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          if(['pdf','karneler','sube-karneleri'].includes(parts[3])){const branch=url.searchParams.get('branch');return attachment(reportPdf(exam,branch?rs.filter(r=>r.branch===branch):rs,a,parts[3]),'rapor.pdf','application/pdf');}
        }
      }
    }
    if(parts[0]==='results'&&parts[1]){
      const row=await getResult(parts[1]),r=parse(row),action=parts[2];
      if(method==='GET'&&!action)return json(r);
      if(action==='bundle'&&method==='GET'){const er=await getExam(row.exam_id);return json({exam:parse(er),r,analysis:JSON.parse(er.analysis)});}
      if(action==='progress'&&method==='GET'){
        if(!row.student_key)return json([]);const rows=(await db.prepare('SELECT r.id,r.document,e.document AS exam FROM lgs_results r JOIN lgs_exams e ON e.id=r.exam_id WHERE r.student_key=? AND e.deleted=0 ORDER BY e.created_at DESC LIMIT 100').bind(row.student_key).all()).results;
        return json(rows.map(x=>{const r=JSON.parse(x.document),e=JSON.parse(x.exam);return {exam_id:e.id,result_id:x.id,exam_name:e.name,date:e.date,type:e.exam_type.name,count:e.student_count,rank:r.rank,score_sd:r.score_sd,score_raw:r.score_raw,total_net:r.total_net,nets:Object.fromEntries(e.exam_type.subjects.map(s=>[s.name,r.subjects[s.key].net]))};}).sort((a,b)=>a.date.localeCompare(b.date)));
      }
      if(action==='karne'&&method==='GET'){const er=await getExam(row.exam_id);return attachment(reportPdf(parse(er),[r],JSON.parse(er.analysis)),'karne.pdf','application/pdf');}
      const contactKey=row.student_key||`result:${row.id}`;
      const shareUrl=()=>`${url.origin}/#veli/${row.share_token}`;
      if(action==='share'&&method==='GET'){const c=await db.prepare('SELECT document,revision FROM lgs_contacts WHERE id=?').bind(contactKey).first();return json({...c?JSON.parse(c.document):{veli_tel:r.veli_tel||'',veli_email:''},revision:c?.revision||0,url:row.shared?shareUrl():''});}
      if(action==='share'&&method==='POST'){await db.prepare('UPDATE lgs_results SET shared=1 WHERE id=?').bind(row.id).run();return json({url:shareUrl()});}
      if(action==='share'&&method==='DELETE'){await db.prepare('UPDATE lgs_results SET shared=0,share_token=? WHERE id=?').bind(uuid(),row.id).run();return json({ok:true,url:''});}
      if(action==='contact'&&method==='PUT'){
        const b=await body(request);if(typeof b.veli_tel!=='string'||b.veli_tel.length>30||typeof b.veli_email!=='string'||b.veli_email.length>254||b.veli_email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.veli_email))fail('Geçerli telefon ve e-posta girin.');
        if(!Number.isInteger(b.expected_revision)||b.expected_revision<0)fail('İletişim kaydı sürümü gerekli.');
        const doc={veli_tel:b.veli_tel.trim(),veli_email:b.veli_email.trim()},res=b.expected_revision===0?await db.prepare('INSERT INTO lgs_contacts(id,document) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(contactKey,JSON.stringify(doc)).run():await db.prepare('UPDATE lgs_contacts SET document=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(doc),contactKey,b.expected_revision).run();
        if(!res.meta.changes)fail('Veli bilgileri başka bir ekranda değişti. Karneyi yeniden açın.',409);return json({...doc,revision:b.expected_revision+1});
      }
    }
    return errorResponse('İşlem bulunamadı.',404);
  }catch(e){if(e.status)return errorResponse(e.message,e.status,e.status===409?'RECORD_CHANGED':'VALIDATION_ERROR');throw e;}
}
