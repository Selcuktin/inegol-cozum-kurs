import React from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { MonthlyReportPreview } from "../components/MonthlyReportPreview";

describe("MonthlyReportPreview Component", () => {
  afterEach(cleanup);

  const mockData = {
    payments: [
      {
        id: 991,
        receipt_no: "MK-2026-991",
        date: "2026-10-05",
        student_name: "Test Öğrenci",
        account: "T.C. VakıfBank",
        amount: 8000,
        note: "Ekim Taksit Tahsilatı"
      }
    ],
    expenses: [
      {
        id: 101,
        title: "Test Kırtasiye Alımı",
        category: "Kırtasiye",
        date: "2026-10-10",
        amount: 2500,
        payment_method: "Banka"
      }
    ]
  };

  test("renders official institutional A4 document header and report info", async () => {
    const { container } = await render(
      <MonthlyReportPreview month="2026-10" data={mockData} />
    );

    // Official Ministry and Course Header
    expect(container.textContent).toContain("T.C. MİLLÎ EĞİTİM BAKANLIĞI");
    expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM ÖZEL ÖĞRETİM KURSU");
    expect(container.textContent).toContain("99916521");
    expect(container.textContent).toContain("Ekim 2026 DÖNEMİ AYLIK GELİR, GİDER VE KASA HAREKET RAPORU");

    // Report No & Dates
    expect(container.textContent).toContain("RPR-202610-01");
    expect(container.textContent).toContain("01.10.2026 - 31.10.2026");
  });

  test("displays financial summary KPI cards correctly", async () => {
    const { container } = await render(
      <MonthlyReportPreview month="2026-10" data={mockData} />
    );

    // KPI Badges
    expect(container.textContent).toContain("Gerçekleşen Tahsilat");
    expect(container.textContent).toContain("Bu Ay Vadesi Dolan");
    expect(container.textContent).toContain("Dönem Kurum Gideri");
    expect(container.textContent).toContain("Net Kasa / Fark");
  });

  test("renders 4 detailed tables: accounts, payments, due installments, expenses", async () => {
    const { container } = await render(
      <MonthlyReportPreview month="2026-10" data={mockData} />
    );

    // 1. Account breakdown
    expect(container.textContent).toContain("1. Tahsilat Kanalları & Kasa / Banka Dağılımı");
    expect(container.textContent).toContain("T.C. VAKIFLAR BANKASI (Nevin Çakmak)");
    expect(container.textContent).toContain("T.C. HALKBANK İNEGÖL ŞUBESİ");

    // 2. Payments list
    expect(container.textContent).toContain("2. Seçilen Ay İçi Gerçekleşen Tahsilatlar");

    // 3. Due installments
    expect(container.textContent).toContain("3. Bu Ay Vadesi Dolan Taksitler & Tahakkuk");

    // 4. Expenses list
    expect(container.textContent).toContain("4. Dönem Kurum Giderleri Dökümü");
  });

  test("renders authorized signatures and seals for Osman Seymen & Nevin Çakmak", async () => {
    const { container } = await render(
      <MonthlyReportPreview month="2026-10" data={mockData} />
    );

    expect(container.textContent).toContain("MUHASEBE VE FİNANS YETKİLİSİ");
    expect(container.textContent).toContain("Osman SEYMEN");
    expect(container.textContent).toContain("KURUM MÜDÜRÜ");
    expect(container.textContent).toContain("Nevin ÇAKMAK");
  });

  test("triggers print and CSV export", async () => {
    const onPrintMock = jest.fn();
    const { container } = await render(
      <MonthlyReportPreview month="2026-10" data={mockData} onPrint={onPrintMock} />
    );

    const buttons = Array.from(container.querySelectorAll("button"));
    const printBtn = buttons.find(b => b.textContent.includes("Yazdır / PDF Kaydet"));
    expect(printBtn).toBeTruthy();
    await fireEvent.click(printBtn);
    expect(onPrintMock).toHaveBeenCalledTimes(1);

    const exportBtn = buttons.find(b => b.textContent.includes("Excel (.CSV) İndir"));
    expect(exportBtn).toBeTruthy();
    await fireEvent.click(exportBtn);
  });
});
