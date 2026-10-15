// Dry run only: node tests/reconcile_edesis_exports.mjs verified.sqlite rows.json original-edesis.json comparison.json
// Writes guarded proposals beside the private backup. Never connects to production.
import assert from 'node:assert/strict';
import { copyFileSync, constants, readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const [file, rowsFile, archiveFile, comparisonFile] = process.argv.slice(2);
assert.ok(comparisonFile, 'Supply the backup, extracted workbook rows, original export and screenshot comparison');
const sources = JSON.parse(readFileSync(rowsFile,'utf8'));
const archive = JSON.parse(readFileSync(archiveFile,'utf8'));
const comparison = JSON.parse(readFileSync(comparisonFile,'utf8'));
const db = new DatabaseSync(file,{readOnly:true});
const tables=Object.fromEntries(['students','contracts','student_incomes','installments','payments'].map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()]));
db.close();
const cents=n=>Math.round(Number(n)*100);
const one=(rows,message)=>{assert.equal(rows.length,1,message);return rows[0];};
const proposals={};
function propose(table,row,patch,reason){
  const changed=Object.fromEntries(Object.entries(patch).filter(([key,value])=>row[key]!==value));
  if(!Object.keys(changed).length)return;
  proposals[table] ||= [];
  const prior=proposals[table].find(p=>p.old.id===row.id);
  if(prior){Object.assign(prior.new,changed);prior.reasons.push(reason);}
  else proposals[table].push({old:row,new:changed,reasons:[reason]});
}
const photographed=comparison.screenshot;
assert.ok(Array.isArray(photographed),'Screenshot comparison required');
for(const proof of photographed){
  assert.equal(proof.matches,1);
  const p=one(tables.payments.filter(p=>proof.matched_ids.includes(p.id)),'Screenshot payment missing');
  assert.equal(cents(p.amount),cents(proof.amount));assert.equal(p.payment_date,proof.date);assert.ok(!p.is_cancelled);
  if(proof.contract)assert.equal(tables.contracts.find(c=>c.id===p.contract_id)?.sozlesme_no,proof.contract);
}
const additions=tables.payments.filter(p=>!p.id.startsWith('pay-edesis-'));
assert.ok(additions.every(p=>photographed.some(x=>x.matched_ids.includes(p.id))),'Unverified new payment: refresh reconciliation sources');
const currentSource=new Map(sources['Sözleşme Özet'].map(x=>[x['Sözleşme No'],x]));
assert.equal(currentSource.size,sources['Sözleşme Özet'].length,'Duplicate source contract');
for(const [code,x] of currentSource){
  const c=one(tables.contracts.filter(c=>c.sozlesme_no===code),'Contract missing or duplicated');
  const old=one(archive.sozlesmeler.filter(c=>c.sozlesmeNo===code),'Archived contract missing');
  const identity=one(tables.students.filter(s=>s.id===c.student_id),'Student missing');
  if(String(c.student_id).replace(/^stu-/,'')!==String(old.ogrenciId)){
    const detail=one(sources['Öğrenci & Veli Detay'].filter(s=>s['Sözleşme No']===code),'Source identity missing');
    const tc=String(detail['Öğrenci TC No']);
    assert.ok(/^\d{11}$/.test(tc) && identity.student_tc===tc,'Remapped identity not proved by source TC');
    assert.equal(tables.students.filter(s=>s.student_tc===tc).length,1,'Duplicate student TC');
  }
  assert.equal(cents(x['Brüt Tutar']),cents(old.brutTutar));
  const xi=one(sources.Gelirler.filter(i=>i['Sözleşme No']===code && i.Durum!=='İptal Edildi'),'Workbook income ambiguous');
  const income=one(tables.student_incomes.filter(i=>i.gelir_kodu===xi['Gelir Kodu']),'Live income missing or duplicated');
  assert.equal(income.contract_id,c.id);assert.equal(income.student_id,c.student_id);
  assert.equal(cents(x['Tahsil Edilen']),cents(xi['Toplam Tahsilat']));
  assert.equal(cents(x['Brüt Tutar']),cents(xi['Brüt Tutar']));
  const added=additions.filter(p=>p.contract_id===c.id && !p.is_cancelled).reduce((n,p)=>n+cents(p.amount),0);
  const paid=(cents(x['Tahsil Edilen'])+added)/100, gross=Number(x['Brüt Tutar']);
  const plan=tables.installments.filter(i=>i.contract_id===c.id);
  assert.equal(plan.reduce((n,i)=>n+cents(i.amount),0),cents(gross),'Existing plan disagrees with workbook');
  const count=Number(x['Taksit Sayısı'])>0?Number(x['Taksit Sayısı']):c.taksit_sayisi;
  if(Number(x['Taksit Sayısı'])>0){
    assert.equal(plan.filter(i=>i.installment_no>0).length,count);
    assert.equal(plan.filter(i=>i.installment_no===0).reduce((n,i)=>n+cents(i.amount),0),cents(x['Peşinat Tutarı']));
  }
  else assert.equal(cents(paid),cents(gross),'Cash contract has an unexplained balance');
  const s=one(tables.students.filter(s=>s.id===c.student_id),'Student missing');
  assert.equal(s.sozlesme_no,code,'Student balance belongs to another contract');
  propose('student_incomes',income,{brut_tutar:gross,net_tutar:Number(x['Net Tutar']),kdv_tutari:Number(x['KDV Tutarı']),kdv_orani:Number(xi['KDV Oranı']),toplam_tahsilat:paid,kalan_alacak:Math.round((gross-paid)*100)/100,tam_tahsil_edildi_mi:paid>=gross?1:0,taksit_sayisi:count},'Workbook opening balance plus photographed new receipts once');
  propose('contracts',c,{brut_tutar:gross,net_tutar:Number(x['Net Tutar']),kdv_tutari:Number(x['KDV Tutarı']),taksit_sayisi:count},'Workbook and existing installment plan agree');
  const extras=Object.values(JSON.parse(s.extra_fees||'{}')).reduce((n,v)=>n+Number(v),0);
  propose('students',s,{paid_amount:paid,total_fee:Math.round((gross-extras+Number(s.discount_amount||0))*100)/100,...(Number(x['Taksit Sayısı'])>0?{installment_count:count}:{})},'Balance for the student current contract; historical receipts retained');
  for(const i of plan){
    const src=archive.taksitler.filter(t=>String(t.muH_GelirV2Id)===income.id.replace(/^glr_/,'') && t.taksitNo===i.installment_no);
    if(!src.length && Number(x['Taksit Sayısı'])===0){
      propose('installments',i,{paid_amount:i.amount,status:'Odendi'},'Fully paid cash contract in both workbooks; retain generated plan rows');
      continue;
    }
    if(src.length!==1)continue;
    const t=src[0];assert.equal(cents(t.taksitTutari),cents(i.amount));
    const extra=additions.filter(p=>p.installment_id===i.id && !p.is_cancelled).reduce((n,p)=>n+cents(p.amount),0);
    const actualPaid=(cents(t.tahsilEdilen)+extra)/100;
    assert.ok(actualPaid>=0 && actualPaid<=i.amount);
    propose('installments',i,{paid_amount:actualPaid,status:actualPaid>=i.amount?'Odendi':actualPaid>0?'KismenOdendi':'Bekliyor',total_installments:count},'Original installment plus photographed new receipt');
  }
}
// Guard every payment identity and value so a new collection invalidates the proposal.
const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'";
const paymentKeys=['id','amount','student_id','contract_id','installment_id','payment_date','is_cancelled'];
const fingerprint=tables.payments.map(p=>Object.fromEntries(paymentKeys.map(k=>[k,p[k]])));
const paymentGuard=`(SELECT COUNT(*) FROM payments)=${fingerprint.length} AND NOT EXISTS(SELECT 1 FROM payments p LEFT JOIN json_each(${literal(fingerprint)}) j ON json_extract(j.value,'$.id')=p.id WHERE j.value IS NULL OR ${paymentKeys.map(k=>`p.${k} IS NOT json_extract(j.value,'$.${k}')`).join(' OR ')})`;
const statements=Object.entries(proposals).map(([table,proof])=>{
  const columns=[...new Set(proof.flatMap(p=>Object.keys(p.new)))];
  const sets=columns.map(k=>`${k}=CASE WHEN json_type((SELECT value FROM proof WHERE json_extract(value,'$.old.id')=${table}.id),'$.new.${k}') IS NOT NULL THEN (SELECT json_extract(value,'$.new.${k}') FROM proof WHERE json_extract(value,'$.old.id')=${table}.id) ELSE ${k} END`);
  const oldKeys=Object.keys(proof[0].old);
  const oldGuard=`NOT EXISTS(SELECT 1 FROM json_each(proof.value,'$.old') old WHERE old.value IS NOT CASE old.key ${oldKeys.map(k=>`WHEN '${k}' THEN ${table}.${k}`).join(' ')} END)`;
  return `WITH proof AS (SELECT value FROM json_each(${literal(proof)})) UPDATE ${table} SET ${sets.join(',')} WHERE ${paymentGuard} AND EXISTS(SELECT 1 FROM proof WHERE json_extract(proof.value,'$.old.id')=${table}.id AND ${oldGuard});`;
});
assert.ok(statements.every(s=>Buffer.byteLength(s)<100000),'D1 SQL statement limit');
const clone=file+'.reconciliation-'+Date.now()+'.sqlite';copyFileSync(file,clone,constants.COPYFILE_EXCL);
const rehearsal=new DatabaseSync(clone);rehearsal.exec('BEGIN');for(const sql of statements)rehearsal.exec(sql);rehearsal.exec('COMMIT');
let changedFields=0;
for(const [table,before]of Object.entries(tables)){
  const after=rehearsal.prepare(`SELECT * FROM ${table} ORDER BY id`).all();assert.equal(after.length,before.length);
  for(let j=0;j<before.length;j++)for(const key of Object.keys(before[j])){
    const planned=proposals[table]?.find(p=>p.old.id===before[j].id)?.new;
    assert.equal(after[j][key],planned && key in planned?planned[key]:before[j][key],`${table}.${key} differs from proposal`);
    if(after[j][key]!==before[j][key])changedFields++;
  }
}
assert.equal(rehearsal.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
for(const sql of statements)rehearsal.exec(sql); // Idempotent: guarded old values skip already-reconciled rows.
rehearsal.close();
const report={created_at:new Date().toISOString(),source_contracts:currentSource.size,screenshot_payments:photographed.length,new_receipts:additions.length,new_receipts_total:additions.reduce((n,p)=>n+cents(p.amount),0)/100,changed_rows:Object.fromEntries(Object.entries(proposals).map(([k,v])=>[k,v.length])),changed_fields:changedFields,all_existing_rows_preserved:true,payments_unchanged:true,clone};
writeFileSync(file+'.reconciliation.sql',statements.join('\n'));
writeFileSync(file+'.reconciliation.proposal.json',JSON.stringify({report,proposals},null,2));
console.log(JSON.stringify(report));
