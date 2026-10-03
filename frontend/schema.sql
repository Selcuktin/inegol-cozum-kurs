CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_phone TEXT DEFAULT '',
  school TEXT DEFAULT '',
  student_class TEXT DEFAULT '',
  student_tc TEXT DEFAULT '',
  student_address TEXT DEFAULT '',
  parent_name TEXT NOT NULL,
  parent_phone TEXT DEFAULT '',
  parent_tc TEXT DEFAULT '',
  parent_address TEXT DEFAULT '',
  mother_tc TEXT DEFAULT '',
  mother_name TEXT DEFAULT '',
  mother_job TEXT DEFAULT '',
  mother_phone TEXT DEFAULT '',
  mother_work_phone TEXT DEFAULT '',
  mother_address TEXT DEFAULT '',
  mother_work_address TEXT DEFAULT '',
  mother_email TEXT DEFAULT '',
  father_job TEXT DEFAULT '',
  father_work_phone TEXT DEFAULT '',
  father_work_address TEXT DEFAULT '',
  father_email TEXT DEFAULT '',
  guardian_tc TEXT DEFAULT '',
  guardian_name TEXT DEFAULT '',
  guardian_job TEXT DEFAULT '',
  guardian_phone TEXT DEFAULT '',
  guardian_home_phone TEXT DEFAULT '',
  guardian_work_phone TEXT DEFAULT '',
  guardian_home_address TEXT DEFAULT '',
  guardian_work_address TEXT DEFAULT '',
  guardian_email TEXT DEFAULT '',
  program TEXT DEFAULT '',
  total_fee REAL DEFAULT 0,
  extra_fees TEXT DEFAULT '{}',
  discount_type TEXT DEFAULT '',
  discount_amount REAL DEFAULT 0,
  discount_note TEXT DEFAULT '',
  paid_amount REAL DEFAULT 0,
  installment_count INTEGER DEFAULT 1,
  due_date TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  signed_contract_path TEXT DEFAULT '',
  signed_contract_filename TEXT DEFAULT '',
  signed_contract_uploaded_at TEXT DEFAULT '',
  signed_contract_content_type TEXT DEFAULT '',
  student_no TEXT DEFAULT '',
  gender TEXT DEFAULT 'Erkek',
  birth_date TEXT DEFAULT '',
  department TEXT DEFAULT 'Sayısal',
  status TEXT DEFAULT 'Kayitli',
  din_muaf INTEGER DEFAULT 0,
  ing_muaf INTEGER DEFAULT 0,
  uses_service INTEGER DEFAULT 0,
  diploma_grade REAL DEFAULT 0,
  primary_parent TEXT DEFAULT 'baba',
  health_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT DEFAULT '',
  room TEXT DEFAULT '',
  capacity INTEGER DEFAULT 20,
  teacher TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  bank TEXT DEFAULT '',
  payment_date TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  category TEXT DEFAULT 'Genel',
  account TEXT DEFAULT 'Nakit Ana Kasa',
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT DEFAULT '',
  role TEXT DEFAULT 'ogretmen',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT '',
  user_name TEXT DEFAULT '',
  user_email TEXT DEFAULT '',
  user_role TEXT DEFAULT '',
  action TEXT DEFAULT '',
  target_type TEXT DEFAULT '',
  target_id TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

-- Seed initial students
INSERT OR IGNORE INTO students (id, student_name, student_phone, school, student_class, student_tc, student_address, parent_name, parent_phone, parent_tc, parent_address, program, total_fee, paid_amount, installment_count, due_date, created_at)
VALUES 
('student-001', 'Eylül Yılmaz', '0532 440 21 18', 'İnegöl Anadolu Lisesi', '11-A', '', 'İnegöl / Bursa', 'Murat Yılmaz', '0532 440 21 18', '', 'İnegöl / Bursa', 'TYT - AYT', 24000, 12000, 6, '2026-04-15', datetime('now')),
('student-002', 'Arda Demir', '0541 309 87 40', 'İnegöl Borsa İstanbul', '8-B', '', 'İnegöl / Bursa', 'Selin Demir', '0541 309 87 40', '', 'İnegöl / Bursa', 'LGS Hazırlık', 18000, 6000, 6, '2026-03-28', datetime('now'));

-- Seed initial classes
INSERT OR IGNORE INTO classes (id, name, level, room, capacity, teacher, created_at)
VALUES
('class-001', 'TYT - AYT', '11. Sınıf', 'Derslik 2', 24, 'Ayşe Kaya', datetime('now')),
('class-002', 'LGS Hazırlık', '8. Sınıf', 'Derslik 1', 20, 'Mehmet Çelik', datetime('now'));

-- Seed initial users
INSERT OR IGNORE INTO users (user_id, email, name, role, created_at)
VALUES
('user_admin', 'kayrasemihseymen@gmail.com', 'Semih Seymen (Yönetici)', 'admin', datetime('now')),
('user_admin2', 'inegolcozumkurs@gmail.com', 'İnegöl Çözüm (Yönetici)', 'admin', datetime('now')),
('user_accounting', 'info@inegolcozumkurs.com', 'Muhasebe Sorumlusu', 'muhasebe', datetime('now')),
('user_teacher', 'ogretmen@inegolcozumkurs.com', 'Ayşe Kaya (Öğretmen)', 'ogretmen', datetime('now'));

-- ================= EDESIS ERP EXTENSIONS =================
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  publisher TEXT DEFAULT '',
  exam_date TEXT NOT NULL,
  booklet_types TEXT DEFAULT 'A,B',
  status TEXT DEFAULT 'completed',
  description TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  booklet TEXT DEFAULT 'A',
  turkish_correct REAL DEFAULT 0,
  turkish_incorrect REAL DEFAULT 0,
  turkish_net REAL DEFAULT 0,
  math_correct REAL DEFAULT 0,
  math_incorrect REAL DEFAULT 0,
  math_net REAL DEFAULT 0,
  science_correct REAL DEFAULT 0,
  science_incorrect REAL DEFAULT 0,
  science_net REAL DEFAULT 0,
  social_correct REAL DEFAULT 0,
  social_incorrect REAL DEFAULT 0,
  social_net REAL DEFAULT 0,
  total_net REAL DEFAULT 0,
  score REAL DEFAULT 0,
  class_rank INTEGER DEFAULT 0,
  overall_rank INTEGER DEFAULT 0,
  weak_topics TEXT DEFAULT '[]',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  lesson_slot TEXT DEFAULT 'Tüm Gün',
  status TEXT NOT NULL DEFAULT 'geldi',
  note TEXT DEFAULT '',
  notified_parent INTEGER DEFAULT 0,
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  time_slot TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  room TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  source_book TEXT DEFAULT '',
  description TEXT DEFAULT '',
  due_date TEXT NOT NULL,
  teacher_name TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id TEXT PRIMARY KEY,
  homework_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'yapildi',
  note TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS mentorship (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  mentor_name TEXT NOT NULL,
  session_date TEXT NOT NULL,
  target_uni TEXT DEFAULT '',
  target_department TEXT DEFAULT '',
  weekly_target_questions INTEGER DEFAULT 0,
  solved_questions INTEGER DEFAULT 0,
  topics_covered TEXT DEFAULT '',
  next_session_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

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

INSERT OR IGNORE INTO academic_periods (id, tenant_id, name, is_active, start_date, end_date)
VALUES (113, 6114, '2024-2025 Eğitim Öğretim Yılı (Aktif)', 1, '2024-09-09', '2025-06-20');

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

INSERT OR IGNORE INTO optical_templates (id, name, exam_type, paper_size, columns_count, question_count, created_at)
VALUES 
('opt-lgs-90', 'LGS 90 Soru Tek Oturum Standart Form', 'LGS', 'A4', 4, 90, datetime('now')),
('opt-tyt-120', 'TYT 120 Soru Standart ÖSYM Formu', 'TYT', 'A4', 4, 120, datetime('now')),
('opt-ayt-160', 'AYT 160 Soru 4 Branş Formu', 'AYT', 'A4', 4, 160, datetime('now')),
('opt-kds-60', 'KDS / HBS 60 Soru Ara Sınıf Formu', 'KDS', 'A5', 3, 60, datetime('now'));

INSERT OR IGNORE INTO optical_printer_profiles (id, name, offset_x_mm, offset_y_mm, is_default, scale_verified, created_at)
VALUES
('p-def', 'Varsayılan Yazıcı (Standart A4)', 0.0, 0.0, 1, 1, datetime('now')),
('p-epson', 'Epson L8050 Yüksek Hızlı Fotoğraf/Optik', 1.2, -0.8, 0, 1, datetime('now')),
('p-hp', 'HP LaserJet Pro Enterprise', -0.5, 1.0, 0, 1, datetime('now'));


