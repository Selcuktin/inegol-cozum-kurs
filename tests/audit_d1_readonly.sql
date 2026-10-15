-- Read-only D1 audit. Contains SELECT only; returns aggregate counts, not personal records.
-- Check names distinguish exact IDs from the legacy stu- prefix accepted by the application.
SELECT 'students' AS table_name, COUNT(*) AS row_count FROM students
UNION ALL SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL SELECT 'student_incomes', COUNT(*) FROM student_incomes
UNION ALL SELECT 'installments', COUNT(*) FROM installments
UNION ALL SELECT 'payments', COUNT(*) FROM payments;

SELECT 'expenses' AS table_name, COUNT(*) AS row_count FROM expenses
UNION ALL SELECT 'classes', COUNT(*) FROM classes
UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules;


SELECT 'exams' AS table_name, COUNT(*) AS row_count FROM exams
UNION ALL SELECT 'exam_results', COUNT(*) FROM exam_results
UNION ALL SELECT 'homework', COUNT(*) FROM homework
UNION ALL SELECT 'homework_submissions', COUNT(*) FROM homework_submissions
UNION ALL SELECT 'mentorship', COUNT(*) FROM mentorship;

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL SELECT 'system_sequences', COUNT(*) FROM system_sequences
UNION ALL SELECT 'system_backups', COUNT(*) FROM system_backups
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;



SELECT 'contracts_orphan_student_exact' AS check_name, COUNT(*) AS issue_count
FROM contracts c WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=c.student_id)
UNION ALL SELECT 'contracts_orphan_student_with_legacy_prefix', COUNT(*) FROM contracts c
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=c.student_id OR s.id='stu-'||c.student_id OR 'stu-'||s.id=c.student_id)
UNION ALL SELECT 'income_missing_contract_id', COUNT(*) FROM student_incomes WHERE COALESCE(contract_id,'')=''
UNION ALL SELECT 'income_orphan_contract_id', COUNT(*) FROM student_incomes i WHERE COALESCE(i.contract_id,'')<>'' AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.id=i.contract_id)
UNION ALL SELECT 'income_orphan_contract_even_by_number', COUNT(*) FROM student_incomes i WHERE NOT EXISTS (SELECT 1 FROM contracts c WHERE c.id=i.contract_id OR c.sozlesme_no=i.sozlesme_no);

SELECT 'income_orphan_student_with_legacy_prefix' AS check_name, COUNT(*) AS issue_count FROM student_incomes i WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=i.student_id OR s.id='stu-'||i.student_id OR 'stu-'||s.id=i.student_id)
UNION ALL SELECT 'installment_orphan_contract', COUNT(*) FROM installments i WHERE NOT EXISTS (SELECT 1 FROM contracts c WHERE c.id=i.contract_id OR c.sozlesme_no=i.contract_id)
UNION ALL SELECT 'installment_orphan_student_with_legacy_prefix', COUNT(*) FROM installments i WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=i.student_id OR s.id='stu-'||i.student_id OR 'stu-'||s.id=i.student_id)
UNION ALL SELECT 'installment_orphan_income_exact', COUNT(*) FROM installments i WHERE COALESCE(i.income_id,'')<>'' AND NOT EXISTS (SELECT 1 FROM student_incomes g WHERE g.id=i.income_id)
UNION ALL SELECT 'installment_orphan_income_even_by_code', COUNT(*) FROM installments i WHERE COALESCE(i.income_id,'')<>'' AND NOT EXISTS (SELECT 1 FROM student_incomes g WHERE g.id=i.income_id OR g.gelir_kodu=i.income_id);


SELECT 'payment_orphan_student_with_legacy_prefix' AS check_name, COUNT(*) AS issue_count FROM payments p WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=p.student_id OR s.id='stu-'||p.student_id OR 'stu-'||s.id=p.student_id)
UNION ALL SELECT 'payment_empty_contract_id', COUNT(*) FROM payments WHERE COALESCE(contract_id,'')=''
UNION ALL SELECT 'payment_empty_installment_id', COUNT(*) FROM payments WHERE COALESCE(installment_id,'')=''
UNION ALL SELECT 'payment_orphan_contract', COUNT(*) FROM payments p WHERE COALESCE(p.contract_id,'')<>'' AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.id=p.contract_id)
UNION ALL SELECT 'payment_orphan_installment', COUNT(*) FROM payments p WHERE COALESCE(p.installment_id,'')<>'' AND NOT EXISTS (SELECT 1 FROM installments i WHERE i.id=p.installment_id);

SELECT 'payment_contract_wrong_student' AS check_name, COUNT(*) AS issue_count FROM payments p JOIN contracts c ON c.id=p.contract_id WHERE p.student_id<>c.student_id AND p.student_id<>'stu-'||c.student_id AND 'stu-'||p.student_id<>c.student_id
UNION ALL SELECT 'payment_installment_wrong_student', COUNT(*) FROM payments p JOIN installments i ON i.id=p.installment_id WHERE p.student_id<>i.student_id AND p.student_id<>'stu-'||i.student_id AND 'stu-'||p.student_id<>i.student_id
UNION ALL SELECT 'payment_installment_wrong_contract', COUNT(*) FROM payments p JOIN installments i ON i.id=p.installment_id WHERE COALESCE(p.contract_id,'')<>'' AND p.contract_id<>i.contract_id
UNION ALL SELECT 'students_paid_vs_payment_sum_mismatch', COUNT(*) FROM students s WHERE ABS(COALESCE(s.paid_amount,0)-(SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE (p.student_id=s.id OR p.student_id='stu-'||s.id OR 'stu-'||p.student_id=s.id) AND COALESCE(p.is_cancelled,0)=0))>0.01
UNION ALL SELECT 'installment_paid_vs_payment_sum_mismatch', COUNT(*) FROM installments i WHERE ABS(COALESCE(i.paid_amount,0)-(SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.installment_id=i.id AND COALESCE(p.is_cancelled,0)=0))>0.01;


SELECT 'income_balance_equation_mismatch' AS check_name, COUNT(*) AS issue_count FROM student_incomes WHERE ABS(COALESCE(brut_tutar,0)-COALESCE(toplam_tahsilat,0)-COALESCE(kalan_alacak,0))>0.01
UNION ALL SELECT 'income_paid_vs_contract_payment_sum_mismatch', COUNT(*) FROM student_incomes g WHERE COALESCE(g.is_deleted,0)=0 AND ABS(COALESCE(g.toplam_tahsilat,0)-(SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.contract_id=g.contract_id AND COALESCE(p.is_cancelled,0)=0))>0.01
UNION ALL SELECT 'active_contract_missing_installments', COUNT(*) FROM contracts c WHERE COALESCE(c.is_deleted,0)=0 AND NOT EXISTS (SELECT 1 FROM installments i WHERE i.contract_id=c.id)
UNION ALL SELECT 'active_contract_installment_sum_mismatch', COUNT(*) FROM contracts c WHERE COALESCE(c.is_deleted,0)=0 AND ABS(COALESCE(c.brut_tutar,0)-(SELECT COALESCE(SUM(i.amount),0) FROM installments i WHERE i.contract_id=c.id))>0.01
UNION ALL SELECT 'active_contract_installment_count_mismatch', COUNT(*) FROM contracts c WHERE COALESCE(c.is_deleted,0)=0 AND c.taksit_sayisi<>(SELECT COUNT(*) FROM installments i WHERE i.contract_id=c.id);

SELECT 'active_contract_without_student_income' AS check_name, COUNT(*) AS issue_count FROM contracts c WHERE COALESCE(c.is_deleted,0)=0 AND NOT EXISTS (SELECT 1 FROM student_incomes g WHERE COALESCE(g.is_deleted,0)=0 AND (g.contract_id=c.id OR g.sozlesme_no=c.sozlesme_no))
UNION ALL SELECT 'students_invalid_extra_fees_json', COUNT(*) FROM students WHERE NOT json_valid(COALESCE(extra_fees,'{}'))
UNION ALL SELECT 'students_negative_money', COUNT(*) FROM students WHERE total_fee<0 OR paid_amount<0 OR discount_amount<0
UNION ALL SELECT 'contracts_negative_amount_or_invalid_count', COUNT(*) FROM contracts WHERE brut_tutar<0 OR taksit_sayisi<1
UNION ALL SELECT 'installments_negative_or_overpaid', COUNT(*) FROM installments WHERE amount<0 OR paid_amount<0 OR paid_amount>amount+0.01;


SELECT 'payments_nonpositive_amount' AS check_name, COUNT(*) AS issue_count FROM payments WHERE amount<=0
UNION ALL SELECT 'expenses_nonpositive_amount', COUNT(*) FROM expenses WHERE amount<=0
UNION ALL SELECT 'installments_invalid_due_date', COUNT(*) FROM installments WHERE LENGTH(due_date)<>10 OR date(due_date) IS NULL
UNION ALL SELECT 'paid_status_with_unpaid_balance', COUNT(*) FROM installments WHERE status='Odendi' AND paid_amount<amount-0.01
UNION ALL SELECT 'full_paid_balance_with_unpaid_status', COUNT(*) FROM installments WHERE status<>'Odendi' AND amount>0 AND paid_amount>=amount;

SELECT 'cancelled_status_without_cancel_flag' AS check_name, COUNT(*) AS issue_count FROM payments WHERE status IN ('İptal Edildi','cancelled') AND COALESCE(is_cancelled,0)=0
UNION ALL SELECT 'attendance_orphan_students', COUNT(*) FROM attendance a WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=a.student_id OR s.id='stu-'||a.student_id OR 'stu-'||s.id=a.student_id)
UNION ALL SELECT 'exam_results_orphan_students', COUNT(*) FROM exam_results r WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=r.student_id OR s.id='stu-'||r.student_id OR 'stu-'||s.id=r.student_id)
UNION ALL SELECT 'exam_results_orphan_exam', COUNT(*) FROM exam_results r WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.id=r.exam_id)
UNION ALL SELECT 'mentorship_orphan_students', COUNT(*) FROM mentorship m WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=m.student_id OR s.id='stu-'||m.student_id OR 'stu-'||s.id=m.student_id);


SELECT 'homework_submissions_orphan_homework' AS check_name, COUNT(*) AS issue_count FROM homework_submissions h WHERE NOT EXISTS (SELECT 1 FROM homework w WHERE w.id=h.homework_id)
UNION ALL SELECT 'homework_submissions_orphan_students', COUNT(*) FROM homework_submissions h WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id=h.student_id OR s.id='stu-'||h.student_id OR 'stu-'||s.id=h.student_id)
UNION ALL SELECT 'schedules_invalid_weekday', COUNT(*) FROM schedules WHERE day_of_week NOT BETWEEN 1 AND 7
UNION ALL SELECT 'schedules_orphan_class', COUNT(*) FROM schedules sc WHERE NOT EXISTS (SELECT 1 FROM classes c WHERE c.id=sc.class_id OR c.name=sc.class_id)
UNION ALL SELECT 'homework_orphan_class', COUNT(*) FROM homework h WHERE NOT EXISTS (SELECT 1 FROM classes c WHERE c.id=h.class_id OR c.name=h.class_id);

SELECT 'orphan_user_sessions' AS check_name, COUNT(*) AS issue_count FROM user_sessions u WHERE NOT EXISTS (SELECT 1 FROM users v WHERE v.user_id=u.user_id);



SELECT 'active_contracts_duplicate_student_period' AS check_name, COUNT(*) AS issue_count FROM
(SELECT student_id,period_id FROM contracts WHERE COALESCE(is_deleted,0)=0 GROUP BY student_id,period_id HAVING COUNT(*)>1)
UNION ALL SELECT 'active_incomes_duplicate_contract_number', COUNT(*) FROM
(SELECT sozlesme_no FROM student_incomes WHERE COALESCE(is_deleted,0)=0 AND COALESCE(sozlesme_no,'')<>'' GROUP BY sozlesme_no HAVING COUNT(*)>1)
UNION ALL SELECT 'duplicate_student_tc', COUNT(*) FROM
(SELECT student_tc FROM students WHERE COALESCE(student_tc,'')<>'' GROUP BY student_tc HAVING COUNT(*)>1)
UNION ALL SELECT 'duplicate_attendance_student_day_lesson', COUNT(*) FROM
(SELECT student_id,date,lesson_slot FROM attendance GROUP BY student_id,date,lesson_slot HAVING COUNT(*)>1)
UNION ALL SELECT 'duplicate_exam_student', COUNT(*) FROM
(SELECT exam_id,student_id FROM exam_results GROUP BY exam_id,student_id HAVING COUNT(*)>1);

SELECT 'duplicate_homework_submission' AS check_name, COUNT(*) AS issue_count FROM
(SELECT homework_id,student_id FROM homework_submissions GROUP BY homework_id,student_id HAVING COUNT(*)>1)
UNION ALL SELECT 'duplicate_class_schedule_slot', COUNT(*) FROM
(SELECT class_id,day_of_week,time_slot FROM schedules GROUP BY class_id,day_of_week,time_slot HAVING COUNT(*)>1)
UNION ALL SELECT 'duplicate_teacher_schedule_slot', COUNT(*) FROM
(SELECT teacher_name,day_of_week,time_slot FROM schedules WHERE COALESCE(teacher_name,'')<>'' GROUP BY teacher_name,day_of_week,time_slot HAVING COUNT(*)>1)
UNION ALL SELECT 'duplicate_room_schedule_slot', COUNT(*) FROM
(SELECT room,day_of_week,time_slot FROM schedules WHERE COALESCE(room,'')<>'' GROUP BY room,day_of_week,time_slot HAVING COUNT(*)>1);



SELECT 'active_contract_gross' AS metric, ROUND(COALESCE(SUM(brut_tutar),0),2) AS amount FROM contracts WHERE COALESCE(is_deleted,0)=0
UNION ALL SELECT 'uncancelled_payment_total', ROUND(COALESCE(SUM(amount),0),2) FROM payments WHERE COALESCE(is_cancelled,0)=0
UNION ALL SELECT 'cancelled_payment_total', ROUND(COALESCE(SUM(amount),0),2) FROM payments WHERE is_cancelled=1
UNION ALL SELECT 'student_paid_total', ROUND(COALESCE(SUM(paid_amount),0),2) FROM students
UNION ALL SELECT 'active_income_collected_total', ROUND(COALESCE(SUM(toplam_tahsilat),0),2) FROM student_incomes WHERE COALESCE(is_deleted,0)=0;

SELECT 'active_income_remaining_total' AS metric, ROUND(COALESCE(SUM(kalan_alacak),0),2) AS amount FROM student_incomes WHERE COALESCE(is_deleted,0)=0
UNION ALL SELECT 'installment_amount_total', ROUND(COALESCE(SUM(amount),0),2) FROM installments
UNION ALL SELECT 'installment_paid_total', ROUND(COALESCE(SUM(paid_amount),0),2) FROM installments
UNION ALL SELECT 'expense_total', ROUND(COALESCE(SUM(amount),0),2) FROM expenses;



SELECT backup_type, COUNT(*) AS backup_count, MAX(created_at) AS latest_backup,
SUM(CASE WHEN snapshot_data='{}' THEN 1 ELSE 0 END) AS placeholder_count,
MIN(LENGTH(snapshot_data)) AS min_snapshot_chars, MAX(LENGTH(snapshot_data)) AS max_snapshot_chars
FROM system_backups GROUP BY backup_type;



SELECT name, sql FROM sqlite_master WHERE type='index' ORDER BY name;
