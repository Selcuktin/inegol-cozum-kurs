import fs from "fs";
import path from "path";
import { errorResponse, successResponse, json } from "../../functions/api/utils.js";
import { getDynamicAccountingSummary } from "../../functions/api/routes/accounting.js";

describe("Phase 2: Modular API Router & Backend Architecture Test Suite", () => {
  const functionsDir = path.resolve(__dirname, "../../functions/api");
  const routesDir = path.resolve(functionsDir, "routes");

  describe("1. Architectural Modularity & Router File Invariants", () => {
    it("should verify functions/api/[[route]].js is refactored into a concise dispatcher (< 150 lines)", () => {
      const routeFile = path.join(functionsDir, "[[route]].js");
      expect(fs.existsSync(routeFile)).toBe(true);

      const content = fs.readFileSync(routeFile, "utf-8");
      const lines = content.split("\n").length;
      // Monolith was 3046 lines; refactored dispatcher must be lean
      expect(lines).toBeLessThan(150);
      expect(content).toContain("handleAuthRoutes");
      expect(content).toContain("handleStudentsRoutes");
      expect(content).toContain("handleContractsRoutes");
      expect(content).toContain("handleAccountingRoutes");
      expect(content).toContain("handleAcademicRoutes");
      expect(content).toContain("handleExamRoutes");
      expect(content).toContain("handleSystemRoutes");
    });

    it("should verify all 7 domain sub-routers and utils.js exist in functions/api/", () => {
      const requiredFiles = [
        "utils.js",
        "routes/auth.js",
        "routes/students.js",
        "routes/contracts.js",
        "routes/accounting.js",
        "routes/academic.js",
        "routes/exams.js",
        "routes/system.js",
      ];

      for (const relPath of requiredFiles) {
        const fullPath = path.join(functionsDir, relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(100);
      }
    });
  });

  describe("2. Elimination of Hardcoded Accounting Values", () => {
    it("should confirm static hardcoded counts (71, 688, 651526.46) are completely purged from accounting router", () => {
      const accountingFile = path.join(routesDir, "accounting.js");
      const content = fs.readFileSync(accountingFile, "utf-8");

      expect(content).not.toContain("overdueInstallmentsCount: 71");
      expect(content).not.toContain("taksitlerCount: 688");
      expect(content).not.toContain("651526.46");

      // Verify it queries real installments table for overdue metrics
      expect(content).toContain("FROM installments");
      expect(content).toContain("overdueRow");
    });

    it("should dynamically compute overdue installments and amounts from mock D1 database", async () => {
      const mockDb = {
        prepare: (query) => ({
          first: async () => {
            if (query.includes("contracts")) {
              return { cnt: 69, rev: 3500000 };
            }
            if (query.includes("student_incomes")) {
              return { cnt: 69, coll: 1200000, rem: 2300000 };
            }
            if (query.includes("payments")) {
              return { cnt: 120, total_paid: 1200000 };
            }
            if (query.includes("WHERE (status = 'Gecikmis'")) {
              // Real D1 dynamic response
              return { cnt: 14, amt: 84000.50 };
            }
            if (query.includes("FROM installments")) {
              return { cnt: 603 };
            }
            return null;
          },
          all: async () => ({ results: [] }),
          bind: () => mockDb.prepare(query),
        }),
      };

      const mockStudents = [{ id: "std_1", is_kesin_kayit: true }, { id: "std_2", is_kesin_kayit: false }];
      const summary = await getDynamicAccountingSummary(mockDb, mockStudents);

      expect(summary.sozlesmelerCount).toBe(69);
      expect(summary.totalRevenue).toBe(3500000);
      expect(summary.totalCollected).toBe(1200000);
      expect(summary.totalRemaining).toBe(2300000);
      expect(summary.taksitlerCount).toBe(603);
      expect(summary.overdueInstallmentsCount).toBe(14);
      expect(summary.overdueAmount).toBe(84000.50);
      expect(summary.activeKesinCount).toBe(1);
    });
  });

  describe("3. Standard Envelope & API Error Responses", () => {
    it("should format standard error responses with status, code, and details", async () => {
      const res = errorResponse("Geçersiz yetki", 403, "FORBIDDEN", { requiredRole: "admin" });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe("Geçersiz yetki");
      expect(body.detail).toBe("Geçersiz yetki");
      expect(body.code).toBe("FORBIDDEN");
      expect(body.details.requiredRole).toBe("admin");
    });

    it("should format standard success responses with ok: true and data payload", async () => {
      const res = successResponse({ id: "cnt_1", total: 75000 }, 201);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual({ id: "cnt_1", total: 75000 });
    });
  });
});
