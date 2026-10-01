// Cloudflare Pages Functions - Centralized API Router
// Powered by Cloudflare D1 (Database binding: DB)

const ROLE_ADMIN = "admin";
const ROLE_ACCOUNTING = "muhasebe";
const ROLE_TEACHER = "ogretmen";
const ROLE_LABELS = {
  [ROLE_ADMIN]: "Yönetici",
  [ROLE_ACCOUNTING]: "Muhasebe",
  [ROLE_TEACHER]: "Öğretmen",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID, X-Requested-With",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function parseCookies(request) {
  const cookieStr = request.headers.get("Cookie") || "";
  const cookies = {};
  cookieStr.split(";").forEach((pair) => {
    const [key, val] = pair.trim().split("=");
    if (key && val) cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

async function getCurrentUser(request, db) {
  const cookies = parseCookies(request);
  let token = cookies["session_token"];
  if (!token) {
    const auth = request.headers.get("Authorization") || "";
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

async function logAction(db, user, action, target_type = "", target_id = "", detail = "") {
  try {
    const id = "log_" + crypto.randomUUID().slice(0, 12);
    await db
      .prepare(
        "INSERT INTO audit_logs (id, user_id, user_name, user_email, user_role, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
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
        detail
      )
      .run();
  } catch (err) {
    console.error("Audit log error:", err);
  }
}


function getEffectiveTotalFee(student) {
  const base = Number(student?.total_fee) || 0;
  let extraSum = 0;
  try {
    const extras = typeof student?.extra_fees === "string" ? JSON.parse(student?.extra_fees || "{}") : (student?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(student?.discount_amount) || 0;
  return Math.max(0, base + extraSum - discount);
}

function generateMonthlyPdf({ month, collected, expenses, net, monthPayments, monthExpenses, studentsCount }) {
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
function computeInstallmentPlan(student, payments) {
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
    const dueStr = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(startDay, 28)).padStart(2, "0")}`;

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

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  // Remove /api prefix and trailing slashes
  let path = url.pathname.replace(/^\/api\/?/, "/");
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  try {
    // ---------------- AUTH ROUTES ----------------
    if (path === "/auth/quick-login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const role = body.role in ROLE_LABELS ? body.role : ROLE_ADMIN;
      const demoUsers = {
        [ROLE_ADMIN]: { email: "kayrasemihseymen@gmail.com", name: "Semih Seymen (Yönetici)" },
        [ROLE_ACCOUNTING]: { email: "info@inegolcozumkurs.com", name: "Muhasebe Sorumlusu" },
        [ROLE_TEACHER]: { email: "ogretmen@inegolcozumkurs.com", name: "Ayşe Kaya (Öğretmen)" },
      };
      const demo = demoUsers[role] || demoUsers[ROLE_ADMIN];

      let user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(demo.email).first();
      let userId;
      if (user) {
        userId = user.user_id;
        await db.prepare("UPDATE users SET name = ?, role = ? WHERE user_id = ?").bind(demo.name, role, userId).run();
      } else {
        userId = "user_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        await db
          .prepare("INSERT INTO users (user_id, email, name, picture, role, created_at) VALUES (?, ?, ?, '', ?, datetime('now'))")
          .bind(userId, demo.email, demo.name, role)
          .run();
      }

      const sessionToken = "session_" + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      await db
        .prepare("INSERT INTO user_sessions (session_token, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))")
        .bind(sessionToken, userId, expiresAt)
        .run();

      const userObj = {
        user_id: userId,
        email: demo.email,
        name: demo.name,
        picture: "",
        role,
        role_label: ROLE_LABELS[role],
        session_token: sessionToken,
      };

      await logAction(db, userObj, "auth.quick_login", "user", userId, `${demo.name} hızlı giriş yaptı`);

      return json(userObj, 200, {
        "Set-Cookie": `session_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
      });
    }

    if (path === "/auth/session" && request.method === "POST") {
      const sessionId = request.headers.get("X-Session-ID");
      if (!sessionId) return json({ detail: "X-Session-ID header gerekli" }, 400);

      const r = await fetch("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", {
        headers: { "X-Session-ID": sessionId },
      });
      if (!r.ok) return json({ detail: "Geçersiz session_id" }, 401);
      const data = await r.json();

      const email = (data.email || "").toLowerCase().trim();
      const role = email === "kayrasemihseymen@gmail.com" || email === "inegolcozumkurs@gmail.com" ? ROLE_ADMIN : ROLE_ACCOUNTING;
      const name = data.name || "Kullanıcı";
      const sessionToken = data.session_token || ("session_" + crypto.randomUUID().replace(/-/g, ""));

      let user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      let userId;
      if (user) {
        userId = user.user_id;
        await db.prepare("UPDATE users SET name = ?, picture = ? WHERE user_id = ?").bind(name, data.picture || "", userId).run();
      } else {
        userId = "user_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        await db
          .prepare("INSERT INTO users (user_id, email, name, picture, role, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
          .bind(userId, email, name, data.picture || "", role)
          .run();
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      await db
        .prepare("INSERT INTO user_sessions (session_token, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))")
        .bind(sessionToken, userId, expiresAt)
        .run();

      const userObj = {
        user_id: userId,
        email,
        name,
        picture: data.picture || "",
        role,
        role_label: ROLE_LABELS[role],
        session_token: sessionToken,
      };

      await logAction(db, userObj, "auth.login", "user", userId, `${name} giriş yaptı`);

      return json(userObj, 200, {
        "Set-Cookie": `session_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
      });
    }

    if (path === "/auth/me" && request.method === "GET") {
      const user = await getCurrentUser(request, db);
      if (!user) return json({ detail: "Yetkisiz" }, 401);
      return json(user);
    }

    if (path === "/auth/logout" && request.method === "POST") {
      const cookies = parseCookies(request);
      const token = cookies["session_token"];
      if (token) {
        await db.prepare("DELETE FROM user_sessions WHERE session_token = ?").bind(token).run();
      }
      return json({ ok: true }, 200, {
        "Set-Cookie": "session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      });
    }

    // ---------------- DASHBOARD ----------------
    if (path === "/dashboard" && request.method === "GET") {
      const studentsRes = await db.prepare("SELECT * FROM students ORDER BY student_name ASC").all();
      const paymentsRes = await db.prepare("SELECT * FROM payments ORDER BY payment_date DESC").all();
      const expensesRes = await db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
      const classesRes = await db.prepare("SELECT * FROM classes ORDER BY name ASC").all();

      const students = (studentsRes.results || []).map((s) => ({
        ...s,
        remaining: Math.max(0, getEffectiveTotalFee(s) - (Number(s.paid_amount) || 0)),
      }));

      const payments = paymentsRes.results || [];
      const expenses = expensesRes.results || [];
      const classes = classesRes.results || [];

      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthPayments = payments.filter((p) => String(p.payment_date).startsWith(currentMonth));
      const monthExpenses = expenses.filter((e) => String(e.expense_date).startsWith(currentMonth));

      const collected = monthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const expTotal = monthExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      return json({
        students,
        payments,
        expenses,
        classes,
        summary: {
          period: currentMonth,
          collected,
          expenses: expTotal,
        },
      });
    }

    // ---------------- STUDENTS ----------------
    if (path === "/students" && request.method === "GET") {
      const q = url.searchParams.get("q");
      let query = "SELECT * FROM students";
      const params = [];
      if (q) {
        query += " WHERE student_name LIKE ? OR parent_name LIKE ? OR student_phone LIKE ?";
        const term = `%${q}%`;
        params.push(term, term, term);
      }
      query += " ORDER BY student_name ASC";
      const res = await db.prepare(query).bind(...params).all();
      const students = (res.results || []).map((s) => ({
        ...s,
        remaining: Math.max(0, getEffectiveTotalFee(s) - (Number(s.paid_amount) || 0)),
      }));
      return json(students);
    }

    if (path === "/students" && request.method === "POST") {
      const user = await getCurrentUser(request, db);
      const s = await request.json();
      if (!s.student_name?.trim()) return json({ detail: "Öğrenci adı soyadı zorunludur" }, 422);
      if (!s.parent_name?.trim()) return json({ detail: "Veli adı soyadı zorunludur" }, 422);
      if (Number(s.total_fee) < 0) return json({ detail: "Öğrenim ücreti negatif olamaz" }, 422);
      const id = s.id || "student-" + crypto.randomUUID().slice(0, 8);

      await db
        .prepare(
          `INSERT INTO students (
          id, student_name, student_phone, school, student_class, student_tc, student_address,
          parent_name, parent_phone, parent_tc, parent_address,
          mother_tc, mother_name, mother_job, mother_phone, mother_work_phone, mother_address, mother_work_address, mother_email,
          father_job, father_work_phone, father_work_address, father_email,
          guardian_tc, guardian_name, guardian_job, guardian_phone, guardian_home_phone, guardian_work_phone, guardian_home_address, guardian_work_address, guardian_email,
          program, total_fee, extra_fees, discount_type, discount_amount, discount_note, paid_amount, installment_count, due_date, photo, created_at, created_by, created_by_name
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?
        )`
        )
        .bind(
          id,
          s.student_name || "",
          s.student_phone || "",
          s.school || "",
          s.student_class || "",
          s.student_tc || "",
          s.student_address || "",
          s.parent_name || "",
          s.parent_phone || "",
          s.parent_tc || "",
          s.parent_address || "",
          s.mother_tc || "",
          s.mother_name || "",
          s.mother_job || "",
          s.mother_phone || "",
          s.mother_work_phone || "",
          s.mother_address || "",
          s.mother_work_address || "",
          s.mother_email || "",
          s.father_job || "",
          s.father_work_phone || "",
          s.father_work_address || "",
          s.father_email || "",
          s.guardian_tc || "",
          s.guardian_name || "",
          s.guardian_job || "",
          s.guardian_phone || "",
          s.guardian_home_phone || "",
          s.guardian_work_phone || "",
          s.guardian_home_address || "",
          s.guardian_work_address || "",
          s.guardian_email || "",
          s.program || "",
          Number(s.total_fee) || 0,
          typeof s.extra_fees === "object" ? JSON.stringify(s.extra_fees) : s.extra_fees || "{}",
          s.discount_type || "",
          Number(s.discount_amount) || 0,
          s.discount_note || "",
          Number(s.paid_amount) || 0,
          parseInt(s.installment_count) || 1,
          s.due_date || "",
          s.photo || "",
          user?.user_id || "",
          user?.name || ""
        )
        .run();

      await logAction(db, user, "student.create", "student", id, `${s.student_name} kaydedildi`);
      const created = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();
      return json(created);
    }

    // Detail route: /students/:id/detail
    const detailMatch = path.match(/^\/students\/([^\/]+)\/detail$/);
    if (detailMatch && request.method === "GET") {
      const studentId = detailMatch[1];
      const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
      if (!student) return json({ detail: "Öğrenci bulunamadı" }, 404);

      student.remaining = Math.max(0, getEffectiveTotalFee(student) - (Number(student.paid_amount) || 0));
      const paymentsRes = await db
        .prepare("SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC")
        .bind(studentId)
        .all();
      const payments = paymentsRes.results || [];
      const plan = computeInstallmentPlan(student, payments);

      const hasContract = !!student.signed_contract_path;
      const studentDetail = {
        ...student,
        signed_contract_path: hasContract ? `/api/students/${student.id}/contract-file` : "",
        has_signed_contract: hasContract,
      };

      return json({
        student: studentDetail,
        payments,
        installment_plan: plan,
      });
    }

    // Contract Upload: /students/:id/contract-upload
    const uploadMatch = path.match(/^\/students\/([^\/]+)\/contract-upload$/);
    if (uploadMatch && request.method === "POST") {
      const user = await getCurrentUser(request, db);
      const studentId = uploadMatch[1];
      const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
      if (!student) return json({ detail: "Öğrenci bulunamadı" }, 404);

      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
        return json({ detail: "Dosya boyutu 10MB'dan büyük olamaz" }, 413);
      }

      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const filename = request.headers.get("X-Filename") || "sozlesme.pdf";
      const contentType = request.headers.get("X-Content-Type") || request.headers.get("Content-Type") || "application/pdf";

      await db
        .prepare(
          "UPDATE students SET signed_contract_path = ?, signed_contract_filename = ?, signed_contract_content_type = ?, signed_contract_uploaded_at = datetime('now') WHERE id = ?"
        )
        .bind(base64, filename, contentType, studentId)
        .run();

      await logAction(db, user, "student.contract_upload", "student", studentId, `${student.student_name} için sözleşme yüklendi (${filename})`);
      return json({ ok: true, filename, uploaded_at: new Date().toISOString() });
    }

    // Contract View/Download: /students/:id/contract-file
    const fileMatch = path.match(/^\/students\/([^\/]+)\/contract-file$/);
    if (fileMatch && request.method === "GET") {
      const studentId = fileMatch[1];
      const student = await db.prepare("SELECT signed_contract_path, signed_contract_filename, signed_contract_content_type FROM students WHERE id = ?").bind(studentId).first();
      if (!student || !student.signed_contract_path) {
        return json({ detail: "Yüklenmiş sözleşme bulunamadı" }, 404);
      }

      const binary = atob(student.signed_contract_path);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const contentType = student.signed_contract_content_type || "application/pdf";
      const filename = student.signed_contract_filename || "sozlesme.pdf";

      return new Response(bytes, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
          ...CORS_HEADERS,
        },
      });
    }

    // Single student route: /students/:id
    const studentMatch = path.match(/^\/students\/([^\/]+)$/);
    if (studentMatch) {
      const studentId = studentMatch[1];
      if (request.method === "GET") {
        const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
        if (!student) return json({ detail: "Öğrenci bulunamadı" }, 404);
        student.remaining = Math.max(0, (Number(student.total_fee) || 0) - (Number(student.paid_amount) || 0));
        return json(student);
      }
      if (request.method === "PATCH") {
        const user = await getCurrentUser(request, db);
        const patch = await request.json();
        const allowed = [
          "student_name", "student_phone", "school", "student_class", "student_tc", "student_address",
          "parent_name", "parent_phone", "parent_tc", "parent_address",
          "mother_tc", "mother_name", "mother_job", "mother_phone", "mother_work_phone", "mother_address", "mother_work_address", "mother_email",
          "father_job", "father_work_phone", "father_work_address", "father_email",
          "guardian_tc", "guardian_name", "guardian_job", "guardian_phone", "guardian_home_phone", "guardian_work_phone", "guardian_home_address", "guardian_work_address", "guardian_email",
          "program", "total_fee", "extra_fees", "discount_type", "discount_amount", "discount_note", "installment_count", "due_date", "photo"
        ];
        const updates = [];
        const values = [];
        for (const key of allowed) {
          if (key in patch) {
            updates.push(`${key} = ?`);
            let v = patch[key];
            if (key === "extra_fees" && typeof v === "object") v = JSON.stringify(v);
            values.push(v);
          }
        }
        if (updates.length > 0) {
          values.push(studentId);
          await db.prepare(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
          await logAction(db, user, "student.update", "student", studentId, `Öğrenci güncellendi`);
        }
        const updated = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
        return json(updated);
      }
    }

    // ---------------- PAYMENTS ----------------
    if (path === "/payments" && request.method === "POST") {
      const user = await getCurrentUser(request, db);
      const p = await request.json();
      const amount = Number(p.amount) || 0;
      if (amount <= 0) return json({ detail: "Tahsilat tutarı sıfırdan büyük olmalıdır" }, 422);

      const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(p.student_id).first();
      if (!student) return json({ detail: "Öğrenci bulunamadı" }, 404);

      const id = "pay_" + crypto.randomUUID().slice(0, 10);
      await db
        .prepare(
          "INSERT INTO payments (id, student_id, amount, method, bank, payment_date, note, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .bind(
          id,
          p.student_id,
          amount,
          p.method || "Nakit",
          p.bank || "",
          p.payment_date || new Date().toISOString().slice(0, 10),
          p.note || "",
          user?.user_id || "",
          user?.name || ""
        )
        .run();

      await db
        .prepare("UPDATE students SET paid_amount = paid_amount + ? WHERE id = ?")
        .bind(amount, p.student_id)
        .run();

      await logAction(db, user, "payment.create", "payment", id, `${student.student_name} · ${amount} ₺ · ${p.method}`);

      return json({ id, ...p, amount });
    }

    // ---------------- EXPENSES ----------------
    if (path === "/expenses" && request.method === "POST") {
      const user = await getCurrentUser(request, db);
      const e = await request.json();
      const id = "exp_" + crypto.randomUUID().slice(0, 10);
      await db
        .prepare(
          "INSERT INTO expenses (id, title, amount, expense_date, category, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .bind(
          id,
          e.title || "Gider",
          Number(e.amount) || 0,
          e.expense_date || new Date().toISOString().slice(0, 10),
          e.category || "Genel",
          user?.user_id || "",
          user?.name || ""
        )
        .run();

      await logAction(db, user, "expense.create", "expense", id, `${e.title} · ${e.amount} ₺`);
      return json({ id, ...e });
    }

    // ---------------- CLASSES ----------------
    if (path === "/classes" && request.method === "POST") {
      const user = await getCurrentUser(request, db);
      const c = await request.json();
      const id = "class_" + crypto.randomUUID().slice(0, 8);
      await db
        .prepare(
          "INSERT INTO classes (id, name, level, room, capacity, teacher, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .bind(
          id,
          c.name || "",
          c.level || "",
          c.room || "",
          parseInt(c.capacity) || 20,
          c.teacher || "",
          user?.user_id || "",
          user?.name || ""
        )
        .run();

      await logAction(db, user, "class.create", "class", id, `${c.name} sınıfı oluşturuldu`);
      return json({ id, ...c });
    }

    // ---------------- REMINDERS ----------------
    if (path === "/reminders" && request.method === "GET") {
      const days = parseInt(url.searchParams.get("days")) || 7;
      const studentsRes = await db.prepare("SELECT * FROM students").all();
      const paymentsRes = await db.prepare("SELECT * FROM payments").all();

      const students = studentsRes.results || [];
      const payments = paymentsRes.results || [];

      const now = new Date();
      const horizon = new Date(now.getTime() + days * 24 * 3600 * 1000);
      const items = [];

      const todayStr = new Date().toISOString().slice(0, 10);
      const horizonStr = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const msPerDay = 24 * 3600 * 1000;

      for (const s of students) {
        const remaining = getEffectiveTotalFee(s) - (Number(s.paid_amount) || 0);
        if (remaining <= 0) continue;

        const sPayments = payments.filter((p) => p.student_id === s.id);
        const plan = computeInstallmentPlan(s, sPayments);

        const nextDue = plan.find((p) => p.status !== "paid");
        if (!nextDue) continue;

        const isOverdue = nextDue.due_date < todayStr;
        const isUpcoming = nextDue.due_date >= todayStr && nextDue.due_date <= horizonStr;

        if (!isOverdue && !isUpcoming) continue;

        const diffDays = Math.round(
          (new Date(nextDue.due_date + "T12:00:00Z").getTime() - new Date(todayStr + "T12:00:00Z").getTime()) / msPerDay
        );

        items.push({
          student_id: s.id,
          student_name: s.student_name,
          parent_name: s.parent_name,
          parent_phone: s.parent_phone || s.student_phone || "",
          installment_no: nextDue.no,
          amount_due: nextDue.remaining || nextDue.amount,
          due_date: nextDue.due_date,
          status: isOverdue ? "overdue" : "upcoming",
          days_diff: diffDays,
        });
      }

      items.sort((a, b) => {
        if (a.status !== b.status) return a.status === "overdue" ? -1 : 1;
        return a.due_date.localeCompare(b.due_date);
      });

      return json(items);
    }

    // ---------------- MONTHLY REPORT ----------------
    if (path === "/reports/monthly" && request.method === "GET") {
      const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
      const studentsRes = await db.prepare("SELECT * FROM students").all();
      const paymentsRes = await db
        .prepare("SELECT p.*, s.student_name FROM payments p LEFT JOIN students s ON p.student_id = s.id ORDER BY p.payment_date ASC")
        .all();
      const expensesRes = await db.prepare("SELECT * FROM expenses ORDER BY expense_date ASC").all();

      const students = studentsRes.results || [];
      const payments = paymentsRes.results || [];
      const expenses = expensesRes.results || [];

      const monthPayments = payments.filter((p) => String(p.payment_date).startsWith(month));
      const monthExpenses = expenses.filter((e) => String(e.expense_date).startsWith(month));

      const collected = monthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const expTotal = monthExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const net = collected - expTotal;

      const pdf = generateMonthlyPdf({
        month,
        collected,
        expenses: expTotal,
        net,
        monthPayments,
        monthExpenses,
        studentsCount: students.length,
      });

      return new Response(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="inegol-cozum-rapor-${month}.pdf"`,
          ...CORS_HEADERS,
        },
      });
    }

    // ---------------- USERS & AUDIT ----------------
    if (path === "/users" && request.method === "GET") {
      const res = await db.prepare("SELECT user_id, email, name, picture, role, created_at FROM users").all();
      const users = (res.results || []).map((u) => ({
        ...u,
        role_label: ROLE_LABELS[u.role] || u.role,
      }));
      return json(users);
    }

    if (path === "/users/role" && request.method === "PUT") {
      const user = await getCurrentUser(request, db);
      if (!user || user.role !== ROLE_ADMIN) {
        return json({ detail: "Sadece yöneticiler rol değiştirebilir" }, 403);
      }
      const body = await request.json();
      if (!ROLE_LABELS[body.role]) return json({ detail: "Geçersiz rol" }, 422);
      if (body.user_id === user.user_id && body.role !== ROLE_ADMIN) {
        return json({ detail: "Kendi yönetici rolünüzü kaldıramazsınız" }, 400);
      }

      await db.prepare("UPDATE users SET role = ? WHERE user_id = ?").bind(body.role, body.user_id).run();
      await logAction(db, user, "user.role_update", "user", body.user_id, `Rol ${ROLE_LABELS[body.role]} yapıldı`);
      return json({ ok: true });
    }

    if (path === "/audit-logs" && request.method === "GET") {
      const res = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200").all();
      return json(res.results || []);
    }

    // ---------------- EXPORT ----------------
    const exportMatch = path.match(/^\/export\/([^\/]+)$/);
    if (exportMatch && request.method === "GET") {
      const kind = exportMatch[1];
      let csv = "\uFEFF"; // UTF-8 BOM for Excel

      if (kind === "students" || kind === "all") {
        csv += "ÖĞRENCİLER\n";
        csv += "Ad Soyad;Telefon;Okul;Sınıf;Veli;Veli Tel;Program;Toplam Ücret;Ödenen;Kalan;Taksit;İlk Vade\n";
        const res = await db.prepare("SELECT * FROM students ORDER BY student_name ASC").all();
        for (const s of res.results || []) {
          const rem = (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0);
          csv += `"${s.student_name || ""}";"${s.student_phone || ""}";"${s.school || ""}";"${s.student_class || ""}";"${s.parent_name || ""}";"${s.parent_phone || ""}";"${s.program || ""}";${s.total_fee || 0};${s.paid_amount || 0};${rem};${s.installment_count || 1};"${s.due_date || ""}"\n`;
        }
        csv += "\n";
      }

      if (kind === "payments" || kind === "all") {
        csv += "TAHSİLATLAR\n";
        csv += "Tarih;Öğrenci;Tutar;Yöntem;Banka;Açıklama;Kaydeden\n";
        const pRes = await db.prepare("SELECT p.*, s.student_name FROM payments p LEFT JOIN students s ON p.student_id = s.id ORDER BY p.payment_date DESC").all();
        for (const p of pRes.results || []) {
          csv += `"${p.payment_date || ""}";"${p.student_name || ""}";${p.amount || 0};"${p.method || ""}";"${p.bank || ""}";"${p.note || ""}";"${p.created_by_name || ""}"\n`;
        }
        csv += "\n";
      }

      if (kind === "expenses" || kind === "all") {
        csv += "GİDERLER\n";
        csv += "Tarih;Başlık;Kategori;Tutar;Kaydeden\n";
        const eRes = await db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
        for (const e of eRes.results || []) {
          csv += `"${e.expense_date || ""}";"${e.title || ""}";"${e.category || ""}";${e.amount || 0};"${e.created_by_name || ""}"\n`;
        }
        csv += "\n";
      }

      if (kind === "audit" || kind === "all") {
        csv += "DENETİM KAYITLARI\n";
        csv += "Tarih;Kullanıcı;E-posta;İşlem;Detay\n";
        const aRes = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500").all();
        for (const a of aRes.results || []) {
          csv += `"${a.created_at || ""}";"${a.user_name || ""}";"${a.user_email || ""}";"${a.action || ""}";"${a.detail || ""}"\n`;
        }
      }

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="inegol-cozum-${kind}.csv"`,
          ...CORS_HEADERS,
        },
      });
    }

    // ---------------- STATUS CHECK ----------------
    if (path === "/status" || path === "") {
      return json({ status: "ok", name: "İnegöl Çözüm Kurs Cloudflare Edge API", timestamp: new Date().toISOString() });
    }

    return json({ detail: "Endpoint bulunamadı: " + path }, 404);
  } catch (err) {
    console.error("API error:", err);
    return json({ detail: "Sunucu hatası: " + (err.message || String(err)) }, 500);
  }
}
