// Run: node tests/system_integrity.mjs. Real router and SQLite, no external writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,row,rows,request,student,pay} from './support/realRouter.mjs';
const results=[];let operations=0;
const original={...console};console.log=console.warn=console.error=()=>{};
async function check(name,test){const db=database();try{await test(db);results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});}finally{db.sql.close();}}
async function api(db,path,method,body,options){operations++;return request(db,path,method,body,options);}
function invariant(db){
  for(const c of rows(db,'SELECT * FROM contracts WHERE COALESCE(is_deleted,0)=0')){
    const inst=rows(db,'SELECT * FROM installments WHERE contract_id=?',c.id);const payments=rows(db,'SELECT * FROM payments WHERE contract_id=? AND COALESCE(is_cancelled,0)=0',c.id);
    const cents=n=>Math.round(n*100);const gross=inst.reduce((n,i)=>n+cents(i.amount),0);const paid=inst.reduce((n,i)=>n+cents(i.paid_amount),0);
    assert.equal(gross,cents(c.brut_tutar),'gross equals stored installments');assert.equal(paid,payments.reduce((n,p)=>n+cents(p.amount),0),'all collected cents have receipts');
    for(const i of inst){assert(i.paid_amount>=0&&i.paid_amount<=i.amount);assert(/^\d{4}-\d{2}-\d{2}$/.test(i.due_date));}
    for(const income of rows(db,'SELECT * FROM student_incomes WHERE contract_id=? AND COALESCE(is_deleted,0)=0',c.id)){
      assert.equal(cents(income.brut_tutar),cents(c.brut_tutar));assert.equal(cents(income.toplam_tahsilat),paid);assert.equal(cents(income.kalan_alacak),c.durum===3?0:Math.max(0,gross-paid));
    }
    const s=row(db,'SELECT * FROM students WHERE id=?',c.student_id);if(s?.sozlesme_no===c.sozlesme_no)assert.equal(cents(s.paid_amount),paid,'current student balance excludes history');
  }
}

for(let seed=1;seed<=40;seed++)await check('financial sequence seed '+seed,async db=>{
  let random=seed;const next=n=>{random=(random*1664525+1013904223)>>>0;return random%n;};
  const c=await student(db,'sequence-'+seed,{total_fee:10000.01,installment_count:4,due_date:'2026-10-31'});
  for(let step=0;step<35;step++){
    const type=next(7);let r;
    if(type===0){const i=rows(db,'SELECT * FROM installments WHERE contract_id=? AND amount>paid_amount ORDER BY installment_no',c.id)[0];if(i)r=await api(db,'/payments','POST',{id:`seq-${seed}-${step}`,student_id:c.student_id,contract_id:c.id,installment_id:i.id,amount:Math.min(5+next(100),Math.round((i.amount-i.paid_amount)*100)/100)});}
    if(type===1){const p=rows(db,'SELECT * FROM payments WHERE contract_id=? AND is_cancelled=0',c.id)[0];if(p)r=await api(db,'/payments/cancel','POST',{payment_id:p.id});}
    if(type===2){const plan=rows(db,'SELECT * FROM installments WHERE contract_id=? ORDER BY installment_no',c.id);const edited=plan.map((i,n)=>({...i,amount:Math.round((i.amount+(n===plan.length-1?next(200):0))*100)/100,due_date:i.due_date}));r=await api(db,'/contracts/'+c.id+'/installments','PUT',{installments:edited,expectedInstallments:plan});}
    if(type===3)r=await api(db,'/students/'+c.student_id,'PATCH',{school:'School '+step,parent_phone:'Test '+step});
    if(type===4)r=await api(db,'/contracts/'+c.id+'/notes','POST',{text:`Seed ${seed} step ${step}`});
    if(type===5)r=await api(db,'/students/'+c.student_id,'PATCH',{total_fee:12000+next(2000),installment_count:4,due_date:'2026-10-31'});
    if(type===6){const before=rows(db,'SELECT * FROM installments WHERE contract_id=?',c.id);r=await api(db,'/contracts/'+c.id+'/installments','PUT',{installments:before.map(i=>({...i,paid_amount:i.paid_amount+1}))});assert.equal(r.status,422);assert.deepEqual(rows(db,'SELECT * FROM installments WHERE contract_id=?',c.id),before);r=null;}
    if(r)assert([200,201].includes(r.status),JSON.stringify(r));invariant(db);
    if(step%7===0){const d=await api(db,'/dashboard');assert.equal(d.status,200);assert.equal(Math.round(d.data.accounting.totalRevenue*100),Math.round(row(db,'SELECT brut_tutar FROM contracts WHERE id=?',c.id).brut_tutar*100));}
  }
  assert.equal((await api(db,'/contracts/'+c.id+'/cancel','POST',{reason:'Sequence completed and closed'})).status,200);invariant(db);
  const closed=rows(db,'SELECT * FROM installments');assert.equal((await api(db,'/students/'+c.student_id,'PATCH',{total_fee:100})).status,409);assert.deepEqual(rows(db,'SELECT * FROM installments'),closed);
});

await check('all authenticated domain reads forbid browser and shared caching',async db=>{
  await student(db);for(const path of ['/dashboard','/students','/contracts','/installments','/student-incomes','/payments','/accounting/summary','/classes','/teachers','/exams','/schedules','/homework','/mentorship','/appointments','/optical/templates','/optical/printer-profiles','/users','/audit-logs','/security/overview','/reminders']){
    const r=await api(db,path);assert.equal(r.status,200,path);assert(r.headers.get('cache-control').includes('no-store'),path);assert(!r.headers.get('cache-control').includes('public'),path);
  }
});
await check('student stale field edit conflicts but unrelated field edits can coexist',async db=>{
  const c=await student(db);const before=(await api(db,'/students/'+c.student_id)).data;
  assert.equal((await api(db,'/students/'+c.student_id,'PATCH',{school:'Changed',_expected:{school:before.school}})).status,200);
  assert.equal((await api(db,'/students/'+c.student_id,'PATCH',{school:'Old form',_expected:{school:before.school}})).status,409);
  assert.equal((await api(db,'/students/'+c.student_id,'PATCH',{student_phone:'Test phone',_expected:{student_phone:before.student_phone}})).status,200);
  assert.equal(row(db,'SELECT school FROM students').school,'Changed');
});
await check('class and teacher round trips allow clearing fields and reject stale forms',async db=>{
  const c=await api(db,'/classes','POST',{name:'Audit Class',level:'8',room:'R1',capacity:20,teacher:'Audit'});assert([200,201].includes(c.status));
  const original=row(db,'SELECT * FROM classes WHERE id=?',c.data.id);
  assert.equal((await api(db,'/classes/'+c.data.id,'PATCH',{room:'',_expected:{room:'R1'}})).status,200);
  assert.equal(row(db,'SELECT room FROM classes WHERE id=?',c.data.id).room,'');assert.equal(row(db,'SELECT name FROM classes WHERE id=?',c.data.id).name,'Audit Class');
  assert.equal((await api(db,'/classes/'+c.data.id,'PATCH',{room:'R2',_expected:{room:original.room}})).status,409);
  const t=await api(db,'/teachers','POST',{name:'Audit Teacher',branch:'Math',phone:'old',email:'old@example.test'});assert.equal(t.status,201);
  assert.equal((await api(db,'/teachers/'+t.data.id,'PATCH',{phone:'',email:'',_expected:{phone:'old'}})).status,200);
  assert.equal(row(db,'SELECT phone FROM teachers WHERE id=?',t.data.id).phone,'');
  assert.equal((await api(db,'/teachers/'+t.data.id,'PATCH',{phone:'stale',_expected:{phone:'old'}})).status,409);
});
await check('academic create update reread and history preservation',async db=>{
  await student(db);
  const hw=await api(db,'/homework','POST',{title:'Audit homework',class_id:'8-A',subject:'Math',due_date:'2026-11-01'});assert.equal(hw.status,201);
  const mark=await api(db,'/homework/'+hw.data.id+'/submissions','POST',{submissions:[{student_id:'audit-s1',status:'yapildi'}]});assert.equal(mark.status,200);
  assert.equal(row(db,'SELECT status FROM homework_submissions WHERE homework_id=?',hw.data.id).status,'yapildi');
  const session=await api(db,'/mentorship','POST',{student_id:'audit-s1',mentor_name:'Audit',session_date:'2026-10-17',notes:'Persistent'});assert.equal(session.status,201);
  assert.equal((await api(db,'/mentorship')).data.find(s=>s.id===session.data.id).notes,'Persistent');
  const ex=await api(db,'/exams','POST',{title:'Audit exam',exam_type:'LGS'});assert.equal(ex.status,201);
  assert.equal((await api(db,'/exams/'+ex.data.id,'PATCH',{answer_keys:{A:{math:'ABCD'}}})).status,200);
  assert.deepEqual(JSON.parse((await api(db,'/exams/'+ex.data.id)).data.answer_keys),{A:{math:'ABCD'}});
});

await check('attendance stale drafts and missing-row races cannot overwrite another teacher',async db=>{
  await student(db);
  const initial={status:'geldi',note:'',notified_parent:0};
  const rec={student_id:'audit-s1',status:'gelmedi',note:'First teacher',_expected:initial};
  const payload={date:'2026-10-17',lesson_slot:'1. Ders',records:[rec]};
  assert.equal((await api(db,'/attendance','POST',payload)).status,200);
  const saved=rows(db,'SELECT * FROM attendance');
  assert.equal((await api(db,'/attendance','POST',{...payload,records:[{...rec,status:'geldi'}]})).status,409);
  assert.deepEqual(rows(db,'SELECT * FROM attendance'),saved);
  assert.equal((await api(db,'/attendance','POST',{...payload,records:[{...rec,status:'izinli',_expected:{status:'gelmedi',note:'First teacher',notified_parent:0}}]})).status,200);
  assert.equal((await api(db,'/attendance?date=2026-10-17&lesson_slot=1.%20Ders')).data[0].status,'izinli');
});
await check('homework stale drafts reject atomically and the current draft persists',async db=>{
  await student(db);
  const hw=await api(db,'/homework','POST',{title:'Draft test',class_id:'8-A',subject:'Math',due_date:'2026-11-01'});
  const path='/homework/'+hw.data.id+'/submissions';
  const first={student_id:'audit-s1',status:'yapildi',note:'Saved',_expected:{status:'yapilmadi',note:''}};
  assert.equal((await api(db,path,'POST',[first])).status,200);
  const before=rows(db,'SELECT * FROM homework_submissions');
  assert.equal((await api(db,path,'POST',[{...first,status:'eksik'}])).status,409);
  assert.deepEqual(rows(db,'SELECT * FROM homework_submissions'),before);
});
await check('schedule conflicts and stale answer keys cannot replace the current record',async db=>{
  const slot={id:'slot1',class_id:'class1',day_of_week:1,time_slot:'09:00 - 09:45',subject:'Math',teacher_name:'Teacher',room:'Room'};
  assert.equal((await api(db,'/schedules','POST',slot)).status,201);
  assert.equal((await api(db,'/schedules/slot1','PUT',{subject:'Science',_expected:{subject:'Math'}})).status,200);
  assert.equal((await api(db,'/schedules/slot1','PUT',{subject:'History',_expected:{subject:'Math'}})).status,409);
  assert.equal(row(db,'SELECT subject FROM schedules').subject,'Science');
  const exam=await api(db,'/exams','POST',{title:'Keys conflict',exam_type:'LGS'});
  const path='/exams/'+exam.data.id;const initialKeys=row(db,'SELECT answer_keys FROM exams').answer_keys;
  assert.equal((await api(db,path,'PATCH',{answer_keys:{A:{math:'ABCD'}},_expected:{answer_keys:initialKeys}})).status,200);
  assert.equal((await api(db,path,'PATCH',{answer_keys:{A:{math:'DCBA'}},_expected:{answer_keys:initialKeys}})).status,409);
  assert.deepEqual(JSON.parse(row(db,'SELECT answer_keys FROM exams').answer_keys),{A:{math:'ABCD'}});
});
await check('database races after validation are rejected inside the same transaction',async db=>{
  const c=await api(db,'/classes','POST',{name:'Race Class',room:'Original'});
  const batch=db.batch;let injected=false;
  db.batch=async statements=>{if(!injected){injected=true;db.sql.prepare('UPDATE classes SET room=? WHERE id=?').run('Another editor',c.data.id);}return batch(statements);};
  assert.equal((await api(db,'/classes/'+c.data.id,'PATCH',{room:'Stale',_expected:{room:'Original'}})).status,409);
  assert.equal(row(db,'SELECT room FROM classes').room,'Another editor');
});
for(const module of ['attendance','homework','exam'])await check(module+' injected database failure rolls the entire list back',async db=>{
  await student(db);await student(db,'second');let path,body,table;
  if(module==='attendance'){
    table='attendance';path='/attendance';body={date:'2026-10-17',lesson_slot:'Test',records:[{student_id:'audit-s1',status:'geldi'},{student_id:'second',status:'gelmedi'}]};
  }else if(module==='homework'){
    table='homework_submissions';const h=await api(db,'/homework','POST',{title:'Atomic',class_id:'8-A',subject:'Math',due_date:'2026-11-01'});path='/homework/'+h.data.id+'/submissions';body=[{student_id:'audit-s1',status:'yapildi'},{student_id:'second',status:'eksik'}];
  }else{
    table='exam_results';const e=await api(db,'/exams','POST',{title:'Atomic',exam_type:'LGS'});path='/exams/'+e.data.id+'/results';body=[{student_id:'audit-s1',turkish_correct:5},{student_id:'second',turkish_correct:7}];
  }
  assert.equal((await api(db,path,'POST',body)).status,200);
  const before=rows(db,'SELECT * FROM '+table+' ORDER BY student_id');
  db.sql.exec("CREATE TRIGGER fail_second BEFORE INSERT ON "+table+" WHEN NEW.student_id='second' BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
  assert.equal((await api(db,path,'POST',body)).status,500);
  assert.deepEqual(rows(db,'SELECT * FROM '+table+' ORDER BY student_id'),before);
});
await check('invalid JSON, primitive bodies and duplicate rows never report a successful write',async db=>{
  await student(db);
  const paths=[['/students/audit-s1','PATCH'],['/contracts/missing','PATCH'],['/payments','POST'],['/attendance','POST'],['/schedules','POST'],['/homework','POST'],['/exams','POST'],['/mentorship','POST']];
  const before=rows(db,'SELECT * FROM students');
  for(const [path,method] of paths){
    assert.equal((await api(db,path,method,'{')).status,400,path);
    for(const value of [null,42,'"text"'])assert.equal((await api(db,path,method,value)).status,422,path);
  }
  assert.deepEqual(rows(db,'SELECT * FROM students'),before);
  assert.equal((await api(db,'/attendance','POST',{date:'2026-10-17',records:[{student_id:'audit-s1',status:'geldi'},{student_id:'audit-s1',status:'gelmedi'}]})).status,422);
  assert.equal(row(db,'SELECT COUNT(*) n FROM attendance').n,0);
});
await check('role matrix rejects unauthorized writes without changing data and permits academic work',async db=>{
  await student(db);
  db.sql.exec("INSERT INTO user_sessions(session_token,user_id,expires_at) VALUES('teacher-session','user_teacher','2099-01-01'),('accounting-session','user_accounting','2099-01-01');");
  const routes=[['/students/audit-s1','PATCH',{school:'Denied'}],['/contracts/no','DELETE'],['/payments','POST',{student_id:'audit-s1',amount:1}],['/expenses','POST',{amount:1}],['/classes','POST',{name:'Denied'}],['/teachers','POST',{name:'Denied'}],['/users/role','PUT',{user_id:'user_teacher',role:'admin'}],['/exams/no','DELETE']];
  const before=rows(db,'SELECT * FROM students');
  for(const [path,method,body] of routes){
    assert.equal((await api(db,path,method,body,{headers:{Authorization:''}})).status,401,path);
    assert.equal((await api(db,path,method,body,{headers:{Authorization:'Bearer teacher-session'}})).status,403,path);
  }
  for(const path of ['/users','/audit-logs','/security/overview'])assert.equal((await api(db,path,'GET',undefined,{headers:{Authorization:'Bearer accounting-session'}})).status,403);
  assert.deepEqual(rows(db,'SELECT * FROM students'),before);
  assert.equal((await api(db,'/homework','POST',{title:'Teacher can create',class_id:'8-A',subject:'Math',due_date:'2026-11-01'},{headers:{Authorization:'Bearer teacher-session'}})).status,201);
  assert.equal((await api(db,'/students/audit-s1','PATCH',{school:'Accounting edit'},{headers:{Authorization:'Bearer accounting-session'}})).status,200);
});

await check('new current-period contracts do not reuse canceled history and duplicate saves cannot change a plan',async db=>{
  const old=await student(db,'historic',{total_fee:1000,installment_count:2});await pay(db,old,100);
  assert.equal((await api(db,'/contracts/'+old.id+'/cancel','POST',{reason:'Historical canceled contract'})).status,200);
  const history=rows(db,'SELECT * FROM installments WHERE contract_id=?',old.id);const payments=rows(db,'SELECT * FROM payments');
  const created=await api(db,'/contracts','POST',{student_id:old.student_id,student_name:'Anonymous',total_amount:1500,installment_count:3});assert.equal(created.status,201);
  assert.notEqual(created.data.id,old.id);assert.equal(row(db,'SELECT total_fee FROM students').total_fee,1500);assert.equal(row(db,'SELECT paid_amount FROM students').paid_amount,0);
  assert.deepEqual(rows(db,'SELECT * FROM installments WHERE contract_id=?',old.id),history);assert.deepEqual(rows(db,'SELECT * FROM payments'),payments);
  const plan=rows(db,'SELECT * FROM installments WHERE contract_id=?',created.data.id);
  assert.equal((await api(db,'/contracts','POST',{student_id:old.student_id,student_name:'Anonymous',total_amount:1600,installment_count:3})).status,409);
  assert.deepEqual(rows(db,'SELECT * FROM installments WHERE contract_id=?',created.data.id),plan);
  assert.equal((await api(db,'/contracts','POST',{student_id:old.student_id,student_name:'Anonymous',total_amount:1500,installment_count:3})).data.id,created.data.id);
});

Object.assign(console,original);
const summary={tested_at:new Date().toISOString(),passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,http_operations:operations,financial_sequences:40,steps_per_sequence:35,results};
fs.writeFileSync('test_reports/fix_system_integrity.json',JSON.stringify(summary,null,2));for(const r of results)if(!r.passed)console.error(r.name,r.error);console.log(JSON.stringify({...summary,results:undefined}));process.exitCode=summary.failed?1:0;
