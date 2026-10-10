import React from "react";
import { Building, CreditCard, Wallet, FileText, Search, Receipt } from "lucide-react";

export function BankPortfolioStrip({
  registers = {},
  fmtMoney = (n) => String(n || 0),
  setActiveTab = () => {},
  setSelectedRegisterFilter = () => {}
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
          <Building size={16} color="#2563eb" /> Resmi Kasa & Banka Hesap Defteri
        </div>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          T.C. Millî Eğitim Bakanlığı Onaylı Kurum Hesapları
        </span>
      </div>

      <div className="muhasebe-bank-grid">
        {/* VakıfBank */}
        <div 
          className="bank-acc-card"
          onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("vakif"); }}
          style={{ 
            background: "#f0fdf4", 
            border: "1px solid #bbf7d0",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", background: "#16a34a", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                ANA HESAP
              </span>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                VakıfBank İnegöl Şb.
              </div>
            </div>
            <CreditCard size={16} color="#16a34a" />
          </div>
          <div className="bank-card-val" style={{ color: "#166534" }} title={`₺${fmtMoney(registers.vakifbank)}`}>
            ₺{fmtMoney(registers.vakifbank)}
          </div>
          <div className="bank-card-flow">
            <span>G: ₺{fmtMoney(registers.vakifbankInflow)}</span>
            <span>Ç: ₺{fmtMoney(registers.vakifbankExpense)}</span>
          </div>
          <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
            TR04 0001 ... 4922 43
          </div>
        </div>

        {/* Halkbank */}
        <div 
          className="bank-acc-card"
          onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("halk"); }}
          style={{ 
            background: "#eff6ff", 
            border: "1px solid #bfdbfe",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", background: "#2563eb", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                BANKA
              </span>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                Halkbank İnegöl Şb.
              </div>
            </div>
            <Building size={16} color="#2563eb" />
          </div>
          <div className="bank-card-val" style={{ color: "#1d4ed8" }} title={`₺${fmtMoney(registers.halkbank)}`}>
            ₺{fmtMoney(registers.halkbank)}
          </div>
          <div className="bank-card-flow">
            <span>G: ₺{fmtMoney(registers.halkbankInflow)}</span>
            <span>Ç: ₺{fmtMoney(registers.halkbankExpense)}</span>
          </div>
          <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
            TR87 0001 ... 1016 32
          </div>
        </div>

        {/* Nakit Ana Kasa */}
        <div 
          className="bank-acc-card"
          onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("nakit"); }}
          style={{ 
            background: "#fefce8", 
            border: "1px solid #fef08a",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", background: "#ca8a04", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                NAKİT
              </span>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                Nakit Ana Kasa
              </div>
            </div>
            <Wallet size={16} color="#ca8a04" />
          </div>
          <div className="bank-card-val" style={{ color: "#854d0e" }} title={`₺${fmtMoney(registers.nakit)}`}>
            ₺{fmtMoney(registers.nakit)}
          </div>
          <div className="bank-card-flow">
            <span>G: ₺{fmtMoney(registers.nakitInflow)}</span>
            <span>Ç: ₺{fmtMoney(registers.nakitExpense)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
            Ofis Elden Tahsilat Bakiyesi
          </div>
        </div>

        {/* POS / Kredi Kartı */}
        <div 
          className="bank-acc-card"
          onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("pos"); }}
          style={{ 
            background: "#fdf2f8", 
            border: "1px solid #fbcfe8",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", background: "#db2777", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                POS
              </span>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                POS / Kredi Kartı
              </div>
            </div>
            <CreditCard size={16} color="#db2777" />
          </div>
          <div className="bank-card-val" style={{ color: "#9d174d" }} title={`₺${fmtMoney(registers.pos)}`}>
            ₺{fmtMoney(registers.pos)}
          </div>
          <div className="bank-card-flow">
            <span>G: ₺{fmtMoney(registers.posInflow)}</span>
            <span>Ç: ₺{fmtMoney(registers.posExpense)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
            Sanal ve Fiziki POS Girişleri
          </div>
        </div>

        {/* Senet Portföyü */}
        <div 
          className="bank-acc-card"
          onClick={() => { setActiveTab("senetler"); }}
          style={{ 
            background: "#f5f3ff", 
            border: "1px solid #ddd6fe",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", background: "#7c3aed", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                SENET / BONO
              </span>
              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                Senet & Çek Portföyü
              </div>
            </div>
            <FileText size={16} color="#7c3aed" />
          </div>
          <div className="bank-card-val" style={{ color: "#6d28d9" }} title={`₺${fmtMoney(registers.senet)}`}>
            ₺{fmtMoney(registers.senet)}
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
            Matbu Senetli Tahsilatlar
          </div>
        </div>
      </div>
    </div>
  );
}

export function CashBankLedgerTab({
  registers = {},
  fmtMoney = (n) => String(n || 0),
  selectedRegisterFilter = "all",
  setSelectedRegisterFilter = () => {},
  allLedgerItems = [],
  filteredLedgerList = [],
  searchQuery = "",
  setSearchQuery = () => {},
  setReceiptPayment = () => {}
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Kasa Filtre Seçicisi */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button 
            className={`btn small ${selectedRegisterFilter === "all" ? "" : "secondary"}`}
            onClick={() => setSelectedRegisterFilter("all")}
          >
            Tüm Hesaplar ({allLedgerItems.length})
          </button>
          <button 
            className={`btn small ${selectedRegisterFilter === "vakif" ? "" : "secondary"}`}
            onClick={() => setSelectedRegisterFilter("vakif")}
            style={{ color: "#166534" }}
          >
            VakıfBank (Bakiye: ₺{fmtMoney(registers.vakifbank)})
          </button>
          <button 
            className={`btn small ${selectedRegisterFilter === "halk" ? "" : "secondary"}`}
            onClick={() => setSelectedRegisterFilter("halk")}
            style={{ color: "#1d4ed8" }}
          >
            Halkbank (Bakiye: ₺{fmtMoney(registers.halkbank)})
          </button>
          <button 
            className={`btn small ${selectedRegisterFilter === "nakit" ? "" : "secondary"}`}
            onClick={() => setSelectedRegisterFilter("nakit")}
            style={{ color: "#854d0e" }}
          >
            Nakit Kasa (Bakiye: ₺{fmtMoney(registers.nakit)})
          </button>
          <button 
            className={`btn small ${selectedRegisterFilter === "pos" ? "" : "secondary"}`}
            onClick={() => setSelectedRegisterFilter("pos")}
            style={{ color: "#9d174d" }}
          >
            POS Kasası (₺{fmtMoney(registers.pos)})
          </button>
          <button 
            className={`btn small ${selectedRegisterFilter === "senet" ? "" : "secondary"}`}
            onClick={() => setSelectedRegisterFilter("senet")}
            style={{ color: "#7c3aed" }}
          >
            Senet Portföyü (₺{fmtMoney(registers.senet)})
          </button>
        </div>

        <div className="top-search" style={{ width: "240px", margin: 0 }}>
          <Search size={14} />
          <input 
            placeholder="Defterde ara..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: "12px" }}
          />
        </div>
      </div>

      {/* Kasa Hareketleri Tablosu (Çift Yönlü Defter & Tam Ekrana Sığan Tablo) */}
      <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", width: "100%", overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", margin: 0, fontSize: "12.5px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ width: "10%", padding: "10px 8px" }}>Tarih</th>
              <th style={{ width: "16%", padding: "10px 8px" }}>Hesap / Kasa</th>
              <th style={{ width: "18%", padding: "10px 8px" }}>Öğrenci / Alacaklı</th>
              <th style={{ width: "23%", padding: "10px 8px" }}>Açıklama / Not</th>
              <th style={{ width: "11%", padding: "10px 8px", textAlign: "right" }}>İşlem Tutarı</th>
              <th style={{ width: "11%", padding: "10px 8px", textAlign: "right" }}>Kasa Bakiyesi</th>
              <th style={{ width: "11%", padding: "10px 8px", textAlign: "center" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedgerList.map((item, idx) => {
              const bakiye = item.runningBalance;
              return (
                <tr key={item.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 8px", whiteSpace: "nowrap" }}>
                    <b style={{ color: "#475569" }}>{item.date ? item.date.slice(0, 10) : "2026-10-02"}</b>
                  </td>
                  <td style={{ padding: "8px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.accountLabel}>
                    <span className="badge" style={{ 
                      background: item.isInflow ? "#eff6ff" : "#fef2f2", 
                      color: item.isInflow ? "#1d4ed8" : "#dc2626", 
                      padding: "2px 6px", 
                      borderRadius: "4px", 
                      fontSize: "11px", 
                      fontWeight: "600" 
                    }}>
                      {item.accountLabel}
                    </span>
                  </td>
                  <td style={{ padding: "8px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.party}>
                    <b style={{ color: "#0f172a" }}>{item.party}</b>
                  </td>
                  <td style={{ padding: "8px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.description}>
                    <span style={{ color: "#64748b" }}>{item.description}</span>
                  </td>
                  <td style={{ padding: "8px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <b style={{ color: item.isInflow ? "#16a34a" : "#dc2626", fontSize: "13px" }}>
                      {item.isInflow ? `+₺${fmtMoney(item.amount)}` : `-₺${fmtMoney(item.amount)}`}
                    </b>
                  </td>
                  <td style={{ padding: "8px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <b style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "12px" }}>₺{fmtMoney(bakiye)}</b>
                  </td>
                  <td style={{ padding: "8px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                    {item.isInflow ? (
                      <button 
                        className="btn small secondary" 
                        onClick={() => setReceiptPayment(item.rawPayment)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", padding: "3px 6px", whiteSpace: "nowrap" }}
                      >
                        <Receipt size={12} color="#2563eb" /> Makbuz Bas
                      </button>
                    ) : (
                      <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                        Gider Çıkışı
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredLedgerList.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  Bu hesap için hareket kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CashBankLedgerTab;
