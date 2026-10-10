// Cloudflare Pages SSOT REST Client - StudentService
// Single Source of Truth (SSOT) connected directly to Cloudflare D1 via /api/students
// NO static JSON imports, NO localStorage tombstones, NO protectedKeys hack lists.

import AccountingService, { trNorm } from "./edesisAccountingService.js";

function getApiUrl() {
  if (typeof localStorage !== "undefined") {
    const custom = localStorage.getItem("custom_api_url");
    if (custom) return custom.replace(/\/$/, "");
  }
  return "";
}

function readCache(key, fallback = []) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[StudentService] Storage write error for ${key}:`, err);
  }
}

const _memory = {
  students: readCache("cozum_ssot_students_v2", []),
  isFetching: false,
};

export const StudentService = {
  // Backward compatibility stubs
  getBaseStudents() { return _memory.students; },
  getCustomStudents() { return []; },
  getDeletedStudentKeys() { return []; },

  isDeleted(studentOrId) {
    if (!studentOrId) return false;
    if (typeof studentOrId === "object") {
      return Boolean(studentOrId.is_deleted || studentOrId.contract_deleted || studentOrId.durum === 3);
    }
    return false;
  },

  filterActiveStudents(students = []) {
    if (!Array.isArray(students)) return [];
    return students.filter((s) => s && s.is_deleted !== 1 && s.durum !== 3);
  },

  // 1. Fetch & Get Students (SSOT from /api/students)
  async fetchStudents() {
    if (typeof fetch === "undefined") return _memory.students;
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/students`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = Array.isArray(rows) ? rows : (rows?.items || rows?.data || []);

      _memory.students = list;
      writeCache("cozum_ssot_students_v2", list);
      return list;
    } catch (err) {
      console.warn("[StudentService] fetchStudents error:", err);
      return _memory.students;
    }
  },

  getAllStudents(propStudents = []) {
    let list = (Array.isArray(propStudents) && propStudents.length > 0) ? propStudents : _memory.students;

    if (Array.isArray(propStudents) && propStudents.length > 0) {
      _memory.students = propStudents;
      writeCache("cozum_ssot_students_v2", propStudents);
    } else if (_memory.students.length === 0 && !_memory.isFetching && typeof window !== "undefined") {
      _memory.isFetching = true;
      this.fetchStudents().finally(() => {
        _memory.isFetching = false;
        window.dispatchEvent(new Event("cozum_students_updated"));
      });
    }

    return list.map((s) => {
      const hasFee = Number(s.total_fee || 0) > 0 || !!s.sozlesme_no;
      return {
        ...s,
        has_contract: s.has_contract !== undefined ? s.has_contract : hasFee,
        sozlesme_no: s.sozlesme_no || (hasFee ? `SZL2026${String(Date.now()).slice(-5)}` : null)
      };
    }).filter((s) => s && s.is_deleted !== 1);
  },

  // 2. Action Handlers (Mutations sync directly to Cloudflare Pages API)
  async saveStudent(student, apiBaseUrl = "") {
    if (!student) return null;
    const id = student.id || `student-${crypto.randomUUID().slice(0, 8)}`;
    const studentWithId = { ...student, id };

    try {
      const apiUrl = apiBaseUrl || getApiUrl();
      const isExisting = _memory.students.some((s) => s.id === id);
      const url = isExisting ? `${apiUrl}/api/students/${encodeURIComponent(id)}` : `${apiUrl}/api/students`;
      const method = isExisting ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentWithId)
      });
    } catch (err) {
      console.warn("[StudentService] Remote student SAVE error:", err);
    }

    const idx = _memory.students.findIndex((s) => s.id === id);
    if (idx >= 0) {
      _memory.students[idx] = studentWithId;
    } else {
      _memory.students = [studentWithId, ..._memory.students];
    }

    writeCache("cozum_ssot_students_v2", _memory.students);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_students_updated"));
    }
    return studentWithId;
  },

  async deleteStudent(studentOrId, apiBaseUrl = "") {
    const id = typeof studentOrId === "object" ? studentOrId.id : studentOrId;
    if (!id) return false;

    try {
      const apiUrl = apiBaseUrl || getApiUrl();
      await fetch(`${apiUrl}/api/students/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("[StudentService] Remote student DELETE error:", err);
    }

    const norm = trNorm(id);
    _memory.students = _memory.students.filter((s) => trNorm(s.id) !== norm && trNorm(s.student_name) !== norm);
    writeCache("cozum_ssot_students_v2", _memory.students);

    AccountingService.deleteContract(studentOrId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_students_updated"));
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return true;
  }
};

export default StudentService;
