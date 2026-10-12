import AccountingService from "../lib/edesisAccountingService";
import { StudentService } from "../lib/edesisStudentService";

describe("AccountingService and StudentService SSOT Contract Management", () => {
  beforeEach(() => {
    localStorage.clear();
    AccountingService.setInitialData({ contracts: [], incomes: [], installments: [], collections: [] });
  });

  test("loads and formats real persisted contracts without creating ghost synthetic contracts", () => {
    const mockStudent = {
      id: "student-test-999",
      student_name: "YENI KAYIT TEST OGRENCI",
      parent_name: "TEST VELI",
      total_fee: 65000,
      sozlesme_no: "SZL202600099"
    };

    const mockContract = {
      id: "cnt_999",
      sozlesmeNo: "SZL202600099",
      studentId: "student-test-999",
      ogrenciAdi: "YENI KAYIT TEST OGRENCI",
      parentName: "TEST VELI",
      brutTutar: 65000,
      netTutar: 59090.91,
      kdvTutari: 5909.09,
      taksitSayisi: 5,
      odemeTuruText: "Taksitli (5 Taksit)",
      durum: 1,
      durumText: "Aktif",
      donemId: 113,
      sozlesmeTarihi: "2026-10-08T15:00:00"
    };

    AccountingService.setInitialData({ contracts: [mockContract] });
    const contracts = AccountingService.getContracts([mockStudent]);
    const found = contracts.find((c) => c.ogrenciAdi === "YENI KAYIT TEST OGRENCI");

    expect(found).toBeDefined();
    expect(found.brutTutar).toBe(65000);
    expect(found.durum).toBe(1);
    expect(found.durumText).toBe("Aktif");
    expect(found.taksitSayisi).toBe(5);
  });

  test("skips creating synthetic contracts for students who have no contract row", () => {
    const studentWithNoContract = {
      id: "no-contract-student",
      student_name: "SOZLESMESIZ OGRENCI",
      total_fee: 70000,
      has_contract: false
    };

    const contracts = AccountingService.getContracts([studentWithNoContract]);
    const found = contracts.find((c) => c.ogrenciAdi === "SOZLESMESIZ OGRENCI");
    expect(found).toBeUndefined();
  });

  test("preserves deletion: deleted contract drops from active list", () => {
    const mockContract = {
      id: "cnt_del_666",
      sozlesmeNo: "SZL202600066",
      studentId: "student-test-666",
      ogrenciAdi: "SILINECEK OGRENCI",
      brutTutar: 30000,
      durum: 1,
      donemId: 113
    };

    AccountingService.setInitialData({ contracts: [mockContract] });
    const contractsBefore = AccountingService.getContracts();
    const foundBefore = contractsBefore.find((c) => c.ogrenciAdi === "SILINECEK OGRENCI");
    expect(foundBefore).toBeDefined();

    AccountingService.deleteContract(foundBefore);

    const contractsAfter = AccountingService.getContracts();
    const foundAfter = contractsAfter.find((c) => c.ogrenciAdi === "SILINECEK OGRENCI");
    expect(foundAfter).toBeUndefined();
  });

  test("stats.activeAmount decreases when a contract is deleted", () => {
    const mockContracts = [
      { id: "cnt-1", studentId: "stu-1", sozlesmeNo: "SZL1", ogrenciAdi: "STUDENT ONE", brutTutar: 50000, donemId: 113, durum: 1 },
      { id: "cnt-2", studentId: "stu-2", sozlesmeNo: "SZL2", ogrenciAdi: "STUDENT TWO", brutTutar: 40000, donemId: 113, durum: 1 }
    ];

    AccountingService.setInitialData({ contracts: mockContracts });
    const contractsBefore = AccountingService.getContracts();
    const activeBefore = contractsBefore.filter((c) => String(c.donemId) === "113" && c.durum === 1);
    const amountBefore = activeBefore.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);
    expect(amountBefore).toBe(90000);

    const toDelete = activeBefore.find(c => c.ogrenciAdi === "STUDENT ONE");
    AccountingService.deleteContract(toDelete);

    const contractsAfter = AccountingService.getContracts();
    const activeAfter = contractsAfter.filter((c) => String(c.donemId) === "113" && c.durum === 1);
    const amountAfter = activeAfter.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);

    expect(amountAfter).toBe(40000);
  });

  test("StudentService.getAllStudents maps contracts accurately", () => {
    const mockStudent = {
      id: "student-test-777",
      student_name: "ROZET TEST OGRENCI",
      total_fee: 50000,
      sozlesme_no: "SZL202600077"
    };

    const enriched = StudentService.getAllStudents([mockStudent]);
    const found = enriched.find((s) => s.student_name === "ROZET TEST OGRENCI");
    expect(found).toBeDefined();
    expect(found.sozlesme_no).toBe("SZL202600077");
  });
});
