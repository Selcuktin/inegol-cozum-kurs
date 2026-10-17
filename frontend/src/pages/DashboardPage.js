import React, { useMemo, useState } from "react";
import {
  CircleDollarSign,
  Wallet,
  Users,
  ChevronRight,
  Plus,
  Receipt,
  FileText,
  Calendar,
  MessageCircle,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import AccountingService, { trNorm } from "../lib/edesisAccountingService";
import { PaymentTable, money } from "../components/PaymentTable";
import { openWhatsApp } from "../EdesisModules";
import { can } from "./AuthGuard";

export function PageHead({ eyebrow, title, children }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="head-actions">{children}</div>
    </div>
  );
}

export function Button({ children, onClick, secondary = false, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} className={secondary ? "btn secondary" : "btn"}>
      {children}
    </button>
  );
}

export function Stat({ icon: Icon, label, value, note, color, trend, onClick }) { 
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }} title={`${label} modülünü aç`}>
      <div className={`stat-icon ${color}`}><Icon size={19} /></div>
      <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
      <em className={color}>{trend}</em>
    </div>
  ); 
}

function formatVadeDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return String(dateStr);
  }
}

function getVadeBadge(dateStr) {
  if (!dateStr) return { label: "Tarihsiz", color: "#64748b", bg: "#f1f5f9" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { label: "Bekliyor", color: "#64748b", bg: "#f1f5f9" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)} gün gecikti`, color: "#b91c1c", bg: "#fef2f2", isOverdue: true };
  } else if (diffDays === 0) {
    return { label: "Bugün ödenecek", color: "#b45309", bg: "#fffbeb", isToday: true };
  } else if (diffDays <= 7) {
    return { label: `${diffDays} gün kaldı`, color: "#1d4ed8", bg: "#eff6ff" };
  } else {
    return { label: `${diffDays} gün sonra`, color: "#15803d", bg: "#f0fdf4" };
  }
}

export function DashboardPage({
  me,
  data = {},
  totalCollected = 0,
  totalExpected = 0,
  totalExpenses = 0,
  onOpen,
  onNavigate,
  onSelect
}) {
  const outstanding = data.accounting?.totalRemaining ?? data.summary?.totalRemaining ?? Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round(((totalExpected-outstanding) / totalExpected) * 100) : 0;
  const todayLabel = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date()).toUpperCase();

  const studentsCount = (data.students || []).length;
  const contractsCount = (data.contracts || []).filter(c=>!c.is_deleted && Number(c.durum)===1).length;

  // Yaklaşan & Vadesi Gelen Tahsilatlar (Ne Zaman, Kimden, Ne Kadar Alınacak)
  const upcomingInstallments = useMemo(() => {
    const studentsList = data.students || [];
    let insts = [];
    try {
      insts = AccountingService.getInstallments(studentsList);
    } catch {
      insts = [];
    }

    const pending = (insts || []).filter((i) => {
      const remaining = Number(i.kalanTutar !== undefined ? i.kalanTutar : (i.taksitTutari - (i.tahsilEdilen || 0)));
      return remaining >= 1;
    });

    if (pending.length > 0) {
      pending.sort((a, b) => new Date(a.vadeTarihi || a.due_date || "2099-12-31") - new Date(b.vadeTarihi || b.due_date || "2099-12-31"));
      return pending.map((inst) => {
        const s = studentsList.find((st) =>
          (st.id && String(st.id) === String(inst.studentId || inst.student_id))
        );
        const parentName = s?.parent_name && s.parent_name !== s.student_name ? s.parent_name : (s?.parent_name || "Veli");
        const parentPhone = s?.parent_phone || s?.student_phone || "";
        return {
          id: inst.id,
          student_name: inst.ogrenciAdi || inst.ogrenciAdiSoyadi || s?.student_name || "Öğrenci",
          student_class: s?.student_class || "8-A",
          parent_name: parentName,
          parent_phone: parentPhone,
          sozlesmeNo: inst.sozlesmeNo || s?.sozlesme_no || "SZL",
          installment_no: inst.taksitNo || inst.installment_no || 1,
          due_date: inst.vadeTarihi || inst.due_date,
          amount: Number(inst.kalanTutar !== undefined ? inst.kalanTutar : inst.taksitTutari) || 0,
          student: s
        };
      });
    }

    return [];
  }, [data.students]);

  // Sınıf Kontenjanları (Test uyumluluğu ve sade genel bakış için)
  const classesList = useMemo(() => {
    if (data.classCapacities && data.classCapacities.length > 0) return data.classCapacities;
    const cls = data.classes && data.classes.length > 0
      ? data.classes
      : [{ id: 1, name: "8-A", capacity: 20 }, { id: 2, name: "12-A", capacity: 24 }];
    const students = data.students || [];
    return cls.map((c) => {
      const occ = students.filter((s) => s.student_class === c.name || s.class_id === c.id).length;
      const cap = c.capacity || 20;
      const rate = cap > 0 ? Math.round((occ / cap) * 100) : 0;
      return {
        id: c.id,
        name: c.name,
        level: c.level || c.name,
        occupied: occ,
        capacity: cap,
        occupancyRate: rate
      };
    });
  }, [data.classes, data.classCapacities, data.students]);

  const [installmentFilter, setInstallmentFilter] = useState("upcoming");

  const displayedInstallments = useMemo(() => {
    const valid = upcomingInstallments.filter((it) => it.amount >= 1);
    if (installmentFilter === "all") {
      return valid.slice(0, 8);
    }
    if (installmentFilter === "overdue") {
      return valid.filter((item) => {
        const badge = getVadeBadge(item.due_date);
        return badge.isOverdue;
      }).slice(0, 8);
    }
    // "upcoming" (default): strictly show only non-overdue items, closest due date first
    return valid.filter((item) => {
      const badge = getVadeBadge(item.due_date);
      return !badge.isOverdue;
    }).slice(0, 8);
  }, [upcomingInstallments, installmentFilter]);

  return (
    <div className="dashboard-page-container" data-testid="dashboard-page">
      <PageHead eyebrow={todayLabel} title="Genel Bakış">
        {can(me, "student_create") && (
          <Button testid="add-student-dashboard" onClick={() => onOpen && onOpen("student")}>
            <Users size={17} /> Öğrenci Ekle
          </Button>
        )}
      </PageHead>

      {/* YAKLAŞAN & VADESİ GELEN TAHSİLATLAR (EN YUKARIDA VE VARSAYILAN OLARAK YAKLAŞANLAR SEÇİLİ) */}
      <section className="panel" style={{ marginBottom: "16px", padding: "16px 20px", borderRadius: "10px", background: "#fff", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} style={{ color: "var(--primary)" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>Yaklaşan & Vadesi Gelen Tahsilatlar</h2>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "3px 0 0" }}>
              Ne zaman, kimden ve ne kadar tahsilat alınacağını pratik olarak takip edin
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", gap: "2px" }}>
              <button
                type="button"
                onClick={() => setInstallmentFilter("upcoming")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: installmentFilter === "upcoming" ? 700 : 500,
                  background: installmentFilter === "upcoming" ? "#fff" : "transparent",
                  color: installmentFilter === "upcoming" ? "#2563eb" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: installmentFilter === "upcoming" ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
                }}
              >
                Yaklaşanlar (Varsayılan)
              </button>
              <button
                type="button"
                onClick={() => setInstallmentFilter("overdue")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: installmentFilter === "overdue" ? 700 : 500,
                  background: installmentFilter === "overdue" ? "#fff" : "transparent",
                  color: installmentFilter === "overdue" ? "#dc2626" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: installmentFilter === "overdue" ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
                }}
              >
                Gecikenler
              </button>
              <button
                type="button"
                onClick={() => setInstallmentFilter("all")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: installmentFilter === "all" ? 700 : 500,
                  background: installmentFilter === "all" ? "#fff" : "transparent",
                  color: installmentFilter === "all" ? "#0f172a" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: installmentFilter === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
                }}
              >
                Tümü
              </button>
            </div>
            <button
              type="button"
              data-testid="view-all-payments"
              className="text-btn"
              onClick={() => onNavigate && onNavigate("reminders")}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, marginLeft: "4px" }}
            >
              Tüm Taksit Takibi <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {displayedInstallments.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", fontSize: "13px", background: "#f8fafc", borderRadius: "8px" }}>
            Seçilen kritere uygun tahsilat kaydı bulunmamaktadır.
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)", textAlign: "left", color: "#64748b", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "10px 12px" }}>Öğrenci & Sınıf</th>
                  <th style={{ padding: "10px 12px" }}>Veli & İletişim</th>
                  <th style={{ padding: "10px 12px" }}>Ne Zaman Alınacak (Vade)</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Alınacak Tutar</th>
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>Durum</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {displayedInstallments.map((item) => {
                  const badge = getVadeBadge(item.due_date);
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                      onClick={() => {
                        const targetNo = item.sozlesmeNo || item.student?.sozlesme_no || item.student_name;
                        try {
                          if (targetNo) sessionStorage.setItem("cozum_open_contract_no", targetNo);
                          if (item.student_name) sessionStorage.setItem("cozum_open_contract_student", item.student_name);
                          if (item.student?.id) sessionStorage.setItem("cozum_open_contract_student_id", String(item.student.id));
                        } catch {}
                        if (onSelect) onSelect(null);
                        if (onNavigate) onNavigate("documents");
                        if (typeof window !== "undefined" && targetNo) {
                          window.location.hash = `documents?id=${encodeURIComponent(targetNo)}`;
                        }
                      }}
                      title={`${item.student_name} sözleşme detayına git`}
                    >
                      {/* Öğrenci */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#eff6ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                            {item.student_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{item.student_name}</div>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{item.student_class} · {item.sozlesmeNo}</div>
                          </div>
                        </div>
                      </td>

                      {/* Veli */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontWeight: 600, color: "#334155" }}>{item.parent_name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--muted)" }}>
                          {item.parent_phone ? (
                            <>
                              <a href={`tel:${item.parent_phone}`} style={{ color: "inherit", textDecoration: "none" }}>{item.parent_phone}</a>
                              <button
                                type="button"
                                onClick={() => openWhatsApp(item.parent_phone, `Sayın ${item.parent_name}, Özel İnegöl Çözüm Kurs Merkezi ${item.student_name} adlı öğrencimizin taksit ödemesi (${money(item.amount)}) hakkında bilgilendirmedir.`)}
                                style={{ background: "#25d366", color: "#fff", border: "none", borderRadius: "4px", padding: "1px 5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px" }}
                                title="WhatsApp Mesajı Gönder"
                              >
                                <MessageCircle size={10} /> WA
                              </button>
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </td>

                      {/* Ne Zaman Alınacak (Vade) */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{formatVadeDate(item.due_date)}</div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 7px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: badge.color,
                            background: badge.bg,
                            marginTop: "2px"
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Tutar */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "right" }}>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{money(item.amount)}</strong>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{item.installment_no}. Taksit</div>
                      </td>

                      {/* Durum */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: badge.isOverdue ? "#fef2f2" : "#f0fdf4",
                            color: badge.isOverdue ? "#b91c1c" : "#15803d"
                          }}
                        >
                          {badge.isOverdue ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                          {badge.isOverdue ? "Gecikmede" : "Bekliyor"}
                        </span>
                      </td>

                      {/* İşlem */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetNo = item.sozlesmeNo || item.student?.sozlesme_no || item.student_name;
                            try {
                              if (targetNo) sessionStorage.setItem("cozum_open_contract_no", targetNo);
                              if (item.student_name) sessionStorage.setItem("cozum_open_contract_student", item.student_name);
                              if (item.student?.id) sessionStorage.setItem("cozum_open_contract_student_id", String(item.student.id));
                              sessionStorage.setItem("cozum_scroll_to_tahsilat", "1");
                              if (item.installment_no) sessionStorage.setItem("cozum_target_taksit_no", String(item.installment_no));
                            } catch {}
                            if (onSelect) onSelect(null);
                            if (onNavigate) onNavigate("documents");
                            if (typeof window !== "undefined" && targetNo) {
                              window.location.hash = `documents?id=${encodeURIComponent(targetNo)}`;
                            }
                            window.dispatchEvent(new CustomEvent("cozum_scroll_to_tahsilat", {
                              detail: { contractNo: targetNo, installmentNo: item.installment_no }
                            }));
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 11px",
                            background: "#10b981",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)"
                          }}
                          title="Öğrencinin sözleşmesinde tahsilat al"
                        >
                          <Plus size={12} /> Tahsilat Al
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4 ÖZET KPI KARTI (KOMPAKT & SCROLL GEREKTİRMEYEN STRIP) */}
      <div className="stats-grid" style={{ marginBottom: "12px" }}>
        <Stat
          icon={CircleDollarSign}
          label="Bu ay tahsilat"
          value={money(totalCollected)}
          note="Toplam tahsil edilen tutar"
          color="blue"
          trend={`%${collectionRate} Tahsil`}
          onClick={() => onNavigate && onNavigate("payments")}
        />
        <Stat
          icon={Wallet}
          label="Bekleyen alacak"
          value={money(outstanding)}
          note="Tahsil edilecek net bakiye"
          color="amber"
          trend="Takipte"
          onClick={() => onNavigate && onNavigate("reminders")}
        />
        <Stat
          icon={Users}
          label="Sözleşme & Öğrenci"
          value={`${contractsCount} Aktif Sözleşme`}
          note={`${studentsCount} Kayıtlı Öğrenci`}
          color="green"
          trend="Aktif Portföy"
          onClick={() => onNavigate && onNavigate("documents")}
        />
        <Stat
          icon={Receipt}
          label="Tahsilat Oranı"
          value={`%${collectionRate}`}
          note={`Toplam taahhüt: ${money(totalExpected)}`}
          color="purple"
          trend="Hedef %100"
          onClick={() => onNavigate && onNavigate("payments")}
        />
      </div>

      {/* TAHSİLAT DURUMU & GERÇEKLEŞME ÇUBUĞU (KOMPAKT) */}
      <section
        className="panel collection-panel"
        style={{ marginBottom: "16px", padding: "12px 18px", borderRadius: "10px", background: "#fff", border: "1px solid var(--border)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>Tahsilat Gerçekleşme Durumu</h2>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              İlerleme: <strong style={{ color: "var(--primary)" }}>%{collectionRate}</strong> (Kalan: <b>{money(outstanding)}</b> / Toplam: <b>{money(totalExpected)}</b>)
            </span>
          </div>
          <button
            type="button"
            className="text-btn"
            onClick={() => onNavigate && onNavigate("payments")}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Muhasebe Detayları <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ height: "8px", width: "100%", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden", display: "flex", marginBottom: "8px" }}>
          <div
            style={{
              width: `${Math.min(100, collectionRate)}%`,
              background: "linear-gradient(90deg, #2563eb 0%, #10b981 100%)",
              borderRadius: "4px",
              transition: "width 0.4s ease"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "11.5px", color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Tahsil Edilen: <strong style={{ color: "#0f172a" }}>{money(totalCollected)}</strong>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            Bekleyen Alacak: <strong style={{ color: "#0f172a" }}>{money(outstanding)}</strong>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#64748b", display: "inline-block" }} />
            Toplam Sözleşme Portföyü: <strong style={{ color: "#0f172a" }}>{money(totalExpected)}</strong>
          </span>
        </div>
      </section>

      {/* SINIF KONTENJANLARI (SADE & KOMPAKT) */}
      <section className="panel" style={{ marginBottom: "18px", padding: "18px 22px", borderRadius: "10px", background: "#fff", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>Sınıf Kontenjanları & Kayıt Durumu</h2>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "3px 0 0" }}>Şubelerdeki mevcut öğrenci sayısı ve kapasite doluluk oranları</p>
          </div>
          <button
            type="button"
            className="text-btn"
            onClick={() => onNavigate && onNavigate("classes")}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Sınıfları Yönet <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
          {classesList.map((c) => (
            <div
              key={c.id}
              onClick={() => onNavigate && onNavigate("classes")}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title={`${c.name} sınıf detayını aç`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>{c.name}</strong>
                <span style={{ fontSize: "12px", fontWeight: 600, color: c.occupancyRate > 90 ? "#dc2626" : "#2563eb" }}>
                  %{c.occupancyRate}
                </span>
              </div>
              <div style={{ height: "6px", width: "100%", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
                <div
                  style={{
                    width: `${Math.min(100, c.occupancyRate)}%`,
                    height: "100%",
                    background: c.occupancyRate > 90 ? "#dc2626" : c.occupancyRate > 70 ? "#2563eb" : "#10b981",
                    borderRadius: "3px"
                  }}
                />
              </div>
              <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                {c.occupied} / {c.capacity} Öğrenci
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SON TAHSİLATLAR TABLOSU */}
      <section className="panel recent-panel" style={{ padding: "18px 22px", borderRadius: "10px", background: "#fff", border: "1px solid var(--border)" }}>
        <div className="panel-head" style={{ marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>Son Tahsilatlar</h2>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "3px 0 0" }}>Kurum hesabına işlenen son hareketler ve tahsilat makbuzları</p>
          </div>
          {can(me, "payment_create") && (
            <button
              data-testid="quick-receipt"
              className="text-btn"
              onClick={() => onOpen && onOpen("payment")}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Makbuz oluştur <Receipt size={14} />
            </button>
          )}
        </div>
        <PaymentTable
          payments={data.payments || []}
          students={data.students || []}
          onSelect={onSelect}
        />
      </section>
    </div>
  );
}

export default DashboardPage;
