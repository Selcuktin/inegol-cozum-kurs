import initialStudentsData from "../data/edesisStudentsData.json";

const STORAGE_KEYS = {
  CUSTOM_STUDENTS: "cozum_custom_students_v1"
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

    const existingIdx = custom.findIndex((s) => s.id === id || s.student_name.trim().toUpperCase() === normalized.student_name.toUpperCase());
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

    // 1. Add base students from edesisStudentsData.json
    base.forEach((s) => {
      if (s && (s.id || s.student_name)) {
        const key = String(s.id || s.student_name.trim().toUpperCase());
        map.set(key, s);
      }
    });

    // 2. Add remote students from backend / D1
    (remoteStudents || []).forEach((s) => {
      if (s && (s.id || s.student_name)) {
        const key = String(s.id || s.student_name.trim().toUpperCase());
        const existing = map.get(key);
        map.set(key, {
          ...(existing || {}),
          ...s,
          donem_id: s.donem_id || existing?.donem_id || 113,
          donem_adi: s.donem_adi || existing?.donem_adi || "2026-2027",
          status: s.status === "Kayitli" || !s.status ? "Kesin Kayıt" : s.status
        });
      }
    });

    // 3. Add custom students created locally
    custom.forEach((s) => {
      if (s && (s.id || s.student_name)) {
        const key = String(s.id || s.student_name.trim().toUpperCase());
        const existing = map.get(key);
        map.set(key, {
          ...(existing || {}),
          ...s,
          donem_id: s.donem_id || existing?.donem_id || 113,
          donem_adi: s.donem_adi || existing?.donem_adi || "2026-2027",
          status: s.status === "Kayitli" || !s.status ? "Kesin Kayıt" : s.status
        });
      }
    });

    const all = Array.from(map.values());
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
