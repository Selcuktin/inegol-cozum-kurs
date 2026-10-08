import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Calendar,
  Search,
  Download,
  Maximize2,
  Minimize2,
  Filter,
  Plus,
  Settings,
  Eye,
  Printer,
  X,
  ChevronDown,
  Trash2,
  Ban,
  FileSpreadsheet,
  ExternalLink,
  Receipt,
  Coins,
  Clock,
  ArrowLeft,
  Check,
  Users,
  UserCheck
} from "lucide-react";
import edesisData from "../data/edesisAccountingData.json";
import AccountingService from "../lib/edesisAccountingService";
import { StudentService } from "../lib/edesisStudentService";
import EdesisSozlesmeDetay from "./EdesisSozlesmeDetay";
import { trIncludes } from "../lib/utils";

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

export default function EdesisSozlesmeler({ students = [], payments = [], onOpenGelir, onNavigate }) {
  const [contractsList, setContractsList] = useState(() => AccountingService.getContracts(students));

  useEffect(() => {
    AccountingService.syncDeletedWithRemote().catch(() => {});
  }, []);

  useEffect(() => {
    setContractsList(AccountingService.getContracts(students));
  }, [students]);

  useEffect(() => {
    const handleUpdate = () => {
      setContractsList(AccountingService.getContracts(students));
    };
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
      window.removeEventListener("cozum_students_updated", handleUpdate);
    };
  }, [students]);

  const gelirMap = useMemo(() => {
    const map = {};
    (AccountingService.getIncomes(students) || []).forEach((g) => {
      if (g.sozlesmeNo) {
        map[g.sozlesmeNo] = g;
      }
    });
    return map;
  }, [students]);  // contractsList excluded: gelirMap only uses students, contractsList dep caused double recompute
  const [periodFilter, setPeriodFilter] = useState("113"); // 113: 2026-2027 (Default 64 records), 40: 2025-2026, 142: 2026-2027-YAZ, -1: Tümü
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "draft", "canceled"
  const [customerFilter, setCustomerFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sorting: Default to latest date descending
  const [sortField, setSortField] = useState("sozlesmeTarihi");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals & UI States
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const getTargetContractKey = () => {
    try {
      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem("cozum_open_contract_no");
        if (saved) return saved;
        const hash = window.location.hash || "";
        if (hash.includes("?id=")) {
          const m = hash.match(/\?id=([^&]+)/);
          if (m && m[1]) return decodeURIComponent(m[1]);
        }
        if (hash.includes("?sozlesme=")) {
          const m = hash.match(/\?sozlesme=([^&]+)/);
          if (m && m[1]) return decodeURIComponent(m[1]);
        }
      }
    } catch {}
    return null;
  };

  const findMatchingContract = (targetKey, list = []) => {
    if (!targetKey || !Array.isArray(list) || list.length === 0) return null;
    const norm = (s) => (s != null ? String(s) : "").trim().replace(/i/g, "İ").replace(/ı/g, "I").toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
    const normKey = norm(targetKey);
    return list.find((c) => {
      if (!c) return false;
      if (c.sozlesmeNo && String(c.sozlesmeNo) === String(targetKey)) return true;
      if (c.id != null && String(c.id) === String(targetKey)) return true;
      if (c.studentId != null && String(c.studentId) === String(targetKey)) return true;
      if (c.ogrenciNo != null && String(c.ogrenciNo) === String(targetKey)) return true;
      if (norm(c.sozlesmeNo) === normKey) return true;
      if (norm(c.id) === normKey) return true;
      if (norm(c.ogrenciAdi) === normKey) return true;
      if (norm(c.ogrenciAdiSoyadi) === normKey) return true;
      if (norm(c.musteriUnvan) === normKey) return true;
      return false;
    }) || null;
  };

  const [selectedContract, setSelectedContract] = useState(() => {
    try {
      const targetKey = getTargetContractKey();
      if (targetKey) {
        const all = AccountingService.getContracts(students);
        return findMatchingContract(targetKey, all);
      }
    } catch {}
    return null;
  });

  const handleSelectContract = (c) => {
    setSelectedContract(c);
    if (c) {
      const key = c.sozlesmeNo || c.id;
      try {
        sessionStorage.setItem("cozum_open_contract_no", key);
        window.location.hash = `documents?id=${encodeURIComponent(key)}`;
      } catch {}
    }
  };

  useEffect(() => {
    try {
      const targetKey = getTargetContractKey();
      if (targetKey) {
        const found = findMatchingContract(targetKey, contractsList);
        if (found) {
          setSelectedContract(found);
        }
      }
    } catch {}
  }, [contractsList, students]);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(null);
  const [showMebPrintModal, setShowMebPrintModal] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const allRegisteredStudents = useMemo(() => {
    try {
      const list = StudentService.getAllStudents(students);
      return Array.isArray(list) ? list : [];
    } catch {
      return Array.isArray(students) ? students : [];
    }
  }, [students]);

  // New contract form states
  const [selectedStudentForContract, setSelectedStudentForContract] = useState(null);
  const [contractStudentName, setContractStudentName] = useState("");
  const [contractStudentClass, setContractStudentClass] = useState("8-A");
  const [contractParentName, setContractParentName] = useState("");
  const [contractParentPhone, setContractParentPhone] = useState("");
  const [contractParentRelation, setContractParentRelation] = useState("Veli");
  const [contractAmount, setContractAmount] = useState(75000);
  const [contractInstallments, setContractInstallments] = useState(10);
  const [contractDueDate, setContractDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleOpenNewContract = (preSelectedStudent = null) => {
    if (preSelectedStudent) {
      setSelectedStudentForContract(preSelectedStudent);
      setContractStudentName(preSelectedStudent.student_name || "");
      setContractStudentClass(preSelectedStudent.student_class || "8-A");
      setContractParentName(
        preSelectedStudent.parent_name && preSelectedStudent.parent_name !== "Belirtilmedi"
          ? preSelectedStudent.parent_name
          : ""
      );
      setContractParentPhone(preSelectedStudent.parent_phone || "");
      setContractParentRelation(preSelectedStudent.parent_relation || "Veli");
      setContractAmount(preSelectedStudent.total_fee ? Number(preSelectedStudent.total_fee) : 75000);
    } else {
      setSelectedStudentForContract(null);
      setContractStudentName("");
      setContractStudentClass("8-A");
      setContractParentName("");
      setContractParentPhone("");
      setContractParentRelation("Veli");
      setContractAmount(75000);
    }
    setContractInstallments(10);
    setContractDueDate(new Date().toISOString().slice(0, 10));
    setShowNewContractModal(true);
  };

  useEffect(() => {
    try {
      const studentId = sessionStorage.getItem("cozum_new_contract_student_id");
      if (studentId) {
        sessionStorage.removeItem("cozum_new_contract_student_id");
        const found = allRegisteredStudents.find((st) => String(st.id) === String(studentId));
        if (found) {
          handleOpenNewContract(found);
        }
      }
    } catch {}
  }, [allRegisteredStudents]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Distinct customer list for the customer filter dropdown
  const customerOptions = useMemo(() => {
    const set = new Set();
    contractsList.forEach((c) => {
      const name = (c.ogrenciAdi || c.musteriUnvan || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [contractsList]);

  // Filtered & Sorted contracts
  const filteredContracts = useMemo(() => {
    return contractsList.filter((c) => {
      // Period filter
      if (periodFilter !== "-1" && String(c.donemId) !== String(periodFilter)) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && c.durum !== 1) return false;
      if (statusFilter === "draft" && c.durum !== 0) return false;
      if (statusFilter === "canceled" && c.durum !== 3) return false;

      // Customer filter
      if (customerFilter !== "all") {
        const cName = (c.ogrenciAdi || c.musteriUnvan || "").trim();
        if (cName !== customerFilter) return false;
      }

      // Date range filter
      if (startDate && c.sozlesmeTarihi) {
        if (c.sozlesmeTarihi.slice(0, 10) < startDate) return false;
      }
      if (endDate && c.sozlesmeTarihi) {
        if (c.sozlesmeTarihi.slice(0, 10) > endDate) return false;
      }

      // Search query (Sözleşme no, müşteri, veli, sınıf vb.)
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const match =
          trIncludes(c.sozlesmeNo, q) ||
          trIncludes(c.ogrenciAdi, q) ||
          trIncludes(c.musteriUnvan, q) ||
          trIncludes(c.sinifAdi, q) ||
          trIncludes(c.aciklama, q);
        if (!match) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortField === "sozlesmeTarihi" || sortField === "tarih") {
        const timeA = new Date(String(a.sozlesmeTarihi || a.tarih || a.creationTime || 0).replace(" ", "T")).getTime() || 0;
        const timeB = new Date(String(b.sozlesmeTarihi || b.tarih || b.creationTime || 0).replace(" ", "T")).getTime() || 0;
        if (timeA !== timeB) {
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        }
        const noA = String(a.sozlesmeNo || "");
        const noB = String(b.sozlesmeNo || "");
        return sortOrder === "asc" ? noA.localeCompare(noB) : noB.localeCompare(noA);
      }
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [contractsList, periodFilter, statusFilter, customerFilter, startDate, endDate, searchQuery, sortField, sortOrder]);

  // Statistics calculation for the 4 metric cards
  const stats = useMemo(() => {
    // Current period statistics
    const periodRecords = contractsList.filter(
      (c) => periodFilter === "-1" || String(c.donemId) === String(periodFilter)
    );
    const totalCount = periodRecords.length;
    const activeContracts = periodRecords.filter((c) => c.durum === 1);
    const activeAmount = activeContracts.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);
    const draftCount = periodRecords.filter((c) => c.durum === 0).length;
    const canceledCount = periodRecords.filter((c) => c.durum === 3).length;

    return {
      totalCount,
      activeAmount,
      draftCount,
      canceledCount
    };
  }, [contractsList, periodFilter]);

  // Pagination calculation
  const totalRecords = filteredContracts.length;
  const totalPages = pageSize === "all" ? 1 : Math.ceil(totalRecords / (Number(pageSize) || 25));
  const paginatedContracts = useMemo(() => {
    if (pageSize === "all") return filteredContracts;
    const size = Number(pageSize) || 25;
    const start = (currentPage - 1) * size;
    return filteredContracts.slice(start, start + size);
  }, [filteredContracts, currentPage, pageSize]);

  // Sort toggle handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Export to Excel / CSV
  const exportToExcel = () => {
    const headers = ["Sözleşme No", "Tarih", "Müşteri / Öğrenci", "Sınıf", "Dönem", "Net Tutar (TL)", "KDV Tutarı (TL)", "Brüt Tutar (TL)", "Ödeme Türü", "Durum"];
    const rows = filteredContracts.map((c) => [
      c.sozlesmeNo || "",
      fmtDate(c.sozlesmeTarihi),
      c.ogrenciAdi || c.musteriUnvan || "",
      c.sinifAdi || "—",
      c.donemAdi || "",
      (c.netTutar || 0).toFixed(2),
      (c.kdvTutari || 0).toFixed(2),
      (c.brutTutar || 0).toFixed(2),
      c.odemeTuruText || "Peşin",
      c.durum === 1 ? "Aktif" : c.durum === 3 ? "İptal" : "Taslak"
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Edesis_Sozlesmeler_${periodFilter === "113" ? "2026-2027" : "Tumu"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✅ Sözleşmeler Excel (CSV) formatında indirildi.");
  };

  // Cancel contract action
  const handleConfirmCancel = () => {
    if (!showCancelModal) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      alert("Lütfen en az 5 karakterlik iptal nedeni belirtiniz.");
      return;
    }
    AccountingService.cancelContract(showCancelModal, cancelReason);
    setContractsList(AccountingService.getContracts(students));
    showToast(`⚠️ ${showCancelModal.sozlesmeNo} numaralı sözleşme iptal edildi.`);
    setShowCancelModal(null);
    setCancelReason("");
  };

  // Delete contract action
  const handleDeleteContract = (contract) => {
    if (window.confirm(`${contract.sozlesmeNo} sözleşmesini silmek istediğinize emin misiniz?`)) {
      AccountingService.deleteContract(contract);
      // Immediately filter from state so activeAmount and totalCount drop instantly on screen
      setContractsList((prev) =>
        prev.filter((c) => c.sozlesmeNo !== contract.sozlesmeNo && c.id !== contract.id)
      );
      showToast(`🗑️ ${contract.sozlesmeNo} sözleşmesi silindi.`);
    }
    setOpenDropdownId(null);
  };

  const printStudent = useMemo(() => {
    if (!showMebPrintModal) return null;
    const norm = (str) => (str || "").trim().replace(/i/g, "İ").replace(/ı/g, "I").toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
    const name = norm(showMebPrintModal.ogrenciAdi || showMebPrintModal.musteriUnvan || "");
    return (allRegisteredStudents || []).find((s) => norm(s.student_name) === name) || null;
  }, [showMebPrintModal, allRegisteredStudents]);

  const renderPaymentPlanModal = () => {
    if (!showPaymentPlanModal) return null;
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
        onClick={() => setShowPaymentPlanModal(null)}
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
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FileSpreadsheet size={22} color="#2563eb" />
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Ödeme Planı Dökümü</h3>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{showPaymentPlanModal.sozlesmeNo} · {showPaymentPlanModal.ogrenciAdi}</div>
              </div>
            </div>
            <button type="button" onClick={() => setShowPaymentPlanModal(null)} style={{ border: "none", background: "none", cursor: "pointer" }}>
              <X size={20} color="#64748b" />
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", fontSize: "13px" }}>
              <span>Toplam Tutar: <b>{fmtCurrency(showPaymentPlanModal.brutTutar)}</b></span>
              <span>Taksit Sayısı: <b>{showPaymentPlanModal.taksitSayisi || 1}</b></span>
              <span>Ödeme Türü: <b>{showPaymentPlanModal.odemeTuruText}</b></span>
            </div>
          </div>

          {/* Generated Installments Schedule */}
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
              {Array.from({ length: showPaymentPlanModal.taksitSayisi || 1 }, (_, i) => {
                const instNum = i + 1;
                const instAmount = (Number(showPaymentPlanModal.brutTutar) || 0) / (showPaymentPlanModal.taksitSayisi || 1);
                const baseDate = new Date(showPaymentPlanModal.sozlesmeTarihi || new Date());
                baseDate.setMonth(baseDate.getMonth() + i);
                return (
                  <tr key={instNum} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{instNum}. Taksit</td>
                    <td style={{ padding: "8px 12px" }}>{baseDate.toLocaleDateString("tr-TR")}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{fmtCurrency(instAmount)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", background: "#fef9c3", color: "#854d0e", fontWeight: 600 }}>
                        Bekliyor
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
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
              onClick={() => setShowPaymentPlanModal(null)}
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
    );
  };

  const renderMebPrintModal = () => {
    if (!showMebPrintModal) return null;
    return (
      <div
        className="modal-backdrop"
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
        onClick={() => setShowMebPrintModal(null)}
      >
        <div
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
          {/* Action Bar for Modal */}
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                data-testid="meb-modal-print-btn"
                onClick={() => window.print()}
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
              onClick={() => setShowMebPrintModal(null)}
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

          {/* Official MEB Contract Printable Paper */}
          <div style={{ border: "2px solid #000", padding: "30px", backgroundColor: "#fff" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>T.C.</div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>MİLLÎ EĞİTİM BAKANLIĞI</div>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>ÖZEL ÖĞRETİM KURUMLARI GENEL MÜDÜRLÜĞÜ</div>
              <h2 style={{ fontSize: "18px", margin: "10px 0", textDecoration: "underline" }}>
                ÖZEL ÖĞRETİM KURUMLARI ÖĞRENCİ KAYIT SÖZLEŞMESİ
              </h2>
              <div style={{ fontSize: "12px", fontStyle: "italic" }}>
                Sözleşme No: {showMebPrintModal.sozlesmeNo} · Tarih: {fmtDate(showMebPrintModal.sozlesmeTarihi)}
              </div>
            </div>

            {/* Institution & Student Info Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "15px" }}>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold", width: "30%" }}>KURUMUN ADI:</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ (MEB Kurum Kodu: 627201)</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>T.C. KİMLİK NO:</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>{printStudent?.student_tc || "—"}</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>ÖĞRENCİNİN ADI SOYADI:</td>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>{showMebPrintModal.ogrenciAdi || showMebPrintModal.musteriUnvan}</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>VELİ / VASİ ADI SOYADI:</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>{printStudent?.parent_name || showMebPrintModal.musteriUnvan || "—"}</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>VELİ İLETİŞİM (TELEFON):</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>{printStudent?.parent_phone || showMebPrintModal.musteriTelefon || "—"}</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>SINIFI / PROGRAMI:</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>{showMebPrintModal.sinifAdi || "—"} ({showMebPrintModal.donemAdi || "2026-2027"})</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>ÖĞRENİM ÜCRETİ (BRÜT):</td>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold", fontSize: "13px" }}>{fmtCurrency(showMebPrintModal.brutTutar)}</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>ÖDEME ŞEKLİ & VADE:</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>
                    {showMebPrintModal.odemeTuruText || (showMebPrintModal.taksitSayisi > 1 ? `Taksitli (${showMebPrintModal.taksitSayisi} Taksit)` : "Peşin")}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Legal Terms Paragraph */}
            <div style={{ fontSize: "11px", lineHeight: "1.5", textAlign: "justify", marginBottom: "25px" }}>
              <p>
                1. Bu sözleşme; 5580 sayılı Özel Öğretim Kurumları Kanunu ile bu Kanuna dayanılarak çıkarılan Millî Eğitim Bakanlığı Özel Öğretim Kurumları Yönetmeliği hükümlerine uygun olarak düzenlenmiştir.
              </p>
              <p>
                2. Öğrenci velisi, sözleşmede kararlaştırılan öğrenim ücretini belirtilen vadelerde kuruma tam ve eksiksiz olarak ödemeyi kabul ve taahhüt eder.
              </p>
              <p>
                3. Kurum, Millî Eğitim Bakanlığı mevzuatı çerçevesinde eğitim-öğretim hizmetlerini eksiksiz yürütmekle yükümlüdür.
              </p>
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", textAlign: "center" }}>
              <div style={{ width: "40%" }}>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>VELİ / VASİ</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>{printStudent?.parent_name || showMebPrintModal.ogrenciAdi || showMebPrintModal.musteriUnvan}</div>
                <div style={{ marginTop: "40px", borderTop: "1px solid #000", paddingTop: "5px", fontSize: "11px" }}>İmza</div>
              </div>

              <div style={{ width: "40%" }}>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>KURUM YETKİLİSİ</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>Özel İnegöl Çözüm Kurs Merkezi</div>
                <div style={{ marginTop: "40px", borderTop: "1px solid #000", paddingTop: "5px", fontSize: "11px" }}>İmza / Mühür</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const pendingTargetKey = !selectedContract ? getTargetContractKey() : null;
  const isPendingContractFound = pendingTargetKey ? findMatchingContract(pendingTargetKey, contractsList) : null;
  if (pendingTargetKey && !isPendingContractFound && (!students || students.length === 0)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: "30px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "6px" }}>Sözleşme Detayı Yükleniyor...</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>Lütfen bekleyiniz, sözleşme kayıtları senkronize ediliyor.</div>
        </div>
      </div>
    );
  }

  if (selectedContract) {
    return (
      <>
        <EdesisSozlesmeDetay
          contract={selectedContract}
          students={students}
          onBack={() => {
            setSelectedContract(null);
            try {
              sessionStorage.removeItem("cozum_open_contract_no");
              if (window.location.hash.includes("?id=")) {
                window.location.hash = "documents";
              }
              const prev = sessionStorage.getItem("cozum_contract_prev_page");
              if (prev) {
                sessionStorage.removeItem("cozum_contract_prev_page");
                if (onNavigate) onNavigate(prev);
              }
            } catch {}
          }}
          onOpenGelir={onOpenGelir}
          onOpenPrintMeb={(c) => setShowMebPrintModal(c)}
          onOpenPaymentPlan={(c) => setShowPaymentPlanModal(c)}
        />
        {renderPaymentPlanModal()}
        {renderMebPrintModal()}
      </>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#f5f8fa",
        minHeight: "100vh",
        padding: isFullScreen ? "20px 30px" : "15px 24px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1e293b",
        position: isFullScreen ? "fixed" : "relative",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: isFullScreen ? 99999 : "auto",
        overflowY: "auto"
      }}
      onClick={() => {
        if (openDropdownId) setOpenDropdownId(null);
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
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
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.2s ease"
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER & ACTION BUTTONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "#1e293b" }}>
            Sözleşme Listesi
          </h1>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Sözleşme kayıtlarını görüntüleyin ve yönetin
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#059669",
              background: "#ecfdf5",
              padding: "2px 8px",
              borderRadius: "4px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            Muhasebe • Sözleşmeler V2
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            Normal
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
            onClick={() => setShowTemplateModal(true)}
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
            <FileText size={15} color="#2563eb" />
            Şablon Yönetimi
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewContract()}
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
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
            }}
          >
            <Plus size={16} />
            + Yeni Sözleşme
          </button>
        </div>
      </div>

      {/* 4 SUMMARY METRIC CARDS (1:1 with Edesis) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "16px"
        }}
      >
        {/* Card 1: TOPLAM SÖZLEŞME */}
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
              TOPLAM SÖZLEŞME
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
              {stats.totalCount}
            </div>
          </div>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "6px",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileText size={18} />
          </div>
        </div>

        {/* Card 2: AKTİF SÖZLEŞME TUTARI */}
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
              AKTİF SÖZLEŞME TUTARI
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#16a34a", marginTop: "4px" }}>
              {fmtCurrency(stats.activeAmount)}
            </div>
          </div>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "6px",
              background: "#16a34a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Check size={20} strokeWidth={3} />
          </div>
        </div>

        {/* Card 3: TASLAK */}
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
              TASLAK
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
              {stats.draftCount}
            </div>
          </div>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "6px",
              background: "#f59e0b",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileText size={18} />
          </div>
        </div>

        {/* Card 4: İPTAL EDİLEN */}
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
              İPTAL EDİLEN
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
              {stats.canceledCount}
            </div>
          </div>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "6px",
              background: "#ef4444",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Ban size={18} />
          </div>
        </div>
      </div>

      {/* FILTER ROW & SEARCH BAR */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "12px 18px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          marginBottom: "14px"
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
          {/* Left Controls: Dönem Selector + Filtreler Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
                <option value="113">2026-2027 (64 Sözleşme)</option>
                <option value="40">2025-2026 (40 Sözleşme)</option>
                <option value="142">2026-2027-YAZ (15 Sözleşme)</option>
                <option value="-1">Tümü (119 Sözleşme)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                background: showAdvancedFilters ? "#eff6ff" : "#f8fafc",
                border: showAdvancedFilters ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: showAdvancedFilters ? "#1d4ed8" : "#475569",
                cursor: "pointer"
              }}
            >
              <Filter size={14} />
              Filtreler {showAdvancedFilters ? "▲" : "▼"}
            </button>

            {/* Quick Status Chips */}
            <div style={{ display: "inline-flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  background: statusFilter === "all" ? "#2563eb" : "#f1f5f9",
                  color: statusFilter === "all" ? "#fff" : "#475569",
                  cursor: "pointer"
                }}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("active"); setCurrentPage(1); }}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  background: statusFilter === "active" ? "#16a34a" : "#f1f5f9",
                  color: statusFilter === "active" ? "#fff" : "#475569",
                  cursor: "pointer"
                }}
              >
                Aktif
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("canceled"); setCurrentPage(1); }}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  background: statusFilter === "canceled" ? "#ef4444" : "#f1f5f9",
                  color: statusFilter === "canceled" ? "#fff" : "#475569",
                  cursor: "pointer"
                }}
              >
                İptal
              </button>
            </div>
          </div>

          {/* Right Controls: Quick Search Bar */}
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
              />
              <input
                type="text"
                placeholder="Sözleşme no, müşteri, veli adı, TC, telefon..."
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
                <X
                  size={14}
                  color="#94a3b8"
                  style={{ position: "absolute", right: "10px", cursor: "pointer" }}
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>
            <button
              type="button"
              style={{
                padding: "7px 14px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Ara
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
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
            {/* Customer Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "220px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Müşteri</label>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
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
                <option value="all">Tümü</option>
                {customerOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Başlangıç Tarihi</label>
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

            {/* End Date */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Bitiş Tarihi</label>
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

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setCustomerFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "7px 12px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                <X size={13} />
                Temizle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTRACTS DATA TABLE */}
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
                <th style={{ padding: "12px 14px", width: "90px", textAlign: "center" }}>İşlemler</th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("sozlesmeNo")}
                >
                  Sözleşme No {sortField === "sozlesmeNo" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("sozlesmeTarihi")}
                >
                  Tarih {sortField === "sozlesmeTarihi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("ogrenciAdi")}
                >
                  Müşteri {sortField === "ogrenciAdi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("donemAdi")}
                >
                  Dönem {sortField === "donemAdi" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("brutTutar")}
                >
                  Brüt Tutar & Kalan {sortField === "brutTutar" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>Tahsilat</th>
                <th style={{ padding: "12px 14px" }}>Ödeme Türü</th>
                <th
                  style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none", textAlign: "center" }}
                  onClick={() => handleSort("durum")}
                >
                  Durum {sortField === "durum" ? (sortOrder === "asc" ? "↑" : "↓") : "⇅"}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>Kayıt bulunamadı.</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Filtrelerinizi değiştirerek tekrar deneyiniz.</div>
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((c, idx) => {
                  const isMenuOpen = openDropdownId === c.id;
                  const openUpwards = (idx >= paginatedContracts.length - 2 && paginatedContracts.length > 3);
                  const isInstallment = c.taksitSayisi && c.taksitSayisi > 1;

                  return (
                    <tr
                      key={c.id || c.sozlesmeNo}
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
                      {/* 1. İşlemler Dropdown Button */}
                      <td style={{ padding: "10px 14px", textAlign: "center", position: "relative" }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(isMenuOpen ? null : c.id);
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
                          >
                            <Settings size={12} />
                            <span>▾</span>
                          </button>

                          {/* Action Menu Dropdown */}
                          {isMenuOpen && (
                            <div
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
                                minWidth: "190px",
                                padding: "6px 0",
                                textAlign: "left"
                              }}
                            >
                              <div
                                onClick={() => {
                                  handleSelectContract(c);
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
                                <Eye size={14} color="#64748b" />
                                Detay Görüntüle
                              </div>

                              <div
                                onClick={() => {
                                  setShowPaymentPlanModal(c);
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
                                <FileText size={14} color="#2563eb" />
                                Ödeme Planı Çıktısı
                              </div>

                              <div
                                onClick={() => {
                                  setShowMebPrintModal(c);
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
                                <Printer size={14} color="#059669" />
                                Resmî Sözleşmeyi Yazdır (MEB)
                              </div>

                              <div
                                onClick={() => {
                                  showToast(`🧾 ${c.sozlesmeNo} için e-Fatura taslağı hazırlandı.`);
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
                                <Receipt size={14} color="#0284c7" />
                                Faturalama Hazırlığı
                              </div>

                              <div
                                onClick={() => {
                                  setShowCancelModal(c);
                                  setOpenDropdownId(null);
                                }}
                                style={{
                                  padding: "8px 14px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  color: "#b45309",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef3c7")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <Ban size={14} color="#f59e0b" />
                                İptal Et
                              </div>

                              <div
                                onClick={() => {
                                  if (onOpenGelir) {
                                    onOpenGelir(c);
                                  } else {
                                    showToast(`💰 ${c.sozlesmeNo} gelir kaydı açıldı.`);
                                  }
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
                                <Coins size={14} color="#16a34a" />
                                Gelir Detayı (GLR)
                              </div>

                              <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />

                              <div
                                onClick={() => handleDeleteContract(c)}
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
                                Sil
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Sözleşme No (Link) */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          onClick={() => handleSelectContract(c)}
                          style={{
                            color: "#2563eb",
                            fontWeight: 600,
                            cursor: "pointer",
                            textDecoration: "none"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        >
                          {c.sozlesmeNo}
                        </span>
                      </td>

                      {/* 3. Tarih */}
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        {fmtDate(c.sozlesmeTarihi)}
                      </td>

                      {/* 4. Müşteri (Öğrenci / Veli) */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>
                          {c.ogrenciAdi || c.musteriUnvan || "—"}
                        </div>
                        {c.sinifAdi && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            Sınıf: {c.sinifAdi}
                          </div>
                        )}
                      </td>

                      {/* 5. Dönem */}
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        {c.donemAdi || "2026-2027"}
                      </td>

                      {/* 6. Brüt Tutar & Kalan Önizleme (1:1 media_1791234855262.png) */}
                      <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                        {(() => {
                          const matchingGelir = gelirMap[c.sozlesmeNo];
                          const gross = Number(c.brutTutar) || 0;
                          const collected = matchingGelir ? (Number(matchingGelir.toplamTahsilat) || 0) : 0;
                          const remaining = matchingGelir ? (Number(matchingGelir.kalanAlacak) || 0) : gross;
                          const pct = gross > 0 ? Math.min(100, Math.max(0, (collected / gross) * 100)) : 0;
                          return (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", lineHeight: 1.2 }}>
                                {fmtCurrency(gross)}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>
                                  Kalan {fmtCurrency(remaining)}
                                </span>
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
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6b. Tahsilat Kolonu (1:1 media_1791234855262.png) */}
                      <td style={{ padding: "10px 14px", textAlign: "right", verticalAlign: "middle" }}>
                        {(() => {
                          const matchingGelir = gelirMap[c.sozlesmeNo];
                          const collected = matchingGelir ? (Number(matchingGelir.toplamTahsilat) || 0) : 0;
                          return (
                            <span style={{ fontWeight: 700, fontSize: "13px", color: "#f59e0b" }}>
                              {fmtCurrency(collected)}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 7. Ödeme Türü Badge */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: "9999px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid #fde68a"
                          }}
                        >
                          {c.odemeTuruText || (isInstallment ? `Taksitli (${c.taksitSayisi} Taksit)` : "Peşin")}
                        </span>
                      </td>

                      {/* 8. Durum */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {c.durum === 1 ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "#dcfce7",
                              color: "#15803d"
                            }}
                          >
                            Aktif
                          </span>
                        ) : c.durum === 3 ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "#fee2e2",
                              color: "#b91c1c"
                            }}
                          >
                            İptal
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "9999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "#f1f5f9",
                              color: "#475569"
                            }}
                          >
                            Taslak
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PAGINATION BAR */}
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
          {/* Left: Total counts */}
          <div>
            Toplam <b>{totalRecords}</b> kayıttan{" "}
            <b>
              {totalRecords === 0
                ? 0
                : pageSize === "all"
                ? 1
                : (currentPage - 1) * Number(pageSize) + 1}
            </b>{" "}
            -{" "}
            <b>
              {pageSize === "all"
                ? totalRecords
                : Math.min(currentPage * Number(pageSize), totalRecords)}
            </b>{" "}
            arası gösteriliyor
          </div>

          {/* Middle: Page Size Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Sayfa başına:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === "all" ? "all" : Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "12px",
                background: "#fff",
                outline: "none"
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">Tümü ({totalRecords})</option>
            </select>
          </div>

          {/* Right: Page Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              disabled={currentPage <= 1 || pageSize === "all"}
              onClick={() => setCurrentPage(1)}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: "4px",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                opacity: currentPage <= 1 ? 0.5 : 1,
                fontSize: "11px"
              }}
            >
              İlk
            </button>
            <button
              type="button"
              disabled={currentPage <= 1 || pageSize === "all"}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: "4px",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                opacity: currentPage <= 1 ? 0.5 : 1,
                fontSize: "11px"
              }}
            >
              Önceki
            </button>

            {/* Page number indicators */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setCurrentPage(pNum)}
                  style={{
                    padding: "4px 9px",
                    border: currentPage === pNum ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    background: currentPage === pNum ? "#2563eb" : "#fff",
                    color: currentPage === pNum ? "#fff" : "#1e293b",
                    borderRadius: "4px",
                    fontWeight: currentPage === pNum ? 700 : 500,
                    cursor: "pointer",
                    fontSize: "11px"
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages || pageSize === "all"}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: "4px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.5 : 1,
                fontSize: "11px"
              }}
            >
              Sonraki
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || pageSize === "all"}
              onClick={() => setCurrentPage(totalPages)}
              style={{
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: "4px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.5 : 1,
                fontSize: "11px"
              }}
            >
              Son
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: SÖZLEŞME DETAY MODALI */}
      {selectedContract && (
        <div
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
          onClick={() => setSelectedContract(null)}
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
            {/* Header */}
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
                    Sözleşme Detayı · {selectedContract.sozlesmeNo}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedContract.donemAdi || "2026-2027"} Dönemi · Onay Tarihi: {fmtDate(selectedContract.onayTarihi || selectedContract.sozlesmeTarihi)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedContract(null)}
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

            {/* Body */}
            <div style={{ padding: "20px" }}>
              {/* Top Meta Cards */}
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
                    {selectedContract.ogrenciAdi || selectedContract.musteriUnvan}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Sınıf: {selectedContract.sinifAdi || "—"} · Müşteri ID: {selectedContract.muH_MusteriId || selectedContract.ogrenciId}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>ÖDEME MODELİ</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {selectedContract.odemeTuruText || "Taksitli"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedContract.taksitSayisi ? `${selectedContract.taksitSayisi} Eşit Taksit` : "Tek Çekim / Peşin"}
                  </div>
                </div>

                <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>TOPLAM SÖZLEŞME BEDELİ</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#15803d", marginTop: "2px" }}>
                    {fmtCurrency(selectedContract.brutTutar)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#166534" }}>
                    Net: {fmtCurrency(selectedContract.netTutar)} + KDV: {fmtCurrency(selectedContract.kdvTutari)}
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div style={{ marginBottom: "18px" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  Mali Döküm
                </h4>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>Hizmet Bedeli (Net):</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(selectedContract.netTutar)}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>Uygulanan İndirim:</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right", color: "#dc2626" }}>
                          {selectedContract.indirimTutari ? `-${fmtCurrency(selectedContract.indirimTutari)}` : "₺0,00"}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>KDV Tutarı (%10):</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{fmtCurrency(selectedContract.kdvTutari)}</td>
                      </tr>
                      <tr style={{ backgroundColor: "#fafafa" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e293b" }}>Genel Toplam (Brüt):</td>
                        <td style={{ padding: "8px 12px", fontWeight: 800, textAlign: "right", color: "#16a34a", fontSize: "14px" }}>
                          {fmtCurrency(selectedContract.brutTutar)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extra Details */}
              <div style={{ fontSize: "12px", color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div><b>Sözleşme Başlangıç / Bitiş:</b> {fmtDate(selectedContract.baslamaTarihi)} — {fmtDate(selectedContract.bitisTarihi)}</div>
                <div style={{ marginTop: "4px" }}><b>Sistem Notu:</b> {selectedContract.onayNotu || selectedContract.aciklama || "Otomatik onay (gelir oluşturma)"}</div>
              </div>
            </div>

            {/* Footer Buttons */}
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
                {selectedContract.sozlesmeUrl ? (
                  <a
                    href={selectedContract.sozlesmeUrl}
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
                  onClick={() => {
                    setShowMebPrintModal(selectedContract);
                  }}
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
                    if (onOpenGelir) onOpenGelir(selectedContract);
                    setSelectedContract(null);
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
                onClick={() => setSelectedContract(null)}
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
      )}

      {/* MODAL 2: ÖDEME PLANI ÇIKTISI */}
      {renderPaymentPlanModal()}

      {/* MODAL 3: RESMÎ MEB SÖZLEŞMESİ YAZDIRMA (MEB STANDART ÇIKTI) */}
      {renderMebPrintModal()}


      {/* MODAL 4: İPTAL ETME MODALI */}
      {showCancelModal && (
        <div
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
          onClick={() => setShowCancelModal(null)}
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
            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>
              <b>{showCancelModal.sozlesmeNo}</b> numaralı ({showMebPrintModal?.ogrenciAdi || showCancelModal.ogrenciAdi}) sözleşmesini iptal etmek üzeresiniz. Lütfen iptal gerekçesini yazınız:
            </p>
            <textarea
              rows={3}
              placeholder="İptal gerekçesi (Örn: Veli talebiyle kayıt iptali, nakil vb.)..."
              value={cancelReason}
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
                onClick={() => setShowCancelModal(null)}
                style={{ padding: "8px 14px", background: "#f1f5f9", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ŞABLON YÖNETİMİ MODALI */}
      {showTemplateModal && (
        <div
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
          onClick={() => setShowTemplateModal(false)}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Sözleşme Şablon Yönetimi</h3>
              </div>
              <button type="button" onClick={() => setShowTemplateModal(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>MEB Standart Öğrenci Kayıt Sözleşmesi (Şablon #802)</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Resmî MEB mevzuatına uygun, 10-12 taksit ve peşin formatlı</div>
                </div>
                <span style={{ fontSize: "11px", padding: "2px 8px", background: "#dcfce7", color: "#15803d", borderRadius: "4px", fontWeight: 600 }}>Varsayılan</span>
              </div>
              <div style={{ border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>Yaz Okulu & Hızlandırma Sözleşmesi</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Yaz dönemi kurs kayıtları için kısa süreli sözleşme</div>
                </div>
                <span style={{ fontSize: "11px", padding: "2px 8px", background: "#f1f5f9", color: "#475569", borderRadius: "4px", fontWeight: 600 }}>Aktif</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: YENİ SÖZLEŞME OLUŞTURMA SİHİRBAZI */}
      {showNewContractModal && (
        <div
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
          onClick={() => setShowNewContractModal(false)}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Plus size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Yeni Sözleşme Tanımla</h3>
              </div>
              <button type="button" onClick={() => setShowNewContractModal(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!contractStudentName.trim()) {
                  showToast("⚠️ Lütfen öğrenci adını giriniz.");
                  return;
                }

                const finalParent = contractParentName.trim() || contractStudentName.trim();
                const res = AccountingService.addNewIncome({
                  ogrenciAdi: contractStudentName.trim(),
                  veliAdi: finalParent,
                  sinifAdi: contractStudentClass || "Genel",
                  brutTutar: Number(contractAmount) || 0,
                  taksitSayisi: Number(contractInstallments) || 1,
                  vadeTarihi: contractDueDate,
                  aciklama: `Kayıt Sözleşmesi`
                });

                // Link to student so that student table also has authentic contract & parent info
                const normName = contractStudentName.trim().toUpperCase();
                const targetStudent = selectedStudentForContract || allRegisteredStudents.find(
                  (st) => (st.student_name || "").trim().toUpperCase() === normName
                );

                if (targetStudent) {
                  StudentService.saveStudent({
                    ...targetStudent,
                    has_contract: true,
                    sozlesme_no: res.contract?.sozlesmeNo || targetStudent.sozlesme_no,
                    parent_name: finalParent,
                    parent_phone: contractParentPhone.trim() || targetStudent.parent_phone,
                    parent_relation: contractParentRelation || targetStudent.parent_relation || "Veli",
                    total_fee: Number(contractAmount) || targetStudent.total_fee
                  });
                }

                setContractsList(AccountingService.getContracts(students));
                showToast(`✅ ${res.contract?.sozlesmeNo || "Yeni"} numaralı yeni sözleşme kaydedildi.`);
                setShowNewContractModal(false);
              }}
            >
              {/* 1. Kayıtlı Öğrencilerden Seçme Kutusu */}
              <div style={{ marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
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
                      {st.student_name} {st.student_class ? `(${st.student_class})` : ""} {st.parent_name && st.parent_name !== "Belirtilmedi" ? `— Veli: ${st.parent_name}` : ""}
                    </option>
                  ))}
                </select>
                {selectedStudentForContract && (
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    <UserCheck size={13} /> Öğrenci ve veli bilgileri otomatik çekildi. Dilerseniz alanları aşağıdan düzenleyebilirsiniz.
                  </div>
                )}
              </div>

              {/* 2. Öğrenci Bilgileri */}
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

              {/* 3. Veli & İletişim Bilgileri (Kullanıcının talep ettiği eksik kısım) */}
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

              {/* 4. Sözleşme & Ödeme Bilgileri */}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setShowNewContractModal(false)}
                  style={{ padding: "8px 14px", background: "#f1f5f9", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 600, color: "#475569" }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Sözleşmeyi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
