// Cloudflare Pages Functions - Exams & Reports Router (Exams, Results, OMR Templates, Printer Profiles, Reminders, Monthly PDF)
import { json, cachedJson, errorResponse, successResponse, CORS_HEADERS, getCurrentUser, logAction, getEffectiveTotalFee, computeInstallmentPlan, generateMonthlyPdf } from "../utils.js";

export async function handleExamRoutes(ctxOrPath, maybeReq, maybeEnv, maybeUrl) {
  const isObj = typeof ctxOrPath === "object" && ctxOrPath !== null && ctxOrPath.request;
  const request = isObj ? ctxOrPath.request : maybeReq;
  const path = isObj ? ctxOrPath.path : ctxOrPath;
  const env = isObj ? ctxOrPath.env : maybeEnv;
  const db = (isObj ? ctxOrPath.db : maybeEnv?.DB) || env?.DB;
  const url = isObj ? ctxOrPath.url : maybeUrl;
  const currentUser = isObj ? ctxOrPath.user : null;

  // ---------------- OPTICAL (OMR & TEMPLATES) ----------------
  if (path === "/optical/templates" && request.method === "GET") return json((await db.prepare("SELECT * FROM optical_templates ORDER BY name").all()).results || []);
  if (path === "/optical/printer-profiles" && request.method === "GET") return json((await db.prepare("SELECT * FROM optical_printer_profiles ORDER BY name").all()).results || []);
  if (path === "/optical/printer-profiles" && request.method === "POST") {
    const body=await request.json();
    const x=Number(body.offset_x_mm),y=Number(body.offset_y_mm);
    if(!body.id || !body.name?.trim() || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x)>20 || Math.abs(y)>20) return errorResponse("Geçersiz yazıcı profili",422);
    await db.prepare("INSERT INTO optical_printer_profiles(id,name,offset_x_mm,offset_y_mm,is_default,scale_verified,created_at) VALUES(?,?,?,?,0,0,datetime('now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name,offset_x_mm=excluded.offset_x_mm,offset_y_mm=excluded.offset_y_mm,scale_verified=0").bind(body.id,body.name,x,y).run();
    return json({ok:true});
  }

  // ---------------- REMINDERS ----------------
  if (path === "/reminders" && request.method === "GET") {
    if (!db) return json([]);
    const days = Number(url.searchParams.get("days") ?? 7);
    if (!Number.isInteger(days) || days<0 || days>365) return errorResponse("Geçersiz gün aralığı",422);
    const res=await db.prepare(`SELECT i.student_id,s.student_name,s.parent_name,COALESCE(s.parent_phone,s.student_phone,'') AS parent_phone,i.installment_no,i.amount-COALESCE(i.paid_amount,0) AS amount_due,
      CASE WHEN i.due_date LIKE '__.__.____' THEN substr(i.due_date,7,4)||'-'||substr(i.due_date,4,2)||'-'||substr(i.due_date,1,2) ELSE i.due_date END AS due_date
      FROM installments i JOIN students s ON s.id=i.student_id JOIN contracts c ON c.id=i.contract_id
      WHERE COALESCE(c.is_deleted,0)=0 AND c.durum<>3 AND i.amount>COALESCE(i.paid_amount,0) AND date(CASE WHEN i.due_date LIKE '__.__.____' THEN substr(i.due_date,7,4)||'-'||substr(i.due_date,4,2)||'-'||substr(i.due_date,1,2) ELSE i.due_date END)<=date('now','+3 hours','+'||?||' days') ORDER BY due_date LIMIT 200`).bind(days).all();
    const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
    return json((res.results || []).map(r=>({...r,days_diff:Math.round((Date.parse(r.due_date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000),status:r.due_date<today ? 'overdue' : 'upcoming'})));
  }

  // ---------------- MONTHLY REPORT ----------------
  if (path === "/reports/monthly" && request.method === "GET") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [studentsRes, paymentsRes, expensesRes] = await Promise.all([
      db.prepare("SELECT * FROM students").all(),
      db.prepare("SELECT p.*, s.student_name FROM payments p LEFT JOIN students s ON p.student_id = s.id ORDER BY p.payment_date ASC").all(),
      db.prepare("SELECT * FROM expenses ORDER BY expense_date ASC").all()
    ]);

    const students = studentsRes.results || [];
    const payments = paymentsRes.results || [];
    const expenses = expensesRes.results || [];

    const monthPayments = payments.filter((p) => !p.is_cancelled && p.status !== "İptal Edildi" && String(p.payment_date).startsWith(month));
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

  if (examIdMatch && request.method === "PATCH") {
    const id = decodeURIComponent(examIdMatch[1]);
    const body = await request.json();
    const exam = await db.prepare("SELECT * FROM exams WHERE id=?").bind(id).first();
    if (!exam) return errorResponse("Sınav bulunamadı",404);
    const keys = body.answer_keys;
    const subjects = ["turkish","math","science","social","history","religion","english","literature","geography","physics","chemistry","biology"];
    if (!keys || typeof keys !== "object" || Array.isArray(keys) || !Object.keys(keys).length || Object.entries(keys).some(([book,lessons]) => !/^[A-D]$/.test(book) || !lessons || Array.isArray(lessons) || typeof lessons !== "object" || !Object.keys(lessons).length || Object.entries(lessons).some(([subject,key]) => !subjects.includes(subject) || typeof key !== "string" || !/^[A-E]{1,160}$/.test(key) || (exam.exam_type === "LGS" && key.includes("E"))))) return errorResponse("Geçersiz cevap anahtarı",422);
    await db.prepare("UPDATE exams SET answer_keys=? WHERE id=?").bind(JSON.stringify(keys),id).run();
    await logAction(db,currentUser,"exam.keys_saved","exam",id,"Cevap anahtarı kaydedildi");
    return json({ok:true,answer_keys:keys});
  }

  if (examIdMatch && request.method === "DELETE") {
    const user = await getCurrentUser(request, db);
    const id = examIdMatch[1];
    if (await db.prepare("SELECT id FROM exam_results WHERE exam_id=? LIMIT 1").bind(id).first()) return errorResponse("Sonucu bulunan sınav silinemez; geçmiş kayıtlar korunur",409,"HAS_HISTORY");
    await db.prepare("DELETE FROM exams WHERE id=?").bind(id).run();
    await logAction(db, user, "exam.delete", "exam", id, "Sınav ve sonuçları silindi");
    return json({ ok: true });
  }

  const examResMatch = path.match(/^\/exams\/([^\/]+)\/results$/);
  if (examResMatch && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const examId = examResMatch[1];
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    const exam = await db.prepare("SELECT * FROM exams WHERE id=?").bind(examId).first();
    if (!exam) return errorResponse("Sınav bulunamadı",404);
    const statements = [];
    for (const item of items) {
      if (!item.student_id || !await db.prepare("SELECT id FROM students WHERE id=?").bind(item.student_id).first()) return errorResponse("Kayıtlı öğrenci seçiniz",422);
      for (const subject of ["turkish","math","science","social"]) for (const suffix of ["correct","incorrect"]) {
        const value = Number(item[`${subject}_${suffix}`] ?? 0);
        if (!Number.isInteger(value) || value<0 || value>160) return errorResponse("Doğru ve yanlış sayıları geçersiz",422);
      }

      const rid = item.id || "res-" + crypto.randomUUID().slice(0, 8);
      const divisor = exam.exam_type === "LGS" ? 3 : 4;
      const tNet = item.turkish_net !== undefined ? Number(item.turkish_net) : (Number(item.turkish_correct) || 0) - ((Number(item.turkish_incorrect) || 0) / divisor);
      const mNet = item.math_net !== undefined ? Number(item.math_net) : (Number(item.math_correct) || 0) - ((Number(item.math_incorrect) || 0) / divisor);
      const fNet = item.science_net !== undefined ? Number(item.science_net) : (Number(item.science_correct) || 0) - ((Number(item.science_incorrect) || 0) / divisor);
      const sNet = item.social_net !== undefined ? Number(item.social_net) : (Number(item.social_correct) || 0) - ((Number(item.social_incorrect) || 0) / divisor);
      const subjects = item.subject_results || {};
      if (typeof subjects !== "object" || Array.isArray(subjects)) return errorResponse("Geçersiz ders sonuçları",422);
      const normalized = {};
      for (const [subject,result] of Object.entries(subjects)) {
        if (!result || [result.d,result.y,result.b].some(n=>!Number.isInteger(n) || n<0 || n>160)) return errorResponse("Geçersiz ders sonuçları",422);
        normalized[subject] = {...result,net:Math.round((result.d-result.y/divisor)*100)/100};
      }
      if ([tNet,mNet,fNet,sNet].some(n=>!Number.isFinite(n)) || [tNet,mNet,fNet,sNet].some((n,i)=>Math.abs(n-((Number(item[["turkish","math","science","social"][i]+"_correct"]) || 0)-(Number(item[["turkish","math","science","social"][i]+"_incorrect"]) || 0)/divisor))>0.011)) return errorResponse("Netler doğru/yanlış sayılarıyla uyumsuz",422);
      const totalNet = Math.round((Object.keys(normalized).length ? Object.values(normalized).reduce((sum,r)=>sum+r.net,0) : tNet+mNet+fNet+sNet)*100)/100;
      // Official scores require the publisher's scoring model; do not fabricate one from total net.
      const score = item.score == null ? null : Number(item.score);
      if (score !== null && !Number.isFinite(score)) return errorResponse("Geçersiz puan",422);

      const weakTopics = typeof item.weak_topics === "string" ? item.weak_topics : JSON.stringify(item.weak_topics || []);

      // Delete existing for this student in this exam to avoid duplicate
      statements.push(db.prepare("DELETE FROM exam_results WHERE exam_id = ? AND student_id = ?").bind(examId, item.student_id));

      statements.push(db.prepare(`
        INSERT INTO exam_results (
          id, exam_id, student_id, booklet,
          turkish_correct, turkish_incorrect, turkish_net,
          math_correct, math_incorrect, math_net,
          science_correct, science_incorrect, science_net,
          social_correct, social_incorrect, social_net,
          total_net, score, class_rank, overall_rank, weak_topics, subject_results, created_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?, datetime('now')
        )
      `).bind(
        rid, examId, item.student_id, item.booklet || "A",
        Number(item.turkish_correct) || 0, Number(item.turkish_incorrect) || 0, tNet,
        Number(item.math_correct) || 0, Number(item.math_incorrect) || 0, mNet,
        Number(item.science_correct) || 0, Number(item.science_incorrect) || 0, fNet,
        Number(item.social_correct) || 0, Number(item.social_incorrect) || 0, sNet,
        totalNet, score, Number(item.class_rank) || 1, Number(item.overall_rank) || 1, weakTopics, JSON.stringify(normalized)
      ));
    }
    statements.push(db.prepare(`WITH ranked AS (SELECT r.id,RANK() OVER(ORDER BY r.total_net DESC) AS overall_rank,RANK() OVER(PARTITION BY s.student_class ORDER BY r.total_net DESC) AS class_rank FROM exam_results r LEFT JOIN students s ON s.id=r.student_id WHERE r.exam_id=?) UPDATE exam_results SET overall_rank=(SELECT overall_rank FROM ranked WHERE ranked.id=exam_results.id),class_rank=(SELECT class_rank FROM ranked WHERE ranked.id=exam_results.id) WHERE exam_id=?`).bind(examId,examId));
    await db.batch(statements);
    await logAction(db, user, "exam.results_saved", "exam", examId, `${items.length} sınav sonucu güncellendi`);
    return json({ ok: true });
  }

  return null;
}
