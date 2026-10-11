# Tasks: Codebase Modularization, Dead Code Elimination & White-Screen Fixes

## Phase 1: Foundational Safety & White-Screen Bug Fixes
- [ ] T001 Fix missing `const rows = await res.json();` in `frontend/src/lib/edesisStudentService.js`
- [ ] T002 Enable `no-undef` and `react/jsx-no-undef` in `frontend/craco.config.js` and remove unused `frontend/src/data/edesisStudentsData.json`

## Phase 2: [US1] App.js Decomposition & System Pages (Aylık Muhasebe Raporu) Fix
- [ ] T003 [P] [US1] Extract `Brand`, `AuthCallback`, `Login`, `PwaBanner`, `MobileBottomNav` into `frontend/src/components/layout/AuthAndNav.js`
- [ ] T004 [P] [US1] Extract `UsersPage`, `Reminders`, `Reports`, `AuditPage`, `downloadBlob` with proper `PageHead`/`Button`/`Stat` imports into `frontend/src/pages/SystemPages.js`
- [ ] T005 [P] [US1] Extract `StudentProfileModal` into `frontend/src/components/StudentProfileModal.js` and `Modal`/`CameraCapture` into `frontend/src/components/QuickActionModal.js`
- [ ] T006 [US1] Refactor `frontend/src/App.js` to import extracted components and reduce file size below 850 lines

## Phase 3: [US2] EdesisModules.js Decomposition (4,976 Lines -> Barrel + Domain Modules)
- [ ] T007 [P] [US2] Extract shared helpers and exam components into `frontend/src/modules/shared.js`, `frontend/src/modules/exams/ExamsPage.js`, `frontend/src/modules/exams/ExamSubModals.js`, `frontend/src/modules/exams/OfficialEdesisKarneModal.js`, and `frontend/src/modules/exams/EdesisOptikSuiteModal.js`
- [ ] T008 [P] [US2] Extract academic components into `frontend/src/modules/academic/AttendancePage.js`, `frontend/src/modules/academic/SchedulesPage.js`, and `frontend/src/modules/academic/HomeworkAndMentorship.js`
- [ ] T009 [US2] Replace `frontend/src/EdesisModules.js` with a clean barrel export file (< 60 lines)

## Phase 4: [US3] Contracts, Incomes & MuhasebeV2 Decomposition
- [ ] T010 [P] [US3] Extract modals from `frontend/src/components/EdesisSozlesmeler.js` into `frontend/src/components/contracts/ContractModals.js` and remove dead `renderQuickEditModal`
- [ ] T011 [P] [US3] Extract modals from `frontend/src/components/EdesisGelirListesi.js` into `frontend/src/components/incomes/IncomeActionModals.js`
- [ ] T012 [P] [US3] Extract `CashBankLedgerTab.js`, `BackupRestoreTab.js`, and `MuhasebeQuickModals.js` from `frontend/src/components/MuhasebeV2Dashboard.js`

## Phase 5: Verification, Build, Deploy & Live Browser QA
- [ ] T013 Run ESLint (`no-undef`, `react/jsx-no-undef`), `npm test` (18 suites), and `npm run build` in `frontend/`
- [ ] T014 Deploy to Cloudflare Pages and run live visual verification with `browser` subagent across `#reports` (Aylık Muhasebe Raporu), `#reminders`, `#users`, `#audit`, `#documents`, `#payments`, `#exams`, and `#schedules`

## Phase 6: Convergence (Post-Analysis Stability & Zero-Error Tasks)
- [x] T015 [Security] Remove hardcoded passwords in `frontend/functions/api/routes/auth.js` and enforce `env.ADMIN_PASSWORD` validation
- [x] T016 [Security] Require admin role for `POST /backup` and `POST /backup/restore` in `system.js` and add `BACKUP_TOKEN` to `daily-backup.yml`
- [x] T017 [Database] Sanitize real PII/KVKK seed data in `frontend/schema.sql` with synthetic test records
- [x] T018 [Integrity] Remove `OR c.student_name = s.student_name` and `stu-` loose join branches in `contracts.js` and `students.js`; enforce canonical `c.student_id = s.id`
- [x] T019 [Integrity] Eliminate `buildSyntheticContractForStudent` in `edesisAccountingService.js`; rely strictly on canonical D1 records to prevent count inflation
- [x] T020 [Performance] Remove `CREATE TABLE IF NOT EXISTS` DDL statement inside `getNextSequence` in `utils.js`
- [x] T021 [PWA] Upgrade `frontend/public/sw.js` caching strategy to Network-First to prevent stale chunk lockups after deployments
- [x] T022 [Refactor] Trim `frontend/src/App.js` below 850 lines by extracting static category configurations and router helpers
- [x] T023 [Refactor] Decompose `frontend/src/components/EdesisSozlesmeler.js` (< 1,600 lines) and `MuhasebeV2Dashboard.js` (< 1,600 lines)
- [x] T024 [Test] Add `global.fetch` mocks in Jest test setup to eliminate unhandled `AggregateError` noise during test runs
- [x] T025 [CI/CD] Add `.github/workflows/deploy.yml` pipeline with automated test, build, and `wrangler pages deploy`
