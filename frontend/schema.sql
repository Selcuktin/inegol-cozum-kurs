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




-- Migration Seed for contracts and student_incomes
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_74513', 'SZL202600149', '8315148', 'ELİF ERVA YEŞİLYAPRAK', '2-2-ILK-GENEL', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-10-06T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600149_20261006192930.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_73464', 'SZL202600148', '8118066', 'EGEMEN KUŞTUL', '7-A', 113, '2026-2027', 73636.4, 7363.64, 81000.04, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-10-03T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600148_20261003130813.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_70200', 'SZL202600147', '8197070', 'EMİR ASAF ÖZOĞUL', '3-3-ILK-GENEL', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-27T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600147_20260927172422.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_68682', 'SZL202600146', '8182504', 'ASELSARE BİLGİN', '4-A', 113, '2026-2027', 50000, 5000, 55000, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-26T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600146_20260926105016.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_67200', 'SZL202600145', '7743575', 'YİĞİT ENES AKKUL', '3-3-ILK-GENEL', 113, '2026-2027', 59100, 5910, 65010, 1, 'Taksitli (12 Taksit)', 12, 1, 0, 0, 0, '', '2026-09-24T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600145_20260924190436.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_67198', 'SZL202600144', '7748194', 'MELİH AKKUL', '2-2-ILK-GENEL', 113, '2026-2027', 59100, 5910, 65010, 1, 'Taksitli (12 Taksit)', 12, 1, 0, 0, 0, '', '2026-09-24T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600144_20260924190219.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_66032', 'SZL202600142', '8117635', 'HİRANUR ÇAKMAK', '4-A', 113, '2026-2027', 43636.6, 4363.66, 48000.26, 1, 'Taksitli (8 Taksit)', 8, 1, 0, 0, 0, '', '2026-09-21T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600142_20260921184811.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_64226', 'SZL202600141', '8094534', 'ERDEM KAYA', '7-A', 113, '2026-2027', 55454.55, 5545.46, 61000.01, 1, 'Taksitli (11 Taksit)', 11, 1, 0, 0, 0, '', '2026-09-19T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600141_20260919183600.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_63813', 'SZL202600140', '7086994', 'RAVZA BAŞOL', '8-A', 113, '2026-2027', 0.01, 0, 0.01, 1, 'Peşin', 10, 1, 0, 0, 0, '', '2026-09-19T00:00:00', '', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_63376', 'SZL202600139', '8075158', 'CEMRE KURU', '2-A', 113, '2026-2027', 45000, 4500, 49500, 1, 'Taksitli (9 Taksit)', 9, 1, 0, 0, 0, '', '2026-09-18T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600139_20260918121618.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_63375', 'SZL202600138', '8075563', 'EYLÜL KURU', '1-A', 113, '2026-2027', 45000, 4500, 49500, 1, 'Taksitli (9 Taksit)', 9, 1, 0, 0, 0, '', '2026-09-18T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600138_20260918121441.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_61651', 'SZL202600135', '8052109', 'FERİT EMRE KESKİN', '7-A', 113, '2026-2027', 59091, 5909.1, 65000.1, 1, 'Taksitli (6 Taksit)', 6, 1, 0, 0, 0, '', '2026-09-16T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600135_20260916163559.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_61634', 'SZL202600134', '8051591', 'ALP DENİZ CAN', '6-A', 113, '2026-2027', 45455, 4545.5, 50000.5, 1, 'Taksitli (5 Taksit)', 5, 1, 0, 0, 0, '', '2026-09-16T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600134_20260916161222.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_61450', 'SZL202600133', '8047559', 'EYÜP EYMEN AKBAY', '6-A', 113, '2026-2027', 64545.5, 6454.55, 71000.05, 1, 'Taksitli (11 Taksit)', 11, 1, 0, 0, 0, '', '2026-09-16T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600133_20260916173129.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_60612', 'SZL202600132', '8018538', 'ELANUR ABDİOĞLU', '5-A', 113, '2026-2027', 60000, 6000, 66000, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-14T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600132_20260914115449.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_60610', 'SZL202600131', '7949336', 'EDANUR ABDİOĞLU', '7-A', 113, '2026-2027', 60000, 6000, 66000, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-14T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600131_20260914115154.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_60492', 'SZL202600130', '8016291', 'ZEYNEP LEVENT', '8-8-GENEL', 113, '2026-2027', 68181.9, 6818.19, 75000.09, 1, 'Taksitli (4 Taksit)', 4, 1, 0, 0, 0, '', '2026-09-13T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600130_20260913171654.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_60096', 'SZL202600129', '8009194', 'OĞUZHAN ÇAKAL', '5-A', 113, '2026-2027', 54545.5, 5454.55, 60000.05, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-12T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600129_20260912152404.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_59788', 'SZL202600128', '8003744', 'EYMEN GÜMÜŞTEKİN', '6-A', 113, '2026-2027', 64545.5, 6454.55, 71000.05, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-12T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600128_20260912104956.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_59688', 'SZL202600127', '8002034', 'SÜMEYYE KAHYA', '6-A', 113, '2026-2027', 64546, 6454.6, 71000.6, 1, 'Taksitli (11 Taksit)', 11, 1, 0, 0, 0, '', '2026-09-11T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600127_20260911181238.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_59141', 'SZL202600126', '7990133', 'YİĞİT KARAKAŞLI', '6-A', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-09-10T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600126_20260910160228.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_59123', 'SZL202600125', '7949366', 'ALP KARAKAŞLI', '8-A', 113, '2026-2027', 72728, 7272.8, 80000.8, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-09-10T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600125_20260910155245.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_56254', 'SZL202600123', '7958515', 'MUHAMMET EREN OĞRAK', '5-A', 113, '2026-2027', 45455, 4545.5, 50000.5, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-06T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600123_20260906184500.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_55988', 'SZL202600121', '7957654', 'NAZLI EKER', '3-3-ILK-GENEL', 113, '2026-2027', 40909.9, 4090.99, 45000.89, 1, 'Taksitli (6 Taksit)', 6, 1, 0, 0, 0, '', '2026-09-06T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600121_20260906131839.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_55875', 'SZL202600120', '7955767', 'CEYHUN APAYDIN', '8-A', 113, '2026-2027', 73637, 7363.7, 81000.7, 1, 'Taksitli (11 Taksit)', 11, 1, 0, 0, 0, '', '2026-09-05T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600120_20260905182524.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_53916', 'SZL202600119', '7930881', 'HİRA EMER', '4-A', 113, '2026-2027', 52273, 5227.3, 57500.3, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-01T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600119_20260901162143.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_53913', 'SZL202600118', '7930863', 'İKRA EMER', '4-A', 113, '2026-2027', 52273, 5227.3, 57500.3, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-01T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600118_20260901161906.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_53881', 'SZL202600117', '7086948', 'CEYLİN CERENSU TAŞKIN', '7-7-ASNF-GENEL', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-09-01T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600117_20260901145833.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_53839', 'SZL202600116', '7905178', 'MARYAM NASIRLI', '3-A', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-01T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600116_20260901135807.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_53823', 'SZL202600115', '7929619', 'CAN DÜZEL', '1-A', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-09-01T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600115_20260901133105.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_53535', 'SZL202600114', '7923734', 'BERİL POLAT POSOFLU', '3-A', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (2 Taksit)', 2, 1, 0, 0, 0, '', '2026-08-29T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600114_20260831112552.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_52651', 'SZL202600113', '7913205', 'MERİÇ ÖZTÜRK', '8-A', 113, '2026-2027', 72730, 7273, 80003, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-08-28T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600113_20260828143647.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_47403', 'SZL202600111', '7387356', 'BURAK TALHA ÇELİK', '7-7-ASNF-GENEL', 113, '2026-2027', 81818.18, 8181.82, 90000, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-08-24T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600111_20260824115903.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_47394', 'SZL202600110', '7086803', 'FURKAN TOPKARA', '4-4-ILK-GENEL', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-08-24T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600110_20260824113144.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_47389', 'SZL202600109', '7086899', 'ÖMER TOPKARA', '6-6-ASNF-GENEL', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-08-24T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600109_20260824112113.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_46268', 'SZL202600108', '7877895', 'CANSU TÜRKEN', '5-5-ASNF-GENEL', 113, '2026-2027', 58183, 5818.3, 64001.3, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-08-22T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600108_20260822182447.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_44815', 'SZL202600106', '7748260', 'BEDİR ASAF HAZER', '4-4-ILK-GENEL', 113, '2026-2027', 67272.73, 6727.27, 74000, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-08-20T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600106_20260820183703.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_44371', 'SZL202600105', '7856638', 'ELİF HÜMA YANIK', '3-3-ILK-GENEL', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (12 Taksit)', 12, 1, 0, 0, 0, '', '2026-08-18T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600105_20260818194619.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_44358', 'SZL202600104', '7856161', 'ELİF SARE DEMİR', '2-2-ILK-GENEL', 113, '2026-2027', 63636.36, 6363.64, 70000, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-08-18T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600104_20260818184847.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_43853', 'SZL202600103', '7851686', 'EMİR PARILDAR', '8-8-LGS-GENEL', 113, '2026-2027', 71818.2, 7181.82, 79000.02, 1, 'Taksitli (9 Taksit)', 9, 1, 0, 0, 0, '', '2026-08-17T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600103_20260817184125.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_43377', 'SZL202600102', '7841001', 'EFEHAN MELİKOĞLU', '4-4-ILK-GENEL', 113, '2026-2027', 70910, 7091, 78001, 1, 'Taksitli (9 Taksit)', 9, 1, 0, 0, 0, '', '2026-08-15T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600102_20260815161714.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_42421', 'SZL202600101', '7748464', 'MUSA ÇINAR IŞIKLI', '7-7-ASNF-GENEL', 113, '2026-2027', 66364, 6636.4, 73000.4, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-08-11T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600101_20260813120528.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_42417', 'SZL202600100', '7743524', 'SERHAT SERBEST', '7-A', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 1, 'Taksitli (10 Taksit)', 10, 1, 0, 0, 0, '', '2026-08-12T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600100_20260813115706.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_42414', 'SZL202600099', '7826736', 'MERT EKER', '4-A', 113, '2026-2027', 40909.09, 4090.91, 45000, 1, 'Taksitli (3 Taksit)', 3, 1, 0, 0, 0, '', '2026-08-12T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600099_20260813114913.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_42406', 'SZL202600098', '7826762', 'BERAT EKER', '4-A', 113, '2026-2027', 40909.09, 4090.91, 45000, 1, 'Taksitli (3 Taksit)', 3, 1, 0, 0, 0, '', '2026-08-12T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600098_20260813104509.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_35322', 'SZL202600094', '7086966', 'SÜMEYYE DUMANLAR', '7-7-ASNF-GENEL', 113, '2026-2027', 1, 0.1, 1.1, 1, 'Peşin', 10, 1, 0, 0, 0, '', '2026-07-30T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600094_20260730112058.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_34846', 'SZL202600091', '7086748', 'YASİN SAMİ UĞURTAY', '3-3-ILK-GENEL', 113, '2026-2027', 54546, 5454.6, 60000.6, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-07-29T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600091_20260729123435.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_34843', 'SZL202600090', '7086779', 'MUHAMMED TALHA UĞURTAY', '4-4-ILK-GENEL', 113, '2026-2027', 54546, 5454.6, 60000.6, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-07-29T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600090_20260729123309.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_34708', 'SZL202600088', '7770666', 'SARE MİNA CAN', '3-A', 113, '2026-2027', 70910, 7091, 78001, 1, 'Taksitli (12 Taksit)', 12, 1, 0, 0, 0, '', '2026-07-28T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600088_20260728135125.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_34664', 'SZL202600087', '7770482', 'MEHMET EFE BAYRAK', '3-A', 113, '2026-2027', 54546, 5454.6, 60000.6, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-07-28T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600087_20260728121543.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_34660', 'SZL202600086', '7770434', 'SEBİLE AKDEMİR', '8-A', 113, '2026-2027', 81819, 8181.9, 90000.9, 1, 'Taksitli (12 Taksit)', 12, 1, 0, 0, 0, '', '2026-07-18T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600086_20260728120651.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_12625', 'SZL202600068', '7489420', 'SAM AHMED ALMEHDHAR', '2-A', 113, '2026-2027', 78182, 7818.2, 86000.2, 1, 'Taksitli (13 Taksit)', 13, 1, 0, 0, 0, '', '2026-06-10T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600068_20260523160937.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_12316', 'SZL202600066', '7434836', 'YAĞMUR HİRA ALAN', '7-7-ASNF-GENEL', 113, '2026-2027', 81818.18, 8181.82, 90000, 1, 'Taksitli (14 Taksit)', 14, 1, 0, 0, 0, '', '2026-05-17T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600066_20260517103233.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_12310', 'SZL202600064', '7431742', 'ÖZGÜR SALIK', '6-A', 113, '2026-2027', 81818.18, 8181.82, 90000, 1, 'Taksitli (14 Taksit)', 14, 1, 0, 0, 0, '', '2026-05-17T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600064_20260517100631.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_12253', 'SZL202600061', '7086795', 'ECRİN TARHAN', '3-A', 113, '2026-2027', 63637, 6363.7, 70000.7, 1, 'Taksitli (13 Taksit)', 13, 1, 0, 0, 0, '', '2026-05-14T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600061_20260514105935.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_11548', 'SZL202600060', '7086773', 'MUSTAFA SİNİR', '3-A', 113, '2026-2027', 65455, 6545.5, 72000.5, 1, 'Taksitli (6 Taksit)', 6, 1, 0, 0, 0, '', '2026-05-13T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600060_20260513175608.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_9585', 'SZL202600059', '7086887', 'ELİF NUR SAVAŞ', '', 113, '2026-2027', 68182, 6818.2, 75000.2, 1, 'Taksitli (15 Taksit)', 15, 1, 0, 0, 0, '', '2026-05-11T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600059_20260511190230.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_8149', 'SZL202600057', '7327791', 'YAĞIZ İNCİ', '6-6-ASNF-GENEL', 113, '2026-2027', 80000, 8000, 88000, 1, 'Taksitli (15 Taksit)', 15, 1, 0, 0, 0, '', '2026-05-03T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600057_20260503141511.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_6963', 'SZL202600056', '7086876', 'FEYZA İLGÖZ', '5-A', 113, '2026-2027', 60000, 6000, 66000, 1, 'Taksitli (12 Taksit)', 12, 1, 0, 0, 0, '', '2026-04-28T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600056_20260428184831.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_6424', 'SZL202600055', '7086953', 'EBRAR BAYRAK', '6-A', 113, '2026-2027', 72727.27, 7272.73, 80000, 1, 'Taksitli (8 Taksit)', 8, 1, 0, 0, 0, '', '2026-04-27T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600055_20260427203342.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_3499', 'SZL202600051', '7223213', 'EBUBEKİR ASAF VERGİLİ', '3-B', 113, '2026-2027', 63000, 0, 63000, 1, 'Taksitli (9 Taksit)', 9, 1, 0, 0, 0, '', '2026-04-15T00:00:00', 'https://sinavzastoragewest.blob.core.windows.net/files/sozlesmeler/Sozlesme_SZL202600051_20260415104902.pdf', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_3165', 'SZL202600038', '7086769', 'YAVUZ EMİR BALCI', '3-A', 113, '2026-2027', 80000, 0, 80000, 1, 'Taksitli (16 Taksit)', 16, 1, 0, 0, 0, '', '2026-04-09T00:00:00', '', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_3163', 'SZL202600036', '7086763', 'ELİFSU ÇAĞLAYAN', '3-A', 113, '2026-2027', 85000, 0, 85000, 1, 'Taksitli (17 Taksit)', 17, 1, 0, 0, 0, '', '2026-04-09T00:00:00', '', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_3160', 'SZL202600033', '7086754', 'ZEYNEP MASAL ÇELİK', '3-A', 113, '2026-2027', 70000, 0, 70000, 1, 'Taksitli (1 Taksit)', 1, 1, 0, 0, 0, '', '2026-04-09T00:00:00', '', datetime('now'));
INSERT OR IGNORE INTO contracts (id, sozlesme_no, student_id, student_name, student_class, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi, kurum_imza_alindi, kurum_imzalayan, sozlesme_tarihi, sozlesme_url, created_at) VALUES ('cnt_3137', 'SZL202600010', '7086845', 'BAYLAR MAMMADOVA', '', 113, '2026-2027', 82500, 0, 82500, 1, 'Taksitli (15 Taksit)', 15, 1, 0, 0, 0, '', '2026-04-08T00:00:00', '', datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_97066', 'GLR202600153', 'SZL202600149', '8315148', 'ELİF ERVA YEŞİLYAPRAK', '2-2-ILK-GENEL', 'ELİF ERVA YEŞİLYAPRAK', 'Sözleşme: SZL202600149', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 0, 60000.01, 0, '2026-10-06T00:00:00', '2026-11-25T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_95942', 'GLR202600152', 'SZL202600148', '8118066', 'EGEMEN KUŞTUL', '7-A', 'EGEMEN KUŞTUL', 'Sözleşme: SZL202600148', 113, '2026-2027', 73636.4, 7363.64, 81000.04, 0, 81000.04, 0, '2026-10-03T00:00:00', '2026-10-31T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_92580', 'GLR202600151', 'SZL202600147', '8197070', 'EMİR ASAF ÖZOĞUL', '3-3-ILK-GENEL', 'EMİR ASAF ÖZOĞUL', 'Sözleşme: SZL202600147', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 0, 60000.01, 0, '2026-09-27T00:00:00', '2026-10-15T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_91038', 'GLR202600150', 'SZL202600146', '8182504', 'ASELSARE BİLGİN', '4-A', 'ASELSARE BİLGİN', 'Sözleşme: SZL202600146', 113, '2026-2027', 50000, 5000, 55000, 5500, 49500, 0, '2026-09-26T00:00:00', '2026-11-30T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_89538', 'GLR202600148', 'SZL202600144', '7748194', 'MELİH AKKUL', '2-2-ILK-GENEL', 'MELİH AKKUL', 'Sözleşme: SZL202600144', 113, '2026-2027', 59100, 5910, 65010, 0, 65010, 0, '2026-09-24T00:00:00', '2026-10-10T00:00:00', 12, 12, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_89540', 'GLR202600149', 'SZL202600145', '7743575', 'YİĞİT ENES AKKUL', '3-3-ILK-GENEL', 'YİĞİT ENES AKKUL', 'Sözleşme: SZL202600145', 113, '2026-2027', 59100, 5910, 65010, 0, 65010, 0, '2026-09-24T00:00:00', '2026-10-10T00:00:00', 12, 12, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_89111', 'GLR202600147', 'SZL202600124', '7966990', 'EMRİYE AYTAN', '7-A', 'EMRİYE AYTAN', 'HAK EDİLEN: Sözleşme İptali - IPT202600007', 113, '2026-2027', 6000.01, 0, 6000.01, 6000.01, 0, 1, '2026-09-23T18:19:02.349567', '2026-09-23T18:19:02.3495681', 10, 10, 3, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_88317', 'GLR202600145', 'SZL202600142', '8117635', 'HİRANUR ÇAKMAK', '4-A', 'HİRANUR ÇAKMAK', 'Sözleşme: SZL202600142', 113, '2026-2027', 43636.6, 4363.66, 48000.26, 0, 48000.26, 0, '2026-09-21T00:00:00', '2026-10-20T00:00:00', 8, 8, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_86041', 'GLR202600143', 'SZL202600140', '7086994', 'RAVZA BAŞOL', '8-A', 'RAVZA BAŞOL', 'Sözleşme: SZL202600140', 113, '2026-2027', 0.01, 0, 0.01, 0.01, 0, 1, '2026-09-19T00:00:00', '2026-09-19T00:00:00', 10, 10, 3, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_86478', 'GLR202600144', 'SZL202600141', '8094534', 'ERDEM KAYA', '7-A', 'ERDEM KAYA', 'Sözleşme: SZL202600141', 113, '2026-2027', 55454.55, 5545.46, 61000.01, 16000, 45000.01, 0, '2026-09-19T00:00:00', '2026-12-05T00:00:00', 11, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_85591', 'GLR202600141', 'SZL202600138', '8075563', 'EYLÜL KURU', '1-A', 'EYLÜL KURU', 'Sözleşme: SZL202600138', 113, '2026-2027', 45000, 4500, 49500, 5500, 44000, 0, '2026-09-18T00:00:00', '2026-11-20T00:00:00', 9, 8, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_85592', 'GLR202600142', 'SZL202600139', '8075158', 'CEMRE KURU', '2-A', 'CEMRE KURU', 'Sözleşme: SZL202600139', 113, '2026-2027', 45000, 4500, 49500, 5500, 44000, 0, '2026-09-18T00:00:00', '2026-11-20T00:00:00', 9, 8, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_83594', 'GLR202600136', 'SZL202600133', '8047559', 'EYÜP EYMEN AKBAY', '6-A', 'EYÜP EYMEN AKBAY', 'Sözleşme: SZL202600133', 113, '2026-2027', 64545.5, 6454.55, 71000.05, 17000, 54000.05, 0, '2026-09-16T00:00:00', '2026-12-16T00:00:00', 11, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_83789', 'GLR202600137', 'SZL202600134', '8051591', 'ALP DENİZ CAN', '6-A', 'ALP DENİZ CAN', 'Sözleşme: SZL202600134', 113, '2026-2027', 45455, 4545.5, 50000.5, 0, 50000.5, 0, '2026-09-16T00:00:00', '2026-10-31T00:00:00', 5, 5, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_83806', 'GLR202600138', 'SZL202600135', '8052109', 'FERİT EMRE KESKİN', '7-A', 'FERİT EMRE KESKİN', 'Sözleşme: SZL202600135', 113, '2026-2027', 59091, 5909.1, 65000.1, 0, 65000.1, 0, '2026-09-16T00:00:00', '2026-10-25T00:00:00', 6, 6, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_82642', 'GLR202600134', 'SZL202600131', '7949336', 'EDANUR ABDİOĞLU', '7-A', 'EDANUR ABDİOĞLU', 'Sözleşme: SZL202600131', 113, '2026-2027', 60000, 6000, 66000, 6600, 59400, 0, '2026-09-14T00:00:00', '2026-11-10T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_82644', 'GLR202600135', 'SZL202600132', '8018538', 'ELANUR ABDİOĞLU', '5-A', 'ELANUR ABDİOĞLU', 'Sözleşme: SZL202600132', 113, '2026-2027', 60000, 6000, 66000, 6600, 59400, 0, '2026-09-14T00:00:00', '2026-11-10T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_82513', 'GLR202600133', 'SZL202600130', '8016291', 'ZEYNEP LEVENT', '8-8-GENEL', 'ZEYNEP LEVENT', 'Sözleşme: SZL202600130', 113, '2026-2027', 68181.9, 6818.19, 75000.09, 7500, 67500.09, 0, '2026-09-13T00:00:00', '2026-10-07T00:00:00', 4, 4, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_81797', 'GLR202600131', 'SZL202600128', '8003744', 'EYMEN GÜMÜŞTEKİN', '6-A', 'EYMEN GÜMÜŞTEKİN', 'Sözleşme: SZL202600128', 113, '2026-2027', 64545.5, 6454.55, 71000.05, 0, 71000.05, 0, '2026-09-12T00:00:00', '2026-10-15T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_82110', 'GLR202600132', 'SZL202600129', '8009194', 'OĞUZHAN ÇAKAL', '5-A', 'OĞUZHAN ÇAKAL', 'Sözleşme: SZL202600129', 113, '2026-2027', 54545.5, 5454.55, 60000.05, 6000, 54000.05, 0, '2026-09-12T00:00:00', '2026-11-20T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_81691', 'GLR202600130', 'SZL202600127', '8002034', 'SÜMEYYE KAHYA', '6-A', 'SÜMEYYE KAHYA', 'Sözleşme: SZL202600127', 113, '2026-2027', 64546, 6454.6, 71000.6, 0, 71000.6, 0, '2026-09-11T00:00:00', '2026-10-10T00:00:00', 11, 11, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_81101', 'GLR202600128', 'SZL202600125', '7949366', 'ALP KARAKAŞLI', '8-A', 'ALP KARAKAŞLI', 'Sözleşme: SZL202600125', 113, '2026-2027', 72728, 7272.8, 80000.8, 0, 80000.8, 0, '2026-09-10T00:00:00', '2027-06-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_81120', 'GLR202600129', 'SZL202600126', '7990133', 'YİĞİT KARAKAŞLI', '6-A', 'YİĞİT KARAKAŞLI', 'Sözleşme: SZL202600126', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 0, 60000.01, 0, '2026-09-10T00:00:00', '2027-06-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_78208', 'GLR202600127', 'SZL202600124', '7966990', 'EMRİYE AYTAN', '7-A', 'EMRİYE AYTAN', 'Sözleşme: SZL202600124', 113, '2026-2027', 54545.5, 5454.55, 60000.05, 6000, 0, 0, '2026-09-07T00:00:00', '2026-10-15T00:00:00', 9, 9, 4, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_77625', 'GLR202600124', 'SZL202600121', '7957654', 'NAZLI EKER', '3-3-ILK-GENEL', 'NAZLI EKER', 'Sözleşme: SZL202600121', 113, '2026-2027', 40909.9, 4090.99, 45000.89, 0, 45000.89, 0, '2026-09-06T00:00:00', '2026-10-15T00:00:00', 6, 6, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_77888', 'GLR202600126', 'SZL202600123', '7958515', 'MUHAMMET EREN OĞRAK', '5-A', 'MUHAMMET EREN OĞRAK', 'Sözleşme: SZL202600123', 113, '2026-2027', 45455, 4545.5, 50000.5, 0, 50000.5, 0, '2026-09-06T00:00:00', '2026-10-10T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_77510', 'GLR202600123', 'SZL202600120', '7955767', 'CEYHUN APAYDIN', '8-A', 'CEYHUN APAYDIN', 'Sözleşme: SZL202600120', 113, '2026-2027', 73637, 7363.7, 81000.7, 11000, 70000.7, 0, '2026-09-05T00:00:00', '2026-11-05T00:00:00', 11, 10, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_75182', 'GLR202600118', 'SZL202600115', '7929619', 'CAN DÜZEL', '1-A', 'CAN DÜZEL', 'Sözleşme: SZL202600115', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 6000, 54000.01, 0, '2026-09-01T00:00:00', '2026-10-15T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_75203', 'GLR202600119', 'SZL202600116', '7905178', 'MARYAM NASIRLI', '3-A', 'MARYAM NASIRLI', 'Sözleşme: SZL202600116', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 6000, 54000.01, 0, '2026-09-01T00:00:00', '2026-10-15T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_75248', 'GLR202600120', 'SZL202600117', '7086948', 'CEYLİN CERENSU TAŞKIN', '7-7-ASNF-GENEL', 'CEYLİN CERENSU TAŞKIN', 'Sözleşme: SZL202600117', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 60000.01, 0, 1, '2026-09-01T00:00:00', '2026-10-01T00:00:00', 1, 1, 3, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_75282', 'GLR202600121', 'SZL202600118', '7930863', 'İKRA EMER', '4-A', 'İKRA EMER', 'Sözleşme: SZL202600118', 113, '2026-2027', 52273, 5227.3, 57500.3, 0, 57500.3, 0, '2026-09-01T00:00:00', '2026-10-01T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_75285', 'GLR202600122', 'SZL202600119', '7930881', 'HİRA EMER', '4-A', 'HİRA EMER', 'Sözleşme: SZL202600119', 113, '2026-2027', 52273, 5227.3, 57500.3, 0, 57500.3, 0, '2026-09-01T00:00:00', '2026-09-10T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_74869', 'GLR202600117', 'SZL202600114', '7923734', 'BERİL POLAT POSOFLU', '3-A', 'BERİL POLAT POSOFLU', 'Sözleşme: SZL202600114', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 0, 60000.01, 0, '2026-08-29T00:00:00', '2026-09-02T00:00:00', 2, 2, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_73969', 'GLR202600116', 'SZL202600113', '7913205', 'MERİÇ ÖZTÜRK', '8-A', 'MERİÇ ÖZTÜRK', 'Sözleşme: SZL202600113', 113, '2026-2027', 72730, 7273, 80003, 10000, 70003, 0, '2026-08-28T00:00:00', '2026-10-10T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_68651', 'GLR202600112', 'SZL202600109', '7086899', 'ÖMER TOPKARA', '6-6-ASNF-GENEL', 'ÖMER TOPKARA', 'Sözleşme: SZL202600109', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 10000, 50000.01, 0, '2026-08-24T00:00:00', '2027-06-15T00:00:00', 1, 1, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_68657', 'GLR202600113', 'SZL202600110', '7086803', 'FURKAN TOPKARA', '4-4-ILK-GENEL', 'FURKAN TOPKARA', 'Sözleşme: SZL202600110', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 0, 60000.01, 0, '2026-08-24T00:00:00', '2027-06-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_68668', 'GLR202600114', 'SZL202600111', '7387356', 'BURAK TALHA ÇELİK', '7-7-ASNF-GENEL', 'BURAK TALHA ÇELİK', 'Sözleşme: SZL202600111', 113, '2026-2027', 81818.18, 8181.82, 90000, 10000, 80000, 0, '2026-08-24T00:00:00', '2027-06-15T00:00:00', 1, 1, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_67525', 'GLR202600111', 'SZL202600108', '7877895', 'CANSU TÜRKEN', '5-5-ASNF-GENEL', 'CANSU TÜRKEN', 'Sözleşme: SZL202600108', 113, '2026-2027', 58183, 5818.3, 64001.3, 6000, 58001.3, 0, '2026-08-22T00:00:00', '2026-09-26T00:00:00', 10, 10, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_66057', 'GLR202600109', 'SZL202600106', '7748260', 'BEDİR ASAF HAZER', '4-4-ILK-GENEL', 'BEDİR ASAF HAZER', 'Sözleşme: SZL202600106', 113, '2026-2027', 67272.73, 6727.27, 74000, 7400, 66600, 0, '2026-08-20T00:00:00', '2026-10-10T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_65086', 'GLR202600106', 'SZL202600070', '7743524', 'SERHAT SERBEST', '7-A', 'SERHAT SERBEST', 'HAK EDİLEN: Sözleşme İptali - IPT202600005', 113, '2026-2027', 600.05, 0, 600.05, 600.05, 0, 1, '2026-08-18T11:51:33.8595239', '2026-08-18T11:51:33.8595248', 10, 10, 3, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_65563', 'GLR202600107', 'SZL202600104', '7856161', 'ELİF SARE DEMİR', '2-2-ILK-GENEL', 'ELİF SARE DEMİR', 'Sözleşme: SZL202600104', 113, '2026-2027', 63636.36, 6363.64, 70000, 0, 70000, 0, '2026-08-18T00:00:00', '2026-09-18T00:00:00', 10, 10, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_65576', 'GLR202600108', 'SZL202600105', '7856638', 'ELİF HÜMA YANIK', '3-3-ILK-GENEL', 'ELİF HÜMA YANIK', 'Sözleşme: SZL202600105', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 5000, 55000.01, 0, '2026-08-18T00:00:00', '2026-10-30T00:00:00', 12, 11, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_65009', 'GLR202600105', 'SZL202600103', '7851686', 'EMİR PARILDAR', '8-8-LGS-GENEL', 'EMİR PARILDAR', 'Sözleşme: SZL202600103', 113, '2026-2027', 71818.2, 7181.82, 79000.02, 8780, 70220.02, 0, '2026-08-17T00:00:00', '2026-10-15T00:00:00', 9, 8, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_64520', 'GLR202600104', 'SZL202600102', '7841001', 'EFEHAN MELİKOĞLU', '4-4-ILK-GENEL', 'EFEHAN MELİKOĞLU', 'Sözleşme: SZL202600102', 113, '2026-2027', 70910, 7091, 78001, 15600, 62401, 0, '2026-08-15T00:00:00', '2026-10-15T00:00:00', 9, 8, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_24245', 'GLR202600062', 'SZL202600062', '7086932', 'CANSU ADA ÇAYLAR', '6-A', 'CANSU ADA ÇAYLAR', 'Sözleşme: SZL202600062', 113, '2026-2027', 81819, 8181.9, 90000.9, 0, 0, 0, '2026-08-15T00:00:00', '2026-08-15T00:00:00', 10, 10, 4, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_63514', 'GLR202600100', 'SZL202600098', '7826762', 'BERAT EKER', '4-A', 'BERAT EKER', 'Sözleşme: SZL202600098', 113, '2026-2027', 40909.09, 4090.91, 45000, 0, 45000, 0, '2026-08-12T00:00:00', '2026-10-15T00:00:00', 3, 3, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_63524', 'GLR202600101', 'SZL202600099', '7826736', 'MERT EKER', '4-A', 'MERT EKER', 'Sözleşme: SZL202600099', 113, '2026-2027', 40909.09, 4090.91, 45000, 0, 45000, 0, '2026-08-12T00:00:00', '2026-10-15T00:00:00', 3, 3, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_63527', 'GLR202600102', 'SZL202600100', '7743524', 'SERHAT SERBEST', '7-A', 'SERHAT SERBEST', 'Sözleşme: SZL202600100', 113, '2026-2027', 54545.46, 5454.55, 60000.01, 6000, 54000.01, 0, '2026-08-12T00:00:00', '2026-10-25T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_63531', 'GLR202600103', 'SZL202600101', '7748464', 'MUSA ÇINAR IŞIKLI', '7-7-ASNF-GENEL', 'MUSA ÇINAR IŞIKLI', 'Sözleşme: SZL202600101', 113, '2026-2027', 66364, 6636.4, 73000.4, 7300, 65700.4, 0, '2026-08-11T00:00:00', '2026-10-07T00:00:00', 10, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_55393', 'GLR202600095', 'SZL202600094', '7086966', 'SÜMEYYE DUMANLAR', '7-7-ASNF-GENEL', 'SÜMEYYE DUMANLAR', 'Sözleşme: SZL202600094', 113, '2026-2027', 1, 0.1, 1.1, 1.1, 0, 1, '2026-07-30T00:00:00', '2026-07-30T00:00:00', 10, 10, 3, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_54899', 'GLR202600091', 'SZL202600090', '7086779', 'MUHAMMED TALHA UĞURTAY', '4-4-ILK-GENEL', 'MUHAMMED TALHA UĞURTAY', 'Sözleşme: SZL202600090', 113, '2026-2027', 54546, 5454.6, 60000.6, 0, 60000.6, 0, '2026-07-29T00:00:00', '2027-06-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_54902', 'GLR202600092', 'SZL202600091', '7086748', 'YASİN SAMİ UĞURTAY', '3-3-ILK-GENEL', 'YASİN SAMİ UĞURTAY', 'Sözleşme: SZL202600091', 113, '2026-2027', 54546, 5454.6, 60000.6, 0, 60000.6, 0, '2026-07-29T00:00:00', '2027-06-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_54710', 'GLR202600088', 'SZL202600087', '7770482', 'MEHMET EFE BAYRAK', '3-A', 'MEHMET EFE BAYRAK', 'Sözleşme: SZL202600087', 113, '2026-2027', 54546, 5454.6, 60000.6, 0, 60000.6, 0, '2026-07-28T00:00:00', '2027-06-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_54757', 'GLR202600089', 'SZL202600088', '7770666', 'SARE MİNA CAN', '3-A', 'SARE MİNA CAN', 'Sözleşme: SZL202600088', 113, '2026-2027', 70910, 7091, 78001, 13000, 65001, 0, '2026-07-28T00:00:00', '2026-10-07T00:00:00', 12, 10, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_54703', 'GLR202600087', 'SZL202600086', '7770434', 'SEBİLE AKDEMİR', '8-A', 'SEBİLE AKDEMİR', 'Sözleşme: SZL202600086', 113, '2026-2027', 81819, 8181.9, 90000.9, 22500, 67500.9, 0, '2026-07-18T00:00:00', '2026-11-10T00:00:00', 12, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_50444', 'GLR202600071', 'SZL202600070', '7743524', 'SERHAT SERBEST', '7-A', 'SERHAT SERBEST', 'Sözleşme: SZL202600070', 113, '2026-2027', 5455, 545.5, 6000.5, 600.05, 0, 0, '2026-07-16T00:00:00', '2026-08-16T00:00:00', 1, 1, 4, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_26905', 'GLR202600069', 'SZL202600068', '7489420', 'SAM AHMED ALMEHDHAR', '2-A', 'SAM AHMED ALMEHDHAR', 'Sözleşme: SZL202600068', 113, '2026-2027', 78182, 7818.2, 86000.2, 26400, 59600.2, 0, '2026-06-10T00:00:00', '2026-10-10T00:00:00', 13, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_24815', 'GLR202600064', 'SZL202600064', '7431742', 'ÖZGÜR SALIK', '6-A', 'ÖZGÜR SALIK', 'Sözleşme: SZL202600064', 113, '2026-2027', 81818.18, 8181.82, 90000, 25720, 64280, 0, '2026-05-17T00:00:00', '2026-10-12T00:00:00', 14, 10, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_24821', 'GLR202600066', 'SZL202600066', '7434836', 'YAĞMUR HİRA ALAN', '7-7-ASNF-GENEL', 'YAĞMUR HİRA ALAN', 'Sözleşme: SZL202600066', 113, '2026-2027', 81818.18, 8181.82, 90000, 19290, 70710, 0, '2026-05-17T00:00:00', '2026-09-12T00:00:00', 14, 11, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_16888', 'GLR202600061', 'SZL202600061', '7086795', 'ECRİN TARHAN', '3-A', 'ECRİN TARHAN', 'Sözleşme: SZL202600061', 113, '2026-2027', 63637, 6363.7, 70000.7, 6000, 64000.7, 0, '2026-05-14T00:00:00', '2026-07-14T00:00:00', 13, 12, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_13468', 'GLR202600060', 'SZL202600060', '7086773', 'MUSTAFA SİNİR', '3-A', 'MUSTAFA SİNİR', 'Sözleşme: SZL202600060', 113, '2026-2027', 65455, 6545.5, 72000.5, 0, 72000.5, 0, '2026-05-13T00:00:00', '2026-09-13T00:00:00', 6, 6, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_9186', 'GLR202600059', 'SZL202600059', '7086887', 'ELİF NUR SAVAŞ', '', 'ELİF NUR SAVAŞ', 'Sözleşme: SZL202600059', 113, '2026-2027', 68182, 6818.2, 75000.2, 10000, 65000.2, 0, '2026-05-11T00:00:00', '2026-08-03T00:00:00', 15, 13, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_7937', 'GLR202600057', 'SZL202600057', '7327791', 'YAĞIZ İNCİ', '6-6-ASNF-GENEL', 'YAĞIZ İNCİ', 'Sözleşme: SZL202600057', 113, '2026-2027', 80000, 8000, 88000, 35220, 52780, 0, '2026-05-03T00:00:00', '2026-12-13T00:00:00', 15, 9, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_6843', 'GLR202600056', 'SZL202600056', '7086876', 'FEYZA İLGÖZ', '5-A', 'FEYZA İLGÖZ', 'Sözleşme: SZL202600056', 113, '2026-2027', 60000, 6000, 66000, 5500, 60500, 0, '2026-04-28T00:00:00', '2026-07-25T00:00:00', 12, 11, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_6278', 'GLR202600055', 'SZL202600055', '7086953', 'EBRAR BAYRAK', '6-A', 'EBRAR BAYRAK', 'Sözleşme: SZL202600055', 113, '2026-2027', 72727.27, 7272.73, 80000, 24000, 56000, 0, '2026-04-27T00:00:00', '2026-09-12T00:00:00', 8, 6, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_3490', 'GLR202600051', 'SZL202600051', '7223213', 'EBUBEKİR ASAF VERGİLİ', '3-B', 'EBUBEKİR ASAF VERGİLİ', 'Sözleşme: SZL202600051', 113, '2026-2027', 63000, 0, 63000, 20000, 43000, 0, '2026-04-15T00:00:00', '2026-09-25T00:00:00', 9, 7, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_3375', 'GLR202600033', 'SZL202600033', '7086754', 'ZEYNEP MASAL ÇELİK', '3-A', 'ZEYNEP MASAL ÇELİK', 'Sözleşme: SZL202600033', 113, '2026-2027', 70000, 0, 70000, 0, 70000, 0, '2026-04-09T00:00:00', '2026-04-15T00:00:00', 1, 1, 1, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_3378', 'GLR202600036', 'SZL202600036', '7086763', 'ELİFSU ÇAĞLAYAN', '3-A', 'ELİFSU ÇAĞLAYAN', 'Sözleşme: SZL202600036', 113, '2026-2027', 85000, 0, 85000, 15000, 70000, 0, '2026-04-09T00:00:00', '2026-10-12T00:00:00', 17, 14, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_3380', 'GLR202600038', 'SZL202600038', '7086769', 'YAVUZ EMİR BALCI', '3-A', 'YAVUZ EMİR BALCI', 'Sözleşme: SZL202600038', 113, '2026-2027', 80000, 0, 80000, 15000, 65000, 0, '2026-04-09T00:00:00', '2026-10-12T00:00:00', 16, 13, 2, datetime('now'));
INSERT OR IGNORE INTO student_incomes (id, gelir_kodu, sozlesme_no, student_id, student_name, student_class, musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar, toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at) VALUES ('glr_3349', 'GLR202600010', 'SZL202600010', '7086845', 'BAYLAR MAMMADOVA', '', 'BAYLAR MAMMADOVA', 'Sözleşme: SZL202600010', 113, '2026-2027', 82500, 0, 82500, 16500, 66000, 0, '2026-04-08T00:00:00', '2026-10-11T00:00:00', 15, 12, 2, datetime('now'));
