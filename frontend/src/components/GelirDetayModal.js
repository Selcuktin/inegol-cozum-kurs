import {usePrintTarget} from "../hooks/usePrintTarget";
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
import AccountingService from "../lib/edesisAccountingService";
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
  onRecordPayment,
  onOpenProfile
}) {
  const printRef=usePrintTarget();
  const [activeTabNotes, setActiveTabNotes] = useState("notes"); // 'notes' | 'activity'
  const [newNote, setNewNote] = useState("");
  const [notesList, setNotesList] = useState('');
  const [savingNote,setSavingNote]=useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState("email"); // 'email' | 'sms' | 'whatsapp'
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quickPayInst, setQuickPayInst] = useState(null);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [customCategory, setCustomCategory] = useState(null);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);

  // Hızlı Tahsilat Ekle (Kısmi Ödeme) ve Tahsilat Geçmişi State'leri
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [accountingVersion,setAccountingVersion]=useState(0);
  React.useEffect(()=>{
    const refresh=()=>setAccountingVersion(v=>v+1);
    window.addEventListener('cozum_snapshot_updated',refresh);window.addEventListener('cozum_accounting_updated',refresh);
    return()=>{window.removeEventListener('cozum_snapshot_updated',refresh);window.removeEventListener('cozum_accounting_updated',refresh);};
  },[]);
  const paymentId=React.useRef();
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Banka Transferi");
  const [payBank, setPayBank] = useState("T.C. VAKIFLAR BANKASI İNEGÖL ŞB.");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");

  // 1. İlgili Gelir / Sözleşme ve Taksit Verilerini Bul
  const accountingInfo = useMemo(() => {
    if (!isOpen) return null;

    const allGelirler = AccountingService.getIncomes() || [];
    const allSozlesmeler = AccountingService.getContracts() || [];
    const allTaksitler = AccountingService.getInstallments() || [];
    const allTahsilatlar = AccountingService.getCollections() || [];

    void accountingVersion;
    let targetGelir;
    if(gelirKodu)targetGelir=allGelirler.find(g=>g.gelirKodu===gelirKodu);
    else if(sozlesmeNo||student?.sozlesme_no)targetGelir=allGelirler.find(g=>g.sozlesmeNo===(sozlesmeNo||student.sozlesme_no));
    else if(student?.id){const matches=allGelirler.filter(g=>g.student_id===student.id||g.ogrenciId===student.id);if(matches.length===1)targetGelir=matches[0];}
    if(!targetGelir)return null;
    const targetSozlesme=allSozlesmeler.find(s=>s.id===targetGelir.contract_id||s.sozlesmeNo===targetGelir.sozlesmeNo);
    const taksitler=allTaksitler.filter(t=>t.income_id===targetGelir.id||(targetSozlesme?.id&&t.contractId===targetSozlesme.id)||(targetGelir.sozlesmeNo&&t.sozlesmeNo===targetGelir.sozlesmeNo)).sort((a,b)=>a.taksitNo-b.taksitNo);

    // Temel alanları toparla
    const gCode = targetGelir.gelirKodu || "";
    const szNo = targetSozlesme?.sozlesmeNo || targetGelir?.sozlesmeNo || "";
    const stName = targetGelir?.ogrenciAdiSoyadi || targetGelir?.musteriUnvan || student?.student_name || "Öğrenci";
    const stPhone = taksitler[0]?.musteriTelefon || student?.student_phone || student?.parent_phone || "";
    const stEmail = taksitler[0]?.musteriEmail || student?.parent_email || "";
    const stClass = targetGelir?.sinifAdi || targetSozlesme?.sinifAdi || student?.student_class || student?.program || "";
    const stTc = student?.student_tc || taksitler[0]?.musteriId || "";

    const brut = Number(targetGelir.brutTutar ?? 0);
    const net = Number(targetGelir.netTutar ?? 0);
    const kdv = Number(targetGelir.kdvTutari ?? 0);
    const collected = Number(targetGelir.toplamTahsilat ?? 0);
    const remaining = Number(targetGelir.kalanAlacak ?? Math.max(0,brut-collected));
    const progressPct = brut > 0 ? Math.min(100, Math.round((collected / brut) * 100)) : 0;

    // Tahsilat Geçmişini Çek
    const relatedTahsilatlar=allTahsilatlar.filter(p=>(targetSozlesme?.id&&p.contract_id===targetSozlesme.id)||(szNo&&p.sozlesmeNo===szNo)||(gCode&&p.gelirKodu===gCode));

    // Sonraki vadesi gelen taksit
    const nextPending = taksitler.find(t => (t.kalanTutar || t.taksitTutari - (t.tahsilEdilen || 0)) > 0);

    return {
      targetGelir,
      targetSozlesme,
      taksitler,
      relatedTahsilatlar,
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
      tarih: fmtDate(targetGelir?.gelirTarihi),
      vadeTarihi: fmtDate(targetGelir?.vadeTarihi),
      sozlesmeTarihi: fmtDate(targetSozlesme?.sozlesmeTarihi),
      taksitSayisi: taksitler.length
    };
  }, [isOpen, gelirKodu, sozlesmeNo, student,accountingVersion]);

  React.useEffect(()=>setNotesList(accountingInfo?.targetGelir?.notes || ''),[isOpen,accountingInfo?.targetGelir?.id,accountingInfo?.targetGelir?.notes]);
  React.useEffect(()=>setNewNote(''),[isOpen,accountingInfo?.targetGelir?.id]);

  if(!isOpen)return null;
  if(!accountingInfo)return <div className="modal-backdrop"><div className="modal" role="alert">Gelir kaydı bulunamadı. Güncel listeden sözleşmeyi yeniden açın.<button onClick={onClose}>Kapat</button></div></div>;

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
    taksitler,
    targetSozlesme
  } = accountingInfo;

  const effectiveCollected=collected;
  const effectiveRemaining=remaining;
  const effectiveProgressPct=progressPct;
  const displayTaksitler=taksitler;
  const displayNextPending=nextPending;
  const allHistory=accountingInfo.relatedTahsilatlar;

  const handlePrint = () => {
    window.print();
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || savingNote) return;
    setSavingNote(true);
    try {
      setNotesList(await AccountingService.addNote('student-incomes',accountingInfo.targetGelir?.id || gCode,newNote));
      setNewNote('');
    } catch(error){window.alert(error.message || 'Not kaydedilemedi');}
    finally{setSavingNote(false);}
  };

  const handleCopyLink = () => {
    const paymentLink = `https://inegolcozum.edesis.com/pay/${encodeURIComponent(gCode || "GLR")}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(paymentLink);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Hızlı Tahsilat Ekle Modalını Aç (Kısmi veya Tam Ödeme)
  const handleOpenAddPayment = (prefillTaksit = null) => {
    paymentId.current="pay_"+crypto.randomUUID();
    const defaultAmt = prefillTaksit
      ? (prefillTaksit.kalanTutar || prefillTaksit.taksitTutari)
      : (displayNextPending ? (displayNextPending.kalanTutar || displayNextPending.taksitTutari) : effectiveRemaining);
    setPayAmount(defaultAmt ? String(defaultAmt) : "");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod("Banka Transferi");
    setPayBank("T.C. VAKIFLAR BANKASI İNEGÖL ŞB.");
    const instNo = prefillTaksit?.taksitNo || displayNextPending?.taksitNo || 1;
    setPayNote(`${szNo} nolu sözleşme ${instNo}. taksit tahsilatı`);
    setShowAddPaymentModal(true);
  };

  // Tahsilatı Kaydet ve İsteğe Göre Makbuzu Aç
  const handleSaveAddPayment = async (andPrintReceipt = false) => {
try {

    const numAmt = Number(payAmount);
    if (!numAmt || numAmt <= 0) {
      alert("Lütfen geçerli bir tahsilat tutarı giriniz.");
      return;
    }
    const newPay = {
      id: paymentId.current,
      odemeKodu: `ODM2026${Date.now().toString().slice(-7)}`,
      student_id: student?.id || `stu-${gCode}`,
      student_name: stName,
      student_class: stClass,
      parent_name: targetSozlesme?.veliAdi || student?.parent_name || stName,
      parent_phone: stPhone,
      amount: numAmt,
      tahsilatTutari: numAmt,
      method: payMethod,
      bank: payBank,
      kasaBankaAdi: payBank,
      payment_date: payDate,
      tahsilatTarihi: `${payDate}T${new Date().toTimeString().slice(0, 8)}`,
      note: payNote || `${szNo} nolu sözleşme tahsilatı`,
      aciklama: payNote || `${szNo} nolu sözleşme tahsilatı`,
      taksitNo: displayNextPending?.taksitNo || 1,
      durumText: "Aktif",
      created_at: new Date().toISOString()
    };

    const savedPay = await AccountingService.recordCollection({
      id: newPay.id,
      studentId: student?.id || targetSozlesme?.ogrenciId,
      contractId: targetSozlesme?.id,
      installment_id: displayNextPending?.id,
      installment_no: displayNextPending?.taksitNo,
      date: payDate,
      gelirKodu: gCode,
      sozlesmeNo: szNo,
      amount: numAmt,
      bank: payBank,
      method: payMethod,
      note: payNote || `${szNo} nolu sözleşme tahsilatı`,
      studentName: stName
    });

    if (onRecordPayment) onRecordPayment(savedPay);
    setShowAddPaymentModal(false);

    if (andPrintReceipt) {
      setReceiptPayment({...newPay,...savedPay});
    }

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  // Makbuz yalnızca kayıtlı tahsilattan açılır.
  const handleOpenReceipt = (item) => {
    if(!item.id)return;
    const amt = item.tahsilatTutari ?? item.amount ?? 0;
    const pDate = item.tahsilatTarihi ? item.tahsilatTarihi.slice(0, 10) : item.payment_date;
    setReceiptPayment({
      id: item.id,
      receipt_no: item.odemeKodu,
      contract_id: item.contract_id,
      sozlesme_no: item.sozlesmeNo,
      is_cancelled: item.is_cancelled,
      status: item.status,
      student_id: item.student_id || student?.id,
      student_name: stName,
      student_class: stClass,
      parent_name: targetSozlesme?.veliAdi || student?.parent_name || stName,
      parent_phone: stPhone,
      amount: amt,
      method: item.method || item.odemeYontemiText || "Belirtilmedi",
      bank: item.kasaBankaAdi || item.bank || "",
      payment_date: pDate,
      note: item.aciklama || item.note || `${szNo} nolu sözleşme ${item.taksitNo ? item.taksitNo + '. taksit ' : ''}tahsilatı`,
      created_at: new Date().toISOString()
    });
  };

  const handleSendWhatsAppReminder = () => {
    const cleanPhone = (stPhone || "").replace(/\D/g, "");
    const targetPhone = cleanPhone.startsWith("90") ? cleanPhone : (cleanPhone.startsWith("0") ? "9" + cleanPhone : "90" + cleanPhone);
    const msg = encodeURIComponent(
      `Sayın Velimiz,\n${stName} isimli öğrencimizin Özel İnegöl Çözüm Kurs Merkezi ${szNo} nolu sözleşmesine ait kalan borç tutarı ${fmtTRY(effectiveRemaining)}'dir.\nBir sonraki taksit vadesi: ${displayNextPending ? fmtDate(displayNextPending.vadeTarihi) : vadeTarihi}.\nBilgilerinize sunarız.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${msg}`, "_blank");
  };

  return (
    <>
      <div
        ref={printRef} className="responsive-modal-backdrop fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gelir-detay-title"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100100, backgroundColor: "rgba(15, 23, 42, 0.75)" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
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
                <span className="font-semibold text-slate-700" style={{ color: "#334155", fontWeight: 600 }}>Sözleşme & Gelir Detay</span>
              </div>
              <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 id="gelir-detay-title" className="text-xl font-bold text-slate-900 m-0" style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Sözleşme & Gelir Detay <span className="text-slate-400 font-normal ml-1" style={{ color: "#94a3b8", fontWeight: 400 }}>{gCode} · {szNo}</span>
                </h1>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={15} aria-hidden="true" /> Geri
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowClassificationModal(true); }}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Gelir muhasebe kategorisini ve faturadaki sınıflandırmayı değiştir"
              >
                <Settings size={15} aria-hidden="true" /> Sınıflandırmayı Düzelt
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowPaymentPlanModal(true); }}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Taksit vadeleri ve tahsilat takvimini görüntüle"
              >
                <Calendar size={15} aria-hidden="true" /> Ödeme Planı
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-colors"
                style={{ padding: "6px 14px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={15} aria-hidden="true" /> Yazdır
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label="Pencereyi kapat"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 ml-1"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} aria-hidden="true" />
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
                    <span className="text-slate-700" style={{ color: "#334155" }}>{accountingInfo.targetGelir?.aciklama || `Sözleşme: ${szNo}`}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5" style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Kategori:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100" style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                      {customCategory || kategori}
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
                    <button
                      type="button"
                      onClick={(e) => {e.stopPropagation();window.location.hash=`documents?id=${encodeURIComponent(szNo)}`;onClose();}}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Settings size={13} /> Sözleşmede Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
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
                      {displayTaksitler.map((t, idx) => {
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
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenAddPayment(t); }}
                                    title="Hızlı Tahsilat Yap (Kısmi Ödeme & Makbuz)"
                                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: "4px", padding: "3px 6px", cursor: "pointer" }}
                                  >
                                    <Plus size={13} />
                                  </button>
                                )}
                                {allHistory.filter(p=>!p.is_cancelled && ((t.id && p.installment_id===t.id) || Number(p.taksitNo ?? p.installment_no)===Number(t.taksitNo))).map(p=><button
                                  key={p.id}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenReceipt(p); }}
                                  title="Kayıtlı tahsilat makbuzu"
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "3px" }}
                                >
                                  <Printer size={13} /> {fmtTRY(p.tahsilatTutari ?? p.amount)}
                                </button>)}
                                <button
                                  type="button"
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
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:underline font-medium"
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "11px" }}
                  >
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
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSendWhatsAppReminder(); }}
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
                    {fmtTRY(effectiveRemaining)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden my-3 relative" style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "9999px", margin: "10px 0" }}>
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${effectiveProgressPct}%`, background: "#f59e0b", height: "100%", borderRadius: "9999px" }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 mb-2" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                  <span>{fmtTRY(effectiveCollected)} / {fmtTRY(brut)}</span>
                  <span className="font-semibold text-slate-800">%{effectiveProgressPct}</span>
                </div>

                {displayNextPending && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span className="text-slate-500">Sonraki: {fmtDate(displayNextPending.vadeTarihi)}</span>
                    <span className="font-bold text-slate-800">{fmtTRY(displayNextPending.kalanTutar || displayNextPending.taksitTutari)}</span>
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
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpenAddPayment(); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Plus size={14} className="text-blue-600" /> Tahsilat Ekle (Kısmi Ödeme)
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5 transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <History size={14} className="text-indigo-600" /> Tahsilat Geçmişi ({allHistory.length})
                  </button>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-xs"
                    style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "10px", borderRadius: "8px" }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-0.5" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#78350f" }}>
                      <FileCheck size={13} className="text-amber-600" /> E-Fatura
                    </div>
                    <p className="text-[11px] text-amber-700 m-0" style={{ fontSize: "11px", color: "#b45309", margin: 0 }}>
                      Aktif e-fatura hesabı bulunamadı. <span className="underline cursor-pointer" onClick={(e) => { e.stopPropagation(); alert("E-Fatura entegrasyonu için GİB API yapılandırması gereklidir."); }}>Hesap ekleyin</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSendWhatsAppReminder(); }}
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
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    style={{ width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: 600, background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                  >
                    <Send size={13} /> {copiedLink ? "Link Kopyalandı!" : "Oluştur ve Gönder"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
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
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTabNotes("notes"); }}
                    className={`pb-1 ${activeTabNotes === "notes" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                    style={{ background: "none", border: "none", borderBottom: activeTabNotes === "notes" ? "2px solid #2563eb" : "none", color: activeTabNotes === "notes" ? "#2563eb" : "#94a3b8", cursor: "pointer" }}
                  >
                    Gelir Notları
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTabNotes("activity"); }}
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
                        maxLength={2000}
                        disabled={savingNote || !accountingInfo.targetGelir?.id}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800"
                        style={{ flex: 1, padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !newNote.trim() || !accountingInfo.targetGelir?.id}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        style={{ border: "none", background: "#2563eb", color: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}
                      >
                        <Plus size={15} />
                      </button>
                    </form>

                    {!notesList ? (
                      <p className="text-xs text-slate-400 italic text-center py-2" style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>
                        Henüz not eklenmemiş
                      </p>
                    ) : (
                      <div style={{whiteSpace:'pre-wrap',background:'#f8fafc',padding:8,borderRadius:6,fontSize:12,maxHeight:150,overflowY:'auto'}}>{notesList}</div>
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
          student={{
            id: student?.id || `stu-${gCode}`,
            student_name: stName,
            student_class: stClass,
            student_tc: stTc,
            student_phone: stPhone,
            parent_name: targetSozlesme?.veliAdi || student?.parent_name || stName,
            parent_phone: stPhone,
            total_fee: brut,
            paid_amount: effectiveCollected
          }}
        />
      )}

      {/* SINIFLANDIRMAYI DÜZELT (GELİR KATEGORİSİ) MODALI */}
      {showClassificationModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100200,
            padding: "16px"
          }}
          onClick={() => setShowClassificationModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "12px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Gelir Sınıflandırmasını Düzelt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClassificationModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", lineHeight: "1.5" }}>
              Bu işlem faturanın ve muhasebe kaydının gelir türünü (Eğitim, Yayın, Yemek vb.) düzenler ve muhasebe gelir raporlarındaki sınıflandırmayı günceller.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {[
                { name: "Eğitim Ücreti", desc: "Öğrenci dönem kurs veya eğitim öğretim bedeli" },
                { name: "Yayın ve Kitap Bedeli", desc: "Deneme sınavları, soru bankası ve ders fasikülleri" },
                { name: "Yemek Hizmeti", desc: "Öğle yemeği ve ikindi beslenme bedeli" },
                { name: "Servis ve Ulaşım Bedeli", desc: "Öğrenci servis taşımacılık hizmeti" },
                { name: "Etüt ve Birebir Ders", desc: "Özel ders ve takviye etüt programı" },
                { name: "Kayıt Yenileme Bedeli", desc: "Sonraki dönem erken kayıt sözleşmesi" }
              ].map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => {
                    setCustomCategory(cat.name);
                    setShowClassificationModal(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: (customCategory || kategori) === cat.name ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    background: (customCategory || kategori) === cat.name ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: (customCategory || kategori) === cat.name ? "#1d4ed8" : "#1e293b" }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{cat.desc}</div>
                  </div>
                  {(customCategory || kategori) === cat.name && (
                    <CheckCircle2 size={16} color="#2563eb" />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowClassificationModal(false)}
                style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÖDEME PLANI ÇIKTISI MODALI */}
      {showPaymentPlanModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100200,
            padding: "16px"
          }}
          onClick={() => setShowPaymentPlanModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "12px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Calendar size={20} color="#2563eb" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Resmî Ödeme Planı · {stName}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{szNo} · {gCode}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentPlanModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", marginBottom: "16px" }}>
              <span>Toplam: <b>{fmtTRY(brut)}</b></span>
              <span>Tahsil Edilen: <b style={{ color: "#16a34a" }}>{fmtTRY(effectiveCollected)}</b></span>
              <span>Kalan Bakiye: <b style={{ color: "#b45309" }}>{fmtTRY(effectiveRemaining)}</b></span>
              <span>Taksit Adedi: <b>{displayTaksitler.length}</b></span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#475569", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Taksit No</th>
                  <th style={{ padding: "8px 10px" }}>Vade Tarihi</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Tutar</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Tahsil Edilen</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Kalan</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {displayTaksitler.map((t) => (
                  <tr key={t.id || t.taksitNo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{t.taksitNo}. Taksit</td>
                    <td style={{ padding: "8px 10px" }}>{fmtDate(t.vadeTarihi)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtTRY(t.taksitTutari)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#16a34a" }}>{fmtTRY(t.tahsilEdilen || 0)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtTRY(t.kalanTutar !== undefined ? t.kalanTutar : (t.taksitTutari - (t.tahsilEdilen || 0)))}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 600,
                          background: t.durum === 1 ? "#dcfce7" : "#fef9c3",
                          color: t.durum === 1 ? "#15803d" : "#854d0e"
                        }}
                      >
                        {t.durum === 1 ? "Ödendi" : "Bekliyor"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={15} /> Yazdır
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentPlanModal(false)}
                style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIZLI TAHSİLAT GİRİŞİ & KISMİ ÖDEME MODALI */}
      {showAddPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100200,
            padding: "16px"
          }}
          onClick={() => setShowAddPaymentModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Tahsilat Ekle & Makbuz Düzenle
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {stName} · {szNo}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Finansal Durum Şeridi */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Toplam Ücret</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{fmtTRY(brut)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase", fontWeight: 600 }}>Tahsil Edilen</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#16a34a" }}>{fmtTRY(effectiveCollected)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#b45309", textTransform: "uppercase", fontWeight: 600 }}>Kalan Bakiye</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#e11d48" }}>{fmtTRY(effectiveRemaining)}</div>
                </div>
              </div>

              {/* Tutar Girişi (Büyük, Doğrudan Para Girme Alanı) */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Tahsil Edilecek Tutar (TL) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: "14px", fontSize: "18px", fontWeight: 700, color: "#2563eb" }}>₺</span>
                  <input
                    type="number"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 32px",
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#1e3a8a",
                      border: "2px solid #3b82f6",
                      borderRadius: "8px",
                      outline: "none",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)"
                    }}
                  />
                </div>

                {/* Hızlı Tutar Seçim Hapları (Kısmi Ödeme Seçenekleri) */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                  {displayNextPending && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(displayNextPending.kalanTutar || displayNextPending.taksitTutari))}
                      style={{ padding: "4px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {displayNextPending.taksitNo}. Taksit: {fmtTRY(displayNextPending.kalanTutar || displayNextPending.taksitTutari)}
                    </button>
                  )}
                  {effectiveRemaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(effectiveRemaining))}
                      style={{ padding: "4px 8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Kalanın Tümü: {fmtTRY(effectiveRemaining)}
                    </button>
                  )}
                  {effectiveRemaining > 2000 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round(effectiveRemaining / 2)))}
                      style={{ padding: "4px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Yarısı (%50)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPayAmount("5000")}
                    style={{ padding: "4px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                  >
                    ₺5.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayAmount("10000")}
                    style={{ padding: "4px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                  >
                    ₺10.000
                  </button>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "5px" }}>
                  💡 Kısmi ödeme yapabilirsiniz; girilen tutar sıradaki taksitlerden düşülecek ve makbuza işlenecektir.
                </div>
              </div>

              {/* Kasa / Banka Hesabı Seçimi */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Giriş Yapılacak Kasa / Banka Hesabı
                </label>
                <select
                  value={payBank}
                  onChange={(e) => setPayBank(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                >
                  <option value="T.C. VAKIFLAR BANKASI İNEGÖL ŞB.">T.C. VAKIFLAR BANKASI İNEGÖL ŞB. (TR04...)</option>
                  <option value="T.C. HALKBANK İNEGÖL ŞB.">T.C. HALKBANK İNEGÖL ŞB. (TR87...)</option>
                  <option value="NEVİN ÇAKMAK BİREYSEL">NEVİN ÇAKMAK BİREYSEL (Nakit / EFT)</option>
                  <option value="Nakit Ana Kasa">Nakit Ana Kasa</option>
                  <option value="POS / Kredi Kartı Kasası">POS / Kredi Kartı Kasası</option>
                  <option value="Senet / Portföy">Senet / Portföy</option>
                </select>
              </div>

              {/* Ödeme Türü & Tarih */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Ödeme Yöntemi
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                  >
                    <option value="Banka Transferi">Banka Transferi / EFT</option>
                    <option value="Nakit">Nakit (Elden)</option>
                    <option value="POS / Kredi Kartı">POS / Kredi Kartı</option>
                    <option value="Senet">Senet / Bono</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Tahsilat Tarihi
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                  />
                </div>
              </div>

              {/* Açıklama / Makbuz Notu */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Açıklama / Makbuz Notu
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Açıklama..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                />
              </div>

              {/* Aksiyon Butonları */}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAddPayment(false)}
                  style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "#334155", cursor: "pointer" }}
                >
                  Sadece Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAddPayment(true)}
                  style={{ padding: "8px 18px", background: "#2563eb", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Printer size={15} /> Kaydet & Makbuz Bas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAHSİLAT GEÇMİŞİ & MAKBUZ ARŞİVİ MODALI */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100200,
            padding: "16px"
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "780px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Tahsilat Geçmişi & Makbuz Arşivi
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {stName} · {szNo} ({gCode})
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => { setShowHistoryModal(false); handleOpenAddPayment(); }}
                  style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Plus size={13} /> + Yeni Tahsilat Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Özet Kartları */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Sözleşme Tutarı</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{fmtTRY(brut)}</div>
                </div>
                <div style={{ background: "#f0fdf4", padding: "10px 12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "10.5px", color: "#166534", textTransform: "uppercase", fontWeight: 600 }}>Toplam Tahsilat</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#16a34a" }}>{fmtTRY(effectiveCollected)}</div>
                </div>
                <div style={{ background: "#fff1f2", padding: "10px 12px", borderRadius: "8px", border: "1px solid #fecdd3" }}>
                  <div style={{ fontSize: "10.5px", color: "#be123c", textTransform: "uppercase", fontWeight: 600 }}>Kalan Alacak</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#e11d48" }}>{fmtTRY(effectiveRemaining)}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Tahsilat Adedi</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{allHistory.length} Kayıt</div>
                </div>
              </div>

              {/* Tahsilat Tablosu */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", margin: 0 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#475569", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px" }}>Tarih</th>
                      <th style={{ padding: "10px 12px" }}>Makbuz / İşlem No</th>
                      <th style={{ padding: "10px 12px" }}>Hesap / Kasa</th>
                      <th style={{ padding: "10px 12px" }}>Açıklama</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Tahsil Tutarı</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHistory.map((item, idx) => {
                      const tDate = item.tahsilatTarihi ? item.tahsilatTarihi.slice(0, 10) : (item.payment_date || "");
                      const tAmt = Number(item.tahsilatTutari || item.amount || 0);
                      const tCode = item.odemeKodu || item.id || `THS-${idx + 1}`;
                      const tAccount = item.kasaBankaAdi || item.bank || item.method || "VakıfBank";
                      const tNote = item.aciklama || item.note || `${szNo} nolu sözleşme tahsilatı`;

                      return (
                        <tr key={item.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap", fontWeight: 600, color: "#334155" }}>
                            {fmtDate(tDate)}
                          </td>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569" }}>
                              {tCode}
                            </span>
                          </td>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#1e40af", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                              {tAccount}
                            </span>
                          </td>
                          <td style={{ padding: "9px 12px", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tNote}>
                            {tNote}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <b style={{ color: "#16a34a", fontSize: "13px" }}>
                              +{fmtTRY(tAmt)}
                            </b>
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenReceipt(item);
                              }}
                              style={{ padding: "3px 8px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Printer size={12} /> Makbuz Bas
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {allHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                          <div style={{ marginBottom: "8px", fontSize: "13px" }}>Bu sözleşmeye ait kayıtlı tahsilat bulunmamaktadır.</div>
                          <button
                            type="button"
                            onClick={() => { setShowHistoryModal(false); handleOpenAddPayment(); }}
                            style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >
                            + İlk Tahsilatı Ekle
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ padding: "6px 16px", background: "#f1f5f9", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GelirDetayModal;
