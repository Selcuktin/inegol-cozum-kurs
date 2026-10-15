import React from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { GelirDetayModal } from "../components/GelirDetayModal";
import edesisData from "../data/edesisAccountingData.json";
import AccountingService from "../lib/edesisAccountingService";

describe("GelirDetayModal - Edesis Gelir & Taksit Detay Paritesi", () => {
  beforeEach(() => {
    AccountingService.setInitialData({
      incomes: edesisData.gelirler,
      contracts: edesisData.sozlesmeler,
      installments: edesisData.taksitler,
      collections: edesisData.tahsilatlar
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  test("renders GelirDetayModal for GLR202600150 (ÖRNEK ÖĞRENCİ) with 100% parity", async () => {
    let closed = false;
    const handleClose = () => { closed = true; };

    const { getByText, getByRole, container } = await render(
      <GelirDetayModal
        isOpen={true}
        onClose={handleClose}
        gelirKodu="GLR202600150"
      />
    );

    // 1. Başlık ve Kod
    expect(getByText("GLR202600150")).toBeTruthy();
    expect(container.textContent).toContain("ÖRNEK ÖĞRENCİ");
    expect(container.textContent).toContain("SZL202600146");

    // 2. Finansal Tutarlar
    expect(container.textContent).toContain("50.000,00");
    expect(container.textContent).toContain("55.000,00");
    expect(container.textContent).toContain("49.500,00");

    // 3. Taksit Planı (10 Taksit)
    expect(getByText("1. Taksit")).toBeTruthy();
    expect(getByText("10. Taksit")).toBeTruthy();
    expect(container.textContent).toContain("Ödendi");
    expect(container.textContent).toContain("29 gün erken");

    // 4. Müşteri & İletişim Bilgileri
    expect(getByText("05550000000")).toBeTruthy();
    expect(getByText("veli@example.invalid")).toBeTruthy();
    expect(container.textContent).toContain("4-A");

    // 5. İlerleme Çubuğu ve Sonraki Taksit
    expect(container.textContent).toContain("%10");
    expect(container.textContent).toContain("Sonraki: 30.11.2026");

    // 6. Geri Düğmesi Testi
    const geriBtn = getByRole("button", { name: "Geri" });
    await fireEvent.click(geriBtn);
    expect(closed).toBe(true);
  });

  test("renders GelirDetayModal dynamically for a student object with fallback calculation", async () => {
    const mockStudent = {
      id: "stu-test-99",
      student_name: "YUSUF EMRE DOĞAN",
      student_class: "8-A",
      total_fee: 60000,
      paid_amount: 12000,
      installment_count: 6,
      student_phone: "05321112233",
      parent_email: "yusuf@test.com"
    };

    const { container } = await render(
      <GelirDetayModal
        isOpen={true}
        onClose={() => {}}
        student={mockStudent}
      />
    );

    expect(container.textContent).toContain("YUSUF EMRE DOĞAN");
    expect(container.textContent).toContain("8-A");
    expect(container.textContent).toContain("60.000,00");
  });

  test("verifies total accounting summary in edesisAccountingData bundle", () => {
    expect(edesisData.gelirler).toHaveLength(1);
    expect(edesisData.sozlesmeler).toHaveLength(1);
    expect(edesisData.taksitler).toHaveLength(10);
    expect(edesisData.gelirler[0].brutTutar).toBe(edesisData.taksitler.reduce((s,i)=>s+i.taksitTutari,0));
    expect(edesisData.gelirler[0].toplamTahsilat).toBe(edesisData.tahsilatlar.reduce((s,p)=>s+p.tahsilatTutari,0));

  });
});
