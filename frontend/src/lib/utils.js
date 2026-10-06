import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
