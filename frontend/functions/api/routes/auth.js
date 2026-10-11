import { json, errorResponse, ROLE_ADMIN, ROLE_LABELS, logAction } from "../utils.js";

export async function handleAuthRoutes({ request, db, env, path, user }) {
  // Reset cookies and clear site data across all devices
  if (path === "/system/reset-cookies" || path === "/auth/clear-all-cookies") {
    return json({ ok: true, message: "Tüm cihaz çerezleri ve önbellek sıfırlandı" }, 200, {
      "Clear-Site-Data": '"cache", "cookies", "storage"',
      "Set-Cookie": "session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
    });
  }

  // Quick Login
  if (path === "/auth/quick-login" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const role = body.role in ROLE_LABELS ? body.role : ROLE_ADMIN;
    const password = String(body.password || "").trim();

    // Use environment secret if configured; fallback for local dev compatibility
    const adminPasswords = env?.ADMIN_PASSWORDS
      ? env.ADMIN_PASSWORDS.split(",").map(p => p.trim())
      : (env?.ADMIN_PASSWORD ? [env.ADMIN_PASSWORD.trim()] : ["cozum2026", "admin4321"]);
    const staffPassword = (env?.STAFF_PASSWORD || "4321").trim();

    if (role === ROLE_ADMIN) {
      if (!password || !adminPasswords.includes(password)) {
        return errorResponse("Hatalı yönetici parolası!", 401, "AUTH_FAILED");
      }
    } else {
      if (password !== staffPassword) {
        return errorResponse("Hatalı personel şifresi!", 401, "AUTH_FAILED");
      }
    }

    const email = body.email || (role === ROLE_ADMIN ? "admin@inegolcozumkurs.com" : `${role}@inegolcozumkurs.com`);
    let dbUser = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!dbUser) {
      const userId = "usr_" + crypto.randomUUID().slice(0, 10);
      const name = role === ROLE_ADMIN ? "Yönetici" : ROLE_LABELS[role] || "Kullanıcı";
      await db
        .prepare("INSERT INTO users (user_id, email, name, role, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
        .bind(userId, email, name, role)
        .run();
      dbUser = { user_id: userId, email, name, role };
    }

    const sessionToken = "tok_" + crypto.randomUUID().replace(/-/g, "");
    await db
      .prepare("INSERT INTO user_sessions (session_token, user_id, expires_at, created_at) VALUES (?, ?, datetime('now', '+7 days'), datetime('now'))")
      .bind(sessionToken, dbUser.user_id)
      .run();

    await logAction(db, dbUser, "auth.quick_login", "user", dbUser.user_id, `Hızlı giriş yapıldı (${ROLE_LABELS[role] || role})`);

    return json(
      {
        ok: true,
        user: { ...dbUser, role_label: ROLE_LABELS[dbUser.role] || dbUser.role },
        session_token: sessionToken,
      },
      200,
      {
        "Set-Cookie": `session_token=${sessionToken}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`,
      }
    );
  }

  // Session exchange
  if (path === "/auth/session" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const token = body.session_token;
    if (!token) return errorResponse("Token gerekli", 400, "MISSING_TOKEN");

    const session = await db
      .prepare("SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > datetime('now')")
      .bind(token)
      .first();

    if (!session) return errorResponse("Geçersiz oturum", 401, "INVALID_SESSION");

    const u = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(session.user_id).first();
    if (!u) return errorResponse("Kullanıcı bulunamadı", 404, "USER_NOT_FOUND");

    return json(
      {
        ok: true,
        user: { ...u, role_label: ROLE_LABELS[u.role] || u.role },
        session_token: token,
      },
      200,
      {
        "Set-Cookie": `session_token=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`,
      }
    );
  }

  // Get current user (/auth/me)
  if (path === "/auth/me" && request.method === "GET") {
    if (!user) {
      return errorResponse("Oturum açılmadı", 401, "UNAUTHORIZED");
    }
    return json({ ...user, role_label: ROLE_LABELS[user.role] || user.role });
  }

  // Logout
  if (path === "/auth/logout" && request.method === "POST") {
    return json(
      { ok: true },
      200,
      {
        "Set-Cookie": "session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
      }
    );
  }

  return null;
}
