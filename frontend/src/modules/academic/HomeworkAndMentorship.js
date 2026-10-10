import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  MessageCircle,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  UserCheck,
  X
} from "lucide-react";
import { EtutAppointmentModal } from "../../components/EtutAppointmentModal";
import { HataKarnesiModal } from "../../components/HataKarnesiModal";
import { openWhatsApp, formatDate } from "../shared";

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
  const [mentorName] = useState(me?.name || "Rehberlik Servisi");
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
