import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export async function apiFetch(url, options = {}) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("session_token") : null;
  const response = await globalThis.fetch(url, { credentials: "include", ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.detail || body.error || `İşlem başarısız (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes text for Turkish-aware, diacritic-insensitive, case-insensitive search.
 * Correctly handles:
 * - Turkish dotted/dotless I/i: İ/i and I/ı
 * - Diacritic variations: ç/c, ğ/g, ö/o, ş/s, ü/u, ı/i
 * - Unicode combining diacritics (\u0307 etc.)
 */
export function normalizeTr(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

/**
 * Checks if haystack contains needle using Turkish-normalized comparison.
 */
export function trIncludes(haystack, needle) {
  if (!needle || !String(needle).trim()) return true;
  if (haystack === null || haystack === undefined) return false;
  return normalizeTr(haystack).includes(normalizeTr(needle));
}

/**
 * Formats any UTC or SQLite timestamp to exact Turkey Time (TRT, Europe/Istanbul, UTC+3).
 * Corrects SQLite's space-separated UTC timestamps (e.g. "2026-10-09 14:11:21" -> "09.10.2026 17:11:21").
 */
export function formatTrtDateTime(dateVal) {
  if (!dateVal) return "-";
  let s = String(dateVal).trim();
  if (/^\d{10,13}$/.test(s)) {
    const num = Number(s);
    return new Date(num < 1e11 ? num * 1000 : num).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + "Z";
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s + "Z";
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function isAllowedBackendUrl(urlStr) {
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
}

export function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
