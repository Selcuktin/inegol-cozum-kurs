-- Additive migration: no deletion, no financial changes, no demo student insertion.
ALTER TABLE exams ADD COLUMN answer_keys TEXT DEFAULT '{}';
ALTER TABLE exam_results ADD COLUMN subject_results TEXT DEFAULT '{}';

-- ================= EDESIS PARITY EXTENSIONS =================
CREATE TABLE IF NOT EXISTS academic_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER DEFAULT 6114,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS data_alerts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ================= OPTICAL & OMR EXTENSIONS =================
CREATE TABLE IF NOT EXISTS optical_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  paper_size TEXT DEFAULT 'A4',
  columns_count INTEGER DEFAULT 4,
  question_count INTEGER DEFAULT 90,
  param_config TEXT DEFAULT '{}',
  lesson_config TEXT DEFAULT '[]',
  fmt_content TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS optical_printer_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  offset_x_mm REAL DEFAULT 0,
  offset_y_mm REAL DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  scale_verified INTEGER DEFAULT 1,
  created_at TEXT DEFAULT ''
);


CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  room TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  status TEXT DEFAULT 'onaylandi',
  created_at TEXT DEFAULT ''
);
