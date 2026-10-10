import React from "react";
import { ShieldAlert } from "lucide-react";

export const CAN = {
  student_create:  ["admin"],
  payment_create:  ["admin", "muhasebe"],
  expense_create:  ["admin", "muhasebe"],
  class_create:    ["admin"],
  audit_view:      ["admin"],
  user_manage:     ["admin"],
  reports_view:    ["admin", "muhasebe"],
  reminders_view:  ["admin", "muhasebe"],
  export_data:     ["admin", "muhasebe"],
  page_dashboard:  ["admin", "muhasebe", "ogretmen"],
  page_students:   ["admin", "muhasebe", "ogretmen"],
  page_exams:      ["admin", "muhasebe", "ogretmen"],
  page_attendance: ["admin", "ogretmen"],
  page_schedules:  ["admin", "muhasebe", "ogretmen"],
  page_payments:   ["admin", "muhasebe"],
  page_classes:    ["admin", "ogretmen"],
  page_teachers:   ["admin", "muhasebe", "ogretmen"],
  page_documents:  ["admin", "muhasebe", "ogretmen"],
  page_users:      ["admin"],
  page_audit:      ["admin"],
  page_reports:    ["admin", "muhasebe"],
  page_reminders:  ["admin", "muhasebe"],
};

export const can = (me, action) => {
  if (!me || !me.role) return false;
  if (Array.isArray(action)) return action.includes(me.role);
  return (CAN[action] || []).includes(me.role);
};

export function AuthGuard({ me, action, children, fallback = null }) {
  const allowed = can(me, action);

  if (!allowed) {
    if (fallback) return fallback;
    return (
      <div 
        data-testid="auth-guard-unauthorized"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
          textAlign: "center",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #fee2e2",
          margin: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", marginBottom: 16 }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
          Yetkisiz Erişim Koruması
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: 0, lineHeight: 1.5 }}>
          Bu sayfayı veya modülü görüntülemek için gerekli kullanıcı yetkisine sahip değilsiniz. Lütfen kurum yöneticiniz ile iletişime geçin.
        </p>
      </div>
    );
  }

  return children;
}

export default AuthGuard;
