import React from "react";
import {
  CircleDollarSign,
  Wallet,
  Users,
  TrendingDown,
  ChevronRight,
  Bell,
  Plus,
  Receipt
} from "lucide-react";
import { EdesisDashboardWidgets } from "../EdesisModules";
import { PaymentTable, money } from "../components/PaymentTable";
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
  const outstanding = Math.max(0, totalExpected - totalCollected);
  const todayLabel = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date()).toUpperCase();

  return (
    <div className="dashboard-page-container" data-testid="dashboard-page">
      <PageHead eyebrow={todayLabel} title="Genel Bakış">
        {can(me, "payment_create") && (
          <Button testid="add-payment-dashboard" onClick={() => onOpen && onOpen("payment")}>
            <Plus size={17} /> Tahsilat Ekle
          </Button>
        )}
        {can(me, "student_create") && (
          <Button testid="add-student-dashboard" secondary onClick={() => onOpen && onOpen("student")}>
            <Users size={17} /> Öğrenci Ekle
          </Button>
        )}
      </PageHead>

      <EdesisDashboardWidgets
        data={data}
        onNavigate={onNavigate}
        onSelectStudent={(id) => {
          const s = (data.students || []).find((x) => x.id === id);
          if (s && onSelect) onSelect(s);
          else if (onNavigate) onNavigate("students");
        }}
      />

      <div className="stats-grid">
        <Stat
          icon={CircleDollarSign}
          label="Bu ay tahsilat"
          value={money(totalCollected)}
          note="Toplam tahsil edilen"
          color="blue"
          trend="+12.8%"
          onClick={() => onNavigate && onNavigate("payments")}
        />
        <Stat
          icon={Wallet}
          label="Bekleyen alacak"
          value={money(outstanding)}
          note="Öğrencilerden kalan"
          color="amber"
          trend="Takipte"
          onClick={() => onNavigate && onNavigate("reminders")}
        />
        <Stat
          icon={Users}
          label="Aktif öğrenci"
          value={(data.students || []).filter(s => s.status === "Aktif" || s.program === "2026-2027" || s.program === "TYT - AYT" || s.program === "LGS Hazırlık").length}
          note={`${(data.students || []).length} toplam arşiv kaydı`}
          color="green"
          trend="62 Kesin Kayıt"
          onClick={() => onNavigate && onNavigate("students")}
        />
        <Stat
          icon={TrendingDown}
          label="Bu ay gider"
          value={money(totalExpenses)}
          note="Genel toplamdan düşüldü"
          color="red"
          trend="Bu ay"
          onClick={() => onOpen && onOpen("expense")}
        />
      </div>

      <div className="dashboard-grid">
        <section
          className="panel collection-panel"
          onClick={() => onNavigate && onNavigate("payments")}
          style={{ cursor: "pointer" }}
          title="Tahsilat detaylarını aç"
        >
          <div className="panel-head">
            <div>
              <h2>Tahsilat görünümü</h2>
              <p>Toplam kurs ücretlerinin gerçekleşme durumu</p>
            </div>
            <span className="period">Kasa Detayları <ChevronRight size={15} /></span>
          </div>
          <div className="progress-wrap">
            <div className="progress-number">
              <strong>{Math.round((totalCollected / (totalExpected || 1)) * 100)}%</strong>
              <span>tahsil edildi</span>
            </div>
            <div className="progress-track">
              <div style={{ width: `${Math.min(100, (totalCollected / (totalExpected || 1)) * 100)}%` }} />
            </div>
            <div className="progress-labels">
              <span><i className="dot blue" /> Tahsil edilen <b>{money(totalCollected)}</b></span>
              <span><i className="dot gray" /> Kalan bakiye <b>{money(outstanding)}</b></span>
            </div>
          </div>
          <div className="mini-chart">
            <div className="chart-y"><span>₺40K</span><span>₺20K</span><span>₺0</span></div>
            <div className="bars">
              {[42, 58, 46, 72, 62, 88, 67, 76, 55, 91, 73, 84].map((h, i) => (
                <div key={i} className="bar-col">
                  <div className={i > 8 ? "bar active" : "bar"} style={{ height: `${h}%` }} />
                  <small>{["Oca", "", "", "Şub", "", "", "Mar", "", "", "Nis", "", ""][i]}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel alerts-panel">
          <div className="panel-head">
            <div>
              <h2>Ödeme takibi</h2>
              <p>Yaklaşan ve geciken ödemeler (Tıkla ve incele)</p>
            </div>
            <button
              data-testid="view-all-payments"
              className="text-btn"
              onClick={() => onNavigate && onNavigate("reminders")}
            >
              Tümünü gör <ChevronRight size={15} />
            </button>
          </div>
          {(data.students || []).slice(0, 6).map((s, i) => (
            <div
              className="alert-row"
              key={s.id}
              onClick={() => onSelect && onSelect(s)}
              style={{ cursor: "pointer" }}
              title={`${s.student_name} detaylarını aç`}
            >
              <div className={`status-icon ${i === 1 ? "warning" : "danger"}`}><Bell size={15} /></div>
              <div className="alert-info">
                <b>{s.student_name}</b>
                <span>{i === 1 ? "Yaklaşan taksit" : "Geciken ödeme"} · {s.due_date ? new Date(s.due_date).toLocaleDateString("tr-TR") : "—"}</span>
              </div>
              <strong>{money(Math.round((s.total_fee || 0) / (s.installment_count || 1)))}</strong>
              <ChevronRight size={15} />
            </div>
          ))}
        </section>
      </div>

      <section className="panel recent-panel">
        <div className="panel-head">
          <div>
            <h2>Son tahsilatlar</h2>
            <p>Hesabınıza işlenen son hareketler</p>
          </div>
          {can(me, "payment_create") && (
            <button
              data-testid="quick-receipt"
              className="text-btn"
              onClick={() => onOpen && onOpen("payment")}
            >
              Makbuz oluştur <Receipt size={15} />
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
