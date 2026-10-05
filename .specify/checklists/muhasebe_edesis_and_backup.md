# Muhasebe Edesis Parity & Backup Requirements Quality Checklist

**Purpose**: Requirements Quality Validation (Unit Tests for Requirements)
**Feature**: Edesis Muhasebe Parity, Exam/Contract Parity & 20:00 Daily Backup
**Created**: 2026-10-05

> **Ownership Note**: This checklist is a reviewer-owned requirements-quality review artifact. `[x]` indicates that the requirement quality criterion is met in the specification.

## 1. Requirement Completeness
- [ ] CHK001 - Are the exact 4 top KPI metrics and their calculation sources specified for the simplified accounting dashboard? [Completeness, Spec §FR-02]
- [ ] CHK002 - Are the required columns, badges, and action triggers explicitly defined for the Edesis Gelir Listesi grid? [Completeness, Spec §FR-03]
- [ ] CHK003 - Are all database tables required for the 20:00 daily snapshot enumerated without omissions? [Completeness, Spec §FR-07]
- [ ] CHK004 - Are error responses and fallback states defined for database backup and restore operations? [Completeness, Spec §FR-09]

## 2. Requirement Clarity
- [ ] CHK005 - Is "sade olmalı kart yığınlığı kaldırılmalı" quantified with specific sections to be removed or reorganized? [Clarity, Spec §FR-01]
- [ ] CHK006 - Is the 20:00 execution schedule defined with exact timezone handling (UTC vs UTC+3 TRT)? [Clarity, Spec §FR-07]
- [ ] CHK007 - Are the restore confirmation constraints and safety pre-restore requirements unambiguously specified? [Clarity, Spec §FR-09]

## 3. Requirement Consistency
- [ ] CHK008 - Do the accounting data models align consistently between the backend D1 database and Edesis `MUH_GelirV2Dto` representations? [Consistency, Spec §FR-03]
- [ ] CHK009 - Are contract terms, installment structures, and advance payment formulas consistent between EdesisStudentModal and Documents view? [Consistency, Spec §FR-06]
- [ ] CHK010 - Is the sub-tab navigation schema aligned between mobile and desktop viewport layouts? [Consistency, Spec §FR-01]

## 4. Scenario & Edge Case Coverage
- [ ] CHK011 - Is the behavior specified when the system clock passes 20:00 without active user traffic (idempotent catch-up)? [Edge Case, Spec §FR-08]
- [ ] CHK012 - Are data isolation and rollback requirements specified if a database restore encounters a partial network failure? [Coverage, Spec §FR-09]
- [ ] CHK013 - Are zero-state scenarios defined when no backup snapshots exist yet? [Edge Case, Spec §FR-10]

## 5. Non-Functional & Security Attributes
- [ ] CHK014 - Are access controls and authorization role checks specified for the restore and manual backup triggers? [Security, Spec §FR-08]
- [ ] CHK015 - Is maximum backup snapshot payload size and JSON serialization performance bounded? [Performance, Spec §FR-07]
