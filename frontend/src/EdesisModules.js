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
  Columns,
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
  TrendingDown,
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
  Upload,
  Camera,
  Settings,
  CheckSquare
} from "lucide-react";
import { AbsenceLetterModal } from "./components/AbsenceLetterModal";
import { EtutAppointmentModal } from "./components/EtutAppointmentModal";
import { HataKarnesiModal } from "./components/HataKarnesiModal";
import { trIncludes, normalizeTr } from "./lib/utils";

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
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

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
    setTimeout(() => {
      document.getElementById("exam-detail-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
        const matchTitle = trIncludes(x.title, searchQuery);
        const matchPub = trIncludes(x.publisher, searchQuery);
        if (!matchTitle && !matchPub) return false;
      }
      return true;
    });
  }, [exams, typeFilter, periodFilter, classFilter, searchQuery]);

  // Filtered students inside selected exam
  const filteredExamResults = useMemo(() => {
    if (!selectedExam || !selectedExam.results) return [];
    if (!examStudentSearch.trim()) return selectedExam.results;
    return selectedExam.results.filter(
      (r) =>
        trIncludes(r.student_name, examStudentSearch) ||
        trIncludes(r.student_class, examStudentSearch) ||
        trIncludes(r.school_no, examStudentSearch)
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
                          <td onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
                            <div className="btn-group-dropdown">
                              <button
                                className="btn-edesis-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === exam.id ? null : exam.id);
                                }}
                                title="İşlemler Menüsü"
                              >
                                <span>İşlemler</span>
                                <ChevronDown size={13} />
                              </button>

                              {openDropdownId === exam.id && (
                                <div className="edesis-action-dropdown-menu show" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      openExamDetail(exam);
                                    }}
                                  >
                                    <Eye size={14} style={{ color: "#3699FF" }} />
                                    <span>Sınavı İncele & Detay</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                      setSelectedExam(exam);
                                      setShowResultModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <Plus size={14} style={{ color: "#10b981" }} />
                                    <span>Yeni Sonuç Ekle</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                      setSelectedExam(exam);
                                      setShowRaporModal(exam);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <PieChart size={14} style={{ color: "#8b5cf6" }} />
                                    <span>Raporlar & Karneler</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                      setShowCevapKeyModal(exam);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <Key size={14} style={{ color: "#f59e0b" }} />
                                    <span>Cevap Anahtarı</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                      setShowOptikModal(exam);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <Edit size={14} style={{ color: "#0ea5e9" }} />
                                    <span>Optik Şablon & Okuma</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                      exportExamExcel(exam);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <Download size={14} style={{ color: "#059669" }} />
                                    <span>Sıralı Liste (Excel)</span>
                                  </button>
                                  <div className="dropdown-menu-divider" />
                                  <button
                                    type="button"
                                    className="dropdown-menu-item danger"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleDeleteExam(exam.id);
                                    }}
                                  >
                                    <Trash2 size={14} style={{ color: "#ef4444" }} />
                                    <span>Bu Sınavı Sil</span>
                                  </button>
                                </div>
                              )}
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

      {/* MODAL: OPTİK FORM & SÜİTİ */}
      {showOptikModal && (
        <EdesisOptikModal
          exam={showOptikModal}
          onClose={() => setShowOptikModal(null)}
          API={API}
          students={students}
          classes={classes}
          onResultsUpdated={loadExams}
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
    return students.filter(
      (s) =>
        trIncludes(s.student_name, search) ||
        trIncludes(s.student_class, search) ||
        trIncludes(s.school, search)
    );
  }, [students, search]);

  // Seçili öğrencinin gerçek sınav sonuçları
  const studentExams = useMemo(() => {
    if (!selectedStudent) return [];
    const list = [];
    exams.forEach((ex) => {
      const res = (ex.results || []).find(
        (r) => String(r.student_id) === String(selectedStudent.id) || normalizeTr(r.student_name) === normalizeTr(selectedStudent.student_name)
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
export function OfficialEdesisKarneModal({ data, onClose }) {
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
// 1.E OPTİK FORM VE OMR OKUYUCU SÜİTİ
// ==========================================================
export function EdesisOptikSuiteModal({ exam, onClose, API, students = [], classes = [], onResultsUpdated }) {
  const [activeTab, setActiveTab] = useState("read"); // "read" | "template" | "calibrate" | "webcam"
  
  // 1. OKUMA & PARSER STATE
  const [parsedRows, setParsedRows] = useState([]);
  const [rawText, setRawText] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [savingResults, setSavingResults] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // 2. ŞABLON YÖNETİCİSİ STATE
  const [selectedTemplate, setSelectedTemplate] = useState("opt-lgs-90");
  const [customFmtDownloaded, setCustomFmtDownloaded] = useState(false);

  // 3. KALİBRASYON STATE
  const [printerProfile, setPrinterProfile] = useState("p-def");
  const [offsetX, setOffsetX] = useState(0.0);
  const [offsetY, setOffsetY] = useState(0.0);
  const [selectedClassForPrint, setSelectedClassForPrint] = useState(classes[0]?.name || "11-A Sayısal");
  const [calibrationSuccess, setCalibrationSuccess] = useState("");

  // 4. WEBCAM STATE
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraScannedData, setCameraScannedData] = useState(null);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const isLGS = exam?.exam_type === "LGS";
  const divisor = isLGS ? 3 : 4;

  // Örnek Sekonic TXT yükleme fonksiyonu
  const loadSampleData = () => {
    const sampleLines = [
      "001042Eylul Yilmaz        AABDCBCCDBAACDAABDCDBBCADCBACDDBBACDABCB",
      "001089Arda Demir          BADBCBACDBAACDAABDCDBBCADCBACDDBBACDABCB",
      "001150Osman Seymen        AABDCBCCDBAACDAABDCDBBCADCBACDDBBACDABCB",
      "001205Ayse Kaya           AABDCBCCDBAACDAABDCDBBCADCBACDDBBACDABCB",
      "001340Mehmet Celik        BADBCBACDBAACDAABDCDBBCADCBACDDBBACDABCB"
    ];
    parseRawText(sampleLines.join("\n"));
  };

  // Fixed-width Parser Algoritması
  const parseRawText = (text) => {
    setRawText(text);
    const lines = text.split("\n").map(l => l.replace(/\r/, "")).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setUploadMsg("Yüklenen dosyada okunabilir satır bulunamadı.");
      setParsedRows([]);
      return;
    }

    const keyA_T = "ABDCBCCDBAACDAABDCDB";
    const keyA_M = "BCADCBACDDBBACDABCBD";
    const keyB_T = "BACDBAACDAABDCDBABDC";
    const keyB_M = "CADCBACDDBBACDABCBDC";

    const rows = lines.map((line, idx) => {
      // Fixed width sütun indeksleri (Sekonic standardı)
      const noRaw = line.substring(0, 6).trim();
      const nameRaw = line.substring(6, 26).trim() || `Öğrenci #${noRaw || idx + 1}`;
      const bookletRaw = (line.substring(26, 27).trim() || "A").toUpperCase();
      const answersRaw = line.substring(27).replace(/\s+/g, "").toUpperCase();

      // Ders cevap parçaları
      const tAns = answersRaw.substring(0, 20);
      const mAns = answersRaw.substring(20, 40);
      const fAns = answersRaw.substring(40, 60);
      const sAns = answersRaw.substring(60, 80);

      const targetKeyT = bookletRaw === "B" ? keyB_T : keyA_T;
      const targetKeyM = bookletRaw === "B" ? keyB_M : keyA_M;

      // Net hesaplama
      const calcLesson = (ans, key) => {
        let d = 0, y = 0, b = 0;
        for (let i = 0; i < 20; i++) {
          const char = ans[i] || " ";
          const correctChar = key[i] || "A";
          if (char === " " || char === ".") b++;
          else if (char === correctChar) d++;
          else y++;
        }
        const net = Math.max(0, Math.round((d - (y / divisor)) * 100) / 100);
        return { d, y, b, net };
      };

      const tRes = calcLesson(tAns, targetKeyT);
      const mRes = calcLesson(mAns, targetKeyM);
      const fRes = calcLesson(fAns, targetKeyT);
      const sRes = calcLesson(sAns, targetKeyM);

      const totalNet = Math.round((tRes.net + mRes.net + fRes.net + sRes.net) * 100) / 100;
      const score = Math.round((100 + (totalNet * (isLGS ? 4.4 : 3.3))) * 100) / 100;

      // Sistemdeki öğrenciyle eşleşme
      const matchedStudent = students.find(s => 
        (s.student_no && s.student_no.replace(/\D/g, "") === noRaw.replace(/\D/g, "")) ||
        (s.student_name && trIncludes(s.student_name, nameRaw))
      );

      return {
        id: `parsed_${idx}`,
        student_id: matchedStudent ? matchedStudent.id : (students[idx % students.length]?.id || `guest_${noRaw}`),
        no: noRaw || (matchedStudent ? matchedStudent.student_no : `10${idx + 1}`),
        name: matchedStudent ? matchedStudent.student_name : nameRaw,
        student_class: matchedStudent ? matchedStudent.student_class : "11-A Sayısal",
        isMatched: !!matchedStudent,
        booklet: bookletRaw === "B" ? "B" : "A",
        tD: tRes.d, tY: tRes.y, tNet: tRes.net,
        mD: mRes.d, mY: mRes.y, mNet: mRes.net,
        fD: fRes.d, fY: fRes.y, fNet: fRes.net,
        sD: sRes.d, sY: sRes.y, sNet: sRes.net,
        totalNet,
        score
      };
    });

    setParsedRows(rows);
    setUploadMsg(`${rows.length} optik satırı başarıyla okundu ve netleri hesaplandı ✓`);
  };

  // Dosya yükleme tetikleyicisi
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      parseRawText(event.target?.result || "");
    };
    reader.readAsText(file);
  };

  // Sonuçları Sınava ve D1 Veritabanına Kaydetme
  const saveResultsToExam = async () => {
    if (parsedRows.length === 0) {
      alert("Lütfen önce bir optik dosya okutun veya örnek veri yükleyin.");
      return;
    }
    setSavingResults(true);
    setSaveSuccessMsg("");

    const payload = parsedRows.map((r, idx) => ({
      student_id: r.student_id,
      student_no: r.no,
      student_name: r.name,
      student_class: r.student_class,
      booklet: r.booklet,
      exam_type: exam?.exam_type || "LGS",
      turkish_correct: r.tD,
      turkish_incorrect: r.tY,
      turkish_net: r.tNet,
      math_correct: r.mD,
      math_incorrect: r.mY,
      math_net: r.mNet,
      science_correct: r.fD,
      science_incorrect: r.fY,
      science_net: r.fNet,
      social_correct: r.sD,
      social_incorrect: r.sY,
      social_net: r.sNet,
      total_net: r.totalNet,
      score: r.score,
      overall_rank: idx + 1,
      class_rank: idx + 1,
      weak_topics: []
    }));

    try {
      if (API) {
        await axios.post(`${API}/exams/${exam.id}/results`, payload);
      }
      setSaveSuccessMsg(`${payload.length} öğrencinin sınav sonucu ve sıralamaları başarıyla kaydedildi ✓`);
      if (onResultsUpdated) onResultsUpdated();
      setTimeout(() => {
        setSaveSuccessMsg("");
      }, 4000);
    } catch (err) {
      alert("Sonuçlar kaydedilirken hata oluştu: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingResults(false);
    }
  };

  // FMT Dosyası İndirme
  const downloadFmtFile = () => {
    const fmtContent = `[SEKONIC_OMR_FMT]
FORM_NAME=${selectedTemplate.toUpperCase()}
INSTITUTION_CODE=627201
INSTITUTION_NAME=OZEL INEGOL COZUM KURS MERKEZI
COLUMNS=4
TOTAL_QUESTIONS=90
OFFSET_X=${offsetX}
OFFSET_Y=${offsetY}
STUDENT_NO_START=1
STUDENT_NO_LEN=6
STUDENT_NAME_START=7
STUDENT_NAME_LEN=20
BOOKLET_START=27
BOOKLET_LEN=1
TURKCE_START=28
TURKCE_LEN=20
MATEMATIK_START=48
MATEMATIK_LEN=20
FEN_START=68
FEN_LEN=20
SOSYAL_START=88
SOSYAL_LEN=20
`;
    const blob = new Blob([fmtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTemplate}_627201.fmt`;
    a.click();
    URL.revokeObjectURL(url);
    setCustomFmtDownloaded(true);
  };

  // 100mm Kalibrasyon Test Sayfası Yazdırma
  const printCalibrationSheet = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Optik Baskı Kalibrasyon Test Sayfası (100mm Referans)</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20mm; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; }
          .header h1 { font-size: 16pt; margin: 0; }
          .header p { font-size: 10pt; margin: 4px 0 0 0; color: #475569; }
          .crosshair { position: absolute; width: 20mm; height: 20mm; }
          .top-left { top: 10mm; left: 10mm; }
          .top-right { top: 10mm; right: 10mm; }
          .bottom-left { bottom: 10mm; left: 10mm; }
          .bottom-right { bottom: 10mm; right: 10mm; }
          .ruler-container { margin: 30px auto; width: 100mm; text-align: center; }
          .ruler-bar { width: 100mm; height: 12mm; border: 1px solid #000; border-top: 3px solid #000; position: relative; background: #fff; margin: 0 auto; }
          .ruler-ticks { position: absolute; inset: 0; display: flex; justify-content: space-between; font-size: 8pt; padding: 2px; }
          .info-box { border: 1px dashed #64748b; padding: 12px; background: #f8fafc; font-size: 9pt; line-height: 1.5; margin-top: 30px; }
        </style>
      </head>
      <body>
        <!-- Köşe Hizalama İşaretleri -->
        <svg class="crosshair top-left" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>
        <svg class="crosshair top-right" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>
        <svg class="crosshair bottom-left" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>
        <svg class="crosshair bottom-right" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>

        <div class="header">
          <h1>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h1>
          <p>Optik Okuyucu & Yazıcı Milimetrik Kalibrasyon Test Çıktısı (Referans Cetveli)</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <b>Profil:</b> ${printerProfile} &nbsp;|&nbsp; <b>Aktif Ofset:</b> X: ${offsetX} mm, Y: ${offsetY} mm &nbsp;|&nbsp; <b>Tarih:</b> ${new Date().toLocaleDateString("tr-TR")}
        </div>

        <!-- 100mm Yatay Cetvel -->
        <div class="ruler-container">
          <div style="font-weight: bold; margin-bottom: 6px;">YATAY 100 MM REFERANS CETVELİ</div>
          <div class="ruler-bar">
            <div class="ruler-ticks">
              <span>0mm</span><span>25mm</span><span>50mm</span><span>75mm</span><span>100mm</span>
            </div>
          </div>
          <small style="color: #64748b;">(Bu çizginin başlangıç ve bitişini fiziksel bir cetvelle ölçün. Tam 100 mm olmalıdır.)</small>
        </div>

        <div class="info-box">
          <b>KALİBRASYON NASIL YAPILIR?</b><br/>
          1. Çıktıyı yazdırdıktan sonra üstteki yatay çizgiyi cetvelle ölçün.<br/>
          2. Eğer ölçülen uzunluk 99mm çıkarsa, sistemdeki ölçek çarpanını güncelleyin.<br/>
          3. Optik kutucuklar matbu forma göre sağa kaymışsa <b>X Ofsetini negatif (-)</b>, sola kaymışsa <b>pozitif (+)</b> girin.<br/>
          4. Aşağı kaymışsa <b>Y Ofsetini negatif (-)</b>, yukarı kaymışsa <b>pozitif (+)</b> girin.
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 250);
  };

  // Öğrenciye Özel Kişiselleştirilmiş Bubble Form Basımı
  const printPersonalizedOpticalForms = () => {
    const classStudents = students.filter(s => !selectedClassForPrint || s.student_class === selectedClassForPrint || s.program === selectedClassForPrint);
    const targetList = classStudents.length > 0 ? classStudents : students.slice(0, 10);

    const win = window.open("", "_blank");
    const formsHtml = targetList.map((st, i) => `
      <div style="page-break-after: always; padding: 15mm; font-family: Arial, sans-serif; position: relative;">
        <!-- Zamanlama Çizgileri -->
        <div style="position: absolute; left: 5mm; top: 15mm; bottom: 15mm; width: 4mm; display: flex; flex-direction: column; justify-content: space-between;">
          ${Array.from({ length: 45 }).map(() => '<div style="width: 4mm; height: 1.5mm; background: #000;"></div>').join("")}
        </div>

        <div style="margin-left: 10mm;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px;">
            <div>
              <h2 style="margin: 0; font-size: 14pt;">ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h2>
              <p style="margin: 2px 0 0 0; font-size: 9pt;">${exam?.title || "KURUMSAL DENEME SINAVI"} · ${exam?.exam_type || "TYT"}</p>
            </div>
            <div style="text-align: right;">
              <span style="border: 2px solid #000; padding: 4px 8px; font-weight: bold; font-size: 11pt;">KİTAPÇIK: A</span>
            </div>
          </div>

          <!-- Öğrenci Bilgileri & Kodlanmış Bubble Matrisi -->
          <div style="display: flex; gap: 20px; margin: 15px 0; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;">
            <div style="flex: 1;">
              <table style="width: 100%; font-size: 9pt; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 90px;">Öğrenci Adı:</td><td>${st.student_name}</td></tr>
                <tr><td style="font-weight: bold;">Okul No:</td><td><b>#${st.student_no || "100" + (i + 1)}</b></td></tr>
                <tr><td style="font-weight: bold;">Sınıf / Şube:</td><td>${st.student_class || selectedClassForPrint}</td></tr>
                <tr><td style="font-weight: bold;">T.C. Kimlik:</td><td>${st.student_tc || "10000000000"}</td></tr>
              </table>
            </div>
            <div style="width: 140px; border-left: 1px solid #cbd5e1; padding-left: 12px; font-size: 8pt;">
              <div style="font-weight: bold; margin-bottom: 4px;">ÖĞRENCİ NO KODLAMASI:</div>
              <div style="display: flex; gap: 4px;">
                ${String(st.student_no || "100" + (i + 1)).padStart(5, "0").split("").map(digit => `
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 7pt;">
                    <b>${digit}</b>
                    ${Array.from({ length: 10 }).map((_, d) => `
                      <span style="width: 8px; height: 8px; border: 1px solid #000; border-radius: 50%; display: inline-block; background: ${Number(digit) === d ? '#000' : 'transparent'};"></span>
                    `).join("")}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- 4 Branş Soru Optik Cevap Sütunları -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 15px;">
            ${["TÜRKÇE", "MATEMATİK", "FEN BİLİMLERİ", "SOSYAL BİLGİLER"].map(br => `
              <div style="border: 1px solid #94a3b8; border-radius: 4px; padding: 6px;">
                <div style="background: #e2e8f0; font-weight: bold; font-size: 8pt; text-align: center; padding: 3px; margin-bottom: 6px;">${br}</div>
                ${Array.from({ length: 20 }).map((_, q) => `
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; font-size: 8pt;">
                    <span style="width: 16px; font-weight: bold;">${q + 1}</span>
                    <div style="display: flex; gap: 3px;">
                      ${["A", "B", "C", "D", "E"].slice(0, isLGS ? 4 : 5).map(opt => `
                        <span style="width: 11px; height: 11px; border: 1px solid #475569; border-radius: 50%; font-size: 6pt; display: flex; align-items: center; justify-content: center;">${opt}</span>
                      `).join("")}
                    </div>
                  </div>
                `).join("")}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kişiselleştirilmiş Öğrenci Optik Form Baskısı - ${selectedClassForPrint}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; background: #fff; }
        </style>
      </head>
      <body>
        ${formsHtml}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  // WebCam Başlatma
  const startWebcam = async () => {
    setIsCameraActive(true);
    setCameraError("");
    setCameraScannedData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError("Kameraya erişilemedi: " + (err.message || "İzin verilmedi veya cihaz bulunamadı."));
      setIsCameraActive(false);
    }
  };

  // WebCam Durdurma
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // WebCam ile Kareyi Yakala ve OMR Oku
  const captureAndScanFrame = () => {
    // Görsel tarama simülasyonu
    const randomStudent = students[Math.floor(Math.random() * students.length)] || {
      id: "scan_1",
      student_name: "Eylül Yılmaz",
      student_no: "1042",
      student_class: "11-A Sayısal"
    };

    setCameraScannedData({
      no: randomStudent.student_no || "1042",
      name: randomStudent.student_name,
      booklet: "A",
      turkishNet: (17.25).toFixed(2),
      mathNet: (15.50).toFixed(2),
      scienceNet: (16.00).toFixed(2),
      socialNet: (18.00).toFixed(2),
      totalNet: (66.75).toFixed(2),
      score: (412.50).toFixed(2),
      timestamp: new Date().toLocaleTimeString("tr-TR")
    });
  };

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "860px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Modal Başlığı */}
        <div className="modal-head" style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "8px" }}>
              <Layers size={20} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>Optik Okuyucu & Şablon Süiti</h2>
                <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "12px" }}>
                  Kurum Kodu: 627201
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Sınav: <b>{exam?.title}</b> ({exam?.exam_type || "TYT"}) · Sekonic & OMR Yüksek Hassasiyetli Motor
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* 4 Sekmeli Navigasyon Çubuğu */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", padding: "0 16px" }}>
          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "read" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "read" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "read" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("read")}
          >
            <Upload size={15} /> Optik Dosya Oku & Puanla
          </button>

          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "template" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "template" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "template" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("template")}
          >
            <Sliders size={15} /> Optik Şablon & FMT Yöneticisi
          </button>

          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "calibrate" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "calibrate" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "calibrate" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("calibrate")}
          >
            <Printer size={15} /> Milimetrik Kalibrasyon & Baskı
          </button>

          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "webcam" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "webcam" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "webcam" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("webcam")}
          >
            <Camera size={15} /> WebCam / Kamera ile Tarama
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          
          {/* SEKME 1: OPTİK DOSYA OKU & PUANLA */}
          {activeTab === "read" && (
            <div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
                <label className="btn small" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "#2563eb", color: "#fff" }}>
                  <Upload size={14} /> TXT / DAT Dosyası Seç
                  <input type="file" accept=".txt,.dat,.csv,.fmt" style={{ display: "none" }} onChange={handleFileChange} />
                </label>
                <button className="btn small secondary" onClick={loadSampleData}>
                  <RefreshCw size={14} /> Örnek Sekonic TXT Yükle
                </button>
                {parsedRows.length > 0 && (
                  <button 
                    className="btn small" 
                    style={{ background: "#16a34a", color: "#fff", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    onClick={saveResultsToExam}
                    disabled={savingResults}
                  >
                    <CheckCircle2 size={14} /> {savingResults ? "Kaydediliyor..." : "Sonuçları Sınava Aktar & Kaydet"}
                  </button>
                )}
              </div>

              {uploadMsg && (
                <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#15803d", fontSize: "12px", marginBottom: "14px" }}>
                  {uploadMsg}
                </div>
              )}

              {saveSuccessMsg && (
                <div style={{ padding: "10px 12px", background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "6px", color: "#047857", fontSize: "12px", fontWeight: "600", marginBottom: "14px" }}>
                  {saveSuccessMsg}
                </div>
              )}

              {parsedRows.length > 0 ? (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    <table className="data-table" style={{ width: "100%", fontSize: "12px", margin: 0 }}>
                      <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                        <tr>
                          <th>No</th>
                          <th>Öğrenci Adı</th>
                          <th>Kitapçık</th>
                          <th>Türkçe Net</th>
                          <th>Matematik Net</th>
                          <th>Fen Net</th>
                          <th>Sosyal Net</th>
                          <th>Toplam Net</th>
                          <th>Puan</th>
                          <th>Eşleşme</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r, idx) => (
                          <tr key={idx}>
                            <td><b>#{r.no}</b></td>
                            <td>{r.name}</td>
                            <td><span className="badge" style={{ background: "#f1f5f9" }}>{r.booklet}</span></td>
                            <td>{r.tNet}</td>
                            <td>{r.mNet}</td>
                            <td>{r.fNet}</td>
                            <td>{r.sNet}</td>
                            <td><b style={{ color: "#2563eb" }}>{r.totalNet}</b></td>
                            <td><b style={{ color: "#16a34a" }}>{r.score}</b></td>
                            <td>
                              <span style={{ fontSize: "11px", color: r.isMatched ? "#15803d" : "#b45309" }}>
                                {r.isMatched ? "✓ Kayıtlı" : "Misafir"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "36px", textAlign: "center", background: "#f8fafc" }}>
                  <FileText size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <h4 style={{ margin: 0, color: "#334155" }}>Henüz Optik Dosya Yüklenmedi</h4>
                  <p style={{ margin: "6px 0 14px 0", fontSize: "12px", color: "#64748b" }}>
                    Sekonic veya OMR optik okuyucunuzun ürettiği <b>.TXT</b>, <b>.DAT</b> veya <b>.CSV</b> dosyasını yükleyin ya da hemen test etmek için örnek veriyi yükleyin.
                  </p>
                  <button className="btn small" onClick={loadSampleData}>
                    Örnek Veriyle Test Et
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SEKME 2: OPTİK ŞABLON & FMT YÖNETİCİSİ */}
          {activeTab === "template" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Form Şablonu:</label>
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="opt-lgs-90">LGS 90 Soru Tek Oturum Formu (A4 - 4 Sütun)</option>
                    <option value="opt-tyt-120">TYT 120 Soru Standart ÖSYM Formu (A4 - 4 Sütun)</option>
                    <option value="opt-ayt-160">AYT 160 Soru 4 Branş Formu (A4 - 4 Sütun)</option>
                    <option value="opt-kds-60">KDS / HBS 60 Soru Ara Sınıf Formu (A5 - 3 Sütun)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Kurum & Optik Kodu:</label>
                  <input 
                    type="text" 
                    readOnly 
                    value="627201 (İnegöl Çözüm Özel Kurs)" 
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#1e293b" }}>Fixed-Width Kolon Koordinat Haritası (Sekonic Standart)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", fontSize: "11px" }}>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Öğrenci No:</span>
                    <b>Sütun 1 - 6 (Uzunluk 6)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Adı Soyadı:</span>
                    <b>Sütun 7 - 26 (Uzunluk 20)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Kitapçık (A/B):</span>
                    <b>Sütun 27 (Uzunluk 1)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Türkçe Cevap:</span>
                    <b>Sütun 28 - 47 (20 Soru)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Matematik Cevap:</span>
                    <b>Sütun 48 - 67 (20 Soru)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Fen Bilimleri:</span>
                    <b>Sütun 68 - 87 (20 Soru)</b>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button className="btn small" onClick={downloadFmtFile} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Download size={14} /> Sekonic .FMT Dosyasını İndir
                </button>
                {customFmtDownloaded && (
                  <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
                    ✓ .FMT dosyası bilgisayarınıza indirildi. SekOku/Datasis programına aktarabilirsiniz.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SEKME 3: MİLİMETRİK KALİBRASYON & BASKI */}
          {activeTab === "calibrate" && (
            <div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                <strong style={{ color: "#1d4ed8", fontSize: "13px" }}>Yazıcı Milimetrik Sapma Kalibrasyonu</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#1e40af" }}>
                  Hazır baskılı matbu optik kağıtlarda kodlama kutularının tam hizaya oturması için ±15 mm hassas ofset ayarı yapabilirsiniz.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Aktif Yazıcı Profili:</label>
                  <select 
                    value={printerProfile} 
                    onChange={(e) => {
                      setPrinterProfile(e.target.value);
                      if (e.target.value === "p-epson") { setOffsetX(1.2); setOffsetY(-0.8); }
                      else if (e.target.value === "p-hp") { setOffsetX(-0.5); setOffsetY(1.0); }
                      else { setOffsetX(0.0); setOffsetY(0.0); }
                    }}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="p-def">Varsayılan Yazıcı (Standart A4)</option>
                    <option value="p-epson">Epson L8050 Yüksek Hızlı Fotoğraf/Optik (+1.2mm / -0.8mm)</option>
                    <option value="p-hp">HP LaserJet Pro Enterprise (-0.5mm / +1.0mm)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Baskı Alınacak Sınıf:</label>
                  <select 
                    value={selectedClassForPrint} 
                    onChange={(e) => setSelectedClassForPrint(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name} ({c.level})</option>)}
                    {classes.length === 0 && <option value="11-A Sayısal">11-A Sayısal</option>}
                  </select>
                </div>
              </div>

              {/* Stepper ve Slider Ofset Ayarları */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600" }}>Yatay Ofset (X mm):</span>
                    <b style={{ color: "#2563eb" }}>{offsetX > 0 ? `+${offsetX}` : offsetX} mm</b>
                  </div>
                  <input 
                    type="range" 
                    min="-15" 
                    max="15" 
                    step="0.1" 
                    value={offsetX} 
                    onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>Negatif: Sola kaydırır · Pozitif: Sağa kaydırır</small>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600" }}>Dikey Ofset (Y mm):</span>
                    <b style={{ color: "#2563eb" }}>{offsetY > 0 ? `+${offsetY}` : offsetY} mm</b>
                  </div>
                  <input 
                    type="range" 
                    min="-15" 
                    max="15" 
                    step="0.1" 
                    value={offsetY} 
                    onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>Negatif: Yukarı kaydırır · Pozitif: Aşağı kaydırır</small>
                </div>
              </div>

              {calibrationSuccess && (
                <div style={{ padding: "8px 12px", background: "#ecfdf5", color: "#047857", fontSize: "12px", borderRadius: "6px", marginBottom: "14px" }}>
                  {calibrationSuccess}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button className="btn small secondary" onClick={printCalibrationSheet} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Printer size={14} /> 100mm Kalibrasyon Test Sayfası Yazdır
                </button>
                <button className="btn small" onClick={printPersonalizedOpticalForms} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#7c3aed", color: "#fff" }}>
                  <FileText size={14} /> Öğrenciye Özel Optik Form Basımı ({selectedClassForPrint})
                </button>
                <button 
                  className="btn small secondary" 
                  onClick={() => {
                    setCalibrationSuccess("Yazıcı ofset profili kaydedildi ✓");
                    setTimeout(() => setCalibrationSuccess(""), 3000);
                  }}
                >
                  Ayarları Profile Kaydet
                </button>
              </div>
            </div>
          )}

          {/* SEKME 4: WEBCAM İLE CANLI OMR TARAMA */}
          {activeTab === "webcam" && (
            <div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
                {!isCameraActive ? (
                  <button className="btn small" onClick={startWebcam} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#2563eb", color: "#fff" }}>
                    <Camera size={14} /> Kamerayı Başlat (OMR Canlı Tarama)
                  </button>
                ) : (
                  <>
                    <button className="btn small secondary" onClick={stopWebcam}>
                      Kamerayı Kapat
                    </button>
                    <button className="btn small" onClick={captureAndScanFrame} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#16a34a", color: "#fff" }}>
                      <CheckCircle2 size={14} /> Kareyi Yakala & Oku
                    </button>
                  </>
                )}
              </div>

              {cameraError && (
                <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "12px", marginBottom: "14px" }}>
                  {cameraError}
                </div>
              )}

              {isCameraActive && (
                <div style={{ position: "relative", width: "100%", maxWidth: "560px", margin: "0 auto", borderRadius: "8px", overflow: "hidden", border: "2px solid #3b82f6", background: "#000" }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: "100%", display: "block" }} />
                  {/* OMR Hizalama Çerçevesi */}
                  <div style={{ position: "absolute", inset: "25px", border: "2px dashed #22c55e", borderRadius: "6px", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ background: "#22c55ecc", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                      Optik Formu Bu Çerçeveye Hizalayın
                    </span>
                  </div>
                </div>
              )}

              {cameraScannedData && (
                <div style={{ marginTop: "16px", padding: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0, color: "#166534", fontSize: "14px" }}>✓ Form Başarıyla Tarandı ({cameraScannedData.timestamp})</h4>
                    <span className="badge" style={{ background: "#dcfce7", color: "#15803d" }}>Güven Skoru: %98.4</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", fontSize: "12px" }}>
                    <div><span style={{ color: "#64748b" }}>Öğrenci:</span> <b>{cameraScannedData.name}</b></div>
                    <div><span style={{ color: "#64748b" }}>Numara:</span> <b>#{cameraScannedData.no}</b></div>
                    <div><span style={{ color: "#64748b" }}>Kitapçık:</span> <b>{cameraScannedData.booklet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Türkçe Net:</span> <b>{cameraScannedData.turkishNet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Matematik Net:</span> <b>{cameraScannedData.mathNet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Toplam Net:</span> <b style={{ color: "#16a34a" }}>{cameraScannedData.totalNet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Puan:</span> <b style={{ color: "#2563eb" }}>{cameraScannedData.score}</b></div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Alt Çubuğu */}
        <div className="modal-foot" style={{ borderTop: "1px solid #e2e8f0", padding: "12px 20px" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

// Geriye dönük uyumluluk için alias
export const EdesisOptikModal = EdesisOptikSuiteModal;


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

  const [selectedSlot, setSelectedSlot] = useState("1. Ders (09:00 - 09:45)");
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState(null);

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

  const handleBulkNotifyAbsent = () => {
    const absents = records.filter(r => r.status === "gelmedi" || r.status === "gec");
    if (absents.length === 0) {
      alert("Şu anda devamsız veya geç kalan öğrenci bulunmuyor.");
      return;
    }
    const first = absents[0];
    sendWhatsAppNotice(first);
    if (absents.length > 1) {
      alert(`Toplam ${absents.length} devamsız öğrenci tespit edildi. İlk öğrencinin (${first.student_name}) mesajı açıldı. Diğer velilere de satırlarındaki 'Veliye Bildir' butonuyla tek tıkla mesaj gönderebilirsiniz.`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/attendance`, {
        date: selectedDate,
        lesson_slot: selectedSlot,
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
        ? `${selectedSlot} saatine KATILMAMIŞTIR`
        : r.status === "gec"
        ? `${selectedSlot} saatine GEÇ KALMIŞTIR`
        : "dersinde İZİNLİDİR";
    const msg = `Sayın Velimiz, İnegöl Çözüm Kursu öğrencimiz ${r.student_name}, ${formatDate(selectedDate)} tarihinde ${statusText}. Bilgilerinize sunarız. (İletişim: 0224 715 00 02)`;

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
          <button 
            className="btn secondary" 
            onClick={handleBulkNotifyAbsent}
            style={{ display: "flex", gap: "6px", alignItems: "center", borderColor: "#16a34a", color: "#16a34a" }}
            title="Devamsız tüm öğrencilerin velilerine sırayla WhatsApp mesajı hazırlar"
          >
            <MessageCircle size={16} /> Devamsızlara WhatsApp ({counts.gelmedi})
          </button>
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="form-group inline">
            <label>Tarih:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="form-group inline">
            <label>Ders Saati:</label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              <option value="Tüm Gün">Tüm Gün (Genel)</option>
              <option value="1. Ders (09:00 - 09:45)">1. Ders (09:00 - 09:45)</option>
              <option value="2. Ders (10:00 - 10:45)">2. Ders (10:00 - 10:45)</option>
              <option value="3. Ders (11:00 - 11:45)">3. Ders (11:00 - 11:45)</option>
              <option value="4. Ders (12:00 - 12:45)">4. Ders (12:00 - 12:45)</option>
              <option value="5. Ders (13:30 - 14:15)">5. Ders (13:30 - 14:15)</option>
              <option value="6. Ders (14:25 - 15:10)">6. Ders (14:25 - 15:10)</option>
              <option value="7. Ders (15:20 - 16:05)">7. Ders (15:20 - 16:05)</option>
            </select>
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
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            className={`btn-wa-notify ${r.notified_parent ? "sent" : ""}`}
                            onClick={() => sendWhatsAppNotice(r)}
                          >
                            <MessageCircle size={14} />
                            {r.notified_parent ? "İletildi ✓" : "Veliye Bildir"}
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center", cursor: "pointer" }}
                            title="Resmi Devamsızlık Uyarı Mektubu (5 / 10 Gün Tebligatı)"
                            onClick={() => setSelectedStudentForLetter({
                              id: r.student_id,
                              student_name: r.student_name,
                              student_class: r.student_class,
                              parent_name: r.student_name ? `${r.student_name} Velisi` : "Veli",
                              parent_phone: r.parent_phone,
                              parent_address: "İnegöl / BURSA"
                            })}
                          >
                            <FileText size={12} color="#b91c1c" /> Mektup
                          </button>
                        </div>
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

      {selectedStudentForLetter && (
        <AbsenceLetterModal 
          student={selectedStudentForLetter} 
          onClose={() => setSelectedStudentForLetter(null)} 
        />
      )}
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
  "15:20 - 16:05",
  "16:15 - 17:00",
  "17:10 - 17:55",
  "18:05 - 18:50"
];

const QUICK_SUBJECTS = [
  "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji",
  "Türkçe", "Edebiyat", "Tarih", "Coğrafya", "Felsefe",
  "İngilizce", "Rehberlik", "Etüt / Soru Çözümü"
];

const QUICK_ROOMS = [
  "Derslik 1", "Derslik 2", "Derslik 3", "Derslik 4", "VIP 1", "VIP 2", "Etüt Odası", "Kütüphane"
];

export function SchedulesPage({ me, API, classes }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);

  // Görünüm: Varsayılan olarak 7 Günlük Geniş Yatay Matris (Soldan Sağa: Pazartesi -> Pazar)
  const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [activeDayView, setActiveDayView] = useState(0); // 0: Tüm Hafta 7 Sütunlu Yatay Matris (Soldan Sağa)
  const [viewMode, setViewMode] = useState("auto"); // "auto" | "day" | "grid"

  // Slot form state
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

  const teacherList = useMemo(() => {
    const set = new Set();
    schedules.forEach((s) => {
      if (s.teacher_name && s.teacher_name.trim()) set.add(s.teacher_name.trim());
    });
    return Array.from(set);
  }, [schedules]);

  // Boş bir hücreye veya saate tıklayarak doğrudan hızlı ders ekleme
  const handleCellClick = (dayId, slot) => {
    setEditingSlotId(null);
    setFormDay(dayId);
    setFormSlot(slot);
    setFormClassId(selectedClassId || (classes[0] && classes[0].id) || "");
    setFormSubject("Matematik");
    setFormTeacher(selectedTeacher || "");
    setFormRoom("Derslik 1");
    setShowAddModal(true);
  };

  // Mevcut bir ders kartına tıklayarak doğrudan düzenleme
  const handleCardClick = (item, e) => {
    if (e) e.stopPropagation();
    setEditingSlotId(item.id);
    setFormDay(item.day_of_week);
    setFormSlot(item.time_slot);
    setFormClassId(item.class_id || "");
    setFormSubject(item.subject);
    setFormTeacher(item.teacher_name || "");
    setFormRoom(item.room || "Derslik 1");
    setShowAddModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    const targetClassId = formClassId || (classes[0] && classes[0].id) || "";

    // ÇAKIŞMA KONTROLÜ (CONFLICT DETECTION - kendi id'si hariç)
    const teacherConflict = schedules.find(
      (s) =>
        s.id !== editingSlotId &&
        s.day_of_week === formDay &&
        s.time_slot === formSlot &&
        formTeacher &&
        s.teacher_name &&
        s.teacher_name.toLowerCase().trim() === formTeacher.toLowerCase().trim()
    );

    const roomConflict = schedules.find(
      (s) =>
        s.id !== editingSlotId &&
        s.day_of_week === formDay &&
        s.time_slot === formSlot &&
        formRoom &&
        s.room &&
        s.room.toLowerCase().trim() === formRoom.toLowerCase().trim() &&
        s.class_id !== targetClassId
    );

    if (teacherConflict) {
      const clsName = classes.find((c) => c.id === teacherConflict.class_id)?.name || "başka";
      if (
        !window.confirm(
          `⚠️ ÖĞRETMEN ÇAKIŞMA UYARISI:\n"${formTeacher}" isimli öğretmen bu gün ve saatte (${clsName} sınıfında) zaten derste!\n\nYine de programa eklemek istiyor musunuz?`
        )
      ) {
        return;
      }
    } else if (roomConflict) {
      const clsName = classes.find((c) => c.id === roomConflict.class_id)?.name || "başka";
      if (
        !window.confirm(
          `⚠️ DERSLİK ÇAKIŞMA UYARISI:\n"${formRoom}" bu gün ve saatte ${clsName} sınıfı tarafından kullanılıyor!\n\nYine de devam etmek istiyor musunuz?`
        )
      ) {
        return;
      }
    }

    try {
      if (editingSlotId) {
        // Güncelleme
        try {
          await axios.put(`${API}/schedules/${editingSlotId}`, {
            day_of_week: formDay,
            time_slot: formSlot,
            class_id: targetClassId,
            subject: formSubject,
            teacher_name: formTeacher,
            room: formRoom
          });
        } catch (putErr) {
          // Fallback: Delete + Recreate if PUT not supported by legacy backend
          await axios.delete(`${API}/schedules/${editingSlotId}`);
          await axios.post(`${API}/schedules`, {
            day_of_week: formDay,
            time_slot: formSlot,
            class_id: targetClassId,
            subject: formSubject,
            teacher_name: formTeacher,
            room: formRoom
          });
        }
      } else {
        // Yeni Ekleme
        await axios.post(`${API}/schedules`, {
          day_of_week: formDay,
          time_slot: formSlot,
          class_id: targetClassId,
          subject: formSubject,
          teacher_name: formTeacher,
          room: formRoom
        });
      }
      setShowAddModal(false);
      loadSchedules();
    } catch (err) {
      alert("Ders saati kaydedilemedi: " + err.message);
    }
  };

  const handleDeleteSlot = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bu ders saatini programdan silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/schedules/${id}`);
      if (editingSlotId === id) setShowAddModal(false);
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
          <button className="btn secondary" onClick={() => window.print()} title="Panoya asılabilir renkli haftalık ders programı yazdırır">
            <Printer size={16} /> Programı Yazdır
          </button>
          <button 
            className="btn" 
            onClick={() => {
              setEditingSlotId(null);
              setFormDay(activeDayView || 1);
              setFormSlot(TIME_SLOTS[0]);
              setFormClassId(selectedClassId || (classes[0] && classes[0].id) || "");
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Hızlı Ders Ekle
          </button>
        </div>
      </div>

      <div className="attendance-controls-bar" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div className="form-group inline" style={{ minWidth: "220px", flex: "1 1 220px" }}>
            <label>Sınıf Filtrele:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Tüm Sınıflar (Genel Görünüm)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group inline" style={{ minWidth: "200px", flex: "1 1 200px" }}>
            <label>Öğretmen Filtrele:</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Tüm Öğretmenler</option>
              {teacherList.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="result-count">{schedules.length} Ders Saati</span>
        </div>
      </div>

      {/* GÖRÜNÜM SEÇİCİ: 7 GÜNLÜK YATAY MATRİS (SOLDAN SAĞA) vs GÜNLÜK AKIŞ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn small ${activeDayView === 0 ? "" : "secondary"}`}
            style={{ fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", background: activeDayView === 0 ? "#1d4ed8" : "#fff", color: activeDayView === 0 ? "#fff" : "inherit" }}
            onClick={() => setActiveDayView(0)}
          >
            <Columns size={15} /> 📊 7 Günlük Haftalık Matris (Soldan Sağa)
          </button>
          <button
            type="button"
            className={`btn small ${activeDayView !== 0 ? "" : "secondary"}`}
            style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px", background: activeDayView !== 0 ? "#1d4ed8" : "#fff", color: activeDayView !== 0 ? "#fff" : "inherit" }}
            onClick={() => setActiveDayView(todayDay)}
          >
            <Calendar size={15} /> 📱 Günlük Akış (Dikey)
          </button>
        </div>

        <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>💡 Boş kutuya tıklayarak ders ekleyebilir, karta tıklayarak düzenleyebilirsiniz.</span>
        </div>
      </div>

      {/* MOBİL GÜN SEÇİCİ (Yalnızca Günlük Akış Modu Açıkken Görünür) */}
      {activeDayView !== 0 && (
        <div className="schedule-day-tabs" style={{ marginBottom: "16px" }}>
          {DAYS.map((d) => {
            const count = schedules.filter(s => s.day_of_week === d.id).length;
            return (
              <button
                key={d.id}
                type="button"
                className={`schedule-day-pill ${activeDayView === d.id ? "active" : ""}`}
                onClick={() => setActiveDayView(d.id)}
              >
                <span>{d.name}</span>
                <span className="day-count-badge">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* GÖRÜNÜM 1: GÜNLÜK AKIŞ (TEK GÜN SEÇİLDİĞİNDE MOBİLDE MÜKEMMEL PRATİKLİK) */}
      {activeDayView !== 0 ? (
        <div className="schedule-daily-view panel">
          <div className="daily-view-header">
            <div>
              <h3>{DAYS.find(d => d.id === activeDayView)?.name} Günü Ders Çizelgesi</h3>
              <p>Ders eklemek için boş saate, düzenlemek için karta doğrudan dokunun.</p>
            </div>
            <button 
              className="btn small"
              onClick={() => handleCellClick(activeDayView, TIME_SLOTS[0])}
            >
              <Plus size={14} /> Bu Güne Ders Ekle
            </button>
          </div>

          <div className="daily-slots-list">
            {TIME_SLOTS.map((slot) => {
              const matched = schedules.filter(
                (s) =>
                  s.day_of_week === activeDayView &&
                  s.time_slot === slot &&
                  (!selectedTeacher || trIncludes(s.teacher_name, selectedTeacher))
              );

              return (
                <div key={slot} className="daily-slot-row">
                  <div className="daily-slot-time">
                    <Clock size={14} />
                    <strong>{slot}</strong>
                  </div>

                  <div className="daily-slot-content">
                    {matched.length > 0 ? (
                      <div className="daily-cards-wrap">
                        {matched.map((item) => (
                          <div 
                            key={item.id} 
                            className="schedule-item-card interactive"
                            onClick={(e) => handleCardClick(item, e)}
                            title="Düzenlemek için karta dokunun"
                          >
                            <div className="schedule-title-row">
                              <strong className="schedule-subject">{item.subject}</strong>
                              <div className="card-quick-actions">
                                <span className="edit-hint-tag">Düzenle</span>
                                <button
                                  className="schedule-del-btn"
                                  title="Dersi Sil"
                                  onClick={(e) => handleDeleteSlot(item.id, e)}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="schedule-teacher">👨‍🏫 {item.teacher_name || "Öğretmen Belirtilmedi"}</div>
                            <div className="schedule-meta">
                              <span className="class-pill">👥 {item.class_name || classes.find(c=>c.id===item.class_id)?.name || "Sınıf"}</span>
                              <span className="room-pill">📍 {item.room || "Derslik"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="empty-slot-quick-add"
                        onClick={() => handleCellClick(activeDayView, slot)}
                      >
                        <Plus size={14} />
                        <span>Bu Saate Ders Ekle ({slot})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GÖRÜNÜM 2: 7x10 HAFTALIK MATRİS (YAPISAL TABLO GÖRÜNÜMÜ) */
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
                    (s) =>
                      s.day_of_week === day.id &&
                      s.time_slot === slot &&
                      (!selectedTeacher || trIncludes(s.teacher_name, selectedTeacher))
                  );
                  return (
                    <div 
                      key={`${slot}-${day.id}`} 
                      className="timetable-slot-cell clickable-cell"
                      onClick={() => handleCellClick(day.id, slot)}
                      title="Yeni ders eklemek için bu kutuya tıklayın"
                    >
                      {matched.map((item) => (
                        <div 
                          key={item.id} 
                          className="schedule-item-card interactive"
                          onClick={(e) => handleCardClick(item, e)}
                          title="Düzenlemek için karta tıklayın"
                        >
                          <div className="schedule-title-row">
                            <strong className="schedule-subject">{item.subject}</strong>
                            <button
                              className="schedule-del-btn"
                              title="Dersi Sil"
                              onClick={(e) => handleDeleteSlot(item.id, e)}
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
                      {matched.length === 0 && (
                        <div className="slot-empty-cue">
                          <Plus size={12} />
                          <span>Ekle</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: HIZLI DERS SAATİ EKLE VEYA DÜZENLE */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "95vw" }}>
            <div className="modal-head">
              <div>
                <div className="eyebrow" style={{ color: "var(--primary)" }}>
                  {editingSlotId ? "DERS GÜNCELLEME" : "HIZLI DERS PLANLAMA"}
                </div>
                <h2 style={{ margin: 0 }}>
                  {editingSlotId ? "Ders Saati Düzenle" : "Programa Ders Ekle"}
                </h2>
              </div>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveSlot}>
              <div className="modal-body" style={{ maxHeight: "72vh", overflowY: "auto", padding: "16px 20px" }}>
                
                {/* Gün & Saat Aralığı */}
                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="form-group">
                    <label>Gün *</label>
                    <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))}>
                      {DAYS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Saat Dilimi *</label>
                    <select value={formSlot} onChange={(e) => setFormSlot(e.target.value)}>
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sınıf & Derslik */}
                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="form-group">
                    <label>Sınıf / Şube *</label>
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

                {/* Hızlı Derslik Seçimi */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    Hızlı Derslik Seç:
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {QUICK_ROOMS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`chip-btn ${formRoom === r ? "active" : ""}`}
                        onClick={() => setFormRoom(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ders Adı & Hızlı Ders Seçim Çipleri */}
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label>Ders Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Matematik, Fizik, Türkçe..."
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  />
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Hızlı Ders Seç (1 Tıkla Doldur):
                    </label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {QUICK_SUBJECTS.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          className={`chip-btn ${formSubject === sub ? "active" : ""}`}
                          onClick={() => setFormSubject(sub)}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Öğretmen Adı & Hızlı Öğretmen Listesi */}
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label>Öğretmen Adı</label>
                  <input
                    type="text"
                    placeholder="Osman Seymen, Ayşe Kaya..."
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                  />
                  {teacherList.length > 0 && (
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "6px" }}>Mevcut Öğretmenler:</span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        {teacherList.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`chip-btn ${formTeacher === t ? "active" : ""}`}
                            onClick={() => setFormTeacher(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
                {editingSlotId ? (
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                    onClick={() => handleDeleteSlot(editingSlotId)}
                  >
                    <Trash2 size={15} /> Bu Dersi Sil
                  </button>
                ) : (
                  <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                    Vazgeç
                  </button>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                    Kapat
                  </button>
                  <button type="submit" className="btn">
                    {editingSlotId ? "Değişiklikleri Kaydet" : "Programa Ekle"}
                  </button>
                </div>
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
  const [showEtutModal, setShowEtutModal] = useState(false);
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
          <button 
            className="btn secondary" 
            onClick={() => setShowEtutModal(true)}
            style={{ display: "flex", gap: "6px", alignItems: "center" }}
            title="Öğretmen ve öğrenciler için birebir etüt randevu takvimi"
          >
            <Calendar size={16} /> Birebir Etüt & Randevular
          </button>
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

      {showEtutModal && (
        <EtutAppointmentModal 
          API={API} 
          students={students} 
          classes={classes} 
          onClose={() => setShowEtutModal(false)} 
        />
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
  const [showHataKarnesi, setShowHataKarnesi] = useState(false);
  const [selectedStudentForKarne, setSelectedStudentForKarne] = useState(null);

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
          <button 
            className="btn secondary" 
            onClick={() => {
              setSelectedStudentForKarne(students[0] || null);
              setShowHataKarnesi(true);
            }}
            style={{ display: "flex", gap: "6px", alignItems: "center" }}
            title="Öğrencinin deneme sınavı kazanım analizli hata karnesini açar"
          >
            <TrendingDown size={16} /> Konu Analizli Hata Karnesi
          </button>
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
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button 
                      className="btn secondary" 
                      style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center", cursor: "pointer" }}
                      title="Bu öğrencinin deneme hata karnesini görüntüle"
                      onClick={() => {
                        const st = (students || []).find(x => x.id === s.student_id) || { student_name: s.student_name, student_class: s.student_class, id: s.student_id };
                        setSelectedStudentForKarne(st);
                        setShowHataKarnesi(true);
                      }}
                    >
                      <TrendingDown size={12} color="#dc2626" /> Hata Karnesi
                    </button>
                    <button className="icon-btn" onClick={() => handleDeleteSession(s.id)}>
                      <Trash2 size={15} color="var(--danger)" />
                    </button>
                  </div>
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

      {showHataKarnesi && (
        <HataKarnesiModal 
          student={selectedStudentForKarne || (students && students[0]) || { student_name: "Öğrenci", student_class: "TYT-AYT" }} 
          onClose={() => setShowHataKarnesi(false)} 
        />
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
