import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Calendar, Clock, Columns, Plus, Printer, Trash2, X } from "lucide-react";
import { trIncludes } from "../../lib/utils";

// ==========================================================
// 3. HAFTALIK DERS PROGRAMI (SCHEDULES & TIMETABLE)
// ==========================================================
const DAYS = [
  { id: 1, name: "Pazartesi" },
  { id: 2, name: "Salı" },
  { id: 3, name: "Çarşamba" },
  { id: 4, name: "Perşembe" },
  { id: 5, name: "Cuma" },
  { id: 6, name: "Cumartesi" },
  { id: 7, name: "Pazar" }
];

const TIME_SLOTS = [
  "09:00 - 09:45",
  "10:00 - 10:45",
  "11:00 - 11:45",
  "12:00 - 12:45",
  "13:30 - 14:15",
  "14:25 - 15:10",
  "15:20 - 16:05",
  "16:15 - 17:00",
  "17:10 - 17:55",
  "18:05 - 18:50"
];

const QUICK_SUBJECTS = [
  "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji",
  "Türkçe", "Edebiyat", "Tarih", "Coğrafya", "Felsefe",
  "İngilizce", "Rehberlik", "Etüt / Soru Çözümü"
];

const QUICK_ROOMS = [
  "Derslik 1", "Derslik 2", "Derslik 3", "Derslik 4", "VIP 1", "VIP 2", "Etüt Odası", "Kütüphane"
];

export function SchedulesPage({ me, API, classes }) {
  const [schedules, setSchedules] = useState([]);
  const [, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);

  // Görünüm: Varsayılan olarak 7 Günlük Geniş Yatay Matris (Soldan Sağa: Pazartesi -> Pazar)
  const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [activeDayView, setActiveDayView] = useState(0); // 0: Tüm Hafta 7 Sütunlu Yatay Matris (Soldan Sağa)

  // Slot form state
  const [formDay, setFormDay] = useState(1);
  const [formSlot, setFormSlot] = useState("09:00 - 09:45");
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("Matematik");
  const [formTeacher, setFormTeacher] = useState("");
  const [formRoom, setFormRoom] = useState("Derslik 1");

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/schedules`;
      if (selectedClassId) url += `?class_id=${encodeURIComponent(selectedClassId)}`;
      const res = await axios.get(url);
      setSchedules(res.data || []);
    } catch (err) {
      console.error("Schedules load error:", err);
    } finally {
      setLoading(false);
    }
  }, [API, selectedClassId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const teacherList = useMemo(() => {
    const set = new Set();
    schedules.forEach((s) => {
      if (s.teacher_name && s.teacher_name.trim()) set.add(s.teacher_name.trim());
    });
    return Array.from(set);
  }, [schedules]);

  // Boş bir hücreye veya saate tıklayarak doğrudan hızlı ders ekleme
  const handleCellClick = (dayId, slot) => {
    setEditingSlotId(null);
    setFormDay(dayId);
    setFormSlot(slot);
    setFormClassId(selectedClassId || (classes[0] && classes[0].id) || "");
    setFormSubject("Matematik");
    setFormTeacher(selectedTeacher || "");
    setFormRoom("Derslik 1");
    setShowAddModal(true);
  };

  // Mevcut bir ders kartına tıklayarak doğrudan düzenleme
  const handleCardClick = (item, e) => {
    if (e) e.stopPropagation();
    setEditingSlotId(item.id);
    setFormDay(item.day_of_week);
    setFormSlot(item.time_slot);
    setFormClassId(item.class_id || "");
    setFormSubject(item.subject);
    setFormTeacher(item.teacher_name || "");
    setFormRoom(item.room || "Derslik 1");
    setShowAddModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    const targetClassId = formClassId || (classes[0] && classes[0].id) || "";

    // ÇAKIŞMA KONTROLÜ (CONFLICT DETECTION - kendi id'si hariç)
    const teacherConflict = schedules.find(
      (s) =>
        s.id !== editingSlotId &&
        s.day_of_week === formDay &&
        s.time_slot === formSlot &&
        formTeacher &&
        s.teacher_name &&
        s.teacher_name.toLowerCase().trim() === formTeacher.toLowerCase().trim()
    );

    const roomConflict = schedules.find(
      (s) =>
        s.id !== editingSlotId &&
        s.day_of_week === formDay &&
        s.time_slot === formSlot &&
        formRoom &&
        s.room &&
        s.room.toLowerCase().trim() === formRoom.toLowerCase().trim() &&
        s.class_id !== targetClassId
    );

    if (teacherConflict) {
      const clsName = classes.find((c) => c.id === teacherConflict.class_id)?.name || "başka";
      if (
        !window.confirm(
          `⚠️ ÖĞRETMEN ÇAKIŞMA UYARISI:\n"${formTeacher}" isimli öğretmen bu gün ve saatte (${clsName} sınıfında) zaten derste!\n\nYine de programa eklemek istiyor musunuz?`
        )
      ) {
        return;
      }
    } else if (roomConflict) {
      const clsName = classes.find((c) => c.id === roomConflict.class_id)?.name || "başka";
      if (
        !window.confirm(
          `⚠️ DERSLİK ÇAKIŞMA UYARISI:\n"${formRoom}" bu gün ve saatte ${clsName} sınıfı tarafından kullanılıyor!\n\nYine de devam etmek istiyor musunuz?`
        )
      ) {
        return;
      }
    }

    try {
      if (editingSlotId) {
        // Güncelleme
        try {
          await axios.put(`${API}/schedules/${editingSlotId}`, {
            day_of_week: formDay,
            time_slot: formSlot,
            class_id: targetClassId,
            subject: formSubject,
            teacher_name: formTeacher,
            room: formRoom
          });
        } catch (putErr) {
          // Fallback: Delete + Recreate if PUT not supported by legacy backend
          await axios.delete(`${API}/schedules/${editingSlotId}`);
          await axios.post(`${API}/schedules`, {
            day_of_week: formDay,
            time_slot: formSlot,
            class_id: targetClassId,
            subject: formSubject,
            teacher_name: formTeacher,
            room: formRoom
          });
        }
      } else {
        // Yeni Ekleme
        await axios.post(`${API}/schedules`, {
          day_of_week: formDay,
          time_slot: formSlot,
          class_id: targetClassId,
          subject: formSubject,
          teacher_name: formTeacher,
          room: formRoom
        });
      }
      setShowAddModal(false);
      loadSchedules();
    } catch (err) {
      alert("Ders saati kaydedilemedi: " + err.message);
    }
  };

  const handleDeleteSlot = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bu ders saatini programdan silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/schedules/${id}`);
      if (editingSlotId === id) setShowAddModal(false);
      loadSchedules();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  };

  return (
    <div className="educational-module">
      <div className="page-head">
        <div>
          <div className="eyebrow">DERS PLANLAMA · EDESİS PROGRAMI</div>
          <h1>Haftalık Ders Programı</h1>
        </div>
        <div className="head-actions">
          <button className="btn secondary" onClick={() => window.print()} title="Panoya asılabilir renkli haftalık ders programı yazdırır">
            <Printer size={16} /> Programı Yazdır
          </button>
          <button 
            className="btn" 
            onClick={() => {
              setEditingSlotId(null);
              setFormDay(activeDayView || 1);
              setFormSlot(TIME_SLOTS[0]);
              setFormClassId(selectedClassId || (classes[0] && classes[0].id) || "");
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Hızlı Ders Ekle
          </button>
        </div>
      </div>

      <div className="attendance-controls-bar" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div className="form-group inline" style={{ minWidth: "220px", flex: "1 1 220px" }}>
            <label>Sınıf Filtrele:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Tüm Sınıflar (Genel Görünüm)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group inline" style={{ minWidth: "200px", flex: "1 1 200px" }}>
            <label>Öğretmen Filtrele:</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Tüm Öğretmenler</option>
              {teacherList.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="result-count">{schedules.length} Ders Saati</span>
        </div>
      </div>

      {/* GÖRÜNÜM SEÇİCİ: 7 GÜNLÜK YATAY MATRİS (SOLDAN SAĞA) vs GÜNLÜK AKIŞ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn small ${activeDayView === 0 ? "" : "secondary"}`}
            style={{ fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", background: activeDayView === 0 ? "#1d4ed8" : "#fff", color: activeDayView === 0 ? "#fff" : "inherit" }}
            onClick={() => setActiveDayView(0)}
          >
            <Columns size={15} /> 📊 7 Günlük Haftalık Matris (Soldan Sağa)
          </button>
          <button
            type="button"
            className={`btn small ${activeDayView !== 0 ? "" : "secondary"}`}
            style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px", background: activeDayView !== 0 ? "#1d4ed8" : "#fff", color: activeDayView !== 0 ? "#fff" : "inherit" }}
            onClick={() => setActiveDayView(todayDay)}
          >
            <Calendar size={15} /> 📱 Günlük Akış (Dikey)
          </button>
        </div>

        <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>💡 Boş kutuya tıklayarak ders ekleyebilir, karta tıklayarak düzenleyebilirsiniz.</span>
        </div>
      </div>

      {/* MOBİL GÜN SEÇİCİ (Yalnızca Günlük Akış Modu Açıkken Görünür) */}
      {activeDayView !== 0 && (
        <div className="schedule-day-tabs" style={{ marginBottom: "16px" }}>
          {DAYS.map((d) => {
            const count = schedules.filter(s => s.day_of_week === d.id).length;
            return (
              <button
                key={d.id}
                type="button"
                className={`schedule-day-pill ${activeDayView === d.id ? "active" : ""}`}
                onClick={() => setActiveDayView(d.id)}
              >
                <span>{d.name}</span>
                <span className="day-count-badge">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* GÖRÜNÜM 1: GÜNLÜK AKIŞ (TEK GÜN SEÇİLDİĞİNDE MOBİLDE MÜKEMMEL PRATİKLİK) */}
      {activeDayView !== 0 ? (
        <div className="schedule-daily-view panel">
          <div className="daily-view-header">
            <div>
              <h3>{DAYS.find(d => d.id === activeDayView)?.name} Günü Ders Çizelgesi</h3>
              <p>Ders eklemek için boş saate, düzenlemek için karta doğrudan dokunun.</p>
            </div>
            <button 
              className="btn small"
              onClick={() => handleCellClick(activeDayView, TIME_SLOTS[0])}
            >
              <Plus size={14} /> Bu Güne Ders Ekle
            </button>
          </div>

          <div className="daily-slots-list">
            {TIME_SLOTS.map((slot) => {
              const matched = schedules.filter(
                (s) =>
                  s.day_of_week === activeDayView &&
                  s.time_slot === slot &&
                  (!selectedTeacher || trIncludes(s.teacher_name, selectedTeacher))
              );

              return (
                <div key={slot} className="daily-slot-row">
                  <div className="daily-slot-time">
                    <Clock size={14} />
                    <strong>{slot}</strong>
                  </div>

                  <div className="daily-slot-content">
                    {matched.length > 0 ? (
                      <div className="daily-cards-wrap">
                        {matched.map((item) => (
                          <div 
                            key={item.id} 
                            className="schedule-item-card interactive"
                            onClick={(e) => handleCardClick(item, e)}
                            title="Düzenlemek için karta dokunun"
                          >
                            <div className="schedule-title-row">
                              <strong className="schedule-subject">{item.subject}</strong>
                              <div className="card-quick-actions">
                                <span className="edit-hint-tag">Düzenle</span>
                                <button
                                  className="schedule-del-btn"
                                  title="Dersi Sil"
                                  onClick={(e) => handleDeleteSlot(item.id, e)}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="schedule-teacher">👨‍🏫 {item.teacher_name || "Öğretmen Belirtilmedi"}</div>
                            <div className="schedule-meta">
                              <span className="class-pill">👥 {item.class_name || classes.find(c=>c.id===item.class_id)?.name || "Sınıf"}</span>
                              <span className="room-pill">📍 {item.room || "Derslik"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="empty-slot-quick-add"
                        onClick={() => handleCellClick(activeDayView, slot)}
                      >
                        <Plus size={14} />
                        <span>Bu Saate Ders Ekle ({slot})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GÖRÜNÜM 2: 7x10 HAFTALIK MATRİS (YAPISAL TABLO GÖRÜNÜMÜ) */
        <div className="timetable-container panel">
          <div className="timetable-grid">
            <div className="timetable-header-cell time-col">Saat / Gün</div>
            {DAYS.map((d) => (
              <div key={d.id} className="timetable-header-cell">
                <strong>{d.name}</strong>
              </div>
            ))}

            {TIME_SLOTS.map((slot) => (
              <React.Fragment key={slot}>
                <div className="timetable-time-cell">
                  <Clock size={12} style={{ marginRight: "4px" }} />
                  {slot}
                </div>
                {DAYS.map((day) => {
                  const matched = schedules.filter(
                    (s) =>
                      s.day_of_week === day.id &&
                      s.time_slot === slot &&
                      (!selectedTeacher || trIncludes(s.teacher_name, selectedTeacher))
                  );
                  return (
                    <div 
                      key={`${slot}-${day.id}`} 
                      className="timetable-slot-cell clickable-cell"
                      onClick={() => handleCellClick(day.id, slot)}
                      title="Yeni ders eklemek için bu kutuya tıklayın"
                    >
                      {matched.map((item) => (
                        <div 
                          key={item.id} 
                          className="schedule-item-card interactive"
                          onClick={(e) => handleCardClick(item, e)}
                          title="Düzenlemek için karta tıklayın"
                        >
                          <div className="schedule-title-row">
                            <strong className="schedule-subject">{item.subject}</strong>
                            <button
                              className="schedule-del-btn"
                              title="Dersi Sil"
                              onClick={(e) => handleDeleteSlot(item.id, e)}
                            >
                              ×
                            </button>
                          </div>
                          <div className="schedule-teacher">{item.teacher_name}</div>
                          <div className="schedule-meta">
                            <span>{item.class_name || "Sınıf"}</span>
                            <span className="room-pill">{item.room || "Derslik"}</span>
                          </div>
                        </div>
                      ))}
                      {matched.length === 0 && (
                        <div className="slot-empty-cue">
                          <Plus size={12} />
                          <span>Ekle</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: HIZLI DERS SAATİ EKLE VEYA DÜZENLE */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "95vw" }}>
            <div className="modal-head">
              <div>
                <div className="eyebrow" style={{ color: "var(--primary)" }}>
                  {editingSlotId ? "DERS GÜNCELLEME" : "HIZLI DERS PLANLAMA"}
                </div>
                <h2 style={{ margin: 0 }}>
                  {editingSlotId ? "Ders Saati Düzenle" : "Programa Ders Ekle"}
                </h2>
              </div>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveSlot}>
              <div className="modal-body" style={{ maxHeight: "72vh", overflowY: "auto", padding: "16px 20px" }}>
                
                {/* Gün & Saat Aralığı */}
                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="form-group">
                    <label>Gün *</label>
                    <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))}>
                      {DAYS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Saat Dilimi *</label>
                    <select value={formSlot} onChange={(e) => setFormSlot(e.target.value)}>
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sınıf & Derslik */}
                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="form-group">
                    <label>Sınıf / Şube *</label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Derslik / Salon</label>
                    <input
                      type="text"
                      placeholder="Derslik 1, VIP vb."
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                    />
                  </div>
                </div>

                {/* Hızlı Derslik Seçimi */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    Hızlı Derslik Seç:
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {QUICK_ROOMS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`chip-btn ${formRoom === r ? "active" : ""}`}
                        onClick={() => setFormRoom(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ders Adı & Hızlı Ders Seçim Çipleri */}
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label>Ders Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Matematik, Fizik, Türkçe..."
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  />
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Hızlı Ders Seç (1 Tıkla Doldur):
                    </label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {QUICK_SUBJECTS.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          className={`chip-btn ${formSubject === sub ? "active" : ""}`}
                          onClick={() => setFormSubject(sub)}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Öğretmen Adı & Hızlı Öğretmen Listesi */}
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label>Öğretmen Adı</label>
                  <input
                    type="text"
                    placeholder="Osman Seymen, Ayşe Kaya..."
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                  />
                  {teacherList.length > 0 && (
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "6px" }}>Mevcut Öğretmenler:</span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        {teacherList.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`chip-btn ${formTeacher === t ? "active" : ""}`}
                            onClick={() => setFormTeacher(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
                {editingSlotId ? (
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                    onClick={() => handleDeleteSlot(editingSlotId)}
                  >
                    <Trash2 size={15} /> Bu Dersi Sil
                  </button>
                ) : (
                  <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                    Vazgeç
                  </button>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>
                    Kapat
                  </button>
                  <button type="submit" className="btn">
                    {editingSlotId ? "Değişiklikleri Kaydet" : "Programa Ekle"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
