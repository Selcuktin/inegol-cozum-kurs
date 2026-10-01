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
  AlertTriangle
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
// 1. ÖLÇME & SINAVLAR (EXAMS, RESULTS, REPORT CARD & HATA KARNESİ)
// ==========================================================
export function ExamsPage({ me, API, students, classes }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("Tümü");
  const [selectedExam, setSelectedExam] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [reportStudent, setReportStudent] = useState(null);

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
      setExams(res.data || []);
      if (selectedExam) {
        const detail = await axios.get(`${API}/exams/${selectedExam.id}`);
        setSelectedExam(detail.data);
      }
    } catch (err) {
      console.error("Exams load error:", err);
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
      setSelectedExam(res.data);
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

  const filteredExams = useMemo(() => {
    if (typeFilter === "Tümü") return exams;
    return exams.filter((x) => x.exam_type === typeFilter);
  }, [exams, typeFilter]);

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">ÖLÇME VE DEĞERLENDİRME · EDESİS STANDARDI</div>
          <h1>Deneme Sınavları & Karneler</h1>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setShowAddModal(true)}>
            <Plus size={17} /> Yeni Deneme Sınavı
          </button>
        </div>
      </div>

      <div className="exam-filter-row">
        <div className="filter-pill-group">
          {["Tümü", "TYT", "AYT", "LGS", "YDT"].map((t) => (
            <button
              key={t}
              className={`filter-pill ${typeFilter === t ? "active" : ""}`}
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="result-count">{filteredExams.length} Deneme Sınavı</span>
      </div>

      <div className="exams-split-view">
        {/* Sınav Listesi */}
        <div className="exams-list-pane">
          {loading ? (
            <div className="loading-state">Yükleniyor...</div>
          ) : filteredExams.length === 0 ? (
            <div className="empty-panel">
              <Award size={36} />
              <p>Henüz bu kategoride deneme sınavı tanımlanmamış.</p>
            </div>
          ) : (
            filteredExams.map((exam) => {
              const isSel = selectedExam?.id === exam.id;
              return (
                <div
                  key={exam.id}
                  className={`exam-card ${isSel ? "selected" : ""}`}
                  onClick={() => openExamDetail(exam)}
                >
                  <div className="exam-card-head">
                    <span className={`exam-type-badge ${exam.exam_type.toLowerCase()}`}>
                      {exam.exam_type}
                    </span>
                    <span className="exam-date">{formatDate(exam.exam_date)}</span>
                  </div>
                  <h3 className="exam-title">{exam.title}</h3>
                  <div className="exam-publisher">{exam.publisher || "Kurumsal Yayın"}</div>
                  <div className="exam-metrics-row">
                    <div>
                      <small>Katılımcı</small>
                      <b>{exam.participant_count || 0} Öğrenci</b>
                    </div>
                    <div>
                      <small>Ortalama Net</small>
                      <b style={{ color: "var(--primary)" }}>{exam.avg_total_net || 0} Net</b>
                    </div>
                    <div>
                      <small>Ort. Puan</small>
                      <b>{exam.avg_score || 0}</b>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Seçili Sınav Detay ve Sıralama Paneli */}
        <div className="exam-detail-pane">
          {selectedExam ? (
            <div className="panel exam-results-panel">
              <div className="panel-head" style={{ alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className={`exam-type-badge ${selectedExam.exam_type.toLowerCase()}`}>
                      {selectedExam.exam_type}
                    </span>
                    <span className="period">{formatDate(selectedExam.exam_date)}</span>
                  </div>
                  <h2 style={{ marginTop: "6px" }}>{selectedExam.title}</h2>
                  <p>{selectedExam.description || `${selectedExam.publisher} Kurumsal Deneme Sınavı Sonuç Listesi`}</p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="btn" onClick={() => setShowResultModal(true)}>
                    <Plus size={16} /> Sonuç Ekle
                  </button>
                  <button
                    className="icon-btn"
                    title="Sınavı Sil"
                    onClick={() => handleDeleteExam(selectedExam.id)}
                  >
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </div>
              </div>

              {/* Sonuç Tablosu */}
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>SIRA</th>
                      <th>ÖĞRENCİ</th>
                      <th>KİTAPÇIK</th>
                      <th>TÜRKÇE</th>
                      <th>MATEMATİK</th>
                      <th>FEN</th>
                      <th>SOSYAL</th>
                      <th>TOPLAM NET</th>
                      <th>PUAN</th>
                      <th>İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedExam.results || []).length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                          Bu deneme için henüz sonuç girilmemiş. "Sonuç Ekle" butonu ile veri girebilirsiniz.
                        </td>
                      </tr>
                    ) : (
                      (selectedExam.results || []).map((r, idx) => (
                        <tr key={r.id || idx}>
                          <td>
                            <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : ""}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <div className="person">
                              <div className="student-avatar">
                                {(r.student_name || "Ö").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <b>{r.student_name}</b>
                                <span>{r.student_class || "11-A"}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="booklet-pill">{r.booklet || "A"}</span>
                          </td>
                          <td><b>{r.turkish_net}</b> <small>({r.turkish_correct}D/{r.turkish_incorrect}Y)</small></td>
                          <td><b>{r.math_net}</b> <small>({r.math_correct}D/{r.math_incorrect}Y)</small></td>
                          <td><b>{r.science_net}</b> <small>({r.science_correct}D/{r.science_incorrect}Y)</small></td>
                          <td><b>{r.social_net}</b> <small>({r.social_correct}D/{r.social_incorrect}Y)</small></td>
                          <td>
                            <strong style={{ color: "var(--primary)", fontSize: "14px" }}>
                              {r.total_net}
                            </strong>
                          </td>
                          <td>
                            <strong>{r.score}</strong>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                className="small-action-btn"
                                title="Edesis Öğrenci Karnesi & Hata Karnesi"
                                onClick={() => setReportStudent({ ...r, exam: selectedExam })}
                              >
                                <FileText size={15} /> Karne
                              </button>
                              <button
                                className="small-action-btn wa"
                                title="Veliye WhatsApp İle Gönder"
                                onClick={() => {
                                  const text = `Sayın Velimiz, İnegöl Çözüm Kursu öğrencimiz ${r.student_name}, ${selectedExam.title} deneme sınavında Toplam ${r.total_net} Net ve ${r.score} Puan alarak şube bazında ${idx + 1}. olmuştur. Ayrıntılı karne kurumuzda paylaşılmıştır.`;
                                  openWhatsApp(r.parent_phone || r.student_phone, text);
                                }}
                              >
                                <MessageCircle size={15} />
                              </button>
                            </div>
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
              <Award size={48} color="var(--primary)" />
              <h3>Bir Deneme Sınavı Seçin</h3>
              <p>Sonuçları, sınıf sıralamalarını ve öğrenci hata karnelerini incelemek için soldaki listeden bir deneme seçin.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Yeni Sınav */}
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
                      placeholder="Özdebir, Çözüm, Limit..."
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
                <button type="submit" className="btn">
                  Sınavı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sonuç Ekle */}
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

      {/* KARNE & HATA KARNESİ MODAL */}
      {reportStudent && (
        <ReportCardModal
          data={reportStudent}
          onClose={() => setReportStudent(null)}
        />
      )}
    </div>
  );
}

// ==========================================================
// EDESIS ÖĞRENCİ DENEME SINAVI KARNESİ VE HATA KARNESİ
// ==========================================================
function ReportCardModal({ data, onClose }) {
  const weakTopics = useMemo(() => {
    try {
      if (typeof data.weak_topics === "string") {
        return JSON.parse(data.weak_topics);
      }
      return data.weak_topics || [];
    } catch {
      return [];
    }
  }, [data.weak_topics]);

  const printKarne = () => {
    window.print();
  };

  const shareWhatsApp = () => {
    const text = `İNEGÖL ÇÖZÜM KURSU - DENEME KARNESİ
Öğrenci: ${data.student_name}
Sınav: ${data.exam?.title} (${data.exam?.exam_type})
Türkçe: ${data.turkish_net} Net
Matematik: ${data.math_net} Net
Fen Bilimleri: ${data.science_net} Net
Sosyal Bilgiler: ${data.social_net} Net
TOPLAM NET: ${data.total_net} Net
PUAN: ${data.score}
Şube Derecesi: ${data.class_rank || 1}

Detaylı gelişim ve konu takip raporu için kurumumuzla iletişime geçebilirsiniz.`;
    openWhatsApp(data.parent_phone || data.student_phone, text);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal report-card-modal printable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head no-print">
          <h2>Edesis Deneme Sınavı Karnesi</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn secondary" onClick={printKarne}>
              <Printer size={16} /> Yazdır / PDF
            </button>
            <button className="btn" style={{ background: "#25D366" }} onClick={shareWhatsApp}>
              <MessageCircle size={16} /> Veliye Gönder
            </button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Yazdırılabilir Resmi Karne Şablonu */}
        <div className="karne-container" id="printable-karne">
          <div className="karne-header">
            <div className="karne-institution">
              <img src="/assets/logo.jpeg" alt="Logo" className="karne-logo" />
              <div>
                <h2>İNEGÖL ÇÖZÜM ÖZEL ÖĞRETİM KURSU</h2>
                <p>ÖLÇME VE DEĞERLENDİRME BİRİMİ · EDESİS SINAV KARNESİ</p>
              </div>
            </div>
            <div className="karne-exam-badge">
              <strong>{data.exam?.exam_type || "TYT"}</strong>
              <span>DENEME SONUÇ BELGESİ</span>
            </div>
          </div>

          <div className="karne-student-info">
            <div className="info-block">
              <label>Öğrenci Adı Soyadı</label>
              <b>{data.student_name}</b>
            </div>
            <div className="info-block">
              <label>Sınıfı / Okulu</label>
              <b>{data.student_class || "11-A"} · {data.school || "İnegöl"}</b>
            </div>
            <div className="info-block">
              <label>Sınav Adı</label>
              <b>{data.exam?.title}</b>
            </div>
            <div className="info-block">
              <label>Tarih & Kitapçık</label>
              <b>{formatDate(data.exam?.exam_date)} · {data.booklet || "A"} Kitapçığı</b>
            </div>
          </div>

          {/* Net Tablosu */}
          <table className="karne-table">
            <thead>
              <tr>
                <th>DERS ADI</th>
                <th>SORU</th>
                <th>DOĞRU</th>
                <th>YANLIŞ</th>
                <th>BOŞ</th>
                <th>NET</th>
                <th>BAŞARI %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Türkçe</b></td>
                <td>40</td>
                <td>{data.turkish_correct}</td>
                <td>{data.turkish_incorrect}</td>
                <td>{Math.max(0, 40 - (data.turkish_correct + data.turkish_incorrect))}</td>
                <td><strong className="net-val">{data.turkish_net}</strong></td>
                <td>
                  <div className="karne-bar-track">
                    <div
                      className="karne-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((data.turkish_net / 40) * 100))}%` }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td><b>Matematik</b></td>
                <td>40</td>
                <td>{data.math_correct}</td>
                <td>{data.math_incorrect}</td>
                <td>{Math.max(0, 40 - (data.math_correct + data.math_incorrect))}</td>
                <td><strong className="net-val">{data.math_net}</strong></td>
                <td>
                  <div className="karne-bar-track">
                    <div
                      className="karne-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((data.math_net / 40) * 100))}%` }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td><b>Fen Bilimleri</b></td>
                <td>20</td>
                <td>{data.science_correct}</td>
                <td>{data.science_incorrect}</td>
                <td>{Math.max(0, 20 - (data.science_correct + data.science_incorrect))}</td>
                <td><strong className="net-val">{data.science_net}</strong></td>
                <td>
                  <div className="karne-bar-track">
                    <div
                      className="karne-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((data.science_net / 20) * 100))}%` }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td><b>Sosyal Bilgiler</b></td>
                <td>20</td>
                <td>{data.social_correct}</td>
                <td>{data.social_incorrect}</td>
                <td>{Math.max(0, 20 - (data.social_correct + data.social_incorrect))}</td>
                <td><strong className="net-val">{data.social_net}</strong></td>
                <td>
                  <div className="karne-bar-track">
                    <div
                      className="karne-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((data.social_net / 20) * 100))}%` }}
                    />
                  </div>
                </td>
              </tr>
              <tr className="karne-total-row">
                <td><strong>TOPLAM</strong></td>
                <td><strong>120</strong></td>
                <td><strong>{data.turkish_correct + data.math_correct + data.science_correct + data.social_correct}</strong></td>
                <td><strong>{data.turkish_incorrect + data.math_incorrect + data.science_incorrect + data.social_incorrect}</strong></td>
                <td><strong>—</strong></td>
                <td><strong className="net-val large">{data.total_net}</strong></td>
                <td><strong>%{Math.round((data.total_net / 120) * 100)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Puan ve Sıralama Blokları */}
          <div className="karne-scores-grid">
            <div className="score-card">
              <span>HESAPLANAN PUAN</span>
              <strong>{data.score}</strong>
            </div>
            <div className="score-card">
              <span>ŞUBE DERECESİ</span>
              <strong>{data.class_rank || 1} / 24</strong>
            </div>
            <div className="score-card">
              <span>KURUM DERECESİ</span>
              <strong>{data.overall_rank || 1} / 120</strong>
            </div>
          </div>

          {/* EDESIS HATA KARNESİ (EKSİK KONU VE KAZANIM ANALİZİ) */}
          <div className="hata-karnesi-box">
            <div className="hata-karnesi-head">
              <AlertTriangle size={18} color="#eab308" />
              <h4>Edesis Hata Karnesi · Eksik Konu & Kazanım Analizi</h4>
            </div>
            <p>
              Öğrencinin bu deneme sınavında yanlış yaptığı veya boş bıraktığı tespit edilen kritik konular:
            </p>
            {weakTopics.length > 0 ? (
              <div className="topic-tags-list">
                {weakTopics.map((topic, i) => (
                  <span key={i} className="weak-topic-pill">
                    ⚠️ {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--success)", fontWeight: 600, margin: "6px 0" }}>
                ✓ Bu sınavda kritik bir eksik konu kaydı bulunmamaktadır.
              </p>
            )}
            <small className="hata-note">
              * Rehberlik ve ders öğretmenleri bu eksik konular doğrultusunda birebir etüt veya ödevlendirme planlayacaktır.
            </small>
          </div>

          <div className="karne-footer">
            <div className="sign-box">
              <span>Rehberlik & Ölçme Servisi</span>
              <b>Burak Hoca</b>
            </div>
            <div className="sign-box">
              <span>Kurum Müdürü</span>
              <b>Semih Seymen</b>
            </div>
          </div>
        </div>
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
export function EdesisDashboardWidgets({ data, onNavigate }) {
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
        <div className="countdown-card yks">
          <div className="countdown-icon">
            <GraduationCap size={22} />
          </div>
          <div className="countdown-copy">
            <span>YKS (TYT - AYT) Sınavına Kalan</span>
            <div className="countdown-val">
              <strong>{countdowns.yksDiff}</strong> <span>GÜN</span>
            </div>
            <small>Üniversiteye Hazırlık Süreci</small>
          </div>
        </div>

        <div className="countdown-card lgs">
          <div className="countdown-icon">
            <Target size={22} />
          </div>
          <div className="countdown-copy">
            <span>LGS Sınavına Kalan</span>
            <div className="countdown-val">
              <strong>{countdowns.lgsDiff}</strong> <span>GÜN</span>
            </div>
            <small>Nitelikli Liselere Hazırlık</small>
          </div>
        </div>

        <div className="countdown-card attendance-card" onClick={() => onNavigate("attendance")}>
          <div className="countdown-icon att">
            <UserCheck size={22} />
          </div>
          <div className="countdown-copy">
            <span>Bugünkü Ders Yoklaması</span>
            <div className="countdown-val">
              <strong>{attSummary.present}</strong> <span style={{ fontSize: "14px", color: "var(--muted)" }}>/ {attSummary.total || data.students?.length || 2} Geldi</span>
            </div>
            <small style={{ color: attSummary.absent > 0 ? "var(--danger)" : "var(--success)" }}>
              {attSummary.absent > 0 ? `${attSummary.absent} Öğrenci Devamsız (Veliye Bildir)` : "Tüm öğrenciler derste"}
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
                <div key={r.id || i} className="top-ranking-row">
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
                <div key={c.id} style={{ display: "grid", gap: "4px" }}>
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
                  onClick={() => onNavigate("students")}
                >
                  <AlertTriangle size={15} color={alert.severity === "critical" ? "#ef4444" : "#f59e0b"} />
                  <div style={{ flex: 1 }}>
                    <b style={{ color: "#1e293b" }}>{alert.studentName}:</b> <span style={{ color: "#64748b" }}>{alert.type}</span>
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
