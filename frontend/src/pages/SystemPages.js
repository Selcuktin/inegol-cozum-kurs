import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  ShieldCheck,
  BellRing,
  Bell,
  Phone,
  MessageCircle,
  Download,
  FileDown,
  Search
} from "lucide-react";
import { PageHead, Button, Stat } from "./DashboardPage";
import { can } from "./AuthGuard";
import { MonthlyReportPreview } from "../components/MonthlyReportPreview";
import { openWhatsApp } from "../EdesisModules";
import { formatTrtDateTime, trIncludes } from "../lib/utils";
import { API, ROLE_LABEL } from "../components/layout/AuthAndNav";

const money = (n) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(n || 0);

export async function downloadBlob(url, filename) {
  const r = await axios.get(url, { responseType: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(r.data);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 800);
}

export function UsersPage({ me }) {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const load = async () => {
    try {
      const r = await axios.get(`${API}/users`);
      const list = Array.isArray(r.data) ? r.data : (r.data?.data || r.data?.items || r.data?.users || []);
      setUsers(list);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Yüklenemedi");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const change = async (user_id, role) => {
    try {
      await axios.put(`${API}/users/role`, { user_id, role });
      await load();
      setMsg("Rol güncellendi");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Güncellenemedi");
    }
  };

  return (
    <>
      <PageHead eyebrow="YETKİLENDİRME · PERSONEL" title="Kullanıcılar & Roller" />
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Erişim izinleri</h2>
            <p>Sadece izinli personeller giriş yapabilir. Rolleri buradan değiştirin.</p>
          </div>
          {msg && (
            <span className="text-btn" data-testid="users-msg">
              {msg}
            </span>
          )}
        </div>

        <div className="desktop-only-table table-responsive">
          <table>
            <thead>
              <tr>
                <th>KULLANICI</th>
                <th>E-POSTA</th>
                <th>MEVCUT ROL</th>
                <th>ROL DEĞİŞTİR</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const uid = u.user_id || u.id || "";
                return (
                  <tr key={uid} data-testid={`user-row-${uid}`}>
                    <td>
                      <div className="person">
                        {u.picture ? (
                          <img className="student-avatar" src={u.picture} alt="" style={{ objectFit: "cover" }} />
                        ) : (
                          <div className="student-avatar">{(u.name || "?").slice(0, 2).toUpperCase()}</div>
                        )}
                        <div>
                          <b>{u.name}</b>
                          <span>{String(uid).slice(0, 14)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="muted-cell">{u.email}</td>
                    <td>
                      <span className={`role-pill role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>
                    </td>
                    <td>
                      <select
                        className="mini-select"
                        data-testid={`role-select-${uid}`}
                        value={u.role}
                        onChange={(e) => change(uid, e.target.value)}
                        disabled={uid === me?.user_id}
                      >
                        <option value="admin">Yönetici</option>
                        <option value="muhasebe">Muhasebe</option>
                        <option value="ogretmen">Öğretmen</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-only-cards users-mobile-list">
          {users.map((u) => {
            const uid = u.user_id || u.id || "";
            return (
              <div key={uid} className="mobile-data-card user-card" data-testid={`user-card-${uid}`}>
                <div className="user-card-head">
                  <div className="person">
                    {u.picture ? (
                      <img className="student-avatar" src={u.picture} alt="" style={{ objectFit: "cover" }} />
                    ) : (
                      <div className="student-avatar">{(u.name || "?").slice(0, 2).toUpperCase()}</div>
                    )}
                    <div>
                      <b>{u.name}</b>
                      <span className="card-email">{u.email}</span>
                    </div>
                  </div>
                  <span className={`role-pill role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>
                </div>
                <div className="user-card-actions">
                  <label className="card-select-label">
                    <span>Rol Değiştir:</span>
                    <select
                      className="mini-select mobile-role-select"
                      data-testid={`role-select-mobile-${uid}`}
                      value={u.role}
                      onChange={(e) => change(uid, e.target.value)}
                      disabled={uid === me?.user_id}
                    >
                      <option value="admin">👑 Yönetici (Admin)</option>
                      <option value="muhasebe">💼 Muhasebe</option>
                      <option value="ogretmen">📚 Öğretmen</option>
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function Reminders() {
  const [items, setItems] = useState([]);
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "overdue" | "upcoming"
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/reminders?days=${days}`);
        const list = Array.isArray(r.data) ? r.data : (r.data?.data || r.data?.items || r.data?.reminders || []);
        setItems(list);
      } catch (e) {
        setMsg(e.response?.data?.detail || "Yüklenemedi");
      }
    })();
  }, [days]);

  const overdue = useMemo(() => items.filter((i) => i.status === "overdue"), [items]);
  const upcoming = useMemo(() => items.filter((i) => i.status === "upcoming"), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filterStatus === "overdue" && it.status !== "overdue") return false;
      if (filterStatus === "upcoming" && it.status !== "upcoming") return false;
      if (search.trim()) {
        const q = search.trim();
        const match =
          trIncludes(it.student_name, q) ||
          trIncludes(it.parent_name, q) ||
          trIncludes(it.parent_phone, q) ||
          trIncludes(String(it.installment_no), q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, filterStatus, search]);

  return (
    <>
      <PageHead eyebrow="TAKİP · ÖDEME HATIRLATMA" title="Hatırlatma Listesi">
        <select data-testid="reminders-days-select" value={days} onChange={(e) => setDays(Number(e.target.value))} className="mini-select">
          <option value="3">Önümüzdeki 3 gün</option>
          <option value="7">Önümüzdeki 7 gün</option>
          <option value="14">Önümüzdeki 14 gün</option>
          <option value="30">Önümüzdeki 30 gün</option>
        </select>
      </PageHead>
      <div className="reminder-banner">
        <ShieldCheck size={17} />
        <div>
          <b>NetGSM SMS entegrasyonu yakında</b>
          <span>Bu liste hazır — otomatik gönderim NetGSM API bağlanınca aktif olacak. Şimdilik telefon numaralarını tek tıkla arayabilirsiniz.</span>
        </div>
      </div>
      <div className="stats-grid compact">
        <div
          onClick={() => setFilterStatus((prev) => (prev === "overdue" ? "all" : "overdue"))}
          style={{
            cursor: "pointer",
            borderRadius: "10px",
            outline: filterStatus === "overdue" ? "2px solid #ef4444" : "none",
            outlineOffset: "2px",
            transition: "all 0.15s ease"
          }}
          title={filterStatus === "overdue" ? "Filtreyi kaldır (Tümünü göster)" : "Sadece geciken ödemeleri filtrele"}
        >
          <Stat
            icon={BellRing}
            label="Geciken ödeme"
            value={overdue.length}
            note="Vadesi geçti"
            color="red"
            trend={filterStatus === "overdue" ? "Filtrelendi ✓" : "Acil"}
          />
        </div>
        <div
          onClick={() => setFilterStatus((prev) => (prev === "upcoming" ? "all" : "upcoming"))}
          style={{
            cursor: "pointer",
            borderRadius: "10px",
            outline: filterStatus === "upcoming" ? "2px solid #f59e0b" : "none",
            outlineOffset: "2px",
            transition: "all 0.15s ease"
          }}
          title={filterStatus === "upcoming" ? "Filtreyi kaldır (Tümünü göster)" : "Sadece yaklaşan taksitleri filtrele"}
        >
          <Stat
            icon={Bell}
            label="Yaklaşan taksit"
            value={upcoming.length}
            note={`Önümüzdeki ${days} gün`}
            color="amber"
            trend={filterStatus === "upcoming" ? "Filtrelendi ✓" : "Takip"}
          />
        </div>
      </div>
      <section className="panel table-panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2>Aramaya hazır liste ({filteredItems.length})</h2>
            <p>Numaraya tıklayın · WhatsApp/SMS gönderimi entegrasyon sonrası açılır</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Durum Filtreleme Sekmeleri */}
            <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", gap: "4px" }}>
              <button
                type="button"
                data-testid="filter-all"
                onClick={() => setFilterStatus("all")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: filterStatus === "all" ? "#fff" : "transparent",
                  color: filterStatus === "all" ? "#0f172a" : "#64748b",
                  boxShadow: filterStatus === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Tümü ({items.length})
              </button>
              <button
                type="button"
                data-testid="filter-overdue"
                onClick={() => setFilterStatus("overdue")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: filterStatus === "overdue" ? "#fee2e2" : "transparent",
                  color: filterStatus === "overdue" ? "#dc2626" : "#64748b",
                  boxShadow: filterStatus === "overdue" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                🚨 Gecikenler ({overdue.length})
              </button>
              <button
                type="button"
                data-testid="filter-upcoming"
                onClick={() => setFilterStatus("upcoming")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: filterStatus === "upcoming" ? "#fef3c7" : "transparent",
                  color: filterStatus === "upcoming" ? "#b45309" : "#64748b",
                  boxShadow: filterStatus === "upcoming" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                ⏰ Yaklaşanlar ({upcoming.length})
              </button>
            </div>

            {/* Arama Kutusu */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px" }} />
              <input
                type="search"
                data-testid="reminders-search-input"
                placeholder="Öğrenci veya veli ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "6px 12px 6px 30px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  width: "190px",
                  outline: "none"
                }}
              />
            </div>

            {msg && (
              <span className="text-btn" data-testid="reminders-msg">
                {msg}
              </span>
            )}
          </div>
        </div>
        <div className="desktop-only-table table-responsive">
          <table>
            <thead>
              <tr>
                <th>DURUM</th>
                <th>ÖĞRENCİ</th>
                <th>VELİ / TELEFON</th>
                <th>TAKSİT NO</th>
                <th>VADE</th>
                <th>TUTAR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it, i) => (
                <tr key={`${it.student_id}-${i}`} data-testid={`reminder-row-${it.student_id}`}>
                  <td>
                    <span className={`status-pill ${it.status === "overdue" ? "danger" : "warning"}`}>
                      {it.status === "overdue" ? "Gecikti" : "Yaklaşan"}
                    </span>
                  </td>
                  <td>
                    <b>{it.student_name}</b>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <b>{it.parent_name}</b>
                      <a className="phone-link" href={`tel:${(it.parent_phone || "").replace(/\s/g, "")}`}>
                        <Phone size={12} /> {it.parent_phone || "—"}
                      </a>
                    </div>
                  </td>
                  <td>#{it.installment_no}</td>
                  <td>
                    {new Date(it.due_date).toLocaleDateString("tr-TR")}
                    <br />
                    <span className="muted-cell" style={{ fontSize: 10 }}>
                      {it.status === "overdue" ? `${Math.abs(it.days_diff)} gün gecikti` : `${it.days_diff} gün kaldı`}
                    </span>
                  </td>
                  <td>
                    <b className="amount">{money(it.amount_due)}</b>
                  </td>
                  <td>
                    <a
                      data-testid={`whatsapp-${it.student_id}`}
                      className="text-btn"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        if (it.parent_phone && typeof openWhatsApp === "function") {
                          e.preventDefault();
                          openWhatsApp(
                            it.parent_phone,
                            `Sayın ${it.parent_name}, ${it.student_name} adına ${new Date(it.due_date).toLocaleDateString("tr-TR")} tarihli ${money(it.amount_due)} tutarındaki taksit ödemesini hatırlatmak isteriz. İnegöl Çözüm Kurs`
                          );
                        }
                      }}
                      href={`https://wa.me/${(it.parent_phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Sayın ${it.parent_name}, ${it.student_name} adına ${new Date(it.due_date).toLocaleDateString("tr-TR")} tarihli ${money(it.amount_due)} tutarındaki taksit ödemesini hatırlatmak isteriz. İnegöl Çözüm Kurs`
                      )}`}
                    >
                      <MessageCircle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                      WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="muted-cell" style={{ textAlign: "center", padding: "30px" }}>
                    {search.trim() ? "Aramaya uygun ödeme kaydı bulunamadı." : "Bu dönemde bekleyen ödeme yok. 🎉"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-only-cards reminders-mobile-list">
          {filteredItems.map((it, i) => (
            <div key={`${it.student_id}-${i}`} className="mobile-data-card reminder-card" data-testid={`reminder-card-${it.student_id}`}>
              <div className="reminder-card-top">
                <div>
                  <b className="reminder-student-name">{it.student_name}</b>
                  <span className="card-subtext">
                    Taksit #{it.installment_no} · Vade: {new Date(it.due_date).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <span className={`status-pill ${it.status === "overdue" ? "danger" : "warning"}`}>
                  {it.status === "overdue" ? `${Math.abs(it.days_diff)} gün gecikti` : `${it.days_diff} gün kaldı`}
                </span>
              </div>
              <div className="reminder-card-mid">
                <div className="reminder-parent-stack">
                  <span className="card-label">
                    Veli: <b>{it.parent_name}</b>
                  </span>
                  <a className="phone-link" href={`tel:${(it.parent_phone || "").replace(/\s/g, "")}`}>
                    <Phone size={13} /> {it.parent_phone || "—"}
                  </a>
                </div>
                <b className="amount red-amount">{money(it.amount_due)}</b>
              </div>
              <div className="reminder-card-actions">
                <a
                  data-testid={`whatsapp-mobile-${it.student_id}`}
                  className="whatsapp-btn"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${(it.parent_phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Sayın ${it.parent_name}, ${it.student_name} adına ${new Date(it.due_date).toLocaleDateString("tr-TR")} tarihli ${money(it.amount_due)} tutarındaki taksit ödemesini hatırlatmak isteriz. İnegöl Çözüm Kurs`
                  )}`}
                >
                  💬 WhatsApp ile Hatırlat
                </a>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="empty-card-msg">
              {search.trim() ? "Aramaya uygun ödeme kaydı bulunamadı." : "Bu dönemde bekleyen ödeme yok. 🎉"}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function Reports({ me, data = {} }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const safeMonth = month && month.includes("-") ? month : new Date().toISOString().slice(0, 7);
  const safeData = data || {};

  const generate = async () => {
    setLoading(true);
    setMsg("");
    try {
      await downloadBlob(`${API}/reports/monthly?month=${safeMonth}`, `inegol-cozum-rapor-${safeMonth}.pdf`);
      setMsg("Rapor indirildi.");
    } catch (e) {
      window.print();
      setMsg("Yazdırma / PDF penceresi açıldı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead eyebrow="RAPOR · AYLIK MUHASEBE" title="Aylık Rapor PDF" />
      <div className="report-hero panel">
        <div className="report-lead">
          <h2>Kurumsal aylık rapor</h2>
          <p>Seçtiğiniz ay için toplam tahsilat, yöntem dağılımı, giderler ve net durum, kurumsal antetli canlı önizleme ve PDF çıktısı ile hazır.</p>
          <ul className="report-checks">
            <li>✓ İnegöl Çözüm Kurs logosu ve iletişim bilgileri</li>
            <li>✓ Tahsilat kalemleri ve yöntem kırılımı</li>
            <li>✓ Aylık giderler ve net kâr/zarar</li>
            <li>✓ Toplam bekleyen alacak özeti</li>
          </ul>
        </div>
        <div className="report-form">
          <label>
            Rapor ayı
            <input data-testid="report-month-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <Button testid="download-report-button" onClick={generate}>
            <Download size={17} /> {loading ? "Hazırlanıyor..." : "PDF olarak indir"}
          </Button>
          {can(me, "export_data") && (
            <Button testid="download-all-excel" secondary onClick={() => downloadBlob(`${API}/export/all`, `inegol-cozum-tum-kayitlar.csv`)}>
              <FileDown size={17} /> Tüm kayıtları Excel indir
            </Button>
          )}
          {msg && (
            <div data-testid="report-msg" className="report-msg">
              {msg}
            </div>
          )}
        </div>
      </div>

      {/* EKRANDA CANLI RAPOR ÖNİZLEMESİ */}
      <MonthlyReportPreview month={safeMonth} data={safeData} onPrint={generate} />
    </>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/audit-logs`);
        const list = Array.isArray(r.data) ? r.data : (r.data?.data || r.data?.items || r.data?.logs || []);
        setLogs(list);
      } catch (e) {
        setMsg(e.response?.data?.detail || "Yüklenemedi");
      }
    })();
  }, []);

  const labelFor = (a) =>
    ({
      "auth.login": "Giriş yapıldı",
      "auth.logout": "Çıkış yapıldı",
      "student.create": "Öğrenci eklendi",
      "payment.create": "Tahsilat alındı",
      "expense.create": "Gider kaydedildi",
      "class.create": "Sınıf oluşturuldu",
      "user.role_update": "Rol değiştirildi",
      "export.excel": "Excel indirildi",
      "report.monthly": "Aylık rapor"
    }[a] || a);

  return (
    <>
      <PageHead eyebrow="DENETİM · AKTİVİTE GEÇMİŞİ" title="Denetim Kaydı">
        <Button testid="export-audit-button" secondary onClick={() => downloadBlob(`${API}/export/audit`, `inegol-cozum-denetim.csv`)}>
          <Download size={16} /> Excel indir
        </Button>
      </PageHead>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Son işlemler</h2>
            <p>Hangi kullanıcı ne zaman ne yaptı — şeffaf takip</p>
          </div>
          {msg && (
            <span className="text-btn" data-testid="audit-msg">
              {msg}
            </span>
          )}
        </div>

        <div className="desktop-only-table table-responsive">
          <table>
            <thead>
              <tr>
                <th>TARİH</th>
                <th>KULLANICI</th>
                <th>ROL</th>
                <th>İŞLEM</th>
                <th>AÇIKLAMA</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} data-testid={`audit-row-${l.id}`}>
                  <td className="muted-cell">{formatTrtDateTime(l.created_at)}</td>
                  <td>
                    <b>{l.user_name || "—"}</b>
                    <br />
                    <span className="muted-cell" style={{ fontSize: 10 }}>
                      {l.user_email}
                    </span>
                  </td>
                  <td>
                    <span className={`role-pill role-${l.user_role}`}>{ROLE_LABEL[l.user_role] || l.user_role}</span>
                  </td>
                  <td>
                    <span className="method-tag">{labelFor(l.action)}</span>
                  </td>
                  <td className="muted-cell">{l.detail || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && !msg && (
                <tr>
                  <td colSpan="5" className="muted-cell" style={{ textAlign: "center", padding: "30px" }}>
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-only-cards audit-mobile-list">
          {logs.map((l) => (
            <div key={l.id} className="mobile-data-card audit-card" data-testid={`audit-card-${l.id}`}>
              <div className="audit-card-top">
                <div className="audit-user-info">
                  <b>{l.user_name || "Bilinmeyen Kullanıcı"}</b>
                  <span className="card-subtext">{formatTrtDateTime(l.created_at)}</span>
                </div>
                <span className={`role-pill role-${l.user_role}`}>{ROLE_LABEL[l.user_role] || l.user_role}</span>
              </div>
              <div className="audit-card-action">
                <span className="method-tag audit-tag">{labelFor(l.action)}</span>
                <span className="audit-detail-text">{l.detail || "İşlem detayı yok"}</span>
              </div>
            </div>
          ))}
          {logs.length === 0 && !msg && <div className="empty-card-msg">Kayıt bulunamadı.</div>}
        </div>
      </section>
    </>
  );
}
