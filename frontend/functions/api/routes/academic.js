// Cloudflare Pages Functions - Academic Router (Classes, Teachers, Attendance, Schedules, Homework, Mentorship)
import { json, cachedJson, errorResponse, successResponse, getCurrentUser, logAction, normalizeDate, recordWriteGuard } from "../utils.js";

export async function getTeachersList(db) {
  if (!db) return [];
  return (await db.prepare("SELECT * FROM teachers ORDER BY name ASC").all()).results || [];
}

async function validateSchedule(db,body,id="") {
  const slot = String(body.time_slot || "").replace(/\s/g,"");
  const parts = slot.split('-');
  if (!Number.isInteger(Number(body.day_of_week)) || Number(body.day_of_week)<1 || Number(body.day_of_week)>7 || parts.length!==2 || parts.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || parts[0]>=parts[1] || !body.subject?.trim() || !body.class_id) return errorResponse("Geçersiz gün, saat aralığı, sınıf veya ders",422);
  const conflict = await db.prepare(`SELECT id FROM schedules WHERE id!=? AND day_of_week=? AND substr(replace(time_slot,' ',''),1,5)<? AND substr(replace(time_slot,' ',''),7,5)>? AND (class_id=? OR (teacher_name=? AND teacher_name!='') OR (room=? AND room!='')) LIMIT 1`).bind(id,Number(body.day_of_week),parts[1],parts[0],body.class_id,body.teacher_name || "",body.room || "").first();
  return conflict ? errorResponse("Sınıf, öğretmen veya derslik bu saat aralığında dolu",409,"SCHEDULE_CONFLICT") : null;
}

export async function handleAcademicRoutes(ctxOrPath, maybeReq, maybeEnv, maybeUrl) {
  const isObj = typeof ctxOrPath === "object" && ctxOrPath !== null && ctxOrPath.request;
  const request = isObj ? ctxOrPath.request : maybeReq;
  const path = isObj ? ctxOrPath.path : ctxOrPath;
  const env = isObj ? ctxOrPath.env : maybeEnv;
  const db = (isObj ? ctxOrPath.db : maybeEnv?.DB) || env?.DB;
  const url = isObj ? ctxOrPath.url : maybeUrl;
  const currentUser = isObj ? ctxOrPath.user : null;

  if (path === "/appointments" && request.method === "GET") {
    return json((await db.prepare("SELECT a.*,s.student_name FROM appointments a JOIN students s ON s.id=a.student_id ORDER BY a.date DESC,a.time_slot").all()).results || []);
  }
  if (path === "/appointments" && request.method === "POST") {
    const body = await request.json();
    const date = normalizeDate(body.date);
    if (!date || !body.subject?.trim() || !body.teacher_name?.trim() || !/^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/.test(body.time_slot || "") || !await db.prepare("SELECT id FROM students WHERE id=?").bind(body.student_id || "").first()) return errorResponse("Geçersiz randevu bilgileri",422);
    const [start,end] = body.time_slot.replace(/\s/g,"").split('-');
    if(start>=end) return errorResponse("Bitiş saati başlangıçtan sonra olmalıdır",422);
    const conflict = await db.prepare("SELECT id FROM appointments WHERE status!='iptal' AND date=? AND substr(replace(time_slot,' ',''),1,5)<? AND substr(replace(time_slot,' ',''),7,5)>? AND (student_id=? OR teacher_name=? OR (room=? AND room!='')) LIMIT 1").bind(date,end,start,body.student_id,body.teacher_name,body.room || "").first();
    if(conflict) return errorResponse("Öğrenci, öğretmen veya derslik bu saat aralığında dolu",409);
    const id="appointment-"+crypto.randomUUID();
    await db.prepare("INSERT INTO appointments(id,student_id,teacher_name,subject,date,time_slot,room,topic,status,created_at) VALUES(?,?,?,?,?,?,?,?,'onaylandi',datetime('now'))").bind(id,body.student_id,body.teacher_name,body.subject,date,body.time_slot,body.room || "",body.topic || "").run();
    await logAction(db,currentUser,"appointment.create","appointment",id,"Etüt randevusu oluşturuldu");
    return json({id,ok:true},201);
  }
  const appointmentMatch = path.match(/^\/appointments\/([^/]+)$/);
  if(appointmentMatch && ["PATCH","DELETE"].includes(request.method)) {
    const body=request.method==="PATCH" ? await request.json() : {status:"iptal"};
    if(!["bekliyor","onaylandi","tamamlandi","iptal"].includes(body.status)) return errorResponse("Geçersiz durum",422);
    const previous=await db.prepare('SELECT * FROM appointments WHERE id=?').bind(appointmentMatch[1]).first();
    if(!previous)return errorResponse('Randevu bulunamadı',404);
    const guard=recordWriteGuard(db,'appointments',previous,body._expected,['status']);
    if(guard.error)return guard.error;
    await db.batch([guard.statement,db.prepare("UPDATE appointments SET status=? WHERE id=?").bind(body.status,appointmentMatch[1])]);
    await logAction(db,currentUser,"appointment.update","appointment",appointmentMatch[1],body.status);
    return json({ok:true});
  }

  // ---------------- CLASSES ----------------
  if (path === "/classes" && request.method === "GET") {
    if (!db) return json([]);
    const res = await db.prepare("SELECT * FROM classes ORDER BY name ASC").all();
    return cachedJson(res.results || [], 60, 300, 600);
  }

  if (path === "/classes" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const c = await request.json();
    const id = "class_" + crypto.randomUUID().slice(0, 8);
    await db
      .prepare(
        "INSERT INTO classes (id, name, level, room, capacity, teacher, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      )
      .bind(
        id,
        c.name || "",
        c.level || "",
        c.room || "",
        parseInt(c.capacity) || 20,
        c.teacher || "",
        user?.user_id || "",
        user?.name || ""
      )
      .run();

    await logAction(db, user, "class.create", "class", id, `${c.name} sınıfı oluşturuldu`);
    return json({ id, ...c });
  }

  const classItemMatch = path.match(/^\/classes\/([^\/]+)$/);
  if (classItemMatch) {
    const classId = classItemMatch[1];
    if (request.method === "PUT" || request.method === "PATCH") {
      const user = await getCurrentUser(request, db);
      const c = await request.json();
      const previous=await db.prepare('SELECT * FROM classes WHERE id=?').bind(classId).first();
      if(!previous)return errorResponse('Kayıt bulunamadı',404);
      const guard=recordWriteGuard(db,'classes',previous,c._expected,['name', 'level', 'room', 'capacity', 'teacher']);
      if(guard.error)return guard.error;
      await db.batch([guard.statement,db
        .prepare(
          "UPDATE classes SET name = ?, level = ?, room = ?, capacity = ?, teacher = ? WHERE id = ?"
        )
        .bind(
          c.name ?? previous.name,
          c.level ?? previous.level,
          c.room ?? previous.room,
          c.capacity===undefined?previous.capacity:Number(c.capacity),
          c.teacher ?? previous.teacher,
          classId
        )
        ]);
      await logAction(db, user, "class.update", "class", classId, `${c.name} sınıfı güncellendi`);
      const updated = await db.prepare("SELECT * FROM classes WHERE id = ?").bind(classId).first();
      return json(updated);
    }
    if (request.method === "DELETE") {
      const user = await getCurrentUser(request, db);
      await db.prepare("DELETE FROM classes WHERE id = ?").bind(classId).run();
      await logAction(db, user, "class.delete", "class", classId, `Sınıf silindi: ${classId}`);
      return json({ ok: true });
    }
  }

  // ---------------- TEACHERS ----------------
  if ((path === "/teachers" || path.endsWith("/Ogretmens/GetAll") || path.endsWith("/Ogretmens/GetAllOgretmenWithBranslar")) && request.method === "GET") {
    const teachers = await getTeachersList(db);
    return cachedJson(teachers, 60, 300, 600);
  }

  if (path === "/teachers" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const t = await request.json();
    if (!t.name || !t.branch) {
      return errorResponse("Öğretmen adı ve branşı zorunludur", 422);
    }
    const id = t.id || "tch_" + crypto.randomUUID().slice(0, 8);
    await getTeachersList(db);
    await db
      .prepare(
        "INSERT INTO teachers (id, name, branch, title, phone, email, classes, weekly_hours, status, role, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      )
      .bind(
        id,
        t.name || "",
        t.branch || "",
        t.title || "",
        t.phone || "",
        t.email || "",
        t.classes || "",
        parseInt(t.weekly_hours) || 0,
        t.status || "Aktif",
        t.role || "ogretmen",
        t.notes || ""
      )
      .run();
    await logAction(db, user, "teacher.create", "teacher", id, `${t.name} (${t.branch}) eğitmeni eklendi`);
    const created = await db.prepare("SELECT * FROM teachers WHERE id = ?").bind(id).first();
    return json(created || { id, ...t }, 201);
  }

  const teacherItemMatch = path.match(/^\/teachers\/([^\/]+)$/);
  if (teacherItemMatch) {
    const teacherId = teacherItemMatch[1];
    if (request.method === "PUT" || request.method === "PATCH") {
      const user = await getCurrentUser(request, db);
      const t = await request.json();
      const previous=await db.prepare('SELECT * FROM teachers WHERE id=?').bind(teacherId).first();
      if(!previous)return errorResponse('Kayıt bulunamadı',404);
      const guard=recordWriteGuard(db,'teachers',previous,t._expected,['name', 'branch', 'title', 'phone', 'email', 'classes', 'weekly_hours', 'status', 'notes']);
      if(guard.error)return guard.error;
      await getTeachersList(db);
      await db.batch([guard.statement,db
        .prepare(`
          UPDATE teachers SET
            name = COALESCE(?, name),
            branch = COALESCE(?, branch),
            title = COALESCE(?, title),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            classes = COALESCE(?, classes),
            weekly_hours = COALESCE(?, weekly_hours),
            status = COALESCE(?, status),
            notes = COALESCE(?, notes)
          WHERE id = ?
        `)
        .bind(
          t.name ?? null,
          t.branch ?? null,
          t.title ?? null,
          t.phone ?? null,
          t.email ?? null,
          t.classes ?? null,
          t.weekly_hours !== undefined ? parseInt(t.weekly_hours) : null,
          t.status ?? null,
          t.notes ?? null,
          teacherId
        )
        ]);
      await logAction(db, user, "teacher.update", "teacher", teacherId, `${t.name || teacherId} eğitmeni güncellendi`);
      const updated = await db.prepare("SELECT * FROM teachers WHERE id = ?").bind(teacherId).first();
      return json(updated || { id: teacherId, ...t });
    }
    if (request.method === "DELETE") {
      const user = await getCurrentUser(request, db);
      await getTeachersList(db);
      await db.prepare("DELETE FROM teachers WHERE id = ?").bind(teacherId).run();
      await logAction(db, user, "teacher.delete", "teacher", teacherId, `Eğitmen silindi: ${teacherId}`);
      return json({ ok: true, id: teacherId });
    }
  }

  // ---------------- ATTENDANCE ----------------
  if (path === "/attendance" && request.method === "GET") {
    if (!db) return json([]);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const classId = url.searchParams.get("class_id");

    let query = `
      SELECT
        s.id as student_id,
        s.student_name,
        s.student_class,
        s.parent_name,
        s.parent_phone,
        COALESCE(a.id, '') as attendance_id,
        COALESCE(a.date, ?) as date,
        COALESCE(a.class_id, s.student_class) as class_id,
        COALESCE(a.lesson_slot, 'Tüm Gün') as lesson_slot,
        COALESCE(a.status, 'geldi') as status,
        COALESCE(a.note, '') as note,
        COALESCE(a.notified_parent, 0) as notified_parent
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ? AND (? = '' OR a.lesson_slot = ?)
    `;
    const slot = url.searchParams.get("lesson_slot") || "";
    const params = [date, date, slot, slot];

    if (classId) {
      query += " WHERE s.student_class = ? OR s.student_class = (SELECT name FROM classes WHERE id=?) OR a.class_id = ?";
      params.push(classId, classId, classId);
    }
    query += " ORDER BY s.student_name ASC";

    const res = await db.prepare(query).bind(...params).all();
    return json(res.results || []);
  }

  if (path === "/attendance" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const body = await request.json();
    const date = normalizeDate(body.date || new Date().toISOString());
    const records = body.records || [];
    if (!date || !Array.isArray(records) || !records.length || records.length>120) return errorResponse("Geçersiz yoklama",422);

    const statements = [];const seen=new Set();
    for (const rec of records) {
      if (!rec?.student_id || seen.has(rec.student_id) || !["geldi","gelmedi","gec","izinli","raporlu"].includes(rec.status || "geldi") || !await db.prepare("SELECT id FROM students WHERE id=?").bind(rec.student_id).first()) return errorResponse("Geçersiz öğrenci veya yoklama durumu",422);
      seen.add(rec.student_id);
      const slot = rec.lesson_slot || body.lesson_slot || "Tüm Gün";
      const previous=await db.prepare('SELECT * FROM attendance WHERE student_id=? AND date=? AND lesson_slot=?').bind(rec.student_id,date,slot).first();
      const guard=recordWriteGuard(db,'attendance',previous,rec._expected,['status','note','notified_parent'],previous||{status:'geldi',note:'',notified_parent:0},{student_id:rec.student_id,date,lesson_slot:slot});
      if(guard.error)return guard.error;
      statements.push(guard.statement);
      const aid = previous?.id || "att-" + crypto.randomUUID();
      statements.push(db.prepare("DELETE FROM attendance WHERE student_id = ? AND date = ? AND lesson_slot = ?").bind(rec.student_id,date,slot));
      statements.push(db.prepare(`
        INSERT INTO attendance (id, date, class_id, student_id, lesson_slot, status, note, notified_parent, created_by, created_by_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        aid,
        date,
        rec.class_id || "",
        rec.student_id,
        slot,
        rec.status || "geldi",
        rec.note || "",
        rec.notified_parent ? 1 : 0,
        user?.user_id || "",
        user?.name || ""
      ));
    }
    await db.batch(statements);

    await logAction(db, user, "attendance.save", "attendance", date, `${date} tarihli ${records.length} yoklama kaydı kaydedildi`);
    return json({ ok: true, count: records.length });
  }

  if (path === "/attendance/notify" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const body = await request.json();
    if (body.student_id && body.date) {
      await db.prepare("UPDATE attendance SET notified_parent = 1 WHERE student_id = ? AND date = ?").bind(body.student_id, body.date).run();
      await logAction(db, user, "attendance.parent_notified", "student", body.student_id, "Veliye yoklama bildirimi iletildi");
    }
    return json({ ok: true });
  }

  // ---------------- SCHEDULES ----------------
  if (path === "/schedules" && request.method === "GET") {
    if (!db) return json([]);
    const classId = url.searchParams.get("class_id");
    let query = "SELECT sc.*, c.name as class_name FROM schedules sc LEFT JOIN classes c ON sc.class_id = c.id";
    const params = [];
    if (classId) {
      query += " WHERE sc.class_id = ?";
      params.push(classId);
    }
    query += " ORDER BY sc.day_of_week ASC, sc.time_slot ASC";
    const res = await db.prepare(query).bind(...params).all();
    return json(res.results || []);
  }

  if (path === "/schedules" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const body = await request.json();
    if (!body.subject?.trim() || !body.time_slot?.trim()) {
      return errorResponse("Ders adı ve saat aralığı zorunludur", 422);
    }
    const id = body.id || "sch-" + crypto.randomUUID().slice(0, 8);
    const invalid = await validateSchedule(db,body);
    if (invalid) return invalid;
    await db.prepare(`
      INSERT INTO schedules (id, class_id, day_of_week, time_slot, subject, teacher_name, room, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id,
      body.class_id || "",
      Number(body.day_of_week) || 1,
      body.time_slot.trim(),
      body.subject.trim(),
      body.teacher_name || "",
      body.room || ""
    ).run();
    await logAction(db, user, "schedule.create", "schedule", id, `${body.subject} dersi programa eklendi`);
    return json({ id, ok: true }, 201);
  }

  const scheduleIdMatch = path.match(/^\/schedules\/([^\/]+)$/);
  if (scheduleIdMatch && request.method === "PUT") {
    const user = await getCurrentUser(request, db);
    const id = scheduleIdMatch[1];
    const body = await request.json();
    const previous = await db.prepare("SELECT * FROM schedules WHERE id=?").bind(id).first();
    if (!previous) return errorResponse("Ders bulunamadı",404);
    const guard=recordWriteGuard(db,'schedules',previous,body._expected,['class_id','day_of_week','time_slot','subject','teacher_name','room']);
    if(guard.error)return guard.error;
    const invalid = await validateSchedule(db,{...previous,...body},id);
    if (invalid) return invalid;
    await db.batch([guard.statement,db.prepare(`
      UPDATE schedules SET
        class_id = COALESCE(?, class_id),
        day_of_week = COALESCE(?, day_of_week),
        time_slot = COALESCE(?, time_slot),
        subject = COALESCE(?, subject),
        teacher_name = COALESCE(?, teacher_name),
        room = COALESCE(?, room)
      WHERE id = ?
    `).bind(
      body.class_id !== undefined ? body.class_id : null,
      body.day_of_week !== undefined && body.day_of_week !== null ? Number(body.day_of_week) : null,
      body.time_slot !== undefined ? body.time_slot : null,
      body.subject !== undefined ? body.subject : null,
      body.teacher_name !== undefined ? body.teacher_name : null,
      body.room !== undefined ? body.room : null,
      id
    )]);
    await logAction(db, user, "schedule.update", "schedule", id, `${body.subject || "Ders"} güncellendi`);
    return json({ ok: true });
  }

  if (scheduleIdMatch && request.method === "DELETE") {
    const user = await getCurrentUser(request, db);
    const id = scheduleIdMatch[1];
    await db.prepare("DELETE FROM schedules WHERE id = ?").bind(id).run();
    await logAction(db, user, "schedule.delete", "schedule", id, "Ders programı saati silindi");
    return json({ ok: true });
  }

  // ---------------- HOMEWORK ----------------
  if (path === "/homework" && request.method === "GET") {
    if (!db) return json([]);
    const classId = url.searchParams.get("class_id");
    let query = `
      SELECT h.*, c.name as class_name,
        COUNT(s.id) as total_submissions,
        SUM(CASE WHEN s.status = 'yapildi' THEN 1 ELSE 0 END) as completed_count
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN homework_submissions s ON h.id = s.homework_id
    `;
    const params = [];
    if (classId) {
      query += " WHERE h.class_id = ?";
      params.push(classId);
    }
    query += " GROUP BY h.id ORDER BY h.due_date DESC";
    const res = await db.prepare(query).bind(...params).all();
    return json(res.results || []);
  }

  if (path === "/homework" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const body = await request.json();
    if (!body.title?.trim() || !body.subject?.trim()) {
      return errorResponse("Ödev başlığı ve ders adı zorunludur", 422);
    }
    const id = body.id || "hw-" + crypto.randomUUID().slice(0, 8);
    await db.prepare(`
      INSERT INTO homework (id, class_id, subject, title, source_book, description, due_date, teacher_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id,
      body.class_id || "",
      body.subject.trim(),
      body.title.trim(),
      body.source_book || "",
      body.description || "",
      body.due_date || new Date().toISOString().slice(0, 10),
      body.teacher_name || user?.name || ""
    ).run();
    await logAction(db, user, "homework.create", "homework", id, `Ödev verildi: ${body.title}`);
    return json({ id, ok: true }, 201);
  }

  const homeworkIdMatch = path.match(/^\/homework\/([^\/]+)$/);
  if (homeworkIdMatch && request.method === "DELETE") {
    const user = await getCurrentUser(request, db);
    const id = homeworkIdMatch[1];
    await db.batch([db.prepare("DELETE FROM homework_submissions WHERE homework_id = ?").bind(id),db.prepare("DELETE FROM homework WHERE id = ?").bind(id)]);
    await logAction(db, user, "homework.delete", "homework", id, "Ödev silindi");
    return json({ ok: true });
  }

  const hwSubMatch = path.match(/^\/homework\/([^\/]+)\/submissions$/);
  if (hwSubMatch && request.method === "GET") {
    const hwId = hwSubMatch[1];
    const hw = await db.prepare("SELECT * FROM homework WHERE id = ?").bind(hwId).first();
    if (!hw) return errorResponse("Ödev bulunamadı", 404);

    const res = await db.prepare(`
      SELECT
        st.id as student_id,
        st.student_name,
        st.student_class,
        st.parent_phone,
        COALESCE(sub.id, '') as submission_id,
        COALESCE(sub.status, 'yapilmadi') as status,
        COALESCE(sub.note, '') as note
      FROM students st
      LEFT JOIN homework_submissions sub ON sub.student_id = st.id AND sub.homework_id = ?
      WHERE st.student_class = ? OR st.student_class = (SELECT name FROM classes WHERE id=?)
      ORDER BY st.student_name ASC
    `).bind(hwId,hw.class_id,hw.class_id).all();

    return json({ homework: hw, students: res.results || [] });
  }

  if (hwSubMatch && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const hwId = hwSubMatch[1];
    const body = await request.json();
    const records = Array.isArray(body) ? body : body?.submissions;
    const hw=await db.prepare('SELECT * FROM homework WHERE id=?').bind(hwId).first();
    if(!hw)return errorResponse('Ödev bulunamadı',404);
    if(!Array.isArray(records)||!records.length||records.length>120)return errorResponse('Geçersiz teslim listesi',422);
    const seen=new Set();const statements=[];
    for(const r of records){
      if(!r?.student_id||seen.has(r.student_id)||!['yapildi','yapilmadi','eksik','gec'].includes(r.status)||!await db.prepare('SELECT id FROM students WHERE id=?').bind(r.student_id).first())return errorResponse('Geçersiz öğrenci veya teslim durumu',422);
      seen.add(r.student_id);
      const previous=await db.prepare('SELECT * FROM homework_submissions WHERE homework_id=? AND student_id=?').bind(hwId,r.student_id).first();
      const guard=recordWriteGuard(db,'homework_submissions',previous,r._expected,['status','note'],previous||{status:'yapilmadi',note:''},{homework_id:hwId,student_id:r.student_id});
      if(guard.error)return guard.error;
      statements.push(guard.statement);
      const subId=previous?.id||'sub-'+crypto.randomUUID();
      statements.push(db.prepare('DELETE FROM homework_submissions WHERE homework_id=? AND student_id=?').bind(hwId,r.student_id));
      statements.push(db.prepare("INSERT INTO homework_submissions(id,homework_id,student_id,status,note,updated_at) VALUES(?,?,?,?,?,datetime('now'))").bind(subId,hwId,r.student_id,r.status,r.note||''));
    }
    await db.batch(statements);

    await logAction(db, user, "homework.submit_update", "homework", hwId, `${records.length} ödev teslim durumu güncellendi`);
    return json({ ok: true });
  }

  // ---------------- MENTORSHIP ----------------
  if (path === "/mentorship" && request.method === "GET") {
    if (!db) return json([]);
    const studentId = url.searchParams.get("student_id");
    let query = `
      SELECT m.*, s.student_name, s.student_class, s.student_phone, s.parent_phone
      FROM mentorship m
      LEFT JOIN students s ON m.student_id = s.id
    `;
    const params = [];
    if (studentId) {
      query += " WHERE m.student_id = ?";
      params.push(studentId);
    }
    query += " ORDER BY m.session_date DESC";
    const res = await db.prepare(query).bind(...params).all();
    return json(res.results || []);
  }

  if (path === "/mentorship" && request.method === "POST") {
    const user = await getCurrentUser(request, db);
    const body = await request.json();
    if (!body.student_id) return errorResponse("Öğrenci seçimi zorunludur", 422);
    const id = body.id || "men-" + crypto.randomUUID().slice(0, 8);
    await db.prepare(`
      INSERT INTO mentorship (
        id, student_id, mentor_name, session_date, target_uni, target_department,
        weekly_target_questions, solved_questions, topics_covered, next_session_date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id,
      body.student_id,
      body.mentor_name || user?.name || "Rehberlik Servisi",
      body.session_date || new Date().toISOString().slice(0, 10),
      body.target_uni || "",
      body.target_department || "",
      Number(body.weekly_target_questions) || 0,
      Number(body.solved_questions) || 0,
      body.topics_covered || "",
      body.next_session_date || "",
      body.notes || ""
    ).run();
    await logAction(db, user, "mentorship.create", "mentorship", id, "Koçluk görüşme kaydı eklendi");
    return json({ id, ok: true }, 201);
  }

  const mentorshipIdMatch = path.match(/^\/mentorship\/([^\/]+)$/);
  if (mentorshipIdMatch && request.method === "DELETE") {
    const user = await getCurrentUser(request, db);
    const id = mentorshipIdMatch[1];
    await db.prepare("DELETE FROM mentorship WHERE id = ?").bind(id).run();
    await logAction(db, user, "mentorship.delete", "mentorship", id, "Koçluk kaydı silindi");
    return json({ ok: true });
  }

  return null;
}
