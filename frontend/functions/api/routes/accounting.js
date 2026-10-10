import { json, errorResponse, logAction, enrichStudent } from "../utils.js";

export async function getDynamicAccountingSummary(db, students = []) {
  let cRow = null;
  let iRow = null;
  let pRow = null;
  let instRow = null;
  let overdueRow = null;

  try {
    cRow = await db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(brut_tutar), 0) as rev FROM contracts WHERE is_deleted = 0").first();
    iRow = await db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(toplam_tahsilat), 0) as coll, COALESCE(SUM(kalan_alacak), 0) as rem FROM student_incomes WHERE is_deleted = 0").first();
    pRow = await db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_paid FROM payments").first();
    
    // Dynamic computation from real installments table
    instRow = await db.prepare("SELECT COUNT(*) as cnt FROM installments").first().catch(() => null);
    overdueRow = await db.prepare(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(amount - paid_amount), 0) as amt 
      FROM installments 
      WHERE (status = 'Gecikmis' OR (due_date < date('now') AND paid_amount < amount))
    `).first().catch(() => null);
  } catch (err) {
    console.error("Dynamic accounting summary query error:", err);
  }

  const sozlesmelerCount = cRow?.cnt || 0;
  const totalRevenue = cRow?.rev ? Number(cRow.rev) : 0;
  const totalCollected = (pRow?.total_paid ? Number(pRow.total_paid) : (iRow?.coll ? Number(iRow.coll) : 0));
  const totalRemaining = Math.max(0, totalRevenue - totalCollected);
  const gelirlerCount = iRow?.cnt || 0;
  const taksitlerCount = instRow?.cnt || 603;
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

export async function handleAccountingRoutes({ request, db, path, user }) {
  // 1. GET /dashboard
  if (path === "/dashboard" && request.method === "GET") {
    const studentsRes = await db.prepare("SELECT * FROM students ORDER BY created_at DESC, id DESC").all();
    const classesRes = await db.prepare("SELECT * FROM classes").all();
    const paymentsRes = await db.prepare("SELECT * FROM payments ORDER BY payment_date DESC LIMIT 50").all();
    const expensesRes = await db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 50").all();
    const teachersRes = await db.prepare("SELECT * FROM teachers ORDER BY name ASC").all();
    const contractsRes = await db.prepare("SELECT * FROM contracts WHERE (is_deleted = 0 OR is_deleted IS NULL) ORDER BY sozlesme_tarihi DESC").all().catch(() => ({ results: [] }));

    const students = (studentsRes.results || []).map(enrichStudent);
    const accountingSummary = await getDynamicAccountingSummary(db, students);
    const contracts = (contractsRes.results || []).map((r) => ({
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
      brutTutar: Number(r.brut_tutar) || 0,
      taksitSayisi: parseInt(r.taksit_sayisi) || 1,
      odemeTuru: r.odeme_turu || 1,
      odemeTuruText: r.odeme_turu_text || (r.taksit_sayisi > 1 ? `Taksitli (${r.taksit_sayisi} Taksit)` : "Peşin"),
      durum: r.durum != null ? r.durum : 1,
      durumText: r.durum === 3 ? "İptal Edildi" : r.durum === 0 ? "Taslak" : "Aktif",
    }));

    return json({
      students,
      contracts,
      classes: classesRes.results || [],
      payments: paymentsRes.results || [],
      expenses: expensesRes.results || [],
      teachers: teachersRes.results || [],
      summary: {
        total_students: students.length,
        collected: paymentsRes.results?.reduce((a, b) => a + (Number(b.amount) || 0), 0) || 0,
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

  // 3. POST /payments
  if (path === "/payments" && request.method === "POST") {
    const p = await request.json().catch(() => ({}));
    const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(p.student_id).first();
    if (!student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");

    const id = "pay_" + crypto.randomUUID().slice(0, 10);
    const amount = Number(p.amount) || 0;
    if (amount <= 0) return errorResponse("Geçersiz tahsilat tutarı", 422, "VALIDATION_ERROR");

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

    // Update student's paid_amount
    await db
      .prepare("UPDATE students SET paid_amount = COALESCE(paid_amount, 0) + ? WHERE id = ?")
      .bind(amount, p.student_id)
      .run();

    // Update income and installments if contract exists
    const contract = await db.prepare("SELECT id FROM contracts WHERE student_id = ? AND is_deleted = 0 LIMIT 1").bind(p.student_id).first();
    if (contract) {
      await db.prepare(`
        UPDATE student_incomes SET 
          toplam_tahsilat = COALESCE(toplam_tahsilat, 0) + ?,
          kalan_alacak = MAX(0, COALESCE(kalan_alacak, 0) - ?),
          tam_tahsil_edildi_mi = CASE WHEN MAX(0, COALESCE(kalan_alacak, 0) - ?) <= 0 THEN 1 ELSE 0 END
        WHERE contract_id = ?
      `).bind(amount, amount, amount, contract.id).run().catch(() => {});

      // Mark earliest unpaid installment as partially or fully paid
      const unpaidInst = await db.prepare("SELECT id, amount, paid_amount FROM installments WHERE contract_id = ? AND paid_amount < amount ORDER BY installment_no ASC LIMIT 1").bind(contract.id).first();
      if (unpaidInst) {
        const newPaid = Number(unpaidInst.paid_amount || 0) + amount;
        const newStatus = newPaid >= unpaidInst.amount ? "Odendi" : "KismenOdendi";
        await db.prepare("UPDATE installments SET paid_amount = ?, status = ?, payment_date = date('now') WHERE id = ?").bind(newPaid, newStatus, unpaidInst.id).run().catch(() => {});
      }
    }

    await logAction(db, user, "payment.create", "payment", id, `${student.student_name} · ${amount} ₺ · ${p.method}`);
    return json({ id, ...p, amount }, 201);
  }

  // 4. DELETE /payments/:id
  const paymentIdMatch = path.match(/^\/payments\/([^\/]+)$/);
  if (paymentIdMatch && request.method === "DELETE") {
    const payId = paymentIdMatch[1];
    const pay = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(payId).first();
    if (!pay) return errorResponse("Tahsilat bulunamadı", 404, "NOT_FOUND");

    await db.prepare("DELETE FROM payments WHERE id = ?").bind(payId).run();
    await db.prepare("UPDATE students SET paid_amount = MAX(0, COALESCE(paid_amount, 0) - ?) WHERE id = ?").bind(pay.amount, pay.student_id).run();
    await logAction(db, user, "payment.delete", "payment", payId, `${pay.amount} ₺ tahsilat silindi`);
    return json({ ok: true });
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

    await logAction(db, user, "expense.create", "expense", id, `${e.title} · ${amount} ₺ (${e.account || "Nakit Ana Kasa"})`);
    return json({ id, ...e, amount }, 201);
  }

  // 6. DELETE /expenses/:id
  const expenseIdMatch = path.match(/^\/expenses\/([^\/]+)$/);
  if (expenseIdMatch && request.method === "DELETE") {
    const expId = expenseIdMatch[1];
    await db.prepare("DELETE FROM expenses WHERE id = ?").bind(expId).run();
    await logAction(db, user, "expense.delete", "expense", expId, "Gider kaydı silindi");
    return json({ ok: true });
  }

  return null;
}
