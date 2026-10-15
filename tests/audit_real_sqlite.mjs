// Run: node tests/audit_real_sqlite.mjs (Node 22.13+). Uses isolated memory DBs only.
// D1-compatible query adapter executes the real route SQL; it does not model edge limits.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { onRequest } from '../frontend/functions/api/[[route]].js';
import { generateContractInstallments } from '../frontend/src/lib/installmentService.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const results = [];
const originalConsole = { log: console.log, error: console.error, warn: console.warn };
let logs = [];
console.log = console.error = console.warn = (...args) => logs.push(args.map(String).join(' '));

function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(root + 'frontend/schema.sql', 'utf8'));
  sql.exec('DELETE FROM students; DELETE FROM contracts; DELETE FROM student_incomes; DELETE FROM classes;');
  const db = {
    sql,
    prepare(query) {
      let params = [];
      const statement = {
        bind(...values) { assert.ok(values.length<=100,"D1 accepts at most 100 bind parameters"); params = values; return statement; },
        async first() { return sql.prepare(query).get(...params) || null; },
        async all() { return { results: sql.prepare(query).all(...params) }; },
        async run() { sql.prepare(query).run(...params); return { success: true }; },
        execute() { const stmt=sql.prepare(query); if(stmt.columns().length) return {success:true,results:stmt.all(...params)}; stmt.run(...params); return { success: true }; },
      };
      return statement;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const rows = statements.map(s => s.execute()); sql.exec('COMMIT'); return rows; }
      catch (e) { sql.exec('ROLLBACK'); throw e; }
    },
  };
  return db;
}

function row(db, query, ...params) { return db.sql.prepare(query).get(...params); }
function rows(db, query, ...params) { return db.sql.prepare(query).all(...params); }
function equal(actual, expected) { assert.equal(actual, expected, JSON.stringify({ actual, expected })); }
async function request(db, path, method = 'GET', body, options = {}) {
  db.sql.exec("INSERT OR IGNORE INTO user_sessions (session_token,user_id,expires_at) VALUES ('audit-admin','user_admin','2099-01-01');");
  const headers = { Authorization: 'Bearer audit-admin', ...options.headers };
  if (body !== undefined) headers['Content-Type'] ||= 'application/json';
  const req = new Request('https://inegol-cozum-kurs.pages.dev/api' + path, {
    method, headers, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
  const response = await onRequest({ request: req, env: { DB: db, ...options.env }, waitUntil() {} });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}
async function student(db, id = 'audit-s1', patch = {}) {
  const res = await request(db, '/students', 'POST', { id, student_name: 'Audit Student', parent_name: 'Audit Parent', total_fee: 1000, installment_count: 2, ...patch });
  assert.ok([200,201].includes(res.status), JSON.stringify(res));
  return row(db, 'SELECT * FROM contracts WHERE student_id=?', id);
}
async function pay(db, contract, amount, no = 1) {
  const res = await request(db, '/payments', 'POST', { student_id: contract.student_id, contract_id: contract.id, installment_no: no, amount });
  equal(res.status, 201);
  return res.data;
}
async function check(name, test) {
  const db = database(); logs = [];
  try { const evidence = await test(db); results.push({ name, passed: true, evidence }); }
  catch (e) { results.push({ name, passed: false, error: e.message, logs: logs.slice(-3) }); }
  finally { db.sql.close(); }
}

await check('normal registration creates one contract, one income and exact installment sum', async db => {
  const c = await student(db, 'audit-s1', { total_fee: 1000.01, installment_count: 3 });
  equal(row(db, 'SELECT COUNT(*) AS n FROM student_incomes WHERE contract_id=?', c.id).n, 1);
  equal(Math.round(row(db, 'SELECT SUM(amount) AS n FROM installments WHERE contract_id=?', c.id).n * 100), 100001);
  return { installments: 3, sum: 1000.01 };
});
await check('ordinary payment and full cancellation keep financial balances consistent', async db => {
  const c = await student(db); const p = await pay(db, c, 500);
  equal(row(db, 'SELECT paid_amount FROM students WHERE id=?', c.student_id).paid_amount, 500);
  equal(row(db, 'SELECT toplam_tahsilat FROM student_incomes WHERE contract_id=?', c.id).toplam_tahsilat, 500);
  equal((await request(db, '/payments/cancel', 'POST', { payment_id: p.id })).status, 200);
  equal(row(db, 'SELECT paid_amount FROM students WHERE id=?', c.student_id).paid_amount, 0);
});
await check('extra fees and discount propagate to contract gross', async db => {
  const c = await student(db, 'audit-s1', { extra_fees: { book: 100 }, discount_amount: 200 });
  equal(c.brut_tutar, 900);
});
await check('requested first due date is stored in installment plan', async db => {
  const c = await student(db, 'audit-s1', { due_date: '2027-02-15' });
  equal(row(db, 'SELECT due_date FROM installments WHERE contract_id=? AND installment_no=1', c.id).due_date, '2027-02-15');
});
await check('contract upload works with configured R2 binding', async db => {
  await student(db);
  const res = await request(db, '/students/audit-s1/contract-upload', 'POST', '%PDF-audit', { headers: { 'Content-Type': 'application/pdf' }, env: { FILES: { async put() {} } } });
  equal(res.status, 200);
});
await check('repeated student POST preserves signed file and previous paid installments', async db => {
  const c = await student(db); await pay(db, c, 200);
  db.sql.prepare("UPDATE students SET signed_contract_path='contracts/test.pdf' WHERE id=?").run(c.student_id);
  await student(db);
  equal(row(db, 'SELECT signed_contract_path FROM students WHERE id=?', c.student_id).signed_contract_path, 'contracts/test.pdf');
  equal(row(db, 'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1', c.id).paid_amount, 200);
});
await check('repeated contract POST preserves payments and does not duplicate income', async db => {
  const c = await student(db); await pay(db, c, 200);
  equal((await request(db, '/contracts', 'POST', { student_id: c.student_id, student_name: 'Audit Student', total_amount: 1000, installment_count: 2 })).status, 201);
  equal(row(db, 'SELECT COUNT(*) AS n FROM student_incomes WHERE contract_id=? AND is_deleted=0', c.id).n, 1);
  equal(row(db, 'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1', c.id).paid_amount, 200);
});
await check('contract PATCH updates installment count and sum', async db => {
  const c = await student(db);
  equal((await request(db, '/contracts/' + c.id, 'PATCH', { brutTutar: 1200, taksitSayisi: 3 })).status, 200);
  equal(row(db, 'SELECT COUNT(*) AS n FROM installments WHERE contract_id=?', c.id).n, 3);
  equal(row(db, 'SELECT SUM(amount) AS n FROM installments WHERE contract_id=?', c.id).n, 1200);
});
await check('student fee PATCH synchronizes contract and installments', async db => {
  const c = await student(db);
  equal((await request(db, '/students/audit-s1', 'PATCH', { total_fee: 1200 })).status, 200);
  equal(row(db, 'SELECT brut_tutar FROM contracts WHERE id=?', c.id).brut_tutar, 1200);
});
await check('student PUT used by StudentService is supported', async db => {
  await student(db);
  equal((await request(db, '/students/audit-s1', 'PUT', { student_name: 'Changed' })).status, 200);
});
await check('payment cannot link one student to another students contract/installment', async db => {
  const a = await student(db); const b = await student(db, 'audit-s2');
  const inst = row(db, 'SELECT id FROM installments WHERE contract_id=? AND installment_no=1', b.id);
  const res = await request(db, '/payments', 'POST', { student_id: a.student_id, contract_id: b.id, installment_id: inst.id, amount: 100 });
  assert.ok(res.status >= 400, JSON.stringify({ status: res.status, foreignInstallmentPaid: row(db, 'SELECT paid_amount FROM installments WHERE id=?', inst.id).paid_amount }));
});
await check('payment beyond one installment allocates entire amount or is rejected', async db => {
  const c = await student(db);
  const res = await request(db, '/payments', 'POST', { student_id: c.student_id, contract_id: c.id, amount: 700 });
  if (res.status < 400) equal(row(db, 'SELECT SUM(paid_amount) AS n FROM installments WHERE contract_id=?', c.id).n, 700);
});
await check('cancel one partial payment preserves the other payment on same installment', async db => {
  const c = await student(db); await pay(db, c, 100); const second = await pay(db, c, 200);
  equal((await request(db, '/payments/cancel', 'POST', { payment_id: second.id })).status, 200);
  equal(row(db, 'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1', c.id).paid_amount, 100);
});
await check('two concurrent partial payments preserve sum in installment balance', async db => {
  const c = await student(db);
  await Promise.all([pay(db, c, 100), pay(db, c, 100)]);
  equal(row(db, 'SELECT SUM(amount) AS n FROM payments').n, 200);
  equal(row(db, 'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1', c.id).paid_amount, 200);
});
await check('duplicate fully paid installment is rejected', async db => {
  const c = await student(db); await pay(db, c, 500);
  equal((await request(db, '/payments', 'POST', { student_id: c.student_id, contract_id: c.id, installment_no: 1, amount: 500 })).status, 409);
});
await check('installment edit cannot create collected money without a payment record', async db => {
  const c = await student(db);
  equal((await request(db, '/contracts/' + c.id + '/installments', 'PUT', { installments: [{ installment_no: 1, amount: 500, paid_amount: 300, due_date: '2027-01-15' }] })).status, 422);
  equal(row(db, 'SELECT paid_amount FROM students WHERE id=?', c.student_id).paid_amount, row(db, 'SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE student_id=?', c.student_id).n);
});
await check('installment edit cannot alter installment belonging to different contract', async db => {
  const a = await student(db); const b = await student(db, 'audit-s2');
  const foreign = row(db, 'SELECT * FROM installments WHERE contract_id=? AND installment_no=1', b.id);
  await request(db, '/contracts/' + a.id + '/installments', 'PUT', { installments: [{ id: foreign.id, installment_no: 1, amount: 1, paid_amount: 1, due_date: '2027-01-15' }] });
  equal(row(db, 'SELECT amount FROM installments WHERE id=?', foreign.id).amount, 500);
});
await check('paid contract deletion is rejected and preserves payment history', async db => {
  const c = await student(db); await pay(db, c, 200);
  equal((await request(db, '/contracts/' + c.id, 'DELETE')).status, 409);
  equal(row(db, 'SELECT paid_amount FROM students WHERE id=?', c.student_id).paid_amount, 200);
  equal(row(db, 'SELECT COUNT(*) AS n FROM payments').n, 1);
});
await check('student deletion with related history is rejected without removing records', async db => {
  await student(db);
  db.sql.exec("INSERT INTO attendance(id,date,class_id,student_id) VALUES('att','2026-10-14','class-a','audit-s1'); INSERT INTO mentorship(id,student_id,mentor_name,session_date) VALUES('m','audit-s1','Audit','2026-10-14');");
  equal((await request(db, '/students/audit-s1', 'DELETE')).status,409);
  equal(row(db, 'SELECT COUNT(*) AS n FROM attendance WHERE student_id=?', 'audit-s1').n, 1);
});
await check('dashboard accounts for more than 100 expenses', async db => {
  for (let i = 0; i < 101; i++) db.sql.prepare('INSERT INTO expenses(id,title,amount,expense_date) VALUES(?,?,?,?)').run('exp'+i,'Audit',10,'2026-10-14');
  const res = await request(db, '/dashboard'); equal(res.status, 200);
  equal(res.data.summary.expenses, 1010);
});
await check('dashboard does not mask missing contracts table as empty successful data', async db => {
  db.sql.exec('DROP TABLE contracts');
  const res = await request(db, '/dashboard'); assert.ok(res.status >= 500, JSON.stringify({ status: res.status, contracts: res.data.contracts }));
});
await check('same-day attendance retains separate lesson slots', async db => {
  await student(db);
  for (const lesson_slot of ['1. Ders','2. Ders']) await request(db, '/attendance', 'POST', { date: '2026-10-14', records: [{ student_id: 'audit-s1', class_id: 'class-a', lesson_slot }] });
  equal(row(db, 'SELECT COUNT(*) AS n FROM attendance WHERE student_id=?', 'audit-s1').n, 2);
});
await check('attendance persists lesson_slot sent by actual frontend body', async db => {
  await student(db);
  await request(db, '/attendance', 'POST', { date: '2026-10-14', lesson_slot: '1. Ders', records: [{ student_id: 'audit-s1', class_id: 'class-a' }] });
  equal(row(db, 'SELECT lesson_slot FROM attendance').lesson_slot, '1. Ders');
});
await check('new students appear when attendance filter uses class ID', async db => {
  db.sql.exec("INSERT INTO classes(id,name) VALUES('class-a','8-A');");
  await student(db, 'audit-s1', { student_class: '8-A' });
  const res = await request(db, '/attendance?date=2026-10-14&class_id=class-a');
  equal(res.data.length, 1);
});
await check('homework roster is scoped to the homework class', async db => {
  await student(db, 'audit-s1', { student_class: '8-A' }); await student(db, 'audit-s2', { student_class: '9-A' });
  db.sql.exec("INSERT INTO classes(id,name) VALUES('class-a','8-A'); INSERT INTO homework(id,class_id,subject,title,due_date) VALUES('hw','class-a','Math','Audit','2026-10-14');");
  const res = await request(db, '/homework/hw/submissions'); equal(res.data.students.length, 1);
});
await check('server rejects identical class/teacher/room schedule collision', async db => {
  const body = { class_id: 'class-a', day_of_week: 1, time_slot: '09:00 - 09:45', subject: 'Math', teacher_name: 'Audit Teacher', room: 'R1' };
  equal((await request(db, '/schedules', 'POST', body)).status, 201);
  const res = await request(db, '/schedules', 'POST', body); assert.ok(res.status >= 400, JSON.stringify({ status: res.status, count: row(db, 'SELECT COUNT(*) AS n FROM schedules').n }));
});
await check('exam detail endpoint used by ExamsPage returns stored results', async db => {
  db.sql.exec("INSERT INTO exams(id,title,exam_type,exam_date) VALUES('ex','Audit','LGS','2026-10-14');");
  await student(db); await request(db, '/exams/ex/results', 'POST', { student_id: 'audit-s1', turkish_correct: 10 });
  const res = await request(db, '/exams/ex'); equal(res.status, 200); equal(res.data.results.length, 1);
});
await check('exam delete endpoint used by ExamsPage exists', async db => {
  db.sql.exec("INSERT INTO exams(id,title,exam_type,exam_date) VALUES('ex','Audit','LGS','2026-10-14');");
  await student(db); await request(db, '/exams/ex/results', 'POST', { student_id: 'audit-s1', turkish_correct: 10 });
  equal((await request(db, '/exams/ex', 'DELETE')).status, 409);
  equal(row(db, 'SELECT COUNT(*) AS n FROM exam_results').n, 1);
  equal(row(db, 'SELECT COUNT(*) AS n FROM exams').n, 1);
});
await check('exam result divisor derives from stored exam type', async db => {
  await student(db); db.sql.exec("INSERT INTO exams(id,title,exam_type,exam_date) VALUES('ex','Audit','LGS','2026-10-14');");
  await request(db, '/exams/ex/results', 'POST', { student_id: 'audit-s1', turkish_correct: 10, turkish_incorrect: 3 });
  equal(row(db, 'SELECT turkish_net FROM exam_results').turkish_net, 9);
});
await check('backup includes homework submissions, periods and sequence state', async db => {
  const res = await request(db, '/backup', 'POST', {}); equal(res.status, 200);
  const snapshot = JSON.parse(row(db, 'SELECT snapshot_data FROM system_backups WHERE id=?', res.data.backup_id).snapshot_data);
  assert.ok(Array.isArray(snapshot.tables.homework_submissions), 'homework_submissions missing');
  assert.ok(Array.isArray(snapshot.tables.academic_periods), 'academic_periods missing');
  assert.ok(Array.isArray(snapshot.tables.system_sequences), 'system_sequences missing');
});
await check('large backup download reads R2 rather than D1 placeholder', async db => {
  db.sql.exec("INSERT INTO system_backups(id,created_at,backup_type,snapshot_data,table_counts) VALUES('large','2026-10-14','manual','{}','{}');");
  const res = await request(db, '/backup?download=large', 'GET', undefined, { env: { BACKUPS: { async get() { return { async text() { return JSON.stringify({ version: 1, tables: { students: [] } }); } }; } } } });
  equal(res.data.version, 1);
});
await check('missing ADMIN_PASSWORD fails closed instead of using public fallback', async db => {
  const source = readFileSync(root + 'frontend/functions/api/routes/auth.js', 'utf8');
  const fallback = source.match(/:\s*\["([^"]+)"\];/)?.[1];
  const res = await request(db, '/auth/quick-login', 'POST', { role: 'admin', password: fallback });
  assert.ok(res.status >= 400, 'login accepted without configured admin secret');
});
await check('custom ALLOWED_ORIGIN is retained on actual response', async db => {
  const res = await request(db, '/health', 'GET', undefined, { headers: { Origin: 'https://audit.example' }, env: { ALLOWED_ORIGIN: 'https://audit.example' } });
  equal(res.headers.get('Access-Control-Allow-Origin'), 'https://audit.example');
});
await check('end-of-month frontend installment dates have no skipped month', async () => {
  const installments = generateContractInstallments({ id: 'date-test', brut_tutar: 900, taksit_sayisi: 3, sozlesme_tarihi: '2026-01-31T12:00:00Z' });
  assert.deepEqual(installments.map(i => i.due_date), ['2026-01-15', '2026-02-15', '2026-03-15']);
});

await check('student form gross payload is not charged extra fees and discount twice', async db => {
  // EdesisStudentModal submits already computed grossFee as total_fee, with fee components intact.
  await student(db, 'audit-s1', { total_fee: 1000, extra_fees: { book: 100 }, discount_amount: 200 });
  const res = await request(db, '/students/audit-s1'); equal(res.data.remaining, 900);
});
await check('normal student PATCH preserves existing paid installments and signed file', async db => {
  const c = await student(db); await pay(db, c, 200);
  db.sql.exec("UPDATE students SET signed_contract_path='contracts/test.pdf' WHERE id='audit-s1';");
  await request(db, '/students/audit-s1', 'PATCH', { student_phone: '05550000000' });
  equal(row(db, 'SELECT signed_contract_path FROM students').signed_contract_path, 'contracts/test.pdf');
  equal(row(db, 'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1', c.id).paid_amount, 200);
});
await check('monthly report excludes cancelled payments', async db => {
  const c = await student(db); const p = await pay(db, c, 200);
  await request(db, '/payments/cancel', 'POST', { payment_id: p.id });
  const month = row(db, 'SELECT payment_date FROM payments WHERE id=?', p.id).payment_date.slice(0, 7);
  const res = await request(db, '/reports/monthly?month=' + month);
  assert.ok(res.data.includes('Toplam Tahsilat: 0 TL'), 'PDF includes cancelled payment as collected money');
});
await check('exam ranking is computed from results rather than every student ranked first', async db => {
  await student(db); await student(db, 'audit-s2');
  db.sql.exec("INSERT INTO exams(id,title,exam_type,exam_date) VALUES('ex','Audit','TYT','2026-10-14');");
  await request(db, '/exams/ex/results', 'POST', [{ student_id: 'audit-s1', turkish_correct: 10 }, { student_id: 'audit-s2', turkish_correct: 20 }]);
  equal(row(db, "SELECT overall_rank FROM exam_results WHERE student_id='audit-s1'").overall_rank, 2);
});
await check('malformed negative contract installment count is rejected', async db => {
  const res = await request(db, '/contracts', 'POST', { student_id: 'missing-student', student_name: 'Audit', total_amount: 100, installment_count: -3 });
  assert.ok(res.status >= 400, JSON.stringify({ status: res.status, contractCount: row(db, 'SELECT COUNT(*) AS n FROM contracts').n, installmentCount: row(db, 'SELECT COUNT(*) AS n FROM installments').n }));
});
await check('nonexistent payment cancellation cannot clear arbitrary installment balance', async db => {
  const c = await student(db); await pay(db, c, 100);
  const inst = row(db, 'SELECT id FROM installments WHERE contract_id=? AND installment_no=1', c.id);
  await request(db, '/payments/cancel', 'POST', { payment_id: 'does-not-exist', installment_id: inst.id });
  equal(row(db, 'SELECT paid_amount FROM installments WHERE id=?', inst.id).paid_amount, 100);
});
await check('student creation failure rolls back whole student-contract-income operation', async db => {
  db.sql.exec("CREATE TRIGGER fail_contract BEFORE INSERT ON contracts BEGIN SELECT RAISE(ABORT,'audit injected failure'); END;");
  const res = await request(db, '/students', 'POST', { id: 'broken', student_name: 'Audit', total_fee: 1000 });
  assert.ok(res.status >= 500, JSON.stringify({ status: res.status, studentCount: row(db, 'SELECT COUNT(*) AS n FROM students').n, contractCount: row(db, 'SELECT COUNT(*) AS n FROM contracts').n, declaredHasContract: res.data.has_contract }));
  equal(row(db, 'SELECT COUNT(*) AS n FROM students').n, 0);
});
await check('backup failure on a required table is reported rather than empty successful backup', async db => {
  db.sql.exec('DROP TABLE payments');
  const res = await request(db, '/backup', 'POST', {});
  assert.ok(res.status >= 500, JSON.stringify({ status: res.status, paymentsCount: res.data.counts?.payments }));
});
await check('large backup requires durable R2 success before claiming success', async db => {
  await student(db);
  db.sql.prepare('UPDATE students SET photo=?').run('x'.repeat(1500100));
  const res = await request(db, '/backup', 'POST', {}, { env: { BACKUPS: { async put() { throw new Error('audit storage unavailable'); } } } });
  assert.ok(res.status >= 500, JSON.stringify({ status: res.status, r2_saved: res.data.r2_saved, savedPlaceholder: res.data.backup_id ? row(db, 'SELECT snapshot_data FROM system_backups WHERE id=?', res.data.backup_id)?.snapshot_data : null }));
});
await check('backup captured on observed live schema can actually be restored', async db => {
  // These tables are absent in the production D1 schema captured during this audit.
  db.sql.exec('DROP TABLE optical_templates; DROP TABLE optical_printer_profiles; DROP TABLE academic_periods; DROP TABLE data_alerts;');
  await student(db);
  const backup = await request(db, '/backup', 'POST', {}); equal(backup.status, 200);
  const restored = await request(db, '/backup/restore', 'POST', { backup_id: backup.data.backup_id });
  equal(restored.status, 200);
});
await check('ordinary backup and restore on complete schema preserve financial records', async db => {
  const c = await student(db); await pay(db, c, 200);
  const backup = await request(db, '/backup', 'POST', {}); equal(backup.status, 200);
  equal((await request(db, '/students/audit-s1', 'DELETE')).status, 409);
  db.sql.exec('DELETE FROM payments; DELETE FROM students;'); // Simulate corruption only in this isolated test.
  const restored = await request(db, '/backup/restore', 'POST', { backup_id: backup.data.backup_id });
  equal(restored.status, 200);
  equal(row(db, 'SELECT paid_amount FROM students WHERE id=?', c.student_id).paid_amount, 200);
  equal(row(db, 'SELECT COUNT(*) AS n FROM payments').n, 1);
});

// Frontend services use native fetch separately from the axios authentication setup.
process.env.NODE_ENV = 'production';
await check('same payment ID retries after full payment without duplicate money', async db => {
  const c=await student(db);
  const body={id:'stable-payment-id',student_id:c.student_id,contract_id:c.id,installment_no:1,amount:500};
  equal((await request(db,'/payments','POST',body)).status,201);
  equal((await request(db,'/payments','POST',body)).status,200);
  equal(row(db,'SELECT COUNT(*) AS n FROM payments').n,1);
  equal(row(db,'SELECT paid_amount FROM students WHERE id=?',c.student_id).paid_amount,500);
});
await check('concurrent overpayments record at most the remaining installment balance',async db=>{
  const c=await student(db);
  const res=await Promise.all([1,2].map(i=>request(db,'/payments','POST',{id:'race-'+i,student_id:c.student_id,contract_id:c.id,installment_no:1,amount:300})));
  equal(res.filter(r=>r.status===201).length,1);
  equal(row(db,'SELECT SUM(amount) AS n FROM payments').n,300);
  equal(row(db,'SELECT paid_amount FROM installments WHERE contract_id=? AND installment_no=1',c.id).paid_amount,300);
});
await check('payments and cancellation preserve imported opening balances',async db=>{
  const c=await student(db);
  db.sql.exec("UPDATE students SET paid_amount=120;UPDATE installments SET paid_amount=50 WHERE installment_no=1;UPDATE student_incomes SET toplam_tahsilat=80,kalan_alacak=920;");
  const p=await pay(db,c,100);
  equal(row(db,'SELECT paid_amount FROM students').paid_amount,220);
  equal(row(db,'SELECT toplam_tahsilat FROM student_incomes').toplam_tahsilat,180);
  equal((await request(db,'/payments/cancel','POST',{payment_id:p.id})).status,200);
  equal(row(db,'SELECT paid_amount FROM students').paid_amount,120);
  equal(row(db,'SELECT toplam_tahsilat FROM student_incomes').toplam_tahsilat,80);
  equal(row(db,'SELECT paid_amount FROM installments WHERE installment_no=1').paid_amount,50);
});
await check('120-installment plans fit D1 bind limits and have real month-end dates',async db=>{
  const c=await student(db,'audit-s1',{installment_count:120,due_date:'31.01.2027'});
  const plan=rows(db,'SELECT * FROM installments WHERE contract_id=? ORDER BY installment_no',c.id);
  equal(plan.length,120);equal(plan[1].due_date,'2027-02-28');equal(plan[2].due_date,'2027-03-31');
  const res=await request(db,`/contracts/${c.id}/installments`,'PUT',{installments:plan});equal(res.status,200);
});
await check('exam creation and answer keys persist without fabricated scores',async db=>{
  await student(db);
  const created=await request(db,'/exams','POST',{id:'ex',title:'Audit',exam_type:'LGS'});equal(created.status,201);
  equal((await request(db,'/exams/ex','PATCH',{answer_keys:{A:{turkish:'ABCD',religion:'AB'}}})).status,200);
  const res=await request(db,'/exams/ex/results','POST',{student_id:'audit-s1',turkish_correct:3,turkish_incorrect:1,subject_results:{turkish:{d:3,y:1,b:0},religion:{d:2,y:0,b:0}}});equal(res.status,200);
  const result=row(db,'SELECT * FROM exam_results');equal(result.total_net,4.67);equal(result.score,null);equal(JSON.parse(result.subject_results).religion.net,2);
  equal((await request(db,'/exams/ex/results','POST',{student_id:'unknown',turkish_correct:100})).status,422);
  equal(row(db,'SELECT COUNT(*) AS n FROM exam_results').n,1);
});
await check('restore constraint failure rolls back all financial and student records',async db=>{
  await student(db);
  const backup=await request(db,'/backup','POST',{});equal(backup.status,200);
  const snap=JSON.parse(row(db,'SELECT snapshot_data FROM system_backups WHERE id=?',backup.data.backup_id).snapshot_data);
  snap.tables.students.push({...snap.tables.students[0]});
  const before=JSON.stringify(rows(db,'SELECT * FROM students'));
  const res=await request(db,'/backup/upload-restore','POST',{snapshot:snap});equal(res.status,500);
  equal(JSON.stringify(rows(db,'SELECT * FROM students')),before);
  equal(row(db,'SELECT COUNT(*) AS n FROM contracts').n,1);
});
await check('appointments persist and cancelled appointments retain history',async db=>{
  await student(db);
  const a=await request(db,'/appointments','POST',{student_id:'audit-s1',teacher_name:'Audit',subject:'Math',date:'2026-10-15',time_slot:'09:00 - 09:45'});equal(a.status,201);
  equal((await request(db,'/appointments')).data.length,1);
  equal((await request(db,'/appointments/'+a.data.id,'DELETE')).status,200);
  equal(row(db,'SELECT status FROM appointments').status,'iptal');
});
await check('overlapping schedule updates are rejected while adjacent slots are allowed',async db=>{
  const a={class_id:'class-a',day_of_week:1,time_slot:'09:00 - 09:45',subject:'Math',teacher_name:'Audit',room:'R1'};
  equal((await request(db,'/schedules','POST',{...a,id:'a'})).status,201);
  equal((await request(db,'/schedules','POST',{...a,id:'b',time_slot:'09:30 - 10:15'})).status,409);
  equal((await request(db,'/schedules','POST',{...a,id:'c',time_slot:'09:45 - 10:30'})).status,201);
  equal((await request(db,'/schedules/c','PUT',{time_slot:'09:30 - 10:15'})).status,409);
});
await check('printer offsets are stored rather than only acknowledged in the UI',async db=>{
  equal((await request(db,'/optical/printer-profiles','POST',{id:'p-def',name:'Audit Printer',offset_x_mm:1.2,offset_y_mm:-0.8})).status,200);
  equal(row(db,'SELECT offset_y_mm FROM optical_printer_profiles WHERE id=?','p-def').offset_y_mm,-0.8);
});

await check('base64 contract upload supports a 500 KB PDF without argument-stack overflow',async db=>{
  await student(db);
  const res=await request(db,'/students/audit-s1/contract-upload','POST','%PDF-'+'.'.repeat(500000),{headers:{'Content-Type':'application/pdf'}});
  equal(res.status,200);
  assert.ok(row(db,'SELECT signed_contract_path FROM students').signed_contract_path.length>500000);
});
await check('failed contract reads are errors rather than authoritative empty arrays',async db=>{
  db.sql.exec('DROP TABLE contracts');
  equal((await request(db,'/contracts')).status,500);
});
await check('new registration rejects fabricated paid balance and zero installments',async db=>{
  equal((await request(db,'/students','POST',{student_name:'Audit',paid_amount:100,total_fee:1000})).status,422);
  equal((await request(db,'/students','POST',{student_name:'Audit',installment_count:0,total_fee:1000})).status,422);
  equal(row(db,'SELECT COUNT(*) AS n FROM students').n,0);
});

const serviceStorage = new Map();
globalThis.localStorage = { getItem: key => serviceStorage.get(key) ?? null, setItem: (key, value) => serviceStorage.set(key, value), removeItem: key => serviceStorage.delete(key) };
const { default: StudentService } = await import('../frontend/src/lib/edesisStudentService.js');
const { default: AccountingService } = await import('../frontend/src/lib/edesisAccountingService.js');
const nativeFetch = globalThis.fetch;
await check('failed remote save is reported rather than a locally successful student', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }), { status: 401 });
  let rejected = false; let saved;
  try { saved = await StudentService.saveStudent({ id: 'service-fail', student_name: 'Audit' }); } catch { rejected = true; }
  assert.ok(rejected || !saved, '401 response still returned locally saved student');
});
await check('deleting one student preserves another student with the same name in cache', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  StudentService.getAllStudents([{ id: 'same-1', student_name: 'Audit Same Name' }, { id: 'same-2', student_name: 'Audit Same Name' }]);
  await StudentService.deleteStudent({ id: 'same-1', student_name: 'Audit Same Name' });
  equal(StudentService.getBaseStudents().length, 1);
});
await check('authoritative empty students response clears existing cache', async () => {
  StudentService.getAllStudents([{ id: 'cached', student_name: 'Audit' }]);
  equal(StudentService.getAllStudents([]).length, 0);
});
await check('native fetch sends bearer token for a separate API origin', async () => {
  serviceStorage.set('custom_api_url', 'https://inegol-cozum-kurs.pages.dev');
  serviceStorage.set('session_token', 'audit-token'); let options;
  globalThis.fetch = async (url, opts) => { options = opts; return new Response('[]', { status: 200 }); };
  await AccountingService.fetchContracts();
  assert.ok(options?.headers?.Authorization || options?.credentials === 'include', 'no bearer token or cross-origin credentials supplied');
});
globalThis.fetch = nativeFetch;

await check('failed accounting mutations never claim a saved collection or signature',async()=>{
  AccountingService.setInitialData({contracts:[{id:'c',sozlesmeNo:'C',isSigned:false}],collections:[]});
  globalThis.fetch=async()=>new Response(JSON.stringify({detail:'denied'}),{status:401});
  await assert.rejects(AccountingService.recordCollection({studentId:'s',contractId:'c',amount:50}),/denied/);
  equal(AccountingService.getCollections().length,0);
  await assert.rejects(AccountingService.signContract('c'),/denied/);
  equal(AccountingService.getContracts()[0].isSigned,false);
});
await check('in-flight fetch cannot repopulate student or accounting cache after logout',async()=>{
  let resolve;
  globalThis.fetch=()=>new Promise(r=>{resolve=r});
  const pending=AccountingService.fetchContracts();
  AccountingService.resetCustomData();
  resolve(new Response(JSON.stringify([{id:'private-contract',brut_tutar:1000}]),{status:200}));await pending;
  equal(AccountingService.getContracts().length,0);
  const studentsPending=StudentService.fetchStudents();
  StudentService.resetClientData();
  resolve(new Response(JSON.stringify([{id:'private-student',student_name:'Private'}]),{status:200}));await studentsPending;
  equal(StudentService.getAllStudents().length,0);
});

// Evaluate the original JSX component's parser closure, with only React state setters replaced.
const jsxSource = readFileSync(root + 'frontend/src/modules/exams/EdesisOptikSuiteModal.js', 'utf8');
const parser = createRequire(new URL('../frontend/package.json', import.meta.url))('@babel/parser');
const ast = parser.parse(jsxSource, { sourceType: 'module', plugins: ['jsx'] });
let parseFunction,keySaveFunction,defaultSubjectsCode;
function findParser(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.id?.name === 'parseRawText') parseFunction = jsxSource.slice(node.init.start, node.init.end);
  if (node.type === 'VariableDeclarator' && node.id?.name === 'saveAnswerKeys') keySaveFunction=jsxSource.slice(node.init.start,node.init.end);
  if (node.type === 'VariableDeclarator' && node.id?.name === 'defaultSubjects') defaultSubjectsCode=jsxSource.slice(node.init.start,node.init.end);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(findParser);
    else if (value && typeof value === 'object') findParser(value);
  }
}
findParser(ast);
await check('answer-key save retains displayed subject order regardless of typing order',async()=>{
  let saved;
  const defaultSubjects=runInNewContext(defaultSubjectsCode,{exam:{exam_type:'LGS'}});
  const save=runInNewContext('('+keySaveFunction+')',{defaultSubjects,answerKeys:{},keyDraft:{A:{science:'AB',math:'BC',english:'CD',religion:'DA',history:'AB',turkish:'BC'}},API:'/api',exam:{id:'ex'},axios:{async patch(url,body){saved=body.answer_keys;}},setAnswerKeys(){},setParsedRows(){},setUploadMsg(){},onResultsUpdated(){}});
  await save();equal(Object.keys(saved.A).join(','),'turkish,history,religion,english,math,science');
});
await check('unmatched optical row is not assigned to unrelated registered student', async () => {
  let parsed;
  const parse = runInNewContext('(' + parseFunction + ')', {
    answerKeys:{A:{turkish:'ABDCBCCDBAACDAABDCDB',math:'A'.repeat(20),science:'A'.repeat(20),social:'A'.repeat(20)}}, students: [{ id: 'unrelated', student_no: '123', student_name: 'Other Person' }], divisor: 3, isLGS: true,
    setRawText() {}, setUploadMsg() {}, setParsedRows(value) { parsed = value; },
    trIncludes(a, b) { return a.toLowerCase().includes(b.toLowerCase()); },
  });
  parse('999999' + 'Unknown Student'.padEnd(20) + 'A' + 'A'.repeat(80));
  assert.ok(!parsed[0].student_id || parsed[0].student_id !== 'unrelated', JSON.stringify({ matched: parsed[0].isMatched, wronglyAssignedTo: parsed[0].student_id }));
});
await check('optical parser preserves blank answer positions inside a fixed-width record', async () => {
  let parsed;
  const parse = runInNewContext('(' + parseFunction + ')', {
    answerKeys:{A:{turkish:'ABDCBCCDBAACDAABDCDB',math:'A'.repeat(20),science:'A'.repeat(20),social:'A'.repeat(20)}}, students: [{ id: 's', student_no: '123456', student_name: 'Audit' }], divisor: 3, isLGS: true,
    setRawText() {}, setUploadMsg() {}, setParsedRows(value) { parsed = value; },
    trIncludes(a, b) { return a.toLowerCase().includes(b.toLowerCase()); },
  });
  parse('123456' + 'Audit'.padEnd(20) + 'A' + 'ABDCB CDBAACDAABDCDB' + '.'.repeat(60));
  equal(parsed[0].tD, 19);
  equal(parsed[0].tY, 0);
});

const dashboardSource = readFileSync(root + 'frontend/src/components/MuhasebeV2Dashboard.js', 'utf8');
const dashboardAst = parser.parse(dashboardSource, { sourceType: 'module', plugins: ['jsx'] });
const callbacks = {};
function findDashboardCallbacks(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.init?.callee?.name === 'useMemo') {
    const callback = node.init.arguments[0]; callbacks[node.id.name] = dashboardSource.slice(callback.start, callback.end);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(findDashboardCallbacks);
    else if (value && typeof value === 'object') findDashboardCallbacks(value);
  }
}
findDashboardCallbacks(dashboardAst);
await check('dashboard with 21 students derives contract revenue from current records', async () => {
  const students = Array.from({ length: 21 }, (_, i) => ({ id: 's'+i, total_fee: 1000 }));
  const compute = runInNewContext('(' + callbacks.totalContractRevenue + ')', { getEffectiveTotalFee: s => s.total_fee, students, allStudents:students, data:{}, isRealEdesisData: students.length > 20, periodFilter: '2026-2027', extraStats: { extraGross: 0 } });
  equal(compute(), 21000);
});
await check('dashboard with 21 students derives collected money from current payments', async () => {
  const compute = runInNewContext('(' + callbacks.totalCollected + ')', { payments: [{ amount: 200 }], isRealEdesisData: true, periodFilter: '2026-2027', extraStats: { extraColl: 0 } });
  equal(compute(), 200);
});
await check('dashboard with 21 students derives expenses from current expenses', async () => {
  const compute = runInNewContext('(' + callbacks.totalExpenses + ')', { expenses: [{ amount: 10 }], isRealEdesisData: true });
  equal(compute(), 10);
});
await check('dashboard with 21 students has zero overdue debt when no overdue students exist', async () => {
  const compute = runInNewContext('(' + callbacks.totalOverdueDebt + ')', { overdueStudents: [], isRealEdesisData: true, periodFilter: '2026-2027' });
  equal(compute(), 0);
});
await check('small dashboard excludes cancelled payment from collected total', async () => {
  const compute = runInNewContext('(' + callbacks.totalCollected + ')', { payments: [{ amount: 200, is_cancelled: 1 }], isRealEdesisData: false });
  equal(compute(), 0);
});

await check('historical cash does not reduce current contract debt or inherit its income code', async db => {
  const c = await student(db);
  await pay(db,c,100);
  db.sql.prepare("UPDATE student_incomes SET gelir_kodu='GLR202699999' WHERE contract_id=?").run(c.id);
  db.sql.prepare("INSERT INTO payments(id,student_id,amount,method,payment_date) VALUES('historic',?,900,'Nakit','2025-01-01')").run(c.student_id);
  const summary=(await request(db,'/accounting/summary')).data;
  equal(summary.totalCollected,1000); equal(summary.totalRemaining,900);
  const payments=(await request(db,'/payments')).data;
  equal(payments.find(p=>p.id!=='historic').gelir_kodu,'GLR202699999');
  equal(payments.find(p=>p.id==='historic').sozlesme_no,null);
  equal(payments.find(p=>p.id==='historic').gelir_kodu,null);
  const dashboard=(await request(db,'/dashboard')).data;
  equal(dashboard.summary.totalRemaining,900);
});
await check('dashboard debt and collection ratio use the same contracts despite historical cash',async()=>{
  const context={data:{contracts:[{brut_tutar:1000,kalan_alacak:900},{brut_tutar:500,durum:3}]},totalContractRevenue:1000,totalCollected:1000};
  const remaining=runInNewContext('('+callbacks.totalRemaining+')',context)();equal(remaining,900);
  equal(runInNewContext('('+callbacks.collectionRate+')',{...context,totalRemaining:remaining})(),10);
});
await check('historical payment, cancellation and contract edit leave current student balances intact',async db=>{
  const current=await student(db,'current-student');
  const historical=await student(db,'old-student');
  db.sql.prepare("UPDATE contracts SET student_id=?,period_id=40,net_tutar=1000,kdv_tutari=0 WHERE id=?").run(current.student_id,historical.id);
  db.sql.prepare("UPDATE student_incomes SET student_id=?,period_id=40,kdv_orani=0 WHERE contract_id=?").run(current.student_id,historical.id);
  db.sql.prepare("UPDATE installments SET student_id=? WHERE contract_id=?").run(current.student_id,historical.id);
  historical.student_id=current.student_id;
  await pay(db,current,100);
  const oldReceipt=await pay(db,historical,200);
  equal(row(db,'SELECT paid_amount FROM students WHERE id=?',current.student_id).paid_amount,100);
  equal((await request(db,'/payments/cancel','POST',{payment_id:oldReceipt.id})).status,200);
  equal(row(db,'SELECT paid_amount FROM students WHERE id=?',current.student_id).paid_amount,100);
  equal((await request(db,'/contracts/'+historical.id,'PATCH',{brutTutar:1100})).status,200);
  equal(row(db,'SELECT total_fee FROM students WHERE id=?',current.student_id).total_fee,1000);
  const old=row(db,'SELECT net_tutar,kdv_tutari FROM contracts WHERE id=?',historical.id);
  equal(old.net_tutar,1100);equal(old.kdv_tutari,0);
  equal((await request(db,'/payments','POST',{student_id:current.student_id,sozlesme_no:current.sozlesme_no,amount:100})).status,201);
});
await check('global search finds real payments without a nonexistent receipt column',async db=>{
  const c=await student(db);const payment=await pay(db,c,100);
  const result=await request(db,'/search/omni?q=Audit');equal(result.status,200);
  equal(result.data.payments.length,1);equal(result.data.payments[0].id,payment.id);
});

Object.assign(console, originalConsole);
const summary = { tested_at: new Date().toISOString(), runtime: process.version, database: 'isolated in-memory SQLite; actual production router and SQL', passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results };
mkdirSync(root + 'test_reports', { recursive: true });
writeFileSync(root + 'test_reports/audit_real_sqlite_results.json', JSON.stringify(summary, null, 2) + '\n');
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.passed ? '' : ': ' + result.error}`);
console.log(JSON.stringify({ passed: summary.passed, failed: summary.failed }));
process.exitCode = summary.failed ? 1 : 0;
