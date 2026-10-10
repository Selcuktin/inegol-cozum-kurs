import { json, errorResponse, logAction, getNextSequence } from "../utils.js";

export async function handleContractsRoutes({ request, db, url, path, user }) {
  // 1. GET /contracts
  if (path === "/contracts" && request.method === "GET") {
    const period = url.searchParams.get("period_id") || url.searchParams.get("period");
    const studentId = url.searchParams.get("student_id");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    let query = "SELECT * FROM contracts WHERE (is_deleted = 0 OR is_deleted IS NULL)";
    const params = [];
    if (period && period !== "-1") {
      query += " AND period_id = ?";
      params.push(parseInt(period) || 113);
    }
    if (studentId) {
      query += " AND student_id = ?";
      params.push(studentId);
    }
    if (status === "active") {
      query += " AND durum = 1";
    } else if (status === "draft") {
      query += " AND durum = 0";
    } else if (status === "cancelled") {
      query += " AND durum = 3";
    }
    if (search) {
      query += " AND (sozlesme_no LIKE ? OR student_name LIKE ? OR student_class LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += " ORDER BY sozlesme_tarihi DESC, id DESC";

    try {
      const res = await db.prepare(query).bind(...params).all();
      const rows = (res.results || []).map(r => ({
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
        donemId: r.period_id,
        donemAdi: r.period_name,
        netTutar: r.net_tutar,
        kdvTutari: r.kdv_tutari,
        brutTutar: r.brut_tutar,
        odemeTuru: r.odeme_turu,
        odemeTuruText: r.odeme_turu_text,
        taksitSayisi: r.taksit_sayisi,
        durum: r.durum,
        durumText: r.durum === 1 ? "Aktif" : r.durum === 3 ? "İptal Edildi" : "Taslak",
        durumRenk: r.durum === 1 ? "success" : r.durum === 3 ? "danger" : "warning",
        isSigned: !!(r.is_signed || r.kurum_imza_alindi || r.veli_imza_alindi),
        veliImzaAlindi: !!r.veli_imza_alindi,
        kurumImzaAlindi: !!r.kurum_imza_alindi,
        kurumImzalayan: r.kurum_imzalayan,
        signedAt: r.signed_at,
        sozlesmeUrl: r.sozlesme_url
      }));
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

    const brutTutar = Number(body.total_amount || body.brutTutar || 75000);
    const taksitSayisi = parseInt(body.installment_count || body.taksitSayisi) || 10;
    const netTutar = Math.round((brutTutar / 1.1) * 100) / 100;
    const kdvTutari = Math.round((brutTutar - netTutar) * 100) / 100;

    const studentId = body.student_id ? String(body.student_id) : "student-" + crypto.randomUUID().slice(0, 8);

    // Clean prior tombstones
    await db.prepare("DELETE FROM contracts WHERE (student_id = ? OR LOWER(student_name) = LOWER(?)) AND (is_deleted = 1 OR id LIKE 'del-%' OR sozlesme_no LIKE 'del-%')").bind(studentId, studentName.toLowerCase()).run().catch(() => {});
    await db.prepare("DELETE FROM student_incomes WHERE (student_id = ? OR LOWER(student_name) = LOWER(?)) AND is_deleted = 1").bind(studentId, studentName.toLowerCase()).run().catch(() => {});

    // Atomic contract number
    const sozlesmeNo = await getNextSequence(db, "SZL_2026", "SZL2026", 5, 153);
    const id = "cnt_" + crypto.randomUUID().slice(0, 10);
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

    for (let i = 1; i <= taksitSayisi; i++) {
      const isLast = (i === taksitSayisi);
      const amt = isLast ? Math.round((baseAmt + remainder) * 100) / 100 : baseAmt;
      const dueDateObj = new Date(baseDate);
      dueDateObj.setMonth(dueDateObj.getMonth() + i - 1);
      dueDateObj.setDate(15);
      const dueDate = dueDateObj.toISOString().split("T")[0];
      const instId = `inst_${id}_${i}`;

      await db.prepare(`
        INSERT OR REPLACE INTO installments (
          id, contract_id, income_id, student_id, installment_no, total_installments,
          due_date, amount, paid_amount, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Bekliyor', datetime('now'))
      `).bind(instId, id, glrId, studentId, i, taksitSayisi, dueDate, amt).run().catch((e) => console.error("Installment insert error:", e));
    }

    await logAction(db, user, "contract.create", "contract", id, `${studentName} · ${sozlesmeNo} · ${brutTutar} ₺`);

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

    await logAction(db, user, "contract.sign", "contract", row.id, `${row.sozlesme_no} sözleşmesi ${signerName} tarafından imzalandı`);
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
      const row = await db.prepare("SELECT * FROM contracts WHERE (id = ? OR sozlesme_no = ?)").bind(contractId, contractId).first();
      if (!row) return errorResponse("Sözleşme bulunamadı", 404, "NOT_FOUND");

      await db.prepare("UPDATE contracts SET is_deleted = 1 WHERE id = ?").bind(row.id).run();
      await db.prepare("UPDATE student_incomes SET is_deleted = 1 WHERE contract_id = ? OR sozlesme_no = ?").bind(row.id, row.sozlesme_no).run();
      await db.prepare("DELETE FROM installments WHERE contract_id = ?").bind(row.id).run().catch(() => {});

      await logAction(db, user, "contract.delete", "contract", row.id, `${row.sozlesme_no} sözleşmesi silindi`);
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

      await logAction(db, user, "contract.update", "contract", row.id, `${row.sozlesme_no} güncellendi: ${brut} TL`);

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

  return null;
}
