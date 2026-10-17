import AccountingService from "../lib/edesisAccountingService";
import StudentService from "../lib/edesisStudentService";
import { handleContractsRoutes } from "../../functions/api/routes/contracts";
const nodeCrypto = require("crypto");

if (!globalThis.crypto || !globalThis.crypto.randomUUID) {
  globalThis.crypto = {
    ...globalThis.crypto,
    randomUUID: () => nodeCrypto.randomUUID(),
  };
}

describe("Single Contract Creation & Duplicate Prevention Guarantee", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it("addNewIncome does NOT fire remote POST /api/contracts when skipRemoteSync is true", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );

    await AccountingService.addNewIncome({
      ogrenciAdi: "Test Tek Sözleşme",
      veliAdi: "Test Veli",
      brutTutar: 40000,
      taksitSayisi: 4,
      skipRemoteSync: true,
      sozlesmeNo: "SZL202600999",
    });

    const contractPostCalls = fetchSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/api/contracts") && c[1]?.method === "POST"
    );

    expect(contractPostCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("addNewIncome does NOT fire remote POST /api/contracts when pre-assigned sozlesmeNo is provided", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );

    await AccountingService.addNewIncome({
      ogrenciAdi: "Test Mevcut Sözleşme",
      veliAdi: "Test Veli",
      brutTutar: 50000,
      taksitSayisi: 5,
      sozlesmeNo: "SZL202600154",
    });

    const contractPostCalls = fetchSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/api/contracts") && c[1]?.method === "POST"
    );

    expect(contractPostCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("StudentService.saveStudent does NOT fire remote fetch when skipRemoteSync is true", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );

    await StudentService.saveStudent(
      { id: "student-test-1", student_name: "Test Öğrenci" },
      "",
      { skipRemoteSync: true }
    );

    const studentCalls = fetchSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/api/students")
    );

    expect(studentCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("POST /contracts reuses existing contract and does NOT generate duplicate sequence when active contract exists", async () => {
    const mockDb = {
      prepare: jest.fn().mockImplementation((query) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockImplementation(async () => {
            if (query.includes("SELECT * FROM students")) return { id: "student-123" };
                if (query.includes("SELECT * FROM contracts")) {
              return {
                id: "cnt_existing_123",
                sozlesme_no: "SZL202600154",
                student_id: "student-c0815333",
                student_name: "sdsd",brut_tutar:43000,taksit_sayisi:6,
              };
            }
            return null;
          }),
          all: jest.fn().mockResolvedValue({ results: [] }),
          run: jest.fn().mockResolvedValue({ success: true }),
        }),
      })),
    };

    const request = new Request("http://localhost/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: "student-c0815333",
        student_name: "sdsd",
        total_amount: 43000,
        installment_count: 6,
      }),
    });

    const response = await handleContractsRoutes({
      request,
      db: mockDb,
      url: new URL("http://localhost/contracts"),
      path: "/contracts",
      user: { user_id: "u1", name: "Yönetici" },
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.id).toBe("cnt_existing_123");
    expect(data.sozlesme_no).toBe("SZL202600154");
  });

  it("StudentService.deleteStudent normalizes URL and calls /api/students/:id without double /api even when API is '/api'", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
    );

    await StudentService.deleteStudent(
      { id: "student-del-123", student_name: "Silinecek Öğrenci" },
      "/api"
    );

    const deleteCall = fetchSpy.mock.calls.find(
      (c) => c[1]?.method === "DELETE" && typeof c[0] === "string" && c[0].includes("students")
    );

    expect(deleteCall).toBeDefined();
    expect(deleteCall[0]).toBe("/api/students/student-del-123");
    expect(deleteCall[0]).not.toContain("/api/api");
    fetchSpy.mockRestore();
  });
});
