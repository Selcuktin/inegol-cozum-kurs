// Run with the verified SQLite backup and original Edesis JSON export as arguments.
// Builds a guarded SQL proposal beside the backup and tests it on a separate clone.
import assert from 'node:assert/strict';
import { copyFileSync, constants, readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { normalizeDate } from '../frontend/src/lib/installmentService.js';

const [source, exportFile] = process.argv.slice(2);
assert.ok(source && exportFile, 'Supply verified.sqlite and the original Edesis export');
const db = new DatabaseSync(source, { readOnly: true });
const original = JSON.parse(readFileSync(exportFile, 'utf8'));
const receipts = new Map(original.tahsilatlar.map(p => [String(p.id), p]));
const originalIncomes = new Map(original.gelirler.map(i => [String(i.id), i]));
const originalInstallments = new Map(original.taksitler.map(i => [String(i.id), i]));
const payments = db.prepare('SELECT * FROM payments ORDER BY id').all();
const contracts = db.prepare('SELECT * FROM contracts').all();
const incomes = db.prepare('SELECT * FROM student_incomes').all();
const installments = db.prepare('SELECT * FROM installments').all();
const proposals = [];
const sameStudent = (a, b) => String(a).replace(/^stu-/, '') === String(b).replace(/^stu-/, '');
for (const p of payments.filter(p => !p.contract_id || !p.installment_id)) {
  const receipt = receipts.get(p.id.replace(/^pay-edesis-/, ''));
  if (!receipt || Math.round(p.amount * 100) !== Math.round(receipt.tahsilatTutari * 100) || normalizeDate(p.payment_date) !== normalizeDate(receipt.tahsilatTarihi) || Boolean(p.is_cancelled) !== Boolean(receipt.iptalEdildiMi)) continue;
  const income = originalIncomes.get(String(receipt.muH_GelirV2Id));
  if (!income || !sameStudent(income.ogrenciId, p.student_id)) continue;
  const currentIncomes = incomes.filter(i => i.id === 'glr_' + income.id && i.gelir_kodu === income.gelirKodu);
  const currentContracts = contracts.filter(c => c.sozlesme_no === income.sozlesmeNo && c.period_id === income.donemId && sameStudent(c.student_id, p.student_id));
  if (currentIncomes.length !== 1 || currentContracts.length !== 1) continue;
  const c = currentContracts[0];
  if (p.contract_id && p.contract_id !== c.id) continue;
  const oldInst = originalInstallments.get(String(receipt.muH_GelirTaksitId));
  const candidates = oldInst && String(oldInst.muH_GelirV2Id) === String(income.id) ? installments.filter(i => i.contract_id === c.id && i.installment_no === receipt.taksitNo && sameStudent(i.student_id, p.student_id) && Math.round(i.amount * 100) === Math.round(oldInst.taksitTutari * 100) && normalizeDate(i.due_date) === normalizeDate(oldInst.vadeTarihi)) : [];
  const installmentId = candidates.length === 1 ? candidates[0].id : p.installment_id;
  if (p.installment_id && p.installment_id !== installmentId) continue;
  proposals.push({ id: p.id, student_id: p.student_id, amount: p.amount, payment_date: p.payment_date, cancelled: Number(p.is_cancelled || 0), old_contract: p.contract_id, old_installment: p.installment_id, contract_id: c.id, contract_student_id:c.student_id, installment_id: installmentId || '', installment_no:candidates[0]?.installment_no, installment_amount:candidates[0]?.amount, installment_due:normalizeDate(candidates[0]?.due_date), installment_student:candidates[0]?.student_id });
}
db.close();
const literal = JSON.stringify(proposals).replaceAll("'", "''");
const sql = `-- Proven by original receipt ID, student ID, income ID, amount, date and cancellation flag.\n-- No financial values are changed. Changed or already-relinked records are skipped.\nWITH proof AS (SELECT value FROM json_each('${literal}'))\nUPDATE payments SET contract_id=(SELECT json_extract(value,'$.contract_id') FROM proof WHERE json_extract(value,'$.id')=payments.id),installment_id=(SELECT json_extract(value,'$.installment_id') FROM proof WHERE json_extract(value,'$.id')=payments.id)\nWHERE EXISTS(SELECT 1 FROM proof WHERE json_extract(value,'$.id')=payments.id AND json_extract(value,'$.student_id')=payments.student_id AND json_extract(value,'$.amount')=payments.amount AND json_extract(value,'$.payment_date')=payments.payment_date AND json_extract(value,'$.cancelled')=COALESCE(payments.is_cancelled,0) AND json_extract(value,'$.old_contract')=payments.contract_id AND json_extract(value,'$.old_installment')=payments.installment_id AND EXISTS(SELECT 1 FROM contracts c WHERE c.id=json_extract(proof.value,'$.contract_id') AND c.student_id=json_extract(proof.value,'$.contract_student_id')) AND (json_extract(value,'$.installment_id')='' OR EXISTS(SELECT 1 FROM installments i WHERE i.id=json_extract(proof.value,'$.installment_id') AND i.contract_id=json_extract(proof.value,'$.contract_id') AND i.student_id=json_extract(proof.value,'$.installment_student') AND i.installment_no=json_extract(proof.value,'$.installment_no') AND i.amount=json_extract(proof.value,'$.installment_amount') AND (CASE WHEN i.due_date LIKE '__.__.____' THEN substr(i.due_date,7,4)||'-'||substr(i.due_date,4,2)||'-'||substr(i.due_date,1,2) ELSE i.due_date END)=json_extract(proof.value,'$.installment_due'))));\n`;
assert.ok(Buffer.byteLength(sql) <= 100000, 'Proposal exceeds D1 statement limit');
const clone = source + '.payment-links-' + Date.now() + '.sqlite';
copyFileSync(source, clone, constants.COPYFILE_EXCL);
const rehearsal = new DatabaseSync(clone);
rehearsal.exec(sql);
const after = rehearsal.prepare('SELECT * FROM payments ORDER BY id').all();
assert.equal(after.length, payments.length);
for (let i = 0; i < payments.length; i++) for (const key of Object.keys(payments[i])) {
  if (!['contract_id', 'installment_id'].includes(key)) assert.equal(after[i][key], payments[i][key], `Payment ${key} changed`);
}
assert.equal(rehearsal.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
rehearsal.close();
const report = { proposed_contract_links: proposals.filter(p => !p.old_contract).length, proposed_installment_links: proposals.filter(p => p.installment_id && !p.old_installment).length, remaining_without_contract: after.filter(p => !p.contract_id).length, remaining_without_installment: after.filter(p => !p.installment_id).length, payment_rows_and_all_other_columns_preserved: true, sql_bytes: Buffer.byteLength(sql) };
writeFileSync(source + '.proven-payment-links.sql', sql);
writeFileSync(source + '.proven-payment-links.report.json', JSON.stringify(report, null, 2));
writeFileSync(new URL('../test_reports/fix_legacy_links.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
