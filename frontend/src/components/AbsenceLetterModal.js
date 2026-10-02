import React, { useState } from "react";
import { Printer, X, FileWarning, MessageCircle, AlertTriangle } from "lucide-react";
import { openWhatsApp } from "../EdesisModules";

export function AbsenceLetterModal({ student, onClose }) {
  const [warningTier, setWarningTier] = useState("5"); // 5 gün veya 10 gün
  const [absenceDays, setAbsenceDays] = useState(5);

  if (!student) return null;

  const LOGO = "/assets/logo.jpeg";
  const todayStr = new Date().toLocaleDateString("tr-TR");
  const year = new Date().getFullYear();

  const handleSendWhatsAppNotification = () => {
    const msg = `Sayın Velimiz ${student.parent_name || ""}, Özel İnegöl Çözüm Kursu'nda kayıtlı öğrencimiz ${student.student_name}'ın toplam ${absenceDays} gün devamsızlığı bulunmaktadır. MEB yönetmeliği gereği resmi devamsızlık uyarı mektubunuz hazırlanmıştır. Öğrencinin durumunu görüşmek üzere kurumumuza bekleniyorsunuz. İletişim: 0224 715 00 02`;
    openWhatsApp(student.parent_phone, msg);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "800px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--danger)", fontWeight: 600 }}>RESMİ MEB DEVAMSIZLIK TEBLİGATI</div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              Devamsızlık Uyarı Mektubu · {student.student_name}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn secondary" onClick={handleSendWhatsAppNotification} style={{ display: "flex", gap: "6px", alignItems: "center", borderColor: "#16a34a", color: "#16a34a" }}>
              <MessageCircle size={16} /> Veliye WhatsApp Uyarısı
            </button>
            <button className="btn" onClick={() => window.print()} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Printer size={16} /> Mektubu Yazdır
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: "12px 20px", background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Uyarı Seviyesi:</label>
            <select 
              value={warningTier} 
              onChange={(e) => {
                setWarningTier(e.target.value);
                setAbsenceDays(Number(e.target.value));
              }}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
            >
              <option value="5">1. Aşama Devamsızlık Uyarısı (5 Gün Aşıldı)</option>
              <option value="10">2. Aşama Son Devamsızlık İhbarı (10 Gün Sınırı)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Güncel Devamsızlık:</label>
            <input 
              type="number" 
              value={absenceDays} 
              onChange={(e) => setAbsenceDays(Number(e.target.value))}
              style={{ width: "70px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
            />
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Gün</span>
          </div>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", padding: "24px", background: "#f8fafc" }}>
          <div 
            className="absence-letter-sheet"
            style={{
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "40px 48px",
              color: "#0f172a",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              fontFamily: "'Times New Roman', Times, serif",
              lineHeight: "1.8"
            }}
          >
            {/* Resmi Başlık */}
            <div className="absence-official-header" style={{ textAlign: "center", marginBottom: "25px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>T.C.</div>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>BURSA VALİLİĞİ</div>
              <div style={{ fontSize: "12px", fontWeight: "bold" }}>İnegöl İlçe Millî Eğitim Müdürlüğü</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", marginTop: "4px" }}>ÖZEL İNEGÖL ÇÖZÜM ÖZEL ÖĞRETİM KURSU MÜDÜRLÜĞÜ</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Kurum Kodu: 627201</div>
            </div>

            {/* Sayı ve Tarih */}
            <div className="absence-ref-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "25px" }}>
              <div>
                <b>Sayı :</b> 627201.200-E.{year}/DEV-{student.id?.slice(0, 6).toUpperCase()}<br/>
                <b>Konu :</b> Öğrenci Devamsızlık Bildirimi ({warningTier}. Gün Uyarısı)
              </div>
              <div style={{ textAlign: "right" }}>
                <b>Tarih :</b> {todayStr}
              </div>
            </div>

            {/* Muhatap */}
            <div style={{ textAlign: "center", margin: "25px 0", fontSize: "13px", fontWeight: "bold" }}>
              SAYIN {student.parent_name ? student.parent_name.toUpperCase() : "ÖĞRENCİ VELİSİ"}<br/>
              <span style={{ fontSize: "11px", fontWeight: "normal", color: "#475569" }}>
                ({student.parent_address || student.student_address || "İnegöl / BURSA"})
              </span>
            </div>

            {/* İçerik */}
            <div style={{ fontSize: "13px", textAlign: "justify", textIndent: "30px", marginBottom: "20px" }}>
              Müdürlüğümüze bağlı Özel İnegöl Çözüm Özel Öğretim Kursu bünyesinde 
              <b> {student.student_class || "—"}</b> sınıfında 
              <b> #{student.student_no || student.id?.slice(0, 5)}</b> kurum numarası ile öğrenim görmekte olan velisi bulunduğunuz 
              <b> {student.student_name}</b> isimli öğrencinin <b>{todayStr}</b> tarihi itibarıyla 
              toplam <b>{absenceDays} gün</b> mazeretsiz devamsızlık yaptığı tespit edilmiştir.
            </div>

            <div style={{ fontSize: "13px", textAlign: "justify", textIndent: "30px", marginBottom: "25px" }}>
              Millî Eğitim Bakanlığı Özel Öğretim Kurumları Yönetmeliği ve ilgili mevzuat hükümleri gereğince; 
              öğrencilerin ders ve etütlere mazeretsiz devamsızlık yapmaması esastır. Devamsızlığın devam etmesi ve yasal sınırın 
              aşılması durumunda öğrencinin ilişiği kesilme sürecine girecektir. Öğrencinin akademik başarısının aksamaması ve devamsızlığa 
              yol açan nedenlerin görüşülmesi amacıyla en kısa sürede kurumumuz rehberlik ve idari birimi ile irtibata geçmeniz hususunda;
            </div>

            <div style={{ fontSize: "13px", textAlign: "right", marginTop: "20px", marginBottom: "50px" }}>
              Bilgilerinizi ve gereğini rica ederim.
            </div>

            {/* İmza Alanı */}
            <div style={{ display: "flex", justifyContent: "flex-end", textAlign: "center" }}>
              <div style={{ minWidth: "220px" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>Nevin ÇAKMAK</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>Kurum Müdürü</div>
                <div style={{ height: "45px" }}></div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>İmza / Resmî Mühür</div>
              </div>
            </div>

            {/* İletişim Alt Notu */}
            <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "10px", marginTop: "30px", fontSize: "10px", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
              <span>Adres: Kemalpaşa Mah. Ilıca Sk. No:31/33A İnegöl / BURSA</span>
              <span>Santral: 0224 715 00 02 · info@inegolcozumkurs.com</span>
            </div>
          </div>
        </div>

        <div className="modal-foot" style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={16} /> Mektubu Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
