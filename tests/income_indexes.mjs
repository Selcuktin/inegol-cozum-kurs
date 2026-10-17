// Run: node tests/income_indexes.mjs. Local SQLite only; execute the real dashboard SQL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAccountingRoutes} from '../frontend/functions/api/routes/accounting.js';

const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../frontend/schema.sql',import.meta.url),'utf8'));
const migration=readFileSync(new URL('../frontend/migrations/0002_add_relational_indexes.sql',import.meta.url),'utf8');
const indexes=migration.split('\n').filter(line=>/^CREATE INDEX.*idx_student_incomes_(contract_id|sozlesme_no) /.test(line));
assert.equal(indexes.length,2);
for(const name of ['idx_student_incomes_contract_id','idx_student_incomes_sozlesme_no']){
  assert(sql.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").get(name),'New databases need the same indexes');
  sql.exec(`DROP INDEX ${name}`);
}
// Include both-key and legacy number-only matches and cancelled/deleted income records.
for(let n=0;n<133;n++){
  sql.prepare("INSERT INTO contracts(id,student_id,sozlesme_no,student_name,brut_tutar,durum,is_deleted,sozlesme_tarihi) VALUES(?,?,?,?,?,?,?,'2026-10-17')").run('c'+n,'s'+n,'N'+n,'Anonymous '+n,1000,n===0?3:1,0);
  sql.prepare("INSERT INTO student_incomes(id,contract_id,sozlesme_no,student_id,brut_tutar,toplam_tahsilat,durum,is_deleted,student_name,title,gelir_tarihi,vade_tarihi) VALUES(?,?,?,?,?,?,?,?,'Anonymous','Test','2026-10-17','2026-11-17')").run('g'+n,n%2?'c'+n:null,'N'+n,'s'+n,1000,100+n,n===1?4:1,n===2?1:0);
}
const queries=[];
const db={prepare(query){const execute=()=>{const rows=sql.prepare(query).all();queries.push(query);return{results:rows};};return{execute};},async batch(statements){return statements.map(s=>s.execute());}};
async function dashboard(){const response=await handleAccountingRoutes({request:new Request('https://local.invalid/api/dashboard'),db,path:'/dashboard'});assert.equal(response.status,200);return response.json();}
const before=await dashboard();
sql.exec(indexes.join('\n'));sql.exec(indexes.join('\n')); // Repeat deployment must be harmless.
const after=await dashboard();assert.deepEqual(after,before,'Indexes must not change financial output');
const totalsQueries=[...new Set(queries)].filter(q=>q.includes('SELECT MAX(i.toplam_tahsilat)'));
assert.equal(totalsQueries.length,2);
for(const query of totalsQueries){
  const plan=sql.prepare('EXPLAIN QUERY PLAN '+query).all().map(row=>row.detail).join('\n');
  assert(plan.includes('idx_student_incomes_contract_id'),plan);
  assert(plan.includes('idx_student_incomes_sozlesme_no'),plan);
}
assert.equal(sql.prepare('PRAGMA integrity_check').get().integrity_check,'ok');sql.close();
console.log('Income indexes: dashboard output preserved; both indexed lookup branches verified; migration replay safe.');
