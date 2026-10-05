# Feature Specification: Edesis Muhasebe Parity, Exam & Contract Modules, and 20:00 Daily Backup System

## 1. Overview & Purpose
This specification aligns the accounting (`#payments` / Muhasebe V2), exams, and student contract modules with the official Edesis application layout and behaviors (`https://inegolcozum.edesis.com/app/muhasebe/dashboard`). It eliminates top card clutter, establishes a streamlined "Gelir Yönetimi / Gelir Listesi" primary view, and introduces an automated daily 20:00 (TRT) database snapshot & 1-click restore mechanism.

## 2. Scope & Functional Requirements

### 2.1 Muhasebe V2 & Gelir Yönetimi (Accounting)
- **FR-01 (Clutter Elimination)**: Remove the excessive stacked KPI cards, secondary progress blocks, and large static charts from the default top view.
- **FR-02 (Edesis KPI Bar)**: Provide exactly 4 concise, high-visibility metric tiles:
  1. Toplam Gelir (2026-2027 Dönemi Toplam Ciro)
  2. Tahsil Edilen (Tahsilat Tutarı & Yüzde İlerleme Çubuğu)
  3. Kalan Alacak (Açık Pozisyon)
  4. Vadesi Geçen / Riskli (veya Tahsilat Başarı Oranı)
- **FR-03 (Gelir Listesi Tablosu)**: Make "Gelir Yönetimi" the prominent central view matching Edesis `MUH_GelirV2` structure:
  - Columns: Gelir Kodu, Öğrenci / Müşteri Bilgisi, Açıklama, Brüt Tutar, Tahsil Edilen, Kalan Alacak, Vade Tarihi / Taksit Durumu, Durum Rozeti (badge), İşlemler (Tahsilat Yap, Makbuz, Senet, Detay).
  - Search & Period Filters: Filter by student/customer, period (2026-2027 / Tümü), and status.
- **FR-04 (Quick Modals & Receipts)**: Retain and polish quick installment collection, official PDF/Print Makbuz, Senet önizleme, and WhatsApp reminder actions.

### 2.2 Sınav Modülü (Exams Module)
- **FR-05 (Edesis Sınav Parity)**: Maintain Edesis subnav tabs (Sınav Yönetimi, Öğrenci Sınav Raporları & Karneler, Deneme Takvimi), clean filter toolbar, participant count, optical scan integration, and official Edesis Karne view.

### 2.3 Sözleşme Modülü (Contract Module)
- **FR-06 (MEB & Edesis Contract Parity)**: Ensure registration agreement generator (`CreateOrEditMUH_SozlesmeV2Dto`) includes student/parent info, program info, installment payment plan table, discounts, advance payment (peşinat), and print-ready MEB contract template with legal clauses and signatures.

### 2.4 Otomatik Kayıt / Yedekleme & Kurtarma (20:00 Daily Backup & Restore)
- **FR-07 (Daily 20:00 Snapshot)**: Automate database backup daily at 20:00 Turkey Time (17:00 UTC) covering all active D1 tables (`students`, `payments`, `expenses`, `classes`, `teachers`, `exams`, `exam_results`, `attendance`, `schedules`, `homework`, `mentorship`, `audit_logs`).
- **FR-08 (Idempotent Trigger & Manual Backup)**: Provide on-demand manual backup ("Şimdi Yedek Al") and idempotent background check ensuring today's 20:00 backup runs without fail.
- **FR-09 (1-Click Restore & Safety Snapshot)**: Before any restore action, take an automated `pre_restore` backup. Restore selected snapshot state safely.
- **FR-10 (Download & History Panel)**: Allow downloading raw JSON backup to disk and viewing snapshot history with table record counts.
