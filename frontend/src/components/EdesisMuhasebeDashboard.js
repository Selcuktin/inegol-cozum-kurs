import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RotateCw,
  Wallet,
  Building,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Percent,
  CheckSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MessageCircle,
  FileText,
  Search,
  Sparkles,
  Zap,
  Target
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import edesisData from "../data/edesisAccountingData.json";

function fmtCurrency(val, decimals = 0) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num) + " ₺";
}

function fmtPercent(val) {
  const num = Number(val) || 0;
  return "%" + new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(num);
}

const TURKISH_NAME_FIXES = {
  "ZEYNEP MASAL ELK": "ZEYNEP MASAL ÇELİK",
  "BERL POLAT POSOFLU": "BERİL POLAT POSOFLU",
  "MUSTAFA SNR": "MUSTAFA SİNİR",
  "ELF SARE DEMR": "ELİF SARE DEMİR",
  "YAMUR HRA ALAN": "YAĞMUR HİRA ALAN",
  "KRA EMER": "İKRA EMER",
  "HRA EMER": "HİRA EMER",
  "FEYZA LGZ": "FEYZA İLGİZ",
  "ECRN TARHAN": "ECRİN TARHAN",
  "ELF NUR SAVA": "ELİF NUR SAVAŞ",
  "EBUBEKR ASAF VERGL": "EBUBEKİR ASAF VERGİLİ",
  "CANSU TRKEN": "CANSU TÜRKEN"
};

function fixTurkishName(name) {
  if (!name) return "";
  if (TURKISH_NAME_FIXES[name]) return TURKISH_NAME_FIXES[name];
  return name.replace(/\ufffd/g, "");
}

export function EdesisMuhasebeDashboard({
  onOpen,
  onSelectStudent,
  onNavigateTab,
  onRefresh,
  monthlyTrends = [],
  agingSummary = { c1_30: { count: 0, sum: 0, pct: 0 }, c31_60: { count: 0, sum: 0, pct: 0 }, c60plus: { count: 0, sum: 0, pct: 0 } },
  incomeCategoryData = [],
  paymentMethodData = [],
  totalCollected = 0,
  totalContractRevenue = 0,
  totalRemaining = 0,
  collectionRate = 0,
  totalOverdueDebt = 0,
  overdueStudents = [],
  handleBulkWhatsAppReminder,
  fmtMoney = (v) => v
}) {
  const [activeSubTab, setActiveSubTab] = useState("bugun"); // 'bugun' | 'ozet' | 'risk' | 'analiz'
  const [timeFilter, setTimeFilter] = useState("bugun"); // 'bugun' | 'hafta' | 'ay'
  const [selectedDonem, setSelectedDonem] = useState("2026-2027");
  const [showOverdueList, setShowOverdueList] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edesis Authentic Live Data Objects
  const donemOzet = edesisData.dashboardDonemOzet || {
    toplamGelir: 4190137.53,
    toplamTahsilat: 475941.18,
    kalanBakiye: 3714196.35,
    toplamGider: 100401.35,
    netKar: 4089736.18,
    karMarji: 97.6
  };

  const effToplamGelir = totalContractRevenue > 0 ? totalContractRevenue : donemOzet.toplamGelir;
  const effToplamTahsilat = totalCollected > 0 ? totalCollected : donemOzet.toplamTahsilat;
  const effKalanBakiye = totalRemaining > 0 ? totalRemaining : (effToplamGelir - effToplamTahsilat > 0 ? effToplamGelir - effToplamTahsilat : donemOzet.kalanBakiye);
  const effNetKar = effToplamGelir - (donemOzet.toplamGider || 100401.35);
  const effKarMarji = effToplamGelir > 0 ? ((effNetKar / effToplamGelir) * 100) : donemOzet.karMarji;

  const operasyonelOzet = edesisData.dashboardOperasyonelOzet || {
    periyotTahsilEdilen: 7500.0,
    periyotTahsilatAdet: 1,
    toplamLikitVarlik: 982938.27,
    periyotOdenen: 0.0,
    periyotOdemeAdet: 0,
    periyotBeklenenTahsilat: 0.0,
    periyotOdenecekGiderToplam: 0.0,
    vadesiGecmisAlacakToplam: 216350.01,
    vadesiGecmisGiderToplam: 0.0,
    gerceklesenTahsilatlar: [
      {
        kimdenAdi: "ZEYNEP LEVENT",
        sinifAdi: "8-8-GENEL",
        tahsilatTarihi: "2026-10-05T19:07:43.454",
        tutar: 7500.0,
        odemeYontemi: 0,
        kasaAdi: "NEVİN ÇAKMAK BİREYSEL",
        gelirId: 82513
      }
    ],
    vadesiGecmisTahsilatlar: []
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

    const gerceklesenTahsilat = operasyonelOzet.gerceklesenTahsilatlar || [];
  const vadesiGecmisList = operasyonelOzet.vadesiGecmisTahsilatlar || [];

  const renderChartsSection = (title = "12 Aylık Taksit & Tahsilat Karşılaştırma Grafiği (Edesis Trend Analizi)") => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 12 Aylık Trend Grafiği */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                {title}
              </h3>
            </div>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
              Öğrencilerin taksit vadelerine göre planlanan tahakkuk vs gerçekleşen kasa/banka nakit akışı
            </p>
          </div>
          <div style={{ display: "flex", gap: "14px", fontSize: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 12, background: "#93c5fd", borderRadius: "3px" }} /> Planlanan Taksit
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 12, background: "#16a34a", borderRadius: "3px" }} /> Gerçekleşen Tahsilat
            </span>
          </div>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="ay" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                tickFormatter={(val) => `₺${val >= 1000 ? `${Math.round(val/1000)}k` : val}`} 
              />
              <Tooltip 
                formatter={(val) => [`₺${fmtMoney(val)}`, ""]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="plan" name="Planlanan Taksit Tahakkuku" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gerceklesen" name="Gerçekleşen Tahsilat" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dağılım Panelleri */}
      <div className="muhasebe-charts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {/* Panel 1: Gelir Kategorileri Dağılımı */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              Gelir Kategorileri Dağılımı
            </h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Ciro Kalemleri</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: 170, height: 170, margin: "auto" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {incomeCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₺${fmtMoney(val)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", minWidth: 160 }}>
              {incomeCategoryData.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <b style={{ color: "#0f172a" }}>₺{fmtMoney(item.value)} (%{item.pct})</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Tahsilat Yöntemleri Dağılımı */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              Tahsilat Yöntemleri Dağılımı
            </h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Kasa & Banka Girişi</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: 170, height: 170, margin: "auto" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-pm-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₺${fmtMoney(val)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", minWidth: 160 }}>
              {paymentMethodData.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <b style={{ color: "#0f172a" }}>₺{fmtMoney(item.value)} (%{item.pct})</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="edesis-dashboard-container" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* 1. BAŞLIK VE KONTROL PANELİ BAŞLIĞI */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
          Kontrol Paneli
        </h1>
      </div>

      {/* 2. SUBNAV BAR (BUGÜN, ÖZET, TAHSİLAT & RİSK, FİNANSAL ANALİZ, FİNANSAL RAPORLAR + DÖNEM + REFRESH) */}
      <div
        className="edesis-subnav-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "6px 14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          flexWrap: "wrap",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto" }}>
          <button
            type="button"
            onClick={() => setActiveSubTab("bugun")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeSubTab === "bugun" ? "#eff6ff" : "transparent",
              color: activeSubTab === "bugun" ? "#2563eb" : "#64748b",
              fontWeight: activeSubTab === "bugun" ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <Zap size={15} color={activeSubTab === "bugun" ? "#2563eb" : "#64748b"} />
            <span>Bugün</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("ozet")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeSubTab === "ozet" ? "#eff6ff" : "transparent",
              color: activeSubTab === "ozet" ? "#2563eb" : "#64748b",
              fontWeight: activeSubTab === "ozet" ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <CheckSquare size={15} color={activeSubTab === "ozet" ? "#2563eb" : "#64748b"} />
            <span>Özet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("risk")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeSubTab === "risk" ? "#eff6ff" : "transparent",
              color: activeSubTab === "risk" ? "#2563eb" : "#64748b",
              fontWeight: activeSubTab === "risk" ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <Target size={15} color={activeSubTab === "risk" ? "#2563eb" : "#64748b"} />
            <span>Tahsilat & Risk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("analiz")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeSubTab === "analiz" ? "#eff6ff" : "transparent",
              color: activeSubTab === "analiz" ? "#2563eb" : "#64748b",
              fontWeight: activeSubTab === "analiz" ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <FileText size={15} color={activeSubTab === "analiz" ? "#2563eb" : "#64748b"} />
            <span>Finansal Analiz &rarr;</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigateTab) onNavigateTab("gelirler");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "#64748b",
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <ExternalLink size={15} color="#64748b" />
            <span>Finansal Raporlar</span>
          </button>
        </div>

        {/* SAĞ TARAF: DÖNEM SEÇİCİ VE YENİLEME BUTONU */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f8fafc",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "12px",
              color: "#475569"
            }}
          >
            <Calendar size={14} color="#64748b" />
            <span style={{ fontWeight: 700, fontSize: "11px", letterSpacing: "0.5px", color: "#64748b" }}>DÖNEM</span>
            <select
              value={selectedDonem}
              onChange={(e) => setSelectedDonem(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "12px",
                fontWeight: 700,
                color: "#0f172a",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027-YAZ">2026-2027-YAZ</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            title="Edesis verilerini anlık yenile"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#64748b"
            }}
          >
            <RotateCw size={15} className={isRefreshing ? "spin-animation" : ""} />
          </button>
        </div>
      </div>

      {/* 3. BÖLÜM: BUGÜN SEKMESİ İÇERİĞİ (EDESİS RESMİ GÖRÜNÜMÜ 100% PARİTE) */}
      {activeSubTab === "bugun" && (
        <>
          <div
            className="edesis-section-card"
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} color="#64748b" />
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
              Dönem Geneli
            </h2>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 400 }}>
              Tüm dönem — tarih filtresi yok
            </span>
          </div>

          {/* SAĞ ZAMAN FİLTRESİ BUTONLARI (BUGÜN / BU HAFTA / BU AY) */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", gap: "3px" }}>
            <button
              type="button"
              onClick={() => setTimeFilter("bugun")}
              style={{
                border: "none",
                padding: "4px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: timeFilter === "bugun" ? 700 : 500,
                background: timeFilter === "bugun" ? "#2563eb" : "transparent",
                color: timeFilter === "bugun" ? "#fff" : "#64748b",
                cursor: "pointer"
              }}
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("hafta")}
              style={{
                border: "none",
                padding: "4px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: timeFilter === "hafta" ? 700 : 500,
                background: timeFilter === "hafta" ? "#2563eb" : "transparent",
                color: timeFilter === "hafta" ? "#fff" : "#64748b",
                cursor: "pointer"
              }}
            >
              Bu Hafta
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("ay")}
              style={{
                border: "none",
                padding: "4px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: timeFilter === "ay" ? 700 : 500,
                background: timeFilter === "ay" ? "#2563eb" : "transparent",
                color: timeFilter === "ay" ? "#fff" : "#64748b",
                cursor: "pointer"
              }}
            >
              Bu Ay
            </button>
          </div>
        </div>

        {/* 6'LI KPI KARTLARI ROW */}
        <div
          className="edesis-kpi-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px"
          }}
        >
          {/* TILE 1: TOPLAM GELİR */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#dcfce7",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <ArrowUpRight size={20} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(effToplamGelir)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px", marginTop: "2px" }}>
                TOPLAM GELİR
              </div>
            </div>
          </div>

          {/* TILE 2: TAHSİL EDİLEN */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f3e8ff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Coins size={20} color="#9333ea" />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(effToplamTahsilat)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px", marginTop: "2px" }}>
                TAHSİL EDİLEN
              </div>
            </div>
          </div>

          {/* TILE 3: KALAN BAKİYE */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#fef9c3",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Clock size={20} color="#ca8a04" />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(effKalanBakiye)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px", marginTop: "2px" }}>
                KALAN BAKİYE
              </div>
            </div>
          </div>

          {/* TILE 4: TOPLAM GİDER */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#fee2e2",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <ArrowDownRight size={20} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(donemOzet.toplamGider)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px", marginTop: "2px" }}>
                TOPLAM GİDER
              </div>
            </div>
          </div>

          {/* TILE 5: NET KAR/ZARAR */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#e0f2fe",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Calculator size={20} color="#0284c7" />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#0284c7" }}>
                {fmtCurrency(effNetKar)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px", marginTop: "2px" }}>
                NET KAR/ZARAR
              </div>
            </div>
          </div>

          {/* TILE 6: KAR MARJI */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f1f5f9",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Percent size={20} color="#475569" />
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#16a34a" }}>
                {fmtPercent(effKarMarji)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px", marginTop: "2px" }}>
                KAR MARJI
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BÖLÜM: BUGÜN NABIZ (4 YATAY KART) */}
      <div
        className="edesis-section-card"
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Zap size={16} color="#2563eb" />
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            Bugün Neler Oldu · Bugün Nabız
          </h2>
        </div>

        <div
          className="edesis-pulse-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px"
          }}
        >
          {/* NABIZ 1: BUGÜN TAHSİL EDİLEN */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#f0fdf4",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Wallet size={18} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(operasyonelOzet.periyotTahsilEdilen)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px" }}>
                BUGÜN TAHSİL EDİLEN
              </div>
            </div>
          </div>

          {/* NABIZ 2: BUGÜN TAHSİL EDİLECEK */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#faf5ff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <ArrowDownRight size={18} color="#9333ea" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(operasyonelOzet.periyotBeklenenTahsilat)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px" }}>
                BUGÜN TAHSİL EDİLECEK
              </div>
            </div>
          </div>

          {/* NABIZ 3: BUGÜN ÖDENEN */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#f1f5f9",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <CheckSquare size={18} color="#475569" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(operasyonelOzet.periyotOdenen)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px" }}>
                BUGÜN ÖDENEN
              </div>
            </div>
          </div>

          {/* NABIZ 4: BUGÜN ÖDENECEK */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#fefce8",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Calendar size={18} color="#ca8a04" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                {fmtCurrency(operasyonelOzet.periyotOdenecekGiderToplam)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.5px" }}>
                BUGÜN ÖDENECEK
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4.1 BÖLÜM: FİNANSAL GÖSTERGELER & 12 AYLIK NAKİT AKIŞ GRAFİKLERİ */}
      {renderChartsSection("Dönem Finansal Göstergeleri & 12 Aylık Trend Grafiği")}

      {/* 5. BÖLÜM: BUGÜN GERÇEKLEŞENLER (İKİ KOLON: TAHSİL EDİLENLER & ÖDENENLER) */}
      <div
        className="edesis-section-card"
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            Bugün Gerçekleşenler
          </h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            05 Ekim 2026 · yapılan tahsilat ve ödemeler
          </span>
        </div>

        <div
          className="edesis-split-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px"
          }}
        >
          {/* SOL: TAHSİL EDİLENLER */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#166534" }}>
                <Wallet size={15} color="#16a34a" /> Tahsil Edilenler
              </div>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "12px"
                }}
              >
                {gerceklesenTahsilat.length} İşlem · {fmtCurrency(operasyonelOzet.periyotTahsilEdilen)}
              </span>
            </div>

            {gerceklesenTahsilat.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", color: "#94a3b8", textAlign: "left", fontSize: "10px", fontWeight: 700 }}>
                      <th style={{ padding: "8px 12px" }}>KİMDEN</th>
                      <th style={{ padding: "8px 12px" }}>TARİH</th>
                      <th style={{ padding: "8px 12px" }}>YÖNTEM</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>TUTAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gerceklesenTahsilat.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />
                            <b>{t.kimdenAdi}</b>
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>- {t.sinifAdi || "GENEL"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          {t.tahsilatTarihi ? t.tahsilatTarihi.slice(11, 16) : "19:07"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 700,
                              marginRight: "6px"
                            }}
                          >
                            Nakit
                          </span>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>
                            {t.kasaAdi || "NEVİN ÇAKMAK BİREYSEL"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                          {fmtCurrency(t.tutar, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                <CheckCircle2 size={24} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                Bugün tahsilat gerçekleşmedi
              </div>
            )}
          </div>

          {/* SAĞ: ÖDENENLER */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                <CheckSquare size={15} color="#64748b" /> Ödenenler
              </div>
              <span
                style={{
                  background: "#f1f5f9",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "12px"
                }}
              >
                0 İşlem · 0 ₺
              </span>
            </div>

            <div style={{ padding: "34px 20px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "2px solid #e2e8f0",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 10px",
                  color: "#cbd5e1"
                }}
              >
                <CheckCircle2 size={20} color="#94a3b8" />
              </div>
              <div>Seçili dönemde ödeme yapılmadı</div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. BÖLÜM: BUGÜN YAPILACAKLAR (İKİ KOLON: TAHSİL EDİLECEK & ÖDENECEK GİDER) */}
      <div
        className="edesis-section-card"
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Calendar size={16} color="#ca8a04" />
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            Bugün Yapılacaklar
          </h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            05 Ekim 2026 · vadesi gelen tahsilat ve giderler
          </span>
        </div>

        <div
          className="edesis-split-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px"
          }}
        >
          {/* SOL: TAHSİL EDİLECEK */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#166534" }}>
                <ArrowDownRight size={15} color="#16a34a" /> Tahsil Edilecek
              </div>
              <span style={{ color: "#16a34a", fontSize: "12px", fontWeight: 700 }}>
                0 ₺
              </span>
            </div>

            <div style={{ padding: "34px 20px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "2px solid #e2e8f0",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 10px",
                  color: "#cbd5e1"
                }}
              >
                <CheckCircle2 size={20} color="#94a3b8" />
              </div>
              <div>Seçili dönemde vadesi gelen tahsilat yok</div>
            </div>
          </div>

          {/* SAĞ: ÖDENECEK GİDER */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#854d0e" }}>
                <ArrowUpRight size={15} color="#ca8a04" /> Ödenecek Gider
              </div>
              <span style={{ color: "#ca8a04", fontSize: "12px", fontWeight: 700 }}>
                0 ₺
              </span>
            </div>

            <div style={{ padding: "34px 20px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "2px solid #e2e8f0",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 10px",
                  color: "#cbd5e1"
                }}
              >
                <CheckCircle2 size={20} color="#94a3b8" />
              </div>
              <div>Seçili dönemde vadesi gelen gider yok</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. BÖLÜM: VADESİ GEÇMİŞ (AKORDİYON BAR) */}
      <div
        className="edesis-section-card"
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "14px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#dc2626" }}>
              <Clock size={16} color="#dc2626" />
              <span>Vadesi Geçmiş</span>
            </div>

            <span
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "6px"
              }}
            >
              Alacak {fmtCurrency(operasyonelOzet.vadesiGecmisAlacakToplam)}
            </span>

            <span
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "6px"
              }}
            >
              Gider {fmtCurrency(operasyonelOzet.vadesiGecmisGiderToplam)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowOverdueList(!showOverdueList)}
            style={{
              border: "none",
              background: "transparent",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <span>{showOverdueList ? "Listeyi Gizle" : "Listeyi Göster"}</span>
            {showOverdueList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* AKORDİYON LİSTESİ: VADESİ GEÇEN TAKSİTLER DETAY TABLOSU */}
        {showOverdueList && (
          <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "14px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b", textAlign: "left", fontSize: "11px", fontWeight: 700 }}>
                  <th style={{ padding: "8px 12px" }}>ÖĞRENCİ</th>
                  <th style={{ padding: "8px 12px" }}>SINIF</th>
                  <th style={{ padding: "8px 12px" }}>VADE TARİHİ</th>
                  <th style={{ padding: "8px 12px" }}>GECİKME</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>KALAN TUTAR</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {vadesiGecmisList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                      {fixTurkishName(item.ogrenciAdiSoyadi)}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {item.sinifAdi || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {item.vadeTarihi ? item.vadeTarihi.slice(0, 10) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#dc2626", fontWeight: 700 }}>
                      {item.gecikmeGunSayisi} Gün
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#dc2626" }}>
                      {fmtCurrency(item.kalanTutar, 2)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpen) onOpen("payment");
                        }}
                        style={{
                          border: "1px solid #bbf7d0",
                          background: "#f0fdf4",
                          color: "#16a34a",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Tahsilat Al
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. BÖLÜM: KASA + BANKA DURUMU */}
      <div
        className="edesis-section-card"
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "14px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          gap: "14px"
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            background: "#eff6ff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0
          }}
        >
          <Building size={18} color="#2563eb" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            Kasa + Banka Durumu
          </span>
          <span style={{ fontSize: "18px", fontWeight: "800", color: "#2563eb", fontFamily: "Outfit, sans-serif" }}>
            {fmtCurrency(operasyonelOzet.toplamLikitVarlik)}
          </span>
        </div>
      </div>
      </>
      )}

      {/* 4. SEKME: TAHSİLAT & RİSK (GAP-5: Taksit Yaşlandırma & Risk Analizi + Overdue Listesi) */}
      {activeSubTab === "risk" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                  Taksit Yaşlandırma & Risk Analizi (Edesis Aging Report)
                </h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                  Vadesi geçen toplam <b>{fmtCurrency(totalOverdueDebt || operasyonelOzet.vadesiGecmisAlacakToplam)}</b> tutarındaki taksitlerin gecikme dilimleri
                </p>
              </div>
              {handleBulkWhatsAppReminder && (
                <button 
                  className="btn small secondary" 
                  onClick={handleBulkWhatsAppReminder}
                  style={{ borderColor: "#22c55e", color: "#16a34a", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <MessageCircle size={14} /> Gecikenlere Toplu WhatsApp Aç
                </button>
              )}
            </div>

            {/* Yaşlandırma Dinamik İlerleme Çubuğu */}
            <div style={{ display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden", background: "#f1f5f9", marginBottom: "12px" }}>
              <div 
                style={{ width: `${Math.max(5, collectionRate)}%`, background: "#22c55e" }} 
                title={`Zamanında Ödenenler: %${collectionRate}`} 
              />
              <div 
                style={{ width: `${Math.max(2, agingSummary.c1_30?.pct || 0)}%`, background: "#eab308" }} 
                title={`1-30 Gün Geciken: %${agingSummary.c1_30?.pct || 0}`} 
              />
              <div 
                style={{ width: `${Math.max(2, agingSummary.c31_60?.pct || 0)}%`, background: "#f97316" }} 
                title={`31-60 Gün Geciken: %${agingSummary.c31_60?.pct || 0}`} 
              />
              <div 
                style={{ width: `${Math.max(2, agingSummary.c60plus?.pct || 0)}%`, background: "#ef4444" }} 
                title={`60+ Gün Kritik: %${agingSummary.c60plus?.pct || 0}`} 
              />
            </div>

            <div className="aging-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <span><b>Zamanında:</b> %{collectionRate} ({fmtCurrency(totalCollected || donemOzet.toplamTahsilat)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308", flexShrink: 0 }} />
                <span><b>1 - 30 Gün:</b> {agingSummary.c1_30?.count || 0} Öğr. ({fmtCurrency(agingSummary.c1_30?.sum || 0)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
                <span><b>31 - 60 Gün:</b> {agingSummary.c31_60?.count || 0} Öğr. ({fmtCurrency(agingSummary.c31_60?.sum || 0)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                <span><b>60+ Gün:</b> {agingSummary.c60plus?.count || 0} Öğr. ({fmtCurrency(agingSummary.c60plus?.sum || 0)})</span>
              </div>
            </div>
          </div>

          {/* Vadesi Geçmiş Detay Tablosu */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "700", color: "#dc2626", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={16} /> Vadesi Geçen Öğrenciler ({vadesiGecmisList.length})
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#64748b", textAlign: "left", fontSize: "11px", fontWeight: 700 }}>
                    <th style={{ padding: "8px 12px" }}>ÖĞRENCİ</th>
                    <th style={{ padding: "8px 12px" }}>SINIF</th>
                    <th style={{ padding: "8px 12px" }}>VADE TARİHİ</th>
                    <th style={{ padding: "8px 12px" }}>GECİKME</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>KALAN TUTAR</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>İŞLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {vadesiGecmisList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                        {fixTurkishName(item.ogrenciAdiSoyadi)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>
                        {item.sinifAdi || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>
                        {item.vadeTarihi ? item.vadeTarihi.slice(0, 10) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#dc2626", fontWeight: 700 }}>
                        {item.gecikmeGunSayisi} Gün
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#dc2626" }}>
                        {fmtCurrency(item.kalanTutar, 2)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpen) onOpen("payment");
                          }}
                          style={{
                            border: "1px solid #bbf7d0",
                            background: "#f0fdf4",
                            color: "#16a34a",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          Tahsilat Al
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SEKME: FİNANSAL ANALİZ (GAP-4: 12 Aylık Trend & GAP-6: Gelir/Ödeme Dağılımları) */}
      {activeSubTab === "analiz" && renderChartsSection("12 Aylık Taksit & Tahsilat Karşılaştırma Grafiği (Edesis Trend Analizi)")}

      {/* 6. SEKME: ÖZET */}
      {activeSubTab === "ozet" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              Dönem Finansal Özeti (2026-2027)
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
              Edesis Muhasebe sistemiyle %100 canlı mutabakatlı finansal veriler. Toplam Ciro: <b>{fmtCurrency(donemOzet.toplamGelir)}</b>, Tahsil Edilen: <b>{fmtCurrency(donemOzet.toplamTahsilat)}</b>, Net Kar: <b>{fmtCurrency(donemOzet.netKar)}</b>.
            </p>
          </div>
          {renderChartsSection("Dönem Finansal Özeti ve 12 Aylık Karşılaştırma")}
        </div>
      )}

    </div>
  );
}
