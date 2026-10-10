# Feature Specification: Codebase Modularization, Dead Code Elimination & White-Screen Crash Resolution

## 1. Overview & Context
Several core frontend files (`EdesisModules.js` at 4,976 lines, `EdesisSozlesmeler.js` at 3,052 lines, `App.js` at 2,761 lines, `MuhasebeV2Dashboard.js` at 2,429 lines, and `EdesisGelirListesi.js` at 2,335 lines) remain oversized monoliths that slow down LLM context reading and maintenance. Additionally, missing local imports in `App.js` (`PageHead`, `Button`, `Stat`) and `edesisStudentService.js` (`rows`) cause white-screen crashes on pages such as **Aylık Muhasebe Raporu** (`#reports`), **Hatırlatma Listesi** (`#reminders`), **Kullanıcılar & Roller** (`#users`), and **Denetim Kaydı** (`#audit`).

## 2. Functional Requirements
- **FR-001 (Zero Undefined Symbols & Build Guard)**: Fix all undefined JSX/JS symbols (`PageHead`, `Button`, `Stat` in `App.js`; `rows` in `edesisStudentService.js`) and enforce `no-undef` and `react/jsx-no-undef` in `frontend/craco.config.js` so build fails immediately on any missing symbol.
- **FR-002 (White-Screen Page Fixes)**: Ensure `#reports` (Aylık Muhasebe Raporu), `#reminders` (Taksit Takibi & Risk), `#users` (Kullanıcılar & Roller), `#audit` (Denetim Kaydı), `StudentProfileModal`, and `+ Tahsilat Ekle` (`Modal`) render and operate with zero runtime errors.
- **FR-003 (`EdesisModules.js` Decomposition)**: Split the 4,976-line `frontend/src/EdesisModules.js` monolith into focused domain modules under `frontend/src/modules/` (`ExamsPage.js`, `ExamSubModals.js`, `OfficialEdesisKarneModal.js`, `EdesisOptikSuiteModal.js`, `AttendancePage.js`, `SchedulesPage.js`, `HomeworkAndMentorship.js`), keeping `EdesisModules.js` as a <60-line barrel export.
- **FR-004 (`App.js` Decomposition)**: Extract `AuthAndNav.js`, `SystemPages.js` (`UsersPage`, `Reminders`, `Reports`, `AuditPage`), `StudentProfileModal.js`, and `QuickActionModal.js` (`Modal`, `CameraCapture`) from `frontend/src/App.js`, reducing `App.js` below 850 lines.
- **FR-005 (`EdesisSozlesmeler.js` & `EdesisGelirListesi.js` Decomposition)**: Remove dead `renderQuickEditModal` code and extract contract modals into `frontend/src/components/contracts/ContractModals.js` and income modals into `frontend/src/components/incomes/IncomeActionModals.js`.
- **FR-006 (`MuhasebeV2Dashboard.js` Decomposition)**: Extract inline tabs and modals into `CashBankLedgerTab.js`, `BackupRestoreTab.js`, and `MuhasebeQuickModals.js` under `frontend/src/components/tabs/`.
- **FR-007 (Dead Data Cleanup)**: Delete unused static dump `frontend/src/data/edesisStudentsData.json` (18,101 lines) and root temporary JSON dumps if unreferenced by tests.

## 3. Success Criteria
- **SC-001**: `npx eslint` with `no-undef` and `react/jsx-no-undef` returns `0 errors` across `frontend/src/` and `frontend/functions/`.
- **SC-002**: No single UI component file in `frontend/src/` exceeds 1,600 lines (`EdesisModules.js` < 60 lines, `App.js` < 850 lines).
- **SC-003**: All 18 test suites (`npm test`) pass 100%, production build succeeds, and live browser QA verifies `#reports` (Aylık Muhasebe Raporu) and all major routes without white screens.
