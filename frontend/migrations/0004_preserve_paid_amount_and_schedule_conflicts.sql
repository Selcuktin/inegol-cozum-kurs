-- Guards affect future edits only; existing records are retained.
CREATE TRIGGER IF NOT EXISTS guard_installment_balance BEFORE UPDATE OF amount,paid_amount ON installments
WHEN NEW.amount < NEW.paid_amount OR NEW.amount < 0 OR NEW.paid_amount < 0
BEGIN SELECT RAISE(ABORT,'INVALID_INSTALLMENT_BALANCE'); END;

CREATE TRIGGER IF NOT EXISTS guard_schedule_insert BEFORE INSERT ON schedules
WHEN EXISTS(SELECT 1 FROM schedules s WHERE s.id!=NEW.id AND s.day_of_week=NEW.day_of_week
  AND substr(replace(s.time_slot,' ',''),1,5)<substr(replace(NEW.time_slot,' ',''),7,5)
  AND substr(replace(s.time_slot,' ',''),7,5)>substr(replace(NEW.time_slot,' ',''),1,5)
  AND (s.class_id=NEW.class_id OR (s.teacher_name=NEW.teacher_name AND NEW.teacher_name!='') OR (s.room=NEW.room AND NEW.room!='')))
BEGIN SELECT RAISE(ABORT,'SCHEDULE_CONFLICT'); END;

CREATE TRIGGER IF NOT EXISTS guard_schedule_update BEFORE UPDATE ON schedules
WHEN EXISTS(SELECT 1 FROM schedules s WHERE s.id!=NEW.id AND s.day_of_week=NEW.day_of_week
  AND substr(replace(s.time_slot,' ',''),1,5)<substr(replace(NEW.time_slot,' ',''),7,5)
  AND substr(replace(s.time_slot,' ',''),7,5)>substr(replace(NEW.time_slot,' ',''),1,5)
  AND (s.class_id=NEW.class_id OR (s.teacher_name=NEW.teacher_name AND NEW.teacher_name!='') OR (s.room=NEW.room AND NEW.room!='')))
BEGIN SELECT RAISE(ABORT,'SCHEDULE_CONFLICT'); END;
