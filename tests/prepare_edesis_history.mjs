// Dry run: node tests/prepare_edesis_history.mjs verified.sqlite original-edesis.json extracted-rows.json
// Restores missing source rows on a private clone only; retains existing rows and all payment amounts.
import assert from 'node:assert/strict';
import {copyFileSync,constants,readFileSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {normalizeDate} from '../frontend/src/lib/installmentService.js';
const [file,archiveFile,rowsFile,receiptFlag]=process.argv.slice(2);
assert.ok(rowsFile,'Supply backup, archived export and current workbook rows');
const archive=JSON.parse(readFileSync(archiveFile,'utf8')), sources=JSON.parse(readFileSync(rowsFile,'utf8'));
const cents=n=>Math.round(Number(n)*100);
assert.equal(sources['Müşteriler'].reduce((n,c)=>n+cents(c['[Toplam tahsilat]']),0),archive.gelirler.reduce((n,i)=>n+cents(i.toplamTahsilat),0),'Customer export does not confirm archive total');
for(const x of sources.Gelirler){
  const old=archive.gelirler.filter(i=>i.gelirKodu===x['Gelir Kodu']);assert.equal(old.length,1);
  assert.equal(cents(old[0].brutTutar),cents(x['Brüt Tutar']));assert.equal(cents(old[0].toplamTahsilat),cents(x['Toplam Tahsilat']));
}
const db=new DatabaseSync(file,{readOnly:true});
const names=['students','contracts','student_incomes','installments','payments'];
const tables=Object.fromEntries(names.map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()]));
db.close();
const additions={contracts:[],student_incomes:[],installments:[]};
const unresolved=[];
const date=d=>d?normalizeDate(d)||'':'';
function studentId(id){
  const matches=tables.students.filter(s=>String(s.id).replace(/^stu-/,'')===String(id));
  assert.equal(matches.length,1,'Historical student identity missing or ambiguous');return matches[0].id;
}
for(const c of archive.sozlesmeler){
  if(tables.contracts.some(x=>x.sozlesme_no===c.sozlesmeNo))continue;
  assert.ok([40,142].includes(c.donemId),'Current contract missing: requires current source review');
  const row={id:'cnt_'+c.id,sozlesme_no:c.sozlesmeNo,student_id:studentId(c.ogrenciId),student_name:c.ogrenciAdi||'',student_no:String(c.ogrenciNo||''),student_class:c.sinifAdi||'',parent_name:c.veliAdiSoyadi||c.musteriUnvan||'',parent_phone:c.veliTelefon||'',period_id:c.donemId,period_name:c.donemAdi,net_tutar:c.netTutar,kdv_tutari:c.kdvTutari,brut_tutar:c.brutTutar,odeme_turu:c.odemeTuru,odeme_turu_text:c.odemeTuruText||'',taksit_sayisi:c.taksitSayisi,durum:c.durum,is_signed:Number(!!c.isSigned),veli_imza_alindi:Number(!!c.veliImzaAlindi),kurum_imza_alindi:Number(!!c.kurumImzaAlindi),kurum_imzalayan:c.kurumImzalayan||'',kurum_imzalayan_unvan:c.kurumImzalayanUnvan||'',signed_at:c.onayTarihi||'',sozlesme_tarihi:date(c.sozlesmeTarihi),baslama_tarihi:date(c.baslamaTarihi),bitis_tarihi:date(c.bitisTarihi),sozlesme_url:c.sozlesmeUrl||'',iptal_nedeni:c.iptalNedeni||'',iptal_tarihi:date(c.iptalTarihi),notes:c.aciklama||'',created_at:c.creationTime||'',created_by:c.creatorUserName||'',is_deleted:0};
  assert.ok(!tables.contracts.some(x=>x.id===row.id),'Contract ID collision');additions.contracts.push(row);
}
const contracts=[...tables.contracts,...additions.contracts];
for(const i of archive.gelirler){
  if(tables.student_incomes.some(x=>x.gelir_kodu===i.gelirKodu))continue;
  if(i.donemId===113)assert.equal(sources.Gelirler.filter(x=>x['Gelir Kodu']===i.gelirKodu).length,1,'Missing current income not proved by workbook');
  if(!tables.students.some(s=>String(s.id).replace(/^stu-/,'')===String(i.ogrenciId))){
    unresolved.push({income_id:i.id,income_code:i.gelirKodu,reason:'Original student ID absent; same-name customer records have different or missing TC. Do not merge by name.'});continue;
  }
  const sid=studentId(i.ogrenciId);
  const cs=contracts.filter(c=>c.sozlesme_no===i.sozlesmeNo && c.student_id===sid && c.period_id===i.donemId);
  assert.ok(cs.length<=1,'Income contract ambiguous');
  const row={id:'glr_'+i.id,gelir_kodu:i.gelirKodu,contract_id:cs[0]?.id||'',sozlesme_no:i.sozlesmeNo||'',student_id:sid,student_name:i.ogrenciAdiSoyadi||'',student_no:String(i.ogrenciNo||''),student_class:i.sinifAdi||'',musteri_unvan:i.musteriUnvan||'',title:i.aciklama||'',period_id:i.donemId,period_name:i.donemAdi,net_tutar:i.netTutar,kdv_orani:i.kdvOrani,kdv_tutari:i.kdvTutari,brut_tutar:i.brutTutar,toplam_tahsilat:i.toplamTahsilat,kalan_alacak:i.kalanAlacak,tam_tahsil_edildi_mi:Number(!!i.tamTahsilEdildiMi),gelir_tarihi:date(i.gelirTarihi),vade_tarihi:date(i.vadeTarihi),taksitli_mi:Number(!!i.taksitliMi),taksit_sayisi:i.taksitSayisi,kalan_taksit_sayisi:i.kalanTaksitSayisi,durum:i.durum,durum_text:i.durumText||'',created_at:i.creationTime||'',created_by:i.creatorUserName||'',is_deleted:0};
  assert.ok(!tables.student_incomes.some(x=>x.id===row.id),'Income ID collision');additions.student_incomes.push(row);
}
const incomes=[...tables.student_incomes,...additions.student_incomes];
for(const i of archive.taksitler.filter(i=>[40,142].includes(i.donemId))){
  const originalIncome=archive.gelirler.find(g=>g.id===i.muH_GelirV2Id);assert.ok(originalIncome);
  const income=incomes.find(g=>g.gelir_kodu===originalIncome.gelirKodu);assert.ok(income?.contract_id,'Historical installment contract absent');
  const c=contracts.find(c=>c.id===income.contract_id);
  if(tables.installments.some(t=>t.contract_id===c.id && t.installment_no===i.taksitNo))continue;
  assert.ok(i.tahsilEdilen>=0 && cents(i.tahsilEdilen)<=cents(i.taksitTutari));
  const row={id:`inst_${c.id}_${i.taksitNo}`,contract_id:c.id,income_id:income.id,student_id:c.student_id,installment_no:i.taksitNo,total_installments:income.taksit_sayisi,due_date:date(i.vadeTarihi),amount:i.taksitTutari,paid_amount:i.tahsilEdilen,status:i.tahsilEdilen>=i.taksitTutari?'Odendi':i.tahsilEdilen>0?'KismenOdendi':'Bekliyor',payment_date:date(i.sonTahsilatTarihi),receipt_no:'',created_at:income.created_at};
  assert.ok(row.due_date,'Invalid historical due date');assert.ok(!tables.installments.some(x=>x.id===row.id),'Installment ID collision');additions.installments.push(row);
}
// Only explicitly user-confirmed receipt IDs may be restored; opening balances already contain them.
const receiptIds=receiptFlag?.startsWith('--restore-receipts=')?receiptFlag.slice('--restore-receipts='.length).split(','):[];
if(receiptIds.length)additions.payments=[];
for(const id of receiptIds){
  if(tables.payments.some(p=>p.id==='pay-edesis-'+id))continue;
  const matches=archive.tahsilatlar.filter(p=>String(p.id)===id);assert.equal(matches.length,1);
  const p=matches[0];assert.ok(!p.iptalEdildiMi && p.tahsilatTutari>0);
  const originalIncome=archive.gelirler.find(i=>i.id===p.muH_GelirV2Id);assert.ok(originalIncome);
  const income=incomes.find(i=>i.gelir_kodu===originalIncome.gelirKodu);assert.ok(income?.contract_id);
  const sourceInst=archive.taksitler.find(i=>i.id===p.muH_GelirTaksitId);assert.ok(sourceInst);
  assert.equal(sourceInst.muH_GelirV2Id,originalIncome.id);assert.equal(sourceInst.taksitNo,p.taksitNo);
  const insts=[...tables.installments,...additions.installments].filter(i=>i.contract_id===income.contract_id && i.installment_no===p.taksitNo && i.student_id===income.student_id && cents(i.amount)===cents(sourceInst.taksitTutari) && i.due_date===date(sourceInst.vadeTarihi));
  assert.equal(insts.length,1,'Confirmed receipt installment ambiguous');
  assert.ok(cents(insts[0].paid_amount)>=cents(p.tahsilatTutari) && cents(income.toplam_tahsilat)>=cents(originalIncome.toplamTahsilat),'Receipt missing from opening balance: separate reconciliation required');
  const method=new Map(tables.payments.filter(x=>x.id.startsWith('pay-edesis-')).map(x=>{const src=archive.tahsilatlar.find(p=>'pay-edesis-'+p.id===x.id);return[src?.odemeYontemi,x.method];})).get(p.odemeYontemi);
  assert.ok(method,'Unknown source payment method');
  additions.payments.push({id:'pay-edesis-'+p.id,student_id:income.student_id,contract_id:income.contract_id,installment_id:insts[0].id,amount:p.tahsilatTutari,method,bank:p.kasaBankaAdi||'',payment_date:date(p.tahsilatTarihi),note:p.aciklama||p.gelirAciklama||'',created_by:'edesis',created_by_name:p.creatorUserName||'',created_at:p.creationTime||'',status:'Odendi',is_cancelled:0});
}
const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'";
const statements=[];
for(const [table,rows]of Object.entries(additions)){
  if(!rows.length)continue;
  const columns=Object.keys(rows[0]);
  const insert=chunk=>`INSERT INTO ${table}(${columns.join(',')}) SELECT ${columns.map(k=>`json_extract(value,'$.${k}')`).join(',')} FROM json_each(${literal(chunk)}) WHERE true ON CONFLICT(id) DO NOTHING;`;
  let chunk=[];
  for(const row of rows){if(Buffer.byteLength(insert([...chunk,row]))>=95000){assert.ok(chunk.length);statements.push(insert(chunk));chunk=[];}chunk.push(row);}
  if(chunk.length)statements.push(insert(chunk));
}
const clone=file+'.history-'+Date.now()+'.sqlite';copyFileSync(file,clone,constants.COPYFILE_EXCL);
const rehearsal=new DatabaseSync(clone);rehearsal.exec('BEGIN');for(const s of statements)rehearsal.exec(s);rehearsal.exec('COMMIT');
let verifiedFields=0;
for(const [table,rows]of Object.entries(tables)){
  const all=rehearsal.prepare(`SELECT * FROM ${table}`).all();assert.equal(all.length,rows.length+(additions[table]?.length||0));
  for(const row of rows){const after=all.find(x=>x.id===row.id);for(const [key,value]of Object.entries(row)){assert.equal(after[key],value,`Existing ${table}.${key} changed`);verifiedFields++;}}
  for(const row of additions[table]||[]){const after=all.find(x=>x.id===row.id);for(const[key,value]of Object.entries(row))assert.equal(after[key],value,`Restored ${table}.${key} differs from source`);}
}
assert.equal(rehearsal.prepare('PRAGMA integrity_check').get().integrity_check,'ok');for(const s of statements)rehearsal.exec(s);rehearsal.close();
const report={at:new Date().toISOString(),additions:Object.fromEntries(Object.entries(additions).map(([k,v])=>[k,v.length])),unresolved,source_customer_collected:sources['Müşteriler'].reduce((n,c)=>n+cents(c['[Toplam tahsilat]']),0)/100,existing_fields_verified:verifiedFields,all_existing_rows_and_values_preserved:true,existing_payments_unchanged:true,restored_receipt_total:(additions.payments||[]).reduce((n,p)=>n+cents(p.amount),0)/100,opening_balances_not_incremented:true,clone};
writeFileSync(file+'.history.sql',statements.join('\n'));writeFileSync(file+'.history.proposal.json',JSON.stringify({report,additions},null,2));console.log(JSON.stringify(report));
