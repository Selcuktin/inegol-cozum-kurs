import React, { act } from "react";
import { render } from "./test_helpers";
import AccountingService, { formatCollectionRecord } from "../lib/edesisAccountingService";
import { KayitModulu } from "../components/KayitModulu";

describe("Tahsilatlar & Tek Sayfadan Yönetim Testleri", () => {
  test("formatCollectionRecord D1 ödeme nesnesini eksiksiz ve hatasız formatlar", () => {
    const rawPayment = {
      id: "pay-edesis-166520",
      student_id: "stu-8016291",
      amount: 7500,
      method: "Nakit",
      bank: "NEVİN ÇAKMAK BİREYSEL",
      payment_date: "2026-10-05",
      student_name: "ZEYNEP LEVENT",
      student_class: "8-8-GENEL",
      parent_name: "ÖZGÜR LEVENT",
      parent_phone: "05321112233",
      sozlesme_no: "SZL202600130"
    };

    const formatted = formatCollectionRecord(rawPayment);
    expect(formatted).toBeDefined();
    expect(formatted.id).toBe("pay-edesis-166520");
    expect(formatted.tahsilatTutari).toBe(7500);
    expect(formatted.amount).toBe(7500);
    expect(formatted.musteriUnvan).toBe("ZEYNEP LEVENT");
    expect(formatted.student_name).toBe("ZEYNEP LEVENT");
    expect(formatted.parent_name).toBe("ÖZGÜR LEVENT");
    expect(formatted.sozlesmeNo).toBe("SZL202600130");
    expect(formatted.kasaBankaAdi).toBe("NEVİN ÇAKMAK BİREYSEL");
    expect(formatted.tahsilatTarihi).toBe("2026-10-05");
    expect(formatted.odemeKodu).toMatch(/^ODM-/);
  });

  test("AccountingService.getCollections payments parametresini hafızaya işler ve döner", () => {
    const dummyPayments = [
      { id: "p1", student_name: "Ali Veli", amount: 5000, bank: "VakıfBank", payment_date: "2026-10-01" },
      { id: "p2", student_name: "Ayşe Yılmaz", amount: 6000, bank: "Nakit Ana Kasa", payment_date: "2026-10-02" }
    ];

    const result = AccountingService.getCollections(dummyPayments);
    expect(result.length).toBe(2);
    expect(result[0].student_name).toBe("Ali Veli");
    expect(result[0].tahsilatTutari).toBe(5000);
    expect(result[1].student_name).toBe("Ayşe Yılmaz");
    expect(result[1].tahsilatTutari).toBe(6000);

    const cached = AccountingService.getCollections();
    expect(cached.length).toBe(2);
  });

  test("KayitModulu tablosunda Düzenle ve Sözleşme butonları bulunur", async () => {
    const mockStudents = [
      {
        id: "stu-1",
        student_name: "Ahmet Demir",
        student_no: "1001",
        student_class: "8-A",
        school: "İnegöl Ortaokulu",
        parent_name: "Mehmet Demir",
        parent_phone: "05551234567",
        total_fee: 55000,
        sozlesme_no: "SZL202600100"
      }
    ];

    const onEditMock = jest.fn();
    const onNavigateMock = jest.fn();

    const { getByText, queryByText, unmount } = await render(
      <KayitModulu
        activeTab="kokpit"
        setActiveTab={() => {}}
        students={mockStudents}
        classes={[]}
        teachers={[]}
        onOpenWizard={() => {}}
        onEditStudent={onEditMock}
        onNavigate={onNavigateMock}
      />
    );

    // Düzenle ve Sözleşme butonları bulunmalı
    const editBtn = getByText("Düzenle");
    const sozlesmeBtn = getByText("Sözleşme");
    expect(editBtn).toBeDefined();
    expect(sozlesmeBtn).toBeDefined();

    await act(async () => {
      editBtn.click();
    });
    expect(onEditMock).toHaveBeenCalledWith(mockStudents[0]);

    await act(async () => {
      sozlesmeBtn.click();
    });
    expect(onNavigateMock).toHaveBeenCalledWith("documents");
    expect(sessionStorage.getItem("cozum_open_contract_no")).toBe("SZL202600100");

    await unmount();
  });
});
