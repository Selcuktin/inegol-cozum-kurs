// Storage cache-busting & purge utilities for web & PWA
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
