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
      id: "eds-tch-80973",
      name: "Kamer Selçukarslan",
      branch: "Rehberlik & Yöneticilik",
      title: "Kurum Müdürü & Rehberlik (EDS No: 80973)",
      phone: "0530 505 46 19",
      email: "kamerselcukarslan96@gmail.com",
      classes: "Tüm Kademeler & Rehberlik",
      weekly_hours: 20,
      status: "Aktif",
      role: "admin",
      notes: "Edesis Aktif Kadro. TC: 27145371796"
    },
    {
      id: "eds-tch-80974",
      name: "Yeliz Arcan",
      branch: "Eğitmen",
      title: "Kurum Öğretmeni (EDS No: 80974)",
      phone: "0543 563 21 45",
      email: "arcan857@gmail.com",
      classes: "Ortaokul & LGS Grupları",
      weekly_hours: 24,
      status: "Aktif",
      role: "ogretmen",
      notes: "Edesis Aktif Kadro. TC: 19558624156"
    },
    {
      id: "eds-tch-80975",
      name: "Zeyneb Yolcu",
      branch: "Eğitmen",
      title: "Kurum Öğretmeni (EDS No: 80975)",
      phone: "0534 512 75 45",
      email: "yolcuzeyneb@gmail.com",
      classes: "İlkokul & Ara Sınıflar",
      weekly_hours: 20,
      status: "Aktif",
      role: "ogretmen",
      notes: "Edesis Aktif Kadro. TC: 24703453390"
    },
    {
      id: "eds-tch-80976",
      name: "Sinem Kartal",
      branch: "Eğitmen",
      title: "Kurum Öğretmeni (EDS No: 80976)",
      phone: "0545 940 28 37",
      email: "sinemkartal12@gmail.com",
      classes: "Lise & YKS Grupları",
      weekly_hours: 22,
      status: "Aktif",
      role: "ogretmen",
      notes: "Edesis Aktif Kadro. TC: 20392596646"
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
    expect(container.textContent).toContain("Kamer Selçukarslan");
    expect(container.textContent).toContain("Yeliz Arcan");
    expect(container.textContent).toContain("Zeyneb Yolcu");
    expect(container.textContent).toContain("Sinem Kartal");

    // Branches
    expect(container.textContent).toContain("Rehberlik & Yöneticilik");
    expect(container.textContent).toContain("Eğitmen");
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
    await fireEvent.change(searchInput, { target: { value: "Kamer" } });

    expect(container.textContent).toContain("Kamer Selçukarslan");
    expect(container.textContent).not.toContain("Yeliz Arcan");
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
