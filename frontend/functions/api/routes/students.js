import { generateContractInstallments } from "../../../src/lib/installmentService.js";
import {
  json,
  errorResponse,
  logAction,
  getNextSequence,
  getEffectiveTotalFee,
  enrichStudent,
  CORS_HEADERS,
  normalizeDate,
  recordWriteGuard,
} from "../utils.js";
import { getContractUpdateStatements, installmentWrite } from "./contracts.js";

export async function handleStudentsRoutes({ request, db, env, url, path, user, waitUntil }) {
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
        c.brut_tutar as contract_amount,
        CASE WHEN s.signed_contract_path != '' AND s.signed_contract_path IS NOT NULL THEN 'stored' ELSE '' END as signed_contract_path
      FROM students s
      LEFT JOIN contracts c ON (
        s.id = c.student_id
        OR s.id = ('stu-' || c.student_id)
        OR ('stu-' || s.id) = c.student_id
      ) AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
        AND c.id=(
          SELECT current.id FROM contracts current JOIN students owner ON owner.id=s.id
          WHERE (current.student_id=s.id OR current.student_id=REPLACE(s.id,'stu-','') OR ('stu-'||current.student_id)=s.id)
            AND COALESCE(current.is_deleted,0)=0
          -- ORDER BY must refer to local columns for compatibility across SQLite runtimes.
          ORDER BY (current.sozlesme_no=COALESCE(owner.sozlesme_no,'')) DESC,current.sozlesme_tarihi DESC,current.id DESC LIMIT 1
        )
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
      whereClause += ` AND s.program = ?`;
      whereParams.push(period);
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
    const previous = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();
    if (previous) return handleStudentsRoutes({ request: new Request(request.url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }), db, env, url, path: `/students/${id}`, user, waitUntil });
    if (![Number(s.total_fee || 0), Number(s.discount_amount || 0), Number(s.paid_amount || 0)].every(n => Number.isFinite(n) && n >= 0) || !Number.isInteger(Number(s.installment_count ?? 1)) || Number(s.installment_count ?? 1) < 1 || Number(s.installment_count ?? 1) > 120 || (s.due_date && !normalizeDate(s.due_date))) return errorResponse("Ücret, taksit veya vade bilgisi geçersiz", 422, "VALIDATION_ERROR");
    if (Number(s.paid_amount || 0)!==0) return errorResponse("Ödenen tutar tahsilat işlemiyle kaydedilmelidir",422,"PAYMENT_REQUIRED");
    let extras;
    try {extras=typeof s.extra_fees==="string" ? JSON.parse(s.extra_fees) : (s.extra_fees || {});} catch {return errorResponse("Geçersiz ek ücretler",422);}
    if(!extras || Array.isArray(extras) || typeof extras!=="object" || Object.values(extras).some(v=>!Number.isFinite(Number(v)) || Number(v)<0)) return errorResponse("Geçersiz ek ücretler",422);
    const statements = [];
    const resolvedParentPhone =
      (s.parent_phone || "").trim() ||
      (s.primary_parent === "anne" ? (s.mother_phone || s.mother_work_phone || "") :
       s.primary_parent === "guardian" || s.primary_parent === "vasi" ? (s.guardian_phone || s.guardian_home_phone || s.guardian_work_phone || "") :
       (s.father_work_phone || s.father_phone || "")) ||
      (s.mother_phone || s.guardian_phone || s.father_phone || "").trim();

    statements.push(db
      .prepare(`
        INSERT INTO students (
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
      );

    await logAction(db, user, "student.create", "student", id, `${s.student_name} kaydedildi`, waitUntil);


    // Auto-create contract and installments in D1 if not exists
    let sozlesmeNo = s.sozlesme_no;
    let contractId = "cnt_" + crypto.randomUUID().slice(0, 10);
    {

      const existingContract = await db.prepare("SELECT * FROM contracts WHERE (student_id = ? OR (sozlesme_no = ? AND sozlesme_no != '')) AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 1").bind(id, sozlesmeNo || "").first().catch(() => null);
      if (existingContract) {
        sozlesmeNo = existingContract.sozlesme_no;
        contractId = existingContract.id;
      }

      if (!sozlesmeNo) {
        sozlesmeNo = await getNextSequence(db, "SZL_2026", "SZL2026", 5, 153);
      }
      statements.push(db.prepare("UPDATE students SET sozlesme_no = ? WHERE id = ?").bind(sozlesmeNo, id));

      const gross = getEffectiveTotalFee(s);
      const inst = Math.max(1, parseInt(s.installment_count) || 10);
      const net = Math.round((gross / 1.1) * 100) / 100;
      const vat = Math.round((gross - net) * 100) / 100;
      const periodId = s.donem_id || (s.program === "2025-2026" ? 40 : s.program === "2026-2027-YAZ" ? 142 : 113);
      const periodName = s.donem_adi || (s.program === "2025-2026" ? "2025-2026" : s.program === "2026-2027-YAZ" ? "2026-2027-YAZ" : "2026-2027");

      statements.push(db.prepare(`
        INSERT INTO contracts (
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
      ));

      const gelirKodu = s.gelir_kodu || (await getNextSequence(db, "GLR_2026", "GLR2026", 5, 158));
      const glrId = "glr_" + crypto.randomUUID().slice(0, 10);
      statements.push(db.prepare(`
        INSERT INTO student_incomes (
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
      ));

      // Insert installments into installments table via atomic db.batch
      const plan = generateContractInstallments({id:contractId,student_id:id,brut_tutar:gross,taksit_sayisi:inst},{startDate:normalizeDate(s.due_date) || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-15`,dueDay:s.due_date ? Number(normalizeDate(s.due_date).slice(8,10)) : 15});
      statements.push(installmentWrite(db,plan,contractId,glrId,id,inst));
    }
    await db.batch(statements);
    const created = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();
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
    const contract=await db.prepare("SELECT * FROM contracts WHERE student_id=? AND COALESCE(is_deleted,0)=0 AND (sozlesme_no=? OR COALESCE(?,'')='') ORDER BY sozlesme_tarihi DESC LIMIT 1").bind(studentId,student.sozlesme_no||'',student.sozlesme_no||'').first();
    const stored=contract ? (await db.prepare('SELECT * FROM installments WHERE contract_id=? ORDER BY installment_no').bind(contract.id).all()).results || [] : [];
    const plan=stored.map(i=>({id:i.id,no:i.installment_no,due_date:normalizeDate(i.due_date),amount:i.amount,paid:i.paid_amount,remaining:contract.durum===3?0:Math.max(0,i.amount-i.paid_amount),status:contract.durum===3?'cancelled':i.paid_amount>=i.amount?'paid':i.paid_amount>0?'partial':'pending'}));
    if(contract){student.contract_status=contract.durum;student.remaining=contract.durum===3?0:plan.reduce((sum,i)=>sum+i.remaining,0);}

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
      if (Math.ceil(arrayBuffer.byteLength / 3) * 4 > 1800000) {
        return errorResponse("R2 depolama bağlanmadığı için 1.35MB üzeri dosyalar yüklenemez", 413, "FILE_TOO_LARGE");
      }
      if (typeof Buffer !== "undefined") {
        storagePath = Buffer.from(arrayBuffer).toString("base64");
      } else {
        let binary = "";
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        storagePath = btoa(binary);
      }
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

    let bytes;
    if (typeof Buffer !== "undefined") {
      bytes = Buffer.from(student.signed_contract_path, "base64");
    } else {
      const binary = atob(student.signed_contract_path);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
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

    if (request.method === "PATCH" || request.method === "PUT") {
      const patch = await request.json().catch(() => ({}));
      const decodedId = decodeURIComponent(studentId);
      let existing = await db.prepare("SELECT * FROM students WHERE id = ? OR id = ('stu-' || ?) OR ('stu-' || id) = ?").bind(decodedId, decodedId, decodedId).first();

      if (!existing) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");
      const targetId = existing.id;
      if (patch.paid_amount != null && Number(patch.paid_amount) !== Number(existing.paid_amount || 0)) return errorResponse("Ödenen tutar yalnızca tahsilat işlemiyle değiştirilebilir", 422, "PAYMENT_REQUIRED");
      if (["total_fee", "discount_amount", "installment_count"].some(k => k in patch && (!Number.isFinite(Number(patch[k])) || Number(patch[k]) < 0)) || (patch.due_date && !normalizeDate(patch.due_date))) return errorResponse("Geçersiz ücret veya tarih", 422, "VALIDATION_ERROR");

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
        const guard=recordWriteGuard(db,'students',existing,patch._expected,allowed,enrichStudent(existing));
        if(guard.error)return guard.error;
        values.push(targetId);
        let financialContract=null;
        const updates = [db.prepare(`UPDATE students SET ${sets.join(", ")} WHERE id = ?`).bind(...values)];
        if (["total_fee", "extra_fees", "discount_amount", "installment_count", "due_date"].some(k => k in patch && JSON.stringify(patch[k]) !== JSON.stringify(existing[k]))) {
          const contract = await db.prepare("SELECT * FROM contracts WHERE student_id=? AND is_deleted=0 AND (sozlesme_no=? OR COALESCE(?,'')='') ORDER BY sozlesme_tarihi DESC LIMIT 1").bind(targetId,existing.sozlesme_no||'',existing.sozlesme_no||'').first();
          if (contract) {
            const financial = await getContractUpdateStatements(db, contract, { brutTutar: getEffectiveTotalFee({ ...existing, ...patch }), taksitSayisi: patch.installment_count ?? existing.installment_count, due_date: normalizeDate(patch.due_date)!==normalizeDate(existing.due_date) ? patch.due_date : undefined }, false);
            if (financial.error) return financial.error;
            financialContract=contract;
            updates[0]=db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id=? AND EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0)`).bind(...values,contract.id);
            updates.push(...financial.statements);
          }
        }
        await db.batch([guard.statement,...updates]);
        if(financialContract && (await db.prepare('SELECT durum FROM contracts WHERE id=?').bind(financialContract.id).first())?.durum===3)return errorResponse('Sözleşme iptal edildi; değişiklik kaydedilmedi',409,'CANCELLED_CONTRACT');
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

      const related = await db.prepare(`SELECT
        (SELECT COUNT(*) FROM contracts WHERE student_id=? OR student_id=('stu-' || ?) OR ('stu-' || student_id)=?) +
        (SELECT COUNT(*) FROM payments WHERE student_id=? OR student_id=('stu-' || ?) OR ('stu-' || student_id)=?) +
        (SELECT COUNT(*) FROM installments WHERE student_id=?) +
        (SELECT COUNT(*) FROM student_incomes WHERE student_id=?) +
        (SELECT COUNT(*) FROM attendance WHERE student_id=?) +
        (SELECT COUNT(*) FROM exam_results WHERE student_id=?) +
        (SELECT COUNT(*) FROM homework_submissions WHERE student_id=?) +
        (SELECT COUNT(*) FROM mentorship WHERE student_id=?) +
        (SELECT COUNT(*) FROM appointments WHERE student_id=?) AS count`).bind(...Array(13).fill(targetId)).first();
      if (Number(related?.count) > 0) return errorResponse("Finans veya eğitim kaydı bulunan öğrenci silinemez. Öğrenci durumunu Ayrıldı olarak güncelleyiniz; geçmiş kayıtları korunur.", 409, "HAS_HISTORY");
      await db.prepare("DELETE FROM students WHERE id=?").bind(targetId).run();

      await logAction(db, user, "student.delete", "student", targetId, `${targetName} silindi (ilişkili kayıt yok)`, waitUntil);
      return json({ ok: true, deleted_id: targetId, deleted_name: targetName });
    }
  }

  return null;
}
