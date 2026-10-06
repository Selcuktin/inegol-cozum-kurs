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
  X
} from "lucide-react";
import studentsData from "../data/edesisStudentsData.json";
import edesisAccountingData from "../data/edesisAccountingData.json";

export default function EdesisSozlesmeDetay({
  contract,
  onBack,
  onOpenGelir,
  onOpenPrintMeb,
  onOpenPaymentPlan
}) {
  const [notes, setNotes] = useState([
    // Empty initially as in screenshot ("Henüz not eklenmemiş")
  ]);
  const [newNoteText, setNewNoteText] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const [collectModal, setCollectModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [editDateModal, setEditDateModal] = useState(null);
  const [editAmountsModal, setEditAmountsModal] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Find corresponding student in data
  const student = useMemo(() => {
    if (!contract) return null;
    const name = (contract.ogrenciAdi || contract.musteriUnvan || "").toUpperCase();
    return studentsData.find((s) => s.student_name && s.student_name.toUpperCase() === name) || studentsData[0];
  }, [contract]);

  // Find installments for this contract
  const installments = useMemo(() => {
    if (!contract) return [];
    const allTaksitler = edesisAccountingData.taksitler || [];
    const matched = allTaksitler.filter(
      (t) => t.sozlesmeNo === contract.sozlesmeNo || String(t.sozlesmeId) === String(contract.id)
    );
    if (matched.length > 0) return matched;

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

    return Array.from({ length: count }, (_, i) => ({
      taksitNo: i + 1,
      vadeTarihi: dates[i] || `28.${String(i + 1).padStart(2, "0")}.2027`,
      taksitTutari: i === count - 1 ? last : regular,
      tahsilEdilen: 0,
      kalanTutar: i === count - 1 ? last : regular,
      durum: 0, // 0: Vadesi Gelmedi
      durumText: "Vadesi Gelmedi"
    }));
  }, [contract]);

  const [localInstallments, setLocalInstallments] = useState(installments);

  // Calculations
  const brutTutar = contract?.brutTutar || 81000.04;
  const netTutar = contract?.netTutar || Number((brutTutar / 1.1).toFixed(2));
  const kdvTutari = contract?.kdvTutari || Number((brutTutar - netTutar).toFixed(2));
  const totalPaid = localInstallments.reduce((acc, it) => acc + (it.tahsilEdilen || 0), 0);
  const totalRemaining = brutTutar - totalPaid;

  const fmtTRY = (num) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(num || 0);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: newNoteText.trim(),
        date: new Date().toLocaleDateString("tr-TR") + " " + new Date().toLocaleTimeString("tr-TR").slice(0, 5),
        author: "Yönetici"
      }
    ]);
    setNewNoteText("");
    showToast("✅ Not eklendi.");
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

  const handleConfirmCollect = () => {
    if (!collectModal || !collectModal.taksit) return;
    const { taksit, amount } = collectModal;
    const paidAmount = Number(amount) || taksit.taksitTutari;

    setLocalInstallments((prev) =>
      prev.map((t) =>
        t.taksitNo === taksit.taksitNo
          ? {
              ...t,
              tahsilEdilen: paidAmount,
              kalanTutar: Math.max(0, t.taksitTutari - paidAmount),
              durum: 1,
              durumText: "Tahsil Edildi",
              odemeYontemi: collectModal.method,
              tahsilatTarihi: collectModal.date
            }
          : t
      )
    );
    showToast(`✅ ${taksit.taksitNo}. Taksit (${fmtTRY(paidAmount)}) tahsil edildi.`);
    setCollectModal(null);
  };

  const handleOpenCancel = (taksit) => {
    setCancelModal({ taksit });
  };

  const handleConfirmCancel = () => {
    if (!cancelModal || !cancelModal.taksit) return;
    const { taksit } = cancelModal;

    setLocalInstallments((prev) =>
      prev.map((t) =>
        t.taksitNo === taksit.taksitNo
          ? {
              ...t,
              tahsilEdilen: 0,
              kalanTutar: t.taksitTutari,
              durum: 0,
              durumText: "Vadesi Gelmedi",
              odemeYontemi: null,
              tahsilatTarihi: null
            }
          : t
      )
    );
    showToast(`↩️ ${taksit.taksitNo}. Taksit tahsilatı iptal edildi ve geri alındı.`);
    setCancelModal(null);
  };

  const handleConfirmDateChange = () => {
    if (!editDateModal || !editDateModal.taksit) return;
    const { taksit, newDate } = editDateModal;
    setLocalInstallments((prev) =>
      prev.map((t) => (t.taksitNo === taksit.taksitNo ? { ...t, vadeTarihi: newDate } : t))
    );
    showToast(`📅 ${taksit.taksitNo}. Taksit vadesi ${newDate} olarak güncellendi.`);
    setEditDateModal(null);
  };

  return (
    <div
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
                Sözleşme Detay <span style={{ color: "#94a3b8", fontWeight: 400 }}>{contract?.sozlesmeNo}</span>
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b", marginTop: "6px", marginLeft: "2px" }}>
              <span>Ana Sayfa</span>
              <span>•</span>
              <span>Muhasebe</span>
              <span>•</span>
              <span>Sözleşmeler V2</span>
              <span>•</span>
              <span style={{ color: "#0f172a", fontWeight: 600 }}>Sözleşme Detay</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                if (onOpenGelir) onOpenGelir(contract);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Plus size={14} /> Gelir Ekle / Gelir Detayı (GLR)
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
                              onClick={() => handleOpenCancel(t)}
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
                            onClick={() => handleOpenCollect(t)}
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
                          onClick={() => setEditDateModal({ taksit: t, newDate: t.vadeTarihi })}
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
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{ width: "100%", padding: "8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", resize: "none" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <button
                  type="submit"
                  style={{ padding: "4px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                >
                  Ekle
                </button>
              </div>
            </form>

            {notes.length === 0 ? (
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>
                Henüz not eklenmemiş
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {notes.map((n) => (
                  <div key={n.id} style={{ background: "#f8fafc", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>
                    <div>{n.text}</div>
                    <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "4px" }}>{n.date} · {n.author}</div>
                  </div>
                ))}
              </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
              <User size={15} /> Öğrenci Bilgileri
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
                {(contract?.ogrenciAdi || "E")[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                  {contract?.ogrenciAdi || contract?.musteriUnvan || "EGEMEN KUŞTUL"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {contract?.sinifAdi || student?.student_class || "7-A"}
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
                {student?.parent_relation || "Anne"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#475569" }}>
              <div>TC: {student?.parent_tc || "55264671398"}</div>
              <div>Tel: {student?.parent_phone || "(534) 332 17 81"}</div>
              <div style={{ color: "#2563eb" }}>{student?.parent_email || "seyhan5343321781@edesis.com"}</div>
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
              {contract?.ogrenciAdi || contract?.musteriUnvan || "EGEMEN KUŞTUL"}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
              Müşteri Kodu: {contract?.muH_MusteriKodu || "CRI202600108"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#475569" }}>
              <div>TC KİMLİK NO: {student?.student_tc || "18481666516"}</div>
              <div>TELEFON: {student?.student_phone || "5343321781"}</div>
              <div>E-POSTA: {student?.student_email || "egemen@edesis.com"}</div>
              <div>ADRES: {student?.address || "İnegöl, Bursa"}</div>
            </div>
          </div>

          {/* CARD: BELGELER */}
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
              Senetler (1)
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#7c3aed", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>
                SN
              </div>
              <div style={{ fontSize: "11px" }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>SN-GLR202600152 (10 adet)</div>
                <div style={{ color: "#64748b" }}>{fmtTRY(brutTutar)}</div>
              </div>
            </div>
          </div>

          {/* CARD: İMZA DURUMU */}
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
              <PenTool size={15} /> İmza Durumu
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef9c3", padding: "8px 12px", borderRadius: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#854d0e" }}>Kurum Yetkilisi</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#a16207" }}>Bekliyor</span>
            </div>
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
              maxWidth: "560px",
              maxHeight: "85vh",
              overflow: "auto",
              padding: "24px",
              animation: "popIn 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                ✏️ Ödeme Takvimi ve Tutarları Düzenle
              </h3>
              <button type="button" onClick={() => setEditAmountsModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
              Taksit tutarlarını veya vade tarihlerini düzenleyebilirsiniz:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {localInstallments.map((t, idx) => (
                <div key={t.taksitNo} style={{ display: "grid", gridTemplateColumns: "35px 1fr 1fr", gap: "10px", alignItems: "center", background: "#f8fafc", padding: "6px 10px", borderRadius: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "12px" }}>#{t.taksitNo}</span>
                  <input
                    type="text"
                    value={t.vadeTarihi}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalInstallments((prev) => prev.map((item, i) => i === idx ? { ...item, vadeTarihi: val } : item));
                    }}
                    style={{ height: "32px", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "0 8px", fontSize: "12px" }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={t.taksitTutari}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setLocalInstallments((prev) => prev.map((item, i) => i === idx ? { ...item, taksitTutari: val, kalanTutar: Math.max(0, val - (item.tahsilEdilen || 0)) } : item));
                    }}
                    style={{ height: "32px", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "0 8px", fontSize: "12px", fontWeight: 600, textAlign: "right" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setEditAmountsModal(false)}
                style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Tamamla ve Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
