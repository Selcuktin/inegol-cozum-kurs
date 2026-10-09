import React from "react";
import axios from "axios";
import { MuhasebeV2Dashboard } from "../components/MuhasebeV2Dashboard";
import { SchedulesPage } from "../EdesisModules";
import {
  render,
  cleanup,
  fireEvent,
  waitFor,
  mockClasses
} from "./test_helpers";

jest.mock("axios");
jest.mock("../lib/edesisAccountingService", () => {
  const actual = jest.requireActual("../lib/edesisAccountingService");
  return {
    __esModule: true,
    ...actual,
    ENABLE_KASA_BANKA: true
  };
});

describe("CHALLENGER EMPIRICAL SUITE: Financial Arithmetic & Schedule Collision Tests", () => {
  const API = "/api";
  let originalAlert;
  let originalConfirm;

  beforeEach(() => {
    jest.clearAllMocks();
    originalAlert = window.alert;
    originalConfirm = window.confirm;
    window.alert = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: { id: "res-1" } });
  });

  afterEach(async () => {
    window.alert = originalAlert;
    window.confirm = originalConfirm;
    await cleanup();
  });

  /* =====================================================================
   * 1. FINANCIAL CALCULATIONS IN MuhasebeV2Dashboard.js
   * ===================================================================== */
  describe("1. Financial Calculations: Contract Volume, Boundaries & Discounts", () => {
    test("1.1: Boundary testing with zero fees, large values, and malformed extra_fees", async () => {
      const studentBoundary = [
        // Zero fee student
        {
          id: "stu-zero",
          student_name: "Sıfır Ücret",
          total_fee: 0,
          paid_amount: 0,
          discount_amount: 0,
          extra_fees: "{}",
          installment_count: 1,
          due_date: "2026-10-15"
        },
        // Ultra large value (₺100,000,000)
        {
          id: "stu-large",
          student_name: "Büyük Kurumsal",
          total_fee: 100000000,
          paid_amount: 50000000,
          discount_amount: 10000000,
          extra_fees: JSON.stringify({ kaynak: 5000000, dijital: 5000000 }),
          installment_count: 10,
          due_date: "2026-10-15"
        },
        // Malformed extra_fees JSON string
        {
          id: "stu-malformed",
          student_name: "Bozuk JSON",
          total_fee: 20000,
          paid_amount: 5000,
          discount_amount: 2000,
          extra_fees: "{broken_json",
          installment_count: 2,
          due_date: "2026-10-15"
        },
        // Negative discount: does -5000 increase total from 10000 to 15000?
        {
          id: "stu-neg-discount",
          student_name: "Negatif İndirim",
          total_fee: 10000,
          paid_amount: 0,
          discount_amount: -5000,
          extra_fees: "{}",
          installment_count: 1,
          due_date: "2026-10-15"
        }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: studentBoundary, payments: [], expenses: [], classes: [] }}
          API={API}
        />
      );

      // Expected calculation:
      // stu-zero: 0
      // stu-large: 100M + 10M extras - 10M discount = 100M
      // stu-malformed: 20K + 0 - 2K = 18K
      // stu-neg-discount: 10K - (-5K) = 15K
      // Total Contract Revenue: 0 + 100,000,000 + 18,000 + 15,000 = 100,033,000
      expect(container.textContent).toContain("100.033.000");
    });

    test("1.2: Boundary testing with excessive discount exceeding total_fee clamped to 0", async () => {
      const studentExcessDiscount = [
        {
          id: "stu-excess",
          student_name: "Aşırı İndirim",
          total_fee: 20000,
          paid_amount: 0,
          discount_amount: 35000, // discount > total_fee
          extra_fees: JSON.stringify({ kaynak: 5000 }),
          installment_count: 2,
          due_date: "2026-10-15"
        }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: studentExcessDiscount, payments: [], expenses: [], classes: [] }}
          API={API}
        />
      );

      // Net contract fee should be clamped to 0 (20k + 5k - 35k = -10k -> 0)
      expect(container.textContent).toContain("₺0");
    });

    test("1.3: Accrual vs cash collection monthly calculation across year boundaries", async () => {
      // Student enrolled in Nov 2026 with 4 installments (Nov 2026, Dec 2026, Jan 2027, Feb 2027)
      const multiYearStudent = [
        {
          id: "stu-multiyear",
          student_name: "Çok Yıllı Sözleşme",
          total_fee: 40000,
          paid_amount: 10000,
          installment_count: 4,
          due_date: "2026-11-15"
        }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: multiYearStudent, payments: [], expenses: [], classes: [] }}
          API={API}
        />
      );

      // In computeStudentPlan:
      // Installment 1: 2026-11-15 (10,000 TL)
      // Installment 2: 2026-12-15 (10,000 TL)
      // Installment 3: 2027-01-15 (10,000 TL)
      // Installment 4: 2027-02-15 (10,000 TL)
      // Total Contract Revenue: 40,000 TL
      expect(container.textContent).toContain("40.000");
    });

    test("1.4: Bidirectional ledger balance arithmetic with mixed inflows and outflows", async () => {
      const payments = [
        { id: "p1", amount: 10000, method: "Nakit", payment_date: "2026-10-01" },
        { id: "p2", amount: 15000, method: "Nakit", payment_date: "2026-10-05" }
      ];
      const expenses = [
        { id: "e1", title: "Kırtasiye", amount: 4000, account: "Nakit Ana Kasa", expense_date: "2026-10-03" }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: [], payments, expenses, classes: [] }}
          API={API}
        />
      );

      // Open Kasalar tab
      const kasalarTab = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kasa & Banka"));
      await fireEvent.click(kasalarTab);

      // Running balance sequence:
      // p1 (Oct 1): +10,000 -> running = 10,000
      // e1 (Oct 3): -4,000  -> running = 6,000
      // p2 (Oct 5): +15,000 -> running = 21,000
      const rows = container.querySelectorAll(".data-table tbody tr");
      expect(rows.length).toBe(3);
      expect(container.textContent).toContain("21.000");
    });
  });

  /* =====================================================================
   * 2. EXPENSE ACCOUNT DEDUCTION: VAKIFBANK vs NAKİT ISOLATION
   * ===================================================================== */
  describe("2. Expense Account Deduction: Nakit vs Vakıfbank Isolation", () => {
    test("2.1: CRITICAL CHECK: Does deducting an expense from VakıfBank leave Nakit intact?", async () => {
      const payments = [
        {
          id: "p-nakit",
          amount: 50000,
          method: "Nakit",
          bank: "",
          payment_date: "2026-10-01"
        },
        {
          id: "p-vakif",
          amount: 100000,
          method: "Banka Havale",
          bank: "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
          payment_date: "2026-10-01"
        }
      ];

      // Kurum kirası 30,000 TL VakıfBank hesabından ödendi
      const expenses = [
        {
          id: "e-vakif",
          title: "Bina Kirası",
          amount: 30000,
          category: "Kira",
          account: "VakıfBank İnegöl Şb.",
          expense_date: "2026-10-02"
        }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: [], payments, expenses, classes: [] }}
          API={API}
        />
      );

      // VakıfBank: 100,000 inflow - 30,000 expense = 70,000 balance
      const vakifCard = Array.from(container.querySelectorAll(".bank-acc-card"))
        .find(d => d.textContent.includes("VakıfBank İnegöl Şb.") && d.textContent.includes("ANA HESAP"));
      expect(vakifCard.textContent).toContain("70.000");

      // Nakit Ana Kasa: Inflow is 50,000. ZERO expenses were paid in cash.
      // Expected: Nakit balance should be 50,000.
      const nakitCard = Array.from(container.querySelectorAll(".bank-acc-card"))
        .find(d => d.textContent.includes("Nakit Ana Kasa") && d.textContent.includes("NAKİT"));
      
      console.log("CHALLENGER EMPIRICAL PROOF - Nakit Card Content:", nakitCard.textContent);

      // If Bug is present: line 349 does `Math.max(0, nakitInflow - totalExpenses)` = 50,000 - 30,000 = 20,000!
      // If code is correct: Nakit should remain 50,000.
      const nakitBalanceIs50k = nakitCard.textContent.includes("50.000");
      const nakitBalanceIs20k = nakitCard.textContent.includes("20.000");

      expect({
        nakitBalanceIs50k,
        nakitBalanceIs20k
      }).toEqual({
        nakitBalanceIs50k: true,
        nakitBalanceIs20k: false
      });
    });

    test("2.2: Does deducting an expense from Nakit leave VakıfBank intact?", async () => {
      const payments = [
        {
          id: "p-nakit",
          amount: 50000,
          method: "Nakit",
          bank: "",
          payment_date: "2026-10-01"
        },
        {
          id: "p-vakif",
          amount: 100000,
          method: "Banka Havale",
          bank: "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
          payment_date: "2026-10-01"
        }
      ];

      // Kırtasiye 5,000 TL Nakit kasadan ödendi
      const expenses = [
        {
          id: "e-nakit",
          title: "Kırtasiye",
          amount: 5000,
          category: "Kırtasiye",
          account: "Nakit Ana Kasa",
          expense_date: "2026-10-02"
        }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: [], payments, expenses, classes: [] }}
          API={API}
        />
      );

      // Vakıfbank should remain 100,000
      const vakifCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("VakıfBank İnegöl Şb.") && d.textContent.includes("ANA HESAP"));
      expect(vakifCard.textContent).toContain("100.000");

      // Nakit should be 45,000
      const nakitCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("Nakit Ana Kasa") && d.textContent.includes("NAKİT"));
      expect(nakitCard.textContent).toContain("45.000");
    });
  });

  /* =====================================================================
   * 3. OVERDUE AGING: FUTURE DUE DATES vs OVERDUE STATUS
   * ===================================================================== */
  describe("3. Overdue Aging & Future Due Dates", () => {
    test("3.1: CRITICAL CHECK: Are students with future due dates classified as overdue?", async () => {
      const futureStudent = [
        {
          id: "stu-future",
          student_name: "Gelecek Vade Öğrenci",
          total_fee: 40000,
          paid_amount: 0,
          installment_count: 4,
          due_date: "2026-12-15" // 2 months in the future!
        }
      ];

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: futureStudent, payments: [], expenses: [], classes: [] }}
          API={API}
        />
      );

      const allCards = Array.from(container.querySelectorAll(".stat-card")).map(c => c.textContent);
      console.log("CHALLENGER EMPIRICAL PROOF - All Stat Cards:", allCards);

      const overdueCard = Array.from(container.querySelectorAll(".stat-card"))
        .find(c => c.textContent.includes("GECİKMİŞ TAKSİTLER"));
      console.log("CHALLENGER EMPIRICAL PROOF - Overdue Card:", overdueCard ? overdueCard.textContent : "NOT FOUND");

      // An unpaid student whose first installment is in December should NOT be in overdue debt!
      // Overdue debt should be ₺0.
      expect(overdueCard.textContent).toContain("₺0");
    });
  });

  /* =====================================================================
   * 4. 7-DAY WEEKLY SCHEDULE MATRIX IN EdesisModules.js
   * ===================================================================== */
  describe("4. 7-Day Weekly Schedule Matrix in EdesisModules.js", () => {
    test("4.1: Verifies all 7 day columns (Pazartesi to Pazar) exist in the matrix header", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const headerCells = container.querySelectorAll(".timetable-header-cell");
      const expectedDays = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
      
      const foundHeaders = Array.from(headerCells).map(c => c.textContent.trim());
      expect(foundHeaders[0]).toBe("Saat / Gün");
      expectedDays.forEach(day => {
        expect(foundHeaders).toContain(day);
      });
      expect(headerCells.length).toBe(8); // 1 time col + 7 days
    });

    test("4.2: Verifies all 10 time slots (09:00 - 18:50) exist in timetable", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const timeCells = container.querySelectorAll(".timetable-time-cell");
      expect(timeCells.length).toBe(10);

      const expectedSlots = [
        "09:00 - 09:45",
        "10:00 - 10:45",
        "11:00 - 11:45",
        "12:00 - 12:45",
        "13:30 - 14:15",
        "14:25 - 15:10",
        "15:20 - 16:05",
        "16:15 - 17:00",
        "17:10 - 17:55",
        "18:05 - 18:50"
      ];

      const foundSlots = Array.from(timeCells).map(c => c.textContent.trim());
      expectedSlots.forEach(slot => {
        expect(foundSlots).toContain(slot);
      });
    });

    test("4.3: Teacher collision detection triggers warning and blocks on cancel", async () => {
      // Existing schedule: Mehmet Hoca on Pazartesi at 09:00 in Sınıf 12-SAY-A
      axios.get.mockResolvedValueOnce({
        data: [
          {
            id: "sch-1",
            day_of_week: 1,
            time_slot: "09:00 - 09:45",
            class_id: "cls-1",
            subject: "Matematik",
            teacher_name: "Mehmet Çelik",
            room: "Derslik 1"
          }
        ]
      });

      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("Mehmet Çelik");
      });

      // Try adding Mehmet Çelik to class cls-2 on same day and slot
      const quickAddBtn = container.querySelector(".head-actions button:last-child");
      await fireEvent.click(quickAddBtn);

      const teacherInput = container.querySelector("input[placeholder*='Semih Seymen']");
      await fireEvent.change(teacherInput, { target: { value: "Mehmet Çelik" } });

      // User cancels confirm
      window.confirm.mockReturnValueOnce(false);

      const form = container.querySelector("form");
      await fireEvent.submit(form);

      // Confirm was triggered with teacher warning
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("ÖĞRETMEN ÇAKIŞMA UYARISI")
      );
      // Save was blocked because user cancelled
      expect(axios.post).not.toHaveBeenCalled();
    });

    test("4.4: Classroom collision detection triggers warning and blocks on cancel", async () => {
      // Existing schedule in Derslik 2 on Salı at 10:00 for class cls-1
      axios.get.mockResolvedValueOnce({
        data: [
          {
            id: "sch-room-1",
            day_of_week: 2,
            time_slot: "10:00 - 10:45",
            class_id: "cls-1",
            subject: "Fizik",
            teacher_name: "Ali Veli",
            room: "Derslik 2"
          }
        ]
      });

      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("Derslik 2");
      });

      // Try adding Derslik 2 for class cls-2 on same day and slot with different teacher
      const quickAddBtn = container.querySelector(".head-actions button:last-child");
      await fireEvent.click(quickAddBtn);

      const modal = container.querySelector(".modal");
      const modalSelects = modal.querySelectorAll("select");
      const daySelect = modalSelects[0];
      const slotSelect = modalSelects[1];
      const classSelect = modalSelects[2];

      await fireEvent.change(daySelect, { target: { value: "2" } });
      await fireEvent.change(slotSelect, { target: { value: "10:00 - 10:45" } });
      await fireEvent.change(classSelect, { target: { value: "cls-2" } });

      const teacherInput = modal.querySelector("input[placeholder*='Semih Seymen']");
      const roomInput = modal.querySelector("input[placeholder*='Derslik 1']");

      await fireEvent.change(teacherInput, { target: { value: "Farklı Hoca" } });
      await fireEvent.change(roomInput, { target: { value: "Derslik 2" } });

      // User cancels
      window.confirm.mockReturnValueOnce(false);

      const form = modal.querySelector("form");
      await fireEvent.submit(form);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("DERSLİK ÇAKIŞMA UYARISI")
      );
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
