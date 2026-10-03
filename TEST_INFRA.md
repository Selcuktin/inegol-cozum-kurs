# E2E Test Infra: inegol-cozum-edesis

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Schedules 7-Column Matrix Default | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 2 | Schedules 09:00-18:30 Time Rows | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 3 | Schedules Quick Add/Edit/Delete | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 4 | Schedules Mobile Horizontal Scroll | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 5 | Muhasebe V2 KPI Cards | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | 12-Month Dynamic Trend Chart | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 7 | Aging Report & Real Overdue Buckets | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 8 | WhatsApp Reminder with Due Date | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 9 | Revenue & Payment Method Distribution | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 10 | 5 Bank & Cash Registers Bidirectional Ledger | ORIGINAL_REQUEST §R1, §R2 | 5 | 5 | ✓ |
| 11 | Expense Account Selection & Balance Deduction | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 12 | Institutional Payment Receipt Generation & Print | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 13 | Official Promissory Note Suite Generation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 14 | Evidence & Visual Verification | ORIGINAL_REQUEST Acceptance Criteria | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Jest / React Testing Library (`yarn test --watchAll=false`) + Puppeteer/Playwright browser automation.
- Test suites:
  - `frontend/src/__tests__/schedules_matrix.test.js`
  - `frontend/src/__tests__/muhasebe_v2_dashboard.test.js`
  - `frontend/src/__tests__/cash_bank_ledger.test.js`
  - `frontend/src/__tests__/print_modals.test.js`
- Test case format: Given-When-Then opaque box test assertions verifying rendered DOM elements and behaviors.
- Directory layout: `frontend/src/__tests__/`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Student Registration to Installment Aging & WhatsApp | F5, F7, F8, F10 | High |
| 2 | Expense Deduction across Vakıfbank vs Cash Register | F5, F10, F11 | High |
| 3 | 7-Day Timetable Conflict Checking & Time Matrix Navigation | F1, F2, F3, F4 | Medium |
| 4 | Official Printed Receipt and Promissory Note Verification | F12, F13 | Medium |
| 5 | 12-Month Trend and Method Distribution Parity with Real Edesis Backup | F6, F9, F10 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
