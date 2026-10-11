// Cloudflare Pages Functions - Exams & Reports Router (Exams, Results, OMR Templates, Printer Profiles, Reminders, Monthly PDF)
import { json, errorResponse, successResponse, CORS_HEADERS, getCurrentUser, logAction, getEffectiveTotalFee, computeInstallmentPlan, generateMonthlyPdf } from "../utils.js";

export async function handleExamRoutes(ctxOrPath, maybeReq, maybeEnv, maybeUrl) {
  const isObj = typeof ctxOrPath === "object" && ctxOrPath !== null && ctxOrPath.request;
  const request = isObj ? ctxOrPath.request : maybeReq;
  const path = isObj ? ctxOrPath.path : ctxOrPath;
  const env = isObj ? ctxOrPath.env : maybeEnv;
  const db = (isObj ? ctxOrPath.db : maybeEnv?.DB) || env?.DB;
  const url = isObj ? ctxOrPath.url : maybeUrl;
  const currentUser = isObj ? ctxOrPath.user : null;

  // ---------------- OPTICAL (OMR & TEMPLATES) ----------------
  if (path === "/optical/templates" && request.method === "GET") {
    if (!db) return json([]);
    try {
      const res = await db.prepare("SELECT * FROM optical_templates ORDER BY name ASC").all();
      return json(res.results || []);
    } catch {
      return json([
        { id: "opt-lgs-90", name: "LGS 90 Soru Tek Oturum Standart Form", exam_type: "LGS", paper_size: "A4", question_count: 90, columns_count: 4 },
        { id: "opt-tyt-120", name: "TYT 120 Soru Standart ÖSYM Formu", exam_type: "TYT", paper_size: "A4", question_count: 120, columns_count: 4 },
        { id: "opt-ayt-160", name: "AYT 160 Soru 4 Branş Formu", exam_type: "AYT", paper_size: "A4", question_count: 160, columns_count: 4 },
        { id: "opt-kds-60", name: "KDS / HBS 60 Soru Ara Sınıf Formu", exam_type: "KDS", paper_size: "A5", question_count: 60, columns_count: 3 }
      ]);
    }
  }

  if (path === "/optical/printer-profiles" && request.method === "GET") {
    if (!db) return json([]);
    try {
      const res = await db.prepare("SELECT * FROM optical_printer_profiles ORDER BY name ASC").all();
      return json(res.results || []);
    } catch {
      return json([
        { id: "p-def", name: "Varsayılan Yazıcı (Standart A4)", offset_x_mm: 0, offset_y_mm: 0, is_default: 1 },
        { id: "p-epson", name: "Epson L8050 Yüksek Hızlı Fotoğraf/Optik", offset_x_mm: 1.2, offset_y_mm: -0.8, is_default: 0 },
        { id: "p-hp", name: "HP LaserJet Pro Enterprise", offset_x_mm: -0.5, offset_y_mm: 1.0, is_default: 0 }
      ]);
    }
  }

  // ---------------- REMINDERS ----------------
  if (path === "/reminders" && request.method === "GET") {
    if (!db) return json([]);
    const days = parseInt(url.searchParams.get("days")) || 7;

    try {
      const instRows = await db.prepare(`
        SELECT 
          i.student_id,
          COALESCE(s.student_name, '') as student_name,
          COALESCE(s.parent_name, '') as parent_name,
          COALESCE(s.parent_phone, s.student_phone, '') as parent_phone,
          i.installment_no,
          (i.amount - i.paid_amount) as amount_due,
          i.due_date,
          CASE WHEN i.due_date < date('now') THEN 'overdue' ELSE 'upcoming' END as status
        FROM installments i
        JOIN students s ON (i.student_id = s.id OR ('stu-' || i.student_id) = s.id OR i.student_id = ('stu-' || s.id))
        WHERE (i.status != 'Odendi' AND i.paid_amount < i.amount)
          AND (i.due_date <= date('now', '+' || ? || ' days'))
        ORDER BY (CASE WHEN i.due_date < date('now') THEN 0 ELSE 1 END) ASC, i.due_date ASC
        LIMIT 200
      `).bind(days).all().catch(() => ({ results: [] }));

      if (instRows?.results?.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const msPerDay = 24 * 3600 * 1000;
        const items = instRows.results.map((r) => {
          const diffDays = Math.round(
            (new Date(r.due_date + "T12:00:00Z").getTime() - new Date(todayStr + "T12:00:00Z").getTime()) / msPerDay
          );
          return {
            ...r,
            days_diff: diffDays,
          };
        });
        return json(items);
      }
    } catch (err) {
      console.warn("[Exams] Reminders query error:", err);
    }

    const [studentsRes, paymentsRes] = await Promise.all([
      db.prepare("SELECT * FROM students").all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM payments").all().catch(() => ({ results: [] }))
    ]);

    const students = studentsRes.results || [];
    const payments = paymentsRes.results || [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const horizonStr = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const msPerDay = 24 * 3600 * 1000;
    const items = [];

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
    if (!db) return errorResponse("Database connection unavailable", 500);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [studentsRes, paymentsRes, expensesRes] = await Promise.all([
      db.prepare("SELECT * FROM students").all().catch(() => ({ results: [] })),
      db.prepare("SELECT p.*, s.student_name FROM payments p LEFT JOIN students s ON p.student_id = s.id ORDER BY p.payment_date ASC").all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM expenses ORDER BY expense_date ASC").all().catch(() => ({ results: [] }))
    ]);

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

  // ---------------- EXAMS ----------------
  if (path === "/exams" && request.method === "GET") {
    if (!db) return json([]);
    const res = await db.prepare(`
      SELECT e.*, 
        COUNT(r.id) as participant_count,
        ROUND(AVG(r.total_net), 2) as avg_total_net,
        ROUND(AVG(r.score), 2) as avg_score
      FROM exams e
      LEFT JOIN exam_results r ON e.id = r.exam_id
      GROUP BY e.id
      ORDER BY e.exam_date DESC
    `).all();
    return json(res.results || []);
  }

  if (path === "/exams" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const body = await request.json();
    if (!body.title?.trim()) return errorResponse("Sınav adı zorunludur", 422);
    const id = body.id || "exam-" + crypto.randomUUID().slice(0, 8);
    await db.prepare(`
      INSERT INTO exams (id, title, exam_type, publisher, exam_date, booklet_types, status, description, created_by, created_by_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id,
      body.title.trim(),
      body.exam_type || "TYT",
      body.publisher || "",
      body.exam_date || new Date().toISOString().slice(0, 10),
      body.booklet_types || "A,B",
      body.status || "completed",
      body.description || "",
      user?.user_id || "",
      user?.name || ""
    ).run();
    await logAction(db, user, "exam.create", "exam", id, `Sınav eklendi: ${body.title}`);
    return json({ id, ok: true }, 201);
  }

  const examIdMatch = path.match(/^\/exams\/([^\/]+)$/);
  if (examIdMatch && request.method === "GET") {
    const id = examIdMatch[1];
    const exam = await db.prepare("SELECT * FROM exams WHERE id = ?").bind(id).first();
    if (!exam) return errorResponse("Sınav bulunamadı", 404);
    const resultsRes = await db.prepare(`
      SELECT r.*, s.student_name, s.student_class, s.school, s.parent_phone, s.student_phone
      FROM exam_results r
      LEFT JOIN students s ON r.student_id = s.id
      WHERE r.exam_id = ?
      ORDER BY r.total_net DESC
    `).bind(id).all();
    return json({ ...exam, results: resultsRes.results || [] });
  }

  if (examIdMatch && request.method === "DELETE") {
    const user = await getCurrentUser(request, db);
    const id = examIdMatch[1];
    await db.prepare("DELETE FROM exam_results WHERE exam_id = ?").bind(id).run();
    await db.prepare("DELETE FROM exams WHERE id = ?").bind(id).run();
    await logAction(db, user, "exam.delete", "exam", id, "Sınav ve sonuçları silindi");
    return json({ ok: true });
  }

  const examResMatch = path.match(/^\/exams\/([^\/]+)\/results$/);
  if (examResMatch && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const examId = examResMatch[1];
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    for (const item of items) {
      if (!item.student_id) continue;
      const rid = item.id || "res-" + crypto.randomUUID().slice(0, 8);
      const divisor = item.exam_type === "LGS" ? 3 : 4;
      const tNet = item.turkish_net !== undefined ? Number(item.turkish_net) : Math.max(0, (Number(item.turkish_correct) || 0) - ((Number(item.turkish_incorrect) || 0) / divisor));
      const mNet = item.math_net !== undefined ? Number(item.math_net) : Math.max(0, (Number(item.math_correct) || 0) - ((Number(item.math_incorrect) || 0) / divisor));
      const fNet = item.science_net !== undefined ? Number(item.science_net) : Math.max(0, (Number(item.science_correct) || 0) - ((Number(item.science_incorrect) || 0) / divisor));
      const sNet = item.social_net !== undefined ? Number(item.social_net) : Math.max(0, (Number(item.social_correct) || 0) - ((Number(item.social_incorrect) || 0) / divisor));
      const totalNet = Math.round((tNet + mNet + fNet + sNet) * 100) / 100;
      const score = Number(item.score) || Math.round((100 + (totalNet * 3.3)) * 100) / 100;
      const weakTopics = typeof item.weak_topics === "string" ? item.weak_topics : JSON.stringify(item.weak_topics || []);

      // Delete existing for this student in this exam to avoid duplicate
      await db.prepare("DELETE FROM exam_results WHERE exam_id = ? AND student_id = ?").bind(examId, item.student_id).run();

      await db.prepare(`
        INSERT INTO exam_results (
          id, exam_id, student_id, booklet,
          turkish_correct, turkish_incorrect, turkish_net,
          math_correct, math_incorrect, math_net,
          science_correct, science_incorrect, science_net,
          social_correct, social_incorrect, social_net,
          total_net, score, class_rank, overall_rank, weak_topics, created_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, datetime('now')
        )
      `).bind(
        rid, examId, item.student_id, item.booklet || "A",
        Number(item.turkish_correct) || 0, Number(item.turkish_incorrect) || 0, tNet,
        Number(item.math_correct) || 0, Number(item.math_incorrect) || 0, mNet,
        Number(item.science_correct) || 0, Number(item.science_incorrect) || 0, fNet,
        Number(item.social_correct) || 0, Number(item.social_incorrect) || 0, sNet,
        totalNet, score, Number(item.class_rank) || 1, Number(item.overall_rank) || 1, weakTopics
      ).run();
    }
    await logAction(db, user, "exam.results_saved", "exam", examId, `${items.length} sınav sonucu güncellendi`);
    return json({ ok: true });
  }

  return null;
}
