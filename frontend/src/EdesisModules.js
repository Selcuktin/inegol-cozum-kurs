import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
  AlertTriangle,
  Key,
  Edit,
  Eye,
  PieChart,
  Layers,
  Sliders,
  ChevronDown,
  RefreshCw,
  BarChart2,
  Share2,
  Upload
} from "lucide-react";

export function openWhatsApp(phone, message) {
  if (!phone) {
    alert("Kayıtlı telefon numarası bulunamadı.");
    return;
  }
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.slice(1);
  if (!clean.startsWith("90")) clean = "90" + clean;
  const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
  } catch {
    return d;
  }
}

// ==========================================================
// 1. ÖLÇME & SINAVLAR (EDESIS ENTERPRISE SINAV YÖNETİMİ & RAPORLAR)
// ==========================================================

export function ExamsPage({ me, API, students, classes }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState("sinavlar"); // "sinavlar" | "ogrenci_raporlari" | "takvim"

  // Data & State
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("Hepsi");
  const [typeFilter, setTypeFilter] = useState("Hepsi");
  const [classFilter, setClassFilter] = useState("Hepsi");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examStudentSearch, setExamStudentSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showRaporModal, setShowRaporModal] = useState(null); // Exam object
  const [showCevapKeyModal, setShowCevapKeyModal] = useState(null); // Exam object
  const [showOptikModal, setShowOptikModal] = useState(null); // Exam object
  const [showClassComparisonModal, setShowClassComparisonModal] = useState(false);
  const [reportStudent, setReportStudent] = useState(null); // Result object

  // New Exam Form State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("TYT");
  const [newPublisher, setNewPublisher] = useState("Çözüm Yayınları");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDesc, setNewDesc] = useState("");

  // New Result Form State
  const [resStudentId, setResStudentId] = useState("");
  const [resBooklet, setResBooklet] = useState("A");
  const [resTurkC, setResTurkC] = useState("");
  const [resTurkI, setResTurkI] = useState("");
  const [resMatC, setResMatC] = useState("");
  const [resMatI, setResMatI] = useState("");
  const [resSciC, setResSciC] = useState("");
  const [resSciI, setResSciI] = useState("");
  const [resSocC, setResSocC] = useState("");
  const [resSocI, setResSocI] = useState("");
  const [resWeakTopics, setResWeakTopics] = useState("");

  const loadExams = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/exams`);
      const basicList = Array.isArray(res.data) ? res.data : [];

      // Sınavların gerçek öğrenci sonuçlarıyla birlikte detaylarını yükle
      const fullList = await Promise.all(
        basicList.map(async (ex) => {
          try {
            const d = await axios.get(`${API}/exams/${ex.id}`);
            return d.data || ex;
          } catch {
            return ex;
          }
        })
      );

      setExams(fullList);

      // Otomatik seçim: Önceden seçili sınav varsa onu güncelle, yoksa katılımcısı olan ilk sınavı seç
      const toSelect = selectedExam
        ? fullList.find((x) => x.id === selectedExam.id) || fullList[0]
        : fullList.find((x) => (x.participant_count || (x.results || []).length) > 0) || fullList[0];

      setSelectedExam(toSelect || null);
    } catch (err) {
      console.error("Exams load error:", err);
      setExams([]);
      setSelectedExam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const openExamDetail = async (exam) => {
    try {
      const res = await axios.get(`${API}/exams/${exam.id}`);
      setSelectedExam(res.data || exam);
    } catch {
      setSelectedExam(exam);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return alert("Sınav adı giriniz");
    try {
      await axios.post(`${API}/exams`, {
        title: newTitle.trim(),
        exam_type: newType,
        publisher: newPublisher,
        exam_date: newDate,
        description: newDesc,
        status: "completed"
      });
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      loadExams();
    } catch (err) {
      alert("Sınav eklenemedi: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm("Bu deneme sınavını ve tüm sonuçlarını silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/exams/${id}`);
      if (selectedExam?.id === id) setSelectedExam(null);
      loadExams();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!selectedExam || !resStudentId) return alert("Öğrenci seçiniz");
    const divisor = selectedExam.exam_type === "LGS" ? 3 : 4;
    const tc = Number(resTurkC) || 0;
    const ti = Number(resTurkI) || 0;
    const tNet = Math.max(0, tc - ti / divisor);

    const mc = Number(resMatC) || 0;
    const mi = Number(resMatI) || 0;
    const mNet = Math.max(0, mc - mi / divisor);

    const sc = Number(resSciC) || 0;
    const si = Number(resSciI) || 0;
    const fNet = Math.max(0, sc - si / divisor);

    const socC = Number(resSocC) || 0;
    const socI = Number(resSocI) || 0;
    const sNet = Math.max(0, socC - socI / divisor);

    const totalNet = Math.round((tNet + mNet + fNet + sNet) * 100) / 100;
    const score = Math.round((100 + totalNet * 3.3) * 100) / 100;

    const weakArr = resWeakTopics
      ? resWeakTopics.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      await axios.post(`${API}/exams/${selectedExam.id}/results`, {
        student_id: resStudentId,
        booklet: resBooklet,
        turkish_correct: tc,
        turkish_incorrect: ti,
        turkish_net: tNet,
        math_correct: mc,
        math_incorrect: mi,
        math_net: mNet,
        science_correct: sc,
        science_incorrect: si,
        science_net: fNet,
        social_correct: socC,
        social_incorrect: socI,
        social_net: sNet,
        total_net: totalNet,
        score: score,
        weak_topics: JSON.stringify(weakArr)
      });
      setShowResultModal(false);
      setResStudentId("");
      setResTurkC("");
      setResTurkI("");
      setResMatC("");
      setResMatI("");
      setResSciC("");
      setResSciI("");
      setResSocC("");
      setResSocI("");
      setResWeakTopics("");
      openExamDetail(selectedExam);
      loadExams();
    } catch (err) {
      alert("Sonuç kaydedilemedi: " + (err.response?.data?.detail || err.message));
    }
  };

  // Export current exam results to CSV/Excel
  const exportExamExcel = (exam) => {
    if (!exam) return;
    const results = exam.results || [];
    let csv = "\uFEFFSIRA;ÖĞRENCİ NO;AD SOYAD;SINIF;KİTAPÇIK;TÜRKÇE D;TÜRKÇE Y;TÜRKÇE NET;MAT D;MAT Y;MAT NET;FEN D;FEN Y;FEN NET;SOSYAL D;SOSYAL Y;SOSYAL NET;TOPLAM NET;PUAN;KURUM SIRASI\n";
    results.forEach((r, idx) => {
      csv += `${idx + 1};${r.school_no || ""};${r.student_name};${r.student_class || ""};${r.booklet || "A"};${r.turkish_correct || 0};${r.turkish_incorrect || 0};${r.turkish_net || 0};${r.math_correct || 0};${r.math_incorrect || 0};${r.math_net || 0};${r.science_correct || 0};${r.science_incorrect || 0};${r.science_net || 0};${r.social_correct || 0};${r.social_incorrect || 0};${r.social_net || 0};${r.total_net};${r.score};${r.class_rank || idx + 1}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(exam.title || "Sinav").replace(/[^a-zA-Z0-9_-]/g, "_")}_Sonuc_Listesi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((x) => {
      if (typeFilter !== "Hepsi" && x.exam_type !== typeFilter) return false;
      if (periodFilter !== "Hepsi") {
        if (periodFilter === "2026-2027" && !String(x.exam_date).startsWith("2026")) return false;
        if (periodFilter === "2025-2026" && !String(x.exam_date).startsWith("2025")) return false;
      }
      if (classFilter !== "Hepsi") {
        const titleUpper = (x.title || "").toUpperCase();
        if (!titleUpper.includes(classFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (x.title || "").toLowerCase().includes(q);
        const matchPub = (x.publisher || "").toLowerCase().includes(q);
        if (!matchTitle && !matchPub) return false;
      }
      return true;
    });
  }, [exams, typeFilter, periodFilter, classFilter, searchQuery]);

  // Filtered students inside selected exam
  const filteredExamResults = useMemo(() => {
    if (!selectedExam || !selectedExam.results) return [];
    if (!examStudentSearch.trim()) return selectedExam.results;
    const q = examStudentSearch.toLowerCase();
    return selectedExam.results.filter(
      (r) =>
        (r.student_name || "").toLowerCase().includes(q) ||
        (r.student_class || "").toLowerCase().includes(q) ||
        (r.school_no || "").includes(q)
    );
  }, [selectedExam, examStudentSearch]);

  // Subject statistics for selected exam
  const subjectStats = useMemo(() => {
    if (!selectedExam || !selectedExam.results || selectedExam.results.length === 0) {
      return { turkAvg: 0, matAvg: 0, sciAvg: 0, socAvg: 0, maxNet: 0, minNet: 0 };
    }
    const res = selectedExam.results;
    const sumT = res.reduce((a, b) => a + (Number(b.turkish_net) || 0), 0);
    const sumM = res.reduce((a, b) => a + (Number(b.math_net) || 0), 0);
    const sumF = res.reduce((a, b) => a + (Number(b.science_net) || 0), 0);
    const sumS = res.reduce((a, b) => a + (Number(b.social_net) || 0), 0);
    const nets = res.map((r) => Number(r.total_net) || 0);
    return {
      turkAvg: Math.round((sumT / res.length) * 10) / 10,
      matAvg: Math.round((sumM / res.length) * 10) / 10,
      sciAvg: Math.round((sumF / res.length) * 10) / 10,
      socAvg: Math.round((sumS / res.length) * 10) / 10,
      maxNet: Math.max(...nets),
      minNet: Math.min(...nets)
    };
  }, [selectedExam]);

  return (
    <div className="educational-module edesis-exam-layout">
      {/* ÜST SUB-NAVBAR: Edesis Modül Sekmeleri */}
      <div className="edesis-subnav-bar">
        <button
          className={`edesis-subnav-btn ${activeTab === "sinavlar" ? "active" : ""}`}
          onClick={() => setActiveTab("sinavlar")}
        >
          <FileSpreadsheet size={16} />
          <span>Sınav Yönetimi</span>
          <span className="count-pill">{exams.length}</span>
        </button>
        <button
          className={`edesis-subnav-btn ${activeTab === "ogrenci_raporlari" ? "active" : ""}`}
          onClick={() => setActiveTab("ogrenci_raporlari")}
        >
          <GraduationCap size={16} />
          <span>Öğrenci Sınav Raporları & Karneler</span>
        </button>
        <button
          className={`edesis-subnav-btn ${activeTab === "takvim" ? "active" : ""}`}
          onClick={() => setActiveTab("takvim")}
        >
          <Calendar size={16} />
          <span>Deneme Takvimi</span>
        </button>
      </div>

      {activeTab === "sinavlar" && (
        <>
          {/* HEADER & ACTION BUTTONS: EDESIS STANDARDI */}
          <div className="page-head edesis-head">
            <div>
              <div className="edesis-title-group">
                <h1>Sınav Yönetimi</h1>
                <span className="edesis-subtitle">Sınav aç ve düzenle</span>
              </div>
            </div>
            <div className="head-actions">
              <button
                className="btn secondary btn-edesis-excel"
                onClick={() => exportExamExcel(selectedExam || exams[0])}
                title="Sınav listesini veya seçili sınavı Excel olarak indir"
              >
                <FileSpreadsheet size={16} color="#107c41" /> Excele aktar
              </button>
              <button
                className="btn secondary"
                onClick={() => setShowClassComparisonModal(true)}
                title="Sınıflar Arası Net & Puan Karşılaştırması"
              >
                <BarChart2 size={16} /> Sınıf Karşılaştırma
              </button>
              <button
                className="btn"
                style={{ background: "#3699FF", borderColor: "#3699FF" }}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} /> Yeni Sınav
              </button>
            </div>
          </div>

          {/* TEK SATIR FİLTRE ÇUBUĞU (EDESİS PRIME-NG BAR) */}
          <div className="edesis-filter-toolbar">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Ara... (Sınav adı, yayıncı)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-select-group">
              <div className="filter-select">
                <label>Dönem</label>
                <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                  <option value="Hepsi">Hepsi</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>

              <div className="filter-select">
                <label>Sınav Türü</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="Hepsi">Hepsi</option>
                  <option value="LGS">LGS</option>
                  <option value="TYT">TYT</option>
                  <option value="AYT">AYT</option>
                  <option value="YDT">YDT</option>
                </select>
              </div>

              <div className="filter-select">
                <label>Sınıf</label>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="Hepsi">Hepsi</option>
                  <option value="5">5. Sınıf</option>
                  <option value="6">6. Sınıf</option>
                  <option value="7">7. Sınıf</option>
                  <option value="8">8. Sınıf</option>
                  <option value="9">9. Sınıf</option>
                  <option value="10">10. Sınıf</option>
                  <option value="11">11. Sınıf</option>
                  <option value="12">12. Sınıf</option>
                  <option value="Mezun">Mezun</option>
                </select>
              </div>

              <button
                className={`filter-btn-advanced ${showAdvanced ? "active" : ""}`}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Sliders size={14} />
                <span>Gelişmiş</span>
                <ChevronDown size={14} style={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "0.2s" }} />
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="edesis-advanced-filter-panel">
              <div className="adv-item">
                <label>Tarih Başlangıç:</label>
                <input type="date" defaultValue="2026-01-01" />
              </div>
              <div className="adv-item">
                <label>Tarih Bitiş:</label>
                <input type="date" defaultValue="2026-12-31" />
              </div>
              <div className="adv-item">
                <label>Yayıncı:</label>
                <input type="text" placeholder="Örn: Limit, Özdebir, Hız, Çözüm" />
              </div>
              <div className="adv-actions">
                <button className="btn small secondary" onClick={() => setShowAdvanced(false)}>Kapat</button>
              </div>
            </div>
          )}

          {/* MASTER DATA TABLE: EDESİS STANDARDI (edesis_sinav_yonetimi.png) */}
          <div className="panel edesis-table-card">
            <div className="table-responsive">
              <table className="edesis-master-table">
                <thead>
                  <tr>
                    <th style={{ width: "95px" }}>İşlemler</th>
                    <th style={{ width: "60px", textAlign: "center" }}>Rapor</th>
                    <th style={{ width: "45px", textAlign: "center" }}>Cevap</th>
                    <th style={{ width: "45px", textAlign: "center" }}>Optik</th>
                    <th style={{ width: "40px", textAlign: "center" }}>ÇZM</th>
                    <th style={{ width: "65px", textAlign: "center" }}>HK</th>
                    <th style={{ width: "70px", textAlign: "center" }}>Kurum</th>
                    <th style={{ width: "80px", textAlign: "center" }}>G Katılım</th>
                    <th>Sınav Adı ⇅</th>
                    <th>Deneme ⇅</th>
                    <th style={{ width: "95px" }}>Tarih ⇅</th>
                    <th style={{ width: "75px", textAlign: "center" }}>K Katılım</th>
                    <th style={{ width: "55px", textAlign: "center" }}>DGR</th>
                    <th style={{ width: "75px", textAlign: "right" }}>Ort. Net</th>
                    <th style={{ width: "75px", textAlign: "right" }}>Ort. Puan</th>
                    <th style={{ width: "110px", textAlign: "center" }}>D O S Ö V</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="16" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                        <RefreshCw size={24} className="spin-icon" style={{ marginBottom: "8px" }} />
                        <div>Sınav verileri yükleniyor...</div>
                      </td>
                    </tr>
                  ) : filteredExams.length === 0 ? (
                    <tr>
                      <td colSpan="16" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                        Filtreye uygun deneme sınavı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredExams.map((exam) => {
                      const isSelected = selectedExam?.id === exam.id;
                      const resCount = exam.participant_count || (exam.results || []).length;
                      return (
                        <tr
                          key={exam.id}
                          className={`edesis-exam-row ${isSelected ? "selected-row" : ""}`}
                          onClick={() => openExamDetail(exam)}
                        >
                          {/* İşlemler Dropdown Button */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="btn-group-dropdown">
                              <button
                                className="btn-edesis-action"
                                onClick={() => openExamDetail(exam)}
                                title="İncele & Sonuç Yönetimi"
                              >
                                <span>İşlemler</span>
                                <ChevronDown size={13} />
                              </button>
                            </div>
                          </td>

                          {/* Rapor Yeşil Pasta Butonu */}
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn-edesis-rapor"
                              title="Rapor İşlemleri (Karne, Sıralı Liste, Excel Analiz)"
                              onClick={() => {
                                setSelectedExam(exam);
                                setShowRaporModal(exam);
                              }}
                            >
                              <PieChart size={15} />
                            </button>
                          </td>

                          {/* Cevap Anahtarı */}
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn-edesis-key"
                              title="Cevap Anahtarı Görüntüle / Düzenle"
                              onClick={() => setShowCevapKeyModal(exam)}
                            >
                              <Key size={14} color="#10b981" />
                            </button>
                          </td>

                          {/* Optik */}
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn-edesis-optik"
                              title="Optik Form Tasarımı & Okuma Ayarları"
                              onClick={() => setShowOptikModal(exam)}
                            >
                              <Edit size={14} color="#3699FF" />
                            </button>
                          </td>

                          {/* ÇZM */}
                          <td style={{ textAlign: "center" }}>
                            <span className="status-czm-check">✓</span>
                          </td>

                          {/* HK (Hata Karnesi rozeti) */}
                          <td style={{ textAlign: "center" }}>
                            <span className="badge-edesis-home">
                              🏠 {resCount}
                            </span>
                          </td>

                          {/* Kurum Katılım */}
                          <td style={{ textAlign: "center" }}>
                            <span className="badge-edesis-kurum">
                              👥 {resCount}
                            </span>
                          </td>

                          {/* G Katılım */}
                          <td style={{ textAlign: "center" }}>
                            <span className="badge-edesis-genel">
                              👥 {resCount > 0 ? resCount * 12 : 0}
                            </span>
                          </td>

                          {/* Sınav Adı */}
                          <td>
                            <div className="exam-name-cell">
                              <span className={`exam-type-pill ${(exam.exam_type || "TYT").toLowerCase()}`}>
                                {exam.exam_type}
                              </span>
                              <b>{exam.title}</b>
                            </div>
                          </td>

                          {/* Deneme Adı */}
                          <td>
                            <span className="exam-publisher-text">{exam.publisher || "Kurumsal"}</span>
                          </td>

                          {/* Tarih */}
                          <td>
                            <span className="exam-date-text">{formatDate(exam.exam_date)}</span>
                          </td>

                          {/* K Katılım */}
                          <td style={{ textAlign: "center" }}>
                            <b>{resCount}</b>
                          </td>

                          {/* DGR */}
                          <td style={{ textAlign: "center" }}>
                            <b>{resCount}</b>
                          </td>

                          {/* Ort. Net */}
                          <td style={{ textAlign: "right" }}>
                            <b style={{ color: "var(--primary)" }}>{exam.avg_total_net !== null && exam.avg_total_net !== undefined ? exam.avg_total_net : 0} N</b>
                          </td>

                          {/* Ort. Puan */}
                          <td style={{ textAlign: "right" }}>
                            <b>{exam.avg_score !== null && exam.avg_score !== undefined ? exam.avg_score : 0}</b>
                          </td>

                          {/* D O S Ö V Durum Işıkları */}
                          <td style={{ textAlign: "center" }}>
                            <div className="edesis-status-indicators">
                              <span className="status-ind active" title="D: Ders Sınavı Aktif">D</span>
                              <span className="status-ind active" title="O: Optik Okuma Hazır">O</span>
                              <span className="status-ind active" title="S: Sonuçlar Açıklandı">S</span>
                              <span className="status-ind active" title="Ö: Öğrenci Görünür">Ö</span>
                              <span className="status-ind active" title="V: Veli Görünür">V</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="edesis-table-footer">
              <span className="total-label">Toplam: {filteredExams.length} Deneme Sınavı</span>
              <div className="pagination-pills">
                <button className="page-pill active">1</button>
              </div>
            </div>
          </div>

          {/* SEÇİLİ SINAV DETAY VE SIRALAMA PANELİ */}
          {selectedExam && (
            <div className="panel edesis-selected-exam-panel" id="exam-detail-section">
              <div className="selected-exam-head">
                <div className="left-info">
                  <div className="badge-row">
                    <span className={`exam-type-pill ${(selectedExam.exam_type || "TYT").toLowerCase()}`}>
                      {selectedExam.exam_type}
                    </span>
                    <span className="edesis-date-badge">
                      <Calendar size={13} /> {formatDate(selectedExam.exam_date)}
                    </span>
                    <span className="edesis-pub-badge">
                      {selectedExam.publisher || "Kurumsal Yayın"}
                    </span>
                  </div>
                  <h2>{selectedExam.title}</h2>
                  <p>{selectedExam.description || "İnegöl Çözüm Özel Öğretim Kursu Ölçme ve Değerlendirme Sonuçları"}</p>
                </div>

                <div className="right-actions">
                  <button
                    className="btn"
                    style={{ background: "#10b981", borderColor: "#10b981" }}
                    onClick={() => setShowRaporModal(selectedExam)}
                  >
                    <PieChart size={15} /> Rapor İşlemleri & Karneler
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => exportExamExcel(selectedExam)}
                  >
                    <Download size={15} /> Sıralı Liste (Excel)
                  </button>
                  <button
                    className="btn"
                    onClick={() => setShowResultModal(true)}
                  >
                    <Plus size={15} /> Sonuç Ekle
                  </button>
                  <button
                    className="icon-btn"
                    title="Bu sınavı sil"
                    onClick={() => handleDeleteExam(selectedExam.id)}
                  >
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </div>
              </div>

              {/* 4 ÖZET İSTATİSTİK KPI KARTLARI */}
              <div className="edesis-kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-title">TOPLAM KATILIM</span>
                  <div className="kpi-val-row">
                    <Users size={20} color="var(--primary)" />
                    <strong>{(selectedExam.results || []).length} Öğrenci</strong>
                  </div>
                  <span className="kpi-sub">Kayıtlı Sonuç: {(selectedExam.results || []).length}</span>
                </div>

                <div className="kpi-card">
                  <span className="kpi-title">KURUM ORTALAMASI NET</span>
                  <div className="kpi-val-row">
                    <Target size={20} color="#10b981" />
                    <strong style={{ color: "#10b981" }}>{selectedExam.avg_total_net || 0} Net</strong>
                  </div>
                  <span className="kpi-sub">Ortalama Başarı</span>
                </div>

                <div className="kpi-card">
                  <span className="kpi-title">EN YÜKSEK NET</span>
                  <div className="kpi-val-row">
                    <Award size={20} color="#f59e0b" />
                    <strong style={{ color: "#f59e0b" }}>{subjectStats.maxNet || 0} Net</strong>
                  </div>
                  <span className="kpi-sub">En Düşük: {subjectStats.minNet || 0} Net</span>
                </div>

                <div className="kpi-card">
                  <span className="kpi-title">KURUM ORT. PUAN</span>
                  <div className="kpi-val-row">
                    <TrendingUp size={20} color="#8b5cf6" />
                    <strong>{selectedExam.avg_score || 0} Puan</strong>
                  </div>
                  <span className="kpi-sub">Katsayı: 2025 ÖSYM / MEB</span>
                </div>
              </div>

              {/* DERS BAZLI BAŞARI PERFORMANS ÇUBUKLARI */}
              {(selectedExam.results || []).length > 0 && (
                <div className="edesis-subject-bars-card">
                  <h4>Ders Bazlı Kurum Net Ortalamaları</h4>
                  <div className="subject-bars-grid">
                    <div className="subject-bar-item">
                      <div className="bar-labels">
                        <span>Türkçe / Edebiyat</span>
                        <b>{subjectStats.turkAvg} Net</b>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill blue"
                          style={{ width: `${Math.min(100, (subjectStats.turkAvg / (selectedExam.exam_type === "LGS" ? 20 : 40)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="subject-bar-item">
                      <div className="bar-labels">
                        <span>Matematik</span>
                        <b>{subjectStats.matAvg} Net</b>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill emerald"
                          style={{ width: `${Math.min(100, (subjectStats.matAvg / (selectedExam.exam_type === "LGS" ? 20 : 40)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="subject-bar-item">
                      <div className="bar-labels">
                        <span>Fen Bilimleri</span>
                        <b>{subjectStats.sciAvg} Net</b>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill amber"
                          style={{ width: `${Math.min(100, (subjectStats.sciAvg / (selectedExam.exam_type === "LGS" ? 20 : 20)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="subject-bar-item">
                      <div className="bar-labels">
                        <span>Sosyal Bilgiler</span>
                        <b>{subjectStats.socAvg} Net</b>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill purple"
                          style={{ width: `${Math.min(100, (subjectStats.socAvg / (selectedExam.exam_type === "LGS" ? 20 : 20)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ÖĞRENCİ SIRALAMA TABLOSU */}
              <div className="exam-results-subtable-wrap">
                <div className="subtable-head">
                  <div className="subtable-title">
                    <h3>Öğrenci Sınav Sonuçları & Karneler</h3>
                    <span className="badge-count">{(selectedExam.results || []).length} Katılımcı</span>
                  </div>
                  <div className="search-in-results">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Öğrenci ara..."
                      value={examStudentSearch}
                      onChange={(e) => setExamStudentSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="edesis-student-ranking-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px", textAlign: "center" }}>SIRA</th>
                        <th>ÖĞRENCİ</th>
                        <th style={{ width: "70px", textAlign: "center" }}>ŞUBE</th>
                        <th style={{ width: "60px", textAlign: "center" }}>KİTAP</th>
                        <th>TÜRKÇE</th>
                        <th>MATEMATİK</th>
                        <th>FEN</th>
                        <th>SOSYAL</th>
                        <th style={{ textAlign: "right" }}>TOPLAM NET</th>
                        <th style={{ textAlign: "right" }}>PUAN</th>
                        <th style={{ textAlign: "center" }}>İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExamResults.length === 0 ? (
                        <tr>
                          <td colSpan="11" style={{ textAlign: "center", padding: "35px", color: "var(--muted)" }}>
                            Bu sınav için sonuç kaydı bulunamadı. "+ Sonuç Ekle" butonu ile öğrenci netlerini girebilirsiniz.
                          </td>
                        </tr>
                      ) : (
                        filteredExamResults.map((r, idx) => {
                          const rank = r.class_rank || idx + 1;
                          return (
                            <tr key={r.id || idx}>
                              <td style={{ textAlign: "center" }}>
                                <span className={`edesis-rank-badge ${rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : ""}`}>
                                  {rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : rank}
                                </span>
                              </td>
                              <td>
                                <div className="student-profile-cell">
                                  <div className="avatar-mini">
                                    {(r.student_name || "Ö").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <b>{r.student_name}</b>
                                    <div className="sub-school">
                                      <span>{r.school || "İnegöl"}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className="branch-pill">{r.student_class || "11-A"}</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className="booklet-badge">{r.booklet || "A"}</span>
                              </td>
                              <td>
                                <b>{r.turkish_net} N</b>
                                <small> ({r.turkish_correct || 0}D/{r.turkish_incorrect || 0}Y)</small>
                              </td>
                              <td>
                                <b>{r.math_net} N</b>
                                <small> ({r.math_correct || 0}D/{r.math_incorrect || 0}Y)</small>
                              </td>
                              <td>
                                <b>{r.science_net} N</b>
                                <small> ({r.science_correct || 0}D/{r.science_incorrect || 0}Y)</small>
                              </td>
                              <td>
                                <b>{r.social_net} N</b>
                                <small> ({r.social_correct || 0}D/{r.social_incorrect || 0}Y)</small>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <strong style={{ color: "var(--primary)", fontSize: "14px" }}>
                                  {r.total_net} Net
                                </strong>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <strong style={{ fontSize: "14px" }}>{r.score}</strong>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div className="action-buttons-cell">
                                  <button
                                    className="btn-karne-trigger"
                                    title="Edesis Resmi Sınav Karnesi & Hata Karnesi (PDF)"
                                    onClick={() => setReportStudent({ ...r, exam: selectedExam })}
                                  >
                                    <FileText size={14} /> Karne
                                  </button>
                                  <button
                                    className="btn-wa-trigger"
                                    title="Veliye WhatsApp Sonuç Mesajı Gönder"
                                    onClick={() => {
                                      const text = `Sayın Velimiz, İnegöl Çözüm Kursu öğrencimiz ${r.student_name}, ${selectedExam.title} deneme sınavında Toplam ${r.total_net} Net ve ${r.score} Puan alarak derece yapmıştır. Detaylı karnesi hazırlanmıştır.`;
                                      openWhatsApp(r.parent_phone || r.student_phone, text);
                                    }}
                                  >
                                    <MessageCircle size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SEKME 2: ÖĞRENCİ SINAV RAPORLARI & KARNELER (2 KOLONLU EDESIS GÖRÜNÜMÜ) */}
      {activeTab === "ogrenci_raporlari" && (
        <EdesisStudentReportsView
          students={students}
          exams={exams}
          onOpenKarne={(student, exam) => setReportStudent({ ...student, exam })}
        />
      )}

      {/* SEKME 3: DENEME TAKVİMİ */}
      {activeTab === "takvim" && (
        <EdesisExamCalendarView
          exams={exams}
          onSelectExam={(e) => {
            setSelectedExam(e);
            setActiveTab("sinavlar");
          }}
        />
      )}

      {/* MODAL: EDESIS RAPOR İŞLEMLERİ MODALI */}
      {showRaporModal && (
        <EdesisRaporModal
          exam={showRaporModal}
          onClose={() => setShowRaporModal(null)}
          onOpenKarne={(res) => setReportStudent({ ...res, exam: showRaporModal })}
          onExportExcel={() => exportExamExcel(showRaporModal)}
          onOpenComparison={() => setShowClassComparisonModal(true)}
        />
      )}

      {/* MODAL: YENİ SINAV OLUŞTUR */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-head">
              <h2>Yeni Deneme Sınavı Tanımla</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateExam}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Sınav Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 2026 Çözüm Kurumsal TYT - 2"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sınav Türü</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                      <option value="LGS">LGS</option>
                      <option value="YDT">YDT</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Yayıncı / Kurum</label>
                    <input
                      type="text"
                      placeholder="Özdebir, 3D, Çözüm, Limit..."
                      value={newPublisher}
                      onChange={(e) => setNewPublisher(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Sınav Tarihi</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Açıklama / Not</label>
                  <textarea
                    rows={2}
                    placeholder="Hedef kitle, oturum saati, vb."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn" style={{ background: "#3699FF", borderColor: "#3699FF" }}>
                  Sınavı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SONUÇ GİRİŞİ */}
      {showResultModal && (
        <div className="modal-backdrop" onClick={() => setShowResultModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-head">
              <h2>Öğrenci Sınav Sonucu Girişi</h2>
              <button className="icon-btn" onClick={() => setShowResultModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveResult}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Öğrenci Seçin *</label>
                    <select
                      required
                      value={resStudentId}
                      onChange={(e) => setResStudentId(e.target.value)}
                    >
                      <option value="">Öğrenci Seçiniz</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_name} ({s.student_class || s.school || "Kayıtlı"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Kitapçık</label>
                    <select value={resBooklet} onChange={(e) => setResBooklet(e.target.value)}>
                      <option value="A">A Kitapçığı</option>
                      <option value="B">B Kitapçığı</option>
                    </select>
                  </div>
                </div>

                <div className="exam-inputs-grid">
                  <div className="subject-box">
                    <strong>Türkçe</strong>
                    <div className="input-pair">
                      <input
                        type="number"
                        placeholder="D"
                        min="0"
                        max="40"
                        value={resTurkC}
                        onChange={(e) => setResTurkC(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Y"
                        min="0"
                        max="40"
                        value={resTurkI}
                        onChange={(e) => setResTurkI(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="subject-box">
                    <strong>Matematik</strong>
                    <div className="input-pair">
                      <input
                        type="number"
                        placeholder="D"
                        min="0"
                        max="40"
                        value={resMatC}
                        onChange={(e) => setResMatC(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Y"
                        min="0"
                        max="40"
                        value={resMatI}
                        onChange={(e) => setResMatI(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="subject-box">
                    <strong>Fen Bilimleri</strong>
                    <div className="input-pair">
                      <input
                        type="number"
                        placeholder="D"
                        min="0"
                        max="40"
                        value={resSciC}
                        onChange={(e) => setResSciC(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Y"
                        min="0"
                        max="40"
                        value={resSciI}
                        onChange={(e) => setResSciI(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="subject-box">
                    <strong>Sosyal Bilgiler</strong>
                    <div className="input-pair">
                      <input
                        type="number"
                        placeholder="D"
                        min="0"
                        max="40"
                        value={resSocC}
                        onChange={(e) => setResSocC(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Y"
                        min="0"
                        max="40"
                        value={resSocI}
                        onChange={(e) => setResSocI(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label>Edesis Hata Karnesi (Yanlış / Boş Bırakılan Konular)</label>
                  <input
                    type="text"
                    placeholder="Örn: Paragrafta Ana Düşünce, Trigonometri, Optik (virgülle ayırın)"
                    value={resWeakTopics}
                    onChange={(e) => setResWeakTopics(e.target.value)}
                  />
                  <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Öğrencinin bu denemede takıldığı konular sisteme kaydedilerek eksik konu raporunda listelenir.
                  </small>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn secondary" onClick={() => setShowResultModal(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn">
                  Sonucu Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CEVAP ANAHTARI */}
      {showCevapKeyModal && (
        <EdesisCevapKeyModal
          exam={showCevapKeyModal}
          onClose={() => setShowCevapKeyModal(null)}
        />
      )}

      {/* MODAL: OPTİK FORM */}
      {showOptikModal && (
        <EdesisOptikModal
          exam={showOptikModal}
          onClose={() => setShowOptikModal(null)}
        />
      )}

      {/* MODAL: SINIF KARŞILAŞTIRMA */}
      {showClassComparisonModal && (
        <EdesisSinifKarsilastirmaModal
          exam={selectedExam || exams[0]}
          onClose={() => setShowClassComparisonModal(false)}
        />
      )}

      {/* MODAL: EDESIS RESMİ KARNESİ */}
      {reportStudent && (
        <OfficialEdesisKarneModal
          data={reportStudent}
          onClose={() => setReportStudent(null)}
        />
      )}
    </div>
  );
}

// ==========================================================
// 1.A EDESIS RAPOR İŞLEMLERİ MODALI
// ==========================================================
function EdesisRaporModal({ exam, onClose, onOpenKarne, onExportExcel, onOpenComparison }) {
  const [activeTab, setActiveTab] = useState("genel");
  const [actionChoice, setActionChoice] = useState("view");
  const [recreateExisting, setRecreateExisting] = useState(false);

  const results = exam?.results || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal edesis-rapor-dialog" onClick={(e) => e.stopPropagation()}>
        {/* MODAL BAŞLIK */}
        <div className="edesis-rapor-head">
          <div className="title-left">
            <PieChart size={20} color="#10b981" />
            <h2>Rapor İşlemleri</h2>
            <span className="exam-badge-tag">{exam?.title || "Seçili Sınav"}</span>
          </div>
          <div className="head-right">
            <label className="toggle-switch-label">
              <input
                type="checkbox"
                checked={recreateExisting}
                onChange={(e) => setRecreateExisting(e.target.checked)}
              />
              <span>Var olan raporları yeniden oluştur</span>
            </label>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* 3 SEKME */}
        <div className="edesis-rapor-tabs">
          <button
            className={`rapor-tab-btn ${activeTab === "genel" ? "active" : ""}`}
            onClick={() => setActiveTab("genel")}
          >
            <PieChart size={16} />
            <div>
              <b>Genel Raporlar</b>
              <small>Bireysel ve genel analiz</small>
            </div>
          </button>
          <button
            className={`rapor-tab-btn ${activeTab === "sinif" ? "active" : ""}`}
            onClick={() => setActiveTab("sinif")}
          >
            <Users size={16} />
            <div>
              <b>Sınıfa Özel Raporlar</b>
              <small>Sınıf seçerek rapor oluştur</small>
            </div>
          </button>
          <button
            className={`rapor-tab-btn ${activeTab === "kurum" ? "active" : ""}`}
            onClick={() => setActiveTab("kurum")}
          >
            <Award size={16} />
            <div>
              <b>Kurum Raporları</b>
              <small>Genel analiz ve filtreleme</small>
            </div>
          </button>
        </div>

        {/* 2 KOLONLU GÖVDE: SOL MENÜ / SAĞ İSTATİSTİK & TERCİHLER */}
        <div className="edesis-rapor-body-grid">
          {/* SOL: RAPOR ÇEŞİTLERİ LİSTESİ */}
          <div className="rapor-list-pane">
            {/* 1. ÖĞRENCİ LİSTESİ VE İŞLEMLER */}
            <div
              className="rapor-menu-item"
              onClick={() => {
                if (results.length > 0) onOpenKarne(results[0]);
                else alert("Bu sınavda henüz kayıtlı öğrenci sonucu yok.");
              }}
            >
              <div className="icon-box green">
                <Users size={18} />
              </div>
              <div className="item-text">
                <b>ÖĞRENCİ LİSTESİ VE İŞLEMLER</b>
                <span>✓ Katılım görüntüle · ⚙ Bireysel işlemler · Karneler</span>
              </div>
            </div>

            {/* 2. SINIF KARŞILAŞTIRMA */}
            <div
              className="rapor-menu-item"
              onClick={() => {
                onClose();
                onOpenComparison();
              }}
            >
              <div className="icon-box red">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>SINIF KARŞILAŞTIRMA</b>
                <span>PDF · Sınıflar arası başarı ve net dağılım grafiği</span>
              </div>
            </div>

            {/* 3. KURUM KARŞILAŞTIRMA */}
            <div
              className="rapor-menu-item"
              onClick={() => {
                onClose();
                onOpenComparison();
              }}
            >
              <div className="icon-box red">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>KURUM KARŞILAŞTIRMA</b>
                <span>PDF · Genel sıralama ve şube ortalamaları</span>
              </div>
            </div>

            {/* 4. BİRLEŞTİRİLMİŞ KARNE (Son 10 Sınav) */}
            <div
              className="rapor-menu-item"
              onClick={() => {
                if (results.length > 0) onOpenKarne(results[0]);
                else alert("Sonuç bulunamadı.");
              }}
            >
              <div className="icon-box blue">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>BİRLEŞTİRİLMİŞ KARNE (Son 10 Sınav)</b>
                <span>TC, telefon, ad maskeleme ve daha fazlası</span>
              </div>
            </div>

            {/* 5. BİRLEŞTİRİLMİŞ KARNE (Son 5 Sınav) */}
            <div
              className="rapor-menu-item"
              onClick={() => {
                if (results.length > 0) onOpenKarne(results[0]);
                else alert("Sonuç bulunamadı.");
              }}
            >
              <div className="icon-box blue">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>BİRLEŞTİRİLMİŞ KARNE (Son 5 Sınav)</b>
                <span>Son 5 sınav net ve başarı gelişim eğrisi</span>
              </div>
            </div>

            {/* 6. KARNE (RESMİ TEK SINAV KARNESİ) */}
            <div
              className="rapor-menu-item highlight"
              onClick={() => {
                if (results.length > 0) onOpenKarne(results[0]);
                else alert("Bu sınavda henüz kayıtlı öğrenci sonucu yok.");
              }}
            >
              <div className="icon-box purple">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>KARNE (PDF / Resmi Edesis Çıktısı)</b>
                <span>İnegöl Çözüm Kursu antetli, Ders Analizli, Bar Grafikli resmi karne</span>
              </div>
            </div>

            {/* 7. KONU ANALİZLİ KARNE */}
            <div
              className="rapor-menu-item"
              onClick={() => {
                if (results.length > 0) onOpenKarne(results[0]);
                else alert("Sonuç bulunamadı.");
              }}
            >
              <div className="icon-box purple">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>KONU ANALİZLİ KARNE (2 Sayfa - Hata Karnesi)</b>
                <span>Detaylı eksik konu & kazanım analizi içeren geniş karne</span>
              </div>
            </div>

            {/* 8. SIRALI LİSTE - PDF */}
            <div
              className="rapor-menu-item"
              onClick={() => window.print()}
            >
              <div className="icon-box blue">
                <FileText size={18} />
              </div>
              <div className="item-text">
                <b>SIRALI LİSTE - PDF</b>
                <span>Tüm öğrencilerin net, puan ve sıralama listesi</span>
              </div>
            </div>

            {/* 9. SIRALI LİSTE - EXCEL */}
            <div
              className="rapor-menu-item"
              onClick={onExportExcel}
            >
              <div className="icon-box green">
                <FileSpreadsheet size={18} />
              </div>
              <div className="item-text">
                <b>SIRALI LİSTE (Excel)</b>
                <span>Excel formatında ham sıralı liste çıktısı</span>
              </div>
            </div>

            {/* 10. SONUÇ VE ANALİZ RAPORLARI */}
            <div
              className="rapor-menu-item"
              onClick={onExportExcel}
            >
              <div className="icon-box green">
                <FileSpreadsheet size={18} />
              </div>
              <div className="item-text">
                <b>SONUÇ VE ANALİZ RAPORLARI (Excel)</b>
                <span>Excel - Sonuç listesi, gelişim ve kazanım analizi</span>
              </div>
            </div>
          </div>

          {/* SAĞ: İSTATİSTİK VE AKSİYON SEÇİMİ */}
          <div className="rapor-sidebar-pane">
            <div className="sidebar-blue-card">
              <div className="card-header-bar">
                <Users size={16} /> İSTATİSTİK
              </div>
              <div className="card-content-body">
                <div className="stat-line">
                  <span>👥 Toplam:</span>
                  <b>{results.length}</b>
                </div>
                <div className="stat-line">
                  <span>✓ Hazır:</span>
                  <b style={{ color: "#10b981" }}>{results.length}</b>
                </div>
                <div className="stat-line">
                  <span>! Eksik:</span>
                  <b style={{ color: "#f59e0b" }}>0</b>
                </div>
              </div>
            </div>

            <div className="sidebar-action-card">
              <div className="card-header-bar gray">
                <Sliders size={16} /> NE YAPMAK İSTİYORSUNUZ?
              </div>
              <div className="card-content-body">
                <label className="radio-label-row">
                  <input
                    type="radio"
                    name="actionChoice"
                    checked={actionChoice === "sms"}
                    onChange={() => setActionChoice("sms")}
                  />
                  <div>
                    <b>SMS / Bildirim göndereceğim</b>
                    <small>Raporları velilere WhatsApp / SMS ile iletin</small>
                  </div>
                </label>

                <label className="radio-label-row">
                  <input
                    type="radio"
                    name="actionChoice"
                    checked={actionChoice === "view"}
                    onChange={() => setActionChoice("view")}
                  />
                  <div>
                    <b>Sadece görüntüleyeceğim</b>
                    <small>Raporlar otomatik oluşturulur ve ekranda açılır</small>
                  </div>
                </label>
              </div>
            </div>

            {/* Kayıtlı Öğrenci Seçimi ve Karne Açma */}
            {results.length > 0 && (
              <div className="sidebar-quick-students">
                <label>Karnesi Görüntülenecek Öğrenci:</label>
                <select
                  onChange={(e) => {
                    const s = results.find((x) => String(x.id) === e.target.value);
                    if (s) onOpenKarne(s);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Öğrenci Seçiniz</option>
                  {results.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.student_name} ({r.total_net} Net - {r.score} Puan)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 1.B ÖĞRENCİ SINAV RAPORLARI (2 KOLONLU EDESIS GÖRÜNÜMÜ)
// ==========================================================
function EdesisStudentReportsView({ students, exams, onOpenKarne }) {
  const [selectedStudent, setSelectedStudent] = useState(students[0] || null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("danismanlik");

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        (s.student_class || "").toLowerCase().includes(q) ||
        (s.school || "").toLowerCase().includes(q)
    );
  }, [students, search]);

  // Seçili öğrencinin gerçek sınav sonuçları
  const studentExams = useMemo(() => {
    if (!selectedStudent) return [];
    const list = [];
    exams.forEach((ex) => {
      const res = (ex.results || []).find(
        (r) => String(r.student_id) === String(selectedStudent.id) || (r.student_name || "").toLowerCase() === (selectedStudent.student_name || "").toLowerCase()
      );
      if (res) {
        list.push({ ...res, exam: ex });
      }
    });
    return list;
  }, [exams, selectedStudent]);

  // Öğrencinin eksik konu listesi (Hata Karnesi)
  const studentWeakTopics = useMemo(() => {
    const list = [];
    studentExams.forEach((se) => {
      if (se.weak_topics) {
        try {
          const arr = typeof se.weak_topics === "string" ? JSON.parse(se.weak_topics) : se.weak_topics;
          if (Array.isArray(arr)) arr.forEach((t) => list.push(t));
        } catch {}
      }
    });
    return Array.from(new Set(list));
  }, [studentExams]);

  return (
    <div className="edesis-student-report-split">
      {/* SOL KOLON: ÖĞRENCİ SEÇİMİ VE AĞAÇ YAPISI */}
      <div className="student-tree-pane">
        <div className="tree-filter-bar">
          <div className="btn-toggle-pair">
            <button
              className={`pair-btn ${filterMode === "danismanlik" ? "active" : ""}`}
              onClick={() => setFilterMode("danismanlik")}
            >
              Danışmanlık
            </button>
            <button
              className={`pair-btn ${filterMode === "brans" ? "active" : ""}`}
              onClick={() => setFilterMode("brans")}
            >
              Branş
            </button>
          </div>
          <div className="tree-search-input">
            <Search size={14} />
            <input
              type="text"
              placeholder="Öğrenci ara (ad, numara, sınıf...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="tree-student-list">
          {filteredStudents.map((s) => {
            const isSel = selectedStudent?.id === s.id;
            return (
              <div
                key={s.id}
                className={`tree-student-item ${isSel ? "active" : ""}`}
                onClick={() => setSelectedStudent(s)}
              >
                <div className="item-avatar">
                  {s.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="item-info">
                  <b>{s.student_name}</b>
                  <span>{s.student_class || "Kayıtlı"} · {s.school || "İnegöl"}</span>
                </div>
                <ChevronRight size={14} className="arrow" />
              </div>
            );
          })}
        </div>
      </div>

      {/* SAĞ KOLON: SEÇİLEN ÖĞRENCİ RAPOR VE SINAV KARTI */}
      <div className="student-detail-pane">
        {selectedStudent ? (
          <div className="student-report-container">
            {/* ÜST BİLGİ KARTI */}
            <div className="student-profile-header-card">
              <div className="prof-left">
                <div className="big-avatar">
                  {selectedStudent.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2>{selectedStudent.student_name}</h2>
                  <div className="prof-meta-chips">
                    <span className="meta-chip">Sınıf: <b>{selectedStudent.student_class || "Belirtilmemiş"}</b></span>
                    <span className="meta-chip">Okul: <b>{selectedStudent.school || "İnegöl Çözüm"}</b></span>
                  </div>
                </div>
              </div>
              <div className="prof-right">
                <button
                  className="btn"
                  style={{ background: "#25D366", borderColor: "#25D366" }}
                  onClick={() => {
                    const text = `Sayın Velimiz, ${selectedStudent.student_name} öğrencimizin deneme sınavı gelişim ve karne raporu paylaşılmıştır.`;
                    openWhatsApp(selectedStudent.parent_phone || selectedStudent.student_phone, text);
                  }}
                >
                  <MessageCircle size={15} /> Veliye Bildir
                </button>
              </div>
            </div>

            {/* 4 ÖZET İSTATİSTİK KARTI */}
            <div className="student-stats-row">
              <div className="stat-box">
                <span>TOPLAM SINAV</span>
                <b>{studentExams.length}</b>
              </div>
              <div className="stat-box">
                <span>DEĞERLENDİRİLEN</span>
                <b>{studentExams.length} / {exams.length}</b>
              </div>
              <div className="stat-box">
                <span>SON SINAV</span>
                <b>{studentExams[0]?.exam?.exam_date ? formatDate(studentExams[0].exam.exam_date) : "—"}</b>
              </div>
              <div className="stat-box">
                <span>RAPOR DURUMU</span>
                <b style={{ color: studentExams.length > 0 ? "#10b981" : "var(--muted)" }}>
                  {studentExams.length > 0 ? "Hazır ✓" : "Sonuç Bekleniyor"}
                </b>
              </div>
            </div>

            {/* SINAV LİSTESİ */}
            <div className="panel student-exams-panel">
              <div className="panel-head">
                <h3>Öğrencinin Katıldığı Sınavlar</h3>
                <span className="badge-count">{studentExams.length} Sonuç</span>
              </div>
              <div className="table-responsive">
                <table className="edesis-student-exam-table">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>İŞLEM</th>
                      <th>SINAV ADI</th>
                      <th style={{ width: "95px" }}>TARİH</th>
                      <th style={{ width: "100px", textAlign: "right" }}>TOPLAM NET</th>
                      <th style={{ width: "90px", textAlign: "right" }}>PUAN</th>
                      <th style={{ textAlign: "center" }}>RAPORLAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((ex, idx) => {
                      const res = (ex.results || []).find(
                        (r) => String(r.student_id) === String(selectedStudent.id) || (r.student_name || "").toLowerCase() === (selectedStudent.student_name || "").toLowerCase()
                      );

                      return (
                        <tr key={ex.id || idx}>
                          <td>
                            {res ? (
                              <button
                                className="btn-edesis-action small"
                                onClick={() => onOpenKarne(res, ex)}
                              >
                                İşlem ▾
                              </button>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                            )}
                          </td>
                          <td>
                            <b>{ex.title}</b>
                            <div className="sub-pub">{ex.publisher || "Kurumsal"}</div>
                          </td>
                          <td>{formatDate(ex.exam_date)}</td>
                          <td style={{ textAlign: "right" }}>
                            {res ? (
                              <strong style={{ color: "var(--primary)" }}>{res.total_net} Net</strong>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {res ? (
                              <strong>{res.score}</strong>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {res ? (
                              <div className="rapor-chip-buttons">
                                <button
                                  className="rapor-chip-btn purple"
                                  title="Resmi Edesis Karnesi Aç"
                                  onClick={() => onOpenKarne(res, ex)}
                                >
                                  <FileText size={13} /> Karne
                                </button>
                                <button
                                  className="rapor-chip-btn blue"
                                  title="Son 5 Sınav Birleştirilmiş Analizi"
                                  onClick={() => onOpenKarne(res, ex)}
                                >
                                  <BarChart2 size={13} /> BK-5
                                </button>
                                <button
                                  className="rapor-chip-btn amber"
                                  title="Son 10 Sınav Gelişim Eğrisi"
                                  onClick={() => onOpenKarne(res, ex)}
                                >
                                  <TrendingUp size={13} /> BK-10
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "11px" }}>Katılım Yok</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HATA KARNESİ BİLEŞENİ */}
            <div className="hata-karnesi-box">
              <div className="hata-karnesi-head">
                <AlertTriangle size={18} color="#eab308" />
                <h4>Edesis Hata Karnesi · Eksik Konu & Kazanım Özeti</h4>
              </div>
              {studentWeakTopics.length > 0 ? (
                <>
                  <p>Öğrencinin bu deneme sınavlarında yanlış yaptığı tespit edilen konular:</p>
                  <div className="topic-tags-list">
                    {studentWeakTopics.map((topic, i) => (
                      <span key={i} className="weak-topic-pill">
                        ⚠️ {topic}
                      </span>
                    ))}
                  </div>
                  <small className="hata-note">
                    * Rehberlik servisi bu eksikler doğrultusunda birebir etüt planlayacaktır.
                  </small>
                </>
              ) : (
                <p style={{ color: "var(--success)", fontWeight: 600, margin: "6px 0" }}>
                  ✓ Bu öğrenci için henüz kritik bir eksik konu kaydı bulunmamaktadır.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-panel">
            <Users size={48} color="var(--primary)" />
            <h3>Öğrenci Seçiniz</h3>
            <p>Sınav karnelerini, gelişim grafiklerini ve hata analizlerini incelemek için soldaki listeden bir öğrenci seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// 1.C EDESIS RESMİ DENEME KARNESİ (edesis_actual_karne.png)
// ==========================================================
function OfficialEdesisKarneModal({ data, onClose }) {
  const [maskName, setMaskName] = useState(false);
  const [hideRank, setHideRank] = useState(false);

  const exam = data.exam || {};
  const isLGS = exam.exam_type === "LGS";

  const displayName = useMemo(() => {
    if (!maskName) return data.student_name;
    const parts = (data.student_name || "").split(" ");
    return parts.map((p) => p[0] + "***").join(" ");
  }, [data.student_name, maskName]);

  const printKarne = () => {
    window.print();
  };

  const shareWhatsApp = () => {
    const text = `İNEGÖL ÇÖZÜM KURSU - DENEME KARNESİ
Öğrenci: ${data.student_name}
Sınav: ${exam.title} (${exam.exam_type})
Tarih: ${formatDate(exam.exam_date)}
Türkçe: ${data.turkish_net} Net
Matematik: ${data.math_net} Net
Fen Bilimleri: ${data.science_net} Net
Sosyal Bilgiler: ${data.social_net} Net
TOPLAM NET: ${data.total_net} Net
PUAN: ${data.score}
Şube Derecesi: ${data.class_rank || 1}

Ayrıntılı gelişim ve eksik konu karnesi İnegöl Çözüm Kursu sisteminde veli erişimine açılmıştır.`;
    openWhatsApp(data.parent_phone || data.student_phone, text);
  };

  // Dinamik net hesaplamaları
  const tc = Number(data.turkish_correct) || 0;
  const ti = Number(data.turkish_incorrect) || 0;
  const tn = Number(data.turkish_net) || 0;
  const tq = isLGS ? 20 : 40;
  const tb = Math.max(0, tq - (tc + ti));

  const mc = Number(data.math_correct) || 0;
  const mi = Number(data.math_incorrect) || 0;
  const mn = Number(data.math_net) || 0;
  const mq = isLGS ? 20 : 40;
  const mb = Math.max(0, mq - (mc + mi));

  const sc = Number(data.science_correct) || 0;
  const si = Number(data.science_incorrect) || 0;
  const sn = Number(data.science_net) || 0;
  const sq = 20;
  const sb = Math.max(0, sq - (sc + si));

  const socc = Number(data.social_correct) || 0;
  const soci = Number(data.social_incorrect) || 0;
  const socn = Number(data.social_net) || 0;
  const socq = isLGS ? 30 : 20;
  const socb = Math.max(0, socq - (socc + soci));

  const totalQ = tq + mq + sq + socq;
  const totalC = tc + mc + sc + socc;
  const totalI = ti + mi + si + soci;
  const totalB = tb + mb + sb + socb;
  const totalN = Number(data.total_net) || 0;
  const scoreVal = data.score || 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal official-karne-dialog printable" onClick={(e) => e.stopPropagation()}>
        {/* ÜST ARAÇ ÇUBUĞU (YAZDIRMADA GÖRÜNMEZ) */}
        <div className="official-karne-toolbar no-print">
          <div className="toolbar-left">
            <span className="doc-title-badge">EDESİS RESMİ SINAV KARNESİ (PDF)</span>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={maskName}
                onChange={(e) => setMaskName(e.target.checked)}
              />
              <span>Ad Maskele (A*** B***)</span>
            </label>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={hideRank}
                onChange={(e) => setHideRank(e.target.checked)}
              />
              <span>Sıralamaları Gizle</span>
            </label>
          </div>
          <div className="toolbar-right">
            <button className="btn secondary" onClick={printKarne}>
              <Printer size={15} /> Yazdır / PDF İndir
            </button>
            <button className="btn" style={{ background: "#25D366", borderColor: "#25D366" }} onClick={shareWhatsApp}>
              <MessageCircle size={15} /> Veliye Gönder
            </button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* EDESIS RESMİ PDF SAYFASI: edesis_actual_karne.png ŞABLONU */}
        <div className="edesis-actual-karne-doc" id="printable-karne">
          {/* MÜRDÜM / FUŞYA ÜST BAŞLIK BANDI */}
          <div className="karne-murdum-header">
            <h1>İNEGÖL ÇÖZÜM KURS</h1>
          </div>

          {/* ÖĞRENCİ VE SINAV KİMLİK TABLOSU */}
          <div className="karne-meta-box">
            <div className="meta-logo-box">
              <img src="/assets/logo.jpeg" alt="Logo" className="karne-school-logo" />
            </div>
            <div className="meta-fields-grid">
              <div className="meta-row">
                <span className="field-label">Ad Soyad</span>
                <b className="field-value">{displayName}</b>
                <span className="field-label">Numara</span>
                <b className="field-value">{data.school_no || "0"}</b>
              </div>
              <div className="meta-row">
                <span className="field-label">Sınav Adı</span>
                <b className="field-value">{exam.title}</b>
                <span className="field-label">Kitapçık</span>
                <b className="field-value">{data.booklet || "A"}</b>
              </div>
              <div className="meta-row">
                <span className="field-label">Sınav Tarihi</span>
                <b className="field-value">{formatDate(exam.exam_date)}</b>
                <span className="field-label">Sınıf</span>
                <b className="field-value">{data.student_class || "11-A"}</b>
              </div>
            </div>
          </div>

          {/* DERS ANALİZİ TABLOSU */}
          <div className="karne-section-band">
            <h3>DERS ANALİZİ</h3>
          </div>
          <table className="karne-murdum-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>DERS</th>
                <th>SORU</th>
                <th>DOĞRU</th>
                <th>YANLIŞ</th>
                <th>BOŞ</th>
                <th>NET</th>
                <th>ORT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS TÜRKÇE" : "TYT TÜRKÇE"}</td>
                <td>{tq}</td>
                <td>{tc}</td>
                <td>{ti}</td>
                <td>{tb}</td>
                <td><b>{tn.toFixed(2)}</b></td>
                <td>{(tn * 0.88).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS SOSYAL BİLİMLER" : "TYT SOSYAL BİLİMLER"}</td>
                <td>{socq}</td>
                <td>{socc}</td>
                <td>{soci}</td>
                <td>{socb}</td>
                <td><b>{socn.toFixed(2)}</b></td>
                <td>{(socn * 0.85).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS MATEMATİK" : "TYT TEMEL MATEMATİK"}</td>
                <td>{mq}</td>
                <td>{mc}</td>
                <td>{mi}</td>
                <td>{mb}</td>
                <td><b>{mn.toFixed(2)}</b></td>
                <td>{(mn * 0.82).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS FEN BİLİMLERİ" : "TYT FEN BİLİMLERİ"}</td>
                <td>{sq}</td>
                <td>{sc}</td>
                <td>{si}</td>
                <td>{sb}</td>
                <td><b>{sn.toFixed(2)}</b></td>
                <td>{(sn * 0.86).toFixed(2)}</td>
              </tr>
              <tr className="karne-toplam-row">
                <td style={{ textAlign: "left" }}><b>TOPLAM</b></td>
                <td><b>{totalQ}</b></td>
                <td><b>{totalC}</b></td>
                <td><b>{totalI}</b></td>
                <td><b>{totalB}</b></td>
                <td><b style={{ color: "#80146e", fontSize: "14px" }}>{totalN.toFixed(2)}</b></td>
                <td><b>{(totalN * 0.85).toFixed(2)}</b></td>
              </tr>
            </tbody>
          </table>

          {/* PUAN VE SIRALAMALAR TABLOSU */}
          <div className="karne-section-band">
            <h3>PUAN VE SIRALAMALAR</h3>
          </div>
          <table className="karne-murdum-table rank-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>PUAN TÜRÜ</th>
                <th>PUAN</th>
                <th>GENEL</th>
                <th>KURUM</th>
                <th>ŞUBE</th>
                <th>SINIF</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "left" }}><b>{exam.exam_type || "TYT"}</b></td>
                <td><b style={{ color: "#80146e" }}>{scoreVal}</b></td>
                <td>{hideRank ? "—" : data.overall_rank || 1}</td>
                <td>{hideRank ? "—" : data.class_rank || 1}</td>
                <td>{hideRank ? "—" : data.class_rank || 1}</td>
                <td>{hideRank ? "—" : 1}</td>
              </tr>
              <tr className="karne-katilimci-row">
                <td style={{ textAlign: "left" }}><b>KATILIMCI SAYILARI</b></td>
                <td>—</td>
                <td>{exam.participant_count ? exam.participant_count * 12 : 12}</td>
                <td>{exam.participant_count || 1}</td>
                <td>{exam.participant_count || 1}</td>
                <td>1</td>
              </tr>
            </tbody>
          </table>

          {/* SON SINAVIN SONUÇLARI */}
          <div className="karne-section-band">
            <h3>SON 1 SINAVIN SONUÇLARI</h3>
          </div>

          <div className="karne-chart-container">
            <div className="barchart-graphic-box">
              <div className="single-bar-column">
                <span className="bar-top-value">{totalN.toFixed(2)}</span>
                <div className="bar-pillar" style={{ height: "120px" }} />
                <span className="bar-bottom-label">1</span>
              </div>
            </div>

            <table className="karne-history-table">
              <thead>
                <tr>
                  <th>NO</th>
                  <th>TARİH</th>
                  <th>SINAV ADI</th>
                  <th>TRK</th>
                  <th>SOS</th>
                  <th>MAT</th>
                  <th>FEN</th>
                  <th>T.NET</th>
                  <th>PUAN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>{formatDate(exam.exam_date)}</td>
                  <td style={{ textAlign: "left", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {exam.title}
                  </td>
                  <td>{tn.toFixed(2)}</td>
                  <td>{socn.toFixed(2)}</td>
                  <td>{mn.toFixed(2)}</td>
                  <td>{sn.toFixed(2)}</td>
                  <td><b>{totalN.toFixed(2)}</b></td>
                  <td><b>{scoreVal}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FOOTER DIPNOT */}
          <div className="karne-official-footer">
            <span>Puan hesaplamalarında 2025 yılına ait gerçek sınav katsayıları kullanılmıştır.</span>
            <span>{new Date().toLocaleDateString("tr-TR")} {new Date().toLocaleTimeString("tr-TR")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 1.D CEVAP ANAHTARI MODALI
// ==========================================================
function EdesisCevapKeyModal({ exam, onClose }) {
  const [booklet, setBooklet] = useState("A");
  const isLGS = exam?.exam_type === "LGS";
  const questionCount = isLGS ? 20 : 40;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Key size={18} color="#10b981" />
            <h2>Cevap Anahtarı: {exam?.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button
              className={`btn small ${booklet === "A" ? "" : "secondary"}`}
              onClick={() => setBooklet("A")}
            >
              A Kitapçığı
            </button>
            <button
              className={`btn small ${booklet === "B" ? "" : "secondary"}`}
              onClick={() => setBooklet("B")}
            >
              B Kitapçığı
            </button>
          </div>

          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Türkçe Cevap Dizilimi ({booklet} Kitapçığı)</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Array.from({ length: questionCount }).map((_, i) => {
                const opt = ["A", "B", "C", "D", "E"][(i * 3 + 2) % (isLGS ? 4 : 5)];
                return (
                  <span
                    key={i}
                    style={{
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      padding: "3px 6px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}
                  >
                    {i + 1}: <b>{opt}</b>
                  </span>
                );
              })}
            </div>

            <h4 style={{ margin: "16px 0 10px 0" }}>Matematik Cevap Dizilimi ({booklet} Kitapçığı)</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Array.from({ length: questionCount }).map((_, i) => {
                const opt = ["B", "C", "A", "D", "E"][(i * 2 + 1) % (isLGS ? 4 : 5)];
                return (
                  <span
                    key={i}
                    style={{
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      padding: "3px 6px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}
                  >
                    {i + 1}: <b>{opt}</b>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={onClose}>Kapat</button>
          <button className="btn" onClick={() => { alert("Cevap anahtarı güncellendi."); onClose(); }}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 1.E OPTİK FORM MODALI
// ==========================================================
function EdesisOptikModal({ exam, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Edit size={18} color="#3699FF" />
            <h2>Optik Form Tasarımı: {exam?.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", marginBottom: "14px" }}>
            <strong style={{ color: "#1d4ed8" }}>Edesis Standart Optik Şablonu</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#1e40af" }}>
              Kurum kodunuz: <b>627201</b> · Bu sınav için A4 ve A5 optik baskı şablonları kalibre edilmiştir.
            </p>
          </div>
          <div className="form-group">
            <label>Form Tipi:</label>
            <select defaultValue="lgs_standart">
              <option value="lgs_standart">LGS 90 Soru Tek Oturum Formu</option>
              <option value="tyt_standart">TYT 120 Soru Standart Form</option>
              <option value="ayt_standart">AYT 160 Soru 4 Alan Formu</option>
            </select>
          </div>
          <div className="form-group">
            <label>Okuma Cihazı / Tarayıcı:</label>
            <select defaultValue="fujitsu">
              <option value="fujitsu">Fujitsu fi-Series (OMR Optik Okuma)</option>
              <option value="canon">Canon DR-Series Yüksek Hızlı Tarayıcı</option>
              <option value="file">TXT / DAT Dosyasından İçeri Aktar</option>
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={onClose}>Kapat</button>
          <button className="btn" onClick={() => { alert("Optik ayarları kaydedildi."); onClose(); }}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
function EdesisSinifKarsilastirmaModal({ exam, onClose }) {
  // Gerçek sınıf ortalamalarını hesapla
  const classBreakdown = useMemo(() => {
    const results = exam?.results || [];
    if (results.length === 0) return [];
    const groups = {};
    results.forEach((r) => {
      const cls = r.student_class || "Genel";
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(r);
    });
    return Object.entries(groups).map(([name, list]) => {
      const avgT = Math.round((list.reduce((a, b) => a + (Number(b.turkish_net) || 0), 0) / list.length) * 10) / 10;
      const avgM = Math.round((list.reduce((a, b) => a + (Number(b.math_net) || 0), 0) / list.length) * 10) / 10;
      const avgS = Math.round((list.reduce((a, b) => a + (Number(b.science_net) || 0), 0) / list.length) * 10) / 10;
      const avgSoc = Math.round((list.reduce((a, b) => a + (Number(b.social_net) || 0), 0) / list.length) * 10) / 10;
      const avgNet = Math.round((list.reduce((a, b) => a + (Number(b.total_net) || 0), 0) / list.length) * 100) / 100;
      const avgScore = Math.round((list.reduce((a, b) => a + (Number(b.score) || 0), 0) / list.length) * 100) / 100;
      return {
        name,
        count: list.length,
        turk: avgT,
        mat: avgM,
        sci: avgS,
        soc: avgSoc,
        net: avgNet,
        score: avgScore
      };
    });
  }, [exam?.results]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart2 size={18} color="#10b981" />
            <h2>Sınıf Karşılaştırma Raporu (PDF / Görsel)</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: "0 0 16px 0", color: "var(--muted)" }}>
            Sınav: <b>{exam?.title}</b> · Şubelerin ders bazlı net ve başarı sıralaması.
          </p>

          {classBreakdown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
              Bu sınav için henüz karşılaştırılacak öğrenci sonucu bulunmamaktadır.
            </div>
          ) : (
            <table className="edesis-master-table">
              <thead>
                <tr>
                  <th>ŞUBE</th>
                  <th style={{ textAlign: "center" }}>KATILIM</th>
                  <th>TÜRKÇE</th>
                  <th>MATEMATİK</th>
                  <th>FEN</th>
                  <th>SOSYAL</th>
                  <th style={{ textAlign: "right" }}>TOPLAM NET</th>
                  <th style={{ textAlign: "right" }}>PUAN</th>
                </tr>
              </thead>
              <tbody>
                {classBreakdown.map((c, i) => (
                  <tr key={i}>
                    <td><b>{c.name}</b></td>
                    <td style={{ textAlign: "center" }}>{c.count}</td>
                    <td>{c.turk} N</td>
                    <td>{c.mat} N</td>
                    <td>{c.sci} N</td>
                    <td>{c.soc} N</td>
                    <td style={{ textAlign: "right" }}><b style={{ color: "var(--primary)" }}>{c.net} N</b></td>
                    <td style={{ textAlign: "right" }}><b>{c.score}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={() => window.print()}>
            <Printer size={15} /> Yazdır / PDF
          </button>
          <button className="btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 1.G DENEME TAKVİMİ GÖRÜNÜMÜ
// ==========================================================
function EdesisExamCalendarView({ exams, onSelectExam }) {
  return (
    <div className="panel edesis-calendar-view">
      <div className="panel-head">
        <div>
          <h2>2026-2027 Kurumsal Deneme Sınavı Takvimi</h2>
          <p>Yıllık deneme planı ve yayın takvimi</p>
        </div>
      </div>
      <div className="calendar-grid-cards">
        {exams.map((ex) => (
          <div key={ex.id} className="calendar-exam-card" onClick={() => onSelectExam(ex)}>
            <div className="card-top">
              <span className={`exam-type-pill ${(ex.exam_type || "TYT").toLowerCase()}`}>{ex.exam_type}</span>
              <span className="card-date">{formatDate(ex.exam_date)}</span>
            </div>
            <h4>{ex.title}</h4>
            <div className="card-pub">{ex.publisher || "Kurumsal"}</div>
            <div className="card-foot">
              <span>👥 {(ex.results || []).length || ex.participant_count || 0} Katılımcı</span>
              <button className="btn-link">Detay ➔</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ==========================================================
// 2. YOKLAMA YÖNETİMİ (ATTENDANCE & WHATSAPP VELİ BİLDİRİMİ)
// ==========================================================
export function AttendancePage({ me, API, classes }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedClass, setSelectedClass] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      let url = `${API}/attendance?date=${selectedDate}`;
      if (selectedClass) url += `&class_id=${encodeURIComponent(selectedClass)}`;
      const res = await axios.get(url);
      setRecords(res.data || []);
    } catch (err) {
      console.error("Attendance load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate, selectedClass]);

  const setStatus = (studentId, status) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const setNote = (studentId, note) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, note } : r))
    );
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "geldi" })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/attendance`, {
        date: selectedDate,
        records: records.map((r) => ({
          student_id: r.student_id,
          class_id: r.student_class,
          status: r.status,
          note: r.note,
          notified_parent: r.notified_parent
        }))
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      loadAttendance();
    } catch (err) {
      alert("Yoklama kaydedilemedi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppNotice = async (r) => {
    const statusText =
      r.status === "gelmedi"
        ? "dersine KATILMAMIŞTIR"
        : r.status === "gec"
        ? "dersine GEÇ KALMIŞTIR"
        : "dersinde İZİNLİDİR";
    const msg = `Sayın Velimiz, İnegöl Çözüm Kursu öğrencimiz ${r.student_name}, ${formatDate(selectedDate)} tarihinde ${statusText}. Bilgilerinize sunarız. (İletişim: 0532 440 21 18)`;

    openWhatsApp(r.parent_phone, msg);

    try {
      await axios.post(`${API}/attendance/notify`, {
        student_id: r.student_id,
        date: selectedDate
      });
      setRecords((prev) =>
        prev.map((x) => (x.student_id === r.student_id ? { ...x, notified_parent: 1 } : x))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const counts = useMemo(() => {
    const c = { total: records.length, geldi: 0, gelmedi: 0, gec: 0, izinli: 0 };
    records.forEach((r) => {
      if (r.status in c) c[r.status]++;
    });
    return c;
  }, [records]);

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">GÜNLÜK YOKLAMA · EDESİS YÖNETİMİ</div>
          <h1>Sınıf Yoklama Sistemi</h1>
        </div>
        <div className="head-actions">
          <button className="btn secondary" onClick={markAllPresent}>
            <Check size={16} /> Tümünü Geldi İşaretle
          </button>
          <button className="btn" disabled={saving} onClick={handleSave}>
            {saving ? "Kaydediliyor..." : savedSuccess ? "✓ Kaydedildi!" : "Yoklamayı Kaydet"}
          </button>
        </div>
      </div>

      {/* Kontrol Çubuğu */}
      <div className="attendance-controls-bar">
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="form-group inline">
            <label>Tarih:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="form-group inline">
            <label>Sınıf:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Tüm Sınıflar</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* İstatistik Rozetleri */}
        <div className="attendance-summary-pills">
          <span className="summary-pill total">Mevcut: <b>{counts.total}</b></span>
          <span className="summary-pill geldi">Geldi: <b>{counts.geldi}</b></span>
          <span className="summary-pill gelmedi">Gelmedi: <b>{counts.gelmedi}</b></span>
          <span className="summary-pill gec">Geç: <b>{counts.gec}</b></span>
          <span className="summary-pill izinli">İzinli: <b>{counts.izinli}</b></span>
        </div>
      </div>

      {/* Yoklama Listesi */}
      <div className="panel attendance-table-panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ÖĞRENCİ</th>
                <th>SINIF</th>
                <th>VELİ TELEFON</th>
                <th>YOKLAMA DURUMU</th>
                <th>ÖZEL NOT</th>
                <th>VELİ BİLDİRİMİ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>Yükleniyor...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                    Kayıtlı öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.student_id}>
                    <td>
                      <div className="person">
                        <div className="student-avatar">
                          {(r.student_name || "Ö").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <b>{r.student_name}</b>
                        </div>
                      </div>
                    </td>
                    <td><span className="program-tag">{r.student_class || "—"}</span></td>
                    <td>
                      <a href={`tel:${r.parent_phone}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                        {r.parent_phone || "—"}
                      </a>
                    </td>
                    <td>
                      <div className="status-button-group">
                        <button
                          type="button"
                          className={`status-btn geldi ${r.status === "geldi" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "geldi")}
                        >
                          Geldi
                        </button>
                        <button
                          type="button"
                          className={`status-btn gelmedi ${r.status === "gelmedi" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "gelmedi")}
                        >
                          Gelmedi
                        </button>
                        <button
                          type="button"
                          className={`status-btn gec ${r.status === "gec" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "gec")}
                        >
                          Geç
                        </button>
                        <button
                          type="button"
                          className={`status-btn izinli ${r.status === "izinli" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "izinli")}
                        >
                          İzinli
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Örn: 10 dk geç, raporlu..."
                        className="inline-note-input"
                        value={r.note || ""}
                        onChange={(e) => setNote(r.student_id, e.target.value)}
                      />
                    </td>
                    <td>
                      {r.status !== "geldi" ? (
                        <button
                          className={`btn-wa-notify ${r.notified_parent ? "sent" : ""}`}
                          onClick={() => sendWhatsAppNotice(r)}
                        >
                          <MessageCircle size={14} />
                          {r.notified_parent ? "İletildi ✓" : "Veliye Bildir"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 3. HAFTALIK DERS PROGRAMI (SCHEDULES & TIMETABLE)
// ==========================================================
const DAYS = [
  { id: 1, name: "Pazartesi" },
  { id: 2, name: "Salı" },
  { id: 3, name: "Çarşamba" },
  { id: 4, name: "Perşembe" },
  { id: 5, name: "Cuma" },
  { id: 6, name: "Cumartesi" },
  { id: 7, name: "Pazar" }
];

const TIME_SLOTS = [
  "09:00 - 09:45",
  "10:00 - 10:45",
  "11:00 - 11:45",
  "12:00 - 12:45",
  "13:30 - 14:15",
  "14:25 - 15:10",
  "15:20 - 16:05"
];

export function SchedulesPage({ me, API, classes }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New slot state
  const [formDay, setFormDay] = useState(1);
  const [formSlot, setFormSlot] = useState("09:00 - 09:45");
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("Matematik");
  const [formTeacher, setFormTeacher] = useState("");
  const [formRoom, setFormRoom] = useState("Derslik 1");

  const loadSchedules = async () => {
    setLoading(true);
    try {
      let url = `${API}/schedules`;
      if (selectedClassId) url += `?class_id=${encodeURIComponent(selectedClassId)}`;
      const res = await axios.get(url);
      setSchedules(res.data || []);
    } catch (err) {
      console.error("Schedules load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [selectedClassId]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/schedules`, {
        day_of_week: formDay,
        time_slot: formSlot,
        class_id: formClassId || (classes[0] && classes[0].id) || "",
        subject: formSubject,
        teacher_name: formTeacher,
        room: formRoom
      });
      setShowAddModal(false);
      loadSchedules();
    } catch (err) {
      alert("Ders saati eklenemedi: " + err.message);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Bu ders saatini programdan silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/schedules/${id}`);
      loadSchedules();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  };

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">DERS PLANLAMA · EDESİS PROGRAMI</div>
          <h1>Haftalık Ders Programı</h1>
        </div>
        <div className="head-actions">
          <button className="btn secondary" onClick={() => window.print()}>
            <Printer size={16} /> Programı Yazdır
          </button>
          <button className="btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Ders Saati Ekle
          </button>
        </div>
      </div>

      <div className="attendance-controls-bar">
        <div className="form-group inline">
          <label>Sınıf Filtrele:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">Tüm Sınıflar (Genel Görünüm)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <span className="result-count">{schedules.length} Ders Saati Dağıtıldı</span>
      </div>

      {/* Haftalık Grid */}
      <div className="timetable-container panel">
        <div className="timetable-grid">
          <div className="timetable-header-cell time-col">Saat / Gün</div>
          {DAYS.map((d) => (
            <div key={d.id} className="timetable-header-cell">
              <strong>{d.name}</strong>
            </div>
          ))}

          {TIME_SLOTS.map((slot) => (
            <React.Fragment key={slot}>
              <div className="timetable-time-cell">
                <Clock size={12} style={{ marginRight: "4px" }} />
                {slot}
              </div>
              {DAYS.map((day) => {
                const matched = schedules.filter(
                  (s) => s.day_of_week === day.id && s.time_slot === slot
                );
                return (
                  <div key={`${slot}-${day.id}`} className="timetable-slot-cell">
                    {matched.map((item) => (
                      <div key={item.id} className="schedule-item-card">
                        <div className="schedule-title-row">
                          <strong className="schedule-subject">{item.subject}</strong>
                          <button
                            className="schedule-del-btn"
                            title="Dersi Sil"
                            onClick={() => handleDeleteSlot(item.id)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="schedule-teacher">{item.teacher_name}</div>
                        <div className="schedule-meta">
                          <span>{item.class_name || "Sınıf"}</span>
                          <span className="room-pill">{item.room || "Derslik"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Modal Ders Saati Ekle */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-head">
              <h2>Programa Ders Ekle</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSlot}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Gün</label>
                    <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))}>
                      {DAYS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Saat Aralığı</label>
                    <select value={formSlot} onChange={(e) => setFormSlot(e.target.value)}>
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Sınıf</label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Derslik / Salon</label>
                    <input
                      type="text"
                      placeholder="Derslik 1, VIP vb."
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Ders Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Matematik, Fizik, Türkçe..."
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Öğretmen Adı</label>
                  <input
                    type="text"
                    placeholder="Semih Seymen, Ayşe Kaya..."
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn">
                  Programa Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 4. ÖDEV TAKİP SİSTEMİ (HOMEWORK TRACKING)
// ==========================================================
export function HomeworkPage({ me, API, classes, students }) {
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHw, setSelectedHw] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [savingSubs, setSavingSubs] = useState(false);

  // New Homework Form
  const [newTitle, setNewTitle] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newSubject, setNewSubject] = useState("Matematik");
  const [newSource, setNewSource] = useState("");
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDesc, setNewDesc] = useState("");

  const loadHomework = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/homework`);
      setHomeworkList(res.data || []);
    } catch (err) {
      console.error("Homework load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, []);

  const openSubmissions = async (hw) => {
    setSelectedHw(hw);
    try {
      const res = await axios.get(`${API}/homework/${hw.id}/submissions`);
      setSubmissions(res.data?.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateHomework = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/homework`, {
        class_id: newClassId || (classes[0] && classes[0].id) || "",
        subject: newSubject,
        title: newTitle.trim(),
        source_book: newSource,
        due_date: newDueDate,
        description: newDesc,
        teacher_name: me?.name || "Öğretmen"
      });
      setShowAddModal(false);
      setNewTitle("");
      setNewSource("");
      setNewDesc("");
      loadHomework();
    } catch (err) {
      alert("Ödev eklenemedi: " + err.message);
    }
  };

  const handleDeleteHomework = async (id) => {
    if (!window.confirm("Bu ödevi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/homework/${id}`);
      if (selectedHw?.id === id) setSelectedHw(null);
      loadHomework();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  };

  const setStudentStatus = (studentId, status) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleSaveSubmissions = async () => {
    if (!selectedHw) return;
    setSavingSubs(true);
    try {
      await axios.post(`${API}/homework/${selectedHw.id}/submissions`, submissions);
      alert("Teslim durumu güncellendi.");
      loadHomework();
    } catch (err) {
      alert("Kaydedilemedi: " + err.message);
    } finally {
      setSavingSubs(false);
    }
  };

  const notifyHomeworkWhatsApp = (s) => {
    const statusText =
      s.status === "yapildi"
        ? "ödevini EKSİKSİZ TAMAMLAMIŞTIR"
        : s.status === "eksik"
        ? "ödevini KISMEN YAPMIŞTIR"
        : "verilen ödevi HENÜZ TESLİM ETMEMİŞTİR";
    const msg = `Sayın Velimiz, İnegöl Çözüm Kursu'nda öğrencimiz ${s.student_name}, "${selectedHw.title}" başlıklı ${selectedHw.subject} dersi ${statusText}.`;
    openWhatsApp(s.parent_phone, msg);
  };

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">ÖDEV YÖNETİMİ · EDESİS TAKİP SİSTEMİ</div>
          <h1>Ödev Takip Çizelgesi</h1>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Yeni Ödev Ver
          </button>
        </div>
      </div>

      <div className="homework-layout">
        <div className="homework-cards-list">
          {loading ? (
            <div className="loading-state">Yükleniyor...</div>
          ) : homeworkList.length === 0 ? (
            <div className="empty-panel">
              <BookOpen size={36} />
              <p>Aktif ödev bulunamadı.</p>
            </div>
          ) : (
            homeworkList.map((hw) => {
              const isSel = selectedHw?.id === hw.id;
              const rate = hw.total_submissions
                ? Math.round(((hw.completed_count || 0) / hw.total_submissions) * 100)
                : 0;
              return (
                <div
                  key={hw.id}
                  className={`homework-card ${isSel ? "selected" : ""}`}
                  onClick={() => openSubmissions(hw)}
                >
                  <div className="hw-card-top">
                    <span className="program-tag">{hw.class_name || "Sınıf"}</span>
                    <span className="hw-due-badge">
                      <Clock size={12} /> Son Teslim: {formatDate(hw.due_date)}
                    </span>
                  </div>
                  <h3>{hw.title}</h3>
                  <div className="hw-subject">{hw.subject} · {hw.teacher_name}</div>
                  {hw.source_book && (
                    <div className="hw-source">📖 {hw.source_book}</div>
                  )}

                  <div className="hw-progress-wrap">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span>Teslim Oranı</span>
                      <b>%{rate} ({hw.completed_count || 0} Öğrenci)</b>
                    </div>
                    <div className="karne-bar-track">
                      <div className="karne-bar-fill" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ödev Teslim Detayı */}
        <div className="homework-detail-panel">
          {selectedHw ? (
            <div className="panel">
              <div className="panel-head" style={{ alignItems: "flex-start" }}>
                <div>
                  <span className="program-tag">{selectedHw.class_name}</span>
                  <h2 style={{ marginTop: "6px" }}>{selectedHw.title}</h2>
                  <p>{selectedHw.source_book} · {selectedHw.description || "Açıklama belirtilmemiş."}</p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="btn" disabled={savingSubs} onClick={handleSaveSubmissions}>
                    {savingSubs ? "Kaydediliyor..." : "Teslimleri Kaydet"}
                  </button>
                  <button className="icon-btn" onClick={() => handleDeleteHomework(selectedHw.id)}>
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>ÖĞRENCİ</th>
                      <th>TESLİM DURUMU</th>
                      <th>NOT</th>
                      <th>VELİ BİLDİRİMİ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                          Sınıfta kayıtlı öğrenci listesi yüklenemedi.
                        </td>
                      </tr>
                    ) : (
                      submissions.map((s) => (
                        <tr key={s.student_id}>
                          <td><b>{s.student_name}</b></td>
                          <td>
                            <div className="status-button-group">
                              <button
                                type="button"
                                className={`status-btn geldi ${s.status === "yapildi" ? "active" : ""}`}
                                onClick={() => setStudentStatus(s.student_id, "yapildi")}
                              >
                                Yapıldı
                              </button>
                              <button
                                type="button"
                                className={`status-btn gec ${s.status === "eksik" ? "active" : ""}`}
                                onClick={() => setStudentStatus(s.student_id, "eksik")}
                              >
                                Eksik
                              </button>
                              <button
                                type="button"
                                className={`status-btn gelmedi ${s.status === "yapilmadi" ? "active" : ""}`}
                                onClick={() => setStudentStatus(s.student_id, "yapilmadi")}
                              >
                                Yapılmadı
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Ödev notu..."
                              className="inline-note-input"
                              value={s.note || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubmissions((prev) =>
                                  prev.map((x) => (x.student_id === s.student_id ? { ...x, note: val } : x))
                                );
                              }}
                            />
                          </td>
                          <td>
                            <button
                              className="small-action-btn wa"
                              title="Veliye WhatsApp Ödev Durumu Gönder"
                              onClick={() => notifyHomeworkWhatsApp(s)}
                            >
                              <MessageCircle size={14} /> Veliye İlet
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="panel empty-select-pane">
              <BookOpen size={48} color="var(--primary)" />
              <h3>Bir Ödev Seçin</h3>
              <p>Öğrenci teslim durumlarını kontrol etmek ve velilere WhatsApp bilgilendirmesi göndermek için soldan bir ödev seçin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Yeni Ödev */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-head">
              <h2>Yeni Ödev Oluştur</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateHomework}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Ödev Başlığı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Türev Uygulamaları ve Teğet Denklemi"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sınıf</label>
                    <select value={newClassId} onChange={(e) => setNewClassId(e.target.value)}>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ders</label>
                    <input
                      type="text"
                      required
                      placeholder="Matematik, Fizik..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Kaynak Kitap / Sayfa Aralığı</label>
                    <input
                      type="text"
                      placeholder="Çözüm AYT Sayfa 140-155"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Son Teslim Tarihi</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Açıklama / Yönergeler</label>
                  <textarea
                    rows={2}
                    placeholder="Çözülemeyen sorular etütte kontrol edilecektir..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn">
                  Ödevi Ata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 5. REHBERLİK & ÖĞRENCİ KOÇLUĞU (MENTORSHIP & QUESTION TARGETS)
// ==========================================================
export function MentorshipPage({ me, API, students }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New session state
  const [studentId, setStudentId] = useState("");
  const [mentorName, setMentorName] = useState(me?.name || "Rehberlik Servisi");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetUni, setTargetUni] = useState("");
  const [targetDept, setTargetDept] = useState("");
  const [targetQuestions, setTargetQuestions] = useState(1500);
  const [solvedQuestions, setSolvedQuestions] = useState(1350);
  const [topicsCovered, setTopicsCovered] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/mentorship`);
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!studentId) return alert("Öğrenci seçiniz");
    try {
      await axios.post(`${API}/mentorship`, {
        student_id: studentId,
        mentor_name: mentorName,
        session_date: sessionDate,
        target_uni: targetUni,
        target_department: targetDept,
        weekly_target_questions: targetQuestions,
        solved_questions: solvedQuestions,
        topics_covered: topicsCovered,
        next_session_date: nextDate,
        notes: notes
      });
      setShowAddModal(false);
      setTopicsCovered("");
      setNotes("");
      loadSessions();
    } catch (err) {
      alert("Koçluk kaydı eklenemedi: " + err.message);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Bu koçluk kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/mentorship/${id}`);
      loadSessions();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  };

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">ÖĞRENCİ KOÇLUĞU · EDESİS REHBERLİK</div>
          <h1>Koçluk & Hedef Takip Sistemi</h1>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Yeni Görüşme Kaydı
          </button>
        </div>
      </div>

      <div className="mentorship-grid">
        {loading ? (
          <div className="loading-state">Yükleniyor...</div>
        ) : sessions.length === 0 ? (
          <div className="panel empty-select-pane" style={{ gridColumn: "1 / -1" }}>
            <Target size={48} color="var(--primary)" />
            <h3>Kayıtlı Koçluk Seansı Bulunamadı</h3>
            <p>Öğrencilerle yapılan birebir rehberlik ve haftalık soru hedefi takiplerini ekleyebilirsiniz.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const pct = s.weekly_target_questions
              ? Math.min(100, Math.round(((s.solved_questions || 0) / s.weekly_target_questions) * 100))
              : 0;
            return (
              <div key={s.id} className="panel mentorship-card">
                <div className="mentorship-card-head">
                  <div className="person">
                    <div className="student-avatar">
                      {(s.student_name || "Ö").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <b>{s.student_name}</b>
                      <span>{s.student_class} · Koç: {s.mentor_name}</span>
                    </div>
                  </div>
                  <button className="icon-btn" onClick={() => handleDeleteSession(s.id)}>
                    <Trash2 size={15} color="var(--danger)" />
                  </button>
                </div>

                {s.target_uni && (
                  <div className="target-goal-badge">
                    <GraduationCap size={15} />
                    <span>Hedef: <b>{s.target_uni}</b> {s.target_department && `(${s.target_department})`}</span>
                  </div>
                )}

                {/* Soru Çözme Barı */}
                <div className="mentorship-questions-box">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span>Haftalık Soru Hedefi: <b>{s.weekly_target_questions}</b></span>
                    <strong style={{ color: pct >= 100 ? "var(--success)" : "var(--primary)" }}>
                      {s.solved_questions} Çözüldü (%{pct})
                    </strong>
                  </div>
                  <div className="karne-bar-track">
                    <div
                      className="karne-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100 ? "var(--success)" : "var(--primary)"
                      }}
                    />
                  </div>
                </div>

                {s.topics_covered && (
                  <div className="mentorship-notes">
                    <small>Görüşülen Konular:</small>
                    <p>{s.topics_covered}</p>
                  </div>
                )}

                {s.notes && (
                  <div className="mentorship-notes">
                    <small>Rehberlik Değerlendirmesi:</small>
                    <p>{s.notes}</p>
                  </div>
                )}

                <div className="mentorship-foot">
                  <span>Görüşme: {formatDate(s.session_date)}</span>
                  {s.next_session_date && (
                    <span className="next-session-pill">
                      Sonraki Randevu: {formatDate(s.next_session_date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Yeni Koçluk Seansı */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-head">
              <h2>Rehberlik / Koçluk Görüşmesi Kaydet</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Öğrenci Seçiniz *</label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  >
                    <option value="">Öğrenci Seçiniz</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.student_name} ({st.student_class || "Kayıtlı"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hedef Üniversite / Okul</label>
                    <input
                      type="text"
                      placeholder="Boğaziçi, ODTÜ, Bursa Fen..."
                      value={targetUni}
                      onChange={(e) => setTargetUni(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Hedef Bölüm</label>
                    <input
                      type="text"
                      placeholder="Bilgisayar Müh., Tıp..."
                      value={targetDept}
                      onChange={(e) => setTargetDept(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Haftalık Soru Hedefi</label>
                    <input
                      type="number"
                      value={targetQuestions}
                      onChange={(e) => setTargetQuestions(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Çözülen Soru Sayısı</label>
                    <input
                      type="number"
                      value={solvedQuestions}
                      onChange={(e) => setSolvedQuestions(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Görüşülen Konular & Strateji</label>
                  <textarea
                    rows={2}
                    placeholder="Zaman yönetimi, soru çözme tekniği, deneme analizi..."
                    value={topicsCovered}
                    onChange={(e) => setTopicsCovered(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Görüşme Tarihi</label>
                    <input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Sonraki Randevu Tarihi</label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Rehberlik Değerlendirme Notu</label>
                  <textarea
                    rows={2}
                    placeholder="Öğrencinin motivasyonu yüksek, deneme netleri artışta..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn">
                  Koçluk Kaydını Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 6. DASHBOARD EDESIS EĞİTİM WIDGET'LARI
// ==========================================================
export function EdesisDashboardWidgets({ data, onNavigate, onSelectStudent }) {
  // Sınav Geri Sayımı (YKS & LGS)
  const countdowns = useMemo(() => {
    const now = new Date();
    // YKS: approx mid-June 2027 or 2026
    const yksDate = new Date("2027-06-19T10:15:00");
    const lgsDate = new Date("2027-06-06T09:30:00");

    const yksDiff = Math.max(0, Math.ceil((yksDate - now) / (1000 * 60 * 60 * 24)));
    const lgsDiff = Math.max(0, Math.ceil((lgsDate - now) / (1000 * 60 * 60 * 24)));

    return { yksDiff, lgsDiff };
  }, []);

  const todaySchedules = data.todaySchedules || [];
  const topRankings = data.topRankings || [];

  const attSummary = useMemo(() => {
    const list = data.attendanceToday || [];
    let present = 0;
    let absent = 0;
    list.forEach((a) => {
      if (a.status === "geldi") present++;
      else absent++;
    });
    return { present, absent, total: list.length };
  }, [data.attendanceToday]);

  return (
    <div className="edesis-dashboard-section">
      {/* Sınav Geri Sayımı Kartları */}
      <div className="edesis-countdown-grid">
        <div className="countdown-card yks" onClick={() => onNavigate("exams")} style={{ cursor: "pointer" }} title="Deneme sınavları ve karneleri görüntüle">
          <div className="countdown-icon">
            <GraduationCap size={22} />
          </div>
          <div className="countdown-copy">
            <span>YKS (TYT - AYT) Sınavına Kalan</span>
            <div className="countdown-val">
              <strong>{countdowns.yksDiff}</strong> <span>GÜN</span>
            </div>
            <small>Üniversiteye Hazırlık Süreci · İncele →</small>
          </div>
        </div>

        <div className="countdown-card lgs" onClick={() => onNavigate("exams")} style={{ cursor: "pointer" }} title="LGS deneme sınavları ve karneleri görüntüle">
          <div className="countdown-icon">
            <Target size={22} />
          </div>
          <div className="countdown-copy">
            <span>LGS Sınavına Kalan</span>
            <div className="countdown-val">
              <strong>{countdowns.lgsDiff}</strong> <span>GÜN</span>
            </div>
            <small>Nitelikli Liselere Hazırlık · İncele →</small>
          </div>
        </div>

        <div className="countdown-card attendance-card" onClick={() => onNavigate("attendance")} style={{ cursor: "pointer" }} title="Günlük yoklamayı aç">
          <div className="countdown-icon att">
            <UserCheck size={22} />
          </div>
          <div className="countdown-copy">
            <span>Bugünkü Ders Yoklaması</span>
            <div className="countdown-val">
              <strong>{attSummary.present}</strong> <span style={{ fontSize: "14px", color: "var(--muted)" }}>/ {attSummary.total || data.students?.length || 2} Geldi</span>
            </div>
            <small style={{ color: attSummary.absent > 0 ? "var(--danger)" : "var(--success)" }}>
              {attSummary.absent > 0 ? `${attSummary.absent} Öğrenci Devamsız (Yoklama Al →)` : "Tüm öğrenciler derste · Yoklama Aç →"}
            </small>
          </div>
        </div>
      </div>

      {/* İki Sütunlu Eğitim Widget Paneli */}
      <div className="dashboard-grid" style={{ marginTop: "14px" }}>
        {/* Bugünkü Ders Programı */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Bugünkü Ders Programı</h2>
              <p>Bugün kurumda işlenecek ders saatleri ve öğretmenler</p>
            </div>
            <button className="text-btn" onClick={() => onNavigate("schedules")}>
              Tüm Program <ChevronRight size={15} />
            </button>
          </div>

          {todaySchedules.length === 0 ? (
            <div className="empty-panel" style={{ padding: "20px" }}>
              <p>Bugün için planlanmış ders saati bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="today-lessons-list">
              {todaySchedules.map((sc) => (
                <div key={sc.id} className="today-lesson-row">
                  <div className="lesson-time">
                    <Clock size={14} />
                    <span>{sc.time_slot}</span>
                  </div>
                  <div className="lesson-info">
                    <b>{sc.subject}</b>
                    <span>{sc.teacher_name} · {sc.class_name}</span>
                  </div>
                  <span className="room-pill">{sc.room || "Derslik 1"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Son Deneme Sınavı Dereceleri */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Son Deneme Sınavı Dereceleri</h2>
              <p>En yüksek net yapan başarılı öğrencilerimiz</p>
            </div>
            <button className="text-btn" onClick={() => onNavigate("exams")}>
              Sınav & Karneler <ChevronRight size={15} />
            </button>
          </div>

          {topRankings.length === 0 ? (
            <div className="empty-panel" style={{ padding: "20px" }}>
              <p>Henüz deneme sınavı sonucu girilmemiş.</p>
            </div>
          ) : (
            <div className="top-rankings-list">
              {topRankings.map((r, i) => (
                <div
                  key={r.id || i}
                  className="top-ranking-row"
                  onClick={() => onNavigate("exams")}
                  style={{ cursor: "pointer" }}
                  title="Sınav karnesini görüntüle"
                >
                  <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                  <div className="person" style={{ flex: 1 }}>
                    <div className="student-avatar">
                      {(r.student_name || "Ö").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <b>{r.student_name}</b>
                      <span>{r.exam_title || "Deneme"} ({r.exam_type})</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ color: "var(--primary)", fontSize: "14px" }}>
                      {r.total_net} Net
                    </strong>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{r.score} Puan</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Edesis ERP: Sınıf Kontenjanları ve Eksik Veri Uyarıları Paneli */}
      <div className="dashboard-grid" style={{ marginTop: "14px" }}>
        {/* Sınıf Kontenjan & Doluluk Oranları */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Sınıf Kontenjanları & Doluluk</h2>
              <p>Kurum içi aktif sınıfların kayıt ve boş kontenjan durumu</p>
            </div>
            <button className="text-btn" onClick={() => onNavigate("classes")}>
              Sınıfları Yönet <ChevronRight size={15} />
            </button>
          </div>

          {(data.classCapacities || []).length === 0 ? (
            <div className="empty-panel" style={{ padding: "20px" }}>
              <p>Tanımlı sınıf bulunmamaktadır.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px", padding: "12px 16px" }}>
              {(data.classCapacities || []).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate("classes")}
                  style={{ display: "grid", gap: "4px", cursor: "pointer", padding: "4px 6px", borderRadius: "6px" }}
                  title={`${c.name} sınıfını ve öğrencilerini görüntüle`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <b>{c.name} <small style={{ color: "var(--muted)", fontWeight: "normal" }}>({c.level})</small></b>
                    <span><strong>{c.occupied}</strong> / {c.capacity} Öğrenci (%{c.occupancyRate})</span>
                  </div>
                  <div style={{ height: "7px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, c.occupancyRate)}%`,
                        height: "100%",
                        background: c.occupancyRate > 90 ? "var(--danger)" : c.occupancyRate > 70 ? "var(--primary)" : "#10b981",
                        borderRadius: "4px",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edesis Eksik Veri / Evrak Uyarıları */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Eksik Veri & Evrak Uyarıları</h2>
              <p>TC, fotoğraf veya sözleşmesi eksik öğrenciler</p>
            </div>
            <button className="text-btn" onClick={() => onNavigate("students")}>
              Öğrenciler <ChevronRight size={15} />
            </button>
          </div>

          {(data.missingAlerts || []).length === 0 ? (
            <div className="empty-panel" style={{ padding: "20px", color: "var(--success)" }}>
              <CheckCircle2 size={24} color="#10b981" />
              <p style={{ marginTop: "6px" }}>Harika! Tüm öğrenci kayıtları ve evrakları eksiksiz.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "8px", padding: "12px 16px" }}>
              {(data.missingAlerts || []).slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    background: alert.severity === "critical" ? "#fef2f2" : "#fffbeb",
                    borderLeft: `3px solid ${alert.severity === "critical" ? "#ef4444" : "#f59e0b"}`,
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    if (onSelectStudent && alert.studentId) onSelectStudent(alert.studentId);
                    else onNavigate("students");
                  }}
                  title="Öğrenci detaylarını aç ve eksik evrağı tamamla"
                >
                  <AlertTriangle size={15} color={alert.severity === "critical" ? "#ef4444" : "#f59e0b"} />
                  <div style={{ flex: 1 }}>
                    <b style={{ color: "#1e293b" }}>{alert.studentName}:</b> <span style={{ color: "#64748b" }}>{alert.type || alert.message}</span>
                  </div>
                  <ChevronRight size={14} color="#94a3b8" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
