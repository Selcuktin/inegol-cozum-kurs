# Project: Edesis Muhasebe V2 & Haftalık Ders Programı Yatay Matris Entegrasyonu

## Architecture
- **Frontend SPA**: React 19 (`frontend/src/`), Tailwind CSS, Radix UI, Lucide React, Recharts 3.6.0.
- **Routing**: Client-side hash routing (`window.location.hash`) in `App.js` (`#payments`, `#schedules`, `#students`, vb.).
- **Backend API**: Cloudflare Pages Functions (`functions/api/[[route]].js` and `frontend/functions/api/[[route]].js`).
- **Storage / Database**: Cloudflare D1 SQLite database (`schema.sql`), local SQLite / mock fallback.
- **Reporting & Accounting**:
  - `MuhasebeV2Dashboard.js`: KPI cards, 12-month dynamic trends, aging report, WhatsApp debt reminders, distribution charts.
  - Kasa & Banka Defteri: T.C. Vakıflar Bankası İnegöl Şb., T.C. Halkbank İnegöl Şb., Nakit Ana Kasa, POS, Senet/Çek portföyü çift yönlü hareket defteri.
  - `ReceiptModal.js`: Kurum antetli resmi tahsilat makbuzu.
  - `PromissoryNoteModal.js`: TTK uyumlu matbu senet / bono süiti.
- **Ders Programı (Schedules)**:
  - `SchedulesPage` (`EdesisModules.js`): 7-column horizontal weekly matrix (09:00 - 18:50, Pazartesi - Pazar).
  - Responsive horizontal scrolling with sticky time column (`App.css`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | M1-Schedules-Matrix | 7 sütunlu (Pazartesi-Pazar) soldan sağa yatay matris varsayılan görünüm (`activeDayView=0`) ve `min-width: 1060px` CSS | M1 | R3, Survey |
| 2 | M1-Schedules-Slots | 09:00 - 18:30 arası 10 periyotluk saat satırları, yapışkan (`sticky`) saat sütunu | M1 | R3, Survey |
| 3 | M1-Schedules-Interactions | Boş hücreye tıklama ile hızlı ders ekleme modalı, karta tıklama ile düzenleme/silme ve çakışma uyarıları | M1 | R3, Survey |
| 4 | M1-Schedules-Mobile | Mobil ve küçük ekranlarda yatay kaydırma (`overflow-x: auto`) ve dikey görünüme geçiş seçeneği | M1 | R3, Survey |
| 5 | M2-KPI-Cards | 5 ana KPI kartı: Toplam Kayıt Cirosu (`getEffectiveTotalFee`), Gerçekleşen Tahsilat, Bu Ay Vadesi Gelenler, Gecikmiş Taksitler, Tahsilat Başarı Oranı | M2 | R1, Survey |
| 6 | M2-Dynamic-Trend-Chart | 12 Aylık Gelir & Tahsilat Recharts grafiği: Gerçek taksit tahakkuku vs gerçekleşen nakit akışı karşılaştırması | M2 | R1, Survey |
| 7 | M2-Aging-Report | Taksit yaşlandırma (1-30 gün, 31-60 gün, 60+ gün) gerçek vade tarihlerine göre ve dinamik yüzde dağılımı | M2 | R1, Survey |
| 8 | M2-WhatsApp-Reminder | Tek tıkla Veli WhatsApp borç hatırlatma mesaj şablonu (öğrenci adı, vade tarihi, kalan borç, banka IBAN bilgisi) | M2 | R1, Survey |
| 9 | M2-Distribution-Charts | Gelir kategorileri (Sözleşme, Kitap/Yayın, Etüt) ve tahsilat yöntemleri (Nakit, POS, Havale, Senet) görsel dağılımı | M2 | R1, Survey |
| 10 | M3-Cash-Bank-Ledger | 5 hesap (Vakıfbank, Halkbank, Nakit, POS, Senet) için çift yönlü (Tahsilat + / Gider -) defter ve anlık bakiye | M3 | R1, R2, Survey |
| 11 | M3-Expense-Account-Integration | Gider ekleme modalında kasa/banka seçimi ve seçilen hesaptan düşüş mantığı, `expenses.account` desteği | M3 | R2, Survey |
| 12 | M3-Official-Receipt-Print | Kurum antetli resmi Tahsilat Makbuzu çıktısı ve `@media print` CSS modal izolasyonu | M3 | R2, Survey |
| 13 | M3-Promissory-Note-Suite | TTK uyumlu matbu Senet (Bono) süiti, çoklu taksit dökümü, indirim/ek ücret dahil net tutar ve `@media print` CSS izolasyonu | M3 | R2, Survey |
| 14 | M4-Evidence-Verification | Tarayıcı üzerinde ekran görüntüleri (/agency-evidence-collector), E2E test koşumu ve tam parite kanıtları | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Schedules Matrix Optimization | R3: 7-column horizontal weekly timetable grid, sticky column, responsive scroll, quick actions | none | PLANNED |
| M2 | Muhasebe V2 Financial Reporting | R1: KPI cards, 12-month dynamic trends, real aging report, WhatsApp reminder with due_date, revenue/method charts | none | PLANNED |
| M3 | Cash/Bank Ledger & Print Suite | R2: Bidirectional Cash/Bank ledger, expense accounts integration, receipt & promissory note print CSS isolation | M2 | PLANNED |
| M4 | E2E Testing & Evidence Collection | Acceptance Criteria: Automated E2E verification, headless browser testing, screenshot evidence capture | M1, M2, M3 | PLANNED |

## Interface Contracts
### Schedules Matrix (`frontend/src/EdesisModules.js` ↔ `frontend/src/App.css`)
- State: `activeDayView = 0` (7-day matrix).
- Time slots: `TIME_SLOTS` ("09:00 - 09:45" to "18:05 - 18:50").
- Days: `DAYS` (1: Pazartesi to 7: Pazar).
- CSS: `.timetable-grid` (`grid-template-columns: 110px repeat(7, minmax(130px, 1fr))`, `min-width: 1060px`).
- API: `GET /schedules?class_id=...`, `POST /schedules`, `PUT /schedules/:id`, `DELETE /schedules/:id`.

### Muhasebe V2 Dashboard (`MuhasebeV2Dashboard.js` ↔ API & Data)
- Input props: `{ me, data, onOpen, onSelectStudent, API, reload }`.
- Data props: `data.students`, `data.payments`, `data.expenses`, `data.classes`.
- Financial computations:
  - `totalContractRevenue`: sum of `getEffectiveTotalFee(s)`.
  - `dueThisMonth`: sum of installments with `due_date` in current calendar month.
  - `totalOverdue`: sum of unpaid installments with `due_date < today`.
  - `agingBuckets`: `1-30 days`, `31-60 days`, `60+ days` overdue.
  - `whatsappUrl`: `https://wa.me/{phone}?text={encodedMsg}` with student name, due date, amount, IBAN.

### Kasa & Gider Entegrasyonu (`MuhasebeV2Dashboard.js` ↔ `ReceiptModal.js` / `PromissoryNoteModal.js`)
- Expense model: `{ title, amount, expense_date, category, account }` (`account`: 'nakit' | 'vakifbank' | 'halkbank' | 'pos').
- Account balances: initial/historical inflows minus account-specific expenses.
- Print isolation: `@media print` hides `.modal-backdrop`, `.modal-head`, `.modal-foot`, `.sidebar`, `.topbar`; isolates `.paper-preview`, `.receipt-sheet`, `.promissory-note-sheet`.

## Code Layout
- `frontend/src/components/MuhasebeV2Dashboard.js`: Main financial dashboard, KPIs, charts, registers, aging, WhatsApp.
- `frontend/src/components/ReceiptModal.js`: Official payment receipt modal with institutional branding.
- `frontend/src/components/PromissoryNoteModal.js`: Promissory note (bono) generator with legal wording.
- `frontend/src/EdesisModules.js`: Weekly timetable grid (`SchedulesPage`) and slot modals.
- `frontend/src/App.css`: Timetable styles, modal print styles, dashboard layout styles.
- `frontend/src/App.js`: Routing for `#payments` and `#schedules`, role permissions, modal triggers.
- `frontend/functions/api/[[route]].js`: Serverless API routes for `/payments`, `/expenses`, `/schedules`.
- `frontend/src/__tests__/`: Automated integration and unit tests for accounting and schedule matrices.
