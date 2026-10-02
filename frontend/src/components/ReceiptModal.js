import React from "react";
import { Printer, X, Receipt, CheckCircle2 } from "lucide-react";
import { numberToTurkishWords } from "./PromissoryNoteModal";

export function ReceiptModal({ payment, student, onClose }) {
  if (!payment) return null;

  const LOGO = "/assets/logo.jpeg";
  const amount = Number(payment.amount || 0);
  const amountWords = numberToTurkishWords(amount);
  const paymentDate = payment.payment_date 
    ? new Date(payment.payment_date).toLocaleDateString("tr-TR") 
    : new Date().toLocaleDateString("tr-TR");

  const totalFee = Number(student?.total_fee || 0);
  const paidAmount = Number(student?.paid_amount || amount);
  const remaining = Math.max(0, totalFee - paidAmount);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "720px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--primary)", fontWeight: 600 }}>RESMİ TAHSİLAT MAKBUZU SÜİTİ</div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              Tahsilat Makbuzu · No: {payment.id ? String(payment.id).slice(0, 8).toUpperCase() : "ÖNİZLEME"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn" onClick={() => window.print()} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Printer size={16} /> Makbuzu Yazdır
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", padding: "24px", background: "#f8fafc" }}>
          <div 
            className="receipt-sheet"
            style={{
              background: "#fff",
              border: "2px solid #334155",
              borderRadius: "6px",
              padding: "24px 28px",
              color: "#0f172a",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              fontFamily: "system-ui, -apple-system, sans-serif"
            }}
          >
            {/* Makbuz Başlığı */}
            <div className="receipt-header-row">
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <img src={LOGO} alt="Logo" style={{ width: "50px", height: "50px", objectFit: "contain", borderRadius: "4px" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h3>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Kemalpaşa Mah. Ilıca Sk. No:31/33A İnegöl / BURSA · Tel: 0224 715 00 02</div>
                  <div style={{ fontSize: "10px", color: "#059669", fontWeight: "600" }}>MEB Kurum Kodu: 627201 · Vergi No: 2600673412</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "15px", fontWeight: "bold", letterSpacing: "1px", color: "#1e3a8a" }}>TAHSİLAT MAKBUZU</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Seri: A · No: <b>#{payment.id ? String(payment.id).slice(0, 8).toUpperCase() : "2026-001"}</b></div>
                <div style={{ fontSize: "11px", color: "#475569" }}>Tarih: <b>{paymentDate}</b></div>
              </div>
            </div>

            {/* Öğrenci & Veli Bilgileri */}
            <div className="table-responsive" style={{ marginBottom: "16px" }}>
              <table className="receipt-info-table">
                <tbody>
                  <tr>
                    <td style={{ width: "120px", color: "#64748b" }}>Öğrenci Adı:</td>
                    <td><b>{student?.student_name || "—"}</b></td>
                    <td style={{ width: "100px", color: "#64748b" }}>Sınıf / Şube:</td>
                    <td><b>{student?.student_class || "—"}</b></td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b" }}>Veli Adı Soyadı:</td>
                    <td>{student?.parent_name || "—"}</td>
                    <td style={{ color: "#64748b" }}>Veli Telefon:</td>
                    <td>{student?.parent_phone || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#64748b" }}>Ödeme Yöntemi:</td>
                    <td>
                      <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                        {payment.method || "Nakit Kasa"}
                      </span>
                      {payment.bank && <span style={{ marginLeft: "8px", color: "#64748b" }}>({payment.bank})</span>}
                    </td>
                    <td style={{ color: "#64748b" }}>Açıklama:</td>
                    <td>{payment.note || "Eğitim Dönemi Taksit Ödemesi"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tahsilat Tutarı Gösterim Kutusu */}
            <div className="receipt-amount-box">
              <div>
                <span style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase", fontWeight: "600", display: "block" }}>
                  TAHSİL EDİLEN TUTAR (YAZIYLA)
                </span>
                <strong style={{ fontSize: "14px", color: "#14532d" }}>#{amountWords}#</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase", fontWeight: "600", display: "block" }}>
                  RAKAMLA
                </span>
                <strong style={{ fontSize: "20px", color: "#15803d" }}>
                  ₺{amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Finansal Durum Özeti */}
            <div className="receipt-financial-grid">
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Toplam Kayıt Ücreti</span>
                <b>₺{totalFee.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</b>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Şimdiye Kadar Ödenen</span>
                <b style={{ color: "#15803d" }}>₺{paidAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</b>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Kalan Net Bakiye</span>
                <b style={{ color: remaining > 0 ? "#b91c1c" : "#15803d" }}>
                  ₺{remaining.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </b>
              </div>
            </div>

            {/* İmzalar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "30px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>ÖDEMEYİ YAPAN (VELİ)</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>{student?.parent_name || student?.student_name}</div>
                <div style={{ height: "45px", borderBottom: "1px solid #cbd5e1", marginTop: "15px" }}></div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>İmza</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>TAHSİLAT YETKİLİSİ (KURUM)</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>Nevin ÇAKMAK / Semih SEYMEN</div>
                <div style={{ height: "45px", borderBottom: "1px solid #cbd5e1", marginTop: "15px" }}></div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>Kaşe / İmza</div>
              </div>
            </div>

            <div style={{ marginTop: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "8px", fontSize: "10px", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
              <span>Bu belge mali mevzuat uyarınca kurum içi tahsilat makbuzu hükmündedir.</span>
              <span>İnegöl Çözüm Bulut ERP v2.0</span>
            </div>
          </div>
        </div>

        <div className="modal-foot" style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={16} /> Makbuzu Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
