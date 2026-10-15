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
  "appointments",
  "schedules",
  "homework",
  "homework_submissions",
  "system_sequences",
  "academic_periods",
  "data_alerts",
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
  `).run();
}

async function readSnapshot(db) {
  const existing = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results || [];
  const names = existing.map(t => t.name);
  if (names.length && ["students", "contracts", "installments", "payments"].some(t => !names.includes(t))) throw new Error("Zorunlu yedek tablosu eksik");
  const tables = BACKUP_TABLES.filter(t => !names.length || names.includes(t));
  const data = await db.batch(tables.map(t => db.prepare(`SELECT * FROM "${t}"`)));
  return { version: 2, created_at: new Date().toISOString(), tables: Object.fromEntries(tables.map((t,i) => [t,data[i].results || []])) };
}

async function saveSnapshot(db, env, snapshot, id, type, author, notes) {
  const text = JSON.stringify(snapshot);
  const r2 = env?.BACKUPS || env?.R2 || env?.BACKUP_BUCKET;
  if (r2?.put) await r2.put(`${id}.json`, text);
  const large = new TextEncoder().encode(text).length > 1500000;
  if (large && !r2?.put) throw new Error("Büyük yedek için R2 depolama gereklidir");
  const counts = Object.fromEntries(Object.entries(snapshot.tables).map(([t,rows]) => [t,rows.length]));
  await db.prepare("INSERT INTO system_backups(id,created_at,backup_type,snapshot_data,table_counts,created_by,notes) VALUES(?,?,?,?,?,?,?)").bind(id,snapshot.created_at,type,large ? "{}" : text,JSON.stringify(counts),author,notes).run();
  return { counts, r2_saved: !!r2?.put };
}

async function restoreSnapshotData(db, snap, user, backupId, notes = "", waitUntil = null, env = null) {
  if (!snap?.tables || Array.isArray(snap.tables)) return {ok:false,error:"Geçersiz yedek"};
  const existing = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(t=>t.name);
  const statements = [];
  const restored = {};
  for (const [table,rows] of Object.entries(snap.tables)) {
    if (!BACKUP_TABLES.includes(table) || !Array.isArray(rows)) return {ok:false,error:"Geçersiz yedek tablosu"};
    if (!existing.includes(table)) {
      if (rows.length) return {ok:false,error:`${table} tablosu için önce şema güncellenmeli`};
      continue;
    }
    const columns = (await db.prepare(`PRAGMA table_info("${table}")`).all()).results.map(c=>c.name);
    const keys = rows.length ? Object.keys(rows[0]) : [];
    if (keys.some(k => !columns.includes(k)) || rows.some(r => JSON.stringify(Object.keys(r)) !== JSON.stringify(keys))) return {ok:false,error:`${table} kolonları yedekle uyumsuz`};
    statements.push(db.prepare(`DELETE FROM "${table}"`));
    if (rows.length) {
      // ponytail: one JSON parameter per table keeps restore atomic within D1 query limits; cap bind bytes before writing.
      const data = JSON.stringify(rows);
      if (new TextEncoder().encode(data).length > 1900000) return {ok:false,error:`${table} yedeği tek atomik geri yükleme sınırını aşıyor; kontrollü aktarım gerekir`};
      statements.push(db.prepare(`INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(',')}) SELECT ${keys.map(k=>`json_extract(value, '$."${k}"')`).join(',')} FROM json_each(?)`).bind(data));
    }
    restored[table] = rows.length;
  }
  if (!statements.length) return {ok:false,error:"Yedekte geri yüklenecek tablo yok"};
  // Legacy snapshots can contain schedule collisions. Preserve them and reinstate future-write guards in the same transaction.
  const guards=(await db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name IN ('guard_schedule_insert','guard_schedule_update')").all()).results || [];
  for(const guard of guards) statements.unshift(db.prepare(`DROP TRIGGER "${guard.name}"`));
  for(const guard of guards) statements.push(db.prepare(guard.sql));
  const preId = "backup_prerestore_" + crypto.randomUUID();
  const pre = await readSnapshot(db);
  await saveSnapshot(db,env,pre,preId,"pre_restore","Sistem Güvenlik",`Geri yükleme öncesi: ${backupId}`);
  // A single batch rolls back completely if any statement fails. Unlisted legacy tables are preserved.
  try { await db.batch(statements); }
  catch (err) { return {ok:false,error:"Geri yükleme başarısız; transaction geri alındı",rolled_back:true,safety_backup_id:preId}; }
  await logAction(db,user,"system.backup_restore","backup",backupId,notes,waitUntil);
  return {ok:true,message:"Veritabanı geri yüklendi",backup_id:backupId,safety_backup_id:preId,restored_counts:restored};
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
        SELECT p.id, p.student_id, p.amount, p.payment_date, p.method, p.note, p.id AS receipt_no, s.student_name
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        WHERE (p.is_cancelled = 0 OR p.is_cancelled IS NULL) AND (p.id LIKE ? OR p.note LIKE ? OR s.student_name LIKE ?)
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
      shield_status: (res.results?.[0]?.created_at || "").slice(0,10) === trtDateStr ? "active" : "stale",
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
    const user = currentUser || await getCurrentUser(request, db).catch(() => null);
    if (!user) return errorResponse("Dışa aktarma işlemi için oturum açmanız gerekmektedir.", 401, "UNAUTHORIZED");

    const kind = exportMatch[1];
    if (kind === "audit" && user.role !== ROLE_ADMIN) {
      return errorResponse("Denetim kayıtlarını yalnızca yönetici dışa aktarabilir.", 403, "FORBIDDEN");
    }
    if (["all", "payments", "expenses", "students"].includes(kind) && user.role !== ROLE_ADMIN && user.role !== "muhasebe") {
      return errorResponse("Bu verileri dışa aktarma yetkiniz bulunmamaktadır.", 403, "FORBIDDEN");
    }

    const escCsv = (v) => `"${String(v ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
    let csv = "\uFEFF"; // UTF-8 BOM for Excel

    if (kind === "students" || kind === "all") {
      csv += "ÖĞRENCİLER\n";
      csv += "Ad Soyad;Telefon;Okul;Sınıf;Veli;Veli Tel;Program;Toplam Ücret;Ödenen;Kalan;Taksit;İlk Vade\n";
      const res = await db.prepare("SELECT * FROM students ORDER BY student_name ASC").all();
      for (const s of res.results || []) {
        const rem = (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0);
        csv += `${escCsv(s.student_name)};${escCsv(s.student_phone)};${escCsv(s.school)};${escCsv(s.student_class)};${escCsv(s.parent_name)};${escCsv(s.parent_phone)};${escCsv(s.program)};${s.total_fee || 0};${s.paid_amount || 0};${rem};${s.installment_count || 1};${escCsv(s.due_date)}\n`;
      }
      csv += "\n";
    }

    if (kind === "payments" || kind === "all") {
      csv += "TAHSİLATLAR\n";
      csv += "Tarih;Öğrenci;Tutar;Yöntem;Banka;Açıklama;Kaydeden\n";
      const pRes = await db.prepare("SELECT p.*, s.student_name FROM payments p LEFT JOIN students s ON p.student_id = s.id WHERE COALESCE(p.is_cancelled,0)=0 ORDER BY p.payment_date DESC").all();
      for (const p of pRes.results || []) {
        csv += `${escCsv(p.payment_date)};${escCsv(p.student_name)};${p.amount || 0};${escCsv(p.method)};${escCsv(p.bank)};${escCsv(p.note)};${escCsv(p.created_by_name)}\n`;
      }
      csv += "\n";
    }

    if (kind === "expenses" || kind === "all") {
      csv += "GİDERLER\n";
      csv += "Tarih;Başlık;Kategori;Kasa/Hesap;Tutar;Kaydeden\n";
      const eRes = await db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
      for (const e of eRes.results || []) {
        csv += `${escCsv(e.expense_date)};${escCsv(e.title)};${escCsv(e.category)};${escCsv(e.account || "Nakit Ana Kasa")};${e.amount || 0};${escCsv(e.created_by_name)}\n`;
      }
      csv += "\n";
    }

    if (kind === "audit" || kind === "all") {
      csv += "DENETİM KAYITLARI\n";
      csv += "Tarih;Kullanıcı;E-posta;İşlem;Detay\n";
      const aRes = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500").all();
      for (const a of aRes.results || []) {
        csv += `${escCsv(a.created_at)};${escCsv(a.user_name)};${escCsv(a.user_email)};${escCsv(a.action)};${escCsv(a.detail)}\n`;
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
      if ((!data || data === "{}") && r2Bucket && typeof r2Bucket.get === "function") {
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
      status: (res.results?.[0]?.created_at || "").slice(0,10) === trtDateStr ? "active" : "stale",
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
    const snap = await readSnapshot(db);
    const bId = "backup_" + crypto.randomUUID();
    const notes = body.notes || "Manuel Snapshot";
    const saved = await saveSnapshot(db,env,snap,bId,isTokenAuthed ? "scheduled_20_00" : "manual",user?.name || "Otomatik Servis",notes);
    const counts = saved.counts;
    const r2Saved = saved.r2_saved;

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
    if (!result.ok) return errorResponse(result.error || "Geri yükleme başarısız oldu", 500, "RESTORE_FAILED", result);
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

    await saveSnapshot(db,env,{...rawSnap,created_at:new Date().toISOString()},backupId,"imported",user.name || "Yönetici",notes);

    const result = await restoreSnapshotData(db, rawSnap, user, backupId, notes, ctxOrPath?.waitUntil, env);
    if (!result.ok) return errorResponse(result.error || "Geri yükleme başarısız oldu", 500, "RESTORE_FAILED", result);
    return json(result);
  }

  return null;
}
