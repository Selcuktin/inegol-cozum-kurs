// Synthetic fixtures only. Executes the actual route queries on local Wrangler D1.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {getDynamicAccountingSummary,handleAccountingRoutes} from '../frontend/functions/api/routes/accounting.js';
import {handleContractsRoutes} from '../frontend/functions/api/routes/contracts.js';
import {handleLgsRoutes} from '../frontend/functions/api/routes/lgs.js';
import {extractStudents,defaultMapping} from '../frontend/functions/api/lgs/scoring.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const cli=process.argv[2]||process.env.PATH.split(path.delimiter)
  .map(dir=>path.resolve(dir,'../wrangler/bin/wrangler.js')).find(existsSync);
assert(cli,'Run with npm exec --yes --package=wrangler@4.151.1 -- node tests/d1-query-budget.mjs');
const {getPlatformProxy}=createRequire(cli)('wrangler');
const folder=await mkdtemp(path.join(tmpdir(),'cozum-d1-budget-'));
const config=path.join(folder,'wrangler.json');
const run=promisify(execFile);
const queries=[];
const captureDb={prepare(sql){return {sql};},async batch(statements){queries.push(...statements.map(s=>s.sql));return statements.map(()=>({results:[]}));}};
await getDynamicAccountingSummary(captureDb);
const summaryQueries=queries.splice(0);
await handleAccountingRoutes({
  request:new Request('https://local.invalid/api/dashboard'),path:'/dashboard',
  db:captureDb,
});
const legacyContractPaid=`SELECT c.*,COALESCE((SELECT MAX(i.toplam_tahsilat) FROM student_incomes i WHERE (i.contract_id=c.id OR i.sozlesme_no=c.sozlesme_no) AND COALESCE(i.is_deleted,0)=0),(SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.contract_id=c.id AND (p.is_cancelled=0 OR p.is_cancelled IS NULL))) AS calculated_paid FROM contracts c WHERE c.is_deleted=0 OR c.is_deleted IS NULL ORDER BY c.sozlesme_tarihi DESC`;
const legacyInstallments="SELECT i.*,c.sozlesme_no,c.student_name,c.durum AS contract_status,c.period_id,c.period_name FROM installments i JOIN contracts c ON c.id=i.contract_id WHERE COALESCE(c.is_deleted,0)=0 ORDER BY i.due_date,i.installment_no";
const legacyDashboard=[...queries.map(sql=>sql.startsWith('SELECT * FROM contracts ')?legacyContractPaid:sql.includes(' AS __overdue,')?legacyInstallments:sql),...summaryQueries];
assert.equal(queries.length,8);assert.equal(legacyDashboard.length,13);
const financial=[summaryQueries[0],legacyContractPaid];
assert.equal(financial.length,2);
const overdue=[...new Set(summaryQueries.filter(sql=>sql.includes('SELECT COUNT(*) as cnt, COALESCE(SUM(amount - paid_amount)')))];
assert.equal(overdue.length,1);
let contractQuery;
await handleContractsRoutes({
  request:new Request('https://local.invalid/api/contracts'),path:'/contracts',url:new URL('https://local.invalid/api/contracts'),
  db:{prepare(sql){const statement={bind(){return statement;},async all(){contractQuery=sql;return {results:[]};}};return statement;}},
});
assert(contractQuery?.includes("REPLACE(s.id, 'stu-', '')"));
// TEXT affinity makes the expression index usable; REPLACE already returns TEXT.
const oldContractQuery=contractQuery.replace("CAST(REPLACE(s.id, 'stu-', '') AS TEXT)","REPLACE(s.id, 'stu-', '')");
async function execute(sql){
  const file=path.join(folder,'execute.sql');await writeFile(file,sql);
  const {stdout}=await run(process.execPath,[cli,'d1','execute','DB','--local','--config',config,'--persist-to',path.join(folder,'state'),'--file',file,'--json'],{
    cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:8*1024*1024,
  });
  return JSON.parse(stdout);
}
async function probe(statements=financial){
  const proxy=await getPlatformProxy({configPath:config,persist:{path:path.join(folder,'state','v3')},remoteBindings:false,envFiles:[]});
  try{return await proxy.env.DB.batch(statements.map(sql=>proxy.env.DB.prepare(sql)));}
  finally{await proxy.dispose();}
}
try{
  await writeFile(config,JSON.stringify({name:'cozum-local-read-budget',compatibility_date:'2026-10-12',
    d1_databases:[{binding:'DB',database_name:'local-fixture',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:path.join(root,'frontend/migrations')}]}));
  let fixture=await readFile(path.join(root,'frontend/schema.sql'),'utf8');
  fixture+='\nDROP INDEX idx_student_incomes_contract_id;\nDROP INDEX idx_student_incomes_sozlesme_no;\nDROP INDEX idx_installments_due_normalized;\nDROP INDEX idx_students_legacy_id;\n';
  for(let n=0;n<133;n++){
    fixture+=`INSERT INTO students(id,student_name,parent_name) VALUES('${n%3===0?'stu-':''}s${n}','Synthetic ${n}','Parent');\n`;
    fixture+=`INSERT INTO contracts(id,student_id,sozlesme_no,student_name,brut_tutar,durum,is_deleted,sozlesme_tarihi) VALUES('c${n}','s${n}','N${n}','Synthetic ${n}',1000,${n===0?3:1},0,'2026-10-17');\n`;
    fixture+=`INSERT INTO student_incomes(id,contract_id,sozlesme_no,student_id,brut_tutar,toplam_tahsilat,durum,is_deleted,student_name,title,gelir_tarihi,vade_tarihi) VALUES('i${n}',${n%2?"'c"+n+"'":'NULL'},'N${n}','s${n}',1000,${100+n},${n===1?4:1},${n===2?1:0},'Synthetic','Fixture','2026-10-17','2026-11-17');\n`;
    for(let k=0;k<10;k++){
      const due=k===0?'01.01.2000':k===1?'2000-01-02':k===2?'invalid':'2099-01-01';
      const amount=[100.01,200.10,123.45][n%3];
      fixture+=`INSERT INTO installments(id,contract_id,student_id,installment_no,total_installments,due_date,amount,paid_amount) VALUES('inst${n}_${k}','c${n}','s${n}',${k+1},10,'${due}',${amount},${n%5===0?amount:n%7===0?'NULL':25.05});\n`;
    }
  }
  await execute(fixture);
  const before=await probe();
  await execute(await readFile(path.join(root,'frontend/migrations/0002_add_relational_indexes.sql'),'utf8'));
  const after=await probe();
  assert.deepEqual(after.map(r=>r.results),before.map(r=>r.results),'Financial output must remain identical');
  const reads=responses=>responses.reduce((sum,r)=>sum+r.meta.rows_read,0);
  assert(Number.isFinite(reads(before))&&Number.isFinite(reads(after)),'workerd must expose rows_read');
  assert(reads(after)<reads(before),'Existing lookup indexes must reduce actual D1 rows_read');
  const beforeReplay=reads(after);
  await execute(await readFile(path.join(root,'frontend/migrations/0002_add_relational_indexes.sql'),'utf8'));
  const replay=await probe();assert.equal(reads(replay),beforeReplay);
  const overdueBefore=await probe(overdue);
  const contractsBefore=await probe([oldContractQuery]);
  const overdueIndex=await readFile(path.join(root,'frontend/migrations/0008_read_efficiency_indexes.sql'),'utf8');
  await execute(overdueIndex);
  const overdueAfter=await probe(overdue);
  // SQLite SUM(REAL) can differ below one kurus when an index changes visit order.
  const moneyResults=rs=>rs.map(r=>r.results.map(row=>({...row,amt:Math.round(row.amt*100)})));
  assert.deepEqual(moneyResults(overdueAfter),moneyResults(overdueBefore),'Legacy dates, NULL paid amounts, fractional money and cancelled contracts must retain their totals in kurus');
  assert(reads(overdueAfter)<reads(overdueBefore)/2,`The overdue index must avoid scanning future installments: ${JSON.stringify({before:reads(overdueBefore),after:reads(overdueAfter)})}`);
  const contractsAfter=await probe([contractQuery]);
  assert.deepEqual(contractsAfter.map(r=>r.results),contractsBefore.map(r=>r.results),'Legacy and current student links must retain identical contract output');
  assert(reads(contractsAfter)<reads(contractsBefore)/2,'Legacy ID lookup must avoid one student-table scan per contract');
  await execute(overdueIndex);
  assert.equal(reads(await probe(overdue)),reads(overdueAfter),'Overdue migration must be replay safe');
  assert.equal(reads(await probe([contractQuery])),reads(contractsAfter));
  const dashboardBefore=await probe(legacyDashboard),dashboardAfter=await probe(queries);
  assert(reads(dashboardAfter)<reads(dashboardBefore)/2,'Reusing the same batch must remove aggregate and installment join rereads');
  const proxy=await getPlatformProxy({configPath:config,persist:{path:path.join(folder,'state','v3')},remoteBindings:false,envFiles:[]});
  let scanned=0;const record=r=>{scanned+=r.meta.rows_read||0;return r;};
  const instrument=stmt=>({bind(...args){return instrument(stmt.bind(...args));},async all(){return record(await stmt.all());},async first(){return record(await stmt.all()).results[0]||null;},async run(){return record(await stmt.run());},raw:stmt});
  const db={prepare:q=>instrument(proxy.env.DB.prepare(q)),async batch(stmts){return (await proxy.env.DB.batch(stmts.map(s=>s.raw))).map(record);}};
  const lgs={};
  try{
    const tpl=JSON.parse((await db.prepare("SELECT document FROM lgs_templates WHERE id='pronet-lgs'").first()).document),type=JSON.parse((await db.prepare("SELECT document FROM lgs_exam_types WHERE id='lgs-2026'").first()).document),raw=await readFile(path.join(root,'frontend/public/ornek-lgs-verisi.txt'),'utf8'),mapping=defaultMapping(tpl.fields,type.subjects),key=extractStudents(raw,tpl.fields).find(r=>r.is_key),id=crypto.randomUUID();
    const payload={request_id:id,name:'Local D1 only',date:'2026-10-19',template_id:tpl.id,exam_type_id:type.id,penalty:3,mapping,answer_keys:{A:Object.fromEntries(type.subjects.map(s=>[s.key,key.answers[mapping[s.key].field_index].slice(0,s.question_count)]))},booklet_maps:{},raw_text:Array(2000).fill(raw.split('\n')[0]).join('\n')};
    const call=async(path,body)=>{const url=new URL('https://local.invalid/api'+path);return handleLgsRoutes({path,url,db,user:{role:'admin'},request:new Request(url,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})})});};
    scanned=0;const created=await call('/lgs/exams',payload);assert.equal(created.status,201);lgs.importRowsRead=scanned;
    scanned=0;const bundle=await (await call(`/lgs/exams/${id}/bundle`)).json();lgs.bundleRowsRead=scanned;assert.equal(bundle.results.length,2000);assert(scanned<=2050,'Result bundle must use an indexed exam lookup without N+1');
    scanned=0;await call(`/lgs/results/${bundle.results[0].id}/share`);lgs.contactRowsRead=scanned;assert(scanned<=10,'Contact lookup must remain indexed');
  }finally{await proxy.dispose();}
  // Simulate the existing pre-metadata database. The tracked baseline prevents replaying legacy data migrations.
  const beforeMigrationContracts=(await execute('SELECT COUNT(*) n FROM contracts'))[0].results[0].n;
  await execute("ALTER TABLE system_backups DROP COLUMN size_bytes; ALTER TABLE system_backups DROP COLUMN sha256; ALTER TABLE system_backups DROP COLUMN storage; CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);"+Array.from({length:7},(_,i)=>`INSERT INTO d1_migrations(name) VALUES('${['0001_initial_schema.sql','0002_add_relational_indexes.sql','0003_safe_missing_tables_and_exam_keys.sql','0004_preserve_paid_amount_and_schedule_conflicts.sql','0005_normalize_unambiguous_installment_references.sql','0006_persist_income_notes.sql','0007_lgs_analysis.sql'][i]}');`).join(''));
  for(let replay=0;replay<2;replay++)await run(process.execPath,[cli,'d1','migrations','apply','DB','--local','--config',config,'--persist-to',path.join(folder,'state')],{cwd:root,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2*1024*1024});
  const checked=await execute('SELECT COUNT(*) AS n FROM d1_migrations; SELECT COUNT(*) AS n FROM contracts; PRAGMA table_info(system_backups);');
  assert.equal(checked[0].results[0].n,10);assert.equal(checked[1].results[0].n,beforeMigrationContracts);assert(checked[2].results.some(c=>c.name==='sha256'));
  console.log(JSON.stringify({localOnly:true,fixtureContracts:133,beforeRowsRead:reads(before),afterRowsRead:reads(after),overdueBeforeRowsRead:reads(overdueBefore),overdueAfterRowsRead:reads(overdueAfter),contractsBeforeRowsRead:reads(contractsBefore),contractsAfterRowsRead:reads(contractsAfter),dashboardBeforeRowsRead:reads(dashboardBefore),dashboardAfterRowsRead:reads(dashboardAfter),lgs2000:lgs,financialParity:true,migrationReplay:true,trackedMigrationReplay:true}));
}finally{
  assert(path.resolve(folder).startsWith(path.resolve(tmpdir())+path.sep+'cozum-d1-budget-'));
  await rm(folder,{recursive:true,force:true});
}
