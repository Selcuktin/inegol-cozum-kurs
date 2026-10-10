import React, { useState, useMemo } from "react";
import { Search, MessageCircle } from "lucide-react";
import { trIncludes } from "../../lib/utils";

export function OverdueAgingTab({
  overdueStudents = [],
  agingSummary = { c1_30: { count: 0 }, c31_60: { count: 0 }, c60plus: { count: 0 } },
  onSelectStudent = () => {},
  sendWhatsAppReminder = () => {},
  onQuickPayment = () => {},
  fmtMoney = (n) => String(n || 0)
}) {
  const [agingFilter, setAgingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOverdueList = useMemo(() => {
    return overdueStudents.filter(s => {
      if (agingFilter !== "all" && s.agingCategory !== agingFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim();
        const matches = trIncludes(s.student_name, query) ||
                        trIncludes(s.parent_name, query) ||
                        trIncludes(s.parent_phone, query) ||
                        trIncludes(s.student_no, query);
        if (!matches) return false;
      }
      return true;
    });
  }, [overdueStudents, agingFilter, searchQuery]);

  return (
    <div data-testid="overdue-aging-tab-container" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            className={`btn small ${agingFilter === "all" ? "" : "secondary"}`}
            onClick={() => setAgingFilter("all")}
          >
            Tüm Gecikenler ({overdueStudents.length})
          </button>
          <button 
            className={`btn small ${agingFilter === "1-30" ? "" : "secondary"}`}
            onClick={() => setAgingFilter("1-30")}
            style={{ color: "#ca8a04" }}
          >
            1 - 30 Gün ({agingSummary?.c1_30?.count || 0})
          </button>
          <button 
            className={`btn small ${agingFilter === "31-60" ? "" : "secondary"}`}
            onClick={() => setAgingFilter("31-60")}
            style={{ color: "#ea580c" }}
          >
            31 - 60 Gün ({agingSummary?.c31_60?.count || 0})
          </button>
          <button 
            className={`btn small ${agingFilter === "60+" ? "" : "secondary"}`}
            onClick={() => setAgingFilter("60+")}
            style={{ color: "#dc2626" }}
          >
            60+ Gün Kritik ({agingSummary?.c60plus?.count || 0})
          </button>
        </div>

        <div className="top-search" style={{ width: "260px", margin: 0 }}>
          <Search size={14} />
          <input 
            placeholder="Öğrenci veya veli ara..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: "12px" }}
          />
        </div>
      </div>

      {/* Geciken Taksitler Tablosu */}
      <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "700px" }}>
          <thead>
            <tr style={{ background: "#fef2f2" }}>
              <th>Öğrenci Adı Soyadı</th>
              <th>Şube / Sınıf</th>
              <th>Veli & İletişim</th>
              <th>Gecikme Süresi</th>
              <th>Toplam Borç</th>
              <th style={{ textAlign: "right" }}>Veliye Hatırlatma</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverdueList.map((s, idx) => (
              <tr key={s.id || idx}>
                <td>
                  <b style={{ color: "#0f172a", cursor: "pointer" }} onClick={() => onSelectStudent && onSelectStudent(s)}>
                    {s.student_name}
                  </b>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>#{s.student_no || "—"}</div>
                </td>
                <td><span style={{ color: "#475569" }}>{s.student_class || s.program || "—"}</span></td>
                <td>
                  <div>
                    <b>{s.parent_name || "Veli"}</b>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{s.parent_phone || "—"}</div>
                  </div>
                </td>
                <td>
                  <span 
                    className="badge" 
                    style={{ 
                      background: s.agingCategory === "60+" ? "#fee2e2" : s.agingCategory === "31-60" ? "#ffedd5" : "#fef9c3",
                      color: s.agingCategory === "60+" ? "#991b1b" : s.agingCategory === "31-60" ? "#9a3412" : "#854d0e",
                      padding: "3px 8px", 
                      borderRadius: "12px", 
                      fontSize: "11px", 
                      fontWeight: "700"
                    }}
                  >
                    {s.daysOverdue} Gün Gecikmede
                  </span>
                </td>
                <td>
                  <b style={{ color: "#dc2626", fontSize: "14px" }}>
                    ₺{fmtMoney(s.remaining)}
                  </b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px" }}>
                    <button 
                      className="btn small"
                      onClick={() => sendWhatsAppReminder(s)}
                      style={{ background: "#22c55e", color: "#fff", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 8px" }}
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                    <button 
                      className="btn small secondary"
                      onClick={() => onQuickPayment(s)}
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      Tahsil Et
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredOverdueList.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  Geciken taksit ödemesi bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OverdueAgingTab;
