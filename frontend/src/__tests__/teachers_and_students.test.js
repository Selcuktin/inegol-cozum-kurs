import React from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { getStudentCategory, CANCELLED_STUDENT_NAMES, ACTIVE_2026_CONTRACT_STUDENT_NAMES } from "../App";
import { TeachersPage } from "../components/TeachersPage";

describe("Edesis Öğrenci Kategorizasyonu & Kesin Kayıt Paritesi", () => {
  test("identifies cancelled students accurately", () => {
    CANCELLED_STUDENT_NAMES.forEach((name) => {
      expect(getStudentCategory({ student_name: name, program: "2026-2027", total_fee: 60000 })).toBe("iptal");
    });
  });

  test("identifies summer school students (2026-2027-YAZ)", () => {
    expect(getStudentCategory({ student_name: "ALİ CAN", program: "2026-2027-YAZ", total_fee: 15000 })).toBe("yaz");
  });

  test("identifies alumni / past period students (2025-2026)", () => {
    expect(getStudentCategory({ student_name: "AYŞE GÜL", program: "2025-2026", total_fee: 40000 })).toBe("mezun");
  });

  test("identifies active 2026-2027 contract students who had old records", () => {
    ACTIVE_2026_CONTRACT_STUDENT_NAMES.forEach((name) => {
      expect(getStudentCategory({ student_name: name, program: "2025-2026", total_fee: 55000 })).toBe("kesin");
    });
  });

  test("identifies trial / placeholder fee < 10 TL students as deneme", () => {
    expect(getStudentCategory({ student_name: "DENEME ÖĞRENCİ", program: "2026-2027", total_fee: 0.01 })).toBe("deneme");
  });

  test("identifies standard 2026-2027 enrolled students as kesin kayıt", () => {
    expect(getStudentCategory({ student_name: "EMİR ASAF ÖZOĞUL", program: "2026-2027", total_fee: 60000 })).toBe("kesin");
    expect(getStudentCategory({ student_name: "ASELSARE BİLGİN", program: "2026-2027", total_fee: 55000 })).toBe("kesin");
  });
});

describe("TeachersPage - Öğretmenler & Kadro Portali", () => {
  afterEach(async () => {
    await cleanup();
  });

  const mockTeachers = [
    {
      id: "tch-001",
      name: "Semih Seymen",
      branch: "Fizik",
      title: "Kurum Müdürü & Fizik Öğretmeni",
      phone: "0533 222 33 44",
      email: "semih.seymen@inegolcozumkurs.com",
      classes: "12-Sayısal, TYT-AYT, Mezun VIP",
      weekly_hours: 18,
      status: "Aktif",
      role: "admin",
      notes: "VIP ve 12. Sınıf Fizik grupları sorumlusu"
    },
    {
      id: "tch-002",
      name: "Ayşe Kaya",
      branch: "Matematik",
      title: "Matematik Zümre Başkanı",
      phone: "0535 777 88 99",
      email: "ayse.kaya@inegolcozumkurs.com",
      classes: "11-A, TYT-AYT, 12-Sayısal",
      weekly_hours: 24,
      status: "Aktif",
      role: "ogretmen",
      notes: "AYT Matematik ve Geometri ileri düzey denemeler"
    },
    {
      id: "tch-003",
      name: "Mehmet Çelik",
      branch: "Geometri",
      title: "LGS & Geometri Uzmanı",
      phone: "0542 666 55 44",
      email: "mehmet.celik@inegolcozumkurs.com",
      classes: "8-A, 8-B, LGS Hazırlık",
      weekly_hours: 20,
      status: "Aktif",
      role: "ogretmen",
      notes: "LGS matematik ve analitik geometri soru çözümleri"
    }
  ];

  test("renders teacher cards and KPI metrics", async () => {
    const { getByText, container } = await render(
      <TeachersPage
        me={{ role: "admin", name: "Yönetici" }}
        API="https://dummy.api"
        teachers={mockTeachers}
        onReload={() => {}}
        onNavigate={() => {}}
        onOpenEtut={() => {}}
      />
    );

    // KPI Cards
    expect(getByText("Toplam Eğitmen")).toBeTruthy();
    expect(getByText("Branş Sayısı")).toBeTruthy();
    expect(getByText("Haftalık Ders Yükü")).toBeTruthy();

    // Teacher names
    expect(container.textContent).toContain("Semih Seymen");
    expect(container.textContent).toContain("Ayşe Kaya");
    expect(container.textContent).toContain("Mehmet Çelik");

    // Branches
    expect(container.textContent).toContain("Fizik");
    expect(container.textContent).toContain("Matematik");
    expect(container.textContent).toContain("Geometri");
  });

  test("filters teachers by search query", async () => {
    const { container } = await render(
      <TeachersPage
        me={{ role: "admin", name: "Yönetici" }}
        API="https://dummy.api"
        teachers={mockTeachers}
        onReload={() => {}}
        onNavigate={() => {}}
        onOpenEtut={() => {}}
      />
    );

    const searchInput = container.querySelector("input[placeholder*='ara']");
    expect(searchInput).toBeTruthy();
    await fireEvent.change(searchInput, { target: { value: "Semih" } });

    expect(container.textContent).toContain("Semih Seymen");
    expect(container.textContent).not.toContain("Ayşe Kaya");
  });

  test("opens modal for adding a new teacher", async () => {
    const { getByRole, container } = await render(
      <TeachersPage
        me={{ role: "admin", name: "Yönetici" }}
        API="https://dummy.api"
        teachers={mockTeachers}
        onReload={() => {}}
        onNavigate={() => {}}
        onOpenEtut={() => {}}
      />
    );

    const addBtn = getByRole("button", { name: /Yeni Öğretmen Ekle/i });
    await fireEvent.click(addBtn);

    expect(container.textContent).toContain("Adı Soyadı *");
    expect(container.textContent).toContain("Haftalık Ders Saati");
  });
});
