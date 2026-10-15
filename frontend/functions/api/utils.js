// Cloudflare Pages Functions - Shared Utilities, Constants & Auth Helpers

export const ROLE_ADMIN = "admin";
export const ROLE_ACCOUNTING = "muhasebe";
export const ROLE_TEACHER = "ogretmen";

import { normalizeDate } from "../../src/lib/installmentService.js";
export { normalizeDate };

export const ROLE_LABELS = {
  [ROLE_ADMIN]: "Yönetici",
  [ROLE_ACCOUNTING]: "Muhasebe",
  [ROLE_TEACHER]: "Öğretmen",
};

export function getCorsHeaders(request, env = null) {
  const origin = request?.headers?.get("Origin") || "";
  const customOrigin = env?.ALLOWED_ORIGIN || "";
  const isAllowed =
    origin === "https://inegol-cozum-kurs.pages.dev" ||
    (customOrigin && origin === customOrigin) ||
    /^https:\/\/[a-z0-9-]+\.inegol-cozum-kurs\.pages\.dev$/.test(origin) ||
    /^http:\/\/localhost:(3000|8788|8787|5173)$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:(3000|8788|8787|5173)$/.test(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://inegol-cozum-kurs.pages.dev",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID, X-Requested-With, Bypass-Tunnel-Reminder, X-Filename, X-Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://inegol-cozum-kurs.pages.dev",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function cachedJson(data, maxAge = 60, sMaxAge = 300, swr = 600, status = 200) {
  return json(data, status, {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    "Pragma": "public",
    "Expires": new Date(Date.now() + maxAge * 1000).toUTCString(),
  });
}

export function errorResponse(error, status = 400, code = "BAD_REQUEST", details = null) {
  return json(
    {
      ok: false,
      error: typeof error === "string" ? error : error?.message || "Bir hata oluştu",
      detail: typeof error === "string" ? error : error?.message || "Bir hata oluştu",
      code,
      ...(details ? { details } : {}),
    },
    status
  );
}

export function successResponse(data, status = 200, extra = {}) {
  return json(
    {
      ok: true,
      data,
      ...extra,
    },
    status
  );
}

export function parseCookies(request) {
  const cookieStr = request?.headers?.get("Cookie") || "";
  const cookies = {};
  cookieStr.split(";").forEach((pair) => {
    const [key, val] = pair.trim().split("=");
    if (key && val) cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

export async function getCurrentUser(request, db) {
  if (!db) return null;
  const cookies = parseCookies(request);
  let token = cookies["session_token"];
  if (!token) {
    const auth = request.headers?.get("Authorization") || "";
    if (auth.startsWith("Bearer ")) {
      token = auth.slice(7).trim();
    }
  }
  if (!token) return null;

  try {
    const session = await db
      .prepare("SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > datetime('now')")
      .bind(token)
      .first();

    if (!session) return null;

    const user = await db
      .prepare("SELECT * FROM users WHERE user_id = ?")
      .bind(session.user_id)
      .first();

    if (user) {
      user.role_label = ROLE_LABELS[user.role] || user.role;
    }
    return user;
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

export function requireRole(user, allowedRoles = [ROLE_ADMIN]) {
  if (!user) return errorResponse("Oturum açılmadı", 401, "UNAUTHORIZED");
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.role)) {
    return errorResponse("Bu işlem için yetkiniz yok", 403, "FORBIDDEN");
  }
  return null;
}

export function logAction(db, user, action, target_type = "", target_id = "", detail = "", waitUntil = null) {
  if (!db) return Promise.resolve();
  const task = (async () => {
    try {
      const id = "log_" + crypto.randomUUID().slice(0, 12);
      await db
        .prepare(
          "INSERT INTO audit_logs (id, user_id, user_name, user_email, user_role, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          id,
          user?.user_id || "",
          user?.name || "",
          user?.email || "",
          user?.role || "",
          action,
          target_type,
          target_id,
          detail,
          new Date().toISOString()
        )
        .run();
    } catch (err) {
      console.error("Audit log error:", err);
    }
  })();

  if (typeof waitUntil === "function") {
    waitUntil(task);
    return Promise.resolve();
  }
  return task;
}

export async function getNextSequence(db, seqName, prefix = "", padLength = 5, fallbackInitial = 1) {
  if (!db) return `${prefix}${Date.now().toString().slice(-padLength)}`;
  try {
    let res = await db.prepare(
      "UPDATE system_sequences SET current_val = current_val + 1, updated_at = datetime('now') WHERE name = ? RETURNING current_val"
    ).bind(seqName).first().catch(() => null);

    if (!res || res.current_val == null) {
      await db.prepare(
        "INSERT OR IGNORE INTO system_sequences (name, current_val, updated_at) VALUES (?, ?, datetime('now'))"
      ).bind(seqName, fallbackInitial).run().catch(() => {});

      res = await db.prepare(
        "UPDATE system_sequences SET current_val = current_val + 1, updated_at = datetime('now') WHERE name = ? RETURNING current_val"
      ).bind(seqName).first().catch(() => null);
    }

    let val = res?.current_val != null ? res.current_val : (fallbackInitial + 1);

    // Collision guard: Guarantee generated sequence is strictly higher than any existing record in DB
    const safeFirst = async (query) => {
      try {
        const stmt = db.prepare(query);
        if (typeof stmt?.first === "function") return await stmt.first();
        if (typeof stmt?.bind === "function") return await stmt.bind().first();
        return null;
      } catch {
        return null;
      }
    };

    if (seqName === "SZL_2026") {
      const maxRow = await safeFirst("SELECT MAX(CAST(SUBSTR(sozlesme_no, 8) AS INTEGER)) as max_val FROM contracts WHERE sozlesme_no LIKE 'SZL2026%'");
      if (maxRow?.max_val != null && val <= maxRow.max_val) {
        val = maxRow.max_val + 1;
        await db.prepare("UPDATE system_sequences SET current_val = ?, updated_at = datetime('now') WHERE name = ?").bind(val, seqName).run().catch(() => {});
      }
    } else if (seqName === "GLR_2026") {
      const maxRow = await safeFirst("SELECT MAX(CAST(SUBSTR(gelir_kodu, 8) AS INTEGER)) as max_val FROM student_incomes WHERE gelir_kodu LIKE 'GLR2026%'");
      if (maxRow?.max_val != null && val <= maxRow.max_val) {
        val = maxRow.max_val + 1;
        await db.prepare("UPDATE system_sequences SET current_val = ?, updated_at = datetime('now') WHERE name = ?").bind(val, seqName).run().catch(() => {});
      }
    }

    return prefix ? `${prefix}${String(val).padStart(padLength, "0")}` : val;
  } catch (err) {
    console.error(`[SequenceService] Error getting next sequence for ${seqName}:`, err);
    return `${prefix}${Date.now().toString().slice(-padLength)}`;
  }
}

export function getEffectiveTotalFee(student) {
  const base = Number(student?.total_fee) || 0;
  let extraSum = 0;
  try {
    const extras = typeof student?.extra_fees === "string" ? JSON.parse(student?.extra_fees || "{}") : (student?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(student?.discount_amount) || 0;
  return Math.max(0, base + extraSum - discount);
}

export function enrichStudent(s) {
  let prog = s.program || "2026-2027";
  let status = s.status || "Kesin Kayıt";
  let isKesin = false;

  if (prog === "2026-2027-YAZ") {
    status = "Yaz Kursu";
  } else if (prog === "2025-2026") {
    status = "Mezun / Geçmiş";
  } else {
    // Current period (2026-2027): 'Aktif', 'Kayitli' or 'Kesin Kayıt' all denote active registered students
    if (status === "Aktif" || status === "Kayitli" || status === "Kesin Kayıt" || !s.status) {
      status = "Kesin Kayıt";
      isKesin = true;
    }
  }

  const resolvedParentPhone =
    (s.parent_phone || "").trim() ||
    (s.primary_parent === "anne" ? (s.mother_phone || s.mother_work_phone || "") :
     s.primary_parent === "guardian" || s.primary_parent === "vasi" ? (s.guardian_phone || s.guardian_home_phone || s.guardian_work_phone || "") :
     (s.father_work_phone || s.father_phone || "")) ||
    (s.mother_phone || s.guardian_phone || s.father_phone || "").trim();

  return {
    ...s,
    parent_phone: resolvedParentPhone,
    program: prog,
    donem_id: s.donem_id || 113,
    donem_adi: s.donem_adi || prog,
    status: status,
    enrollment_status: status,
    is_kesin_kayit: isKesin,
    has_contract: Boolean(s.sozlesme_no || s.contract_id || s.signed_contract_path),
    remaining: Math.max(0, getEffectiveTotalFee(s) - (Number(s.paid_amount) || 0)),
  };
}

export function computeInstallmentPlan(student, payments) {
  const n = Math.max(1, parseInt(student.installment_count) || 1);
  const total = getEffectiveTotalFee(student);
  const per = Math.round((total / n) * 100) / 100;
  let paidRemaining = Number(student.paid_amount) || 0;

  let startYear = new Date().getFullYear();
  let startMonth = new Date().getMonth() + 1;
  let startDay = 15;
  if (student.due_date && student.due_date.length >= 10) {
    const parts = student.due_date.slice(0, 10).split("-");
    startYear = parseInt(parts[0]) || startYear;
    startMonth = parseInt(parts[1]) || startMonth;
    startDay = parseInt(parts[2]) || startDay;
  }

  const plan = [];
  for (let i = 0; i < n; i++) {
    let m = startMonth + i;
    let y = startYear + Math.floor((m - 1) / 12);
    m = ((m - 1) % 12) + 1;
    const dueStr = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(startDay, new Date(y, m, 0).getDate())).padStart(2, "0")}`;

    const installmentAmount = (i === n - 1) ? Math.max(0, Math.round((total - (per * (n - 1))) * 100) / 100) : per;
    const applied = Math.min(installmentAmount, paidRemaining);
    paidRemaining = Math.max(0, paidRemaining - installmentAmount);
    const remaining = Math.max(0, Math.round((installmentAmount - applied) * 100) / 100);
    const status = applied >= installmentAmount - 0.5 ? "paid" : applied > 0 ? "partial" : "pending";

    plan.push({
      no: i + 1,
      due_date: dueStr,
      amount: installmentAmount,
      paid: Math.round(applied * 100) / 100,
      remaining,
      status,
    });
  }
  return plan;
}

export function generateMonthlyPdf({ month, collected, expenses, net, monthPayments, monthExpenses, studentsCount }) {
  const cleanStr = (s) => String(s || "").replace(/[^\x20-\x7E]/g, "?").replace(/[()\\]/g, "");
  const formatMoney = (n) => `${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TL`;

  const lines = [
    "BT",
    "/F1 16 Tf",
    "50 780 Td",
    "(OZEL INEGOL COZUM KURS MERKEZI) Tj",
    "/F1 11 Tf",
    "0 -22 Td",
    `(${cleanStr(month)} DONEMI KURUMSAL AYLIK MUHASEBE RAPORU) Tj`,
    "/F1 8 Tf",
    "0 -14 Td",
    "(Kemalpasa Mah. Ilica Sk. No:31/33A Inegol / BURSA - Tel: 0224 715 00 02) Tj",
    "0 -16 Td",
    "(---------------------------------------------------------------------------------------------------------------) Tj",
    "/F1 10 Tf",
    "0 -20 Td",
    "(FINANSAL GENEL OZET) Tj",
    "/F1 9 Tf",
    "0 -16 Td",
    `(- Toplam Tahsilat: ${formatMoney(collected)}) Tj`,
    "0 -14 Td",
    `(- Toplam Giderler: ${formatMoney(expenses)}) Tj`,
    "0 -14 Td",
    `(- Net Kar / Durum: ${formatMoney(net)}) Tj`,
    "0 -14 Td",
    `(- Kayitli Aktif Ogrenci: ${studentsCount}) Tj`,
    "0 -14 Td",
    `(- Islem Sayilari: ${monthPayments.length} Tahsilat, ${monthExpenses.length} Gider) Tj`,
    "0 -20 Td",
    "(---------------------------------------------------------------------------------------------------------------) Tj",
    "/F1 10 Tf",
    "0 -18 Td",
    "(BU AYIN TAHSILAT HAREKETLERI (ILK 20 KAYIT)) Tj",
    "/F1 8 Tf"
  ];

  for (let i = 0; i < Math.min(20, monthPayments.length); i++) {
    const p = monthPayments[i];
    const sName = cleanStr(p.student_name || "Ogrenci");
    const pText = `${p.payment_date} | ${sName.slice(0, 22)} | ${cleanStr(p.method)} | ${formatMoney(p.amount)}`;
    lines.push("0 -13 Td");
    lines.push(`(${pText}) Tj`);
  }
  if (monthPayments.length === 0) {
    lines.push("0 -14 Td");
    lines.push("(Bu donemde tahsilat kaydi bulunmamaktadir.) Tj");
  }

  lines.push("0 -24 Td");
  lines.push("/F1 8 Tf");
  lines.push("(Inegol Cozum Kurs Yonetim Sistemi - Bulut Raporudur.) Tj");
  lines.push("ET");

  const streamContent = lines.join("\n");
  const streamLength = streamContent.length;

  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000325 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${420 + streamLength}
%%EOF`;
}
