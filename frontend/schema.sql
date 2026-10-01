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
