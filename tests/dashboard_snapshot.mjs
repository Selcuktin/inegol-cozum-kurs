// Local SQLite only: compare the reused snapshot with the original SQL financial semantics.
import assert from 'node:assert/strict';
import {database,rows} from './support/realRouter.mjs';
import {getDynamicAccountingSummary,handleAccountingRoutes} from '../frontend/functions/api/routes/accounting.js';
import {enrichStudent} from '../frontend/functions/api/utils.js';

const db=database(),plain=value=>JSON.parse(JSON.stringify(value));
const cents=value=>Math.round(Number(value)*100);
const moneyFields=new Set(['totalRevenue','totalCollected','totalRemaining','overdueAmount']);
const financial=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,moneyFields.has(k)?cents(v):v]));
const insert=(table,record)=>db.sql.prepare(`INSERT INTO ${table} (${Object.keys(record).join(',')}) VALUES (${Object.keys(record).map(()=>'?').join(',')})`).run(...Object.values(record));
async function parity(label){
  const expected=await getDynamicAccountingSummary(db,rows(db,'SELECT * FROM students').map(enrichStudent));
  const paid=rows(db,`SELECT c.id,COALESCE(
    (SELECT MAX(i.toplam_tahsilat) FROM student_incomes i WHERE (i.contract_id=c.id OR i.sozlesme_no=c.sozlesme_no) AND COALESCE(i.is_deleted,0)=0),
    (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.contract_id=c.id AND (p.is_cancelled=0 OR p.is_cancelled IS NULL))) AS calculated_paid
    FROM contracts c WHERE c.is_deleted=0 OR c.is_deleted IS NULL ORDER BY c.sozlesme_tarihi DESC`);
  const installments=rows(db,`SELECT i.*,c.sozlesme_no,c.student_name,c.durum AS contract_status,c.period_id,c.period_name FROM installments i JOIN contracts c ON c.id=i.contract_id WHERE COALESCE(c.is_deleted,0)=0 ORDER BY i.due_date,i.installment_no`);
  const before=plain(rows(db,'SELECT * FROM contracts').concat(rows(db,'SELECT * FROM installments'),rows(db,'SELECT * FROM student_incomes'),rows(db,'SELECT * FROM payments')));
  db.queries=0;
  const response=await handleAccountingRoutes({request:new Request('https://local.invalid/api/dashboard'),path:'/dashboard',db});
  assert.equal(response.status,200);assert.equal(db.queries,8,'One read per existing dashboard list, without repeated SQL aggregates');
  const result=await response.json();
  assert.deepEqual(financial(result.accounting),financial(expected),label+' summary');
  assert.deepEqual(result.contracts.map(c=>[c.id,cents(c.calculated_paid)]),paid.map(c=>[c.id,cents(c.calculated_paid)]),label+' paid totals');
  assert.deepEqual(result.installments,plain(installments),label+' complete enriched installments');
  assert.deepEqual(plain(rows(db,'SELECT * FROM contracts').concat(rows(db,'SELECT * FROM installments'),rows(db,'SELECT * FROM student_incomes'),rows(db,'SELECT * FROM payments'))),before,'Read must not alter financial history');
  assert(result.installments.every(i=>!Object.keys(i).some(k=>k.startsWith('__'))),'SQL-only helpers must not leak into the API');
}
try{
  await parity('empty');
  const states=[0,1,3,null],deletions=[0,null,1],dates=['01.01.2000','2000-01-02','2099-01-01','invalid','2026-02-30','2000-01-01T23:00:00-03:00'];
  for(let n=0;n<72;n++){
    insert('students',{id:'s'+n,student_name:'Synthetic '+n,parent_name:'Parent'});
    insert('contracts',{id:'c'+n,student_id:'s'+n,student_name:'Synthetic '+n,sozlesme_no:n%11===0?null:'N'+n,sozlesme_tarihi:'2026-10-19',durum:states[n%4],is_deleted:deletions[n%3],brut_tutar:n%13===0?null:1000.01+n});
    for(let p=0;p<3;p++)insert('payments',{id:`p${n}-${p}`,student_id:'s'+n,contract_id:'c'+n,amount:11.01+p,method:'Nakit',payment_date:'2026-10-19',is_cancelled:[0,null,1][p]});
    for(let k=0;k<dates.length;k++)insert('installments',{id:`i${n}-${k}`,contract_id:'c'+n,student_id:'s'+n,installment_no:k+1,total_installments:dates.length,amount:100.01+k,paid_amount:k%3===0?null:k%3===1?25.01:300,due_date:dates[k]});
    if(n%7!==0)insert('student_incomes',{id:'g'+n,student_id:'s'+n,student_name:'Synthetic '+n,title:'Imported opening balance',contract_id:n%2===0?'c'+n:null,sozlesme_no:'N'+(n%5===0?n-1:n),toplam_tahsilat:n%9===0?null:n%2===0?0:200.05+n,kalan_alacak:700.05-n,durum:[1,4,null][n%3],is_deleted:deletions[n%3],gelir_tarihi:'2026-10-19',vade_tarihi:'2026-11-19'});
  }
  // Contradictory legacy links apply to both contracts through the SQL OR; they must never be added twice.
  insert('student_incomes',{id:'cross-link',student_id:'s1',student_name:'Synthetic',title:'Legacy links',contract_id:'c1',sozlesme_no:'N5',toplam_tahsilat:500.05,durum:1,is_deleted:0,gelir_tarihi:'2026-10-19',vade_tarihi:'2026-11-19'});
  insert('installments',{id:'orphan',contract_id:'missing',student_id:'missing',installment_no:1,total_installments:1,amount:100,paid_amount:0,due_date:'01.01.2000'});
  await parity('cancelled/deleted/NULL, legacy OR links, opening balances and date formats');
  db.sql.exec("DELETE FROM student_incomes; UPDATE payments SET amount=-5.05 WHERE is_cancelled=0 OR is_cancelled IS NULL; UPDATE contracts SET durum=1,is_deleted=0; UPDATE installments SET paid_amount=NULL");
  await parity('payment fallback, NULL gross and NULL installment arithmetic');
  console.log(JSON.stringify({passed:3,dashboardQueries:8,financialParity:true,dataUnchanged:true}));
}finally{db.sql.close();}
