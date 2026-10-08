import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Calendar,
  Search,
  Maximize2,
  Minimize2,
  Plus,
  Settings,
  Eye,
  Printer,
  X,
  Trash2,
  FileSpreadsheet,
  Coins,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Building,
  DollarSign,
  Filter,
  Check
} from "lucide-react";
import edesisData from "../data/edesisAccountingData.json";
import AccountingService from "../lib/edesisAccountingService";
import { GelirDetayModal } from "./GelirDetayModal";
import { trIncludes } from "../lib/utils";

// Para birimi formatlayıcı (₺55.000,00)
export function fmtCurrency(val) {
  const num = Number(val) || 0;
  return "₺" + num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Tarih formatlayıcı (26.09.2026)
export function fmtDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return String(isoStr);
  }
}

export default function EdesisGelirListesi({
  students = [],
  onSelectStudent,
  onOpenGelir,
  onNavigate
}) {
  // AccountingService senkronizasyonu - eklenen gelirler ve taksitler anında tüm sisteme ve grafiklere yansısın
  const [incomesList, setIncomesList] = useState(() => AccountingService.getIncomes(students));

  useEffect(() => {
    setIncomesList(AccountingService.getIncomes(students));
  }, [students]);

  useEffect(() => {
    const handleUpdate = () => {
      setIncomesList(AccountingService.getIncomes(students));
    };
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
      window.removeEventListener("cozum_students_updated", handleUpdate);
    };
  }, [students]);

  // Filtreler
  const [periodFilter, setPeriodFilter] = useState("113"); // 113: 2026-2027 (Aktif), 40: 2025-2026, all: Tümü
  const [statusQuickFilter, setStatusQuickFilter] = useState("all"); // all, paid, unpaid, overdue
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sıralama
  const [sortField, setSortField] = useState("gelirKodu");
  const [sortOrder, setSortOrder] = useState("desc");

  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modallar ve Aksiyon Durumları
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [showNewIncomeModal, setShowNewIncomeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showQuickCollectModal, setShowQuickCollectModal] = useState(null);
  const [selectedGelirDetail, setSelectedGelirDetail] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Açık dropdown dışına tıklandığında menüyü kapat
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Bugünün ISO tarihi
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtrelenmiş Gelirler
  const filteredIncomes = useMemo(() => {
    return incomesList.filter((g) => {
      // Dönem filtresi
      if (periodFilter !== "all" && String(g.donemId) !== String(periodFilter)) {
        return false;
      }

      // Durum kontrolleri
      const isFullyPaid = g.tamTahsilEdildiMi || (Number(g.kalanAlacak) <= 0);
      const isOverdue = g.vadesiGectiMi || (Number(g.kalanAlacak) > 0 && g.vadeTarihi && g.vadeTarihi.slice(0, 10) < todayStr);

      if (statusQuickFilter === "paid" && !isFullyPaid) return false;
      if (statusQuickFilter === "unpaid" && isFullyPaid) return false;
      if (statusQuickFilter === "overdue" && !isOverdue) return false;

      // Kategori filtresi
      if (categoryFilter !== "all" && g.gelirKategoriAdi !== categoryFilter) {
        return false;
      }

      // Tarih aralığı
      if (startDate && g.gelirTarihi && g.gelirTarihi.slice(0, 10) < startDate) return false;
      if (endDate && g.gelirTarihi && g.gelirTarihi.slice(0, 10) > endDate) return false;

      // Arama kutusu
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const match =
          trIncludes(g.gelirKodu, q) ||
          trIncludes(g.ogrenciAdiSoyadi, q) ||
          trIncludes(g.musteriUnvan, q) ||
          trIncludes(g.sozlesmeNo, q) ||
          trIncludes(g.sinifAdi, q) ||
          trIncludes(g.aciklama, q);
        if (!match) return false;
      }

      return true;
    });
  }, [incomesList, periodFilter, statusQuickFilter, categoryFilter, startDate, endDate, searchQuery, todayStr]);

  // Sıralanmış Gelirler
  const sortedIncomes = useMemo(() => {
    const list = [...filteredIncomes];
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
  }, [filteredIncomes, sortField, sortOrder]);

  // Sayfalanmış Gelirler
  const paginatedIncomes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedIncomes.slice(start, start + pageSize);
  }, [sortedIncomes, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedIncomes.length / pageSize) || 1;

  // 4 KPI Sayaç İstatistikleri (Döneme göre canlı)
  const stats = useMemo(() => {
    let count = 0;
    let grossTotal = 0;
    let collectedTotal = 0;
    let remainingTotal = 0;

    filteredIncomes.forEach((g) => {
      count++;
      grossTotal += Number(g.brutTutar) || 0;
      collectedTotal += Number(g.toplamTahsilat) || 0;
      remainingTotal += Number(g.kalanAlacak) || 0;
    });

    return {
      count,
      grossTotal,
      collectedTotal,
      remainingTotal
    };
  }, [filteredIncomes]);

  // Sıralama tıklama tetikleyicisi
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Excel'e Aktar (CSV formatında UTF-8 BOM ile)
  const exportToExcel = () => {
    const headers = [
      "Gelir Kodu",
      "Tarih",
      "Vade",
      "Müşteri/Öğrenci",
      "Veli",
      "Sınıf",
      "Sözleşme No",
      "Kategori",
      "Brüt Tutar (₺)",
      "Tahsilat (₺)",
      "Kalan (₺)",
      "Taksit Sayısı",
      "Durum"
    ];

    const rows = sortedIncomes.map((g) => [
      `"${g.gelirKodu || ""}"`,
      `"${fmtDate(g.gelirTarihi)}"`,
      `"${fmtDate(g.vadeTarihi)}"`,
      `"${g.ogrenciAdiSoyadi || g.musteriUnvan || ""}"`,
      `"${g.musteriUnvan || ""}"`,
      `"${g.sinifAdi || ""}"`,
      `"${g.sozlesmeNo || ""}"`,
      `"${g.gelirKategoriAdi || "Öğrenci Sözleşmesi"}"`,
      `"${(Number(g.brutTutar) || 0).toFixed(2)}"`,
      `"${(Number(g.toplamTahsilat) || 0).toFixed(2)}"`,
      `"${(Number(g.kalanAlacak) || 0).toFixed(2)}"`,
      `"${g.taksitSayisi || 1}"`,
      `"${g.tamTahsilEdildiMi || g.kalanAlacak <= 0 ? "Tam Ödendi" : (g.vadesiGectiMi ? "Vadesi Geçti" : "Açık / Taksitli")}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Edesis_Gelir_Listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📊 Gelir listesi Excel/CSV formatında indirildi.");
  };

  // PRATİK GELİR SİLME İŞLEMİ
  const handleDeleteIncome = (gelir) => {
    AccountingService.deleteIncome(gelir);
    setIncomesList((prev) => prev.filter((item) => item.gelirKodu !== gelir.gelirKodu && item.id !== gelir.id));
    setShowDeleteModal(null);
    showToast(`🗑️ ${gelir.gelirKodu} numaralı gelir kaydı silindi.`);
  };

  // PRATİK GELİR EKLEME İŞLEMİ (Taksit bölme & sözleşme senkronizasyonu ile)
  const handleAddNewIncome = (newIncomeData) => {
    const res = AccountingService.addNewIncome(newIncomeData);
    setIncomesList(AccountingService.getIncomes());
    setShowNewIncomeModal(false);
    showToast(`✅ ${res.income.gelirKodu} numaralı yeni gelir ve ${res.installments.length} adet taksiti başarıyla eklendi.`);
  };

  // PRATİK HIZLI TAHSİLAT ALMA İŞLEMİ
  const handleQuickCollection = (gelir, collectAmount) => {
    const amt = Number(collectAmount) || 0;
    if (amt <= 0) return;

    AccountingService.recordCollection({
      gelirKodu: gelir.gelirKodu,
      sozlesmeNo: gelir.sozlesmeNo,
      amount: amt,
      bank: "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
      method: "Nakit",
      note: "Hızlı Tahsilat",
      studentName: gelir.ogrenciAdiSoyadi || gelir.musteriUnvan
    });

    setIncomesList(AccountingService.getIncomes());
    setShowQuickCollectModal(null);
    showToast(`💰 ${gelir.gelirKodu} için ${fmtCurrency(amt)} tutarında tahsilat başarıyla kaydedildi.`);
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
            gap: "10px",
            animation: "fadeIn 0.2s ease"
          }}
        >
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMessage}</span>
          <X
            size={14}
            style={{ cursor: "pointer", marginLeft: "10px", opacity: 0.7 }}
            onClick={() => setToastMessage(null)}
          />
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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                Gelir Listesi
              </h2>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                Ana Sayfa • Muhasebe • Gelir Yönetimi • <b>Gelir Listesi</b>
              </div>
            </div>
          </div>
        </div>

        {/* Aksiyon Butonları */}
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
              cursor: "pointer",
              transition: "all 0.15s"
            }}
            title={isFullScreen ? "Tam ekrandan çık" : "Tam ekran görünümü"}
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
              cursor: "pointer",
              transition: "all 0.15s"
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
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <Printer size={15} color="#475569" />
            Yazdır
          </button>

          <button
            type="button"
            onClick={() => setShowNewIncomeModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              background: "#2563eb",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.25)"
            }}
          >
            <Plus size={16} />
            + Yeni Gelir
          </button>
        </div>
      </div>

      {/* 4 ÖZET SAYAÇ KARTI (Edesis ile 1:1 Parite) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px"
        }}
      >
        {/* Kart 1: TOPLAM GELİR SAYISI */}
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
              TOPLAM GELİR SAYISI
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
              {stats.count}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Aktif filtrelenen kayıt
            </div>
          </div>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#3b82f6",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileText size={20} />
          </div>
        </div>

        {/* Kart 2: TOPLAM BRÜT GELİR */}
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
              TOPLAM BRÜT GELİR
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
              {fmtCurrency(stats.grossTotal)}
            </div>
            <div style={{ fontSize: "11px", color: "#7c3aed", marginTop: "2px", fontWeight: 600 }}>
              KDV Dahil Toplam
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

        {/* Kart 3: TOPLAM TAHSİLAT */}
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
              TOPLAM TAHSİLAT
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#16a34a", marginTop: "4px" }}>
              {fmtCurrency(stats.collectedTotal)}
            </div>
            <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "2px", fontWeight: 600 }}>
              Tahsil Edilen Tutar
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

        {/* Kart 4: KALAN ALACAK */}
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
              KALAN ALACAK
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>
              {fmtCurrency(stats.remainingTotal)}
            </div>
            <div style={{ fontSize: "11px", color: "#b45309", marginTop: "2px", fontWeight: 600 }}>
              Bekleyen Taksitler
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
            <Clock size={20} />
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
          {/* Sol Kontroller: Dönem Seçici ve Durum Butonları */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Dönem Seçici */}
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
              <Calendar size={15} color="#64748b" style={{ marginRight: "6px" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginRight: "6px" }}>
                Dönem
              </span>
              <select
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value);
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
                <option value="113">2026-2027 (Aktif)</option>
                <option value="40">2025-2026</option>
                <option value="all">Tüm Dönemler</option>
              </select>
            </div>

            {/* Durum Hap Butonları */}
            <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "6px", gap: "2px" }}>
              <button
                type="button"
                onClick={() => {
                  setStatusQuickFilter("all");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: statusQuickFilter === "all" ? "#fff" : "transparent",
                  color: statusQuickFilter === "all" ? "#0f172a" : "#64748b",
                  boxShadow: statusQuickFilter === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
                }}
              >
                Tümü ({incomesList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusQuickFilter("paid");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: statusQuickFilter === "paid" ? "#16a34a" : "transparent",
                  color: statusQuickFilter === "paid" ? "#fff" : "#166534"
                }}
              >
                🟢 Tam Tahsil Edildi
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusQuickFilter("unpaid");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: statusQuickFilter === "unpaid" ? "#ca8a04" : "transparent",
                  color: statusQuickFilter === "unpaid" ? "#fff" : "#854d0e"
                }}
              >
                🟡 Açık / Kısmi
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusQuickFilter("overdue");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: statusQuickFilter === "overdue" ? "#dc2626" : "transparent",
                  color: statusQuickFilter === "overdue" ? "#fff" : "#991b1b"
                }}
              >
                🔴 Vadesi Geçenler
              </button>
            </div>

            {/* Detaylı Filtreler Butonu */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                background: showAdvancedFilters ? "#e0e7ff" : "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: showAdvancedFilters ? "#3730a3" : "#475569",
                cursor: "pointer"
              }}
            >
              <Filter size={13} />
              Filtreler {showAdvancedFilters ? "▲" : "▼"}
            </button>
          </div>

          {/* Sağ Kontrol: Hızlı Arama Kutusu */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "300px" }}>
            <div
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center"
              }}
            >
              <Search
                size={14}
                color="#94a3b8"
                style={{ position: "absolute", left: "10px" }}
                aria-hidden="true"
              />
              <input
                type="search"
                role="searchbox"
                aria-label="Gelir no, müşteri, veli, sözleşme veya sınıf ile ara"
                placeholder="Gelir no, müşteri, veli, sözleşme, sınıf..."
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
                  <X
                    size={14}
                    color="#94a3b8"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
            {searchQuery && (
              <span style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>
                {filteredIncomes.length} sonuç
              </span>
            )}
          </div>
        </div>

        {/* Gelişmiş Filtre Çekmecesi */}
        {showAdvancedFilters && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px dashed #e2e8f0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "12px"
            }}
          >
            {/* Kategori Filtresi */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Gelir Kategorisi</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="Öğrenci Sözleşmesi">Öğrenci Sözleşmesi</option>
                <option value="Yayın ve Kitap Bedeli">Yayın ve Kitap Bedeli</option>
                <option value="Etüt ve Kurs">Etüt ve Kurs</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            {/* Başlangıç Tarihi */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Tarih Başlangıç</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              />
            </div>

            {/* Bitiş Tarihi */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Tarih Bitiş</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              />
            </div>

            {/* Temizle Butonu */}
            {(categoryFilter !== "all" || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
                style={{
                  padding: "6px 12px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        )}
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
            aria-label="Gelir Listesi"
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
                <th scope="col" style={{ padding: "12px 14px", width: "80px", textAlign: "center" }}>İşlemler</th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("gelirKodu")}
                >
                  Gelir Kodu {sortField === "gelirKodu" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("gelirTarihi")}
                >
                  Tarih / Vade {sortField === "gelirTarihi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("ogrenciAdiSoyadi")}
                >
                  Müşteri / Öğrenci {sortField === "ogrenciAdiSoyadi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("sozlesmeNo")}
                >
                  Sözleşme No {sortField === "sozlesmeNo" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th scope="col" style={{ padding: "12px 14px" }}>Kategori / Dönem</th>
                {/* 1:1 EDESİS media_1791234855262.png BRÜT TUTAR VE KALAN ÖNİZLEME */}
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("brutTutar")}
                >
                  Brüt Tutar & Kalan Önizleme {sortField === "brutTutar" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                {/* 1:1 EDESİS media_1791234855262.png TAHSİLAT KOLONU */}
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  onClick={() => handleSort("toplamTahsilat")}
                >
                  Tahsilat {sortField === "toplamTahsilat" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th scope="col" style={{ padding: "12px 14px" }}>Ödeme Türü</th>
                <th
                  scope="col"
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none", textAlign: "center" }}
                  onClick={() => handleSort("tamTahsilEdildiMi")}
                >
                  Durum {sortField === "tamTahsilEdildiMi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncomes.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>Kayıt bulunamadı.</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Filtrelerinizi değiştirerek tekrar deneyiniz.</div>
                  </td>
                </tr>
              ) : (
                paginatedIncomes.map((g, idx) => {
                  const isMenuOpen = openDropdownId === g.gelirKodu;
                  const openUpwards = (idx >= paginatedIncomes.length - 2 && paginatedIncomes.length > 3);
                  const isFullyPaid = g.tamTahsilEdildiMi || (Number(g.kalanAlacak) <= 0);
                  const isOverdue = g.vadesiGectiMi || (Number(g.kalanAlacak) > 0 && g.vadeTarihi && g.vadeTarihi.slice(0, 10) < todayStr);
                  const stName = g.ogrenciAdiSoyadi || g.musteriUnvan || "—";

                  // Yüzdelik Tahsilat Oranı (media_1791234855262.png mor bar için)
                  const gross = Number(g.brutTutar) || 0;
                  const collected = Number(g.toplamTahsilat) || 0;
                  const remaining = Number(g.kalanAlacak) || 0;
                  const pct = gross > 0 ? Math.min(100, Math.max(0, (collected / gross) * 100)) : 0;

                  return (
                    <tr
                      key={g.gelirKodu || g.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.15s",
                        backgroundColor: isMenuOpen ? "#f8fafc" : "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (!isMenuOpen) e.currentTarget.style.backgroundColor = "#fafafa";
                      }}
                      onMouseLeave={(e) => {
                        if (!isMenuOpen) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* 1. İşlemler Dropdown Butonu */}
                      <td style={{ padding: "10px 14px", textAlign: "center", position: "relative" }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            aria-label={`${g.gelirKodu} ${stName} işlem menüsünü aç`}
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(isMenuOpen ? null : g.gelirKodu);
                            }}
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
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(37,99,235,0.2)"
                            }}
                            title="İşlemler Menüsü"
                          >
                            <Settings size={12} aria-hidden="true" />
                            <span aria-hidden="true">▾</span>
                          </button>

                          {/* Aksiyon Açılır Menüsü */}
                          {isMenuOpen && (
                            <div
                              role="menu"
                              aria-label={`${g.gelirKodu} işlem seçenekleri`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                left: "0",
                                ...(openUpwards ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: openUpwards ? "0 -8px 25px rgba(0,0,0,0.12)" : "0 10px 25px rgba(0,0,0,0.12)",
                                zIndex: 1050,
                                minWidth: "185px",
                                padding: "6px 0",
                                textAlign: "left"
                              }}
                            >
                              <div
                                onClick={() => {
                                  setSelectedGelirDetail(g);
                                  setOpenDropdownId(null);
                                }}
                                style={{
                                  padding: "8px 14px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  color: "#1e293b",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Eye size={14} color="#2563eb" />
                                Gelir Detayı (GLR)
                              </div>

                              {!isFullyPaid && (
                                <div
                                  onClick={() => {
                                    setShowQuickCollectModal(g);
                                    setOpenDropdownId(null);
                                  }}
                                  style={{
                                    padding: "8px 14px",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#15803d",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0fdf4")}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                  <DollarSign size={14} color="#16a34a" />
                                  + Hızlı Tahsilat Al
                                </div>
                              )}

                              {g.sozlesmeNo && (
                                <div
                                  onClick={() => {
                                    if (onNavigate) onNavigate("documents");
                                    else window.location.hash = "documents";
                                    setOpenDropdownId(null);
                                  }}
                                  style={{
                                    padding: "8px 14px",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#4338ca",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0e7ff")}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                  <FileText size={14} color="#4f46e5" />
                                  Sözleşmeye Git
                                </div>
                              )}

                              <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />

                              <div
                                onClick={() => {
                                  setShowDeleteModal(g);
                                  setOpenDropdownId(null);
                                }}
                                style={{
                                  padding: "8px 14px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Trash2 size={14} color="#ef4444" />
                                Geliri Sil
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Gelir Kodu */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          onClick={() => setSelectedGelirDetail(g)}
                          style={{
                            color: "#2563eb",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            cursor: "pointer",
                            textDecoration: "none"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          title="Gelir Detay Kartını Aç"
                        >
                          {g.gelirKodu}
                        </span>
                      </td>

                      {/* 3. Tarih / Vade */}
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "12px" }}>
                          {fmtDate(g.gelirTarihi)}
                        </div>
                        {g.vadeTarihi && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: isOverdue ? "#dc2626" : "#64748b",
                              fontWeight: isOverdue ? 700 : 400,
                              marginTop: "1px"
                            }}
                          >
                            Vade: {fmtDate(g.vadeTarihi)}
                          </div>
                        )}
                      </td>

                      {/* 4. Müşteri / Öğrenci */}
                      <td style={{ padding: "10px 14px" }}>
                        <div
                          style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer" }}
                          onClick={() => setSelectedGelirDetail(g)}
                        >
                          {stName}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          {g.sinifAdi && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#eff6ff",
                                color: "#1d4ed8"
                              }}
                            >
                              {g.sinifAdi}
                            </span>
                          )}
                          {g.musteriUnvan && g.musteriUnvan !== stName && (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Veli: {g.musteriUnvan}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Sözleşme No */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            color: "#334155",
                            fontFamily: "monospace"
                          }}
                        >
                          {g.sozlesmeNo || "—"}
                        </span>
                      </td>

                      {/* 6. Kategori / Dönem */}
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                          {g.gelirKategoriAdi || "Öğrenci Sözleşmesi"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {g.donemAdi || "2026-2027"}
                        </div>
                      </td>

                      {/* 7. BRÜT TUTAR & KALAN ÖNİZLEME (TAM 1:1 media_1791234855262.png) */}
                      <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                        {/* 1. Satır: Brüt Tutar Bold */}
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", lineHeight: 1.2 }}>
                          {fmtCurrency(gross)}
                        </div>

                        {/* 2. Satır: Kalan Tutar ve Mor İlerleme Çubuğu */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "3px"
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>
                            Kalan {fmtCurrency(remaining)}
                          </span>
                          {/* Mor Mini Çizgi / Progress Bar (media_1791234855262.png) */}
                          <div
                            style={{
                              width: "34px",
                              height: "3.5px",
                              backgroundColor: "#e2e8f0",
                              borderRadius: "2px",
                              overflow: "hidden",
                              display: "inline-block",
                              flexShrink: 0
                            }}
                            title={`Tahsilat Oranı: %${Math.round(pct)}`}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                backgroundColor: "#7c3aed",
                                borderRadius: "2px",
                                transition: "width 0.3s ease"
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 8. TAHSİLAT KOLONU (TAM 1:1 media_1791234855262.png) */}
                      <td style={{ padding: "10px 14px", textAlign: "right", verticalAlign: "middle" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            color: "#f59e0b" // Altın sarısı/amber rengi media_1791234855262.png ile birebir aynı
                          }}
                        >
                          {fmtCurrency(collected)}
                        </span>
                      </td>

                      {/* 9. Ödeme Türü */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: g.taksitliMi ? "#fef3c7" : "#e0e7ff",
                            color: g.taksitliMi ? "#92400e" : "#3730a3"
                          }}
                        >
                          {g.taksitliMi ? `${g.taksitSayisi || 10} Taksit` : "Peşin"}
                        </span>
                      </td>

                      {/* 10. Durum Rozeti */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isFullyPaid
                              ? "#dcfce7"
                              : isOverdue
                              ? "#fee2e2"
                              : "#fef3c7",
                            color: isFullyPaid
                              ? "#166534"
                              : isOverdue
                              ? "#991b1b"
                              : "#92400e"
                          }}
                        >
                          {isFullyPaid ? "Tam Ödendi" : isOverdue ? "Vadesi Geçti" : "Açık / Taksitli"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SAYFALAMA VE SAYFA BOYUTU BAR */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Toplam {sortedIncomes.length} kayıttan</span>
            <span>
              <b>{(currentPage - 1) * pageSize + 1}</b> -{" "}
              <b>{Math.min(currentPage * pageSize, sortedIncomes.length)}</b> arası gösteriliyor
            </span>
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
                  outline: "none",
                  cursor: "pointer"
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
                  color: currentPage === 1 ? "#94a3b8" : "#1e293b",
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
                  color: currentPage >= totalPages ? "#94a3b8" : "#1e293b",
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

      {/* 1. PRATİK YENİ GELİR EKLEME MODAL */}
      {showNewIncomeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowNewIncomeModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Başlığı */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Yeni Gelir Kaydı Oluştur
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Öğrenci veya harici müşteri için yeni tahakkuk / sözleşme geliri açın.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewIncomeModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Formu */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleAddNewIncome({
                  ogrenciAdi: formData.get("ogrenciAdi"),
                  veliAdi: formData.get("veliAdi"),
                  sinifAdi: formData.get("sinifAdi"),
                  gelirKategoriAdi: formData.get("gelirKategoriAdi"),
                  brutTutar: formData.get("brutTutar"),
                  kdvOrani: formData.get("kdvOrani"),
                  taksitSayisi: formData.get("taksitSayisi"),
                  gelirTarihi: formData.get("gelirTarihi"),
                  vadeTarihi: formData.get("vadeTarihi"),
                  aciklama: formData.get("aciklama")
                });
              }}
              style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Öğrenci Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    name="ogrenciAdi"
                    required
                    placeholder="Örn: AHMET YILMAZ"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Veli Adı Soyadı (Müşteri)
                  </label>
                  <input
                    type="text"
                    name="veliAdi"
                    placeholder="Örn: MEHMET YILMAZ"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Sınıf / Şube
                  </label>
                  <input
                    type="text"
                    name="sinifAdi"
                    placeholder="Örn: 8-A, 12-SAY"
                    defaultValue="8-A"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Gelir Kategorisi
                  </label>
                  <select
                    name="gelirKategoriAdi"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="Öğrenci Sözleşmesi">Öğrenci Sözleşmesi</option>
                    <option value="Yayın ve Kitap Bedeli">Yayın ve Kitap Bedeli</option>
                    <option value="Etüt ve Kurs">Etüt ve Kurs</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Brüt Tutar (₺) *
                  </label>
                  <input
                    type="number"
                    name="brutTutar"
                    required
                    min="1"
                    step="0.01"
                    placeholder="Örn: 55000"
                    defaultValue="55000"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none",
                      fontWeight: 700
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    KDV Oranı
                  </label>
                  <select
                    name="kdvOrani"
                    defaultValue="10"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="10">%10 (Eğitim Hizmeti)</option>
                    <option value="20">%20 (Genel Hizmet)</option>
                    <option value="0">%0 (Muaf / Tevkifat)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Taksit Sayısı
                  </label>
                  <input
                    type="number"
                    name="taksitSayisi"
                    min="1"
                    max="24"
                    defaultValue="10"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Gelir Tarihi
                  </label>
                  <input
                    type="date"
                    name="gelirTarihi"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    İlk Vade Tarihi
                  </label>
                  <input
                    type="date"
                    name="vadeTarihi"
                    defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Açıklama / Not
                </label>
                <textarea
                  name="aciklama"
                  rows={2}
                  placeholder="Gelir açıklaması veya ek not..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f1f5f9"
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowNewIncomeModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    background: "#2563eb",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
                  }}
                >
                  ✓ Geliri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PRATİK GELİR SİLME ONAY MODAL */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowDeleteModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              padding: "24px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Gelir Kaydını Sil
                </h3>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Bu işlem geri alınamaz.
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                marginBottom: "20px"
              }}
            >
              <div>Gelir Kodu: <b>{showDeleteModal.gelirKodu}</b></div>
              <div>Öğrenci: <b>{showDeleteModal.ogrenciAdiSoyadi || showDeleteModal.musteriUnvan}</b></div>
              <div>Brüt Tutar: <b>{fmtCurrency(showDeleteModal.brutTutar)}</b></div>
              <div>Kalan Alacak: <b style={{ color: "#dc2626" }}>{fmtCurrency(showDeleteModal.kalanAlacak)}</b></div>
            </div>

            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              <b>{showDeleteModal.gelirKodu}</b> nolu gelir kaydını ve varsa bağlı taksit planını listeden kaldırmak istediğinize emin misiniz?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                style={{
                  padding: "8px 16px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleDeleteIncome(showDeleteModal)}
                style={{
                  padding: "8px 18px",
                  background: "#dc2626",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(220,38,38,0.2)"
                }}
              >
                🗑️ Evet, Geliri Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRATİK HIZLI TAHSİLAT MODAL */}
      {showQuickCollectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowQuickCollectModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#16a34a",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Tahsilat Al
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    {showQuickCollectModal.gelirKodu} • {showQuickCollectModal.ogrenciAdiSoyadi || showQuickCollectModal.musteriUnvan}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCollectModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleQuickCollection(showQuickCollectModal, formData.get("collectAmount"));
              }}
              style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534" }}>TOPLAM BRÜT TUTAR</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                    {fmtCurrency(showQuickCollectModal.brutTutar)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#dc2626" }}>KALAN ALACAK</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#dc2626" }}>
                    {fmtCurrency(showQuickCollectModal.kalanAlacak)}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Tahsil Edilecek Tutar (₺) *
                </label>
                <input
                  type="number"
                  name="collectAmount"
                  required
                  min="1"
                  max={showQuickCollectModal.kalanAlacak}
                  step="0.01"
                  defaultValue={
                    showQuickCollectModal.taksitSayisi && showQuickCollectModal.kalanAlacak > 0
                      ? Math.round((showQuickCollectModal.brutTutar / showQuickCollectModal.taksitSayisi) * 100) / 100
                      : showQuickCollectModal.kalanAlacak
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "16px",
                    border: "2px solid #22c55e",
                    borderRadius: "6px",
                    outline: "none",
                    fontWeight: 700,
                    color: "#0f172a"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Tahsilat Yöntemi
                  </label>
                  <select
                    name="method"
                    defaultValue="Banka Havalesi / EFT"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="Banka Havalesi / EFT">Banka Havalesi / EFT</option>
                    <option value="Nakit Kasa">Nakit Kasa</option>
                    <option value="Kredi Kartı / POS">Kredi Kartı / POS</option>
                    <option value="Senet">Senet</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Kasa / Hesap
                  </label>
                  <select
                    name="account"
                    defaultValue="Vakıfbank İnegöl Şb."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="Vakıfbank İnegöl Şb.">Vakıfbank İnegöl Şb.</option>
                    <option value="Halkbank İnegöl Şb.">Halkbank İnegöl Şb.</option>
                    <option value="Merkez Nakit Kasa">Merkez Nakit Kasa</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f1f5f9"
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowQuickCollectModal(null)}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    background: "#16a34a",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(22,163,74,0.25)"
                  }}
                >
                  ✓ Tahsilatı Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. GELİR DETAY MODAL ENTEGRASYONU */}
      {selectedGelirDetail && (
        <GelirDetayModal
          isOpen={true}
          onClose={() => setSelectedGelirDetail(null)}
          gelirKodu={selectedGelirDetail.gelirKodu}
          sozlesmeNo={selectedGelirDetail.sozlesmeNo}
          student={{
            student_name: selectedGelirDetail.ogrenciAdiSoyadi,
            parent_name: selectedGelirDetail.musteriUnvan
          }}
          onRecordPayment={() => {
            // Detay ekranından ödeme yapıldığında ana listeyi yenile
            showToast("💰 Tahsilat başarıyla işlendi.");
          }}
        />
      )}
    </div>
  );
}
