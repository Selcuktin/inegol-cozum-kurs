// Cloudflare Pages Functions - Modular API Dispatcher
// Clean, maintainable router replacing the monolithic 3,000+ line router
import { getCorsHeaders, errorResponse, getCurrentUser, cachedJson } from "./utils.js";
import { handleAuthRoutes } from "./routes/auth.js";
import { handleStudentsRoutes } from "./routes/students.js";
import { handleContractsRoutes } from "./routes/contracts.js";
import { handleAccountingRoutes } from "./routes/accounting.js";
import { handleAcademicRoutes } from "./routes/academic.js";
import { handleLgsRoutes } from "./routes/lgs.js";
import { handleExamRoutes } from "./routes/exams.js";
import { handleSystemRoutes } from "./routes/system.js";

export { handleAuthRoutes, handleStudentsRoutes, handleContractsRoutes, handleAccountingRoutes, handleAcademicRoutes, handleExamRoutes, handleSystemRoutes };

export async function onRequest(context) {
  const { request, env } = context;
  const db = env?.DB;
  const startTime = Date.now();

  // 1. CORS Pre-flight Options
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(request, env) });
  }

  // 2. Parse & Normalize Path
  const url = new URL(request.url);
  let path = url.pathname.replace(/^(\/api)+/, "") || "/";
  if (!path.startsWith("/")) path = "/" + path;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  let user = null;
  try {
    // 3. Resolve Current Authenticated User (if token present)
    user = await getCurrentUser(request, db).catch(() => null);

    const ctx = {
      request,
      db,
      env,
      url,
      path,
      user,
      context,
      waitUntil: (p) => {
        if (typeof context?.waitUntil === "function") context.waitUntil(p);
      },
    };

    // Helper to attach observability and return response
    const finalize = (res) => {
      if (res && res.headers) {
        try {
          res.headers.set('Cache-Control','private, no-store, max-age=0');
          res.headers.set('Pragma','no-cache');
          res.headers.set('Expires','0');
          res.headers.set('Vary','Origin, Authorization, Cookie');
          res.headers.set("Server-Timing", `edge;dur=${Date.now() - startTime}`);
          const cors = getCorsHeaders(request, env);
          Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        } catch {}
      }
      if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method) || (res && res.status >= 400)) {
        console.log(JSON.stringify({
          time: new Date().toISOString(),
          type: "request_metric",
          method: request.method,
          path,
          status: res?.status || 200,
          user: user?.email || "anonymous",
          role: user?.role || "guest",
          ip: request.headers?.get("cf-connecting-ip") || "unknown",
          colo: request.cf?.colo || "local",
          duration_ms: Date.now() - startTime
        }));
      }
      return res;
    };

    // Validate the shared JSON boundary before any domain can apply a partial or malformed body.
    if((request.method!=='DELETE'||request.body!==null)&&(user||path.startsWith('/auth/'))&&['POST','PUT','PATCH','DELETE'].includes(request.method)&&request.headers.get('content-type')?.includes('application/json')){
      let body;
      try{body=await request.clone().json();}catch{return finalize(errorResponse('Geçersiz JSON isteği',400,'INVALID_JSON'));}
      if(!body||typeof body!=='object')return finalize(errorResponse('İstek bir kayıt veya kayıt listesi içermelidir',422,'VALIDATION_ERROR'));
    }

    // 4. Dispatch Auth domain routes first
    let response = await handleAuthRoutes(ctx);
    if (response) return finalize(response);

    // Fast isolated path for /backup (closes bypass and avoids touching subsequent routers)
    if (path.startsWith("/backup")) {
      const authHeader = request.headers?.get("Authorization") || "";
      const backupSecret = (env?.BACKUP_TOKEN || "").trim();
      const isTokenAuthed = !!backupSecret && authHeader === `Bearer ${backupSecret}`;
      if (!user && !isTokenAuthed) {
        return finalize(errorResponse("Yedekleme servisi için geçerli oturum veya token gereklidir.", 401, "UNAUTHORIZED"));
      }
      const backupRes = await handleSystemRoutes(ctx);
      if (backupRes) return finalize(backupRes);
      return finalize(errorResponse(`Endpoint bulunamadı: ${path}`, 404, "NOT_FOUND"));
    }

    // Public health & edge ping
    if (path === "/status" || path === "/health") {
      return finalize(cachedJson({ status: "ok", name: "İnegöl Çözüm Kurs Cloudflare Edge API", timestamp: new Date().toISOString() }, 30, 60, 120));
    }

    if (path.startsWith("/lgs/")) return finalize(await handleLgsRoutes(ctx));

    // Universal Auth Guard: All data routes require an authenticated session
    if (!user) {
      return finalize(errorResponse("Bu verilere erişmek için oturum açmanız gerekmektedir.", 401, "UNAUTHORIZED"));
    }

    // Sensitive paths (/users, /audit-logs, /security): Require Admin role
    if (path.startsWith("/users") || path.startsWith("/audit-logs") || path.startsWith("/security")) {
      if (user.role !== "admin") return finalize(errorResponse("Yalnızca yönetici bu bilgilere erişebilir ve yönetebilir.", 403, "FORBIDDEN"));
    }

    // Centralized Mutation Guard & Institutional RBAC Matrix
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      if (request.method === "DELETE" && user.role !== "admin") {
        return finalize(errorResponse("Kayıt silme işlemi yalnızca yönetici yetkisi ile gerçekleştirilebilir.", 403, "FORBIDDEN"));
      }
      if ((path.startsWith("/classes") || path.startsWith("/teachers")) && user.role !== "admin") {
        return finalize(errorResponse("Sınıf ve öğretmen yönetimi yalnızca yönetici yetkisi ile gerçekleştirilebilir.", 403, "FORBIDDEN"));
      }
      const isFin = ["/contracts", "/payments", "/expenses", "/student-incomes", "/accounting"].some((p) => path.startsWith(p));
      if (isFin && user.role !== "admin" && user.role !== "muhasebe") {
        return finalize(errorResponse("Finansal işlem yapma yetkiniz bulunmamaktadır.", 403, "FORBIDDEN"));
      }
      if (path.startsWith("/students") && user.role !== "admin" && user.role !== "muhasebe") {
        return finalize(errorResponse("Öğrenci kayıt veya düzenleme yetkiniz bulunmamaktadır.", 403, "FORBIDDEN"));
      }
    }

    // Dispatch sequentially through domain handlers
    const handlers = [handleStudentsRoutes, handleContractsRoutes, handleAccountingRoutes, handleAcademicRoutes, handleExamRoutes, handleSystemRoutes];
    for (const handler of handlers) {
      response = await handler(ctx);
      if (response) return finalize(response);
    }

    // 5. Standard 404 Response if no route matched
    return finalize(errorResponse(`Endpoint bulunamadı: ${path}`, 404, "NOT_FOUND"));
  } catch (err) {
    if(err.message?.includes('RECORD_CHANGED'))return errorResponse('Bu kayıt başka bir işlemde değişti. Yeniden açıp güncel kayıt üzerinden düzenleyin.',409,'RECORD_CHANGED');
    if(err.message?.includes('PAYMENT_PLAN_CHANGED'))return errorResponse('Ödeme planı başka bir işlemde değişti. Kaydı yeniden açıp güncel plan üzerinden düzenleyin.',409,'PAYMENT_PLAN_CHANGED');
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      type: "unhandled_api_error",
      method: request.method,
      path,
      user: user?.email || "anonymous",
      error: err.message || String(err),
      stack: err.stack,
      duration_ms: Date.now() - startTime
    }));
    return errorResponse("İşlem tamamlanamadı. Lütfen tekrar deneyin veya yöneticiyle iletişime geçin.", 500, "SERVER_ERROR");
  }
}
