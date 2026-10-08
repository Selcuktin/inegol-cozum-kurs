import React from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { GelirDetayModal } from "../components/GelirDetayModal";
import edesisData from "../data/edesisAccountingData.json";

describe("GelirDetayModal - Edesis Gelir & Taksit Detay Paritesi", () => {
  afterEach(async () => {
    await cleanup();
  });

  test("renders GelirDetayModal for GLR202600150 (ASELSARE BİLGİN) with 100% parity", async () => {
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
    expect(container.textContent).toContain("ASELSARE BİLGİN");
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
    expect(getByText("05458018543")).toBeTruthy();
    expect(getByText("aselsare@edesis.com")).toBeTruthy();
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
    expect(edesisData.gelirler.length).toBe(130);
    expect(edesisData.sozlesmeler.length).toBe(122);
    expect(edesisData.taksitler.length).toBe(688);
    expect(edesisData.tahsilatlar.length).toBe(164);
    expect(edesisData.summary.totalRevenue).toBeCloseTo(5386913.09, 2);
    expect(edesisData.summary.totalCollected).toBeCloseTo(989538.43, 2);
  });
});
