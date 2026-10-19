import { json, errorResponse, ROLE_ADMIN, ROLE_LABELS, logAction, parseCookies } from "../utils.js";

// ponytail: isolate-local fallback is bounded, not a global lockout; bind LOGIN_RATE_LIMIT or use an edge rule for distributed protection.
const loginWindows=new WeakMap();
async function loginAllowed(db,env,ip){
  if(env?.LOGIN_RATE_LIMIT?.limit)return (await env.LOGIN_RATE_LIMIT.limit({key:`admin:${ip}`})).success;
  let windows=loginWindows.get(db);if(!windows){windows=new Map();loginWindows.set(db,windows);}
  const now=Date.now();
  for(const [key,w] of windows)if(w.until<=now)windows.delete(key);
  const current=windows.get(ip)||{count:0,until:now+60000};
  if(!windows.has(ip)&&windows.size>=2000)return false;
  current.count++;windows.set(ip,current);return current.count<=10;
}

export async function handleAuthRoutes({ request, db, env, path, user, waitUntil }) {
  const clientIp = request?.headers?.get("cf-connecting-ip") || request?.headers?.get("x-real-ip") || "unknown";
  const clientCountry = (request?.headers?.get("cf-ipcountry") || request?.cf?.country || "TR").toUpperCase();
  const clientAsOrg = request?.cf?.asOrganization || request?.cf?.asn || "";
  const isForeign = clientCountry && !["TR", "XX", "T1"].includes(clientCountry);

  // Reset cookies and clear site data across all devices
  if (path === "/system/reset-cookies" || path === "/auth/clear-all-cookies") {
    if(request.method!=='POST')return errorResponse('Sıfırlama için POST kullanın.',405,'METHOD_NOT_ALLOWED');
    if(!user)return errorResponse('Oturum açmanız gerekiyor.',401,'UNAUTHORIZED');
    const origin=request.headers.get('Origin');
    if(origin&&origin!==new URL(request.url).origin)return errorResponse('Geçersiz istek kaynağı.',403,'FORBIDDEN');
    return json({ ok: true, message: "Bu tarayıcının çerezleri ve önbelleği sıfırlandı" }, 200, {
      "Clear-Site-Data": '"cache", "cookies", "storage"',
      "Set-Cookie": "session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
    });
  }

  // Quick Login with Geo & IP Guard (Enforced Admin-Only)
  if (path === "/auth/quick-login" && request.method === "POST") {
    if(!db)return errorResponse('Veritabanı bağlantısı hazır değil.',503,'DATABASE_UNAVAILABLE');
    if(!await loginAllowed(db,env,clientIp))return json({ok:false,error:'Çok fazla giriş denemesi. Bir dakika sonra tekrar deneyin.',code:'RATE_LIMITED'},429,{'Retry-After':'60'});
    const body = await request.json().catch(() => ({}));
    if (body.role && body.role !== ROLE_ADMIN) {
      console.warn(JSON.stringify({type:'security.disabled_staff_login_attempt',ip:clientIp}));
      return errorResponse("Personel girişi devre dışı bırakılmıştır. Yalnızca Yönetici girişi yapılabilir.", 403, "STAFF_LOGIN_DISABLED");
    }

    const password = String(body.password || "").trim();

    // Read from environment secrets; fallback to defaults only when no env secret is configured
    const configuredAdminPasswords = env?.ADMIN_PASSWORDS
      ? env.ADMIN_PASSWORDS.split(",").map(p => p.trim()).filter(Boolean)
      : (env?.ADMIN_PASSWORD ? [env.ADMIN_PASSWORD.trim()] : []);
    const adminPasswords = configuredAdminPasswords.length > 0
      ? configuredAdminPasswords
      : [];
    if (!adminPasswords.length) return errorResponse("Yönetici giriş ayarı eksik. Kurum yöneticisine başvurunuz.", 503, "AUTH_NOT_CONFIGURED");

    if (!password || !adminPasswords.includes(password)) {
      console.warn(JSON.stringify({type:'security.failed_login',ip:clientIp,country:clientCountry}));
      return errorResponse("Hatalı yönetici parolası!", 401, "AUTH_FAILED");
    }

    const email = "admin@inegolcozumkurs.com";
    let dbUser = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!dbUser) {
      const userId = "usr_admin_root";
      const name = "Yönetici";
      await db
        .prepare("INSERT INTO users (user_id, email, name, role, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
        .bind(userId, email, name, ROLE_ADMIN)
        .run();
      dbUser = { user_id: userId, email, name, role: ROLE_ADMIN };
    }

    const sessionToken = "tok_" + crypto.randomUUID().replace(/-/g, "");
    await db
      .prepare("INSERT INTO user_sessions (session_token, user_id, expires_at, created_at) VALUES (?, ?, datetime('now', '+7 days'), datetime('now'))")
      .bind(sessionToken, dbUser.user_id)
      .run();

    const auditDetail = isForeign
      ? `Yönetici girişi yapıldı · [DİKKAT: Yurtdışı Erişim - Ülke: ${clientCountry}, IP: ${clientIp}]`
      : `Yönetici girişi yapıldı · IP: ${clientIp}`;

    await logAction(db, dbUser, "auth.quick_login", "user", dbUser.user_id, auditDetail, waitUntil);

    if (isForeign) {
      await logAction(
        db,
        dbUser,
        "security.foreign_access",
        "user",
        dbUser.user_id,
        `Yurtdışı IP erişimi ile oturum açıldı (Ülke: ${clientCountry}, IP: ${clientIp}, AS: ${clientAsOrg || "Bilinmiyor"})`,
        waitUntil
      );
    }

    const userPayload = { ...dbUser, role_label: ROLE_LABELS[dbUser.role] || dbUser.role };
    return json(
      {
        ok: true,
        user: userPayload,
        ...userPayload,
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
    const token = body?.session_token || body?.session_id || body?.sessionId || request.headers?.get("X-Session-ID");
    if (!token) return errorResponse("Token gerekli", 400, "MISSING_TOKEN");

    const session = await db
      .prepare("SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > datetime('now')")
      .bind(token)
      .first();

    if (!session) return errorResponse("Geçersiz oturum", 401, "INVALID_SESSION");

    const u = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(session.user_id).first();
    if (!u) return errorResponse("Kullanıcı bulunamadı", 404, "USER_NOT_FOUND");

    const uPayload = { ...u, role_label: ROLE_LABELS[u.role] || u.role };
    return json(
      {
        ok: true,
        user: uPayload,
        ...uPayload,
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

  // Logout - Invalidate D1 session token and clear browser cookies
  if (path === "/auth/logout" && request.method === "POST") {
    const cookies = parseCookies(request);
    const token = cookies["session_token"] || (request.headers.get("Authorization") || "").replace(/^Bearer\s+/, "");
    if (token && db) {
      await db.prepare("DELETE FROM user_sessions WHERE session_token = ?").bind(token).run().catch(() => {});
      await logAction(db, user, "auth.logout", "user", user?.user_id || token, `Oturum kapatıldı (IP: ${clientIp})`, waitUntil);
    }
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
