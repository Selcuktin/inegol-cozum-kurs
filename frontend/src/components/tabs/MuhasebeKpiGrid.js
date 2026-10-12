import React from "react";
import {
  Building,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Percent,
  Wallet
} from "lucide-react";

export function MuhasebeKpiGrid({
  fmtMoney,
  totalContractRevenue,
  students = [],
  totalCollected,
  collectionRate,
  dueThisMonthData = { total: 0, count: 0, collected: 0 },
  totalOverdueDebt,
  overdueStudents = [],
  totalRemaining,
  netLiquidBalance
}) {
  return (
    <div className="muhasebe-kpi-grid">
      {/* Toplam Sözleşme / Kayıt Cirosu */}
      <div className="muhasebe-kpi-card stat-card" style={{ background: "#fff" }}>
        <div className="kpi-title-row" style={{ color: "#64748b" }}>
          <span>TOPLAM KAYIT CİROSU</span>
          <Building size={16} color="#3b82f6" />
        </div>
        <div className="kpi-value-text" style={{ color: "#0f172a" }} title={`₺${fmtMoney(totalContractRevenue)}`}>
          ₺{fmtMoney(totalContractRevenue)}
        </div>
        <div className="kpi-sub-text" style={{ color: "#64748b" }}>
          {students.length} Kayıtlı Öğrenci Taahhüdü
        </div>
      </div>

      {/* Gerçekleşen Tahsilat */}
      <div className="muhasebe-kpi-card stat-card" style={{ background: "#fff", borderColor: "#bbf7d0" }}>
        <div className="kpi-title-row" style={{ color: "#166534" }}>
          <span>GERÇEKLEŞEN TAHSİLAT</span>
          <CheckCircle2 size={16} color="#16a34a" />
        </div>
        <div className="kpi-value-text" style={{ color: "#16a34a" }} title={`₺${fmtMoney(totalCollected)}`}>
          ₺{fmtMoney(totalCollected)}
        </div>
        <div className="kpi-sub-text" style={{ color: "#166534", fontWeight: "600" }}>
          Tahsilat Oranı: %{collectionRate}
        </div>
      </div>

      {/* Bu Ay Vadesi Gelenler */}
      <div className="muhasebe-kpi-card stat-card" style={{ background: "#fff", borderColor: "#fed7aa" }}>
        <div className="kpi-title-row" style={{ color: "#c2410c" }}>
          <span>BU AY VADESİ GELENLER</span>
          <Calendar size={16} color="#ea580c" />
        </div>
        <div className="kpi-value-text" style={{ color: "#ea580c" }} title={`₺${fmtMoney(dueThisMonthData.total)}`}>
          ₺{fmtMoney(dueThisMonthData.total)}
        </div>
        <div className="kpi-sub-text" style={{ color: "#9a3412" }}>
          {dueThisMonthData.count} Taksit (₺{fmtMoney(dueThisMonthData.collected)} Alındı)
        </div>
      </div>

      {/* Gecikmiş Taksitler (Kritik Takip) */}
      <div className="muhasebe-kpi-card stat-card" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
        <div className="kpi-title-row" style={{ color: "#991b1b" }}>
          <span>GECİKMİŞ TAKSİTLER</span>
          <AlertTriangle size={16} color="#ef4444" />
        </div>
        <div className="kpi-value-text" style={{ color: "#dc2626" }} title={`₺${fmtMoney(totalOverdueDebt)}`}>
          ₺{fmtMoney(totalOverdueDebt)}
        </div>
        <div className="kpi-sub-text" style={{ color: "#b91c1c", fontWeight: "600" }}>
          {overdueStudents.length} Öğrenci Vadesi Geçti
        </div>
      </div>

      {/* Tahsilat Başarı Oranı */}
      <div className="muhasebe-kpi-card stat-card" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
        <div className="kpi-title-row" style={{ color: "#15803d" }}>
          <span>TAHSİLAT BAŞARI ORANI</span>
          <Percent size={16} color="#16a34a" />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
          <span style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: "800", color: "#166534" }}>
            %{collectionRate}
          </span>
          <div style={{ flex: 1, background: "#dcfce7", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, collectionRate)}%`, background: "#16a34a", height: "100%", borderRadius: "4px" }} />
          </div>
        </div>
        <div className="kpi-sub-text" style={{ color: "#15803d", fontWeight: "600" }}>
          Kalan: ₺{fmtMoney(totalRemaining)}
        </div>
      </div>

      {/* Net Likit Mevcut */}
      <div className="muhasebe-kpi-card stat-card" style={{ background: "#f8fafc", border: "2px solid #2563eb" }}>
        <div className="kpi-title-row" style={{ color: "#1d4ed8" }}>
          <span>NET LİKİT MEVCUT</span>
          <Wallet size={16} color="#2563eb" />
        </div>
        <div className="kpi-value-text" style={{ color: "#1d4ed8" }} title={`₺${fmtMoney(netLiquidBalance)}`}>
          ₺{fmtMoney(netLiquidBalance)}
        </div>
        <div className="kpi-sub-text" style={{ color: "#2563eb", fontWeight: "600" }}>
          Kasa, Banka ve POS Likit Portföyü
        </div>
      </div>
    </div>
  );
}
export default MuhasebeKpiGrid;
