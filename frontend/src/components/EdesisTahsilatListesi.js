import React, { useState, useMemo } from "react";
import {
  Wallet,
  Search,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Printer,
  X,
  Coins,
  CheckCircle2,
  Receipt,
  FileText,
  Building,
  CreditCard,
  Settings,
  Eye,
  Trash2,
  Calendar
} from "lucide-react";
import edesisData from "../data/edesisAccountingData.json";
import AccountingService from "../lib/edesisAccountingService";
import { ReceiptModal } from "./ReceiptModal";
import { GelirDetayModal } from "./GelirDetayModal";

// Para birimi formatlayıcı (₺55.000,00)
export function fmtCurrency(val) {
  const num = Number(val) || 0;
  return "₺" + num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Tarih formatlayıcı (26.09.2026 14:30)
export function fmtDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${mins}`;
  } catch {
    return String(isoStr);
  }
}

export default function EdesisTahsilatListesi({
  students = [],
  onSelectStudent,
  onOpenGelir
}) {
  const [tahsilatList, setTahsilatList] = useState(() => AccountingService.getCollections());

  useEffect(() => {
    const handleUpdate = () => {
      setTahsilatList(AccountingService.getCollections());
    };
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    return () => window.removeEventListener("cozum_accounting_updated", handleUpdate);
  }, []);
  const [bankFilter, setBankFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sıralama
  const [sortField, setSortField] = useState("tahsilatTarihi");
  const [sortOrder, setSortOrder] = useState("desc");

  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modallar
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
  const [selectedGelirDetail, setSelectedGelirDetail] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Kasa / Banka seçenekleri
  const bankOptions = useMemo(() => {
    const set = new Set();
    initialTahsilatlar.forEach((t) => {
      if (t.kasaBankaAdi) set.add(t.kasaBankaAdi);
    });
    return Array.from(set).sort();
  }, [initialTahsilatlar]);

  // Filtreleme
  const filteredTahsilatlar = useMemo(() => {
    return tahsilatList.filter((t) => {
      // Banka / Kasa filtresi
      if (bankFilter !== "all" && t.kasaBankaAdi !== bankFilter) {
        return false;
      }

      // Tarih aralığı
      if (startDate && t.tahsilatTarihi && t.tahsilatTarihi.slice(0, 10) < startDate) return false;
      if (endDate && t.tahsilatTarihi && t.tahsilatTarihi.slice(0, 10) > endDate) return false;

      // Arama
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (t.odemeKodu && t.odemeKodu.toLowerCase().includes(q)) ||
          (t.gelirKodu && t.gelirKodu.toLowerCase().includes(q)) ||
          (t.musteriUnvan && t.musteriUnvan.toLowerCase().includes(q)) ||
          (t.gelirAciklama && t.gelirAciklama.toLowerCase().includes(q)) ||
          (t.kasaBankaAdi && t.kasaBankaAdi.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [tahsilatList, bankFilter, startDate, endDate, searchQuery]);

  // Sıralama
  const sortedTahsilatlar = useMemo(() => {
    const list = [...filteredTahsilatlar];
    list.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];

      if (vA == null) vA = "";
      if (vB == null) vB = "";

      if (typeof vA === "number" && typeof vB === "number") {
        return sortOrder === "asc" ? vA - vB : vB - vA;
      }

      vA = String(vA).toLowerCase();
      vB = String(vB).toLowerCase();

      if (sortOrder === "asc") return vA.localeCompare(vB, "tr");
      return vB.localeCompare(vA, "tr");
    });
    return list;
  }, [filteredTahsilatlar, sortField, sortOrder]);

  // Sayfalama
  const paginatedTahsilatlar = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTahsilatlar.slice(start, start + pageSize);
  }, [sortedTahsilatlar, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTahsilatlar.length / pageSize) || 1;

  // 4 KPI İstatistik Kartları
  const stats = useMemo(() => {
    let count = 0;
    let totalCollected = 0;
    let bankSum = 0;
    let cashSum = 0;

    filteredTahsilatlar.forEach((t) => {
      count++;
      const amt = Number(t.tahsilatTutari) || 0;
      totalCollected += amt;
      const bName = (t.kasaBankaAdi || "").toLowerCase();
      if (bName.includes("vakıf") || bName.includes("halk") || bName.includes("bank")) {
        bankSum += amt;
      } else {
        cashSum += amt;
      }
    });

    return {
      count,
      totalCollected,
      bankSum,
      cashSum
    };
  }, [filteredTahsilatlar]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // İptal İşlemi
  const handleCancelPayment = (t) => {
    const updated = tahsilatList.filter((item) => item.id !== t.id);
    setTahsilatList(updated);
    setShowCancelModal(null);
    showToast(`🗑️ ${t.odemeKodu} nolu tahsilat kaydı iptal edildi.`);
  };

  // Excel'e Aktar
  const exportToExcel = () => {
    const headers = [
      "İşlem No (Ödeme Kodu)",
      "Tarih & Saat",
      "Müşteri / Öğrenci",
      "Gelir Kodu",
      "Açıklama",
      "Taksit No",
      "Kasa / Banka Hesabı",
      "Tutar (₺)",
      "Durum"
    ];

    const rows = sortedTahsilatlar.map((t) => [
      `"${t.odemeKodu || ""}"`,
      `"${fmtDateTime(t.tahsilatTarihi)}"`,
      `"${t.musteriUnvan || ""}"`,
      `"${t.gelirKodu || ""}"`,
      `"${t.gelirAciklama || t.aciklama || ""}"`,
      `"${t.taksitNo || 1}. Taksit"`,
      `"${t.kasaBankaAdi || "Banka Havalesi"}"`,
      `"${(Number(t.tahsilatTutari) || 0).toFixed(2)}"`,
      `"${t.durumText || "Aktif"}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Edesis_Tahsilat_Listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📊 Tahsilat listesi Excel/CSV formatında indirildi.");
  };

  return (
    <div
      style={{
        padding: isFullScreen ? "20px" : "0",
        background: isFullScreen ? "#f8fafc" : "transparent",
        position: isFullScreen ? "fixed" : "relative",
        top: isFullScreen ? 0 : "auto",
        left: isFullScreen ? 0 : "auto",
        right: isFullScreen ? 0 : "auto",
        bottom: isFullScreen ? 0 : "auto",
        zIndex: isFullScreen ? 99999 : "auto",
        overflowY: isFullScreen ? "auto" : "visible",
        height: isFullScreen ? "100vh" : "auto",
        display: "flex",
        flexDirection: "column",
        gap: "14px"
      }}
    >
      {/* TOAST BİLDİRİMİ */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0f172a",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMessage}</span>
          <X size={14} style={{ cursor: "pointer", marginLeft: "8px" }} onClick={() => setToastMessage(null)} />
        </div>
      )}

      {/* ÜST BAŞLIK VE HIZLI EYLEMLER BAR */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px 20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              Tahsilat Listesi & Makbuzlar
            </h2>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
              Ana Sayfa • Muhasebe • Gelir Yönetimi • <b>Tahsilat Listesi</b> ({tahsilatList.length} Edesis Tahsilat Kaydı)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer"
            }}
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullScreen ? "Küçült" : "Normal"}
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#166534",
              cursor: "pointer"
            }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            Excel'e Aktar
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer"
            }}
          >
            <Printer size={15} color="#475569" />
            Yazdır
          </button>
        </div>
      </div>

      {/* 4 ÖZET SAYAÇ KARTI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px"
        }}
      >
        {/* Kart 1: TOPLAM TAHSİLAT ADEDİ */}
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
              TOPLAM TAHSİLAT ADEDİ
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
              {stats.count}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Gerçekleşen tahsilat
            </div>
          </div>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#16a34a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Kart 2: TOPLAM TAHSİLAT TUTARI */}
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
              TOPLAM TAHSİLAT TUTARI
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#16a34a", marginTop: "4px" }}>
              {fmtCurrency(stats.totalCollected)}
            </div>
            <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "2px", fontWeight: 600 }}>
              Kasaya Giren Net
            </div>
          </div>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#7c3aed",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Coins size={20} />
          </div>
        </div>

        {/* Kart 3: VAKIFBANK & BANKA TAHSİLATI */}
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
              BANKA HESAPLARI
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
              {fmtCurrency(stats.bankSum)}
            </div>
            <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px", fontWeight: 600 }}>
              Havale / EFT / POS
            </div>
          </div>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Building size={20} />
          </div>
        </div>

        {/* Kart 4: NAKİT & DİĞER KASA */}
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
              BİREYSEL KASA & NAKİT
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
              {fmtCurrency(stats.cashSum)}
            </div>
            <div style={{ fontSize: "11px", color: "#ca8a04", marginTop: "2px", fontWeight: 600 }}>
              Elden & Kasa Tahsilatı
            </div>
          </div>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#f59e0b",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Wallet size={20} />
          </div>
        </div>
      </div>

      {/* FİLTRE VE ARAMA KONTROL PANELİ */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "12px 18px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Kasa / Banka Seçici */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "3px 8px"
              }}
            >
              <Building size={15} color="#64748b" style={{ marginRight: "6px" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginRight: "6px" }}>
                Hesap / Kasa
              </span>
              <select
                value={bankFilter}
                onChange={(e) => {
                  setBankFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <option value="all">Tüm Hesaplar ({tahsilatList.length})</option>
                {bankOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hızlı Arama */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "300px" }}>
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px" }} />
              <input
                type="text"
                placeholder="Ödeme kodu, müşteri, gelir no, kasa..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 32px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  color: "#1e293b",
                  background: "#f8fafc"
                }}
              />
              {searchQuery && (
                <X size={14} color="#94a3b8" style={{ position: "absolute", right: "10px", cursor: "pointer" }} onClick={() => setSearchQuery("")} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ANA TABLO BİLEŞENİ */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          overflow: "visible"
        }}
      >
        <div style={{ overflowX: "auto", minHeight: "360px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13px"
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #f1f5f9",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  backgroundColor: "#fafafa"
                }}
              >
                <th style={{ padding: "12px 14px", width: "70px", textAlign: "center" }}>İşlem</th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("odemeKodu")}
                >
                  Tahsilat / İşlem No {sortField === "odemeKodu" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("tahsilatTarihi")}
                >
                  Tarih & Saat {sortField === "tahsilatTarihi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("musteriUnvan")}
                >
                  Müşteri / Öğrenci {sortField === "musteriUnvan" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th style={{ padding: "12px 14px" }}>Gelir / Sözleşme No</th>
                <th style={{ padding: "12px 14px" }}>Taksit</th>
                <th style={{ padding: "12px 14px" }}>Kasa / Banka Hesabı</th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  onClick={() => handleSort("tahsilatTutari")}
                >
                  Tutar {sortField === "tahsilatTutari" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center" }}>Durum</th>
                <th style={{ padding: "12px 14px", textAlign: "center" }}>Resmi Makbuz</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTahsilatlar.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>Tahsilat kaydı bulunamadı.</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Filtrelerinizi değiştirerek tekrar deneyiniz.</div>
                  </td>
                </tr>
              ) : (
                paginatedTahsilatlar.map((t) => {
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.15s"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* 1. İşlem Butonu */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedGelirDetail({ gelirKodu: t.gelirKodu, sozlesmeNo: t.gelirAciklama, student: { student_name: t.musteriUnvan } })}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                          title="Gelir Detayını Aç"
                        >
                          <FileText size={12} />
                          Detay
                        </button>
                      </td>

                      {/* 2. Tahsilat No */}
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#2563eb", fontSize: "12px" }}>
                          {t.odemeKodu || `ODM-${t.id}`}
                        </span>
                      </td>

                      {/* 3. Tarih & Saat */}
                      <td style={{ padding: "10px 14px", color: "#475569", fontSize: "12px" }}>
                        {fmtDateTime(t.tahsilatTarihi)}
                      </td>

                      {/* 4. Müşteri / Öğrenci */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {t.musteriUnvan || "—"}
                        </div>
                      </td>

                      {/* 5. Gelir / Sözleşme No */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                          {t.gelirKodu || "—"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {t.gelirAciklama || ""}
                        </div>
                      </td>

                      {/* 6. Taksit No */}
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                          {t.taksitNo ? `${t.taksitNo}. Taksit` : "Tahsilat"}
                        </span>
                      </td>

                      {/* 7. Kasa / Banka Hesabı */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            color: "#334155"
                          }}
                        >
                          {t.kasaBankaAdi || "Banka Hesabı"}
                        </span>
                      </td>

                      {/* 8. Tutar */}
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: "13px", color: "#16a34a" }}>
                        {fmtCurrency(t.tahsilatTutari)}
                      </td>

                      {/* 9. Durum */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#166534"
                          }}
                        >
                          {t.durumText || "Aktif"}
                        </span>
                      </td>

                      {/* 10. Resmi Makbuz */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const paymentObj = {
                              id: t.odemeKodu || `MAK-${t.id}`,
                              student_name: t.musteriUnvan,
                              amount: t.tahsilatTutari,
                              payment_date: t.tahsilatTarihi,
                              method: t.kasaBankaAdi || "Banka Havalesi / EFT",
                              bank: t.kasaBankaAdi || "T.C. VAKIFLAR BANKASI İNEGÖL ŞB."
                            };
                            setSelectedReceiptPayment(paymentObj);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            color: "#2563eb",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                          title="Resmi Tahsilat Makbuzunu Aç & Yazdır"
                        >
                          <Receipt size={12} />
                          Makbuz
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SAYFALAMA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            borderTop: "1px solid #f1f5f9",
            flexWrap: "wrap",
            gap: "10px",
            fontSize: "12px",
            color: "#64748b"
          }}
        >
          <div>
            Toplam {sortedTahsilatlar.length} tahsilattan <b>{(currentPage - 1) * pageSize + 1}</b> - <b>{Math.min(currentPage * pageSize, sortedTahsilatlar.length)}</b> arası gösteriliyor
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Sayfa Başına:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  outline: "none"
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "4px 10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  background: currentPage === 1 ? "#f8fafc" : "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                Önceki
              </button>
              <span style={{ padding: "0 6px", fontWeight: 600, color: "#1e293b" }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: "4px 10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  background: currentPage >= totalPages ? "#f8fafc" : "#fff",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAKBUZ MODAL */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          student={{ student_name: selectedReceiptPayment.student_name }}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}

      {/* GELİR DETAY MODAL */}
      {selectedGelirDetail && (
        <GelirDetayModal
          isOpen={true}
          onClose={() => setSelectedGelirDetail(null)}
          gelirKodu={selectedGelirDetail.gelirKodu}
          sozlesmeNo={selectedGelirDetail.sozlesmeNo}
          student={selectedGelirDetail.student}
        />
      )}
    </div>
  );
}
