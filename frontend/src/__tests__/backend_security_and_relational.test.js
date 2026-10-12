import { onRequest } from "../../functions/api/[[route]].js";
import { handleContractsRoutes } from "../../functions/api/routes/contracts.js";
import { handleStudentsRoutes } from "../../functions/api/routes/students.js";

describe("Backend Security, Authorization Guards & Relational Integrity Test Suite", () => {
  const mockEnv = {
    ADMIN_PASSWORD: "secret_admin_pass",
    STAFF_PASSWORD: "secret_staff_pass",
    BACKUP_TOKEN: "secret_backup_token_2026",
    DB: {
      prepare: (query) => ({
        bind: (...params) => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        }),
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true })
      })
    }
  };

  describe("1. Centralized Mutation Auth Guard & Route Protection", () => {
    it("should return 401 UNAUTHORIZED for unauthenticated mutations", async () => {
      const mutationMethods = ["POST", "PUT", "DELETE", "PATCH"];
      for (const method of mutationMethods) {
        const req = new Request("https://inegol-cozum-kurs.pages.dev/api/students", {
          method,
          headers: { "Content-Type": "application/json" }
        });
        const res = await onRequest({ request: req, env: mockEnv });
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe("UNAUTHORIZED");
      }
    });

    it("should return 401 for unauthenticated sensitive GET endpoints (/users, /audit-logs)", async () => {
      const sensitivePaths = ["/users", "/audit-logs"];
      for (const p of sensitivePaths) {
        const req = new Request(`https://inegol-cozum-kurs.pages.dev/api${p}`, {
          method: "GET"
        });
        const res = await onRequest({ request: req, env: mockEnv });
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("2. Fast Isolated /backup Route & Closed Bypass Hole", () => {
    it("should reject /backup with random/invalid Bearer token (no bypass)", async () => {
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/backup", {
        method: "POST",
        headers: {
          "Authorization": "Bearer random_invalid_token_123"
        }
      });
      const res = await onRequest({ request: req, env: mockEnv });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should accept /backup with exact valid BACKUP_TOKEN secret", async () => {
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/backup", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mockEnv.BACKUP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notes: "Automated test backup" })
      });
      const res = await onRequest({ request: req, env: mockEnv });
      // Should not be 401 or 404 - routed successfully to backup processor
      expect(res.status).toBeLessThan(400);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("3. Relational Independence & No Name-based Conflation", () => {
    it("should isolate student records during cascade deletion by target ID without touching same-name students", async () => {
      const executedQueries = [];
      const trackingDb = {
        prepare: (query) => ({
          bind: (...params) => {
            executedQueries.push({ query, params });
            return {
              first: async () => {
                if (query.includes("FROM students WHERE")) {
                  return { id: "std_isolated_1", student_name: "Ahmet Yılmaz" };
                }
                return null;
              },
              all: async () => ({ results: [] }),
              run: async () => ({ success: true })
            };
          }
        }),
        batch: async (stmts) => ({ success: true })
      };

      const ctx = {
        request: new Request("https://inegol-cozum-kurs.pages.dev/api/students/std_isolated_1", { method: "DELETE" }),
        db: trackingDb,
        env: mockEnv,
        path: "/students/std_isolated_1",
        user: { name: "Admin", role: "admin" }
      };

      const res = await handleStudentsRoutes(ctx);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.deleted_id).toBe("std_isolated_1");

      // Verify none of the executed DELETE queries filter by student_name
      const deleteQueries = executedQueries.filter((q) => q.query.includes("DELETE FROM"));
      for (const dq of deleteQueries) {
        expect(dq.query).not.toContain("student_name =");
        expect(dq.query).not.toContain("LOWER(student_name)");
      }
    });

    it("should generate installment due dates strictly on day 15 using local calendar arithmetic without UTC shift", async () => {
      const insertedInstallments = [];
      const trackingDb = {
        prepare: (query) => {
          const stmt = {
            bind: (...params) => {
              if (query.includes("INSERT OR REPLACE INTO installments")) {
                insertedInstallments.push(params);
              }
              return stmt;
            },
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => ({ success: true })
          };
          return stmt;
        },
        batch: async (stmts) => ({ success: true })
      };

      const ctx = {
        request: new Request("https://inegol-cozum-kurs.pages.dev/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_name: "Test Öğrenci",
            total_fee: 60000,
            installment_count: 5
          })
        }),
        db: trackingDb,
        env: mockEnv,
        path: "/students",
        user: { name: "Admin", role: "admin" }
      };

      const res = await handleStudentsRoutes(ctx);
      expect([200, 201]).toContain(res.status);

      // Verify all installments have due_date ending with "-15"
      expect(insertedInstallments.length).toBe(5);
      for (const inst of insertedInstallments) {
        // params: [instId, contractId, glrId, id, i, inst, dueDate, amt]
        const dueDate = inst[6];
        expect(dueDate).toMatch(/^\d{4}-\d{2}-15$/);
      }
    });
  });
});
