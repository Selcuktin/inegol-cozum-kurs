import React, { useState, useMemo } from "react";
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
  Settings
} from "lucide-react";
import initialStudentsData from "../data/edesisStudentsData.json";

export default function EdesisOgrenciListesi({
  onSelectStudent,
  onOpenGelir,
  onOpenContract,
  onOpenKarne,
  onNavigate
}) {
  const [students, setStudents] = useState(initialStudentsData);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("Kesin Kayıt"); // default 1:1 with Edesis
  const [periodFilter, setPeriodFilter] = useState("113"); // 113: 2026-2027
  const [classFilter, setClassFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editActiveTab, setEditActiveTab] = useState("ogrenci"); // 'ogrenci' | 'kullanici' | 'adres' | 'ogretmen' | 'tarihce'
  const [editFormData, setEditFormData] = useState({});

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
      if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }
      // Class filter
      if (classFilter !== "all" && s.student_class !== classFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (s.student_name || "").toLowerCase();
        const tc = (s.student_tc || "").toLowerCase();
        const no = (s.student_no || "").toLowerCase();
        const phone = (s.student_phone || "").toLowerCase();
        const parent = (s.parent_name || "").toLowerCase();
        const cls = (s.student_class || "").toLowerCase();
        if (!name.includes(q) && !tc.includes(q) && !no.includes(q) && !phone.includes(q) && !parent.includes(q) && !cls.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [students, periodFilter, statusFilter, classFilter, searchQuery]);

  // Counts for pills
  const kesinCount = useMemo(() => {
    return students.filter((s) => s.status === "Kesin Kayıt" && (periodFilter === "all" || String(s.donem_id) === String(periodFilter))).length;
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

  // Save Edit Form
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            student_class: editFormData.sube,
            department: editFormData.bolum,
            school: editFormData.okul,
            student_no: editFormData.numara,
            student_tc: editFormData.tc,
            birth_date: editFormData.dogumTarihi,
            gender: editFormData.cinsiyet,
            status: editFormData.kayitDurumu,
            din_muaf: editFormData.dinMuaf ? 1 : 0,
            ing_muaf: editFormData.ingMuaf ? 1 : 0,
            student_phone: editFormData.studentPhone,
            student_email: editFormData.studentEmail,
            parent_name: editFormData.parentName,
            parent_relation: editFormData.parentRelation,
            parent_phone: editFormData.parentPhone,
            parent_tc: editFormData.parentTc,
            secondary_parent_name: editFormData.secondaryParentName,
            secondary_parent_relation: editFormData.secondaryParentRelation,
            secondary_parent_phone: editFormData.secondaryParentPhone,
            address: editFormData.address
          };
        }
        return s;
      })
    );

    showToast(`✅ ${editingStudent.student_name} bilgileri güncellendi.`);
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
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px" }} />
              <input
                type="text"
                placeholder="Öğrenci adı, TC, no, veli..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
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
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "2px solid #f1f5f9", color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                <th style={{ padding: "6px 2px", width: "26px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedStudents.length}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th style={{ padding: "6px 2px", width: "70px", textAlign: "center" }}>İşlemler</th>
                <th style={{ padding: "6px 3px", width: "135px" }}>Öğrenci ⇅</th>
                <th style={{ padding: "6px 3px", width: "72px" }}>Şube ⇅</th>
                <th style={{ padding: "6px 3px", width: "62px" }}>Bölüm ⇅</th>
                <th style={{ padding: "6px 2px", width: "28px", textAlign: "center" }}>Öğrt.</th>
                <th style={{ padding: "6px 2px", width: "24px", textAlign: "center" }}>Mobil</th>
                <th style={{ padding: "6px 3px", width: "105px" }}>İletişim</th>
                <th style={{ padding: "6px 3px", width: "115px" }}>Veli</th>
                <th style={{ padding: "6px 2px", width: "66px" }}>Kuruma Kayıt ⇅</th>
                <th style={{ padding: "6px 2px", width: "66px" }}>Dönem Kaydı ⇅</th>
                <th style={{ padding: "6px 2px", width: "64px", textAlign: "center" }}>Durum ⇅</th>
                <th style={{ padding: "6px 2px", width: "52px", textAlign: "center" }}>Sözleşme</th>
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
                          checked={isChecked}
                          onChange={() => handleToggleSelect(s.id)}
                        />
                      </td>

                      {/* 2. İşlemler Dropdown Button */}
                      <td style={{ padding: "5px 2px", textAlign: "center", position: "relative", width: "70px" }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
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
                            <Settings size={10} />
                            <span>İşlemler</span>
                            <ChevronDown size={10} />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
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
                                  if (onOpenGelir) onOpenGelir(s);
                                  setOpenDropdownId(null);
                                }}
                                style={{ padding: "7px 12px", fontSize: "12px", fontWeight: 500, color: "#1e293b", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <FileText size={13} color="#16a34a" />
                                Gelir Detayı (GLR)
                              </div>

                              <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />

                              <div
                                onClick={() => {
                                  if (window.confirm(`${s.student_name} kaydını silmek istediğinize emin misiniz?`)) {
                                    setStudents((prev) => prev.filter((it) => it.id !== s.id));
                                    showToast(`🗑️ ${s.student_name} silindi.`);
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
                        onClick={() => {
                          if (onSelectStudent) onSelectStudent(s);
                          handleOpenEdit(s);
                        }}
                        style={{ padding: "5px 3px", width: "135px", whiteSpace: "nowrap", cursor: "pointer" }}
                        title="Öğrenci Bilgilerini Düzenle / İncele"
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
                      <td style={{ padding: "5px 3px", width: "115px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, fontSize: "10.5px", color: "#0f172a", display: "flex", alignItems: "center", gap: "3px" }}>
                          {s.parent_relation === "Baba" ? (
                            <span style={{ color: "#2563eb", fontWeight: 700 }} title="Baba">♂</span>
                          ) : s.parent_relation === "Anne" ? (
                            <span style={{ color: "#e11d48", fontWeight: 700 }} title="Anne">♀</span>
                          ) : (
                            <span style={{ color: "#64748b", fontWeight: 700 }} title={s.parent_relation || "Veli"}>👤</span>
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "95px" }} title={s.parent_name}>{s.parent_name || "—"}</span>
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
                        <span
                          style={{
                            padding: "2px 5px",
                            borderRadius: "4px",
                            fontSize: "9px",
                            fontWeight: 600,
                            background: "#dcfce7",
                            color: "#15803d"
                          }}
                        >
                          {s.status || "Kesin Kayıt"}
                        </span>
                      </td>

                      {/* 13. Sözleşme */}
                      <td style={{ padding: "5px 2px", width: "52px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {s.has_contract ? (
                          <span
                            style={{
                              padding: "2px 5px",
                              borderRadius: "4px",
                              fontSize: "9px",
                              fontWeight: 600,
                              background: "#dcfce7",
                              color: "#15803d"
                            }}
                          >
                            Aktif
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500 }}>—</span>
                        )}
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
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: "4px 8px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "4px", cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
            >
              Önceki
            </button>
            <span style={{ padding: "4px 8px", fontWeight: 700, color: "#2563eb" }}>{currentPage}</span>
            <button
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
    </div>
  );
}
