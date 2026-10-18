-- Notes are independent of financial balances and cancellation status.
ALTER TABLE student_incomes ADD COLUMN notes TEXT DEFAULT '';
