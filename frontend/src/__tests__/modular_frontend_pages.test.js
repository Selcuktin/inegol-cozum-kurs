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

afterEach(cleanup);

describe("AŞAMA 4: Modüler Frontend Mimarisi, Sayfalar & AuthGuard TDD Test Paketi", () => {
  const adminUser = { id: 1, username: "admin", role: "admin", name: "Yönetici" };
  const muhasebeUser = { id: 2, username: "muhasebe", role: "muhasebe", name: "Muhasebe Uzmanı" };
  const teacherUser = { id: 3, username: "ogretmen", role: "ogretmen", name: "Ders Öğretmeni" };

  describe("1. AuthGuard & Rol Yetkilendirme Motoru", () => {
    test("can() fonksiyonu rolleri ve izinleri kesin doğrulukla denetler", () => {
      expect(can(adminUser, "user_manage")).toBe(true);
      expect(can(muhasebeUser, "user_manage")).toBe(false);
      expect(can(teacherUser, "user_manage")).toBe(false);

      expect(can(adminUser, "payment_create")).toBe(true);
      expect(can(muhasebeUser, "payment_create")).toBe(true);
      expect(can(teacherUser, "payment_create")).toBe(false);

      expect(can(adminUser, "page_attendance")).toBe(true);
      expect(can(teacherUser, "page_attendance")).toBe(true);
      expect(can(muhasebeUser, "page_attendance")).toBe(false);

      // Nested quick-login response shape resilience: { ok: true, user: { role: 'admin' }, session_token: '...' }
      expect(can({ ok: true, user: { role: "admin" } }, "page_students")).toBe(true);
      expect(can({ ok: true, user: { role: "muhasebe" } }, "page_students")).toBe(true);
      expect(can({ ok: true, user: { role: "ogretmen" } }, "page_users")).toBe(false);
      expect(can(null, "page_students")).toBe(false);
      expect(can({}, "page_students")).toBe(false);
    });

    test("AuthGuard yetkisiz kullanıcıyı engeller ve güvenlik uyarısı gösterir", async () => {
      const { container } = await render(
        <AuthGuard me={teacherUser} action="page_users">
          <div data-testid="protected-content">Çok Gizli Kullanıcılar</div>
        </AuthGuard>
      );

      expect(container.querySelector('[data-testid="protected-content"]')).toBeNull();
      expect(container.querySelector('[data-testid="auth-guard-unauthorized"]')).not.toBeNull();
      expect(container.textContent).toContain("Yetkisiz Erişim Koruması");
    });

    test("AuthGuard yetkili kullanıcıya içeriği eksiksiz gösterir", async () => {
      const { container } = await render(
        <AuthGuard me={adminUser} action="page_users">
          <div data-testid="protected-content">Çok Gizli Kullanıcılar</div>
        </AuthGuard>
      );

      expect(container.querySelector('[data-testid="protected-content"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="auth-guard-unauthorized"]')).toBeNull();
      expect(container.textContent).toContain("Çok Gizli Kullanıcılar");
    });
  });

  describe("2. Sayfa Modülleri (Pages Decomposition)", () => {
    test("DashboardPage metrikleri ve genel bakışı render eder", async () => {
      const mockData = {
        students: [{ id: 1, student_name: "Ali Veli", total_fee: 50000, paid_amount: 20000 }],
        classes: [{ id: 10, name: "12-A", capacity: 20 }],
        payments: [{ id: 101, student_id: 1, amount: 20000, receipt_no: "THS001" }],
        expenses: []
      };

      const { container } = await render(
        <DashboardPage
          me={adminUser}
          data={mockData}
          totalCollected={20000}
          totalExpected={50000}
          totalExpenses={5000}
          onOpen={jest.fn()}
          onNavigate={jest.fn()}
          onSelect={jest.fn()}
        />
      );

      expect(container.textContent).toContain("Genel Bakış");
      expect(container.textContent).toContain("Sınıf Kontenjanları");
    });

    test("StudentsPage AuthGuard ile korunur ve yetkili kullanıcıya açılır", async () => {
      const { container } = await render(
        <StudentsPage
          me={adminUser}
          API="/api"
          search=""
          setSearch={jest.fn()}
          students={[{ id: 1, student_name: "Zeynep Masal", student_class: "11-A", status: "Kesin Kayıt", donem_id: "113" }]}
          guardedOpen={jest.fn()}
          setSelected={jest.fn()}
          setPage={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="students-page-container"]')).not.toBeNull();
      expect(container.textContent).toContain("Zeynep Masal");
    });

    test("ContractsPage AuthGuard ile korunur ve sözleşmeleri render eder", async () => {
      const { container } = await render(
        <ContractsPage
          me={adminUser}
          contracts={[{ id: 1, sozlesme_no: "SZL202600001", student_name: "Yavuz Emir Balcı" }]}
          students={[]}
          payments={[]}
          onNavigate={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="contracts-page-container"]')).not.toBeNull();
    });

    test("AccountingPage yetkili muhasebe personeline tam erişim sunar", async () => {
      const { container } = await render(
        <AccountingPage
          me={muhasebeUser}
          data={{ students: [], payments: [], expenses: [] }}
          API="/api"
          activeTab="dashboard"
          reload={jest.fn()}
          onOpen={jest.fn()}
          onSelectStudent={jest.fn()}
          onTabChange={jest.fn()}
          onNavigate={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="accounting-page-container"]')).not.toBeNull();
    });

    test("AcademicPage alt modüller (classes, teachers, attendance, schedules) arasında geçiş yapar", async () => {
      const mockClasses = [{ id: 1, name: "10-A", capacity: 20 }];
      const mockTeachers = [{ id: 1, name: "Ahmet Hoca", branch: "Matematik" }];

      const { container } = await render(
        <AcademicPage
          me={adminUser}
          mode="classes"
          classes={mockClasses}
          students={[]}
          teachers={mockTeachers}
          API="/api"
          reload={jest.fn()}
          guardedOpen={jest.fn()}
          setSelected={jest.fn()}
          onNavigate={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="academic-page-container"]')).not.toBeNull();
      expect(container.textContent).toContain("Sınıflar & Şubeler");
    });

    test("ExamOpticalPage sınav ve optik okuma süitini render eder", async () => {
      const { container } = await render(
        <ExamOpticalPage
          me={teacherUser}
          API="/api"
          students={[]}
          classes={[]}
          showOptikModal={false}
          onCloseOptikModal={jest.fn()}
          showKarneModal={null}
          onCloseKarneModal={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="exam-optical-page-container"]')).not.toBeNull();
    });
  });

  describe("3. MuhasebeV2 Sekme Modülleri (Tabs Decomposition)", () => {
    test("OverviewTab KPI kartlarını ve grafikleri barındırır", async () => {
      const { container } = await render(
        <OverviewTab
          totalCollected={150000}
          totalContractRevenue={300000}
          totalRemaining={150000}
          collectionRate={50}
          totalOverdueDebt={25000}
          fmtMoney={(n) => `${n} TL`}
        />
      );

      expect(container.querySelector('[data-testid="overview-tab-container"]')).not.toBeNull();
    });

    test("IncomesTab gelir listesi sekmesini barındırır", async () => {
      const { container } = await render(
        <IncomesTab
          students={[]}
          onSelectStudent={jest.fn()}
          onOpenGelir={jest.fn()}
          onNavigate={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="incomes-tab-container"]')).not.toBeNull();
    });

    test("OverdueAgingTab gecikme filtrelerini ve WhatsApp aksiyonunu sunar", async () => {
      const overdueMock = [
        { id: 1, student_name: "Mehmet Demir", student_no: "105", agingCategory: "1-30", daysOverdue: 15, remaining: 7500 }
      ];

      const { container } = await render(
        <OverdueAgingTab
          overdueStudents={overdueMock}
          agingSummary={{ c1_30: { count: 1 }, c31_60: { count: 0 }, c60plus: { count: 0 } }}
          onSelectStudent={jest.fn()}
          sendWhatsAppReminder={jest.fn()}
          onQuickPayment={jest.fn()}
          fmtMoney={(n) => `${n} TL`}
        />
      );

      expect(container.querySelector('[data-testid="overdue-aging-tab-container"]')).not.toBeNull();
      expect(container.textContent).toContain("Mehmet Demir");
      expect(container.textContent).toContain("15 Gün Gecikmede");
    });

    test("ScheduleCalendarTab vade takvimini render eder", async () => {
      const { container } = await render(
        <ScheduleCalendarTab
          students={[]}
          onSelectStudent={jest.fn()}
          onOpenGelir={jest.fn()}
          onNavigate={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="schedule-calendar-tab-container"]')).not.toBeNull();
    });

    test("CollectionsTab tahsilat listesini render eder", async () => {
      const { container } = await render(
        <CollectionsTab
          students={[]}
          payments={[]}
          API="/api"
          onSelectStudent={jest.fn()}
          onOpenGelir={jest.fn()}
          onNavigate={jest.fn()}
        />
      );

      expect(container.querySelector('[data-testid="collections-tab-container"]')).not.toBeNull();
    });

    test("ExpensesTab kurum giderlerini listeler ve gider ekleme modalını tetikler", async () => {
      const onAddExpense = jest.fn();
      const mockExpenses = [
        { id: 1, title: "Kira Ödemesi", category: "Kira", amount: 25000, account: "Banka", expense_date: "2026-10-01" }
      ];

      const { container } = await render(
        <ExpensesTab
          expenses={mockExpenses}
          onAddExpense={onAddExpense}
          fmtMoney={(n) => `${n} TL`}
        />
      );

      expect(container.querySelector('[data-testid="expenses-tab-container"]')).not.toBeNull();
      expect(container.textContent).toContain("Kira Ödemesi");
      
      const addBtn = container.querySelector('[data-testid="add-expense-button"]');
      expect(addBtn).not.toBeNull();
      fireEvent.click(addBtn);
      expect(onAddExpense).toHaveBeenCalledTimes(1);
    });
  });
});
