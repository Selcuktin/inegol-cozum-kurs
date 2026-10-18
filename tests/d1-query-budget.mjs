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
import {handleAccountingRoutes} from '../frontend/functions/api/routes/accounting.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const cli=process.argv[2]||process.env.PATH.split(path.delimiter)
  .map(dir=>path.resolve(dir,'../wrangler/bin/wrangler.js')).find(existsSync);
assert(cli,'Run with npm exec --yes --package=wrangler@4.151.1 -- node tests/d1-query-budget.mjs');
const {getPlatformProxy}=createRequire(cli)('wrangler');
const folder=await mkdtemp(path.join(tmpdir(),'cozum-d1-budget-'));
const config=path.join(folder,'wrangler.json');
const run=promisify(execFile);
const queries=[];
await handleAccountingRoutes({
  request:new Request('https://local.invalid/api/dashboard'),path:'/dashboard',
  db:{prepare(sql){return {sql};},async batch(statements){queries.push(...statements.map(s=>s.sql));return statements.map(()=>({results:[]}));}},
});
const financial=queries.filter(sql=>sql.includes('SELECT MAX(i.toplam_tahsilat)'));
assert.equal(financial.length,2);
async function execute(sql){
  const file=path.join(folder,'execute.sql');await writeFile(file,sql);
  const {stdout}=await run(process.execPath,[cli,'d1','execute','DB','--local','--config',config,'--persist-to',path.join(folder,'state'),'--file',file,'--json'],{
    cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:8*1024*1024,
  });
  return JSON.parse(stdout);
}
async function probe(){
  const proxy=await getPlatformProxy({configPath:config,persist:{path:path.join(folder,'state','v3')},remoteBindings:false,envFiles:[]});
  try{return await proxy.env.DB.batch(financial.map(sql=>proxy.env.DB.prepare(sql)));}
  finally{await proxy.dispose();}
}
try{
  await writeFile(config,JSON.stringify({name:'cozum-local-read-budget',compatibility_date:'2026-10-12',
    d1_databases:[{binding:'DB',database_name:'local-fixture',database_id:'00000000-0000-0000-0000-000000000001'}]}));
  let fixture=await readFile(path.join(root,'frontend/schema.sql'),'utf8');
  fixture+='\nDROP INDEX idx_student_incomes_contract_id;\nDROP INDEX idx_student_incomes_sozlesme_no;\n';
  for(let n=0;n<133;n++){
    fixture+=`INSERT INTO contracts(id,student_id,sozlesme_no,student_name,brut_tutar,durum,is_deleted,sozlesme_tarihi) VALUES('c${n}','s${n}','N${n}','Synthetic ${n}',1000,${n===0?3:1},0,'2026-10-17');\n`;
    fixture+=`INSERT INTO student_incomes(id,contract_id,sozlesme_no,student_id,brut_tutar,toplam_tahsilat,durum,is_deleted,student_name,title,gelir_tarihi,vade_tarihi) VALUES('i${n}',${n%2?"'c"+n+"'":'NULL'},'N${n}','s${n}',1000,${100+n},${n===1?4:1},${n===2?1:0},'Synthetic','Fixture','2026-10-17','2026-11-17');\n`;
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
  console.log(JSON.stringify({localOnly:true,fixtureContracts:133,beforeRowsRead:reads(before),afterRowsRead:reads(after),financialParity:true,migrationReplay:true}));
}finally{
  assert(path.resolve(folder).startsWith(path.resolve(tmpdir())+path.sep+'cozum-d1-budget-'));
  await rm(folder,{recursive:true,force:true});
}
