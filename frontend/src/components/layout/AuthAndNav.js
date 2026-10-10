import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Award,
  CalendarCheck,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
  X
} from "lucide-react";

export const LOGO = "/assets/logo.jpeg";
export const ROLE_LABEL = { admin: "Yönetici", muhasebe: "Muhasebe", ogretmen: "Öğretmen" };

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
      const res = await axios.post(`${apiBase}/auth/quick-login`, { role, password: password.trim() });
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
        <p>
          Sadece yetkilendirilmiş <b>İnegöl Çözüm Kurs</b> personeli giriş yapabilir.
        </p>

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
                onClick={() => {
                  setActiveRole(null);
                  setRolePassword("");
                  setQuickError("");
                }}
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

            {quickError && (
              <div className="modal-error" style={{ marginBottom: "12px", fontSize: "12px" }}>
                {quickError}
              </div>
            )}

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
                onClick={() => {
                  setActiveRole(null);
                  setRolePassword("");
                  setQuickError("");
                }}
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
              onClick={() => {
                setActiveRole("admin");
                setRolePassword("");
                setQuickError("");
              }}
            >
              👑 Yönetici Olarak Hızlı Giriş (Admin)
            </button>
            <button
              data-testid="quick-login-muhasebe"
              className="btn secondary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={quickLoading}
              onClick={() => {
                setActiveRole("muhasebe");
                setRolePassword("");
                setQuickError("");
              }}
            >
              💼 Muhasebe Olarak Hızlı Giriş
            </button>
            <button
              data-testid="quick-login-ogretmen"
              className="btn secondary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={quickLoading}
              onClick={() => {
                setActiveRole("ogretmen");
                setRolePassword("");
                setQuickError("");
              }}
            >
              📚 Öğretmen Olarak Hızlı Giriş
            </button>
          </div>
        )}

        {quickError && !activeRole && (
          <div className="modal-error" style={{ marginBottom: "12px" }}>
            {quickError}
          </div>
        )}

        <div style={{ textAlign: "center", margin: "12px 0 10px", color: "var(--muted)", fontSize: "11px", fontWeight: "600" }}>
          VEYA BULUT GİRİŞİ
        </div>

        <button data-testid="google-login-button" className="google-btn" onClick={signIn}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google ile giriş yap
        </button>
        <div className="auth-foot">
          <ShieldCheck size={13} /> Yetkili personel dışı erişim engellenir
        </div>

        {typeof window !== "undefined" && window.location.search.includes("dev=1") && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed var(--border)", fontSize: "11px", color: "var(--muted)", textAlign: "center" }}>
            <details>
              <summary style={{ cursor: "pointer", userSelect: "none" }}>
                ⚙️ Sunucu API: <span style={{ color: "var(--primary)", fontWeight: "600" }}>{getBackendBaseUrl() || "Yerel (Varsayılan)"}</span>
              </summary>
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

export function MobileBottomNav({ page, setPage }) {
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
