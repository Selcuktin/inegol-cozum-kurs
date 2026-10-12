import { useEffect, useMemo, useState } from "react";
import "./App.css";
import axios from "axios";
import {
  Award, Bell, BellRing, BookOpen, Building, Calendar, CalendarCheck, ChevronDown, ChevronRight,
  CircleDollarSign, Clock, FileDown, FileText, Folder, GraduationCap, History, LayoutDashboard,
  LogOut, Menu, Printer, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Target,
  TrendingDown, TrendingUp, UserCheck, UserCog, UserPlus, Users, Wallet, X, Zap
} from "lucide-react";
import {
  openWhatsApp, OfficialEdesisKarneModal, EdesisOptikModal, ExamsPage,
  AttendancePage, SchedulesPage, EdesisDashboardWidgets
} from "./EdesisModules";
import { EdesisStudentModal } from "./components/EdesisStudentModal";
import { PromissoryNoteModal } from "./components/PromissoryNoteModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { AbsenceLetterModal } from "./components/AbsenceLetterModal";
import { HataKarnesiModal } from "./components/HataKarnesiModal";
import { ClassDetailModal } from "./components/ClassDetailModal";
import { MuhasebeV2Dashboard } from "./components/MuhasebeV2Dashboard";
import { EdesisTestBenchModal } from "./components/EdesisTestBenchModal";
import { TeachersPage } from "./components/TeachersPage";
import { MonthlyReportPreview } from "./components/MonthlyReportPreview";
import { KayitModulu } from "./components/KayitModulu";
import { OmniSearchModal } from "./components/OmniSearchModal";
import EdesisSozlesmeler from "./components/EdesisSozlesmeler";
import EdesisOgrenciListesi from "./components/EdesisOgrenciListesi";
import EdesisGelirListesi from "./components/EdesisGelirListesi";
import EdesisVadeTakvimi from "./components/EdesisVadeTakvimi";
import EdesisTahsilatListesi from "./components/EdesisTahsilatListesi";
import { trIncludes, formatTrtDateTime } from "./lib/utils";
import StudentService from "./lib/edesisStudentService";
import AccountingService, { ENABLE_KASA_BANKA } from "./lib/edesisAccountingService";
import { AuthGuard, can, CAN } from "./pages/AuthGuard";
import { DashboardPage, PageHead, Button, Stat } from "./pages/DashboardPage";
import { StudentsPage } from "./pages/StudentsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { AccountingPage } from "./pages/AccountingPage";
import { AcademicPage } from "./pages/AcademicPage";
import { ExamOpticalPage } from "./pages/ExamOpticalPage";
import { Classes, EditClassModal } from "./components/Classes";
import { PaymentTable } from "./components/PaymentTable";
import {
  Brand, AuthCallback, Login, PwaBanner, MobileBottomNav,
  getBackendBaseUrl, API, LOGO, ROLE_LABEL
} from "./components/layout/AuthAndNav";
import { buildNavCategories } from "./components/layout/navConfig";
import { UsersPage, Reminders, Reports, AuditPage, downloadBlob } from "./pages/SystemPages";
import { StudentProfileModal, StudentDetailDrawer } from "./components/StudentProfileModal";
import { Modal, CameraCapture, computeEffective, DISCOUNT_TYPES, EXTRA_KEYS } from "./components/QuickActionModal";

export { AuthGuard, can, CAN };
export { DashboardPage, DashboardPage as Dashboard, PageHead, Button, Stat };
export { StudentsPage, ContractsPage, AccountingPage, AcademicPage, ExamOpticalPage };
export { Classes, EditClassModal, PaymentTable };
export { Brand, AuthCallback, Login, PwaBanner, MobileBottomNav, getBackendBaseUrl, API, LOGO, ROLE_LABEL };
export {
  UsersPage, Reminders, Reports, AuditPage, downloadBlob,
  StudentProfileModal, StudentDetailDrawer, Modal, CameraCapture,
  computeEffective, DISCOUNT_TYPES, EXTRA_KEYS
};
export {
  openWhatsApp, OfficialEdesisKarneModal, EdesisOptikModal, ExamsPage,
  AttendancePage, SchedulesPage, EdesisDashboardWidgets, EdesisStudentModal,
  PromissoryNoteModal, ReceiptModal, AbsenceLetterModal, HataKarnesiModal,
  ClassDetailModal, MuhasebeV2Dashboard, EdesisTestBenchModal, TeachersPage,
  MonthlyReportPreview, KayitModulu, EdesisSozlesmeler, EdesisOgrenciListesi,
  EdesisGelirListesi, EdesisVadeTakvimi, EdesisTahsilatListesi,
  formatTrtDateTime, AccountingService
};

// Client storage cache-busting & refresh across all devices
import { CLIENT_STORAGE_VERSION, purgeClientStorage } from "./lib/storageUtils";
export { CLIENT_STORAGE_VERSION, purgeClientStorage };

if (typeof window !== "undefined") {
  window.cozumPurgeAllCaches = purgeClientStorage;
  const currentVersion = localStorage.getItem("cozum_app_version");
  const params = new URLSearchParams(window.location.search);
  const forceReset = params.get("reset") || params.get("clear") || params.get("sifirla");
  if (currentVersion !== CLIENT_STORAGE_VERSION || forceReset) {
    purgeClientStorage(true);
  }
  window.__API_BASE__ = API;
}

axios.defaults.withCredentials = true;
axios.defaults.headers.common["Bypass-Tunnel-Reminder"] = "true";

function App() {
  const [authState, setAuthState] = useState("checking");
  const [me, setMe] = useState(null);
  const hasSessionInUrl = typeof window !== "undefined" && window.location.hash.includes("session_id=");

  useEffect(() => {
    if (hasSessionInUrl) return;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlToken = sp.get("token");
      if (urlToken) {
        localStorage.setItem("session_token", urlToken);
        sp.delete("token");
        const cleanQuery = sp.toString() ? `?${sp.toString()}` : "";
        const cleanUrl = window.location.pathname + cleanQuery + window.location.hash;
        try {
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}
      }
    }
    const token = localStorage.getItem("session_token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    (async () => {
      try {
        const r = await axios.get(`${API}/auth/me`);
        setMe(r.data);
        setAuthState("authed");
      } catch {
        setAuthState("guest");
      }
    })();
  }, [hasSessionInUrl]);

  if (hasSessionInUrl) return <AuthCallback API={API} />;
  if (authState === "checking") return <div className="auth-screen"><div className="auth-card"><h1>Yükleniyor...</h1></div></div>;
  if (authState === "guest") {
    return (
      <Login
        API={API}
        onLoginSuccess={(userData) => {
          const user = userData?.user ? { ...userData, ...userData.user } : userData;
          setMe(user);
          setAuthState("authed");
        }}
      />
    );
  }
  return (
    <MainApp
      me={me}
      onLogout={async () => {
        try { await axios.post(`${API}/auth/logout`); } catch {}
        localStorage.removeItem("session_token");
        delete axios.defaults.headers.common["Authorization"];
        setMe(null);
        setAuthState("guest");
      }}
    />
  );
}

export function MainApp({ me, onLogout }) {
  const [data, setData] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("cozum_dashboard_data_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) return parsed;
        }
      }
    } catch (e) {}
    return { summary: {}, students: [], classes: [], payments: [], expenses: [], exams: [], attendanceToday: [], topRankings: [], todaySchedules: [] };
  });
  const validPages = ["dashboard", "kayit", "students", "classes", "teachers", "exams", "attendance", "schedules", "payments", "kasalar", "gelir", "vade", "tahsilat", "reminders", "documents", "reports", "users", "audit", "backup"];
  const getInitialPage = () => {
    if (typeof window !== "undefined") {
      const fullHash = window.location.hash.replace(/^#/, "");
      const cleanHash = fullHash.split("?")[0].split("/")[0];
      if (cleanHash === "kasalar" || cleanHash === "kasa") return "payments";
      if (cleanHash === "backup") return "payments";
      if (cleanHash === "documents") {
        if (fullHash.includes("?id=")) {
          const m = fullHash.match(/\?id=([^&]+)/);
          if (m && m[1]) {
            try { sessionStorage.setItem("cozum_open_contract_no", decodeURIComponent(m[1])); } catch {}
          }
        }
        return "documents";
      }
      if (cleanHash === "gelir" && fullHash.includes("?id=")) {
        const m = fullHash.match(/\?id=([^&]+)/);
        if (m && m[1]) {
          try { sessionStorage.setItem("cozum_open_income_id", decodeURIComponent(m[1])); } catch {}
        }
      }
      if (cleanHash === "kayit" && fullHash.includes("?tab=")) {
        const m = fullHash.match(/\?tab=([^&]+)/);
        if (m && m[1]) {
          try { sessionStorage.setItem("cozum_kayit_tab", decodeURIComponent(m[1])); } catch {}
        }
      }
      if (cleanHash && validPages.includes(cleanHash)) return cleanHash;
      const saved = localStorage.getItem("active_page");
      if (saved && validPages.includes(saved)) return saved;
    }
    return "dashboard";
  };
  const [page, setPageState] = useState(getInitialPage);
  const setPage = (p) => {
    setPageState(p);
    if (typeof window !== "undefined") {
      const currentFullHash = window.location.hash.replace(/^#/, "");
      if (currentFullHash !== p && !currentFullHash.startsWith(`${p}?`)) {
        let nextHash = p;
        try {
          if (p === "documents") {
            const openContractNo = sessionStorage.getItem("cozum_open_contract_no");
            if (openContractNo) nextHash = `documents?id=${encodeURIComponent(openContractNo)}`;
          }
        } catch {}
        window.location.hash = nextHash;
      }
      localStorage.setItem("active_page", p);
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      const fullHash = window.location.hash.replace(/^#/, "");
      const cleanHash = fullHash.split("?")[0].split("/")[0];
      if (cleanHash === "kasalar" || cleanHash === "kasa") {
        setPageState("payments");
        setAccountingTab(ENABLE_KASA_BANKA ? "kasalar" : "dashboard");
        localStorage.setItem("active_page", "payments");
      } else if (cleanHash === "documents") {
        if (fullHash.includes("?id=")) {
          const m = fullHash.match(/\?id=([^&]+)/);
          if (m && m[1]) {
            try { sessionStorage.setItem("cozum_open_contract_no", decodeURIComponent(m[1])); } catch {}
          }
        }
        setPageState("documents");
        localStorage.setItem("active_page", "documents");
      } else if (cleanHash === "backup") {
        setPageState("payments");
        setAccountingTab("backup");
        localStorage.setItem("active_page", "payments");
      } else if (cleanHash && validPages.includes(cleanHash)) {
        if (cleanHash === "gelir" && fullHash.includes("?id=")) {
          const m = fullHash.match(/\?id=([^&]+)/);
          if (m && m[1]) {
            try { sessionStorage.setItem("cozum_open_income_id", decodeURIComponent(m[1])); } catch {}
          }
        }
        if (cleanHash === "kayit" && fullHash.includes("?tab=")) {
          const m = fullHash.match(/\?tab=([^&]+)/);
          if (m && m[1]) setKayitTab(decodeURIComponent(m[1]));
        }
        setPageState(cleanHash);
        localStorage.setItem("active_page", cleanHash);
        if (cleanHash === "vade") setAccountingTab("gecikenler");
        else if (cleanHash === "tahsilat") setAccountingTab("tahsilatlar");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [kayitTab, setKayitTabState] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const fullHash = window.location.hash.replace(/^#/, "");
        const tabMatch = fullHash.match(/[?&]tab=([^&]+)/);
        if (tabMatch && tabMatch[1]) return decodeURIComponent(tabMatch[1]);
        const saved = sessionStorage.getItem("cozum_kayit_tab") || localStorage.getItem("cozum_kayit_tab");
        if (saved) return saved;
      } catch {}
    }
    return "kokpit";
  });
  const setKayitTab = (tab) => {
    setKayitTabState(tab);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("cozum_kayit_tab", tab);
        localStorage.setItem("cozum_kayit_tab", tab);
      } catch {}
    }
  };
  const [accountingTab, setAccountingTabState] = useState(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hash.replace(/^#/, "").split("?")[0];
      if (h === "vade") return "gecikenler";
      if (h === "tahsilat") return "tahsilatlar";
      if (h === "gelir") return "gelirler";
      if (h === "kasalar" || h === "kasa") return "kasalar";
      if (h === "backup") return "backup";
      try {
        const saved = sessionStorage.getItem("cozum_muhasebe_v2_tab") || localStorage.getItem("cozum_muhasebe_v2_tab");
        if (saved) return saved;
      } catch {}
    }
    return "dashboard";
  });
  const setAccountingTab = (tab) => {
    setAccountingTabState(tab);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("cozum_muhasebe_v2_tab", tab);
        localStorage.setItem("cozum_muhasebe_v2_tab", tab);
      } catch {}
    }
  };
  const [showTestBench, setShowTestBench] = useState(false);
  const [showGlobalOptikModal, setShowGlobalOptikModal] = useState(false);
  const [showGlobalKarne, setShowGlobalKarne] = useState(null);
  const [showGlobalHataKarnesi, setShowGlobalHataKarnesi] = useState(false);
  const [showGlobalPromissory, setShowGlobalPromissory] = useState(false);
  const [showGlobalAbsenceLetter, setShowGlobalAbsenceLetter] = useState(false);
  const [showOmniSearch, setShowOmniSearch] = useState(false);

  // Global Ctrl + K / Cmd + K shortcut for Omni Search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowOmniSearch((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleOmniSelectStudent = (student) => {
    setSelected(student);
    if (can(me, "page_students")) {
      setPage("students");
    }
  };

  const handleOmniSelectContract = () => {
    if (can(me, "page_contracts")) {
      setPage("contracts");
    }
  };

  const handleOmniSelectPayment = () => {
    if (can(me, "page_payments")) {
      setPage("payments");
      setAccountingTab("tahsilatlar");
    }
  };

  const [expandedTree, setExpandedTree] = useState({
    kayit: true, kayit_araclar: false, kayit_bursluluk: false,
    olcme: true, teachers: true, muhasebe: true, gelir: true, kasa: true, gider: false
  });
  const toggleTree = (key) => setExpandedTree((prev) => ({ ...prev, [key]: !prev[key] }));

  const load = async () => {
    try {
      const r = await axios.get(`${API}/dashboard`);
      const rawStudents = r.data?.students || [];
      const cleanStudents = StudentService.filterActiveStudents(rawStudents);
      const nextData = { ...r.data, students: cleanStudents };
      setData(nextData);
      try {
        if (typeof window !== "undefined") localStorage.setItem("cozum_dashboard_data_v1", JSON.stringify(nextData));
      } catch (e) {}
    } catch (e) {
      console.warn("[App] load error:", e);
    }
  };
  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener("cozum_students_updated", handleUpdate);
    window.addEventListener("cozum_accounting_updated", handleUpdate);
    return () => {
      window.removeEventListener("cozum_students_updated", handleUpdate);
      window.removeEventListener("cozum_accounting_updated", handleUpdate);
    };
  }, []);
  const filtered = useMemo(() => (data.students || []).filter((s) => trIncludes(`${s.student_name} ${s.parent_name} ${s.student_phone}`, search)), [data.students, search]);
  const totalCollected = data.summary?.collected || (data.students || []).reduce((a, s) => a + (s.paid_amount || 0), 0);
  const totalExpected = (data.students || []).reduce((a, s) => a + computeEffective(s).effective, 0);
  const totalExpenses = data.summary?.expenses || (data.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);

  const [quickOpen, setQuickOpen] = useState(false);
  useEffect(() => {
    if (!quickOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest || !e.target.closest(".edesis-quick-actions-wrapper")) setQuickOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [quickOpen]);
  const guardedOpen = (type) => setModal(type);

  const navCategories = useMemo(() => buildNavCategories({
    page, accountingTab, setPage, setAccountingTab, setMobileOpen,
    guardedOpen, setShowGlobalPromissory, kayitTab, setKayitTab,
    showGlobalOptikModal, showGlobalHataKarnesi, setShowGlobalOptikModal,
    setShowGlobalHataKarnesi
  }), [page, accountingTab, kayitTab, showGlobalOptikModal, showGlobalHataKarnesi]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="sr-only skip-link">Ana içeriğe atla</a>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          onTouchEnd={(e) => { e.preventDefault(); setMobileOpen(false); }}
          aria-label="Menüyü kapat"
          role="button"
          tabIndex="0"
        />
      )}
      <aside className={mobileOpen ? "sidebar mobile-open" : "sidebar"} aria-label="Ana Menü Gezintisi">
        <div className="sidebar-brand-row">
          <Brand />
          <button type="button" className="sidebar-close-btn" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="side-caption">EDESİS ERP SİSTEMİ</div>
        <nav aria-label="Modül Gezintisi">
          {navCategories.map((cat, ci) => {
            const visibleItems = cat.items.filter((it) => can(me, it.perm));
            if (visibleItems.length === 0) return null;
            return (
              <div key={ci} className="sidebar-group">
                {cat.title ? <div className="sidebar-category-title">{cat.title}</div> : null}
                {visibleItems.map((item) => {
                  if (item.isTree) {
                    const isTreeOpen = !!expandedTree[item.treeKey];
                    const isParentActive = page === item.id;
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="nav-tree-block">
                        <button
                          type="button"
                          data-testid={`nav-tree-${item.id}`}
                          className={`nav-tree-parent ${isParentActive ? "active-parent" : ""}`}
                          onClick={() => {
                            toggleTree(item.treeKey);
                            if (item.id === "kayit") { setPage("kayit"); setKayitTab("kokpit"); }
                            else if (item.id === "payments") { setPage("payments"); setAccountingTab("dashboard"); }
                            else if (item.id === "exams") setPage("exams");
                            else if (item.id === "teachers") setPage("teachers");
                          }}
                        >
                          <div className="nav-tree-left"><Icon size={17} /><span>{item.label}</span></div>
                          <ChevronDown size={14} className={`nav-tree-chevron ${isTreeOpen ? "open" : ""}`} />
                        </button>

                        {isTreeOpen && (
                          <div className="nav-tree-sublist">
                            {item.subItems.map((sub) => {
                              if (sub.isAccordion) {
                                const isSubOpen = !!expandedTree[sub.subKey];
                                const SubIcon = sub.icon || Folder;
                                return (
                                  <div key={sub.id} className="nav-sub-accordion-block">
                                    <button
                                      type="button"
                                      className={`nav-sub-accordion ${isSubOpen ? "active" : ""}`}
                                      onClick={() => toggleTree(sub.subKey)}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <SubIcon size={14} color="#64748b" />
                                        <span>{sub.label}</span>
                                      </div>
                                      <ChevronDown size={12} className={`nav-tree-chevron ${isSubOpen ? "open" : ""}`} />
                                    </button>
                                    {isSubOpen && (
                                      <div className="nav-nested-list">
                                        {sub.children.map((nested) => {
                                          const isNestedActive = nested.activeCheck ? nested.activeCheck() : false;
                                          return (
                                            <button
                                              key={nested.id}
                                              type="button"
                                              className={`nav-nested-item ${isNestedActive ? "active" : ""}`}
                                              onClick={nested.onClick}
                                            >
                                              <span>{nested.label}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              const isSubActive = sub.activeCheck ? sub.activeCheck() : page === sub.id;
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  className={`nav-subitem ${isSubActive ? "active" : ""}`}
                                  onClick={sub.onClick}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {SubIcon && <SubIcon size={14} />}
                                    <span>{sub.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const Icon = item.icon;
                  const isItemActive = item.activeCheck ? item.activeCheck() : page === item.id;
                  return (
                    <button
                      key={item.id}
                      data-testid={`nav-${item.id}`}
                      className={isItemActive ? "nav-item active" : "nav-item"}
                      onClick={() => {
                        if (item.customAction) item.customAction();
                        else setPage(item.id);
                        setMobileOpen(false);
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {item.id === "payments" && <i className="nav-dot" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="side-bottom">
          <button
            type="button"
            className="nav-item"
            title="Cihaz üzerindeki tüm site verilerini ve önbelleği silip en güncel verileri yükler"
            onClick={async () => {
              if (window.confirm("Cihaz üzerindeki tüm site verileri, önbellek ve yerel kayıtlar tamamen silinip sayfa yenilenecektir. Onaylıyor musunuz?")) {
                await purgeClientStorage(true);
                window.location.reload();
              }
            }}
            style={{ color: "#64748b" }}
          >
            <RefreshCw size={17} /><span>Önbelleği Temizle</span>
          </button>
          <button data-testid="nav-logout" className="nav-item" onClick={onLogout}><LogOut size={18} /><span>Çıkış yap</span></button>
          <div className="profile">
            {(me?.picture || me?.user?.picture) ? <img className="avatar" src={me?.picture || me?.user?.picture} alt="" /> : <div className="avatar">{((me?.name || me?.user?.name) || "İÇ").slice(0, 2).toUpperCase()}</div>}
            <div><b>{me?.name || me?.user?.name || "Kurs Yönetimi"}</b><small data-testid="user-role">{ROLE_LABEL[me?.role || me?.user?.role] || me?.role_label || me?.user?.role_label || "Kullanıcı"}</small></div>
            <ChevronRight size={16} />
          </div>
        </div>
      </aside>
      <div className="main">
        <PwaBanner />
        <header className="topbar" role="banner">
          <button className="mobile-menu" data-testid="mobile-menu" aria-label="Menüyü aç" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} aria-hidden="true" /></button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="edesis-quick-actions-wrapper" style={{ position: "relative" }}>
              <button
                type="button"
                className="edesis-quick-actions-btn"
                onClick={(e) => { e.stopPropagation(); setQuickOpen((prev) => !prev); }}
                title="Hızlı İşlemler Menüsü"
                aria-label="Hızlı işlemler menüsü"
                aria-haspopup="true"
                aria-expanded={quickOpen}
              >
                <Zap size={14} aria-hidden="true" /><span>Hızlı İşlemler</span>
              </button>
              {quickOpen && (
                <div className="edesis-quick-dropdown" onClick={() => setQuickOpen(false)} role="menu" style={{ width: "290px" }}>
                  <div className="quick-dropdown-header">HIZLI İŞLEM</div>
                  <div className="quick-col">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => guardedOpen("student")}
                      style={{
                        padding: "10px 12px",
                        background: "#eff6ff",
                        borderColor: "#bfdbfe",
                        color: "#1e40af",
                        fontWeight: 600
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <UserPlus size={15} style={{ color: "#2563eb" }} aria-hidden="true" />
                        <span>Öğrenci Kaydı (Sözleşmeyle Birlikte)</span>
                      </span>
                      <ChevronRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div 
            className="top-search" 
            onClick={() => setShowOmniSearch(true)} 
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            title="Genel Akıllı Arama (Kısayol: Ctrl + K)"
          >
            <Search size={17} aria-hidden="true" />
            <input
              data-testid="global-search-input"
              role="searchbox"
              aria-label="Genel arama: öğrenci, veli veya telefon ara"
              placeholder="Öğrenci, veli, sözleşme ara..."
              value={search}
              onFocus={() => setShowOmniSearch(true)}
              onChange={(e) => { setSearch(e.target.value); if (can(me, "page_students")) setPage("students"); }}
            />
            <span
              onClick={(e) => { e.stopPropagation(); setShowOmniSearch(true); }}
              style={{
                fontSize: "11px",
                fontWeight: 700,
                background: "#f1f5f9",
                color: "#64748b",
                padding: "2px 7px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginLeft: "auto",
                marginRight: "6px"
              }}
              title="Klavye Kısayolu"
            >
              Ctrl K
            </span>
          </div>
          <div className="top-actions">
            <span className="today-label">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
            <button data-testid="notifications-button" className="icon-btn" aria-label="Bildirimler"><Bell size={18} aria-hidden="true" /><i aria-hidden="true" /></button>
            <div className="user-mini">
              {(me?.picture || me?.user?.picture) ? <img className="avatar" src={me?.picture || me?.user?.picture} alt="" /> : <div className="avatar">{((me?.name || me?.user?.name) || "İÇ").slice(0, 2).toUpperCase()}</div>}
              <span data-testid="user-name">{me?.name || me?.user?.name || "Yönetici"}</span>
              <span data-testid="user-role-pill" className={`role-pill role-${me?.role || me?.user?.role}`}>{ROLE_LABEL[me?.role || me?.user?.role] || me?.role_label || me?.user?.role_label}</span>
              <button data-testid="logout-button" className="icon-btn" title="Çıkış yap" aria-label="Oturumu kapat ve güvenli çıkış yap" onClick={onLogout}><LogOut size={16} aria-hidden="true" /></button>
            </div>
          </div>
        </header>
        <main id="main-content" role="main" tabIndex="-1" className={`content ${page === "students" || page === "documents" ? "content-fullwidth" : ""}`}>
          {page === "dashboard" && (
            <DashboardPage me={me} data={data} totalCollected={totalCollected} totalExpected={totalExpected} totalExpenses={totalExpenses} onOpen={guardedOpen} onNavigate={setPage} onSelect={setSelected} />
          )}
          {page === "kayit" && (
            <KayitModulu
              activeTab={kayitTab}
              setActiveTab={setKayitTab}
              students={data.students || []}
              classes={data.classes || []}
              teachers={data.teachers || []}
              onOpenWizard={() => guardedOpen("student")}
              onEditStudent={(st) => setEditingStudent(st)}
              onSelectStudent={(st) => {
                const targetNo = st?.sozlesme_no || st?.sozlesmeNo || st?.student_name;
                if (targetNo) {
                  try {
                    sessionStorage.setItem("cozum_open_contract_no", targetNo);
                    sessionStorage.setItem("cozum_contract_prev_page", "kayit");
                  } catch {}
                }
                setPage("documents");
              }}
              onNavigate={setPage}
            />
          )}
          {page === "exams" && (
            <ExamOpticalPage me={me} API={API} students={data.students || []} classes={data.classes || []} showOptikModal={showGlobalOptikModal} onCloseOptikModal={() => setShowGlobalOptikModal(false)} showKarneModal={showGlobalKarne} onCloseKarneModal={() => setShowGlobalKarne(null)} />
          )}
          {page === "attendance" && (
            <AcademicPage me={me} mode="attendance" classes={data.classes || []} students={data.students || []} teachers={data.teachers || []} API={API} reload={load} guardedOpen={guardedOpen} setSelected={setSelected} onNavigate={setPage} />
          )}
          {page === "schedules" && (
            <AcademicPage me={me} mode="schedules" classes={data.classes || []} students={data.students || []} teachers={data.teachers || []} API={API} reload={load} guardedOpen={guardedOpen} setSelected={setSelected} onNavigate={setPage} />
          )}
          {page === "students" && (
            <StudentsPage
              me={me}
              API={API}
              search={search}
              setSearch={setSearch}
              students={data.students || []}
              classes={data.classes || []}
              guardedOpen={guardedOpen}
              setSelected={setSelected}
              setPage={setPage}
              setShowGlobalKarne={setShowGlobalKarne}
              onEditStudent={(st) => setEditingStudent(st)}
            />
          )}
          {page === "payments" && (
            <AccountingPage me={me} data={data} onOpen={guardedOpen} onSelectStudent={setSelected} API={API} reload={load} activeTab={accountingTab} onTabChange={setAccountingTab} onNavigate={setPage} />
          )}
          {page === "vade" && (
            <AccountingPage me={me} data={data} onOpen={guardedOpen} onSelectStudent={setSelected} API={API} reload={load} activeTab="gecikenler" onTabChange={setAccountingTab} onNavigate={setPage} />
          )}
          {page === "tahsilat" && (
            <AccountingPage me={me} data={data} onOpen={guardedOpen} onSelectStudent={setSelected} API={API} reload={load} activeTab="tahsilatlar" onTabChange={setAccountingTab} onNavigate={setPage} />
          )}
          {page === "gelir" && (
            <AccountingPage me={me} data={data} onOpen={guardedOpen} onSelectStudent={setSelected} API={API} reload={load} activeTab="gelirler" onTabChange={setAccountingTab} onNavigate={setPage} />
          )}
          {page === "classes" && (
            <AcademicPage me={me} mode="classes" classes={data.classes || []} students={data.students || []} teachers={data.teachers || []} API={API} reload={load} guardedOpen={guardedOpen} setSelected={setSelected} onNavigate={setPage} />
          )}
          {page === "teachers" && (
            <AcademicPage me={me} mode="teachers" classes={data.classes || []} students={data.students || []} teachers={data.teachers || []} API={API} reload={load} guardedOpen={guardedOpen} setSelected={setSelected} onNavigate={setPage} />
          )}
          {page === "documents" && (
            <ContractsPage me={me} contracts={data.contracts || []} students={data.students || []} payments={data.payments || []} onNavigate={setPage} />
          )}
          {page === "reminders" && <Reminders />}
          {page === "reports" && <Reports me={me} data={data} />}
          {page === "users" && <UsersPage me={me} />}
          {page === "audit" && <AuditPage />}
        </main>
      </div>
      <MobileBottomNav page={page} setPage={setPage} setModal={setModal} canPayment={can(me, "payment_create")} />
      <EdesisStudentModal
        isOpen={modal === "student" || editingStudent !== null}
        onClose={() => { setModal(null); setEditingStudent(null); }}
        classes={data.classes || []}
        API={API}
        initialData={editingStudent}
        onStudentAdded={() => { load(); setModal(null); setEditingStudent(null); }}
      />
      {modal && modal !== "student" && <Modal type={modal} selected={selected} data={data} close={() => setModal(null)} reload={load} API={API} />}
      <StudentProfileModal
        student={selected}
        onClose={() => setSelected(null)}
        me={me}
        API={API}
        data={data}
        onEditStudent={(st) => { setSelected(null); setEditingStudent(st); }}
        onOpenPayment={() => guardedOpen("payment")}
        onNavigate={setPage}
        onOpenGelir={(st) => {
          setSelected(null);
          const targetNo = st?.sozlesme_no || st?.sozlesmeNo || st?.student_name;
          if (targetNo) {
            try {
              sessionStorage.setItem("cozum_open_contract_no", targetNo);
              sessionStorage.setItem("cozum_contract_prev_page", page);
            } catch {}
          }
          setPage("documents");
        }}
      />

      <EdesisTestBenchModal
        isOpen={showTestBench}
        onClose={() => setShowTestBench(false)}
        data={data}
        API={API}
        onOpenGlobalModal={guardedOpen}
        onNavigate={(p) => { setPage(p); setShowTestBench(false); }}
      />

      {showGlobalOptikModal && (
        <EdesisOptikModal
          exam={data.exams?.[0] || { id: "exam-001", title: "Özdebir LGS / TYT Deneme Sınavı", booklet_types: "A,B" }}
          onClose={() => setShowGlobalOptikModal(false)}
          API={API}
          students={data.students || []}
          classes={data.classes || []}
          onResultsUpdated={load}
        />
      )}

      {showGlobalKarne && <OfficialEdesisKarneModal data={showGlobalKarne} onClose={() => setShowGlobalKarne(null)} />}
      {showGlobalHataKarnesi && <HataKarnesiModal student={data.students?.[0] || { student_name: "Örnek Öğrenci", student_class: "TYT-AYT" }} onClose={() => setShowGlobalHataKarnesi(false)} />}
      {showGlobalPromissory && <PromissoryNoteModal student={data.students?.[0] || { student_name: "Örnek Öğrenci", total_fee: 55000, installment_count: 10 }} onClose={() => setShowGlobalPromissory(false)} />}
      {showGlobalAbsenceLetter && <AbsenceLetterModal student={data.students?.[0] || { student_name: "Örnek Öğrenci" }} daysAbsent={10} onClose={() => setShowGlobalAbsenceLetter(false)} />}
      
      <OmniSearchModal
        isOpen={showOmniSearch}
        onClose={() => setShowOmniSearch(false)}
        onSelectStudent={handleOmniSelectStudent}
        onSelectContract={handleOmniSelectContract}
        onSelectPayment={handleOmniSelectPayment}
      />
    </div>
  );
}

export const CANCELLED_STUDENT_NAMES = ["SERHAT SERBEST", "EMİR PARILDAR", "EMRİYE AYTAN", "NEVRA KILINÇ"];

export const ACTIVE_2026_CONTRACT_STUDENT_NAMES = [
  "SEBİLE AKDEMİR", "ELİFSU ÇAĞLAYAN", "YAVUZ EMİR BALCI",
  "MUSTAFA SİNİR", "ZEYNEP MASAL ÇELİK", "EBUBEKİR ASAF VERGİLİ"
];

export function getStudentCategory(s) {
  if (s?.is_kesin_kayit) return "kesin";
  const name = (s?.student_name || "").toUpperCase();
  let prog = s?.program || "";
  const fee = Number(s?.total_fee) || 0;

  if (ACTIVE_2026_CONTRACT_STUDENT_NAMES.some((k) => name.includes(k))) prog = "2026-2027";
  if (CANCELLED_STUDENT_NAMES.some((c) => name.includes(c)) || s?.status === "İptal / Ayrılan" || s?.enrollment_status === "İptal / Ayrılan") return "iptal";
  if (prog === "2026-2027-YAZ" || s?.status === "Yaz Kursu" || s?.enrollment_status === "Yaz Kursu") return "yaz";
  if (prog === "2025-2026" || s?.status === "Mezun / Geçmiş" || s?.enrollment_status === "Mezun / Geçmiş") return "mezun";
  if (fee < 10) return "deneme";
  return "kesin";
}

export default App;
