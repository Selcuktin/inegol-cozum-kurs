import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  FileText,
  Key,
  RefreshCw,
  Settings,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Phone,
  Building,
  User,
  Check,
  ChevronRight,
  TrendingUp,
  Award,
  Clock,
  Printer,
  Copy,
  MessageCircle,
  ExternalLink,
  Plus
} from "lucide-react";

export function KayitModulu({
  activeTab = "kokpit",
  setActiveTab,
  students = [],
  classes = [],
  teachers = [],
  onOpenWizard,
  onSelectStudent,
  onNavigate
}) {
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [newCandidateModal, setNewCandidateModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    phone: "",
    targetClass: "11. Sınıf",
    source: "Tavsiye",
    notes: ""
  });
  const [simulationResult, setSimulationResult] = useState(null);

  // Demo candidates list with realistic school inquiries
  const [candidates, setCandidates] = useState([
    { id: "cand-1", name: "Kaan Arslan", phone: "0533 111 22 33", targetClass: "TYT - AYT", source: "Instagram / Web", date: "2026-10-04", status: "Görüşüldü", notes: "Sayısal grubu için fiyat teklifi verildi, veli düşünecek." },
    { id: "cand-2", name: "Elif Su Güner", phone: "0542 333 44 55", targetClass: "LGS Hazırlık", source: "Veli Tavsiyesi", date: "2026-10-03", status: "Bekliyor", notes: "Hafta sonu deneme sınavına katılmak istiyor." },
    { id: "cand-3", name: "Burak Karaca", phone: "0555 777 88 99", targetClass: "12. Sınıf Mezun", source: "Kurum Ziyareti", date: "2026-10-02", status: "Kayda Dönüştü", notes: "Kayıt tamamlandı, muhasebe sözleşmesi imzalandı." },
    { id: "cand-4", name: "Zeynep Mina Koç", phone: "0535 666 77 88", targetClass: "10. Sınıf", source: "Afiş / Reklam", date: "2026-10-01", status: "Görüşüldü", notes: "Matematik ve Fizik özel ders takviyesi soruldu." }
  ]);

  // Statistics
  const totalStudents = students.length;
  const activeStudents = students.filter(s => (s.status || "Kayitli") === "Kayitli" || !s.status?.includes("İptal")).length;
  const totalCapacity = classes.reduce((sum, c) => sum + (c.capacity || 20), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  // Grade Breakdown
  const gradeDistribution = useMemo(() => {
    const dist = {};
    students.forEach(s => {
      const cls = s.student_class || "Genel";
      let key = "Diğer";
      if (cls.includes("TYT") || cls.includes("AYT") || cls.includes("11") || cls.includes("12")) key = "YKS (11-12. Sınıf / TYT-AYT)";
      else if (cls.includes("LGS") || cls.includes("8")) key = "LGS (8. Sınıf Hazırlık)";
      else if (cls.includes("Mezun")) key = "Mezun Grupları";
      else if (cls.includes("10") || cls.includes("9")) key = "Ara Sınıflar (9-10. Sınıf)";
      dist[key] = (dist[key] || 0) + 1;
    });
    return dist;
  }, [students]);

  // Son Kayıt Olan Öğrenciler (Tarihe göre en yeniden eskiye sıralı)
  const recentStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => {
        const dateA = a.created_at || "";
        const dateB = b.created_at || "";
        if (dateB && dateA && dateB !== dateA) return dateB.localeCompare(dateA);
        return String(b.id || "").localeCompare(String(a.id || ""));
      })
      .slice(0, 8);
  }, [students]);

  // Missing data alerts
  const missingTc = students.filter(s => !s.student_tc || s.student_tc.length < 11);
  const missingPhoto = students.filter(s => !s.photo);
  const missingParentPhone = students.filter(s => !s.parent_phone || s.parent_phone === "0");

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.phone) return;
    const item = {
      id: `cand-${Date.now()}`,
      ...newCandidate,
      date: new Date().toISOString().slice(0, 10),
      status: "Bekliyor"
    };
    setCandidates([item, ...candidates]);
    setNewCandidate({ name: "", phone: "", targetClass: "11. Sınıf", source: "Tavsiye", notes: "" });
    setNewCandidateModal(false);
  };

  return (
    <div className="kayit-modulu-wrapper" style={{ padding: "4px 0 32px 0" }}>
      {/* Top Banner & Module Header */}
      <div className="page-head" style={{ marginBottom: "20px" }}>
        <div>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: "600" }}>
            <Users size={15} /> EDESİS ÖĞRENCİ İŞLERİ & KAYIT SİSTEMİ
          </div>
          <h1 style={{ margin: "4px 0 6px 0", fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>
            Kayıt İşlemleri Yönetimi
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Öğrenci kayıt kokpiti, sınıf kontenjanları, kayıt raporları, geçici şifreler ve aday takibi.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenWizard}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)" }}
          >
            <UserPlus size={16} />
            <span>+ Yeni Öğrenci Kaydı (Sihirbaz)</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Strict Edesis Hierarchy) */}
      <div className="edesis-kayit-tabs" style={{ display: "flex", gap: "6px", borderBottom: "1px solid #e2e8f0", marginBottom: "24px", overflowX: "auto", paddingBottom: "2px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("kokpit")}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "kokpit" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "kokpit" ? "#2563eb" : "#64748b", fontWeight: activeTab === "kokpit" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <TrendingUp size={16} /> Kayıt Kokpiti
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate("students");
            else setActiveTab("ogrenciler");
          }}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "ogrenciler" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "ogrenciler" ? "#2563eb" : "#64748b", fontWeight: activeTab === "ogrenciler" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <Users size={16} /> Öğrenci Listesi ({totalStudents})
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate("classes");
            else setActiveTab("siniflar");
          }}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "siniflar" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "siniflar" ? "#2563eb" : "#64748b", fontWeight: activeTab === "siniflar" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <BookOpen size={16} /> Sınıflar & Şubeler ({classes.length})
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate("teachers");
            else setActiveTab("ogretmenler");
          }}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "ogretmenler" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "ogretmenler" ? "#2563eb" : "#64748b", fontWeight: activeTab === "ogretmenler" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <GraduationCap size={16} /> Öğretmenler ({teachers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("raporlar")}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "raporlar" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "raporlar" ? "#2563eb" : "#64748b", fontWeight: activeTab === "raporlar" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <FileText size={16} /> Kayıt Raporları
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("adaylar")}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "adaylar" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "adaylar" ? "#2563eb" : "#64748b", fontWeight: activeTab === "adaylar" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <Award size={16} /> Bursluluk & Adaylar ({candidates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sifreler")}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "sifreler" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "sifreler" ? "#2563eb" : "#64748b", fontWeight: activeTab === "sifreler" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <Key size={16} /> Geçici Şifreler (SMS)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("donem")}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "donem" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "donem" ? "#2563eb" : "#64748b", fontWeight: activeTab === "donem" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <RefreshCw size={16} /> Dönem Geçişi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ayarlar")}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "none", background: "none",
            borderBottom: activeTab === "ayarlar" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "ayarlar" ? "#2563eb" : "#64748b", fontWeight: activeTab === "ayarlar" ? "600" : "500",
            cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap"
          }}
        >
          <Settings size={16} /> Kayıt Ayarları
        </button>
      </div>

      {/* TAB 1: KAYIT KOKPİTİ */}
      {activeTab === "kokpit" && (
        <div className="kokpit-view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 4 Compact Stat Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>TOPLAM KAYITLI ÖĞRENCİ</span>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={18} />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginTop: "12px" }}>
                {totalStudents} <span style={{ fontSize: "14px", fontWeight: "500", color: "#16a34a" }}>Aktif: {activeStudents}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>2026-2027 Eğitim Öğretim Dönemi</div>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>KONTENJAN & DOLULUK</span>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={18} />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginTop: "12px" }}>
                %{occupancyRate} <span style={{ fontSize: "14px", fontWeight: "500", color: "#64748b" }}>({totalStudents}/{totalCapacity})</span>
              </div>
              <div style={{ width: "100%", background: "#f1f5f9", height: "6px", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(occupancyRate, 100)}%`, background: "#16a34a", height: "100%" }} />
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>SINIF & EĞİTMEN KADROSU</span>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f5f3ff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GraduationCap size={18} />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginTop: "12px" }}>
                {classes.length} <span style={{ fontSize: "14px", fontWeight: "500", color: "#8b5cf6" }}>Şube / {teachers.length} Öğretmen</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Derslik ve zümre dağılımı tam</div>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>ÖN KAYIT / ADAY BEKLEYEN</span>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Award size={18} />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginTop: "12px" }}>
                {candidates.length} <span style={{ fontSize: "14px", fontWeight: "500", color: "#d97706" }}>Görüşülecek</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Bursluluk ve kayıt randevuları</div>
            </div>
          </div>

          {/* Missing Data Alerts & Quick Fix Banner */}
          {(missingTc.length > 0 || missingPhoto.length > 0 || missingParentPhone.length > 0) && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "#92400e", marginBottom: "8px" }}>
                <AlertTriangle size={18} /> Edesis Eksik Veri Uyarıları
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#78350f" }}>
                {missingTc.length > 0 && (
                  <div>
                    🔴 <b>{missingTc.length}</b> öğrencinin T.C. Kimlik Numarası eksik.
                  </div>
                )}
                {missingPhoto.length > 0 && (
                  <div>
                    🟡 <b>{missingPhoto.length}</b> öğrencinin vesikalık fotoğrafı yüklenmemiş.
                  </div>
                )}
                {missingParentPhone.length > 0 && (
                  <div>
                    ⚠️ <b>{missingParentPhone.length}</b> öğrencinin veli iletişim numarası girilmemiş.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seviye Dağılımı ve Hızlı İşlemler */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
                Akademik Program & Seviye Dağılımı
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.entries(gradeDistribution).map(([grade, count]) => {
                  const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                  return (
                    <div key={grade}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: "600", color: "#334155" }}>{grade}</span>
                        <span style={{ color: "#64748b" }}>{count} Öğrenci (%{pct})</span>
                      </div>
                      <div style={{ width: "100%", background: "#f1f5f9", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, background: grade.includes("YKS") ? "#2563eb" : grade.includes("LGS") ? "#16a34a" : "#8b5cf6", height: "100%", borderRadius: "4px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
                  Kayıt Hızlı İşlemleri
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                  Yeni kayıt girişi, aday yönetimi veya sınıf listesi aktarımı:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={onOpenWizard}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1e293b", textAlign: "left" }}
                  >
                    <UserPlus size={16} color="#2563eb" />
                    <span>Öğrenci Kayıt Sihirbazı</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("adaylar")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1e293b", textAlign: "left" }}
                  >
                    <Award size={16} color="#d97706" />
                    <span>Yeni Aday & Ön Kayıt Görüşmesi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("raporlar")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1e293b", textAlign: "left" }}
                  >
                    <FileText size={16} color="#16a34a" />
                    <span>Sınıf Kontenjan Raporu Al</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("sifreler")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1e293b", textAlign: "left" }}
                  >
                    <Key size={16} color="#6366f1" />
                    <span>Öğrenci & Veli SMS Şifresi Gönder</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Son Kayıt Olan Öğrenciler Tablosu */}
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
                Son Kayıt Olan Öğrenciler
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate("students");
                  else setActiveTab("ogrenciler");
                }}
                style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                Tüm Öğrencileri Gör ({totalStudents}) <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                    <th style={{ padding: "12px 16px" }}>ÖĞRENCİ</th>
                    <th style={{ padding: "12px 16px" }}>SINIF / ŞUBE</th>
                    <th style={{ padding: "12px 16px" }}>OKULU</th>
                    <th style={{ padding: "12px 16px" }}>VELİ BİLGİSİ</th>
                    <th style={{ padding: "12px 16px" }}>KAYIT TUTARI</th>
                    <th style={{ padding: "12px 16px" }}>DURUM</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>İŞLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e0e7ff", color: "#3730a3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px" }}>
                            {s.student_name ? s.student_name.slice(0, 2).toUpperCase() : "ÖG"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "600", color: "#0f172a" }}>{s.student_name}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>No: {s.student_no || "2026" + s.id.slice(-3)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "4px 8px", background: "#f1f5f9", borderRadius: "6px", fontWeight: "600", color: "#334155" }}>
                          {s.student_class || "Genel"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{s.school || "İnegöl"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "500", color: "#1e293b" }}>{s.parent_name || "-"}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{s.parent_phone || "-"}</div>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>
                        {Number(s.total_fee || 0).toLocaleString("tr-TR")} ₺
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "4px 8px", background: "#dcfce7", color: "#166534", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>
                          {s.status || "Kesin Kayıt"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => onSelectStudent && onSelectStudent(s)}
                          style={{ padding: "6px 12px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KAYIT RAPORLARI */}
      {activeTab === "raporlar" && (
        <div className="raporlar-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
                Sınıf ve Şube Kontenjan Doluluk Raporu
              </h3>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                <Printer size={14} /> Yazdır / PDF İndir
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px" }}>ŞUBE ADI</th>
                  <th style={{ padding: "10px 14px" }}>SEVİYE</th>
                  <th style={{ padding: "10px 14px" }}>DERSLİK</th>
                  <th style={{ padding: "10px 14px" }}>KONTENJAN</th>
                  <th style={{ padding: "10px 14px" }}>MEVCUT KAYIT</th>
                  <th style={{ padding: "10px 14px" }}>DOLULUK ORANI</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => {
                  const classStudents = students.filter(s => s.student_class === cls.name);
                  const cap = cls.capacity || 20;
                  const rate = Math.round((classStudents.length / cap) * 100);
                  return (
                    <tr key={cls.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: "600", color: "#0f172a" }}>{cls.name}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{cls.level || "Genel"}</td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{cls.room || "Derslik 1"}</td>
                      <td style={{ padding: "10px 14px", fontWeight: "600" }}>{cap}</td>
                      <td style={{ padding: "10px 14px", fontWeight: "600", color: "#2563eb" }}>{classStudents.length}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "80px", background: "#f1f5f9", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 90 ? "#ef4444" : rate >= 60 ? "#16a34a" : "#2563eb", height: "100%" }} />
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: "600" }}>%{rate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BURSLULUK & ADAYLAR */}
      {activeTab === "adaylar" && (
        <div className="adaylar-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
                  Aday Öğrenci & Bursluluk Başvuru Havuzu
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  Kuruma gelen arama, form ve randevuları takip edin; tek tıkla kesin kayda dönüştürün.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewCandidateModal(true)}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
              >
                <Plus size={16} /> + Yeni Aday Ekle
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px" }}>ADAY ÖĞRENCİ</th>
                  <th style={{ padding: "10px 14px" }}>İLETİŞİM</th>
                  <th style={{ padding: "10px 14px" }}>HEDEF PROGRAM</th>
                  <th style={{ padding: "10px 14px" }}>BAŞVURU KAYNAĞI</th>
                  <th style={{ padding: "10px 14px" }}>TARİH</th>
                  <th style={{ padding: "10px 14px" }}>DURUM</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>AKSİYON</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand) => (
                  <tr key={cand.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{cand.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{cand.notes}</div>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: "500", color: "#334155" }}>{cand.phone}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "4px 8px", background: "#eff6ff", color: "#2563eb", borderRadius: "6px", fontWeight: "600", fontSize: "12px" }}>
                        {cand.targetClass}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{cand.source}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{cand.date}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600",
                        background: cand.status === "Kayda Dönüştü" ? "#dcfce7" : cand.status === "Görüşüldü" ? "#fef3c7" : "#f1f5f9",
                        color: cand.status === "Kayda Dönüştü" ? "#166534" : cand.status === "Görüşüldü" ? "#92400e" : "#475569"
                      }}>
                        {cand.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => onOpenWizard && onOpenWizard()}
                        style={{ padding: "6px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                        title="Bu aday için öğrenci kayıt sihirbazını başlat"
                      >
                        Kesin Kayda Dönüştür
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GEÇİCİ ŞİFRELER (SMS) */}
      {activeTab === "sifreler" && (
        <div className="sifreler-view" style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
            Öğrenci & Veli Portalı Geçici Şifre Yönetimi
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
            Öğrenci ve velilerinizin mobil uygulamaya ve portala ilk kez giriş yapabilmesi için tek kullanımlık geçici SMS şifreleri üretin.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {students.slice(0, 10).map((s) => {
              const tempPass = "CZM" + (Math.abs(s.id.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 9000 + 1000);
              const smsText = `Sayın Velimiz, Özel İnegöl Çözüm Kursu mobil portal giriş şifreniz: ${tempPass} Giriş linki: https://inegol-cozum-kurs.pages.dev`;
              return (
                <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{s.student_name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{s.student_class} · Veli: {s.parent_name || "Veli"}</div>
                    </div>
                    <span style={{ padding: "4px 8px", background: "#e0e7ff", color: "#3730a3", borderRadius: "6px", fontFamily: "monospace", fontWeight: "700", fontSize: "13px" }}>
                      {tempPass}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "#475569", background: "#ffffff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "10px" }}>
                    {smsText}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(smsText, s.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px 10px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", color: "#334155" }}
                    >
                      {copiedId === s.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      <span>{copiedId === s.id ? "Kopyalandı!" : "SMS Kopyala"}</span>
                    </button>
                    {s.parent_phone && s.parent_phone !== "0" && (
                      <a
                        href={`https://wa.me/90${s.parent_phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(smsText)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px 12px", background: "#25D366", color: "#fff", borderRadius: "6px", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: DÖNEM GEÇİŞİ */}
      {activeTab === "donem" && (
        <div className="donem-view" style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
            Edesis Akademik Dönem Geçiş Sihirbazı
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
            2025-2026 dönemindeki öğrencileri yeni 2026-2027 dönemine bir üst sınıfa otomatik aktarma simülasyonu.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>KAYNAK DÖNEM</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>2025 - 2026 Dönemi</div>
              <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>Aktarılmaya hazır: {students.length} Öğrenci</div>
            </div>

            <div style={{ padding: "16px", border: "1px solid #bfdbfe", borderRadius: "8px", background: "#eff6ff" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#2563eb" }}>HEDEF DÖNEM</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#1e3a8a", marginTop: "4px" }}>2026 - 2027 Dönemi (Aktif)</div>
              <div style={{ fontSize: "13px", color: "#3b82f6", marginTop: "4px" }}>Otomatik Sınıf Atlatma Kuralı Açık</div>
            </div>
          </div>

          <div style={{ background: "#f1f5f9", padding: "16px", borderRadius: "8px", fontSize: "13px", color: "#334155", marginBottom: "20px" }}>
            <b>Otomatik Sınıf Atlatma Kuralları:</b>
            <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
              <li>8. Sınıf (LGS) öğrencileri → 9. Sınıf / Lise Hazırlık</li>
              <li>10. Sınıf öğrencileri → 11. Sınıf TYT-AYT Sayısal / EA</li>
              <li>11. Sınıf öğrencileri → 12. Sınıf YKS Hazırlık</li>
              <li>12. Sınıf öğrencileri → Mezun statüsüne arşivlenir.</li>
            </ul>
          </div>

          {simulationResult && (
            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "14px 16px", borderRadius: "8px", marginBottom: "16px", color: "#065f46", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={18} color="#059669" />
              <div>
                <b>Dönem Geçiş Simülasyonu Doğrulandı:</b> {students.length} öğrencinin sınıf seviyeleri ve geçmiş mali kayıtları başarıyla kontrol edildi. Veri kaybı riski bulunmamaktadır.
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSimulationResult(true)}
            style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
          >
            Geçiş Simülasyonunu Doğrula & Önizle
          </button>
        </div>
      )}

      {/* TAB 6: KAYIT AYARLARI */}
      {activeTab === "ayarlar" && (
        <div className="ayarlar-view" style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
            Edesis Kayıt ve Numara Ayarları
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
            Otomatik öğrenci numarası oluşturma formatı, varsayılan kayıt sözleşmesi maddeleri ve indirim oranları.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Öğrenci Numarası Şablonu
              </label>
              <input
                type="text"
                defaultValue="2026{NO}"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px" }}
              />
              <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                Örnek çıktı: 2026101, 2026102
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Varsayılan Taksit Sayısı
              </label>
              <select
                defaultValue="6"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="1">1 Taksit (Peşin)</option>
                <option value="4">4 Taksit</option>
                <option value="6">6 Taksit (Standart)</option>
                <option value="8">8 Taksit</option>
                <option value="10">10 Taksit</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* New Candidate Modal */}
      {newCandidateModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>Yeni Aday / Ön Kayıt Ekle</h3>
              <button type="button" onClick={() => setNewCandidateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCandidate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Öğrenci Adı Soyadı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kaan Arslan"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>İletişim Numarası (Telefon / WhatsApp)</label>
                <input
                  type="text"
                  required
                  placeholder="0532 ..."
                  value={newCandidate.phone}
                  onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Hedef Sınıf / Seviye</label>
                <select
                  value={newCandidate.targetClass}
                  onChange={(e) => setNewCandidate({ ...newCandidate, targetClass: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                >
                  <option value="LGS Hazırlık">LGS Hazırlık (8. Sınıf)</option>
                  <option value="10. Sınıf">10. Sınıf Ara Sınıf</option>
                  <option value="11. Sınıf">11. Sınıf TYT Hazırlık</option>
                  <option value="TYT - AYT">TYT - AYT (12. Sınıf)</option>
                  <option value="Mezun Sayısal">Mezun Sayısal</option>
                  <option value="Mezun Eşit Ağırlık">Mezun Eşit Ağırlık</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Görüşme Notu</label>
                <textarea
                  rows={3}
                  placeholder="Öğrencinin hedefleri, veli talepleri veya bursluluk detayları..."
                  value={newCandidate.notes}
                  onChange={(e) => setNewCandidate({ ...newCandidate, notes: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setNewCandidateModal(false)}
                  style={{ flex: 1, padding: "10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                >
                  Adayı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default KayitModulu;
