import React, { act } from "react";
import { render, fireEvent } from "./test_helpers";
import AccountingService, { formatCollectionRecord } from "../lib/edesisAccountingService";
import { KayitModulu } from "../components/KayitModulu";
import EdesisOgrenciListesi from "../components/EdesisOgrenciListesi";

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

  test("EdesisOgrenciListesi satırındaki Düzenle işlemi onEditStudent propunu tetikler ve 3. modal olan EdesisStudentModal kullanılır", async () => {
    const mockStudent = {
      id: "stu-99",
      student_name: "Test Öğrenci",
      student_no: "1099",
      student_class: "8-A",
      donem_id: "113",
      status: "Kesin Kayıt",
      parent_name: "Test Veli",
      parent_phone: "05550001122",
      total_fee: 60000
    };

    const onEditMock = jest.fn();

    const { container, getByText, queryByText, unmount } = await render(
      <EdesisOgrenciListesi
        students={[mockStudent]}
        classes={[{ name: "8-A" }]}
        onEditStudent={onEditMock}
      />
    );

    // Dropdown / İşlemler açma
    const dropdownWrapper = container.querySelector("[data-edesis-dropdown]");
    expect(dropdownWrapper).toBeTruthy();
    const gearBtn = dropdownWrapper.querySelector("button");
    await fireEvent.click(gearBtn);

    // "Düzenle" menü elemanını bulma ve tıklama
    const menuEl = container.querySelector("[role='menu']");
    expect(menuEl).toBeTruthy();
    const editRowBtn = Array.from(menuEl.querySelectorAll("div")).find(
      (el) => el.textContent && el.textContent.trim().includes("Düzenle")
    );
    expect(editRowBtn).toBeTruthy();
    await fireEvent.click(editRowBtn);

    // onEditStudent fonksiyonu ilgili öğrenci ile çağrılmalı
    expect(onEditMock).toHaveBeenCalledWith(expect.objectContaining({ student_name: "Test Öğrenci" }));

    // Öğrenci Karnesi kaldırılmış olmalı
    expect(queryByText("Öğrenci Karnesi")).toBeNull();

    // Eski 5 sekmeli DÜZENLE modalı (ÖĞRENCİ BİLGİLERİ / KULLANICI BİLGİLERİ) DOM'da bulunmamalı
    expect(queryByText("ÖĞRENCİ BİLGİLERİ")).toBeNull();
    expect(queryByText("DÖNEM TARİHÇESİ")).toBeNull();

    await unmount();
  });

  test("EdesisOgrenciListesi filtreleme çubuğunda durum seçimi bulunur ve sınıflara göre filtreler", async () => {
    const mockStudents = [
      { id: "s1", student_name: "Öğrenci 1", student_class: "8-A", status: "Kesin Kayıt", donem_id: "113" },
      { id: "s2", student_name: "Öğrenci 2", student_class: "7-B", status: "Kesin Kayıt", donem_id: "113" }
    ];

    const { getByText, queryByText, container, unmount } = await render(
      <EdesisOgrenciListesi
        students={mockStudents}
        classes={[{ name: "8-A" }, { name: "7-B" }]}
      />
    );

    expect(getByText("Öğrenci 1")).toBeDefined();
    expect(getByText("Öğrenci 2")).toBeDefined();

    // Sınıf filtresi değiştirme (8-A)
    const selects = container.querySelectorAll("select");
    const classSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.value === "8-A"));
    expect(classSelect).toBeDefined();
    await fireEvent.change(classSelect, { target: { value: "8-A" } });

    expect(queryByText("Öğrenci 1")).not.toBeNull();
    expect(queryByText("Öğrenci 2")).toBeNull();

    await unmount();
  });
});

