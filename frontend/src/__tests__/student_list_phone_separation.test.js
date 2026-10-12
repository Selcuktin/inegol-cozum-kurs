import React from "react";
import { render, cleanup } from "./test_helpers";
import EdesisOgrenciListesi from "../components/EdesisOgrenciListesi";

describe("EdesisOgrenciListesi - Student and Parent Phone Separation", () => {
  afterEach(async () => {
    await cleanup();
  });

  const mockStudents = [
    {
      id: "std-1",
      student_no: "1001",
      student_name: "Ali Veli",
      student_tc: "12345678901",
      student_phone: "0532 111 22 33",
      student_email: "ali@test.com",
      parent_name: "Hasan Veli",
      parent_relation: "Baba",
      parent_phone: "0533 999 88 77",
      program: "2026-2027",
      total_fee: 50000,
      status: "Aktif",
      student_class: "12-A"
    },
    {
      id: "std-2",
      student_no: "1002",
      student_name: "Fatma Yılmaz",
      student_tc: "12345678902",
      student_phone: "", // NO student phone
      parent_name: "Mehmet Yılmaz",
      parent_relation: "Baba",
      parent_phone: "0544 555 44 33",
      program: "2026-2027",
      total_fee: 50000,
      status: "Aktif",
      student_class: "12-B"
    },
    {
      id: "std-3",
      student_no: "1003",
      student_name: "Ahmet Demir",
      student_tc: "12345678903",
      student_phone: "0555 777 66 55",
      parent_name: "Ayşe Demir",
      parent_relation: "Anne",
      parent_phone: "", // NO parent phone
      program: "2026-2027",
      total_fee: 50000,
      status: "Aktif",
      student_class: "11-A"
    }
  ];

  test("renders student phone in communication cell without falling back to parent phone", async () => {
    const { getByText, queryByText } = await render(
      <EdesisOgrenciListesi
        students={mockStudents}
        onRefresh={() => {}}
        onEditStudent={() => {}}
        onDeleteStudent={() => {}}
      />
    );

    // std-1 has both: student_phone "0532 111 22 33" and parent_phone "0533 999 88 77"
    expect(getByText("0532 111 22 33")).toBeTruthy();
    expect(getByText("0533 999 88 77")).toBeTruthy();

    // std-2 has NO student phone, but parent_phone "0544 555 44 33"
    // The student phone cell must NOT show "0544 555 44 33" - it must show "—"
    expect(getByText("0544 555 44 33")).toBeTruthy();
    const veliMehmet = getByText("Mehmet Yılmaz").closest("td");
    expect(veliMehmet.textContent).toContain("0544 555 44 33");

    // std-3 has student_phone "0555 777 66 55" but NO parent phone
    // Veli Ayşe Demir cell must NOT show "0555 777 66 55" - it must show "—"
    const veliAyse = getByText("Ayşe Demir").closest("td");
    expect(veliAyse.textContent).toContain("—");
    expect(veliAyse.textContent).not.toContain("0555 777 66 55");
  });
});
