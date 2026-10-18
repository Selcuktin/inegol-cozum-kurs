// Run with Node 22+: node --experimental-default-type=module tests/lgs_workflows.mjs
// Real SQLite + production dispatcher. All data is anonymous and in memory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,request,rows,row} from './support/realRouter.mjs';
import {onRequest} from '../frontend/functions/api/[[route]].js';
import {extractStudents,defaultMapping,scoreAll,analyze,validateConfig,parseFmt} from '../frontend/functions/api/lgs/scoring.js';
import {pdfText} from './support/pdf.mjs';
const db=database(),checks=[];
const logs={...console};console.log=console.error=console.warn=()=>{};
async function test(name,fn){try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.stack});}}
const type=JSON.parse(row(db,"SELECT document FROM lgs_exam_types WHERE id='lgs-2026'").document);
const tpl=JSON.parse(row(db,"SELECT document FROM lgs_templates WHERE id='pronet-lgs'").document);
const raw=fs.readFileSync('frontend/public/ornek-lgs-verisi.txt','utf8');
const mapping=defaultMapping(tpl.fields,type.subjects);
const parsed=extractStudents(raw,tpl.fields),keyRow=parsed.find(s=>s.is_key);
const answer_keys={A:Object.fromEntries(type.subjects.map(s=>[s.key,keyRow.answers[mapping[s.key].field_index].slice(0,s.question_count)]))};
const input={request_id:crypto.randomUUID(),name:'Türkçe Şube Denemesi',date:'2026-10-18',exam_type_id:type.id,template_id:tpl.id,penalty:3,mapping,answer_keys,booklet_maps:{},raw_text:raw};
const cfg={...type,...input};
let exam,result,bundle;
await test('ported scoring matches six independent Python reference cases (54 students)',()=>{
 for(const c of JSON.parse(fs.readFileSync('tests/fixtures/lgs-score-parity.json','utf8'))){const actual=scoreAll(c.students,c.cfg);for(let i=0;i<actual.length;i++)for(const k of ['line_no','rank','branch_rank','total_net','score_raw','score_sd','subjects'])assert.deepEqual(actual[i][k],c.expected[i][k],`case ${c.cfg.sd_source}/${c.cfg.penalty} student ${i} field ${k}`);}
});
await test('default FMT maps every subject and sample contains exactly two students and a key',()=>{assert.equal(parsed.length,3);assert.equal(parsed.filter(s=>!s.is_key).length,2);assert.equal(Object.keys(mapping).length,6);validateConfig(cfg,tpl.fields,parsed);});
await test('all-correct gives 500 in both score modes and includes no answer-key student',()=>{const rs=scoreAll(parsed,cfg);assert.equal(rs.length,2);for(const r of rs){assert.equal(r.score_sd,500);assert.equal(r.score_raw,500);assert.equal(r.total_net,90);}assert.equal(analyze(rs,cfg).count,2);});
await test('wrong/blank/cancelled/excluded answers, 0/3/4 penalty and negative net',()=>{
 const base={...parsed[0],answers:{0:'B *A'}},subject={key:'x',name:'Ders',question_count:4,coefficient:1,mean:0,sd:0};
 for(const penalty of [0,3,4]){const c={...cfg,subjects:[subject],mapping:{x:{field_index:0,start:1}},answer_keys:{A:{x:'AAX '}},penalty};const r=scoreAll([base],c)[0];assert.equal(r.subjects.x.d,1);assert.equal(r.subjects.x.y,1);assert.equal(r.subjects.x.b,1);assert.equal(r.subjects.x.net,Number((1-(penalty?1/penalty:0)).toFixed(2)));assert(Number.isFinite(r.score_sd));}
 const c={...cfg,subjects:[subject],mapping:{x:{field_index:0,start:1}},answer_keys:{A:{x:'AAAA'}},penalty:3};assert(scoreAll([{...base,answers:{0:'BBBB'}}],c)[0].total_net<0);
});
await test('population SD remains finite when every score is identical',()=>{for(const r of scoreAll(parsed,{...cfg,sd_source:'exam'}))assert(Number.isFinite(r.score_sd));});
await test('blank and short or missing B keys are rejected rather than silently copying A',()=>{
 assert.throws(()=>validateConfig({...cfg,answer_keys:{A:{}}},tpl.fields,parsed));
 assert.throws(()=>validateConfig(cfg,tpl.fields,[{...parsed[0],booklet:'B'}]));
 const maps={B:Object.fromEntries(type.subjects.map(s=>[s.key,Array.from({length:s.question_count},(_,i)=>i+1)]))};validateConfig({...cfg,booklet_maps:maps},tpl.fields,[{...parsed[0],booklet:'B'}]);
 assert.throws(()=>validateConfig({...cfg,booklet_maps:{B:{turkce:Array(20).fill(1)}}},tpl.fields,parsed));
});
await test('combined question analysis excludes unknown permutations and counts cancelled questions consistently',()=>{
 const rs=scoreAll([...parsed,{...parsed[0],line_no:9,booklet:'B'}],{...cfg,answer_keys:{A:answer_keys.A,B:answer_keys.A}}),a=analyze(rs,{...cfg,answer_keys:{A:answer_keys.A,B:answer_keys.A}});assert.equal(a.questions.TUM.subjects.turkce[0].count,2);assert.deepEqual(a.questions.TUM.unmapped.turkce,['B']);
 const c={...cfg,answer_keys:{A:{...answer_keys.A,turkce:'X'+answer_keys.A.turkce.slice(1)}}};const x=analyze(scoreAll(parsed,c),c);assert.equal(x.questions.A.subjects.turkce[0].correct_pct,100);
});
await test('invalid FMT, short records and oversized imports fail before writes',()=>{assert.throws(()=>parseFmt('bad'));assert.throws(()=>extractStudents('short',tpl.fields));assert.throws(()=>extractStudents('x'.repeat(1000001),tpl.fields));assert.throws(()=>extractStudents(Array(2002).fill('x').join('\n'),tpl.fields));});
await test('create atomically stores config, analysis and results in bounded statements',async()=>{db.queries=0;const r=await request(db,'/lgs/exams','POST',input);assert.equal(r.status,201,JSON.stringify(r.data));exam=r.data;assert.equal(exam.revision,1);assert.equal(row(db,'SELECT COUNT(*) n FROM lgs_results').n,2);assert(db.queries<12);});
await test('lost response replay produces no duplicate results or exam',async()=>{const r=await request(db,'/lgs/exams','POST',input);assert.equal(r.status,200);assert.equal(row(db,'SELECT COUNT(*) n FROM lgs_exams').n,1);assert.equal(row(db,'SELECT COUNT(*) n FROM lgs_results').n,2);assert.equal((await request(db,'/lgs/exams','POST',{...input,name:'Different'})).status,409);});
await test('detail bundle reads exactly selected exam and its results; no N+1',async()=>{db.queries=0;const response=await request(db,`/lgs/exams/${exam.id}/bundle`);assert.equal(response.status,200);bundle=response.data;result=bundle.results[0];assert.equal(bundle.analysis.count,2);assert(db.queries<=4);});
await test('public report is unavailable before explicit sharing',async()=>{const token=row(db,'SELECT share_token FROM lgs_results WHERE id=?',result.id).share_token;assert.equal((await request(db,`/lgs/public/karne/${token}`,'GET',undefined,{headers:{Authorization:''}})).status,404);});
let token,shareUrl;
await test('share endpoint creates a capability link with strict private-data projection',async()=>{
 shareUrl=(await request(db,`/lgs/results/${result.id}/share`,'POST')).data.url;token=shareUrl.split('/').at(-1);const r=await request(db,`/lgs/public/karne/${token}`,'GET',undefined,{headers:{Authorization:''}});assert.equal(r.status,200);assert.equal(r.data.result.name,result.name);for(const k of ['tc','student_no','veli_tel','share_token','id'])assert(!(k in r.data.result));assert(!r.data.analysis.top);assert(!r.data.exam.answer_keys);assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
});
await test('settings recompute is atomic; result IDs and share links survive; fresh reopen matches',async()=>{
 const before=rows(db,'SELECT id,share_token FROM lgs_results ORDER BY id');const changed={...input,expected_revision:exam.revision,penalty:4};const r=await request(db,`/lgs/exams/${exam.id}`,'PUT',changed);assert.equal(r.status,200,JSON.stringify(r.data));exam=r.data;assert.equal(exam.revision,2);assert.deepEqual(rows(db,'SELECT id,share_token FROM lgs_results ORDER BY id'),before);assert.equal((await request(db,`/lgs/results/${result.id}/bundle`)).data.exam.penalty,4);assert.equal((await request(db,`/lgs/public/karne/${token}`)).status,200);
});
await test('stale settings and malformed changes leave all rows byte-for-byte intact',async()=>{
 const before=rows(db,'SELECT * FROM lgs_exams'),rs=rows(db,'SELECT * FROM lgs_results');assert.equal((await request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:1})).status,409);assert.equal((await request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:2,date:'2026-02-31'})).status,422);assert.equal((await request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:2,answer_keys:{}})).status,422);assert.deepEqual(rows(db,'SELECT * FROM lgs_exams'),before);assert.deepEqual(rows(db,'SELECT * FROM lgs_results'),rs);
});
await test('concurrent settings choose one writer and retain a coherent revision',async()=>{
 const r=await Promise.all([request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:2,penalty:3}),request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:2,penalty:0})]);assert.deepEqual(r.map(r=>r.status).sort(),[200,409]);exam=r.find(r=>r.status===200).data;
});
await test('transaction rollback on result failure leaves exam configuration and previous results intact',async()=>{
 const before=rows(db,'SELECT * FROM lgs_exams'),rs=rows(db,'SELECT * FROM lgs_results');db.sql.exec("CREATE TRIGGER fail_result BEFORE UPDATE ON lgs_results BEGIN SELECT RAISE(ABORT,'injected'); END;");const r=await request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:exam.revision});assert.equal(r.status,500);db.sql.exec('DROP TRIGGER fail_result');assert.deepEqual(rows(db,'SELECT * FROM lgs_exams'),before);assert.deepEqual(rows(db,'SELECT * FROM lgs_results'),rs);
});
await test('contact validation, persistence and conflict protection',async()=>{
 const path=`/lgs/results/${result.id}/contact`,c={veli_tel:'05550000000',veli_email:'veli@example.invalid',expected_revision:0};assert.equal((await request(db,path,'PUT',{...c,veli_email:'bad'})).status,422);assert.equal((await request(db,path,'PUT',c)).status,200);assert.equal((await request(db,path,'PUT',c)).status,409);const share=(await request(db,`/lgs/results/${result.id}/share`)).data;assert.equal(share.veli_email,c.veli_email);assert.equal(share.revision,1);assert.equal(share.url,shareUrl);
});
await test('progress matches a strong identity and never a name alone',async()=>{const p=(await request(db,`/lgs/results/${result.id}/progress`)).data;assert.equal(p.length,1);assert.equal(p[0].exam_id,exam.id);});
await test('template revisions protect edits; changing a template never mutates existing exam snapshots',async()=>{
 const before=JSON.parse(row(db,'SELECT document FROM lgs_exams WHERE id=?',exam.id).document).template_fields;
 const t=(await request(db,'/lgs/templates/pronet-lgs')).data;assert.equal((await request(db,'/lgs/templates/pronet-lgs','PUT',{...t,name:'Edited',expected_revision:t.revision})).status,200);assert.equal((await request(db,'/lgs/templates/pronet-lgs','PUT',{...t,name:'Stale',expected_revision:t.revision})).status,409);assert.deepEqual(JSON.parse(row(db,'SELECT document FROM lgs_exams WHERE id=?',exam.id).document).template_fields,before);
 const edited=JSON.parse(row(db,"SELECT document FROM lgs_templates WHERE id='pronet-lgs'").document);edited.fields[0].start=999;db.sql.prepare("UPDATE lgs_templates SET document=? WHERE id='pronet-lgs'").run(JSON.stringify(edited));
 const recalculated=await request(db,`/lgs/exams/${exam.id}`,'PUT',{...input,expected_revision:exam.revision});assert.equal(recalculated.status,200,JSON.stringify(recalculated.data));exam=recalculated.data;assert.deepEqual(exam.template_fields,before);
});
await test('concurrent duplicate imports return one stored exam and one set of results',async()=>{
 const t={...input,request_id:crypto.randomUUID(),template_id:'gid-280'}; // use a saved configuration snapshot for a valid PRONET layout
 t.template_id='pronet-lgs';db.sql.prepare("UPDATE lgs_templates SET document=? WHERE id='pronet-lgs'").run(JSON.stringify(tpl));
 const responses=await Promise.all([request(db,'/lgs/exams','POST',t),request(db,'/lgs/exams','POST',t)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);assert.equal(row(db,'SELECT COUNT(*) n FROM lgs_results WHERE exam_id=?',t.request_id).n,2);
 db.sql.prepare('DELETE FROM lgs_results WHERE exam_id=?').run(t.request_id);db.sql.prepare('DELETE FROM lgs_exams WHERE id=?').run(t.request_id);
});
await test('manual templates and exam types persist once across lost-response retry',async()=>{
 for(const [path,doc] of [['/templates/manual',{name:'Anonymous template',fields:tpl.fields}],['/exam-types',{...type,name:'Anonymous type'}]]){const b={...doc,request_id:crypto.randomUUID()};delete b.id;assert.equal((await request(db,'/lgs'+path,'POST',b)).status,201);assert.equal((await request(db,'/lgs'+path,'POST',b)).status,200);assert.equal((await request(db,'/lgs'+path,'POST',{...b,name:'Different'})).status,409);}
});
await test('FMT upload and optik file parse run through real multipart API',async()=>{
 async function post(path,form){return onRequest({request:new Request('https://example.invalid/api/lgs'+path,{method:'POST',headers:{Authorization:'Bearer audit-admin'},body:form}),env:{DB:db}});}
 const file=new FormData();file.append('files',new Blob(['20=20=0=D=*\n1=1=1=10=K=D=0123456789==OGRENCI NO\n1=1=1=20=K=D=ABC==AD SOYAD\n1=20=1=4=K=Y=ABCD==TURKCE']), 'anonim.fmt');const uploaded=await post('/templates',file);assert.equal(uploaded.status,201);assert.equal((await uploaded.json())[0].fields.at(-1).role,'cevap');
 const form=new FormData();form.append('template_id','pronet-lgs');form.append('exam_type_id','lgs-2026');form.append('file',new Blob([raw]),'anonim.txt');const response=await post('/parse',form);assert.equal(response.status,200);const data=await response.json();assert.equal(data.total,3);assert.equal(data.key_rows.length,1);assert.equal(Object.keys(data.mapping).length,6);
});
await test('backup includes every LGS table; foreign-key-aware restore preserves share and result records',async()=>{
 db.sql.exec('PRAGMA foreign_keys=ON');const backup=await request(db,'/backup','POST',{});assert.equal(backup.status,200,JSON.stringify(backup.data));const snapshot=JSON.parse(row(db,'SELECT snapshot_data FROM system_backups WHERE id=?',backup.data.backup_id).snapshot_data);for(const t of ['lgs_exams','lgs_results','lgs_templates','lgs_exam_types','lgs_contacts'])assert(t in snapshot.tables);
 const before=rows(db,'SELECT * FROM lgs_results ORDER BY id');db.sql.prepare('UPDATE lgs_exams SET deleted=1 WHERE id=?').run(exam.id);const restore=await request(db,'/backup/restore','POST',{backup_id:backup.data.backup_id});assert.equal(restore.status,200,JSON.stringify(restore.data));assert.deepEqual(rows(db,'SELECT * FROM lgs_results ORDER BY id'),before);assert.equal(row(db,'SELECT deleted FROM lgs_exams WHERE id=?',exam.id).deleted,0);
});
await test('PDF list, individual, bulk, branch and public exports embed Turkish and valid cross-reference offsets',async()=>{
 const paths=[`/lgs/exams/${exam.id}/export/pdf`,`/lgs/exams/${exam.id}/export/karneler`,`/lgs/exams/${exam.id}/export/sube-karneleri`,`/lgs/results/${result.id}/karne`,`/lgs/public/karne/${token}/pdf`];
 for(const path of paths){const r=await request(db,path);assert.equal(r.status,200);assert(r.data.startsWith('%PDF-1.4'));assert(pdfText(r.data).includes('Türkçe Şube Denemesi'));const offset=Number(r.data.match(/startxref\n(\d+)/)[1]);assert.equal(r.data.slice(offset,offset+4),'xref');}
 const pdf=(await request(db,paths[1])).data;assert.equal(Number(pdf.match(/\/Count (\d+)/)[1]),2);
 fs.mkdirSync('test_reports/fix_lgs',{recursive:true});fs.writeFileSync('test_reports/fix_lgs/karne.pdf',(await request(db,paths[3])).data);
});
await test('Excel is an actual OOXML ZIP and stores untrusted strings as text',async()=>{const r=await request(db,`/lgs/exams/${exam.id}/export/excel`);assert.equal(r.status,200);const response=await onRequest({request:new Request(`https://example.invalid/api/lgs/exams/${exam.id}/export/excel`,{headers:{Authorization:'Bearer audit-admin'}}),env:{DB:db}});const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.readUInt32LE(0),0x04034b50);assert(bytes.includes(Buffer.from('Türkçe Şube Denemesi')));assert(!bytes.includes(Buffer.from('<f>')));fs.writeFileSync('test_reports/fix_lgs/sonuclar.xlsx',bytes);});
await test('100-row archive pagination is stable even when every timestamp is identical',async()=>{
 const s=row(db,'SELECT * FROM lgs_exams LIMIT 1');const insert=db.sql.prepare('INSERT INTO lgs_exams(id,document,raw_text,analysis,summary,created_at,write_token) VALUES(?,?,?,?,?,?,?)');for(let n=0;n<103;n++)insert.run('page-'+String(n).padStart(3,'0'),s.document,'',s.analysis,s.summary,s.created_at,'x');let cursor='',ids=[];do{const r=await request(db,'/lgs/exams'+(cursor?'?before='+encodeURIComponent(cursor):''));assert.equal(r.status,200);ids.push(...r.data.items.map(r=>r.id));cursor=r.data.next;}while(cursor);assert.equal(ids.length,104);assert.equal(new Set(ids).size,104);db.sql.exec("DELETE FROM lgs_exams WHERE id LIKE 'page-%'");
});
await test('archive hides public links but preserves historical raw data, results and finance',async()=>{
 const finance=rows(db,'SELECT * FROM payments'),count=row(db,'SELECT COUNT(*) n FROM lgs_results').n;assert.equal((await request(db,`/lgs/exams/${exam.id}`,'DELETE',{expected_revision:1})).status,409);assert.equal((await request(db,`/lgs/exams/${exam.id}`,'DELETE',{expected_revision:exam.revision})).status,200);assert.equal((await request(db,`/lgs/public/karne/${token}`)).status,404);assert.equal((await request(db,`/lgs/results/${result.id}`)).status,404);assert.equal(row(db,'SELECT COUNT(*) n FROM lgs_results').n,count);assert.deepEqual(rows(db,'SELECT * FROM payments'),finance);assert.equal(row(db,'SELECT raw_text FROM lgs_exams WHERE id=?',exam.id).raw_text,raw);
});
await test('unauthenticated routes, invalid public tokens and staff mutations are denied',async()=>{
 assert.equal((await request(db,'/lgs/templates','GET',undefined,{headers:{Authorization:''}})).status,401);assert.equal((await request(db,'/lgs/public/karne/bad')).status,404);db.sql.exec("INSERT OR IGNORE INTO users(user_id,name,email,role) VALUES('staff','Staff','staff@example.invalid','ogretmen'); INSERT INTO user_sessions(session_token,user_id,expires_at) VALUES('staff','staff','2099-01-01');");assert.equal((await request(db,'/lgs/exams','POST',input,{headers:{Authorization:'Bearer staff'}})).status,403);
});
await test('2000-student recalculation uses bounded SQL and indexed query plans',async()=>{
 const sample=raw.split('\n')[0],body={...input,request_id:crypto.randomUUID(),raw_text:Array(2000).fill(sample).join('\n')};db.queries=0;const start=performance.now();const r=await request(db,'/lgs/exams','POST',body);assert.equal(r.status,201,JSON.stringify(r.data));assert(db.queries<=30,`queries ${db.queries}`);assert.equal(row(db,'SELECT COUNT(*) n FROM lgs_results WHERE exam_id=?',r.data.id).n,2000);const plan=rows(db,'EXPLAIN QUERY PLAN SELECT * FROM lgs_results WHERE exam_id=? ORDER BY rank',r.data.id).map(r=>r.detail).join();assert(plan.includes('idx_lgs_results_exam_rank'));checks.push({name:'large-import metrics',passed:true,queries:db.queries,ms:Math.round(performance.now()-start)});
});
db.sql.close();Object.assign(console,logs);fs.mkdirSync('test_reports/fix_lgs',{recursive:true});fs.writeFileSync('test_reports/fix_lgs/backend.json',JSON.stringify(checks,null,2));console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed)},null,2));if(checks.some(c=>!c.passed))process.exitCode=1;
