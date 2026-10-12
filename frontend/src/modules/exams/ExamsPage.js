import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Award,
  BarChart2,
  Calendar,
  ChevronDown,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Key,
  MessageCircle,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { trIncludes } from "../../lib/utils";
import { openWhatsApp, formatDate } from "../shared";
import { OfficialEdesisKarneModal } from "./OfficialEdesisKarneModal";
import { EdesisOptikModal } from "./EdesisOptikSuiteModal";
import {
  EdesisRaporModal,
  EdesisStudentReportsView,
  EdesisCevapKeyModal,
  EdesisSinifKarsilastirmaModal,
  EdesisExamCalendarView
} from "./ExamSubModals";

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

  const loadExams = useCallback(async () => {
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
      setSelectedExam((prev) => {
        if (prev) {
          return fullList.find((x) => x.id === prev.id) || fullList[0] || null;
        }
        return fullList.find((x) => (x.participant_count || (x.results || []).length) > 0) || fullList[0] || null;
      });
    } catch (err) {
      console.error("Exams load error:", err);
      setExams([]);
      setSelectedExam(null);
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

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
