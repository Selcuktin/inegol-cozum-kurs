import { AccountingService, ENABLE_KASA_BANKA, trNorm } from "../lib/edesisAccountingService.js";
import { StudentService } from "../lib/edesisStudentService.js";
import EdesisService from "../lib/edesisService.js";
import fs from "fs";
import path from "path";

describe("Phase 3: SSOT Service Layer & REST Parity Test Suite", () => {
  const libDir = path.resolve(__dirname, "../lib");
  const accountingServicePath = path.join(libDir, "edesisAccountingService.js");
  const studentServicePath = path.join(libDir, "edesisStudentService.js");

  beforeEach(() => {
    localStorage.clear();
    AccountingService.resetCustomData();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("1. Static JSON Purge & Zero Tombstones Invariants", () => {
    it("should confirm edesisAccountingService.js contains ZERO imports of edesisAccountingData.json", () => {
      const code = fs.readFileSync(accountingServicePath, "utf-8");
      expect(code).not.toContain("edesisAccountingData.json");
      expect(code).not.toContain("edesisStudentsData.json");
    });

    it("should confirm edesisStudentService.js contains ZERO imports of static JSON files", () => {
      const code = fs.readFileSync(studentServicePath, "utf-8");
      expect(code).not.toContain("edesisAccountingData.json");
      expect(code).not.toContain("edesisStudentsData.json");
    });

    it("should verify protectedKeys hack lists are completely eliminated from services", () => {
      const accCode = fs.readFileSync(accountingServicePath, "utf-8");
      const stuCode = fs.readFileSync(studentServicePath, "utf-8");

      expect(accCode).not.toContain("protectedKeys =");
      expect(accCode).not.toContain("normProtected");
      expect(stuCode).not.toContain("protectedKeys =");
      expect(stuCode).not.toContain("normProtected");
    });

    it("should verify localStorage tombstone keys (cozum_deleted_*) are not written or used", () => {
      const accCode = fs.readFileSync(accountingServicePath, "utf-8");
      const stuCode = fs.readFileSync(studentServicePath, "utf-8");

      expect(accCode).not.toContain("cozum_deleted_contracts_v1");
      expect(accCode).not.toContain("cozum_deleted_incomes_v1");
      expect(stuCode).not.toContain("cozum_deleted_students_v1");
    });
  });

  describe("2. Peşinat (taksitNo: 0) & Installments Synchronization", () => {
    it("should accurately maintain peşinat (taksitNo: 0) and vadeli taksitler (1..N)", () => {
      const rawInstallments = [
        { taksitNo: 0, amount: 10000, paid_amount: 10000, due_date: "2026-10-01" },
        { taksitNo: 1, amount: 8000, paid_amount: 8000, due_date: "2026-11-15" },
        { taksitNo: 2, amount: 8000, paid_amount: 0, due_date: "2026-12-15" },
        { taksitNo: 3, amount: 8000, paid_amount: 0, due_date: "2027-01-15" },
      ];

      AccountingService.setInitialData({installments:rawInstallments.map(i=>({...i,contractId:'cnt_pesinat_test',taksitTutari:i.amount,tahsilEdilen:i.paid_amount,kalanTutar:i.amount-i.paid_amount}))});
      const saved = AccountingService.getInstallments().filter((t) => t.contractId === "cnt_pesinat_test");

      expect(saved).toHaveLength(4);

      const pesinat = saved.find((t) => t.taksitNo === 0);
      expect(pesinat).toBeDefined();
      expect(pesinat.amount).toBe(10000);
      expect(pesinat.tahsilEdilen).toBe(10000);
      expect(pesinat.kalanTutar).toBe(0);

      const regular = saved.filter((t) => t.taksitNo > 0);
      expect(regular).toHaveLength(3);
      expect(regular[0].taksitNo).toBe(1);
      expect(regular[1].taksitNo).toBe(2);
      expect(regular[2].taksitNo).toBe(3);
    });

    it("should rebalance remaining amount across vadeli taksitler without touching peşinat", () => {
      const installments = [
        { taksitNo: 0, amount: 15000, paid_amount: 15000 },
        { taksitNo: 1, amount: 5000, paid_amount: 0 },
        { taksitNo: 2, amount: 5000, paid_amount: 0 },
      ];

      // Total contract fee changed from 25,000 to 35,000 TL
      const rebalanced = AccountingService.rebalanceInstallments(installments, 35000);

      expect(rebalanced).toHaveLength(3);
      const pesinat = rebalanced.find((t) => t.taksitNo === 0);
      expect(pesinat.amount).toBe(15000); // Peşinat stays 15,000

      // Remaining 20,000 TL divided evenly across 2 regular installments
      const regular = rebalanced.filter((t) => t.taksitNo > 0);
      expect(regular[0].amount).toBe(10000);
      expect(regular[1].amount).toBe(10000);
    });
  });

  describe("3. Pure REST Client Behavior & Mock API Integration", () => {
    it("should fetch contracts from /api/contracts and populate in-memory SSOT", async () => {
      const mockContracts = [
        {
          id: "cnt_74514",
          sozlesme_no: "SZL202600150",
          student_id: "8315150",
          student_name: "HATİCE KÜBRA ÜNALAN",
          brut_tutar: 50000,
          net_tutar: 45454.55,
          kdv_tutari: 4545.45,
          taksit_sayisi: 8,
          durum: 1,
        },
        {
          id: "cnt_151",
          sozlesme_no: "SZL202600151",
          student_id: "std_151",
          student_name: "İKLİM USTABAY",
          brut_tutar: 75000,
          net_tutar: 68181.82,
          kdv_tutari: 6818.18,
          taksit_sayisi: 10,
          durum: 1,
        },
      ];

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes("/api/contracts")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockContracts),
          });
        }
        return Promise.reject(new Error("Unknown route: " + url));
      });

      const fetched = await AccountingService.fetchContracts();
      expect(fetched).toHaveLength(2);

      const hatice = fetched.find((c) => c.sozlesmeNo === "SZL202600150");
      expect(hatice).toBeDefined();
      expect(hatice.ogrenciAdi).toBe("HATİCE KÜBRA ÜNALAN");
      expect(hatice.brutTutar).toBe(50000);
      expect(hatice.taksitSayisi).toBe(8);

      // Verify synchronous getContracts immediately retrieves cached SSOT contracts
      const syncList = AccountingService.getContracts();
      expect(syncList).toHaveLength(2);
    });

    it("should fetch installments from /api/installments with authentic properties", async () => {
      const mockInstallments = [
        {
          id: "inst_cnt_74514_1",
          contract_id: "cnt_74514",
          student_id: "8315150",
          installment_no: 1,
          amount: 6250,
          paid_amount: 6250,
          due_date: "2026-10-15",
          status: "Tam Ödendi",
        },
        {
          id: "inst_cnt_74514_2",
          contract_id: "cnt_74514",
          student_id: "8315150",
          installment_no: 2,
          amount: 6250,
          paid_amount: 0,
          due_date: "2026-11-15",
          status: "Bekliyor",
        },
      ];

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes("/api/installments")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockInstallments),
          });
        }
        return Promise.reject(new Error("Unknown route: " + url));
      });

      const insts = await AccountingService.fetchInstallments();
      expect(insts).toHaveLength(2);
      expect(insts[0].taksitNo).toBe(1);
      expect(insts[0].tahsilEdilen).toBe(6250);
      expect(insts[0].kalanTutar).toBe(0);
      expect(insts[1].kalanTutar).toBe(6250);
    });

    it("should verify EdesisService unified facade exports both AccountingService and StudentService", () => {
      expect(EdesisService.getContracts).toBeDefined();
      expect(EdesisService.getAllStudents).toBeDefined();
      expect(ENABLE_KASA_BANKA).toBe(false);
    });
  });
});
