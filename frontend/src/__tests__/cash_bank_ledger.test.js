import React from "react";
import axios from "axios";
import { MuhasebeV2Dashboard } from "../components/MuhasebeV2Dashboard";
import {
  render,
  cleanup,
  fireEvent,
  waitFor,
  mockClasses,
  mockStudents,
  mockPayments,
  mockExpenses
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

describe("R2: Kasa & Banka Defteri Çift Yönlü Entegrasyonu (cash_bank_ledger.test.js)", () => {
  const API = "/api";
  let originalAlert;

  beforeEach(() => {
    jest.clearAllMocks();
    originalAlert = window.alert;
    window.alert = jest.fn();
    axios.post.mockResolvedValue({ data: { id: "res-exp-1" } });
  });

  afterEach(async () => {
    window.alert = originalAlert;
    await cleanup();
  });

  const getDashboardData = (overrides = {}) => ({
    students: mockStudents,
    payments: mockPayments,
    expenses: mockExpenses,
    classes: mockClasses,
    ...overrides
  });

  /* =====================================================================
   * TIER 1: 5 BANKA & KASA HESAP BAKİYELERİ VE ÇİFT YÖNLÜ HAREKETLER
   * ===================================================================== */
  describe("Tier 1: 5 Account Balances & Portfolio Strip", () => {
    test("T1.1: renders portfolio strip with 5 distinct institution accounts", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("Resmi Kasa & Banka Hesap Defteri");
      expect(container.textContent).toContain("VakıfBank İnegöl Şb.");
      expect(container.textContent).toContain("Halkbank İnegöl Şb.");
      expect(container.textContent).toContain("Nakit Ana Kasa");
      expect(container.textContent).toContain("POS / Kredi Kartı");
      expect(container.textContent).toContain("Senet & Çek Portföyü");
    });

    test("T1.2: correctly routes payments to Vakıfbank register and shows balance", async () => {
      // pmt-1 has bank="T.C. VAKIFLAR BANKASI İNEGÖL ŞB." and amount=10,000
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const vakifCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("VakıfBank İnegöl Şb.") && d.textContent.includes("ANA HESAP"));
      expect(vakifCard).toBeDefined();
      expect(vakifCard.textContent).toContain("10.000");
    });

    test("T1.3: correctly routes payments to Halkbank register and shows balance", async () => {
      // pmt-2 has bank="T.C. HALKBANK İNEGÖL ŞB." and amount=10,000
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const halkCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("Halkbank İnegöl Şb.") && d.textContent.includes("BANKA"));
      expect(halkCard).toBeDefined();
      expect(halkCard.textContent).toContain("10.000");
    });

    test("T1.4: correctly routes card payments to POS register", async () => {
      // pmt-4 has method="POS / Kredi Kartı" and amount=20,000
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const posCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("POS / Kredi Kartı") && d.textContent.includes("POS"));
      expect(posCard).toBeDefined();
      expect(posCard.textContent).toContain("20.000");
    });

    test("T1.5: correctly routes promissory note payments to Senet register", async () => {
      // pmt-5 has method="Senet" and amount=10,000
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const senetCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("Senet & Çek Portföyü") && d.textContent.includes("SENET / BONO"));
      expect(senetCard).toBeDefined();
      expect(senetCard.textContent).toContain("10.000");
    });

    test("T1.6: deducts expenses from Nakit Ana Kasa (gross cash minus expenses)", async () => {
      // pmt-3 is Nakit 25,000. Expenses total 20,000 (15k + 5k). Net cash = 5,000
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const nakitCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("Nakit Ana Kasa") && d.textContent.includes("NAKİT"));
      expect(nakitCard).toBeDefined();
      expect(nakitCard.textContent).toContain("5.000");
    });

    test("T1.7: clicking account card navigates to Kasa & Banka Defteri tab with that account active", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const vakifCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.getAttribute("style")?.includes("cursor: pointer") && d.textContent.includes("VakıfBank"));
      expect(vakifCard).toBeDefined();
      await fireEvent.click(vakifCard);

      expect(container.querySelector(".data-table")).not.toBeNull();
      expect(container.textContent).toContain("VakıfBank İnegöl Şb.");
    });
  });

  /* =====================================================================
   * TIER 2: FILTERING, EDGE CASES & BOUNDARY CLAMPING
   * ===================================================================== */
  describe("Tier 2: Filtering, Outflow Handling & Edge Cases", () => {
    test("T2.1: isolates POS transactions when POS filter is clicked", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const kasalarTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kasa & Banka"));
      await fireEvent.click(kasalarTabBtn);

      const posFilterBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("POS Kasası"));
      await fireEvent.click(posFilterBtn);

      expect(container.textContent).toContain("POS tek çekim");
      expect(container.textContent).not.toContain("Vakıfbank havalesi");
    });

    test("T2.2: isolates Nakit transactions when Nakit filter is clicked", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const kasalarTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kasa & Banka"));
      await fireEvent.click(kasalarTabBtn);

      const nakitFilterBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Nakit Kasa"));
      await fireEvent.click(nakitFilterBtn);

      expect(container.textContent).toContain("Nakit elden tahsilat");
      expect(container.textContent).not.toContain("Halkbank eft");
    });

    test("T2.3: clamps net nakit balance to 0 if expenses exceed gross cash", async () => {
      // Expenses = 50,000 > Nakit = 25,000 -> Nakit should be 0, not negative
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData({
            expenses: [{ id: "exp-big", title: "Büyük Tadilat", amount: 50000, category: "Tadilat" }]
          })}
          API={API}
        />
      );

      const nakitCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("Nakit Ana Kasa") && d.textContent.includes("NAKİT"));
      expect(nakitCard.textContent).toContain("₺0");
    });

    test("T2.4: generic EFT or havale without explicit bank defaults to Vakıfbank ana hesap", async () => {
      const genericPayment = {
        id: "pmt-generic",
        student_id: "stu-1",
        amount: 8000,
        method: "Banka Havale / EFT",
        bank: "", // No explicit bank specified
        payment_date: "2026-10-01",
        note: "İsimsiz Havale"
      };

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData({ payments: [genericPayment] })}
          API={API}
        />
      );

      const vakifCard = Array.from(container.querySelectorAll("div"))
        .find(d => d.textContent.includes("VakıfBank İnegöl Şb.") && d.textContent.includes("ANA HESAP"));
      // 8000 routed to VakıfBank
      expect(vakifCard.textContent).toContain("8.000");
    });

    test("T2.5: handles empty expenses cleanly with zero-outflow ledger", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData({ expenses: [] })}
          API={API}
        />
      );

      const giderTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kurum Giderleri"));
      await fireEvent.click(giderTabBtn);

      expect(container.textContent).toContain("Henüz kaydedilmiş gider bulunmuyor.");
    });
  });

  /* =====================================================================
   * TIER 3: PAIRWISE INTERACTIONS & BIDIRECTIONAL ACCOUNT SYNC
   * ===================================================================== */
  describe("Tier 3: Bidirectional Ledger Interactions", () => {
    test("T3.1: clicking 'Makbuz Bas' on ledger transaction row opens receipt modal", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const kasalarTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kasa & Banka"));
      await fireEvent.click(kasalarTabBtn);

      const makbuzBasBtn = Array.from(container.querySelectorAll(".data-table button"))
        .find(b => b.textContent.includes("Makbuz"));
      expect(makbuzBasBtn).toBeDefined();

      await fireEvent.click(makbuzBasBtn);

      expect(container.textContent).toContain("RESMİ TAHSİLAT MAKBUZU SÜİTİ");
      expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ");
    });

    test("T3.2: adding new expense updates expenses tab table immediately", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      // Open Expense modal
      const addExpBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Gider Ekle"));
      await fireEvent.click(addExpBtn);

      const titleInput = container.querySelector("input[placeholder*='Derslik 1 Klima']");
      const amountInput = container.querySelector("input[placeholder*='Örn: 2500']");

      await fireEvent.change(titleInput, { target: { value: "İnternet Faturası" } });
      await fireEvent.change(amountInput, { target: { value: "1200" } });

      const form = container.querySelector("form");
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(`${API}/expenses`, expect.objectContaining({
          title: "İnternet Faturası",
          amount: 1200
        }));
      });

      // Switch to Giderler tab
      const giderTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kurum Giderleri"));
      await fireEvent.click(giderTabBtn);

      expect(container.textContent).toContain("İnternet Faturası");
      expect(container.textContent).toContain("-₺1.200");
    });
  });

  /* =====================================================================
   * TIER 4: REAL-WORLD APPLICATION SCENARIO (Scenario 2)
   * ===================================================================== */
  describe("Tier 4: Realistic Scenario - Expense Deduction across Accounts & Ledger Integrity", () => {
    test("T4: Full workflow - Inflows to bank and cash, record outflow, verify balances and receipts", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      // The overview retains its own liquidity value; the six-card strip belongs to due-date pages.
      expect(container.textContent).toContain("Kasa + Banka Durumu45.000 ₺");

      // Step 2: Open Kasalar tab and verify all 7 bidirectional transactions rendered
      const kasalarTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kasa & Banka"));
      await fireEvent.click(kasalarTabBtn);

      const rows = container.querySelectorAll(".data-table tbody tr");
      expect(rows.length).toBe(7);

      // Step 3: Add new operational expense (Temizlik Malzemesi 1000 TL)
      const headExpBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Gider Ekle"));
      await fireEvent.click(headExpBtn);

      const titleInput = container.querySelector("input[placeholder*='Derslik 1 Klima']");
      const amountInput = container.querySelector("input[placeholder*='Örn: 2500']");
      await fireEvent.change(titleInput, { target: { value: "Temizlik Malzemeleri" } });
      await fireEvent.change(amountInput, { target: { value: "1000" } });

      const form = container.querySelector("form");
      await fireEvent.submit(form);

      // Step 4: Verify expense appears in Giderler tab
      const giderTabBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Kurum Giderleri"));
      await fireEvent.click(giderTabBtn);

      expect(container.textContent).toContain("Temizlik Malzemeleri");

      // Step 5: Switch back to Kasalar tab and generate official receipt for Halkbank transaction
      await fireEvent.click(kasalarTabBtn);
      const halkFilterBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Halkbank"));
      await fireEvent.click(halkFilterBtn);

      const makbuzBtn = container.querySelector(".data-table tbody button");
      await fireEvent.click(makbuzBtn);

      // Step 6: Verify receipt modal displayed with correct amount
      expect(container.textContent).toContain("RESMİ TAHSİLAT MAKBUZU SÜİTİ");
      expect(container.textContent).toContain("10.000");
    });
  });
});
