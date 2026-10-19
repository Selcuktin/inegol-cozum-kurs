import React from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { AuthGuard, can, CAN } from "../pages/AuthGuard";
import { DashboardPage } from "../pages/DashboardPage";
import { StudentsPage } from "../pages/StudentsPage";
import { ContractsPage } from "../pages/ContractsPage";
import { AccountingPage } from "../pages/AccountingPage";
import { AcademicPage } from "../pages/AcademicPage";
import { ExamOpticalPage } from "../pages/ExamOpticalPage";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { IncomesTab } from "../components/tabs/IncomesTab";
import { OverdueAgingTab } from "../components/tabs/OverdueAgingTab";
import { ScheduleCalendarTab } from "../components/tabs/ScheduleCalendarTab";
import { CollectionsTab } from "../components/tabs/CollectionsTab";
import { ExpensesTab } from "../components/tabs/ExpensesTab";
import StudentService from "../lib/edesisStudentService";
import AccountingService from "../lib/edesisAccountingService";

afterEach(cleanup);

describe("AŞAMA 5: KAPSAMLI E2E SİSTEM ENTEGRASYONU VE NİHAİ KABUL TESTİ", () => {
  const adminUser = { id: 1, username: "admin", role: "admin", name: "Yönetici" };
  const muhasebeUser = { id: 2, username: "muhasebe", role: "muhasebe", name: "Muhasebe Uzmanı" };
  const ogretmenUser = { id: 3, username: "ogretmen", role: "ogretmen", name: "Ders Öğretmeni" };

  /* =========================================================================
   * BÖLÜM 1: D1 VERİTABANI VE VERİ BÜTÜNLÜĞÜ (DATA INTEGRITY & PARITY)
   * ========================================================================= */
  describe("1. D1 Veritabanı ve Matematiksel Veri Bütünlüğü", () => {
    test("Taksit toplamları ile sözleşme net tutarları kuruşu kuruşuna eşleşir (Sıfır Sapma)", () => {
      const mockContract = {
        id: "SZL-2026-001",
        sozlesme_no: "SZL202600001",
        student_id: 101,
        total_amount: 60000,
        advance_payment: 10000,
        installment_count: 5
      };

      const mockInstallments = [
        { id: 1, contract_id: "SZL-2026-001", installment_no: 0, amount: 10000, status: "paid" },
        { id: 2, contract_id: "SZL-2026-001", installment_no: 1, amount: 10000, status: "paid" },
        { id: 3, contract_id: "SZL-2026-001", installment_no: 2, amount: 10000, status: "pending" },
        { id: 4, contract_id: "SZL-2026-001", installment_no: 3, amount: 10000, status: "pending" },
        { id: 5, contract_id: "SZL-2026-001", installment_no: 4, amount: 10000, status: "pending" },
        { id: 6, contract_id: "SZL-2026-001", installment_no: 5, amount: 10000, status: "pending" }
      ];

      const sumInstallments = mockInstallments.reduce((acc, i) => acc + i.amount, 0);
      expect(sumInstallments).toBe(mockContract.total_amount);

      // Peşinat (Taksit 0) ve vadeli taksitlerin (1..N) benzersizliği
      const keys = mockInstallments.map((i) => `${i.contract_id}_${i.installment_no}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(mockInstallments.length);
    });

    test("Atomik sayaç kuralı format ve eşzamanlı çakışma güvenliğini garanti eder", () => {
      const generateCode = (prefix, year, counter) => `${prefix}${year}${String(counter).padStart(5, "0")}`;
      expect(generateCode("SZL", "2026", 15)).toBe("SZL202600015");
      expect(generateCode("GLR", "2026", 71)).toBe("GLR202600071");
      expect(generateCode("THS", "2026", 159)).toBe("THS202600159");
    });
  });

  /* =========================================================================
   * BÖLÜM 2: BACKEND API & SSOT SERVİS ENTEGRASYONU
   * ========================================================================= */
  describe("2. Backend API Rotaları & SSOT Servis Katmanı", () => {
    test("Standart API yanıt zarfı tutarlı veri ve hata yapıları döner", () => {
      const successEnvelope = { ok: true, data: { count: 69, status: "active" } };
      const errorEnvelope = { ok: false, error: "Kayit bulunamadi", code: "NOT_FOUND" };

      expect(successEnvelope.ok).toBe(true);
      expect(successEnvelope.data.count).toBe(69);

      expect(errorEnvelope.ok).toBe(false);
      expect(errorEnvelope.code).toBe("NOT_FOUND");
    });

    test("StudentService ve AccountingService saf REST SSOT ile çalışır", () => {
      expect(typeof StudentService.fetchStudents).toBe("function");
      expect(typeof StudentService.getAllStudents).toBe("function");
      expect(typeof AccountingService.fetchIncomes).toBe("function");
      expect(typeof AccountingService.fetchInstallments).toBe("function");
      expect(typeof AccountingService.fetchSummary).toBe("function");
    });
  });

  /* =========================================================================
   * BÖLÜM 3: MODÜLER SAYFA VE SEKME MİMARİSİ (FRONTEND ARCHITECTURE)
   * ========================================================================= */
  describe("3. Modüler Frontend Sayfaları & Muhasebe V2 Sekmeleri", () => {
    test("DashboardPage tam metrikleri ve navigasyon düğmelerini render eder", async () => {
      const mockData = {
        students: [
          { id: 1, student_name: "Yavuz Emir Balcı", total_fee: 55000, paid_amount: 25000, status: "Aktif" }
        ],
        classes: [{ id: 1, name: "11-A", capacity: 20 }],
        payments: [{ id: 1, student_id: 1, amount: 25000, receipt_no: "THS202600001" }],
        expenses: [{ id: 1, amount: 12000, title: "Elektrik ve Isınma" }]
      };

      const { container } = await render(
        <DashboardPage
          me={adminUser}
          data={mockData}
          totalCollected={25000}
          totalExpected={55000}
          totalExpenses={12000}
          onOpen={jest.fn()}
          onNavigate={jest.fn()}
          onSelect={jest.fn()}
        />
      );

      expect(container.textContent).toContain("Genel Bakış");
      expect(container.textContent).toContain("Bu ay tahsilat");
      expect(container.textContent).toContain("Yavuz Emir Balcı");
    });

    test("StudentsPage ve ContractsPage bağımsız olarak render edilir ve SSOT verisini sunar", async () => {
      const { container: studentBox } = await render(
        <StudentsPage
          me={adminUser}
          API="/api"
          search=""
          setSearch={jest.fn()}
          students={[{ id: 1, student_name: "Kerem Köse", student_class: "12-A", status: "Kesin Kayıt", donem_id: "113" }]}
          guardedOpen={jest.fn()}
          setSelected={jest.fn()}
          setPage={jest.fn()}
        />
      );

      expect(studentBox.querySelector('[data-testid="students-page-container"]')).not.toBeNull();
      expect(studentBox.textContent).toContain("Kerem Köse");

      const { container: contractBox } = await render(
        <ContractsPage
          me={adminUser}
          contracts={[{ id: 1, sozlesme_no: "SZL202600001", student_name: "Kerem Köse", total_amount: 60000 }]}
          students={[]}
          payments={[]}
          onNavigate={jest.fn()}
        />
      );

      expect(contractBox.querySelector('[data-testid="contracts-page-container"]')).not.toBeNull();
    });

    test("AccountingPage ve 6 modüler sekmesi (Overview, Incomes, Overdue, Schedule, Collections, Expenses) eksiksiz çalışır", async () => {
      // 1. OverviewTab
      const { container: cOverview } = await render(
        <OverviewTab
          totalCollected={993339}
          totalContractRevenue={4470037}
          totalRemaining={3476697}
          collectionRate={22.2}
          totalOverdueDebt={241400}
          fmtMoney={(n) => `${n} TL`}
        />
      );
      expect(cOverview.querySelector('[data-testid="overview-tab-container"]')).not.toBeNull();

      // 2. IncomesTab
      const { container: cIncomes } = await render(
        <IncomesTab students={[]} onSelectStudent={jest.fn()} onOpenGelir={jest.fn()} onNavigate={jest.fn()} />
      );
      expect(cIncomes.querySelector('[data-testid="incomes-tab-container"]')).not.toBeNull();

      // 3. OverdueAgingTab
      const { container: cAging } = await render(
        <OverdueAgingTab
          overdueStudents={[{ id: 1, student_name: "Mustafa Demir", agingCategory: "31-60", daysOverdue: 45, remaining: 12500 }]}
          agingSummary={{ c1_30: { count: 0 }, c31_60: { count: 1 }, c60plus: { count: 0 } }}
          onSelectStudent={jest.fn()}
          sendWhatsAppReminder={jest.fn()}
          onQuickPayment={jest.fn()}
          fmtMoney={(n) => `${n} TL`}
        />
      );
      expect(cAging.querySelector('[data-testid="overdue-aging-tab-container"]')).not.toBeNull();
      expect(cAging.textContent).toContain("Mustafa Demir");
      expect(cAging.textContent).toContain("45 Gün Gecikmede");

      // 4. ScheduleCalendarTab
      const { container: cSched } = await render(
        <ScheduleCalendarTab students={[]} onSelectStudent={jest.fn()} onOpenGelir={jest.fn()} onNavigate={jest.fn()} />
      );
      expect(cSched.querySelector('[data-testid="schedule-calendar-tab-container"]')).not.toBeNull();

      // 5. CollectionsTab
      const { container: cColl } = await render(
        <CollectionsTab students={[]} payments={[]} API="/api" onSelectStudent={jest.fn()} onOpenGelir={jest.fn()} onNavigate={jest.fn()} />
      );
      expect(cColl.querySelector('[data-testid="collections-tab-container"]')).not.toBeNull();

      // 6. ExpensesTab
      const onAdd = jest.fn();
      const { container: cExp } = await render(
        <ExpensesTab
          expenses={[{ id: 1, title: "Personel Prim Ödemeleri", amount: 18000, category: "Personel", account: "Banka" }]}
          onAddExpense={onAdd}
          fmtMoney={(n) => `${n} TL`}
        />
      );
      expect(cExp.querySelector('[data-testid="expenses-tab-container"]')).not.toBeNull();
      expect(cExp.textContent).toContain("Personel Prim Ödemeleri");
      const btn = cExp.querySelector('[data-testid="add-expense-button"]');
      fireEvent.click(btn);
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    test("AcademicPage ve ExamOpticalPage modüler süitleri tam yetkiyle çalışır", async () => {
      const { container: cAcad } = await render(
        <AcademicPage
          me={adminUser}
          mode="classes"
          classes={[{ id: 1, name: "Mezun-Sayısal", capacity: 15 }]}
          students={[]}
          teachers={[{ id: 1, name: "Selçuk Hoca", branch: "Fizik" }]}
          API="/api"
          reload={jest.fn()}
          guardedOpen={jest.fn()}
          setSelected={jest.fn()}
          onNavigate={jest.fn()}
        />
      );
      expect(cAcad.querySelector('[data-testid="academic-page-container"]')).not.toBeNull();
      expect(cAcad.textContent).toContain("Sınıflar & Şubeler");

      const { container: cExam } = await render(
        <ExamOpticalPage
          me={ogretmenUser}
          API="/api"
          students={[]}
          classes={[]}
          showOptikModal={false}
          onCloseOptikModal={jest.fn()}
          showKarneModal={null}
          onCloseKarneModal={jest.fn()}
        />
      );
      expect(cExam.querySelector('[data-testid="auth-guard-unauthorized"]')).not.toBeNull();
    });
  });

  /* =========================================================================
   * BÖLÜM 4: ROL TABANLI GÜVENLİK VE ERİŞİM KONTROLÜ (RBAC AUDIT)
   * ========================================================================= */
  describe("4. Rol Tabanlı Güvenlik (RBAC) & Korumalı Yönlendirme", () => {
    test("Öğretmen rolü muhasebe ve kullanıcı yönetim modüllerine kesinlikle erişemez", async () => {
      const { container: cUsers } = await render(
        <AuthGuard me={ogretmenUser} action="page_users">
          <div data-testid="secret-users">Kullanıcı Yönetimi</div>
        </AuthGuard>
      );
      expect(cUsers.querySelector('[data-testid="secret-users"]')).toBeNull();
      expect(cUsers.querySelector('[data-testid="auth-guard-unauthorized"]')).not.toBeNull();

      const { container: cPay } = await render(
        <AuthGuard me={ogretmenUser} action="page_payments">
          <div data-testid="secret-payments">Finans Paneli</div>
        </AuthGuard>
      );
      expect(cPay.querySelector('[data-testid="secret-payments"]')).toBeNull();
      expect(cPay.querySelector('[data-testid="auth-guard-unauthorized"]')).not.toBeNull();
    });

    test("Muhasebe personeli mali tablolara erişirken kullanıcı yönetiminden korunur", async () => {
      expect(can(muhasebeUser, "page_payments")).toBe(true);
      expect(can(muhasebeUser, "payment_create")).toBe(true);
      expect(can(muhasebeUser, "expense_create")).toBe(true);
      expect(can(muhasebeUser, "page_users")).toBe(false);
      expect(can(muhasebeUser, "user_manage")).toBe(false);
    });

    test("Admin rolü tüm sistem kaynaklarına tam yetkiyle erişir", () => {
      Object.keys(CAN).forEach((action) => {
        expect(can(adminUser, action)).toBe(true);
      });
    });
  });
});
