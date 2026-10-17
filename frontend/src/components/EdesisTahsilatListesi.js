import { usePrintMode } from "../hooks/usePrintMode";
import { csvRow } from "../lib/csv";
import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Calendar,
  Plus
} from "lucide-react";
import AccountingService from "../lib/edesisAccountingService";
import { ReceiptModal } from "./ReceiptModal";
import { trIncludes } from "../lib/utils";

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
  payments = [],
  API,
  onSelectStudent,
  onOpenGelir,
  onNavigate
}) {
  const [tahsilatList, setTahsilatList] = useState(() => AccountingService.getCollections(payments));
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const paymentId=useRef();
  useEffect(()=>{if(showNewPaymentModal)paymentId.current="pay_"+crypto.randomUUID();},[showNewPaymentModal]);

  const handleOpenUnifiedContract = (t) => {
    const targetNo = t?.sozlesmeNo || t?.gelirAciklama?.replace("Sözleşme: ", "") || t?.gelirKodu || t?.musteriUnvan;
    if (targetNo) {
      try {
        sessionStorage.setItem("cozum_open_contract_no", targetNo);
        sessionStorage.setItem("cozum_contract_prev_page", "tahsilat");
      } catch {}
    }
    if (onNavigate) {
      onNavigate("documents");
    } else if (onOpenGelir) {
      onOpenGelir(t);
    }
  };

  useEffect(() => {
    setTahsilatList(AccountingService.getCollections(payments));
  }, [payments]);

  useEffect(() => {
    if ((!payments || payments.length === 0) && AccountingService.getCollections().length === 0) {
      AccountingService.fetchCollections().then((colls) => {
        if (colls && colls.length > 0) setTahsilatList(colls);
      });
    }
  }, [payments]);

  useEffect(() => {
    const handleUpdate = () => {
      setTahsilatList(AccountingService.getCollections(payments));
    };
    window.addEventListener("cozum_snapshot_updated", handleUpdate);
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    return () => {window.removeEventListener("cozum_accounting_updated", handleUpdate);window.removeEventListener("cozum_snapshot_updated",handleUpdate);};
  }, [payments]);
  const [bankFilter, setBankFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sıralama
  const [sortField, setSortField] = useState("tahsilatTarihi");
  const [sortOrder, setSortOrder] = useState("desc");

  // Sayfalama
  const printing=usePrintMode();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modallar
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Kasa / Banka seçenekleri
  const bankOptions = useMemo(() => {
    const set = new Set();
    tahsilatList.forEach((t) => {
      if (t.kasaBankaAdi) set.add(t.kasaBankaAdi);
    });
    return Array.from(set).sort();
  }, [tahsilatList]);

  // Filtreleme
  const filteredTahsilatlar = useMemo(() => {
    return tahsilatList.filter((t) => {
      // Banka / Kasa filtresi
      if (bankFilter !== "all") {
        const bName = (t.kasaBankaAdi || t.bank || "").toLowerCase();
        const mName = (t.method || "").toLowerCase();
        const isBank =
          bName.includes("vakıf") ||
          bName.includes("vakif") ||
          bName.includes("halk") ||
          bName.includes("bank") ||
          mName.includes("bank") ||
          mName.includes("pos") ||
          mName.includes("kart") ||
          mName.includes("transfer") ||
          mName.includes("havale") ||
          mName.includes("eft");
        if (bankFilter === "bank") {
          if (!isBank) return false;
        } else if (bankFilter === "cash") {
          if (isBank) return false;
        } else if (t.kasaBankaAdi !== bankFilter) {
          return false;
        }
      }

      // Tarih aralığı
      if (startDate && t.tahsilatTarihi && t.tahsilatTarihi.slice(0, 10) < startDate) return false;
      if (endDate && t.tahsilatTarihi && t.tahsilatTarihi.slice(0, 10) > endDate) return false;

      // Arama
      if (searchQuery.trim()) {
        const match =
          trIncludes(t.odemeKodu, searchQuery) ||
          trIncludes(t.gelirKodu, searchQuery) ||
          trIncludes(t.musteriUnvan, searchQuery) ||
          trIncludes(t.gelirAciklama, searchQuery) ||
          trIncludes(t.kasaBankaAdi, searchQuery);
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
    if (printing) return sortedTahsilatlar;
    const start = (currentPage - 1) * pageSize;
    return sortedTahsilatlar.slice(start, start + pageSize);
  }, [sortedTahsilatlar, currentPage, pageSize, printing]);

  const totalPages = Math.ceil(sortedTahsilatlar.length / pageSize) || 1;
  useEffect(() => { setCurrentPage(p => Math.min(p, totalPages)); }, [totalPages]);

  // 4 KPI İstatistik Kartları
  const stats = useMemo(() => {
    let count = 0;
    let totalCollected = 0;
    let bankSum = 0;
    let cashSum = 0;

    filteredTahsilatlar.forEach((t) => {
      const isCancelled = t.is_cancelled === 1 || t.is_cancelled === true || t.status === "İptal Edildi" || t.durum === "İptal Edildi" || t.durumText === "İptal Edildi";
      if (isCancelled) return;
      count++;
      const amt = Number(t.tahsilatTutari) || 0;
      totalCollected += amt;
      const bName = (t.kasaBankaAdi || t.bank || "").toLowerCase();
      const mName = (t.method || "").toLowerCase();
      if (
        bName.includes("vakıf") ||
        bName.includes("halk") ||
        bName.includes("bank") ||
        mName.includes("bank") ||
        mName.includes("pos") ||
        mName.includes("kart") ||
        mName.includes("transfer") ||
        mName.includes("havale") ||
        mName.includes("eft")
      ) {
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
      `${t.odemeKodu || ""}`,
      `${fmtDateTime(t.tahsilatTarihi)}`,
      `${t.musteriUnvan || ""}`,
      `${t.gelirKodu || ""}`,
      `${t.gelirAciklama || t.aciklama || ""}`,
      `${t.taksitNo || 1}. Taksit`,
      `${t.kasaBankaAdi || "Banka Havalesi"}`,
      `${(Number(t.tahsilatTutari) || 0).toFixed(2)}`,
      `${t.durumText || "Aktif"}`
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(csvRow).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Edesis_Tahsilat_Listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("📊 Tahsilat listesi Excel/CSV formatında indirildi.");
  };

  return (
    <div
      className="erp-ledger-page admin-record-list"
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
        className="erp-page-header"
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
        className="erp-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px"
        }}
      >
        {/* Kart 1: TOPLAM TAHSİLAT ADEDİ */}
        <div
          onClick={() => { setBankFilter("all"); setCurrentPage(1); }}
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            outline: bankFilter === "all" ? "2px solid #16a34a" : "none",
            outlineOffset: "2px",
            transition: "all 0.15s ease"
          }}
          title="Tüm tahsilatları listele"
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
          onClick={() => { setBankFilter(bankFilter === "bank" ? "all" : "bank"); setCurrentPage(1); }}
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            outline: bankFilter === "bank" ? "2px solid #2563eb" : "none",
            outlineOffset: "2px",
            transition: "all 0.15s ease"
          }}
          title={bankFilter === "bank" ? "Filtreyi kaldır (Tümünü göster)" : "Sadece banka hesaplarını filtrele"}
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
          onClick={() => { setBankFilter(bankFilter === "cash" ? "all" : "cash"); setCurrentPage(1); }}
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            outline: bankFilter === "cash" ? "2px solid #f59e0b" : "none",
            outlineOffset: "2px",
            transition: "all 0.15s ease"
          }}
          title={bankFilter === "cash" ? "Filtreyi kaldır (Tümünü göster)" : "Sadece nakit & bireysel kasayı filtrele"}
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
        className="erp-filter-panel"
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
                <option value="bank">🏦 Banka Hesapları (VakıfBank / POS / EFT)</option>
                <option value="cash">💵 Bireysel Kasa & Nakit</option>
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
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px" }} aria-hidden="true" />
              <input
                type="search"
                role="searchbox"
                aria-label="Ödeme kodu, müşteri, gelir no veya kasa ara"
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
                <button
                  type="button"
                  aria-label="Aramayı temizle"
                  style={{ position: "absolute", right: "10px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} color="#94a3b8" aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowNewPaymentModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 2px rgba(22, 163, 74, 0.2)"
              }}
            >
              <Plus size={14} /> + Yeni Tahsilat Ekle
            </button>
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
            aria-label="Tahsilat Listesi"
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
                <th scope="col" style={{ padding: "12px 14px", width: "70px", textAlign: "center" }}>İşlem</th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("odemeKodu")}
                >
                  Tahsilat / İşlem No {sortField === "odemeKodu" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("tahsilatTarihi")}
                >
                  Tarih & Saat {sortField === "tahsilatTarihi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("musteriUnvan")}
                >
                  Müşteri / Öğrenci {sortField === "musteriUnvan" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th scope="col" style={{ padding: "12px 14px" }}>Gelir / Sözleşme No</th>
                <th scope="col" style={{ padding: "12px 14px" }}>Taksit</th>
                <th scope="col" style={{ padding: "12px 14px" }}>Kasa / Banka Hesabı</th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  onClick={() => handleSort("tahsilatTutari")}
                >
                  Tutar {sortField === "tahsilatTutari" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th scope="col" style={{ padding: "12px 14px", textAlign: "center" }}>Durum</th>
                <th scope="col" style={{ padding: "12px 14px", textAlign: "center" }}>Resmi Makbuz</th>
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
                          onClick={() => handleOpenUnifiedContract(t)}
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
                          title="Sözleşme & Muhasebe Detayını Aç"
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

                      {/* 8. Tutar & 9. Durum */}
                      {(() => {
                        const isCancelled = t.is_cancelled === 1 || t.is_cancelled === true || t.status === "İptal Edildi" || t.durum === "İptal Edildi" || t.durumText === "İptal Edildi";
                        return (
                          <>
                            <td
                              style={{
                                padding: "10px 14px",
                                textAlign: "right",
                                fontWeight: 700,
                                fontSize: "13px",
                                color: isCancelled ? "#94a3b8" : "#16a34a",
                                textDecoration: isCancelled ? "line-through" : "none"
                              }}
                            >
                              {fmtCurrency(t.tahsilatTutari)}
                            </td>

                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: isCancelled ? "#fee2e2" : "#dcfce7",
                                  color: isCancelled ? "#b91c1c" : "#166534",
                                  border: isCancelled ? "1px solid #fca5a5" : "1px solid #86efac"
                                }}
                              >
                                {isCancelled ? "İptal Edildi" : (t.durumText || "Tahsil Edildi")}
                              </span>
                            </td>
                          </>
                        );
                      })()}

                      {/* 10. Resmi Makbuz */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const matchedStudent = (students || []).find(
                              (s) =>
                                String(s.id) === String(t.ogrenciId || t.student_id)
                            );
                            const stName = matchedStudent?.student_name || t.musteriUnvan || "";
                            const rawParent = matchedStudent?.parent_name || t.veliAdiSoyadi || "";
                            const safeParentName =
                              rawParent && rawParent.trim().toLocaleUpperCase("tr-TR") !== stName.trim().toLocaleUpperCase("tr-TR")
                                ? rawParent
                                : "";
                            const paymentObj = {
                              id: t.id,
                              receipt_no: t.odemeKodu,
                              contract_id: t.contract_id,
                              sozlesme_no: t.sozlesmeNo,
                              student_id: matchedStudent?.id || t.ogrenciId,
                              student_name: stName,
                              parent_name: safeParentName,
                              parent_phone: matchedStudent?.parent_phone || matchedStudent?.student_phone || t.telefon || "",
                              amount: t.tahsilatTutari,
                              is_cancelled: t.is_cancelled,
                              status: t.status,
                              payment_date: t.tahsilatTarihi || new Date().toISOString().slice(0, 10),
                              method: t.kasaBankaAdi || "Banka Havalesi / EFT",
                              bank: t.kasaBankaAdi || "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
                              taksit_no: t.taksitNo
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
            Toplam {sortedTahsilatlar.length} tahsilattan <b>{sortedTahsilatlar.length ? (currentPage - 1) * pageSize + 1 : 0}</b> - <b>{Math.min(currentPage * pageSize, sortedTahsilatlar.length)}</b> arası gösteriliyor
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
      {selectedReceiptPayment && (() => {
        const s = (students || []).find(
          (st) =>
            (selectedReceiptPayment.student_id && String(st.id) === String(selectedReceiptPayment.student_id)) ||
            (selectedReceiptPayment.student_name && st.student_name && trIncludes(st.student_name, selectedReceiptPayment.student_name))
        );
        const stName = s?.student_name || selectedReceiptPayment.student_name || "";
        const rawParent = s?.parent_name || selectedReceiptPayment.parent_name || "";
        const cleanParent =
          rawParent && rawParent.trim().toLocaleUpperCase("tr-TR") !== stName.trim().toLocaleUpperCase("tr-TR")
            ? rawParent
            : "";
        return (
          <ReceiptModal
            payment={{
              ...selectedReceiptPayment,
              payment_date: selectedReceiptPayment.payment_date || selectedReceiptPayment.date || new Date().toISOString().slice(0, 10)
            }}
            student={{
              ...(s || {}),
              student_name: stName,
              parent_name: cleanParent,
              parent_phone: s?.parent_phone || s?.student_phone || selectedReceiptPayment.parent_phone || ""
            }}
            onClose={() => setSelectedReceiptPayment(null)}
          />
        );
      })()}

      {/* YENİ TAHSİLAT EKLE MODAL */}
      {showNewPaymentModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "16px"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewPaymentModal(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Receipt size={18} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Yeni Tahsilat Kaydı Ekle</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPaymentModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
try {

                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const stName = fd.get("studentName");
                const matches=(students||[]).filter(s=>fd.get('studentId')?s.id===fd.get('studentId'):s.student_name===stName);
                if(matches.length!==1){alert('Öğrenci kesin olarak eşleşmedi. Öğrenci profilinden tahsilat ekleyin.');return;}
                const stObj=matches[0];
                const amt = Number(fd.get("amount")) || 0;
                if (amt <= 0) {
                  alert("Lütfen geçerli bir tahsilat tutarı giriniz.");
                  return;
                }
                const newColl = await AccountingService.recordCollection({
                  id:paymentId.current,
                  gelirKodu: stObj?.gelir_kodu,
                  sozlesmeNo: stObj?.sozlesme_no,
                  amount: amt,
                  bank: fd.get("bank") || "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
                  method: fd.get("method") || "Nakit",
                  note: fd.get("note") || "Taksit Tahsilatı",
                  studentName: stObj?.student_name || stName || "Öğrenci",
                  studentId: stObj?.id,
                  apiBaseUrl: API
                });
                setTahsilatList(AccountingService.getCollections(payments));
                setShowNewPaymentModal(false);
                showToast(`💰 ${newColl?.odemeKodu || ""} nolu ${fmtCurrency(amt)} tutarında tahsilat başarıyla kaydedildi.`);

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
}}
              style={{ padding: "20px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Öğrenci Adı Soyadı *
                  </label>
                  <input
                    list="student-options"
                    name="studentName"
                    required
                    placeholder="Öğrenci adı seçin veya yazın..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                  <datalist id="student-options">
                    {(students || []).map((s) => (
                      <option key={s.id || s.student_name} value={s.student_name}>
                        {s.student_class ? `(${s.student_class})` : ""} {s.parent_name ? `- Veli: ${s.parent_name}` : ""}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Tahsilat Tutarı (TL) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="amount"
                      required
                      placeholder="Örn: 5000"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        outline: "none",
                        fontWeight: 700,
                        color: "#16a34a"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Ödeme Yöntemi
                    </label>
                    <select
                      name="method"
                      defaultValue="Nakit"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        outline: "none",
                        background: "#fff"
                      }}
                    >
                      <option value="Nakit">Nakit</option>
                      <option value="Banka Havale / EFT">Banka Havale / EFT</option>
                      <option value="Kredi Kartı">Kredi Kartı</option>
                      <option value="Senet / Bono">Senet / Bono</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Hesap / Kasa
                  </label>
                  <select
                    name="bank"
                    defaultValue="T.C. VAKIFLAR BANKASI İNEGÖL ŞB."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="T.C. VAKIFLAR BANKASI İNEGÖL ŞB.">T.C. VAKIFLAR BANKASI İNEGÖL ŞB.</option>
                    <option value="T.C. ZİRAAT BANKASI İNEGÖL ŞB.">T.C. ZİRAAT BANKASI İNEGÖL ŞB.</option>
                    <option value="T. GARANTİ BANKASI">T. GARANTİ BANKASI</option>
                    <option value="Nakit Ana Kasa">Nakit Ana Kasa</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Açıklama / Not
                  </label>
                  <input
                    name="note"
                    defaultValue="Taksit Tahsilatı"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowNewPaymentModal(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(22, 163, 74, 0.2)"
                  }}
                >
                  Tahsilatı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
