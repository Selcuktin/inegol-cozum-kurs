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
export const CLIENT_STORAGE_VERSION = "cozum_v8_20261010_data_normalization_fix";

export async function purgeClientStorage(preserveAuth = true) {
  if (typeof window === "undefined") return;
  try {
    console.log("[App] Purging all on-device site data and cache, upgraded to:", CLIENT_STORAGE_VERSION);
    const token = preserveAuth ? localStorage.getItem("session_token") : null;
    const customApi = preserveAuth ? localStorage.getItem("custom_api_url") : null;

    localStorage.clear();
    sessionStorage.clear();

    if (preserveAuth) {
      if (token) localStorage.setItem("session_token", token);
      if (customApi) localStorage.setItem("custom_api_url", customApi);
    }
    localStorage.setItem("cozum_app_version", CLIENT_STORAGE_VERSION);

    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        if (typeof indexedDB.databases === "function") {
          const dbs = await indexedDB.databases();
          await Promise.all(
            (dbs || []).map((db) => {
              if (db && db.name) {
                return new Promise((resolve) => {
                  const req = indexedDB.deleteDatabase(db.name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                });
              }
              return Promise.resolve();
            })
          );
        }
      } catch (e) {
        console.warn("[App] IndexedDB purge error:", e);
      }
    }

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all((names || []).map((name) => caches.delete(name)));
      } catch (e) {
        console.warn("[App] CacheStorage purge error:", e);
      }
    }

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          (registrations || []).map(async (reg) => {
            await reg.unregister().catch(() => {});
          })
        );
      } catch (e) {
        console.warn("[App] ServiceWorker purge error:", e);
      }
    }

    try {
      const cookies = document.cookie.split(";");
      const host = window.location.hostname || "";
      const domains = ["", host, `.${host}`];
      if (host.includes(".")) {
        const parts = host.split(".");
        if (parts.length >= 2) domains.push(`.${parts.slice(-2).join(".")}`);
      }
      cookies.forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
        if (name && (!preserveAuth || name !== "session_token")) {
          domains.forEach((d) => {
            const domAttr = d ? `;domain=${d}` : "";
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domAttr};`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax;Secure${domAttr};`;
          });
        }
      });
    } catch (e) {}
  } catch (err) {
    console.warn("[App] Purge error:", err);
  }
}

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
      if (urlToken) localStorage.setItem("session_token", urlToken);
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
  if (authState === "guest") return <Login API={API} onLoginSuccess={(user) => { setMe(user); setAuthState("authed"); }} />;
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

function MainApp({ me, onLogout }) {
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
    return () => window.removeEventListener("cozum_students_updated", handleUpdate);
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

  const navCategories = [
    {
      title: "KURUMSAL",
      items: [{ id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard, perm: "page_dashboard" }]
    },
    {
      title: "",
      items: [
        {
          id: "payments", label: "Muhasebe V2", icon: Wallet, perm: "page_payments", isTree: true, treeKey: "muhasebe",
          subItems: [
            {
              id: "p_dash", label: "Kontrol Paneli", icon: LayoutDashboard,
              activeCheck: () => page === "payments" && accountingTab === "dashboard",
              onClick: () => { setPage("payments"); setAccountingTab("dashboard"); setMobileOpen(false); }
            },
            {
              id: "p_gelir", label: "Gelir Yönetimi", isAccordion: true, subKey: "gelir", icon: Folder,
              children: [
                { id: "g_list", label: "Gelir Listesi", activeCheck: () => page === "gelir" || (page === "payments" && accountingTab === "gelirler"), onClick: () => { setPage("gelir"); setAccountingTab("gelirler"); setMobileOpen(false); } },
                { id: "g_szl", label: "Sözleşmeler", activeCheck: () => page === "documents", onClick: () => { try { sessionStorage.removeItem("cozum_open_contract_no"); } catch {} if (typeof window !== "undefined") window.location.hash = "documents"; setPage("documents"); setMobileOpen(false); } },
                { id: "g_vade", label: "Vade Takvimi", activeCheck: () => page === "vade" || (page === "payments" && accountingTab === "gecikenler"), onClick: () => { setPage("vade"); setMobileOpen(false); } },
                { id: "g_tahs", label: "Tahsilat Listesi", activeCheck: () => page === "tahsilat" || (page === "payments" && accountingTab === "tahsilatlar"), onClick: () => { setPage("tahsilat"); setMobileOpen(false); } },
                { id: "g_cust", label: "Müşteriler", activeCheck: () => page === "students", onClick: () => { setPage("students"); setMobileOpen(false); } }
              ]
            },
            {
              id: "p_gider", label: "Gider Yönetimi", isAccordion: true, subKey: "gider", icon: TrendingDown,
              children: [
                { id: "gid_list", label: "Gider Listesi", activeCheck: () => page === "payments" && accountingTab === "giderler", onClick: () => { setPage("payments"); setAccountingTab("giderler"); setMobileOpen(false); } },
                { id: "gid_add", label: "Yeni Gider Ekle", onClick: () => { guardedOpen("expense"); setMobileOpen(false); } }
              ]
            },
            ...(ENABLE_KASA_BANKA ? [{
              id: "p_kasa", label: "Kasa ve Banka", isAccordion: true, subKey: "kasa", icon: Building,
              children: [
                { id: "k_def", label: "Kasa Defteri", activeCheck: () => page === "payments" && accountingTab === "kasalar", onClick: () => { setPage("payments"); setAccountingTab("kasalar"); setMobileOpen(false); } },
                { id: "k_gun", label: "Kasa Raporu Yazdır", onClick: () => { window.print(); setMobileOpen(false); } },
                { id: "k_makbuz", label: "Tahsilat Makbuzu Kes", onClick: () => { guardedOpen("payment"); setMobileOpen(false); } },
                { id: "k_senet", label: "Matbu Senet (Bono) Yazdır", onClick: () => { setShowGlobalPromissory(true); setMobileOpen(false); } },
                { id: "k_bak", label: "Bakiyeler & Hesaplar", activeCheck: () => page === "payments" && accountingTab === "dashboard", onClick: () => { setPage("payments"); setAccountingTab("dashboard"); setMobileOpen(false); } },
                { id: "k_backup", label: "💾 Otomatik Yedekleme (20:00)", activeCheck: () => page === "payments" && accountingTab === "backup", onClick: () => { setPage("payments"); setAccountingTab("backup"); setMobileOpen(false); } }
              ]
            }] : [])
          ]
        }
      ]
    },
    {
      title: "",
      items: [
        {
          id: "kayit", label: "Kayıt İşlemleri", icon: Users, perm: "page_students", isTree: true, treeKey: "kayit",
          subItems: [
            { id: "k_kokpit", label: "Kayıt Kokpiti", icon: TrendingUp, activeCheck: () => page === "kayit" && kayitTab === "kokpit", onClick: () => { setPage("kayit"); setKayitTab("kokpit"); setMobileOpen(false); } },
            { id: "k_ogrenciler", label: "Öğrenciler", icon: UserPlus, activeCheck: () => page === "students", onClick: () => { setPage("students"); setMobileOpen(false); } },
            { id: "k_ogretmenler", label: "Öğretmenler & Kadro", icon: GraduationCap, activeCheck: () => page === "teachers", onClick: () => { setPage("teachers"); setMobileOpen(false); } },
            { id: "k_siniflar", label: "Sınıflar & Şubeler", icon: BookOpen, activeCheck: () => page === "classes", onClick: () => { setPage("classes"); setMobileOpen(false); } },
            { id: "k_raporlar", label: "Kayıt Raporları", icon: FileText, activeCheck: () => page === "kayit" && kayitTab === "raporlar", onClick: () => { setPage("kayit"); setKayitTab("raporlar"); setMobileOpen(false); } },
            {
              id: "k_araclar", label: "Araçlar ve Ayarlar", isAccordion: true, subKey: "kayit_araclar", icon: Settings,
              children: [
                { id: "k_sifre", label: "Geçici Şifreler (SMS)", activeCheck: () => page === "kayit" && kayitTab === "sifreler", onClick: () => { setPage("kayit"); setKayitTab("sifreler"); setMobileOpen(false); } },
                { id: "k_donem", label: "Dönem Geçiş Sihirbazı", activeCheck: () => page === "kayit" && kayitTab === "donem", onClick: () => { setPage("kayit"); setKayitTab("donem"); setMobileOpen(false); } },
                { id: "k_ayar", label: "Kayıt Ayarları", activeCheck: () => page === "kayit" && kayitTab === "ayarlar", onClick: () => { setPage("kayit"); setKayitTab("ayarlar"); setMobileOpen(false); } }
              ]
            },
            {
              id: "k_bursluluk", label: "Bursluluk ve STS Modülü", isAccordion: true, subKey: "kayit_bursluluk", icon: Award,
              children: [
                { id: "k_aday", label: "Adaylar & Ön Kayıtlar", activeCheck: () => page === "kayit" && kayitTab === "adaylar", onClick: () => { setPage("kayit"); setKayitTab("adaylar"); setMobileOpen(false); } },
                { id: "k_form", label: "Ön Kayıt Formları & Şubeler", activeCheck: () => page === "kayit" && kayitTab === "adaylar", onClick: () => { setPage("kayit"); setKayitTab("adaylar"); setMobileOpen(false); } },
                { id: "k_seans", label: "Sınav Seansları & Salonları", activeCheck: () => page === "kayit" && kayitTab === "adaylar", onClick: () => { setPage("kayit"); setKayitTab("adaylar"); setMobileOpen(false); } }
              ]
            }
          ]
        }
      ]
    },
    {
      title: "",
      items: [
        {
          id: "exams", label: "Deneme Sınavları & Karne", icon: Award, perm: "page_exams", isTree: true, treeKey: "olcme",
          subItems: [
            { id: "exams_list", label: "Deneme Sınavları Listesi", icon: Award, activeCheck: () => page === "exams" && !showGlobalOptikModal && !showGlobalHataKarnesi, onClick: () => { setPage("exams"); setMobileOpen(false); } },
            { id: "optik_omr", label: "Optik Okuma & Şablonlar (OMR)", icon: Sparkles, onClick: () => { setPage("exams"); setShowGlobalOptikModal(true); setMobileOpen(false); } },
            { id: "hata_karnesi", label: "Kazanım & Hata Karneleri", icon: Target, onClick: () => { setShowGlobalHataKarnesi(true); setMobileOpen(false); } },
            { id: "kalibrasyon", label: "Milimetrik Kalibrasyon & Baskı", icon: Printer, onClick: () => { setPage("exams"); setShowGlobalOptikModal(true); setMobileOpen(false); } }
          ]
        }
      ]
    },
    {
      title: "EĞİTİM & AKADEMİK",
      items: [
        { id: "schedules", label: "Ders Programı", icon: Calendar, perm: "page_schedules" },
        { id: "attendance", label: "Günlük Yoklama", icon: CalendarCheck, perm: "page_attendance" }
      ]
    },
    {
      title: "SİSTEM & YÖNETİM",
      items: [
        { id: "reports", label: "Aylık Muhasebe Raporu", icon: FileDown, perm: "page_reports" },
        { id: "reminders", label: "Taksit Takibi & Risk", icon: BellRing, perm: "page_reminders" },
        { id: "users", label: "Kullanıcılar & Roller", icon: UserCog, perm: "page_users" },
        { id: "audit", label: "Denetim Kaydı", icon: History, perm: "page_audit" },
        {
          id: "backup", label: "Otomatik Yedekleme (20:00)", icon: ShieldCheck, perm: "page_payments",
          activeCheck: () => page === "payments" && accountingTab === "backup",
          customAction: () => { setPage("payments"); setAccountingTab("backup"); }
        }
      ]
    }
  ];

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
            {me?.picture ? <img className="avatar" src={me.picture} alt="" /> : <div className="avatar">{(me?.name || "İÇ").slice(0, 2).toUpperCase()}</div>}
            <div><b>{me?.name || "Kurs Yönetimi"}</b><small data-testid="user-role">{ROLE_LABEL[me?.role] || me?.role_label || "Kullanıcı"}</small></div>
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
                <div className="edesis-quick-dropdown" onClick={() => setQuickOpen(false)} role="menu">
                  <div className="quick-dropdown-header">HIZLI İŞLEMLER</div>
                  <div className="quick-dropdown-grid">
                    <div className="quick-col">
                      <div className="quick-col-title">MUHASEBE</div>
                      <button type="button" role="menuitem" onClick={() => setPage("documents")}><FileText size={14} style={{ color: "#2563eb" }} aria-hidden="true" /> Yeni Sözleşme <ChevronRight size={12} aria-hidden="true" /></button>
                      <button type="button" role="menuitem" onClick={() => guardedOpen("payment")}><CircleDollarSign size={14} style={{ color: "#8b5cf6" }} aria-hidden="true" /> Tahsilat Al <ChevronRight size={12} aria-hidden="true" /></button>
                      <button type="button" role="menuitem" onClick={() => guardedOpen("expense")}><TrendingDown size={14} style={{ color: "#ef4444" }} aria-hidden="true" /> Hızlı Gider <ChevronRight size={12} aria-hidden="true" /></button>
                    </div>
                    <div className="quick-col">
                      <div className="quick-col-title">SINAV & ANALİZ</div>
                      <button type="button" role="menuitem" onClick={() => setPage("exams")}><GraduationCap size={14} style={{ color: "#8b5cf6" }} aria-hidden="true" /> Yeni Sınav / Deneme <ChevronRight size={12} aria-hidden="true" /></button>
                      <button type="button" role="menuitem" onClick={() => setShowGlobalKarne({ student_name: data.students?.[0]?.student_name || "Öğrenci", student_class: "7-A", score: 445.5, total_net: 62.5, overall_rank: 2, class_rank: 1, booklet: "A", exam: data.exams?.[0] || { title: "Kurumsal Deneme" } })}><Target size={14} style={{ color: "#0d9488" }} aria-hidden="true" /> Sınav Karnesi <ChevronRight size={12} aria-hidden="true" /></button>
                      <button type="button" role="menuitem" onClick={() => setPage("attendance")}><UserCheck size={14} style={{ color: "#16a34a" }} aria-hidden="true" /> Günlük Yoklama <ChevronRight size={12} aria-hidden="true" /></button>
                    </div>
                    <div className="quick-col">
                      <div className="quick-col-title">KAYIT & SİSTEM</div>
                      <button type="button" role="menuitem" onClick={() => guardedOpen("student")}><UserPlus size={14} style={{ color: "#d97706" }} aria-hidden="true" /> Yeni Öğrenci Kaydı <ChevronRight size={12} aria-hidden="true" /></button>
                      <button type="button" role="menuitem" onClick={() => setPage("schedules")}><Clock size={14} style={{ color: "#2563eb" }} aria-hidden="true" /> Ders Programı <ChevronRight size={12} aria-hidden="true" /></button>
                      <button type="button" role="menuitem" onClick={() => setPage("classes")}><Users size={14} style={{ color: "#4f46e5" }} aria-hidden="true" /> Sınıf & Kontenjan <ChevronRight size={12} aria-hidden="true" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="top-search">
            <Search size={17} aria-hidden="true" />
            <input
              data-testid="global-search-input"
              role="searchbox"
              aria-label="Genel arama: öğrenci, veli veya telefon ara"
              placeholder="Öğrenci, veli veya telefon ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (can(me, "page_students")) setPage("students"); }}
            />
          </div>
          <div className="top-actions">
            <span className="today-label">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
            <button data-testid="notifications-button" className="icon-btn" aria-label="Bildirimler"><Bell size={18} aria-hidden="true" /><i aria-hidden="true" /></button>
            <div className="user-mini">
              {me?.picture ? <img className="avatar" src={me.picture} alt="" /> : <div className="avatar">{(me?.name || "İÇ").slice(0, 2).toUpperCase()}</div>}
              <span data-testid="user-name">{me?.name || "Yönetici"}</span>
              <span data-testid="user-role-pill" className={`role-pill role-${me?.role}`}>{ROLE_LABEL[me?.role] || me?.role_label}</span>
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
            <StudentsPage me={me} API={API} search={search} setSearch={setSearch} students={data.students || []} guardedOpen={guardedOpen} setSelected={setSelected} setPage={setPage} setShowGlobalKarne={setShowGlobalKarne} />
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
