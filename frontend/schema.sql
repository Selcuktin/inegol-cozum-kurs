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
  sozlesme_no TEXT DEFAULT '',
  primary_parent TEXT DEFAULT 'baba',
  health_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_by_name TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  title TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  classes TEXT DEFAULT '',
  weekly_hours INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Aktif',
  role TEXT DEFAULT 'ogretmen',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS system_backups (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  backup_type TEXT NOT NULL,
  snapshot_data TEXT NOT NULL,
  table_counts TEXT NOT NULL,
  created_by TEXT DEFAULT 'Sistem',
  notes TEXT DEFAULT ''
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
  created_at TEXT DEFAULT '',
  status TEXT DEFAULT 'Odendi',
  installment_id TEXT DEFAULT '',
  contract_id TEXT DEFAULT '',
  is_cancelled INTEGER DEFAULT 0
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

-- ================= EDESIS CONTRACTS & INCOMES =================
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  sozlesme_no TEXT UNIQUE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_no TEXT DEFAULT '',
  student_class TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  period_id INTEGER DEFAULT 113,
  period_name TEXT DEFAULT '2026-2027',
  net_tutar REAL DEFAULT 0,
  kdv_tutari REAL DEFAULT 0,
  brut_tutar REAL DEFAULT 0,
  odeme_turu INTEGER DEFAULT 1,
  odeme_turu_text TEXT DEFAULT 'Taksitli (10 Taksit)',
  taksit_sayisi INTEGER DEFAULT 10,
  durum INTEGER DEFAULT 1,
  is_signed INTEGER DEFAULT 0,
  veli_imza_alindi INTEGER DEFAULT 0,
  kurum_imza_alindi INTEGER DEFAULT 0,
  kurum_imzalayan TEXT DEFAULT '',
  kurum_imzalayan_unvan TEXT DEFAULT '',
  signed_at TEXT DEFAULT '',
  sozlesme_tarihi TEXT NOT NULL,
  baslama_tarihi TEXT DEFAULT '',
  bitis_tarihi TEXT DEFAULT '',
  sozlesme_url TEXT DEFAULT '',
  iptal_nedeni TEXT DEFAULT '',
  iptal_tarihi TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_incomes (
  id TEXT PRIMARY KEY,
  gelir_kodu TEXT UNIQUE,
  contract_id TEXT DEFAULT '',
  sozlesme_no TEXT DEFAULT '',
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_no TEXT DEFAULT '',
  student_class TEXT DEFAULT '',
  musteri_unvan TEXT DEFAULT '',
  title TEXT NOT NULL,
  period_id INTEGER DEFAULT 113,
  period_name TEXT DEFAULT '2026-2027',
  kategori_id INTEGER DEFAULT 87,
  kategori_adi TEXT DEFAULT 'Öğrenci Sözleşmesi',
  net_tutar REAL DEFAULT 0,
  kdv_orani REAL DEFAULT 10,
  kdv_tutari REAL DEFAULT 0,
  brut_tutar REAL DEFAULT 0,
  toplam_tahsilat REAL DEFAULT 0,
  kalan_alacak REAL DEFAULT 0,
  tam_tahsil_edildi_mi INTEGER DEFAULT 0,
  gelir_tarihi TEXT NOT NULL,
  vade_tarihi TEXT NOT NULL,
  taksitli_mi INTEGER DEFAULT 1,
  taksit_sayisi INTEGER DEFAULT 10,
  kalan_taksit_sayisi INTEGER DEFAULT 10,
  durum INTEGER DEFAULT 1,
  durum_text TEXT DEFAULT 'Enum_GelirDurumu_1',
  created_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  income_id TEXT DEFAULT '',
  student_id TEXT NOT NULL,
  installment_no INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'Bekliyor',
  payment_date TEXT DEFAULT '',
  receipt_no TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(contract_id, installment_no)
);

CREATE INDEX IF NOT EXISTS idx_installments_contract ON installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_installments_student ON installments(student_id);
CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_student ON contracts(student_id);
CREATE INDEX IF NOT EXISTS idx_incomes_student ON student_incomes(student_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_students_tc ON students(student_tc);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(student_class);

CREATE TABLE IF NOT EXISTS system_sequences (
  name TEXT PRIMARY KEY,
  current_val INTEGER NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_sozlesme_no ON contracts(sozlesme_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incomes_gelir_kodu ON student_incomes(gelir_kodu);

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

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Seed initial students
INSERT OR IGNORE INTO students (id, student_name, student_phone, school, student_class, student_tc, student_address, parent_name, parent_phone, parent_tc, parent_address, program, total_fee, paid_amount, installment_count, due_date, created_at)
VALUES 
('student-001', 'Örnek Öğrenci 1', '0555 000 00 01', 'İnegöl Anadolu Lisesi', '11-A', '10000000001', 'İnegöl / Bursa', 'Veli 1', '0555 000 00 02', '20000000001', 'İnegöl / Bursa', 'TYT - AYT', 24000, 12000, 6, '2026-04-15', datetime('now')),
('student-002', 'Örnek Öğrenci 2', '0555 000 00 03', 'İnegöl Borsa İstanbul', '8-B', '10000000002', 'İnegöl / Bursa', 'Veli 2', '0555 000 00 04', '20000000002', 'İnegöl / Bursa', 'LGS Hazırlık', 18000, 6000, 6, '2026-03-28', datetime('now'));

-- Seed initial classes
INSERT OR IGNORE INTO classes (id, name, level, room, capacity, teacher, created_at)
VALUES
('class-001', 'TYT - AYT', '11. Sınıf', 'Derslik 2', 24, 'Öğretmen 1', datetime('now')),
('class-002', 'LGS Hazırlık', '8. Sınıf', 'Derslik 1', 20, 'Öğretmen 2', datetime('now'));

-- Seed initial users
INSERT OR IGNORE INTO users (user_id, email, name, role, created_at)
VALUES
('user_admin', 'admin@inegolcozumkurs.com', 'Yönetici (Admin)', 'admin', datetime('now')),
('user_admin2', 'yonetici@inegolcozumkurs.com', 'İnegöl Çözüm Yönetici', 'admin', datetime('now')),
('user_accounting', 'muhasebe@inegolcozumkurs.com', 'Muhasebe Sorumlusu', 'muhasebe', datetime('now')),
('user_teacher', 'ogretmen@inegolcozumkurs.com', 'Örnek Öğretmen', 'ogretmen', datetime('now'));

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




-- Migration Seed for contracts and student_incomes (Anonymized demo records)
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES 
('cnt_demo_001', 'SZL202600001', 'student-001', 'Örnek Öğrenci 1', '11-A', 113, '2026-2027', 21818.18, 2181.82, 24000.00, 1, 'Taksitli (6 Taksit)', 6, 1, 0, 0, 0, '', '2026-09-01T00:00:00', '', datetime('now')),
('cnt_demo_002', 'SZL202600002', 'student-002', 'Örnek Öğrenci 2', '8-B', 113, '2026-2027', 16363.64, 1636.36, 18000.00, 1, 'Taksitli (6 Taksit)', 6, 1, 0, 0, 0, '', '2026-09-01T00:00:00', '', datetime('now'));

INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES 
('glr_demo_001', 'GLR202600001', 'SZL202600001', 'student-001', 'Örnek Öğrenci 1', '11-A', 'Örnek Öğrenci 1', 'Sözleşme: SZL202600001', 113, '2026-2027', 21818.18, 2181.82, 24000.00, 12000.00, 12000.00, 0, '2026-09-01T00:00:00', '2026-10-15T00:00:00', 6, 3, 2, datetime('now')),
('glr_demo_002', 'GLR202600002', 'SZL202600002', 'student-002', 'Örnek Öğrenci 2', '8-B', 'Örnek Öğrenci 2', 'Sözleşme: SZL202600002', 113, '2026-2027', 16363.64, 1636.36, 18000.00, 6000.00, 12000.00, 0, '2026-09-01T00:00:00', '2026-10-15T00:00:00', 6, 4, 2, datetime('now'));
