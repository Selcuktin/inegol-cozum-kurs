import {pdfText} from "./support/pdf.mjs";
// Run: node tests/admin_workflows.mjs. Isolated SQLite; no production writes or external providers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,request,student,pay,row,rows} from './support/realRouter.mjs';
const results=[];
const original={...console};console.log=console.warn=console.error=()=>{};
async function check(name,run){const db=database();try{const evidence=await run(db);results.push({name,passed:true,evidence});}catch(error){results.push({name,passed:false,error:error.stack});}finally{db.sql.close();}}
const cents=n=>Math.round(Number(n)*100);
const expense={id:'expense-retry',title:'Test invoice',amount:123.45,expense_date:'2026-10-17',category:'Kira',account:'Test Bank'};
function csv(text){const records=[];let record=[],cell='',quoted=false;for(let n=0;n<text.length;n++){const c=text[n];if(c==='"'){if(quoted&&text[n+1]==='"'){cell+='"';n++;}else quoted=!quoted;}else if(!quoted&&(c===';'||c==='\n')){record.push(cell.replace(/^\uFEFF/,''));cell='';if(c==='\n'){records.push(record);record=[];}}else if(c!=='\r'||quoted)cell+=c;}if(cell||record.length)records.push([...record,cell]);return records;}
function pdfIntegrity(pdf){assert(pdf.startsWith('%PDF-1.4'));const offset=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(offset,offset+4),'xref');const xref=pdf.slice(offset).split('\n');for(let n=3;n<xref.length&&/^\d{10} 00000 n/.test(xref[n]);n++){const at=Number(xref[n].slice(0,10));assert(pdf.slice(at).startsWith(`${n-2} 0 obj\n`));}for(const match of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g))assert.equal(Buffer.byteLength(match[2]),Number(match[1]));}

await check('expense response lost after commit: retry, dashboard, CSV and monthly PDF agree',async db=>{
  assert.equal((await request(db,'/expenses','POST',expense)).status,201); // Simulate the response being lost.
  const retry=await request(db,'/expenses','POST',expense);assert.equal(retry.status,200);assert.equal(retry.data.already_recorded,true);
  assert.equal(row(db,'SELECT COUNT(*) n FROM expenses').n,1);
  assert.equal((await request(db,'/dashboard')).data.summary.expenses,123.45);
  const exported=csv((await request(db,'/export/expenses')).data);assert.equal(exported.filter(r=>r[1]==='Test invoice').length,1);
  const pdf=(await request(db,'/reports/monthly?month=2026-10')).data;assert(pdfText(pdf).includes('Toplam Giderler: 123,45 TL'));pdfIntegrity(pdf);
});
for(const [key,value] of Object.entries({title:'Different',amount:100,expense_date:'2026-10-18',category:'Different',account:'Different'}))await check(`expense retry rejects changed ${key} without overwriting the first record`,async db=>{
  await request(db,'/expenses','POST',expense);const before=rows(db,'SELECT * FROM expenses');
  assert.equal((await request(db,'/expenses','POST',{...expense,[key]:value})).status,409);assert.deepEqual(rows(db,'SELECT * FROM expenses'),before);
});
for(const identical of [true,false])await check(`concurrent ${identical?'identical':'conflicting'} expense submissions produce one financial entry`,async db=>{
  const responses=await Promise.all([request(db,'/expenses','POST',expense),request(db,'/expenses','POST',{...expense,amount:identical?expense.amount:200})]);
  assert(responses.every(r=>[200,201,409].includes(r.status)),JSON.stringify(responses));assert.equal(row(db,'SELECT COUNT(*) n FROM expenses').n,1);
  if(!identical)assert(responses.some(r=>r.status===409));assert.equal(row(db,'SELECT amount FROM expenses').amount,123.45);
});
for(const patch of [{amount:0},{amount:-1},{amount:1.001},{expense_date:'2026-02-30'},{expense_date:'not-a-date'},{id:99}])await check('invalid expense is rejected atomically '+JSON.stringify(patch),async db=>{
  assert.equal((await request(db,'/expenses','POST',{...expense,...patch})).status,422);assert.equal(row(db,'SELECT COUNT(*) n FROM expenses').n,0);
});
await check('payment response lost and replayed after another collection retains exactly one receipt',async db=>{
  const c=await student(db);const body={id:'pay-lost',student_id:c.student_id,contract_id:c.id,installment_no:1,amount:123.45,payment_date:'2026-10-17'};
  assert.equal((await request(db,'/payments','POST',body)).status,201);await pay(db,c,50);
  const retry=await request(db,'/payments','POST',body);assert.equal(retry.status,200);
  assert.equal(row(db,'SELECT COUNT(*) n FROM payments').n,2);assert.equal(cents(row(db,'SELECT SUM(amount) n FROM payments').n),17345);
  assert.equal(cents(row(db,'SELECT paid_amount FROM installments WHERE installment_no=1').paid_amount),17345);
  assert.equal((await request(db,'/payments','POST',{...body,amount:124})).status,409);
});
await check('new period contract preserves the old plan, receipts and current balance isolation',async db=>{
  const old=await student(db,'period-student',{program:'2025-2026',total_fee:1000});await pay(db,old,125);
  const history=rows(db,'SELECT * FROM installments WHERE contract_id=?',old.id);const receipts=rows(db,'SELECT * FROM payments');
  const created=await request(db,'/contracts','POST',{student_id:old.student_id,student_name:'Audit Student',period_id:113,period_name:'2026-2027',total_amount:2000,installment_count:4});
  assert.equal(created.status,201,JSON.stringify(created));const current=row(db,'SELECT * FROM contracts WHERE student_id=? AND period_id=113',old.student_id);assert(current);
  assert.deepEqual(rows(db,'SELECT * FROM installments WHERE contract_id=?',old.id),history);assert.deepEqual(rows(db,'SELECT * FROM payments'),receipts);
  assert.equal(row(db,'SELECT paid_amount FROM students').paid_amount,0);
  assert.equal(row(db,'SELECT program FROM students').program,'2026-2027');
  assert.equal((await request(db,'/students?period=2026-2027')).data.total,1);
  assert.equal((await request(db,'/students?period=2025-2026')).data.total,0);
  const first=rows(db,'SELECT * FROM installments WHERE contract_id=? ORDER BY installment_no',current.id)[0];
  await request(db,'/payments','POST',{id:'new-period-receipt',contract_id:current.id,student_id:old.student_id,installment_id:first.id,amount:250});
  assert.equal((await request(db,'/contracts/'+old.id+'/cancel','POST',{reason:'Old period closed'})).status,200);
  assert.equal(row(db,'SELECT paid_amount FROM students').paid_amount,250);
  const dash=(await request(db,'/dashboard')).data;assert.equal(dash.accounting.totalRevenue,2000);assert.equal(dash.accounting.totalRemaining,1750);assert.equal(dash.accounting.totalCollected,375);
  const exportRows=csv((await request(db,'/export/students')).data);assert.equal(exportRows[2][7],'2000');assert.equal(exportRows[2][8],'250');assert.equal(exportRows[2][9],'1750');
  return {contracts:2,historical_receipts_preserved:true};
});
await check('cancelled contract debt is zero in exports while cash history remains recorded',async db=>{
  const c=await student(db);await pay(db,c,100);await request(db,'/contracts/'+c.id+'/cancel','POST',{reason:'Cancellation with retained cash'});
  const exported=csv((await request(db,'/export/students')).data);assert.equal(exported[2][9],'0');assert.equal(exported[2][8],'100');
  assert.equal((await request(db,'/dashboard')).data.accounting.totalRemaining,0);assert.equal(row(db,'SELECT SUM(amount) n FROM payments WHERE is_cancelled=0').n,100);
  assert.equal((await request(db,'/payments/cancel','POST',{payment_id:row(db,'SELECT id FROM payments').id})).status,409);
});
await check('cancelled payment cannot be sent as a valid receipt even with a configured provider',async db=>{
  const c=await student(db);const p=await pay(db,c,100);await request(db,'/payments/cancel','POST',{payment_id:p.id});let sent=0;
  const r=await request(db,'/payments/'+p.id+'/send-receipt-email','POST',{email:'test@example.test'},{env:{EMAIL:{async send(){sent++;}}}});
  assert.equal(r.status,409);assert.equal(sent,0);
});
await check('student export uses gross fee with extras and discount rather than base fee',async db=>{
  await student(db,'gross-fee',{total_fee:1000,extra_fees:{books:250},discount_amount:100});
  const exported=csv((await request(db,'/export/students')).data);assert.equal(exported[2][7],'1150');assert.equal(exported[2][9],'1150');
});
for(const month of ['2026','2026-00','2026-13','2026-1','bad','2026-10-01'])await check('invalid report month '+month,async db=>{
  assert.equal((await request(db,'/reports/monthly?month='+encodeURIComponent(month))).status,422);
});
await check('multi-page PDF contains every receipt and expense, exact cents, escaped literals and valid offsets',async db=>{
  const c=await student(db);const insert=db.sql.prepare("INSERT INTO payments(id,student_id,contract_id,amount,payment_date,method,is_cancelled) VALUES(?,?,?,?,?,?,?)");
  for(let n=0;n<125;n++)insert.run('receipt-'+n,c.student_id,c.id,2.35,'2026-10-17','Nakit (Test) \\ branch',0);
  insert.run('cancelled',c.student_id,c.id,99999,'2026-10-17','Nakit',1);insert.run('other-month',c.student_id,c.id,99999,'2026-09-17','Nakit',0);
  for(let n=0;n<70;n++)db.sql.prepare('INSERT INTO expenses(id,title,amount,expense_date) VALUES(?,?,?,?)').run('exp-'+n,'Invoice '+n,1.23,'2026-10-17');
  const result=await request(db,'/reports/monthly?month=2026-10');assert.equal(result.status,200);const pdf=result.data;
  pdfIntegrity(pdf);assert(pdfText(pdf).includes('Toplam Tahsilat: 293,75 TL'));assert(pdfText(pdf).includes('Toplam Giderler: 86,10 TL'));
  assert.equal((pdfText(pdf).match(/Nakit \(Test\)/g)||[]).length,125);assert(pdfText(pdf).includes('Invoice 69'));assert(Number(pdf.match(/\/Count (\d+)/)[1])>1);
  assert(!pdf.includes('99,999'));return {receipts:125,expenses:70,pages:Number(pdf.match(/\/Count (\d+)/)[1])};
});
await check('large student lists paginate without missing or duplicate IDs and full export has no 1000-row truncation',async db=>{
  const insert=db.sql.prepare("INSERT INTO students(id,student_name,program,total_fee,paid_amount,created_at,parent_name) VALUES(?,?,?,?,?,?,'Test Parent')");
  for(let n=0;n<1205;n++)insert.run('large-'+String(n).padStart(4,'0'),'Student '+n,'2026-2027',100,0,'2026-10-17 00:00:00');
  const ids=[];for(let page=1;page<=49;page++){const r=await request(db,`/students?limit=25&page=${page}`);assert.equal(r.status,200);assert.equal(r.data.total,1205);ids.push(...r.data.items.map(s=>s.id));}
  assert.equal(ids.length,1205);assert.equal(new Set(ids).size,1205);
  const exported=csv((await request(db,'/export/students')).data);assert.equal(exported.filter(r=>r[0].startsWith('Student ')).length,1205);
  const filtered=await request(db,'/students?search=Student%201204');assert.equal(filtered.data.items.length,1);
  return {students:1205,pages:49};
});
for(const query of ['page=0','page=-1','page=1.5','page=no','limit=-1','limit=0','limit=1001','limit=2.5'])await check('invalid student pagination '+query,async db=>{
  assert.equal((await request(db,'/students?'+query)).status,422);
});
await check('single-kind CSV only reads requested domain; complete CSV remains the exact concatenation',async db=>{
  const c=await student(db,'export-scope');await pay(db,c,12.34);await request(db,'/expenses','POST',expense);
  const prepare=db.prepare,seen=[];db.prepare=query=>{seen.push(query);return prepare(query);};
  const parts=[];
  for(const kind of ['students','payments','expenses','audit']){
    seen.length=0;const r=await request(db,'/export/'+kind);assert.equal(r.status,200);parts.push(r.data.replace(/^\uFEFF/,''));
    const reads=seen.filter(q=>/FROM (?:students s|payments p|expenses|audit_logs)\b/.test(q));
    assert.equal(reads.length,1,JSON.stringify({kind,reads}));assert(reads[0].includes('FROM '+kind));
  }
  const all=await request(db,'/export/all');assert.equal(all.status,200);assert.equal(all.data.replace(/^\uFEFF/,''),parts.join(''));
});
await check('CSV quotes separators, line breaks and formula prefixes; unknown kinds fail and accountant export excludes audit',async db=>{
  const name=' =HYPERLINK("example");\nİpek';await student(db,'csv',{student_name:name});
  const exported=csv((await request(db,'/export/students')).data);assert.equal(exported[2][0],"'"+name.trim());assert.equal(exported[2].length,12);
  assert.equal((await request(db,'/export/unknown')).status,404);
  db.sql.exec("INSERT INTO user_sessions(session_token,user_id,expires_at) VALUES('accountant-export','user_accounting','2099-01-01')");
  const accountant=await request(db,'/export/all','GET',undefined,{headers:{Authorization:'Bearer accountant-export'}});assert.equal(accountant.status,200);assert(!accountant.data.includes('DENETİM KAYITLARI'));
});

Object.assign(console,original);
const summary={tested_at:new Date().toISOString(),passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
fs.mkdirSync('test_reports',{recursive:true});fs.writeFileSync('test_reports/fix_admin_workflows.json',JSON.stringify(summary,null,2));
for(const r of results)if(!r.passed)console.error(r.name,r.error);console.log(JSON.stringify({...summary,results:undefined}));process.exitCode=summary.failed?1:0;
