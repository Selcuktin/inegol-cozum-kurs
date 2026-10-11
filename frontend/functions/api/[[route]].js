// Cloudflare Pages Functions - Modular API Dispatcher
// Clean, maintainable router replacing the monolithic 3,000+ line router
import { CORS_HEADERS, json, errorResponse, getCurrentUser } from "./utils.js";
import { handleAuthRoutes } from "./routes/auth.js";
import { handleStudentsRoutes } from "./routes/students.js";
import { handleContractsRoutes } from "./routes/contracts.js";
import { handleAccountingRoutes } from "./routes/accounting.js";
import { handleAcademicRoutes } from "./routes/academic.js";
import { handleExamRoutes } from "./routes/exams.js";
import { handleSystemRoutes } from "./routes/system.js";

export {
  handleAuthRoutes,
  handleStudentsRoutes,
  handleContractsRoutes,
  handleAccountingRoutes,
  handleAcademicRoutes,
  handleExamRoutes,
  handleSystemRoutes,
};

export async function onRequest(context) {
  const { request, env } = context;
  const db = env?.DB;
  const startTime = Date.now();

  // 1. CORS Pre-flight Options
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 2. Parse & Normalize Path
  const url = new URL(request.url);
  let path = url.pathname.replace(/^(\/api)+/, "") || "/";
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  let user = null;
  try {
    // 3. Resolve Current Authenticated User (if token present)
    user = await getCurrentUser(request, db).catch(() => null);

    // Context bundle passed to each domain sub-router
    const ctx = {
      request,
      db,
      env,
      url,
      path,
      user,
      context,
      waitUntil: (p) => {
        if (typeof context?.waitUntil === "function") {
          context.waitUntil(p);
        }
      },
    };

    // Helper to attach observability and return response
    const finalize = (res) => {
      if (res && res.headers) {
        try {
          res.headers.set("Server-Timing", `edge;dur=${Date.now() - startTime}`);
        } catch {}
      }
      // Structured JSON logging for mutations and error responses
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

    // 4. Dispatch through domain sub-routers in prioritized sequence
    let response = await handleAuthRoutes(ctx);
    if (response) return finalize(response);

    response = await handleStudentsRoutes(ctx);
    if (response) return finalize(response);

    response = await handleContractsRoutes(ctx);
    if (response) return finalize(response);

    response = await handleAccountingRoutes(ctx);
    if (response) return finalize(response);

    response = await handleAcademicRoutes(ctx);
    if (response) return finalize(response);

    response = await handleExamRoutes(ctx);
    if (response) return finalize(response);

    response = await handleSystemRoutes(ctx);
    if (response) return finalize(response);

    // 5. Standard 404 Response if no route matched
    return finalize(errorResponse(`Endpoint bulunamadı: ${path}`, 404, "NOT_FOUND"));
  } catch (err) {
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
    return errorResponse(
      `Sunucu hatası: ${err.message || String(err)}`,
      500,
      "SERVER_ERROR",
      err.stack ? { stack: err.stack } : null
    );
  }
}
