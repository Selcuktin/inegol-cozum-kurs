import React from "react";
import { Receipt, FileText } from "lucide-react";

export const money = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n || 0);
export const today = () => new Date().toISOString().slice(0, 10);

export function PaymentTable({ payments = [], students = [], onSelect, onOpenReceipt, onOpenPromissory }) {
  const list = payments;

  return (
    <>
      <div className="desktop-only-table table-responsive">
        <table>
          <thead>
            <tr>
              <th>ÖĞRENCİ</th>
              <th>TARİH</th>
              <th>KASA / YÖNTEM</th>
              <th>AÇIKLAMA</th>
              <th>TUTAR</th>
              <th>DURUM</th>
              <th style={{ textAlign: "right" }}>MAKBUZ & SENET</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const s = students.find((x) => x.id === p.student_id);
              return (
                <tr key={p.id}>
                  <td onClick={() => { if (onSelect && s) onSelect(s); }} style={{ cursor: "pointer" }}>
                    <div className="person">
                      <div className="student-avatar small">
                        {s?.student_name?.split(" ").map((x) => x[0]).join("") || "?"}
                      </div>
                      <div>
                        <b>{s?.student_name || "Öğrenci"}</b>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                          {s?.student_class || "Şube yok"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(p.payment_date).toLocaleDateString("tr-TR")}</td>
                  <td><span className="method-tag">{p.method || "Nakit Kasa"}</span></td>
                  <td className="muted-cell">{p.note || "Eğitim taksiti"}</td>
                  <td><b className="amount">{money(p.amount)}</b></td>
                  <td><span className="status-pill success">İşlendi ✓</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button 
                        className="btn secondary" 
                        style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center" }}
                        title="Resmi Tahsilat Makbuzunu Yazdır"
                        onClick={() => onOpenReceipt && onOpenReceipt(p)}
                      >
                        <Receipt size={13} color="var(--primary)" /> Makbuz
                      </button>
                      {s && (
                        <button 
                          className="btn secondary" 
                          style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center" }}
                          title="Matbu Senet Koçanı Yazdır"
                          onClick={() => onOpenPromissory && onOpenPromissory(s)}
                        >
                          <FileText size={13} color="#7c3aed" /> Senet
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-only-cards payments-mobile-list">
        {list.map((p) => {
          const s = students.find((x) => x.id === p.student_id);
          return (
            <div key={p.id} className="mobile-data-card payment-card" data-testid={`payment-card-${p.id}`}>
              <div className="payment-card-top">
                <div className="person" onClick={() => { if (onSelect && s) onSelect(s); }} style={{ cursor: "pointer" }}>
                  <div className="student-avatar small">
                    {s?.student_name?.split(" ").map((x) => x[0]).join("") || "?"}
                  </div>
                  <div>
                    <b>{s?.student_name || "—"}</b>
                    <span className="card-subtext">{new Date(p.payment_date).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
                <b className="amount green-amount">{money(p.amount)}</b>
              </div>
              <div className="payment-card-bottom">
                <div className="payment-meta-tags">
                  <span className="method-tag">{p.method}</span>
                  <span className="card-note">{p.note || "Tahsilat kaydı"}</span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button 
                    className="btn secondary" 
                    style={{ padding: "3px 8px", fontSize: "11px" }}
                    onClick={() => onOpenReceipt && onOpenReceipt(p)}
                  >
                    Makbuz
                  </button>
                  {s && (
                    <button 
                      className="btn secondary" 
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => onOpenPromissory && onOpenPromissory(s)}
                    >
                      Senet
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default PaymentTable;
