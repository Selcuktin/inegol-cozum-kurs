import React, { useState, useMemo } from "react";
import { 
  X, Users, UserCheck, Clock, BookOpen, Plus, Edit, Printer, 
  Search, ChevronRight, Phone, MessageCircle, CheckCircle2, 
  AlertCircle, Shield, FileText, Download, UserPlus, Filter
} from "lucide-react";

export function ClassDetailModal({ 
  activeClass, 
  students = [], 
  onClose, 
  onSelectStudent, 
  onEditClass, 
  onNavigate, 
  onOpenNewStudent 
}) {
  const [activeTab, setActiveTab] = useState("kadro"); // 'kadro' | 'yoklama_listesi' | 'toplu_whatsapp'
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'has_debt' | 'no_debt'

  // Filter students belonging to this class
  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return students.filter(s => 
      s.program === activeClass.name || s.student_class === activeClass.name
    );
  }, [students, activeClass]);

  // Search and filter inside this class
  const filteredStudents = useMemo(() => {
    if (!activeClass) return [];
    return classStudents.filter(s => {
      const matchSearch = `${s.student_name} ${s.student_no} ${s.parent_name} ${s.parent_phone} ${s.student_tc || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      const rem = Math.max(0, (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0));
      if (statusFilter === "has_debt" && rem <= 0) return false;
      if (statusFilter === "no_debt" && rem > 0) return false;

      return true;
    });
  }, [classStudents, searchTerm, statusFilter, activeClass]);

  if (!activeClass) return null;

  // Financial calculations
  const totalEnrolled = classStudents.length;
  const capacity = activeClass.capacity || 20;
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((totalEnrolled / capacity) * 100)) : 0;
  
  const totalFeeSum = classStudents.reduce((sum, s) => sum + (Number(s.total_fee) || 0), 0);
  const paidSum = classStudents.reduce((sum, s) => sum + (Number(s.paid_amount) || 0), 0);
  const remainingDebtSum = Math.max(0, totalFeeSum - paidSum);
  const collectionPct = totalFeeSum > 0 ? Math.round((paidSum / totalFeeSum) * 100) : 100;

  const handlePrint = () => {
    window.print();
  };

  const buildWhatsAppUrl = (phone, studentName, parentName) => {
    if (!phone) return "#";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "9" + clean;
    if (!clean.startsWith("90") && clean.length === 10) clean = "90" + clean;
    const msg = `Sayın ${parentName || "Velimiz"},\nÖzel İnegöl Çözüm Kurs Merkezi olarak ${studentName} isimli öğrencimizin sınıfı (${activeClass.name}) ile ilgili bilgilendirmedir. Detaylı bilgi almak için kurumumuzla iletişime geçebilirsiniz.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: "1050px", 
          width: "95vw", 
          maxHeight: "92vh", 
          display: "flex", 
          flexDirection: "column",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.22)"
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-head" 
          style={{ 
            padding: "20px 24px", 
            borderBottom: "1px solid var(--border)", 
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#fff",
            borderRadius: "16px 16px 0 0"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <div 
              style={{ 
                width: 48, 
                height: 48, 
                borderRadius: "12px", 
                background: "rgba(37,99,235,0.25)", 
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "#60a5fa"
              }}
            >
              <BookOpen size={26} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#fff" }}>
                  {activeClass.name}
                </h1>
                <span 
                  style={{ 
                    background: "#2563eb", 
                    color: "#fff", 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    padding: "3px 10px", 
                    borderRadius: "20px" 
                  }}
                >
                  {totalEnrolled} Öğrenci Kayıtlı
                </span>
                <span 
                  style={{ 
                    background: "rgba(255,255,255,0.12)", 
                    color: "#e2e8f0", 
                    fontSize: "12px", 
                    padding: "3px 10px", 
                    borderRadius: "20px" 
                  }}
                >
                  {activeClass.level || "Genel Seviye"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
                Derslik: <b style={{ color: "#f1f5f9" }}>{activeClass.room || "Atanmadı"}</b> · 
                Kontenjan: <b style={{ color: "#f1f5f9" }}>{capacity} Kişilik</b> · 
                Sınıf Öğretmeni / Sorumlu: <b style={{ color: "#60a5fa" }}>{activeClass.teacher || "Öğretmen Atanmadı"}</b>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onEditClass && (
              <button 
                className="btn small secondary" 
                onClick={() => onEditClass(activeClass)}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff" }}
              >
                <Edit size={14} /> Düzenle
              </button>
            )}
            <button 
              className="icon-btn" 
              onClick={onClose}
              style={{ color: "#fff", background: "rgba(255,255,255,0.1)" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* KPI Mini-Cards Bar */}
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "12px", 
            padding: "16px 24px", 
            background: "#f8fafc",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Kayıtlı Öğrenci / Doluluk
            </div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#1e293b", marginTop: "4px" }}>
              {totalEnrolled} <span style={{ fontSize: "13px", fontWeight: "500", color: "#64748b" }}>/ {capacity} ({occupancyPct}%)</span>
            </div>
            <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", marginTop: "6px", overflow: "hidden" }}>
              <div style={{ width: `${occupancyPct}%`, height: "100%", background: occupancyPct >= 90 ? "#ef4444" : "#2563eb" }} />
            </div>
          </div>

          <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Toplam Kayıt Bedeli
            </div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#1e293b", marginTop: "4px" }}>
              ₺{totalFeeSum.toLocaleString("tr-TR")}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Şube toplam taahhüt edilen ücret
            </div>
          </div>

          <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Tahsil Edilen Tutar
            </div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#16a34a", marginTop: "4px" }}>
              ₺{paidSum.toLocaleString("tr-TR")}
            </div>
            <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600", marginTop: "4px" }}>
              Tahsilat Oranı: %{collectionPct}
            </div>
          </div>

          <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
              Kalan Toplam Alacak
            </div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: remainingDebtSum > 0 ? "#dc2626" : "#16a34a", marginTop: "4px" }}>
              ₺{remainingDebtSum.toLocaleString("tr-TR")}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              {remainingDebtSum > 0 ? "Vadesi beklenen / açık taksitler" : "Tüm ücretler ödendi ✓"}
            </div>
          </div>
        </div>

        {/* Sub-Tabs & Actions Bar */}
        <div 
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "12px 24px", 
            borderBottom: "1px solid var(--border)",
            background: "#fff",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              className={`btn small ${activeTab === "kadro" ? "" : "secondary"}`}
              onClick={() => setActiveTab("kadro")}
              style={{ fontWeight: "600" }}
            >
              <Users size={15} /> Öğrenci Kadrosu ({classStudents.length})
            </button>
            <button 
              className={`btn small ${activeTab === "yoklama_listesi" ? "" : "secondary"}`}
              onClick={() => setActiveTab("yoklama_listesi")}
              style={{ fontWeight: "600" }}
            >
              <Printer size={15} /> Resmi Yoklama Çizelgesi (A4)
            </button>
            <button 
              className={`btn small ${activeTab === "toplu_whatsapp" ? "" : "secondary"}`}
              onClick={() => setActiveTab("toplu_whatsapp")}
              style={{ fontWeight: "600" }}
            >
              <MessageCircle size={15} /> Toplu WhatsApp Bilgilendirme
            </button>
          </div>

          {/* Sınıfa Özel Hızlı Kısayollar */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {onNavigate && (
              <>
                <button 
                  className="btn small secondary"
                  title="Bu sınıf için yoklama al"
                  onClick={() => { onClose(); onNavigate("attendance"); }}
                >
                  <UserCheck size={14} /> Yoklama Al
                </button>
                <button 
                  className="btn small secondary"
                  title="Bu sınıfın ders programını gör"
                  onClick={() => { onClose(); onNavigate("schedules"); }}
                >
                  <Clock size={14} /> Ders Programı
                </button>
              </>
            )}
            {onOpenNewStudent && (
              <button 
                className="btn small"
                onClick={() => { onClose(); onOpenNewStudent(); }}
                style={{ background: "#2563eb", color: "#fff" }}
              >
                <UserPlus size={14} /> Öğrenci Ekle
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: "auto", padding: "20px 24px", flex: 1, background: "#fafafa" }}>
          
          {/* TAB 1: ÖĞRENCİ KADROSU */}
          {activeTab === "kadro" && (
            <div>
              {/* Filtre ve Arama Çubuğu */}
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "420px" }}>
                  <div className="top-search" style={{ width: "100%", margin: 0 }}>
                    <Search size={15} />
                    <input 
                      placeholder="Bu sınıfta öğrenci, no, veli, telefon ara..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ fontSize: "13px" }}
                    />
                  </div>
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "12px" }}
                    >
                      Temizle
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Bakiye:</span>
                  <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ 
                      padding: "6px 10px", 
                      borderRadius: "6px", 
                      border: "1px solid var(--border)", 
                      fontSize: "12px",
                      background: "#fff"
                    }}
                  >
                    <option value="all">Tüm Öğrenciler ({classStudents.length})</option>
                    <option value="has_debt">Kalan Borcu Olanlar</option>
                    <option value="no_debt">Borcu Olmayanlar / Ödeyenler</option>
                  </select>
                </div>
              </div>

              {/* Öğrenci Tablosu */}
              {filteredStudents.length > 0 ? (
                <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ width: "60px" }}>No</th>
                        <th>Öğrenci Adı Soyadı</th>
                        <th>Okulu</th>
                        <th>Veli & İletişim</th>
                        <th>Taksit / Bakiye</th>
                        <th>Durum</th>
                        <th style={{ textAlign: "right" }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, idx) => {
                        const total = Number(s.total_fee) || 0;
                        const paid = Number(s.paid_amount) || 0;
                        const remaining = Math.max(0, total - paid);
                        const initials = s.student_name ? s.student_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

                        return (
                          <tr 
                            key={s.id || idx}
                            style={{ 
                              cursor: "pointer", 
                              transition: "background 0.15s ease",
                              borderBottom: "1px solid #f1f5f9"
                            }}
                            onClick={() => onSelectStudent && onSelectStudent(s)}
                          >
                            <td>
                              <b style={{ color: "#2563eb", fontFamily: "monospace", fontSize: "13px" }}>
                                #{s.student_no || "—"}
                              </b>
                            </td>

                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div 
                                  className="student-avatar" 
                                  style={{ 
                                    width: 34, 
                                    height: 34, 
                                    borderRadius: "8px", 
                                    background: "#e0e7ff", 
                                    color: "#3730a3",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                  }}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>
                                    {s.student_name}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    {s.student_tc ? `TC: ${s.student_tc}` : `Kayıt: ${s.created_at ? s.created_at.slice(0,10) : "2026-2027"}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ color: "#334155", fontSize: "12px" }}>
                                {s.school || "—"}
                              </div>
                            </td>

                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div>
                                  <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "12px" }}>
                                    {s.parent_name || "—"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    {s.parent_phone || "—"}
                                  </div>
                                </div>
                                {s.parent_phone && (
                                  <a 
                                    href={buildWhatsAppUrl(s.parent_phone, s.student_name, s.parent_name)}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Veliye WhatsApp Mesajı Gönder"
                                    style={{ 
                                      display: "inline-flex", 
                                      alignItems: "center", 
                                      justifyContent: "center", 
                                      width: 26, 
                                      height: 26, 
                                      borderRadius: "6px", 
                                      background: "#22c55e", 
                                      color: "#fff",
                                      textDecoration: "none",
                                      marginLeft: "4px"
                                    }}
                                  >
                                    <MessageCircle size={14} />
                                  </a>
                                )}
                              </div>
                            </td>

                            <td>
                              <div>
                                <b style={{ color: remaining > 0 ? "#dc2626" : "#16a34a", fontSize: "13px" }}>
                                  {remaining > 0 ? `₺${remaining.toLocaleString("tr-TR")} Kalan` : "Ödendi ✓"}
                                </b>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                  Toplam: ₺{total.toLocaleString("tr-TR")}
                                </div>
                              </div>
                            </td>

                            <td>
                              <span 
                                className="status-pill"
                                style={{ 
                                  background: s.status === "Aktif" ? "#dcfce7" : s.status === "Yaz Kursu" ? "#fef3c7" : "#f1f5f9",
                                  color: s.status === "Aktif" ? "#166534" : s.status === "Yaz Kursu" ? "#92400e" : "#475569",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "600"
                                }}
                              >
                                {s.status || "Aktif"}
                              </span>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <button 
                                className="btn small secondary" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onSelectStudent && onSelectStudent(s); 
                                }}
                                style={{ 
                                  display: "inline-flex", 
                                  alignItems: "center", 
                                  gap: "5px", 
                                  fontSize: "11px", 
                                  padding: "5px 10px",
                                  background: "#f8fafc",
                                  border: "1px solid var(--border)"
                                }}
                              >
                                Öğrenci Bilgi Sayfası <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div 
                  style={{ 
                    padding: "48px 24px", 
                    textAlign: "center", 
                    background: "#fff", 
                    borderRadius: "12px", 
                    border: "1px dashed var(--border)" 
                  }}
                >
                  <Users size={36} color="#94a3b8" style={{ margin: "0 auto 10px auto" }} />
                  <h3 style={{ margin: "0 0 6px 0", color: "#334155" }}>
                    {searchTerm ? "Aramaya uygun öğrenci bulunamadı" : "Bu sınıfta henüz kayıtlı öğrenci yok"}
                  </h3>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                    {searchTerm 
                      ? "Arama kriterlerinizi değiştirerek tekrar deneyebilirsiniz." 
                      : "Bu şubeye yeni öğrenci kaydetmek için yukarıdaki 'Öğrenci Ekle' butonunu kullanabilirsiniz."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESMİ MEB YOKLAMA VE İMZA ÇİZELGESİ (A4 YAZDIRILABİLİR) */}
          {activeTab === "yoklama_listesi" && (
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                    Resmi MEB Sınıf Yoklama ve İmza Çizelgesi (A4 Formatı)
                  </h3>
                  <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "12px" }}>
                    Bu belgeyi yazıcıdan çıkartıp derslik panosuna asabilir veya öğretmen imza defteri olarak kullanabilirsiniz.
                  </p>
                </div>
                <button 
                  className="btn" 
                  onClick={handlePrint}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1e293b", color: "#fff" }}
                >
                  <Printer size={16} /> Listeyi Yazdır / PDF İndir
                </button>
              </div>

              {/* A4 Baskı Kağıdı Görünümü */}
              <div 
                className="print-sheet" 
                style={{ 
                  border: "2px solid #334155", 
                  padding: "24px", 
                  background: "#fff", 
                  color: "#000",
                  fontFamily: "Arial, sans-serif" 
                }}
              >
                {/* Resmi Başlık */}
                <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "16px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>T.C. MİLLÎ EĞİTİM BAKANLIĞI</h4>
                  <h3 style={{ margin: "2px 0", fontSize: "16px", fontWeight: "800" }}>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h3>
                  <div style={{ fontSize: "12px", fontWeight: "600", textDecoration: "underline", marginTop: "4px" }}>
                    {activeClass.name} ŞUBESİ DERS VE YOKLAMA İMZA ÇİZELGESİ
                  </div>
                </div>

                {/* Sınıf Bilgi Başlığı */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "11px", marginBottom: "12px", borderBottom: "1px solid #ccc", paddingBottom: "8px" }}>
                  <div><b>Sınıf / Şube:</b> {activeClass.name}</div>
                  <div><b>Derslik:</b> {activeClass.room || "Derslik 1"}</div>
                  <div><b>Sorumlu Öğretmen:</b> {activeClass.teacher || "—"}</div>
                  <div><b>Kayıtlı Öğrenci:</b> {classStudents.length}</div>
                  <div><b>Eğitim Dönemi:</b> 2026-2027</div>
                  <div><b>Tarih Aralığı:</b> ...... / ...... / 2026</div>
                </div>

                {/* Yoklama Tablosu */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: "6px 4px", width: "30px", textAlign: "center" }}>S.No</th>
                      <th style={{ border: "1px solid #000", padding: "6px 4px", width: "50px", textAlign: "center" }}>Öğr.No</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px" }}>Öğrenci Adı Soyadı</th>
                      {[...Array(12)].map((_, i) => (
                        <th key={i} style={{ border: "1px solid #000", padding: "4px", width: "26px", textAlign: "center" }}>
                          {i + 1}
                        </th>
                      ))}
                      <th style={{ border: "1px solid #000", padding: "4px", width: "55px", textAlign: "center" }}>Devamsız</th>
                      <th style={{ border: "1px solid #000", padding: "4px", width: "80px", textAlign: "center" }}>Veli İmzası</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((s, idx) => (
                      <tr key={s.id || idx}>
                        <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center", fontWeight: "bold" }}>{s.student_no || "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "600" }}>{s.student_name}</td>
                        {[...Array(12)].map((_, i) => (
                          <td key={i} style={{ border: "1px solid #000", padding: "4px", height: "24px" }} />
                        ))}
                        <td style={{ border: "1px solid #000", padding: "4px" }} />
                        <td style={{ border: "1px solid #000", padding: "4px" }} />
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* İmza Onay Kutusu */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", fontSize: "11px", textAlign: "center" }}>
                  <div style={{ width: "200px" }}>
                    <div><b>Ders Öğretmeni</b></div>
                    <div style={{ height: "40px" }} />
                    <div>İmza / Kaşe</div>
                  </div>
                  <div style={{ width: "200px" }}>
                    <div><b>Rehberlik Servisi</b></div>
                    <div style={{ height: "40px" }} />
                    <div>İmza</div>
                  </div>
                  <div style={{ width: "200px" }}>
                    <div><b>Kurum Müdürü</b></div>
                    <div style={{ height: "40px" }} />
                    <div>Nevin Çakmak<br />Özel İnegöl Çözüm Kursu</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TOPLU VELİ WHATSAPP BİLGİLENDİRME */}
          {activeTab === "toplu_whatsapp" && (
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                  {activeClass.name} Sınıfı Velilerine Toplu WhatsApp Duyurusu
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "13px" }}>
                  Bu sınıftaki tüm velilere sınav tarihi, ödev hatırlatması veya veli toplantısı duyurularını kolayca iletebilirsiniz.
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)", marginBottom: "20px" }}>
                <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "8px", color: "#1e293b" }}>
                  Sınıf Veli İletişim Rehberi ({classStudents.filter(s => s.parent_phone).length} Numara Mevcut)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
                  {classStudents.map((s, i) => (
                    <div 
                      key={s.id || i}
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "8px 12px", 
                        background: "#fff", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border)" 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "12px", color: "#0f172a" }}>
                          {s.student_name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Veli: {s.parent_name || "—"} ({s.parent_phone || "Tel yok"})
                        </div>
                      </div>
                      {s.parent_phone && (
                        <a 
                          href={buildWhatsAppUrl(s.parent_phone, s.student_name, s.parent_name)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn small"
                          style={{ 
                            background: "#22c55e", 
                            color: "#fff", 
                            padding: "4px 8px", 
                            fontSize: "11px", 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "4px" 
                          }}
                        >
                          <MessageCircle size={12} /> Mesaj
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div 
          className="modal-foot" 
          style={{ 
            padding: "14px 24px", 
            borderTop: "1px solid var(--border)", 
            background: "#fff",
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            borderRadius: "0 0 16px 16px"
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            <b>{classStudents.length}</b> öğrenci listeleniyor · İnegöl Çözüm Kurs Merkezi Şube Yönetimi
          </div>
          <button className="btn secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
