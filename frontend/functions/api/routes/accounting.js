import { json, errorResponse, logAction, enrichStudent } from "../utils.js";

export async function getDynamicAccountingSummary(db, students = [], preloadedSummary = null) {
  let cRow = preloadedSummary?.[0] || null;
  let iRow = preloadedSummary?.[1] || null;
  let pRow = preloadedSummary?.[2] || null;
  let instRow = preloadedSummary?.[3] || null;
  let overdueRow = preloadedSummary?.[4] || null;

  if (!preloadedSummary && db) {
    try {
      const [cRowRes, iRowRes, pRowRes, instRowRes, overdueRowRes] = await Promise.all([
        db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(brut_tutar), 0) as rev FROM contracts WHERE is_deleted = 0").first().catch(() => null),
        db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(toplam_tahsilat), 0) as coll, COALESCE(SUM(kalan_alacak), 0) as rem FROM student_incomes WHERE is_deleted = 0").first().catch(() => null),
        db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE (is_cancelled = 0 OR is_cancelled IS NULL)").first().catch(() => null),
        db.prepare("SELECT COUNT(*) as cnt FROM installments").first().catch(() => null),
        db.prepare(`
          SELECT COUNT(*) as cnt, COALESCE(SUM(amount - paid_amount), 0) as amt 
          FROM installments 
          WHERE (status = 'Gecikmis' OR (due_date < date('now') AND paid_amount < amount))
        `).first().catch(() => null)
      ]);
      cRow = cRowRes;
      iRow = iRowRes;
      pRow = pRowRes;
      instRow = instRowRes;
      overdueRow = overdueRowRes;
    } catch (err) {
      console.error("Dynamic accounting summary query error:", err);
    }
  }

  const sozlesmelerCount = cRow?.cnt || 0;
  const totalRevenue = cRow?.rev ? Number(cRow.rev) : 0;
  const totalCollected = (pRow?.total_paid ? Number(pRow.total_paid) : (iRow?.coll ? Number(iRow.coll) : 0));
  const totalRemaining = Math.max(0, totalRevenue - totalCollected);
  const gelirlerCount = iRow?.cnt || 0;
  const taksitlerCount = instRow?.cnt || 0;
  const tahsilatlarCount = pRow?.cnt || 0;
  const activeKesinCount = students.filter((s) => s.is_kesin_kayit).length;

  const overdueInstallmentsCount = overdueRow?.cnt != null ? overdueRow.cnt : 0;
  const overdueAmount = overdueRow?.amt ? Number(overdueRow.amt) : 0;

  return {
    totalRevenue,
    totalCollected,
    totalRemaining,
    sozlesmelerCount,
    gelirlerCount,
    taksitlerCount,
    tahsilatlarCount,
    studentsCount: students.length,
    activeKesinCount,
    overdueInstallmentsCount,
    overdueAmount,
  };
}

export async function handleAccountingRoutes({ request, db, env, path, user, waitUntil }) {
  // 1. GET /dashboard - All 11 D1 queries fired in a single concurrent Promise.all
  if (path === "/dashboard" && request.method === "GET") {
    const [
      studentsRes,
      classesRes,
      paymentsRes,
      expensesRes,
      teachersRes,
      contractsRes,
      cRowRes,
      iRowRes,
      pRowRes,
      instRowRes,
      overdueRowRes
    ] = await Promise.all([
      db.prepare("SELECT *, CASE WHEN signed_contract_path != '' AND signed_contract_path IS NOT NULL THEN 'stored' ELSE '' END as signed_contract_path FROM students ORDER BY created_at DESC, id DESC").all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM classes").all().catch(() => ({ results: [] })),
      db.prepare(`
        SELECT p.*, s.student_name, s.student_class, s.student_no, s.parent_name, s.parent_phone, s.sozlesme_no
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        ORDER BY p.payment_date DESC, p.created_at DESC
      `).all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 100").all().catch(() => ({ results: [] })),
      db.prepare("SELECT * FROM teachers ORDER BY name ASC").all().catch(() => ({ results: [] })),
      db.prepare(`
        SELECT c.*,
          (SELECT COALESCE(SUM(p.amount), 0) FROM payments p 
           WHERE (p.contract_id = c.id OR (p.student_id = c.student_id AND c.student_id IS NOT NULL AND c.student_id != '')) 
             AND (p.is_cancelled = 0 OR p.is_cancelled IS NULL)) as calculated_paid
        FROM contracts c 
        WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL) 
        ORDER BY c.sozlesme_tarihi DESC
      `).all().catch(() => ({ results: [] })),
      db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(brut_tutar), 0) as rev FROM contracts WHERE is_deleted = 0").first().catch(() => null),
      db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(toplam_tahsilat), 0) as coll, COALESCE(SUM(kalan_alacak), 0) as rem FROM student_incomes WHERE is_deleted = 0").first().catch(() => null),
      db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE (is_cancelled = 0 OR is_cancelled IS NULL)").first().catch(() => null),
      db.prepare("SELECT COUNT(*) as cnt FROM installments").first().catch(() => null),
      db.prepare(`
        SELECT COUNT(*) as cnt, COALESCE(SUM(amount - paid_amount), 0) as amt 
        FROM installments 
        WHERE (status = 'Gecikmis' OR (due_date < date('now') AND paid_amount < amount))
      `).first().catch(() => null)
    ]);

    const students = (studentsRes.results || []).map(enrichStudent);
    const accountingSummary = await getDynamicAccountingSummary(db, students, [cRowRes, iRowRes, pRowRes, instRowRes, overdueRowRes]);
    const contracts = (contractsRes.results || []).map((r) => {
      const gross = Number(r.brut_tutar) || 0;
      const paid = Number(r.calculated_paid) || 0;
      const remaining = Math.max(0, gross - paid);
      return {
        ...r,
        sozlesmeNo: r.sozlesme_no,
        sozlesmeTarihi: r.sozlesme_tarihi,
        ogrenciAdi: r.student_name,
        ogrenciAdiSoyadi: r.student_name,
        ogrenciNo: r.student_no,
        ogrenciId: r.student_id,
        sinifAdi: r.student_class,
        veliAdi: r.parent_name,
        veliTelefon: r.parent_phone,
        musteriUnvan: r.parent_name || r.student_name,
        donemId: r.period_id || 113,
        donemAdi: r.period_name || "2026-2027",
        netTutar: Number(r.net_tutar) || 0,
        kdvTutari: Number(r.kdv_tutari) || 0,
        brutTutar: gross,
        toplamTahsilat: paid,
        toplam_tahsilat: paid,
        kalanAlacak: remaining,
        kalan_alacak: remaining,
        taksitSayisi: parseInt(r.taksit_sayisi) || 1,
        odemeTuru: r.odeme_turu || 1,
        odemeTuruText: r.odeme_turu_text || (r.taksit_sayisi > 1 ? `Taksitli (${r.taksit_sayisi} Taksit)` : "Peşin"),
        durum: r.durum != null ? r.durum : 1,
        durumText: r.durum === 3 ? "İptal Edildi" : r.durum === 0 ? "Taslak" : "Aktif",
      };
    });

    return json({
      students,
      contracts,
      classes: classesRes.results || [],
      payments: paymentsRes.results || [],
      expenses: expensesRes.results || [],
      teachers: teachersRes.results || [],
      summary: {
        total_students: students.length,
        collected: paymentsRes.results?.filter(p => !p.is_cancelled && p.status !== 'İptal Edildi').reduce((a, b) => a + (Number(b.amount) || 0), 0) || 0,
        expenses: expensesRes.results?.reduce((a, b) => a + (Number(b.amount) || 0), 0) || 0,
        ...accountingSummary,
      },
      accounting: accountingSummary,
    });
  }

  // 2. GET /accounting/summary
  if (path === "/accounting/summary" && request.method === "GET") {
    const studentsRes = await db.prepare("SELECT * FROM students").all().catch(() => ({ results: [] }));
    const students = (studentsRes.results || []).map(enrichStudent);
    const summary = await getDynamicAccountingSummary(db, students);
    return json(summary);
  }

  // 3. GET /payments
  if (path === "/payments" && request.method === "GET") {
    const paymentsRes = await db.prepare(`
      SELECT p.*, s.student_name, s.student_class, s.student_no, s.parent_name, s.parent_phone, s.sozlesme_no
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all().catch(() => ({ results: [] }));
    return json(paymentsRes.results || []);
  }

  // 3. POST /payments (Atomic db.batch + Idempotency Guard)
  if (path === "/payments" && request.method === "POST") {
    const p = await request.json().catch(() => ({}));
    const amount = Number(p.amount) || 0;
    if (amount <= 0) return errorResponse("Geçersiz tahsilat tutarı", 422, "VALIDATION_ERROR");

    // Resilient student resolution strictly by ID, TC, or Contract
    let student = null;
    if (p.student_id) {
      const cleanId = String(p.student_id).replace(/^stu-/, "");
      student = await db.prepare(`
        SELECT * FROM students 
        WHERE id = ? OR id = ? OR ('stu-' || id) = ? OR student_tc = ? OR sozlesme_no = ?
        LIMIT 1
      `).bind(p.student_id, cleanId, p.student_id, p.student_id, p.student_id).first().catch(() => null);
    }
    if (!student && p.sozlesme_no) {
      student = await db.prepare(`
        SELECT s.* FROM students s
        LEFT JOIN contracts c ON (c.student_id = s.id OR ('stu-' || c.student_id) = s.id)
        WHERE s.sozlesme_no = ? OR c.sozlesme_no = ?
        LIMIT 1
      `).bind(p.sozlesme_no, p.sozlesme_no).first().catch(() => null);
    }
    if (!student && p.contract_id) {
      student = await db.prepare(`
        SELECT s.* FROM students s
        JOIN contracts c ON (c.student_id = s.id OR ('stu-' || c.student_id) = s.id)
        WHERE c.id = ? LIMIT 1
      `).bind(p.contract_id).first().catch(() => null);
    }
    if (!student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");

    // Resilient contract resolution strictly by IDs
    let contract = null;
    if (p.contract_id) {
      contract = await db.prepare("SELECT * FROM contracts WHERE id = ? LIMIT 1").bind(p.contract_id).first().catch(() => null);
    }
    if (!contract && p.sozlesme_no) {
      contract = await db.prepare("SELECT * FROM contracts WHERE sozlesme_no = ? LIMIT 1").bind(p.sozlesme_no).first().catch(() => null);
    }
    if (!contract && student) {
      const cleanStudentId = String(student.id).replace(/^stu-/, "");
      contract = await db.prepare(`
        SELECT * FROM contracts 
        WHERE (student_id = ? OR student_id = ? OR ('stu-' || student_id) = ?)
          AND (is_deleted = 0 OR is_deleted IS NULL)
        LIMIT 1
      `).bind(student.id, cleanStudentId, student.id).first().catch(() => null);
    }

    // Target specific installment
    let targetInst = null;
    const contractKey = contract?.id || p.contract_id || "";
    const contractNo = contract?.sozlesme_no || p.sozlesme_no || "";

    if (p.installment_id) {
      targetInst = await db.prepare("SELECT * FROM installments WHERE id = ?").bind(p.installment_id).first().catch(() => null);
    } else if (p.installment_no !== undefined && p.installment_no !== null && (contractKey || contractNo)) {
      targetInst = await db.prepare(`
        SELECT * FROM installments 
        WHERE (contract_id = ? OR contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?)) 
          AND installment_no = ? 
        LIMIT 1
      `).bind(contractKey, contractNo, contractNo, Number(p.installment_no)).first().catch(() => null);
    }
    if (!targetInst && (contractKey || contractNo)) {
      targetInst = await db.prepare(`
        SELECT * FROM installments 
        WHERE (contract_id = ? OR contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?)) 
          AND (paid_amount < amount OR paid_amount IS NULL OR status != 'Odendi') 
        ORDER BY installment_no ASC 
        LIMIT 1
      `).bind(contractKey, contractNo, contractNo).first().catch(() => null);
    }
    if (!targetInst && student?.id && p.installment_no !== undefined && p.installment_no !== null) {
      targetInst = await db.prepare("SELECT * FROM installments WHERE student_id = ? AND installment_no = ? LIMIT 1")
        .bind(student.id, Number(p.installment_no)).first().catch(() => null);
    }
    if (!targetInst && student?.id) {
      targetInst = await db.prepare("SELECT * FROM installments WHERE student_id = ? AND (paid_amount < amount OR paid_amount IS NULL OR status != 'Odendi') ORDER BY installment_no ASC LIMIT 1")
        .bind(student.id).first().catch(() => null);
    }

    // IDEMPOTENCY GUARD: If target installment is already paid, reject duplicate payment!
    if (targetInst && targetInst.status === "Odendi" && Number(targetInst.paid_amount || 0) >= Number(targetInst.amount || 0)) {
      return errorResponse("Bu taksit zaten tahsil edilmiştir. Tekrar tahsilat almak için önce önceki tahsilatı iptal ediniz.", 409, "ALREADY_PAID");
    }

    const id = p.id || ("pay_" + crypto.randomUUID().slice(0, 10));
    const payDate = p.payment_date || p.tahsilatTarihi || new Date().toISOString().slice(0, 10);
    const payBank = p.bank || p.kasaBankaAdi || "";
    const payNote = p.note || p.gelirAciklama || (targetInst ? `${contract?.sozlesme_no || ""} ${targetInst.installment_no}. Taksit Tahsilatı` : "Tahsilat");
    const payMethod = p.method || "Nakit";
    const instId = targetInst?.id || p.installment_id || "";
    const contractId = contract?.id || p.contract_id || "";

    // ATOMIC db.batch() EXECUTION
    const batchStmts = [
      db.prepare(`
        INSERT INTO payments (id, student_id, contract_id, installment_id, amount, method, bank, payment_date, note, status, is_cancelled, created_by, created_by_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Odendi', 0, ?, ?, datetime('now'))
      `).bind(id, student.id, contractId, instId, amount, payMethod, payBank, payDate, payNote, user?.user_id || "", user?.name || "")
    ];

    if (targetInst) {
      const newPaid = Math.min(targetInst.amount, Number(targetInst.paid_amount || 0) + amount);
      const newStatus = newPaid >= targetInst.amount ? "Odendi" : "KismenOdendi";
      batchStmts.push(
        db.prepare("UPDATE installments SET paid_amount = ?, status = ?, payment_date = ?, receipt_no = ? WHERE id = ?")
          .bind(newPaid, newStatus, payDate, id, targetInst.id)
      );
    }

    // Update students.paid_amount computed
    batchStmts.push(
      db.prepare(`
        UPDATE students 
        SET paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL))
        WHERE id = ?
      `).bind(student.id, student.id)
    );

    // Update student_incomes computed
    if (contract) {
      batchStmts.push(
        db.prepare(`
          UPDATE student_incomes 
          SET toplam_tahsilat = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL)),
              kalan_alacak = MAX(0, brut_tutar - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL))),
              tam_tahsil_edildi_mi = CASE WHEN MAX(0, brut_tutar - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL))) <= 0 THEN 1 ELSE 0 END
          WHERE contract_id = ? OR sozlesme_no = ?
        `).bind(contract.id, student.id, contract.id, student.id, contract.id, student.id, contract.id, contract.sozlesme_no)
      );
    }

    if (typeof db.batch === "function") {
      await db.batch(batchStmts);
    } else {
      for (const s of batchStmts) await s.run().catch(() => {});
    }

    await logAction(db, user, "payment.create", "payment", id, `${student.student_name} · ${amount} ₺ · ${payMethod}`, waitUntil);
    return json({ id, student_id: student.id, student_name: student.student_name, amount, payment_date: payDate, ...p }, 201);
  }

  // 3b. POST /payments/cancel (Atomic db.batch Cancellation)
  if (path === "/payments/cancel" && request.method === "POST") {
    const p = await request.json().catch(() => ({}));
    
    // Find payment to cancel
    let pay = null;
    if (p.payment_id) {
      pay = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(p.payment_id).first().catch(() => null);
    }
    if (!pay && p.installment_id) {
      pay = await db.prepare("SELECT * FROM payments WHERE installment_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) ORDER BY payment_date DESC LIMIT 1").bind(p.installment_id).first().catch(() => null);
    }
    if (!pay && (p.contract_id || p.sozlesme_no) && p.installment_no !== undefined) {
      pay = await db.prepare(`
        SELECT p.* FROM payments p
        JOIN contracts c ON p.contract_id = c.id OR p.student_id = c.student_id
        WHERE (c.id = ? OR c.sozlesme_no = ?) AND p.note LIKE ? AND (p.is_cancelled = 0 OR p.is_cancelled IS NULL)
        ORDER BY p.payment_date DESC LIMIT 1
      `).bind(p.contract_id || p.sozlesme_no, p.contract_id || p.sozlesme_no, `%${p.installment_no}. Taksit%`).first().catch(() => null);
    }
    if (!pay && p.student_id) {
      pay = await db.prepare("SELECT * FROM payments WHERE student_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL) ORDER BY payment_date DESC LIMIT 1").bind(p.student_id).first().catch(() => null);
    }

    const payId = pay?.id || p.payment_id;
    const studentId = pay?.student_id || p.student_id;
    const contractId = pay?.contract_id || p.contract_id;

    // Use D1 db.batch() for true ACID transaction
    const stmts = [];
    if (payId) {
      stmts.push(db.prepare("UPDATE payments SET status = 'İptal Edildi', is_cancelled = 1 WHERE id = ?").bind(payId));
    }
    const instId = pay?.installment_id || p.installment_id;
    if (instId) {
      stmts.push(db.prepare("UPDATE installments SET paid_amount = 0, status = 'Bekliyor', payment_date = '', receipt_no = '' WHERE id = ?").bind(instId));
    } else if ((contractId || p.sozlesme_no) && p.installment_no !== undefined) {
      stmts.push(db.prepare(`
        UPDATE installments 
        SET paid_amount = 0, status = 'Bekliyor', payment_date = '', receipt_no = '' 
        WHERE (contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?)) AND installment_no = ?
      `).bind(contractId || "", p.sozlesme_no || "", Number(p.installment_no)));
    }

    if (studentId) {
      stmts.push(db.prepare(`
        UPDATE students 
        SET paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL))
        WHERE id = ?
      `).bind(studentId, studentId));
    }

    if (contractId || p.sozlesme_no) {
      stmts.push(db.prepare(`
        UPDATE student_incomes 
        SET toplam_tahsilat = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL)),
            kalan_alacak = MAX(0, brut_tutar - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL))),
            tam_tahsil_edildi_mi = 0
        WHERE contract_id = ? OR sozlesme_no = ?
      `).bind(contractId || "", studentId || "", contractId || "", studentId || "", contractId || "", p.sozlesme_no || ""));
    }

    if (stmts.length > 0) {
      if (typeof db.batch === "function") {
        await db.batch(stmts);
      } else {
        for (const s of stmts) await s.run().catch(() => {});
      }
    }

    await logAction(db, user, "payment.cancel", "payment", payId || "", "Tahsilat iptal edildi", waitUntil);
    return json({ ok: true, cancelled_id: payId });
  }

  // 4. DELETE /payments/:id (Atomic cancellation)
  const paymentIdMatch = path.match(/^\/payments\/([^\/]+)$/);
  if (paymentIdMatch && request.method === "DELETE") {
    const payId = paymentIdMatch[1];
    const pay = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(payId).first();
    if (!pay) return errorResponse("Tahsilat bulunamadı", 404, "NOT_FOUND");

    const stmts = [
      db.prepare("UPDATE payments SET status = 'İptal Edildi', is_cancelled = 1 WHERE id = ?").bind(payId)
    ];

    if (pay.installment_id) {
      stmts.push(db.prepare("UPDATE installments SET paid_amount = 0, status = 'Bekliyor', payment_date = '', receipt_no = '' WHERE id = ?").bind(pay.installment_id));
    }

    stmts.push(
      db.prepare(`
        UPDATE students 
        SET paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = ? AND (is_cancelled = 0 OR is_cancelled IS NULL))
        WHERE id = ?
      `).bind(pay.student_id, pay.student_id)
    );

    if (pay.contract_id) {
      stmts.push(
        db.prepare(`
          UPDATE student_incomes 
          SET toplam_tahsilat = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL)),
              kalan_alacak = MAX(0, brut_tutar - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE (contract_id = ? OR student_id = ?) AND (is_cancelled = 0 OR is_cancelled IS NULL))),
              tam_tahsil_edildi_mi = 0
          WHERE contract_id = ?
        `).bind(pay.contract_id, pay.student_id, pay.contract_id, pay.student_id, pay.contract_id)
      );
    }

    if (typeof db.batch === "function") {
      await db.batch(stmts);
    } else {
      for (const s of stmts) await s.run().catch(() => {});
    }
    await logAction(db, user, "payment.delete", "payment", payId, `${pay.amount} ₺ tahsilat iptal edildi`, waitUntil);
    return json({ ok: true });
  }

  // 4b. POST /payments/:id/send-receipt-email (Cloudflare Email Sending integration)
  const paymentEmailMatch = path.match(/^\/payments\/([^\/]+)\/send-receipt-email$/);
  if (paymentEmailMatch && request.method === "POST") {
    const payId = paymentEmailMatch[1];
    const body = await request.json().catch(() => ({}));

    // Find payment
    const pay = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(payId).first();
    if (!pay) return errorResponse("Tahsilat bulunamadı", 404, "NOT_FOUND");

    // Find student
    const student = await db.prepare("SELECT * FROM students WHERE id = ? OR id = ('stu-' || ?)").bind(pay.student_id, pay.student_id).first().catch(() => null);
    const recipientEmail = String(body.email || student?.guardian_email || student?.father_email || student?.mother_email || "").trim();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return errorResponse("Geçerli bir veli veya öğrenci e-posta adresi bulunamadı. Lütfen e-posta adresini giriniz.", 400, "INVALID_EMAIL");
    }

    const studentName = student?.student_name || "Öğrenci";
    const parentName = student?.parent_name || "Sayın Veli";
    const amountStr = Number(pay.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
    const payDate = pay.payment_date || new Date().toISOString().slice(0, 10);
    const payMethod = pay.method || "Nakit";
    const receiptNo = pay.id ? String(pay.id).slice(0, 8).toUpperCase() : "MAKBUZ";

    const subject = `Özel İnegöl Çözüm Kurs Merkezi · Resmi Tahsilat Makbuzu (${receiptNo})`;
    const textContent = `
Sayın ${parentName},
${studentName} isimli öğrencinin kurs ödemesi için düzenlenen resmi tahsilat makbuzu detayları aşağıdadır:

Makbuz No: ${receiptNo}
Tarih: ${payDate}
Öğrenci: ${studentName}
Veli: ${parentName}
Ödeme Türü: ${payMethod}
Tahsil Edilen Tutar: ${amountStr}
Açıklama: ${pay.note || "Eğitim Dönemi Tahsilatı"}

Özel İnegöl Çözüm Kurs Merkezi
Telefon: 0224 715 00 00
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #1e3a8a; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px 24px; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 16px; }
    .amount-box { background: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0; }
    .amount-val { font-size: 28px; font-weight: 800; color: #1e3a8a; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .label { color: #64748b; font-weight: 500; }
    .val { font-weight: 600; color: #0f172a; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h1>
      <p>Milli Eğitim Bakanlığı Onaylı Resmi Eğitim Kurumu</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <span class="badge">TAHSİLAT MAKBUZU · RESMİ BELGE</span>
      </div>
      <p style="font-size: 15px; line-height: 1.5;">Sayın <strong>${parentName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;"><strong>${studentName}</strong> isimli öğrencinizin eğitim ücreti ödemesi kurumumuz tarafından tahsil edilmiş ve kayıtlarımıza işlenmiştir.</p>
      
      <div class="amount-box">
        <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;">TAHSİL EDİLEN TUTAR</div>
        <div class="amount-val">${amountStr}</div>
      </div>

      <div class="row"><span class="label">Makbuz No:</span><span class="val">${receiptNo}</span></div>
      <div class="row"><span class="label">Tahsilat Tarihi:</span><span class="val">${payDate}</span></div>
      <div class="row"><span class="label">Öğrenci:</span><span class="val">${studentName}</span></div>
      <div class="row"><span class="label">Ödeme Yöntemi:</span><span class="val">${payMethod}</span></div>
      <div class="row"><span class="label">Açıklama:</span><span class="val">${pay.note || "Eğitim Dönemi Tahsilatı"}</span></div>
    </div>
    <div class="footer">
      Bu belge Özel İnegöl Çözüm Kurs Merkezi Muhasebe Otomasyonu tarafından elektronik olarak üretilmiştir.<br>
      Hamidiye Mah. Park Cad. No: 12 İnegöl / Bursa · Tel: 0224 715 00 00
    </div>
  </div>
</body>
</html>
    `.trim();

    let deliveryStatus = "simulated";
    let errorDetail = null;

    if (env?.EMAIL && typeof env.EMAIL.send === "function") {
      try {
        await env.EMAIL.send({
          to: recipientEmail,
          from: "muhasebe@inegolcozumkurs.com",
          subject,
          html: htmlContent,
          text: textContent
        });
        deliveryStatus = "delivered";
      } catch (err) {
        console.error("Cloudflare Email binding error:", err);
        errorDetail = err.message;
      }
    }

    await logAction(db, user, "payment.receipt_email", "payment", payId, `Makbuz ${recipientEmail} adresine iletildi (${deliveryStatus})`, waitUntil);

    return json({
      ok: true,
      delivered: deliveryStatus === "delivered",
      status: deliveryStatus,
      recipient: recipientEmail,
      receipt_no: receiptNo,
      error_detail: errorDetail,
      message: deliveryStatus === "delivered"
        ? `${recipientEmail} adresine tahsilat makbuzu başarıyla e-posta ile gönderildi.`
        : `${recipientEmail} adresi için tahsilat makbuzu e-postası hazırlandı (Cloudflare Email Sending).`
    });
  }

  // 5. POST /expenses
  if (path === "/expenses" && request.method === "POST") {
    const e = await request.json().catch(() => ({}));
    const amount = Number(e.amount) || 0;
    if (amount <= 0) return errorResponse("Geçersiz gider tutarı", 422, "VALIDATION_ERROR");

    const id = "exp_" + crypto.randomUUID().slice(0, 10);
    await db
      .prepare(
        "INSERT INTO expenses (id, title, amount, expense_date, category, account, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      )
      .bind(
        id,
        e.title || "Gider",
        amount,
        e.expense_date || new Date().toISOString().slice(0, 10),
        e.category || "Genel",
        e.account || "Nakit Ana Kasa",
        user?.user_id || "",
        user?.name || ""
      )
      .run();

    await logAction(db, user, "expense.create", "expense", id, `${e.title} · ${amount} ₺ (${e.account || "Nakit Ana Kasa"})`, waitUntil);
    return json({ id, ...e, amount }, 201);
  }

  // 6. DELETE /expenses/:id
  const expenseIdMatch = path.match(/^\/expenses\/([^\/]+)$/);
  if (expenseIdMatch && request.method === "DELETE") {
    const expId = expenseIdMatch[1];
    await db.prepare("DELETE FROM expenses WHERE id = ?").bind(expId).run();
    await logAction(db, user, "expense.delete", "expense", expId, "Gider kaydı silindi", waitUntil);
    return json({ ok: true });
  }

  return null;
}
