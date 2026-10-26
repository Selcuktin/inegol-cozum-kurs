// Real router/SQLite regressions. No production data, browser or external services.
import assert from 'node:assert/strict';
import {database,request,student,pay,row,rows} from './support/realRouter.mjs';
const original={...console};console.log=console.warn=console.error=()=>{};
const passed=[];
async function check(name,run){const db=database();try{await run(db);passed.push(name);}finally{db.sql.close();}}
const financial=db=>Object.fromEntries(['students','contracts','student_incomes','installments','payments'].map(t=>[t,rows(db,`SELECT * FROM ${t} ORDER BY id`)]));
try{
 for(const source of ['installments','income-id','income-number'])await check('imported '+source+' balance prevents deletion without requiring a reconstructed receipt',async db=>{
  const c=await student(db,'opening');
  if(source==='installments')db.sql.prepare('UPDATE installments SET paid_amount=25 WHERE contract_id=? AND installment_no=1').run(c.id);
  else db.sql.prepare(`UPDATE student_incomes SET toplam_tahsilat=25,kalan_alacak=975${source==='income-number'?",contract_id=''":''} WHERE contract_id=?`).run(c.id);
  const before=financial(db),response=await request(db,'/contracts/'+c.id,'DELETE');
  assert.equal(response.status,409);assert.equal(response.data.code,'PAYMENT_EXISTS');assert.deepEqual(financial(db),before);
 });
 await check('payment committed after delete precheck aborts the entire deletion transaction',async db=>{
  const c=await student(db,'delete-race'),batch=db.batch;let afterPayment;
  db.batch=async statements=>{db.batch=batch;await pay(db,c,25);afterPayment=financial(db);return batch.call(db,statements);};
  const response=await request(db,'/contracts/'+c.id,'DELETE');
  assert.equal(response.status,409);assert.deepEqual(financial(db),afterPayment);assert.equal(row(db,'SELECT is_deleted FROM contracts WHERE id=?',c.id).is_deleted,0);
 });
 await check('delete completed before payment prevents a late payment while retaining the original plan',async db=>{
  const c=await student(db,'payment-race'),batch=db.batch;let deleted;
  db.batch=async statements=>{db.batch=batch;assert.equal((await request(db,'/contracts/'+c.id,'DELETE')).status,200);deleted=financial(db);return batch.call(db,statements);};
  const response=await request(db,'/payments','POST',{id:'late-payment',student_id:c.student_id,contract_id:c.id,installment_no:1,amount:25});
  assert.equal(response.status,409);assert.deepEqual(financial(db),deleted);assert.equal(row(db,'SELECT COUNT(*) n FROM payments').n,0);
 });
 for(const is_deleted of [0,null])await check('number-only legacy income (deleted flag '+is_deleted+') cancels exactly the selected payment and preserves opening balance',async db=>{
  const c=await student(db,'legacy-income');
  db.sql.prepare("UPDATE student_incomes SET contract_id='',toplam_tahsilat=150,kalan_alacak=850,is_deleted=? WHERE contract_id=?").run(is_deleted,c.id);
  const p=await pay(db,c,25),other=await student(db,'other-contract');await pay(db,other,75);
  const unrelated=row(db,'SELECT * FROM student_incomes WHERE contract_id=?',other.id);
  const income=row(db,'SELECT * FROM student_incomes WHERE sozlesme_no=?',c.sozlesme_no),deleted={...income,id:'deleted-income',gelir_kodu:'DELETED-INCOME',contract_id:c.id,is_deleted:1,toplam_tahsilat:999};
  assert.equal(income.toplam_tahsilat,175);assert.equal(income.kalan_alacak,825);
  const keys=Object.keys(deleted);db.sql.prepare(`INSERT INTO student_incomes (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>deleted[k]));
  assert.equal((await request(db,'/payments/cancel','POST',{payment_id:p.id})).status,200);
  assert.equal(row(db,'SELECT toplam_tahsilat FROM student_incomes WHERE id=?',income.id).toplam_tahsilat,150);
  assert.equal(row(db,'SELECT kalan_alacak FROM student_incomes WHERE id=?',income.id).kalan_alacak,850);
  assert.equal(row(db,'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1',c.id).paid_amount,0);
  assert.deepEqual({...row(db,'SELECT * FROM student_incomes WHERE id=?',deleted.id)},deleted);
  assert.deepEqual(row(db,'SELECT * FROM student_incomes WHERE id=?',unrelated.id),unrelated);
  const after=financial(db);assert.equal((await request(db,'/payments/cancel','POST',{payment_id:p.id})).data.already_cancelled,true);assert.deepEqual(financial(db),after);
 });
 for(const amount of [1000.001,1e100,Number.MAX_SAFE_INTEGER])await check('unsupported money '+amount+' is rejected before creation or plan updates',async db=>{
  const c=await student(db,'money');const before=financial(db);
  const create=await request(db,'/contracts','POST',{student_name:'Invalid money',total_amount:amount});assert.equal(create.status,422);
  assert.equal((await request(db,'/contracts/'+c.id,'PATCH',{brutTutar:amount})).status,422);
  const inst=row(db,'SELECT * FROM installments WHERE contract_id=? AND installment_no=1',c.id);
  assert.equal((await request(db,'/contracts/'+c.id+'/installments','PUT',{installments:[{...inst,amount}]})).status,422);
  assert.deepEqual(financial(db),before);
 });
 await check('individually valid installment amounts cannot overflow the total money bound',async db=>{
  const c=await student(db,'total-limit'),before=financial(db);
  const installments=[1,2,3].map(n=>({installment_no:n,amount:40000000000000,due_date:'2026-11-15'}));
  assert.equal((await request(db,'/contracts/'+c.id+'/installments','PUT',{installments})).status,422);assert.deepEqual(financial(db),before);
 });
 await check('valid fractional lira remains exact in contract, income and installments',async db=>{
  const response=await request(db,'/contracts','POST',{student_name:'Valid money',total_amount:0.29,installment_count:2,due_date:'2026-11-15'});assert.equal(response.status,201);
  const c=row(db,'SELECT * FROM contracts WHERE id=?',response.data.id);
  assert.equal(c.brut_tutar,0.29);assert.equal(row(db,'SELECT brut_tutar FROM student_incomes WHERE contract_id=?',c.id).brut_tutar,0.29);
  assert.equal(Math.round(rows(db,'SELECT amount FROM installments WHERE contract_id=?',c.id).reduce((s,i)=>s+i.amount,0)*100),29);
 });
 for(const [id,legacyId] of [['stu-legacy','legacy'],['legacy','stu-legacy']])await check('contract financial editing resolves legacy student alias '+id,async db=>{
  const c=await student(db,id);db.sql.prepare('UPDATE contracts SET student_id=? WHERE id=?').run(legacyId,c.id);
  assert.equal((await request(db,'/contracts/'+c.id,'PATCH',{brutTutar:1200,taksitSayisi:3})).status,200);
  assert.equal(row(db,'SELECT total_fee FROM students WHERE id=?',id).total_fee,1200);assert.equal(row(db,'SELECT installment_count FROM students WHERE id=?',id).installment_count,3);
  const plan=rows(db,'SELECT * FROM installments WHERE contract_id=?',c.id).map(i=>({...i,amount:500,due_date:'2027-01-15'}));
  assert.equal((await request(db,'/contracts/'+c.id+'/installments','PUT',{installments:plan})).status,200);
  assert.equal(row(db,'SELECT total_fee FROM students WHERE id=?',id).total_fee,1500);assert.equal(row(db,'SELECT due_date FROM students WHERE id=?',id).due_date,'2027-01-15');
  assert.equal((await request(db,'/contracts','POST',{student_id:id,student_name:'Audit Student',total_amount:2000,installment_count:2,period_id:114,period_name:'2027-2028',due_date:'2027-09-15'})).status,201);
  const current=row(db,'SELECT * FROM students WHERE id=?',id);
  assert.equal((await request(db,'/contracts/'+c.id,'PATCH',{brutTutar:1800})).status,200);
  assert.equal((await request(db,'/contracts/'+c.id+'/installments','PUT',{installments:plan})).status,200);
  assert.deepEqual(row(db,'SELECT * FROM students WHERE id=?',id),current);
 });
 await check('an exact student ID wins over an ambiguous prefixed ID during both contract editing paths',async db=>{
  const c=await student(db,'ambiguous');await student(db,'stu-ambiguous',{total_fee:3000});
  db.sql.prepare('UPDATE students SET sozlesme_no=? WHERE id=?').run(c.sozlesme_no,'stu-ambiguous');
  const other=row(db,'SELECT * FROM students WHERE id=?','stu-ambiguous');
  assert.equal((await request(db,'/contracts/'+c.id,'PATCH',{brutTutar:1200})).status,200);
  assert.equal(row(db,'SELECT total_fee FROM students WHERE id=?','ambiguous').total_fee,1200);
  const plan=rows(db,'SELECT * FROM installments WHERE contract_id=?',c.id).map(i=>({...i,amount:700,due_date:'2027-01-15'}));
  assert.equal((await request(db,'/contracts/'+c.id+'/installments','PUT',{installments:plan})).status,200);
  assert.equal(row(db,'SELECT total_fee FROM students WHERE id=?','ambiguous').total_fee,1400);
  assert.deepEqual(row(db,'SELECT * FROM students WHERE id=?','stu-ambiguous'),other);
 });
 for(const is_deleted of [0,null])await check('financial edits link number-only legacy income and preserve deleted income history '+is_deleted,async db=>{
  const c=await student(db,'legacy-finance'),income=row(db,'SELECT * FROM student_incomes WHERE contract_id=?',c.id);
  const deleted={...income,id:'deleted-history',gelir_kodu:'DELETED-HISTORY',is_deleted:1};
  const keys=Object.keys(deleted);db.sql.prepare(`INSERT INTO student_incomes (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>deleted[k]));
  db.sql.prepare("UPDATE student_incomes SET contract_id='',is_deleted=? WHERE id=?").run(is_deleted,income.id);
  assert.equal((await request(db,'/contracts/'+c.id,'PATCH',{brutTutar:1200,taksitSayisi:3})).status,200);
  assert.equal(row(db,'SELECT income_id FROM installments WHERE contract_id=? AND installment_no=3',c.id).income_id,income.id);
  const plan=rows(db,'SELECT * FROM installments WHERE contract_id=?',c.id);plan.push({installment_no:4,amount:100,due_date:'2027-09-15'});
  assert.equal((await request(db,'/contracts/'+c.id+'/installments','PUT',{installments:plan})).status,200);
  assert.equal(row(db,'SELECT income_id FROM installments WHERE contract_id=? AND installment_no=4',c.id).income_id,income.id);
  assert.equal(row(db,'SELECT brut_tutar FROM student_incomes WHERE id=?',income.id).brut_tutar,1300);
  assert.deepEqual({...row(db,'SELECT * FROM student_incomes WHERE id=?',deleted.id)},deleted);
 });
 await check('anonymous contract replay does not create another student or reset an intervening payment',async db=>{
  const body={request_id:crypto.randomUUID(),student_name:'Anonymous retry',parent_name:'Parent',parent_phone:'Test phone',student_class:'8-A',student_no:'88',period_id:114,period_name:'2027-2028',total_amount:1000,installment_count:2,contract_date:'2026-10-26',due_date:'2026-11-15'};
  const first=await request(db,'/contracts','POST',body);assert.equal(first.status,201);const c=row(db,'SELECT * FROM contracts WHERE id=?',first.data.id);await pay(db,c,25);
  assert.deepEqual({...row(db,'SELECT parent_phone,student_class,student_no,program FROM students WHERE id=?',c.student_id)},{parent_phone:body.parent_phone,student_class:body.student_class,student_no:body.student_no,program:body.period_name});
  const before=financial(db),replay=await request(db,'/contracts','POST',body);assert.equal(replay.status,200);assert.equal(replay.data.id,first.data.id);assert.equal(replay.data.already_recorded,true);assert.deepEqual(financial(db),before);
  for(const patch of [{student_name:'Other'},{total_amount:1100},{parent_name:'Other'},{parent_phone:'Other'},{student_class:'7-A'},{student_no:'other'},{period_id:40},{contract_date:'2026-10-25'},{due_date:'2026-11-16'}]){const conflict=await request(db,'/contracts','POST',{...body,...patch});assert.equal(conflict.status,409,JSON.stringify(patch));assert.deepEqual(financial(db),before);}
 });
 await check('request IDs validate, cancelled/deleted requests cannot resurrect, and an existing student contract is explicit',async db=>{
  for(const request_id of ['',123,'not-uuid'])assert.equal((await request(db,'/contracts','POST',{request_id,student_name:'Invalid'})).status,422);
  const c=await student(db,'existing');
  const conflict=await request(db,'/contracts','POST',{request_id:crypto.randomUUID(),student_id:c.student_id,student_name:'Audit Student',total_amount:1000,installment_count:2});assert.equal(conflict.status,409);
  const body={request_id:crypto.randomUUID(),student_name:'Closed request',total_amount:1000,installment_count:2,due_date:'2026-11-15'};
  const response=await request(db,'/contracts','POST',body);assert.equal(response.status,201);assert.equal((await request(db,'/contracts/'+response.data.id+'/cancel','POST',{reason:'Closed for audit'})).status,200);
  const before=financial(db);assert.equal((await request(db,'/contracts','POST',body)).status,409);assert.deepEqual(financial(db),before);
 });
 await check('simultaneous anonymous retries create one contract, student and plan; the loser can safely retry',async db=>{
  const body={request_id:crypto.randomUUID(),student_name:'Concurrent retry',total_amount:1000,installment_count:2,due_date:'2026-11-15'};
  const responses=await Promise.all([request(db,'/contracts','POST',body),request(db,'/contracts','POST',body)]);
  assert(responses.every(r=>[200,201,409].includes(r.status)),JSON.stringify(responses));assert.equal(row(db,'SELECT COUNT(*) n FROM students').n,1);assert.equal(row(db,'SELECT COUNT(*) n FROM contracts').n,1);assert.equal(row(db,'SELECT COUNT(*) n FROM student_incomes').n,1);assert.equal(row(db,'SELECT COUNT(*) n FROM installments').n,2);
  const before=financial(db);assert.equal((await request(db,'/contracts','POST',body)).data.already_recorded,true);assert.deepEqual(financial(db),before);
 });
}finally{Object.assign(console,original);}
console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
