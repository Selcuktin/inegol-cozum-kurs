const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
import { json, errorResponse, logAction, enrichStudent, normalizeDate } from "../utils.js";

const contractTotalsSql = `SELECT COUNT(*) AS cnt, COALESCE(SUM(c.brut_tutar),0) AS rev,
  COALESCE(SUM(MAX(0,c.brut_tutar-COALESCE(
    (SELECT MAX(i.toplam_tahsilat) FROM student_incomes i WHERE (i.contract_id=c.id OR i.sozlesme_no=c.sozlesme_no) AND COALESCE(i.is_deleted,0)=0 AND i.durum<>4),
    (SELECT SUM(p.amount) FROM payments p WHERE p.contract_id=c.id AND COALESCE(p.is_cancelled,0)=0),0))),0) AS rem
  FROM contracts c WHERE COALESCE(c.is_deleted,0)=0 AND c.durum<>3`;
const paymentsSql = `SELECT p.*, s.student_name, s.student_class, s.student_no, s.parent_name, s.parent_phone,
  c.sozlesme_no, i.installment_no AS taksit_no,
  (SELECT g.gelir_kodu FROM student_incomes g WHERE g.id=i.income_id) AS gelir_kodu
  FROM payments p LEFT JOIN students s ON p.student_id=s.id
  LEFT JOIN contracts c ON c.id=p.contract_id LEFT JOIN installments i ON i.id=p.installment_id
  ORDER BY p.payment_date DESC,p.created_at DESC`;

export async function getDynamicAccountingSummary(db, students = [], preloadedSummary = null) {
  let cRow = preloadedSummary?.[0] || null;
  let iRow = preloadedSummary?.[1] || null;
  let pRow = preloadedSummary?.[2] || null;
  let instRow = preloadedSummary?.[3] || null;
  let overdueRow = preloadedSummary?.[4] || null;

  if (!preloadedSummary && db) {
    {
      const [cRowRes, iRowRes, pRowRes, instRowRes, overdueRowRes] = await db.batch([
        db.prepare(contractTotalsSql),
        db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(toplam_tahsilat), 0) as coll, COALESCE(SUM(kalan_alacak), 0) as rem FROM student_incomes WHERE is_deleted = 0"),
        db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE (is_cancelled = 0 OR is_cancelled IS NULL)"),
        db.prepare("SELECT COUNT(*) as cnt FROM installments"),
        db.prepare(`
          SELECT COUNT(*) as cnt, COALESCE(SUM(amount - paid_amount), 0) as amt
          FROM installments
          WHERE (date(CASE WHEN due_date LIKE '__.__.____' THEN substr(due_date,7,4)||'-'||substr(due_date,4,2)||'-'||substr(due_date,1,2) ELSE due_date END) < date('now','+3 hours') AND COALESCE(paid_amount,0) < amount)
            AND EXISTS(SELECT 1 FROM contracts c WHERE c.id=installments.contract_id AND COALESCE(c.is_deleted,0)=0 AND c.durum<>3)
        `)
      ]);
      cRow = cRowRes.results[0];
      iRow = iRowRes.results[0];
      pRow = pRowRes.results[0];
      instRow = instRowRes.results[0];
      overdueRow = overdueRowRes.results[0];
    }
  }

  const sozlesmelerCount = cRow?.cnt || 0;
  const totalRevenue = cRow?.rev ? Number(cRow.rev) : 0;
  const totalCollected = Number(pRow?.total_paid ?? 0);
  const totalRemaining = Number(cRow?.rem ?? Math.max(0, totalRevenue - Number(iRow?.coll ?? totalCollected)));
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
  // One D1 transaction supplies the complete financial snapshot and its totals.
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
      overdueRowRes,
      incomesRes,
      installmentsRes
    ] = await db.batch([
      db.prepare("SELECT *, CASE WHEN signed_contract_path != '' AND signed_contract_path IS NOT NULL THEN 'stored' ELSE '' END as signed_contract_path FROM students ORDER BY created_at DESC, id DESC"),
      db.prepare("SELECT * FROM classes"),
      db.prepare(paymentsSql),
      db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC"),
      db.prepare("SELECT * FROM teachers ORDER BY name ASC"),
      db.prepare(`
        SELECT c.*,
          COALESCE((SELECT MAX(i.toplam_tahsilat) FROM student_incomes i WHERE (i.contract_id=c.id OR i.sozlesme_no=c.sozlesme_no) AND COALESCE(i.is_deleted,0)=0),(SELECT COALESCE(SUM(p.amount), 0) FROM payments p
           WHERE p.contract_id = c.id
             AND (p.is_cancelled = 0 OR p.is_cancelled IS NULL)) ) as calculated_paid
        FROM contracts c
        WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
        ORDER BY c.sozlesme_tarihi DESC
      `),
      db.prepare(contractTotalsSql),
      db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(toplam_tahsilat), 0) as coll, COALESCE(SUM(kalan_alacak), 0) as rem FROM student_incomes WHERE is_deleted = 0"),
      db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE (is_cancelled = 0 OR is_cancelled IS NULL)"),
      db.prepare("SELECT COUNT(*) as cnt FROM installments"),
      db.prepare(`
        SELECT COUNT(*) as cnt, COALESCE(SUM(amount - paid_amount), 0) as amt
        FROM installments
        WHERE (date(CASE WHEN due_date LIKE '__.__.____' THEN substr(due_date,7,4)||'-'||substr(due_date,4,2)||'-'||substr(due_date,1,2) ELSE due_date END) < date('now','+3 hours') AND COALESCE(paid_amount,0) < amount)
          AND EXISTS(SELECT 1 FROM contracts c WHERE c.id=installments.contract_id AND COALESCE(c.is_deleted,0)=0 AND c.durum<>3)
      `),
      db.prepare("SELECT * FROM student_incomes WHERE COALESCE(is_deleted,0)=0"),
      db.prepare("SELECT i.*,c.sozlesme_no,c.student_name,c.durum AS contract_status,c.period_id,c.period_name FROM installments i JOIN contracts c ON c.id=i.contract_id WHERE COALESCE(c.is_deleted,0)=0 ORDER BY i.due_date,i.installment_no")
    ]);

    const students = (studentsRes.results || []).map(enrichStudent);
    const accountingSummary = await getDynamicAccountingSummary(db, students, [cRowRes.results[0], iRowRes.results[0], pRowRes.results[0], instRowRes.results[0], overdueRowRes.results[0]]);
    const contracts = (contractsRes.results || []).map((r) => {
      const gross = Number(r.brut_tutar) || 0;
      const paid = Number(r.calculated_paid) || 0;
      const remaining = r.durum === 3 ? 0 : Math.max(0, gross - paid);
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
      incomes:incomesRes.results||[],
      installments:installmentsRes.results||[],
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
    const studentsRes = await db.prepare("SELECT * FROM students").all();
    const students = (studentsRes.results || []).map(enrichStudent);
    const summary = await getDynamicAccountingSummary(db, students);
    return json(summary);
  }

  // 3. GET /payments
  if (path === "/payments" && request.method === "GET") {
    const paymentsRes = await db.prepare(paymentsSql).all();
    return json(paymentsRes.results || []);
  }

  // 3. POST /payments (Atomic db.batch + Idempotency Guard)
  if (path === "/payments" && request.method === "POST") {
    const p = await request.json().catch(() => ({}));
    const amount = Number(p.amount) || 0;
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) / 100 !== amount) return errorResponse("Geçersiz tahsilat tutarı", 422, "VALIDATION_ERROR");

    const existingPayment = p.id ? await db.prepare("SELECT p.*,i.installment_no,c.sozlesme_no FROM payments p LEFT JOIN installments i ON i.id=p.installment_id LEFT JOIN contracts c ON c.id=p.contract_id WHERE p.id=?").bind(p.id).first() : null;
    if (existingPayment) {
      if ((p.student_id && String(existingPayment.student_id).replace(/^stu-/, "") !== String(p.student_id).replace(/^stu-/, "")) || Number(existingPayment.amount) !== amount || existingPayment.is_cancelled || (p.contract_id && existingPayment.contract_id !== p.contract_id) || (p.installment_id && existingPayment.installment_id !== p.installment_id) || (p.installment_no != null && Number(existingPayment.installment_no)!==Number(p.installment_no)) || (p.sozlesme_no && existingPayment.sozlesme_no!==p.sozlesme_no)) return errorResponse("İşlem kimliği başka tahsilatta kullanılmış", 409, "IDEMPOTENCY_CONFLICT");
      return json(existingPayment);
    }

    // Resilient student resolution strictly by ID, TC, or Contract
    let student = null;
    if (p.student_id) {
      const cleanId = String(p.student_id).replace(/^stu-/, "");
      student = await db.prepare(`
        SELECT * FROM students
        WHERE id = ? OR id = ? OR ('stu-' || id) = ? OR student_tc = ? OR sozlesme_no = ?
        LIMIT 1
      `).bind(p.student_id, cleanId, p.student_id, p.student_id, p.student_id).first();
    }
    if (!student && p.sozlesme_no) {
      student = await db.prepare(`
        SELECT s.* FROM students s
        LEFT JOIN contracts c ON (c.student_id = s.id OR ('stu-' || c.student_id) = s.id)
        WHERE s.sozlesme_no = ? OR c.sozlesme_no = ?
        LIMIT 1
      `).bind(p.sozlesme_no, p.sozlesme_no).first();
    }
    if (!student && p.contract_id) {
      student = await db.prepare(`
        SELECT s.* FROM students s
        JOIN contracts c ON (c.student_id = s.id OR ('stu-' || c.student_id) = s.id)
        WHERE c.id = ? LIMIT 1
      `).bind(p.contract_id).first();
    }
    if (!student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");

    // Resilient contract resolution strictly by IDs
    let contract = null;
    if (p.contract_id) {
      contract = await db.prepare("SELECT * FROM contracts WHERE id = ? LIMIT 1").bind(p.contract_id).first();
    }
    if (!contract && p.sozlesme_no) {
      contract = await db.prepare("SELECT * FROM contracts WHERE sozlesme_no = ? LIMIT 1").bind(p.sozlesme_no).first();
    }
    if(!contract && (p.contract_id || p.sozlesme_no)) return errorResponse("Sözleşme bulunamadı",404,"NOT_FOUND");
    if(!contract && (await db.prepare("SELECT COUNT(*) AS n FROM contracts WHERE student_id=? AND COALESCE(is_deleted,0)=0").bind(student.id).first())?.n>1) return errorResponse("Öğrencinin birden fazla sözleşmesi var; sözleşme seçiniz",409,"CONTRACT_REQUIRED");
    if (!contract && student) {
      const cleanStudentId = String(student.id).replace(/^stu-/, "");
      contract = await db.prepare(`
        SELECT * FROM contracts
        WHERE (student_id = ? OR student_id = ? OR ('stu-' || student_id) = ?)
          AND (is_deleted = 0 OR is_deleted IS NULL)
        LIMIT 1
      `).bind(student.id, cleanStudentId, student.id).first();
    }

    // Target specific installment
    let targetInst = null;
    const contractKey = contract?.id || p.contract_id || "";
    const contractNo = contract?.sozlesme_no || p.sozlesme_no || "";

    if (p.installment_id) {
      targetInst = await db.prepare("SELECT * FROM installments WHERE id = ?").bind(p.installment_id).first();
    } else if (p.installment_no !== undefined && p.installment_no !== null && (contractKey || contractNo)) {
      targetInst = await db.prepare(`
        SELECT * FROM installments
        WHERE (contract_id = ? OR contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?))
          AND installment_no = ?
        LIMIT 1
      `).bind(contractKey, contractNo, contractNo, Number(p.installment_no)).first();
    }
    if (!targetInst && (contractKey || contractNo)) {
      targetInst = await db.prepare(`
        SELECT * FROM installments
        WHERE (contract_id = ? OR contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?))
          AND (paid_amount < amount OR paid_amount IS NULL OR status != 'Odendi')
        ORDER BY installment_no ASC
        LIMIT 1
      `).bind(contractKey, contractNo, contractNo).first();
    }
    if (!targetInst && student?.id && p.installment_no !== undefined && p.installment_no !== null) {
      targetInst = await db.prepare("SELECT * FROM installments WHERE student_id = ? AND installment_no = ? LIMIT 1")
        .bind(student.id, Number(p.installment_no)).first();
    }
    if (!targetInst && student?.id) {
      targetInst = await db.prepare("SELECT * FROM installments WHERE student_id = ? AND (paid_amount < amount OR paid_amount IS NULL OR status != 'Odendi') ORDER BY installment_no ASC LIMIT 1")
        .bind(student.id).first();
    }

    const sameStudent = (a,b) => String(a).replace(/^stu-/, "") === String(b).replace(/^stu-/, "");
    if (!contract || contract.is_deleted || contract.durum === 3 || !sameStudent(contract.student_id, student.id)) return errorResponse("Sözleşme öğrenciye ait değil veya aktif değil", 422, "INVALID_CONTRACT");
    if (!targetInst || !sameStudent(targetInst.student_id, student.id) || (targetInst.contract_id !== contract.id && targetInst.contract_id !== contract.sozlesme_no)) return errorResponse("Taksit bu sözleşmeye ait değil", 422, "INVALID_INSTALLMENT");
    if (p.installment_id && targetInst.id !== p.installment_id) return errorResponse("Taksit bulunamadı", 404, "NOT_FOUND");
    const incomes = (await db.prepare("SELECT id FROM student_incomes WHERE (contract_id=? OR sozlesme_no=?) AND COALESCE(is_deleted,0)=0").bind(contract.id,contract.sozlesme_no).all()).results || [];
    if(incomes.length!==1) return errorResponse("Sözleşmenin gelir kaydı eksik veya birden fazla; önce muhasebe mutabakatı gerekir",409,"RECONCILIATION_REQUIRED");
    if (amount > Math.round((Number(targetInst.amount)-Number(targetInst.paid_amount || 0))*100)/100) return errorResponse("Tutar seçili taksitin kalanını aşıyor; ayrı taksitleri ayrı tahsil edin", 409, "OVERPAYMENT");
    // IDEMPOTENCY GUARD: If target installment is already paid, reject duplicate payment!
    if (targetInst && targetInst.status === "Odendi" && Number(targetInst.paid_amount || 0) >= Number(targetInst.amount || 0)) {
      return errorResponse("Bu taksit zaten tahsil edilmiştir. Tekrar tahsilat almak için önce önceki tahsilatı iptal ediniz.", 409, "ALREADY_PAID");
    }

    const id = p.id || ("pay_" + crypto.randomUUID().slice(0, 10));
    const payDate = normalizeDate(p.payment_date || p.tahsilatTarihi || new Date().toISOString());
    if (!payDate) return errorResponse("Geçersiz tahsilat tarihi",422,"VALIDATION_ERROR");
    const payBank = p.bank || p.kasaBankaAdi || "";
    const payNote = p.note || p.gelirAciklama || (targetInst ? `${contract?.sozlesme_no || ""} ${targetInst.installment_no}. Taksit Tahsilatı` : "Tahsilat");
    const payMethod = p.method || "Nakit";
    const instId = targetInst?.id || p.installment_id || "";
    const contractId = contract?.id || p.contract_id || "";

    // ponytail: imported opening balances remain intact until legacy payment links are reconciled.
    // A transient status inside this transaction prevents duplicate retries applying the same amount twice.
    const pending = "EXISTS (SELECT 1 FROM payments WHERE id=? AND status='Pending')";
    const batchStmts = [
      db.prepare(`INSERT INTO payments(id,student_id,contract_id,installment_id,amount,method,bank,payment_date,note,status,is_cancelled,created_by,created_by_name,created_at)
        SELECT ?,?,?,?,?,?,?,?,?,'Pending',0,?,?,datetime('now') FROM installments WHERE id=? AND ROUND(COALESCE(paid_amount,0)+?,2)<=ROUND(amount,2)
        AND EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0)
        ON CONFLICT(id) DO NOTHING`).bind(id,student.id,contractId,instId,amount,payMethod,payBank,payDate,payNote,user?.user_id || "",user?.name || "",instId,amount,contractId),
      db.prepare(`UPDATE installments SET paid_amount=ROUND(COALESCE(paid_amount,0)+?,2),status=CASE WHEN ROUND(COALESCE(paid_amount,0)+?,2)>=ROUND(amount,2) THEN 'Odendi' ELSE 'KismenOdendi' END,payment_date=?,receipt_no=? WHERE id=? AND ${pending}`).bind(amount,amount,payDate,id,instId,id),
      db.prepare(`UPDATE students SET paid_amount=ROUND(COALESCE(paid_amount,0)+?,2) WHERE id=? AND (COALESCE(sozlesme_no,'')='' OR sozlesme_no=?) AND ${pending}`).bind(amount,student.id,contract.sozlesme_no,id),
      db.prepare(`UPDATE student_incomes SET toplam_tahsilat=ROUND(toplam_tahsilat+?,2),kalan_alacak=MAX(0,ROUND(brut_tutar-toplam_tahsilat-?,2)),tam_tahsil_edildi_mi=CASE WHEN toplam_tahsilat+?>=brut_tutar THEN 1 ELSE 0 END WHERE (contract_id=? OR sozlesme_no=?) AND is_deleted=0 AND ${pending}`).bind(amount,amount,amount,contract.id,contract.sozlesme_no,id),
      db.prepare("UPDATE payments SET status='Odendi' WHERE id=? AND status='Pending'").bind(id)
    ];
    await db.batch(batchStmts);
    const saved = await db.prepare("SELECT * FROM payments WHERE id=?").bind(id).first();
    if (!saved) return errorResponse("Taksit bakiyesi değişti; tahsilat kaydedilmedi",409,"BALANCE_CHANGED");

    await logAction(db, user, "payment.create", "payment", id, `${student.student_name} · ${amount} ₺ · ${payMethod}`, waitUntil);
    return json({ ...saved, student_name: student.student_name }, 201);
  }

  // Cancellation is shared by the cancel button and DELETE, and retains the payment record.
  const paymentIdMatch = path.match(/^\/payments\/([^\/]+)$/);
  if ((path === "/payments/cancel" && request.method === "POST") || (paymentIdMatch && request.method === "DELETE")) {
    const p = request.method === "DELETE" ? { payment_id: paymentIdMatch[1] } : await request.json().catch(() => ({}));
    let pay = null;
    if (p.payment_id) pay = await db.prepare("SELECT * FROM payments WHERE id=?").bind(p.payment_id).first();
    else {
      const matches=p.installment_id ? (await db.prepare("SELECT * FROM payments WHERE installment_id=? AND COALESCE(is_cancelled,0)=0 ORDER BY created_at DESC LIMIT 2").bind(p.installment_id).all()).results :
        (p.contract_id || p.sozlesme_no) && p.installment_no != null ? (await db.prepare(`SELECT p.* FROM payments p JOIN installments i ON i.id=p.installment_id JOIN contracts c ON c.id=i.contract_id WHERE (c.id=? OR c.sozlesme_no=?) AND i.installment_no=? AND COALESCE(p.is_cancelled,0)=0 ORDER BY p.created_at DESC LIMIT 2`).bind(p.contract_id || "",p.sozlesme_no || "",Number(p.installment_no)).all()).results : [];
      if(matches.length>1)return errorResponse('Bu taksitte birden fazla tahsilat var; iptal edilecek makbuzu seçiniz.',409,'PAYMENT_REQUIRED');
      pay=matches[0];
    }
    if (!pay) return errorResponse("Tahsilat bulunamadı; hiçbir bakiye değiştirilmedi",404,"NOT_FOUND");
    if (pay.is_cancelled) return json({ok:true,cancelled_id:pay.id,already_cancelled:true});
    if (!pay.installment_id || !pay.contract_id) return errorResponse("Eski tahsilatın taksit bağlantısı yok. İptal öncesi bu kayıt uzlaştırılmalı",409,"LEGACY_PAYMENT_UNLINKED");
    const active = "EXISTS (SELECT 1 FROM payments p JOIN contracts c ON c.id=p.contract_id WHERE p.id=? AND COALESCE(p.is_cancelled,0)=0 AND c.durum<>3 AND COALESCE(c.is_deleted,0)=0)";
    await db.batch([
      db.prepare(`UPDATE installments SET paid_amount=MAX(0,ROUND(paid_amount-?,2)),status=CASE WHEN paid_amount-?>=amount THEN 'Odendi' WHEN paid_amount-?>0 THEN 'KismenOdendi' ELSE 'Bekliyor' END,
        payment_date=COALESCE((SELECT payment_date FROM payments WHERE installment_id=installments.id AND id<>? AND COALESCE(is_cancelled,0)=0 ORDER BY created_at DESC,id DESC LIMIT 1),''),
        receipt_no=COALESCE((SELECT id FROM payments WHERE installment_id=installments.id AND id<>? AND COALESCE(is_cancelled,0)=0 ORDER BY created_at DESC,id DESC LIMIT 1),'') WHERE id=? AND ${active}`).bind(pay.amount,pay.amount,pay.amount,pay.id,pay.id,pay.installment_id,pay.id),
      db.prepare(`UPDATE students SET paid_amount=MAX(0,ROUND(paid_amount-?,2)) WHERE id=? AND (COALESCE(sozlesme_no,'')='' OR sozlesme_no=(SELECT sozlesme_no FROM contracts WHERE id=?)) AND ${active}`).bind(pay.amount,pay.student_id,pay.contract_id,pay.id),
      db.prepare(`UPDATE student_incomes SET toplam_tahsilat=MAX(0,ROUND(toplam_tahsilat-?,2)),kalan_alacak=MAX(0,brut_tutar-MAX(0,ROUND(toplam_tahsilat-?,2))),tam_tahsil_edildi_mi=CASE WHEN MAX(0,toplam_tahsilat-?)>=brut_tutar THEN 1 ELSE 0 END WHERE contract_id=? AND ${active}`).bind(pay.amount,pay.amount,pay.amount,pay.contract_id,pay.id),
      db.prepare("UPDATE payments SET is_cancelled=1,status='İptal Edildi' WHERE id=? AND COALESCE(is_cancelled,0)=0 AND EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0)").bind(pay.id,pay.contract_id)
    ]);
    if(!(await db.prepare('SELECT is_cancelled FROM payments WHERE id=?').bind(pay.id).first())?.is_cancelled) return errorResponse('İptal edilmiş sözleşmenin tahsilatını değiştirmeden önce iade/aktarım mutabakatı gerekir',409,'CANCELLED_CONTRACT');
    await logAction(db,user,"payment.cancel","payment",pay.id,"Tahsilat iptal edildi; diğer tahsilatlar korundu",waitUntil);
    return json({ok:true,cancelled_id:pay.id});
  }

  // 4b. POST /payments/:id/send-receipt-email (Cloudflare Email Sending integration)
  const paymentEmailMatch = path.match(/^\/payments\/([^\/]+)\/send-receipt-email$/);
  if (paymentEmailMatch && request.method === "POST") {
    const payId = paymentEmailMatch[1];
    const body = await request.json().catch(() => ({}));

    // Find payment
    const pay = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(payId).first();
    if (!pay) return errorResponse("Tahsilat bulunamadı", 404, "NOT_FOUND");
    if (pay.is_cancelled || pay.status === "İptal Edildi") return errorResponse("İptal edilmiş tahsilat için geçerli makbuz gönderilemez",409,"CANCELLED_PAYMENT");

    // Find student
    const student = await db.prepare("SELECT * FROM students WHERE id = ? OR id = ('stu-' || ?)").bind(pay.student_id, pay.student_id).first();
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
      <p style="font-size: 15px; line-height: 1.5;">Sayın <strong>${escapeHtml(parentName)}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;"><strong>${escapeHtml(studentName)}</strong> isimli öğrencinizin eğitim ücreti ödemesi kurumumuz tarafından tahsil edilmiş ve kayıtlarımıza işlenmiştir.</p>

      <div class="amount-box">
        <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;">TAHSİL EDİLEN TUTAR</div>
        <div class="amount-val">${amountStr}</div>
      </div>

      <div class="row"><span class="label">Makbuz No:</span><span class="val">${escapeHtml(receiptNo)}</span></div>
      <div class="row"><span class="label">Tahsilat Tarihi:</span><span class="val">${escapeHtml(payDate)}</span></div>
      <div class="row"><span class="label">Öğrenci:</span><span class="val">${escapeHtml(studentName)}</span></div>
      <div class="row"><span class="label">Ödeme Yöntemi:</span><span class="val">${escapeHtml(payMethod)}</span></div>
      <div class="row"><span class="label">Açıklama:</span><span class="val">${escapeHtml(pay.note || "Eğitim Dönemi Tahsilatı")}</span></div>
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

    if (!env?.EMAIL || typeof env.EMAIL.send !== "function") return errorResponse("E-posta gönderimi yapılandırılmamış",503,"EMAIL_NOT_CONFIGURED");
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
        return errorResponse("E-posta iletilemedi; tekrar deneyiniz",502,"EMAIL_DELIVERY_FAILED");
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
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) / 100 !== amount) return errorResponse("Geçersiz gider tutarı", 422, "VALIDATION_ERROR");

    const id = e.id || "exp_" + crypto.randomUUID().slice(0, 10);
    if (typeof id !== "string" || !id.trim() || id.length > 120) return errorResponse("Geçersiz gider kimliği",422);
    const values={title:e.title || "Gider",amount,expense_date:e.expense_date || new Date().toISOString().slice(0,10),category:e.category || "Genel",account:e.account || "Nakit Ana Kasa"};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.expense_date) || Number.isNaN(Date.parse(values.expense_date)) || new Date(values.expense_date).toISOString().slice(0,10)!==values.expense_date) return errorResponse("Geçersiz gider tarihi",422);
    const same = saved => Object.entries(values).every(([key,value])=>saved[key]===value);
    const previous=await db.prepare("SELECT * FROM expenses WHERE id=?").bind(id).first();
    if(previous) return same(previous) ? json({...previous,already_recorded:true}) : errorResponse("İşlem kimliği başka giderde kullanılmış",409,"IDEMPOTENCY_CONFLICT");
    await db
      .prepare(
        "INSERT OR IGNORE INTO expenses (id, title, amount, expense_date, category, account, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      )
      .bind(
        id,
        values.title,
        amount,
        values.expense_date,
        values.category,
        values.account,
        user?.user_id || "",
        user?.name || ""
      )
      .run();
    const saved=await db.prepare("SELECT * FROM expenses WHERE id=?").bind(id).first();
    if(!saved || !same(saved)) return errorResponse("İşlem kimliği başka giderde kullanılmış",409,"IDEMPOTENCY_CONFLICT");

    await logAction(db, user, "expense.create", "expense", id, `${e.title} · ${amount} ₺ (${e.account || "Nakit Ana Kasa"})`, waitUntil);
    return json(saved, 201);
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
