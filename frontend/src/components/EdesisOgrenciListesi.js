import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Printer,
  ChevronDown,
  ChevronRight,
  X,
  Lock,
  Camera,
  MessageCircle,
  Download,
  AlertCircle,
  Award,
  GraduationCap,
  Settings,
  ExternalLink,
  Plus
} from "lucide-react";
import { StudentService } from "../lib/edesisStudentService";
import AccountingService, { trNorm } from "../lib/edesisAccountingService";
import { trIncludes } from "../lib/utils";

export default function EdesisOgrenciListesi({
  students: propStudents = [],
  globalSearch = "",
  onSearchChange,
  onNewStudent,
  onSelectStudent,
  onOpenGelir,
  onOpenContract,
  onOpenKarne,
  onNavigate,
  API
}) {
  const [students, setStudents] = useState(() => StudentService.getAllStudents(propStudents));

  useEffect(() => {
    setStudents(StudentService.getAllStudents(propStudents));
  }, [propStudents]);

  useEffect(() => {
    const handleUpdate = () => {
      setStudents(StudentService.getAllStudents(propStudents));
    };
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => window.removeEventListener("cozum_students_updated", handleUpdate);
  }, [propStudents]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("Kesin Kayıt"); // default 1:1 with Edesis
  const [periodFilter, setPeriodFilter] = useState("113"); // 113: 2026-2027
  const [classFilter, setClassFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(() => {
    if (globalSearch) return globalSearch;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("q")) return params.get("q");
      const hash = window.location.hash || "";
      if (hash.includes("?")) {
        const hashParams = new URLSearchParams(hash.split("?")[1]);
        if (hashParams.get("q")) return hashParams.get("q");
      }
    } catch (e) {}
    return "";
  });

  useEffect(() => {
    if (globalSearch !== undefined && globalSearch !== null) {
      setSearchQuery(globalSearch);
      setCurrentPage(1);
    }
  }, [globalSearch]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest || !e.target.closest("[data-edesis-dropdown]")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdownId]);

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editActiveTab, setEditActiveTab] = useState("ogrenci"); // 'ogrenci' | 'kullanici' | 'adres' | 'ogretmen' | 'tarihce'
  const [editFormData, setEditFormData] = useState({});

  // Sözleşmeler modal state & helper
  const [contractsModalStudent, setContractsModalStudent] = useState(null);

  const [contractsTick, setContractsTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setContractsTick((t) => t + 1);
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
      window.removeEventListener("cozum_students_updated", handleUpdate);
    };
  }, []);

  const allContracts = useMemo(() => {
    try {
      return AccountingService.getContracts(students);
    } catch {
      return [];
    }
  }, [contractsTick, students]);

  const contractLookup = useMemo(() => {
    const byName = new Map();
    const byId = new Map();
    const byNo = new Map();
    const bySzl = new Map();
    (allContracts || []).forEach((c) => {
      const name = trNorm(c.ogrenciAdi || c.ogrenciAdiSoyadi || c.musteriUnvan || "");
      if (name) {
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(c);
      }
      if (c.studentId) {
        const sid = String(c.studentId);
        const cleanId = sid.replace(/^stu-/, "");
        byId.set(sid, c);
        byId.set(cleanId, c);
        byId.set(`stu-${cleanId}`, c);
      }
      if (c.id) {
        const cid = String(c.id);
        const cleanId = cid.replace(/^stu-/, "");
        byId.set(cid, c);
        byId.set(cleanId, c);
        byId.set(`stu-${cleanId}`, c);
      }
      if (c.ogrenciNo) byNo.set(String(c.ogrenciNo), c);
      if (c.sozlesmeNo) bySzl.set(c.sozlesmeNo, c);
    });
    return { byName, byId, byNo, bySzl };
  }, [allContracts]);

  const getStudentContracts = (student) => {
    if (!student || student.contract_deleted || AccountingService.isContractDeleted(student)) return [];

    // 1. Direct sozlesme_no match (SSOT)
    if (student.sozlesme_no && contractLookup.bySzl.has(student.sozlesme_no)) {
      return [contractLookup.bySzl.get(student.sozlesme_no)];
    }

    // 2. Student ID match (with and without 'stu-' prefix)
    if (student.id) {
      const sid = String(student.id);
      const cleanId = sid.replace(/^stu-/, "");
      if (contractLookup.byId.has(sid)) return [contractLookup.byId.get(sid)];
      if (contractLookup.byId.has(cleanId)) return [contractLookup.byId.get(cleanId)];
    }

    // 3. Name match
    const normName = trNorm(student.student_name || "");
    const direct = contractLookup.byName.get(normName);
    if (direct && direct.length > 0) return direct;

    // 4. Student school number match
    if (student.student_no && contractLookup.byNo.has(String(student.student_no))) {
      return [contractLookup.byNo.get(String(student.student_no))];
    }

    return [];
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Distinct classes for dropdown filter
  const classOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.student_class) set.add(s.student_class);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Period filter
      if (periodFilter !== "all" && String(s.donem_id) !== String(periodFilter)) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "Kesin Kayıt") {
          const isKesin = s.status === "Kesin Kayıt" || s.status === "Aktif" || s.status === "Kayitli" || s.is_kesin_kayit;
          if (!isKesin) return false;
        } else if (s.status !== statusFilter) {
          return false;
        }
      }
      // Class filter
      if (classFilter !== "all" && s.student_class !== classFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const match =
          trIncludes(s.student_name, q) ||
          trIncludes(s.student_tc, q) ||
          trIncludes(s.student_no, q) ||
          trIncludes(s.student_phone, q) ||
          trIncludes(s.student_email, q) ||
          trIncludes(s.parent_name, q) ||
          trIncludes(s.parent_phone, q) ||
          trIncludes(s.secondary_parent_name, q) ||
          trIncludes(s.secondary_parent_phone, q) ||
          trIncludes(s.student_class, q) ||
          trIncludes(s.department, q);
        if (!match) {
          return false;
        }
      }
      return true;
    });
  }, [students, periodFilter, statusFilter, classFilter, searchQuery]);

  // Counts for pills
  const kesinCount = useMemo(() => {
    return students.filter((s) => {
      const isKesin = s.status === "Kesin Kayıt" || s.status === "Aktif" || s.status === "Kayitli" || s.is_kesin_kayit;
      return isKesin && (periodFilter === "all" || String(s.donem_id) === String(periodFilter));
    }).length;
  }, [students, periodFilter]);

  // Pagination slice
  const totalCount = filteredStudents.length;
  const totalPages = pageSize === "all" ? 1 : Math.ceil(totalCount / Number(pageSize));
  const paginatedStudents = useMemo(() => {
    if (pageSize === "all") return filteredStudents;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filteredStudents.slice(start, start + size);
  }, [filteredStudents, currentPage, pageSize]);

  // Checkbox handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (window.confirm(`Seçilen ${selectedIds.size} öğrenci kaydını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      const idsToDelete = Array.from(selectedIds);
      const toDeleteStudents = students.filter((s) => idsToDelete.includes(s.id));
      for (const st of toDeleteStudents) {
        await StudentService.deleteStudent(st, API);
      }
      setStudents((prev) => prev.filter((it) => !idsToDelete.includes(it.id)));
      setSelectedIds(new Set());
      showToast(`🗑️ ${idsToDelete.length} öğrenci başarıyla silindi.`);
    }
  };

  // Open Edit Modal (1:1 with media_1791229810136.png)
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setEditActiveTab("ogrenci");
    setEditFormData({
      donem: student.donem_adi || "2026-2027",
      sube: student.student_class || "",
      bolum: student.department || "ARA SINIF",
      okul: student.school || "",
      numara: student.student_no || "",
      tc: student.student_tc || "",
      dogumTarihi: student.birth_date || "",
      diplomaNotu: student.diploma_grade || "",
      cinsiyet: student.gender || "Erkek",
      kayitDurumu: student.status || "Kesin Kayıt",
      dinMuaf: !!student.din_muaf,
      ingMuaf: !!student.ing_muaf,
      studentName: student.student_name,
      studentPhone: student.student_phone,
      studentEmail: student.student_email,
      parentName: student.parent_name || "",
      parentRelation: student.parent_relation || "Anne",
      parentPhone: student.parent_phone || "",
      parentTc: student.parent_tc || "",
      secondaryParentName: student.secondary_parent_name || "",
      secondaryParentRelation: student.secondary_parent_relation || "Baba",
      secondaryParentPhone: student.secondary_parent_phone || "",
      address: student.address || ""
    });
    setOpenDropdownId(null);
  };

  // Auto-open edit modal if requested via sessionStorage (e.g. from Sözleşme Detay)
  useEffect(() => {
    try {
      const editTarget = sessionStorage.getItem("cozum_open_edit_student_id");
      if (editTarget && students && students.length > 0) {
        sessionStorage.removeItem("cozum_open_edit_student_id");
        const normTarget = trNorm(editTarget);
        const found = students.find(
          (s) => String(s.id) === String(editTarget) || trNorm(s.student_name) === normTarget
        );
        if (found) {
          handleOpenEdit(found);
        }
      }
    } catch (e) {}
  }, [students]);

  // Save Edit Form
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const newStudentName = editFormData.studentName ? editFormData.studentName.trim() : (editingStudent.student_name || "");
    const updatedObj = {
      ...editingStudent,
      student_name: newStudentName,
      student_class: editFormData.sube !== undefined ? editFormData.sube : editingStudent.student_class,
      department: editFormData.bolum !== undefined ? editFormData.bolum : editingStudent.department,
      school: editFormData.okul !== undefined ? editFormData.okul : editingStudent.school,
      student_no: editFormData.numara !== undefined ? editFormData.numara : editingStudent.student_no,
      student_tc: editFormData.tc !== undefined ? editFormData.tc : editingStudent.student_tc,
      birth_date: editFormData.dogumTarihi !== undefined ? editFormData.dogumTarihi : editingStudent.birth_date,
      gender: editFormData.cinsiyet !== undefined ? editFormData.cinsiyet : editingStudent.gender,
      status: editFormData.kayitDurumu !== undefined ? editFormData.kayitDurumu : editingStudent.status,
      din_muaf: editFormData.dinMuaf ? 1 : 0,
      ing_muaf: editFormData.ingMuaf ? 1 : 0,
      student_phone: editFormData.studentPhone !== undefined ? editFormData.studentPhone : editingStudent.student_phone,
      student_email: editFormData.studentEmail !== undefined ? editFormData.studentEmail : editingStudent.student_email,
      parent_name: editFormData.parentName !== undefined ? editFormData.parentName.trim() : editingStudent.parent_name,
      parent_relation: editFormData.parentRelation !== undefined ? editFormData.parentRelation : editingStudent.parent_relation,
      parent_phone: editFormData.parentPhone !== undefined ? editFormData.parentPhone : editingStudent.parent_phone,
      parent_tc: editFormData.parentTc !== undefined ? editFormData.parentTc : editingStudent.parent_tc,
      secondary_parent_name: editFormData.secondaryParentName !== undefined ? editFormData.secondaryParentName : editingStudent.secondary_parent_name,
      secondary_parent_relation: editFormData.secondaryParentRelation !== undefined ? editFormData.secondaryParentRelation : editingStudent.secondary_parent_relation,
      secondary_parent_phone: editFormData.secondaryParentPhone !== undefined ? editFormData.secondaryParentPhone : editingStudent.secondary_parent_phone,
      address: editFormData.address !== undefined ? editFormData.address : editingStudent.address
    };

    StudentService.saveStudent(updatedObj);
    setStudents(StudentService.getAllStudents(propStudents));
    showToast(`✅ ${newStudentName} bilgileri güncellendi.`);
    setEditingStudent(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Öğrenci No", "Adı Soyadı", "TC Kimlik No", "Doğum Tarihi", "Şube", "Bölüm", "Telefon", "Veli Adı", "Veli Telefon", "Kayıt Durumu"];
    const rows = filteredStudents.map((s) => [
      s.student_no || "",
      s.student_name || "",
      s.student_tc || "",
      s.birth_date || "",
      s.student_class || "",
      s.department || "",
      s.student_phone || "",
      s.parent_name || "",
      s.parent_phone || "",
      s.status || ""
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Edesis_Ogrenciler_${periodFilter === "113" ? "2026-2027" : "Tumu"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✅ Öğrenci listesi CSV olarak indirildi.");
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f8fa",
        minHeight: "100vh",
        padding: "4px 8px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1e293b"
      }}
      onClick={() => {
        if (openDropdownId) setOpenDropdownId(null);
      }}
    >
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#1e293b",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 100000,
            fontSize: "13px",
            fontWeight: 600
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* TOP CONTROLS & FILTER ROW */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "10px 14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          marginBottom: "10px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          {/* Left: Dönem + Durum Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px" }}>
              <Calendar size={14} color="#64748b" style={{ marginRight: "6px" }} />
              <select
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ border: "none", background: "transparent", fontSize: "12px", fontWeight: 600, outline: "none", cursor: "pointer" }}
              >
                <option value="113">2026-2027 (Aktif)</option>
                <option value="40">2025-2026</option>
                <option value="all">Tüm Dönemler</option>
              </select>
            </div>

            {/* Sınıf Seçimi */}
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: "5px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", background: "#fff", outline: "none" }}
            >
              <option value="all">Tüm Şubeler</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            {/* FİLTRELER Active Tag (Matches media_1791229777810.png) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>FİLTRELER:</span>
              {statusFilter === "Kesin Kayıt" ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "1px solid #bfdbfe"
                  }}
                >
                  Durum: Kesin Kayıt ({kesinCount})
                  <X
                    size={13}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                  />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("Kesin Kayıt");
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  + Kesin Kayıt ({kesinCount})
                </button>
              )}

              {statusFilter !== "all" && (
                <span
                  style={{ fontSize: "11px", color: "#64748b", textDecoration: "underline", cursor: "pointer", marginLeft: "4px" }}
                  onClick={() => {
                    setStatusFilter("all");
                    setClassFilter("all");
                    setSearchQuery("");
                    if (onSearchChange) onSearchChange("");
                  }}
                >
                  Tümünü temizle
                </span>
              )}
            </div>
          </div>

          {/* Right: Search & Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: "240px" }}>
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px" }} aria-hidden="true" />
              <input
                type="search"
                role="searchbox"
                aria-label="Öğrenci adı, TC, okul no veya veli bilgisi ile ara"
                placeholder="Öğrenci adı, TC, no, veli..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onSearchChange) onSearchChange(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>

            <button
              type="button"
              aria-label="Öğrenci listesini Excel formatında indir"
              onClick={handleExportCSV}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#166534",
                cursor: "pointer"
              }}
            >
              <Download size={13} color="#16a34a" /> Excel
            </button>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(220, 38, 38, 0.2)"
                }}
              >
                <Trash2 size={13} /> Seçilenleri Sil ({selectedIds.size})
              </button>
            )}

            {onNewStudent && (
              <button
                type="button"
                onClick={onNewStudent}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  background: "#1d4ed8",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(29, 78, 216, 0.2)"
                }}
              >
                <UserPlus size={14} /> + Yeni Öğrenci
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STUDENTS DATA TABLE (Matches media_1791229777810.png 100%) */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          overflow: "visible"
        }}
      >
        <div style={{ overflowX: "auto", minHeight: "360px" }}>
          <table aria-label="Öğrenci Kayıt Listesi" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "2px solid #f1f5f9", color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                <th scope="col" style={{ padding: "6px 2px", width: "26px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    aria-label="Tüm öğrencileri seç"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedStudents.length}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th scope="col" style={{ padding: "6px 2px", width: "70px", textAlign: "center" }}>İşlemler</th>
                <th scope="col" style={{ padding: "6px 3px", width: "135px" }}>Öğrenci ⇅</th>
                <th scope="col" style={{ padding: "6px 3px", width: "72px" }}>Şube ⇅</th>
                <th scope="col" style={{ padding: "6px 3px", width: "62px" }}>Bölüm ⇅</th>
                <th scope="col" style={{ padding: "6px 2px", width: "28px", textAlign: "center" }}>Öğrt.</th>
                <th scope="col" style={{ padding: "6px 2px", width: "24px", textAlign: "center" }}>Mobil</th>
                <th scope="col" style={{ padding: "6px 3px", width: "105px" }}>İletişim</th>
                <th scope="col" style={{ padding: "6px 3px", width: "115px" }}>Veli</th>
                <th scope="col" style={{ padding: "6px 2px", width: "66px" }}>Kuruma Kayıt ⇅</th>
                <th scope="col" style={{ padding: "6px 2px", width: "66px" }}>Dönem Kaydı ⇅</th>
                <th scope="col" style={{ padding: "6px 2px", width: "64px", textAlign: "center" }}>Durum ⇅</th>
                <th scope="col" style={{ padding: "6px 2px", width: "52px", textAlign: "center" }}>Sözleşme</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Kayıt bulunamadı. Filtrelerinizi değiştiriniz.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const isMenuOpen = openDropdownId === s.id;
                  const openUpwards = (idx >= paginatedStudents.length - 2 && paginatedStudents.length > 3);
                  const isChecked = selectedIds.has(s.id);
                  const initials = (s.student_name || "Ö")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isChecked ? "#f0fdf4" : isMenuOpen ? "#f8fafc" : "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked && !isMenuOpen) e.currentTarget.style.backgroundColor = "#fafafa";
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked && !isMenuOpen) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* 1. Checkbox */}
                      <td style={{ padding: "5px 2px", textAlign: "center", width: "26px" }}>
                        <input
                          type="checkbox"
                          aria-label={`${s.student_name} öğrencisini seç`}
                          checked={isChecked}
                          onChange={() => handleToggleSelect(s.id)}
                        />
                      </td>

                      {/* 2. İşlemler Dropdown Button */}
                      <td style={{ padding: "5px 2px", textAlign: "center", position: "relative", width: "70px" }}>
                        <div data-edesis-dropdown={s.id} style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            aria-label={`${s.student_name} için işlemler menüsünü aç`}
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(isMenuOpen ? null : s.id);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "2px 6px",
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "10.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap"
                            }}
                          >
                            <Settings size={10} aria-hidden="true" />
                            <span>İşlemler</span>
                            <ChevronDown size={10} aria-hidden="true" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              role="menu"
                              aria-label={`${s.student_name} işlem seçenekleri`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                left: "0",
                                ...(openUpwards ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: openUpwards ? "0 -8px 25px rgba(0,0,0,0.12)" : "0 10px 25px rgba(0,0,0,0.12)",
                                zIndex: 1050,
                                minWidth: "160px",
                                padding: "6px 0",
                                textAlign: "left"
                              }}
                            >
                              <div
                                onClick={() => handleOpenEdit(s)}
                                style={{ padding: "7px 12px", fontSize: "12px", fontWeight: 500, color: "#1e293b", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Edit2 size={13} color="#2563eb" />
                                Düzenle
                              </div>

                              <div
                                onClick={() => {
                                  if (onOpenKarne) onOpenKarne(s);
                                  setOpenDropdownId(null);
                                }}
                                style={{ padding: "7px 12px", fontSize: "12px", fontWeight: 500, color: "#1e293b", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Award size={13} color="#7c3aed" />
                                Öğrenci Karnesi
                              </div>

                               <div
                                onClick={() => {
                                  const sContracts = getStudentContracts(s);
                                  const targetContract = sContracts[0] || (s.sozlesme_no ? { sozlesmeNo: s.sozlesme_no } : null);
                                  const targetNo = targetContract?.sozlesmeNo || s.sozlesme_no || s.student_name;
                                  if (targetNo) {
                                    try {
                                      sessionStorage.setItem("cozum_open_contract_no", targetNo);
                                    } catch {}
                                  }
                                  if (onOpenContract) {
                                    onOpenContract(targetContract, s);
                                  } else if (onOpenGelir) {
                                    onOpenGelir(s);
                                  } else if (onNavigate) {
                                    onNavigate("documents");
                                  } else {
                                    setContractsModalStudent(s);
                                  }
                                  setOpenDropdownId(null);
                                }}
                                style={{ padding: "7px 12px", fontSize: "12px", fontWeight: 500, color: "#1e293b", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <FileText size={13} color="#2563eb" />
                                Sözleşme & Muhasebe Detayı
                              </div>

                              <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />

                              <div
                                onClick={async () => {
                                  if (window.confirm(`${s.student_name} kaydını kalıcı olarak silmek istediğinize emin misiniz?`)) {
                                    try {
                                      await StudentService.deleteStudent(s, API);
                                      setStudents((prev) => prev.filter((it) => it.id !== s.id && trNorm(it.student_name) !== trNorm(s.student_name)));
                                      showToast(`🗑️ ${s.student_name} başarıyla silindi.`);
                                    } catch (err) {
                                      showToast(`❌ Silinemedi: ${err.message}`);
                                    }
                                  }
                                  setOpenDropdownId(null);
                                }}
                                style={{ padding: "7px 12px", fontSize: "12px", fontWeight: 500, color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Trash2 size={13} color="#ef4444" />
                                Sil
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Öğrenci (Avatar + Name + TC + No) - Kart tıklanabilir */}
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStudent) onSelectStudent(s);
                        }}
                        style={{ padding: "5px 3px", width: "135px", whiteSpace: "nowrap", cursor: "pointer" }}
                        title="Öğrenci Bilgilerini İncele"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: "#eff6ff",
                              color: "#2563eb",
                              fontWeight: 700,
                              fontSize: "9.5px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div
                              style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "115px" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
                              title={s.student_name}
                            >
                              {s.student_name}
                            </div>
                            <div style={{ fontSize: "9px", color: "#64748b", display: "flex", gap: "4px", whiteSpace: "nowrap" }}>
                              {s.student_tc && <span>TC: {s.student_tc}</span>}
                              {s.student_no && <span>No: {s.student_no}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Şube */}
                      <td style={{ padding: "5px 3px", width: "72px", fontWeight: 600, color: "#334155", fontSize: "10.5px", whiteSpace: "nowrap" }}>
                        {s.student_class || "—"}
                      </td>

                      {/* 5. Bölüm */}
                      <td style={{ padding: "5px 3px", width: "62px", color: "#64748b", fontSize: "10px", whiteSpace: "nowrap" }}>
                        {s.department || "ARA SINIF"}
                      </td>

                      {/* 6. Öğretmen */}
                      <td style={{ padding: "5px 2px", width: "28px", color: "#94a3b8", textAlign: "center", fontSize: "10px" }}>—</td>

                      {/* 7. Mobil (Icon) */}
                      <td style={{ padding: "5px 2px", width: "24px", textAlign: "center" }}>
                        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#fef08a", color: "#854d0e", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>
                          !
                        </div>
                      </td>

                      {/* 8. İletişim */}
                      <td style={{ padding: "5px 3px", width: "105px", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "10px", color: "#334155" }}>{s.student_phone || "—"}</div>
                        <div style={{ fontSize: "9px", color: "#94a3b8" }}>{s.student_email || `${s.student_no}@edesis.com`}</div>
                      </td>

                      {/* 9. Veli */}
                      <td style={{ padding: "5px 3px", width: "125px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, fontSize: "10.5px", color: "#0f172a", display: "flex", alignItems: "center", gap: "3px" }}>
                          {s.parent_relation === "Baba" ? (
                            <span style={{ color: "#2563eb", fontWeight: 700 }} title="Baba">♂</span>
                          ) : s.parent_relation === "Anne" ? (
                            <span style={{ color: "#e11d48", fontWeight: 700 }} title="Anne">♀</span>
                          ) : (
                            <span style={{ color: "#64748b", fontWeight: 700 }} title={s.parent_relation || "Veli"}>👤</span>
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85px" }} title={s.parent_name}>{s.parent_name || "—"}</span>
                          {s.extra_parent_count > 0 && (
                            <span
                              style={{
                                marginLeft: "2px",
                                padding: "0 4px",
                                fontSize: "8.5px",
                                fontWeight: 700,
                                borderRadius: "8px",
                                background: "#dbeafe",
                                color: "#1d4ed8"
                              }}
                              title={`Diğer Veli: ${s.secondary_parent_name} (${s.secondary_parent_relation}) ${s.secondary_parent_phone}`}
                            >
                              +{s.extra_parent_count}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "9px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>{s.parent_phone || "—"}</span>
                          {s.parent_phone && (
                            <a
                              href={`https://wa.me/90${s.parent_phone.replace(/\D/g, "").replace(/^0/, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp"
                              style={{ color: "#16a34a", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                            >
                              <MessageCircle size={10} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 10. Kuruma Kayıt */}
                      <td style={{ padding: "5px 2px", width: "66px", color: "#64748b", fontSize: "10px", whiteSpace: "nowrap" }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString("tr-TR") : "27.09.2026"}
                      </td>

                      {/* 11. Dönem Kaydı */}
                      <td style={{ padding: "5px 2px", width: "66px", color: "#64748b", fontSize: "10px", whiteSpace: "nowrap" }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString("tr-TR") : "27.09.2026"}
                      </td>

                      {/* 12. Durum */}
                      <td style={{ padding: "5px 2px", width: "64px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {(() => {
                          const sContracts = getStudentContracts(s);
                          const isDel = Boolean(s.contract_deleted || AccountingService.isContractDeleted(s));
                          const hasContract = !isDel && (sContracts.length > 0 || Boolean(s.sozlesme_no) || Boolean(s.has_contract));
                          return (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!hasContract) return;
                                const targetContract = sContracts[0] || (s.sozlesme_no ? { sozlesmeNo: s.sozlesme_no } : null);
                                if (onOpenContract) {
                                  onOpenContract(targetContract, s);
                                } else if (onSelectStudent) {
                                  onSelectStudent(s);
                                } else if (onNavigate) {
                                  onNavigate("documents");
                                } else {
                                  setContractsModalStudent(s);
                                }
                              }}
                              style={{
                                padding: "2px 5px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: 600,
                                background: hasContract ? "#dcfce7" : "#f1f5f9",
                                color: hasContract ? "#15803d" : "#64748b",
                                cursor: hasContract ? "pointer" : "default"
                              }}
                              title={hasContract ? "Sözleşmeyi Aç / Görüntüle" : (s.status || "Aktif")}
                            >
                              {s.status || "Aktif"}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 13. Sözleşme */}
                      <td style={{ padding: "5px 2px", width: "52px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {(() => {
                          const sContracts = getStudentContracts(s);
                          const isDel = Boolean(s.contract_deleted || AccountingService.isContractDeleted(s));
                          const hasContract = !isDel && (sContracts.length > 0 || Boolean(s.sozlesme_no) || Boolean(s.has_contract));
                          if (hasContract) {
                            return (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetContract = sContracts[0] || (s.sozlesme_no ? { sozlesmeNo: s.sozlesme_no } : null);
                                  if (onOpenContract) {
                                    onOpenContract(targetContract, s);
                                  } else if (onSelectStudent) {
                                    onSelectStudent(s);
                                  } else if (onNavigate) {
                                    onNavigate("documents");
                                  } else {
                                    setContractsModalStudent(s);
                                  }
                                }}
                                style={{
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  fontSize: "9px",
                                  fontWeight: 600,
                                  background: "#dcfce7",
                                  color: "#15803d",
                                  cursor: "pointer",
                                  display: "inline-block",
                                  transition: "transform 0.1s ease, filter 0.1s ease"
                                }}
                                title="Sözleşmeyi Aç / Görüntüle"
                                onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.93)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
                              >
                                Aktif
                              </span>
                            );
                          }
                          return <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500 }}>—</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PAGINATION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#64748b" }}>
          <div>
            Toplam <b>{totalCount}</b> kayıttan <b>{(currentPage - 1) * Number(pageSize) + 1}</b> - <b>{Math.min(currentPage * Number(pageSize), totalCount)}</b> arası gösteriliyor
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              aria-label="Önceki sayfaya git"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: "4px 8px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "4px", cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
            >
              Önceki
            </button>
            <span style={{ padding: "4px 8px", fontWeight: 700, color: "#2563eb" }} aria-current="page">{currentPage}</span>
            <button
              type="button"
              aria-label="Sonraki sayfaya git"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "4px 8px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "4px", cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* EDESIS 5-TAB DÜZENLE MODALI (Matches media_1791229810136.png 100%) */}
      {editingStudent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100050,
            padding: "16px"
          }}
          onClick={() => setEditingStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>DÜZENLE</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "none", background: "none", fontSize: "12px", color: "#64748b", cursor: "pointer" }}
                >
                  <Camera size={14} /> Resim Yükle
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 5 Edesis Tabs */}
            <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid #e2e8f0", padding: "0 20px" }}>
              {[
                { id: "ogrenci", label: "ÖĞRENCİ BİLGİLERİ" },
                { id: "kullanici", label: "KULLANICI BİLGİLERİ" },
                { id: "adres", label: "ADRES" },
                { id: "ogretmen", label: "ÖĞRETMEN" },
                { id: "tarihce", label: "DÖNEM TARİHÇESİ" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditActiveTab(tab.id)}
                  style={{
                    padding: "12px 4px",
                    border: "none",
                    background: "none",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: editActiveTab === tab.id ? "#2563eb" : "#64748b",
                    borderBottom: editActiveTab === tab.id ? "3px solid #2563eb" : "3px solid transparent",
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveEdit} style={{ padding: "20px" }}>
              {editActiveTab === "ogrenci" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Ad Soyad */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>AD SOYAD*</label>
                    <input
                      required
                      value={editFormData.studentName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, studentName: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Dönem */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>DÖNEM*</label>
                    <input
                      disabled
                      value={editFormData.donem || "2026-2027"}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#f8fafc" }}
                    />
                  </div>

                  {/* Şube */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>ŞUBE*</label>
                    <input
                      value={editFormData.sube || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, sube: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Bölüm */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>BÖLÜM*</label>
                    <input
                      value={editFormData.bolum || "ARA SINIF"}
                      onChange={(e) => setEditFormData({ ...editFormData, bolum: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Okul */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>OKUL</label>
                    <input
                      value={editFormData.okul || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, okul: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Numara */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>NUMARA</label>
                    <input
                      value={editFormData.numara || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, numara: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* TC Numarası */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>TC NUMARASI</label>
                    <input
                      value={editFormData.tc || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, tc: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Doğum Tarihi */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>DOGUM TARIHI</label>
                    <input
                      type="date"
                      value={editFormData.dogumTarihi || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, dogumTarihi: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Diploma Notu */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>DİPLOMA NOTU</label>
                    <input
                      value={editFormData.diplomaNotu || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, diplomaNotu: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Cinsiyet */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>CİNSİYET</label>
                    <select
                      value={editFormData.cinsiyet || "Erkek"}
                      onChange={(e) => setEditFormData({ ...editFormData, cinsiyet: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    >
                      <option value="Erkek">Erkek</option>
                      <option value="Kız">Kız</option>
                    </select>
                  </div>

                  {/* Kayıt Durumu */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>KAYIT DURUMU*</label>
                    <select
                      value={editFormData.kayitDurumu || "Kesin Kayıt"}
                      onChange={(e) => setEditFormData({ ...editFormData, kayitDurumu: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    >
                      <option value="Kesin Kayıt">Kesin Kayıt</option>
                      <option value="Aday Kayıt">Aday Kayıt</option>
                      <option value="Yaz Kursu">Yaz Kursu</option>
                      <option value="Mezun / Geçmiş">Mezun / Geçmiş</option>
                      <option value="İptal">İptal</option>
                    </select>
                  </div>

                  {/* Muafiyetler */}
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                      <input
                        type="checkbox"
                        checked={editFormData.dinMuaf}
                        onChange={(e) => setEditFormData({ ...editFormData, dinMuaf: e.target.checked })}
                      />
                      Din Kültürü ve Ahlak Bilgisi dersinden muaf
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                      <input
                        type="checkbox"
                        checked={editFormData.ingMuaf}
                        onChange={(e) => setEditFormData({ ...editFormData, ingMuaf: e.target.checked })}
                      />
                      İngilizce dersinden muaf
                    </label>
                  </div>
                </div>
              )}

              {editActiveTab === "kullanici" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>ÖĞRENCİ TELEFON</label>
                    <input
                      value={editFormData.studentPhone || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, studentPhone: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>E-POSTA</label>
                    <input
                      value={editFormData.studentEmail || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, studentEmail: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>VELİ ADI</label>
                    <input
                      value={editFormData.parentName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, parentName: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>VELİ YAKINLIK</label>
                    <select
                      value={editFormData.parentRelation || "Anne"}
                      onChange={(e) => setEditFormData({ ...editFormData, parentRelation: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    >
                      <option value="Anne">Anne (♀)</option>
                      <option value="Baba">Baba (♂)</option>
                      <option value="Veli">Veli (👤)</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>VELİ TELEFON</label>
                    <input
                      value={editFormData.parentPhone || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>2. VELİ ADI</label>
                    <input
                      value={editFormData.secondaryParentName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, secondaryParentName: e.target.value })}
                      placeholder="Varsa 2. veli adı"
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>2. VELİ YAKINLIK</label>
                    <select
                      value={editFormData.secondaryParentRelation || "Baba"}
                      onChange={(e) => setEditFormData({ ...editFormData, secondaryParentRelation: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    >
                      <option value="Baba">Baba (♂)</option>
                      <option value="Anne">Anne (♀)</option>
                      <option value="Veli">Veli (👤)</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>2. VELİ TELEFON</label>
                    <input
                      value={editFormData.secondaryParentPhone || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, secondaryParentPhone: e.target.value })}
                      placeholder="Varsa 2. veli telefonu"
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </div>
                </div>
              )}

              {editActiveTab === "adres" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>İKAMETGÂH ADRESİ</label>
                  <textarea
                    rows={4}
                    value={editFormData.address || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
              )}

              {editActiveTab === "ogretmen" && (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  Danışman öğretmen ve rehberlik ataması bu sekmeden yönetilir.
                </div>
              )}

              {editActiveTab === "tarihce" && (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  Öğrencinin geçmiş dönem kayıt ve devam bilgileri.
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  <Lock size={13} /> Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SÖZLEŞMELER POPUP (1:1 with Edesis) */}
      {contractsModalStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "16px"
          }}
          onClick={() => setContractsModalStudent(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "700px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.08)",
              border: "1px solid #e2e8f0",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid #f1f5f9"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "4px",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3b82f6"
                  }}
                >
                  <FileText size={15} />
                </div>
                <div style={{ fontSize: "14px" }}>
                  <span style={{ fontWeight: 700, color: "#1e293b" }}>Sözleşmeler</span>
                  <span style={{ color: "#94a3b8", margin: "0 6px" }}>—</span>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{contractsModalStudent.student_name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContractsModalStudent(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  borderRadius: "4px"
                }}
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Table Body */}
            <div style={{ padding: "16px 20px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed #cbd5e1" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>SÖZLEŞME NO</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>DÖNEM</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>TARİH</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>DURUM</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>TUTAR</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getStudentContracts(contractsModalStudent).map((c, idx) => {
                      const dateStr = c.sozlesmeTarihi ? new Date(c.sozlesmeTarihi).toLocaleDateString("tr-TR") : "06.10.2026";
                      const amountStr = "₺" + Math.round(Number(c.brutTutar || 0)).toLocaleString("tr-TR");
                      return (
                        <tr key={c.sozlesmeNo || idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "14px 10px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                            {c.sozlesmeNo}
                          </td>
                          <td style={{ padding: "14px 10px", fontSize: "13px", color: "#334155" }}>
                            <span>{c.donemAdi || "2026-2027"}</span>
                            <span
                              style={{
                                marginLeft: "8px",
                                padding: "2px 7px",
                                backgroundColor: "#e0f2fe",
                                color: "#0284c7",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: 600
                              }}
                            >
                              Seçili Dönem
                            </span>
                          </td>
                          <td style={{ padding: "14px 10px", fontSize: "13px", color: "#334155" }}>
                            {dateStr}
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "center" }}>
                            <span
                              onClick={() => {
                                const targetNo = c.sozlesmeNo;
                                setContractsModalStudent(null);
                                if (targetNo) {
                                  try {
                                    sessionStorage.setItem("cozum_open_contract_no", targetNo);
                                  } catch {}
                                }
                                if (onOpenContract) {
                                  onOpenContract(c);
                                } else if (onNavigate) {
                                  onNavigate("documents");
                                }
                              }}
                              style={{
                                padding: "3px 8px",
                                backgroundColor: "#dcfce7",
                                color: "#16a34a",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                              title="Sözleşmeyi Aç"
                            >
                              Aktif
                            </span>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                            {amountStr}
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const targetNo = c.sozlesmeNo;
                                setContractsModalStudent(null);
                                if (targetNo) {
                                  try {
                                    sessionStorage.setItem("cozum_open_contract_no", targetNo);
                                  } catch {}
                                }
                                if (onOpenContract) {
                                  onOpenContract(c);
                                } else if (onNavigate) {
                                  onNavigate("documents");
                                }
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "4px 10px",
                                backgroundColor: "#f0f9ff",
                                color: "#0284c7",
                                border: "1px solid #bae6fd",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              Detay <ExternalLink size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "14px 20px",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #f1f5f9"
              }}
            >
              <button
                type="button"
                onClick={() => setContractsModalStudent(null)}
                style={{
                  padding: "7px 16px",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetStudent = contractsModalStudent;
                  setContractsModalStudent(null);
                  if (targetStudent?.id) {
                    try {
                      sessionStorage.setItem("cozum_new_contract_student_id", String(targetStudent.id));
                    } catch {}
                  }
                  if (onOpenContract) {
                    onOpenContract(null, targetStudent);
                  } else if (onNavigate) {
                    onNavigate("documents");
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 16px",
                  backgroundColor: "#22c55e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <Plus size={15} /> Yeni Sözleşme (Seçili Dönem)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
