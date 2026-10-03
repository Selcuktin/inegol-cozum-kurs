import React, { useState, useMemo } from "react";
import {
  X,
  Printer,
  Calendar,
  CreditCard,
  User,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Info,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Link as LinkIcon,
  ChevronRight,
  ArrowLeft,
  Settings,
  Plus,
  Lock,
  MessageCircle,
  FileCheck,
  Zap,
  History,
  FileSpreadsheet
} from "lucide-react";
import edesisData from "../data/edesisAccountingData.json";
import { ReceiptModal } from "./ReceiptModal";

// Para birimi formatlayıcı (₺50.000,00)
function fmtTRY(amount, decimals = true) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0
  }).format(num);
}

// Tarih formatlayıcı (26.09.2026)
function fmtDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split("T")[0];
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

export function GelirDetayModal({
  isOpen,
  onClose,
  gelirKodu,
  sozlesmeNo,
  student,
  onRecordPayment
}) {
  const [activeTabNotes, setActiveTabNotes] = useState("notes"); // 'notes' | 'activity'
  const [newNote, setNewNote] = useState("");
  const [notesList, setNotesList] = useState([]);
  const [deliveryChannel, setDeliveryChannel] = useState("email"); // 'email' | 'sms' | 'whatsapp'
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quickPayInst, setQuickPayInst] = useState(null);

  // 1. İlgili Gelir / Sözleşme ve Taksit Verilerini Bul
  const accountingInfo = useMemo(() => {
    if (!isOpen) return null;

    const allGelirler = edesisData.gelirler || [];
    const allSozlesmeler = edesisData.sozlesmeler || [];
    const allTaksitler = edesisData.taksitler || [];
    const allTahsilatlar = edesisData.tahsilatlar || [];

    let targetGelir = null;
    let targetSozlesme = null;

    // Arama önceliği: gelirKodu -> sozlesmeNo -> student.student_name
    if (gelirKodu) {
      targetGelir = allGelirler.find(g => g.gelirKodu === gelirKodu);
    }
    if (!targetGelir && sozlesmeNo) {
      targetGelir = allGelirler.find(g => g.sozlesmeNo === sozlesmeNo || (g.aciklama && g.aciklama.includes(sozlesmeNo)));
      targetSozlesme = allSozlesmeler.find(s => s.sozlesmeNo === sozlesmeNo);
    }
    if (!targetGelir && student) {
      const sName = (student.student_name || "").trim().toUpperCase();
      targetGelir = allGelirler.find(g => {
        const gName = (g.ogrenciAdiSoyadi || g.musteriUnvan || "").trim().toUpperCase();
        return gName === sName || (sName && gName.includes(sName));
      });
      targetSozlesme = allSozlesmeler.find(s => {
        const szName = (s.ogrenciAdi || s.musteriUnvan || "").trim().toUpperCase();
        return szName === sName || (sName && szName.includes(sName));
      });
    }

    // Varsayılan / Fallback: Eğer hiçbiri bulunamazsa Aselsare Bilgin (GLR202600150)
    if (!targetGelir && !student) {
      targetGelir = allGelirler.find(g => g.gelirKodu === "GLR202600150") || allGelirler[0];
    }

    if (targetGelir && !targetSozlesme) {
      targetSozlesme = allSozlesmeler.find(s => s.sozlesmeNo === targetGelir.sozlesmeNo);
    }

    // Taksitleri çek
    let taksitler = [];
    if (targetGelir) {
      taksitler = allTaksitler.filter(t => 
        (targetGelir.id && t.muH_GelirV2Id === targetGelir.id) ||
        (targetGelir.gelirKodu && t.gelirKodu === targetGelir.gelirKodu) ||
        (targetGelir.sozlesmeNo && t.sozlesmeNo === targetGelir.sozlesmeNo)
      );
    }

    // Taksitleri taksitNo'ya göre sırala
    taksitler.sort((a, b) => (a.taksitNo || 0) - (b.taksitNo || 0));

    // Eğer taksitler boşsa ve student veya targetGelir varsa dinamik taksit planı oluştur
    if (taksitler.length === 0) {
      const brut = targetGelir ? Number(targetGelir.brutTutar) : (Number(student?.total_fee) || 55000);
      const paid = targetGelir ? Number(targetGelir.toplamTahsilat) : (Number(student?.paid_amount) || 0);
      const count = targetGelir?.taksitSayisi || student?.installment_count || 10;
      const per = Math.round((brut / count) * 100) / 100;
      let remPaid = paid;

      for (let i = 1; i <= count; i++) {
        const curPaid = Math.min(per, remPaid);
        remPaid = Math.max(0, remPaid - per);
        const curRem = Math.max(0, per - curPaid);
        const m = (9 + i) % 12 || 12;
        const y = 2026 + Math.floor((9 + i - 1) / 12);
        const dueStr = `${y}-${String(m).padStart(2, "0")}-30T00:00:00`;

        taksitler.push({
          taksitNo: i,
          vadeTarihi: dueStr,
          taksitTutari: per,
          tahsilEdilen: curPaid,
          kalanTutar: curRem,
          durumText: curRem === 0 ? "Tam Ödendi" : (new Date(dueStr) < new Date() ? "Gecikti" : "Vadesi Gelmedi"),
          sonTahsilatTarihi: curPaid > 0 ? "2026-10-01T17:51:42" : null,
          notlar: `${i}. Taksit`
        });
      }
    }

    // Temel alanları toparla
    const gCode = targetGelir?.gelirKodu || (student ? `GLR-STU-${student.id}` : "GLR202600150");
    const szNo = targetSozlesme?.sozlesmeNo || targetGelir?.sozlesmeNo || "SZL202600146";
    const stName = targetGelir?.ogrenciAdiSoyadi || targetGelir?.musteriUnvan || student?.student_name || "ASELSARE BİLGİN";
    const stPhone = taksitler[0]?.musteriTelefon || student?.student_phone || student?.parent_phone || "05458018543";
    const stEmail = taksitler[0]?.musteriEmail || student?.parent_email || "aselsare@edesis.com";
    const stClass = targetGelir?.sinifAdi || targetSozlesme?.sinifAdi || student?.student_class || student?.program || "4-A";
    const stTc = student?.student_tc || taksitler[0]?.musteriId || "336045162072";

    const brut = Number(targetGelir?.brutTutar || student?.total_fee || 55000);
    const net = Number(targetGelir?.netTutar || (brut / 1.1) || 50000);
    const kdv = Number(targetGelir?.kdvTutari || (brut - net) || 5000);
    const collected = Number(targetGelir?.toplamTahsilat || student?.paid_amount || (taksitler[0]?.tahsilEdilen || 0));
    const remaining = Math.max(0, brut - collected);
    const progressPct = brut > 0 ? Math.min(100, Math.round((collected / brut) * 100)) : 0;

    // Sonraki vadesi gelen taksit
    const nextPending = taksitler.find(t => (t.kalanTutar || t.taksitTutari - (t.tahsilEdilen || 0)) > 0);

    return {
      targetGelir,
      targetSozlesme,
      taksitler,
      gCode,
      szNo,
      stName,
      stPhone,
      stEmail,
      stClass,
      stTc,
      brut,
      net,
      kdv,
      collected,
      remaining,
      progressPct,
      nextPending,
      donem: targetGelir?.donemAdi || "2026-2027",
      kategori: targetGelir?.gelirKategoriAdi || "Öğrenci Sözleşmesi",
      tarih: fmtDate(targetGelir?.gelirTarihi || "2026-09-26"),
      vadeTarihi: fmtDate(targetGelir?.vadeTarihi || "2026-11-30"),
      sozlesmeTarihi: fmtDate(targetSozlesme?.sozlesmeTarihi || "2026-09-26"),
      taksitSayisi: taksitler.length
    };
  }, [isOpen, gelirKodu, sozlesmeNo, student]);

  if (!isOpen || !accountingInfo) return null;

  const {
    gCode,
    szNo,
    stName,
    stPhone,
    stEmail,
    stClass,
    stTc,
    brut,
    net,
    kdv,
    collected,
    remaining,
    progressPct,
    nextPending,
    donem,
    kategori,
    tarih,
    vadeTarihi,
    sozlesmeTarihi,
    taksitSayisi,
    taksitler
  } = accountingInfo;

  const handlePrint = () => {
    window.print();
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotesList(prev => [
      { id: Date.now(), text: newNote.trim(), date: new Date().toLocaleString("tr-TR"), author: "Yönetici" },
      ...prev
    ]);
    setNewNote("");
  };

  const handleCopyLink = () => {
    const fakeLink = `https://inegolcozum.edesis.com/pay/${gCode}?token=${Math.random().toString(36).slice(2, 10)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fakeLink);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleOpenReceipt = (taksit) => {
    setReceiptPayment({
      id: `rcp-${gCode}-${taksit.taksitNo}`,
      student_id: student?.id || `stu-${gCode}`,
      student_name: stName,
      student_class: stClass,
      amount: taksit.tahsilEdilen || taksit.taksitTutari,
      method: "Banka Transferi",
      bank: "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
      payment_date: taksit.sonTahsilatTarihi ? taksit.sonTahsilatTarihi.slice(0, 10) : new Date().toISOString().slice(0, 10),
      note: `${szNo} nolu sözleşme ${taksit.taksitNo}. taksit tahsilatı`,
      created_at: new Date().toISOString()
    });
  };

  const handleSendWhatsAppReminder = () => {
    const cleanPhone = (stPhone || "").replace(/\D/g, "");
    const targetPhone = cleanPhone.startsWith("90") ? cleanPhone : (cleanPhone.startsWith("0") ? "9" + cleanPhone : "90" + cleanPhone);
    const msg = encodeURIComponent(
      `Sayın Velimiz,\n${stName} isimli öğrencimizin Özel İnegöl Çözüm Kurs Merkezi ${szNo} nolu sözleşmesine ait kalan borç tutarı ${fmtTRY(remaining)}'dir.\nBir sonraki taksit vadesi: ${nextPending ? fmtDate(nextPending.vadeTarihi) : vadeTarihi}.\nBilgilerinize sunarız.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${msg}`, "_blank");
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, backgroundColor: "rgba(15, 23, 42, 0.75)" }}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
          style={{ 
            backgroundColor: "#ffffff", 
            borderRadius: "14px", 
            width: "96%", 
            maxWidth: "1380px", 
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}
        >
          {/* TOP BAR / BREADCRUMB & ACTIONS */}
          <div 
            className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/80"
            style={{ borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1" style={{ display: "flex", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                <span>Ana Sayfa</span>
                <span>›</span>
                <span>Muhasebe</span>
                <span>›</span>
                <span>Gelir Yönetimi</span>
                <span>›</span>
                <span className="font-semibold text-slate-700" style={{ color: "#334155", fontWeight: 600 }}>Gelir Detay</span>
              </div>
              <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 className="text-xl font-bold text-slate-900 m-0" style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Gelir Detay <span className="text-slate-400 font-normal ml-1" style={{ color: "#94a3b8", fontWeight: 400 }}>{gCode}</span>
                </h1>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={15} /> Geri
              </button>
              <button
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Settings size={15} /> Sınıflandırmayı Düzelt
              </button>
              <button
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Calendar size={15} /> Ödeme Planı
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-colors"
                style={{ padding: "6px 14px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={15} /> Yazdır
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 ml-1"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* MAIN MODAL BODY: 2-COLUMN EDESIS LAYOUT */}
          <div 
            className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40"
            style={{ flex: 1, overflowY: "auto", padding: "24px", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px", background: "#f8fafc" }}
          >
            {/* LEFT COLUMN: GELİR BİLGİLERİ, SÖZLEŞME, KALEMLER, TAKSİT PLANI (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6" style={{ gridColumn: "span 8 / span 8", display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* 1. GELİR BİLGİLERİ CARD */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "14px", fontWeight: 600 }}>
                  <Info size={16} className="text-blue-500" />
                  <span>Gelir Bilgileri</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-xs" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px 20px", fontSize: "13px" }}>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Gelir Kodu:</span>
                    <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>{gCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Öğrenci:</span>
                    <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>{stName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Net Tutar:</span>
                    <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>{fmtTRY(net)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>KDV Tutarı:</span>
                    <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>{fmtTRY(kdv)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Açıklama:</span>
                    <span className="text-slate-700" style={{ color: "#334155" }}>Sözleşme: {szNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Kategori:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100" style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                      {kategori}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Brüt Tutar:</span>
                    <span className="font-bold text-slate-900 text-sm" style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>{fmtTRY(brut)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Taksit:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100" style={{ background: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                      {taksitSayisi} Taksit
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Dönem:</span>
                    <span className="text-slate-700" style={{ color: "#334155" }}>{donem}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>İşlem Tarihi:</span>
                    <span className="text-slate-700" style={{ color: "#334155" }}>{tarih}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Vade Tarihi:</span>
                    <span className="text-slate-700" style={{ color: "#334155" }}>{vadeTarihi}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Sözleşme:</span>
                    <span className="font-medium text-blue-600 hover:underline cursor-pointer" style={{ color: "#2563eb", fontWeight: 500 }}>{szNo}</span>
                  </div>
                </div>
              </div>

              {/* 2. SÖZLEŞME BİLGİLERİ CARD */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "14px", fontWeight: 600 }}>
                  <FileText size={16} className="text-indigo-500" />
                  <span>SÖZLEŞME BİLGİLERİ</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-xs" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px 20px", fontSize: "13px" }}>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Sözleşme No:</span>
                    <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>{szNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Sözleşme Tarihi:</span>
                    <span className="text-slate-700" style={{ color: "#334155" }}>{sozlesmeTarihi}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Sınıf:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100" style={{ background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                      {stClass}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Öğrenci:</span>
                    <span className="font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>{stName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Yönlendiren:</span>
                    <span className="text-slate-500" style={{ color: "#64748b" }}>-</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Referans:</span>
                    <span className="text-slate-500" style={{ color: "#64748b" }}>-</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Tutar:</span>
                    <span className="font-bold text-slate-900" style={{ fontWeight: 700, color: "#0f172a" }}>{fmtTRY(brut)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Durum:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200" style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                      İmza Bekliyor
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. ÜRÜN / HİZMET KALEMLERİ */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "12px", fontWeight: 600 }}>
                  <FileSpreadsheet size={16} className="text-emerald-500" />
                  <span>Ürün/Hizmet Kalemleri</span>
                </div>

                <div className="overflow-x-auto" style={{ overflowX: "auto" }}>
                  <table className="w-full text-left text-xs border-collapse" style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium" style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th className="py-2.5 px-3">ÜRÜN/HİZMET</th>
                        <th className="py-2.5 px-3 text-center">MİKTAR</th>
                        <th className="py-2.5 px-3 text-right">BİRİM FİYAT</th>
                        <th className="py-2.5 px-3 text-right">NET TUTAR</th>
                        <th className="py-2.5 px-3 text-right">KDV</th>
                        <th className="py-2.5 px-3 text-right">TOPLAM</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td className="py-3 px-3 font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>EĞİTİM ÜCRETİ</td>
                        <td className="py-3 px-3 text-center text-slate-600">1</td>
                        <td className="py-3 px-3 text-right text-slate-700">{fmtTRY(net)}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{fmtTRY(net)}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{fmtTRY(kdv)} (%10)</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900" style={{ fontWeight: 700, color: "#0f172a" }}>{fmtTRY(brut)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="text-xs font-semibold text-slate-800 bg-slate-50/60" style={{ fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}>
                        <td colSpan={3} className="py-2.5 px-3 text-right">Toplam:</td>
                        <td className="py-2.5 px-3 text-right">{fmtTRY(net)}</td>
                        <td className="py-2.5 px-3 text-right">{fmtTRY(kdv)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-700">{fmtTRY(brut)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 4. TAKSİT PLANI TABLOSU */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                    <Calendar size={16} className="text-blue-500" />
                    <span>Taksit Planı</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs" style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                    <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1" style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Settings size={13} /> Tutarları Düzenle
                    </button>
                    <button onClick={handleCopyLink} className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1" style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <LinkIcon size={13} /> {copiedLink ? "Link Kopyalandı!" : "Tümü İçin Ödeme Linki"}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto" style={{ overflowX: "auto" }}>
                  <table className="w-full text-left text-xs border-collapse" style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium" style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th className="py-2.5 px-2 w-6 text-center">
                          <input type="checkbox" className="rounded text-blue-600" />
                        </th>
                        <th className="py-2.5 px-3">TAKSİT</th>
                        <th className="py-2.5 px-3">VADE TARİHİ</th>
                        <th className="py-2.5 px-3 text-right">TUTAR</th>
                        <th className="py-2.5 px-3 text-right">TAHSİLAT</th>
                        <th className="py-2.5 px-3">TAHSİLAT TARİHİ</th>
                        <th className="py-2.5 px-3 text-right">KALAN</th>
                        <th className="py-2.5 px-3 text-center">DURUM</th>
                        <th className="py-2.5 px-3 text-center">İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taksitler.map((t, idx) => {
                        const isPaid = (t.kalanTutar === 0 || t.durum === 2 || t.durumText === "Tam Ödendi");
                        const isPartial = !isPaid && (t.tahsilEdilen > 0);
                        const isOverdue = !isPaid && (new Date(t.vadeTarihi) < new Date());

                        return (
                          <tr 
                            key={t.id || idx} 
                            className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                            style={{ borderBottom: "1px solid #f1f5f9" }}
                          >
                            <td className="py-2.5 px-2 text-center">
                              <input type="checkbox" className="rounded text-blue-600" defaultChecked={isPaid} />
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800" style={{ fontWeight: 500, color: "#1e293b" }}>
                              {t.taksitNo}. Taksit
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {fmtDate(t.vadeTarihi)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800" style={{ fontWeight: 600, color: "#1e293b" }}>
                              {fmtTRY(t.taksitTutari)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-700" style={{ color: "#047857" }}>
                              {fmtTRY(t.tahsilEdilen || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-600">
                              {t.sonTahsilatTarihi ? (
                                <div>
                                  <span>{fmtDate(t.sonTahsilatTarihi)}</span>
                                  {idx === 0 && <span className="ml-1 text-[10px] text-emerald-600 font-medium block">29 gün erken</span>}
                                </div>
                              ) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800" style={{ fontWeight: 600, color: isPaid ? "#64748b" : "#0f172a" }}>
                              {fmtTRY(t.kalanTutar !== undefined ? t.kalanTutar : (t.taksitTutari - (t.tahsilEdilen || 0)))}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPaid ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800" style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px" }}>
                                  Ödendi
                                </span>
                              ) : isPartial ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800" style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px" }}>
                                  Kısmi
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800" style={{ background: "#ffe4e6", color: "#9f1239", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px" }}>
                                  Gecikti
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600" style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px" }}>
                                  Vadesi Gelmedi
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px" }}>
                                {!isPaid && (
                                  <button
                                    onClick={() => handleOpenReceipt(t)}
                                    title="Hızlı Tahsilat Yap"
                                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: "4px", padding: "3px 6px", cursor: "pointer" }}
                                  >
                                    <Plus size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenReceipt(t)}
                                  title="Makbuz & Yazdır"
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "3px" }}
                                >
                                  <Printer size={13} />
                                </button>
                                <button
                                  title="Kilitli Kayıt"
                                  className="p-1 rounded text-slate-300"
                                  style={{ border: "none", background: "transparent", color: "#cbd5e1", padding: "3px" }}
                                >
                                  <Lock size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: MÜŞTERİ/ALICI, FİNANSAL İLERLEME, HIZLI İŞLEMLER, ÖDEME EKRANI, NOTLAR (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6" style={{ gridColumn: "span 4 / span 4", display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* 1. MÜŞTERİ / ALICI KARTI */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px" }}>
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                    <User size={16} className="text-blue-600" />
                    <span>Müşteri / Alıcı</span>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline font-medium" style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "11px" }}>
                    Cari Hesap
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="font-bold text-slate-900 text-base" style={{ fontWeight: 700, color: "#0f172a", fontSize: "15px" }}>{stName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600" style={{ background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>
                      Öğrenci
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2 mt-1" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
                    <FileText size={13} className="text-slate-400" />
                    <span>TC / No: {stTc}</span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between gap-2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                    <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={13} className="text-slate-400" />
                      <span>{stPhone}</span>
                    </div>
                    <button
                      onClick={handleSendWhatsAppReminder}
                      title="WhatsApp'tan Ulaş"
                      className="text-emerald-600 hover:text-emerald-700 p-1"
                      style={{ border: "none", background: "transparent", color: "#059669", cursor: "pointer" }}
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
                    <Mail size={13} className="text-slate-400" />
                    <span>{stEmail}</span>
                  </div>
                </div>
              </div>

              {/* 2. FİNANSAL İLERLEME / PROGRESS CARD */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center justify-between mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded" style={{ fontSize: "11px", fontWeight: 700, color: "#e11d48", background: "#ffe4e6", padding: "2px 6px", borderRadius: "4px" }}>
                    Kalan Tahsil Edilecek
                  </span>
                  <span className="text-lg font-bold text-rose-600" style={{ fontSize: "18px", fontWeight: 800, color: "#e11d48" }}>
                    {fmtTRY(remaining)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden my-3 relative" style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "9999px", margin: "10px 0" }}>
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: "#f59e0b", height: "100%", borderRadius: "9999px" }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 mb-2" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                  <span>{fmtTRY(collected)} / {fmtTRY(brut)}</span>
                  <span className="font-semibold text-slate-800">%{progressPct}</span>
                </div>

                {nextPending && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span className="text-slate-500">Sonraki: {fmtDate(nextPending.vadeTarihi)}</span>
                    <span className="font-bold text-slate-800">{fmtTRY(nextPending.taksitTutari)}</span>
                  </div>
                )}
              </div>

              {/* 3. HIZLI İŞLEMLER */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                  <Zap size={16} className="text-amber-500" />
                  <span>Hızlı İşlemler</span>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenReceipt(taksitler[0] || { taksitNo: 1, taksitTutari: 5500 })}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Plus size={14} className="text-blue-600" /> Tahsilat Ekle
                  </button>

                  <button
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <History size={14} className="text-indigo-600" /> Tahsilat Geçmişi
                  </button>

                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-xs" style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "10px", borderRadius: "8px" }}>
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-0.5" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#78350f" }}>
                      <FileCheck size={13} className="text-amber-600" /> E-Fatura
                    </div>
                    <p className="text-[11px] text-amber-700 m-0" style={{ fontSize: "11px", color: "#b45309", margin: 0 }}>
                      Aktif e-fatura hesabı bulunamadı. <span className="underline cursor-pointer">Hesap ekleyin</span>
                    </p>
                  </div>

                  <button
                    onClick={handleSendWhatsAppReminder}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <AlertTriangle size={14} className="text-amber-500" /> Hatırlatma Gönder (WhatsApp)
                  </button>
                </div>
              </div>

              {/* 4. ÖDEME EKRANI (ÖDEME LİNKİ OLUŞTURUCU) */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 font-semibold text-slate-800 text-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                  <CreditCard size={16} className="text-blue-500" />
                  <span>Ödeme Ekranı</span>
                </div>

                <p className="text-xs text-slate-500 mb-3" style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  Müşteriye özel ödeme bağlantısı oluşturarak kredi kartı ile ödeme yapmasını sağlayın.
                </p>

                <div className="space-y-3" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1" style={{ fontSize: "11px", fontWeight: 500, color: "#475569", display: "block" }}>
                      Gönderim Kanalı
                    </label>
                    <select
                      value={deliveryChannel}
                      onChange={(e) => setDeliveryChannel(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
                      style={{ width: "100%", padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="email">E-posta</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1" style={{ fontSize: "11px", fontWeight: 500, color: "#475569", display: "block" }}>
                      {deliveryChannel === "email" ? "E-posta Adresi" : "Telefon Numarası"}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={deliveryChannel === "email" ? stEmail : stPhone}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                      style={{ width: "100%", padding: "6px 10px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}
                    />
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                  >
                    <Send size={13} /> {copiedLink ? "Link Kopyalandı!" : "Oluştur ve Gönder"}
                  </button>

                  <div className="text-center">
                    <button
                      onClick={handleCopyLink}
                      className="text-xs text-blue-600 hover:underline font-medium"
                      style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "11px" }}
                    >
                      🔗 Sadece Link Oluştur
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. GELİR NOTLARI & AKTİVİTE GEÇMİŞİ */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}
              >
                <div className="flex items-center gap-4 pb-2 mb-3 border-b border-slate-100 text-xs font-semibold" style={{ display: "flex", gap: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600 }}>
                  <button
                    onClick={() => setActiveTabNotes("notes")}
                    className={`pb-1 ${activeTabNotes === "notes" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                    style={{ background: "none", border: "none", borderBottom: activeTabNotes === "notes" ? "2px solid #2563eb" : "none", color: activeTabNotes === "notes" ? "#2563eb" : "#94a3b8", cursor: "pointer" }}
                  >
                    Gelir Notları
                  </button>
                  <button
                    onClick={() => setActiveTabNotes("activity")}
                    className={`pb-1 ${activeTabNotes === "activity" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                    style={{ background: "none", border: "none", borderBottom: activeTabNotes === "activity" ? "2px solid #2563eb" : "none", color: activeTabNotes === "activity" ? "#2563eb" : "#94a3b8", cursor: "pointer" }}
                  >
                    Aktivite Geçmişi
                  </button>
                </div>

                {activeTabNotes === "notes" ? (
                  <div>
                    <form onSubmit={handleAddNote} className="flex gap-1.5 mb-3" style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                      <input
                        type="text"
                        placeholder="Not ekleyin..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800"
                        style={{ flex: 1, padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                      />
                      <button
                        type="submit"
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        style={{ border: "none", background: "#2563eb", color: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}
                      >
                        <Plus size={15} />
                      </button>
                    </form>

                    {notesList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-2" style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>
                        Henüz not eklenmemiş
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                        {notesList.map((n) => (
                          <div key={n.id} className="p-2 rounded bg-slate-50 border border-slate-100 text-xs" style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: "8px", borderRadius: "6px" }}>
                            <p className="text-slate-800 mb-1" style={{ color: "#1e293b", margin: "0 0 4px 0" }}>{n.text}</p>
                            <span className="text-[10px] text-slate-400">{n.date} - {n.author}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-slate-500 max-h-40 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "#64748b" }}>
                    <div className="flex items-start gap-2">
                      <Clock size={12} className="mt-0.5 text-blue-500" />
                      <span>{tarih} - Sözleşme ve gelir kaydı oluşturuldu ({szNo})</span>
                    </div>
                    {taksitler[0]?.sonTahsilatTarihi && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="mt-0.5 text-emerald-500" />
                        <span>01.10.2026 - 1. Taksit ({fmtTRY(taksitler[0]?.tahsilEdilen)}) tahsil edildi</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* TAHSİLAT MAKBUZU MODAL */}
      {receiptPayment && (
        <ReceiptModal
          isOpen={true}
          onClose={() => setReceiptPayment(null)}
          payment={receiptPayment}
        />
      )}
    </>
  );
}

export default GelirDetayModal;
