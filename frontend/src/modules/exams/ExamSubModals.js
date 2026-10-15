import { EdesisOptikSuiteModal } from "./EdesisOptikSuiteModal";
import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Award,
  BarChart2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Key,
  MessageCircle,
  PieChart,
  Printer,
  Search,
  Sliders,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { trIncludes, normalizeTr } from "../../lib/utils";
import { openWhatsApp, formatDate } from "../shared";

// ==========================================================
// 1.A EDESIS RAPOR İŞLEMLERİ MODALI
// ==========================================================
export function EdesisRaporModal({ exam, onClose, onOpenKarne, onExportExcel, onOpenComparison }) {
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
export function EdesisStudentReportsView({ students, exams, onOpenKarne }) {
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
// 1.D CEVAP ANAHTARI MODALI
// ==========================================================
export function EdesisCevapKeyModal(props) {
  return <EdesisOptikSuiteModal {...props} />;
}

// ==========================================================
// 1.F SINIF KARŞILAŞTIRMA MODALI
// ==========================================================
export function EdesisSinifKarsilastirmaModal({ exam, onClose }) {
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
export function EdesisExamCalendarView({ exams, onSelectExam }) {
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
