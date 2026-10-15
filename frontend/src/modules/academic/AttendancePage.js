import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Check, FileText, MessageCircle } from "lucide-react";
import { AbsenceLetterModal } from "../../components/AbsenceLetterModal";
import { openWhatsApp, formatDate } from "../shared";

// ==========================================================
// 2. YOKLAMA YÖNETİMİ (ATTENDANCE & WHATSAPP VELİ BİLDİRİMİ)
// ==========================================================
export function AttendancePage({ me, API, classes }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedClass, setSelectedClass] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState("1. Ders (09:00 - 09:45)");
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState(null);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/attendance?date=${selectedDate}&lesson_slot=${encodeURIComponent(selectedSlot)}`;
      if (selectedClass) url += `&class_id=${encodeURIComponent(selectedClass)}`;
      const res = await axios.get(url);
      setRecords(res.data || []);
    } catch (err) {
      console.error("Attendance load error:", err);
    } finally {
      setLoading(false);
    }
  }, [API, selectedDate, selectedClass, selectedSlot]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const setStatus = (studentId, status) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const setNote = (studentId, note) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, note } : r))
    );
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "geldi" })));
  };

  const handleBulkNotifyAbsent = () => {
    const absents = records.filter(r => r.status === "gelmedi" || r.status === "gec");
    if (absents.length === 0) {
      alert("Şu anda devamsız veya geç kalan öğrenci bulunmuyor.");
      return;
    }
    const first = absents[0];
    sendWhatsAppNotice(first);
    if (absents.length > 1) {
      alert(`Toplam ${absents.length} devamsız öğrenci tespit edildi. İlk öğrencinin (${first.student_name}) mesajı açıldı. Diğer velilere de satırlarındaki 'Veliye Bildir' butonuyla tek tıkla mesaj gönderebilirsiniz.`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/attendance`, {
        date: selectedDate,
        lesson_slot: selectedSlot,
        records: records.map((r) => ({
          student_id: r.student_id,
          class_id: r.student_class,
          status: r.status,
          note: r.note,
          notified_parent: r.notified_parent
        }))
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      loadAttendance();
    } catch (err) {
      alert("Yoklama kaydedilemedi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppNotice = async (r) => {
    const statusText =
      r.status === "gelmedi"
        ? `${selectedSlot} saatine KATILMAMIŞTIR`
        : r.status === "gec"
        ? `${selectedSlot} saatine GEÇ KALMIŞTIR`
        : "dersinde İZİNLİDİR";
    const msg = `Sayın Velimiz, İnegöl Çözüm Kursu öğrencimiz ${r.student_name}, ${formatDate(selectedDate)} tarihinde ${statusText}. Bilgilerinize sunarız. (İletişim: 0224 715 00 02)`;

    openWhatsApp(r.parent_phone, msg);

    try {
      await axios.post(`${API}/attendance/notify`, {
        student_id: r.student_id,
        date: selectedDate
      });
      setRecords((prev) =>
        prev.map((x) => (x.student_id === r.student_id ? { ...x, notified_parent: 1 } : x))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const counts = useMemo(() => {
    const c = { total: records.length, geldi: 0, gelmedi: 0, gec: 0, izinli: 0 };
    records.forEach((r) => {
      if (r.status in c) c[r.status]++;
    });
    return c;
  }, [records]);

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">GÜNLÜK YOKLAMA · EDESİS YÖNETİMİ</div>
          <h1>Sınıf Yoklama Sistemi</h1>
        </div>
        <div className="head-actions">
          <button
            className="btn secondary"
            onClick={handleBulkNotifyAbsent}
            style={{ display: "flex", gap: "6px", alignItems: "center", borderColor: "#16a34a", color: "#16a34a" }}
            title="Devamsız tüm öğrencilerin velilerine sırayla WhatsApp mesajı hazırlar"
          >
            <MessageCircle size={16} /> Devamsızlara WhatsApp ({counts.gelmedi})
          </button>
          <button className="btn secondary" onClick={markAllPresent}>
            <Check size={16} /> Tümünü Geldi İşaretle
          </button>
          <button className="btn" disabled={saving} onClick={handleSave}>
            {saving ? "Kaydediliyor..." : savedSuccess ? "✓ Kaydedildi!" : "Yoklamayı Kaydet"}
          </button>
        </div>
      </div>

      {/* Kontrol Çubuğu */}
      <div className="attendance-controls-bar">
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="form-group inline">
            <label>Tarih:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="form-group inline">
            <label>Ders Saati:</label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              <option value="Tüm Gün">Tüm Gün (Genel)</option>
              <option value="1. Ders (09:00 - 09:45)">1. Ders (09:00 - 09:45)</option>
              <option value="2. Ders (10:00 - 10:45)">2. Ders (10:00 - 10:45)</option>
              <option value="3. Ders (11:00 - 11:45)">3. Ders (11:00 - 11:45)</option>
              <option value="4. Ders (12:00 - 12:45)">4. Ders (12:00 - 12:45)</option>
              <option value="5. Ders (13:30 - 14:15)">5. Ders (13:30 - 14:15)</option>
              <option value="6. Ders (14:25 - 15:10)">6. Ders (14:25 - 15:10)</option>
              <option value="7. Ders (15:20 - 16:05)">7. Ders (15:20 - 16:05)</option>
            </select>
          </div>
          <div className="form-group inline">
            <label>Sınıf:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Tüm Sınıflar</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* İstatistik Rozetleri */}
        <div className="attendance-summary-pills">
          <span className="summary-pill total">Mevcut: <b>{counts.total}</b></span>
          <span className="summary-pill geldi">Geldi: <b>{counts.geldi}</b></span>
          <span className="summary-pill gelmedi">Gelmedi: <b>{counts.gelmedi}</b></span>
          <span className="summary-pill gec">Geç: <b>{counts.gec}</b></span>
          <span className="summary-pill izinli">İzinli: <b>{counts.izinli}</b></span>
        </div>
      </div>

      {/* Yoklama Listesi */}
      <div className="panel attendance-table-panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ÖĞRENCİ</th>
                <th>SINIF</th>
                <th>VELİ TELEFON</th>
                <th>YOKLAMA DURUMU</th>
                <th>ÖZEL NOT</th>
                <th>VELİ BİLDİRİMİ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>Yükleniyor...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                    Kayıtlı öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.student_id}>
                    <td>
                      <div className="person">
                        <div className="student-avatar">
                          {(r.student_name || "Ö").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <b>{r.student_name}</b>
                        </div>
                      </div>
                    </td>
                    <td><span className="program-tag">{r.student_class || "—"}</span></td>
                    <td>
                      <a href={`tel:${r.parent_phone}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                        {r.parent_phone || "—"}
                      </a>
                    </td>
                    <td>
                      <div className="status-button-group">
                        <button
                          type="button"
                          className={`status-btn geldi ${r.status === "geldi" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "geldi")}
                        >
                          Geldi
                        </button>
                        <button
                          type="button"
                          className={`status-btn gelmedi ${r.status === "gelmedi" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "gelmedi")}
                        >
                          Gelmedi
                        </button>
                        <button
                          type="button"
                          className={`status-btn gec ${r.status === "gec" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "gec")}
                        >
                          Geç
                        </button>
                        <button
                          type="button"
                          className={`status-btn izinli ${r.status === "izinli" ? "active" : ""}`}
                          onClick={() => setStatus(r.student_id, "izinli")}
                        >
                          İzinli
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Örn: 10 dk geç, raporlu..."
                        className="inline-note-input"
                        value={r.note || ""}
                        onChange={(e) => setNote(r.student_id, e.target.value)}
                      />
                    </td>
                    <td>
                      {r.status !== "geldi" ? (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            className={`btn-wa-notify ${r.notified_parent ? "sent" : ""}`}
                            onClick={() => sendWhatsAppNotice(r)}
                          >
                            <MessageCircle size={14} />
                            {r.notified_parent ? "İletildi ✓" : "Veliye Bildir"}
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ padding: "4px 8px", fontSize: "11px", display: "flex", gap: "4px", alignItems: "center", cursor: "pointer" }}
                            title="Resmi Devamsızlık Uyarı Mektubu (5 / 10 Gün Tebligatı)"
                            onClick={() => setSelectedStudentForLetter({
                              id: r.student_id,
                              student_name: r.student_name,
                              student_class: r.student_class,
                              parent_name: r.student_name ? `${r.student_name} Velisi` : "Veli",
                              parent_phone: r.parent_phone,
                              parent_address: "İnegöl / BURSA"
                            })}
                          >
                            <FileText size={12} color="#b91c1c" /> Mektup
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudentForLetter && (
        <AbsenceLetterModal
          student={selectedStudentForLetter}
          onClose={() => setSelectedStudentForLetter(null)}
        />
      )}
    </div>
  );
}
