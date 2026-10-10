import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Award,
  CalendarCheck,
  Edit,
  FileText,
  MessageCircle,
  Plus,
  TrendingDown,
  Users,
  Wallet,
  X
} from "lucide-react";
import { Button } from "../pages/DashboardPage";
import { can } from "../pages/AuthGuard";
import { openWhatsApp, OfficialEdesisKarneModal } from "../EdesisModules";
import { PromissoryNoteModal } from "./PromissoryNoteModal";
import { HataKarnesiModal } from "./HataKarnesiModal";
import AccountingService from "../lib/edesisAccountingService";
import { computeEffective } from "./QuickActionModal";
import { API as defaultAPI } from "./layout/AuthAndNav";

const money = (n) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(n || 0);

export function StudentProfileModal({
  student,
  onClose,
  me,
  API = defaultAPI,
  data = {},
  onEditStudent,
  onOpenPayment,
  onNavigate,
  onOpenGelir
}) {
  const [activeTab, setActiveTab] = useState("genel"); // 'genel' | 'sinavlar' | 'yoklama' | 'muhasebe' | 'rehberlik'
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedKarne, setSelectedKarne] = useState(null);
  const [showPromissoryModal, setShowPromissoryModal] = useState(false);
  const [showHataKarnesiModal, setShowHataKarnesiModal] = useState(false);
  const [showGelirModal, setShowGelirModal] = useState(false);
  const fileRef = useRef();

  const refresh = () => {
    if (!student) return;
    setLoading(true);
    setDetail(null);
    axios
      .get(`${API}/students/${student.id}/detail`)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    setUploadMsg("");
    /* eslint-disable-next-line */
  }, [student?.id]);

  if (!student) return null;

  const s = detail?.student || student;
  const localCollections = AccountingService?.getCollections ? AccountingService.getCollections() : [];
  const payments =
    detail?.payments && detail.payments.length > 0
      ? detail.payments
      : localCollections
          .filter((c) => c.student_id === s.id || c.musteriUnvan === s.student_name)
          .map((c) => ({
            id: c.id,
            payment_date: c.tahsilatTarihi || c.payment_date || new Date().toISOString(),
            method: c.odemeTuru || c.method || "Nakit",
            amount: c.tahsilatTutari || c.amount || 0,
            note: c.aciklama || c.note || "Tahsilat",
            created_by_name: c.kaydeden || "Muhasebe"
          }));
  const plan = detail?.installment_plan || [];
  const { extraSum, discount, effective } = computeEffective(s);
  const canEdit = can(me, "student_create");

  // Öğrencinin katıldığı sınavlar
  const studentExams =
    detail?.exam_results && detail.exam_results.length > 0
      ? detail.exam_results
      : (data.exams || [])
          .map((exam) => {
            const res = (exam.results || []).find((r) => r.student_id === s.id);
            return res ? { exam, ...res } : null;
          })
          .filter(Boolean);

  // Öğrencinin yoklama kayıtları
  const studentAttendance =
    detail?.attendance && detail.attendance.length > 0
      ? detail.attendance
      : (data.attendanceToday || []).filter((a) => a.student_id === s.id);

  const uploadContract = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadMsg("Dosya 10MB'dan büyük olamaz");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    try {
      await axios.post(`${API}/students/${s.id}/contract-upload`, file, {
        headers: {
          "Content-Type": file.type || "application/pdf",
          "X-Filename": file.name,
          "X-Content-Type": file.type || "application/pdf"
        }
      });
      setUploadMsg("İmzalı sözleşme yüklendi ✓");
      refresh();
    } catch (e) {
      setUploadMsg(e.response?.data?.detail || "Yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  const viewContract = async () => {
    try {
      const r = await axios.get(`${API}/students/${s.id}/contract-file`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      window.open(url, "_blank");
    } catch (e) {
      setUploadMsg("Sözleşme açılamadı");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95vw",
          maxWidth: "980px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "12px"
        }}
      >
        {/* Modal Başlığı & Hızlı Aksiyonlar */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--line)",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="student-avatar big" style={{ width: 48, height: 48, fontSize: 17, background: "#2563eb", color: "#fff" }}>
              {s.student_name
                ?.split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>{s.student_name}</h2>
                <span className="status-pill success">{s.status || "Kayıtlı"}</span>
                {s.student_no && (
                  <span className="badge" style={{ background: "#e2e8f0", fontSize: "11px" }}>
                    #{s.student_no}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                {s.school || "İnegöl Anadolu Lisesi"} · <b>{s.student_class || s.program || "11-A Sayısal"}</b> · {s.department || "Sayısal"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn small secondary"
              onClick={() => {
                if (onOpenGelir) onOpenGelir(s);
                else setShowGelirModal(!showGelirModal);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#2563eb", borderColor: "#3b82f6" }}
              title="Edesis Resmi Gelir ve Taksit Detay Sayfası"
            >
              <FileText size={14} /> 📄 Gelir Detay (GLR)
            </button>
            <button
              className="btn small secondary"
              onClick={() => setShowPromissoryModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#7c3aed", borderColor: "#7c3aed" }}
              title="Öğrencinin tüm taksit senetlerini koçan halinde yazdır"
            >
              <FileText size={14} /> Matbu Senet
            </button>
            <button
              className="btn small secondary"
              onClick={() => setShowHataKarnesiModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#dc2626", borderColor: "#dc2626" }}
              title="Öğrencinin kazanım analizli hata karnesini aç"
            >
              <TrendingDown size={14} /> Hata Karnesi
            </button>
            <button
              className="btn small"
              onClick={() => {
                onClose();
                if (onOpenGelir) {
                  onOpenGelir(s);
                } else {
                  const targetNo = s?.sozlesme_no || s?.sozlesmeNo || s?.student_name;
                  if (targetNo) {
                    try {
                      sessionStorage.setItem("cozum_open_contract_no", targetNo);
                      sessionStorage.setItem("cozum_contract_prev_page", "students");
                    } catch {}
                  }
                  if (onNavigate) onNavigate("documents");
                }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#4f46e5", color: "#fff" }}
              title="Tek Sayfadan Yönetim: Sözleşme & Muhasebe Detayı"
            >
              <FileText size={14} /> Sözleşme & Muhasebe
            </button>
            {canEdit && (
              <button
                className="btn small"
                onClick={() => onEditStudent && onEditStudent(s)}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#2563eb", color: "#fff" }}
              >
                <Edit size={14} /> Öğrenciyi Düzenle
              </button>
            )}
            {s.parent_phone && (
              <button
                className="btn small"
                onClick={() =>
                  openWhatsApp(
                    s.parent_phone,
                    `Sayın Velimiz ${s.parent_name}, ${s.student_name} öğrencimizin Özel İnegöl Çözüm Kurs Merkezi bilgilendirme mesajıdır.`
                  )
                }
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#16a34a", color: "#fff" }}
              >
                <MessageCircle size={14} /> Veliye WhatsApp
              </button>
            )}
            <button className="icon-btn" onClick={onClose}>
              <X size={19} />
            </button>
          </div>
        </div>

        {/* 4 Sekmeli Navigasyon Çubuğu */}
        <div className="student-profile-tabs" style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "#fff", padding: "0 24px" }}>
          {[
            { id: "genel", label: "Genel & Kimlik", icon: Users },
            { id: "sinavlar", label: `Sınavlar & Karneler (${studentExams.length})`, icon: Award },
            { id: "yoklama", label: "Devamsızlık & Yoklama", icon: CalendarCheck },
            { id: "muhasebe", label: "Muhasebe & Taksitler", icon: Wallet }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                className="tab-btn"
                style={{
                  padding: "12px 16px",
                  border: "none",
                  background: "none",
                  borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
                  color: isActive ? "#2563eb" : "#64748b",
                  fontWeight: isActive ? "700" : "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px"
                }}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal İçeriği */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Bilgiler yükleniyor...</div>}

          {/* SEKME 1: GENEL & KİMLİK */}
          {activeTab === "genel" && (
            <div>
              <div className="mini-stats" style={{ marginBottom: "16px" }}>
                <div>
                  <span>Öğrenim Ücreti</span>
                  <b>{money(s.total_fee)}</b>
                </div>
                <div>
                  <span>+ Ekstra Ücretler</span>
                  <b className="green">+{money(extraSum)}</b>
                </div>
                <div>
                  <span>− İndirim</span>
                  <b className="red">−{money(discount)}</b>
                </div>
                <div>
                  <span>Net Toplam</span>
                  <b style={{ color: "#2563eb" }}>{money(effective)}</b>
                </div>
                <div>
                  <span>Kalan Borç</span>
                  <b className="red">{money(Math.max(0, effective - (s.paid_amount || 0)))}</b>
                </div>
              </div>

              <h3 className="drawer-h3">Öğrenci & Kayıt Detayları (Edesis)</h3>
              <div className="drawer-grid" style={{ marginBottom: "16px" }}>
                <div>
                  <span>Öğrenci No</span>
                  <b>{s.student_no ? `#${s.student_no}` : "—"}</b>
                </div>
                <div>
                  <span>T.C. Kimlik No</span>
                  <b>{s.student_tc || "—"}</b>
                </div>
                <div>
                  <span>Cinsiyet</span>
                  <b>{s.gender || "—"}</b>
                </div>
                <div>
                  <span>Doğum Tarihi</span>
                  <b>{s.birth_date ? new Date(s.birth_date).toLocaleDateString("tr-TR") : "—"}</b>
                </div>
                <div>
                  <span>Alanı / Bölümü</span>
                  <b>{s.department || "—"}</b>
                </div>
                <div>
                  <span>Kayıt Durumu</span>
                  <b className="status-pill success">{s.status || "Kayıtlı"}</b>
                </div>
                <div>
                  <span>Sınıfı / Şubesi</span>
                  <b>{s.student_class || "—"}</b>
                </div>
                <div>
                  <span>Sözleşme No</span>
                  <b style={{ color: "#2563eb", fontFamily: "monospace" }}>{s.sozlesme_no || "—"}</b>
                </div>
                <div>
                  <span>Ödeme Planı</span>
                  <b>{s.installment_count ? `${s.installment_count} Taksit` : "Peşin"}</b>
                </div>
                <div>
                  <span>Kayıtlı Okulu</span>
                  <b>{s.school || "İnegöl"}</b>
                </div>
              </div>

              {s.health_notes && (
                <div style={{ margin: "10px 0 16px", padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}>
                  <b style={{ color: "#475569" }}>Sağlık & Özel Not:</b> {s.health_notes}
                </div>
              )}

              <h3 className="drawer-h3">Veli & Aile İletişim Bilgileri</h3>
              <div className="drawer-grid" style={{ marginBottom: "16px" }}>
                <div>
                  <span>Öğrenci Telefonu</span>
                  <b>{s.student_phone || "—"}</b>
                </div>
                <div>
                  <span>İkamet Adresi</span>
                  <b>{s.student_address || "—"}</b>
                </div>
                <div>
                  <span>Baba (Birincil Veli)</span>
                  <b>{s.parent_name || "—"}</b>
                </div>
                <div>
                  <span>Baba Telefonu</span>
                  <b>{s.parent_phone || "—"}</b>
                </div>
                <div>
                  <span>Baba Mesleği</span>
                  <b>{s.father_job || "—"}</b>
                </div>
                <div>
                  <span>Anne Adı</span>
                  <b>{s.mother_name || "—"}</b>
                </div>
                <div>
                  <span>Anne Telefonu</span>
                  <b>{s.mother_phone || "—"}</b>
                </div>
                <div>
                  <span>Anne Mesleği</span>
                  <b>{s.mother_job || "—"}</b>
                </div>
                <div>
                  <span>Vasi (Varsa)</span>
                  <b>{s.guardian_name || "—"}</b>
                </div>
              </div>

              <h3 className="drawer-h3">İmzalı Kayıt Sözleşmesi Arşivi</h3>
              <div className="contract-upload-box">
                {s.signed_contract_path ? (
                  <div className="contract-file">
                    <FileText size={24} color="#2563eb" />
                    <div>
                      <b>{s.signed_contract_filename || "Resmi Sözleşme"}</b>
                      <span>{s.signed_contract_uploaded_at ? new Date(s.signed_contract_uploaded_at).toLocaleString("tr-TR") : ""}</span>
                    </div>
                    <Button testid="view-contract-button" secondary onClick={viewContract}>
                      <FileText size={14} /> Sözleşmeyi Görüntüle
                    </Button>
                  </div>
                ) : (
                  <div className="contract-empty">
                    <FileText size={26} color="#94a3b8" />
                    <div>
                      <b>Henüz taranmış ıslak imzalı sözleşme yüklenmedi</b>
                      <span>Veliyle imzaladığınız sözleşmeyi tarayıp dijital arşivleyin (PDF/JPG · maks 10MB)</span>
                    </div>
                    {canEdit && <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => uploadContract(e.target.files?.[0])} />}
                  </div>
                )}
                {uploading && (
                  <div className="report-msg" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                    Yükleniyor...
                  </div>
                )}
                {uploadMsg && <div className="report-msg">{uploadMsg}</div>}
              </div>
            </div>
          )}

          {/* SEKME 2: SINAVLAR, KARNELER & HATA ANALİZİ */}
          {activeTab === "sinavlar" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Katıldığı Deneme Sınavları & Net Analizi</h4>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Toplam {studentExams.length} Sınav Sonucu Bulundu</span>
              </div>

              {studentExams.length > 0 ? (
                <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                  <table className="data-table" style={{ width: "100%", fontSize: "12px", margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Sınav Adı</th>
                        <th>Kitapçık</th>
                        <th>Türkçe</th>
                        <th>Matematik</th>
                        <th>Fen</th>
                        <th>Sosyal</th>
                        <th>Toplam Net</th>
                        <th>Puan</th>
                        <th>Sıralama</th>
                        <th style={{ textAlign: "right" }}>Karne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentExams.map((ex, idx) => (
                        <tr key={idx}>
                          <td>
                            <b>{ex.exam?.title || ex.exam_title || "Kurumsal Deneme"}</b>
                          </td>
                          <td>
                            <span className="badge" style={{ background: "#f1f5f9" }}>
                              {ex.booklet || "A"}
                            </span>
                          </td>
                          <td>{ex.turkish_net}</td>
                          <td>{ex.math_net}</td>
                          <td>{ex.science_net}</td>
                          <td>{ex.social_net}</td>
                          <td>
                            <b style={{ color: "#2563eb" }}>{ex.total_net}</b>
                          </td>
                          <td>
                            <b style={{ color: "#16a34a" }}>{ex.score}</b>
                          </td>
                          <td>
                            <span className="badge" style={{ background: "#fef3c7", color: "#b45309" }}>
                              #{ex.overall_rank || 1}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn small"
                              onClick={() => setSelectedKarne({ ...ex, student_name: s.student_name, student_no: s.student_no, student_class: s.student_class })}
                              style={{ padding: "4px 8px", fontSize: "11px", background: "#7c3aed", color: "#fff" }}
                            >
                              Karne Gör
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "36px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <Award size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Öğrenciye ait henüz bir sınav sonucu kaydı bulunamadı.</p>
                </div>
              )}
            </div>
          )}

          {/* SEKME 3: DEVAMSIZLIK & YOKLAMA */}
          {activeTab === "yoklama" && (
            <div>
              <div className="mini-stats" style={{ marginBottom: "16px" }}>
                <div>
                  <span>Toplam Kayıt</span>
                  <b>{studentAttendance.length}</b>
                </div>
                <div>
                  <span>Geldiği Gün</span>
                  <b className="green">{studentAttendance.filter((a) => a.status === "geldi").length}</b>
                </div>
                <div>
                  <span>Devamsızlık</span>
                  <b className="red">{studentAttendance.filter((a) => a.status === "gelmedi").length}</b>
                </div>
                <div>
                  <span>İzinli / Geç</span>
                  <b style={{ color: "#b45309" }}>{studentAttendance.filter((a) => ["izinli", "gec"].includes(a.status)).length}</b>
                </div>
              </div>

              {studentAttendance.length > 0 ? (
                <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                  <table className="data-table" style={{ width: "100%", fontSize: "13px", margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Ders Saati</th>
                        <th>Durum</th>
                        <th>Açıklama / Not</th>
                        <th style={{ textAlign: "right" }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAttendance.map((a, idx) => (
                        <tr key={idx}>
                          <td>
                            <b>{new Date(a.date).toLocaleDateString("tr-TR")}</b>
                          </td>
                          <td>{a.lesson_slot || "Tüm Gün"}</td>
                          <td>
                            <span className={`status-pill ${a.status === "geldi" ? "success" : a.status === "gelmedi" ? "danger" : "warning"}`}>
                              {a.status === "geldi" ? "Geldi" : a.status === "gelmedi" ? "Gelmedi" : a.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: "#64748b" }}>{a.note || "—"}</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {s.parent_phone && a.status === "gelmedi" && (
                              <button
                                className="btn small secondary"
                                onClick={() =>
                                  openWhatsApp(
                                    s.parent_phone,
                                    `Sayın Velimiz, ${s.student_name} öğrencimiz ${new Date(a.date).toLocaleDateString("tr-TR")} tarihinde kurumumuza katılmamıştır.`
                                  )
                                }
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                              >
                                Devamsızlık Bildir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "36px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <CalendarCheck size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Öğrenciye ait güncel devamsızlık kaydı bulunmuyor.</p>
                </div>
              )}
            </div>
          )}

          {/* SEKME 4: MUHASEBE & TAKSİTLER */}
          {activeTab === "muhasebe" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Taksit ve Ödeme Çizelgesi</h4>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn small secondary"
                    onClick={() => {
                      if (onOpenGelir) onOpenGelir(s);
                      else setShowGelirModal(!showGelirModal);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#2563eb", borderColor: "#93c5fd" }}
                  >
                    <FileText size={14} /> 📄 Edesis Gelir Detayı (GLR)
                  </button>
                  <button className="btn small" onClick={() => onOpenPayment && onOpenPayment()} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Plus size={14} /> Tahsilat Ekle
                  </button>
                </div>
              </div>

              <div className="plan-table" style={{ marginBottom: "20px" }}>
                <div className="plan-row plan-head">
                  <span>#</span>
                  <span>Vade Tarihi</span>
                  <span>Taksit Tutarı</span>
                  <span>Ödenen</span>
                  <span>Kalan</span>
                  <span>Durum</span>
                </div>
                {plan.map((p) => (
                  <div key={p.no} className={`plan-row plan-${p.status}`}>
                    <span>
                      <b>#{p.no}</b>
                    </span>
                    <span>{new Date(p.due_date).toLocaleDateString("tr-TR")}</span>
                    <span>
                      <b>{money(p.amount)}</b>
                    </span>
                    <span style={{ color: "#16a34a" }}>{money(p.paid)}</span>
                    <span style={{ color: p.remaining > 0 ? "#dc2626" : "#64748b" }}>{money(p.remaining)}</span>
                    <span>
                      <span className={`status-pill ${p.status === "paid" ? "success" : p.status === "partial" ? "warning" : "danger"}`}>
                        {p.status === "paid" ? "Ödendi" : p.status === "partial" ? "Kısmi" : "Bekliyor"}
                      </span>
                    </span>
                  </div>
                ))}
                {plan.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>Taksit planı oluşturulmamış.</div>}
              </div>

              <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700" }}>Geçmiş Tahsilat Hareketleri</h4>
              <div className="plan-table">
                <div className="plan-row plan-head">
                  <span>Tarih</span>
                  <span>Yöntem</span>
                  <span>Tutar</span>
                  <span>Açıklama</span>
                  <span>Kaydeden</span>
                </div>
                {payments.map((p) => (
                  <div key={p.id} className="plan-row">
                    <span>{new Date(p.payment_date).toLocaleDateString("tr-TR")}</span>
                    <span>
                      <span className="method-tag">{p.method}</span>
                    </span>
                    <span>
                      <b style={{ color: "#16a34a" }}>{money(p.amount)}</b>
                    </span>
                    <span>{p.note || "—"}</span>
                    <span>{p.created_by_name || "—"}</span>
                  </div>
                ))}
                {payments.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>Henüz tahsilat kaydı yok.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Modal Alt Çubuğu */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--line)", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>

      {/* KARNE MODALI POPUP */}
      {selectedKarne && <OfficialEdesisKarneModal data={selectedKarne} onClose={() => setSelectedKarne(null)} />}

      {/* MATBU SENET KOÇANI */}
      {showPromissoryModal && <PromissoryNoteModal student={s} onClose={() => setShowPromissoryModal(false)} />}

      {/* KAZANIM HATA KARNESİ */}
      {showHataKarnesiModal && <HataKarnesiModal student={s} onClose={() => setShowHataKarnesiModal(false)} />}
    </div>
  );
}

export const StudentDetailDrawer = StudentProfileModal;
export default StudentProfileModal;
