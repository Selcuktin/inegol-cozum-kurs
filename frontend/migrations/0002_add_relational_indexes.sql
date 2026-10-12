-- Phase 1 & 2: Covering Relational Indexes for Foreign Reference Integrity and Fast Queries
CREATE INDEX IF NOT EXISTS idx_contracts_student_id ON contracts(student_id);
CREATE INDEX IF NOT EXISTS idx_contracts_sozlesme_no ON contracts(sozlesme_no);
CREATE INDEX IF NOT EXISTS idx_contracts_is_deleted ON contracts(is_deleted);

CREATE INDEX IF NOT EXISTS idx_student_incomes_student_id ON student_incomes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_incomes_contract_id ON student_incomes(contract_id);
CREATE INDEX IF NOT EXISTS idx_student_incomes_sozlesme_no ON student_incomes(sozlesme_no);
CREATE INDEX IF NOT EXISTS idx_student_incomes_is_deleted ON student_incomes(is_deleted);

CREATE INDEX IF NOT EXISTS idx_installments_student_id ON installments(student_id);
CREATE INDEX IF NOT EXISTS idx_installments_contract_id ON installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_installment_id ON payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_payments_is_cancelled ON payments(is_cancelled);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
