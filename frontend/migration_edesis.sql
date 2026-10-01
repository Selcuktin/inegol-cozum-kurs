-- Migration: Edesis ERP Educational Modules for Cloudflare D1
-- Covers: Sınavlar (Exams), Karneler (Results & Hata Karnesi), Yoklama (Attendance), Ders Programı (Schedule), Ödevler (Homework), Rehberlik/Koçluk (Mentorship)

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

-- Seed Initial Exams
INSERT OR IGNORE INTO exams (id, title, exam_type, publisher, exam_date, booklet_types, status, description, created_at)
VALUES
('exam-001', '2026 Çözüm Kurumsal TYT Denemesi - 1', 'TYT', 'Çözüm Yayınları', '2026-03-10', 'A,B', 'completed', 'Kurum geneli birinci dönem değerlendirme TYT sınavı', datetime('now')),
('exam-002', 'Özdebir Türkiye Geneli TYT - 3', 'TYT', 'Özdebir', '2026-03-22', 'A,B', 'completed', 'Türkiye geneli sıralama denemesi', datetime('now')),
('exam-003', 'Hız Yayınları LGS Hazırlık Deneme - 4', 'LGS', 'Hız Yayınları', '2026-03-25', 'A,B', 'completed', '8. Sınıf LGS deneme sınavı', datetime('now')),
('exam-004', 'Limit Kurumsal AYT Denemesi - 2', 'AYT', 'Limit', '2026-04-12', 'A,B', 'planned', '11 ve 12. Sınıf Alan Yeterlilik Denemesi', datetime('now'));

-- Seed Initial Exam Results & Hata Karnesi
INSERT OR IGNORE INTO exam_results (id, exam_id, student_id, booklet, turkish_correct, turkish_incorrect, turkish_net, math_correct, math_incorrect, math_net, science_correct, science_incorrect, science_net, social_correct, social_incorrect, social_net, total_net, score, class_rank, overall_rank, weak_topics, created_at)
VALUES
('res-001', 'exam-001', 'student-001', 'A', 33, 4, 32.0, 29, 3, 28.25, 14, 2, 13.5, 16, 3, 15.25, 89.0, 412.45, 1, 3, '["Paragrafta Yapı", "Trigonometri", "Optik - Kırılma"]', datetime('now')),
('res-002', 'exam-002', 'student-001', 'B', 35, 3, 34.25, 31, 2, 30.5, 16, 2, 15.5, 17, 2, 16.5, 96.75, 438.10, 1, 1, '["Logaritma Denklem", "Elektrik ve Manyetizma"]', datetime('now')),
('res-003', 'exam-003', 'student-002', 'A', 18, 2, 17.5, 15, 3, 14.25, 17, 2, 16.5, 27, 2, 26.5, 74.75, 426.80, 1, 2, '["Çarpanlar ve Katlar", "Mevsimler ve İklim"]', datetime('now'));

-- Seed Initial Schedules (Haftalık Ders Dağıtımı)
INSERT OR IGNORE INTO schedules (id, class_id, day_of_week, time_slot, subject, teacher_name, room, created_at)
VALUES
('sch-001', 'class-001', 1, '09:00 - 09:45', 'Matematik', 'Semih Seymen', 'Derslik 2', datetime('now')),
('sch-002', 'class-001', 1, '10:00 - 10:45', 'Matematik', 'Semih Seymen', 'Derslik 2', datetime('now')),
('sch-003', 'class-001', 1, '11:00 - 11:45', 'Fizik', 'Ayşe Kaya', 'Derslik 2', datetime('now')),
('sch-004', 'class-001', 2, '09:00 - 09:45', 'Türkçe', 'Fatma Doğan', 'Derslik 2', datetime('now')),
('sch-005', 'class-001', 2, '10:00 - 10:45', 'Biyoloji', 'Kemal Yıldız', 'Derslik 2', datetime('now')),
('sch-006', 'class-002', 1, '13:30 - 14:15', 'Matematik', 'Mehmet Çelik', 'Derslik 1', datetime('now')),
('sch-007', 'class-002', 1, '14:25 - 15:10', 'Fen Bilimleri', 'Ayşe Kaya', 'Derslik 1', datetime('now')),
('sch-008', 'class-002', 3, '13:30 - 14:15', 'Türkçe', 'Fatma Doğan', 'Derslik 1', datetime('now'));

-- Seed Initial Attendance (Yoklama)
INSERT OR IGNORE INTO attendance (id, date, class_id, student_id, lesson_slot, status, note, notified_parent, created_at)
VALUES
('att-001', '2026-10-01', 'class-001', 'student-001', 'Tüm Gün', 'geldi', 'Derslere tam katılım sağladı', 0, datetime('now')),
('att-002', '2026-10-01', 'class-002', 'student-002', 'Tüm Gün', 'geldi', 'Zamanında sınıfta', 0, datetime('now')),
('att-003', '2026-09-30', 'class-001', 'student-001', 'Tüm Gün', 'geldi', '', 0, datetime('now')),
('att-004', '2026-09-30', 'class-002', 'student-002', 'Tüm Gün', 'gec', '10 dk gecikmeli geldi', 1, datetime('now'));

-- Seed Initial Homework (Ödevler)
INSERT OR IGNORE INTO homework (id, class_id, subject, title, source_book, description, due_date, teacher_name, created_at)
VALUES
('hw-001', 'class-001', 'Matematik', 'Türev Uygulamaları ve Geometrik Yorum', 'Çözüm AYT Soru Bankası Sayfa 142-158', 'Tüm testler eksiksiz çözülecek, yapılamayan sorular etütte sorulacak.', '2026-10-06', 'Semih Seymen', datetime('now')),
('hw-002', 'class-001', 'Fizik', 'Elektrik Potansiyeli ve Sığaçlar', 'MEB Kazanım Testleri 12-14', 'Grafik çizimli sorular deftere not edilecek.', '2026-10-05', 'Ayşe Kaya', datetime('now')),
('hw-003', 'class-002', 'Matematik', 'Üslü İfadeler Beceri Temelli Sorular', 'Hız LGS Matematik Sayfa 56-72', 'Yeni nesil sorular çözülüp süre tutulacak.', '2026-10-04', 'Mehmet Çelik', datetime('now'));

-- Seed Initial Homework Submissions
INSERT OR IGNORE INTO homework_submissions (id, homework_id, student_id, status, note, updated_at)
VALUES
('sub-001', 'hw-001', 'student-001', 'yapildi', 'Eksiksiz tamamlandı, 4 soru etüt için ayrıldı', datetime('now')),
('sub-002', 'hw-003', 'student-002', 'yapildi', 'Zamanında teslim edildi', datetime('now'));

-- Seed Initial Mentorship (Rehberlik / Koçluk)
INSERT OR IGNORE INTO mentorship (id, student_id, mentor_name, session_date, target_uni, target_department, weekly_target_questions, solved_questions, topics_covered, next_session_date, notes, created_at)
VALUES
('men-001', 'student-001', 'Rehberlik Servisi (Burak Hoca)', '2026-09-28', 'Boğaziçi Üniversitesi', 'Bilgisayar Mühendisliği', 1500, 1420, 'Zaman yönetimi, Paragraf çözme hızlandırma, Deneme stratejisi', '2026-10-05', 'Öğrencinin motivasyonu yüksek, matematik netleri hedefin üzerinde seyrediyor.', datetime('now')),
('men-002', 'student-002', 'Rehberlik Servisi (Burak Hoca)', '2026-09-29', 'Galatasaray Lisesi / Bursa Fen', 'LGS Hazırlık', 1000, 950, 'LGS fen bilimleri yeni nesil soru analizi, stres yönetimi', '2026-10-06', 'Matematik netlerinde artış gözlendi.', datetime('now'));
