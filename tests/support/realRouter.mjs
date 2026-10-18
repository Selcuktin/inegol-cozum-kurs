import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {onRequest} from '../../frontend/functions/api/[[route]].js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(root + 'frontend/schema.sql', 'utf8'));
  sql.exec('DELETE FROM students; DELETE FROM contracts; DELETE FROM student_incomes; DELETE FROM classes;');
  const count=()=>{db.queries++;assert(db.queries<=db.queryLimit,'D1 query budget exceeded');};
  const db = {
    sql,queries:0,queryLimit:Infinity,
    prepare(query) {
      let params = [];
      const statement = {
        bind(...values) { assert.ok(values.length<=100,"D1 accepts at most 100 bind parameters"); params = values; return statement; },
        async first() { count();return sql.prepare(query).get(...params) || null; },
        async all() { count();return { results: sql.prepare(query).all(...params) }; },
        async run() { count();sql.prepare(query).run(...params); return { success: true }; },
        execute() { count();const stmt=sql.prepare(query); if(stmt.columns().length) return {success:true,results:stmt.all(...params)}; stmt.run(...params); return { success: true }; },
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

export function row(db, query, ...params) { return db.sql.prepare(query).get(...params); }
export function rows(db, query, ...params) { return db.sql.prepare(query).all(...params); }
export function equal(actual, expected) { assert.equal(actual, expected, JSON.stringify({ actual, expected })); }
export async function request(db, path, method = 'GET', body, options = {}) {
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
export async function student(db, id = 'audit-s1', patch = {}) {
  const res = await request(db, '/students', 'POST', { id, student_name: 'Audit Student', parent_name: 'Audit Parent', total_fee: 1000, installment_count: 2, ...patch });
  assert.ok([200,201].includes(res.status), JSON.stringify(res));
  return row(db, 'SELECT * FROM contracts WHERE student_id=?', id);
}
export async function pay(db, contract, amount, no = 1) {
  const res = await request(db, '/payments', 'POST', { student_id: contract.student_id, contract_id: contract.id, installment_no: no, amount });
  equal(res.status, 201);
  return res.data;
}
