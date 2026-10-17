import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Printer,
  X,
  Ban,
  FileSpreadsheet,
  ExternalLink,
  Coins,
  Plus,
  Users,
  UserCheck,
  Edit3,
  RotateCcw
} from "lucide-react";
import AccountingService from "../../lib/edesisAccountingService";
import { StudentService } from "../../lib/edesisStudentService";

// Format currency in Turkish Lira style: ₺81.000,04
export function fmtCurrency(val) {
  const num = Number(val) || 0;
  return "₺" + num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format ISO date string to DD.MM.YYYY
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

export function PaymentPlanModal({ contract, onClose }) {
  if (!contract) return null;
  const allInsts = AccountingService.getInstallments();
  const contractInsts = allInsts
    .filter((t) => t.sozlesmeNo === contract.sozlesmeNo)
    .sort((a, b) => (Number(a.taksitNo) || 0) - (Number(b.taksitNo) || 0));
  const hasRealInsts = contractInsts.length > 0;
  const planItems = hasRealInsts
    ? contractInsts
    : Array.from({ length: contract.taksitSayisi || 1 }, (_, i) => {
        const instNum = i + 1;
        const instAmount = (Number(contract.brutTutar) || 0) / (contract.taksitSayisi || 1);
        const baseDate = new Date(contract.sozlesmeTarihi || new Date());
        baseDate.setMonth(baseDate.getMonth() + i);
        return {
          taksitNo: instNum,
          vadeTarihi: baseDate.toISOString().slice(0, 10),
          taksitTutari: instAmount,
          durumText: "Bekliyor",
          durum: 0
        };
      });

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "650px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          padding: "24px"
        }}
      >
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "12px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileSpreadsheet size={22} color="#2563eb" />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Ödeme Planı Dökümü</h3>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {contract.sozlesmeNo} · {contract.ogrenciAdi}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              background: "#f8fafc",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "13px"
            }}
          >
            <span>
              Toplam Tutar: <b>{fmtCurrency(contract.brutTutar)}</b>
            </span>
            <span>
              Taksit Sayısı: <b>{planItems.length || contract.taksitSayisi || 1}</b>
            </span>
            <span>
              Ödeme Türü: <b>{contract.odemeTuruText}</b>
            </span>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", color: "#475569", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>Taksit No</th>
              <th style={{ padding: "8px 12px" }}>Vade Tarihi</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Tutar</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {planItems.map((t) => {
              const isPaid = t.durum === 1;
              return (
                <tr
                  key={t.taksitNo}
                  style={{ borderBottom: "1px solid #f1f5f9", background: isPaid ? "#f0fdf4" : "transparent" }}
                >
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{t.taksitNo}. Taksit</td>
                  <td style={{ padding: "8px 12px" }}>{String(t.vadeTarihi || "").slice(0, 10)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>
                    {fmtCurrency(t.taksitTutari)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        background: isPaid ? "#dcfce7" : "#fef9c3",
                        color: isPaid ? "#15803d" : "#854d0e",
                        fontWeight: 600
                      }}
                    >
                      {isPaid ? "Tahsil Edildi" : "Bekliyor"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Printer size={15} />
              Yazdır
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#e2e8f0",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normTr(str) {
  return String(str || "")
    .trim()
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ");
}

export function MebContractPrintModal({ contract, printStudent, students = [], onClose }) {
  const [showEditDrawer, setShowEditDrawer] = useState(false);

  // Intelligently resolve the full student record if printStudent is missing or partial
  const resolvedStudent = useMemo(() => {
    if (printStudent) return printStudent;
    if (!contract) return null;

    const list = Array.isArray(students) && students.length > 0
      ? students
      : (StudentService?.getAllStudents ? StudentService.getAllStudents() : []);

    if (!list || list.length === 0) return null;

    const sNameNorm = normTr(contract.ogrenciAdi || contract.student_name || contract.ogrenciAdiSoyadi || contract.musteriUnvan || "");
    const sId = String(contract.ogrenciId || contract.studentId || contract.student_id || "");
    const cleanId = sId.replace(/^stu-/, "");
    const szlNo = String(contract.sozlesmeNo || contract.sozlesme_no || "").trim();
    const tc = String(contract.student_tc || contract.studentTc || contract.tc || "").trim();
    const ogrNo = String(contract.ogrenciNo || contract.student_no || "").trim();

    return list.find((s) => {
      if (!s) return false;
      if (szlNo && s.sozlesme_no && String(s.sozlesme_no).trim() === szlNo) return true;
      if (cleanId && (String(s.id) === sId || String(s.id).replace(/^stu-/, "") === cleanId)) return true;
      if (tc && s.student_tc && String(s.student_tc).trim() === tc) return true;
      if (ogrNo && s.student_no && String(s.student_no).trim() === ogrNo) return true;
      if (sNameNorm && normTr(s.student_name) === sNameNorm) return true;
      return false;
    }) || null;
  }, [contract, printStudent, students]);

  // Pure extraction helper: computes auto-filled values from contract and student records
  const computeInitialValues = (cnt, st) => {
    if (!cnt) return {};
    const sName = cnt.ogrenciAdi || cnt.student_name || cnt.ogrenciAdiSoyadi || st?.student_name || cnt.musteriUnvan || "";
    const sNameNorm = normTr(sName);

    const isInvalidParent = (val) => {
      const n = normTr(val);
      return !n || n === "—" || n === "-" || n === "VELİ" || n === "VELI" || n === "BELİRTİLMEDİ" || (sNameNorm && n === sNameNorm);
    };

    let pName = "";
    if (!isInvalidParent(cnt.parent_name)) pName = cnt.parent_name;
    else if (!isInvalidParent(cnt.veliAdi)) pName = cnt.veliAdi;
    else if (!isInvalidParent(st?.parent_name)) pName = st.parent_name;
    else if (!isInvalidParent(st?.guardian_name)) pName = st.guardian_name;
    else if (!isInvalidParent(st?.father_name)) pName = st.father_name;
    else if (!isInvalidParent(st?.mother_name)) pName = st.mother_name;
    else if (!isInvalidParent(cnt.musteriUnvan)) pName = cnt.musteriUnvan;

    const rawPhone = cnt.parent_phone || cnt.veliTelefon || st?.parent_phone || st?.guardian_phone || st?.father_phone || st?.mother_phone || cnt.musteriTelefon || st?.student_phone || cnt.student_phone || "";
    const pPhone = rawPhone !== "—" ? rawPhone : "";

    const cNo = cnt.sozlesmeNo || cnt.sozlesme_no || st?.sozlesme_no || (cnt.id ? String(cnt.id) : "MEB-2026-001");

    const rawDate = cnt.sozlesmeTarihi || cnt.sozlesme_tarihi || cnt.contract_date || cnt.created_at || st?.sozlesme_tarihi;
    const dFormatted = fmtDate(rawDate);
    const cDate = dFormatted !== "—" ? dFormatted : new Date().toLocaleDateString("tr-TR");

    const tc = cnt.student_tc || cnt.studentTc || cnt.tc || st?.student_tc || st?.tc || st?.tckn || "";

    const sClass = cnt.sinifAdi || cnt.student_class || st?.student_class || st?.class_level || st?.sinif || "Mezun / YKS";

    const sPeriod = cnt.donemAdi || cnt.period_name || cnt.donem_adi || st?.donem_adi || st?.term || "2026-2027 Eğitim-Öğretim Dönemi";

    const rawFee = cnt.brutTutar ?? cnt.brut_tutar ?? cnt.total_amount ?? cnt.netTutar ?? st?.total_fee ?? 0;
    const grossFee = Number(rawFee) || 0;

    const rawInst = cnt.taksitSayisi ?? cnt.taksit_sayisi ?? cnt.installment_count ?? (Array.isArray(cnt.taksitler) ? cnt.taksitler.length : (Array.isArray(cnt.installments) ? cnt.installments.length : 1));
    const instCount = Math.max(1, Number(rawInst) || 1);

    const planText = cnt.odemeTuruText || cnt.odeme_turu_text || (instCount > 1 ? `Taksitli (${instCount} Taksit)` : "Peşin");

    const officer = cnt.kurumImzalayan || cnt.kurum_imzalayan || "Osman SEYMEN - Özel İnegöl Çözüm Kurs Merkezi";

    return {
      cNo,
      cDate,
      tc,
      sName,
      pName,
      pPhone,
      sClass,
      sPeriod,
      grossFee,
      instCount,
      planText,
      officer
    };
  };

  const initialVals = useMemo(() => computeInitialValues(contract, resolvedStudent), [contract, resolvedStudent]);

  const [editableContractNo, setEditableContractNo] = useState(() => initialVals.cNo || "MEB-2026-001");
  const [editableContractDate, setEditableContractDate] = useState(() => initialVals.cDate || new Date().toLocaleDateString("tr-TR"));
  const [editableStudentTc, setEditableStudentTc] = useState(() => initialVals.tc || "");
  const [editableStudentName, setEditableStudentName] = useState(() => initialVals.sName || "");
  const [editableParentName, setEditableParentName] = useState(() => initialVals.pName || "");
  const [editableParentPhone, setEditableParentPhone] = useState(() => initialVals.pPhone || "");
  const [editableClass, setEditableClass] = useState(() => initialVals.sClass || "Mezun / YKS");
  const [editablePeriod, setEditablePeriod] = useState(() => initialVals.sPeriod || "2026-2027 Eğitim-Öğretim Dönemi");
  const [editableGrossFee, setEditableGrossFee] = useState(() => initialVals.grossFee || 0);
  const [editableInstallments, setEditableInstallments] = useState(() => initialVals.instCount || 1);
  const [editableOfficer, setEditableOfficer] = useState(() => initialVals.officer || "Osman SEYMEN - Özel İnegöl Çözüm Kurs Merkezi");
  const [editablePaymentPlanText, setEditablePaymentPlanText] = useState(() => initialVals.planText || "Peşin");

  // Keep state synchronized whenever contract or resolvedStudent updates
  useEffect(() => {
    if (!contract) return;
    const v = computeInitialValues(contract, resolvedStudent);
    setEditableContractNo(v.cNo || "MEB-2026-001");
    setEditableContractDate(v.cDate || new Date().toLocaleDateString("tr-TR"));
    setEditableStudentTc(v.tc || "");
    setEditableStudentName(v.sName || "");
    setEditableParentName(v.pName || "");
    setEditableParentPhone(v.pPhone || "");
    setEditableClass(v.sClass || "Mezun / YKS");
    setEditablePeriod(v.sPeriod || "2026-2027 Eğitim-Öğretim Dönemi");
    setEditableGrossFee(v.grossFee || 0);
    setEditableInstallments(v.instCount || 1);
    setEditableOfficer(v.officer || "Osman SEYMEN - Özel İnegöl Çözüm Kurs Merkezi");
    setEditablePaymentPlanText(v.planText || "Peşin");
  }, [contract, resolvedStudent]);

  const handleResetToOriginal = () => {
    const v = computeInitialValues(contract, resolvedStudent);
    setEditableContractNo(v.cNo || "MEB-2026-001");
    setEditableContractDate(v.cDate || new Date().toLocaleDateString("tr-TR"));
    setEditableStudentTc(v.tc || "");
    setEditableStudentName(v.sName || "");
    setEditableParentName(v.pName || "");
    setEditableParentPhone(v.pPhone || "");
    setEditableClass(v.sClass || "Mezun / YKS");
    setEditablePeriod(v.sPeriod || "2026-2027 Eğitim-Öğretim Dönemi");
    setEditableGrossFee(v.grossFee || 0);
    setEditableInstallments(v.instCount || 1);
    setEditableOfficer(v.officer || "Osman SEYMEN - Özel İnegöl Çözüm Kurs Merkezi");
    setEditablePaymentPlanText(v.planText || "Peşin");
  };

  if (!contract) return null;

  return (
    <div
      className="modal-backdrop meb-contract-modal-backdrop"
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
        zIndex: 100000,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        className="modal meb-contract-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "850px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          padding: "30px",
          fontFamily: "Times New Roman, serif"
        }}
      >
        <div
          className="no-print"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontFamily: "sans-serif" }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setShowEditDrawer(!showEditDrawer)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: showEditDrawer ? "#eff6ff" : "#f1f5f9",
                color: "#1e3a8a",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Edit3 size={15} color="#2563eb" /> {showEditDrawer ? "Düzenlemeyi Kapat" : "Sözleşmeyi Düzenle"}
            </button>
            <button
              type="button"
              data-testid="meb-modal-print-btn"
              onClick={() => {
                try {
                  document.body.classList.add("meb-print-active");
                } catch {}
                window.print();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Printer size={16} /> Yazdır / PDF Kaydet
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Kapat
          </button>
        </div>

        {/* PRATİK ÖNİZLEME & DÜZENLEME PANELİ (Yazdırmada gizlenir - Makbuz modalındaki gibi) */}
        <div
          className="no-print"
          style={{
            marginBottom: "16px",
            background: showEditDrawer ? "#eff6ff" : "#f1f5f9",
            border: showEditDrawer ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "12px 16px",
            fontFamily: "'Inter', system-ui, sans-serif"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Edit3 size={15} color="#2563eb" />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e3a8a" }}>
                Hızlı Sözleşme Düzenleme & Önizleme
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                (Yazdırmadan önce sözleşme üzerindeki bilgileri buradan değiştirebilirsiniz)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {showEditDrawer && (
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                  title="Orijinal değerlere geri dön"
                >
                  <RotateCcw size={13} /> Sıfırla
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowEditDrawer(!showEditDrawer)}
                style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
              >
                {showEditDrawer ? "Gizle ▲" : "Düzenle ▼"}
              </button>
            </div>
          </div>

          {showEditDrawer && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #bfdbfe" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Öğrenci Adı Soyadı</label>
                <input
                  type="text"
                  value={editableStudentName}
                  onChange={(e) => setEditableStudentName(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>T.C. Kimlik No</label>
                <input
                  type="text"
                  value={editableStudentTc}
                  onChange={(e) => setEditableStudentTc(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Veli / Vasi Adı Soyadı</label>
                <input
                  type="text"
                  value={editableParentName}
                  onChange={(e) => setEditableParentName(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Veli Telefon</label>
                <input
                  type="text"
                  value={editableParentPhone}
                  onChange={(e) => setEditableParentPhone(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Sınıf / Program</label>
                <input
                  type="text"
                  value={editableClass}
                  onChange={(e) => setEditableClass(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Eğitim Dönemi</label>
                <input
                  type="text"
                  value={editablePeriod}
                  onChange={(e) => setEditablePeriod(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Öğrenim Ücreti (Brüt TL)</label>
                <input
                  type="number"
                  value={editableGrossFee}
                  onChange={(e) => setEditableGrossFee(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Taksit Sayısı</label>
                <input
                  type="number"
                  min="1"
                  value={editableInstallments}
                  onChange={(e) => {
                    const cnt = Math.max(1, Number(e.target.value));
                    setEditableInstallments(cnt);
                    setEditablePaymentPlanText(cnt > 1 ? `Taksitli (${cnt} Taksit)` : "Peşin");
                  }}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Sözleşme No / Tarih</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input
                    type="text"
                    value={editableContractNo}
                    onChange={(e) => setEditableContractNo(e.target.value)}
                    placeholder="Sözleşme No"
                    style={{ width: "50%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                  />
                  <input
                    type="text"
                    value={editableContractDate}
                    onChange={(e) => setEditableContractDate(e.target.value)}
                    placeholder="Tarih"
                    style={{ width: "50%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Kurum Yetkilisi / Müdür</label>
                <input
                  type="text"
                  value={editableOfficer}
                  onChange={(e) => setEditableOfficer(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "3px" }}>Ödeme Şekli & Vade Planı Açıklaması</label>
                <input
                  type="text"
                  value={editablePaymentPlanText}
                  onChange={(e) => setEditablePaymentPlanText(e.target.value)}
                  style={{ width: "100%", padding: "6px 9px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "5px", background: "#fff" }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="meb-contract-sheet"
          style={{
            boxSizing: "border-box",
            border: "2px solid #000",
            padding: "18px 24px",
            backgroundColor: "#fff",
            color: "#000",
            fontFamily: "'Times New Roman', Times, serif",
            minHeight: "255mm",
            maxHeight: "268mm",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "1.5px solid #000", paddingBottom: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "0.5px" }}>T.C.</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "0.5px" }}>MİLLÎ EĞİTİM BAKANLIĞI</div>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>ÖZEL ÖĞRETİM KURUMLARI GENEL MÜDÜRLÜĞÜ</div>
              <h2 style={{ fontSize: "17px", margin: "8px 0 4px 0", textDecoration: "underline", fontWeight: "bold" }}>
                ÖZEL ÖĞRETİM KURUMLARI ÖĞRENCİ KAYIT SÖZLEŞMESİ
              </h2>
              <div style={{ fontSize: "12px", fontStyle: "italic" }}>
                Sözleşme No: {editableContractNo} · Düzenleme Tarihi: {editableContractDate}
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", marginBottom: "16px" }}>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", width: "34%", background: "#f8fafc" }}>
                    KURUMUN ADI VE KODU:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold" }}>
                    ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ (MEB Kurum Kodu: 627201)
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    KURUM ADRESİ & TELEFON:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px" }}>
                    Kemalpaşa Mah. Ilıca Sk. No:31/33A İnegöl / BURSA · Tel: 0224 715 00 02
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    T.C. KİMLİK NO:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px" }}>
                    {editableStudentTc || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    ÖĞRENCİNİN ADI SOYADI:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold" }}>
                    {editableStudentName || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    VELİ / VASİ ADI SOYADI:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px" }}>
                    {editableParentName || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    VELİ İLETİŞİM (TELEFON):
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px" }}>
                    {editableParentPhone || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    SINIFI / ÖĞRETİM PROGRAMI:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px" }}>
                    {editableClass || "—"} ({editablePeriod || "2026-2027 Eğitim-Öğretim Dönemi"})
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    ÖĞRENİM ÜCRETİ (BRÜT):
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", fontSize: "13.5px" }}>
                    {fmtCurrency(editableGrossFee)} (KDV Dahil)
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "7px 10px", fontWeight: "bold", background: "#f8fafc" }}>
                    ÖDEME ŞEKLİ & VADE PLANI:
                  </td>
                  <td style={{ border: "1px solid #000", padding: "7px 10px" }}>
                    {editablePaymentPlanText || (editableInstallments > 1 ? `Taksitli (${editableInstallments} Taksit)` : "Peşin")} · Başlangıç:{" "}
                    {fmtDate(contract.baslamaTarihi || "2026-10-01")} - Bitiş: {fmtDate(contract.bitisTarihi || "2027-06-30")}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ border: "1px solid #000", padding: "8px 12px", marginBottom: "14px", backgroundColor: "#fafafa", fontSize: "11.5px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px", textDecoration: "underline" }}>ÖDEME VE TAKSİT PLANI ÖZETİ</div>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <span>
                  <b>Toplam Sözleşme Bedeli:</b> {fmtCurrency(editableGrossFee)}
                </span>
                <span>
                  <b>Taksit Sayısı:</b> {editableInstallments || 1} Taksit
                </span>
                <span>
                  <b>Aylık Ortalama Taksit:</b>{" "}
                  {fmtCurrency(
                    Number(editableGrossFee) / Math.max(1, Number(editableInstallments) || 1)
                  )}
                </span>
              </div>
            </div>

            <div style={{ fontSize: "11.5px", lineHeight: "1.55", textAlign: "justify", marginBottom: "16px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "6px", textDecoration: "underline" }}>
                SÖZLEŞME HÜKÜMLERİ VE GENEL ŞARTLAR
              </div>
              <p style={{ margin: "0 0 6px 0" }}>
                <b>Madde 1 (Dayanak):</b> Bu sözleşme; 5580 sayılı Özel Öğretim Kurumları Kanunu ile bu Kanuna dayanılarak çıkarılan Millî
                Eğitim Bakanlığı Özel Öğretim Kurumları Yönetmeliği hükümlerine uygun olarak taraflar arasında iki nüsha halinde
                düzenlenmiştir.
              </p>
              <p style={{ margin: "0 0 6px 0" }}>
                <b>Madde 2 (Mali Yükümlülükler):</b> Öğrenci velisi/vasisi, sözleşmede kararlaştırılan toplam öğrenim ücretini yukarıda
                belirtilen ödeme planı ve taksit vadelerinde kuruma tam ve eksiksiz olarak ödemeyi kabul ve taahhüt eder. Vadelerinde
                ödenmeyen taksitler için yasal gecikme hükümleri uygulanır.
              </p>
              <p style={{ margin: "0 0 6px 0" }}>
                <b>Madde 3 (Eğitim Hizmeti):</b> Kurum, Millî Eğitim Bakanlığı mevzuatı ve onaylı öğretim programı çerçevesinde ders,
                deneme sınavı, soru çözümü, birebir etüt ve rehberlik hizmetlerini eksiksiz yürütmekle yükümlüdür.
              </p>
              <p style={{ margin: "0 0 6px 0" }}>
                <b>Madde 4 (Kayıt İptali ve Ayrılma):</b> Öğrencinin kurumdan ayrılması veya kaydının iptal edilmesi durumunda; MEB Özel
                Öğretim Kurumları Yönetmeliği'nin ücret iadesine ilişkin hükümleri uyarınca öğrenim gördüğü gün ve ders saatleri
                hesaplanarak mahsup işlemi yapılır.
              </p>
              <p style={{ margin: "0 0 6px 0" }}>
                <b>Madde 5 (Kurum Kuralları ve Devam):</b> Öğrenci, kurumun iç işleyiş, disiplin ve devam-devamsızlık kurallarına uymakla
                yükümlüdür. Devamsızlık ve akademik gelişim bilgileri veliye SMS/WhatsApp ve sistem üzerinden düzenli olarak bildirilir.
              </p>
              <p style={{ margin: "0" }}>
                <b>Madde 6 (Uyuşmazlıkların Çözümü):</b> İşbu sözleşmeden doğabilecek her türlü hukuki uyuşmazlığın çözümünde İnegöl
                Mahkemeleri ve İcra Daireleri yetkilidir.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #000", pageBreakInside: "avoid", breakInside: "avoid" }}>
            <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
              <div style={{ width: "44%" }}>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>VELİ / VASİ</div>
                <div style={{ fontSize: "11.5px", marginTop: "4px" }}>
                  {editableParentName || editableStudentName || "—"}
                </div>
                <div style={{ marginTop: "36px", borderTop: "1px solid #000", paddingTop: "4px", fontSize: "11px" }}>
                  Okudum, Bir Nüshasını Teslim Aldım (İmza)
                </div>
              </div>

              <div style={{ width: "44%" }}>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>KURUM YETKİLİSİ</div>
                <div style={{ fontSize: "11.5px", marginTop: "4px" }}>{editableOfficer}</div>
                <div style={{ marginTop: "36px", borderTop: "1px solid #000", paddingTop: "4px", fontSize: "11px" }}>
                  Kaşe / Mühür ve İmza
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContractSummaryModal({ contract, onClose, onOpenMebPrint, onOpenGelir }) {
  if (!contract) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "750px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Sözleşme Detayı · {contract.sozlesmeNo}
              </h3>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {contract.donemAdi || "2026-2027"} Dönemi · Onay Tarihi: {fmtDate(contract.onayTarihi || contract.sozlesmeTarihi)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
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

        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginBottom: "18px"
            }}
          >
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>ÖĞRENCİ / MÜŞTERİ</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                {contract.ogrenciAdi || contract.musteriUnvan}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Sınıf: {contract.sinifAdi || "—"} · Müşteri ID: {contract.muH_MusteriId || contract.ogrenciId}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>ÖDEME MODELİ</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                {contract.odemeTuruText || "Taksitli"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {contract.taksitSayisi ? `${contract.taksitSayisi} Eşit Taksit` : "Tek Çekim / Peşin"}
              </div>
            </div>

            <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>TOPLAM SÖZLEŞME BEDELİ</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#15803d", marginTop: "2px" }}>
                {fmtCurrency(contract.brutTutar)}
              </div>
              <div style={{ fontSize: "11px", color: "#166534" }}>
                Net: {fmtCurrency(contract.netTutar)} + KDV: {fmtCurrency(contract.kdvTutari)}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#334155" }}>Mali Döküm</h4>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>Hizmet Bedeli (Net):</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(contract.netTutar)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>Uygulanan İndirim:</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right", color: "#dc2626" }}>
                      {contract.indirimTutari ? `-${fmtCurrency(contract.indirimTutari)}` : "₺0,00"}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>KDV Tutarı (%10):</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(contract.kdvTutari)}</td>
                  </tr>
                  <tr style={{ backgroundColor: "#fafafa" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>Genel Toplam (Brüt):</td>
                    <td style={{ padding: "8px 12px", fontWeight: 800, textAlign: "right", color: "#16a34a", fontSize: "14px" }}>
                      {fmtCurrency(contract.brutTutar)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              background: "#f8fafc",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0"
            }}
          >
            <div>
              <b>Sözleşme Başlangıç / Bitiş:</b> {fmtDate(contract.baslamaTarihi)} — {fmtDate(contract.bitisTarihi)}
            </div>
            <div style={{ marginTop: "4px" }}>
              <b>Sistem Notu:</b> {contract.onayNotu || contract.aciklama || "Otomatik onay (gelir oluşturma)"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderTop: "1px solid #e2e8f0",
            background: "#fafafa",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {contract.sozlesmeUrl ? (
              <a
                href={contract.sozlesmeUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                <ExternalLink size={14} />
                Orijinal Edesis PDF'ini Aç
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => onOpenMebPrint && onOpenMebPrint(contract)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#fff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Printer size={14} />
              Resmî MEB Sözleşmesini Yazdır
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenGelir) onOpenGelir(contract);
                onClose();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                color: "#166534",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Coins size={14} />
              Gelir Detayına Git
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#e2e8f0",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer"
            }}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export function CancelContractModal({ contract, cancelReason, setCancelReason, onClose, onConfirm, saving=false }) {
  if (!contract) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "500px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", color: "#b45309" }}>
          <Ban size={24} />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Sözleşmeyi İptal Et</h3>
        </div>
        <p style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
          <b>{contract.sozlesmeNo}</b> numaralı ({contract.ogrenciAdi}) sözleşmesini iptal etmek üzeresiniz. Lütfen iptal gerekçesini yazınız:
        </p>
        <p style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600, marginBottom: "12px" }}>
          Kalan sözleşme alacağı kapatılır ve yeni tahsilat durdurulur. Tahsilat geçmişi korunur; otomatik para iadesi yapılmaz.
        </p>
        <textarea
          rows={3}
          placeholder="İptal gerekçesi (Örn: Veli talebiyle kayıt iptali, nakil vb.)..."
          value={cancelReason}
          disabled={saving}
          maxLength={2000}
          onChange={(e) => setCancelReason(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            outline: "none",
            marginBottom: "16px",
            fontFamily: "inherit"
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {saving ? 'Kaydediliyor…' : 'İptal Et'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContractTemplateModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "600px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "12px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={22} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Sözleşme Şablon Yönetimi</h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <div
            style={{
              border: "1px solid #e2e8f0",
              padding: "12px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>MEB Standart Öğrenci Kayıt Sözleşmesi (Şablon #802)</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Resmî MEB mevzuatına uygun, 10-12 taksit ve peşin formatlı</div>
            </div>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                background: "#dcfce7",
                color: "#15803d",
                borderRadius: "4px",
                fontWeight: 600
              }}
            >
              Varsayılan
            </span>
          </div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              padding: "12px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>Yaz Okulu & Hızlandırma Sözleşmesi</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Yaz dönemi kurs kayıtları için kısa süreli sözleşme</div>
            </div>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                background: "#f1f5f9",
                color: "#475569",
                borderRadius: "4px",
                fontWeight: 600
              }}
            >
              Aktif
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}

export function NewContractWizardModal({
  open,
  onClose,
  allRegisteredStudents,
  students,
  selectedStudentForContract,
  setSelectedStudentForContract,
  contractStudentName,
  setContractStudentName,
  contractStudentClass,
  setContractStudentClass,
  contractParentName,
  setContractParentName,
  contractParentPhone,
  setContractParentPhone,
  contractParentRelation,
  setContractParentRelation,
  contractAmount,
  setContractAmount,
  contractInstallments,
  setContractInstallments,
  contractDueDate,
  setContractDueDate,
  setContractsList,
  showToast
}) {
  if (!open) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "680px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          overflowY: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "12px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Plus size={22} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Yeni Sözleşme Tanımla</h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
try {

            e.preventDefault();
            if (!contractStudentName.trim()) {
              showToast("⚠️ Lütfen öğrenci adını giriniz.");
              return;
            }

            const finalParent = contractParentName.trim() || contractStudentName.trim();
            const res = await AccountingService.addNewIncome({
              studentId: selectedStudentForContract?.id,
              ogrenciAdi: contractStudentName.trim(),
              veliAdi: finalParent,
              sinifAdi: contractStudentClass || "Genel",
              brutTutar: Number(contractAmount) || 0,
              taksitSayisi: Number(contractInstallments) || 1,
              vadeTarihi: contractDueDate,
              aciklama: "Kayıt Sözleşmesi"
            });

            const normName = contractStudentName.trim().toUpperCase();
            const targetStudent =
              selectedStudentForContract ||
              allRegisteredStudents.find((st) => (st.student_name || "").trim().toUpperCase() === normName);

            if (targetStudent) {
              const patch={};
              if(finalParent!==targetStudent.parent_name)patch.parent_name=finalParent;
              if(contractParentPhone.trim()&&contractParentPhone.trim()!==targetStudent.parent_phone)patch.parent_phone=contractParentPhone.trim();
              if(contractParentRelation&&contractParentRelation!==targetStudent.parent_relation)patch.parent_relation=contractParentRelation;
              if(Object.keys(patch).length){
                patch._expected=Object.fromEntries(Object.keys(patch).map(k=>[k,targetStudent[k]??null]));
                await StudentService.saveStudent({id:targetStudent.id,...patch});
              }
            }

            setContractsList(AccountingService.getContracts(students));
            showToast(`✅ ${res.contract?.sozlesmeNo || "Yeni"} numaralı yeni sözleşme kaydedildi.`);
            onClose();

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
}}
        >
          <div style={{ marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}
            >
              <Users size={14} color="#2563eb" /> Kayıtlı Öğrencilerden Seç (Önerilen)
            </label>
            <select
              value={selectedStudentForContract?.id || ""}
              onChange={(e) => {
                const targetId = e.target.value;
                const found = allRegisteredStudents.find((st) => String(st.id) === String(targetId));
                if (found) {
                  setSelectedStudentForContract(found);
                  setContractStudentName(found.student_name || "");
                  setContractStudentClass(found.student_class || "Genel");
                  setContractParentName(
                    found.parent_name && found.parent_name !== "Belirtilmedi" ? found.parent_name : ""
                  );
                  setContractParentPhone(found.parent_phone || "");
                  setContractParentRelation(found.parent_relation || "Veli");
                  if (found.total_fee && Number(found.total_fee) > 0) {
                    setContractAmount(Number(found.total_fee));
                  }
                } else {
                  setSelectedStudentForContract(null);
                }
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 500
              }}
            >
              <option value="">-- Kayıtlı Öğrenci Seçin veya Manuel Girin --</option>
              {allRegisteredStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.student_name} {st.student_class ? `(${st.student_class})` : ""}{" "}
                  {st.parent_name && st.parent_name !== "Belirtilmedi" ? `— Veli: ${st.parent_name}` : ""}
                </option>
              ))}
            </select>
            {selectedStudentForContract && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "11px",
                  color: "#16a34a",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <UserCheck size={13} /> Öğrenci ve veli bilgileri otomatik çekildi. Dilerseniz alanları aşağıdan düzenleyebilirsiniz.
              </div>
            )}
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
              1. Öğrenci Bilgileri
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Öğrenci Adı Soyadı *</label>
                <input
                  required
                  value={contractStudentName}
                  onChange={(e) => setContractStudentName(e.target.value)}
                  placeholder="Örn: AHMET YILMAZ"
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Sınıf / Şube</label>
                <input
                  value={contractStudentClass}
                  onChange={(e) => setContractStudentClass(e.target.value)}
                  placeholder="Örn: 8-A"
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "14px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
              2. Veli Bilgileri (Sözleşmede Müşteri Olarak Görünecektir)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Veli Adı Soyadı *</label>
                <input
                  required
                  value={contractParentName}
                  onChange={(e) => setContractParentName(e.target.value)}
                  placeholder="Örn: MEHMET YILMAZ"
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Veli Telefonu</label>
                <input
                  value={contractParentPhone}
                  onChange={(e) => setContractParentPhone(e.target.value)}
                  placeholder="Örn: (532) 000 00 00"
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Yakınlık</label>
                <select
                  value={contractParentRelation}
                  onChange={(e) => setContractParentRelation(e.target.value)}
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                >
                  <option value="Baba">Baba (♂)</option>
                  <option value="Anne">Anne (♀)</option>
                  <option value="Veli">Veli (👤)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
              3. Sözleşme & Ödeme Planı
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Sözleşme Brüt Tutarı (TL) *</label>
                <input
                  required
                  type="number"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(Number(e.target.value))}
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Taksit Sayısı</label>
                <select
                  value={contractInstallments}
                  onChange={(e) => setContractInstallments(Number(e.target.value))}
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                >
                  <option value="1">Peşin (1 Taksit)</option>
                  <option value="6">6 Taksit</option>
                  <option value="8">8 Taksit</option>
                  <option value="9">9 Taksit</option>
                  <option value="10">10 Taksit (Standart)</option>
                  <option value="11">11 Taksit</option>
                  <option value="12">12 Taksit</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>İlk Taksit Vade Tarihi</label>
                <input
                  type="date"
                  value={contractDueDate}
                  onChange={(e) => setContractDueDate(e.target.value)}
                  style={{ padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "18px",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "14px"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
                color: "#475569"
              }}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 20px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Sözleşmeyi Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
