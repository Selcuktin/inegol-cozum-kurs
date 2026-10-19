// Anonymous production-router regressions: node --experimental-default-type=module tests/development_fixes.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,request,row,rows,student,pay} from './support/realRouter.mjs';
import {extractStudents,defaultMapping,scoreAll,analyze} from '../frontend/functions/api/lgs/scoring.js';
import {checkReleaseOrder} from '../ops/check-release-order.mjs';
const logs={...console};console.log=console.error=console.warn=()=>{};
const passed=[];
async function check(name,fn){const db=database();try{await fn(db);passed.push(name);}finally{db.sql.close();}}
try{
 await check('release guard rejects a branch that excludes the published commit',()=>{
  checkReleaseOrder('a'.repeat(40),'a'.repeat(40),()=>false);
  checkReleaseOrder('a'.repeat(40),'b'.repeat(40),()=>true);
  assert.throws(()=>checkReleaseOrder('a'.repeat(40),'b'.repeat(40),()=>false),/Merge/);
  assert.throws(()=>checkReleaseOrder(undefined,'b'.repeat(40),()=>true),/identify/);
 });
 await check('partial payment cancellation requires a receipt and re-collection preserves old cancellations',async db=>{
  const c=await student(db),a=await pay(db,c,100),b=await pay(db,c,50),i=row(db,'SELECT * FROM installments WHERE contract_id=? AND installment_no=1',c.id);
  assert.equal((await request(db,'/payments/cancel','POST',{installment_id:i.id})).status,409);
  assert.equal((await request(db,'/payments/cancel','POST',{payment_id:b.id})).status,200);
  assert.equal((await request(db,'/payments/cancel','POST',{payment_id:b.id})).data.already_cancelled,true);
  const latest=await pay(db,c,50);assert.equal(row(db,'SELECT paid_amount FROM installments WHERE id=?',i.id).paid_amount,150);
  const history=(await request(db,'/payments')).data.filter(p=>p.installment_id===i.id);assert.equal(history.length,3);assert.equal(history.filter(p=>!p.is_cancelled).length,2);
  assert.equal(history.find(p=>p.id===b.id).is_cancelled,1);assert(history.some(p=>p.id===a.id)&&history.some(p=>p.id===latest.id));
 });
 await check('anonymous reset GET cannot erase browser storage, only authenticated same-origin POST can',async db=>{
  for(const method of ['GET','POST']){const r=await request(db,'/auth/clear-all-cookies',method,undefined,{headers:{Authorization:''}});assert.equal(r.headers.get('Clear-Site-Data'),null);assert.equal(r.status,method==='GET'?405:401);}
  assert.equal((await request(db,'/auth/clear-all-cookies','POST',{}, {headers:{Origin:'https://other.invalid'}})).status,403);
  const r=await request(db,'/auth/clear-all-cookies','POST',{});assert.equal(r.status,200);assert(r.headers.get('Clear-Site-Data'));
 });
 await check('failed logins are limited without D1 audit writes; edge binding is honored',async db=>{
  const options={headers:{Authorization:'','cf-connecting-ip':'192.0.2.1'},env:{ADMIN_PASSWORD:'test-only'}};
  for(let n=0;n<10;n++)assert.equal((await request(db,'/auth/quick-login','POST',{password:'wrong'},options)).status,401);
  const limited=await request(db,'/auth/quick-login','POST',{password:'wrong'},options);assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');
  assert.equal(row(db,"SELECT COUNT(*) n FROM audit_logs WHERE action='security.failed_login'").n,0);
  assert.equal((await request(db,'/auth/quick-login','POST',{password:'test-only'},{...options,env:{...options.env,LOGIN_RATE_LIMIT:{async limit(){return {success:false};}}}})).status,429);
 });
 const small={subjects:[{key:'x',name:'Ders',question_count:4,coefficient:1,mean:1,sd:1}],mapping:{x:{field_index:0,start:1}},answer_keys:{A:{x:'AAA '}},booklet_maps:{},penalty:3,base_score:200,max_score:500,sd_source:'manual'};
 await check('excluded questions use effective score bounds and invalid effective TASP is rejected',()=>{
  const r=scoreAll([{line_no:1,name:'Sentetik',booklet:'A',answers:{0:'AAAA'}}],small);
  assert.equal(r[0].score_raw,500);assert.equal(r[0].score_sd,500);assert.equal(analyze(r,small).subjects[0].success_pct,100);
  assert.throws(()=>scoreAll([{line_no:1,name:'Sentetik',booklet:'A',answers:{0:'AAAA'}}],{...small,tasp_min:1000}),/TASP/);
 });
 await check('ambiguous booklet fields fail while an explicitly absent booklet field uses A',()=>{
  const fields=[{role:'kitapcik',start:1,length:2},{role:'cevap',start:3,length:4}];
  for(const b of ['  ','* ','AB'])assert.throws(()=>extractStudents(b+'AAAA',fields),/kitapçık/);
  assert.equal(extractStudents('B AAAA',fields)[0].booklet,'B');assert.equal(extractStudents('AAAA',[{role:'cevap',start:1,length:4}])[0].booklet,'A');
 });
 await check('placeholder identities never share contacts or progress; a revoked report link remains invalid',async db=>{
  const template={id:crypto.randomUUID(),name:'Anonim şablon',fields:[{name:'No',role:'ogrenci_no',start:1,length:2},{name:'TC',role:'tc',start:3,length:11},{name:'Ad',role:'ad_soyad',start:14,length:20},{name:'Kit',role:'kitapcik',start:34,length:1},{name:'Cevap',role:'cevap',start:35,length:4}]};
  const type={...small,id:crypto.randomUUID(),name:'Anonim tür',default_penalty:3};
  db.sql.prepare('INSERT INTO lgs_templates(id,document) VALUES(?,?)').run(template.id,JSON.stringify(template));db.sql.prepare('INSERT INTO lgs_exam_types(id,document) VALUES(?,?)').run(type.id,JSON.stringify(type));
  const ids=[];
  for(const [n,name] of [['01','Anonim Bir'],['02','Anonim İki']]){
   const id=crypto.randomUUID(),created=await request(db,'/lgs/exams','POST',{request_id:id,name:'Deneme '+n,date:'2026-10-19',template_id:template.id,exam_type_id:type.id,penalty:3,mapping:{x:{field_index:4,start:1}},answer_keys:{A:{x:'AAAA'}},booklet_maps:{},raw_text:n+'00000000000'+name.padEnd(20)+'A'+'AAAA'});assert.equal(created.status,201,JSON.stringify(created.data));ids.push((await request(db,`/lgs/exams/${id}/bundle`)).data.results[0].id);
  }
  assert.notEqual(row(db,'SELECT student_key FROM lgs_results WHERE id=?',ids[0]).student_key,row(db,'SELECT student_key FROM lgs_results WHERE id=?',ids[1]).student_key);
  const oldExam=JSON.parse(row(db,'SELECT document FROM lgs_exams WHERE id=?',ids[0].split('_')[0]).document),source=row(db,'SELECT raw_text FROM lgs_exams WHERE id=?',oldExam.id).raw_text;
  const duplicate={...oldExam,request_id:crypto.randomUUID(),raw_text:source};assert.equal((await request(db,'/lgs/exams','POST',duplicate)).data.code,'DUPLICATE_EXAM');
  assert.equal((await request(db,'/lgs/exams','POST',{...duplicate,allow_duplicate:true})).status,201);
  await request(db,`/lgs/results/${ids[0]}/contact`,'PUT',{veli_tel:'',veli_email:'anonymous@example.invalid',expected_revision:0});assert.equal((await request(db,`/lgs/results/${ids[1]}/share`)).data.veli_email,'');assert.equal((await request(db,`/lgs/results/${ids[1]}/progress`)).data.length,1);
  const old=(await request(db,`/lgs/results/${ids[0]}/share`,'POST')).data.url.split('/').at(-1);assert.equal((await request(db,`/lgs/public/karne/${old}`)).status,200);
  assert.equal((await request(db,`/lgs/results/${ids[0]}/share`,'DELETE')).status,200);assert.equal((await request(db,`/lgs/public/karne/${old}`)).status,404);
  const fresh=(await request(db,`/lgs/results/${ids[0]}/share`,'POST')).data.url.split('/').at(-1);assert.notEqual(fresh,old);assert.equal((await request(db,`/lgs/public/karne/${old}`)).status,404);assert.equal((await request(db,`/lgs/public/karne/${fresh}`)).status,200);
 });
 await check('2000-result R2 backup restores atomically in bounded binds with correct metadata',async db=>{
  const raw=fs.readFileSync('frontend/public/ornek-lgs-verisi.txt','utf8'),tpl=JSON.parse(row(db,"SELECT document FROM lgs_templates WHERE id='pronet-lgs'").document),type=JSON.parse(row(db,"SELECT document FROM lgs_exam_types WHERE id='lgs-2026'").document),mapping=defaultMapping(tpl.fields,type.subjects),key=extractStudents(raw,tpl.fields).find(s=>s.is_key);
  const body={request_id:crypto.randomUUID(),name:'Büyük anonim sınav',date:'2026-10-19',template_id:tpl.id,exam_type_id:type.id,penalty:3,mapping,answer_keys:{A:Object.fromEntries(type.subjects.map(s=>[s.key,key.answers[mapping[s.key].field_index].slice(0,s.question_count)]))},booklet_maps:{},raw_text:Array(2000).fill(raw.split('\n')[0]).join('\n')};
  assert.equal((await request(db,'/lgs/exams','POST',body)).status,201);
  const objects=new Map(),bucket={async put(k,v){objects.set(k,v);},async get(k){return objects.has(k)?{text:async()=>objects.get(k)}:null;}},env={BACKUPS:bucket};
  const backup=await request(db,'/backup','POST',{}, {env});assert.equal(backup.status,200);
  const id=backup.data.backup_id,text=objects.get(id+'.json'),before=rows(db,'SELECT * FROM lgs_results ORDER BY id');assert(Buffer.byteLength(JSON.stringify(JSON.parse(text).tables.lgs_results))>1900000);
  assert.equal(row(db,'SELECT snapshot_data FROM system_backups WHERE id=?',id).snapshot_data,'{}');
  const meta=(await request(db,'/backup','GET',undefined,{env})).data.backups.find(b=>b.id===id);assert.equal(meta.size_bytes,Buffer.byteLength(text));assert.match(meta.sha256,/^[a-f0-9]{64}$/);
  db.sql.exec("UPDATE lgs_results SET shared=1");const restore=await request(db,'/backup/restore','POST',{backup_id:id},{env});assert.equal(restore.status,200,JSON.stringify(restore.data));assert.deepEqual(rows(db,'SELECT * FROM lgs_results ORDER BY id'),before);
  db.sql.exec("CREATE TRIGGER restore_failure BEFORE INSERT ON lgs_results BEGIN SELECT RAISE(ABORT,'injected failure'); END");
  const failure=await request(db,'/backup/restore','POST',{backup_id:id},{env});assert.equal(failure.status,500);assert.deepEqual(rows(db,'SELECT * FROM lgs_results ORDER BY id'),before);
  const corrupted=JSON.parse(text);corrupted.tables.lgs_results[0].shared=1;objects.set(id+'.json',JSON.stringify(corrupted));
  assert.equal((await request(db,'/backup/restore','POST',{backup_id:id},{env})).status,409);assert.deepEqual(rows(db,'SELECT * FROM lgs_results ORDER BY id'),before);
 });
}finally{Object.assign(console,logs);}
console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
