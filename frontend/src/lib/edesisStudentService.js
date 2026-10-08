import initialStudentsData from "../data/edesisStudentsData.json";
import edesisAccountingData from "../data/edesisAccountingData.json";
import AccountingService, { trNorm } from "./edesisAccountingService";


const STORAGE_KEYS = {
  CUSTOM_STUDENTS: "cozum_custom_students_v1",
  DELETED_STUDENTS: "cozum_deleted_students_v1"
};

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.warn(`[StudentService] Storage read error for ${key}:`, err);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[StudentService] Storage write error for ${key}:`, err);
  }
}

export const StudentService = {
  getBaseStudents() {
    return initialStudentsData || [];
  },

  getCustomStudents() {
    return readStorage(STORAGE_KEYS.CUSTOM_STUDENTS, []);
  },

  getDeletedStudentKeys() {
    return readStorage(STORAGE_KEYS.DELETED_STUDENTS, []);
  },

  isDeleted(studentOrId) {
    if (!studentOrId) return false;
    const deletedKeys = this.getDeletedStudentKeys();
    if (!deletedKeys || deletedKeys.length === 0) return false;
    const deletedSet = new Set(deletedKeys.map((k) => trNorm(k)));

    if (typeof studentOrId === "string" || typeof studentOrId === "number") {
      return deletedSet.has(trNorm(studentOrId));
    }

    if (studentOrId.id && deletedSet.has(trNorm(studentOrId.id))) {
      return true;
    }
    if (studentOrId.student_name && deletedSet.has(trNorm(studentOrId.student_name))) {
      return true;
    }
    if (studentOrId.student_tc && deletedSet.has(trNorm(studentOrId.student_tc))) {
      return true;
    }
    if (studentOrId.student_no && deletedSet.has(trNorm(studentOrId.student_no))) {
      return true;
    }
    return false;
  },

  filterActiveStudents(students = []) {
    if (!Array.isArray(students)) return [];
    const deletedKeys = this.getDeletedStudentKeys();
    if (!deletedKeys || deletedKeys.length === 0) return students;
    const deletedSet = new Set(deletedKeys.map((k) => trNorm(k)));

    return students.filter((s) => {
      if (!s) return false;
      if (s.id && deletedSet.has(trNorm(s.id))) return false;
      if (s.student_name && deletedSet.has(trNorm(s.student_name))) return false;
      if (s.student_tc && deletedSet.has(trNorm(s.student_tc))) return false;
      if (s.student_no && deletedSet.has(trNorm(s.student_no))) return false;
      return true;
    });
  },

  async deleteStudent(studentOrId, apiBaseUrl = "") {
    if (!studentOrId) return false;
    const id = typeof studentOrId === "object" ? studentOrId.id : studentOrId;
    const name = typeof studentOrId === "object" ? studentOrId.student_name : "";
    const tc = typeof studentOrId === "object" ? studentOrId.student_tc : "";
    const no = typeof studentOrId === "object" ? studentOrId.student_no : "";
    const szlNo = typeof studentOrId === "object" ? studentOrId.sozlesme_no : "";

    // 1. Remove from local custom students storage
    const custom = this.getCustomStudents();
    const updatedCustom = custom.filter((s) => {
      if (id && trNorm(s.id) === trNorm(id)) return false;
      if (name && s.student_name && trNorm(s.student_name) === trNorm(name)) return false;
      return true;
    });
    writeStorage(STORAGE_KEYS.CUSTOM_STUDENTS, updatedCustom);

    // 2. Add to deleted keys storage (persists through F5)
    const deleted = this.getDeletedStudentKeys();
    const newKeys = [...deleted];
    const pushKey = (v) => {
      if (!v) return;
      const n = trNorm(v);
      if (n && !newKeys.map(trNorm).includes(n)) newKeys.push(n);
    };
    pushKey(id);
    pushKey(name);
    pushKey(tc);
    pushKey(no);
    writeStorage(STORAGE_KEYS.DELETED_STUDENTS, newKeys);

    // 3. Purge associated contract, incomes, and installments in AccountingService
    try {
      AccountingService.deleteContract({
        id,
        ogrenciId: id,
        ogrenciAdi: name,
        ogrenciAdiSoyadi: name,
        student_name: name,
        ogrenciNo: no,
        sozlesmeNo: szlNo
      });
    } catch (accErr) {
      console.warn("[StudentService] Accounting purge error on student delete:", accErr);
    }

    // 4. Call remote backend API to delete from Cloudflare D1
    const targetId = id || name;
    if (targetId) {
      const baseUrl = apiBaseUrl || (typeof window !== "undefined" && window.__API_BASE__) || "/api";
      try {
        await fetch(`${baseUrl}/students/${encodeURIComponent(targetId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        console.warn("[StudentService] Remote delete error:", err);
      }
    }

    // 5. Dispatch update event so open views refresh immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: { action: "delete", id, name } }));
    }

    return true;
  },

  saveStudent(student) {
    if (!student || !student.student_name) return null;
    const custom = this.getCustomStudents();
    const id = student.id || `student-${Date.now().toString(36)}`;
    const normalized = {
      id,
      student_name: student.student_name.trim(),
      student_no: student.student_no || "",
      student_tc: student.student_tc || "",
      student_phone: student.student_phone || "",
      student_email: student.student_email || "",
      student_class: student.student_class || "Genel",
      department: student.department || "Sayısal",
      school: student.school || "",
      birth_date: student.birth_date || "",
      diploma_grade: student.diploma_grade || "",
      gender: student.gender || "Erkek",
      parent_name: student.parent_name || "Belirtilmedi",
      parent_phone: student.parent_phone || "",
      parent_email: student.parent_email || "",
      parent_tc: student.parent_tc || "",
      parent_relation: student.parent_relation || "Veli",
      created_at: student.created_at || new Date().toISOString().slice(0, 10),
      status: student.status || "Kesin Kayıt",
      donem_id: student.donem_id || 113,
      donem_adi: student.donem_adi || "2026-2027",
      has_contract: !!student.has_contract,
      sozlesme_no: student.sozlesme_no || "",
      gelir_kodu: student.gelir_kodu || "",
      total_fee: Number(student.total_fee || 0),
      paid_amount: Number(student.paid_amount || 0),
      remaining: Math.max(0, Number(student.total_fee || 0) - Number(student.paid_amount || 0)),
      ...student
    };

    // Remove from deleted list if re-saving
    AccountingService.unTombstone(normalized.student_name, normalized.sozlesme_no, id);
    const deleted = this.getDeletedStudentKeys();
    const normName = trNorm(normalized.student_name);
    const filteredDeleted = deleted.filter((k) => trNorm(k) !== trNorm(id) && trNorm(k) !== normName);
    writeStorage(STORAGE_KEYS.DELETED_STUDENTS, filteredDeleted);

    const existingIdx = custom.findIndex((s) => s.id === id || s.student_name.trim().toUpperCase() === normName);
    if (existingIdx >= 0) {
      custom[existingIdx] = { ...custom[existingIdx], ...normalized };
    } else {
      custom.unshift(normalized);
    }

    writeStorage(STORAGE_KEYS.CUSTOM_STUDENTS, custom);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: normalized }));
    }
    return normalized;
  },

  getAllStudents(remoteStudents = []) {
    const base = this.getBaseStudents();
    const custom = this.getCustomStudents();
    const map = new Map();

    // ponytail: pre-build deleted student set once
    const delKeys = this.getDeletedStudentKeys();
    const delSet = new Set((delKeys || []).map(trNorm));
    const isDel = (s) => {
      if (!s || delSet.size === 0) return false;
      if (typeof s === "string" || typeof s === "number") return delSet.has(trNorm(s));
      if (s.id && delSet.has(trNorm(s.id))) return true;
      if (s.student_no && delSet.has(trNorm(s.student_no))) return true;
      if (s.student_tc && delSet.has(trNorm(s.student_tc))) return true;
      const nm = trNorm(s.student_name || s.ogrenciAdi || s.ogrenciAdiSoyadi);
      if (nm && delSet.has(nm)) return true;
      return false;
    };

    // ponytail: synthesize contracts ONCE for the entire call instead of 250+ times in inner loops
    const allContracts = AccountingService.getContracts(remoteStudents) || [];
    const contractsByName = new Map();
    allContracts.forEach((c) => {
      const n = trNorm(c.ogrenciAdi || c.ogrenciAdiSoyadi || c.musteriUnvan);
      if (n && !contractsByName.has(n)) contractsByName.set(n, c);
      if (c.studentId && !contractsByName.has(String(c.studentId))) contractsByName.set(String(c.studentId), c);
      if (c.id && !contractsByName.has(String(c.id))) contractsByName.set(String(c.id), c);
      if (c.ogrenciNo && !contractsByName.has(String(c.ogrenciNo))) contractsByName.set(String(c.ogrenciNo), c);
    });

    // 1. Add base students from edesisStudentsData.json
    base.forEach((s) => {
      if (s && (s.id || s.student_name) && !isDel(s)) {
        const idKey = s.id ? String(s.id) : "";
        const nameKey = s.student_name ? String(s.student_name).trim().toUpperCase() : "";
        const isContractDel = Boolean(s.contract_deleted || AccountingService.isContractDeleted(s));
        const matched = isContractDel ? null : (contractsByName.get(trNorm(nameKey)) || (idKey ? contractsByName.get(idKey) : null) || null);
        const enriched = {
          ...s,
          contract_deleted: isContractDel,
          has_contract: Boolean(matched),
          sozlesme_no: matched?.sozlesmeNo || ""
        };
        if (idKey) map.set(idKey, enriched);
        if (nameKey) map.set(nameKey, enriched);
      }
    });

    // 2. Add remote students from backend / D1
    (remoteStudents || []).forEach((s) => {
      if (s && (s.id || s.student_name) && !isDel(s)) {
        const idKey = s.id ? String(s.id) : "";
        const nameKey = s.student_name ? String(s.student_name).trim().toUpperCase() : "";
        const existing = (idKey && map.get(idKey)) || (nameKey && map.get(nameKey)) || null;

        const isPlaceholder = (name) => !name || name.trim() === "Belirtilmedi" || name.trim().endsWith(" Velisi");
        const parentName = isPlaceholder(s.parent_name) && existing?.parent_name && !isPlaceholder(existing.parent_name)
          ? existing.parent_name
          : (s.parent_name || existing?.parent_name || "Belirtilmedi");

        const isIlkokul = s.department === "ILKOKUL" || (s.student_class || "").includes("ILK") || ["1-A", "2-A", "3-A", "4-A"].includes(s.student_class);
        const resolvedParentPhone = s.parent_phone || s.mother_phone || s.father_phone || s.guardian_phone || (isIlkokul ? s.student_phone : "") || existing?.parent_phone || "";
        const parentPhone = (!s.parent_phone || s.parent_phone === existing?.student_phone) && existing?.parent_phone
          ? existing.parent_phone
          : (resolvedParentPhone || "");
        const studentPhone = (isIlkokul && (s.student_phone === parentPhone || s.student_phone === s.mother_phone)) ? "" : (s.student_phone || existing?.student_phone || "");
        const parentRelation = existing?.parent_relation || s.parent_relation || (s.mother_name && s.parent_name && s.mother_name.trim().toUpperCase() === s.parent_name.trim().toUpperCase() ? "Anne" : (s.primary_parent === "anne" ? "Anne" : (s.primary_parent === "baba" ? "Baba" : "Veli")));

        const normName = (s.student_name || "").trim().toUpperCase();
        const isContractDel = Boolean(s.contract_deleted || existing?.contract_deleted || AccountingService.isContractDeleted(s));
        const matchedContract = isContractDel ? null : (contractsByName.get(trNorm(normName)) || (idKey ? contractsByName.get(idKey) : null) || null);
        const hasContract = Boolean(matchedContract);

        const merged = {
          ...(existing || {}),
          ...s,
          contract_deleted: isContractDel,
          has_contract: hasContract,
          sozlesme_no: matchedContract?.sozlesmeNo || "",
          student_no: s.student_no || existing?.student_no || matchedContract?.ogrenciNo || "",
          parent_name: parentName,
          parent_phone: parentPhone,
          student_phone: studentPhone,
          parent_relation: parentRelation,
          gender: existing?.gender || s.gender || "Erkek",
          donem_id: s.donem_id || existing?.donem_id || 113,
          donem_adi: s.donem_adi || existing?.donem_adi || "2026-2027",
          status: s.status === "Kayitli" || !s.status ? "Kesin Kayıt" : s.status
        };

        if (idKey) map.set(idKey, merged);
        if (nameKey) map.set(nameKey, merged);
      }
    });

    // 3. Add custom students created locally
    custom.forEach((s) => {
      if (s && (s.id || s.student_name) && !isDel(s)) {
        const idKey = s.id ? String(s.id) : "";
        const nameKey = s.student_name ? String(s.student_name).trim().toUpperCase() : "";
        const existing = (idKey && map.get(idKey)) || (nameKey && map.get(nameKey)) || null;

        const normName = (s.student_name || "").trim().toUpperCase();
        const isContractDel = Boolean(s.contract_deleted || existing?.contract_deleted || AccountingService.isContractDeleted(s));
        const matchedContract = isContractDel ? null : (contractsByName.get(trNorm(normName)) || (idKey ? contractsByName.get(idKey) : null) || null);
        const hasContract = Boolean(matchedContract);

        const merged = {
          ...(existing || {}),
          ...s,
          contract_deleted: isContractDel,
          has_contract: hasContract,
          sozlesme_no: matchedContract?.sozlesmeNo || "",
          student_no: s.student_no || existing?.student_no || matchedContract?.ogrenciNo || "",
          donem_id: s.donem_id || existing?.donem_id || 113,
          donem_adi: s.donem_adi || existing?.donem_adi || "2026-2027",
          status: s.status === "Kayitli" || !s.status ? "Kesin Kayıt" : s.status
        };

        if (idKey) map.set(idKey, merged);
        if (nameKey) map.set(nameKey, merged);
      }
    });

    // Dedup by student_name or id
    const seenNames = new Set();
    const all = [];
    for (const s of map.values()) {
      if (!isDel(s)) {
        const norm = (s.student_name || "").trim().toUpperCase();
        if (norm && !seenNames.has(norm)) {
          seenNames.add(norm);
          all.push(s);
        } else if (!norm && s.id && !seenNames.has(s.id)) {
          seenNames.add(s.id);
          all.push(s);
        }
      }
    }
    all.sort((a, b) => {
      const isNewA = String(a.id || "").startsWith("student-") || (a.created_at && a.created_at >= "2026-10-01");
      const isNewB = String(b.id || "").startsWith("student-") || (b.created_at && b.created_at >= "2026-10-01");
      if (isNewA && !isNewB) return -1;
      if (!isNewA && isNewB) return 1;
      if (isNewA && isNewB) {
        return (b.created_at || "").localeCompare(a.created_at || "") || String(b.id || "").localeCompare(String(a.id || ""));
      }
      return 0;
    });

    return all;
  }
};

export default StudentService;
