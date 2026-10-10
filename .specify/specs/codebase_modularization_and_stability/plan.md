# Implementation Plan: Codebase Modularization & Stability

## 1. Architecture & Module Boundaries
- **Barrel Compatibility Pattern**: Every split monolith (`EdesisModules.js`, `App.js`, `EdesisSozlesmeler.js`, `MuhasebeV2Dashboard.js`, `EdesisGelirListesi.js`) preserves its existing named and default exports so all 18 Jest test suites and sibling imports work without modification.
- **Build-Time Safety Gate**: `frontend/craco.config.js` is configured with `plugins: ["react"]` and rules `"no-undef": "error"` and `"react/jsx-no-undef": "error"`.

## 2. Target File Map
1. **`frontend/src/modules/` (from `EdesisModules.js` — 4,976 lines)**:
   - `frontend/src/modules/shared.js`: `openWhatsApp`, `formatDate`, shared exam constants (`CAN`, `DEMO_EXAMS_SEED`, `SCORE_COEFFICIENTS`, `calculateSubjectNet`, `estimateScoreAndRank`).
   - `frontend/src/modules/exams/ExamsPage.js`: `ExamsPage` main component.
   - `frontend/src/modules/exams/ExamSubModals.js`: `EdesisRaporModal`, `EdesisStudentReportsView`, `EdesisCevapKeyModal`, `EdesisSinifKarsilastirmaModal`, `EdesisExamCalendarView`.
   - `frontend/src/modules/exams/OfficialEdesisKarneModal.js`: `OfficialEdesisKarneModal`.
   - `frontend/src/modules/exams/EdesisOptikSuiteModal.js`: `EdesisOptikSuiteModal`, `EdesisOptikModal`.
   - `frontend/src/modules/academic/AttendancePage.js`: `AttendancePage`.
   - `frontend/src/modules/academic/SchedulesPage.js`: `SchedulesPage`.
   - `frontend/src/modules/academic/HomeworkAndMentorship.js`: `HomeworkPage`, `MentorshipPage`, `EdesisDashboardWidgets`.
   - `frontend/src/EdesisModules.js`: 30-line barrel file re-exporting all symbols.

2. **`frontend/src/pages/` & `frontend/src/components/` (from `App.js` — 2,761 lines)**:
   - `frontend/src/components/layout/AuthAndNav.js`: `Brand`, `AuthCallback`, `Login`, `PwaBanner`, `MobileBottomNav`.
   - `frontend/src/pages/SystemPages.js`: `UsersPage`, `Reminders`, `Reports` (Aylık Muhasebe Raporu), `AuditPage`, `downloadBlob`.
   - `frontend/src/components/StudentProfileModal.js`: `StudentProfileModal`.
   - `frontend/src/components/QuickActionModal.js`: `Modal`, `CameraCapture`, `computeEffective`.
   - `frontend/src/App.js`: Core `App` + `MainApp` router and state container (< 850 lines).

3. **Contract, Income & Accounting Sub-Components**:
   - `frontend/src/components/contracts/ContractModals.js`: Extracted modals from `EdesisSozlesmeler.js` (`PaymentPlanModal`, `MebContractPrintModal`, `ContractSummaryModal`, `CancelContractModal`, `ContractTemplateModal`, `NewContractWizardModal`), plus removal of dead `renderQuickEditModal`.
   - `frontend/src/components/incomes/IncomeActionModals.js`: Extracted modals from `EdesisGelirListesi.js` (`NewIncomeModal`, `DeleteIncomeModal`, `QuickCollectModal`).
   - `frontend/src/components/tabs/CashBankLedgerTab.js`, `BackupRestoreTab.js`, `MuhasebeQuickModals.js`: Extracted tabs/modals from `MuhasebeV2Dashboard.js`.
