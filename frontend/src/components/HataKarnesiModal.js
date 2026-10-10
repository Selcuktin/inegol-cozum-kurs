import React from "react";
import { Printer, X, Target, AlertTriangle, CheckCircle, MessageCircle, TrendingDown, BookOpen } from "lucide-react";
import { openWhatsApp } from "../EdesisModules";

export function HataKarnesiModal({ student, onClose }) {
  if (!student) return null;

  const LOGO = "/assets/logo.jpeg";
  const todayStr = new Date().toLocaleDateString("tr-TR");

  // Örnek Analiz Edilmiş Zayıf Konular (Edesis Diagnostic Engine)
  const weakTopics = [
    { subject: "Matematik", topic: "Fonksiyonlar & Grafikler", wrongCount: 14, emptyCount: 6, totalEncountered: 25, errorRate: 80, priority: "Yüksek Öncelik" },
    { subject: "Geometri", topic: "Üçgende Açılar & Kenar Bağıntıları", wrongCount: 9, emptyCount: 4, totalEncountered: 18, errorRate: 72, priority: "Yüksek Öncelik" },
    { subject: "Fizik", topic: "Elektrik Akımı & Potansiyel", wrongCount: 8, emptyCount: 3, totalEncountered: 16, errorRate: 68, priority: "Orta Öncelik" },
    { subject: "Türkçe", topic: "Paragrafta Anlatım & Ana Fikir", wrongCount: 11, emptyCount: 2, totalEncountered: 30, errorRate: 43, priority: "Normal" },
    { subject: "Kimya", topic: "Modern Atom Teorisi", wrongCount: 5, emptyCount: 2, totalEncountered: 16, errorRate: 43, priority: "Normal" },
  ];

  const weeklyTarget = 1500;
  const weeklySolved = 1240;
  const targetPct = Math.round((weeklySolved / weeklyTarget) * 100);

  const handleSendWhatsApp = () => {
    const msg = `Sayın Velimiz, Özel İnegöl Çözüm Kursu Rehberlik Birimi tarafından öğrencimiz ${student.student_name} için son deneme sınavlarına dayalı "Konu Hata Karnesi ve Gelişim Raporu" oluşturulmuştur. Öğrencinin Matematik (Fonksiyonlar) ve Geometri konularında takviye etüt planlaması yapılmıştır. Bilgilerinize sunarız.`;
    openWhatsApp(student.parent_phone, msg);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "860px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--primary)", fontWeight: 600 }}>ÖLÇME DEĞERLENDİRME & REHBERLİK</div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              Kazanım Analizli Hata Karnesi · {student.student_name}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn secondary" onClick={handleSendWhatsApp} style={{ display: "flex", gap: "6px", alignItems: "center", color: "#16a34a", borderColor: "#16a34a" }}>
              <MessageCircle size={16} /> Veliye WhatsApp ile Gönder
            </button>
            <button className="btn" onClick={() => window.print()} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Printer size={16} /> Raporu Yazdır
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", padding: "24px", background: "#f8fafc" }}>
          <div 
            className="hata-karnesi-sheet"
            style={{
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "28px 32px",
              color: "#0f172a",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
            }}
          >
            {/* Header */}
            <div className="hata-karnesi-header-row">
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <img src={LOGO} alt="Logo" style={{ width: "48px", height: "48px", objectFit: "contain" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800" }}>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h3>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Ölçme & Değerlendirme / Rehberlik ve Danışmanlık Servisi</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#b91c1c" }}>KAZANIM HATA KARNESİ</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Tarih: <b>{todayStr}</b></div>
              </div>
            </div>

            {/* Öğrenci Bilgi Şeridi */}
            <div className="hata-karnesi-student-bar">
              <div>
                <span style={{ color: "#64748b" }}>Öğrenci:</span> <b>{student.student_name}</b> (#{student.student_no || student.id?.slice(0, 5)})
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Sınıf/Program:</span> <b>{student.student_class} ({student.program || "TYT - AYT"})</b>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#64748b" }}>İncelenen Deneme:</span> <b>Son 4 Deneme Ort.</b>
              </div>
            </div>

            {/* Soru Hedefi İlerleme Çubuğu */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "14px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                <span><b>Haftalık Soru Çözüm Hedefi:</b> {weeklyTarget} Soru</span>
                <strong style={{ color: targetPct >= 100 ? "#16a34a" : "#2563eb" }}>
                  {weeklySolved} / {weeklyTarget} Soru (%{targetPct} Tamamlandı)
                </strong>
              </div>
              <div style={{ width: "100%", height: "10px", background: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, targetPct)}%`, height: "100%", background: targetPct >= 100 ? "#16a34a" : "#2563eb", borderRadius: "5px" }}></div>
              </div>
            </div>

            {/* En Çok Hata Yapılan Konular Tablosu */}
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", color: "#b91c1c" }}>
              <AlertTriangle size={16} /> En Çok Hata Yapılan İlk 5 Konu (Öncelikli Telafi)
            </h4>
            <div className="table-responsive" style={{ marginBottom: "20px" }}>
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", margin: 0 }}>
              <thead>
                <tr style={{ background: "#fee2e2", color: "#991b1b", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>BRANŞ</th>
                  <th style={{ padding: "8px 10px" }}>KAZANIM / KONU ADI</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>YANLIŞ / BOŞ</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>HATA ORANI</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>REHBERLİK ÖNCELİĞİ</th>
                </tr>
              </thead>
              <tbody>
                {weakTopics.map((wt, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <span className="program-tag">{wt.subject}</span>
                    </td>
                    <td style={{ padding: "8px 10px" }}><b>{wt.topic}</b></td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span style={{ color: "#dc2626", fontWeight: "bold" }}>{wt.wrongCount} Yanlış</span> / {wt.emptyCount} Boş
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span style={{ 
                        padding: "2px 8px", 
                        borderRadius: "4px", 
                        fontWeight: "bold", 
                        background: wt.errorRate >= 70 ? "#fecaca" : "#fed7aa",
                        color: wt.errorRate >= 70 ? "#991b1b" : "#9a3412" 
                      }}>
                        %{wt.errorRate}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: wt.priority === "Yüksek Öncelik" ? "#dc2626" : "#475569" }}>
                        {wt.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Rehberlik & Öğretmen Aksiyon Tavsiyesi */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "14px 16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e40af", marginBottom: "6px" }}>
                KURUMSAL REHBERLİK VE KOÇLUK EYLEM PLANI:
              </div>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#1e3a8a", lineHeight: "1.6" }}>
                <li>Öğrencinin <b>Matematik - Fonksiyonlar</b> konusunda temel kavram yanılgıları bulunmaktadır; branş öğretmeniyle 2 seans birebir etüt planlanmalıdır.</li>
                <li><b>Geometri</b> testlerinde soru köklerindeki kenar bağıntıları formülleri için konu özet fasikülü teslim edilmiştir.</li>
                <li>Haftalık soru çözüm hedefi <b>1500 soru</b> olarak güncellenmiş ve pazar günleri veli kontrolüne açılmıştır.</li>
              </ul>
            </div>

            {/* İmzalar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "30px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>REHBERLİK & ÖĞRENCİ KOÇU</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>Osman SEYMEN / Ayşe KAYA</div>
                <div style={{ height: "40px", borderBottom: "1px solid #cbd5e1", marginTop: "10px" }}></div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>İmza</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>VELİ BİLGİLENDİRME ONAYI</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>{student.parent_name || student.student_name}</div>
                <div style={{ height: "40px", borderBottom: "1px solid #cbd5e1", marginTop: "10px" }}></div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>Veli İmzası</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot" style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={16} /> Hata Karnesini Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
