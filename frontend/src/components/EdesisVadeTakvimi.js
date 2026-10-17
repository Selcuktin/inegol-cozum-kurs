import { csvRow } from "../lib/csv";
import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  FileSpreadsheet,
  Printer,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  PieChart as PieIcon,
  Eye,
  MessageCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  ArrowRight,
  ArrowDownRight,
  Check,
  Filter
} from "lucide-react";
import AccountingService from "../lib/edesisAccountingService";
import { trIncludes } from "../lib/utils";

// Para birimi formatlayıcı (₺70.000,00)
export function fmtCurrency(val) {
  const num = Number(val) || 0;
  return "₺" + num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Büyük özet para formatlayıcı (₺4.183.536)
export function fmtMoneyWhole(val) {
  const num = Math.round(Number(val) || 0);
  return "₺" + num.toLocaleString("tr-TR");
}

// Tarih formatlayıcı (15.04.2026)
export function fmtDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr).slice(0, 10);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return String(isoStr).slice(0, 10);
  }
}

const EMPTY_STUDENTS=[];

export default function EdesisVadeTakvimi({
  students = EMPTY_STUDENTS,
  onSelectStudent,
  onOpenGelir,
  onNavigate
}) {
  const [progressMonth,setProgressMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const changeProgressMonth=delta=>{const date=new Date(progressMonth+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+delta);setProgressMonth(date.toISOString().slice(0,7));};
  const [allTaksitler, setAllTaksitler] = useState(() => AccountingService.getInstallments(students));

  useEffect(() => {
    setAllTaksitler(AccountingService.getInstallments(students));
  }, [students]);

  useEffect(() => {
    const handleUpdate = () => {
      setAllTaksitler(AccountingService.getInstallments(students));
    };
    window.addEventListener("cozum_snapshot_updated", handleUpdate);
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_snapshot_updated", handleUpdate);
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
      window.removeEventListener("cozum_students_updated", handleUpdate);
    };
  }, [students]);

  // Filtre durumları
  const [period, setPeriod] = useState("2026-2027");
  const [vadeFilter, setVadeFilter] = useState("upcoming"); // Varsayılan: Yaklaşanlar
  const [filterUnpaid, setFilterUnpaid] = useState(true); // Edesis varsayılanı: "Ödenmemişler" aktif
  const [showIptaller, setShowIptaller] = useState(false); // İptaller toggle
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Sıralama ve Sayfalama
  const [sortField, setSortField] = useState("vadeTarihi");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Edesis varsayılanı: 10 satır

  // Seçili satırlar (Checkbox)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Bildirim
  const [toastMessage, setToastMessage] = useState(null);

  const handleOpenContract = (t) => {
    const targetNo = t?.sozlesmeNo || t?.gelirAciklama?.replace("Sözleşme: ", "") || t?.gelirKodu || t?.ogrenciAdiSoyadi;
    if (targetNo) {
      try {
        sessionStorage.setItem("cozum_open_contract_no", targetNo);
        sessionStorage.setItem("cozum_contract_prev_page", "vade-takvimi");
      } catch {}
    }
    if (onNavigate) {
      onNavigate("documents");
    } else if (onOpenGelir) {
      onOpenGelir(t);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. DÖNEM BAZLI TÜM TAKSİTLER (İptaller filtrelenmiş / KPI Temel Havuzu)
  const baseTaksitler = useMemo(() => {
    return allTaksitler.filter((t) => {
      // Dönem filtresi
      if (period === "2026-2027" && t.donemAdi !== "2026-2027" && t.donemId !== 113) return false;
      if (period === "2025-2026" && t.donemAdi !== "2025-2026" && t.donemId !== 40) return false;
      if (!showIptaller && t.durumText?.includes("İptal")) return false;
      return true;
    });
  }, [allTaksitler, period, showIptaller]);

  // 2. EDESİS KPI KARTLARI (media_1791241193046.png BİREBİR)
  const kpi = useMemo(() => {
    // Diğer dönemler veya tümü seçildiğinde dinamik hesaplama
    let topTutar = 0;
    let bekleyenTutar = 0;
    let bekleyenCount = 0;
    let gecikmisTutar = 0;
    let gecikmisCount = 0;
    let tahsilTutar = 0;
    let tahsilCount = 0;
    let topGun = 0;

    baseTaksitler.forEach((t) => {
      topTutar += Number(t.taksitTutari) || 0;
      const isPaid = (Number(t.kalanTutar) <= 0) || (t.durumText === "Tam Ödendi");
      const isOverdue = t.vadesiGectiMi || (Number(t.kalanTutar) > 0 && t.gecikmeGunSayisi > 0);

      tahsilTutar += Number(t.tahsilEdilen) || 0;
      if(Number(t.tahsilEdilen)>0)tahsilCount++;
      if (isPaid) {
      } else if (isOverdue) {
        gecikmisTutar += Number(t.kalanTutar) || 0;
        gecikmisCount++;
        topGun += Number(t.gecikmeGunSayisi) || 0;
      } else {
        bekleyenTutar += Number(t.kalanTutar) || 0;
        bekleyenCount++;
      }
    });

    const perf = topTutar > 0 ? Math.round((tahsilTutar / topTutar) * 100) : 0;
    const ortGun = gecikmisCount > 0 ? (topGun / gecikmisCount).toFixed(1).replace(".", ",") : "0";

    return {
      toplamTutar: topTutar,
      toplamAdet: baseTaksitler.length,
      bekleyenTutar,
      bekleyenAdet: bekleyenCount,
      gecikmisTutar,
      gecikmisAdet: gecikmisCount,
      gecikmisOrtGun: ortGun,
      tahsilTutar,
      tahsilAdet: tahsilCount,
      performansOran: perf
    };
  }, [baseTaksitler]);

  const monthlyProgress=useMemo(()=>{
    const rows=baseTaksitler.filter(t=>String(t.vadeTarihi||t.due_date||'').startsWith(progressMonth));
    const total=rows.reduce((n,t)=>n+Number(t.taksitTutari||0),0);
    const paid=rows.reduce((n,t)=>n+Number(t.tahsilEdilen||0),0);
    return {total,paid,rate:total>0?Math.round(paid/total*100):0};
  },[baseTaksitler,progressMonth]);

  // 3. TABLO FİLTRELEME (Ödenmemişler filtresi aktifse 479 kayıt)
  const filteredTaksitler = useMemo(() => {
    let list = [...baseTaksitler];

    // Ödenmemişler filtresi (Edesis varsayılanı)
    if (filterUnpaid) {
      list = list.filter((t) => Number(t.kalanTutar) > 0 && t.durumText !== "Tam Ödendi");
    }

    // Vade filtresi
    if (vadeFilter === "overdue") {
      list = list.filter((t) => t.vadesiGectiMi || Number(t.gecikmeGunSayisi) > 0);
    } else if (vadeFilter === "upcoming") {
      const up = list.filter((t) => !t.vadesiGectiMi && Number(t.gecikmeGunSayisi) <= 0 && Number(t.kalanTutar) > 0);
      list = up.length > 0 ? up : list;
    } else if (vadeFilter === "paid") {
      list = list.filter((t) => Number(t.kalanTutar) <= 0 || t.durumText === "Tam Ödendi");
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      list = list.filter((t) => {
        return (
          trIncludes(t.ogrenciAdiSoyadi, searchQuery) ||
          trIncludes(t.musteriUnvan, searchQuery) ||
          trIncludes(t.gelirKodu, searchQuery) ||
          trIncludes(t.gelirAciklama, searchQuery) ||
          trIncludes(t.sinifAdi, searchQuery) ||
          trIncludes(t.musteriTelefon, searchQuery)
        );
      });
    }

    // Sıralama (Varsayılan: Vade Tarihi Artan)
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "vadeTarihi") {
        valA = new Date(a.vadeTarihi || 0).getTime();
        valB = new Date(b.vadeTarihi || 0).getTime();
      } else if (sortField === "tutar" || sortField === "taksitTutari") {
        valA = Number(a.taksitTutari) || 0;
        valB = Number(b.taksitTutari) || 0;
      } else if (sortField === "taksitNo") {
        valA = Number(a.taksitNo) || 0;
        valB = Number(b.taksitNo) || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [baseTaksitler, filterUnpaid, vadeFilter, searchQuery, sortField, sortAsc]);

  // Sayfalama
  const totalItems = filteredTaksitler.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  useEffect(() => { setCurrentPage(p => Math.min(p, totalPages)); }, [totalPages]);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentRows = filteredTaksitler.slice(startIndex, endIndex);

  // Checkbox işlemleri
  const toggleSelectAll = () => {
    if (selectedIds.size === currentRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentRows.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // WhatsApp Hatırlatması
  const sendWhatsApp = (t) => {
    const phone = t.musteriTelefon || t.veliTelefon || "";
    const cleanPhone = phone.replace(/\D/g, "");
    const name = t.ogrenciAdiSoyadi || t.musteriUnvan || "Sayın Velimiz";
    const msg = `Sayın Velimiz, ${name} isimli öğrencimizin ${fmtDate(t.vadeTarihi)} vadeli ${fmtCurrency(t.kalanTutar || t.taksitTutari)} tutarındaki taksit ödemesi bulunmaktadır. Bilgilerinize sunar, iyi günler dileriz. İnegöl Çözüm Kurs.`;
    const url = `https://wa.me/90${cleanPhone.replace(/^0/, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Excel CSV Dışa Aktarma
  const exportCsv = () => {
    const headers = ["Taksit No", "Müşteri / Öğrenci", "Sözleşme / Gelir Kodu", "Sınıf", "Telefon", "Vade Tarihi", "Taksit Tutarı", "Kalan Tutar", "Gecikme (Gün)", "Durum"];
    const rows = filteredTaksitler.map((t) => [
      t.taksitNo,
      t.ogrenciAdiSoyadi || t.musteriUnvan,
      t.gelirKodu || t.gelirAciklama,
      t.sinifAdi || "—",
      t.musteriTelefon || "—",
      fmtDate(t.vadeTarihi),
      t.taksitTutari,
      t.kalanTutar,
      t.gecikmeGunSayisi || 0,
      t.durumText
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(csvRow).join("\r\n");
    const encodedUri = URL.createObjectURL(new Blob([csvContent], {type: "text/csv;charset=utf-8;"}));
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Edesis_Vade_Takvimi_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(encodedUri), 1000);
    showToast("Vade Takvimi Excel formatında indirildi.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "100%", background: "#f8fafc" }}>
      {toastMessage && (
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
          <Check size={16} color="#22c55e" /> {toastMessage}
        </div>
      )}

      {/* 1. ÜST BAŞLIK VE GELİR LİSTESİ BUTONU (media_1791241193046.png) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em" }}>
              Vade Takvimi
            </h1>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Taksit vadelerini ve ödeme durumlarını izleyin – fiilen tahsil edilenler için Tahsilat Listesi
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            Ana Sayfa • Muhasebe • Gelir Yönetimi • <span style={{ color: "#3b82f6", fontWeight: "600" }}>Vade Takvimi</span>
          </div>
        </div>

        <div>
          <button
            className="btn"
            onClick={() => {
              if (onNavigate) onNavigate("gelir");
              else window.location.hash = "gelir";
            }}
            style={{
              background: "#2563eb",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              border: "none",
              cursor: "pointer"
            }}
          >
            <FileText size={14} /> Gelir Listesi
          </button>
        </div>
      </div>

      {/* 2. FİLTRE VE ARAMA ÇUBUĞU (media_1791241193046.png) */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Dönem Seçimi */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
            <span style={{ fontWeight: "600" }}>Dönem</span>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "12px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: "700", color: "#0f172a", outline: "none" }}
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="all">Tüm Dönemler</option>
            </select>
          </div>

          {/* Filtreler Butonu */}
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "12px", fontWeight: "600", color: "#334155", cursor: "pointer" }}
          >
            <Filter size={13} color="#2563eb" />
            <span>Filtreler</span>
            <span style={{ background: "#2563eb", color: "#fff", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: "800" }}>1</span>
          </button>

          {/* Tüm Vadeler Dropdown */}
          <select
            value={vadeFilter}
            onChange={(e) => {
              setVadeFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ fontSize: "12px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: "600", outline: "none" }}
          >
            <option value="all">Tüm Vadeler</option>
            <option value="overdue">Vadesi Geçenler</option>
            <option value="upcoming">Vadesi Gelmemişler</option>
            <option value="paid">Tahsil Edilenler</option>
          </select>

          {/* Ödenmemişler Aktif Çipi (Edesis Birebir) */}
          {filterUnpaid && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                padding: "4px 10px",
                borderRadius: "16px",
                fontSize: "11px",
                fontWeight: "700",
                color: "#334155"
              }}
            >
              <span>Ödenmemişler</span>
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setFilterUnpaid(false)}
                title="Filtreyi Kaldır"
              />
            </div>
          )}
          {!filterUnpaid && (
            <button
              onClick={() => setFilterUnpaid(true)}
              style={{ fontSize: "11px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}
            >
              + Ödenmemişleri Filtrele
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Arama Input */}
          <div style={{ position: "relative", minWidth: "220px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} aria-hidden="true" />
            <input
              type="search"
              role="searchbox"
              aria-label="Taksit, müşteri veya açıklama ara"
              placeholder="Müşteri, açıklama..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%", padding: "6px 10px 6px 30px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
            />
          </div>

          {/* İptaller Toggle */}
          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              aria-label="İptal edilen taksitleri göster"
              checked={showIptaller}
              onChange={(e) => setShowIptaller(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>İptaller</span>
          </label>

          {/* Excel Butonu (Yeşil) */}
          <button
            onClick={exportCsv}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              background: "#16a34a",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "700",
              border: "none",
              cursor: "pointer"
            }}
          >
            <FileSpreadsheet size={13} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* 3. EDESİS KPI ÖZET ŞERİDİ (KOMPAKT & BİLGİ BOMBARDIMANINDAN ARINDIRILMIŞ) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
        {/* KART 1: TOPLAM TUTAR */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "3px solid #3b82f6", borderRadius: "8px", padding: "8px 12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>TOPLAM TUTAR</div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a8a", marginTop: "1px" }}>
            {fmtMoneyWhole(kpi.toplamTutar)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>{kpi.toplamAdet} taksit</div>
        </div>

        {/* KART 2: BEKLEYEN */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "3px solid #f59e0b", borderRadius: "8px", padding: "8px 12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>BEKLEYEN</div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#b45309", marginTop: "1px" }}>
            {fmtMoneyWhole(kpi.bekleyenTutar)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>{kpi.bekleyenAdet} taksit</div>
        </div>

        {/* KART 3: GECİKMİŞ */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "3px solid #ef4444", borderRadius: "8px", padding: "8px 12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>GECİKMİŞ</div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#dc2626", marginTop: "1px" }}>
            {fmtMoneyWhole(kpi.gecikmisTutar)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>{kpi.gecikmisAdet} taksit</div>
        </div>

        {/* KART 4: TAHSİL EDİLEN */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "3px solid #22c55e", borderRadius: "8px", padding: "8px 12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>TAHSİL EDİLEN</div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#15803d", marginTop: "1px" }}>
            {fmtMoneyWhole(kpi.tahsilTutar)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>{kpi.tahsilAdet} taksit</div>
        </div>

        {/* KART 5: PERFORMANS */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "3px solid #a855f7", borderRadius: "8px", padding: "8px 12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>PERFORMANS</div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#7e22ce", marginTop: "1px" }}>
            %{kpi.performansOran}
          </div>
          <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>Tahsil Oranı</div>
        </div>
      </div>

      {/* 5. AYLIK TAHSİLAT İLERLEMESİ SEKMESİ (media_1791241193046.png) */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #ef4444", paddingBottom: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#dc2626" }}>Tahsilat İlerlemesi</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
            <button className="icon-btn" aria-label="Önceki ay" onClick={()=>changeProgressMonth(-1)}><ChevronLeft size={14}/></button>
            <span>{new Date(progressMonth+'-01T12:00:00Z').toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</span>
            <button className="icon-btn" aria-label="Sonraki ay" onClick={()=>changeProgressMonth(1)}><ChevronRight size={14}/></button>
          </div>
        </div>

        <div style={{ fontSize: "12px", fontWeight: "800", color: "#334155" }}>
          <span>{fmtCurrency(monthlyProgress.paid)} / {fmtCurrency(monthlyProgress.total)}</span> <span style={{ color: "#64748b", fontWeight: "600" }}>(%{monthlyProgress.rate})</span>
        </div>
      </div>

      {/* 6. GERÇEK EDESİS VERİ TABLOSU (media_1791241193046.png BİREBİR) */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "visible", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ overflowX: "auto", minHeight: "360px" }}>
          <table aria-label="Vade ve Taksit Takvimi" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "700" }}>
                <th scope="col" style={{ padding: "10px 14px", width: "36px" }}>
                  <input
                    type="checkbox"
                    aria-label="Tüm taksitleri seç"
                    checked={selectedIds.size === currentRows.length && currentRows.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th
                  scope="col"
                  onClick={() => {
                    setSortField("taksitNo");
                    setSortAsc(!sortAsc);
                  }}
                  style={{ padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
                >
                  TAKSİT NO {sortField === "taksitNo" ? (sortAsc ? "↑" : "↓") : "↑↓"}
                </th>
                <th scope="col" style={{ padding: "10px 14px" }}>MÜŞTERİ</th>
                <th scope="col" style={{ padding: "10px 14px" }}>AÇIKLAMA</th>
                <th
                  scope="col"
                  onClick={() => {
                    setSortField("vadeTarihi");
                    setSortAsc(!sortAsc);
                  }}
                  style={{ padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
                >
                  VADE TARİHİ {sortField === "vadeTarihi" ? (sortAsc ? "↑" : "↓") : "↑↓"}
                </th>
                <th
                  scope="col"
                  onClick={() => {
                    setSortField("taksitTutari");
                    setSortAsc(!sortAsc);
                  }}
                  style={{ padding: "10px 14px", textAlign: "right", cursor: "pointer", userSelect: "none" }}
                >
                  TUTAR {sortField === "taksitTutari" ? (sortAsc ? "↑" : "↓") : "↑↓"}
                </th>
                <th scope="col" style={{ padding: "10px 14px", textAlign: "center" }}>GECİKME</th>
                <th scope="col" style={{ padding: "10px 14px", textAlign: "center" }}>DURUM</th>
                <th scope="col" style={{ padding: "10px 14px", textAlign: "right" }}>İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((t) => {
                const isSelected = selectedIds.has(t.id);
                const isPaid = (Number(t.kalanTutar) <= 0) || (t.durumText === "Tam Ödendi");
                const isOverdue = t.vadesiGectiMi || (Number(t.kalanTutar) > 0 && t.gecikmeGunSayisi > 0);
                const isPartial = t.durumText?.includes("Kısmen") || (t.tahsilEdilen > 0 && t.kalanTutar > 0);
                const paidPercent = Number(t.taksitTutari) > 0 ? Math.round((Number(t.tahsilEdilen || 0) / Number(t.taksitTutari)) * 100) : 0;

                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isSelected ? "#f8fafc" : "#ffffff",
                      transition: "background 0.15s"
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: "12px 14px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(t.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>

                    {/* Taksit No */}
                    <td style={{ padding: "12px 14px", fontWeight: "700", color: "#334155" }}>
                      {t.taksitNo}
                    </td>

                    {/* Müşteri */}
                    <td style={{ padding: "12px 14px" }}>
                      <div
                        style={{ fontWeight: "700", color: "#0f172a", cursor: "pointer" }}
                        onClick={() => {
                          if (onSelectStudent) {
                            const found = students.find((s) => s.student_name === t.ogrenciAdiSoyadi);
                            if (found) onSelectStudent(found);
                          }
                        }}
                      >
                        {t.ogrenciAdiSoyadi || t.musteriUnvan}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                        <span style={{ fontFamily: "monospace", color: "#64748b" }}>{t.gelirKodu}</span>
                        {t.sinifAdi && (
                          <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>
                            {t.sinifAdi}
                          </span>
                        )}
                        {t.musteriTelefon && <span>📞 {t.musteriTelefon}</span>}
                      </div>
                    </td>

                    {/* Açıklama */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: "600", color: "#334155" }}>
                        {t.gelirAciklama || `Sözleşme: ${t.gelirKodu}`}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        🏷️ {t.gelirKategoriAdi || "Öğrenci Sözleşmesi"}
                      </div>
                    </td>

                    {/* Vade Tarihi */}
                    <td style={{ padding: "12px 14px", color: "#334155", fontWeight: "600" }}>
                      {fmtDate(t.vadeTarihi)}
                    </td>

                    {/* Tutar ve Kısmi Çubuk */}
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                        {fmtCurrency(t.taksitTutari)}
                      </div>
                      {isPartial && (
                        <div style={{ marginTop: "4px" }}>
                          <div style={{ width: "70px", height: "3px", background: "#fee2e2", borderRadius: "2px", display: "inline-block", overflow: "hidden", verticalAlign: "middle" }}>
                            <div style={{ width: `${paidPercent}%`, height: "100%", background: "#ef4444" }} />
                          </div>
                          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>%{paidPercent}</span>
                        </div>
                      )}
                    </td>

                    {/* Gecikme */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      {isOverdue && t.gecikmeGunSayisi > 0 ? (
                        <span style={{ background: "#fee2e2", color: "#dc2626", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "800" }}>
                          {t.gecikmeGunSayisi} gün
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>

                    {/* Durum */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      {isPaid ? (
                        <span style={{ background: "#16a34a", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "800" }}>
                          Tahsil Edildi
                        </span>
                      ) : isOverdue ? (
                        <span style={{ background: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "800" }}>
                          Vadesi Geçti
                        </span>
                      ) : (
                        <span style={{ background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "800" }}>
                          Vadesi Gelmedi
                        </span>
                      )}
                    </td>

                    {/* İşlemler (4 İkon: Göz, WhatsApp, Zil, Makbuz) */}
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "flex-end" }}>
                        {/* 1. Detay Görüntüle */}
                        <button
                          onClick={() => handleOpenContract(t)}
                          title="Detay Görüntüle"
                          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
                        >
                          <Eye size={15} />
                        </button>

                        {/* 2. WhatsApp Hatırlat */}
                        <button
                          onClick={() => sendWhatsApp(t)}
                          title="WhatsApp Hatırlatması Gönder"
                          style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", padding: "4px" }}
                        >
                          <MessageCircle size={15} />
                        </button>

                        {/* 3. Zil / Bildirim */}
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(`Sayın Velimiz, ${t.ogrenciAdiSoyadi} öğrencimizin ${fmtDate(t.vadeTarihi)} vadeli ${fmtCurrency(t.kalanTutar || t.taksitTutari)} tutarındaki taksit ödemesi bulunmaktadır.`);
                            showToast("SMS / Bildirim metni panoya kopyalandı.");
                          }}
                          title="Bildirim Metnini Kopyala"
                          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
                        >
                          <Bell size={15} />
                        </button>

                        {/* 4. Makbuz / Tahsilat */}
                        <button
                          onClick={() => handleOpenContract(t)}
                          title="Tahsilat Al / Makbuz"
                          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {currentRows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    Arama kriterlerine uygun taksit kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 7. SAYFALAMA ALTI (media_1791241193046.png BİREBİR) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#64748b" }}>
          <div>
            Toplam <b>{totalItems}</b> kayıttan <b>{totalItems === 0 ? 0 : startIndex + 1} - {endIndex}</b> arası gösteriliyor
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* İlk Sayfa */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              «
            </button>
            {/* Önceki Sayfa */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              ‹
            </button>

            {/* Sayfa Numaraları */}
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pNum = i + 1;
              const isActive = currentPage === pNum;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border: isActive ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    background: isActive ? "#2563eb" : "#fff",
                    color: isActive ? "#fff" : "#334155",
                    fontWeight: isActive ? "800" : "500",
                    cursor: "pointer"
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Sonraki Sayfa */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              ›
            </button>
            {/* Son Sayfa */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              »
            </button>

            {/* Sayfa Boyutu */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ marginLeft: "8px", padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "12px", outline: "none" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
