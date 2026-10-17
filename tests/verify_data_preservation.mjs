// Run: node tests/verify_data_preservation.mjs /absolute/path/to/verified.sqlite
// Writes a separate rehearsal database beside the backup; never modifies the source.
import assert from 'node:assert/strict';
import { copyFileSync, constants, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const source = process.argv[2];
assert.ok(source, 'Supply the verified SQLite backup path');
const hash = () => createHash('sha256').update(readFileSync(source)).digest('hex');
const originalHash = hash();
const clone = source + '.rehearsal-' + Date.now() + '.sqlite';
copyFileSync(source, clone, constants.COPYFILE_EXCL);
const db = new DatabaseSync(clone);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(x => x.name);
const read = () => Object.fromEntries(tables.map(t => [t, db.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
const before = read();
const report = { originalHash, tables: tables.length, counts: Object.fromEntries(tables.map(t => [t, before[t].length])), applied: [], changes: {} };
db.exec('BEGIN');
try {
  for (const file of ['0003_safe_missing_tables_and_exam_keys.sql', '0004_preserve_paid_amount_and_schedule_conflicts.sql', '0005_normalize_unambiguous_installment_references.sql']) {
    db.exec(readFileSync(new URL('../frontend/migrations/' + file, import.meta.url), 'utf8'));
    report.applied.push(file);
  }
  const after = read();
  for (const t of tables) {
    assert.equal(after[t].length, before[t].length, `${t} row count changed`);
    for (let i = 0; i < before[t].length; i++) for (const key of Object.keys(before[t][i])) {
      if (before[t][i][key] !== after[t][i][key]) {
        assert.equal(t, 'installments', `Unexpected changed table ${t}`);
        assert.ok(['due_date', 'income_id', 'status'].includes(key), `Unexpected changed column ${key}`);
        report.changes[key] = (report.changes[key] || 0) + 1;
      }
    }
  }
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM installments WHERE due_date LIKE '__.__.____'").get().n, 0);
  db.exec('COMMIT');
  report.all_original_financial_values_preserved = true;
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
assert.equal(hash(), originalHash, 'Source backup changed');
report.source_file_unchanged = true;
writeFileSync(clone + '.report.json', JSON.stringify(report, null, 2));
writeFileSync(new URL('../test_reports/fix_data_preservation.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
