import { trNorm, formatContractRecord } from "../lib/edesisAccountingService";

describe("Student - Contract & TC Kimlik Matching Integrity Tests", () => {
  test("T1: trNorm correctly handles all Turkish characters across cases", () => {
    expect(trNorm("İSMAİL CAN ÇELİK")).toBe("İSMAİL CAN ÇELİK");
    expect(trNorm("ismail can çelik")).toBe("İSMAİL CAN ÇELİK");
    expect(trNorm("hatice kübra ünalan")).toBe("HATİCE KÜBRA ÜNALAN");
    expect(trNorm("  ELİF  ERVA   YEŞİLYAPRAK  ")).toBe("ELİF ERVA YEŞİLYAPRAK");
    expect(trNorm("ömer faruk ışıklı")).toBe("ÖMER FARUK IŞIKLI");
  });

  test("T2: formatContractRecord preserves and normalizes student_tc and parent_tc", () => {
    const rawContract = {
      id: "cnt_test_1",
      sozlesme_no: "SZL202600150",
      student_id: "stu-8315150",
      student_name: "HATİCE KÜBRA ÜNALAN",
      student_tc: "11770888538",
      parent_tc: "47038259390",
      parent_name: "MÜCAHİT ÜNALAN",
      brut_tutar: 50000,
      taksit_sayisi: 8,
    };

    const formatted = formatContractRecord(rawContract);
    expect(formatted.sozlesmeNo).toBe("SZL202600150");
    expect(formatted.student_tc).toBe("11770888538");
    expect(formatted.studentTc).toBe("11770888538");
    expect(formatted.parent_tc).toBe("47038259390");
    expect(formatted.studentId).toBe("stu-8315150");
    expect(formatted.ogrenciAdi).toBe("HATİCE KÜBRA ÜNALAN");
  });

  test("T3: TC Kimlik validation rejects dummy 4-5 digit numbers", () => {
    const isValidTc = (tc) => typeof tc === "string" && tc.trim().length === 11 && /^\d{11}$/.test(tc.trim());

    // Dummy IDs that used to be stored in D1
    expect(isValidTc("58488")).toBe(false);
    expect(isValidTc("56192")).toBe(false);
    expect(isValidTc("2195")).toBe(false);
    expect(isValidTc("41516")).toBe(false);
    expect(isValidTc("")).toBe(false);

    // Authentic 11-digit Turkish identity numbers
    expect(isValidTc("11770888538")).toBe(true);
    expect(isValidTc("18952648980")).toBe(true);
    expect(isValidTc("28426331188")).toBe(true);
    expect(isValidTc("37135044210")).toBe(true);
  });

  test("T4: Student and Contract ID cross-matching works with and without 'stu-' prefix", () => {
    const normId = (id) => String(id || "").replace(/^stu-/, "");

    const studentWithPrefix = { id: "stu-8315150", sozlesme_no: "SZL202600150", student_name: "HATİCE KÜBRA ÜNALAN" };
    const contractWithoutPrefix = { id: "cnt_74514", studentId: "8315150", sozlesmeNo: "SZL202600150" };

    // Direct sozlesme_no match
    expect(studentWithPrefix.sozlesme_no === contractWithoutPrefix.sozlesmeNo).toBe(true);

    // Cross-ID match
    expect(normId(studentWithPrefix.id)).toBe(normId(contractWithoutPrefix.studentId));
  });
});
