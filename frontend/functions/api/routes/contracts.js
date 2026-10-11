import { json, errorResponse, logAction, getNextSequence } from "../utils.js";

export async function handleContractsRoutes({ request, db, url, path, user, waitUntil }) {
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
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE (p.contract_id = c.id OR (p.student_id = c.student_id AND c.student_id IS NOT NULL AND c.student_id != '')) AND (p.is_cancelled = 0 OR p.is_cancelled IS NULL)) as calculated_paid
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
        const remaining = Math.max(0, gross - paid);
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
      console.error("GET /contracts error:", err);
      return json([]);
    }
  }

  // 2. POST /contracts (Creates contract, student_income, and installments via atomic sequences)
  if (path === "/contracts" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const studentName = String(body.student_name || body.ogrenciAdi || "").trim();
    if (!studentName) return errorResponse("Öğrenci adı zorunludur", 422, "VALIDATION_ERROR");

    const brutTutar = (body.total_amount !== undefined && body.total_amount !== null && body.total_amount !== "")
      ? Math.max(0, Number(body.total_amount))
      : (body.brutTutar !== undefined && body.brutTutar !== null && body.brutTutar !== "")
        ? Math.max(0, Number(body.brutTutar))
        : 75000;
    const taksitSayisi = parseInt(body.installment_count || body.taksitSayisi) || 10;
    const netTutar = Math.round((brutTutar / 1.1) * 100) / 100;
    const kdvTutari = Math.round((brutTutar - netTutar) * 100) / 100;

    const studentId = body.student_id ? String(body.student_id) : "student-" + crypto.randomUUID().slice(0, 8);

    // Clean prior tombstones
    await db.prepare("DELETE FROM contracts WHERE (student_id = ? OR LOWER(student_name) = LOWER(?)) AND (is_deleted = 1 OR id LIKE 'del-%' OR sozlesme_no LIKE 'del-%')").bind(studentId, studentName.toLowerCase()).run().catch(() => {});
    await db.prepare("DELETE FROM student_incomes WHERE (student_id = ? OR LOWER(student_name) = LOWER(?)) AND is_deleted = 1").bind(studentId, studentName.toLowerCase()).run().catch(() => {});

    // Reuse existing active contract if one already exists for this student
    const existingContract = await db.prepare(`
      SELECT * FROM contracts 
      WHERE ((student_id = ? AND student_id != '') OR (LOWER(student_name) = LOWER(?) AND student_name != ''))
        AND (is_deleted = 0 OR is_deleted IS NULL)
      LIMIT 1
    `).bind(studentId, studentName.toLowerCase()).first().catch(() => null);

    let sozlesmeNo = existingContract?.sozlesme_no || body.sozlesme_no || body.sozlesmeNo;
    let id = existingContract?.id || "cnt_" + crypto.randomUUID().slice(0, 10);

    if (!sozlesmeNo) {
      sozlesmeNo = await getNextSequence(db, "SZL_2026", "SZL2026", 5, 153);
    }
    const date = body.sozlesme_tarihi || body.contract_date || new Date().toISOString();
    const periodId = body.period_id || 113;
    const periodName = body.period_name || "2026-2027";
    const parentName = body.parent_name || body.parentName || "";
    const parentPhone = body.parent_phone || body.parentPhone || "";
    const studentClass = body.student_class || body.sinifAdi || "8-A";

    await db.prepare(`
      INSERT OR REPLACE INTO contracts (
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
    ).run();

    // Inactivate any duplicate contract rows that may have been created earlier for this student
    await db.prepare(
      "UPDATE contracts SET is_deleted = 1 WHERE (LOWER(student_name) = LOWER(?) OR (student_id = ? AND student_id != '')) AND id != ? AND (is_deleted = 0 OR is_deleted IS NULL)"
    ).bind(studentName.toLowerCase(), studentId, id).run().catch(() => {});

    // Atomic income code
    const gelirKodu = await getNextSequence(db, "GLR_2026", "GLR2026", 5, 158);
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
        0, ?, 0, ?, ?,
        1, ?, ?, 1, datetime('now'), 0
      )
    `).bind(
      glrId, gelirKodu, id, sozlesmeNo, studentId, studentName, body.student_no || "", studentClass,
      studentName, `Sözleşme: ${sozlesmeNo}`, periodId, periodName, netTutar, kdvTutari, brutTutar,
      brutTutar, date, body.due_date || date, taksitSayisi, taksitSayisi
    ).run().catch((e) => console.error("Auto student_income error:", e));

    // Atomically insert installments with strict UNIQUE(contract_id, installment_no)
    const baseAmt = Math.floor((brutTutar / taksitSayisi) * 100) / 100;
    const remainder = Math.round((brutTutar - (baseAmt * taksitSayisi)) * 100) / 100;
    const baseDate = new Date(date);
    const contractInstStmts = [];

    for (let i = 1; i <= taksitSayisi; i++) {
      const isLast = (i === taksitSayisi);
      const amt = isLast ? Math.round((baseAmt + remainder) * 100) / 100 : baseAmt;
      const dueDateObj = new Date(baseDate);
      dueDateObj.setMonth(dueDateObj.getMonth() + i - 1);
      dueDateObj.setDate(15);
      const dueDate = dueDateObj.toISOString().split("T")[0];
      const instId = `inst_${id}_${i}`;

      contractInstStmts.push(
        db.prepare(`
          INSERT OR REPLACE INTO installments (
            id, contract_id, income_id, student_id, installment_no, total_installments,
            due_date, amount, paid_amount, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Bekliyor', datetime('now'))
        `).bind(instId, id, glrId, studentId, i, taksitSayisi, dueDate, amt)
      );
    }
    if (contractInstStmts.length > 0) {
      if (typeof db.batch === "function") {
        await db.batch(contractInstStmts).catch((e) => console.error("Installment batch error:", e));
      } else {
        for (const stmt of contractInstStmts) {
          await stmt.run().catch(() => {});
        }
      }
    }

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
    } catch {
      return json([]);
    }
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
      const res = await db.prepare(
        "SELECT i.*, c.student_name, c.sozlesme_no FROM installments i JOIN contracts c ON i.contract_id = c.id WHERE (i.contract_id = ? OR c.sozlesme_no = ?) AND (c.is_deleted = 0 OR c.is_deleted IS NULL) ORDER BY i.installment_no ASC"
      ).bind(contractId, contractId).all();
      const rows = (res.results || []).map(r => ({
        ...r,
        id: r.id,
        sozlesmeNo: r.sozlesme_no,
        ogrenciAdi: r.student_name,
        taksitNo: r.installment_no,
        taksitTutari: r.amount,
        vadeTarihi: r.due_date,
        tahsilEdilen: r.paid_amount,
        kalanTutar: Math.max(0, r.amount - (r.paid_amount || 0)),
        durumText: r.status,
      }));
      return json(rows);
    } catch (err) {
      return json([]);
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
        WHERE (id = ? OR sozlesme_no = ? OR student_id = ? OR student_id = ('stu-' || ?) OR ('stu-' || student_id) = ? OR (LOWER(student_name) = LOWER(?) AND student_name != ''))
          AND (is_deleted = 0 OR is_deleted IS NULL)
        LIMIT 1
      `).bind(decodedKey, decodedKey, decodedKey, decodedKey, decodedKey, decodedKey).first();

      if (!row) {
        // Idempotent: already deleted or not found
        return json({ success: true, ok: true, already_deleted: true });
      }

      // Full Cascade Purge: Permanently delete payments, installments, incomes, and contract
      const deleteStmts = [
        db.prepare("DELETE FROM payments WHERE contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?) OR (student_id = ? AND student_id IS NOT NULL AND student_id != '')").bind(row.id, row.sozlesme_no, row.student_id),
        db.prepare("DELETE FROM installments WHERE contract_id = ? OR contract_id IN (SELECT id FROM contracts WHERE sozlesme_no = ?) OR (student_id = ? AND student_id IS NOT NULL AND student_id != '')").bind(row.id, row.sozlesme_no, row.student_id),
        db.prepare("DELETE FROM student_incomes WHERE contract_id = ? OR sozlesme_no = ? OR id = ? OR (student_id = ? AND student_id IS NOT NULL AND student_id != '')").bind(row.id, row.sozlesme_no, row.id, row.student_id),
        db.prepare("DELETE FROM contracts WHERE id = ? OR sozlesme_no = ?").bind(row.id, row.sozlesme_no)
      ];
      if (typeof db.batch === "function") {
        await db.batch(deleteStmts);
      } else {
        for (const s of deleteStmts) await s.run().catch(() => {});
      }

      await logAction(db, user, "contract.delete", "contract", row.id, `${row.sozlesme_no} sözleşmesi ve ilişkili tüm kayıtlar silindi`, waitUntil);
      return json({ success: true, ok: true, deleted_id: row.id, deleted_sozlesme: row.sozlesme_no });
    }

    if (request.method === "PATCH") {
      const row = await db.prepare("SELECT * FROM contracts WHERE (id = ? OR sozlesme_no = ?)").bind(contractId, contractId).first();
      if (!row) return errorResponse("Sözleşme bulunamadı", 404, "NOT_FOUND");

      const patch = await request.json().catch(() => ({}));
      const brut = patch.brutTutar != null ? Number(patch.brutTutar) : row.brut_tutar;
      const net = patch.netTutar != null ? Number(patch.netTutar) : Math.round((brut / 1.1) * 100) / 100;
      const kdv = patch.kdvTutari != null ? Number(patch.kdvTutari) : Math.round((brut - net) * 100) / 100;
      const inst = patch.taksitSayisi != null ? Number(patch.taksitSayisi) : row.taksit_sayisi;
      const odemeTuru = patch.odemeTuru != null ? Number(patch.odemeTuru) : (inst > 1 ? 1 : 2);
      const odemeTuruText = patch.odemeTuruText || (inst > 1 ? `Taksitli (${inst} Taksit)` : "Peşin / Tek Çekim");
      const dateStr = patch.sozlesmeTarihi || patch.tarih || row.sozlesme_tarihi;

      await db.prepare(`
        UPDATE contracts SET
          brut_tutar = ?, net_tutar = ?, kdv_tutari = ?,
          taksit_sayisi = ?, odeme_turu = ?, odeme_turu_text = ?,
          sozlesme_tarihi = ?
        WHERE id = ?
      `).bind(brut, net, kdv, inst, odemeTuru, odemeTuruText, dateStr, row.id).run();

      // Sync student total_fee and installment_count
      if (row.student_id || row.student_name) {
        await db.prepare(`
          UPDATE students SET total_fee = ?, installment_count = ?
          WHERE id = ? OR LOWER(student_name) = LOWER(?)
        `).bind(brut, inst, row.student_id || "", row.student_name).run().catch(() => {});
      }

      // Sync student_incomes
      await db.prepare(`
        UPDATE student_incomes SET
          brut_tutar = ?, net_tutar = ?, kdv_tutari = ?,
          taksit_sayisi = ?, kalan_alacak = MAX(0, ? - toplam_tahsilat)
        WHERE contract_id = ? OR sozlesme_no = ? OR LOWER(student_name) = LOWER(?)
      `).bind(brut, net, kdv, inst, brut, row.id, row.sozlesme_no, row.student_name).run().catch(() => {});

      await logAction(db, user, "contract.update", "contract", row.id, `${row.sozlesme_no} güncellendi: ${brut} TL`, waitUntil);

      const updatedRow = await db.prepare("SELECT * FROM contracts WHERE id = ?").bind(row.id).first();
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
      return json({
        ...row,
        sozlesmeNo: row.sozlesme_no,
        ogrenciAdi: row.student_name,
        brutTutar: row.brut_tutar,
      });
    }
  }

  // 7. GET /installments (SSOT)
  if (path === "/installments" && request.method === "GET") {
    const contractId = url.searchParams.get("contract_id");
    const studentId = url.searchParams.get("student_id");
    const status = url.searchParams.get("status");
    const period = url.searchParams.get("period_id");

    let query = "SELECT i.*, c.student_name, c.sozlesme_no, c.period_id FROM installments i JOIN contracts c ON i.contract_id = c.id WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)";
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
        vadeTarihi: r.due_date,
        tahsilEdilen: r.paid_amount,
        kalanTutar: Math.max(0, r.amount - (r.paid_amount || 0)),
        durumText: r.status,
        toplamTutar: r.amount,
      }));
      return json(rows);
    } catch (err) {
      console.error("GET /installments error:", err);
      return json([]);
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
        vadeTarihi: r.vade_tarihi,
        taksitSayisi: r.taksit_sayisi,
        kalanTaksitSayisi: r.kalan_taksit_sayisi,
        aciklama: r.title,
        donemId: r.period_id,
        donemAdi: r.period_name
      }));
      return json(rows);
    } catch (err) {
      return json([]);
    }
  }

  // 9. PUT /contracts/:id/installments (Persist batch installment updates to D1)
  const instMatch = path.match(/^\/contracts\/([^\/]+)\/installments$/);
  if (instMatch && (request.method === "PUT" || request.method === "POST")) {
    const rawId = decodeURIComponent(instMatch[1]);
    const body = await request.json().catch(() => ({}));
    const installments = Array.isArray(body) ? body : (body.installments || []);

    const contract = await db.prepare(`
      SELECT * FROM contracts 
      WHERE id = ? OR sozlesme_no = ? 
      LIMIT 1
    `).bind(rawId, rawId).first().catch(() => null);

    if (contract && installments.length > 0) {
      for (const inst of installments) {
        const no = Number(inst.taksitNo !== undefined ? inst.taksitNo : (inst.installment_no || 1));
        const amt = Number(inst.taksitTutari !== undefined ? inst.taksitTutari : (inst.amount || 0));
        const paid = Number(inst.tahsilEdilen !== undefined ? inst.tahsilEdilen : (inst.paid_amount || 0));
        const status = inst.durumText || inst.status || (paid >= amt && amt > 0 ? "Odendi" : (paid > 0 ? "KismenOdendi" : "Bekliyor"));
        const dueDate = inst.due_date || inst.vadeTarihi || "";
        const payDate = inst.payment_date || inst.tahsilatTarihi || (paid > 0 ? new Date().toISOString().slice(0, 10) : "");
        const instId = inst.id || `inst_${contract.id}_${no}`;

        const existing = await db.prepare("SELECT id FROM installments WHERE id = ? OR (contract_id = ? AND installment_no = ?) LIMIT 1")
          .bind(instId, contract.id, no).first().catch(() => null);

        if (existing) {
          await db.prepare(`
            UPDATE installments 
            SET amount = ?, paid_amount = ?, status = ?, due_date = ?, payment_date = ?
            WHERE id = ?
          `).bind(amt, paid, status, dueDate, payDate, existing.id).run().catch(() => {});
        } else {
          await db.prepare(`
            INSERT INTO installments (id, contract_id, student_id, installment_no, total_installments, due_date, amount, paid_amount, status, payment_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(instId, contract.id, contract.student_id, no, installments.length, dueDate, amt, paid, status, payDate).run().catch(() => {});
        }
      }

      // Update student's total paid_amount
      const totalPaid = installments.reduce((acc, it) => acc + Number(it.tahsilEdilen !== undefined ? it.tahsilEdilen : (it.paid_amount || 0)), 0);
      if (contract.student_id) {
        await db.prepare("UPDATE students SET paid_amount = ? WHERE id = ? OR ('stu-' || id) = ?").bind(totalPaid, contract.student_id, contract.student_id).run().catch(() => {});
      }
    }

    return json({ ok: true, count: installments.length });
  }

  return null;
}

