import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import axios from "axios";
import {
  Award,
  Bell,
  BellRing,
  BookOpen,
  Calendar,
  CalendarCheck,
  Camera,
  CheckSquare,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileDown,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  Plus,
  Printer,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  X,
  Zap,
  GraduationCap,
  UserCheck,
  UserPlus,
  User,
  Clock,
  Edit,
  Trash2,
  PieChart,
  Layers,
  MessageCircle,
  Sun,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Folder,
  CreditCard,
  Building
} from "lucide-react";
import {
  openWhatsApp,
  OfficialEdesisKarneModal,
  EdesisOptikModal,
  ExamsPage,
  AttendancePage,
  SchedulesPage,
  EdesisDashboardWidgets
} from "./EdesisModules";
import { EdesisStudentModal } from "./components/EdesisStudentModal";
import { PromissoryNoteModal } from "./components/PromissoryNoteModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { AbsenceLetterModal } from "./components/AbsenceLetterModal";
import { HataKarnesiModal } from "./components/HataKarnesiModal";
import { ClassDetailModal } from "./components/ClassDetailModal";
import { MuhasebeV2Dashboard } from "./components/MuhasebeV2Dashboard";
import { GelirDetayModal } from "./components/GelirDetayModal";
import { EdesisTestBenchModal } from "./components/EdesisTestBenchModal";
import { TeachersPage } from "./components/TeachersPage";
import { MonthlyReportPreview } from "./components/MonthlyReportPreview";
import { KayitModulu } from "./components/KayitModulu";
import EdesisSozlesmeler from "./components/EdesisSozlesmeler";
import EdesisOgrenciListesi from "./components/EdesisOgrenciListesi";
import EdesisGelirListesi from "./components/EdesisGelirListesi";

export const getBackendBaseUrl = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryApi = params.get("api");
    if (queryApi) {
      const clean = queryApi.replace(/\/+$/, "");
      localStorage.setItem("custom_api_url", clean);
      return clean;
    }
    const saved = localStorage.getItem("custom_api_url");
    if (saved && !saved.includes("loca.lt")) return saved;
  }
  if (process.env.REACT_APP_BACKEND_URL && !process.env.REACT_APP_BACKEND_URL.includes("localhost")) {
    return process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, "");
  }
  return "";
};

const API = `${getBackendBaseUrl()}/api`;
axios.defaults.withCredentials = true;
axios.defaults.headers.common["Bypass-Tunnel-Reminder"] = "true";
const money = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);
const LOGO = "/assets/logo.jpeg";

const ROLE_LABEL = { admin: "Yönetici", muhasebe: "Muhasebe", ogretmen: "Öğretmen" };
const CAN = {
  student_create:  ["admin"],
  payment_create:  ["admin", "muhasebe"],
  expense_create:  ["admin", "muhasebe"],
  class_create:    ["admin"],
  audit_view:      ["admin"],
  user_manage:     ["admin"],
  reports_view:    ["admin", "muhasebe"],
  reminders_view:  ["admin", "muhasebe"],
  export_data:     ["admin", "muhasebe"],
  page_dashboard:  ["admin", "muhasebe", "ogretmen"],
  page_students:   ["admin", "muhasebe", "ogretmen"],
  page_exams:      ["admin", "muhasebe", "ogretmen"],
  page_attendance: ["admin", "ogretmen"],
  page_schedules:  ["admin", "muhasebe", "ogretmen"],
  page_payments:   ["admin", "muhasebe"],
  page_classes:    ["admin", "ogretmen"],
  page_teachers:   ["admin", "muhasebe", "ogretmen"],
  page_documents:  ["admin", "muhasebe", "ogretmen"],
  page_users:      ["admin"],
  page_audit:      ["admin"],
  page_reports:    ["admin", "muhasebe"],
  page_reminders:  ["admin", "muhasebe"],
};
const can = (me, action) => !!me && (CAN[action] || []).includes(me.role);

async function downloadBlob(url, filename) {
  const r = await axios.get(url, { responseType: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(r.data);
  link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 800);
}

function Brand({ tight = false }) {
  return <div className={tight ? "brand tight" : "brand"}>
    <img className="brand-logo" src={LOGO} alt="İnegöl Çözüm Kurs" />
    <div><strong>İNEGÖL ÇÖZÜM</strong><span>KURS YÖNETİM</span></div>
  </div>;
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AuthCallback() {
  const processed = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    if (!sessionId) { window.location.replace("/"); return; }
    (async () => {
      try {
        await axios.post(`${API}/auth/session`, null, { headers: { "X-Session-ID": sessionId } });
        window.history.replaceState(null, "", "/");
        window.location.replace("/");
      } catch (e) {
        const detail = e.response?.data?.detail || "Giriş doğrulanamadı. Lütfen tekrar deneyin.";
        setError(detail);
        setTimeout(() => { window.history.replaceState(null, "", "/"); }, 400);
      }
    })();
  }, []);
  return <div className="auth-screen"><div className="auth-card"><Brand tight /><h1>{error ? "Erişim reddedildi" : "Giriş yapılıyor..."}</h1><p>{error || "Google hesabınız doğrulanıyor, lütfen bekleyin."}</p>{error && <a data-testid="auth-error-back" className="google-btn" href="/">Giriş ekranına dön</a>}</div></div>;
}

function Login({ onLoginSuccess }) {
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [activeRole, setActiveRole] = useState(null); // 'admin' | 'muhasebe' | 'ogretmen' | null
  const [rolePassword, setRolePassword] = useState("");

  const handleQuickLogin = async (role, password) => {
    if (!password || !password.trim()) {
      setQuickError("Lütfen giriş şifresini yazınız.");
      return;
    }
    setQuickLoading(true);
    setQuickError("");
    try {
      const res = await axios.post(`${API}/auth/quick-login`, { role, password: password.trim() });
      if (res.data?.session_token) {
        localStorage.setItem("session_token", res.data.session_token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.session_token}`;
      }
      if (onLoginSuccess) {
        onLoginSuccess(res.data);
      }
    } catch (e) {
      setQuickError(e.response?.data?.detail || "Giriş başarısız oldu. Lütfen şifrenizi kontrol edin.");
    } finally {
      setQuickLoading(false);
    }
  };

  const signIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <Brand tight />
        <h1>Yönetim paneline giriş</h1>
        <p>Sadece yetkilendirilmiş <b>İnegöl Çözüm Kurs</b> personeli giriş yapabilir.</p>

        {activeRole ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickLogin(activeRole, rolePassword);
            }}
            style={{
              margin: "16px 0",
              padding: "16px",
              borderRadius: "12px",
              background: "var(--bg-secondary, #f8fafc)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text)" }}>
                {activeRole === "admin" && "👑 Yönetici Girişi"}
                {activeRole === "muhasebe" && "💼 Muhasebe Girişi"}
                {activeRole === "ogretmen" && "📚 Öğretmen Girişi"}
              </div>
              <button
                type="button"
                onClick={() => { setActiveRole(null); setRolePassword(""); setQuickError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "12px", padding: "4px" }}
              >
                ✕ Geri Dön
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px", fontWeight: "600" }}>
                {activeRole === "admin" ? "Yönetici Parolasını Giriniz:" : "Giriş Şifresini Giriniz (4321):"}
              </label>
              <input
                type="password"
                autoFocus
                value={rolePassword}
                onChange={(e) => setRolePassword(e.target.value)}
                placeholder={activeRole === "admin" ? "Yönetici parolası" : "Şifre (4321)"}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {quickError && <div className="modal-error" style={{ marginBottom: "12px", fontSize: "12px" }}>{quickError}</div>}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                className="btn"
                disabled={quickLoading || !rolePassword}
                style={{
                  flex: 1,
                  justifyContent: "center",
                  background: activeRole === "admin" ? "#1d4ed8" : "#2563eb",
                  fontWeight: "600"
                }}
              >
                {quickLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => { setActiveRole(null); setRolePassword(""); setQuickError(""); }}
              >
                İptal
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "grid", gap: "8px", margin: "16px 0" }}>
            <button
              data-testid="quick-login-admin"
              className="btn"
              style={{ width: "100%", justifyContent: "center", background: "#1d4ed8" }}
              disabled={quickLoading}
              onClick={() => { setActiveRole("admin"); setRolePassword(""); setQuickError(""); }}
            >
              👑 Yönetici Olarak Hızlı Giriş (Admin)
            </button>
            <button
              data-testid="quick-login-muhasebe"
              className="btn secondary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={quickLoading}
              onClick={() => { setActiveRole("muhasebe"); setRolePassword(""); setQuickError(""); }}
            >
              💼 Muhasebe Olarak Hızlı Giriş
            </button>
            <button
              data-testid="quick-login-ogretmen"
              className="btn secondary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={quickLoading}
              onClick={() => { setActiveRole("ogretmen"); setRolePassword(""); setQuickError(""); }}
            >
              📚 Öğretmen Olarak Hızlı Giriş
            </button>
          </div>
        )}

        {quickError && !activeRole && <div className="modal-error" style={{ marginBottom: "12px" }}>{quickError}</div>}

        <div style={{ textAlign: "center", margin: "12px 0 10px", color: "var(--muted)", fontSize: "11px", fontWeight: "600" }}>
          VEYA BULUT GİRİŞİ
        </div>

        <button data-testid="google-login-button" className="google-btn" onClick={signIn}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google ile giriş yap
        </button>
        <div className="auth-foot"><ShieldCheck size={13} /> Yetkili personel dışı erişim engellenir</div>

        {typeof window !== "undefined" && window.location.search.includes("dev=1") && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed var(--border)", fontSize: "11px", color: "var(--muted)", textAlign: "center" }}>
            <details>
              <summary style={{ cursor: "pointer", userSelect: "none" }}>⚙️ Sunucu API: <span style={{ color: "var(--primary)", fontWeight: "600" }}>{getBackendBaseUrl() || "Yerel (Varsayılan)"}</span></summary>
              <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="Örn: http://192.168.1.5:8000"
                  defaultValue={localStorage.getItem("custom_api_url") || ""}
                  id="custom-api-input"
                  style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", width: "100%", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => {
                      const el = document.getElementById("custom-api-input");
                      const val = el ? el.value.trim().replace(/\/+$/, "") : "";
                      if (val) {
                        localStorage.setItem("custom_api_url", val);
                      } else {
                        localStorage.removeItem("custom_api_url");
                      }
                      window.location.reload();
                    }}
                  >
                    Kaydet & Yenile
                  </button>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [authState, setAuthState] = useState("checking");
  const [me, setMe] = useState(null);
  const hasSessionInUrl = typeof window !== "undefined" && window.location.hash.includes("session_id=");

  useEffect(() => {
    if (hasSessionInUrl) return;
    const token = localStorage.getItem("session_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    (async () => {
      try {
        const r = await axios.get(`${API}/auth/me`);
        setMe(r.data);
        setAuthState("authed");
      } catch { setAuthState("guest"); }
    })();
  }, [hasSessionInUrl]);

  if (hasSessionInUrl) return <AuthCallback />;
  if (authState === "checking") return <div className="auth-screen"><div className="auth-card"><h1>Yükleniyor...</h1></div></div>;
  if (authState === "guest") return <Login onLoginSuccess={(user) => { setMe(user); setAuthState("authed"); }} />;
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

function PwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || !deferredPrompt) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="pwa-banner" data-testid="pwa-banner">
      <div className="pwa-info">
        <img src={LOGO} alt="İnegöl Çözüm" className="pwa-logo" />
        <div>
          <strong>Çözüm Kurs Uygulamasını Cihazınıza Yükleyin</strong>
          <span>Mobil ana ekrana ekleyip tek tıkla tam ekran kullanın</span>
        </div>
      </div>
      <div className="pwa-actions">
        <button className="btn pwa-install-btn" onClick={install}>Yükle</button>
        <button className="pwa-close-btn" onClick={() => setDismissed(true)}><X size={16} /></button>
      </div>
    </div>
  );
}

function MobileBottomNav({ page, setPage, setModal, canPayment }) {
  return (
    <nav className="mobile-bottom-nav">
      <button className={`nav-btn ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
        <LayoutDashboard size={20} />
        <span>Genel Bakış</span>
      </button>
      <button className={`nav-btn ${page === "exams" ? "active" : ""}`} onClick={() => setPage("exams")}>
        <Award size={20} />
        <span>Sınavlar</span>
      </button>
      <button className={`nav-btn ${page === "attendance" ? "active" : ""}`} onClick={() => setPage("attendance")}>
        <CalendarCheck size={20} />
        <span>Yoklama</span>
      </button>
      <button className={`nav-btn ${page === "kayit" || page === "students" ? "active" : ""}`} onClick={() => setPage("kayit")}>
        <Users size={20} />
        <span>Kayıt / Öğrenci</span>
      </button>
      <button className={`nav-btn ${page === "payments" ? "active" : ""}`} onClick={() => setPage("payments")}>
        <Wallet size={20} />
        <span>Tahsilat</span>
      </button>
    </nav>
  );
}

function MainApp({ me, onLogout }) {
  const [data, setData] = useState({ summary: {}, students: [], classes: [], payments: [], expenses: [], exams: [], attendanceToday: [], topRankings: [], todaySchedules: [] });
  const validPages = ["dashboard", "kayit", "students", "classes", "teachers", "exams", "attendance", "schedules", "payments", "gelir", "reminders", "documents", "reports", "users", "audit"];
  const getInitialPage = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && validPages.includes(hash)) return hash;
      const saved = localStorage.getItem("active_page");
      if (saved && validPages.includes(saved)) return saved;
    }
    return "dashboard";
  };
  const [page, setPageState] = useState(getInitialPage);
  const setPage = (p) => {
    setPageState(p);
    if (typeof window !== "undefined") {
      window.location.hash = p;
      localStorage.setItem("active_page", p);
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h && validPages.includes(h)) {
        setPageState(h);
        localStorage.setItem("active_page", h);
        if (h === "payments") {
          setAccountingTab("dashboard");
        }
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
  const [gelirModalData, setGelirModalData] = useState(null);

  // Edesis Tree Navigation & Module States
  const [kayitTab, setKayitTab] = useState("kokpit");
  const [accountingTab, setAccountingTab] = useState("dashboard");
  const [showTestBench, setShowTestBench] = useState(false);
  const [showGlobalOptikModal, setShowGlobalOptikModal] = useState(false);
  const [showGlobalKarne, setShowGlobalKarne] = useState(null);
  const [showGlobalHataKarnesi, setShowGlobalHataKarnesi] = useState(false);
  const [showGlobalPromissory, setShowGlobalPromissory] = useState(false);
  const [showGlobalAbsenceLetter, setShowGlobalAbsenceLetter] = useState(false);

  const [expandedTree, setExpandedTree] = useState({
    kayit: true,
    kayit_araclar: false,
    kayit_bursluluk: false,
    olcme: true,
    teachers: true,
    muhasebe: true,
    gelir: true,
    kasa: true,
    gider: false
  });
  const toggleTree = (key) => setExpandedTree((prev) => ({ ...prev, [key]: !prev[key] }));


  const load = async () => { const r = await axios.get(`${API}/dashboard`); setData(r.data); };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => (data.students || []).filter(s => `${s.student_name} ${s.parent_name} ${s.student_phone}`.toLowerCase().includes(search.toLowerCase())), [data.students, search]);
  const totalCollected = data.summary?.collected || (data.students || []).reduce((a, s) => a + (s.paid_amount || 0), 0);
  const totalExpected = (data.students || []).reduce((a, s) => a + computeEffective(s).effective, 0);
  const totalExpenses = data.summary?.expenses || (data.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);

  const navCategories = [
    {
      title: "KURUMSAL",
      items: [
        { id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard, perm: "page_dashboard" }
      ]
    },
    {
      title: "FİNANS & MUHASEBE",
      items: [
        {
          id: "payments",
          label: "Muhasebe V2",
          icon: Wallet,
          perm: "page_payments",
          isTree: true,
          treeKey: "muhasebe",
          subItems: [
            {
              id: "p_dash",
              label: "Kontrol Paneli",
              icon: LayoutDashboard,
              activeCheck: () => page === "payments" && accountingTab === "dashboard",
              onClick: () => { setPage("payments"); setAccountingTab("dashboard"); setMobileOpen(false); }
            },
            {
              id: "p_gelir",
              label: "Gelir Yönetimi",
              isAccordion: true,
              subKey: "gelir",
              icon: Folder,
              children: [
                { id: "g_list", label: "Gelir Listesi", activeCheck: () => page === "gelir" || (page === "payments" && accountingTab === "gelirler"), onClick: () => { setPage("gelir"); setAccountingTab("gelirler"); setMobileOpen(false); } },
                { id: "g_szl", label: "Sözleşmeler", activeCheck: () => page === "documents", onClick: () => { setPage("documents"); setMobileOpen(false); } },
                { id: "g_vade", label: "Vade Takvimi", activeCheck: () => page === "payments" && accountingTab === "gecikenler", onClick: () => { setPage("payments"); setAccountingTab("gecikenler"); setMobileOpen(false); } },
                { id: "g_tahs", label: "Tahsilat Listesi", activeCheck: () => page === "payments" && accountingTab === "tahsilatlar", onClick: () => { setPage("payments"); setAccountingTab("tahsilatlar"); setMobileOpen(false); } },
                { id: "g_senet", label: "Fatura Planı", activeCheck: () => page === "payments" && accountingTab === "senetler", onClick: () => { setPage("payments"); setAccountingTab("senetler"); setMobileOpen(false); } },
                { id: "g_cust", label: "Müşteriler", activeCheck: () => page === "students", onClick: () => { setPage("students"); setMobileOpen(false); } }
              ]
            },
            {
              id: "p_gider",
              label: "Gider Yönetimi",
              isAccordion: true,
              subKey: "gider",
              icon: TrendingDown,
              children: [
                { id: "gid_list", label: "Gider Listesi", activeCheck: () => page === "payments" && accountingTab === "giderler", onClick: () => { setPage("payments"); setAccountingTab("giderler"); setMobileOpen(false); } },
                { id: "gid_add", label: "Yeni Gider Ekle", onClick: () => { guardedOpen("expense"); setMobileOpen(false); } }
              ]
            },
            {
              id: "p_kasa",
              label: "Kasa ve Banka",
              isAccordion: true,
              subKey: "kasa",
              icon: Building,
              children: [
                { id: "k_def", label: "Kasa Defteri", activeCheck: () => page === "payments" && accountingTab === "kasalar", onClick: () => { setPage("payments"); setAccountingTab("kasalar"); setMobileOpen(false); } },
                { id: "k_gun", label: "Kasa Raporu Yazdır", onClick: () => { window.print(); setMobileOpen(false); } },
                { id: "k_makbuz", label: "Tahsilat Makbuzu Kes", onClick: () => { guardedOpen("payment"); setMobileOpen(false); } },
                { id: "k_senet", label: "Matbu Senet (Bono) Yazdır", onClick: () => { setShowGlobalPromissory(true); setMobileOpen(false); } },
                { id: "k_bak", label: "Bakiyeler & Hesaplar", activeCheck: () => page === "payments" && accountingTab === "dashboard", onClick: () => { setPage("payments"); setAccountingTab("dashboard"); setMobileOpen(false); } },
                { id: "k_backup", label: "💾 Otomatik Yedekleme (20:00)", activeCheck: () => page === "payments" && accountingTab === "backup", onClick: () => { setPage("payments"); setAccountingTab("backup"); setMobileOpen(false); } }
              ]
            }
          ]
        },
        { id: "reminders", label: "Taksit Takibi & Risk", icon: BellRing, perm: "page_reminders" },
        { id: "documents", label: "Sözleşme & Makbuz", icon: FileText, perm: "page_documents" },
        { id: "reports", label: "Aylık Rapor", icon: FileDown, perm: "page_reports" }
      ]
    },
    {
      title: "",
      items: [
        {
          id: "kayit",
          label: "Kayıt İşlemleri",
          icon: Users,
          perm: "page_students",
          isTree: true,
          treeKey: "kayit",
          subItems: [
            {
              id: "k_kokpit",
              label: "Kayıt Kokpiti",
              icon: TrendingUp,
              activeCheck: () => page === "kayit" && kayitTab === "kokpit",
              onClick: () => { setPage("kayit"); setKayitTab("kokpit"); setMobileOpen(false); }
            },
            {
              id: "k_ogrenciler",
              label: "Öğrenciler",
              icon: UserPlus,
              activeCheck: () => page === "students",
              onClick: () => { setPage("students"); setMobileOpen(false); }
            },
            {
              id: "k_ogretmenler",
              label: "Öğretmenler & Kadro",
              icon: GraduationCap,
              activeCheck: () => page === "teachers",
              onClick: () => { setPage("teachers"); setMobileOpen(false); }
            },
            {
              id: "k_siniflar",
              label: "Sınıflar & Şubeler",
              icon: BookOpen,
              activeCheck: () => page === "classes",
              onClick: () => { setPage("classes"); setMobileOpen(false); }
            },
            {
              id: "k_raporlar",
              label: "Kayıt Raporları",
              icon: FileText,
              activeCheck: () => page === "kayit" && kayitTab === "raporlar",
              onClick: () => { setPage("kayit"); setKayitTab("raporlar"); setMobileOpen(false); }
            },
            {
              id: "k_araclar",
              label: "Araçlar ve Ayarlar",
              isAccordion: true,
              subKey: "kayit_araclar",
              icon: Settings,
              children: [
                { id: "k_sifre", label: "Geçici Şifreler (SMS)", activeCheck: () => page === "kayit" && kayitTab === "sifreler", onClick: () => { setPage("kayit"); setKayitTab("sifreler"); setMobileOpen(false); } },
                { id: "k_donem", label: "Dönem Geçiş Sihirbazı", activeCheck: () => page === "kayit" && kayitTab === "donem", onClick: () => { setPage("kayit"); setKayitTab("donem"); setMobileOpen(false); } },
                { id: "k_ayar", label: "Kayıt Ayarları", activeCheck: () => page === "kayit" && kayitTab === "ayarlar", onClick: () => { setPage("kayit"); setKayitTab("ayarlar"); setMobileOpen(false); } }
              ]
            },
            {
              id: "k_bursluluk",
              label: "Bursluluk ve STS Modülü",
              isAccordion: true,
              subKey: "kayit_bursluluk",
              icon: Award,
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
          id: "exams",
          label: "Deneme Sınavları & Karne",
          icon: Award,
          perm: "page_exams",
          isTree: true,
          treeKey: "olcme",
          subItems: [
            {
              id: "exams_list",
              label: "Deneme Sınavları Listesi",
              icon: Award,
              activeCheck: () => page === "exams" && !showGlobalOptikModal && !showGlobalHataKarnesi,
              onClick: () => { setPage("exams"); setMobileOpen(false); }
            },
            {
              id: "optik_omr",
              label: "Optik Okuma & Şablonlar (OMR)",
              icon: Sparkles,
              onClick: () => { setPage("exams"); setShowGlobalOptikModal(true); setMobileOpen(false); }
            },
            {
              id: "hata_karnesi",
              label: "Kazanım & Hata Karneleri",
              icon: Target,
              onClick: () => { setShowGlobalHataKarnesi(true); setMobileOpen(false); }
            },
            {
              id: "kalibrasyon",
              label: "Milimetrik Kalibrasyon & Baskı",
              icon: Printer,
              onClick: () => { setPage("exams"); setShowGlobalOptikModal(true); setMobileOpen(false); }
            }
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
        {
          id: "testbench",
          label: "🧪 Edesis Test Vitrini",
          icon: Sparkles,
          perm: "page_dashboard",
          customAction: () => setShowTestBench(true)
        },
        { id: "users", label: "Kullanıcılar & Roller", icon: UserCog, perm: "page_users" },
        { id: "audit", label: "Denetim Kaydı", icon: History, perm: "page_audit" }
      ]
    }
  ];

  const [quickOpen, setQuickOpen] = useState(false);
  const guardedOpen = (type) => setModal(type);

  return <div className="app-shell">
    {mobileOpen && (
      <div
        className="sidebar-backdrop"
        onClick={() => setMobileOpen(false)}
        onTouchEnd={(e) => { e.preventDefault(); setMobileOpen(false); }}
        aria-label="Menüyü kapat"
      />
    )}
    <aside className={mobileOpen ? "sidebar mobile-open" : "sidebar"}>
      <div className="sidebar-brand-row">
        <Brand />
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Menüyü kapat"
        >
          <X size={20} />
        </button>
      </div>
      <div className="side-caption">EDESİS ERP SİSTEMİ</div>
      <nav>
        {navCategories.map((cat, ci) => {
          const visibleItems = cat.items.filter(it => can(me, it.perm));
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
                          if (item.id === "kayit") {
                            setPage("kayit");
                            setKayitTab("kokpit");
                          } else if (item.id === "payments") {
                            setPage("payments");
                            setAccountingTab("dashboard");
                          } else if (item.id === "exams") {
                            setPage("exams");
                          } else if (item.id === "teachers") {
                            setPage("teachers");
                          }
                        }}
                      >
                        <div className="nav-tree-left">
                          <Icon size={17} />
                          <span>{item.label}</span>
                        </div>
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

                // Normal Flat Item
                const Icon = item.icon;
                const isItemActive = page === item.id;
                return (
                  <button
                    key={item.id}
                    data-testid={`nav-${item.id}`}
                    className={isItemActive ? "nav-item active" : "nav-item"}
                    onClick={() => {
                      if (item.customAction) {
                        item.customAction();
                      } else {
                        setPage(item.id);
                      }
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
        <button data-testid="nav-logout" className="nav-item" onClick={onLogout}><LogOut size={18}/><span>Çıkış yap</span></button>
        <div className="profile">
          {me?.picture ? <img className="avatar" src={me.picture} alt="" /> : <div className="avatar">{(me?.name || "İÇ").slice(0,2).toUpperCase()}</div>}
          <div><b>{me?.name || "Kurs Yönetimi"}</b><small data-testid="user-role">{ROLE_LABEL[me?.role] || me?.role_label || "Kullanıcı"}</small></div>
          <ChevronRight size={16} />
        </div>
      </div>
    </aside>
    <main className="main">
      <PwaBanner />
      <header className="topbar">
        <button className="mobile-menu" data-testid="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="edesis-quick-actions-btn"
              onClick={() => setQuickOpen(!quickOpen)}
              title="Hızlı İşlemler Menüsü"
            >
              <Zap size={14} />
              <span>Hızlı İşlemler</span>
            </button>
            {quickOpen && (
              <div className="edesis-quick-dropdown" onClick={() => setQuickOpen(false)}>
                <div className="quick-dropdown-header">HIZLI İŞLEMLER</div>
                <div className="quick-dropdown-grid">
                  <div className="quick-col">
                    <div className="quick-col-title">MUHASEBE</div>
                    <button type="button" onClick={() => setPage("documents")}><FileText size={14} style={{ color: "#2563eb" }} /> Yeni Sözleşme <ChevronRight size={12} /></button>
                    <button type="button" onClick={() => guardedOpen("payment")}><CircleDollarSign size={14} style={{ color: "#8b5cf6" }} /> Tahsilat Al <ChevronRight size={12} /></button>
                    <button type="button" onClick={() => guardedOpen("expense")}><TrendingDown size={14} style={{ color: "#ef4444" }} /> Hızlı Gider <ChevronRight size={12} /></button>
                  </div>
                  <div className="quick-col">
                    <div className="quick-col-title">SINAV & ANALİZ</div>
                    <button type="button" onClick={() => setPage("exams")}><GraduationCap size={14} style={{ color: "#8b5cf6" }} /> Yeni Sınav / Deneme <ChevronRight size={12} /></button>
                    <button type="button" onClick={() => setShowGlobalKarne({ student_name: data.students?.[0]?.student_name || "Öğrenci", student_class: "7-A", score: 445.5, total_net: 62.5, overall_rank: 2, class_rank: 1, booklet: "A", exam: data.exams?.[0] || { title: "Kurumsal Deneme" } })}><Target size={14} style={{ color: "#0d9488" }} /> Sınav Karnesi <ChevronRight size={12} /></button>
                    <button type="button" onClick={() => setPage("attendance")}><UserCheck size={14} style={{ color: "#16a34a" }} /> Günlük Yoklama <ChevronRight size={12} /></button>
                  </div>
                  <div className="quick-col">
                  <div className="quick-col-title">KAYIT & SİSTEM</div>
                  <button type="button" onClick={() => guardedOpen("student")}><UserPlus size={14} style={{ color: "#d97706" }} /> Yeni Öğrenci Kaydı <ChevronRight size={12} /></button>
                  <button type="button" onClick={() => setPage("schedules")}><Clock size={14} style={{ color: "#2563eb" }} /> Ders Programı <ChevronRight size={12} /></button>
                  <button type="button" onClick={() => setPage("classes")}><Users size={14} style={{ color: "#4f46e5" }} /> Sınıf & Kontenjan <ChevronRight size={12} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
        <div className="top-search"><Search size={17} /><input data-testid="global-search-input" placeholder="Öğrenci, veli veya telefon ara..." value={search} onChange={e => { setSearch(e.target.value); if (can(me,"page_students")) setPage("students"); }} /></div>
        <div className="top-actions">
          <span className="today-label">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
          <button data-testid="notifications-button" className="icon-btn"><Bell size={18} /><i /></button>
          <div className="user-mini">
            {me?.picture ? <img className="avatar" src={me.picture} alt="" /> : <div className="avatar">{(me?.name || "İÇ").slice(0,2).toUpperCase()}</div>}
            <span data-testid="user-name">{me?.name || "Yönetici"}</span>
            <span data-testid="user-role-pill" className={`role-pill role-${me?.role}`}>{ROLE_LABEL[me?.role] || me?.role_label}</span>
            <button data-testid="logout-button" className="icon-btn" title="Çıkış yap" onClick={onLogout}><LogOut size={16}/></button>
          </div>
        </div>
      </header>
      <div className={`content ${page === "students" || page === "documents" ? "content-fullwidth" : ""}`}>
        {page === "dashboard" && <Dashboard me={me} data={data} totalCollected={totalCollected} totalExpected={totalExpected} totalExpenses={totalExpenses} onOpen={guardedOpen} onNavigate={setPage} onSelect={setSelected} />}
        {page === "kayit" && (
          <KayitModulu
            activeTab={kayitTab}
            setActiveTab={setKayitTab}
            students={data.students || []}
            classes={data.classes || []}
            teachers={data.teachers || []}
            onOpenWizard={() => guardedOpen("student")}
            onSelectStudent={setSelected}
            onNavigate={setPage}
          />
        )}
        {page === "exams" && <ExamsPage me={me} API={API} students={data.students || []} classes={data.classes || []} />}
        {page === "attendance" && <AttendancePage me={me} API={API} classes={data.classes || []} />}
        {page === "schedules" && <SchedulesPage me={me} API={API} classes={data.classes || []} />}
        {page === "students" && (
          <EdesisOgrenciListesi
            onSelectStudent={setSelected}
            onOpenGelir={(st) =>
              setGelirModalData({
                isOpen: true,
                student: st,
                gelirKodu: st?.gelir_kodu,
                sozlesmeNo: st?.sozlesme_no
              })
            }
            onOpenContract={() => setPage("documents")}
            onOpenKarne={(st) =>
              setShowGlobalKarne({
                student_name: st.student_name,
                student_class: st.student_class,
                score: 450,
                total_net: 65,
                overall_rank: 1,
                class_rank: 1,
                booklet: "A",
                exam: { title: "Kurumsal Deneme" }
              })
            }
            onNavigate={setPage}
          />
        )}
        {page === "payments" && <MuhasebeV2Dashboard me={me} data={data} onOpen={guardedOpen} onSelectStudent={setSelected} API={API} reload={load} activeTab={accountingTab} onTabChange={setAccountingTab} />}
        {page === "classes" && <Classes me={me} classes={data.classes} students={data.students} onOpen={guardedOpen} onSelect={setSelected} onNavigate={setPage} reload={load} API={API} />}
        {page === "teachers" && <TeachersPage me={me} API={API} teachers={data.teachers || []} onReload={load} onNavigate={setPage} />}
        {page === "reminders" && <Reminders />}
        {page === "gelir" && (
          <EdesisGelirListesi
            students={data.students}
            onSelectStudent={setSelected}
            onNavigate={setPage}
            onOpenGelir={(g) =>
              setGelirModalData({
                isOpen: true,
                gelirKodu: g.gelirKodu,
                sozlesmeNo: g.sozlesmeNo
              })
            }
          />
        )}
        {page === "documents" && (
          <EdesisSozlesmeler
            students={data.students}
            payments={data.payments}
            onOpenGelir={(szl) =>
              setGelirModalData({
                isOpen: true,
                sozlesmeNo: szl.sozlesmeNo,
                gelirKodu: "GLR202600150"
              })
            }
          />
        )}
        {page === "reports" && <Reports me={me} data={data} />}
        {page === "users" && <UsersPage me={me} />}
        {page === "audit" && <AuditPage />}
      </div>
    </main>
    <MobileBottomNav page={page} setPage={setPage} setModal={setModal} canPayment={can(me, "payment_create")} />
    <EdesisStudentModal
      isOpen={modal === "student" || editingStudent !== null}
      onClose={() => { setModal(null); setEditingStudent(null); }}
      classes={data.classes || []}
      API={API}
      initialData={editingStudent}
      onStudentAdded={() => { load(); setModal(null); setEditingStudent(null); }}
    />
    {modal && modal !== "student" && (
      <Modal type={modal} selected={selected} data={data} close={() => setModal(null)} reload={load} />
    )}
    <StudentProfileModal 
      student={selected} 
      onClose={() => setSelected(null)} 
      me={me} 
      API={API} 
      data={data}
      onEditStudent={(st) => { setEditingStudent(st); }}
      onOpenPayment={() => guardedOpen("payment")}
      onNavigate={setPage}
    />
    {gelirModalData && (
      <GelirDetayModal
        isOpen={true}
        onClose={() => setGelirModalData(null)}
        gelirKodu={gelirModalData.gelirKodu}
        sozlesmeNo={gelirModalData.sozlesmeNo}
        student={gelirModalData.student}
        onRecordPayment={() => load()}
        onOpenProfile={(st) => {
          const target = st || gelirModalData.student;
          setGelirModalData(null);
          setSelected(target);
        }}
      />
    )}

    {/* EDESIS TEST LABORATUVARI & MODAL VİTRİNİ */}
    <EdesisTestBenchModal
      isOpen={showTestBench}
      onClose={() => setShowTestBench(false)}
      data={data}
      API={API}
      onOpenGlobalModal={guardedOpen}
      onNavigate={(p) => { setPage(p); setShowTestBench(false); }}
    />

    {/* GLOBAL OPTİK OKUYUCU SÜİTİ */}
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

    {/* GLOBAL RESMİ EDESİS KARNESİ */}
    {showGlobalKarne && (
      <OfficialEdesisKarneModal
        data={showGlobalKarne}
        onClose={() => setShowGlobalKarne(null)}
      />
    )}

    {/* GLOBAL KAZANIM VE HATA KARNESİ */}
    {showGlobalHataKarnesi && (
      <HataKarnesiModal
        student={data.students?.[0] || { student_name: "Örnek Öğrenci", student_class: "TYT-AYT" }}
        onClose={() => setShowGlobalHataKarnesi(false)}
      />
    )}

    {/* GLOBAL RESMİ MATBU SENET (BONO) SÜİTİ */}
    {showGlobalPromissory && (
      <PromissoryNoteModal
        student={data.students?.[0] || { student_name: "Örnek Öğrenci", total_fee: 55000, installment_count: 10 }}
        onClose={() => setShowGlobalPromissory(false)}
      />
    )}

    {/* GLOBAL MEB DEVAMSIZLIK UYARI MEKTUBU */}
    {showGlobalAbsenceLetter && (
      <AbsenceLetterModal
        student={data.students?.[0] || { student_name: "Örnek Öğrenci" }}
        daysAbsent={10}
        onClose={() => setShowGlobalAbsenceLetter(false)}
      />
    )}
  </div>;
}

function PageHead({ eyebrow, title, children }) { return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="head-actions">{children}</div></div> }
function Button({ children, onClick, secondary = false, testid }) { return <button data-testid={testid} onClick={onClick} className={secondary ? "btn secondary" : "btn"}>{children}</button> }

function Dashboard({ me, data, totalCollected, totalExpected, totalExpenses, onOpen, onNavigate, onSelect }) {
  const outstanding = totalExpected - totalCollected;
  const todayLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
  return <>
    <PageHead eyebrow={todayLabel} title="Genel Bakış">
      {can(me,"payment_create") && <Button testid="add-payment-dashboard" onClick={() => onOpen("payment")}><Plus size={17} /> Tahsilat Ekle</Button>}
      {can(me,"student_create") && <Button testid="add-student-dashboard" secondary onClick={() => onOpen("student")}><Users size={17} /> Öğrenci Ekle</Button>}
    </PageHead>
    <EdesisDashboardWidgets
      data={data}
      onNavigate={onNavigate}
      onSelectStudent={(id) => {
        const s = (data.students || []).find((x) => x.id === id);
        if (s) onSelect(s);
        else onNavigate("students");
      }}
    />
    <div className="stats-grid">
      <Stat icon={CircleDollarSign} label="Bu ay tahsilat" value={money(totalCollected)} note="Toplam tahsil edilen" color="blue" trend="+12.8%" onClick={() => onNavigate("payments")} />
      <Stat icon={Wallet} label="Bekleyen alacak" value={money(outstanding)} note="Öğrencilerden kalan" color="amber" trend="Takipte" onClick={() => onNavigate("reminders")} />
      <Stat icon={Users} label="Aktif öğrenci" value={(data.students || []).filter(s => s.status === "Aktif" || s.program === "2026-2027" || s.program === "TYT - AYT" || s.program === "LGS Hazırlık").length} note={`${(data.students || []).length} toplam arşiv kaydı`} color="green" trend="62 Kesin Kayıt" onClick={() => onNavigate("students")} />
      <Stat icon={TrendingDown} label="Bu ay gider" value={money(totalExpenses)} note="Genel toplamdan düşüldü" color="red" trend="Bu ay" onClick={() => onOpen("expense")} />
    </div>
    <div className="dashboard-grid">
      <section className="panel collection-panel" onClick={() => onNavigate("payments")} style={{ cursor: "pointer" }} title="Tahsilat detaylarını aç">
        <div className="panel-head">
          <div>
            <h2>Tahsilat görünümü</h2>
            <p>Toplam kurs ücretlerinin gerçekleşme durumu</p>
          </div>
          <span className="period">Kasa Detayları <ChevronRight size={15} /></span>
        </div>
        <div className="progress-wrap">
          <div className="progress-number"><strong>{Math.round((totalCollected / (totalExpected || 1)) * 100)}%</strong><span>tahsil edildi</span></div>
          <div className="progress-track"><div style={{ width: `${Math.min(100, (totalCollected / (totalExpected || 1)) * 100)}%` }} /></div>
          <div className="progress-labels">
            <span><i className="dot blue" /> Tahsil edilen <b>{money(totalCollected)}</b></span>
            <span><i className="dot gray" /> Kalan bakiye <b>{money(outstanding)}</b></span>
          </div>
        </div>
        <div className="mini-chart">
          <div className="chart-y"><span>₺40K</span><span>₺20K</span><span>₺0</span></div>
          <div className="bars">{[42, 58, 46, 72, 62, 88, 67, 76, 55, 91, 73, 84].map((h, i) => <div key={i} className="bar-col"><div className={i > 8 ? "bar active" : "bar"} style={{ height: `${h}%` }} /><small>{["Oca", "", "", "Şub", "", "", "Mar", "", "", "Nis", "", ""][i]}</small></div>)}</div>
        </div>
      </section>
      <section className="panel alerts-panel">
        <div className="panel-head">
          <div>
            <h2>Ödeme takibi</h2>
            <p>Yaklaşan ve geciken ödemeler (Tıkla ve incele)</p>
          </div>
          <button data-testid="view-all-payments" className="text-btn" onClick={() => onNavigate("reminders")}>Tümünü gör <ChevronRight size={15} /></button>
        </div>
        {(data.students || []).slice(0,6).map((s, i) => (
          <div className="alert-row" key={s.id} onClick={() => onSelect(s)} style={{ cursor: "pointer" }} title={`${s.student_name} detaylarını aç`}>
            <div className={`status-icon ${i === 1 ? "warning" : "danger"}`}><Bell size={15} /></div>
            <div className="alert-info">
              <b>{s.student_name}</b>
              <span>{i === 1 ? "Yaklaşan taksit" : "Geciken ödeme"} · {s.due_date ? new Date(s.due_date).toLocaleDateString("tr-TR") : "—"}</span>
            </div>
            <strong>{money(Math.round((s.total_fee||0) / (s.installment_count || 1)))}</strong>
            <ChevronRight size={15} />
          </div>
        ))}
      </section>
    </div>
    <section className="panel recent-panel">
      <div className="panel-head">
        <div>
          <h2>Son tahsilatlar</h2>
          <p>Hesabınıza işlenen son hareketler</p>
        </div>
        {can(me,"payment_create") && <button data-testid="quick-receipt" className="text-btn" onClick={() => onOpen("payment")}>Makbuz oluştur <Receipt size={15} /></button>}
      </div>
      <PaymentTable payments={data.payments || []} students={data.students || []} onSelect={onSelect} />
    </section>
  </>;
}

function Stat({ icon: Icon, label, value, note, color, trend, onClick }) { 
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }} title={`${label} modülünü aç`}>
      <div className={`stat-icon ${color}`}><Icon size={19} /></div>
      <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
      <em className={color}>{trend}</em>
    </div>
  ); 
}

export const CANCELLED_STUDENT_NAMES = [
  "SERHAT SERBEST",
  "EMİR PARILDAR",
  "EMRİYE AYTAN",
  "NEVRA KILINÇ"
];

export const ACTIVE_2026_CONTRACT_STUDENT_NAMES = [
  "SEBİLE AKDEMİR",
  "ELİFSU ÇAĞLAYAN",
  "YAVUZ EMİR BALCI",
  "MUSTAFA SİNİR",
  "ZEYNEP MASAL ÇELİK",
  "EBUBEKİR ASAF VERGİLİ"
];

export function getStudentCategory(s) {
  if (s?.is_kesin_kayit) return "kesin";
  const name = (s?.student_name || "").toUpperCase();
  let prog = s?.program || "";
  const fee = Number(s?.total_fee) || 0;

  if (ACTIVE_2026_CONTRACT_STUDENT_NAMES.some((k) => name.includes(k))) {
    prog = "2026-2027";
  }

  if (CANCELLED_STUDENT_NAMES.some((c) => name.includes(c)) || s?.status === "İptal / Ayrılan" || s?.enrollment_status === "İptal / Ayrılan") {
    return "iptal";
  }
  if (prog === "2026-2027-YAZ" || s?.status === "Yaz Kursu" || s?.enrollment_status === "Yaz Kursu") {
    return "yaz";
  }
  if (prog === "2025-2026" || s?.status === "Mezun / Geçmiş" || s?.enrollment_status === "Mezun / Geçmiş") {
    return "mezun";
  }
  if (fee < 10) {
    return "deneme";
  }
  return "kesin";
}

function Students({ me, allStudents, search, onSearch, onOpen, onSelect, onOpenProfile }) {
  const [activeSegment, setActiveSegment] = useState("kesin"); // "kesin" (default: 61), "yaz", "mezun", "iptal", "debtors", "paid", "all"
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedDebt, setSelectedDebt] = useState("all");

  const students = allStudents || [];

  // Summary Metrics
  const stats = useMemo(() => {
    let kesin = 0;
    let yaz = 0;
    let mezun = 0;
    let iptal = 0;
    let deneme = 0;
    let debtors = 0;
    let paid = 0;
    let totalOutstanding = 0;

    students.forEach((s) => {
      const cat = getStudentCategory(s);
      if (cat === "kesin") kesin++;
      else if (cat === "yaz") yaz++;
      else if (cat === "mezun") mezun++;
      else if (cat === "iptal") iptal++;
      else if (cat === "deneme") deneme++;

      const rem = Number(s.remaining || 0);
      if (rem > 0) {
        debtors++;
        totalOutstanding += rem;
      } else {
        paid++;
      }
    });

    return {
      kesin,
      active: kesin, // backwards compatibility
      yaz,
      mezun,
      iptal,
      deneme,
      total: students.length,
      debtors,
      paid,
      totalOutstanding,
    };
  }, [students]);

  // Unique Classes
  const classOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.student_class && s.student_class !== "Genel") set.add(s.student_class.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtering Logic
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const cat = getStudentCategory(s);
      const rem = Number(s.remaining || 0);

      // 1. Segment Pill Filter
      if ((activeSegment === "kesin" || activeSegment === "active") && cat !== "kesin") return false;
      if (activeSegment === "yaz" && cat !== "yaz") return false;
      if (activeSegment === "mezun" && cat !== "mezun") return false;
      if (activeSegment === "iptal" && cat !== "iptal") return false;
      if (activeSegment === "debtors" && rem <= 0) return false;
      if (activeSegment === "paid" && rem > 0) return false;

      // 2. Academic Period Filter Dropdown
      if (selectedPeriod !== "all") {
        if (selectedPeriod === "2026-2027" && cat !== "kesin" && cat !== "iptal" && cat !== "deneme") return false;
        if (selectedPeriod === "2026-2027-YAZ" && cat !== "yaz") return false;
        if (selectedPeriod === "2025-2026" && cat !== "mezun") return false;
      }

      // 3. Status Filter Dropdown
      if (selectedStatus !== "all") {
        if (selectedStatus === "Aktif" && cat !== "kesin") return false;
        if (selectedStatus === "Kesin Kayıt" && cat !== "kesin") return false;
        if (selectedStatus === "Yaz Kursu" && cat !== "yaz") return false;
        if (selectedStatus === "Mezun / Geçmiş" && cat !== "mezun") return false;
        if (selectedStatus === "İptal / Ayrılan" && cat !== "iptal") return false;
      }

      // 4. Class / Şube Filter Dropdown
      if (selectedClass !== "all" && s.student_class !== selectedClass) {
        return false;
      }

      // 5. Debt Filter Dropdown
      if (selectedDebt === "has_debt" && rem <= 0) return false;
      if (selectedDebt === "no_debt" && rem > 0) return false;

      // 6. Search Term
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const haystack = `${s.student_name} ${s.parent_name} ${s.student_phone} ${s.parent_phone} ${s.school} ${s.student_class} ${s.program}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [students, activeSegment, selectedPeriod, selectedStatus, selectedClass, selectedDebt, search]);

  const handleResetFilters = () => {
    setActiveSegment("kesin");
    setSelectedPeriod("all");
    setSelectedStatus("all");
    setSelectedClass("all");
    setSelectedDebt("all");
    onSearch("");
  };

  const hasActiveCustomFilters =
    (activeSegment !== "kesin" && activeSegment !== "active") ||
    selectedPeriod !== "all" ||
    selectedStatus !== "all" ||
    selectedClass !== "all" ||
    selectedDebt !== "all" ||
    (search && search.trim().length > 0);

  return (
    <>
      <PageHead eyebrow="KAYITLAR · ÖĞRENCİ VE VELİ YÖNETİMİ" title="Öğrenci Yönetimi">
        {can(me, "export_data") && (
          <Button testid="export-students-button" secondary onClick={() => downloadBlob(`${API}/export/students`, `inegol-cozum-ogrenciler.csv`)}>
            <Download size={16} /> Excel İndir
          </Button>
        )}
        {can(me, "student_create") && (
          <Button testid="add-student-button" onClick={() => onOpen("student")}>
            <Plus size={17} /> Yeni Öğrenci
          </Button>
        )}
      </PageHead>

      {/* 4 Edesis Stat KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "16px" }}>
        <Stat
          icon={Users}
          label="Kesin Kayıt Öğrenciler"
          value={stats.kesin}
          note="2026-2027 Edesis Onaylı"
          color="green"
          trend="Aktif Dönem"
          onClick={() => { setActiveSegment("kesin"); setSelectedPeriod("all"); setSelectedStatus("all"); }}
        />
        <Stat
          icon={Sun}
          label="Yaz Kursu"
          value={stats.yaz}
          note="2026-2027-YAZ Destek"
          color="blue"
          trend="Yaz Dönemi"
          onClick={() => { setActiveSegment("yaz"); setSelectedPeriod("2026-2027-YAZ"); }}
        />
        <Stat
          icon={GraduationCap}
          label="Mezun / Geçmiş"
          value={stats.mezun}
          note="2025-2026 Mezun Arşivi"
          color="purple"
          trend="Eski Kayıt"
          onClick={() => { setActiveSegment("mezun"); setSelectedPeriod("2025-2026"); }}
        />
        <Stat
          icon={CircleDollarSign}
          label="Taksit Takipte"
          value={stats.debtors}
          note={`Toplam Bakiye: ${money(stats.totalOutstanding)}`}
          color="amber"
          trend="Kalan Borç"
          onClick={() => setActiveSegment("debtors")}
        />
      </div>

      {/* Edesis Tarzı Segment Hapları */}
      <div className="student-segments-container">
        <div className="student-segment-strip">
          <button
            className={`student-segment-pill ${(activeSegment === "kesin" || activeSegment === "active") ? "active" : ""}`}
            onClick={() => { setActiveSegment("kesin"); setSelectedPeriod("all"); setSelectedStatus("all"); }}
          >
            🟢 Kesin Kayıt ({stats.kesin})
          </button>
          <button
            className={`student-segment-pill ${activeSegment === "yaz" ? "active" : ""}`}
            onClick={() => { setActiveSegment("yaz"); setSelectedPeriod("2026-2027-YAZ"); }}
          >
            ☀️ Yaz Kursu ({stats.yaz})
          </button>
          <button
            className={`student-segment-pill ${activeSegment === "mezun" ? "active" : ""}`}
            onClick={() => { setActiveSegment("mezun"); setSelectedPeriod("2025-2026"); }}
          >
            🎓 Mezunlar / Geçmiş ({stats.mezun})
          </button>
          <button
            className={`student-segment-pill ${activeSegment === "iptal" ? "active" : ""}`}
            onClick={() => { setActiveSegment("iptal"); setSelectedPeriod("all"); setSelectedStatus("all"); }}
          >
            🚫 İptal / Ayrılan ({stats.iptal})
          </button>
          <button
            className={`student-segment-pill ${activeSegment === "debtors" ? "active" : ""}`}
            onClick={() => setActiveSegment("debtors")}
          >
            ⏳ Borcu Olanlar ({stats.debtors})
          </button>
          <button
            className={`student-segment-pill ${activeSegment === "paid" ? "active" : ""}`}
            onClick={() => setActiveSegment("paid")}
          >
            ✅ Borcu Kapananlar ({stats.paid})
          </button>
          <button
            className={`student-segment-pill ${activeSegment === "all" ? "active" : ""}`}
            onClick={() => { setActiveSegment("all"); setSelectedPeriod("all"); setSelectedStatus("all"); }}
          >
            📁 Tüm Kayıtlar ({stats.total})
          </button>
        </div>
      </div>

      {/* Edesis Gelişmiş Filtre Çubuğu */}
      <div className="student-filter-toolbar">
        <div className="student-filter-grid">
          {/* Arama Inputu */}
          <div className="inline-search" style={{ width: "100%", margin: 0 }}>
            <Search size={16} />
            <input
              data-testid="student-search-input"
              placeholder="İsim, veli veya telefon ile ara..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>

          {/* Dönem Dropdown */}
          <select
            className="student-filter-select"
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              if (e.target.value !== "all") setActiveSegment("all");
            }}
          >
            <option value="all">📅 Dönem: Hepsi</option>
            <option value="2026-2027">2026-2027 (Aktif)</option>
            <option value="2026-2027-YAZ">2026-2027-YAZ</option>
            <option value="2025-2026">2025-2026</option>
          </select>

          {/* Durum Dropdown */}
          <select
            className="student-filter-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              if (e.target.value !== "all") setActiveSegment("all");
            }}
          >
            <option value="all">🏷️ Durum: Hepsi</option>
            <option value="Kesin Kayıt">Kesin Kayıt ({stats.kesin})</option>
            <option value="Yaz Kursu">Yaz Kursu ({stats.yaz})</option>
            <option value="Mezun / Geçmiş">Mezun / Geçmiş ({stats.mezun})</option>
            <option value="İptal / Ayrılan">İptal / Ayrılan ({stats.iptal})</option>
          </select>

          {/* Sınıf / Şube Dropdown */}
          <select
            className="student-filter-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">🏫 Sınıf: Hepsi</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {/* Bakiye Dropdown */}
          <select
            className="student-filter-select"
            value={selectedDebt}
            onChange={(e) => {
              setSelectedDebt(e.target.value);
              if (e.target.value !== "all") setActiveSegment("all");
            }}
          >
            <option value="all">💰 Bakiye: Hepsi</option>
            <option value="has_debt">Borcu Olanlar (Bekliyor)</option>
            <option value="no_debt">Borcu Bitenler (Tamamlandı)</option>
          </select>

          {/* Sıfırla Butonu */}
          {hasActiveCustomFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                color: "var(--muted)",
                whiteSpace: "nowrap"
              }}
              title="Filtreleri Sıfırla"
            >
              Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Sonuç Sayısı ve Bilgi Çubuğu */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "0 4px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted)" }}>
          Gösterilen: <strong style={{ color: "var(--foreground)" }}>{filteredStudents.length}</strong> öğrenci
          {filteredStudents.length !== stats.total && ` (Toplam ${stats.total} kayıt arasından filtrelendi)`}
        </span>
        {(activeSegment === "kesin" || activeSegment === "active") && (
          <span style={{ fontSize: "12px", background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: "12px", fontWeight: "600" }}>
            ✓ Edesis Onaylı 2026-2027 Kesin Kayıt ({stats.kesin} Öğrenci)
          </span>
        )}
      </div>

      {/* Tablo */}
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>ÖĞRENCİ</th>
              <th>DURUM</th>
              <th>VELİ / TELEFON</th>
              <th>OKUL & SINIF</th>
              <th>ALAN / PROGRAM</th>
              <th>BAKİYE DURUMU</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const cat = getStudentCategory(s);

              return (
                <tr key={s.id} data-testid={`student-row-${s.id}`} onClick={() => onSelect(s)}>
                  <td>
                    <div className="person">
                      {s.photo ? (
                        <img src={s.photo} alt="" className="student-avatar" style={{ objectFit: "cover" }} />
                      ) : (
                        <div className="student-avatar">
                          {s.student_name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <b>{s.student_name}</b>
                          {s.student_no && (
                            <span className="role-pill" style={{ fontSize: 10, padding: "1px 6px", background: "#f1f5f9", color: "#475569" }}>
                              #{s.student_no}
                            </span>
                          )}
                        </div>
                        <span>{s.student_phone || "Telefon yok"}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {cat === "kesin" && <span className="status-badge active-badge">🟢 Kesin Kayıt</span>}
                    {cat === "yaz" && <span className="status-badge summer-badge">☀️ Yaz Kursu</span>}
                    {cat === "mezun" && <span className="status-badge archive-badge">🎓 Mezun / Geçmiş</span>}
                    {cat === "iptal" && <span className="status-badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>🚫 İptal</span>}
                    {cat === "deneme" && <span className="status-badge" style={{ background: "#f1f5f9", color: "#64748b", fontWeight: 600 }}>📝 Deneme</span>}
                  </td>
                  <td>
                    <div className="cell-stack">
                      <b>{s.parent_name}</b>
                      <span>{s.parent_phone}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <b>{s.school}</b>
                      <span>{s.student_class}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <span className="program-tag">{s.program}</span>
                      {s.department && <small style={{ color: "#64748b", fontSize: 11 }}>{s.department}</small>}
                    </div>
                  </td>
                  <td>
                    <div className="balance">
                      <b>{money(s.remaining)}</b>
                      <span className={s.remaining === 0 ? "paid" : "pending"}>
                        {s.remaining === 0 ? "Tamamlandı" : "Bekliyor"}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          color: "#166534",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(s);
                        }}
                        title="Edesis Gelir & Taksit Detayını Aç"
                      >
                        <FileText size={13} /> Gelir Detay
                      </button>
                      {onOpenProfile && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{
                            padding: "4px 7px",
                            borderRadius: "6px",
                            color: "#1d4ed8",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(s);
                          }}
                          title="Öğrenci Akademik & Devamsızlık Profili"
                        >
                          <User size={13} />
                        </button>
                      )}
                      <button
                        data-testid={`student-detail-${s.id}`}
                        className="row-arrow"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(s);
                        }}
                        title="Gelir Detay"
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  <Users size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4, display: "block" }} />
                  Belirtilen kriterlere ve filtrelere uygun öğrenci kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Payments({ me, data, onOpen }) {
  const [selectedRegister, setSelectedRegister] = useState("all");
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
  const [selectedPromissoryStudent, setSelectedPromissoryStudent] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Genel");
  const [expenseDate, setExpenseDate] = useState(today());
  const [expenses, setExpenses] = useState(data.expenses || []);

  const payments = data.payments || [];
  const students = data.students || [];

  // Kasa Defteri Ayrımı
  const registers = useMemo(() => {
    let nakit = 0;
    let pos = 0;
    let banka = 0;
    let senet = 0;

    payments.forEach((p) => {
      const m = (p.method || "").toLowerCase();
      const amt = Number(p.amount || 0);
      if (m.includes("nakit") || m.includes("elden") || m.includes("kasa")) {
        nakit += amt;
      } else if (m.includes("kart") || m.includes("pos")) {
        pos += amt;
      } else if (m.includes("bank") || m.includes("havale") || m.includes("eft")) {
        banka += amt;
      } else if (m.includes("senet") || m.includes("çek")) {
        senet += amt;
      } else {
        nakit += amt;
      }
    });

    const totalExpenseSum = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    return { nakit, pos, banka, senet, totalExpenseSum };
  }, [payments, expenses]);

  const filteredPayments = useMemo(() => {
    if (selectedRegister === "all") return payments;
    return payments.filter((p) => {
      const m = (p.method || "").toLowerCase();
      if (selectedRegister === "nakit") return m.includes("nakit") || m.includes("elden") || (!m.includes("kart") && !m.includes("pos") && !m.includes("bank") && !m.includes("havale") && !m.includes("senet"));
      if (selectedRegister === "pos") return m.includes("kart") || m.includes("pos");
      if (selectedRegister === "banka") return m.includes("bank") || m.includes("havale") || m.includes("eft");
      if (selectedRegister === "senet") return m.includes("senet") || m.includes("çek");
      return true;
    });
  }, [payments, selectedRegister]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;
    try {
      const res = await axios.post(`${API}/expenses`, {
        title: expenseTitle,
        amount: parseFloat(expenseAmount),
        category: expenseCategory,
        expense_date: expenseDate
      });
      setExpenses((prev) => [
        {
          id: res.data?.id || `exp-${Date.now()}`,
          title: expenseTitle,
          amount: parseFloat(expenseAmount),
          category: expenseCategory,
          expense_date: expenseDate
        },
        ...prev
      ]);
      setShowExpenseModal(false);
      setExpenseTitle("");
      setExpenseAmount("");
      alert("Kurum gideri başarıyla kaydedildi.");
    } catch (err) {
      alert("Gider kaydedilemedi: " + err.message);
    }
  };

  const handleNotifyOverdue = () => {
    const overdueStudents = students.filter((s) => Number(s.remaining || 0) > 0);
    if (overdueStudents.length === 0) {
      alert("Vadesi geçmiş borcu olan öğrenci bulunmuyor.");
      return;
    }
    const target = overdueStudents[0];
    const msg = `Sayın Velimiz, Özel İnegöl Çözüm Kursu'nda kayıtlı öğrencimiz ${target.student_name} için kalan taksit bakiyesi ${money(target.remaining)}'dir. Kurumumuz muhasebe birimine ödeme detayları için başvurmanızı rica ederiz. İletişim: 0224 715 00 02`;
    openWhatsApp(target.parent_phone, msg);
    if (overdueStudents.length > 1) {
      alert(`Toplam ${overdueStudents.length} bakiye sahibi öğrenci tespit edildi. İlk öğrencinin (${target.student_name}) WhatsApp mesajı hazırlandı.`);
    }
  };

  return (
    <>
      <PageHead eyebrow="FİNANS · KASA DEFTERİ & TAHSİLAT" title="Kasa Defteri & Tahsilat Yönetimi">
        <button 
          className="btn secondary" 
          onClick={handleNotifyOverdue}
          style={{ display: "flex", gap: "6px", alignItems: "center", borderColor: "#16a34a", color: "#16a34a" }}
          title="Vadesi geçmiş bakiye sahiplerine tek tıkla WhatsApp borç hatırlatması açar"
        >
          <MessageCircle size={16} /> Veliye WhatsApp Borç Hatırlat
        </button>
        <button 
          className="btn secondary" 
          onClick={() => setShowExpenseModal(true)}
          style={{ display: "flex", gap: "6px", alignItems: "center" }}
        >
          <TrendingDown size={16} color="var(--danger)" /> Gider Ekle
        </button>
        {can(me, "export_data") && (
          <Button testid="export-payments-button" secondary onClick={() => downloadBlob(`${API}/export/payments`, `inegol-cozum-tahsilat.csv`)}>
            <Download size={16} /> Excel İndir
          </Button>
        )}
        {can(me, "payment_create") && (
          <Button testid="add-payment-button" onClick={() => onOpen("payment")}>
            <Plus size={17} /> Tahsilat Ekle
          </Button>
        )}
      </PageHead>

      {/* 4 Kasa Defteri Ayrımı */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", marginBottom: "16px" }}>
        <Stat 
          icon={Wallet} 
          label="Nakit Kasa" 
          value={money(registers.nakit)} 
          note="Elden Tahsil Edilen" 
          color="green" 
          trend="Aktif Kasa"
          onClick={() => setSelectedRegister("nakit")} 
        />
        <Stat 
          icon={CircleDollarSign} 
          label="POS / Kredi Kartı" 
          value={money(registers.pos)} 
          note="Banka POS Çekimleri" 
          color="blue" 
          trend="Bankada"
          onClick={() => setSelectedRegister("pos")} 
        />
        <Stat 
          icon={TrendingUp} 
          label="Banka Transferi" 
          value={money(registers.banka)} 
          note="Havale / EFT Kasası" 
          color="blue" 
          trend="Hesapta"
          onClick={() => setSelectedRegister("banka")} 
        />
        <Stat 
          icon={FileText} 
          label="Senet / Çek Kasası" 
          value={money(registers.senet)} 
          note="Vadeli Matbu Senetler" 
          color="purple" 
          trend="Portföyde"
          onClick={() => setSelectedRegister("senet")} 
        />
      </div>

      {/* Kasa Filtreleme Sekmeleri */}
      <div className="attendance-controls-bar" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted)" }}>Kasa Filtresi:</span>
          {["all", "nakit", "pos", "banka", "senet"].map((reg) => (
            <button
              key={reg}
              className={`summary-pill ${selectedRegister === reg ? "active" : ""}`}
              style={{
                cursor: "pointer",
                background: selectedRegister === reg ? "var(--primary)" : "var(--surface)",
                color: selectedRegister === reg ? "#fff" : "var(--foreground)",
                border: "1px solid var(--border)",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600"
              }}
              onClick={() => setSelectedRegister(reg)}
            >
              {reg === "all" ? "Tüm Kasalar" : reg === "nakit" ? "Nakit Kasa" : reg === "pos" ? "POS / Kredi Kartı" : reg === "banka" ? "Banka Havale" : "Senet / Çek"}
            </button>
          ))}
        </div>
        <span className="result-count">{filteredPayments.length} Tahsilat Hareketi</span>
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Kasa ve Tahsilat Hareketleri</h2>
            <p>Her tahsilat için resmi makbuz veya matbu senet basımı yapabilirsiniz</p>
          </div>
        </div>
        <PaymentTable 
          payments={filteredPayments} 
          students={students} 
          onSelect={(s) => setSelectedPromissoryStudent(s)}
          onOpenReceipt={(p) => setSelectedReceiptPayment(p)}
          onOpenPromissory={(s) => setSelectedPromissoryStudent(s)}
        />
      </section>

      {/* Gider Ekle Modal */}
      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-head">
              <h2>Kurum Gideri Ekle</h2>
              <button className="icon-btn" onClick={() => setShowExpenseModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Gider Başlığı *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Örn: Ekim Ayı Bina Kirası, Fotokopi Kağıdı..." 
                    value={expenseTitle} 
                    onChange={(e) => setExpenseTitle(e.target.value)} 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tutar (TL) *</label>
                    <input 
                      type="number" 
                      required 
                      step="any" 
                      placeholder="0.00" 
                      value={expenseAmount} 
                      onChange={(e) => setExpenseAmount(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Kategori</label>
                    <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                      <option value="Kira">Kira</option>
                      <option value="Personel / Öğretmen">Personel / Öğretmen</option>
                      <option value="Kırtasiye / Yayın">Kırtasiye / Yayın</option>
                      <option value="Fatura / Enerji">Fatura / Enerji</option>
                      <option value="İkram / Temizlik">İkram / Temizlik</option>
                      <option value="Genel">Genel</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Tarih</label>
                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn secondary" onClick={() => setShowExpenseModal(false)}>İptal</button>
                <button type="submit" className="btn">Gideri Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tahsilat Makbuzu Modalı */}
      {selectedReceiptPayment && (
        <ReceiptModal 
          payment={selectedReceiptPayment} 
          student={students.find((s) => s.id === selectedReceiptPayment.student_id)} 
          onClose={() => setSelectedReceiptPayment(null)} 
        />
      )}

      {/* Matbu Senet Modalı */}
      {selectedPromissoryStudent && (
        <PromissoryNoteModal 
          student={selectedPromissoryStudent} 
          onClose={() => setSelectedPromissoryStudent(null)} 
        />
      )}
    </>
  );
}

function PaymentTable({ payments, students, onSelect, onOpenReceipt, onOpenPromissory }) {
  const list = payments.length ? payments : students.map((s, i) => ({
    id: `p${i}`,
    student_id: s.id,
    payment_date: today(),
    method: i % 2 === 0 ? "Nakit Kasa" : "Kredi Kartı",
    note: "Dönem taksit ödemesi",
    amount: s.paid_amount || 4000
  }));

  return (
    <>
      <div className="desktop-only-table table-responsive">
        <table>
          <thead>
            <tr>
              <th>ÖĞRENCİ</th>
              <th>TARİH</th>
              <th>KASA / YÖNTEM</th>
              <th>AÇIKLAMA</th>
              <th>TUTAR</th>
              <th>DURUM</th>
              <th style={{ textAlign: "right" }}>MAKBUZ & SENET</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const s = students.find((x) => x.id === p.student_id);
              return (
                <tr key={p.id}>
                  <td onClick={() => { if (onSelect && s) onSelect(s); }} style={{ cursor: "pointer" }}>
                    <div className="person">
                      <div className="student-avatar small">
                        {s?.student_name?.split(" ").map((x) => x[0]).join("") || "?"}
                      </div>
                      <div>
                        <b>{s?.student_name || "Öğrenci"}</b>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                          {s?.student_class || "Şube yok"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(p.payment_date).toLocaleDateString("tr-TR")}</td>
                  <td><span className="method-tag">{p.method || "Nakit Kasa"}</span></td>
                  <td className="muted-cell">{p.note || "Eğitim taksiti"}</td>
                  <td><b className="amount">{money(p.amount)}</b></td>
                  <td><span className="status-pill success">İşlendi ✓</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button 
                        className="btn secondary" 
                        style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center" }}
                        title="Resmi Tahsilat Makbuzunu Yazdır"
                        onClick={() => onOpenReceipt && onOpenReceipt(p)}
                      >
                        <Receipt size={13} color="var(--primary)" /> Makbuz
                      </button>
                      {s && (
                        <button 
                          className="btn secondary" 
                          style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center" }}
                          title="Matbu Senet Koçanı Yazdır"
                          onClick={() => onOpenPromissory && onOpenPromissory(s)}
                        >
                          <FileText size={13} color="#7c3aed" /> Senet
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-only-cards payments-mobile-list">
        {list.map((p) => {
          const s = students.find((x) => x.id === p.student_id);
          return (
            <div key={p.id} className="mobile-data-card payment-card" data-testid={`payment-card-${p.id}`}>
              <div className="payment-card-top">
                <div className="person" onClick={() => { if (onSelect && s) onSelect(s); }} style={{ cursor: "pointer" }}>
                  <div className="student-avatar small">
                    {s?.student_name?.split(" ").map((x) => x[0]).join("") || "?"}
                  </div>
                  <div>
                    <b>{s?.student_name || "—"}</b>
                    <span className="card-subtext">{new Date(p.payment_date).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
                <b className="amount green-amount">{money(p.amount)}</b>
              </div>
              <div className="payment-card-bottom">
                <div className="payment-meta-tags">
                  <span className="method-tag">{p.method}</span>
                  <span className="card-note">{p.note || "Tahsilat kaydı"}</span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button 
                    className="btn secondary" 
                    style={{ padding: "3px 8px", fontSize: "11px" }}
                    onClick={() => onOpenReceipt && onOpenReceipt(p)}
                  >
                    Makbuz
                  </button>
                  {s && (
                    <button 
                      className="btn secondary" 
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => onOpenPromissory && onOpenPromissory(s)}
                    >
                      Senet
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EditClassModal({ cls, onClose, API, onSaved }) {
  const [name, setName] = useState(cls?.name || "");
  const [level, setLevel] = useState(cls?.level || "");
  const [room, setRoom] = useState(cls?.room || "");
  const [capacity, setCapacity] = useState(cls?.capacity || 20);
  const [teacher, setTeacher] = useState(cls?.teacher || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Sınıf adı boş bırakılamaz"); return; }
    setSaving(true); setErr("");
    try {
      await axios.put(`${API}/classes/${cls.id}`, { name, level, room, capacity: Number(capacity), teacher });
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || "Sınıf güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={18} color="#2563eb" />
            <h2>Sınıf / Şube Düzenle: {cls?.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {err && <div className="report-msg" style={{ background: "#fee2e2", color: "#dc2626", marginBottom: "12px" }}>{err}</div>}
            <div className="form-group">
              <label>Sınıf / Şube Adı:</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Seviye (Örn: 11. Sınıf, LGS Hazırlık):</label>
              <input type="text" value={level} onChange={e => setLevel(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Derslik / Oda:</label>
              <input type="text" value={room} onChange={e => setRoom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Kontenjan / Kapasite:</label>
              <input type="number" min="1" max="100" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Sorumlu Sınıf Öğretmeni:</label>
              <input type="text" value={teacher} onChange={e => setTeacher(e.target.value)} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn secondary" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Classes({ me, classes = [], onOpen, students = [], onSelect, onNavigate, reload, API }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [inspectingClass, setInspectingClass] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilterCategory, setClassFilterCategory] = useState("all"); // 'all' | 'with_students' | 'primary' | 'middle' | 'high'
  const rosterRef = useRef(null);

  // Compute enrolled student count and list for each class
  const classesWithCounts = useMemo(() => {
    return classes.map(c => {
      const enrolled = students.filter(s => s.program === c.name || s.student_class === c.name);
      return {
        ...c,
        enrolledStudents: enrolled,
        enrolledCount: enrolled.length,
        occupancyPct: c.capacity > 0 ? Math.min(100, Math.round((enrolled.length / c.capacity) * 100)) : 0
      };
    });
  }, [classes, students]);

  // Set default selectedClass to the class with the most students (e.g. 7-A, 3-A, 8-A)
  const activeClass = useMemo(() => {
    if (selectedClass) {
      const found = classesWithCounts.find(c => c.id === selectedClass.id);
      if (found) return found;
    }
    const sorted = [...classesWithCounts].sort((a, b) => b.enrolledCount - a.enrolledCount);
    return sorted[0] || classes[0] || null;
  }, [selectedClass, classesWithCounts, classes]);

  const classesWithStudentsCount = useMemo(() => {
    return classesWithCounts.filter(c => c.enrolledCount > 0).length;
  }, [classesWithCounts]);

  // Filter classes by category and search
  const filteredClasses = useMemo(() => {
    return classesWithCounts.filter(c => {
      // Category filter
      if (classFilterCategory === "with_students" && c.enrolledCount === 0) return false;
      if (classFilterCategory === "primary") {
        const lvl = (c.level || "").toLowerCase();
        const nm = c.name.toLowerCase();
        if (!(lvl.includes("1.") || lvl.includes("2.") || lvl.includes("3.") || lvl.includes("4.") || /^[1-4]/.test(nm))) return false;
      }
      if (classFilterCategory === "middle") {
        const lvl = (c.level || "").toLowerCase();
        const nm = c.name.toLowerCase();
        if (!(lvl.includes("5.") || lvl.includes("6.") || lvl.includes("7.") || lvl.includes("8.") || /^[5-8]/.test(nm) || nm.includes("lgs"))) return false;
      }
      if (classFilterCategory === "high") {
        const lvl = (c.level || "").toLowerCase();
        const nm = c.name.toLowerCase();
        if (!(lvl.includes("9.") || lvl.includes("10.") || lvl.includes("11.") || lvl.includes("12.") || lvl.includes("mezun") || nm.includes("tyt") || nm.includes("ayt") || nm.includes("yks"))) return false;
      }

      // Search term
      if (classSearch.trim()) {
        const term = classSearch.toLowerCase();
        const matches = (c.name || "").toLowerCase().includes(term) ||
                        (c.level || "").toLowerCase().includes(term) ||
                        (c.room || "").toLowerCase().includes(term) ||
                        (c.teacher || "").toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [classesWithCounts, classFilterCategory, classSearch]);

  const enrolledStudents = useMemo(() => {
    if (!activeClass) return [];
    return students.filter(s => (s.program === activeClass.name || s.student_class === activeClass.name));
  }, [students, activeClass]);

  const filteredClassStudents = useMemo(() => {
    return enrolledStudents.filter(s => 
      `${s.student_name} ${s.student_no} ${s.parent_name} ${s.parent_phone} ${s.student_tc || ""}`.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [enrolledStudents, studentSearch]);

  const handleDeleteClass = async (c) => {
    if (!window.confirm(`"${c.name}" sınıfını silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API}/classes/${c.id}`);
      if (reload) reload();
      if (selectedClass?.id === c.id) setSelectedClass(null);
    } catch (err) {
      alert("Sınıf silinirken hata: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCardClick = (c) => {
    setSelectedClass(c);
    setInspectingClass(c);
  };

  const handleInlineSelect = (c) => {
    setSelectedClass(c);
    setTimeout(() => {
      rosterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return <>
    <PageHead eyebrow="EĞİTİM · DERSLİKLER VE ŞUBE YÖNETİMİ" title="Sınıflar & Şubeler">
      {can(me,"class_create") && <Button testid="add-class-button" onClick={() => onOpen("class")}><Plus size={17} /> Sınıf Oluştur</Button>}
    </PageHead>

    {/* Filtre ve Arama Çubuğu */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button 
          className={`btn small ${classFilterCategory === "all" ? "" : "secondary"}`}
          onClick={() => setClassFilterCategory("all")}
          style={{ fontWeight: "600", fontSize: "12px" }}
        >
          🔵 Tüm Şubeler ({classes.length})
        </button>
        <button 
          className={`btn small ${classFilterCategory === "with_students" ? "" : "secondary"}`}
          onClick={() => setClassFilterCategory("with_students")}
          style={{ fontWeight: "600", fontSize: "12px" }}
        >
          🟢 Dolu / Öğrencili Şubeler ({classesWithStudentsCount})
        </button>
        <button 
          className={`btn small ${classFilterCategory === "primary" ? "" : "secondary"}`}
          onClick={() => setClassFilterCategory("primary")}
          style={{ fontWeight: "600", fontSize: "12px" }}
        >
          🎒 İlkokul (1-4)
        </button>
        <button 
          className={`btn small ${classFilterCategory === "middle" ? "" : "secondary"}`}
          onClick={() => setClassFilterCategory("middle")}
          style={{ fontWeight: "600", fontSize: "12px" }}
        >
          🎓 Ortaokul & LGS (5-8)
        </button>
        <button 
          className={`btn small ${classFilterCategory === "high" ? "" : "secondary"}`}
          onClick={() => setClassFilterCategory("high")}
          style={{ fontWeight: "600", fontSize: "12px" }}
        >
          📚 Lise & YKS (9-12 / Mezun)
        </button>
      </div>

      <div className="top-search" style={{ width: "300px", margin: 0 }}>
        <Search size={15} />
        <input 
          placeholder="Şube adı, seviye, derslik veya öğretmen ara..." 
          value={classSearch} 
          onChange={e => setClassSearch(e.target.value)} 
          style={{ fontSize: "12px" }}
        />
      </div>
    </div>

    {/* Sınıf Kartları Grid */}
    <div className="class-grid">
      {filteredClasses.map(c => {
        const isSelected = activeClass?.id === c.id;
        return (
          <div 
            className={`class-card ${isSelected ? "selected-card" : ""}`} 
            key={c.id}
            onClick={() => handleCardClick(c)}
            style={{
              cursor: "pointer",
              position: "relative",
              border: isSelected ? "2px solid #2563eb" : "1px solid var(--line)",
              boxShadow: isSelected ? "0 6px 18px rgba(37,99,235,0.18)" : "0 2px 6px rgba(0,0,0,0.04)",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div className="class-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="class-icon"><BookOpen size={20} /></div>
                  <span className="active-label">AKTİF</span>
                  <span 
                    className="badge" 
                    style={{ 
                      background: c.enrolledCount > 0 ? "#dcfce7" : "#f1f5f9", 
                      color: c.enrolledCount > 0 ? "#166534" : "#64748b", 
                      fontSize: "11px", 
                      fontWeight: "700" 
                    }}
                  >
                    👥 {c.enrolledCount} Öğrenci
                  </span>
                </div>
                <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
                  <button 
                    className="icon-btn" 
                    title="Sınıfı Düzenle"
                    style={{ padding: "4px" }}
                    onClick={() => setEditingClass(c)}
                  >
                    <Edit size={14} color="#2563eb" />
                  </button>
                  <button 
                    className="icon-btn" 
                    title="Sınıfı Sil"
                    style={{ padding: "4px" }}
                    onClick={() => handleDeleteClass(c)}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              </div>

              <h2 style={{ margin: "10px 0 4px 0", fontSize: "18px", fontWeight: "800" }}>{c.name}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{c.level || "—"} · {c.room || "Derslik"}</p>
              
              <div className="class-meta" style={{ marginTop: "10px" }}>
                <span><Users size={14} /> {c.capacity} kişilik ({c.enrolledCount} kayıtlı)</span>
                <span>{c.teacher || "Öğretmen Atanmadı"}</span>
              </div>

              <div className="class-progress" style={{ marginTop: "10px" }}>
                <div><span>Doluluk</span><b>%{c.occupancyPct}</b></div>
                <div className="progress-track"><div style={{ width: `${c.occupancyPct}%` }} /></div>
              </div>

              {/* Öğrenci Avatarları Önizlemesi */}
              {c.enrolledCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {c.enrolledStudents.slice(0, 5).map((st, i) => (
                      <div 
                        key={st.id || i}
                        style={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: "50%", 
                          background: "#3b82f6", 
                          color: "#fff", 
                          fontSize: "10px", 
                          fontWeight: "700", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          border: "2px solid #fff", 
                          marginLeft: i > 0 ? "-6px" : 0 
                        }}
                        title={st.student_name}
                      >
                        {st.student_name ? st.student_name[0] : "?"}
                      </div>
                    ))}
                  </div>
                  {c.enrolledCount > 5 && (
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
                      +{c.enrolledCount - 5} diğer
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Buton ve Eylem Barı */}
            <div style={{ marginTop: "14px", display: "grid", gap: "6px" }} onClick={e => e.stopPropagation()}>
              <button 
                className="btn small"
                style={{ 
                  width: "100%", 
                  justifyContent: "center", 
                  background: isSelected ? "#1d4ed8" : "#2563eb",
                  fontWeight: "600",
                  fontSize: "12px"
                }}
                onClick={() => handleCardClick(c)}
              >
                <Users size={14} /> Öğrenci Kadrosunu İncele ({c.enrolledCount})
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {/* Seçili Sınıfın Detay & Öğrenci Yönetim Paneli */}
    {activeClass && (
      <div ref={rosterRef} className="panel" style={{ marginTop: "28px", padding: "22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>{activeClass.name} Öğrenci Kadrosu</h2>
              <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }}>
                {enrolledStudents.length} Kayıtlı Öğrenci
              </span>
              <span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "12px", fontSize: "12px" }}>
                {activeClass.level || "Genel"} · {activeClass.room || "Derslik"}
              </span>
            </div>
            <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Kontenjan: <b>{activeClass.capacity}</b> · Sınıf Öğretmeni: <b>{activeClass.teacher || "—"}</b>
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button 
              className="btn small"
              onClick={() => setInspectingClass(activeClass)} 
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1e293b", color: "#fff", fontWeight: "600" }}
            >
              <Users size={14} /> Detaylı Sınıf Portalı & A4 Yazdır
            </button>
            <button className="btn small secondary" onClick={() => setEditingClass(activeClass)} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Edit size={14} /> Sınıfı Düzenle
            </button>
            <button className="btn small secondary" onClick={() => onNavigate && onNavigate("attendance")} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <UserCheck size={14} /> Yoklama Al
            </button>
            <button className="btn small secondary" onClick={() => onNavigate && onNavigate("schedules")} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Clock size={14} /> Ders Programı
            </button>
            <button className="btn small" onClick={() => onOpen("student")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#2563eb" }}>
              <Plus size={14} /> Yeni Öğrenci Ekle
            </button>
          </div>
        </div>

        {/* Öğrenci Arama ve Liste */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div className="top-search" style={{ width: "320px", margin: 0 }}>
            <Search size={15} />
            <input 
              placeholder="Bu sınıfta öğrenci, veli, telefon ara..." 
              value={studentSearch} 
              onChange={e => setStudentSearch(e.target.value)} 
            />
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Öğrenci satırına tıklayarak doğrudan tam <b>Öğrenci Bilgi Sayfasını</b> açabilirsiniz.
          </span>
        </div>

        {filteredClassStudents.length > 0 ? (
          <div style={{ border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
            <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px" }}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Öğrenci Adı Soyadı</th>
                  <th>Okulu</th>
                  <th>Veli & İletişim</th>
                  <th>Taksit / Bakiye</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassStudents.map(s => {
                  const rem = Math.max(0, (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0));
                  return (
                    <tr 
                      key={s.id} 
                      onClick={() => onSelect && onSelect(s)}
                      style={{ cursor: "pointer", transition: "background 0.15s" }}
                    >
                      <td><b style={{ color: "#2563eb", fontFamily: "monospace" }}>#{s.student_no || "—"}</b></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div className="student-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {s.student_name?.split(" ").map(x=>x[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <b style={{ color: "#1e293b", display: "block" }}>{s.student_name}</b>
                            {s.student_tc && <span style={{ fontSize: "11px", color: "#64748b" }}>TC: {s.student_tc}</span>}
                          </div>
                        </div>
                      </td>
                      <td><span style={{ color: "#475569" }}>{s.school || "—"}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div>
                            <span>{s.parent_name}</span>
                            <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>{s.parent_phone}</span>
                          </div>
                          {s.parent_phone && (
                            <a 
                              href={`https://wa.me/${s.parent_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Sayın ${s.parent_name}, Özel İnegöl Çözüm Kursu olarak ${s.student_name} isimli öğrencimizin sınıfı (${activeClass.name}) hakkında bilgilendirmedir.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Veliye WhatsApp Mesajı Gönder"
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                width: 24, 
                                height: 24, 
                                borderRadius: "6px", 
                                background: "#22c55e", 
                                color: "#fff",
                                textDecoration: "none"
                              }}
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <b style={{ color: rem > 0 ? "#ef4444" : "#16a34a" }}>
                          {rem > 0 ? `${rem.toLocaleString("tr-TR")} TL Kalan` : "Ödendi ✓"}
                        </b>
                      </td>
                      <td>
                        <span className="status-pill success">{s.status || "Kayıtlı"}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button 
                          className="btn small secondary" 
                          onClick={(e) => { e.stopPropagation(); onSelect && onSelect(s); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 8px" }}
                        >
                          Öğrenci Bilgi Sayfası <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "30px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
            <Users size={28} color="#94a3b8" style={{ margin: "0 auto 6px auto" }} />
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
              {studentSearch ? "Aramaya uygun öğrenci bulunamadı." : "Bu sınıfta henüz kayıtlı öğrenci yok."}
            </p>
          </div>
        )}
      </div>
    )}

    {/* MODAL: DETAYLI SINIF & ÖĞRENCİ PORTALI */}
    {inspectingClass && (
      <ClassDetailModal
        activeClass={inspectingClass}
        students={students}
        onClose={() => setInspectingClass(null)}
        onSelectStudent={(s) => {
          setInspectingClass(null);
          if (onSelect) onSelect(s);
        }}
        onEditClass={(c) => {
          setInspectingClass(null);
          setEditingClass(c);
        }}
        onNavigate={(page) => {
          setInspectingClass(null);
          if (onNavigate) onNavigate(page);
        }}
        onOpenNewStudent={() => {
          setInspectingClass(null);
          if (onOpen) onOpen("student");
        }}
      />
    )}

    {/* MODAL: SINIFI DÜZENLE */}
    {editingClass && (
      <EditClassModal 
        cls={editingClass} 
        onClose={() => setEditingClass(null)} 
        API={API}
        onSaved={() => {
          if (reload) reload();
          setEditingClass(null);
        }}
      />
    )}
  </>;
}

function Documents({ students, payments }) {
  const [student, setStudent] = useState(students[0]?.id || "");
  const [kind, setKind] = useState("contract");
  const [showPromissory, setShowPromissory] = useState(false);

  useEffect(() => {
    if (!student && students.length > 0) {
      setStudent(students[0].id);
    }
  }, [students, student]);

  const s = students.find(x => x.id === student);
  const p = payments.find(x => x.student_id === student);
  const now = new Date();
  const yearStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const schoolYear = `${yearStart} - ${yearStart + 1}`;
  const kayitTarihi = s?.created_at ? new Date(s.created_at).toLocaleDateString("tr-TR") : "";
  const blank = (v, min = 26) => (v && String(v).trim()) ? v : "\u2026".repeat(min);
  const fee = s?.total_fee || 0;
  const inst = s?.installment_count || 1;
  let extras = {};
  try {
    extras = typeof s?.extra_fees === "string" ? JSON.parse(s.extra_fees || "{}") : (s?.extra_fees || {});
  } catch {}
  const extraSum = EXTRA_KEYS.reduce((sum, x) => sum + Number(extras[x.k] || 0), 0);
  const disc = Number(s?.discount_amount || 0);
  const totalAll = Math.max(0, fee + extraSum - disc);
  const perInstallment = inst > 0 ? Math.round(totalAll / inst) : totalAll;
  const dtype = s?.discount_type || "";
  const check = (t) => dtype === t ? "( X )" : "(   )";

  return <>
    <PageHead eyebrow="BELGELER · ÇIKTI MERKEZİ" title="Sözleşme & Makbuz" />
    <div className="document-layout">
      <section className="panel document-tools">
        <h2>Öğrenci seçin</h2>
        <p>Resmî MEB Öğrenci Kayıt Sözleşmesi otomatik doldurulur; boş kalan alanlar veli tarafından ıslak imzayla tamamlanabilir.</p>
        <select data-testid="document-student-select" value={student} onChange={e => setStudent(e.target.value)}>{students.map(x => <option key={x.id} value={x.id}>{x.student_name}</option>)}</select>
        <div className="doc-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button testid="print-contract-button" onClick={() => { setKind("contract"); setTimeout(() => window.print(), 60); }}><FileText size={17} /> Sözleşmeyi yazdır</Button>
          <Button testid="print-receipt-button" secondary onClick={() => { setKind("receipt"); setTimeout(() => window.print(), 60); }}><Receipt size={17} /> Makbuzu yazdır</Button>
          <Button testid="print-promissory-button" secondary onClick={() => setShowPromissory(true)}><FileText size={17} color="#7c3aed" /> Matbu Senetleri Yazdır</Button>
        </div>
        <div className="doc-tips"><b>İpucu:</b> Yazıcı diyaloğunda "Hedef: PDF olarak kaydet" seçerseniz sözleşme direkt PDF çıkar.</div>
      </section>

      {kind === "receipt" ? (
        <section className="paper-preview" data-testid="receipt-preview">
          <div className="paper-head"><img className="paper-logo" src={LOGO} alt="Logo" /><div className="paper-brand"><b>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</b><small>Kemalpaşa Mah. Ilıca Sk. No:31/33A İnegöl / BURSA · 0224 715 00 02</small></div></div>
          <h2>TAHSİLAT MAKBUZU</h2><div className="paper-line" />
          <p>Makbuz no: <b>{p?.id?.slice(0, 8) || "ÖNİZLEME"}</b></p>
          <p>Öğrenci: <b>{s?.student_name || "—"}</b></p>
          <p>Veli: <b>{s?.parent_name || "—"}</b></p>
          <p>Ödeme yöntemi: <b>{p?.method || "—"}</b>{p?.bank ? <> · <b>{p.bank}</b></> : null}</p>
          <p>Ödeme tarihi: <b>{p?.payment_date ? new Date(p.payment_date).toLocaleDateString("tr-TR") : "—"}</b></p>
          <p>Tahsil edilen tutar: <b>{money(p?.amount)}</b></p>
          <p>Kalan bakiye: <b>{money(s?.remaining ?? Math.max(0,(s?.total_fee||0)-(s?.paid_amount||0)))}</b></p>
          <div className="signature"><span>Veli imzası</span><span>Kurs yetkilisi · Nevin ÇAKMAK</span></div>
        </section>
      ) : (
        <section className="contract-preview" data-testid="contract-preview">
          {/* PAGE 1 */}
          <div className="contract-page">
            <div className="contract-header">
              <img src={LOGO} alt="Çözüm Kurs" className="contract-logo" />
              <div className="contract-title">
                <div className="contract-tc">T.C.<br/>MİLLÎ EĞİTİM BAKANLIĞI<br/>ÖZEL ÖĞRETİM KURUMLARI GENEL MÜDÜRLÜĞÜ</div>
                <h1>ÖĞRENCİ KAYIT SÖZLEŞMESİ</h1>
              </div>
              <div className="contract-seal">MEB<br/><small>ÖZEL ÖĞR.<br/>KURUMLARI</small></div>
            </div>

            <div className="contract-course-name">
              <b>ÖZEL ÖĞRETİM KURS ADI:</b> ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ &nbsp;·&nbsp; <b>{schoolYear}</b> Öğretim Yılı
            </div>

            <div className="contract-section-title">ÖĞRENCİNİN BİLGİLERİ</div>
            <table className="contract-table"><tbody>
              <tr><td className="lbl">T.C. Kimlik No</td><td>{blank(s?.student_tc)}</td></tr>
              <tr><td className="lbl">Adı ve Soyadı</td><td>{blank(s?.student_name)}</td></tr>
              <tr><td className="lbl">Veli/Vasi Adı ve Soyadı</td><td>{blank(s?.parent_name)}</td></tr>
              <tr><td className="lbl">Sınıfı</td><td>{blank(s?.student_class)}</td></tr>
              <tr><td className="lbl">Okula kayıt / nakil tarihi</td><td>{blank(kayitTarihi)}</td></tr>
              <tr><td className="lbl">Ev adresi</td><td>{blank(s?.student_address || s?.parent_address)}</td></tr>
              {s?.program && <tr><td className="lbl">Kayıt olduğu program</td><td>{s.program}</td></tr>}
            </tbody></table>

            <div className="contract-parents">
              <div className="contract-parent">
                <div className="contract-section-title small">ÖĞRENCİNİN ANNE BİLGİLERİ</div>
                <table className="contract-table"><tbody>
                  <tr><td className="lbl">T.C. Kimlik No</td><td>{blank(s?.mother_tc)}</td></tr>
                  <tr><td className="lbl">Adı ve Soyadı</td><td>{blank(s?.mother_name)}</td></tr>
                  <tr><td className="lbl">Mesleği</td><td>{blank(s?.mother_job)}</td></tr>
                  <tr><td className="lbl">Cep telefonu</td><td>{blank(s?.mother_phone)}</td></tr>
                  <tr><td className="lbl">İş telefonu</td><td>{blank(s?.mother_work_phone)}</td></tr>
                  <tr><td className="lbl">Ev adresi</td><td>{blank(s?.mother_address)}</td></tr>
                  <tr><td className="lbl">İş adresi</td><td>{blank(s?.mother_work_address)}</td></tr>
                  <tr><td className="lbl">e-Posta</td><td>{blank(s?.mother_email)}</td></tr>
                </tbody></table>
              </div>
              <div className="contract-parent">
                <div className="contract-section-title small">ÖĞRENCİNİN BABA BİLGİLERİ</div>
                <table className="contract-table"><tbody>
                  <tr><td className="lbl">T.C. Kimlik No</td><td>{blank(s?.parent_tc)}</td></tr>
                  <tr><td className="lbl">Adı ve Soyadı</td><td>{blank(s?.parent_name)}</td></tr>
                  <tr><td className="lbl">Mesleği</td><td>{blank(s?.father_job)}</td></tr>
                  <tr><td className="lbl">Cep telefonu</td><td>{blank(s?.parent_phone)}</td></tr>
                  <tr><td className="lbl">İş telefonu</td><td>{blank(s?.father_work_phone)}</td></tr>
                  <tr><td className="lbl">Ev adresi</td><td>{blank(s?.parent_address)}</td></tr>
                  <tr><td className="lbl">İş adresi</td><td>{blank(s?.father_work_address)}</td></tr>
                  <tr><td className="lbl">e-Posta</td><td>{blank(s?.father_email)}</td></tr>
                </tbody></table>
              </div>
            </div>

            <div className="contract-section-title">ÖĞRENCİNİN VASİ BİLGİLERİ (VARSA)</div>
            <table className="contract-table two-col"><tbody>
              <tr><td className="lbl">T.C. Kimlik No</td><td>{blank(s?.guardian_tc)}</td><td className="lbl">İş telefonu</td><td>{blank(s?.guardian_work_phone)}</td></tr>
              <tr><td className="lbl">Adı ve Soyadı</td><td>{blank(s?.guardian_name)}</td><td className="lbl">Ev adresi</td><td>{blank(s?.guardian_home_address)}</td></tr>
              <tr><td className="lbl">Mesleği</td><td>{blank(s?.guardian_job)}</td><td className="lbl">İş adresi</td><td>{blank(s?.guardian_work_address)}</td></tr>
              <tr><td className="lbl">Cep telefonu</td><td>{blank(s?.guardian_phone)}</td><td className="lbl">e-Posta</td><td>{blank(s?.guardian_email)}</td></tr>
              <tr><td className="lbl">Ev telefonu</td><td>{blank(s?.guardian_home_phone)}</td><td></td><td></td></tr>
            </tbody></table>

            <div className="contract-footer">ÇÖZÜM KURS EĞİTİM KOORDİNATÖRLÜĞÜ</div>
          </div>

          {/* PAGE 2 */}
          <div className="contract-page">
            <div className="contract-section-title center">ÖDEME BİLGİLERİ ({schoolYear} Öğretim Yılı İçin)</div>
            <table className="contract-table fees"><thead>
              <tr><th>KALEM</th><th>Kurumun İlan Ettiği Ücret (KDV Dahil)</th><th>Öğrenci İçin Belirlenen Ücret (KDV Dahil)</th></tr>
            </thead><tbody>
              <tr><td className="lbl">Öğrenim Ücreti</td><td className="right">{money(fee)}</td><td className="right"><b>{money(fee)}</b></td></tr>
              <tr><td className="lbl">Kaynak Kitaplar Ücreti</td><td className="right">{Number(extras.kaynak) > 0 ? money(extras.kaynak) : blank("")}</td><td className="right">{Number(extras.kaynak) > 0 ? <b>{money(extras.kaynak)}</b> : blank("")}</td></tr>
              <tr><td className="lbl">Dijital Platform Ücreti</td><td className="right">{Number(extras.dijital) > 0 ? money(extras.dijital) : blank("")}</td><td className="right">{Number(extras.dijital) > 0 ? <b>{money(extras.dijital)}</b> : blank("")}</td></tr>
              <tr><td className="lbl">DNM Kulübü Ücreti</td><td className="right">{Number(extras.dnm) > 0 ? money(extras.dnm) : blank("")}</td><td className="right">{Number(extras.dnm) > 0 ? <b>{money(extras.dnm)}</b> : blank("")}</td></tr>
              <tr><td className="lbl">Kütüphane / Kafe Ücreti</td><td className="right">{Number(extras.kutuphane) > 0 ? money(extras.kutuphane) : blank("")}</td><td className="right">{Number(extras.kutuphane) > 0 ? <b>{money(extras.kutuphane)}</b> : blank("")}</td></tr>
              <tr><td className="lbl">Özel Ders Ücreti</td><td className="right">{Number(extras.ozel_ders) > 0 ? money(extras.ozel_ders) : blank("")}</td><td className="right">{Number(extras.ozel_ders) > 0 ? <b>{money(extras.ozel_ders)}</b> : blank("")}</td></tr>
              {disc > 0 && <tr><td className="lbl">İndirim ({(DISCOUNT_TYPES.find(d => d.v === dtype) || {}).label || "—"})</td><td className="right">−{money(disc)}</td><td className="right"><b style={{color:"#dc2626"}}>−{money(disc)}</b></td></tr>}
              <tr className="total-row"><td className="lbl">ÜCRETLER TOPLAMI</td><td className="right">{money(totalAll)}</td><td className="right"><b>{money(totalAll)}</b></td></tr>
            </tbody></table>

            <table className="contract-table two-col"><tbody>
              <tr><td className="lbl">Ödeme Şekli</td><td>{inst > 1 ? "(   ) Peşin  ( X ) Taksit" : "( X ) Peşin  (   ) Taksit"}</td><td className="lbl">Peşinat</td><td>{blank("")}</td></tr>
              <tr><td className="lbl">Taksit Başlangıç Tarihi</td><td>{blank(s?.due_date ? new Date(s.due_date).toLocaleDateString("tr-TR") : "")}</td><td className="lbl">Taksit Sayısı ve Tutarı</td><td>{inst > 1 ? `${inst} taksit × ${money(perInstallment)}` : blank("")}</td></tr>
              <tr><td className="lbl">İndirim Yapıldı Mı?</td><td colSpan="3">{disc > 0 ? "( X ) Evet  (   ) Hayır" : "(   ) Evet  ( X ) Hayır"} &nbsp;&nbsp;&nbsp; İndirim tutarı: <b>{disc > 0 ? money(disc) : blank("", 10)}</b></td></tr>
            </tbody></table>

            <div className="contract-discount">
              <b>İndirim Yapılmışsa Nedeni:</b><br/>
              {check("kardes")} Kardeş İndirimi &nbsp;&nbsp; {check("ogretmen_cocugu")} Öğretmen Çocuğu İndirimi &nbsp;&nbsp; {check("personel_cocugu")} Personel Çocuğu İndirimi<br/>
              {check("basari")} Başarı İndirimi &nbsp;&nbsp; {check("kurumsal")} Kurumsal İndirim &nbsp;&nbsp; {check("kayitli")} Kayıtlı Öğrenci İndirimi<br/>
              {check("sehit_gazi")} Şehit/Gazi Çocuğu İndirimi &nbsp;&nbsp; {check("korucu")} Korucu Çocuğu İndirimi &nbsp;&nbsp; {check("diger")} Diğer: {dtype === "diger" ? blank(s?.discount_note, 20) : blank("", 20)}
            </div>

            <div className="contract-section-title">KAYIT SÖZLEŞMESİ İLE İLGİLİ GENEL HUSUSLAR</div>
            <ol className="contract-clauses">
              <li>Kurumumuza kayıt yaptıran öğrenci "bir öğretim dönemi boyunca alacağı dersler için" kurs ücreti öder. Öğrenci ve velinin isteğine bağlı diğer ücretler tamamen öğrenci velisinin inisiyatifine bağlıdır ve bu alandaki hizmetler öğrenim ücretinden ayrı hesaplanır.</li>
              <li>Öğrencinin bir sonraki eğitim öğretim yılında kursa devam etmek istemesi durumunda, yukarıda "Ödeme Bilgileri Bölümünde Öğrenci İçin Belirlenen Öğrenim Ücreti" üzerinden artış yapılacaktır.</li>
              <li>Kursun öğretim ücreti, bir önceki eğitim öğretim yılında ilan edilen ücrete (Y.İ-ÜFE+TÜFE)/2 oranına en fazla %10 artış; kursa devam eden öğrencilerin ücreti ise, öğrenci kayıt sözleşmesinde belirlenen eğitim ücretine, (Y.İ-ÜFE+TÜFE)/2 oranına en fazla %10 artış yapılarak hesaplanır.</li>
              <li>Kurumumuz, bir sonraki yılın eğitim ve öğretim ücretini ve diğer (kırtasiye, dijital platform, deneme kulübü, kütüphane, özel ders vb.) ücretleri, Eylül ayından itibaren Kasım ayının sonuna kadar ilan eder. Bu ilanlarda ders yılı veya ders saati ücretiyle birlikte, peşin veya taksitli ödemeler ve diğer indirimler de belirtilir. Bu tarihten sonra oluşan ekonomik değişimlerden (asgari ücret artışı, memur ve işçi zamları gibi) kurumumuz bu zam oranlarının %'sinden en fazla %10 artış yapabilir ve bu durumu ilgili kayıt yapan öğrenci velisi kabul ve taahhüt eder.</li>
              <li>Sosyal ve kültürel faaliyetler, gezi ve gözlem gibi diğer etkinlikler gönüllülük esaslı olup bunlar için ücretler, faaliyet öncesi belirlenir. Kurs ve faaliyetlere katılım ise veli/vasi izni doğrultusunda gerçekleşir.</li>
              <li>Kurumumuz, öğrenci veya veli/vasilerinden kurs kaynakları, Kurs Deneme Kulübü, Kurs Kütüphanesi, Kurs dijital platform ücreti adı altında ayrı bir ücret talep edebilecektir.</li>
              <li>Öğrenim ücreti, Özel Öğretim Kanunu'nda ilgili kademe/sınıf için belirlenen ders müfredat sayısından az olamaz. Öğrenci ders saat ücreti ilgili dönem için MEB DYK kurs öğretmen ders saat ücretinden az olamayacak miktarda ders saat ücreti hesaplanır.</li>
            </ol>
            <div className="contract-footer">ÇÖZÜM KURS EĞİTİM KOORDİNATÖRLÜĞÜ</div>
          </div>

          {/* PAGE 3 */}
          <div className="contract-page">
            <ol className="contract-clauses" start="8">
              <li>Kurumumuzun eğitim ve öğretim ücreti kurs muhasebe birimine veya kurum adına açılan ve valiliğe bildirilen banka hesap numarasına yatırılarak tahsil edilir. Öğrencilerden alınan ücretler e-kurs sistemine işlenir ve velilerin bilgisine sunulur.</li>
              <li>MEB Özel Öğretim Kurumları Yönetmeliği'nin 56. maddesi hükümlerince; eğitim ve öğretim yılı başlamadan kurumumuzdan ayrılanlara, 5580 sayılı Özel Öğretim Yasası gereğince öğrencinin ödeyeceği yıllık ücretin %10 dışındaki kısmı, eğitim ve öğretim yılı başladıktan sonra kurumumuzdan ayrılanlara ise öğrencinin ödeyeceği yıllık ücretin %10'u ile öğrenim gördüğü günlere göre hesaplanan miktarın dışındaki kısmı öğrenci veli/vasisine iade edilir.</li>
              <li>Kurumumuz tarafından öğrencinin ücretsiz okumasının uygun bulunması veya indirim hakkı elde etmesi halinde kurumumuza ödenen ücret, eğitim ve öğretim başladıktan sonra iki ay içinde öğrenci veli/vasisine geri ödenir.</li>
              <li>Herhangi bir şekilde kurumumuzdan ayrılan öğrenci ya da burslu öğrencilerden öğrenim gördüğü süre için kurumumuz tarafından ayrılacağı tarihe kadar verilen ders ücretleri dışında, eğer faydalanmışsa öğrenciden ayrıca kaynak ücreti, Deneme Kulübü ücreti, Kütüphane ücreti ve Dijital platform ücreti talep edilecektir.</li>
              <li>Öğrencinin kursa devam etmesi esastır. Devamsızlık yapan öğrencilerin velileri/vasileri, öğrencilerin mazeretlerini kursa bildirir. Veli/vasi tarafından söz konusu bildirimin kursa yapılmaması halinde, kurs idaresi gelmeyen öğrencilerin velisiyle/vasisiyle iletişim kurarak devamsız öğrenci hakkında veli/vasiye bilgi verir. Hastalık, doğal afetler nedeniyle gelmediğini belgeleyen öğrencilerin dersleri sonradan kurs tarafından düzenlenen ek tamamlayıcı bir program ile tamamlanmak koşuluyla öğretim ve diğer ücretler talep edilir. (Kurs tarafından devamsız öğrenciye sunulan ek tamamlayıcı programa katılım göstermek zorundadır, aksi halde tüm ücret yükümlülüklerini kabul eder.)</li>
              <li>İşbu sözleşmede yer alan hususların yerine getirilmesi ve gerekli tebligatların yapılabilmesi için veli/vasi tarafından yukarıda belirtilen adresin yasal ikametgâh adresi olduğu ve adres değişikliği durumunda 15 gün içerisinde yazılı olarak kursa bildirilmediği takdirde bu adrese yapılacak tebligat geçerli olacaktır. Öğrenci kayıt sözleşmesinin tüm hükümleri veli/vasi tarafından eksiksiz olarak okunmuş, anlaşılmış ve herhangi bir tereddüt olmaksızın tamamen hür irade ve arzu ile kesin olarak kabul edilmiştir.</li>
            </ol>

            <div className="contract-section-title">Özel Hususlar</div>
            <div className="contract-note">(Yürürlükteki mevzuata ve kayıt sözleşmesi şartlarına aykırı olmamak kaydıyla özel şartlar belirlenebilir.)</div>
            <div className="contract-blanks"><span>1. {"\u2026".repeat(90)}</span><span>2. {"\u2026".repeat(90)}</span></div>

            <div className="contract-corp-info">
              <b>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</b> · Nevin ÇAKMAK<br/>
              Kemalpaşa Mah. Ilıca Sokak No:31/33A İnegöl / BURSA · Tel: 0224 715 00 02 · 0553 715 00 02<br/>
              Vergi No: 3171055818 · İnegöl V.D.
            </div>

            <div className="contract-signatures">
              <div>
                <div className="sig-title">Öğrenci Velisi/Vasisinin</div>
                <div className="sig-title">Adı Soyadı ve İmzası</div>
                <div className="sig-blank">{blank(s?.parent_name, 30)}</div>
                <div className="sig-date">..... / ..... / 20.....</div>
              </div>
              <div>
                <div className="sig-title">Kurumun</div>
                <div className="sig-title">(Kaşe, Mühür ve Yetkilinin İmzası)</div>
                <div className="sig-blank">Nevin ÇAKMAK</div>
                <div className="sig-date">..... / ..... / 20.....</div>
              </div>
            </div>
            <div className="contract-footer">ÇÖZÜM KURS EĞİTİM KOORDİNATÖRLÜĞÜ</div>
          </div>
        </section>
      )}
    </div>
    {showPromissory && s && (
      <PromissoryNoteModal student={s} onClose={() => setShowPromissory(false)} />
    )}
  </>;
}

function UsersPage({ me }) {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const load = async () => {
    try {
      const r = await axios.get(`${API}/users`);
      setUsers(r.data);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Yüklenemedi");
    }
  };
  useEffect(() => { load(); }, []);
  const change = async (user_id, role) => {
    try {
      await axios.put(`${API}/users/role`, { user_id, role });
      await load();
      setMsg("Rol güncellendi");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Güncellenemedi");
    }
  };

  return (
    <>
      <PageHead eyebrow="YETKİLENDİRME · PERSONEL" title="Kullanıcılar & Roller" />
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Erişim izinleri</h2>
            <p>Sadece izinli personeller giriş yapabilir. Rolleri buradan değiştirin.</p>
          </div>
          {msg && <span className="text-btn" data-testid="users-msg">{msg}</span>}
        </div>

        <div className="desktop-only-table table-responsive">
          <table>
            <thead>
              <tr>
                <th>KULLANICI</th>
                <th>E-POSTA</th>
                <th>MEVCUT ROL</th>
                <th>ROL DEĞİŞTİR</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                  <td>
                    <div className="person">
                      {u.picture ? (
                        <img className="student-avatar" src={u.picture} alt="" style={{ objectFit: "cover" }} />
                      ) : (
                        <div className="student-avatar">{(u.name || "?").slice(0, 2).toUpperCase()}</div>
                      )}
                      <div>
                        <b>{u.name}</b>
                        <span>{u.user_id.slice(0, 14)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted-cell">{u.email}</td>
                  <td><span className={`role-pill role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                  <td>
                    <select
                      className="mini-select"
                      data-testid={`role-select-${u.user_id}`}
                      value={u.role}
                      onChange={e => change(u.user_id, e.target.value)}
                      disabled={u.user_id === me?.user_id}
                    >
                      <option value="admin">Yönetici</option>
                      <option value="muhasebe">Muhasebe</option>
                      <option value="ogretmen">Öğretmen</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only-cards users-mobile-list">
          {users.map(u => (
            <div key={u.user_id} className="mobile-data-card user-card" data-testid={`user-card-${u.user_id}`}>
              <div className="user-card-head">
                <div className="person">
                  {u.picture ? (
                    <img className="student-avatar" src={u.picture} alt="" style={{ objectFit: "cover" }} />
                  ) : (
                    <div className="student-avatar">{(u.name || "?").slice(0, 2).toUpperCase()}</div>
                  )}
                  <div>
                    <b>{u.name}</b>
                    <span className="card-email">{u.email}</span>
                  </div>
                </div>
                <span className={`role-pill role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>
              </div>
              <div className="user-card-actions">
                <label className="card-select-label">
                  <span>Rol Değiştir:</span>
                  <select
                    className="mini-select mobile-role-select"
                    data-testid={`role-select-mobile-${u.user_id}`}
                    value={u.role}
                    onChange={e => change(u.user_id, e.target.value)}
                    disabled={u.user_id === me?.user_id}
                  >
                    <option value="admin">👑 Yönetici (Admin)</option>
                    <option value="muhasebe">💼 Muhasebe</option>
                    <option value="ogretmen">📚 Öğretmen</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Reminders() {
  const [items, setItems] = useState([]);
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState("");
  useEffect(() => { (async () => { try { const r = await axios.get(`${API}/reminders?days=${days}`); setItems(r.data); } catch (e) { setMsg(e.response?.data?.detail || "Yüklenemedi"); } })(); }, [days]);
  const overdue = items.filter(i => i.status === "overdue");
  const upcoming = items.filter(i => i.status === "upcoming");
  return <>
    <PageHead eyebrow="TAKİP · ÖDEME HATIRLATMA" title="Hatırlatma Listesi">
      <select data-testid="reminders-days-select" value={days} onChange={e => setDays(Number(e.target.value))} className="mini-select"><option value="3">Önümüzdeki 3 gün</option><option value="7">Önümüzdeki 7 gün</option><option value="14">Önümüzdeki 14 gün</option><option value="30">Önümüzdeki 30 gün</option></select>
    </PageHead>
    <div className="reminder-banner"><ShieldCheck size={17}/><div><b>NetGSM SMS entegrasyonu yakında</b><span>Bu liste hazır — otomatik gönderim NetGSM API bağlanınca aktif olacak. Şimdilik telefon numaralarını tek tıkla arayabilirsiniz.</span></div></div>
    <div className="stats-grid compact"><Stat icon={BellRing} label="Geciken ödeme" value={overdue.length} note="Vadesi geçti" color="red" trend="Acil" /><Stat icon={Bell} label="Yaklaşan taksit" value={upcoming.length} note={`Önümüzdeki ${days} gün`} color="amber" trend="Takip" /></div>
    <section className="panel table-panel">
      <div className="panel-head"><div><h2>Aramaya hazır liste</h2><p>Numaraya tıklayın · WhatsApp/SMS gönderimi entegrasyon sonrası açılır</p></div>{msg && <span className="text-btn" data-testid="reminders-msg">{msg}</span>}</div>
      <div className="desktop-only-table table-responsive">
        <table>
          <thead>
            <tr>
              <th>DURUM</th>
              <th>ÖĞRENCİ</th>
              <th>VELİ / TELEFON</th>
              <th>TAKSİT NO</th>
              <th>VADE</th>
              <th>TUTAR</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={`${it.student_id}-${i}`} data-testid={`reminder-row-${it.student_id}`}>
                <td><span className={`status-pill ${it.status === "overdue" ? "danger" : "warning"}`}>{it.status === "overdue" ? "Gecikti" : "Yaklaşan"}</span></td>
                <td><b>{it.student_name}</b></td>
                <td><div className="cell-stack"><b>{it.parent_name}</b><a className="phone-link" href={`tel:${(it.parent_phone || "").replace(/\s/g, "")}`}><Phone size={12}/> {it.parent_phone || "—"}</a></div></td>
                <td>#{it.installment_no}</td>
                <td>{new Date(it.due_date).toLocaleDateString("tr-TR")}<br/><span className="muted-cell" style={{ fontSize: 10 }}>{it.status === "overdue" ? `${Math.abs(it.days_diff)} gün gecikti` : `${it.days_diff} gün kaldı`}</span></td>
                <td><b className="amount">{money(it.amount_due)}</b></td>
                <td><a data-testid={`whatsapp-${it.student_id}`} className="text-btn" target="_blank" rel="noreferrer" href={`https://wa.me/${(it.parent_phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Sayın ${it.parent_name}, ${it.student_name} adına ${new Date(it.due_date).toLocaleDateString("tr-TR")} tarihli ${money(it.amount_due)} tutarındaki taksit ödemesini hatırlatmak isteriz. İnegöl Çözüm Kurs`)}`}>WhatsApp</a></td>
              </tr>
            ))}
            {items.length === 0 && !msg && <tr><td colSpan="7" className="muted-cell" style={{ textAlign: "center", padding: "30px" }}>Bu dönemde bekleyen ödeme yok. 🎉</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mobile-only-cards reminders-mobile-list">
        {items.map((it, i) => (
          <div key={`${it.student_id}-${i}`} className="mobile-data-card reminder-card" data-testid={`reminder-card-${it.student_id}`}>
            <div className="reminder-card-top">
              <div>
                <b className="reminder-student-name">{it.student_name}</b>
                <span className="card-subtext">Taksit #{it.installment_no} · Vade: {new Date(it.due_date).toLocaleDateString("tr-TR")}</span>
              </div>
              <span className={`status-pill ${it.status === "overdue" ? "danger" : "warning"}`}>
                {it.status === "overdue" ? `${Math.abs(it.days_diff)} gün gecikti` : `${it.days_diff} gün kaldı`}
              </span>
            </div>
            <div className="reminder-card-mid">
              <div className="reminder-parent-stack">
                <span className="card-label">Veli: <b>{it.parent_name}</b></span>
                <a className="phone-link" href={`tel:${(it.parent_phone || "").replace(/\s/g, "")}`}>
                  <Phone size={13} /> {it.parent_phone || "—"}
                </a>
              </div>
              <b className="amount red-amount">{money(it.amount_due)}</b>
            </div>
            <div className="reminder-card-actions">
              <a
                data-testid={`whatsapp-mobile-${it.student_id}`}
                className="whatsapp-btn"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${(it.parent_phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Sayın ${it.parent_name}, ${it.student_name} adına ${new Date(it.due_date).toLocaleDateString("tr-TR")} tarihli ${money(it.amount_due)} tutarındaki taksit ödemesini hatırlatmak isteriz. İnegöl Çözüm Kurs`)}`}
              >
                💬 WhatsApp ile Hatırlat
              </a>
            </div>
          </div>
        ))}
        {items.length === 0 && !msg && (
          <div className="empty-card-msg">Bu dönemde bekleyen ödeme yok. 🎉</div>
        )}
      </div>
    </section>
  </>;
}

function Reports({ me, data = {} }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const generate = async () => {
    setLoading(true); setMsg("");
    try { await downloadBlob(`${API}/reports/monthly?month=${month}`, `inegol-cozum-rapor-${month}.pdf`); setMsg("Rapor indirildi."); }
    catch (e) {
      window.print();
      setMsg("Yazdırma / PDF penceresi açıldı.");
    }
    finally { setLoading(false); }
  };
  return <>
    <PageHead eyebrow="RAPOR · AYLIK MUHASEBE" title="Aylık Rapor PDF" />
    <div className="report-hero panel">
      <div className="report-lead">
        <h2>Kurumsal aylık rapor</h2>
        <p>Seçtiğiniz ay için toplam tahsilat, yöntem dağılımı, giderler ve net durum, kurumsal antetli canlı önizleme ve PDF çıktısı ile hazır.</p>
        <ul className="report-checks">
          <li>✓ İnegöl Çözüm Kurs logosu ve iletişim bilgileri</li>
          <li>✓ Tahsilat kalemleri ve yöntem kırılımı</li>
          <li>✓ Aylık giderler ve net kâr/zarar</li>
          <li>✓ Toplam bekleyen alacak özeti</li>
        </ul>
      </div>
      <div className="report-form">
        <label>Rapor ayı<input data-testid="report-month-input" type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
        <Button testid="download-report-button" onClick={generate}><Download size={17}/> {loading ? "Hazırlanıyor..." : "PDF olarak indir"}</Button>
        {can(me,"export_data") && <Button testid="download-all-excel" secondary onClick={() => downloadBlob(`${API}/export/all`, `inegol-cozum-tum-kayitlar.csv`)}><FileDown size={17}/> Tüm kayıtları Excel indir</Button>}
        {msg && <div data-testid="report-msg" className="report-msg">{msg}</div>}
      </div>
    </div>

    {/* EKRANDA CANLI RAPOR ÖNİZLEMESİ */}
    <MonthlyReportPreview month={month} data={data} onPrint={generate} />
  </>;
}

function StudentProfileModal({ student, onClose, me, API, data = {}, onEditStudent, onOpenPayment, onNavigate }) {
  const [activeTab, setActiveTab] = useState("genel"); // 'genel' | 'sinavlar' | 'yoklama' | 'muhasebe' | 'rehberlik'
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedKarne, setSelectedKarne] = useState(null);
  const [showPromissoryModal, setShowPromissoryModal] = useState(false);
  const [showHataKarnesiModal, setShowHataKarnesiModal] = useState(false);
  const [showGelirModal, setShowGelirModal] = useState(false);
  const fileRef = useRef();

  const refresh = () => {
    if (!student) return;
    setLoading(true); setDetail(null);
    axios.get(`${API}/students/${student.id}/detail`).then(r => setDetail(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); setUploadMsg(""); /* eslint-disable-next-line */ }, [student?.id]);
  if (!student) return null;

  const s = detail?.student || student;
  const payments = detail?.payments || [];
  const plan = detail?.installment_plan || [];
  const { extraSum, discount, effective } = computeEffective(s);
  const canEdit = can(me, "student_create");

  // Öğrencinin katıldığı sınavlar
  const studentExams = (detail?.exam_results && detail.exam_results.length > 0)
    ? detail.exam_results
    : (data.exams || []).map(exam => {
        const res = (exam.results || []).find(r => r.student_id === s.id);
        return res ? { exam, ...res } : null;
      }).filter(Boolean);

  // Öğrencinin yoklama kayıtları
  const studentAttendance = (detail?.attendance && detail.attendance.length > 0)
    ? detail.attendance
    : (data.attendanceToday || []).filter(a => a.student_id === s.id);

  // Öğrencinin rehberlik kayıtları
  const studentMentorship = (detail?.mentorship && detail.mentorship.length > 0)
    ? detail.mentorship
    : (data.mentorship || []).filter(m => m.student_id === s.id);

  const uploadContract = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadMsg("Dosya 10MB'dan büyük olamaz"); return; }
    setUploading(true); setUploadMsg("");
    try {
      await axios.post(`${API}/students/${s.id}/contract-upload`, file, {
        headers: { "Content-Type": file.type || "application/pdf", "X-Filename": file.name, "X-Content-Type": file.type || "application/pdf" }
      });
      setUploadMsg("İmzalı sözleşme yüklendi ✓");
      refresh();
    } catch (e) { setUploadMsg(e.response?.data?.detail || "Yüklenemedi"); }
    finally { setUploading(false); }
  };

  const viewContract = async () => {
    try {
      const r = await axios.get(`${API}/students/${s.id}/contract-file`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      window.open(url, "_blank");
    } catch (e) { setUploadMsg("Sözleşme açılamadı"); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ width: "95vw", maxWidth: "980px", maxHeight: "92vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", borderRadius: "12px" }}
      >
        {/* Modal Başlığı & Hızlı Aksiyonlar */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--line)", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="student-avatar big" style={{ width: 48, height: 48, fontSize: 17, background: "#2563eb", color: "#fff" }}>
              {s.student_name?.split(" ").map(x=>x[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>{s.student_name}</h2>
                <span className="status-pill success">{s.status || "Kayıtlı"}</span>
                {s.student_no && <span className="badge" style={{ background: "#e2e8f0", fontSize: "11px" }}>#{s.student_no}</span>}
              </div>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                {s.school || "İnegöl Anadolu Lisesi"} · <b>{s.student_class || s.program || "11-A Sayısal"}</b> · {s.department || "Sayısal"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button 
              className="btn small secondary" 
              onClick={() => setShowGelirModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#2563eb", borderColor: "#3b82f6" }}
              title="Edesis Resmi Gelir ve Taksit Detay Sayfası"
            >
              <FileText size={14} /> 📄 Gelir Detay (GLR)
            </button>
            <button 
              className="btn small secondary" 
              onClick={() => setShowPromissoryModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#7c3aed", borderColor: "#7c3aed" }}
              title="Öğrencinin tüm taksit senetlerini koçan halinde yazdır"
            >
              <FileText size={14} /> Matbu Senet
            </button>
            <button 
              className="btn small secondary" 
              onClick={() => setShowHataKarnesiModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#dc2626", borderColor: "#dc2626" }}
              title="Öğrencinin kazanım analizli hata karnesini aç"
            >
              <TrendingDown size={14} /> Hata Karnesi
            </button>
            {canEdit && (
              <button 
                className="btn small" 
                onClick={() => onEditStudent && onEditStudent(s)}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#2563eb", color: "#fff" }}
              >
                <Edit size={14} /> Öğrenciyi Düzenle
              </button>
            )}
            {s.parent_phone && (
              <button 
                className="btn small" 
                onClick={() => openWhatsApp(s.parent_phone, `Sayın Velimiz ${s.parent_name}, ${s.student_name} öğrencimizin Özel İnegöl Çözüm Kurs Merkezi bilgilendirme mesajıdır.`)}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#16a34a", color: "#fff" }}
              >
                <MessageCircle size={14} /> Veliye WhatsApp
              </button>
            )}
            <button className="icon-btn" onClick={onClose}><X size={19} /></button>
          </div>
        </div>

        {/* 5 Sekmeli Navigasyon Çubuğu */}
        <div className="student-profile-tabs" style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "#fff", padding: "0 24px" }}>
          {[
            { id: "genel", label: "Genel & Kimlik", icon: Users },
            { id: "sinavlar", label: `Sınavlar & Karneler (${studentExams.length})`, icon: Award },
            { id: "yoklama", label: "Devamsızlık & Yoklama", icon: CalendarCheck },
            { id: "muhasebe", label: "Muhasebe & Taksitler", icon: Wallet }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                className="tab-btn"
                style={{
                  padding: "12px 16px",
                  border: "none",
                  background: "none",
                  borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
                  color: isActive ? "#2563eb" : "#64748b",
                  fontWeight: isActive ? "700" : "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px"
                }}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal İçeriği */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Bilgiler yükleniyor...</div>}

          {/* SEKME 1: GENEL & KİMLİK */}
          {activeTab === "genel" && (
            <div>
              <div className="mini-stats" style={{ marginBottom: "16px" }}>
                <div><span>Öğrenim Ücreti</span><b>{money(s.total_fee)}</b></div>
                <div><span>+ Ekstra Ücretler</span><b className="green">+{money(extraSum)}</b></div>
                <div><span>− İndirim</span><b className="red">−{money(discount)}</b></div>
                <div><span>Net Toplam</span><b style={{ color: "#2563eb" }}>{money(effective)}</b></div>
                <div><span>Kalan Borç</span><b className="red">{money(Math.max(0, effective - (s.paid_amount||0)))}</b></div>
              </div>

              <h3 className="drawer-h3">Öğrenci & Kayıt Detayları (Edesis)</h3>
              <div className="drawer-grid" style={{ marginBottom: "16px" }}>
                <div><span>Öğrenci No</span><b>{s.student_no ? `#${s.student_no}` : "—"}</b></div>
                <div><span>T.C. Kimlik No</span><b>{s.student_tc || "—"}</b></div>
                <div><span>Cinsiyet</span><b>{s.gender || "—"}</b></div>
                <div><span>Doğum Tarihi</span><b>{s.birth_date ? new Date(s.birth_date).toLocaleDateString("tr-TR") : "—"}</b></div>
                <div><span>Alanı / Bölümü</span><b>{s.department || "—"}</b></div>
                <div><span>Kayıt Durumu</span><b className="status-pill success">{s.status || "Kayıtlı"}</b></div>
                <div><span>Din Kültürü</span><b>{s.din_muaf ? "Muaf" : "Dahil"}</b></div>
                <div><span>Yabancı Dil</span><b>{s.ing_muaf ? "Muaf" : "Dahil"}</b></div>
                <div><span>Servis Kullanımı</span><b>{s.uses_service ? "Servis Kullanıyor" : "Kullanmıyor"}</b></div>
                <div><span>Diploma / OBP Notu</span><b>{s.diploma_grade || "—"}</b></div>
              </div>

              {s.health_notes && (
                <div style={{ margin: "10px 0 16px", padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}>
                  <b style={{ color: "#475569" }}>Sağlık & Özel Not:</b> {s.health_notes}
                </div>
              )}

              <h3 className="drawer-h3">Veli & Aile İletişim Bilgileri</h3>
              <div className="drawer-grid" style={{ marginBottom: "16px" }}>
                <div><span>Öğrenci Telefonu</span><b>{s.student_phone || "—"}</b></div>
                <div><span>İkamet Adresi</span><b>{s.student_address || "—"}</b></div>
                <div><span>Baba (Birincil Veli)</span><b>{s.parent_name || "—"}</b></div>
                <div><span>Baba Telefonu</span><b>{s.parent_phone || "—"}</b></div>
                <div><span>Baba Mesleği</span><b>{s.father_job || "—"}</b></div>
                <div><span>Anne Adı</span><b>{s.mother_name || "—"}</b></div>
                <div><span>Anne Telefonu</span><b>{s.mother_phone || "—"}</b></div>
                <div><span>Anne Mesleği</span><b>{s.mother_job || "—"}</b></div>
                <div><span>Vasi (Varsa)</span><b>{s.guardian_name || "—"}</b></div>
              </div>

              <h3 className="drawer-h3">İmzalı Kayıt Sözleşmesi Arşivi</h3>
              <div className="contract-upload-box">
                {s.signed_contract_path ? (
                  <div className="contract-file">
                    <FileText size={24} color="#2563eb" />
                    <div>
                      <b>{s.signed_contract_filename || "Resmi Sözleşme"}</b>
                      <span>{s.signed_contract_uploaded_at ? new Date(s.signed_contract_uploaded_at).toLocaleString("tr-TR") : ""}</span>
                    </div>
                    <Button testid="view-contract-button" secondary onClick={viewContract}><FileText size={14}/> Sözleşmeyi Görüntüle</Button>
                  </div>
                ) : (
                  <div className="contract-empty">
                    <FileText size={26} color="#94a3b8" />
                    <div>
                      <b>Henüz taranmış ıslak imzalı sözleşme yüklenmedi</b>
                      <span>Veliyle imzaladığınız sözleşmeyi tarayıp dijital arşivleyin (PDF/JPG · maks 10MB)</span>
                    </div>
                    {canEdit && (
                      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => uploadContract(e.target.files?.[0])} />
                    )}
                  </div>
                )}
                {uploading && <div className="report-msg" style={{ background: "#eff6ff", color: "#1d4ed8" }}>Yükleniyor...</div>}
                {uploadMsg && <div className="report-msg">{uploadMsg}</div>}
              </div>
            </div>
          )}

          {/* SEKME 2: SINAVLAR, KARNELER & HATA ANALİZİ */}
          {activeTab === "sinavlar" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Katıldığı Deneme Sınavları & Net Analizi</h4>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Toplam {studentExams.length} Sınav Sonucu Bulundu</span>
              </div>

              {studentExams.length > 0 ? (
                <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                  <table className="data-table" style={{ width: "100%", fontSize: "12px", margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Sınav Adı</th>
                        <th>Kitapçık</th>
                        <th>Türkçe</th>
                        <th>Matematik</th>
                        <th>Fen</th>
                        <th>Sosyal</th>
                        <th>Toplam Net</th>
                        <th>Puan</th>
                        <th>Sıralama</th>
                        <th style={{ textAlign: "right" }}>Karne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentExams.map((ex, idx) => (
                        <tr key={idx}>
                          <td><b>{ex.exam?.title || ex.exam_title || "Kurumsal Deneme"}</b></td>
                          <td><span className="badge" style={{ background: "#f1f5f9" }}>{ex.booklet || "A"}</span></td>
                          <td>{ex.turkish_net}</td>
                          <td>{ex.math_net}</td>
                          <td>{ex.science_net}</td>
                          <td>{ex.social_net}</td>
                          <td><b style={{ color: "#2563eb" }}>{ex.total_net}</b></td>
                          <td><b style={{ color: "#16a34a" }}>{ex.score}</b></td>
                          <td><span className="badge" style={{ background: "#fef3c7", color: "#b45309" }}>#{ex.overall_rank || 1}</span></td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                              className="btn small" 
                              onClick={() => setSelectedKarne({ ...ex, student_name: s.student_name, student_no: s.student_no, student_class: s.student_class })}
                              style={{ padding: "4px 8px", fontSize: "11px", background: "#7c3aed", color: "#fff" }}
                            >
                              Karne Gör
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "36px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <Award size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                    Öğrenciye ait henüz bir sınav sonucu kaydı bulunamadı.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SEKME 3: DEVAMSIZLIK & YOKLAMA */}
          {activeTab === "yoklama" && (
            <div>
              <div className="mini-stats" style={{ marginBottom: "16px" }}>
                <div><span>Toplam Kayıt</span><b>{studentAttendance.length}</b></div>
                <div><span>Geldiği Gün</span><b className="green">{studentAttendance.filter(a => a.status === "geldi").length}</b></div>
                <div><span>Devamsızlık</span><b className="red">{studentAttendance.filter(a => a.status === "gelmedi").length}</b></div>
                <div><span>İzinli / Geç</span><b style={{ color: "#b45309" }}>{studentAttendance.filter(a => ["izinli", "gec"].includes(a.status)).length}</b></div>
              </div>

              {studentAttendance.length > 0 ? (
                <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                  <table className="data-table" style={{ width: "100%", fontSize: "13px", margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Ders Saati</th>
                        <th>Durum</th>
                        <th>Açıklama / Not</th>
                        <th style={{ textAlign: "right" }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAttendance.map((a, idx) => (
                        <tr key={idx}>
                          <td><b>{new Date(a.date).toLocaleDateString("tr-TR")}</b></td>
                          <td>{a.lesson_slot || "Tüm Gün"}</td>
                          <td>
                            <span className={`status-pill ${a.status === "geldi" ? "success" : a.status === "gelmedi" ? "danger" : "warning"}`}>
                              {a.status === "geldi" ? "Geldi" : a.status === "gelmedi" ? "Gelmedi" : a.status}
                            </span>
                          </td>
                          <td><span style={{ color: "#64748b" }}>{a.note || "—"}</span></td>
                          <td style={{ textAlign: "right" }}>
                            {s.parent_phone && a.status === "gelmedi" && (
                              <button 
                                className="btn small secondary" 
                                onClick={() => openWhatsApp(s.parent_phone, `Sayın Velimiz, ${s.student_name} öğrencimiz ${new Date(a.date).toLocaleDateString("tr-TR")} tarihinde kurumumuza katılmamıştır.`)}
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                              >
                                Devamsızlık Bildir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "36px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <CalendarCheck size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                    Öğrenciye ait güncel devamsızlık kaydı bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SEKME 4: MUHASEBE & TAKSİTLER */}
          {activeTab === "muhasebe" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Taksit ve Ödeme Çizelgesi</h4>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="btn small secondary" 
                    onClick={() => setShowGelirModal(true)} 
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#2563eb", borderColor: "#93c5fd" }}
                  >
                    <FileText size={14} /> 📄 Edesis Gelir Detayı (GLR)
                  </button>
                  <button className="btn small" onClick={() => onOpenPayment && onOpenPayment()} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Plus size={14} /> Tahsilat Ekle
                  </button>
                </div>
              </div>

              <div className="plan-table" style={{ marginBottom: "20px" }}>
                <div className="plan-row plan-head">
                  <span>#</span>
                  <span>Vade Tarihi</span>
                  <span>Taksit Tutarı</span>
                  <span>Ödenen</span>
                  <span>Kalan</span>
                  <span>Durum</span>
                </div>
                {plan.map(p => (
                  <div key={p.no} className={`plan-row plan-${p.status}`}>
                    <span><b>#{p.no}</b></span>
                    <span>{new Date(p.due_date).toLocaleDateString("tr-TR")}</span>
                    <span><b>{money(p.amount)}</b></span>
                    <span style={{ color: "#16a34a" }}>{money(p.paid)}</span>
                    <span style={{ color: p.remaining > 0 ? "#dc2626" : "#64748b" }}>{money(p.remaining)}</span>
                    <span>
                      <span className={`status-pill ${p.status === "paid" ? "success" : p.status === "partial" ? "warning" : "danger"}`}>
                        {p.status === "paid" ? "Ödendi" : p.status === "partial" ? "Kısmi" : "Bekliyor"}
                      </span>
                    </span>
                  </div>
                ))}
                {plan.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>Taksit planı oluşturulmamış.</div>}
              </div>

              <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700" }}>Geçmiş Tahsilat Hareketleri</h4>
              <div className="plan-table">
                <div className="plan-row plan-head">
                  <span>Tarih</span>
                  <span>Yöntem</span>
                  <span>Tutar</span>
                  <span>Açıklama</span>
                  <span>Kaydeden</span>
                </div>
                {payments.map(p => (
                  <div key={p.id} className="plan-row">
                    <span>{new Date(p.payment_date).toLocaleDateString("tr-TR")}</span>
                    <span><span className="method-tag">{p.method}</span></span>
                    <span><b style={{ color: "#16a34a" }}>{money(p.amount)}</b></span>
                    <span>{p.note || "—"}</span>
                    <span>{p.created_by_name || "—"}</span>
                  </div>
                ))}
                {payments.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>Henüz tahsilat kaydı yok.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Modal Alt Çubuğu */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--line)", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>

      {/* KARNE MODALI POPUP */}
      {selectedKarne && (
        <OfficialEdesisKarneModal 
          data={selectedKarne} 
          onClose={() => setSelectedKarne(null)} 
        />
      )}

      {/* MATBU SENET KOÇANI */}
      {showPromissoryModal && (
        <PromissoryNoteModal 
          student={s} 
          onClose={() => setShowPromissoryModal(false)} 
        />
      )}

      {/* KAZANIM HATA KARNESİ */}
      {showHataKarnesiModal && (
        <HataKarnesiModal 
          student={s} 
          onClose={() => setShowHataKarnesiModal(false)} 
        />
      )}

      {/* EDESİS GELİR DETAY SÜİTİ */}
      {showGelirModal && (
        <GelirDetayModal
          isOpen={true}
          onClose={() => setShowGelirModal(false)}
          student={s}
          onRecordPayment={() => refresh()}
        />
      )}
    </div>
  );
}

// Geriye dönük uyumluluk için alias
const StudentDetailDrawer = StudentProfileModal;

function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/audit-logs`);
        setLogs(r.data);
      } catch (e) {
        setMsg(e.response?.data?.detail || "Yüklenemedi");
      }
    })();
  }, []);

  const labelFor = (a) => ({
    "auth.login": "Giriş yapıldı",
    "auth.logout": "Çıkış yapıldı",
    "student.create": "Öğrenci eklendi",
    "payment.create": "Tahsilat alındı",
    "expense.create": "Gider kaydedildi",
    "class.create": "Sınıf oluşturuldu",
    "user.role_update": "Rol değiştirildi",
    "export.excel": "Excel indirildi",
    "report.monthly": "Aylık rapor",
  }[a] || a);

  return (
    <>
      <PageHead eyebrow="DENETİM · AKTİVİTE GEÇMİŞİ" title="Denetim Kaydı">
        <Button
          testid="export-audit-button"
          secondary
          onClick={() => downloadBlob(`${API}/export/audit`, `inegol-cozum-denetim.csv`)}
        >
          <Download size={16} /> Excel indir
        </Button>
      </PageHead>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Son işlemler</h2>
            <p>Hangi kullanıcı ne zaman ne yaptı — şeffaf takip</p>
          </div>
          {msg && <span className="text-btn" data-testid="audit-msg">{msg}</span>}
        </div>

        <div className="desktop-only-table table-responsive">
          <table>
            <thead>
              <tr>
                <th>TARİH</th>
                <th>KULLANICI</th>
                <th>ROL</th>
                <th>İŞLEM</th>
                <th>AÇIKLAMA</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} data-testid={`audit-row-${l.id}`}>
                  <td className="muted-cell">{new Date(l.created_at).toLocaleString("tr-TR")}</td>
                  <td>
                    <b>{l.user_name || "—"}</b>
                    <br />
                    <span className="muted-cell" style={{ fontSize: 10 }}>{l.user_email}</span>
                  </td>
                  <td><span className={`role-pill role-${l.user_role}`}>{ROLE_LABEL[l.user_role] || l.user_role}</span></td>
                  <td><span className="method-tag">{labelFor(l.action)}</span></td>
                  <td className="muted-cell">{l.detail || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && !msg && (
                <tr>
                  <td colSpan="5" className="muted-cell" style={{ textAlign: "center", padding: "30px" }}>
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-only-cards audit-mobile-list">
          {logs.map(l => (
            <div key={l.id} className="mobile-data-card audit-card" data-testid={`audit-card-${l.id}`}>
              <div className="audit-card-top">
                <div className="audit-user-info">
                  <b>{l.user_name || "Bilinmeyen Kullanıcı"}</b>
                  <span className="card-subtext">{new Date(l.created_at).toLocaleString("tr-TR")}</span>
                </div>
                <span className={`role-pill role-${l.user_role}`}>{ROLE_LABEL[l.user_role] || l.user_role}</span>
              </div>
              <div className="audit-card-action">
                <span className="method-tag audit-tag">{labelFor(l.action)}</span>
                <span className="audit-detail-text">{l.detail || "İşlem detayı yok"}</span>
              </div>
            </div>
          ))}
          {logs.length === 0 && !msg && (
            <div className="empty-card-msg">Kayıt bulunamadı.</div>
          )}
        </div>
      </section>
    </>
  );
}

const DISCOUNT_TYPES = [
  { v: "", label: "— İndirim yok —" },
  { v: "kardes", label: "Kardeş İndirimi" },
  { v: "ogretmen_cocugu", label: "Öğretmen Çocuğu İndirimi" },
  { v: "personel_cocugu", label: "Personel Çocuğu İndirimi" },
  { v: "basari", label: "Başarı İndirimi" },
  { v: "kurumsal", label: "Kurumsal İndirim" },
  { v: "kayitli", label: "Kayıtlı Öğrenci İndirimi" },
  { v: "sehit_gazi", label: "Şehit/Gazi Çocuğu İndirimi" },
  { v: "korucu", label: "Korucu Çocuğu İndirimi" },
  { v: "diger", label: "Diğer" },
];
const EXTRA_KEYS = [
  { k: "kaynak", label: "Kaynak Kitaplar Ücreti" },
  { k: "dijital", label: "Dijital Platform Ücreti" },
  { k: "dnm", label: "DNM Kulübü Ücreti" },
  { k: "kutuphane", label: "Kütüphane / Kafe Ücreti" },
  { k: "ozel_ders", label: "Özel Ders Ücreti" },
];
const computeEffective = (s) => {
  const total = Number(s?.total_fee || 0);
  let extraSum = 0;
  try {
    const extras = typeof s?.extra_fees === "string" ? JSON.parse(s.extra_fees || "{}") : (s?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(s?.discount_amount || 0);
  return { total, extraSum, discount, effective: Math.max(0, total + extraSum - discount) };
};

function Modal({ type, selected, data, close, reload }) {
  const [form, setForm] = useState({ payment_date: today(), method: "Nakit", amount: "", installment_count: 1, extra_kaynak: 0, extra_dijital: 0, extra_dnm: 0, extra_kutuphane: 0, extra_ozel_ders: 0, discount_type: "", discount_amount: 0 });
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef();
  if (!type) return null;
  const change = e => setForm({...form, [e.target.name]: e.target.value});
  const extraSum = EXTRA_KEYS.reduce((s, x) => s + Number(form[`extra_${x.k}`] || 0), 0);
  const effective = Number(form.total_fee || 0) + extraSum - Number(form.discount_amount || 0);
  const submit = async e => {
    e.preventDefault(); setError("");
    try {
      if (type === "student") {
        const payload = {...form,
          total_fee: Number(form.total_fee || 0),
          installment_count: Number(form.installment_count || 1),
          discount_amount: Number(form.discount_amount || 0),
          extra_fees: EXTRA_KEYS.reduce((o, x) => ({...o, [x.k]: Number(form[`extra_${x.k}`] || 0)}), {}),
          photo,
        };
        EXTRA_KEYS.forEach(x => delete payload[`extra_${x.k}`]);
        await axios.post(`${API}/students`, payload);
      }
      if (type === "payment") await axios.post(`${API}/payments`, {...form, student_id: form.student_id, amount: Number(form.amount)});
      if (type === "expense") await axios.post(`${API}/expenses`, {...form, amount: Number(form.amount)});
      if (type === "class")   await axios.post(`${API}/classes`,  {...form, capacity: Number(form.capacity || 20)});
      await reload(); close();
    } catch (err) { setError(err.response?.data?.detail || "Kayıt sırasında bir sorun oluştu."); }
  };
  const title = {student:"Yeni öğrenci kaydı", payment:"Tahsilat ekle", expense:"Gider ekle", class:"Yeni sınıf oluştur"}[type];
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">KURS YÖNETİMİ</div>
            <h2>{title}</h2>
          </div>
          <button data-testid="modal-close" className="icon-btn" onClick={close} type="button">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="modal-form-body">
      {type === "student" && <>
        <div className="form-section-title">Öğrenci Bilgileri</div>
        <div className="form-grid">
          <label>Öğrenci ad soyad<input data-testid="student-name-input" required name="student_name" onChange={change}/></label>
          <label>Öğrenci T.C.<input data-testid="student-tc-input" name="student_tc" onChange={change}/></label>
          <label>Öğrenci telefon<input data-testid="student-phone-input" name="student_phone" onChange={change}/></label>
          <label>Okul<input data-testid="student-school-input" name="school" onChange={change}/></label>
          <label>Sınıf<input data-testid="student-class-input" name="student_class" onChange={change}/></label>
          <label>Program<input data-testid="program-input" name="program" placeholder="TYT - AYT" onChange={change}/></label>
        </div>
        <label>Öğrenci ev adresi<textarea data-testid="student-address-input" name="student_address" onChange={change}/></label>

        <div className="form-section-title">Baba (Veli) Bilgileri</div>
        <div className="form-grid">
          <label>Ad soyad<input data-testid="parent-name-input" required name="parent_name" onChange={change}/></label>
          <label>T.C.<input data-testid="parent-tc-input" name="parent_tc" onChange={change}/></label>
          <label>Cep telefonu<input data-testid="parent-phone-input" name="parent_phone" onChange={change}/></label>
          <label>Mesleği<input data-testid="father-job-input" name="father_job" onChange={change}/></label>
          <label>İş telefonu<input data-testid="father-work-phone-input" name="father_work_phone" onChange={change}/></label>
          <label>e-Posta<input data-testid="father-email-input" type="email" name="father_email" onChange={change}/></label>
        </div>
        <label>Baba ev adresi<textarea data-testid="parent-address-input" name="parent_address" onChange={change}/></label>
        <label>Baba iş adresi<textarea data-testid="father-work-address-input" name="father_work_address" onChange={change}/></label>

        <details className="form-details"><summary>Anne Bilgileri (isteğe bağlı)</summary>
          <div className="form-grid">
            <label>Ad soyad<input data-testid="mother-name-input" name="mother_name" onChange={change}/></label>
            <label>T.C.<input data-testid="mother-tc-input" name="mother_tc" onChange={change}/></label>
            <label>Cep telefonu<input data-testid="mother-phone-input" name="mother_phone" onChange={change}/></label>
            <label>Mesleği<input data-testid="mother-job-input" name="mother_job" onChange={change}/></label>
            <label>İş telefonu<input data-testid="mother-work-phone-input" name="mother_work_phone" onChange={change}/></label>
            <label>e-Posta<input data-testid="mother-email-input" type="email" name="mother_email" onChange={change}/></label>
          </div>
          <label>Anne ev adresi<textarea data-testid="mother-address-input" name="mother_address" onChange={change}/></label>
          <label>Anne iş adresi<textarea data-testid="mother-work-address-input" name="mother_work_address" onChange={change}/></label>
        </details>

        <details className="form-details"><summary>Vasi Bilgileri (varsa)</summary>
          <div className="form-grid">
            <label>Ad soyad<input data-testid="guardian-name-input" name="guardian_name" onChange={change}/></label>
            <label>T.C.<input data-testid="guardian-tc-input" name="guardian_tc" onChange={change}/></label>
            <label>Cep telefonu<input data-testid="guardian-phone-input" name="guardian_phone" onChange={change}/></label>
            <label>Ev telefonu<input data-testid="guardian-home-phone-input" name="guardian_home_phone" onChange={change}/></label>
            <label>İş telefonu<input data-testid="guardian-work-phone-input" name="guardian_work_phone" onChange={change}/></label>
            <label>Mesleği<input data-testid="guardian-job-input" name="guardian_job" onChange={change}/></label>
            <label>e-Posta<input data-testid="guardian-email-input" type="email" name="guardian_email" onChange={change}/></label>
          </div>
          <label>Ev adresi<textarea data-testid="guardian-home-address-input" name="guardian_home_address" onChange={change}/></label>
          <label>İş adresi<textarea data-testid="guardian-work-address-input" name="guardian_work_address" onChange={change}/></label>
        </details>

        <div className="form-section-title">Ödeme Bilgileri</div>
        <div className="form-grid">
          <label>Öğrenim ücreti (₺)<input data-testid="total-fee-input" type="number" min="0" name="total_fee" onChange={change}/></label>
          <label>Taksit sayısı<input data-testid="installment-count-input" type="number" min="1" name="installment_count" defaultValue="1" onChange={change}/></label>
          <label>İlk ödeme tarihi<input data-testid="due-date-input" type="date" name="due_date" onChange={change}/></label>
        </div>

        <details className="form-details" open><summary>Ekstra Ücretler (isteğe bağlı)</summary>
          <div className="form-grid">
            {EXTRA_KEYS.map(x => <label key={x.k}>{x.label} (₺)<input data-testid={`extra-${x.k}-input`} type="number" min="0" name={`extra_${x.k}`} defaultValue="0" onChange={change}/></label>)}
          </div>
        </details>

        <details className="form-details"><summary>İndirim</summary>
          <div className="form-grid">
            <label>İndirim türü<select data-testid="discount-type-select" name="discount_type" onChange={change}>{DISCOUNT_TYPES.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}</select></label>
            <label>İndirim tutarı (₺)<input data-testid="discount-amount-input" type="number" min="0" name="discount_amount" defaultValue="0" onChange={change}/></label>
            <label>İndirim notu<input data-testid="discount-note-input" name="discount_note" placeholder="Örn. iki kardeş" onChange={change}/></label>
          </div>
        </details>

        <div className="fee-summary" data-testid="fee-summary">
          <div><span>Öğrenim ücreti</span><b>{money(Number(form.total_fee || 0))}</b></div>
          <div><span>+ Ekstra ücretler</span><b className="green">{money(extraSum)}</b></div>
          <div><span>− İndirim</span><b className="red">{money(Number(form.discount_amount || 0))}</b></div>
          <div className="summary-total"><span>NET TOPLAM</span><b data-testid="effective-total">{money(effective)}</b></div>
        </div>

        <CameraCapture photo={photo} setPhoto={setPhoto} videoRef={videoRef}/>
      </>}
      {type === "payment" && <div className="form-grid"><label>Öğrenci<select data-testid="payment-student-select" required name="student_id" onChange={change}><option value="">Öğrenci seçin</option>{data.students.map(s=><option key={s.id} value={s.id}>{s.student_name}</option>)}</select></label><label>Tutar (₺)<input data-testid="payment-amount-input" required type="number" name="amount" onChange={change}/></label><label>Ödeme yöntemi<select data-testid="payment-method-select" name="method" onChange={change}><option>Nakit</option><option>Çek</option><option>Kredi Kartı</option><option>Banka Transferi</option></select></label><label>Banka seçimi<input data-testid="payment-bank-input" name="bank" placeholder="Banka adı" onChange={change}/></label><label>Ödeme tarihi<input data-testid="payment-date-input" type="date" name="payment_date" value={form.payment_date} onChange={change}/></label><label>Açıklama<input data-testid="payment-note-input" name="note" placeholder="Örn. Mart taksiti" onChange={change}/></label></div>}
      {type === "class" && <div className="form-grid"><label>Sınıf adı<input data-testid="class-name-input" required name="name" onChange={change}/></label><label>Seviye<input data-testid="class-level-input" name="level" onChange={change}/></label><label>Derslik<input data-testid="class-room-input" name="room" onChange={change}/></label><label>Kontenjan<input data-testid="class-capacity-input" type="number" name="capacity" defaultValue="20" onChange={change}/></label><label>Öğretmen<input data-testid="class-teacher-input" name="teacher" onChange={change}/></label></div>}
            {error && <div data-testid="modal-error" className="modal-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <Button testid="modal-cancel" secondary onClick={close} type="button">
              Vazgeç
            </Button>
            <Button testid="modal-submit" type="submit">
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CameraCapture({ photo, setPhoto, videoRef: externalRef }) {
  const localRef = useRef(null);
  const videoRef = externalRef || localRef;
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [streamError, setStreamError] = useState("");
  const fileInputRef = useRef(null);

  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const startStream = async (mode = facingMode) => {
    stopStream();
    setStreamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setStreamError("Kamera açılamadı. Tarayıcı izinlerini kontrol edin veya galeriden seçin.");
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startStream(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
    const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
    const startX = ((video.videoWidth || 320) - size) / 2;
    const startY = ((video.videoHeight || 320) - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 320, 320);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    stopStream();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target.result);
      stopStream();
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div className="camera-box">
      <div className="camera-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span><Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Öğrenci Fotoğrafı</span>
        {photo && <button type="button" className="small-btn danger" onClick={() => { setPhoto(""); startStream(); }}>Sil / Yeniden Çek</button>}
      </div>

      {photo ? (
        <div className="photo-preview-wrap">
          <img src={photo} alt="Öğrenci Vesikalık" className="captured-avatar" />
          <span className="muted-cell" style={{ fontSize: 11 }}>Vesikalık fotoğraf başarıyla kaydedildi ✓</span>
        </div>
      ) : (
        <div className="live-camera-wrap">
          {isStreaming ? (
            <div className="video-container">
              <video ref={videoRef} autoPlay playsInline muted className="live-video" />
              <div className="avatar-frame-overlay" />
            </div>
          ) : (
            <div className="camera-placeholder" onClick={() => startStream()}>
              <Camera size={28} />
              <span>Fotoğraf çekmek için kamerayı açın</span>
            </div>
          )}

          {streamError && <div className="modal-error" style={{ fontSize: 11 }}>{streamError}</div>}

          <div className="camera-btn-group">
            {!isStreaming ? (
              <button type="button" data-testid="start-camera-button" className="small-btn" onClick={() => startStream()}>
                <Camera size={13} style={{ display: "inline", marginRight: 4 }} /> Kamerayı Aç
              </button>
            ) : (
              <>
                <button type="button" data-testid="capture-photo-button" className="btn" style={{ height: 32, fontSize: 12, padding: "0 12px" }} onClick={capturePhoto}>
                  📸 Çek
                </button>
                <button type="button" className="small-btn" onClick={toggleCamera} title="Ön/Arka Kamera">
                  🔄 Çevir
                </button>
                <button type="button" className="small-btn" onClick={stopStream}>
                  Kapat
                </button>
              </>
            )}

            <button type="button" className="small-btn" onClick={() => fileInputRef.current?.click()}>
              📁 Galeriden / Dosyadan Seç
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
