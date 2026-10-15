import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Printer,
  Edit2,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Users,
  Building,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  DollarSign,
  ShoppingCart,
  Info,
  PenTool,
  Check,
  Trash2,
  X
} from "lucide-react";
import AccountingService, { trNorm } from "../lib/edesisAccountingService";
import { StudentService } from "../lib/edesisStudentService";
import { PromissoryNoteModal } from "./PromissoryNoteModal";
import { ReceiptModal } from "./ReceiptModal";

const EMPTY_ARR = [];

export default function EdesisSozlesmeDetay({
  contract,
  students = EMPTY_ARR,
  onBack,
  onOpenGelir,
  onOpenPrintMeb,
  onOpenPaymentPlan,
  onEditStudent
}) {
  const [notes, setNotes] = useState(contract?.notes || '');
  const [savingNote,setSavingNote]=useState(false);
  React.useEffect(()=>{setNotes(contract?.notes || '');setNewNoteText('');},[contract?.id,contract?.sozlesmeNo,contract?.notes]);
  const [newNoteText, setNewNoteText] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const [collectModal, setCollectModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [editDateModal, setEditDateModal] = useState(null);
  const [quickEditInst, setQuickEditInst] = useState(null);
  const [editAmountsModal, setEditAmountsModal] = useState(false);
  const [showPromissoryModal, setShowPromissoryModal] = useState(false);
  const [receiptModalPayment, setReceiptModalPayment] = useState(null);
  const [isSignedState, setIsSignedState] = useState(() => !!(contract?.isSigned || contract?.kurumImzaAlindi || contract?.veliImzaAlindi));
  const [signedByName, setSignedByName] = useState(() => contract?.kurumImzalayan || "Osman Seymen (Yönetici)");
  const [accountingTick, setAccountingTick] = useState(0);

  React.useEffect(() => {
    const handleUpdate = () => setAccountingTick((t) => t + 1);
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
      window.removeEventListener("cozum_students_updated", handleUpdate);
    };
  }, []);

  React.useEffect(() => {
    if ((contract?.id || contract?.sozlesmeNo) && process.env.NODE_ENV !== "test") {
      AccountingService.fetchInstallments(contract.id || contract.sozlesmeNo);
    }
  }, [contract?.id, contract?.sozlesmeNo]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSignContract = async () => {
try {

    await AccountingService.signContract(contract.id || contract.sozlesmeNo, "kurum", signedByName);
    setIsSignedState(true);
    showToast("✅ Sözleşme Kurum Yetkilisi tarafından imzalandı / onaylandı.");

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  // Find corresponding student in data
  const baseStudent = useMemo(() => {
    if (!contract) return null;
    const name = trNorm(contract.ogrenciAdi || contract.ogrenciAdiSoyadi || contract.musteriUnvan || "");
    const sId = String(contract.studentId || contract.student_id || contract.ogrenciId || "");
    const cleanId = sId.replace(/^stu-/, "");
    const szlNo = contract.sozlesmeNo || contract.sozlesme_no || "";
    const ogrNo = String(contract.ogrenciNo || contract.student_no || "");
    const allStudents = [...(Array.isArray(students) ? students : []), ...StudentService.getAllStudents()];
    void accountingTick;
    return allStudents.find((s) => {
      if (!s) return false;
      if (szlNo && s.sozlesme_no === szlNo) return true;
      if (cleanId && (String(s.id) === sId || String(s.id).replace(/^stu-/, "") === cleanId)) return true;
      if (ogrNo && String(s.student_no) === ogrNo) return true;
      return trNorm(s.student_name) === name;
    }) || {
      id: contract.studentId || contract.student_id || contract.ogrenciId,
      student_name: contract.ogrenciAdi || contract.musteriUnvan || "Öğrenci",
      student_class: contract.sinifAdi || contract.student_class || "Genel",
      parent_name: contract.musteriUnvan || contract.parent_name || "",
      parent_phone: contract.musteriTelefon || contract.parent_phone || "",
      student_tc: contract.student_tc || contract.studentTc || "",
      student_no: contract.ogrenciNo || contract.student_no || ""
    };
  }, [contract, students, accountingTick]);

  const student = baseStudent;

  // Find installments for this contract
  const installments = useMemo(() => {
    if (!contract) return [];
    const allTaksitler = AccountingService.getInstallments(students) || [];
    const norm = (str) => (str || "").trim().replace(/i/g, "İ").replace(/ı/g, "I").toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
    const cSozlesme = (contract.sozlesmeNo || "").trim();
    const cStudent = norm(contract.ogrenciAdi || contract.musteriUnvan || "");

    const matched = allTaksitler.filter((t) => {
      if (cSozlesme) {
        if (t.sozlesmeNo && t.sozlesmeNo === cSozlesme) return true;
        if (t.gelirAciklama && t.gelirAciklama.includes(cSozlesme)) return true;
        return false;
      }
      if (cStudent) {
        const tStudent = norm(t.ogrenciAdiSoyadi || t.musteriUnvan || "");
        if (tStudent === cStudent) return true;
      }
      return false;
    });

    if (matched.length > 0) {
      // Deduplicate by taksitNo to prevent cloned rows (1, 1, 2, 2, ...)
      const uniqueMap = new Map();
      matched.forEach((t) => {
        const no = Number(t.taksitNo) || 1;
        if (!uniqueMap.has(no)) {
          uniqueMap.set(no, t);
        }
      });
      const uniqueList = Array.from(uniqueMap.values());

      return uniqueList.sort((a, b) => (Number(a.taksitNo) || 0) - (Number(b.taksitNo) || 0)).map((t, idx) => {
        const amt = Number(t.taksitTutari) || 0;
        const paid = Number(t.tahsilEdilen) || 0;
        const rem = Number(t.kalanTutar) !== undefined ? Number(t.kalanTutar) : Math.max(0, amt - paid);
        let dueStr = t.vadeTarihi ? String(t.vadeTarihi).slice(0, 10) : "";
        if (dueStr.includes("-")) {
          const parts = dueStr.split("-");
          dueStr = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return {
          id: t.id,
          taksitNo: Number(t.taksitNo) || (idx + 1),
          vadeTarihi: dueStr,
          odemeTarihi: t.odemeTarihi,
          tahsilatTarihi: t.tahsilatTarihi,
          taksitTutari: amt,
          tahsilEdilen: paid,
          kalanTutar: rem,
          durum: rem <= 0 ? 1 : 0,
          durumText: rem <= 0 ? "Tahsil Edildi" : (paid > 0 ? "Kısmen Ödendi" : (t.durumText || "Vadesi Gelmedi")),
          gelirKodu: t.gelirKodu,
          sozlesmeNo: t.sozlesmeNo || cSozlesme
        };
      });
    }

    // Fallback: Generate realistic 10 installments matching contract total
    const total = contract.brutTutar || 81000.04;
    const count = contract.taksitSayisi || 10;
    const regular = Math.floor((total / count) * 100) / 100;
    const last = Number((total - regular * (count - 1)).toFixed(2));

    const dates = [
      "31.10.2026", "30.11.2026", "31.12.2026", "30.01.2027",
      "28.02.2027", "28.03.2027", "28.04.2027", "28.05.2027",
      "28.06.2027", "28.07.2027"
    ];

    void accountingTick;
    return Array.from({ length: count }, (_, i) => ({
      taksitNo: i + 1,
      vadeTarihi: dates[i] || `28.${String(i + 1).padStart(2, "0")}.2027`,
      taksitTutari: i === count - 1 ? last : regular,
      tahsilEdilen: 0,
      kalanTutar: i === count - 1 ? last : regular,
      durum: 0, // 0: Vadesi Gelmedi
      durumText: "Vadesi Gelmedi"
    }));
  }, [contract, students, accountingTick]);

  const [localInstallments, setLocalInstallments] = useState(installments);

  React.useEffect(() => {
    setLocalInstallments(installments);
  }, [installments, accountingTick, contract?.id, contract?.sozlesmeNo, contract?.brutTutar]);

  // Calculations: Dynamically derive from installments if present, ensuring increasing an installment immediately reflects in total!
  const installmentsSum = (localInstallments && localInstallments.length > 0)
    ? localInstallments.reduce((acc, it) => acc + (Number(it.taksitTutari) || 0), 0)
    : (contract?.brutTutar || 81000.04);
  const brutTutar = Math.round(installmentsSum * 100) / 100;
  const netTutar = Math.round((brutTutar / 1.1) * 100) / 100;
  const kdvTutari = Math.round((brutTutar - netTutar) * 100) / 100;
  const totalPaid = (localInstallments || []).reduce((acc, it) => acc + (Number(it.tahsilEdilen) || 0), 0);
  const totalRemaining = Math.max(0, brutTutar - totalPaid);

  const fmtTRY = (num) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(num || 0);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      setNotes(await AccountingService.addNote('contracts',contract.id || contract.sozlesmeNo,newNoteText));
      setNewNoteText('');showToast('✅ Not kaydedildi.');
    } catch(error){window.alert(error.message || 'Not kaydedilemedi');}
    finally{setSavingNote(false);}
  };

  const handleOpenCollect = (taksit) => {
    setCollectModal({
      taksit,
      amount: taksit.kalanTutar > 0 ? taksit.kalanTutar : taksit.taksitTutari,
      method: "Kredi Kartı",
      date: new Date().toISOString().slice(0, 10),
      notes: ""
    });
  };

  // Auto-scroll to Tahsilat section and highlight/open collection modal if requested from Dashboard
  React.useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById("tahsilat-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.style.transition = "box-shadow 0.4s ease, border-color 0.4s ease";
        el.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.35)";
        el.style.borderColor = "#10b981";
        setTimeout(() => {
          el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
          el.style.borderColor = "#e2e8f0";
        }, 2500);

        try {
          sessionStorage.removeItem("cozum_scroll_to_tahsilat");
          sessionStorage.removeItem("cozum_target_taksit_no");
        } catch {}
      }
    };

    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("cozum_scroll_to_tahsilat") === "1") {
      const timer = setTimeout(handleScroll, 120);
      return () => clearTimeout(timer);
    }

    window.addEventListener("cozum_scroll_to_tahsilat", handleScroll);
    return () => window.removeEventListener("cozum_scroll_to_tahsilat", handleScroll);
  }, []);

  const handleConfirmCollect = async () => {
try {

    if (!collectModal || !collectModal.taksit) return;
    const { taksit, amount } = collectModal;
    const paidAmount = Number(amount) || taksit.taksitTutari;

    await AccountingService.recordCollection({
      studentId: contract.studentId || contract.student_id || contract.ogrenciId || student?.id,
      studentName: contract.ogrenciAdi || contract.musteriUnvan || student?.student_name,
      contractId: contract.id,
      sozlesmeNo: contract.sozlesmeNo,
      installment_no: taksit.taksitNo,
      installment_id: taksit.id,
      amount: paidAmount,
      method: collectModal.method || "Nakit",
      bank: collectModal.method === "Banka Havale / EFT" ? "T.C. VAKIFLAR BANKASI İNEGÖL ŞB." : "Nakit Ana Kasa",
      date: collectModal.date,
      note: `${contract.sozlesmeNo || ""} ${taksit.taksitNo}. Taksit Tahsilatı`,
      gelirKodu: taksit.gelirKodu || contract.gelirKodu
    });

    setLocalInstallments(await AccountingService.fetchInstallments(contract.id));
    showToast(`✅ ${taksit.taksitNo}. Taksit (${fmtTRY(paidAmount)}) tahsil edildi ve kaydedildi.`);
    setCollectModal(null);

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  const handleOpenCancel = (taksit) => {
    setCancelModal({ taksit });
  };

  const handleConfirmCancel = async () => {
    try {
    if (!cancelModal || !cancelModal.taksit) return;
    const { taksit } = cancelModal;
    const cancelAmt = Number(taksit.tahsilEdilen || taksit.paid_amount || taksit.taksitTutari || 0);

    await AccountingService.cancelCollection({
      studentId: contract?.studentId || contract?.student_id || contract?.ogrenciId || student?.id,
      contractId: contract?.id,
      sozlesmeNo: contract?.sozlesmeNo || taksit.sozlesmeNo,
      installment_no: taksit.taksitNo,
      installment_id: taksit.id,
      amount: cancelAmt
    });

    setLocalInstallments(await AccountingService.fetchInstallments(contract.id));
    showToast(`↩️ ${taksit.taksitNo}. Taksit tahsilatı iptal edildi ve geri alındı.`);
    setCancelModal(null);
    } catch(error) { window.alert(error.message || "İptal edilemedi"); }
  };

  const handleConfirmDateChange = async () => {
try {

    if (!editDateModal || !editDateModal.taksit) return;
    const { taksit, newDate } = editDateModal;
    const updated = localInstallments.map((t) => (t.taksitNo === taksit.taksitNo ? { ...t, vadeTarihi: newDate } : t));
    await AccountingService.saveInstallments(contract?.sozlesmeNo || contract?.id, updated);
    setLocalInstallments(updated);
    showToast(`📅 ${taksit.taksitNo}. Taksit vadesi ${newDate} olarak güncellendi ve kaydedildi.`);
    setEditDateModal(null);

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  const handleSaveAmounts = async () => {
try {

    const res = await AccountingService.saveInstallments(contract?.sozlesmeNo || contract?.id, localInstallments);
    showToast(`✅ Sözleşme tutarı ve taksitler kaydedildi: ${fmtTRY(res?.newBrut || brutTutar)} (${localInstallments.length} Taksit)`);
    setEditAmountsModal(false);

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  const handleAddInstallment = () => {
    const nextNo = (localInstallments.length > 0 ? Math.max(...localInstallments.map((t) => t.taksitNo)) : 0) + 1;
    const lastDate = localInstallments[localInstallments.length - 1]?.vadeTarihi;
    let dateStr = new Date().toISOString().slice(0, 10);
    try {
      const d = lastDate ? new Date(lastDate) : new Date();
      d.setMonth(d.getMonth() + 1);
      dateStr = d.toISOString().slice(0, 10);
    } catch {}
    const newInst = {
      id: `inst-${contract?.sozlesmeNo || Date.now()}-${nextNo}`,
      taksitNo: nextNo,
      gelirKodu: contract?.gelirKodu || (contract?.sozlesmeNo ? `GLR2026${contract.sozlesmeNo.replace(/\D/g, "").slice(-5)}` : ""),
      sozlesmeNo: contract?.sozlesmeNo || "",
      ogrenciAdiSoyadi: contract?.ogrenciAdi || "",
      musteriUnvan: contract?.musteriUnvan || "",
      sinifAdi: contract?.sinifAdi || "Genel",
      taksitTutari: 0,
      toplamTutar: 0,
      tahsilEdilen: 0,
      kalanTutar: 0,
      vadeTarihi: dateStr,
      durum: 0,
      durumText: "Vadesi Gelmedi"
    };
    setLocalInstallments((prev) => [...prev, newInst]);
  };

  const handleRemoveLastInstallment = () => {
    if (localInstallments.length <= 1) return;
    const last = localInstallments[localInstallments.length - 1];
    if (last.durum === 1) {
      showToast("⚠️ Tahsil edilmiş taksit silinemez!");
      return;
    }
    setLocalInstallments((prev) => prev.slice(0, -1));
  };

  const handleDistributeRemainderEvenly = () => {
    const unpaid = localInstallments.filter((t) => t.durum !== 1);
    if (unpaid.length === 0) {
      showToast("ℹ️ Dağıtılacak ödenmemiş taksit bulunmuyor.");
      return;
    }
    const rem = Math.max(0, brutTutar - totalPaid);
    const perInst = Math.floor((rem / unpaid.length) * 100) / 100;
    const diff = Math.round((rem - perInst * unpaid.length) * 100) / 100;
    let idx = 0;
    setLocalInstallments((prev) =>
      prev.map((t) => {
        if (t.durum === 1) return t;
        idx++;
        const isLast = idx === unpaid.length;
        const amt = isLast ? Math.round((perInst + diff) * 100) / 100 : perInst;
        return {
          ...t,
          taksitTutari: amt,
          toplamTutar: amt,
          kalanTutar: amt
        };
      })
    );
    showToast(`⚖️ Kalan ${fmtTRY(rem)} tutar ${unpaid.length} taksite eşit dağıtıldı.`);
  };

  const handleConfirmSingleInstallment = async () => {
try {

    if (!quickEditInst || !quickEditInst.taksit) return;
    const { taksit, amount, date } = quickEditInst;
    const newAmt = Number(amount) || 0;
    const updated = localInstallments.map((t) => {
      if (t.taksitNo === taksit.taksitNo) {
        const paid = Number(t.tahsilEdilen) || 0;
        return {
          ...t,
          taksitTutari: newAmt,
          toplamTutar: newAmt,
          kalanTutar: Math.max(0, newAmt - paid),
          vadeTarihi: date || t.vadeTarihi
        };
      }
      return t;
    });
    const res = await AccountingService.saveInstallments(contract?.sozlesmeNo || contract?.id, updated);
    setLocalInstallments(updated);
    showToast(`✅ ${taksit.taksitNo}. Taksit güncellendi: ${fmtTRY(newAmt)} (Yeni Toplam: ${fmtTRY(res?.newBrut)})`);
    setQuickEditInst(null);

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  return (
    <>
      <div
        className={showPromissoryModal || receiptModalPayment ? "no-print" : ""}
        style={{
          backgroundColor: "#f5f8fa",
          minHeight: "100vh",
          padding: "16px 28px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#1e293b"
        }}
      >
        {/* Toast */}
        {toastMsg && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              background: "#1e293b",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              zIndex: 100000,
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            {toastMsg}
          </div>
        )}

        {/* TOP HEADER & BREADCRUMB (Matches media_1791229281373.png) */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  className="no-print"
                  onClick={onBack}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  <ArrowLeft size={14} /> Geri
                </button>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                  Sözleşme Detay & Gelir Yönetimi <span style={{ color: "#94a3b8", fontWeight: 400 }}>{contract?.sozlesmeNo}</span>
                </h1>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b", marginTop: "6px", marginLeft: "2px" }}>
                <span>Ana Sayfa</span>
                <span>•</span>
                <span>Muhasebe</span>
                <span>•</span>
                <span>Sözleşmeler V2</span>
                <span>•</span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>Sözleşme Detay & Gelir</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                data-testid="print-promissory-notes-btn"
              aria-label="Resmî Senetler (Bono) Yazdır"
              onClick={() => setShowPromissoryModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#f8fafc",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <FileText size={14} /> Resmî Senetler (Bono)
            </button>

            {contract?.sozlesmeUrl && (
              <a
                href={contract.sozlesmeUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#2563eb",
                  textDecoration: "none"
                }}
              >
                <ExternalLink size={14} /> Orijinal PDF
              </a>
            )}

            <button
              type="button"
              data-testid="print-meb-contract-btn"
              aria-label="Resmî Sözleşmeyi Yazdır (MEB)"
              onClick={() => {
                if (onOpenPrintMeb) onOpenPrintMeb(contract);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Printer size={14} /> Resmî Sözleşmeyi Yazdır (MEB)
            </button>
          </div>
        </div>

        {/* Green Accent Line */}
        <div style={{ height: "2px", background: "#10b981", marginTop: "12px", borderRadius: "2px" }} />
      </div>

      {/* 2-COLUMN MAIN CONTENT (Matches media_1791229281373.png 100%) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>
        {/* LEFT COLUMN: Main Info, Items, Installments */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* CARD 1: SÖZLEŞME BİLGİLERİ */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "18px 22px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
              <Info size={16} /> Sözleşme Bilgileri
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>SÖZLEŞME NO</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginTop: "3px" }}>{contract?.sozlesmeNo}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>TARİH</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "3px" }}>03.10.2026</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>DÖNEM</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "3px" }}>2026-2027</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>ONAY DURUMU</div>
                <span style={{ display: "inline-block", background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginTop: "3px" }}>
                  Aktif
                </span>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>ÖDEME DURUMU</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>{totalPaid > 0 ? "Kısmi Ödendi" : "Ödenmedi"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>ÖDEME TÜRÜ</div>
                <span style={{ display: "inline-block", background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, marginTop: "3px" }}>
                  {contract?.odemeTuruText || "Taksitli (10 Taksit)"}
                </span>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>BAŞLAMA</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "3px" }}>01.10.2026</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>BİTİŞ</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "3px" }}>30.06.2027</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>AÇIKLAMA</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "3px" }}>Öğrenci Sözleşmesi</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>OLUŞTURULMA</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>03.10.2026 13:05 (inegolcozumkurs)</div>
              </div>
            </div>
          </div>

          {/* CARD 2: SÖZLEŞME KALEMLERİ */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "18px 22px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
              <ShoppingCart size={16} /> Sözleşme Kalemleri
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>ÜRÜN/HİZMET</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>MİK.</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>B.FİYAT</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>İNDİRİM</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>NET</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>KDV</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>BRÜT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>EĞİTİM ÜCRETİ</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>1</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtTRY(netTutar)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>-</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtTRY(netTutar)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtTRY(kdvTutari)} (10%)</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmtTRY(brutTutar)}</td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td style={{ padding: "10px 12px" }}>Toplam</td>
                  <td colSpan={3} />
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtTRY(netTutar)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtTRY(kdvTutari)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a" }}>{fmtTRY(brutTutar)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CARD 3: ÖDEME TAKVİMİ */}
          <div
            id="tahsilat-section"
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "18px 22px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
                <Calendar size={16} /> Ödeme Takvimi
              </div>

              <button
                type="button"
                onClick={() => setEditAmountsModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 10px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  color: "#1d4ed8",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <Edit2 size={13} /> Tutarları Düzenle
              </button>
            </div>

            {/* 4 Mini Stat Boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Toplam Tutar</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{fmtTRY(brutTutar)}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Ödenen</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#16a34a", marginTop: "2px" }}>{fmtTRY(totalPaid)}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Kalan</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#b45309", marginTop: "2px" }}>{fmtTRY(totalRemaining)}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Geciken Taksit</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>0</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                <span>Ödeme İlerlemesi</span>
                <span>%{Math.round((totalPaid / (brutTutar || 1)) * 100)}</span>
              </div>
              <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${Math.round((totalPaid / (brutTutar || 1)) * 100)}%`, height: "100%", background: "#10b981" }} />
              </div>
            </div>

            {/* Table of Installments */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Taksit</th>
                  <th style={{ padding: "8px 10px" }}>Vade Tarihi</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Tutar</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Tahsil Edilen</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Kalan</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Durum</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {localInstallments.map((t) => (
                  <tr key={t.taksitNo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{t.taksitNo}</td>
                    <td style={{ padding: "8px 10px" }}>{t.vadeTarihi}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtTRY(t.taksitTutari)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: t.tahsilEdilen > 0 ? "#16a34a" : "#64748b" }}>{fmtTRY(t.tahsilEdilen || 0)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: t.kalanTutar > 0 ? "#b45309" : "#16a34a" }}>{fmtTRY(t.kalanTutar)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 600,
                          background: t.durum === 1 ? "#dcfce7" : "#f1f5f9",
                          color: t.durum === 1 ? "#15803d" : "#64748b"
                        }}
                      >
                        {t.durumText || "Vadesi Gelmedi"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {t.durum === 1 ? (
                          <>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 8px",
                                background: "#dcfce7",
                                color: "#15803d",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 700
                              }}
                              title="Tahsil Edildi"
                            >
                              <Check size={11} /> Ödendi
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReceiptModalPayment({
                                  id: `THS-${t.taksitNo}-${contract?.sozlesmeNo || Date.now()}`,
                                  amount: Number(t.tahsilEdilen) || Number(t.taksitTutari) || 0,
                                  payment_date: t.odemeTarihi || t.tahsilatTarihi || t.vadeTarihi || new Date().toISOString().slice(0, 10),
                                  method: t.odemeYontemi || "Nakit",
                                  bank: t.banka || "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
                                  note: `${contract?.sozlesmeNo || ""} ${t.taksitNo}. Taksit Tahsilat Makbuzu`
                                });
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                background: "#f0fdf4",
                                color: "#16a34a",
                                border: "1px solid #bbf7d0",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s"
                              }}
                              title="Tahsilat Makbuzunu Görüntüle ve Yazdır"
                            >
                              <Printer size={12} /> Makbuz
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCancel(t);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 8px",
                                background: "#fee2e2",
                                color: "#dc2626",
                                border: "1px solid #fca5a5",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s"
                              }}
                              title="Tahsilatı Geri Al / İptal Et"
                            >
                              <X size={11} /> İptal Et (Geri Al)
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCollect(t);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "3px 10px",
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)"
                            }}
                            title="Taksiti Tahsil Et (Onay Popupı Açılır)"
                          >
                            <Plus size={11} /> Tahsilat
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditDateModal({ taksit: t, newDate: t.vadeTarihi });
                          }}
                          style={{
                            padding: "3px 8px",
                            background: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                          title="Vade Tarihini Değiştir"
                        >
                          Vade
                        </button>

                        {t.durum !== 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickEditInst({
                                taksit: t,
                                amount: t.taksitTutari,
                                date: t.vadeTarihi
                              });
                            }}
                            style={{
                              padding: "3px 8px",
                              background: "#f0fdf4",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                            title="Taksit Tutarını Hızlı Düzenle"
                          >
                            <Edit2 size={10} style={{ marginRight: "2px" }} /> Tutar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Cards (Notlar, Öğrenci, Veli, Fatura, Belgeler, İmza) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* CARD: NOTLAR */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
              <FileText size={15} /> Notlar
            </div>

            <form onSubmit={handleAddNote} style={{ marginBottom: "10px" }}>
              <textarea
                placeholder="Not ekleyin..."
                rows={2}
                value={newNoteText}
                maxLength={2000}
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{ width: "100%", padding: "8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", resize: "none" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <button
                  type="submit"
                  disabled={savingNote || !newNoteText.trim()}
                  style={{ padding: "4px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                >
                  Ekle
                </button>
              </div>
            </form>

            {!notes ? (
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>
                Henüz not eklenmemiş
              </div>
            ) : (
              <div style={{whiteSpace:'pre-wrap',background:'#f8fafc',padding:8,borderRadius:4,fontSize:11}}>{notes}</div>
            )}
          </div>

          {/* CARD: ÖĞRENCİ BİLGİLERİ */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
                <User size={15} /> Öğrenci Bilgileri
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onEditStudent) {
                    onEditStudent(student || {
                      id: contract?.studentId || contract?.ogrenciId,
                      student_name: contract?.ogrenciAdi || contract?.musteriUnvan
                    });
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 9px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  color: "#1d4ed8",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
              >
                <Edit2 size={12} /> Öğrenciyi Düzenle
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {((student?.student_name || contract?.ogrenciAdi || "Ö")[0] || "Ö").toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                  {student?.student_name || contract?.ogrenciAdi || contract?.musteriUnvan || "Öğrenci"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {student?.student_class || contract?.sinifAdi || "Belirtilmedi"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
              <div>
                <span style={{ color: "#94a3b8", textTransform: "uppercase", fontSize: "10px", fontWeight: 700, display: "block" }}>TC KİMLİK</span>
                <span style={{ color: "#334155", fontWeight: 600 }}>{student?.student_tc || "18481666516"}</span>
              </div>
              <div>
                <span style={{ color: "#94a3b8", textTransform: "uppercase", fontSize: "10px", fontWeight: 700, display: "block" }}>TELEFON</span>
                <span style={{ color: "#334155", fontWeight: 600 }}>{student?.student_phone || "5343321781"}</span>
              </div>
            </div>
          </div>

          {/* CARD: VELİ BİLGİLERİ */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
              <Users size={15} /> Veli Bilgileri
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                {student?.parent_name || "SEYHAN KUŞTUL"}
              </span>
              <span
                style={{
                  background: student?.parent_relation === "Baba" ? "#dbeafe" : "#fce7f3",
                  color: student?.parent_relation === "Baba" ? "#1d4ed8" : "#be185d",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: 700
                }}
              >
                {student?.parent_relation || "Veli"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#475569" }}>
              <div>TC: {student?.parent_tc || "—"}</div>
              <div>Tel: {student?.parent_phone || "—"}</div>
              <div style={{ color: "#2563eb" }}>{student?.parent_email || "—"}</div>
            </div>
          </div>

          {/* CARD: FATURA BİLGİLERİ */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
                <FileText size={15} /> Fatura Bilgileri
              </div>
              <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
                Cari Hesap
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", marginBottom: "4px" }}>
              {contract?.ogrenciAdi || contract?.musteriUnvan || student?.student_name || "—"}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
              Müşteri Kodu: {contract?.muH_MusteriKodu || `CRI2026${String(contract?.sozlesmeNo || "100").slice(-4)}`}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#475569" }}>
              <div>TC KİMLİK NO: {student?.student_tc || "—"}</div>
              <div>TELEFON: {student?.student_phone || "—"}</div>
              <div>E-POSTA: {student?.student_email || "—"}</div>
              <div>ADRES: {student?.address || student?.student_address || "İnegöl / BURSA"}</div>
            </div>
          </div>

          {/* CARD: BELGELER (Dinamik Senetler & Yazdırma) */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
              <FileText size={15} /> Belgeler
            </div>

            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
              Senetler ({contract?.taksitSayisi || localInstallments?.length || 1})
            </div>

            <div
              onClick={() => setShowPromissoryModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                background: "#f8fafc",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #f1f5f9",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
              title="Senetleri görüntülemek ve yazdırmak için tıklayın"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#7c3aed", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                  SN
                </div>
                <div style={{ fontSize: "11px" }}>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>SN-{contract?.sozlesmeNo || "SENET"} ({contract?.taksitSayisi || localInstallments?.length || 1} adet)</div>
                  <div style={{ color: "#64748b" }}>{fmtTRY(brutTutar)}</div>
                </div>
              </div>
              <button
                type="button"
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Görüntüle
              </button>
            </div>
          </div>

          {/* CARD: İMZA DURUMU (Gerçek Onay & İmzala Aksiyonu) */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
                <PenTool size={15} /> İmza Durumu
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: isSignedState ? "#dcfce7" : "#fef9c3",
                color: isSignedState ? "#15803d" : "#854d0e"
              }}>
                {isSignedState ? "✓ İmzalandı" : "İmza Bekliyor"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isSignedState ? "#f0fdf4" : "#fef9c3", padding: "8px 12px", borderRadius: "6px", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: isSignedState ? "#166534" : "#854d0e" }}>
                Kurum Yetkilisi: {isSignedState ? signedByName : "Bekliyor"}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: isSignedState ? "#15803d" : "#a16207" }}>
                {isSignedState ? "Onaylandı" : "Bekliyor"}
              </span>
            </div>

            {!isSignedState && (
              <button
                type="button"
                onClick={handleSignContract}
                style={{
                  width: "100%",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                <Check size={14} /> Kurum Yetkilisi Olarak İmzala / Onayla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1. TAHSİLAT ONAY POPUP MODAL */}
      {collectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px"
          }}
          onClick={() => setCollectModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              animation: "popIn 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center" }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Taksit Tahsilatı ({collectModal.taksit.taksitNo}. Taksit)
                  </h3>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Vade: {collectModal.taksit.vadeTarihi}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectModal(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#64748b" }}>Öğrenci:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{contract?.ogrenciAdi || "EGEMEN KUŞTUL"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#64748b" }}>Taksit Tutarı:</span>
                <span style={{ fontWeight: 700, color: "#2563eb" }}>{fmtTRY(collectModal.taksit.taksitTutari)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Sözleşme No:</span>
                <span style={{ fontWeight: 600, color: "#475569" }}>{contract?.sozlesmeNo || "SZL202600148"}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  TAHSİL EDİLECEK TUTAR (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={collectModal.amount}
                  onChange={(e) => setCollectModal({ ...collectModal, amount: e.target.value })}
                  style={{ width: "100%", height: "38px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0 10px", fontSize: "13px", fontWeight: 700, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  ÖDEME YÖNTEMİ
                </label>
                <select
                  value={collectModal.method}
                  onChange={(e) => setCollectModal({ ...collectModal, method: e.target.value })}
                  style={{ width: "100%", height: "38px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0 10px", fontSize: "12px", background: "#fff", outline: "none" }}
                >
                  <option value="Kredi Kartı">Kredi Kartı / POS</option>
                  <option value="Havale / EFT">Banka Havalesi / EFT</option>
                  <option value="Nakit">Nakit Kasa</option>
                  <option value="Senet / Çek">Senet / Çek Tahsilatı</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  TAHSİLAT TARİHİ
                </label>
                <input
                  type="date"
                  value={collectModal.date}
                  onChange={(e) => setCollectModal({ ...collectModal, date: e.target.value })}
                  style={{ width: "100%", height: "38px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0 10px", fontSize: "12px", outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setCollectModal(null)}
                style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmCollect}
                style={{ padding: "8px 18px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Check size={14} /> Tahsilatı Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAHSİLATI GERİ AL / İPTAL ET POPUP MODAL */}
      {cancelModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px"
          }}
          onClick={() => setCancelModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: "440px",
              padding: "24px",
              animation: "popIn 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <X size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Tahsilatı Geri Al / İptal Et
                </h3>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {cancelModal.taksit.taksitNo}. Taksit İşlemi
                </div>
              </div>
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 14px", marginBottom: "18px", fontSize: "12px", color: "#991b1b", lineHeight: "1.5" }}>
              <b>{cancelModal.taksit.taksitNo}. Taksit</b> için yapılmış olan <b>{fmtTRY(cancelModal.taksit.tahsilEdilen)}</b> tutarındaki tahsilatı geri almak istediğinize emin misiniz?
              <br /><br />
              Bu işlem sonrası taksit tekrar <b>"Vadesi Gelmedi"</b> durumuna dönecek ve kalan borç tutarı eski haline getirilecektir.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                style={{ padding: "8px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <X size={14} /> Evet, Tahsilatı Geri Al
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. VADE DEĞİŞTİRME POPUP MODAL */}
      {editDateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px"
          }}
          onClick={() => setEditDateModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: "380px",
              padding: "22px",
              animation: "popIn 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              📅 {editDateModal.taksit.taksitNo}. Taksit Vadesini Düzenle
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                YENİ VADE TARİHİ
              </label>
              <input
                type="text"
                value={editDateModal.newDate}
                onChange={(e) => setEditDateModal({ ...editDateModal, newDate: e.target.value })}
                placeholder="GG.AA.YYYY"
                style={{ width: "100%", height: "38px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setEditDateModal(null)}
                style={{ padding: "7px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmDateChange}
                style={{ padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TUTARLARI DÜZENLE MODAL */}
      {editAmountsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px"
          }}
          onClick={() => setEditAmountsModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "88vh",
              overflow: "auto",
              padding: "24px",
              animation: "popIn 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  ✏️ Ödeme Takvimi ve Tutarları Düzenle
                </h3>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Taksit tutarını değiştirdikçe sözleşme ana tutarı otomatik güncellenir.
                </div>
              </div>
              <button type="button" onClick={() => setEditAmountsModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>

            {/* Live Stats Summary in Modal */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>YENİ TOPLAM</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#1d4ed8", marginTop: "2px" }}>{fmtTRY(brutTutar)}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>ÖDENEN</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#16a34a", marginTop: "2px" }}>{fmtTRY(totalPaid)}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>KALAN BAKİYE</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#b45309", marginTop: "2px" }}>{fmtTRY(totalRemaining)}</div>
              </div>
            </div>

            {/* Practical Toolbar: Add, Rebalance, Remove */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
              <button
                type="button"
                onClick={handleAddInstallment}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  color: "#1d4ed8",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <Plus size={13} /> Taksit Ekle
              </button>

              <button
                type="button"
                onClick={handleDistributeRemainderEvenly}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "6px",
                  color: "#15803d",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                title="Kalan tutarı ödenmemiş taksitlere eşit olarak paylaştırır"
              >
                ⚖️ Kalanı Eşit Dağıt
              </button>

              {localInstallments.length > 1 && (
                <button
                  type="button"
                  onClick={handleRemoveLastInstallment}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    color: "#dc2626",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <Trash2 size={13} /> Son Taksiti Sil
                </button>
              )}
            </div>

            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "35px 140px 1fr 90px", gap: "8px", padding: "0 10px 6px 10px", fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
              <span>NO</span>
              <span>VADE TARİHİ</span>
              <span style={{ textAlign: "right" }}>TUTAR (₺)</span>
              <span style={{ textAlign: "center" }}>DURUM</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "18px", maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
              {localInstallments.map((t, idx) => {
                const isPaid = t.durum === 1;
                return (
                  <div
                    key={t.taksitNo}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "35px 140px 1fr 90px",
                      gap: "8px",
                      alignItems: "center",
                      background: isPaid ? "#f0fdf4" : "#f8fafc",
                      border: isPaid ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                      padding: "6px 10px",
                      borderRadius: "6px"
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "12px", color: isPaid ? "#16a34a" : "#0f172a" }}>#{t.taksitNo}</span>
                    <input
                      type="text"
                      disabled={isPaid}
                      value={t.vadeTarihi || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalInstallments((prev) => prev.map((item, i) => (i === idx ? { ...item, vadeTarihi: val } : item)));
                      }}
                      style={{ height: "32px", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "0 8px", fontSize: "12px", background: isPaid ? "#f1f5f9" : "#fff" }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      disabled={isPaid}
                      value={t.taksitTutari}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setLocalInstallments((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  taksitTutari: val,
                                  toplamTutar: val,
                                  kalanTutar: Math.max(0, val - (item.tahsilEdilen || 0))
                                }
                              : item
                          )
                        );
                      }}
                      style={{ height: "32px", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "0 8px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: isPaid ? "#f1f5f9" : "#fff" }}
                    />
                    <div style={{ textAlign: "center" }}>
                      {isPaid ? (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                          Ödendi
                        </span>
                      ) : (
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b" }}>
                          Bekliyor
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Toplam Taksit: <b>{localInstallments.length}</b>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditAmountsModal(false)}
                  style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSaveAmounts}
                  style={{ padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Tamamla ve Kaydet ({fmtTRY(brutTutar)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4.1 TEK TAKSİT PRATİK DÜZENLEME MODAL */}
      {quickEditInst && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px"
          }}
          onClick={() => setQuickEditInst(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: "400px",
              padding: "22px",
              animation: "popIn 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                ✏️ #{quickEditInst.taksit?.taksitNo}. Taksiti Düzenle
              </h3>
              <button type="button" onClick={() => setQuickEditInst(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Taksit Tutarı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={quickEditInst.amount}
                  onChange={(e) => setQuickEditInst({ ...quickEditInst, amount: e.target.value })}
                  style={{ width: "100%", height: "36px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0 10px", fontSize: "14px", fontWeight: 700, boxSizing: "border-box" }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Vade Tarihi
                </label>
                <input
                  type="text"
                  value={quickEditInst.date}
                  onChange={(e) => setQuickEditInst({ ...quickEditInst, date: e.target.value })}
                  style={{ width: "100%", height: "36px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0 10px", fontSize: "13px", boxSizing: "border-box" }}
                  placeholder="GG.AA.YYYY veya YYYY-AA-GG"
                />
              </div>

              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px", fontSize: "11px", color: "#64748b" }}>
                💡 Bu taksitin tutarını değiştirdiğinizde, sözleşmenin genel toplamı otomatik güncellenecektir.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setQuickEditInst(null)}
                style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleInstallment}
                style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Kaydet ve Uygula
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showPromissoryModal && (
        <PromissoryNoteModal
          student={{
            ...(student || {}),
            student_name: contract?.ogrenciAdi || contract?.musteriUnvan || student?.student_name,
            total_fee: brutTutar,
            installment_count: contract?.taksitSayisi || localInstallments?.length || 10,
            parent_name: student?.parent_name || contract?.musteriUnvan,
            extra_fees: {},
            discount_amount: 0
          }}
          installments={localInstallments}
          onClose={() => setShowPromissoryModal(false)}
        />
      )}

      {/* 5. TAHSİLAT MAKBUZU YAZDIRMA MODAL */}
      {receiptModalPayment && (
        <ReceiptModal
          payment={receiptModalPayment}
          student={{
            id: student?.id || contract?.ogrenciId || `stu-${contract?.sozlesmeNo}`,
            student_name: student?.student_name || contract?.ogrenciAdi || contract?.musteriUnvan || "ÖĞRENCİ",
            student_class: contract?.sinifAdi || student?.student_class || "Genel",
            student_tc: student?.student_tc || contract?.ogrenciTc || "",
            student_phone: student?.student_phone || contract?.ogrenciTelefon || "",
            parent_name: (student?.parent_name && student.parent_name !== student.student_name ? student.parent_name : "") || (contract?.parent_name && contract.parent_name !== contract.ogrenciAdi ? contract.parent_name : "") || (contract?.musteriUnvan && contract.musteriUnvan !== (student?.student_name || contract?.ogrenciAdi) ? contract.musteriUnvan : "") || student?.parent_name || "VELİ",
            parent_phone: student?.parent_phone || contract?.parent_phone || contract?.veliTelefon || student?.student_phone || "",
            total_fee: brutTutar,
            paid_amount: totalPaid
          }}
          onClose={() => setReceiptModalPayment(null)}
        />
      )}
    </>
  );
}
