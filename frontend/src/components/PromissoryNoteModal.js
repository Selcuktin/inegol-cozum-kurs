import React, { useState } from "react";
import { Printer, X, FileText, CheckCircle, AlertCircle } from "lucide-react";

// Türkçe Para Tutarını Yazıya Çevirme
export function numberToTurkishWords(num) {
  if (num === null || num === undefined || isNaN(num)) return "Sıfır Türk Lirası";
  const lira = Math.floor(Math.abs(num));
  const kurus = Math.round((Math.abs(num) - lira) * 100);

  const birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const basamaklar = ["", "Bin", "Milyon", "Milyar"];

  function ucHane(n) {
    let yuz = Math.floor(n / 100);
    let on = Math.floor((n % 100) / 10);
    let bir = n % 10;
    let s = "";
    if (yuz === 1) s += "Yüz";
    else if (yuz > 1) s += birler[yuz] + "Yüz";
    if (on > 0) s += onlar[on];
    if (bir > 0) s += birler[bir];
    return s;
  }

  if (lira === 0 && kurus === 0) return "Sıfır Türk Lirası";

  let str = "";
  if (lira === 0) {
    str = "Sıfır";
  } else {
    let parts = [];
    let temp = lira;
    while (temp > 0) {
      parts.push(temp % 1000);
      temp = Math.floor(temp / 1000);
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      let p = parts[i];
      if (p === 0) continue;
      if (i === 1 && p === 1) {
        str += "Bin";
      } else {
        str += ucHane(p) + (basamaklar[i] || "");
      }
    }
  }

  let result = str + " Türk Lirası";
  if (kurus > 0) {
    result += " " + ucHane(kurus) + " Kuruş";
  }
  return result;
}

export function PromissoryNoteModal({ student, onClose }) {
  const [selectedInstIndex, setSelectedInstIndex] = useState(-1); // -1 = Tüm Senetler (Koçan)
  
  if (!student) return null;

  let extraSum = 0;
  try {
    const extras = typeof student.extra_fees === "string" ? JSON.parse(student.extra_fees || "{}") : (student.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(student.discount_amount) || 0;
  const totalFee = Math.max(0, (Number(student.total_fee) || 0) + extraSum - discount);
  const paidAmount = Number(student.paid_amount || 0);
  const instCount = Math.max(1, parseInt(student.installment_count) || 1);
  const remaining = Math.max(0, totalFee - paidAmount);
  const perInst = Math.round((totalFee / instCount) * 100) / 100;

  // Taksit Planı Üretimi
  let startYear = new Date().getFullYear();
  let startMonth = new Date().getMonth() + 1;
  let startDay = 15;
  if (student.due_date && student.due_date.length >= 10) {
    const parts = student.due_date.slice(0, 10).split("-");
    startYear = parseInt(parts[0]) || startYear;
    startMonth = parseInt(parts[1]) || startMonth;
    startDay = parseInt(parts[2]) || startDay;
  }

  const installments = [];
  for (let i = 0; i < instCount; i++) {
    let m = startMonth + i;
    let y = startYear + Math.floor((m - 1) / 12);
    m = ((m - 1) % 12) + 1;
    const dueStr = `${String(Math.min(startDay, 28)).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
    const amount = (i === instCount - 1) 
      ? Math.max(0, Math.round((totalFee - (perInst * (instCount - 1))) * 100) / 100)
      : perInst;

    installments.push({
      no: i + 1,
      dueDate: dueStr,
      amount,
      amountWords: numberToTurkishWords(amount),
    });
  }

  const displayedNotes = selectedInstIndex === -1 ? installments : [installments[selectedInstIndex]];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "880px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--primary)", fontWeight: 600 }}>RESMİ MATBU SENET (BONO) SÜİTİ</div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              {student.student_name} · Matbu Senet Koçanı ({instCount} Taksit)
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn" onClick={() => window.print()} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Printer size={16} /> Senetleri Yazdır
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: "12px 20px", background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>Yazdırılacak Senet:</span>
          <select 
            value={selectedInstIndex} 
            onChange={(e) => setSelectedInstIndex(Number(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
          >
            <option value="-1">Tüm Senetleri Yazdır (Koçan - {instCount} Adet)</option>
            {installments.map((inst, idx) => (
              <option key={idx} value={idx}>
                {inst.no}. Taksit · {inst.dueDate} · {inst.amount.toLocaleString("tr-TR")} TL
              </option>
            ))}
          </select>
          <span style={{ marginLeft: "auto", fontSize: "13px", color: "var(--muted)" }}>
            Toplam: <b>{totalFee.toLocaleString("tr-TR")} TL</b>
          </span>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", padding: "20px", background: "#f8fafc" }}>
          <div className="promissory-print-area">
            {displayedNotes.map((note) => (
              <div 
                key={note.no} 
                className="promissory-note-sheet"
                style={{
                  background: "#fff",
                  border: "2px solid #1e293b",
                  borderRadius: "4px",
                  padding: "20px 24px",
                  marginBottom: "20px",
                  position: "relative",
                  fontFamily: "'Times New Roman', Times, serif",
                  color: "#0f172a",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  pageBreakInside: "avoid"
                }}
              >
                {/* Header Table */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>Kemalpaşa Mah. Ilıca Sk. No:31/33A İnegöl / BURSA · 0224 715 00 02</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "2px" }}>BONO (SENET)</div>
                    <div style={{ fontSize: "11px", fontWeight: "bold" }}>SIRA NO: {note.no} / {instCount}</div>
                  </div>
                </div>

                {/* Vade & Tutar Kutuları */}
                <div className="promissory-vade-grid">
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", display: "block", color: "#64748b" }}>ÖDEME GÜNÜ (VADE)</span>
                    <strong style={{ fontSize: "14px", color: "#b91c1c" }}>{note.dueDate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", display: "block", color: "#64748b" }}>TUTAR (RAKAMLA)</span>
                    <strong style={{ fontSize: "15px" }}>₺{note.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", display: "block", color: "#64748b" }}>ÖDEME YERİ</span>
                    <strong style={{ fontSize: "13px" }}>İNEGÖL / BURSA</strong>
                  </div>
                </div>

                {/* Senet Yasal Metni */}
                <div style={{ fontSize: "12px", lineHeight: "1.6", textAlign: "justify", marginBottom: "16px" }}>
                  İşbu emre muharrer senedimin vadesinde <b>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</b> veya emrühavalesine yukarıda gösterilen 
                  <b> {note.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</b> (Yalnız <i>#{note.amountWords}#</i>) 
                  öğrenci <b>{student.student_name}</b> eğitim bedeli karşılığı olarak kayıtsız şartsız ve nakden ödeyeceğimi, 
                  vadesinde ödenmediği takdirde muacceliyet kesbedeceğini, ihtilaf vukuunda İnegöl Mahkemeleri ve İcra Dairelerinin 
                  yetkili olduğunu beyan ve taahhüt ederim.
                </div>

                {/* Borçlu & Kefil Tablosu */}
                <div className="promissory-debtor-grid">
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "bold", textDecoration: "underline", marginBottom: "6px" }}>BORÇLU (VELİ / ÖĞRENCİ):</div>
                    <table style={{ width: "100%", fontSize: "11px" }}>
                      <tbody>
                        <tr>
                          <td style={{ width: "70px", color: "#64748b" }}>Ad Soyad:</td>
                          <td><b>{student.parent_name || student.student_name}</b></td>
                        </tr>
                        <tr>
                          <td style={{ color: "#64748b" }}>T.C. Kimlik:</td>
                          <td>{student.parent_tc || student.student_tc || "—"}</td>
                        </tr>
                        <tr>
                          <td style={{ color: "#64748b" }}>Adres:</td>
                          <td>{student.parent_address || student.student_address || "İnegöl / BURSA"}</td>
                        </tr>
                        <tr>
                          <td style={{ color: "#64748b" }}>Telefon:</td>
                          <td>{student.parent_phone || student.student_phone || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", textDecoration: "underline" }}>BORÇLU İMZA</div>
                    <div style={{ width: "140px", height: "55px", borderBottom: "1px solid #0f172a", marginTop: "20px" }}></div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>(Islak İmza)</div>
                  </div>
                </div>

                {/* Alt Güvenlik Çizgisi */}
                <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8" }}>
                  <span>Tanzim Tarihi: {student.created_at ? new Date(student.created_at).toLocaleDateString("tr-TR") : new Date().toLocaleDateString("tr-TR")}</span>
                  <span>Özel İnegöl Çözüm Kurs Merkezi Matbu Senet Sistemi · Kurum Kodu: 627201</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-foot" style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={16} /> Yazdır / PDF İndir
          </button>
        </div>
      </div>
    </div>
  );
}
