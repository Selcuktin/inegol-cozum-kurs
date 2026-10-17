import { json, errorResponse, logAction, getNextSequence, normalizeDate, recordWriteGuard } from "../utils.js";
import { generateContractInstallments } from "../../../src/lib/installmentService.js";

const planSnapshot=rows=>JSON.stringify(rows.map(i=>[Number(i.installment_no??i.taksitNo),Number(i.taksitTutari??i.amount),Number(i.tahsilEdilen??i.paid_amount??0),normalizeDate(i.vadeTarihi||i.due_date)]).sort((a,b)=>a[0]-b[0]));

// D1 batches roll back on SQL errors. Abort the whole batch if a concurrent write changed its input.
function unchangedPlan(db,contract,previous){
  return db.prepare(`SELECT CASE WHEN
    EXISTS(SELECT 1 FROM contracts WHERE id=? AND brut_tutar=? AND taksit_sayisi=? AND durum<>3 AND COALESCE(is_deleted,0)=0)
    AND (SELECT COUNT(*) FROM installments WHERE contract_id=?)=json_array_length(?)
    AND NOT EXISTS(SELECT 1 FROM json_each(?) p LEFT JOIN installments i ON i.contract_id=? AND i.installment_no=json_extract(p.value,'$[0]') WHERE i.id IS NULL OR i.amount<>json_extract(p.value,'$[1]') OR i.paid_amount<>json_extract(p.value,'$[2]') OR i.due_date<>json_extract(p.value,'$[3]'))
    THEN 1 ELSE json_extract('{}','PAYMENT_PLAN_CHANGED') END`).bind(contract.id,contract.brut_tutar,contract.taksit_sayisi,contract.id,planSnapshot(previous),planSnapshot(previous),contract.id);
}

// Shared bulk write avoids D1's query/parameter ceilings for long plans.
export function installmentWrite(db, plan, contractId, incomeId, studentId, count) {
  return db.prepare(`INSERT INTO installments(id,contract_id,income_id,student_id,installment_no,total_installments,due_date,amount,paid_amount,status,created_at)
    SELECT json_extract(value,'$.id'),?,?,?,json_extract(value,'$.installment_no'),?,json_extract(value,'$.due_date'),json_extract(value,'$.amount'),0,'Bekliyor',datetime('now') FROM json_each(?) WHERE EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0)
    ON CONFLICT(contract_id,installment_no) DO UPDATE SET amount=excluded.amount,due_date=excluded.due_date,total_installments=excluded.total_installments,status=CASE WHEN installments.paid_amount>=excluded.amount THEN 'Odendi' WHEN installments.paid_amount>0 THEN 'KismenOdendi' ELSE 'Bekliyor' END`).bind(contractId,incomeId,studentId,count,JSON.stringify(plan),contractId);
}

// Both student editing and contract editing must update the same financial records.
export async function getContractUpdateStatements(db, row, patch, syncStudent = true, regeneratePlan = true) {
  if (row.durum === 3) return { error: errorResponse('İptal edilmiş sözleşmenin mali planı değiştirilemez',409,'CANCELLED_CONTRACT') };
  const gross = Number(patch.brutTutar ?? row.brut_tutar);
  const count = Number(patch.taksitSayisi ?? row.taksit_sayisi);
  if (!Number.isFinite(gross) || gross < 0 || !Number.isInteger(count) || count < 1 || count > 120 || (patch.due_date && !normalizeDate(patch.due_date))) return { error: errorResponse("Geçersiz tutar, taksit sayısı veya tarih", 422, "VALIDATION_ERROR") };
  const old = (await db.prepare("SELECT * FROM installments WHERE contract_id = ? ORDER BY installment_no").bind(row.id).all()).results || [];
  const changed = gross !== Number(row.brut_tutar) || count !== Number(row.taksit_sayisi) || !!patch.due_date;
  const taxFactor = Number(row.net_tutar)>0 && Number(row.brut_tutar)>0 ? Number(row.brut_tutar)/Number(row.net_tutar) : 1.1;
  const net = Math.round(gross / taxFactor * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;
  const active="EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0)";
  const statements = [db.prepare("UPDATE contracts SET brut_tutar=?, net_tutar=?, kdv_tutari=?, taksit_sayisi=?, odeme_turu=?, odeme_turu_text=?, sozlesme_tarihi=? WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0").bind(gross, net, vat, count, count > 1 ? 1 : 2, count > 1 ? `Taksitli (${count} Taksit)` : "Peşin", patch.sozlesmeTarihi || row.sozlesme_tarihi, row.id)];
  if(regeneratePlan)statements.unshift(unchangedPlan(db,row,old));
  if (changed && regeneratePlan) {
    const income = await db.prepare("SELECT id FROM student_incomes WHERE contract_id=? AND is_deleted=0 LIMIT 1").bind(row.id).first();
    const firstDue = normalizeDate(patch.due_date || old[0]?.due_date || row.sozlesme_tarihi);
    const plan = generateContractInstallments({ ...row, brut_tutar: gross, taksit_sayisi: count }, { startDate: firstDue || new Date().toISOString(), dueDay: firstDue ? Number(firstDue.slice(8, 10)) : 15 });
    if (old.some(i => Number(i.paid_amount) > (plan.find(p => p.installment_no === i.installment_no)?.amount ?? 0))) return { error: errorResponse("Yeni plan tahsil edilmiş taksitleri azaltamaz veya kaldıramaz", 409, "PAID_INSTALLMENT") };
    statements.push(db.prepare(`DELETE FROM installments WHERE contract_id=? AND installment_no>? AND paid_amount=0 AND ${active}`).bind(row.id,count,row.id));
    statements.push(installmentWrite(db,plan,row.id,income?.id || "",row.student_id,count));
  }
  statements.push(db.prepare(`UPDATE student_incomes SET brut_tutar=?,net_tutar=?,kdv_tutari=?,taksit_sayisi=?,kalan_alacak=MAX(0,?-toplam_tahsilat),tam_tahsil_edildi_mi=CASE WHEN toplam_tahsilat>=? THEN 1 ELSE 0 END WHERE (contract_id=? OR sozlesme_no=?) AND ${active}`).bind(gross,net,vat,count,gross,gross,row.id,row.sozlesme_no,row.id));
  if (syncStudent) statements.push(db.prepare(`UPDATE students SET total_fee=MAX(0,?-COALESCE((SELECT SUM(CAST(value AS REAL)) FROM json_each(CASE WHEN json_valid(extra_fees) THEN extra_fees ELSE '{}' END)),0)+COALESCE(discount_amount,0)),installment_count=? WHERE id=? AND (COALESCE(sozlesme_no,'')='' OR sozlesme_no=?) AND ${active}`).bind(gross,count,row.student_id,row.sozlesme_no,row.id));
  return { statements };
}

export async function handleContractsRoutes({ request, db, url, path, user, waitUntil }) {
  const noteMatch=path.match(/^\/(contracts|student-incomes)\/([^/]+)\/notes$/);
  if(noteMatch && request.method==='POST'){
    const table=noteMatch[1]==='contracts'?'contracts':'student_incomes';
    const code=table==='contracts'?'sozlesme_no':'gelir_kodu';
    const body=await request.json().catch(()=>({}));
    if(typeof body?.text!=='string' || !body.text.trim() || body.text.length>2000) return errorResponse('Not 1–2000 karakter olmalıdır',422,'VALIDATION_ERROR');
    const key=decodeURIComponent(noteMatch[2]);
    const row=await db.prepare(`SELECT id FROM ${table} WHERE (id=? OR ${code}=?) AND COALESCE(is_deleted,0)=0`).bind(key,key).first();
    if(!row) return errorResponse('Kayıt bulunamadı',404,'NOT_FOUND');
    const text=body.text.trim();
    const saved=await db.prepare(`UPDATE ${table} SET notes=CASE WHEN COALESCE(notes,'')='' THEN ? ELSE notes||char(10)||? END WHERE id=? AND length(COALESCE(notes,''))+length(?)+1<=20000 RETURNING notes`).bind(text,text,row.id,text).first();
    if(!saved) return errorResponse('Not alanı dolu; kayıt değiştirilmedi',409,'NOTES_LIMIT');
    await logAction(db,user,'note.create',table,row.id,'Not eklendi',waitUntil);
    return json({id:row.id,notes:saved.notes},201);
  }
  // 1. GET /contracts
  if (path === "/contracts" && request.method === "GET") {
    const period = url.searchParams.get("period_id") || url.searchParams.get("period");
    const studentId = url.searchParams.get("student_id");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    let query = `
      SELECT c.*,
        COALESCE(NULLIF(c.parent_name, ''), s.parent_name) as resolved_parent_name,
        COALESCE(NULLIF(c.parent_phone, ''), s.parent_phone) as resolved_parent_phone,
        COALESCE(NULLIF(c.student_class, ''), s.student_class) as resolved_student_class,
        COALESCE(NULLIF(c.student_name, ''), s.student_name) as resolved_student_name,
        s.student_tc as resolved_student_tc,
        s.student_tc,
        s.parent_tc,
        s.id as student_full_id,
        COALESCE((SELECT MAX(i.toplam_tahsilat) FROM student_incomes i WHERE (i.contract_id=c.id OR i.sozlesme_no=c.sozlesme_no) AND COALESCE(i.is_deleted,0)=0),(SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.contract_id = c.id AND (p.is_cancelled = 0 OR p.is_cancelled IS NULL)) ) as calculated_paid
      FROM contracts c
      LEFT JOIN students s ON (
        c.student_id = s.id
        OR c.student_id = REPLACE(s.id, 'stu-', '')
        OR ('stu-' || c.student_id) = s.id
      )
      WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
    `;
    const params = [];
    if (period && period !== "-1") {
      query += " AND c.period_id = ?";
      params.push(parseInt(period) || 113);
    }
    if (studentId) {
      query += " AND (c.student_id = ? OR c.student_id = REPLACE(?, 'stu-', '') OR s.id = ?)";
      params.push(studentId, studentId, studentId);
    }
    if (status === "active") {
      query += " AND c.durum = 1";
    } else if (status === "draft") {
      query += " AND c.durum = 0";
    } else if (status === "cancelled") {
      query += " AND c.durum = 3";
    }
    if (search) {
      query += " AND (c.sozlesme_no LIKE ? OR c.student_name LIKE ? OR c.student_class LIKE ? OR s.student_tc LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += " ORDER BY c.sozlesme_tarihi DESC, c.id DESC";

    try {
      const res = await db.prepare(query).bind(...params).all();
      const rows = (res.results || []).map(r => {
        const gross = Number(r.brut_tutar || 0);
        const paid = Number(r.calculated_paid !== undefined ? r.calculated_paid : 0);
        const remaining = r.durum === 3 ? 0 : Math.max(0, gross - paid);
        const parentName = r.resolved_parent_name || r.parent_name || "";
        const parentPhone = r.resolved_parent_phone || r.parent_phone || "";
        const studentTc = r.resolved_student_tc || r.student_tc || "";
        const studentName = r.resolved_student_name || r.student_name || "";
        const studentClass = r.resolved_student_class || r.student_class || "";
        return {
          ...r,
          student_tc: studentTc,
          studentTc: studentTc,
          parent_tc: r.parent_tc || "",
          parentTc: r.parent_tc || "",
          studentId: r.student_full_id || r.student_id,
          ogrenciId: r.student_full_id || r.student_id,
          student_name: studentName,
          sozlesmeNo: r.sozlesme_no,
          sozlesme_no: r.sozlesme_no,
          sozlesmeTarihi: r.sozlesme_tarihi,
          sozlesme_tarihi: r.sozlesme_tarihi,
          ogrenciAdi: studentName,
          ogrenciAdiSoyadi: studentName,
          ogrenciNo: r.student_no,
          student_no: r.student_no,
          sinifAdi: studentClass,
          student_class: studentClass,
          veliAdi: parentName,
          parent_name: parentName,
          veliTelefon: parentPhone,
          parent_phone: parentPhone,
          donemId: r.period_id,
          donemAdi: r.period_name,
          netTutar: r.net_tutar,
          kdvTutari: r.kdv_tutari,
          brutTutar: gross,
          brut_tutar: gross,
          toplamTahsilat: paid,
          toplam_tahsilat: paid,
          kalanAlacak: remaining,
          kalan_alacak: remaining,
          odemeTuru: r.odeme_turu,
          odemeTuruText: r.odeme_turu_text,
          taksitSayisi: r.taksit_sayisi,
          taksit_sayisi: r.taksit_sayisi,
          durum: r.durum,
          durumText: r.durum === 1 ? "Aktif" : r.durum === 3 ? "İptal Edildi" : "Taslak",
          durumRenk: r.durum === 1 ? "success" : r.durum === 3 ? "danger" : "warning",
          isSigned: !!(r.is_signed || r.kurum_imza_alindi || r.veli_imza_alindi),
          veliImzaAlindi: !!r.veli_imza_alindi,
          kurumImzaAlindi: !!r.kurum_imza_alindi,
          kurumImzalayan: r.kurum_imzalayan,
          signedAt: r.signed_at,
          sozlesmeUrl: r.sozlesme_url
        };
      });
      return json(rows);
    } catch (err) {
      throw err;
    }
  }

  // 2. POST /contracts (Creates contract, student_income, and installments via atomic sequences)
  if (path === "/contracts" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const studentName = String(body.student_name || body.ogrenciAdi || "").trim();
    if (!studentName) return errorResponse("Öğrenci adı zorunludur", 422, "VALIDATION_ERROR");

    const brutTutar = (body.total_amount !== undefined && body.total_amount !== null && body.total_amount !== "")
      ? Number(body.total_amount)
      : (body.brutTutar !== undefined && body.brutTutar !== null && body.brutTutar !== "")
        ? Number(body.brutTutar)
        : 75000;
    const taksitSayisi = Number(body.installment_count ?? body.taksitSayisi ?? 10);
    const netTutar = Math.round((brutTutar / 1.1) * 100) / 100;
    const kdvTutari = Math.round((brutTutar - netTutar) * 100) / 100;

    if (!Number.isFinite(brutTutar) || brutTutar<0 || !Number.isInteger(taksitSayisi) || taksitSayisi < 1 || taksitSayisi > 120 || (body.due_date && !normalizeDate(body.due_date))) return errorResponse("Geçersiz tutar, taksit veya vade", 422, "VALIDATION_ERROR");
    const studentId = body.student_id ? String(body.student_id) : "student-" + crypto.randomUUID().slice(0, 8);
    const student = await db.prepare("SELECT * FROM students WHERE id=?").bind(studentId).first();
    if (body.student_id && !student) return errorResponse("Öğrenci bulunamadı", 404, "NOT_FOUND");
    const statements = [];
    const periodId=body.period_id||113;
    if (!student) statements.push(db.prepare("INSERT INTO students(id,student_name,parent_name,total_fee,installment_count,program) VALUES(?,?,?,?,?,'2026-2027')").bind(studentId,studentName,body.parent_name || "",brutTutar,taksitSayisi));

    // Reuse existing active contract strictly by student_id or sozlesme_no
    const existingContract = await db.prepare(`
      SELECT * FROM contracts
      WHERE ((student_id = ? AND student_id != '') OR (sozlesme_no = ? AND sozlesme_no != ''))
        AND (is_deleted = 0 OR is_deleted IS NULL) AND durum<>3 AND period_id=?
      LIMIT 1
    `).bind(studentId, body.sozlesme_no || "",periodId).first();

    if(existingContract&&(Number(existingContract.brut_tutar)!==brutTutar||Number(existingContract.taksit_sayisi)!==taksitSayisi))return errorResponse('Bu dönem için aktif sözleşme zaten var. Tutarı mevcut sözleşmenin düzenleme ekranından değiştirin.',409,'ACTIVE_CONTRACT_EXISTS');
    if (existingContract) return json({ ...existingContract, sozlesmeNo: existingContract.sozlesme_no, brutTutar: existingContract.brut_tutar, taksitSayisi: existingContract.taksit_sayisi }, 201);

    let sozlesmeNo = existingContract?.sozlesme_no || body.sozlesme_no || body.sozlesmeNo;
    let id = existingContract?.id || "cnt_" + crypto.randomUUID().slice(0, 10);

    if (!sozlesmeNo) {
      sozlesmeNo = await getNextSequence(db, "SZL_2026", "SZL2026", 5, 153);
    }
    const date = body.sozlesme_tarihi || body.contract_date || new Date().toISOString();
    const periodName = body.period_name || "2026-2027";
    const parentName = body.parent_name || body.parentName || "";
    const parentPhone = body.parent_phone || body.parentPhone || "";
    const studentClass = body.student_class || body.sinifAdi || "8-A";

    statements.push(db.prepare(`
      INSERT INTO contracts (
        id, sozlesme_no, student_id, student_name, student_no, student_class,
        parent_name, parent_phone, period_id, period_name, net_tutar, kdv_tutari, brut_tutar,
        odeme_turu, odeme_turu_text, taksit_sayisi, durum, is_signed, veli_imza_alindi,
        kurum_imza_alindi, sozlesme_tarihi, created_at, created_by, is_deleted
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        1, ?, ?, 1, 0, 0,
        0, ?, datetime('now'), ?, 0
      )
    `).bind(
      id, sozlesmeNo, studentId, studentName, body.student_no || "", studentClass,
      parentName, parentPhone, periodId, periodName, netTutar, kdvTutari, brutTutar,
      `Taksitli (${taksitSayisi} Taksit)`, taksitSayisi, date, user?.name || "Yönetici"
    ));

    statements.unshift(db.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM contracts WHERE student_id=? AND period_id=? AND durum<>3 AND COALESCE(is_deleted,0)=0) THEN 1 ELSE json_extract('{}','RECORD_CHANGED') END").bind(studentId,periodId));
    if(student){const guard=recordWriteGuard(db,'students',student,undefined,['sozlesme_no','total_fee','extra_fees','discount_amount','installment_count','paid_amount']);statements.unshift(guard.statement);}

    // Atomic income code
    const gelirKodu = await getNextSequence(db, "GLR_2026", "GLR2026", 5, 158);
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
        0, ?, 0, ?, ?,
        1, ?, ?, 1, datetime('now'), 0
      )
    `).bind(
      glrId, gelirKodu, id, sozlesmeNo, studentId, studentName, body.student_no || "", studentClass,
      studentName, `Sözleşme: ${sozlesmeNo}`, periodId, periodName, netTutar, kdvTutari, brutTutar,
      brutTutar, date, body.due_date || date, taksitSayisi, taksitSayisi
    ));

    // Atomically insert installments with strict UNIQUE(contract_id, installment_no)
    const firstDue = normalizeDate(body.due_date || date);
    const plan = generateContractInstallments({id,student_id:studentId,brut_tutar:brutTutar,taksit_sayisi:taksitSayisi},{startDate:firstDue,dueDay:Number(firstDue.slice(8,10))});
    statements.push(installmentWrite(db,plan,id,glrId,studentId,taksitSayisi));
    statements.push(db.prepare("UPDATE students SET sozlesme_no=?,total_fee=MAX(0,?-COALESCE((SELECT SUM(CAST(value AS REAL)) FROM json_each(CASE WHEN json_valid(extra_fees) THEN extra_fees ELSE '{}' END)),0)+COALESCE(discount_amount,0)),paid_amount=0,installment_count=?,due_date=? WHERE id=?").bind(sozlesmeNo,brutTutar,taksitSayisi,firstDue,studentId));
    await db.batch(statements);

    await logAction(db, user, "contract.create", "contract", id, `${studentName} · ${sozlesmeNo} · ${brutTutar} ₺`, waitUntil);

    return json({
      id,
      sozlesmeNo,
      sozlesme_no: sozlesmeNo,
      student_id: studentId,
      student_name: studentName,
      ogrenciAdi: studentName,
      brutTutar,
      netTutar,
      kdvTutari,
      taksitSayisi,
      isSigned: false,
      veliImzaAlindi: false,
      kurumImzaAlindi: false,
    }, 201);
  }

  // 3. GET /contracts/deleted-keys
  if (path === "/contracts/deleted-keys" && request.method === "GET") {
    try {
      const rows = await db.prepare("SELECT id, sozlesme_no, student_id, student_name FROM contracts WHERE is_deleted = 1").all();
      return json((rows.results || []).map(r => r.sozlesme_no || r.id));
    } catch (err) {
      throw err;
    }
  }

  const cancelMatch=path.match(/^\/contracts\/([^/]+)\/cancel$/);
  if(cancelMatch && request.method==='POST'){
    const key=decodeURIComponent(cancelMatch[1]);
    const body=await request.json().catch(()=>({}));
    if(typeof body?.reason!=='string'||body.reason.trim().length<5||body.reason.length>2000) return errorResponse('İptal nedeni 5–2000 karakter olmalıdır',422,'VALIDATION_ERROR');
    const row=await db.prepare('SELECT * FROM contracts WHERE (id=? OR sozlesme_no=?) AND COALESCE(is_deleted,0)=0').bind(key,key).first();
    if(!row)return errorResponse('Sözleşme bulunamadı',404,'NOT_FOUND');
    if(row.durum===3)return json({ok:true,contract:row,already_cancelled:true});
    await db.batch([
      db.prepare("UPDATE contracts SET durum=3,iptal_nedeni=?,iptal_tarihi=date('now','+3 hours') WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0").bind(body.reason.trim(),row.id),
      db.prepare('UPDATE student_incomes SET durum=4,kalan_alacak=0 WHERE (contract_id=? OR sozlesme_no=?) AND COALESCE(is_deleted,0)=0 AND EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum=3)').bind(row.id,row.sozlesme_no,row.id)
    ]);
    await logAction(db,user,'contract.cancel','contract',row.id,`${row.sozlesme_no} iptal edildi; tahsilat geçmişi korundu`,waitUntil);
    return json({ok:true,contract:await db.prepare('SELECT * FROM contracts WHERE id=?').bind(row.id).first()});
  }

  // 4. POST /contracts/:id/sign
  const contractSignMatch = path.match(/^\/contracts\/([^\/]+)\/sign$/);
  if (contractSignMatch && request.method === "POST") {
    const targetId = contractSignMatch[1];
    const body = await request.json().catch(() => ({}));
    const signerType = body.signer_type || "kurum";
    const signerName = body.signer_name || user?.name || "Kurum Yetkilisi";

    const row = await db.prepare("SELECT * FROM contracts WHERE (id = ? OR sozlesme_no = ?) AND is_deleted = 0").bind(targetId, targetId).first();
    if (!row) return errorResponse("Sözleşme bulunamadı", 404, "NOT_FOUND");
    if (row.durum===3) return errorResponse('İptal edilmiş sözleşme imzalanamaz',409,'CANCELLED_CONTRACT');

    if (signerType === "kurum") {
      await db.prepare(`
        UPDATE contracts SET
          kurum_imza_alindi = 1,
          kurum_imzalayan = ?,
          kurum_imzalayan_unvan = 'Kurum Müdürü / Yetkilisi',
          signed_at = datetime('now'),
          is_signed = 1
        WHERE id = ? OR sozlesme_no = ?
      `).bind(signerName, targetId, targetId).run();
    } else {
      await db.prepare(`
        UPDATE contracts SET
          veli_imza_alindi = 1,
          signed_at = datetime('now'),
          is_signed = 1
        WHERE id = ? OR sozlesme_no = ?
      `).bind(targetId, targetId).run();
    }

    await logAction(db, user, "contract.sign", "contract", row.id, `${row.sozlesme_no} sözleşmesi ${signerName} tarafından imzalandı`, waitUntil);
    const updated = await db.prepare("SELECT * FROM contracts WHERE id = ?").bind(row.id).first();
    return json({ success: true, contract: updated, is_signed: true, isSigned: true, kurumImzaAlindi: true });
  }

  // 5. GET /contracts/:id/installments
  const contractInstMatch = path.match(/^\/contracts\/([^\/]+)\/installments$/);
  if (contractInstMatch && request.method === "GET") {
    const contractId = contractInstMatch[1];
    try {
      const res = await db.prepare(`
        SELECT i.*, c.durum AS contract_status, COALESCE(c.student_name, '') as student_name, COALESCE(c.sozlesme_no, '') as sozlesme_no
        FROM installments i
        LEFT JOIN contracts c ON (i.contract_id = c.id OR i.contract_id = c.sozlesme_no)
        WHERE (i.contract_id = ? OR c.id = ? OR c.sozlesme_no = ?)
          AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
        ORDER BY i.installment_no ASC
      `).bind(contractId, contractId, contractId).all();
      const rows = (res.results || []).map(r => ({
        ...r,
        id: r.id,
        sozlesmeNo: r.sozlesme_no,
        ogrenciAdi: r.student_name,
        taksitNo: r.installment_no,
        taksitTutari: r.amount,
        vadeTarihi: normalizeDate(r.due_date),
        tahsilEdilen: r.paid_amount,
        kalanTutar: r.contract_status===3 ? 0 : Math.max(0, r.amount - (r.paid_amount || 0)),
        durumText: r.contract_status===3 ? 'İptal Edildi' : r.status,
      }));
      return json(rows);
    } catch (err) {
      throw err;
    }
  }

  // 6. DELETE & PATCH /contracts/:id
  const contractIdMatch = path.match(/^\/contracts\/([^\/]+)$/);
  if (contractIdMatch) {
    const contractId = contractIdMatch[1];

    if (request.method === "DELETE") {
      const decodedKey = decodeURIComponent(contractId);
      const row = await db.prepare(`
        SELECT * FROM contracts
        WHERE (id = ? OR sozlesme_no = ? OR student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ?)
          AND (is_deleted = 0 OR is_deleted IS NULL)
        LIMIT 1
      `).bind(decodedKey, decodedKey, decodedKey, decodedKey, decodedKey).first();

      if (!row) {
        // Idempotent: already deleted or not found
        return json({ success: true, ok: true, already_deleted: true });
      }

      const paid = await db.prepare("SELECT COUNT(*) AS n FROM payments WHERE contract_id=? AND COALESCE(is_cancelled,0)=0").bind(row.id).first();
      if (paid?.n) return errorResponse("Tahsilatı olan sözleşme silinemez; önce ilgili tahsilatı iptal edin", 409, "PAYMENT_EXISTS");
      await db.batch([
        db.prepare("UPDATE contracts SET is_deleted=1,durum=3 WHERE id=?").bind(row.id),
        db.prepare("UPDATE student_incomes SET is_deleted=1 WHERE contract_id=? OR sozlesme_no=?").bind(row.id,row.sozlesme_no)
      ]);

      await logAction(db, user, "contract.delete", "contract", row.id, `${row.sozlesme_no} sözleşmesi ve ilişkili tüm kayıtlar silindi`, waitUntil);
      return json({ success: true, ok: true, deleted_id: row.id, deleted_sozlesme: row.sozlesme_no });
    }

    if (request.method === "PATCH") {
      const row = await db.prepare("SELECT * FROM contracts WHERE (id = ? OR sozlesme_no = ?)").bind(contractId, contractId).first();
      if (!row) return errorResponse("Sözleşme bulunamadı", 404, "NOT_FOUND");

      const patch = await request.json().catch(() => ({}));
      const financial = await getContractUpdateStatements(db, row, patch);
      if (financial.error) return financial.error;
      await db.batch(financial.statements);
      const updatedRow = await db.prepare("SELECT * FROM contracts WHERE id = ?").bind(row.id).first();
      if(updatedRow.durum===3)return errorResponse('Sözleşme iptal edildi; değişiklik kaydedilmedi',409,'CANCELLED_CONTRACT');
      await logAction(db, user, "contract.update", "contract", row.id, `${row.sozlesme_no} güncellendi`, waitUntil);
      return json({
        ...updatedRow,
        sozlesmeNo: updatedRow.sozlesme_no,
        ogrenciAdi: updatedRow.student_name,
        brutTutar: updatedRow.brut_tutar,
        netTutar: updatedRow.net_tutar,
        kdvTutari: updatedRow.kdv_tutari,
      });
    }

    if (request.method === "GET") {
      const row = await db.prepare("SELECT * FROM contracts WHERE (id = ? OR sozlesme_no = ?) AND (is_deleted = 0 OR is_deleted IS NULL)").bind(contractId, contractId).first();
      if (!row) return errorResponse("Sözleşme bulunamadı", 404, "NOT_FOUND");
      const instRes = await db.prepare(`
        SELECT i.*, c.durum AS contract_status, COALESCE(c.student_name, '') as student_name, COALESCE(c.sozlesme_no, '') as sozlesme_no
        FROM installments i
        LEFT JOIN contracts c ON (i.contract_id = c.id OR i.contract_id = c.sozlesme_no)
        WHERE (i.contract_id = ? OR c.id = ? OR c.sozlesme_no = ?)
          AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
        ORDER BY i.installment_no ASC
      `).bind(contractId, contractId, contractId).all();
      const installments = (instRes.results || []).map(r => ({
        ...r,
        id: r.id,
        sozlesmeNo: row.sozlesme_no,
        ogrenciAdi: row.student_name,
        taksitNo: r.installment_no,
        taksitTutari: r.amount,
        vadeTarihi: normalizeDate(r.due_date),
        tahsilEdilen: r.paid_amount,
        kalanTutar: row.durum===3 ? 0 : Math.max(0, r.amount - (r.paid_amount || 0)),
        durumText: row.durum===3 ? 'İptal Edildi' : r.status,
      }));
      return json({
        ...row,
        sozlesmeNo: row.sozlesme_no,
        ogrenciAdi: row.student_name,
        brutTutar: row.brut_tutar,
        installments,
      });
    }
  }

  // 7. GET /installments (SSOT)
  if (path === "/installments" && request.method === "GET") {
    const contractId = url.searchParams.get("contract_id");
    const studentId = url.searchParams.get("student_id");
    const status = url.searchParams.get("status");
    const period = url.searchParams.get("period_id");

    let query = "SELECT i.*, c.durum AS contract_status, c.student_name, c.sozlesme_no, c.period_id,c.period_name FROM installments i JOIN contracts c ON i.contract_id = c.id WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)";
    const params = [];

    if (contractId) {
      query += " AND (i.contract_id = ? OR c.sozlesme_no = ?)";
      params.push(contractId, contractId);
    }
    if (studentId) {
      query += " AND i.student_id = ?";
      params.push(studentId);
    }
    if (status) {
      query += " AND i.status = ?";
      params.push(status);
    }
    if (period && period !== "-1") {
      query += " AND c.period_id = ?";
      params.push(parseInt(period) || 113);
    }
    query += " ORDER BY i.due_date ASC, i.installment_no ASC";

    try {
      const res = await db.prepare(query).bind(...params).all();
      const rows = (res.results || []).map(r => ({
        ...r,
        id: r.id,
        sozlesmeNo: r.sozlesme_no,
        ogrenciAdi: r.student_name,
        ogrenciAdiSoyadi: r.student_name,
        ogrenciId: r.student_id,
        taksitNo: r.installment_no,
        taksitTutari: r.amount,
        vadeTarihi: normalizeDate(r.due_date),
        tahsilEdilen: r.paid_amount,
        kalanTutar: r.contract_status===3 ? 0 : Math.max(0, r.amount - (r.paid_amount || 0)),
        durumText: r.contract_status===3 ? 'İptal Edildi' : r.status,
        toplamTutar: r.amount,
      }));
      return json(rows);
    } catch (err) {
      throw err;
    }
  }

  // 8. GET /student-incomes
  if (path === "/student-incomes" && request.method === "GET") {
    const period = url.searchParams.get("period_id") || url.searchParams.get("period");
    const studentId = url.searchParams.get("student_id");
    const search = url.searchParams.get("search");

    let query = "SELECT * FROM student_incomes WHERE (is_deleted = 0 OR is_deleted IS NULL)";
    const params = [];
    if (period && period !== "-1") {
      query += " AND period_id = ?";
      params.push(parseInt(period) || 113);
    }
    if (studentId) {
      query += " AND student_id = ?";
      params.push(studentId);
    }
    if (search) {
      query += " AND (gelir_kodu LIKE ? OR sozlesme_no LIKE ? OR student_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += " ORDER BY gelir_tarihi DESC, id DESC";

    try {
      const res = await db.prepare(query).bind(...params).all();
      const rows = (res.results || []).map(r => ({
        ...r,
        gelirKodu: r.gelir_kodu,
        sozlesmeNo: r.sozlesme_no,
        ogrenciAdi: r.student_name,
        ogrenciAdiSoyadi: r.student_name,
        ogrenciNo: r.student_no,
        ogrenciId: r.student_id,
        sinifAdi: r.student_class,
        musteriUnvan: r.musteri_unvan,
        brutTutar: r.brut_tutar,
        netTutar: r.net_tutar,
        kdvTutari: r.kdv_tutari,
        toplamTahsilat: r.toplam_tahsilat,
        kalanAlacak: r.kalan_alacak,
        tamTahsilEdildiMi: !!r.tam_tahsil_edildi_mi,
        gelirTarihi: r.gelir_tarihi,
        vadeTarihi: normalizeDate(r.vade_tarihi),
        taksitSayisi: r.taksit_sayisi,
        kalanTaksitSayisi: r.kalan_taksit_sayisi,
        aciklama: r.title,
        donemId: r.period_id,
        donemAdi: r.period_name
      }));
      return json(rows);
    } catch (err) {
      throw err;
    }
  }

  // 9. PUT /contracts/:id/installments (Persist batch installment updates to D1)
  const instMatch = path.match(/^\/contracts\/([^\/]+)\/installments$/);
  if (instMatch && (request.method === "PUT" || request.method === "POST")) {
    const rawId = decodeURIComponent(instMatch[1]);
    const body = await request.json().catch(() => ({}));
    const installments = Array.isArray(body) ? body : (body?.installments || []);

    const contract = await db.prepare(`
      SELECT * FROM contracts
      WHERE id = ? OR sozlesme_no = ?
      LIMIT 1
    `).bind(rawId, rawId).first();

    if (!contract) return errorResponse("Sözleşme bulunamadı", 404, "NOT_FOUND");
    if (contract.durum === 3) return errorResponse('İptal edilmiş sözleşmenin mali planı değiştirilemez',409,'CANCELLED_CONTRACT');
    if (!Array.isArray(installments) || installments.length === 0 || installments.length > 120) return errorResponse("Geçersiz taksit planı", 422, "VALIDATION_ERROR");
    const previous = (await db.prepare("SELECT * FROM installments WHERE contract_id=?").bind(contract.id).all()).results || [];
    if(body?.expectedInstallments!==undefined && (!Array.isArray(body.expectedInstallments)||body.expectedInstallments.some(i=>!i||typeof i!=='object')||planSnapshot(body.expectedInstallments)!==planSnapshot(previous)))return errorResponse('Ödeme planı başka bir işlemde değişti. Kaydı yeniden açıp güncel plan üzerinden düzenleyin.',409,'PAYMENT_PLAN_CHANGED');
    const seen = new Set();
    const plan = [];
    for (const inst of installments) {
      if(!inst || typeof inst!=='object')return errorResponse('Geçersiz taksit satırı',422,'VALIDATION_ERROR');
      const no = Number(inst.taksitNo ?? inst.installment_no);
      const amt = Number(inst.taksitTutari ?? inst.amount);
      const due = normalizeDate(inst.vadeTarihi || inst.due_date);
      const existing = previous.find(i=>i.installment_no===no);
      if (!Number.isInteger(no) || no<0 || no>120 || seen.has(no) || !Number.isFinite(amt) || amt<0 || Math.round(amt*100)/100!==amt || !due || (inst.id && existing && inst.id!==existing.id)) return errorResponse("Geçersiz veya başka sözleşmeye ait taksit",422,"VALIDATION_ERROR");
      seen.add(no);
      const paid = Number(existing?.paid_amount || 0);
      if (Number(inst.tahsilEdilen ?? inst.paid_amount ?? paid)!==paid || amt<paid) return errorResponse("Tahsil edilen tutar plan düzenlemesiyle değiştirilemez",422,"PAYMENT_REQUIRED");
      plan.push({id:existing?.id || `inst_${contract.id}_${no}`,installment_no:no,due_date:due,amount:amt});
    }
    if (previous.some(i=>!seen.has(i.installment_no) && Number(i.paid_amount)>0)) return errorResponse("Tahsil edilmiş taksit kaldırılamaz",409,"PAID_INSTALLMENT");
    const income = await db.prepare("SELECT id FROM student_incomes WHERE contract_id=? AND is_deleted=0 LIMIT 1").bind(contract.id).first();
    const active="EXISTS(SELECT 1 FROM contracts WHERE id=? AND durum<>3 AND COALESCE(is_deleted,0)=0)";
    const updates = [
      unchangedPlan(db,contract,previous),
      db.prepare(`DELETE FROM installments WHERE contract_id=? AND paid_amount=0 AND installment_no NOT IN (SELECT value FROM json_each(?)) AND ${active}`).bind(contract.id,JSON.stringify([...seen]),contract.id),
      installmentWrite(db,plan,contract.id,income?.id || "",contract.student_id,installments.length)
    ];
    const total = Math.round(plan.reduce((sum,i)=>sum+i.amount,0)*100)/100;
    const financial=await getContractUpdateStatements(db,contract,{brutTutar:total,taksitSayisi:plan.length},true,false);
    if(financial.error)return financial.error;
    updates.push(...financial.statements);
    updates.push(db.prepare(`UPDATE students SET due_date=? WHERE id=? AND sozlesme_no=? AND ${active}`).bind([...plan].sort((a,b)=>a.installment_no-b.installment_no)[0].due_date,contract.student_id,contract.sozlesme_no,contract.id));
    await db.batch(updates);
    if((await db.prepare('SELECT durum FROM contracts WHERE id=?').bind(contract.id).first())?.durum===3)return errorResponse('Sözleşme iptal edildi; değişiklik kaydedilmedi',409,'CANCELLED_CONTRACT');
    await logAction(db,user,"installments.update","contract",contract.id,"Taksit planı güncellendi",waitUntil);

    return json({ ok: true, newBrut:total, count: installments.length });
  }

  return null;
}
