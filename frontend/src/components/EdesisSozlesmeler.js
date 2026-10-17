import { usePrintMode } from "../hooks/usePrintMode";
import { csvRow } from "../lib/csv";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FileText,
  Calendar,
  Search,
  Maximize2,
  Minimize2,
  Filter,
  Plus,
  Settings,
  Eye,
  Printer,
  X,
  Trash2,
  Ban,
  FileSpreadsheet,
  Coins,
  Check
} from "lucide-react";
import AccountingService, { trNorm } from "../lib/edesisAccountingService";
import { StudentService } from "../lib/edesisStudentService";
import EdesisSozlesmeDetay from "./EdesisSozlesmeDetay";
import EdesisTahsilatListesi from "./EdesisTahsilatListesi";
import { trIncludes } from "../lib/utils";
import {
  fmtCurrency,
  fmtDate,
  PaymentPlanModal,
  MebContractPrintModal,
  ContractSummaryModal,
  CancelContractModal,
  ContractTemplateModal,
  NewContractWizardModal
} from "./contracts/ContractModals";
import { ContractSummaryCards, ContractFiltersBar } from "./contracts/ContractHeaderComponents";

export { fmtCurrency, fmtDate };

const EMPTY_ARR = [];

export default function EdesisSozlesmeler({ contracts: propContracts = EMPTY_ARR, students = EMPTY_ARR, payments = EMPTY_ARR, onOpenGelir, onNavigate }) {
  const [contractsList, setContractsList] = useState(() => AccountingService.getContracts(students, propContracts));

  useEffect(() => {
    AccountingService.syncDeletedWithRemote().catch((err) => console.warn("[Sozlesmeler] Sync deleted error:", err));
  }, []);

  useEffect(() => {
    setContractsList(AccountingService.getContracts(students, propContracts));
  }, [students, propContracts]);

  useEffect(() => {
    const handleUpdate = () => {
      setContractsList(AccountingService.getContracts(students));
    };
    window.addEventListener("cozum_snapshot_updated", handleUpdate);
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_snapshot_updated", handleUpdate);
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
      window.removeEventListener("cozum_students_updated", handleUpdate);
    };
  }, [students, propContracts]);

  const gelirMap = useMemo(() => {
    const map = {};
    (AccountingService.getIncomes(students) || []).forEach((g) => {
      if (g.sozlesmeNo && !g.is_deleted) {
        map[g.sozlesmeNo] = g;
      }
    });
    return map;
  }, [students]);
  const [periodFilter, setPeriodFilter] = useState("-1"); // -1: Tümü (Matches Edesis default 1:1), 113: 2026-2027, 40: 2025-2026, 142: 2026-2027-YAZ
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
  const printing=usePrintMode();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals & UI States
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest || !e.target.closest("[data-sozlesme-dropdown]")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdownId]);
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

  const findMatchingContract = useCallback((targetKey, list = []) => {
    if (!targetKey || !Array.isArray(list)) return null;
    const key=String(targetKey).trim();
    const exact=list.find(c=>String(c.sozlesmeNo || "")===key || String(c.id)===key);
    if(exact)return exact;
    const id=key.replace(/^stu-/, "");
    const matching=list.filter(c=>String(c.studentId || c.ogrenciId || c.student_id || "").replace(/^stu-/, "")===id);
    const currentStudent=students.find(s=>String(s.id).replace(/^stu-/, "")===id);
    return matching.find(c=>c.sozlesmeNo===currentStudent?.sozlesme_no) || (matching.length===1 ? matching[0] : null);
  }, [students]);

  const [selectedContract, setSelectedContract] = useState(() => {
    try {
      const targetKey = getTargetContractKey();
      if (targetKey) {
        const all = AccountingService.getContracts(students);
        let found = findMatchingContract(targetKey, all);
        if (found) {
          try {
            sessionStorage.removeItem("cozum_open_contract_no");
            sessionStorage.removeItem("cozum_open_contract_student");
            sessionStorage.removeItem("cozum_open_contract_student_id");
          } catch {}
          return found;
        }
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
    const syncTargetContract = () => {
      try {
        const targetKey = getTargetContractKey();
        if (!targetKey) return;

        let found = findMatchingContract(targetKey, contractsList);

        if (found) {
          setSelectedContract((prev) => {
            return found;
          });
          try {
            sessionStorage.removeItem("cozum_open_contract_no");
            sessionStorage.removeItem("cozum_open_contract_student");
            sessionStorage.removeItem("cozum_open_contract_student_id");
          } catch {}
        }
      } catch (e) {
        console.warn("Contract open effect error:", e);
      }
    };

    syncTargetContract();
    window.addEventListener("hashchange", syncTargetContract);
    return () => window.removeEventListener("hashchange", syncTargetContract);
  }, [contractsList, students, findMatchingContract]);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(null);
  const [showMebPrintModal, setShowMebPrintModal] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling,setCancelling]=useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Manage print isolation classes on body
  useEffect(() => {
    if (showMebPrintModal) {
      document.body.classList.add("meb-print-active");
    } else {
      document.body.classList.remove("meb-print-active");
    }
    return () => {
      document.body.classList.remove("meb-print-active");
    };
  }, [showMebPrintModal]);

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
      if (sessionStorage.getItem("cozum_open_new_contract_modal") === "1") {
        sessionStorage.removeItem("cozum_open_new_contract_modal");
        handleOpenNewContract();
      }
    } catch {}

    const handleNewContractTrigger = () => {
      handleOpenNewContract();
    };
    window.addEventListener("cozum_trigger_new_contract", handleNewContractTrigger);
    return () => window.removeEventListener("cozum_trigger_new_contract", handleNewContractTrigger);
  }, [allRegisteredStudents]);

  useEffect(() => {
    const handleScrollToTahsilat = () => {
      setTimeout(() => {
        const el = document.getElementById("tahsilat-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          try { sessionStorage.removeItem("cozum_scroll_to_tahsilat"); } catch {}
        }
      }, 120);
    };
    if (selectedContract && typeof sessionStorage !== "undefined" && sessionStorage.getItem("cozum_scroll_to_tahsilat") === "1") {
      handleScrollToTahsilat();
    }
    window.addEventListener("cozum_scroll_to_tahsilat", handleScrollToTahsilat);
    return () => window.removeEventListener("cozum_scroll_to_tahsilat", handleScrollToTahsilat);
  }, [selectedContract]);

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

  // Dynamic contract counts per period
  const periodCounts = useMemo(() => {
    const counts = { "113": 0, "40": 0, "142": 0, all: contractsList.length,active:{"113":0,"40":0,"142":0,all:0} };
    contractsList.forEach((c) => {
      const id = String(c.donemId);
      if (counts[id] !== undefined) counts[id]++;
      if(Number(c.durum)===1){counts.active.all++;if(counts.active[id]!==undefined)counts.active[id]++;}
    });
    return counts;
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
      (c) => periodFilter === "-1" || String(c.donemId || c.period_id) === String(periodFilter)
    );
    const totalCount = periodRecords.length;
    const activeContracts = periodRecords.filter((c) => c.durum === 1 || c.durum === "1" || c.durum === "Aktif");
    const activeAmount = activeContracts.reduce((sum, c) => sum + (Number(c.brutTutar !== undefined ? c.brutTutar : c.brut_tutar) || 0), 0);
    const draftCount = periodRecords.filter((c) => c.durum === 0 || c.durum === "0" || c.durum === "Taslak").length;
    const canceledCount = periodRecords.filter((c) => c.durum === 3 || c.durum === "3" || c.durum === "İptal").length;

    return {
      totalCount,
      activeCount:activeContracts.length,
      activeAmount,
      draftCount,
      canceledCount
    };
  }, [contractsList, periodFilter]);

  // Pagination calculation
  const totalRecords = filteredContracts.length;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalRecords / (Number(pageSize) || 25)));
  useEffect(() => { setCurrentPage(p => Math.min(p, totalPages)); }, [totalPages]);
  const paginatedContracts = useMemo(() => {
    if (printing) return filteredContracts;
    if (pageSize === "all") return filteredContracts;
    const size = Number(pageSize) || 25;
    const start = (currentPage - 1) * size;
    return filteredContracts.slice(start, start + size);
  }, [filteredContracts, currentPage, pageSize, printing]);

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

    const csvContent = "\uFEFF" + [headers, ...rows].map(csvRow).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Edesis_Sozlesmeler_${periodFilter === "113" ? "2026-2027" : "Tumu"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("✅ Sözleşmeler Excel (CSV) formatında indirildi.");
  };

  // Cancel contract action
  const handleConfirmCancel = async () => {
    if (!showCancelModal || cancelling) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      alert("Lütfen en az 5 karakterlik iptal nedeni belirtiniz.");
      return;
    }
    setCancelling(true);
    try{
      await AccountingService.cancelContract(showCancelModal, cancelReason);
      setContractsList(AccountingService.getContracts(students));
      showToast(`⚠️ ${showCancelModal.sozlesmeNo} numaralı sözleşme iptal edildi.`);
      setShowCancelModal(null);
      setCancelReason("");
    }catch(error){window.alert(error.message || 'Sözleşme iptal edilemedi');}
    finally{setCancelling(false);}
  };

  // Delete contract action
  const handleDeleteContract = async (contract) => {
try {

    if (window.confirm(`${contract.sozlesmeNo} sözleşmesini silmek istediğinize emin misiniz?`)) {
      await AccountingService.deleteContract(contract);
      // Immediately filter from state so activeAmount and totalCount drop instantly on screen
      setContractsList((prev) =>
        prev.filter((c) => c.sozlesmeNo !== contract.sozlesmeNo && c.id !== contract.id)
      );
      showToast(`🗑️ ${contract.sozlesmeNo} sözleşmesi silindi.`);
    }
    setOpenDropdownId(null);

} catch (error) { window.alert(error.message || "İşlem tamamlanamadı."); }
};

  const printStudent = useMemo(() => {
    if (!showMebPrintModal) return null;
    const name = trNorm(showMebPrintModal.ogrenciAdi || showMebPrintModal.student_name || showMebPrintModal.musteriUnvan || "");
    const sId = String(showMebPrintModal.ogrenciId || showMebPrintModal.studentId || showMebPrintModal.student_id || "");
    const cleanId = sId.replace(/^stu-/, "");
    const szlNo = showMebPrintModal.sozlesmeNo || showMebPrintModal.sozlesme_no || "";
    const ogrNo = String(showMebPrintModal.ogrenciNo || showMebPrintModal.student_no || "");
    const tc = String(showMebPrintModal.student_tc || showMebPrintModal.tc || "").trim();
    const list = Array.isArray(allRegisteredStudents) && allRegisteredStudents.length > 0 ? allRegisteredStudents : (students || []);
    return list.find((s) => {
      if (!s) return false;
      if (szlNo && s.sozlesme_no && String(s.sozlesme_no) === szlNo) return true;
      if (cleanId && (String(s.id) === sId || String(s.id).replace(/^stu-/, "") === cleanId)) return true;
      if (tc && s.student_tc && String(s.student_tc).trim() === tc) return true;
      if (ogrNo && String(s.student_no) === ogrNo) return true;
      if (name && trNorm(s.student_name) === name) return true;
      return false;
    }) || null;
  }, [showMebPrintModal, allRegisteredStudents, students]);

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
        <div className={`edesis-sozlesme-detay-view ${showMebPrintModal || showPaymentPlanModal ? "no-print" : ""}`}>
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
            onEditStudent={(st) => {
              const target = st?.id || st?.student_name || selectedContract?.ogrenciAdi || selectedContract?.musteriUnvan;
              if (target) {
                try {
                  sessionStorage.setItem("cozum_open_edit_student_id", String(target));
                } catch {}
              }
              if (onNavigate) {
                onNavigate("students");
              }
            }}
          />
        </div>
        <PaymentPlanModal
          contract={showPaymentPlanModal}
          onClose={() => setShowPaymentPlanModal(null)}
        />
        <MebContractPrintModal
          contract={showMebPrintModal}
          printStudent={printStudent}
          students={allRegisteredStudents.length > 0 ? allRegisteredStudents : (students || [])}
          onClose={() => setShowMebPrintModal(null)}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`admin-record-list edesis-contracts-view ${showMebPrintModal || showPaymentPlanModal ? "no-print" : ""}`}
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
        className="erp-page-header"
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

      {/* 4 SUMMARY METRIC CARDS */}
      <ContractSummaryCards stats={stats} fmtCurrency={fmtCurrency} />

      {/* FILTER ROW & SEARCH BAR */}
      <ContractFiltersBar
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        periodCounts={periodCounts}
        setCurrentPage={setCurrentPage}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        customerOptions={customerOptions}
        students={students}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

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
                  const dropdownKey = c.id || c.sozlesmeNo || idx;
                  const isMenuOpen = openDropdownId === dropdownKey;
                  const openUpwards = idx >= paginatedContracts.length - 2 && paginatedContracts.length > 3;
                  const instCount = parseInt(c.taksitSayisi !== undefined ? c.taksitSayisi : (c.taksit_sayisi !== undefined ? c.taksit_sayisi : 1), 10) || 1;
                  const isInstallment = instCount > 1;

                  return (
                    <tr
                      key={c.id || c.sozlesmeNo || idx}
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
                        <div data-sozlesme-dropdown={dropdownKey} style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(isMenuOpen ? null : dropdownKey);
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
                          {c.sozlesmeNo || c.sozlesme_no}
                        </span>
                      </td>

                      {/* 3. Tarih */}
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        {fmtDate(c.sozlesmeTarihi || c.sozlesme_tarihi)}
                      </td>

                      {/* 4. Müşteri (Öğrenci / Veli) */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>
                          {c.ogrenciAdi || c.musteriUnvan || c.student_name || "—"}
                        </div>
                        {(c.sinifAdi || c.student_class) && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            Sınıf: {c.sinifAdi || c.student_class}
                          </div>
                        )}
                      </td>

                      {/* 5. Dönem */}
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        {c.donemAdi || c.period_name || "2026-2027"}
                      </td>

                      {/* 6. Brüt Tutar & Kalan Önizleme (1:1 media_1791234855262.png) */}
                      <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                        {(() => {
                          const sNo = c.sozlesmeNo || c.sozlesme_no;
                          const matchingGelir = gelirMap[sNo];
                          const isGelirMatchValid = matchingGelir && !matchingGelir.is_deleted && (!matchingGelir.student_name || trNorm(matchingGelir.student_name) === trNorm(c.ogrenciAdi || c.student_name));
                          const gross = Number(c.brutTutar !== undefined ? c.brutTutar : (c.brut_tutar !== undefined ? c.brut_tutar : 0));
                          const collected = c.toplamTahsilat !== undefined
                            ? Number(c.toplamTahsilat)
                            : (c.toplam_tahsilat !== undefined
                              ? Number(c.toplam_tahsilat)
                              : (isGelirMatchValid ? Number(matchingGelir.toplamTahsilat) : 0));
                          const remaining = c.kalanAlacak !== undefined
                            ? Number(c.kalanAlacak)
                            : (c.kalan_alacak !== undefined
                              ? Number(c.kalan_alacak)
                              : (isGelirMatchValid ? Number(matchingGelir.kalanAlacak) : Math.max(0, gross - collected)));
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
                          const sNo = c.sozlesmeNo || c.sozlesme_no;
                          const matchingGelir = gelirMap[sNo];
                          const isGelirMatchValid = matchingGelir && !matchingGelir.is_deleted && (!matchingGelir.student_name || trNorm(matchingGelir.student_name) === trNorm(c.ogrenciAdi || c.student_name));
                          const collected = c.toplamTahsilat !== undefined
                            ? Number(c.toplamTahsilat)
                            : (c.toplam_tahsilat !== undefined
                              ? Number(c.toplam_tahsilat)
                              : (isGelirMatchValid ? Number(matchingGelir.toplamTahsilat) : 0));
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
                          {c.odemeTuruText || (isInstallment ? `Taksitli (${instCount} Taksit)` : "Peşin")}
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

      {/* ALTTTAKİ TAHSİLAT KISMI (TEK SAYFADAN YÖNETİM) */}
      <div id="tahsilat-section" style={{ marginTop: "28px", paddingTop: "20px", borderTop: "2px dashed #cbd5e1" }}>
        <EdesisTahsilatListesi
          students={students}
          payments={payments}
          onNavigate={onNavigate}
        />
      </div>

      {/* MODAL 1: SÖZLEŞME DETAY MODALI */}
      <ContractSummaryModal
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        onOpenMebPrint={(c) => setShowMebPrintModal(c)}
        onOpenGelir={onOpenGelir}
      />
      </div>

      {/* MODAL 2: ÖDEME PLANI ÇIKTISI */}
      <PaymentPlanModal
        contract={showPaymentPlanModal}
        onClose={() => setShowPaymentPlanModal(null)}
      />

      {/* MODAL 3: RESMÎ MEB SÖZLEŞMESİ YAZDIRMA (MEB STANDART ÇIKTI) */}
      <MebContractPrintModal
        contract={showMebPrintModal}
        printStudent={printStudent}
        students={allRegisteredStudents.length > 0 ? allRegisteredStudents : (students || [])}
        onClose={() => setShowMebPrintModal(null)}
      />

      {/* MODAL 4: İPTAL ETME MODALI */}
      <CancelContractModal
        contract={showCancelModal}
        cancelReason={cancelReason}
        saving={cancelling}
        setCancelReason={setCancelReason}
        onClose={() => {if(!cancelling)setShowCancelModal(null);}}
        onConfirm={handleConfirmCancel}
      />

      {/* MODAL 5: ŞABLON YÖNETİMİ MODALI */}
      <ContractTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />

      {/* MODAL 6: YENİ SÖZLEŞME OLUŞTURMA SİHİRBAZI */}
      <NewContractWizardModal
        open={showNewContractModal}
        onClose={() => setShowNewContractModal(false)}
        allRegisteredStudents={allRegisteredStudents}
        students={students}
        selectedStudentForContract={selectedStudentForContract}
        setSelectedStudentForContract={setSelectedStudentForContract}
        contractStudentName={contractStudentName}
        setContractStudentName={setContractStudentName}
        contractStudentClass={contractStudentClass}
        setContractStudentClass={setContractStudentClass}
        contractParentName={contractParentName}
        setContractParentName={setContractParentName}
        contractParentPhone={contractParentPhone}
        setContractParentPhone={setContractParentPhone}
        contractParentRelation={contractParentRelation}
        setContractParentRelation={setContractParentRelation}
        contractAmount={contractAmount}
        setContractAmount={setContractAmount}
        contractInstallments={contractInstallments}
        setContractInstallments={setContractInstallments}
        contractDueDate={contractDueDate}
        setContractDueDate={setContractDueDate}
        setContractsList={setContractsList}
        showToast={showToast}
      />
    </>
  );
}
