-- Metadata repair only: no DELETE, no financial amount changes.
-- Take a fresh verified full backup first. Run once through D1 migrations.
-- Calendar round-trip prevents changing invalid or ambiguous dates.
UPDATE installments SET due_date=substr(due_date,7,4)||'-'||substr(due_date,4,2)||'-'||substr(due_date,1,2)
WHERE due_date GLOB '[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]'
AND date(substr(due_date,7,4)||'-'||substr(due_date,4,2)||'-'||substr(due_date,1,2),'+0 days')=substr(due_date,7,4)||'-'||substr(due_date,4,2)||'-'||substr(due_date,1,2);

UPDATE installments SET income_id=(SELECT si.id FROM student_incomes si WHERE si.gelir_kodu=installments.income_id)
WHERE income_id!='' AND NOT EXISTS(SELECT 1 FROM student_incomes si WHERE si.id=installments.income_id)
AND (SELECT COUNT(*) FROM student_incomes si WHERE si.gelir_kodu=installments.income_id)=1;

UPDATE installments SET status=CASE WHEN COALESCE(paid_amount,0)>=amount THEN 'Odendi' WHEN COALESCE(paid_amount,0)>0 THEN 'KismenOdendi' ELSE 'Bekliyor' END
WHERE status='Gecikmis' AND date(due_date)>=date('now','+3 hours');
