// Isolated SQLite; actual student/contract router, without production data or remote calls.
import assert from 'node:assert/strict';
import {database,request,student,pay,row,rows} from './support/realRouter.mjs';

const logs={...console},passed=[];console.log=console.warn=console.error=()=>{};
async function check(name,run){const db=database();try{await run(db);passed.push(name);}finally{db.sql.close();}}
const financial=db=>Object.fromEntries(['students','contracts','student_incomes','installments','payments'].map(t=>[t,rows(db,`SELECT * FROM ${t} ORDER BY id`)]));
try{
 await check('lost create responses replay once without rewriting profile, payment or generated contract number',async db=>{
  const body={id:'student-replay',student_name:'  Replay Student ',parent_name:'Parent',parent_phone:'',mother_phone:'05302222222',sozlesme_no:'',total_fee:1000,installment_count:2,extra_fees:{book:25.5},uses_service:1};
  assert.equal((await request(db,'/students','POST',body)).status,201);
  const before=financial(db),replay=await request(db,'/students','POST',body);
  assert.equal(replay.status,200,JSON.stringify(replay.data));assert.equal(replay.data.already_recorded,true);assert.deepEqual(financial(db),before);
  assert.equal(rows(db,'SELECT id FROM students').length,1);assert.equal(rows(db,'SELECT id FROM contracts').length,1);
  assert.equal((await request(db,'/students/student-replay','PATCH',{school:'A later school'})).status,200);
  const c=row(db,'SELECT * FROM contracts');await pay(db,c,100);
  const after=financial(db),again=await request(db,'/students','POST',body);assert.equal(again.status,200);assert.deepEqual(financial(db),after);
  for(const change of [{student_name:'Changed name'},{school:'Old school'},{paid_amount:0}]){
   assert.equal((await request(db,'/students','POST',{...body,...change})).status,409);assert.deepEqual(financial(db),after);
  }
  assert.equal((await request(db,'/Ogrencies/CreateOrEdit','POST',{id:'student-replay',student_name:'Legacy edit'})).status,200);
  assert.equal(row(db,'SELECT student_name FROM students').student_name,'Legacy edit');
 });
 await check('student money rejects sub-cent and unsafe values on both create and edit without any financial write',async db=>{
  const c=await student(db,'precision-guard'),before=financial(db);
  for(const field of ['total_fee','discount_amount'])for(const value of [0.001,1000.001,Number.MAX_SAFE_INTEGER,Infinity,null,[],true]){
   for(const [path,method,body] of [['/students','POST',{student_name:'Invalid precision',[field]:value}],['/students/'+c.student_id,'PATCH',{[field]:value}]]){
    assert.equal((await request(db,path,method,body)).status,422,JSON.stringify({field,value,method}));assert.deepEqual(financial(db),before);
   }
  }
  for(const value of [0.001,Number.MAX_SAFE_INTEGER,null,[],true])for(const method of ['POST','PATCH']){
   assert.equal((await request(db,method==='POST'?'/students':'/students/'+c.student_id,method,{...(method==='POST'?{student_name:'Invalid extras'}:{}),extra_fees:{book:value}})).status,422);assert.deepEqual(financial(db),before);
  }
  assert.equal((await request(db,'/students','POST',{id:'precise',student_name:'Precise fees',total_fee:0.1,extra_fees:{book:0.2},installment_count:1})).status,201);
  assert.equal(row(db,"SELECT brut_tutar FROM contracts WHERE student_id='precise'").brut_tutar,0.3);
  assert.equal((await request(db,'/students/precise','PATCH',{extra_fees:{book:0.7}})).status,200);
  assert.equal(row(db,"SELECT brut_tutar FROM contracts WHERE student_id='precise'").brut_tutar,0.8);
 });
 await check('concurrent initial student creation rejects the losing request without overwriting its winner or payment',async db=>{
  const body={id:'same-create',student_name:'Concurrent create',parent_name:'Parent',total_fee:1000,installment_count:2},batch=db.batch;let committed;
  db.batch=async statements=>{db.batch=batch;assert.equal((await request(db,'/students','POST',body)).status,201);await pay(db,row(db,'SELECT * FROM contracts'),100);committed=financial(db);return batch.call(db,statements);};
  const rejected=await request(db,'/students','POST',body);assert.equal(rejected.status,409,JSON.stringify(rejected.data));assert.deepEqual(financial(db),committed);
  const replay=await request(db,'/students','POST',body);assert.equal(replay.status,200);assert.equal(replay.data.already_recorded,true);assert.deepEqual(financial(db),committed);
 });
 await check('concurrent current-contract switch rolls back a student financial edit even with a narrow form baseline',async db=>{
  const old=await student(db,'pointer-switch'),next=await student(db,'new-period');
  db.sql.prepare("UPDATE contracts SET student_id=?,period_id=114,period_name='2027-2028' WHERE id=?").run(old.student_id,next.id);
  const batch=db.batch;let switched;
  db.batch=async statements=>{db.batch=batch;db.sql.prepare('UPDATE students SET sozlesme_no=? WHERE id=?').run(next.sozlesme_no,old.student_id);switched=financial(db);return batch.call(db,statements);};
  const rejected=await request(db,'/students/'+old.student_id,'PATCH',{total_fee:1200,_expected:{total_fee:1000,extra_fees:'{}',discount_amount:0,installment_count:2,due_date:''}});
  assert.equal(rejected.status,409,JSON.stringify(rejected.data));assert.deepEqual(financial(db),switched);
 });
 await check('student deletion cannot orphan a concurrently created contract or its collected payment',async db=>{
  db.sql.prepare("INSERT INTO students(id,student_name,parent_name) VALUES('delete-race','Delete Race','Parent')").run();
  const batch=db.batch;let committed;
  db.batch=async statements=>{db.batch=batch;const created=await request(db,'/contracts','POST',{student_id:'delete-race',student_name:'Delete Race',parent_name:'Parent',total_amount:1000,installment_count:2});assert.equal(created.status,201,JSON.stringify(created.data));await pay(db,row(db,'SELECT * FROM contracts WHERE student_id=?','delete-race'),100);committed=financial(db);return batch.call(db,statements);};
  const rejected=await request(db,'/students/delete-race','DELETE');assert.equal(rejected.status,409,JSON.stringify(rejected.data));assert.deepEqual(financial(db),committed);
  assert.equal(row(db,"SELECT COUNT(*) n FROM students WHERE id='delete-race'").n,1);
 });
 await check('profile-only edits preserve the registered father phone even when another parent has a number',async db=>{
  const c=await student(db,'phone-boundary',{parent_phone:'05301111111',mother_phone:'05302222222',guardian_phone:'05303333333',primary_parent:'baba'});
  for(const patch of [{school:'New school'},{mother_phone:'05304444444'},{primary_parent:'anne'}]){
   assert.equal((await request(db,'/students/'+c.student_id,'PATCH',patch)).status,200);
   assert.equal(row(db,'SELECT parent_phone FROM students').parent_phone,'05301111111');
  }
  assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{parent_phone:''})).status,200);
  assert.equal(row(db,'SELECT parent_phone FROM students').parent_phone,'');
 });
 await check('phone fallback uses the merged selected parent only after an explicit contact edit',async db=>{
  const c=await student(db,'phone-fallback',{primary_parent:'baba',mother_phone:'05302222222'});
  db.sql.exec("UPDATE students SET parent_phone=''");
  assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{school:'Profile only'})).status,200);
  assert.equal(row(db,'SELECT parent_phone FROM students').parent_phone,'');
  assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{mother_phone:'05304444444'})).status,200);
  assert.equal(row(db,'SELECT parent_phone FROM students').parent_phone,'');
  assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{primary_parent:'anne'})).status,200);
  assert.equal(row(db,'SELECT parent_phone FROM students').parent_phone,'05304444444');
  assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{parent_phone:'',mother_phone:''})).status,200);
  assert.equal(row(db,'SELECT parent_phone FROM students').parent_phone,'');
 });
 await check('NULL legacy deletion flags and both student ID aliases retain one current financial plan',async db=>{
  for(const [id,linked] of [['stu-123','123'],['456','stu-456']]){
   const c=await student(db,id);
   db.sql.prepare('UPDATE contracts SET student_id=?,is_deleted=NULL WHERE id=?').run(linked,c.id);
   const updated=await request(db,'/students/'+id,'PATCH',{total_fee:1100,installment_count:3});assert.equal(updated.status,200,JSON.stringify(updated.data));
   assert.equal(row(db,'SELECT total_fee FROM students WHERE id=?',id).total_fee,1100);
   assert.equal(row(db,'SELECT brut_tutar FROM contracts WHERE id=?',c.id).brut_tutar,1100);
   assert.equal(Math.round(row(db,'SELECT SUM(amount) n FROM installments WHERE contract_id=?',c.id).n*100),110000);
   const detail=await request(db,'/students/'+id+'/detail');assert.equal(detail.status,200);assert.equal(detail.data.installment_plan.length,3);
   assert(detail.data.installment_plan.every(i=>rows(db,'SELECT id FROM installments WHERE contract_id=?',c.id).some(r=>r.id===i.id)));
  }
 });
 await check('an older legacy contract is never selected instead of the current contract pointer',async db=>{
  const old=await student(db,'legacy-old'),current=await student(db,'stu-777');
  db.sql.prepare("UPDATE contracts SET student_id='777',is_deleted=NULL WHERE id IN (?,?)").run(old.id,current.id);
  const oldBefore=rows(db,'SELECT * FROM installments WHERE contract_id=?',old.id);
  assert.equal((await request(db,'/students/stu-777','PATCH',{total_fee:1200})).status,200);
  assert.equal(row(db,'SELECT brut_tutar FROM contracts WHERE id=?',current.id).brut_tutar,1200);
  assert.equal(row(db,'SELECT brut_tutar FROM contracts WHERE id=?',old.id).brut_tutar,1000);
  assert.deepEqual(rows(db,'SELECT * FROM installments WHERE contract_id=?',old.id),oldBefore);
  const detail=(await request(db,'/students/stu-777/detail')).data;
  assert(detail.installment_plan.every(i=>rows(db,'SELECT id FROM installments WHERE contract_id=?',current.id).some(r=>r.id===i.id)));
 });
 await check('null or changed paid amounts cannot change a student cash balance',async db=>{
  const c=await student(db,'paid-guard');await pay(db,c,100);const before=financial(db);
  for(const amount of [null,0,101,'bad',{}]){
   const rejected=await request(db,'/students/'+c.student_id,'PATCH',{paid_amount:amount});assert.equal(rejected.status,422);assert.equal(rejected.data.code,'PAYMENT_REQUIRED');assert.deepEqual(financial(db),before);
  }
 });
 await check('invalid PATCH extra fees cannot reduce a contract while valid JSON keeps custom extras',async db=>{
  const c=await student(db,'extras-guard'),before=financial(db);
  for(const extra_fees of [{book:-500},'{',[12],false,'null',{book:'bad'}]){
   const rejected=await request(db,'/students/'+c.student_id,'PATCH',{extra_fees});assert.equal(rejected.status,422);assert.deepEqual(financial(db),before);
   assert.equal((await request(db,'/students','POST',{student_name:'Invalid extras',extra_fees})).status,422);assert.deepEqual(financial(db),before);
  }
  assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{extra_fees:'{"custom":25.50}'})).status,200);
  assert.equal(row(db,'SELECT brut_tutar FROM contracts WHERE id=?',c.id).brut_tutar,1025.5);
 });
 await check('student creation and edit reject non-string or blank names without partial financial writes',async db=>{
  const c=await student(db,'name-guard'),before=financial(db);
  for(const student_name of ['', '   ',null,42,{},[]])for(const method of ['POST','PATCH']){
   const rejected=await request(db,method==='POST'?'/students':'/students/'+c.student_id,method,{student_name});assert.equal(rejected.status,422);assert.deepEqual(financial(db),before);
  }
 });
 await check('installment count bounds apply even to a standalone legacy student without a contract',async db=>{
  db.sql.prepare("INSERT INTO students(id,student_name,parent_name,total_fee,installment_count) VALUES('standalone','Standalone','Parent',1000,2)").run();
  const before=financial(db);
  for(const installment_count of [0,-1,1.5,121,null,'bad']){
   assert.equal((await request(db,'/students/standalone','PATCH',{installment_count})).status,422);assert.deepEqual(financial(db),before);
  }
 });
 await check('numeric fee fields reject null and container values instead of storing JSON text as money',async db=>{
  const c=await student(db,'numeric-fields'),before=financial(db);
  for(const field of ['total_fee','discount_amount'])for(const value of [null,[],{},true]){
   assert.equal((await request(db,'/students/'+c.student_id,'PATCH',{[field]:value})).status,422);assert.deepEqual(financial(db),before);
  }
 });
 await check('cancelled legacy contract financial edits remain blocked without changing its history',async db=>{
  const c=await student(db,'stu-closed');
  db.sql.prepare("UPDATE contracts SET student_id='closed',is_deleted=NULL,durum=3 WHERE id=?").run(c.id);
  const before=financial(db),rejected=await request(db,'/students/stu-closed','PATCH',{total_fee:1200});assert.equal(rejected.status,409);assert.equal(rejected.data.code,'CANCELLED_CONTRACT');assert.deepEqual(financial(db),before);
 });
 await check('missing or deleted current contract cannot silently save different student financial totals',async db=>{
  const c=await student(db,'missing-current');db.sql.prepare('UPDATE contracts SET is_deleted=1 WHERE id=?').run(c.id);
  const before=financial(db),rejected=await request(db,'/students/missing-current','PATCH',{total_fee:1200});assert.equal(rejected.status,409);assert.equal(rejected.data.code,'RECONCILIATION_REQUIRED');assert.deepEqual(financial(db),before);
  assert.equal((await request(db,'/students/missing-current','PATCH',{school:'Profile remains editable'})).status,200);
  assert.equal(row(db,'SELECT total_fee FROM students').total_fee,1000);
 });
}finally{Object.assign(console,logs);}
console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
