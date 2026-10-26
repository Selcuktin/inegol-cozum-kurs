// Cloudflare Pages SSOT REST Client - StudentService
// Single Source of Truth (SSOT) connected directly to Cloudflare D1 via /api/students
// NO static JSON imports, NO localStorage tombstones, NO protectedKeys hack lists.

import AccountingService, { trNorm } from "./edesisAccountingService.js";
import {dataScope} from "./dataSync.js";
import { apiFetch, isAllowedBackendUrl } from "./utils.js";

function getApiUrl() {
  if (typeof localStorage !== "undefined") {
    const custom = localStorage.getItem("custom_api_url");
    if (custom && isAllowedBackendUrl(custom)) {
      return custom.replace(/\/$/, "");
    }
  }
  return "";
}

let cacheEpoch = 0;
let readVersion=0;
const _memory = {
  students: [],
  loaded:false,
  isFetching: false,
};

let cacheScope=dataScope();
function ensureScope(){if(cacheScope!==dataScope()){cacheScope=dataScope();StudentService.resetClientData();}}

export const StudentService = {
  resetClientData() { cacheEpoch++; _memory.students=[];_memory.loaded=false; if(typeof localStorage!=="undefined") localStorage.removeItem("cozum_ssot_students_v2"); },
  // Backward compatibility stubs
  getBaseStudents() { return this.getAllStudents(); },
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
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersion;
    if (typeof fetch === "undefined") return _memory.students;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/students`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      if(version!==readVersion)return _memory.students;
      const list = Array.isArray(rows) ? rows : (rows?.items || rows?.data || []);

      _memory.students = list;_memory.loaded=true;
      return list;
    } catch (err) {
      console.warn("[StudentService] fetchStudents error:", err);
      throw err;
    }
  },

  acceptSnapshot(students){ensureScope();readVersion++;_memory.students=students.map(s=>({...s}));_memory.loaded=true;},
  getAllStudents(propStudents = null) {
    ensureScope();
    const list=_memory.loaded ? _memory.students : (propStudents || _memory.students);
    return list.map((s) => {
      const hasFee = Number(s.total_fee || 0) > 0 || !!s.sozlesme_no;
      return {
        ...s,
        has_contract: s.has_contract !== undefined ? s.has_contract : hasFee,
        sozlesme_no: s.sozlesme_no || null
      };
    }).filter((s) => s && s.is_deleted !== 1).sort((a, b) => {
      const dateA = a.created_at ? new Date(String(a.created_at).replace(" ", "T")).getTime() : 0;
      const dateB = b.created_at ? new Date(String(b.created_at).replace(" ", "T")).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
  },

  // 2. Action Handlers (Mutations sync directly to Cloudflare Pages API)
  async saveStudent(student, apiBaseUrl = "", options = {}) {
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersion;
    if (!student) return null;
    const id = student.id || `student-${crypto.randomUUID().slice(0, 8)}`;
    let studentWithId = { ...student, id };

    if (!options?.skipRemoteSync && !student?.skipRemoteSync) {
      try {
        const rawBase = apiBaseUrl || getApiUrl() || "";
        const base = rawBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");
        const isExisting = !!student.id && !options.create;
        const url = isExisting ? `${base}/api/students/${encodeURIComponent(id)}` : `${base}/api/students`;
        const method = isExisting ? "PATCH" : "POST";

        const response = await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(studentWithId)
        });
        studentWithId = await response.json();
      } catch (err) {
        console.warn("[StudentService] Remote student SAVE error:", err);
        throw err;
      }
    }

    if(epoch!==cacheEpoch||version!==readVersion)return studentWithId;
    readVersion++;
    _memory.loaded=true;
    const idx = _memory.students.findIndex((s) => s.id === id);
    if (idx >= 0) {
      _memory.students[idx] = studentWithId;
    } else {
      _memory.students = [studentWithId, ..._memory.students];
    }


    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_students_updated"));
    }
    return studentWithId;
  },

  async deleteStudent(studentOrId, apiBaseUrl = "") {
    ensureScope();const epoch=cacheEpoch;
    const id = typeof studentOrId === "object" ? studentOrId.id : studentOrId;
    const studentName = typeof studentOrId === "object" ? studentOrId.student_name : null;
    if (!id && !studentName) return false;

    const targetKey = id || studentName;
    try {
      const rawBase = apiBaseUrl || getApiUrl() || "";
      const base = rawBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");
      const res = await apiFetch(`${base}/api/students/${encodeURIComponent(targetKey)}`, {
        method: "DELETE"
      });
      if (!res.ok && res.status !== 404) {
        console.warn("[StudentService] Remote student DELETE non-ok status:", res.status);
      }
    } catch (err) {
      console.warn("[StudentService] Remote student DELETE error:", err);
      throw err;
    }

    if(epoch!==cacheEpoch)return true;
    readVersion++;
    const normId = trNorm(id || "");
    const normName = trNorm(studentName || "");
    _memory.students = _memory.students.filter((s) => {
      if (!s) return false;
      const sId = trNorm(s.id || "");
      const sName = trNorm(s.student_name || "");
      if (normId && (sId === normId || sId === `stu-${normId}` || `stu-${sId}` === normId)) return false;
      if (!normId && normName && sName === normName) return false;
      return true;
    });

    await AccountingService.refreshAfterWrite();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_students_updated"));
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return true;
  }
};

export default StudentService;
