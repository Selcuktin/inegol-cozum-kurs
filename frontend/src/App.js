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
  Building,
  RefreshCw
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
import { DashboardPage } from "./pages/DashboardPage";
import { StudentsPage } from "./pages/StudentsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { AccountingPage } from "./pages/AccountingPage";
import { AcademicPage } from "./pages/AcademicPage";
import { ExamOpticalPage } from "./pages/ExamOpticalPage";
import { Classes, EditClassModal } from "./components/Classes";
import { PaymentTable } from "./components/PaymentTable";

export { AuthGuard, can, CAN };
export { DashboardPage, DashboardPage as Dashboard };
export { StudentsPage, ContractsPage, AccountingPage, AcademicPage, ExamOpticalPage };
export { Classes, EditClassModal, PaymentTable };

// Client storage cache-busting & refresh across all devices
export const CLIENT_STORAGE_VERSION = "cozum_v7_20261010_device_site_data_purge";

export async function purgeClientStorage(preserveAuth = true) {
  if (typeof window === "undefined") return;
  try {
    console.log("[App] Purging all on-device site data and cache, upgraded to:", CLIENT_STORAGE_VERSION);

    // Save auth token & custom API URL if requested
    const token = preserveAuth ? localStorage.getItem("session_token") : null;
    const customApi = preserveAuth ? localStorage.getItem("custom_api_url") : null;

    // 1. Clear all localStorage completely (no restoring stale tombstones or overrides)
    localStorage.clear();

    // 2. Clear all sessionStorage completely
    sessionStorage.clear();

    // Restore ONLY authentication credentials if requested
    if (preserveAuth) {
      if (token) localStorage.setItem("session_token", token);
      if (customApi) localStorage.setItem("custom_api_url", customApi);
    }
    localStorage.setItem("cozum_app_version", CLIENT_STORAGE_VERSION);

    // 3. Clear all IndexedDB databases
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

    // 4. Clear CacheStorage API (caches)
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all((names || []).map((name) => caches.delete(name)));
      } catch (e) {
        console.warn("[App] CacheStorage purge error:", e);
      }
    }

    // 5. Unregister all Service Workers
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

    // 6. Clear client cookies across all domain / subdomain combinations
    try {
      const cookies = document.cookie.split(";");
      const host = window.location.hostname || "";
      const domains = ["", host, `.${host}`];
      if (host.includes(".")) {
        const parts = host.split(".");
        if (parts.length >= 2) {
          domains.push(`.${parts.slice(-2).join(".")}`);
        }
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
}

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
if (typeof window !== "undefined") window.__API_BASE__ = API;
axios.defaults.withCredentials = true;
axios.defaults.headers.common["Bypass-Tunnel-Reminder"] = "true";
const money = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);
const LOGO = "/assets/logo.jpeg";

const ROLE_LABEL = { admin: "Yönetici", muhasebe: "Muhasebe", ogretmen: "Öğretmen" };
// CAN and can imported from ./pages/AuthGuard

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
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlToken = sp.get("token");
      if (urlToken) {
        localStorage.setItem("session_token", urlToken);
      }
    }
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
  const [data, setData] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("cozum_dashboard_data_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
            return parsed;
          }
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
      window.location.hash = p;
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

  // Edesis Tree Navigation & Module States
  const [kayitTab, setKayitTab] = useState("kokpit");
  const [accountingTab, setAccountingTab] = useState(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hash.replace(/^#/, "");
      if (h === "vade") return "gecikenler";
      if (h === "tahsilat") return "tahsilatlar";
      if (h === "kasalar" || h === "kasa") return "kasalar";
      if (h === "backup") return "backup";
    }
    return "dashboard";
  });
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


  const load = async () => {
    try {
      const r = await axios.get(`${API}/dashboard`);
      const rawStudents = r.data?.students || [];
      const cleanStudents = StudentService.filterActiveStudents(rawStudents);
      const nextData = {
        ...r.data,
        students: cleanStudents
      };
      setData(nextData);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("cozum_dashboard_data_v1", JSON.stringify(nextData));
        }
      } catch (e) {}
    } catch (e) {
      console.warn("[App] load error:", e);
    }
  };
  useEffect(() => {
    load();
    const handleUpdate = () => { load(); };
    window.addEventListener("cozum_students_updated", handleUpdate);
    return () => window.removeEventListener("cozum_students_updated", handleUpdate);
  }, []);
  const filtered = useMemo(() => (data.students || []).filter(s => trIncludes(`${s.student_name} ${s.parent_name} ${s.student_phone}`, search)), [data.students, search]);
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
      title: "",
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
                { id: "g_vade", label: "Vade Takvimi", activeCheck: () => page === "vade" || (page === "payments" && accountingTab === "gecikenler"), onClick: () => { setPage("vade"); setMobileOpen(false); } },
                { id: "g_tahs", label: "Tahsilat Listesi", activeCheck: () => page === "tahsilat" || (page === "payments" && accountingTab === "tahsilatlar"), onClick: () => { setPage("tahsilat"); setMobileOpen(false); } },
                { id: "g_senet", label: "Fatura Planı", activeCheck: () => page === "payments" && accountingTab === "senetler", onClick: () => { setAccountingTab("senetler"); setPage("payments"); setMobileOpen(false); } },
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
            ...(ENABLE_KASA_BANKA ? [{
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
            }] : [])
          ]
        }
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
        { id: "reports", label: "Aylık Muhasebe Raporu", icon: FileDown, perm: "page_reports" },
        { id: "reminders", label: "Taksit Takibi & Risk", icon: BellRing, perm: "page_reminders" },
        { id: "users", label: "Kullanıcılar & Roller", icon: UserCog, perm: "page_users" },
        { id: "audit", label: "Denetim Kaydı", icon: History, perm: "page_audit" },
        {
          id: "backup",
          label: "Otomatik Yedekleme (20:00)",
          icon: ShieldCheck,
          perm: "page_payments",
          activeCheck: () => page === "payments" && accountingTab === "backup",
          customAction: () => {
            setPage("payments");
            setAccountingTab("backup");
          }
        }
      ]
    }
  ];

  const [quickOpen, setQuickOpen] = useState(false);
  useEffect(() => {
    if (!quickOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest || !e.target.closest(".edesis-quick-actions-wrapper")) {
        setQuickOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [quickOpen]);
  const guardedOpen = (type) => setModal(type);

  return <div className="app-shell">
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
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Menüyü kapat"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="side-caption">EDESİS ERP SİSTEMİ</div>
      <nav aria-label="Modül Gezintisi">
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
                const isItemActive = item.activeCheck ? item.activeCheck() : page === item.id;
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
          <RefreshCw size={17} />
          <span>Önbelleği Temizle</span>
        </button>
        <button data-testid="nav-logout" className="nav-item" onClick={onLogout}><LogOut size={18}/><span>Çıkış yap</span></button>
        <div className="profile">
          {me?.picture ? <img className="avatar" src={me.picture} alt="" /> : <div className="avatar">{(me?.name || "İÇ").slice(0,2).toUpperCase()}</div>}
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
              onClick={(e) => {
                e.stopPropagation();
                setQuickOpen((prev) => !prev);
              }}
              title="Hızlı İşlemler Menüsü"
              aria-label="Hızlı işlemler menüsü"
              aria-haspopup="true"
              aria-expanded={quickOpen}
            >
              <Zap size={14} aria-hidden="true" />
              <span>Hızlı İşlemler</span>
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
        <div className="top-search"><Search size={17} aria-hidden="true" /><input data-testid="global-search-input" role="searchbox" aria-label="Genel arama: öğrenci, veli veya telefon ara" placeholder="Öğrenci, veli veya telefon ara..." value={search} onChange={e => { setSearch(e.target.value); if (can(me,"page_students")) setPage("students"); }} /></div>
        <div className="top-actions">
          <span className="today-label">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
          <button data-testid="notifications-button" className="icon-btn" aria-label="Bildirimler"><Bell size={18} aria-hidden="true" /><i aria-hidden="true" /></button>
          <div className="user-mini">
            {me?.picture ? <img className="avatar" src={me.picture} alt="" /> : <div className="avatar">{(me?.name || "İÇ").slice(0,2).toUpperCase()}</div>}
            <span data-testid="user-name">{me?.name || "Yönetici"}</span>
            <span data-testid="user-role-pill" className={`role-pill role-${me?.role}`}>{ROLE_LABEL[me?.role] || me?.role_label}</span>
            <button data-testid="logout-button" className="icon-btn" title="Çıkış yap" aria-label="Oturumu kapat ve güvenli çıkış yap" onClick={onLogout}><LogOut size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </header>
      <main id="main-content" role="main" tabIndex="-1" className={`content ${page === "students" || page === "documents" ? "content-fullwidth" : ""}`}>
        {page === "dashboard" && (
          <DashboardPage
            me={me}
            data={data}
            totalCollected={totalCollected}
            totalExpected={totalExpected}
            totalExpenses={totalExpenses}
            onOpen={guardedOpen}
            onNavigate={setPage}
            onSelect={setSelected}
          />
        )}
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
        {page === "exams" && (
          <ExamOpticalPage
            me={me}
            API={API}
            students={data.students || []}
            classes={data.classes || []}
            showOptikModal={showGlobalOptikModal}
            onCloseOptikModal={() => setShowGlobalOptikModal(false)}
            showKarneModal={showGlobalKarne}
            onCloseKarneModal={() => setShowGlobalKarne(null)}
          />
        )}
        {page === "attendance" && (
          <AcademicPage
            me={me}
            mode="attendance"
            classes={data.classes || []}
            students={data.students || []}
            teachers={data.teachers || []}
            API={API}
            reload={load}
            guardedOpen={guardedOpen}
            setSelected={setSelected}
            onNavigate={setPage}
          />
        )}
        {page === "schedules" && (
          <AcademicPage
            me={me}
            mode="schedules"
            classes={data.classes || []}
            students={data.students || []}
            teachers={data.teachers || []}
            API={API}
            reload={load}
            guardedOpen={guardedOpen}
            setSelected={setSelected}
            onNavigate={setPage}
          />
        )}
        {page === "students" && (
          <StudentsPage
            me={me}
            API={API}
            search={search}
            setSearch={setSearch}
            students={data.students || []}
            guardedOpen={guardedOpen}
            setSelected={setSelected}
            setPage={setPage}
            setShowGlobalKarne={setShowGlobalKarne}
          />
        )}
        {page === "payments" && (
          <AccountingPage
            me={me}
            data={data}
            onOpen={guardedOpen}
            onSelectStudent={setSelected}
            API={API}
            reload={load}
            activeTab={accountingTab}
            onTabChange={setAccountingTab}
            onNavigate={setPage}
          />
        )}
        {page === "vade" && (
          <AccountingPage
            me={me}
            data={data}
            onOpen={guardedOpen}
            onSelectStudent={setSelected}
            API={API}
            reload={load}
            activeTab="gecikenler"
            onTabChange={setAccountingTab}
            onNavigate={setPage}
          />
        )}
        {page === "tahsilat" && (
          <AccountingPage
            me={me}
            data={data}
            onOpen={guardedOpen}
            onSelectStudent={setSelected}
            API={API}
            reload={load}
            activeTab="tahsilatlar"
            onTabChange={setAccountingTab}
            onNavigate={setPage}
          />
        )}
        {page === "gelir" && (
          <AccountingPage
            me={me}
            data={data}
            onOpen={guardedOpen}
            onSelectStudent={setSelected}
            API={API}
            reload={load}
            activeTab="gelirler"
            onTabChange={setAccountingTab}
            onNavigate={setPage}
          />
        )}
        {page === "classes" && (
          <AcademicPage
            me={me}
            mode="classes"
            classes={data.classes || []}
            students={data.students || []}
            teachers={data.teachers || []}
            API={API}
            reload={load}
            guardedOpen={guardedOpen}
            setSelected={setSelected}
            onNavigate={setPage}
          />
        )}
        {page === "teachers" && (
          <AcademicPage
            me={me}
            mode="teachers"
            classes={data.classes || []}
            students={data.students || []}
            teachers={data.teachers || []}
            API={API}
            reload={load}
            guardedOpen={guardedOpen}
            setSelected={setSelected}
            onNavigate={setPage}
          />
        )}
        {page === "documents" && (
          <ContractsPage
            me={me}
            contracts={data.contracts || []}
            students={data.students || []}
            payments={data.payments || []}
            onNavigate={setPage}
          />
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
    {modal && modal !== "student" && (
      <Modal type={modal} selected={selected} data={data} close={() => setModal(null)} reload={load} />
    )}
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

export { PageHead, Button, Stat } from "./pages/DashboardPage";

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

// Legacy monolithic subviews extracted to modular src/pages/ and src/components/

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

function StudentProfileModal({ student, onClose, me, API, data = {}, onEditStudent, onOpenPayment, onNavigate, onOpenGelir }) {
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
              onClick={() => {
                if (onOpenGelir) onOpenGelir(s);
                else setShowGelirModal(true);
              }}
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
                    onClick={() => {
                      if (onOpenGelir) onOpenGelir(s);
                      else setShowGelirModal(true);
                    }} 
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
                  <td className="muted-cell">{formatTrtDateTime(l.created_at)}</td>
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
                  <span className="card-subtext">{formatTrtDateTime(l.created_at)}</span>
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
          parent_name: form.parent_name?.trim() || form.mother_name?.trim() || form.guardian_name?.trim() || "Belirtilmedi",
          total_fee: Number(form.total_fee || 0),
          installment_count: Number(form.installment_count || 1),
          discount_amount: Number(form.discount_amount || 0),
          extra_fees: EXTRA_KEYS.reduce((o, x) => ({...o, [x.k]: Number(form[`extra_${x.k}`] || 0)}), {}),
          photo,
        };
        EXTRA_KEYS.forEach(x => delete payload[`extra_${x.k}`]);
        const res = await axios.post(`${API}/students`, payload);
        const saved = res.data || {};
        try {
          const cRes = AccountingService.addNewIncome({
            ogrenciAdi: payload.student_name,
            veliAdi: payload.parent_name,
            sinifAdi: payload.student_class || "Genel",
            brutTutar: effective || payload.total_fee || 75000,
            taksitSayisi: payload.installment_count || 1,
            vadeTarihi: payload.due_date || new Date().toISOString().slice(0, 10),
            aciklama: "Kayıt Sözleşmesi",
            sozlesmeNo: saved.sozlesme_no || saved.sozlesmeNo
          });
          const finalSt = {
            ...saved,
            ...payload,
            has_contract: true,
            sozlesme_no: saved.sozlesme_no || cRes?.contract?.sozlesmeNo || ""
          };
          AccountingService.unTombstone(finalSt.student_name, finalSt.sozlesme_no, finalSt.id);
          StudentService.saveStudent(finalSt);
        } catch (accErr) {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cozum_accounting_updated"));
          window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: { action: "save", student: { ...saved, ...payload } } }));
        }
      }
      if (type === "payment") {
        await axios.post(`${API}/payments`, {...form, student_id: form.student_id, amount: Number(form.amount)});
        const st = (data.students || []).find(s => s.id === form.student_id);
        AccountingService.recordCollection({
          studentId: form.student_id,
          studentName: st?.student_name || "Öğrenci",
          amount: Number(form.amount),
          method: form.method || "Nakit",
          bank: form.bank || "Nakit Ana Kasa",
          note: form.note || "Taksit Tahsilatı",
          gelirKodu: st?.gelir_kodu,
          sozlesmeNo: st?.sozlesme_no
        });
      }
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
          <label>Ad soyad<input data-testid="parent-name-input" name="parent_name" onChange={change}/></label>
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
