import React, { useRef } from "react";
import { ShieldCheck, Download, Plus, RefreshCw, AlertTriangle, Upload } from "lucide-react";

export function BackupRestoreTab({
  backups = [],
  loadingBackups = false,
  restoring = false,
  backupNote = "",
  setBackupNote = () => {},
  backupAlert = "",
  exportDataToExcel = () => {},
  handleDownloadBackupJson = () => {},
  handleDownloadBackupExcel = () => {},
  handleTakeManualBackup = () => {},
  handleUploadBackupJson = () => {},
  loadBackups = () => {},
  setRestoreModalBackup = () => {},
  formatTrtDateTime = (d) => String(d || "")
}) {
  const fileInputRef = useRef(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Yedekleme Durum Kartı */}
      <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0fdf4", color: "#166534", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
              <ShieldCheck size={14} color="#16a34a" /> 🟢 Otomatik Yedekleme: Her Akşam Saat 20:00 (TRT) Aktif
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
              Veritabanı Snapshot & Otomatik Kurtarma Merkezi
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b", maxWidth: "700px" }}>
              Sistemimiz her akşam saat 20:00'de tüm veritabanı tablolarının (öğrenciler, sözleşmeler, tahsilatlar, giderler, sınavlar, yoklama, ders programı) tam anlık görüntüsünü (snapshot) otomatik olarak kaydeder. İhtiyaç halinde tek tıkla herhangi bir yedeğe geri dönüş yapabilir veya yedeği bilgisayarınıza indirebilirsiniz.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn"
              onClick={() => exportDataToExcel(null, "Tum_Sistem_Verileri")}
              style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700", fontSize: "12px", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}
              title="Tüm veritabanı kayıtlarını (öğrenciler, tahsilatlar, giderler) Excel formatında bilgisayara indir"
            >
              <Download size={14} /> 📊 Tüm Verileri Excel'e İndir (.csv)
            </button>
            {backups.length > 0 && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => handleDownloadBackupJson(backups[0])}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700", fontSize: "12px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}
                title="En son alınan sistem yedeğini .json olarak bilgisayara indir"
              >
                <Download size={14} color="#2563eb" /> 💾 Son Yedeği PC'ye İndir (.json)
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUploadBackupJson(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
            <button
              type="button"
              className="btn secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingBackups || restoring}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700", fontSize: "12px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", color: "#4338ca", borderColor: "#c7d2fe", background: "#eef2ff" }}
              title="Bilgisayarınızdaki bir .json sistem yedeğini sisteme yükleyip geri yükleyin"
            >
              <Upload size={14} color="#4f46e5" /> {restoring ? "Yükleniyor..." : "📁 PC'den Yedek Yükle (.json)"}
            </button>
            <input
              type="text"
              placeholder="Yedekleme açıklaması (opsiyonel)..."
              value={backupNote}
              onChange={(e) => setBackupNote(e.target.value)}
              style={{ fontSize: "12px", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--border)", width: "190px" }}
            />
            <button
              type="button"
              className="btn"
              onClick={handleTakeManualBackup}
              disabled={loadingBackups}
              style={{ background: "#2563eb", borderColor: "#2563eb", color: "#fff", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700", fontSize: "12px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}
            >
              <Plus size={15} /> {loadingBackups ? "Kaydediliyor..." : "📸 Şimdi Manuel Yedek Al"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={loadBackups}
              disabled={loadingBackups}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}
            >
              <RefreshCw size={14} /> Yenile
            </button>
          </div>
        </div>

        {backupAlert && (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", fontSize: "13px", fontWeight: "600" }}>
            {backupAlert}
          </div>
        )}
      </div>

      {/* Yedek Listesi Tablosu */}
      <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ whiteSpace: "nowrap" }}>Yedek ID & Açıklama</th>
              <th style={{ whiteSpace: "nowrap" }}>Kayıt Tarihi (TRT)</th>
              <th style={{ whiteSpace: "nowrap" }}>Yedek Türü</th>
              <th>Kapsam</th>
              <th style={{ whiteSpace: "nowrap" }}>Boyut</th>
              <th style={{ textAlign: "center", minWidth: "260px", position: "sticky", right: 0, background: "#f8fafc", zIndex: 2 }}>İndir / Geri Yükle</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  {loadingBackups ? "Yedekler yükleniyor..." : "Henüz manuel veya otomatik yedek kaydı bulunmuyor. 'Şimdi Manuel Yedek Al' butonuna tıklayarak ilk yedeğinizi oluşturabilirsiniz."}
                </td>
              </tr>
            ) : (
              backups.map((b) => {
                const isScheduled = b.backup_type === "scheduled_20_00";
                const isPreRestore = b.backup_type === "pre_restore";
                const counts = b.table_counts || {};

                return (
                  <tr key={b.id}>
                    <td>
                      <b style={{ fontFamily: "monospace", color: "#2563eb", fontSize: "12px" }}>{b.id}</b>
                      {b.notes && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {b.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                      {formatTrtDateTime(b.created_at)}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: isScheduled ? "#f0fdf4" : (isPreRestore ? "#fef3c7" : "#eff6ff"),
                          color: isScheduled ? "#166534" : (isPreRestore ? "#854d0e" : "#1d4ed8"),
                          fontWeight: "700",
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {isScheduled ? "🕒 20:00 Otomatik" : (isPreRestore ? "🛡️ Güvenlik" : "👤 Manuel Snapshot")}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "#475569" }}>
                      <span title={JSON.stringify(counts)}>
                        Öğr: <b>{counts.students ?? "-"}</b> · Tahsilat: <b>{counts.payments ?? "-"}</b> · Sınav: <b>{counts.exams ?? "-"}</b> · Yoklama: <b>{counts.attendance ?? "-"}</b>
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {b.size_bytes ? `${Math.round(b.size_bytes / 1024)} KB` : "—"}
                    </td>
                    <td style={{ textAlign: "center", position: "sticky", right: 0, background: "#fff", zIndex: 2, boxShadow: "-4px 0 8px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDownloadBackupExcel(b)}
                          className="btn small"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "5px 9px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: "700", borderRadius: "6px", cursor: "pointer" }}
                          title="Bu yedeğin tüm verilerini Excel (CSV) formatında indir"
                        >
                          <Download size={12} color="#16a34a" /> Excel İndir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadBackupJson(b)}
                          className="btn small"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "5px 9px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: "700", borderRadius: "6px", cursor: "pointer" }}
                          title="Tam sistem yedeğini .json olarak bilgisayara indir"
                        >
                          <Download size={12} /> JSON İndir
                        </button>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => setRestoreModalBackup(b)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "5px 9px", background: "#dc2626", borderColor: "#dc2626", color: "#fff", fontWeight: "700", borderRadius: "6px", cursor: "pointer" }}
                          title="Bu Yedeğe Geri Dön (Kurtar)"
                        >
                          <RefreshCw size={12} /> Geri Yükle
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RestoreConfirmModal({
  restoreModalBackup = null,
  setRestoreModalBackup = () => {},
  restoring = false,
  handleConfirmRestore = () => {}
}) {
  if (!restoreModalBackup) return null;

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", maxWidth: "500px", width: "100%", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#dc2626", marginBottom: "12px" }}>
          <AlertTriangle size={24} />
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>Veritabanı Geri Yükleme Onayı</h3>
        </div>
        
        <p style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5, margin: "0 0 14px" }}>
          <b>{restoreModalBackup.id}</b> numaralı yedeğe geri dönmek üzeresiniz.
        </p>

        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#991b1b", marginBottom: "16px", lineHeight: 1.4 }}>
          <b>⚠️ DİKKAT:</b> Veritabanındaki tüm tablolar (öğrenciler, tahsilatlar, sınavlar vb.) bu yedeğin alındığı ana geri dönecektir.
          <br /><br />
          <b>🛡️ Güvenlik Önlemi:</b> Mevcut verileriniz kaybolmasın diye sistem otomatik olarak anında bir <b>"Geri Yükleme Öncesi Kurtarma Noktası"</b> oluşturacaktır.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            className="btn secondary"
            onClick={() => setRestoreModalBackup(null)}
            disabled={restoring}
          >
            Vazgeç
          </button>
          <button
            className="btn"
            onClick={handleConfirmRestore}
            disabled={restoring}
            style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff", fontWeight: "700" }}
          >
            {restoring ? "Geri Yükleniyor..." : "↺ Evet, Geri Yükle"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackupRestoreTab;
