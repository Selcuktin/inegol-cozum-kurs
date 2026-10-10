// Cloudflare Pages Functions - System Router (Users, Roles, Audit Logs, Export, 20:00 Daily Backup, Restore, Status)
import { json, errorResponse, successResponse, CORS_HEADERS, getCurrentUser, logAction, ROLE_ADMIN, ROLE_LABELS } from "../utils.js";

const BACKUP_TABLES = [
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
    return json({ status: "ok", name: "İnegöl Çözüm Kurs Cloudflare Edge API", timestamp: new Date().toISOString() });
  }

  // ---------------- USERS & AUDIT ----------------
  if (path === "/users" && request.method === "GET") {
    if (!db) return json([]);
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
    const res = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200").all();
    return json(res.results || []);
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

  // ---------------- BACKUP & RESTORE (20:00 DAILY SNAPSHOT & 1-CLICK RESTORE) ----------------
  if (path === "/backup" && request.method === "GET") {
    if (!db) return json({ backups: [], schedule: "Her gün 20:00 (TRT)", status: "inactive" });
    await ensureBackupTable(db);

    const dlId = url.searchParams.get("download");
    if (dlId) {
      const bRow = await db.prepare("SELECT * FROM system_backups WHERE id = ?").bind(dlId).first().catch(() => null);
      if (!bRow) return errorResponse("Yedek bulunamadı", 404);
      return new Response(bRow.snapshot_data, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${bRow.id}.json"`,
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
          await db.prepare("INSERT OR REPLACE INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'scheduled_20_00', ?, ?, 'Otomatik Zamanlayıcı (20:00 TRT)', ?)")
            .bind(bId, new Date().toISOString(), JSON.stringify(snap), JSON.stringify(counts), `${trtDateStr} Saat 20:00 Günlük Otomatik Yedek`)
            .run().catch(() => {});
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
      current_date_trt: trtDateStr
    });
  }

  if (path === "/backup" && request.method === "POST") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    await ensureBackupTable(db);
    const user = await getCurrentUser(request, db).catch(() => null);
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
    const notes = body.notes || "Manuel Yönetici Snapshot Yedeği";
    const createdBy = user?.name || "Yönetici";
    await db.prepare("INSERT INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'manual', ?, ?, ?, ?)")
      .bind(bId, new Date().toISOString(), JSON.stringify(snap), JSON.stringify(counts), createdBy, notes)
      .run();
    await logAction(db, user, "system.backup_create", "backup", bId, notes);
    return json({ ok: true, backup_id: bId, counts });
  }

  if (path === "/backup/restore" && request.method === "POST") {
    if (!db) return errorResponse("Database connection unavailable", 500);
    await ensureBackupTable(db);
    const user = await getCurrentUser(request, db).catch(() => null);
    const body = await request.json().catch(() => ({}));
    const backupId = body.backup_id;
    if (!backupId) return errorResponse("backup_id belirtilmedi", 400);

    const bRow = await db.prepare("SELECT * FROM system_backups WHERE id = ?").bind(backupId).first().catch(() => null);
    if (!bRow) return errorResponse("Yedek bulunamadı", 404);

    let snap;
    try {
      snap = JSON.parse(bRow.snapshot_data);
    } catch {
      return errorResponse("Yedek verisi çözülemedi", 400);
    }

    // 1. Önce mevcut durumu güvenlik için pre_restore olarak yedekle
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
    await db.prepare("INSERT INTO system_backups (id, created_at, backup_type, snapshot_data, table_counts, created_by, notes) VALUES (?, ?, 'pre_restore', ?, ?, 'Sistem Güvenlik', ?)")
      .bind(preId, new Date().toISOString(), JSON.stringify(preSnap), JSON.stringify(preCounts), `Geri yükleme öncesi otomatik kurtarma noktası (${backupId})`)
      .run().catch(() => {});

    // 2. Tabloları temizle ve seçili snapshot'ı geri yükle
    const restoredCounts = {};
    for (const t of BACKUP_TABLES) {
      const rows = snap.tables?.[t];
      if (Array.isArray(rows)) {
        try {
          await db.prepare("DELETE FROM " + t).run();
          let count = 0;
          for (const row of rows) {
            const keys = Object.keys(row);
            if (keys.length > 0) {
              const placeholders = keys.map(() => "?").join(", ");
              const cols = keys.join(", ");
              const values = keys.map(k => row[k]);
              await db.prepare(`INSERT INTO ${t} (${cols}) VALUES (${placeholders})`).bind(...values).run();
              count++;
            }
          }
          restoredCounts[t] = count;
        } catch (err) {
          console.error(`Restore error on table ${t}:`, err);
        }
      }
    }

    await logAction(db, user, "system.backup_restore", "backup", backupId, `Veritabanı ${backupId} yedeğinden geri yüklendi`);
    return json({
      ok: true,
      message: "Veritabanı başarıyla geri yüklendi.",
      backup_id: backupId,
      safety_backup_id: preId,
      restored_counts: restoredCounts
    });
  }

  return null;
}
