import React from "react";
import { FileText, X } from "lucide-react";

export function SenetlerTab({
  students = [],
  fmtMoney = (n) => String(n || 0),
  getEffectiveTotalFee = (s) => Number(s?.total_fee || 0),
  setPromissoryStudent = () => {}
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "700" }}>Matbu Senet (Bono) Yazdırma Merkezi</h3>
        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
          Öğrencilerin taksit planına göre yasal Türk Ticaret Kanunu uyumlu A4/A5 resmi senetlerini yazdırabilirsiniz.
        </p>
      </div>

      <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "640px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th>Öğrenci Adı Soyadı</th>
              <th>Veli (Borçlu)</th>
              <th>Taksit Sayısı</th>
              <th>Net Sözleşme Tutarı</th>
              <th style={{ textAlign: "right" }}>Senet İşlemi</th>
            </tr>
          </thead>
          <tbody>
            {students.slice(0, 30).map((s) => (
              <tr key={s.id}>
                <td><b>{s.student_name}</b></td>
                <td>{s.parent_name || "—"}</td>
                <td>{s.installment_count || 1} Taksit</td>
                <td><b>₺{fmtMoney(getEffectiveTotalFee(s))}</b></td>
                <td style={{ textAlign: "right" }}>
                  <button 
                    className="btn small secondary" 
                    onClick={() => setPromissoryStudent(s)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 10px" }}
                  >
                    <FileText size={13} color="#7c3aed" /> Matbu Senetleri Yazdır
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QuickPaymentModal({
  showQuickPaymentModal = false,
  setShowQuickPaymentModal = () => {},
  handleSavePayment = () => {},
  payStudentId = "",
  setPayStudentId = () => {},
  students = [],
  getEffectiveTotalFee = (s) => Number(s?.total_fee || 0),
  fmtMoney = (n) => String(n || 0),
  payAmount = "",
  setPayAmount = () => {},
  payMethod = "Nakit",
  setPayMethod = () => {},
  payBank = "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
  setPayBank = () => {},
  payNote = "Taksit Tahsilatı",
  setPayNote = () => {},
  payLoading = false
}) {
  if (!showQuickPaymentModal) return null;

  return (
    <div className="modal-backdrop" onClick={() => setShowQuickPaymentModal(false)} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "520px", width: "95vw" }}>
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Hızlı Tahsilat Girişi & Makbuz</h2>
          <button className="icon-btn" onClick={() => setShowQuickPaymentModal(false)}><X size={18} /></button>
        </div>
        <form onSubmit={handleSavePayment} style={{ padding: "20px" }}>
          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Öğrenci Seçin:</label>
            <select 
              value={payStudentId} 
              onChange={e => setPayStudentId(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
              required
            >
              <option value="">Öğrenci Seçiniz...</option>
              {students.map(s => {
                const eff = getEffectiveTotalFee(s);
                const paid = Number(s.paid_amount || 0);
                return (
                  <option key={s.id} value={s.id}>
                    {s.student_name} (#{s.student_no}) - Kalan: ₺{fmtMoney(Math.max(0, eff - paid))}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Tahsilat Tutarı (TL):</label>
            <input 
              type="number"
              placeholder="Örn: 5000"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Ödeme Yöntemi:</label>
            <select 
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
            >
              <option value="Nakit">Nakit (Ana Kasa)</option>
              <option value="Banka Havale / EFT">Banka Havale / EFT</option>
              <option value="POS / Kredi Kartı">POS / Kredi Kartı</option>
              <option value="Senet">Senet / Çek</option>
            </select>
          </div>

          {payMethod === "Banka Havale / EFT" && (
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Giriş Yapılacak Banka Hesabı:</label>
              <select 
                value={payBank}
                onChange={e => setPayBank(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
              >
                <option value="T.C. VAKIFLAR BANKASI İNEGÖL ŞB.">T.C. VAKIFLAR BANKASI İNEGÖL ŞB. (TR04...)</option>
                <option value="T.C. HALKBANK İNEGÖL ŞB.">T.C. HALKBANK İNEGÖL ŞB. (TR87...)</option>
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Açıklama / Dekont Notu:</label>
            <input 
              type="text"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" className="btn secondary" onClick={() => setShowQuickPaymentModal(false)}>İptal</button>
            <button type="submit" className="btn" disabled={payLoading} style={{ background: "#16a34a", color: "#fff" }}>
              {payLoading ? "Kaydediliyor..." : "Tahsilatı Kaydet & Makbuz Aç"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ExpenseModal({
  showExpenseModal = false,
  setShowExpenseModal = () => {},
  handleSaveExpense = () => {},
  expTitle = "",
  setExpTitle = () => {},
  expAmount = "",
  setExpAmount = () => {},
  expAccount = "Nakit Ana Kasa",
  setExpAccount = () => {},
  expCategory = "Kira",
  setExpCategory = () => {},
  expDate = "",
  setExpDate = () => {}
}) {
  if (!showExpenseModal) return null;

  return (
    <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px", width: "95vw" }}>
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Kurum Gideri Ekle</h2>
          <button className="icon-btn" onClick={() => setShowExpenseModal(false)}><X size={18} /></button>
        </div>
        <form onSubmit={handleSaveExpense} style={{ padding: "20px" }}>
          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Gider Başlığı:</label>
            <input 
              type="text"
              placeholder="Örn: Derslik 1 Klima Bakımı"
              value={expTitle}
              onChange={e => setExpTitle(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Tutar (TL):</label>
            <input 
              type="number"
              placeholder="Örn: 2500"
              value={expAmount}
              onChange={e => setExpAmount(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Ödenecek Hesap / Kasa (GAP-3):</label>
            <select 
              value={expAccount} 
              onChange={e => setExpAccount(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
            >
              <option value="Nakit Ana Kasa">Nakit Ana Kasa (Elden)</option>
              <option value="T.C. VAKIFLAR BANKASI İNEGÖL ŞB.">T.C. VAKIFLAR BANKASI İNEGÖL ŞB. (TR04...)</option>
              <option value="T.C. HALKBANK İNEGÖL ŞB.">T.C. HALKBANK İNEGÖL ŞB. (TR87...)</option>
              <option value="POS / Şirket Kredi Kartı">POS / Şirket Kredi Kartı</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Kategori:</label>
            <select 
              value={expCategory} 
              onChange={e => setExpCategory(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
            >
              <option value="Kira">Kira</option>
              <option value="Maaş / Eğitmen">Maaş / Eğitmen Ücreti</option>
              <option value="Kırtasiye / Yayın">Kırtasiye / Deneme Sınavı Yayını</option>
              <option value="Elektrik / Isınma">Elektrik / Su / Isınma</option>
              <option value="Reklam / Tanıtım">Reklam / Sosyal Medya</option>
              <option value="Genel">Diğer Genel Giderler</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Gider Tarihi:</label>
            <input 
              type="date"
              value={expDate}
              onChange={e => setExpDate(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="button" className="btn secondary" onClick={() => setShowExpenseModal(false)}>İptal</button>
            <button type="submit" className="btn" style={{ background: "#ef4444", color: "#fff" }}>Gideri Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}
