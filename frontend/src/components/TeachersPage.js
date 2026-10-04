import React, { useState, useMemo } from "react";
import axios from "axios";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Award,
  Layers,
  CheckCircle2,
  MessageCircle,
  X,
  UserCheck
} from "lucide-react";
import { openWhatsApp } from "../EdesisModules";

const BRANCH_COLORS = {
  "Rehberlik & Yöneticilik": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  Eğitmen: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  İdare: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  Matematik: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Fizik: { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
  Geometri: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  Türkçe: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  Kimya: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  Biyoloji: { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  Tarih: { bg: "#fafaf9", text: "#44403c", border: "#e7e5e4" },
  İngilizce: { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
  Coğrafya: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  "Rehberlik & PDR": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "Sınıf Eğitmeni": { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
};

export function TeachersPage({ me, API, teachers = [], onReload, onNavigate, onOpenEtut }) {
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    branch: "Eğitmen",
    title: "",
    phone: "",
    email: "",
    classes: "",
    weekly_hours: 18,
    status: "Aktif",
    notes: "",
  });

  // Extract unique branches
  const branches = useMemo(() => {
    const set = new Set();
    teachers.forEach((t) => {
      if (t.branch) set.add(t.branch.trim());
    });
    return Array.from(set).sort();
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (selectedBranch !== "all" && t.branch !== selectedBranch) {
        return false;
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const haystack = `${t.name} ${t.branch} ${t.title} ${t.phone} ${t.email} ${t.classes}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [teachers, selectedBranch, search]);

  // Stats
  const stats = useMemo(() => {
    const total = teachers.length;
    const branchCount = branches.length;
    const totalHours = teachers.reduce((acc, t) => acc + (Number(t.weekly_hours) || 0), 0);
    const activeCount = teachers.filter((t) => t.status === "Aktif").length;
    return { total, branchCount, totalHours, activeCount };
  }, [teachers, branches]);

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      name: "",
      branch: "Matematik",
      title: "Branş Öğretmeni",
      phone: "0532 ",
      email: "",
      classes: "",
      weekly_hours: 18,
      status: "Aktif",
      notes: "",
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTeacher(t);
    setFormData({
      name: t.name || "",
      branch: t.branch || "Matematik",
      title: t.title || "",
      phone: t.phone || "",
      email: t.email || "",
      classes: t.classes || "",
      weekly_hours: t.weekly_hours || 18,
      status: t.status || "Aktif",
      notes: t.notes || "",
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Lütfen eğitmen adı soyadını giriniz.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      if (editingTeacher) {
        await axios.put(`${API}/teachers/${editingTeacher.id}`, formData);
      } else {
        await axios.post(`${API}/teachers`, formData);
      }
      setIsModalOpen(false);
      if (onReload) onReload();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Kayıt kaydedilirken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} isimli eğitmeni kadrodan silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await axios.delete(`${API}/teachers/${id}`);
      if (onReload) onReload();
    } catch (err) {
      alert(err.response?.data?.detail || "Silme işlemi başarısız.");
    }
  };

  return (
    <div className="teachers-page-container" style={{ padding: "8px 0" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#6366f1", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            EĞİTİM & AKADEMİK KADRO
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
            Öğretmenler & Kadro Yönetimi
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            Özel İnegöl Çözüm Kurs Merkezi branş eğitmenleri, haftalık ders yükü ve görev dağılımı
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "13px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            <span>Yeni Öğretmen Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ background: "#fff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Toplam Eğitmen</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{stats.total} Öğretmen</div>
            <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>{stats.activeCount} Aktif Görevde</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#fdf4ff", color: "#a21caf", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Branş Sayısı</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{stats.branchCount} Branş</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>YKS, LGS ve İlkokul</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Haftalık Ders Yükü</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{stats.totalHours} Saat</div>
            <div style={{ fontSize: "11px", color: "#059669" }}>Kurum Geneli Toplam</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Aktif Şubeler & Sınıflar</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>18 Şube</div>
            <div style={{ fontSize: "11px", color: "#16a34a" }}>2026-2027 Eğitim Dönemi</div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 260px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Öğretmen adı, branş, unvan veya telefon ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "13px" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                <X size={14} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                border: "none",
                background: viewMode === "grid" ? "#fff" : "transparent",
                color: viewMode === "grid" ? "#0f172a" : "#64748b",
                fontWeight: viewMode === "grid" ? "700" : "500",
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Kart Görünümü
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                border: "none",
                background: viewMode === "table" ? "#fff" : "transparent",
                color: viewMode === "table" ? "#0f172a" : "#64748b",
                fontWeight: viewMode === "table" ? "700" : "500",
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Liste Görünümü
            </button>
          </div>
        </div>

        {/* Branch Filter Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
          <button
            type="button"
            onClick={() => setSelectedBranch("all")}
            style={{
              padding: "4px 10px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: "600",
              border: selectedBranch === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedBranch === "all" ? "#eff6ff" : "#fff",
              color: selectedBranch === "all" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            Tümü ({teachers.length})
          </button>
          {branches.map((b) => {
            const count = teachers.filter((t) => t.branch === b).length;
            const isSelected = selectedBranch === b;
            const theme = BRANCH_COLORS[b] || { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" };
            return (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBranch(b)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: isSelected ? `1px solid ${theme.text}` : `1px solid ${theme.border}`,
                  background: isSelected ? theme.bg : "#fff",
                  color: isSelected ? theme.text : "#475569",
                  cursor: "pointer",
                }}
              >
                {b} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {filteredTeachers.map((t) => {
            const theme = BRANCH_COLORS[t.branch] || { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" };
            const initials = t.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0].toUpperCase())
              .join("");

            return (
              <div
                key={t.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  {/* Card Top */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: theme.bg,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "800",
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>{t.name}</span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: theme.bg,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                          }}
                        >
                          {t.branch}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{t.title || "Branş Eğitmeni"}</div>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        title="Düzenle"
                        style={{ border: "none", background: "#f8fafc", padding: "6px", borderRadius: "6px", color: "#64748b", cursor: "pointer" }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        title="Sil"
                        style={{ border: "none", background: "#f8fafc", padding: "6px", borderRadius: "6px", color: "#ef4444", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Badges / Metrics */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "#475569", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px" }}>
                      <Clock size={12} color="#64748b" />
                      <span>{t.weekly_hours || 0} Saat/Hafta</span>
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "#16a34a", background: "#f0fdf4", padding: "4px 8px", borderRadius: "6px" }}>
                      <CheckCircle2 size={12} color="#16a34a" />
                      <span>{t.status || "Aktif"}</span>
                    </div>
                  </div>

                  {/* Responsible Classes */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Sorumlu Sınıflar</div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {(t.classes || "Kurum Geneli")
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .map((c, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "#334155",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {c}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ fontSize: "12px", color: "#475569", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "14px" }}>
                    {t.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={12} color="#64748b" />
                        <span>{t.phone}</span>
                      </div>
                    )}
                    {t.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={12} color="#64748b" />
                        <span>{t.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "6px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                  {t.phone && (
                    <button
                      type="button"
                      onClick={() => openWhatsApp(t.phone, `Sayın ${t.name} Hocam, İnegöl Çözüm Kurs Merkezi yönetiminden bilgilendirmedir.`)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "#25D366",
                        color: "#fff",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate("schedules");
                    }}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <Calendar size={13} />
                    <span>Haftalık Ders Programı</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Öğretmen / Eğitmen</th>
                <th style={{ padding: "12px 16px" }}>Branş</th>
                <th style={{ padding: "12px 16px" }}>Haftalık Ders</th>
                <th style={{ padding: "12px 16px" }}>Sorumlu Sınıflar</th>
                <th style={{ padding: "12px 16px" }}>İletişim</th>
                <th style={{ padding: "12px 16px" }}>Durum</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((t) => {
                const theme = BRANCH_COLORS[t.branch] || { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" };
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{t.title || "Branş Eğitmeni"}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: theme.bg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {t.branch}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>{t.weekly_hours} Saat</td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>{t.classes || "Kurum Geneli"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{t.phone}</span>
                        {t.phone && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(t.phone, `Sayın ${t.name} Hocam...`)}
                            style={{ border: "none", background: "none", color: "#16a34a", cursor: "pointer", padding: 0 }}
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#16a34a", background: "#f0fdf4", padding: "2px 6px", borderRadius: "4px" }}>
                        {t.status || "Aktif"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          style={{ border: "1px solid #e2e8f0", background: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.name)}
                          style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <UserCheck size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                  {editingTeacher ? "Öğretmen Bilgilerini Düzenle" : "Yeni Öğretmen Ekle"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: "20px" }}>
              {errorMsg && (
                <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "12px", marginBottom: "14px" }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Adı Soyadı *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Ayşe Kaya"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Branş *</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box", background: "#fff" }}
                  >
                    <option value="Matematik">Matematik</option>
                    <option value="Fizik">Fizik</option>
                    <option value="Geometri">Geometri</option>
                    <option value="Türkçe">Türkçe / Edebiyat</option>
                    <option value="Kimya">Kimya</option>
                    <option value="Biyoloji">Biyoloji</option>
                    <option value="Tarih">Tarih</option>
                    <option value="Coğrafya">Coğrafya</option>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Rehberlik & PDR">Rehberlik & PDR</option>
                    <option value="Sınıf Eğitmeni">Sınıf Eğitmeni</option>
                    <option value="İdare">İdare</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Haftalık Ders Saati</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.weekly_hours}
                    onChange={(e) => setFormData({ ...formData, weekly_hours: parseInt(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Unvan / Görev</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Örn: Zümre Başkanı, LGS Uzmanı"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0532 123 45 67"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>E-posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ogretmen@inegolcozumkurs.com"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Sorumlu Olduğu Sınıflar</label>
                  <input
                    type="text"
                    value={formData.classes}
                    onChange={(e) => setFormData({ ...formData, classes: e.target.value })}
                    placeholder="Örn: 7-A, 8-A, TYT-AYT"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Özel Notlar</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Etüt saatleri veya ders notları..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontSize: "13px", cursor: "pointer" }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
                >
                  {saving ? "Kaydediliyor..." : editingTeacher ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
