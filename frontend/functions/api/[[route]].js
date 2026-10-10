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

  // 1. CORS Pre-flight Options
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 2. Parse & Normalize Path
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/api\/?/, "/");
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  try {
    // 3. Resolve Current Authenticated User (if token present)
    const user = await getCurrentUser(request, db).catch(() => null);

    // Context bundle passed to each domain sub-router
    const ctx = {
      request,
      db,
      env,
      url,
      path,
      user,
    };

    // 4. Dispatch through domain sub-routers in prioritized sequence
    let response = await handleAuthRoutes(ctx);
    if (response) return response;

    response = await handleStudentsRoutes(ctx);
    if (response) return response;

    response = await handleContractsRoutes(ctx);
    if (response) return response;

    response = await handleAccountingRoutes(ctx);
    if (response) return response;

    response = await handleAcademicRoutes(ctx);
    if (response) return response;

    response = await handleExamRoutes(ctx);
    if (response) return response;

    response = await handleSystemRoutes(ctx);
    if (response) return response;

    // 5. Standard 404 Response if no route matched
    return errorResponse(`Endpoint bulunamadı: ${path}`, 404, "NOT_FOUND");
  } catch (err) {
    console.error(`[API Error] ${request.method} ${path}:`, err);
    return errorResponse(
      `Sunucu hatası: ${err.message || String(err)}`,
      500,
      "SERVER_ERROR",
      err.stack ? { stack: err.stack } : null
    );
  }
}
