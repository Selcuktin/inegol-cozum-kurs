import reportFont from "./assets/reportFont.js";
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

// Forms carry the fields they originally displayed. Compare those, then guard the write atomically.
export function expectedRecordError(expected,fields,visible){
  if(expected!==undefined && (!expected||typeof expected!=='object'||Array.isArray(expected)||Object.keys(expected).some(k=>!fields.includes(k))))return errorResponse('Geçersiz kayıt sürümü',422,'VALIDATION_ERROR');
  const canonical=value=>{
    if(typeof value==='string'&&/^[{[]/.test(value)){try{return canonical(JSON.parse(value));}catch{}}
    if(value&&typeof value==='object')return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])));
    return value==null?'':String(value);
  };
  if(expected&&Object.keys(expected).some(k=>canonical(expected[k])!==canonical(visible[k])))return errorResponse('Bu kayıt başka bir işlemde değişti. Yeniden açıp güncel kayıt üzerinden düzenleyin.',409,'RECORD_CHANGED');
  return null;
}

export function recordWriteGuard(db,table,row,expected,fields,visible=row,key={id:row?.id}){
  const error=expectedRecordError(expected,fields,visible);
  if(error)return {error};
  const keys=expected?Object.keys(expected):fields.filter(k=>k in (row||{}));
  const where=Object.keys(key).map(k=>`"${k}" IS ?`).join(' AND ');
  return {statement:db.prepare(`SELECT CASE WHEN ${row?'':'NOT '}EXISTS(SELECT 1 FROM ${table} WHERE ${where} ${row?keys.map(k=>`AND "${k}" IS ?`).join(' '):''}) THEN 1 ELSE json_extract('{}','RECORD_CHANGED') END`).bind(...Object.values(key),...(row?keys.map(k=>row[k]??null):[]))};
}

// Guard the complete previously read list in one query, including rows that did not exist.
export function recordBatchGuard(db,table,records,keyFields,fields){
  const join=keyFields.map(k=>`a."${k}" IS json_extract(e.value,'$.${k}')`).join(' AND ');
  const changed=['id',...fields].map(k=>`a."${k}" IS NOT json_extract(e.value,'$._before.${k}')`).join(' OR ');
  return db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) e LEFT JOIN ${table} a ON ${join} WHERE ${changed}) THEN 1 ELSE json_extract('{}','RECORD_CHANGED') END`).bind(JSON.stringify(records));
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
    donem_id: s.donem_id || ({"2026-2027":113,"2025-2026":40,"2026-2027-YAZ":142}[prog] ?? null),
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
  // ponytail: static Latin/Turkish font subset; other scripts require expanding the subset.
  const clean = value => String(value ?? "").normalize('NFC').replace(/[\r\n\t]+/g, " ");
  const encoded = value => [...clean(value)].map(c=>reportFont.codes[c] || reportFont.codes['?']).join('');
  const money = value => `${Number(value || 0).toLocaleString("tr-TR", {minimumFractionDigits:2,maximumFractionDigits:2})} TL`;
  const lines = [
    'ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ', `${month} DÖNEMİ AYLIK MUHASEBE RAPORU`, '',
    `Toplam Tahsilat: ${money(collected)}`, `Toplam Giderler: ${money(expenses)}`,
    `Net Nakit Akışı: ${money(net)}`, `Kayıtlı Öğrenci: ${studentsCount}`,
    `Islem Sayilari: ${monthPayments.length} Tahsilat, ${monthExpenses.length} Gider`, '', 'TAHSİLATLAR'
  ];
  for (const p of monthPayments) lines.push(`${p.payment_date} | ${p.student_name || 'Ogrenci'} | ${p.method || ''} | ${money(p.amount)}`);
  if (!monthPayments.length) lines.push('Bu dönemde tahsilat kaydı bulunmamaktadır.');
  lines.push('', 'GİDERLER');
  for (const e of monthExpenses) lines.push(`${e.expense_date} | ${e.title || e.category || 'Gider'} | ${money(e.amount)}`);
  if (!monthExpenses.length) lines.push('Bu dönemde gider kaydı bulunmamaktadır.');
  const wrapped=lines.flatMap(line=>{
    const result=[];let text='',width=0;
    for(const c of clean(line)){
      const code=parseInt(reportFont.codes[c] || reportFont.codes['?'],16);
      const advance=reportFont.widths[code-reportFont.first]*9/1000;
      if(width+advance>515&&text){result.push(text);text='';width=0;}
      text+=c;width+=advance;
    }
    result.push(text);return result;
  });
  const pages = [];
  for (let i=0;i<wrapped.length;i+=48) pages.push(wrapped.slice(i,i+48));
  const d=reportFont.descriptor;
  const fontStream=reportFont.fontHex+'>';
  const objects = ['', '<< /Type /Catalog /Pages 2 0 R >>', '',
    `<< /Type /Font /Subtype /TrueType /BaseFont /${reportFont.name} /FirstChar ${reportFont.first} /LastChar ${reportFont.last} /Widths [${reportFont.widths.join(' ')}] /FontDescriptor 4 0 R /ToUnicode 6 0 R >>`,
    `<< /Type /FontDescriptor /FontName /${reportFont.name} /Ascent ${d['/Ascent']} /CapHeight ${d['/CapHeight']} /Descent ${d['/Descent']} /Flags ${d['/Flags']} /FontBBox ${d['/FontBBox']} /ItalicAngle 0 /StemV ${d['/StemV']} /FontFile2 5 0 R >>`,
    `<< /Length ${fontStream.length} /Length1 ${reportFont.length1} /Filter [/ASCIIHexDecode /FlateDecode] >>\nstream\n${fontStream}\nendstream`,
    `<< /Length ${reportFont.cmap.length} >>\nstream\n${reportFont.cmap}\nendstream`
  ];
  const pageIds=[];
  pages.forEach((page,index) => {
    const id=objects.length;pageIds.push(id);
    const content=['BT','/F1 9 Tf','40 795 Td','14 TL',...page.flatMap(line=>[`<${encoded(line)}> Tj`,'T*']),`<${encoded(`Sayfa ${index+1} / ${pages.length}`)}> Tj`,'ET'].join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(let id=1;id<objects.length;id++){offsets.push(pdf.length);pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`;}
  const xref=pdf.length;
  pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');
  return pdf+`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
}
