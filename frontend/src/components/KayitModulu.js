import React, { useMemo } from "react";
import { Users, UserPlus, BookOpen, GraduationCap, FileText, RefreshCw, AlertTriangle, ChevronRight, TrendingUp, Printer } from "lucide-react";

export function KayitModulu({
  activeTab = "kokpit",
  setActiveTab,
  students = [],
  classes = [],
  teachers = [],
  onOpenWizard,
  onSelectStudent,
  onEditStudent,
  onNavigate
}) {
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
            Öğrenci kayıtları, sınıf kontenjanları ve dönem raporları.
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
                  Yeni öğrenci kaydı ve kayıt raporları:
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
                    onClick={() => setActiveTab("raporlar")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1e293b", textAlign: "left" }}
                  >
                    <FileText size={16} color="#16a34a" />
                    <span>Sınıf Kontenjan Raporu Al</span>
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
                            <div
                              style={{ fontWeight: "600", color: "#0f172a", cursor: "pointer" }}
                              onClick={() => {
                                const targetNo = s?.sozlesme_no || s?.sozlesmeNo || s?.student_name;
                                if (targetNo) {
                                  try {
                                    sessionStorage.setItem("cozum_open_contract_no", targetNo);
                                    sessionStorage.setItem("cozum_contract_prev_page", "kayit");
                                  } catch {}
                                }
                                if (onNavigate) onNavigate("documents");
                                else if (onSelectStudent) onSelectStudent(s);
                              }}
                              title="Sözleşme & Yönetim Sayfasına Git"
                            >
                              {s.student_name}
                            </div>
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
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onEditStudent) onEditStudent(s);
                              else if (onSelectStudent) onSelectStudent(s);
                            }}
                            style={{
                              padding: "6px 10px",
                              background: "#f8fafc",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              fontWeight: "600",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                            title="Öğrenci Bilgilerini Düzenle"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const targetNo = s?.sozlesme_no || s?.sozlesmeNo || s?.student_name;
                              if (targetNo) {
                                try {
                                  sessionStorage.setItem("cozum_open_contract_no", targetNo);
                                  sessionStorage.setItem("cozum_contract_prev_page", "kayit");
                                } catch {}
                              }
                              if (onNavigate) onNavigate("documents");
                              else if (onSelectStudent) onSelectStudent(s);
                            }}
                            style={{
                              padding: "6px 12px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              fontWeight: "600",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                            title="Tek Sayfadan Sözleşme & Muhasebe Yönetimi"
                          >
                            Sözleşme
                          </button>
                        </div>
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

      {/* TAB 5: DÖNEM GEÇİŞİ */}
      {activeTab === "donem" && (
        <div className="donem-view" style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h3>Dönem sözleşmeleri</h3>
          <p>Yeni dönem kaydı Sözleşmeler ekranından yeni bir sözleşme oluşturularak yapılır. Önceki dönemin tahsilatları ve ödeme planı kendi sözleşmesinde saklanır.</p>
          <table className="data-table"><thead><tr><th>Dönem</th><th>Öğrenci kaydı</th></tr></thead><tbody>
            {Object.entries(students.reduce((counts,s)=>{const period=s.program || "Belirtilmemiş";counts[period]=(counts[period]||0)+1;return counts;},{})).map(([period,count])=><tr key={period}><td>{period}</td><td>{count}</td></tr>)}
          </tbody></table>
          <button type="button" className="btn" onClick={()=>onNavigate?.("documents")}>Sözleşmelere Git</button>
        </div>
      )}

    </div>
  );
}
export default KayitModulu;
