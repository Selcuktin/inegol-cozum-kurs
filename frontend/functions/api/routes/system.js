// Cloudflare Pages Functions - System Router (Users, Roles, Audit Logs, Export, 20:00 Daily Backup, Restore, Status)
import { json, cachedJson, errorResponse, successResponse, CORS_HEADERS, getCurrentUser, logAction, ROLE_ADMIN, ROLE_LABELS } from "../utils.js";

const BACKUP_TABLES = [
  "users",
  "students",
  "classes",
  "teachers",
  "payments",
  "expenses",
  "contracts",
  "student_incomes",
  "installments",
  "exams",
  "exam_results",
  "attendance",
  "schedules",
  "homework",
  "mentorship",
  "optical_templates",
  "optical_printer_profiles",
  "audit_logs"
];

async function ensureBackupTable(db) {
  if (!db) return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS system_backups (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      backup_type TEXT NOT NULL,
      snapshot_data TEXT NOT NULL,
      table_counts TEXT NOT NULL,
      created_by TEXT DEFAULT 'Sistem',
      notes TEXT DEFAULT ''
    )
  `).run().catch(() => {});
}

async function restoreSnapshotData(db, snap, user, backupId, notes = "", waitUntil = null, env = null) {
  // 1. Mevcut durumu güvenlik için pre_restore olarak yedekle
  const preSnap = { version: 1, created_at: new Date().toISOString(), tables: {} };
  const preCounts = {};
  for (const t of BACKUP_TABLES) {
    try {
      const res = await db.prepare("SELECT * FROM " + t).all();
      preSnap.tables[t] = res.results || [];
      preCounts[t] = (res.results || []).length;
    } catch {
      preSnap.tables[t] = [];
      preCounts[t] = 0;
    }
  }
  const preId = "backup_prerestore_" + Date.now();
  const preSnapJson = JSON.stringify(preSnap);
  const preCountsJson = JSON.stringify(preCounts);
  // Protect D1 SQLite row limit (~2MB): if preSnapJson > 1.5MB, write empty object to D1
  const d1SnapData = preSnapJson.length > 1500000 ? "{}" : preSnapJson;
  await db.prepare("INSERT INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'pre_restore', ?, ?, 'Sistem Güvenlik', ?)")
    .bind(preId, new Date().toISOString(), d1SnapData, preCountsJson, `Geri yükleme öncesi otomatik kurtarma noktası (${backupId})`)
    .run().catch(() => {});

  const r2Bucket = env?.BACKUPS || env?.R2 || env?.BACKUP_BUCKET;
  if (r2Bucket && typeof r2Bucket.put === "function") {
    await r2Bucket.put(`${preId}.json`, preSnapJson).catch(() => {});
  }

  // 2. Tabloları temizle ve seçili snapshot'ı atomik db.batch() ile geri yükle
  const restoredCounts = {};
  for (const t of BACKUP_TABLES) {
    const rows = snap.tables?.[t];
    if (Array.isArray(rows)) {
      try {
        const statements = [
          db.prepare("DELETE FROM " + t)
        ];
        for (const row of rows) {
          const keys = Object.keys(row);
          if (keys.length > 0) {
            const placeholders = keys.map(() => "?").join(", ");
            const cols = keys.join(", ");
            const values = keys.map(k => row[k]);
            statements.push(db.prepare(`INSERT INTO ${t} (${cols}) VALUES (${placeholders})`).bind(...values));
          }
        }
        // D1 max batch chunk limit (100)
        const CHUNK_SIZE = 100;
        for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
          const chunk = statements.slice(i, i + CHUNK_SIZE);
          await db.batch(chunk);
        }
        restoredCounts[t] = rows.length;
      } catch (err) {
        console.error(`Restore error on table ${t}:`, err);
      }
    }
  }

  await logAction(db, user, "system.backup_restore", "backup", backupId, notes || `Veritabanı ${backupId} yedeğinden geri yüklendi`, waitUntil);
  return {
    ok: true,
    message: "Veritabanı başarıyla geri yüklendi.",
    backup_id: backupId,
    safety_backup_id: preId,
    restored_counts: restoredCounts
  };
}

export async function handleSystemRoutes(ctxOrPath, maybeReq, maybeEnv, maybeUrl) {
  const isObj = typeof ctxOrPath === "object" && ctxOrPath !== null && ctxOrPath.request;
  const request = isObj ? ctxOrPath.request : maybeReq;
  const path = isObj ? ctxOrPath.path : ctxOrPath;
  const env = isObj ? ctxOrPath.env : maybeEnv;
  const db = (isObj ? ctxOrPath.db : maybeEnv?.DB) || env?.DB;
  const url = isObj ? ctxOrPath.url : maybeUrl;
  const currentUser = isObj ? ctxOrPath.user : null;

  // ---------------- STATUS CHECK ----------------
  if (path === "/status" || path === "") {
    return cachedJson({ status: "ok", name: "İnegöl Çözüm Kurs Cloudflare Edge API", timestamp: new Date().toISOString() }, 30, 60, 120);
  }

  // ---------------- OMNI SEARCH (Global Spotlight Across Students, Contracts, Payments) ----------------
  if (path === "/search/omni" && request.method === "GET") {
    if (!db) return json({ query: "", total: 0, students: [], contracts: [], payments: [] });
    const q = String(url?.searchParams?.get("q") || "").trim();
    if (!q || q.length < 2) {
      return json({ query: q, total: 0, students: [], contracts: [], payments: [] });
    }

    const term = `%${q}%`;
    const [studentsRes, contractsRes, paymentsRes] = await Promise.all([
      db.prepare(`
        SELECT id, student_name, student_tc, student_class, student_phone, parent_name, parent_phone, sozlesme_no, total_fee, paid_amount 
        FROM students 
        WHERE student_name LIKE ? OR student_tc LIKE ? OR student_phone LIKE ? OR parent_name LIKE ? OR parent_phone LIKE ? OR student_no LIKE ? OR sozlesme_no LIKE ?
        ORDER BY student_name ASC 
        LIMIT 8
      `).bind(term, term, term, term, term, term, term).all().catch(() => ({ results: [] })),

      db.prepare(`
        SELECT id, sozlesme_no, student_name, parent_name, brut_tutar, sozlesme_tarihi, student_id
        FROM contracts 
        WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (sozlesme_no LIKE ? OR student_name LIKE ? OR parent_name LIKE ?)
        ORDER BY sozlesme_tarihi DESC 
        LIMIT 6
      `).bind(term, term, term).all().catch(() => ({ results: [] })),

      db.prepare(`
        SELECT p.id, p.student_id, p.amount, p.payment_date, p.method, p.note, p.receipt_no, s.student_name 
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        WHERE (p.is_cancelled = 0 OR p.is_cancelled IS NULL) AND (p.receipt_no LIKE ? OR p.note LIKE ? OR s.student_name LIKE ?)
        ORDER BY p.payment_date DESC 
        LIMIT 6
      `).bind(term, term, term).all().catch(() => ({ results: [] }))
    ]);

    const students = studentsRes.results || [];
    const contracts = contractsRes.results || [];
    const payments = paymentsRes.results || [];

    return json({
      query: q,
      total: students.length + contracts.length + payments.length,
      students,
      contracts,
      payments
    });
  }

  // ---------------- USERS & AUDIT ----------------
  if (path === "/users" && request.method === "GET") {
    if (!db) return json([]);
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    if (!user) {
      return errorResponse("Kullanıcı listesini görüntülemek için oturum açmanız gerekmektedir", 401, "UNAUTHORIZED");
    }
    const res = await db.prepare("SELECT user_id, email, name, picture, role, created_at FROM users").all();
    const users = (res.results || []).map((u) => ({
      ...u,
      role_label: ROLE_LABELS[u.role] || u.role,
    }));
    return json(users);
  }

  if (path === "/users/role" && request.method === "PUT") {
    const user = await getCurrentUser(request, db);
    if (!user || user.role !== ROLE_ADMIN) {
      return errorResponse("Sadece yöneticiler rol değiştirebilir", 403);
    }
    const body = await request.json();
    if (!ROLE_LABELS[body.role]) return errorResponse("Geçersiz rol", 422);
    if (body.user_id === user.user_id && body.role !== ROLE_ADMIN) {
      return errorResponse("Kendi yönetici rolünüzü kaldıramazsınız", 400);
    }

    await db.prepare("UPDATE users SET role = ? WHERE user_id = ?").bind(body.role, body.user_id).run();
    await logAction(db, user, "user.role_update", "user", body.user_id, `Rol ${ROLE_LABELS[body.role]} yapıldı`);
    return json({ ok: true });
  }

  if (path === "/audit-logs" && request.method === "GET") {
    if (!db) return json([]);
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    if (!user || user.role !== ROLE_ADMIN) {
      return errorResponse("Denetim kayıtlarını görüntüleme yetkiniz yok", 403, "FORBIDDEN");
    }
    const res = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200").all();
    return json(res.results || []);
  }

  // ---------------- SECURITY OVERVIEW (Cloudflare Edge & Access Shield) ----------------
  if (path === "/security/overview" && request.method === "GET") {
    if (!db) return json({ ok: false, error: "Database unavailable" }, 500);
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    if (!user || user.role !== ROLE_ADMIN) {
      return errorResponse("Güvenlik paneline erişim yetkiniz yok", 403, "FORBIDDEN");
    }

    const [failedRes, foreignRes, activeSessionsRes, recentEventsRes] = await Promise.all([
      db.prepare("SELECT COUNT(*) as cnt FROM audit_logs WHERE action = 'security.failed_login' AND created_at >= datetime('now', '-24 hours')").first().catch(() => ({ cnt: 0 })),
      db.prepare("SELECT COUNT(*) as cnt FROM audit_logs WHERE action = 'security.foreign_access' AND created_at >= datetime('now', '-24 hours')").first().catch(() => ({ cnt: 0 })),
      db.prepare("SELECT COUNT(*) as cnt FROM user_sessions WHERE expires_at > datetime('now')").first().catch(() => ({ cnt: 0 })),
      db.prepare("SELECT * FROM audit_logs WHERE action LIKE 'security.%' ORDER BY created_at DESC LIMIT 20").all().catch(() => ({ results: [] }))
    ]);

    return json({
      ok: true,
      shield_status: "active",
      failed_logins_24h: failedRes?.cnt || 0,
      foreign_access_24h: foreignRes?.cnt || 0,
      active_sessions_count: activeSessionsRes?.cnt || 0,
      recent_security_events: recentEventsRes?.results || []
    });
  }

  // ---------------- EXPORT ----------------
  const exportMatch = path.match(/^\/export\/([^\/]+)$/);
  if (exportMatch && request.method === "GET") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    const kind = exportMatch[1];
    let csv = "\uFEFF"; // UTF-8 BOM for Excel

    if (kind === "students" || kind === "all") {
      csv += "ÖĞRENCİLER\n";
      csv += "Ad Soyad;Telefon;Okul;Sınıf;Veli;Veli Tel;Program;Toplam Ücret;Ödenen;Kalan;Taksit;İlk Vade\n";
      const res = await db.prepare("SELECT * FROM students ORDER BY student_name ASC").all();
      for (const s of res.results || []) {
        const rem = (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0);
        csv += `"${s.student_name || ""}";"${s.student_phone || ""}";"${s.school || ""}";"${s.student_class || ""}";"${s.parent_name || ""}";"${s.parent_phone || ""}";"${s.program || ""}";${s.total_fee || 0};${s.paid_amount || 0};${rem};${s.installment_count || 1};"${s.due_date || ""}"\n`;
      }
      csv += "\n";
    }

    if (kind === "payments" || kind === "all") {
      csv += "TAHSİLATLAR\n";
      csv += "Tarih;Öğrenci;Tutar;Yöntem;Banka;Açıklama;Kaydeden\n";
      const pRes = await db.prepare("SELECT p.*, s.student_name FROM payments p LEFT JOIN students s ON p.student_id = s.id ORDER BY p.payment_date DESC").all();
      for (const p of pRes.results || []) {
        csv += `"${p.payment_date || ""}";"${p.student_name || ""}";${p.amount || 0};"${p.method || ""}";"${p.bank || ""}";"${p.note || ""}";"${p.created_by_name || ""}"\n`;
      }
      csv += "\n";
    }

    if (kind === "expenses" || kind === "all") {
      csv += "GİDERLER\n";
      csv += "Tarih;Başlık;Kategori;Kasa/Hesap;Tutar;Kaydeden\n";
      const eRes = await db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
      for (const e of eRes.results || []) {
        csv += `"${e.expense_date || ""}";"${e.title || ""}";"${e.category || ""}";"${e.account || "Nakit Ana Kasa"}";${e.amount || 0};"${e.created_by_name || ""}"\n`;
      }
      csv += "\n";
    }

    if (kind === "audit" || kind === "all") {
      csv += "DENETİM KAYITLARI\n";
      csv += "Tarih;Kullanıcı;E-posta;İşlem;Detay\n";
      const aRes = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500").all();
      for (const a of aRes.results || []) {
        csv += `"${a.created_at || ""}";"${a.user_name || ""}";"${a.user_email || ""}";"${a.action || ""}";"${a.detail || ""}"\n`;
      }
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inegol-cozum-${kind}.csv"`,
        ...CORS_HEADERS,
      },
    });
  }

  // ---------------- BACKUP & RESTORE (20:00 DAILY SNAPSHOT & 1-CLICK RESTORE & R2) ----------------
  if (path === "/backup" && request.method === "GET") {
    if (!db) return json({ backups: [], schedule: "Her gün 20:00 (TRT)", status: "inactive" });
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    const authHeader = request.headers.get("Authorization") || "";
    const backupSecret = (env?.BACKUP_TOKEN || "").trim();
    const isTokenAuthed = !!backupSecret && authHeader === `Bearer ${backupSecret}`;
    const isAdmin = user && user.role === ROLE_ADMIN;
    if (!isAdmin && !isTokenAuthed) {
      return errorResponse("Yedekleme durumunu görüntülemek için yetkiniz yok", 401, "UNAUTHORIZED");
    }
    await ensureBackupTable(db);
    const r2Bucket = env?.BACKUPS || env?.R2 || env?.BACKUP_BUCKET;

    const dlId = url.searchParams.get("download");
    if (dlId) {
      let bRow = await db.prepare("SELECT * FROM system_backups WHERE id = ?").bind(dlId).first().catch(() => null);
      let data = bRow?.snapshot_data;
      if (!data && r2Bucket && typeof r2Bucket.get === "function") {
        const r2Obj = await r2Bucket.get(`${dlId}.json`).catch(() => null);
        if (r2Obj) data = await r2Obj.text().catch(() => null);
      }
      if (!data) return errorResponse("Yedek bulunamadı", 404);
      return new Response(data, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${dlId}.json"`,
          ...CORS_HEADERS
        }
      });
    }

    // 20:00 TRT (UTC+3) idempotent scheduled check
    try {
      const now = new Date();
      const trtDate = new Date(now.getTime() + 3 * 3600 * 1000);
      const trtHour = trtDate.getUTCHours();
      const trtDateStr = trtDate.toISOString().slice(0, 10);
      if (trtHour >= 20 || now.getUTCHours() >= 17) {
        const existing = await db.prepare("SELECT id FROM system_backups WHERE backup_type = 'scheduled_20_00' AND created_at LIKE ?").bind(trtDateStr + "%").first().catch(() => null);
        if (!existing) {
          const snap = { version: 1, created_at: new Date().toISOString(), tables: {} };
          const counts = {};
          for (const t of BACKUP_TABLES) {
            try {
              const res = await db.prepare("SELECT * FROM " + t).all();
              snap.tables[t] = res.results || [];
              counts[t] = (res.results || []).length;
            } catch {
              snap.tables[t] = [];
              counts[t] = 0;
            }
          }
          const bId = "backup_20_00_" + trtDateStr.replace(/-/g, "");
          const snapJson = JSON.stringify(snap);
          const countsJson = JSON.stringify(counts);
          await db.prepare("INSERT OR REPLACE INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'scheduled_20_00', ?, ?, 'Otomatik Zamanlayıcı (20:00 TRT)', ?)")
            .bind(bId, new Date().toISOString(), snapJson, countsJson, `${trtDateStr} Saat 20:00 Günlük Otomatik Yedek`)
            .run().catch(() => {});

          if (r2Bucket && typeof r2Bucket.put === "function") {
            await r2Bucket.put(`${bId}.json`, snapJson).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("Scheduled backup check error:", err);
    }

    const res = await db.prepare("SELECT id, created_at, backup_type, table_counts, created_by, notes, length(snapshot_data) as size_bytes FROM system_backups ORDER BY created_at DESC LIMIT 50").all().catch(() => ({ results: [] }));
    const now = new Date();
    const trtDate = new Date(now.getTime() + 3 * 3600 * 1000);
    const trtDateStr = trtDate.toISOString().slice(0, 10);
    return json({
      backups: (res.results || []).map(r => ({
        ...r,
        created_at: r.created_at ? (r.created_at.includes("T") ? r.created_at : r.created_at.replace(" ", "T") + "Z") : null,
        table_counts: typeof r.table_counts === "string" ? JSON.parse(r.table_counts || "{}") : (r.table_counts || {})
      })),
      schedule: "Her gün 20:00 (TRT)",
      status: "active",
      current_date_trt: trtDateStr,
      r2_storage: !!r2Bucket
    });
  }

  if (path === "/backup" && request.method === "POST") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    await ensureBackupTable(db);
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);

    // Auth check: either admin user session OR Bearer BACKUP_TOKEN secret
    const authHeader = request.headers.get("Authorization") || "";
    const backupSecret = (env?.BACKUP_TOKEN || "").trim();
    const isTokenAuthed = !!backupSecret && authHeader === `Bearer ${backupSecret}`;
    const isAdmin = user && user.role === ROLE_ADMIN;

    if (!isAdmin && !isTokenAuthed) {
      return errorResponse("Yedekleme için yetkiniz yok", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => ({}));
    const snap = { version: 1, created_at: new Date().toISOString(), tables: {} };
    const counts = {};
    for (const t of BACKUP_TABLES) {
      try {
        const res = await db.prepare("SELECT * FROM " + t).all();
        snap.tables[t] = res.results || [];
        counts[t] = (res.results || []).length;
      } catch {
        snap.tables[t] = [];
        counts[t] = 0;
      }
    }
    const bId = "backup_manual_" + Date.now();
    const notes = body.notes || (isTokenAuthed ? "Zamanlanmış / API Yedeği" : "Manuel Yönetici Snapshot Yedeği");
    const createdBy = isTokenAuthed ? "Otomatik Servis (Token)" : (user?.name || "Yönetici");
    const snapJson = JSON.stringify(snap);
    const countsJson = JSON.stringify(counts);
    // Protect D1 SQLite row limit (~2MB): if snapJson > 1.5MB, write placeholder to D1 and rely on R2
    const d1SnapData = snapJson.length > 1500000 ? "{}" : snapJson;
    await db.prepare("INSERT INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'manual', ?, ?, ?, ?)")
      .bind(bId, new Date().toISOString(), d1SnapData, countsJson, createdBy, notes)
      .run();

    const r2Bucket = env?.BACKUPS || env?.R2 || env?.BACKUP_BUCKET;
    let r2Saved = false;
    if (r2Bucket && typeof r2Bucket.put === "function") {
      try {
        await r2Bucket.put(`${bId}.json`, snapJson);
        r2Saved = true;
      } catch (err) {
        console.error("R2 backup save error:", err);
      }
    }

    await logAction(db, user, "system.backup_create", "backup", bId, notes);
    return json({ ok: true, backup_id: bId, counts, r2_saved: r2Saved });
  }

  if (path === "/backup/restore" && request.method === "POST") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    await ensureBackupTable(db);
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    if (!user || user.role !== ROLE_ADMIN) {
      return errorResponse("Geri yükleme işlemi yalnızca yönetici tarafından yapılabilir", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => ({}));
    const backupId = body.backup_id;
    if (!backupId) return errorResponse("backup_id belirtilmedi", 400);

    const bRow = await db.prepare("SELECT * FROM system_backups WHERE id = ?").bind(backupId).first().catch(() => null);
    let snap;
    if (bRow && bRow.snapshot_data && bRow.snapshot_data !== "{}") {
      try {
        snap = JSON.parse(bRow.snapshot_data);
      } catch {
        return errorResponse("Yedek verisi çözülemedi", 400);
      }
    }
    if (!snap) {
      const r2Bucket = env?.BACKUPS || env?.R2 || env?.BACKUP_BUCKET;
      if (r2Bucket && typeof r2Bucket.get === "function") {
        const r2Obj = await r2Bucket.get(`${backupId}.json`).catch(() => null);
        if (r2Obj) {
          const text = await r2Obj.text().catch(() => null);
          try { snap = JSON.parse(text); } catch {}
        }
      }
    }
    if (!snap) return errorResponse("Yedek bulunamadı", 404);

    const result = await restoreSnapshotData(db, snap, user, backupId, `Veritabanı ${backupId} yedeğinden geri yüklendi`, ctxOrPath?.waitUntil, env);
    return json(result);
  }

  // ---------------- BACKUP IMPORT & RESTORE FROM LOCAL JSON FILE ----------------
  if (path === "/backup/upload-restore" && request.method === "POST") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    await ensureBackupTable(db);
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    if (!user || user.role !== ROLE_ADMIN) {
      return errorResponse("Harici yedek yükleme işlemi yalnızca yönetici tarafından yapılabilir", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => ({}));
    const rawSnap = body.snapshot || body;
    if (!rawSnap || typeof rawSnap.tables !== "object") {
      return errorResponse("Geçersiz yedek dosyası formatı. 'tables' nesnesi bulunamadı.", 422, "INVALID_BACKUP");
    }

    const backupId = "backup_imported_" + Date.now();
    const notes = body.notes || "Harici JSON dosyasından geri yükleme";

    const counts = {};
    for (const t of Object.keys(rawSnap.tables || {})) {
      counts[t] = Array.isArray(rawSnap.tables[t]) ? rawSnap.tables[t].length : 0;
    }

    await db.prepare("INSERT INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'imported', ?, ?, ?, ?)")
      .bind(backupId, new Date().toISOString(), JSON.stringify(rawSnap), JSON.stringify(counts), user.name || "Yönetici", notes)
      .run().catch(() => {});

    const r2Bucket = env?.BACKUPS || env?.R2 || env?.BACKUP_BUCKET;
    if (r2Bucket && typeof r2Bucket.put === "function") {
      await r2Bucket.put(`${backupId}.json`, JSON.stringify(rawSnap)).catch(() => {});
    }

    const result = await restoreSnapshotData(db, rawSnap, user, backupId, notes, ctxOrPath?.waitUntil, env);
    return json(result);
  }

  return null;
}
