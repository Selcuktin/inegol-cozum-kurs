import {
  json,
  errorResponse,
  logAction,
  getNextSequence,
  getEffectiveTotalFee,
  enrichStudent,
  CORS_HEADERS,
} from "../utils.js";

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

export async function handleStudentsRoutes({ request, db, url, path, user, waitUntil }) {
  // 1. GET /students
  if ((path === "/students" || path.endsWith("/Ogrencies/GetAll")) && request.method === "GET") {
    const search = url.searchParams.get("search") || "";
    const classFilter = url.searchParams.get("class") || "";
    const period = url.searchParams.get("period") || url.searchParams.get("program") || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "1000", 10);
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, 
        c.id as contract_id,
        COALESCE(c.sozlesme_no, s.sozlesme_no) as sozlesme_no,
        c.durum as contract_status,
        c.is_signed as contract_is_signed,
        c.sozlesme_tarihi as contract_date,
        c.brut_tutar as contract_amount
      FROM students s
      LEFT JOIN contracts c ON (
        s.id = c.student_id 
        OR s.id = ('stu-' || c.student_id)
        OR ('stu-' || s.id) = c.student_id
      ) AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
      WHERE 1=1
    `;
    let whereClause = "";
    const whereParams = [];

    if (search) {
      whereClause += ` AND (s.student_name LIKE ? OR s.student_tc LIKE ? OR s.parent_name LIKE ? OR s.parent_phone LIKE ? OR s.student_no LIKE ?)`;
      whereParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (classFilter) {
      whereClause += ` AND s.student_class = ?`;
      whereParams.push(classFilter);
    }
    if (period && period !== "all") {
      whereClause += ` AND (s.program = ? OR s.program LIKE ?)`;
      whereParams.push(period, `${period}%`);
    }

    query += whereClause + ` ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?`;
    const queryParams = [...whereParams, limit, offset];

    const [result, totalRow] = await Promise.all([
      db.prepare(query).bind(...queryParams).all(),
      db.prepare(`SELECT count(*) as total FROM students s WHERE 1=1 ${whereClause}`).bind(...whereParams).first().catch(() => ({ total: 0 }))
    ]);

    const rows = (result.results || []).map(enrichStudent);

    if (path.endsWith("/Ogrencies/GetAll")) {
      return json({
        success: true,
        result: {
          items: rows,
          totalCount: totalRow?.total || rows.length,
        },
      });
    }

    return json({
      items: rows,
      total: totalRow?.total || rows.length,
      page,
      limit,
    });
  }

  // 2. POST /students
  if ((path === "/students" || path.endsWith("/Ogrencies/CreateOrEdit")) && request.method === "POST") {
    const s = await request.json().catch(() => ({}));
    if (!s.student_name || !s.student_name.trim()) {
      return errorResponse("Öğrenci adı zorunludur", 422, "VALIDATION_ERROR");
    }

    const id = s.id || "student-" + crypto.randomUUID().slice(0, 8);
    const resolvedParentPhone =
      (s.parent_phone || "").trim() ||
      (s.primary_parent === "anne" ? (s.mother_phone || s.mother_work_phone || "") :
       s.primary_parent === "guardian" || s.primary_parent === "vasi" ? (s.guardian_phone || s.guardian_home_phone || s.guardian_work_phone || "") :
       (s.father_work_phone || s.father_phone || "")) ||
      (s.mother_phone || s.guardian_phone || s.father_phone || "").trim();

    await db
      .prepare(`
        INSERT OR REPLACE INTO students (
          id, student_name, student_phone, school, student_class, student_tc, student_address,
          parent_name, parent_phone, parent_tc, parent_address,
          mother_tc, mother_name, mother_job, mother_phone, mother_work_phone, mother_address, mother_work_address, mother_email,
          father_job, father_work_phone, father_work_address, father_email,
          guardian_tc, guardian_name, guardian_job, guardian_phone, guardian_home_phone, guardian_work_phone, guardian_home_address, guardian_work_address, guardian_email,
          program, total_fee, extra_fees, discount_type, discount_amount, discount_note,
          paid_amount, installment_count, due_date, photo, student_no, gender, birth_date, department,
          status, din_muaf, ing_muaf, uses_service, diploma_grade, primary_parent, health_notes,
          created_by, created_by_name, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, datetime('now')
        )
      `)
      .bind(
        id,
        s.student_name.trim(),
        s.student_phone || "",
        s.school || "",
        s.student_class || "",
        s.student_tc || "",
        s.student_address || "",
        s.parent_name || "",
        resolvedParentPhone,
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
        s.program || "2026-2027",
        Number(s.total_fee) || 0,
        typeof s.extra_fees === "object" ? JSON.stringify(s.extra_fees) : (s.extra_fees || "{}"),
        s.discount_type || "",
        Number(s.discount_amount) || 0,
        s.discount_note || "",
        Number(s.paid_amount) || 0,
        parseInt(s.installment_count) || 1,
        s.due_date || "",
        s.photo || "",
        s.student_no || "",
        s.gender || "Erkek",
        s.birth_date || "",
        s.department || "Sayısal",
        s.status || "Kayitli",
        Number(s.din_muaf) ? 1 : 0,
        Number(s.ing_muaf) ? 1 : 0,
        Number(s.uses_service) ? 1 : 0,
        Number(s.diploma_grade) || 0,
        s.primary_parent || "baba",
        s.health_notes || "",
        user?.user_id || "",
        user?.name || ""
      )
      .run();

    await logAction(db, user, "student.create", "student", id, `${s.student_name} kaydedildi`, waitUntil);
    const created = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();

    // Auto-create contract and installments in D1 if not exists
    let sozlesmeNo = s.sozlesme_no;
    let contractId = "cnt_" + crypto.randomUUID().slice(0, 10);
    try {
      await db.prepare("DELETE FROM contracts WHERE (student_id = ? OR sozlesme_no = ?) AND (is_deleted = 1 OR id LIKE 'del-%' OR sozlesme_no LIKE 'del-%')").bind(id, sozlesmeNo || "").run().catch(() => {});
      await db.prepare("DELETE FROM student_incomes WHERE (student_id = ? OR sozlesme_no = ?) AND is_deleted = 1").bind(id, sozlesmeNo || "").run().catch(() => {});

      const existingContract = await db.prepare("SELECT * FROM contracts WHERE (student_id = ? OR (sozlesme_no = ? AND sozlesme_no != '')) AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 1").bind(id, sozlesmeNo || "").first().catch(() => null);
      if (existingContract) {
        sozlesmeNo = existingContract.sozlesme_no;
        contractId = existingContract.id;
      }

      if (!sozlesmeNo) {
        sozlesmeNo = await getNextSequence(db, "SZL_2026", "SZL2026", 5, 153);
      }
      await db.prepare("UPDATE students SET sozlesme_no = ? WHERE id = ?").bind(sozlesmeNo, id).run().catch(() => {});

      const gross = (s.total_fee !== undefined && s.total_fee !== null && s.total_fee !== "") ? Math.max(0, Number(s.total_fee)) : 75000;
      const inst = Math.max(1, parseInt(s.installment_count) || 10);
      const net = Math.round((gross / 1.1) * 100) / 100;
      const vat = Math.round((gross - net) * 100) / 100;
      const periodId = s.donem_id || (s.program === "2025-2026" ? 40 : s.program === "2026-2027-YAZ" ? 142 : 113);
      const periodName = s.donem_adi || (s.program === "2025-2026" ? "2025-2026" : s.program === "2026-2027-YAZ" ? "2026-2027-YAZ" : "2026-2027");

      await db.prepare(`
        INSERT OR REPLACE INTO contracts (
          id, sozlesme_no, student_id, student_name, student_no, student_class,
          parent_name, parent_phone, period_id, period_name, net_tutar, kdv_tutari, brut_tutar,
          odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi,
          kurum_imza_alindi, sozlesme_tarihi, created_at, created_by, is_deleted
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 1, 0, 0,
          0, datetime('now'), datetime('now'), ?, 0
        )
      `).bind(
        contractId, sozlesmeNo, id, s.student_name, s.student_no || "", s.student_class || "Genel",
        s.parent_name || "", resolvedParentPhone, periodId, periodName, net, vat, gross,
        inst > 1 ? 1 : 2, inst > 1 ? `Taksitli (${inst} Taksit)` : "Peşin / Tek Çekim", inst, user?.name || "Yönetici"
      ).run();

      // Inactivate any orphaned duplicate contracts for this student strictly by student_id
      await db.prepare(
        "UPDATE contracts SET is_deleted = 1 WHERE student_id = ? AND student_id != '' AND id != ? AND (is_deleted = 0 OR is_deleted IS NULL)"
      ).bind(id, contractId).run().catch(() => {});

      const gelirKodu = s.gelir_kodu || (await getNextSequence(db, "GLR_2026", "GLR2026", 5, 158));
      const glrId = "glr_" + crypto.randomUUID().slice(0, 10);
      await db.prepare(`
        INSERT OR REPLACE INTO student_incomes (
          id, gelir_kodu, contract_id, sozlesme_no, student_id, student_name, student_no, student_class,
          musteri_unvan, title, period_id, period_name, net_tutar, kdv_tutari, brut_tutar,
          toplam_tahsilat, kalan_alacak, tam_tahsil_edildi_mi, gelir_tarihi, vade_tarihi,
          taksitli_mi, taksit_sayisi, kalan_taksit_sayisi, durum, created_at, is_deleted
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          0, ?, 0, datetime('now'), ?,
          ?, ?, ?, 1, datetime('now'), 0
        )
      `).bind(
        glrId, gelirKodu, contractId, sozlesmeNo, id, s.student_name, s.student_no || "", s.student_class || "Genel",
        s.parent_name || s.student_name, `Sözleşme: ${sozlesmeNo}`, periodId, periodName, net, vat, gross,
        gross, s.due_date || new Date().toISOString(), inst > 1 ? 1 : 0, inst, inst
      ).run().catch((e) => console.error("Auto income insert error:", e));

      // Inactivate any duplicate income rows strictly by student_id or contract_id
      await db.prepare(
        "UPDATE student_incomes SET is_deleted = 1 WHERE ((student_id = ? AND student_id != '') OR contract_id = ?) AND id != ? AND (is_deleted = 0 OR is_deleted IS NULL)"
      ).bind(id, contractId, glrId).run().catch(() => {});

      // Insert installments into installments table via atomic db.batch
      const baseAmt = Math.floor((gross / inst) * 100) / 100;
      const remainder = Math.round((gross - (baseAmt * inst)) * 100) / 100;
      const baseDate = new Date();
      const baseYear = baseDate.getFullYear();
      const baseMonth = baseDate.getMonth();
      const instStmts = [];

      for (let i = 1; i <= inst; i++) {
        const isLast = (i === inst);
        const amt = isLast ? Math.round((baseAmt + remainder) * 100) / 100 : baseAmt;
        const targetMonthIndex = baseMonth + i - 1;
        const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
        const targetMonth = (targetMonthIndex % 12) + 1;
        const dueDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-15`;
        const instId = `inst_${contractId}_${i}`;

        instStmts.push(
          db.prepare(`
            INSERT OR REPLACE INTO installments (
              id, contract_id, income_id, student_id, installment_no, total_installments,
              due_date, amount, paid_amount, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Bekliyor', datetime('now'))
          `).bind(instId, contractId, glrId, id, i, inst, dueDate, amt)
        );
      }
      if (instStmts.length > 0) {
        if (typeof db.batch === "function") {
          await db.batch(instStmts).catch((e) => console.error("Auto installment batch insert error:", e));
        } else {
          for (const stmt of instStmts) {
            await stmt.run().catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("Auto contract generation error:", err);
    }

    const enrichedCreated = {
      ...(created || {}),
      sozlesme_no: sozlesmeNo,
      sozlesmeNo: sozlesmeNo,
      has_contract: true,
      contract_id: contractId,
      is_kesin_kayit: true,
    };

    return json(enrichedCreated, 201);
  }

  // 3. Detail route: /students/:id/detail
  const detailMatch = path.match(/^\/students\/([^\/]+)\/detail$/);
  if (detailMatch && request.method === "GET") {
    const studentId = detailMatch[1];
    const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
    if (!student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");

    student.remaining = Math.max(0, getEffectiveTotalFee(student) - (Number(student.paid_amount) || 0));
    const paymentsRes = await db
      .prepare("SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC")
      .bind(studentId)
      .all();
    const payments = paymentsRes.results || [];
    const plan = computeInstallmentPlan(student, payments);

    const examResultsRes = await db.prepare(`
      SELECT r.*, e.title as exam_title, e.exam_type, e.exam_date, e.publisher
      FROM exam_results r
      JOIN exams e ON r.exam_id = e.id
      WHERE r.student_id = ?
      ORDER BY e.exam_date DESC
    `).bind(studentId).all().catch(() => ({ results: [] }));

    const attendanceRes = await db
      .prepare("SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 50")
      .bind(studentId)
      .all()
      .catch(() => ({ results: [] }));

    const mentorshipRes = await db
      .prepare("SELECT * FROM mentorship WHERE student_id = ? ORDER BY session_date DESC")
      .bind(studentId)
      .all()
      .catch(() => ({ results: [] }));

    return json({
      student,
      payments,
      installment_plan: plan,
      exam_results: examResultsRes.results || [],
      attendance: attendanceRes.results || [],
      mentorship: mentorshipRes.results || [],
    });
  }

  // 4. Contract Upload: /students/:id/contract-upload
  const uploadMatch = path.match(/^\/students\/([^\/]+)\/contract-upload$/);
  if (uploadMatch && request.method === "POST") {
    const studentId = uploadMatch[1];
    const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
    if (!student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return errorResponse("Dosya boyutu 10MB'dan büyük olamaz", 413, "FILE_TOO_LARGE");
    }

    const filename = request.headers.get("X-Filename") || "sozlesme.pdf";
    const contentType = request.headers.get("X-Content-Type") || request.headers.get("Content-Type") || "application/pdf";
    const r2Bucket = env?.FILES || env?.R2 || env?.BUCKET || env?.CONTRACTS;

    let storagePath = "";
    if (r2Bucket && typeof r2Bucket.put === "function") {
      const r2Key = `contracts/${studentId}_${Date.now()}.pdf`;
      await r2Bucket.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType },
        customMetadata: { filename, studentId }
      });
      storagePath = r2Key;
    } else {
      if (arrayBuffer.byteLength > 1.5 * 1024 * 1024) {
        return errorResponse("R2 depolama bağlanmadığı için 1.5MB üzeri dosyalar yüklenemez", 413, "FILE_TOO_LARGE");
      }
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      storagePath = btoa(binary);
    }

    await db
      .prepare(
        "UPDATE students SET signed_contract_path = ?, signed_contract_filename = ?, signed_contract_content_type = ?, signed_contract_uploaded_at = datetime('now') WHERE id = ?"
      )
      .bind(storagePath, filename, contentType, studentId)
      .run();

    await logAction(db, user, "student.contract_upload", "student", studentId, `${student.student_name} için sözleşme yüklendi (${filename})`, waitUntil);
    return json({ ok: true, filename, uploaded_at: new Date().toISOString() });
  }

  // 5. Contract View/Download: /students/:id/contract-file
  const fileMatch = path.match(/^\/students\/([^\/]+)\/contract-file$/);
  if (fileMatch && request.method === "GET") {
    const studentId = fileMatch[1];
    const student = await db.prepare("SELECT signed_contract_path, signed_contract_filename, signed_contract_content_type FROM students WHERE id = ?").bind(studentId).first();
    if (!student || !student.signed_contract_path) {
      return errorResponse("Yüklenmiş sözleşme bulunamadı", 404, "NOT_FOUND");
    }

    const contentType = student.signed_contract_content_type || "application/pdf";
    const filename = student.signed_contract_filename || "sozlesme.pdf";
    const r2Bucket = env?.FILES || env?.R2 || env?.BUCKET || env?.CONTRACTS;

    if (student.signed_contract_path.startsWith("contracts/") && r2Bucket && typeof r2Bucket.get === "function") {
      const r2Obj = await r2Bucket.get(student.signed_contract_path);
      if (!r2Obj) return errorResponse("Dosya R2 depolamada bulunamadı", 404, "NOT_FOUND");
      return new Response(r2Obj.body, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
          ...CORS_HEADERS,
        },
      });
    }

    const binary = atob(student.signed_contract_path);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        ...CORS_HEADERS,
      },
    });
  }

  // 6. Single student route: /students/:id (GET, PATCH, DELETE)
  const studentMatch = path.match(/^\/students\/([^\/]+)$/);
  if (studentMatch) {
    const studentId = studentMatch[1];

    if (request.method === "GET") {
      const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first();
      if (!student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");
      student.remaining = Math.max(0, getEffectiveTotalFee(student) - (Number(student.paid_amount) || 0));
      return json(student);
    }

    if (request.method === "PATCH") {
      const patch = await request.json().catch(() => ({}));
      const decodedId = decodeURIComponent(studentId);
      let existing = await db.prepare("SELECT * FROM students WHERE id = ? OR id = ('stu-' || ?) OR ('stu-' || id) = ?").bind(decodedId, decodedId, decodedId).first();

      if (!existing) {
        const insertId = decodedId || `student-${Date.now().toString(36)}`;
        await db.prepare(`
          INSERT INTO students (id, student_name, student_phone, school, student_class, student_tc, student_address, parent_name, parent_phone, parent_tc, status, total_fee, installment_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          insertId,
          patch.student_name || decodedId,
          patch.student_phone || "",
          patch.school || "",
          patch.student_class || "Genel",
          patch.student_tc || "",
          patch.student_address || "",
          patch.parent_name || "",
          patch.parent_phone || "",
          patch.parent_tc || "",
          patch.status || "Kesin Kayıt",
          Number(patch.total_fee || 0),
          parseInt(patch.installment_count || 1)
        ).run().catch(() => {});
        existing = await db.prepare("SELECT * FROM students WHERE id = ?").bind(insertId).first();
      }

      if (!existing) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");
      const targetId = existing.id;

      const allowed = [
        "student_name", "student_phone", "school", "student_class", "student_tc", "student_address",
        "parent_name", "parent_phone", "parent_tc", "parent_address",
        "mother_tc", "mother_name", "mother_job", "mother_phone", "mother_work_phone", "mother_address", "mother_work_address", "mother_email",
        "father_job", "father_work_phone", "father_work_address", "father_email",
        "guardian_tc", "guardian_name", "guardian_job", "guardian_phone", "guardian_home_phone", "guardian_work_phone", "guardian_home_address", "guardian_work_address", "guardian_email",
        "program", "total_fee", "extra_fees", "discount_type", "discount_amount", "discount_note",
        "paid_amount", "installment_count", "due_date", "photo", "student_no", "gender", "birth_date", "department",
        "status", "din_muaf", "ing_muaf", "uses_service", "diploma_grade", "primary_parent", "health_notes",
      ];

      const sets = [];
      const values = [];
      for (const k of allowed) {
        if (k in patch) {
          sets.push(`${k} = ?`);
          values.push(typeof patch[k] === "object" ? JSON.stringify(patch[k]) : patch[k]);
        }
      }

      if (!patch.parent_phone && (patch.mother_phone || patch.guardian_phone || existing.mother_phone || existing.guardian_phone)) {
        const pPhone =
          ((patch.primary_parent || existing.primary_parent) === "anne" ? (patch.mother_phone || existing.mother_phone || "") : "") ||
          ((patch.primary_parent || existing.primary_parent) === "guardian" || (patch.primary_parent || existing.primary_parent) === "vasi" ? (patch.guardian_phone || existing.guardian_phone || "") : "") ||
          patch.mother_phone || existing.mother_phone || patch.guardian_phone || existing.guardian_phone || "";
        if (pPhone && !sets.some((s) => s.startsWith("parent_phone"))) {
          sets.push("parent_phone = ?");
          values.push(pPhone);
        }
      }

      if (sets.length > 0) {
        values.push(targetId);
        await db.prepare(`UPDATE students SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
      }

      await logAction(db, user, "student.update", "student", targetId, `${existing.student_name} bilgileri güncellendi`, waitUntil);
      const updated = await db.prepare("SELECT * FROM students WHERE id = ?").bind(targetId).first();
      return json(enrichStudent(updated));
    }

    if (request.method === "DELETE") {
      const decodedId = decodeURIComponent(studentId);
      const student = await db.prepare(
        "SELECT * FROM students WHERE id = ? OR id = ('stu-' || ?) OR ('stu-' || id) = ?"
      ).bind(decodedId, decodedId, decodedId).first();

      if (!student) {
        return json({ ok: true, deleted_id: decodedId, already_deleted: true });
      }

      const targetId = student.id;
      const targetName = student.student_name;

      // Full Cascade Purge strictly by student targetId: Permanently delete payments, installments, incomes, contracts, and student
      const deleteStmts = [
        db.prepare("DELETE FROM payments WHERE student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ? OR contract_id IN (SELECT id FROM contracts WHERE student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ?)").bind(targetId, targetId, targetId, targetId, targetId, targetId),
        db.prepare("DELETE FROM installments WHERE student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ? OR contract_id IN (SELECT id FROM contracts WHERE student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ?)").bind(targetId, targetId, targetId, targetId, targetId, targetId),
        db.prepare("DELETE FROM student_incomes WHERE student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ?").bind(targetId, targetId, targetId),
        db.prepare("DELETE FROM contracts WHERE student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ?").bind(targetId, targetId, targetId),
        db.prepare("DELETE FROM students WHERE id = ? OR id = ('stu-' || ?) OR ('stu-' || id) = ?").bind(targetId, targetId, targetId)
      ];
      if (typeof db.batch === "function") {
        await db.batch(deleteStmts);
      } else {
        for (const s of deleteStmts) await s.run().catch(() => {});
      }

      await logAction(db, user, "student.delete", "student", targetId, `${targetName} ve ilişkili tüm kayıtlar silindi`, waitUntil);
      return json({ ok: true, deleted_id: targetId, deleted_name: targetName });
    }
  }

  return null;
}
