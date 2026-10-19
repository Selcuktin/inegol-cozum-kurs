-- Match the overdue query's legacy-date normalization without changing stored dates.
-- Future installments need not be scanned on every dashboard refresh.
CREATE INDEX IF NOT EXISTS idx_installments_due_normalized
ON installments (
  date(CASE WHEN due_date LIKE '__.__.____'
    THEN substr(due_date,7,4)||'-'||substr(due_date,4,2)||'-'||substr(due_date,1,2)
    ELSE due_date END),
  contract_id, amount, paid_amount
);

-- Preserve the legacy ID matching semantics while avoiding a student scan per contract.
CREATE INDEX IF NOT EXISTS idx_students_legacy_id ON students(CAST(REPLACE(id, 'stu-', '') AS TEXT));
