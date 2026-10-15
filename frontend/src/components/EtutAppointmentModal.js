import React, { useState, useEffect } from "react";
import { Plus, X, Calendar, Clock, User, BookOpen, CheckCircle, Trash2, MessageCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { openWhatsApp } from "../EdesisModules";

export function EtutAppointmentModal({ API, students = [], classes = [], onClose }) {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [teachersList,setTeachersList] = useState([]);
  const loadAppointments = async () => setAppointments((await axios.get(`${API}/appointments`)).data);
  useEffect(()=>{
    Promise.all([axios.get(`${API}/appointments`),axios.get(`${API}/teachers`)]).then(([a,t])=>{setAppointments(a.data);setTeachersList(t.data.map(x=>x.name));}).catch(e=>setError(e.response?.data?.detail || e.message));
  },[API]);

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [teacher, setTeacher] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [subject, setSubject] = useState("Matematik");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState("16:30 - 17:15");
  const [room, setRoom] = useState("Birebir Odası 1");
  const [topic, setTopic] = useState("");

  const timeSlots = [
    "09:00 - 09:45",
    "10:00 - 10:45",
    "11:00 - 11:45",
    "14:30 - 15:15",
    "15:30 - 16:15",
    "16:30 - 17:15",
    "17:30 - 18:15"
  ];

  const handleAddAppointment = async (e) => {
    setError(""); setLoading(true);
    try {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    const newApp = {
      id: "etut-" + Date.now(),
      teacher_name: teacher,
      student_id: studentId,
      student_name: st?.student_name || "Öğrenci",
      subject,
      date,
      time_slot: timeSlot,
      room,
      topic: topic.trim() || "Genel Soru Çözümü",
      status: "onaylandi"
    };

    await axios.post(`${API}/appointments`,newApp);
    await loadAppointments();
    setShowAddForm(false);
    setTopic("");
    } catch(e) { setError(e.response?.data?.detail || e.message); } finally { setLoading(false); }
  };

  const handleStatusChange = async (id,status) => {
    try { await axios.patch(`${API}/appointments/${id}`,{status}); await loadAppointments(); }
    catch(e) { setError(e.response?.data?.detail || e.message); }
  };
  const handleDelete = async id => {
    try { await axios.delete(`${API}/appointments/${id}`); await loadAppointments(); }
    catch(e) { setError(e.response?.data?.detail || e.message); }
  };

  const handleNotifyParent = (app) => {
    const st = students.find((s) => s.id === app.student_id);
    const phone = st?.parent_phone || st?.student_phone;
    const msg = `Sayın Velimiz, Özel İnegöl Çözüm Kursu'nda öğrencimiz ${app.student_name} için ${app.date} tarihinde saat ${app.time_slot} arasında ${app.teacher_name} ile "${app.topic}" konulu birebir etüt planlanmıştır. Katılımı önemle rica olunur.`;
    openWhatsApp(phone, msg);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "900px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--primary)", fontWeight: 600 }}>AKADEMİK TAKİP SİSTEMİ</div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              Birebir Etüt & Soru Çözüm Randevu Sistemi
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn" onClick={() => setShowAddForm(true)} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Plus size={16} /> Yeni Randevu Kaydı
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", padding: "20px" }}>
          {/* Randevu Ekleme Formu */}
          {showAddForm && (
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>Yeni Birebir Randevusu Planla</h4>
                <button className="icon-btn" onClick={() => setShowAddForm(false)}><X size={16} /></button>
              </div>
              <form onSubmit={handleAddAppointment}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="form-group">
                    <label>Öğretmen Seçin</label>
                    <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
                      <option value="">Öğretmen seçiniz</option>
                      {teachersList.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Öğrenci Seçin</label>
                    <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.student_name} ({s.student_class || "Şubesiz"})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="form-group">
                    <label>Ders</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Tarih</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Saat Dilimi</label>
                    <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                      {timeSlots.map((ts, idx) => (
                        <option key={idx} value={ts}>{ts}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div className="form-group">
                    <label>Derslik / Masa</label>
                    <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Çalışılacak Konu / Hedef</label>
                    <input type="text" placeholder="Örn: Paragraf Soru Çözümü" value={topic} onChange={(e) => setTopic(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" className="btn secondary" onClick={() => setShowAddForm(false)}>İptal</button>
                  <button type="submit" className="btn" disabled={loading}>Randevuyu Kaydet</button>
                </div>
              </form>
            </div>
          )}

          {error && <p role="alert">{error}</p>}
          {/* Randevular Tablosu */}
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>TARİH & SAAT</th>
                  <th>ÖĞRENCİ</th>
                  <th>ÖĞRETMEN & BRANŞ</th>
                  <th>KONU / DERSLİK</th>
                  <th>DURUM</th>
                  <th style={{ textAlign: "right" }}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                      Henüz kayıtlı etüt randevusu bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  appointments.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <b>{new Date(app.date).toLocaleDateString("tr-TR")}</b>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{app.time_slot}</span>
                        </div>
                      </td>
                      <td>
                        <b>{app.student_name}</b>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px" }}>{app.teacher_name}</div>
                        <span className="program-tag">{app.subject}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", fontWeight: "600" }}>{app.topic}</div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{app.room}</span>
                      </td>
                      <td>
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            border: "1px solid var(--border)",
                            background: app.status === "onaylandi" ? "#f0fdf4" : app.status === "tamamlandi" ? "#eff6ff" : "#fff1f2",
                            color: app.status === "onaylandi" ? "#16a34a" : app.status === "tamamlandi" ? "#2563eb" : "#e11d48"
                          }}
                        >
                          <option value="onaylandi">Onaylandı</option>
                          <option value="bekliyor">Bekliyor</option>
                          <option value="tamamlandi">Tamamlandı</option>
                          <option value="iptal">İptal Edildi</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            className="btn-wa-notify"
                            title="Veliye WhatsApp ile Hatırlat"
                            onClick={() => handleNotifyParent(app)}
                          >
                            <MessageCircle size={14} /> Veliye Bildir
                          </button>
                          <button
                            className="icon-btn"
                            title="Randevuyu İptal Et"
                            onClick={() => handleDelete(app.id)}
                          >
                            <Trash2 size={15} color="var(--danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-foot" style={{ borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
