import { TextEncoder } from "util";
global.TextEncoder = TextEncoder;
import { onRequest } from "../../functions/api/[[route]].js";
import { handleContractsRoutes } from "../../functions/api/routes/contracts.js";
import { handleStudentsRoutes } from "../../functions/api/routes/students.js";

describe("Backend Security, Authorization Guards & Relational Integrity Test Suite", () => {
  const mockEnv = {
    ADMIN_PASSWORD: "cozum2026",
    STAFF_PASSWORD: "4321",
    BACKUP_TOKEN: "secret_backup_token_2026",
    DB: {
      batch: async stmts => Promise.all(stmts.map(s => s.all ? s.all() : s.run())),
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

    it("should return 401 UNAUTHORIZED for unauthenticated data GET endpoints (/students, /dashboard, /contracts, /export/students)", async () => {
      const publicBlockedPaths = ["/students", "/dashboard", "/contracts", "/payments", "/student-incomes", "/installments", "/attendance", "/teachers", "/export/students"];
      for (const p of publicBlockedPaths) {
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
              if (query.includes("INSERT INTO installments")) {
                insertedInstallments.push(...JSON.parse(params[4]));
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
        const dueDate = inst.due_date;
        expect(dueDate).toMatch(/^\d{4}-\d{2}-15$/);
      }
    });
  });

  describe("4. cozum2026 Admin and Staff Quick Login", () => {
    it("should authenticate admin with password 'cozum2026'", async () => {
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", password: "cozum2026" })
      });
      const res = await onRequest({ request: req, env: mockEnv });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.session_token).toBeTruthy();
    });

    it("should reject staff/teacher quick login with 403 STAFF_LOGIN_DISABLED", async () => {
      const reqMuhasebe = new Request("https://inegol-cozum-kurs.pages.dev/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "muhasebe", password: "cozum2026" })
      });
      const resMuhasebe = await onRequest({ request: reqMuhasebe, env: mockEnv });
      expect(resMuhasebe.status).toBe(403);
      const dataMuhasebe = await resMuhasebe.json();
      expect(dataMuhasebe.ok).toBe(false);
      expect(dataMuhasebe.code).toBe("STAFF_LOGIN_DISABLED");

      const reqOgretmen = new Request("https://inegol-cozum-kurs.pages.dev/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ogretmen", password: "cozum2026" })
      });
      const resOgretmen = await onRequest({ request: reqOgretmen, env: mockEnv });
      expect(resOgretmen.status).toBe(403);
    });

    it("should reject wrong password with 401 AUTH_FAILED", async () => {
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", password: "wrong_password_99" })
      });
      const res = await onRequest({ request: req, env: mockEnv });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe("AUTH_FAILED");
    });

    it("should reject old password if ADMIN_PASSWORD is rotated to a new secret", async () => {
      const rotatedEnv = { ...mockEnv, ADMIN_PASSWORD: "new_rotated_super_secret_2026" };
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", password: "cozum2026" })
      });
      const res = await onRequest({ request: req, env: rotatedEnv });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe("AUTH_FAILED");
    });
  });

  describe("5. Centralized RBAC Role Authorization Matrix", () => {
    const teacherEnv = {
      ...mockEnv,
      DB: {
        prepare: (query) => ({
          bind: (...params) => ({
            first: async () => ({ user_id: "u_teacher", email: "teacher@example.com", name: "Öğretmen", role: "ogretmen" }),
            all: async () => ({ results: [] }),
            run: async () => ({ success: true })
          }),
          first: async () => ({ user_id: "u_teacher", email: "teacher@example.com", name: "Öğretmen", role: "ogretmen" }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        })
      }
    };

    it("should block non-admin users from DELETE operations (403 FORBIDDEN)", async () => {
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/students/std_123", {
        method: "DELETE",
        headers: { "Authorization": "Bearer tok_teacher" }
      });
      const res = await onRequest({ request: req, env: teacherEnv });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN");
    });

    it("should block non-admin users from accessing /users and /audit-logs (403 FORBIDDEN)", async () => {
      for (const p of ["/users", "/audit-logs"]) {
        const req = new Request(`https://inegol-cozum-kurs.pages.dev/api${p}`, {
          method: "GET",
          headers: { "Authorization": "Bearer tok_teacher" }
        });
        const res = await onRequest({ request: req, env: teacherEnv });
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.code).toBe("FORBIDDEN");
      }
    });

    it("should block teachers from financial mutations (403 FORBIDDEN)", async () => {
      const req = new Request("https://inegol-cozum-kurs.pages.dev/api/contracts", {
        method: "POST",
        headers: { "Authorization": "Bearer tok_teacher", "Content-Type": "application/json" },
        body: JSON.stringify({ student_name: "Test" })
      });
      const res = await onRequest({ request: req, env: teacherEnv });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN");
    });

    it("should block non-admin users from /classes and /teachers mutations (403 FORBIDDEN)", async () => {
      for (const p of ["/classes", "/teachers"]) {
        const req = new Request(`https://inegol-cozum-kurs.pages.dev/api${p}`, {
          method: "POST",
          headers: { "Authorization": "Bearer tok_teacher", "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Deneme" })
        });
        const res = await onRequest({ request: req, env: teacherEnv });
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("6. API Security Hardening: Whitelist & Stack Trace Protection", () => {
    it("should reject malicious custom API URLs", () => {
      const { isAllowedBackendUrl } = require("../components/layout/AuthAndNav");
      expect(isAllowedBackendUrl("https://evil-attacker.com")).toBe(false);
      expect(isAllowedBackendUrl("http://attacker.com/api")).toBe(false);
      expect(isAllowedBackendUrl("javascript:alert(1)")).toBe(false);
      expect(isAllowedBackendUrl("https://inegol-cozum-kurs.pages.dev")).toBe(true);
      expect(isAllowedBackendUrl("http://localhost:3000")).toBe(true);
    });
  });
});
