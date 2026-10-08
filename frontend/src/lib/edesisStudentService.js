import initialStudentsData from "../data/edesisStudentsData.json";
import edesisAccountingData from "../data/edesisAccountingData.json";

const contractsByNameMap = {
  get(name) {
    if (!name) return [];
    const norm = String(name).trim().toUpperCase();
    const map = new Map();
    const custom = readStorage("cozum_custom_contracts_v1", []);
    const base = edesisAccountingData.sozlesmeler || [];
    [...custom, ...base].forEach((c) => {
      const n = (c.ogrenciAdi || c.ogrenciAdiSoyadi || c.musteriUnvan || "").trim().toUpperCase();
      if (n) {
        if (!map.has(n)) map.set(n, []);
        map.get(n).push(c);
      }
    });
    return map.get(norm) || [];
  }
};

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
    const deletedSet = new Set(deletedKeys.map((k) => String(k).trim().toUpperCase()));

    if (typeof studentOrId === "string") {
      return deletedSet.has(studentOrId.trim().toUpperCase());
    }

    if (studentOrId.id && deletedSet.has(String(studentOrId.id).trim().toUpperCase())) {
      return true;
    }
    if (studentOrId.student_name && deletedSet.has(String(studentOrId.student_name).trim().toUpperCase())) {
      return true;
    }
    if (studentOrId.student_tc && deletedSet.has(String(studentOrId.student_tc).trim().toUpperCase())) {
      return true;
    }
    if (studentOrId.student_no && deletedSet.has(String(studentOrId.student_no).trim().toUpperCase())) {
      return true;
    }
    return false;
  },

  filterActiveStudents(students = []) {
    if (!Array.isArray(students)) return [];
    const deletedKeys = this.getDeletedStudentKeys();
    if (!deletedKeys || deletedKeys.length === 0) return students;
    const deletedSet = new Set(deletedKeys.map((k) => String(k).trim().toUpperCase()));

    return students.filter((s) => {
      if (!s) return false;
      if (s.id && deletedSet.has(String(s.id).trim().toUpperCase())) return false;
      if (s.student_name && deletedSet.has(String(s.student_name).trim().toUpperCase())) return false;
      if (s.student_tc && deletedSet.has(String(s.student_tc).trim().toUpperCase())) return false;
      if (s.student_no && deletedSet.has(String(s.student_no).trim().toUpperCase())) return false;
      return true;
    });
  },

  async deleteStudent(studentOrId, apiBaseUrl = "") {
    if (!studentOrId) return false;
    const id = typeof studentOrId === "object" ? studentOrId.id : studentOrId;
    const name = typeof studentOrId === "object" ? studentOrId.student_name : "";

    // 1. Remove from local custom students storage
    const custom = this.getCustomStudents();
    const updatedCustom = custom.filter((s) => {
      if (id && String(s.id).toUpperCase() === String(id).toUpperCase()) return false;
      if (name && s.student_name && s.student_name.trim().toUpperCase() === name.trim().toUpperCase()) return false;
      return true;
    });
    writeStorage(STORAGE_KEYS.CUSTOM_STUDENTS, updatedCustom);

    // 2. Add to deleted keys storage (persists through F5)
    const deleted = this.getDeletedStudentKeys();
    const newKeys = [...deleted];
    if (id && !newKeys.includes(String(id))) newKeys.push(String(id));
    if (name) {
      const normName = name.trim().toUpperCase();
      if (!newKeys.includes(normName)) newKeys.push(normName);
    }
    writeStorage(STORAGE_KEYS.DELETED_STUDENTS, newKeys);

    // 3. Call remote backend API to delete from Cloudflare D1
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

    // 4. Dispatch update event so open views refresh immediately
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
    const deleted = this.getDeletedStudentKeys();
    const normName = normalized.student_name.toUpperCase();
    const filteredDeleted = deleted.filter((k) => String(k).toUpperCase() !== String(id).toUpperCase() && String(k).toUpperCase() !== normName);
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

    const isDel = (s) => this.isDeleted(s);

    // 1. Add base students from edesisStudentsData.json
    base.forEach((s) => {
      if (s && (s.id || s.student_name) && !isDel(s)) {
        const idKey = s.id ? String(s.id) : "";
        const nameKey = s.student_name ? String(s.student_name).trim().toUpperCase() : "";
        const cList = contractsByNameMap.get(nameKey) || [];
        const matched = cList[0] || null;
        const enriched = {
          ...s,
          has_contract: Boolean(s.has_contract || matched),
          sozlesme_no: s.sozlesme_no || matched?.sozlesmeNo || ""
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
        const cList = contractsByNameMap.get(normName) || [];
        const matchedContract = cList[0] || null;
        const hasContract = Boolean((existing && existing.has_contract) || s.has_contract || matchedContract || s.sozlesme_no);

        const merged = {
          ...(existing || {}),
          ...s,
          has_contract: hasContract,
          sozlesme_no: s.sozlesme_no || existing?.sozlesme_no || matchedContract?.sozlesmeNo || "",
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
        const cList = contractsByNameMap.get(normName) || [];
        const matchedContract = cList[0] || null;
        const hasContract = Boolean((existing && existing.has_contract) || s.has_contract || matchedContract || s.sozlesme_no);

        const merged = {
          ...(existing || {}),
          ...s,
          has_contract: hasContract,
          sozlesme_no: s.sozlesme_no || existing?.sozlesme_no || matchedContract?.sozlesmeNo || "",
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
