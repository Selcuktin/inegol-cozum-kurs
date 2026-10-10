import React from "react";
import { Plus } from "lucide-react";

export function ExpensesTab({
  expenses = [],
  onAddExpense = () => {},
  fmtMoney = (n) => String(n || 0)
}) {
  return (
    <div data-testid="expenses-tab-container" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Kurum Gider Defteri</h3>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>Kira, personel maaşları, enerji ve hesap bazlı gider çıkışları</p>
        </div>
        <button 
          data-testid="add-expense-button"
          className="btn small" 
          onClick={onAddExpense} 
          style={{ background: "#ef4444", color: "#fff" }}
        >
          <Plus size={14} /> Yeni Gider Ekle
        </button>
      </div>

      <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "600px" }}>
          <thead>
            <tr style={{ background: "#fef2f2" }}>
              <th>Tarih</th>
              <th>Gider Başlığı</th>
              <th>Kategori</th>
              <th>Ödenen Hesap</th>
              <th>Tutar</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, idx) => (
              <tr key={e.id || idx}>
                <td>{e.expense_date ? e.expense_date.slice(0, 10) : "2026-10-02"}</td>
                <td><b>{e.title}</b></td>
                <td><span className="badge" style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "11px" }}>{e.category || "Genel"}</span></td>
                <td><span className="badge" style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600" }}>{e.account || "Nakit Ana Kasa"}</span></td>
                <td><b style={{ color: "#dc2626" }}>-₺{fmtMoney(e.amount)}</b></td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  Henüz kaydedilmiş gider bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExpensesTab;
