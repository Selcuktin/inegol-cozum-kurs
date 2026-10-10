import React, { useState } from "react";
import { Printer, X, Receipt, CheckCircle2, Edit3 } from "lucide-react";
import { numberToTurkishWords } from "./PromissoryNoteModal";
import { StudentService } from "../lib/edesisService";

function normTr(str) {
  return String(str || "")
    .trim()
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ");
}

export function formatPaymentDate(raw) {
  if (!raw) return new Date().toLocaleDateString("tr-TR");
  const str = String(raw).trim();
  if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
    return str.slice(0, 10);
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const formatted = d.toLocaleDateString("tr-TR");
    if (formatted && !formatted.includes("Invalid")) return formatted;
  }
  return new Date().toLocaleDateString("tr-TR");
}

export function ReceiptModal({ payment, student, onClose }) {
  const [editableAmount, setEditableAmount] = useState(() => Number(payment?.amount || 0));
  if (!payment) return null;

  const LOGO = "/assets/logo.jpeg";
  const amount = editableAmount;
  const amountWords = numberToTurkishWords(amount);
  const paymentDate = formatPaymentDate(payment.payment_date || payment.tahsilatTarihi || payment.date);

  const sNameNorm = normTr(student?.student_name);
  const rawParentNorm = normTr(student?.parent_name);
  const isInvalidParent = (pNorm) =>
    !pNorm ||
    pNorm === "—" ||
    pNorm === "-" ||
    pNorm === "VELİ" ||
    pNorm === "VELI" ||
    pNorm === "BELİRTİLMEDİ" ||
    (sNameNorm && pNorm === sNameNorm);

  let matchedStudent = null;
  if (isInvalidParent(rawParentNorm) || !student?.parent_phone || student?.parent_phone === "—") {
    try {
      const allStudents = StudentService?.getAllStudents ? StudentService.getAllStudents() : [];
      const cleanId = String(student?.id || "").replace(/^stu-/, "");
      const sTc = String(student?.student_tc || "").trim();
      matchedStudent =
        allStudents.find((s) => {
          if (!s) return false;
          if (cleanId && (String(s.id) === String(student?.id) || String(s.id).replace(/^stu-/, "") === cleanId)) return true;
          if (sTc && String(s.student_tc || "").trim() === sTc) return true;
          if (sNameNorm && normTr(s.student_name) === sNameNorm) return true;
          return false;
        }) || null;
    } catch {}
  }

  const candidateParent = !isInvalidParent(rawParentNorm)
    ? student.parent_name
    : !isInvalidParent(normTr(matchedStudent?.parent_name))
    ? matchedStudent.parent_name
    : "";

  const resolvedParentName =
    candidateParent ||
    (student?.parent_name && normTr(student.parent_name) !== sNameNorm && normTr(student.parent_name) !== "VELİ"
      ? student.parent_name
      : "—");

  const resolvedParentPhone =
    (student?.parent_phone && student.parent_phone !== "—" ? student.parent_phone : "") ||
    (matchedStudent?.parent_phone && matchedStudent.parent_phone !== "—" ? matchedStudent.parent_phone : "") ||
    (student?.student_phone && student.student_phone !== "—" ? student.student_phone : "") ||
    (matchedStudent?.student_phone && matchedStudent.student_phone !== "—" ? matchedStudent.student_phone : "") ||
    "—";

  let extraSum = 0;
  try {
    const extras = typeof student?.extra_fees === "string" ? JSON.parse(student?.extra_fees || "{}") : (student?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(student?.discount_amount) || 0;
  const totalFee = Math.max(0, (Number(student?.total_fee) || 0) + extraSum - discount);
  const basePaid = Number(student?.paid_amount || 0);
  const paidAmount = basePaid > 0 ? (basePaid - Number(payment.amount || 0) + amount) : amount;
  const remaining = Math.max(0, totalFee - paidAmount);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100250 }}>
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
          {/* HIZLI TUTAR DÜZENLEME & KISMİ ÖDEME BARI (Ekranda görünür, yazdırmada gizlenir) */}
          <div 
            className="no-print" 
            style={{ 
              marginBottom: "16px", 
              background: "#eff6ff", 
              border: "1px solid #bfdbfe", 
              borderRadius: "8px", 
              padding: "10px 14px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              flexWrap: "wrap", 
              gap: "10px" 
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Edit3 size={15} color="#2563eb" />
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e40af" }}>
                Tahsilat Tutarı (Kısmi Ödeme):
              </span>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "8px", fontWeight: "700", color: "#2563eb", fontSize: "13px" }}>₺</span>
                <input 
                  type="number"
                  step="any"
                  value={editableAmount || ""}
                  onChange={(e) => setEditableAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  style={{ 
                    width: "140px", 
                    padding: "5px 8px 5px 22px", 
                    fontSize: "14px", 
                    fontWeight: "700", 
                    border: "2px solid #3b82f6", 
                    borderRadius: "6px", 
                    color: "#1e3a8a", 
                    background: "#ffffff" 
                  }}
                />
              </div>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                (Kısmi ödemeler için tutarı doğrudan değiştirebilirsiniz)
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button 
                type="button" 
                onClick={() => setEditableAmount(Number(payment.amount || 0))} 
                className="btn small secondary" 
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                İlk Tutar ({Number(payment.amount || 0).toLocaleString("tr-TR")} ₺)
              </button>
            </div>
          </div>
          <div 
            className="receipt-sheet"
            style={{
              background: "#fff",
              border: "2px solid #334155",
              borderRadius: "6px",
              padding: "28px 32px",
              color: "#0f172a",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              maxWidth: "210mm",
              margin: "0 auto",
              boxSizing: "border-box"
            }}
          >
            {/* Makbuz Başlığı */}
            <div
              className="receipt-header-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "2px solid #0f172a",
                paddingBottom: "14px",
                marginBottom: "16px"
              }}
            >
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
              <table
                className="receipt-info-table"
                style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
              >
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ width: "120px", color: "#64748b", padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>Öğrenci Adı:</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}><b>{student?.student_name || "—"}</b></td>
                    <td style={{ width: "100px", color: "#64748b", padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>Sınıf / Şube:</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}><b>{student?.student_class || "—"}</b></td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ color: "#64748b", padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>Veli Adı Soyadı:</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>{resolvedParentName}</td>
                    <td style={{ color: "#64748b", padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>Veli Telefon:</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>{resolvedParentPhone}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ color: "#64748b", padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>Ödeme Yöntemi:</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>
                        {payment.method || "Nakit Kasa"}
                      </span>
                      {payment.bank && <span style={{ marginLeft: "8px", color: "#64748b" }}>({payment.bank})</span>}
                    </td>
                    <td style={{ color: "#64748b", padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>Açıklama:</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #e2e8f0" }}>{payment.note || "Eğitim Dönemi Taksit Ödemesi"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tahsilat Tutarı Gösterim Kutusu */}
            <div
              className="receipt-amount-box"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "8px",
                padding: "16px 20px",
                margin: "18px 0"
              }}
            >
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
            <div
              className="receipt-financial-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                background: "#f8fafc",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "24px",
                textAlign: "center"
              }}
            >
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
                <div style={{ fontSize: "12px", marginTop: "4px" }}>{resolvedParentName !== "—" ? resolvedParentName : (student?.student_name || "—")}</div>
                <div style={{ height: "45px", borderBottom: "1px solid #cbd5e1", marginTop: "15px" }}></div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>İmza</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>TAHSİLAT YETKİLİSİ (KURUM)</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>Nevin ÇAKMAK / Osman SEYMEN</div>
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
