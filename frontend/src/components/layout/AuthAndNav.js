import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./login.css";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  FileText,
  FileDown,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
  X
} from "lucide-react";

export const LOGO = "/assets/logo.jpeg";
export const ROLE_LABEL = { admin: "Yönetici", muhasebe: "Muhasebe", ogretmen: "Öğretmen" };

export const isAllowedBackendUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) return true;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (host === "inegol-cozum-kurs.pages.dev" || host.endsWith(".inegol-cozum-kurs.pages.dev")) return true;
    if (host === "inegolcozumkurs.com" || host.endsWith(".inegolcozumkurs.com")) return true;
    return false;
  } catch {
    return false;
  }
};

export const getBackendBaseUrl = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryApi = params.get("api");
    if (queryApi) {
      const clean = queryApi.replace(/\/+$/, "");
      if (isAllowedBackendUrl(clean)) {
        localStorage.setItem("custom_api_url", clean);
        return clean;
      } else {
        console.warn("[Security] Unauthorized custom api url rejected:", queryApi);
        localStorage.removeItem("custom_api_url");
      }
    }
    const saved = localStorage.getItem("custom_api_url");
    if (saved && !saved.includes("loca.lt")) {
      if (isAllowedBackendUrl(saved)) {
        return saved;
      } else {
        localStorage.removeItem("custom_api_url");
      }
    }
  }
  if (process.env.REACT_APP_BACKEND_URL && !process.env.REACT_APP_BACKEND_URL.includes("localhost")) {
    const envUrl = process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, "");
    if (isAllowedBackendUrl(envUrl)) return envUrl;
  }
  return "";
};

export const API = `${getBackendBaseUrl()}/api`;

export function Brand({ tight = false }) {
  return (
    <div className={tight ? "brand tight" : "brand"}>
      <img className="brand-logo" src={LOGO} alt="İnegöl Çözüm Kurs" />
      <div>
        <strong>İNEGÖL ÇÖZÜM</strong>
        <span>KURS YÖNETİM</span>
      </div>
    </div>
  );
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export function AuthCallback({ API: apiProp }) {
  const apiBase = apiProp || API;
  const processed = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    if (!sessionId) {
      window.location.replace("/");
      return;
    }
    (async () => {
      try {
        await axios.post(`${apiBase}/auth/session`, null, { headers: { "X-Session-ID": sessionId } });
        window.history.replaceState(null, "", "/");
        window.location.replace("/");
      } catch (e) {
        const detail = e.response?.data?.detail || "Giriş doğrulanamadı. Lütfen tekrar deneyin.";
        setError(detail);
        setTimeout(() => {
          window.history.replaceState(null, "", "/");
        }, 400);
      }
    })();
  }, [apiBase]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <Brand tight />
        <h1>{error ? "Erişim reddedildi" : "Giriş yapılıyor..."}</h1>
        <p>{error || "Google hesabınız doğrulanıyor, lütfen bekleyin."}</p>
        {error && (
          <a data-testid="auth-error-back" className="google-btn" href="/">
            Giriş ekranına dön
          </a>
        )}
      </div>
    </div>
  );
}

export function Login({ onLoginSuccess, API: apiProp }) {
  const apiBase = apiProp || API;
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordVisible,setPasswordVisible]=useState(false);

  const handleAdminLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!adminPassword || !adminPassword.trim()) {
      setQuickError("Lütfen yönetici parolasını giriniz.");
      return;
    }
    setQuickLoading(true);
    setQuickError("");
    try {
      const res = await axios.post(`${apiBase}/auth/quick-login`, { role: "admin", password: adminPassword.trim() });
      if (res.data?.session_token) {
        localStorage.setItem("session_token", res.data.session_token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.session_token}`;
      }
      if (onLoginSuccess) {
        const userObj = res.data?.user ? { ...res.data, ...res.data.user } : res.data;
        onLoginSuccess(userObj);
      }
    } catch (e) {
      setQuickError(e.response?.data?.detail || e.response?.data?.error || "Giriş başarısız oldu. Lütfen parolanızı kontrol edin.");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <main className="course-login">
      <section className="course-login-story" aria-label="İnegöl Çözüm Kurs">
        <p className="course-login-eyebrow">OPTİK OKUMA · DENEME ANALİZİ</p>
        <svg width="0" height="0" aria-hidden="true"><filter id="brand-white-cutout" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 3 0"/></filter></svg>
        <img className="course-login-logo" src={LOGO} alt="İnegöl Çözüm Kurs — Problem Yok, Çözüm Var!"/>
        <div className="course-login-message"><h1>Optikten karneye, <em>tek tıkla</em> sonuç.</h1><p>FMT şablonlarıyla okuma, standart sapmalı deneme puanı, şube ve soru bazlı analiz.</p></div>
      </section>
      <section className="course-login-entry" aria-labelledby="login-title">
        <form className="course-login-form" onSubmit={handleAdminLogin}>
          <div className="course-login-lock"><LockKeyhole size={21} aria-hidden="true"/></div>
          <h2 id="login-title">Yönetici Girişi</h2>
          <p>Yalnızca kurum yetkilileri erişebilir.</p>
          <label htmlFor="admin-password">Şifre</label>
          <div className="course-login-password"><input id="admin-password" type={passwordVisible?'text':'password'} autoComplete="current-password" required data-testid="admin-password-input" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="••••••••" aria-describedby={quickError?'login-error':undefined} aria-invalid={!!quickError}/><button type="button" aria-label={passwordVisible?'Şifreyi gizle':'Şifreyi göster'} onClick={()=>setPasswordVisible(!passwordVisible)}>{passwordVisible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>
          {quickError&&<div id="login-error" className="course-login-error" role="alert">{quickError}</div>}
          <button className="course-login-submit" type="submit" data-testid="quick-login-admin" disabled={quickLoading||!adminPassword.trim()}>{quickLoading?'Giriş yapılıyor…':'Giriş Yap'}</button>
          <span className="course-login-secure"><ShieldCheck size={13} aria-hidden="true"/> Kurum yönetim sistemi</span>
        </form>
      </section>
    </main>
  );
}

export function PwaBanner() {
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
        <button className="btn pwa-install-btn" onClick={install}>
          Yükle
        </button>
        <button className="pwa-close-btn" onClick={() => setDismissed(true)}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function MobileBottomNav({ page, setPage, menuOpen=false }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobil gezinme" inert={menuOpen || undefined}>
      <button className={`nav-btn ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
        <LayoutDashboard size={20} />
        <span>Genel Bakış</span>
      </button>
      <button className={`nav-btn ${page === "documents" ? "active" : ""}`} onClick={() => setPage("documents")}>
        <FileText size={20} />
        <span>Sözleşmeler</span>
      </button>
      <button className={`nav-btn ${page === "reports" ? "active" : ""}`} onClick={() => setPage("reports")}>
        <FileDown size={20} />
        <span>Raporlar</span>
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
