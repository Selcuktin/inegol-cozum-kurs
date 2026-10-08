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

  test("stats.activeAmount decreases when a contract is deleted", () => {
    const mockRemote = [
      { id: "stu-1", student_name: "STUDENT ONE", total_fee: 50000, donem_id: 113 },
      { id: "stu-2", student_name: "STUDENT TWO", total_fee: 40000, donem_id: 113 }
    ];
    const contractsBefore = AccountingService.getContracts(mockRemote);
    const activeBefore = contractsBefore.filter((c) => String(c.donemId) === "113" && c.durum === 1);
    const amountBefore = activeBefore.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);

    const toDelete = activeBefore.find(c => c.ogrenciAdi === "STUDENT ONE");
    AccountingService.deleteContract(toDelete);

    const contractsAfter = AccountingService.getContracts(mockRemote);
    const activeAfter = contractsAfter.filter((c) => String(c.donemId) === "113" && c.durum === 1);
    const amountAfter = activeAfter.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);

    console.log("TEST AMOUNTS:", { amountBefore, amountAfter, diff: amountBefore - amountAfter });
    expect(amountAfter).toBe(amountBefore - 50000);
  });

  test("correctly normalizes Turkish casing (i/İ) so deleted contract drops from activeAmount", () => {
    const mockStudent = {
      id: "stu-tr-1",
      student_name: "ibrahim ali",
      total_fee: 75000,
      donem_id: 113
    };
    const before = AccountingService.getContracts([mockStudent]);
    const found = before.find((c) => c.ogrenciAdi === "İBRAHİM ALİ");
    expect(found).toBeDefined();

    const sumBefore = before.filter(c => c.donemId === 113 && c.durum === 1).reduce((s, c) => s + (c.brutTutar || 0), 0);

    // Delete with lowercase or mixed case
    AccountingService.deleteContract(found);

    const after = AccountingService.getContracts([mockStudent]);
    const sumAfter = after.filter(c => c.donemId === 113 && c.durum === 1).reduce((s, c) => s + (c.brutTutar || 0), 0);
    expect(sumAfter).toBe(sumBefore - 75000);
  });

  test("deleting a student via StudentService.deleteStudent purges their contract and reduces activeAmount", async () => {
    const mockStudent = {
      id: "stu-del-test",
      student_name: "OTOMATIK SILINECEK",
      total_fee: 60000,
      donem_id: 113
    };

    const before = AccountingService.getContracts([mockStudent]);
    const found = before.find((c) => c.ogrenciAdi === "OTOMATIK SILINECEK");
    expect(found).toBeDefined();

    const sumBefore = before.filter(c => c.donemId === 113 && c.durum === 1).reduce((s, c) => s + (c.brutTutar || 0), 0);

    await StudentService.deleteStudent(mockStudent);

    const after = AccountingService.getContracts([mockStudent]);
    const sumAfter = after.filter(c => c.donemId === 113 && c.durum === 1).reduce((s, c) => s + (c.brutTutar || 0), 0);
    expect(sumAfter).toBe(sumBefore - 60000);
  });

  test("re-adding a student with the same name un-tombstones and automatically creates an active contract", () => {
    const deletedStudent = {
      id: "stu-repeat-1",
      student_name: "YENI TEKRAR OGRENCI",
      total_fee: 55000,
      donem_id: 113
    };

    // 1. Synthesize and delete
    const contracts1 = AccountingService.getContracts([deletedStudent]);
    const found1 = contracts1.find((c) => c.ogrenciAdi === "YENI TEKRAR OGRENCI");
    expect(found1).toBeDefined();
    AccountingService.deleteContract(found1);

    expect(AccountingService.isContractDeleted(found1.sozlesmeNo)).toBe(true);

    // 2. Re-add student with new contract
    const incomeRes = AccountingService.addNewIncome({
      ogrenciAdi: "YENI TEKRAR OGRENCI",
      brutTutar: 55000,
      taksitSayisi: 8
    });
    expect(incomeRes.contract).toBeDefined();
    expect(incomeRes.contract.durumText).toBe("Aktif");

    // 3. getContracts now includes the re-added student's contract
    const contracts2 = AccountingService.getContracts([deletedStudent]);
    const found2 = contracts2.find((c) => c.ogrenciAdi === "YENI TEKRAR OGRENCI");
    expect(found2).toBeDefined();
    expect(found2.durumText).toBe("Aktif");
  });

  test("persists contract across reloads even when another contract was deleted and respects remoteContracts", () => {
    // Contract A is deleted
    AccountingService.deleteContract({ id: "szl-old-deleted", sozlesmeNo: "SZL202600999" });

    // New student B is created with contract
    const studentB = {
      id: "stu-b-123",
      student_name: "YENI B OGRENCI",
      sozlesme_no: "SZL202600154",
      total_fee: 70000,
      donem_id: 113
    };
    const remoteContracts = [{
      id: "cnt-b-123",
      studentId: "stu-b-123",
      sozlesmeNo: "SZL202600154",
      ogrenciAdi: "YENI B OGRENCI",
      brutTutar: 70000,
      donemId: 113,
      durum: 1,
      durumText: "Aktif"
    }];

    // getContracts with remote contracts returns active contract for student B
    const contracts = AccountingService.getContracts([studentB], remoteContracts);
    const foundB = contracts.find(c => c.sozlesmeNo === "SZL202600154");
    expect(foundB).toBeDefined();
    expect(foundB.durum).toBe(1);

    // buildSyntheticContractForStudent works as fallback
    const synth = AccountingService.buildSyntheticContractForStudent(studentB);
    expect(synth.studentId).toBe("stu-b-123");
    expect(synth.sozlesmeNo).toBe("SZL202600154");
  });

  test("preserves Hatice Kübra Ünalan SZL202600150 contract and total count is exactly 121", () => {
    const contracts = AccountingService.getContracts();
    expect(contracts.length).toBe(121);

    const hatice = contracts.find((c) => c.sozlesmeNo === "SZL202600150");
    expect(hatice).toBeDefined();
    expect(hatice.ogrenciAdi).toBe("HATİCE KÜBRA ÜNALAN");
    expect(hatice.brutTutar).toBe(50000);
    expect(hatice.durum).toBe(1);
    expect(hatice.donemId).toBe(113);

    const activeAmount = contracts
      .filter((c) => c.durum === 1)
      .reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);
    expect(Math.round(activeAmount * 100) / 100).toBe(5204810.48);
  });

  test("self-heals and restores Hatice if user localStorage previously tombstoned her", () => {
    // Simulate user having accidentally tombstoned Hatice in previous session
    localStorage.setItem("cozum_deleted_contracts_v1", JSON.stringify(["SZL202600150", "HATİCE KÜBRA ÜNALAN", "74514"]));
    localStorage.setItem("cozum_deleted_students_v1", JSON.stringify(["HATİCE KÜBRA ÜNALAN", "8315150"]));
    AccountingService.clearDelSetsCache();

    const contracts = AccountingService.getContracts();
    const hatice = contracts.find((c) => c.sozlesmeNo === "SZL202600150");
    expect(hatice).toBeDefined();
    expect(hatice.ogrenciAdi).toBe("HATİCE KÜBRA ÜNALAN");
    expect(contracts.length).toBe(121);
  });

  test("skips synthesis for students who have has_contract: false even if they have total_fee", () => {
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
});
