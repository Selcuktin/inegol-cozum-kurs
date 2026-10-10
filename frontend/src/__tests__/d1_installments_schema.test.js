import fs from "fs";
import path from "path";
import {
  generateContractInstallments,
  validateInstallmentUniqueness,
  roundKurus,
} from "../lib/installmentService";
import { getNextSequence } from "../lib/d1SequenceService";

describe("Phase 1: D1 Installments Schema & Integrity Test Suite", () => {
  describe("1. Installment Generation & Kurus Precision Invariants", () => {
    it("should split contract gross fee into exact installments matching total fee to 0 kurus", () => {
      const contract = {
        id: "cnt_test_001",
        student_id: "std_001",
        brut_tutar: 50000.00,
        taksit_sayisi: 8,
        sozlesme_tarihi: "2026-10-01",
      };

      const installments = generateContractInstallments(contract);
      expect(installments).toHaveLength(8);

      const sum = roundKurus(installments.reduce((a, b) => a + b.amount, 0));
      expect(sum).toBe(50000.00);

      // Verify each installment has unique installment_no
      const nos = installments.map(i => i.installment_no);
      expect(nos).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(validateInstallmentUniqueness(installments)).toBe(true);
    });

    it("should correctly handle odd cent division without rounding loss (penny distribution)", () => {
      // 10000.01 / 3 = 3333.33, 3333.33, 3333.35
      const contract = {
        id: "cnt_odd_cents",
        student_id: "std_002",
        brut_tutar: 10000.01,
        taksit_sayisi: 3,
        sozlesme_tarihi: "2026-10-01",
      };

      const installments = generateContractInstallments(contract);
      expect(installments).toHaveLength(3);

      const sum = roundKurus(installments.reduce((a, b) => a + b.amount, 0));
      expect(sum).toBe(10000.01);
      expect(installments[0].amount).toBe(3333.33);
      expect(installments[1].amount).toBe(3333.33);
      expect(installments[2].amount).toBe(3333.35); // Remainder applied to last installment
    });

    it("should reject duplicate (contract_id, installment_no) via validateInstallmentUniqueness", () => {
      const valid = [
        { contract_id: "cnt_1", installment_no: 1 },
        { contract_id: "cnt_1", installment_no: 2 },
        { contract_id: "cnt_2", installment_no: 1 },
      ];
      expect(validateInstallmentUniqueness(valid)).toBe(true);

      const duplicated = [
        { contract_id: "cnt_1", installment_no: 1 },
        { contract_id: "cnt_1", installment_no: 1 }, // Duplicate!
      ];
      expect(validateInstallmentUniqueness(duplicated)).toBe(false);
    });
  });

  describe("2. Atomic D1 Sequence Service Invariants", () => {
    it("should atomically increment sequence and format zero-padded code", async () => {
      let currentVal = 153;
      const mockDb = {
        prepare: (query) => {
          return {
            bind: (...args) => ({
              first: async () => {
                if (query.includes("UPDATE system_sequences")) {
                  currentVal++;
                  return { current_val: currentVal };
                }
                return null;
              },
              run: async () => ({ success: true }),
            }),
            first: async () => null,
            run: async () => ({ success: true }),
          };
        },
      };

      const seq1 = await getNextSequence(mockDb, "SZL_2026", "SZL2026", 5, 153);
      expect(seq1).toBe("SZL202600154");

      const seq2 = await getNextSequence(mockDb, "SZL_2026", "SZL2026", 5, 153);
      expect(seq2).toBe("SZL202600155");

      const glr = await getNextSequence(mockDb, "GLR_2026", "GLR2026", 5, 158);
      // glr will increment currentVal
      expect(glr).toMatch(/^GLR2026\d{5}$/);
    });
  });

  describe("3. Phase 1 Migration SQL Invariants Verification", () => {
    const migrationPath = path.resolve(__dirname, "../../migration_phase1_installments.sql");

    it("should ensure migration file exists and contains valid DDL", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS installments");
      expect(sql).toContain("UNIQUE(contract_id, installment_no)");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS system_sequences");
      expect(sql).toContain("INSERT OR REPLACE INTO system_sequences (name, current_val");
      expect(sql).toContain("'SZL_2026'");
      expect(sql).toContain("'GLR_2026'");
      expect(sql).toContain("'THS_2026'");
    });

    it("should guarantee zero duplicate (contract_id, installment_no) in all migration inserts", () => {
      const sql = fs.readFileSync(migrationPath, "utf8");
      const lines = sql.split("\n");

      const insertRegex = /INSERT OR REPLACE INTO installments \([^)]+\) VALUES \('([^']+)', '([^']+)', '[^']*', '[^']+', (\d+),/i;
      const seenPairs = new Set();
      let insertCount = 0;

      for (const line of lines) {
        const match = line.match(insertRegex);
        if (match) {
          insertCount++;
          const contractId = match[2];
          const instNo = match[3];
          const pairKey = `${contractId}___${instNo}`;

          expect(seenPairs.has(pairKey)).toBe(false);
          seenPairs.add(pairKey);
        }
      }

      expect(insertCount).toBeGreaterThanOrEqual(600);
      expect(seenPairs.size).toBe(insertCount);
    });

    it("should verify Hatice Kubra Unalan (SZL202600150) installments exist with exact 50000 TL sum", () => {
      const sql = fs.readFileSync(migrationPath, "utf8");
      const haticeInserts = sql
        .split("\n")
        .filter(l => l.includes("INSERT OR REPLACE INTO installments") && l.includes("cnt_74514"));

      expect(haticeInserts).toHaveLength(8); // 8 installments
      let totalAmount = 0;
      haticeInserts.forEach(line => {
        const amtMatch = line.match(/,\s*(\d+(?:\.\d+)?),\s*\d+,\s*'[^']+',\s*datetime/);
        if (amtMatch) {
          totalAmount += parseFloat(amtMatch[1]);
        }
      });

      expect(totalAmount).toBe(50000);
    });
  });
});
