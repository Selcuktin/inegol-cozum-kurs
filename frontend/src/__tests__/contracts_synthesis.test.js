import AccountingService from "../lib/edesisAccountingService";
import { StudentService } from "../lib/edesisStudentService";

describe("AccountingService and StudentService Dynamic Contract Synthesis", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("synthesizes contracts for remote students who have total_fee > 0 and no existing contract", () => {
    const mockRemoteStudent = {
      id: "student-test-999",
      student_name: "YENI KAYIT TEST OGRENCI",
      parent_name: "TEST VELI",
      total_fee: 65000,
      extra_fees: JSON.stringify({ kaynak: 5000, dnm: 3000 }),
      installment_count: 5,
      due_date: "2026-11-15",
      created_at: "2026-10-08T15:00:00"
    };

    const contracts = AccountingService.getContracts([mockRemoteStudent]);
    const found = contracts.find((c) => c.ogrenciAdi === "YENI KAYIT TEST OGRENCI");

    expect(found).toBeDefined();
    expect(found.brutTutar).toBe(73000); // 65000 + 5000 + 3000
    expect(found.durum).toBe(1);
    expect(found.durumText).toBe("Aktif");
    expect(found.taksitSayisi).toBe(5);
    expect(found.odemeTuruText).toContain("5 Taksit");
    expect(found.sozlesmeTarihi).toBe("2026-10-08T15:00:00");
  });

  test("synthesizes incomes and installments for remote students", () => {
    const mockRemoteStudent = {
      id: "student-test-888",
      student_name: "GELIR TEST OGRENCI",
      parent_name: "GELIR VELI",
      total_fee: 40000,
      installment_count: 4,
      due_date: "2026-10-25"
    };

    const incomes = AccountingService.getIncomes([mockRemoteStudent]);
    const inc = incomes.find((g) => g.ogrenciAdiSoyadi === "GELIR TEST OGRENCI");
    expect(inc).toBeDefined();
    expect(inc.brutTutar).toBe(40000);
    expect(inc.kalanAlacak).toBe(40000);

    const installments = AccountingService.getInstallments([mockRemoteStudent]);
    const studentInsts = installments.filter((t) => t.ogrenciAdiSoyadi === "GELIR TEST OGRENCI");
    expect(studentInsts.length).toBe(4);
    expect(studentInsts[0].taksitTutari).toBe(10000);
  });

  test("StudentService.getAllStudents flags has_contract = true for students with fees", () => {
    const mockStudent = {
      id: "student-test-777",
      student_name: "ROZET TEST OGRENCI",
      total_fee: 50000
    };

    const enriched = StudentService.getAllStudents([mockStudent]);
    const found = enriched.find((s) => s.student_name === "ROZET TEST OGRENCI");
    expect(found).toBeDefined();
    expect(found.has_contract).toBe(true);
    expect(found.sozlesme_no).toBeTruthy();
  });

  test("preserves deletion: deleted contract is not re-synthesized", () => {
    const mockStudent = {
      id: "student-test-666",
      student_name: "SILINECEK OGRENCI",
      total_fee: 30000
    };

    const contractsBefore = AccountingService.getContracts([mockStudent]);
    const foundBefore = contractsBefore.find((c) => c.ogrenciAdi === "SILINECEK OGRENCI");
    expect(foundBefore).toBeDefined();

    AccountingService.deleteContract(foundBefore);

    const contractsAfter = AccountingService.getContracts([mockStudent]);
    const foundAfter = contractsAfter.find((c) => c.ogrenciAdi === "SILINECEK OGRENCI");
    expect(foundAfter).toBeUndefined();
  });
});
