import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import {
  BookOpen,
  X,
  Users,
  Edit,
  UserCheck,
  Clock,
  Plus,
  Search,
  MessageCircle,
  ChevronRight,
  Trash2
} from "lucide-react";
import { ClassDetailModal } from "./ClassDetailModal";
import { can } from "../pages/AuthGuard";
import { PageHead, Button } from "../pages/DashboardPage";
import { trIncludes } from "../lib/utils";

export function EditClassModal({ cls, onClose, API, onSaved }) {
  const [name, setName] = useState(cls?.name || "");
  const [level, setLevel] = useState(cls?.level || "");
  const [room, setRoom] = useState(cls?.room || "");
  const [capacity, setCapacity] = useState(cls?.capacity || 20);
  const [teacher, setTeacher] = useState(cls?.teacher || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Sınıf adı boş bırakılamaz"); return; }
    setSaving(true); setErr("");
    try {
      await axios.put(`${API}/classes/${cls.id}`, { name, level, room, capacity: Number(capacity), teacher,_expected:Object.fromEntries(["name","level","room","capacity","teacher"].map(k=>[k,cls[k]??null])) });
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || "Sınıf güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={18} color="#2563eb" />
            <h2>Sınıf / Şube Düzenle: {cls?.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {err && <div className="report-msg" style={{ background: "#fee2e2", color: "#dc2626", marginBottom: "12px" }}>{err}</div>}
            <div className="form-group">
              <label>Sınıf / Şube Adı:</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Seviye (Örn: 11. Sınıf, LGS Hazırlık):</label>
              <input type="text" value={level} onChange={e => setLevel(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Derslik / Oda:</label>
              <input type="text" value={room} onChange={e => setRoom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Kontenjan / Kapasite:</label>
              <input type="number" min="1" max="100" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Sorumlu Sınıf Öğretmeni:</label>
              <input type="text" value={teacher} onChange={e => setTeacher(e.target.value)} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn secondary" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Classes({ me, classes = [], onOpen, students = [], onSelect, onNavigate, reload, API }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [inspectingClass, setInspectingClass] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilterCategory, setClassFilterCategory] = useState("all");
  const rosterRef = useRef(null);

  const classesWithCounts = useMemo(() => {
    return classes.map(c => {
      const enrolled = students.filter(s => s.program === c.name || s.student_class === c.name);
      return {
        ...c,
        enrolledStudents: enrolled,
        enrolledCount: enrolled.length,
        occupancyPct: c.capacity > 0 ? Math.min(100, Math.round((enrolled.length / c.capacity) * 100)) : 0
      };
    });
  }, [classes, students]);

  const activeClass = useMemo(() => {
    if (selectedClass) {
      const found = classesWithCounts.find(c => c.id === selectedClass.id);
      if (found) return found;
    }
    const sorted = [...classesWithCounts].sort((a, b) => b.enrolledCount - a.enrolledCount);
    return sorted[0] || classes[0] || null;
  }, [selectedClass, classesWithCounts, classes]);

  const classesWithStudentsCount = useMemo(() => {
    return classesWithCounts.filter(c => c.enrolledCount > 0).length;
  }, [classesWithCounts]);

  const filteredClasses = useMemo(() => {
    return classesWithCounts.filter(c => {
      if (classFilterCategory === "with_students" && c.enrolledCount === 0) return false;
      if (classFilterCategory === "primary") {
        const lvl = (c.level || "").toLowerCase();
        const nm = c.name.toLowerCase();
        if (!(lvl.includes("1.") || lvl.includes("2.") || lvl.includes("3.") || lvl.includes("4.") || /^[1-4]/.test(nm))) return false;
      }
      if (classFilterCategory === "middle") {
        const lvl = (c.level || "").toLowerCase();
        const nm = c.name.toLowerCase();
        if (!(lvl.includes("5.") || lvl.includes("6.") || lvl.includes("7.") || lvl.includes("8.") || /^[5-8]/.test(nm) || nm.includes("lgs"))) return false;
      }
      if (classFilterCategory === "high") {
        const lvl = (c.level || "").toLowerCase();
        const nm = c.name.toLowerCase();
        if (!(lvl.includes("9.") || lvl.includes("10.") || lvl.includes("11.") || lvl.includes("12.") || lvl.includes("mezun") || nm.includes("tyt") || nm.includes("ayt") || nm.includes("yks"))) return false;
      }

      if (classSearch.trim()) {
        const matches = trIncludes(c.name, classSearch) ||
                        trIncludes(c.level, classSearch) ||
                        trIncludes(c.room, classSearch) ||
                        trIncludes(c.teacher, classSearch);
        if (!matches) return false;
      }

      return true;
    });
  }, [classesWithCounts, classFilterCategory, classSearch]);

  const enrolledStudents = useMemo(() => {
    if (!activeClass) return [];
    return students.filter(s => (s.program === activeClass.name || s.student_class === activeClass.name));
  }, [students, activeClass]);

  const filteredClassStudents = useMemo(() => {
    return enrolledStudents.filter(s => 
      trIncludes(`${s.student_name} ${s.student_no} ${s.parent_name} ${s.parent_phone} ${s.student_tc || ""}`, studentSearch)
    );
  }, [enrolledStudents, studentSearch]);

  const handleDeleteClass = async (c) => {
    if (!window.confirm(`"${c.name}" sınıfını silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API}/classes/${c.id}`);
      if (reload) reload();
      if (selectedClass?.id === c.id) setSelectedClass(null);
    } catch (err) {
      alert("Sınıf silinirken hata: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCardClick = (c) => {
    setSelectedClass(c);
    setInspectingClass(c);
  };

  return (
    <>
      <PageHead eyebrow="EĞİTİM · DERSLİKLER VE ŞUBE YÖNETİMİ" title="Sınıflar & Şubeler">
        {can(me,"class_create") && <Button testid="add-class-button" onClick={() => onOpen("class")}><Plus size={17} /> Sınıf Oluştur</Button>}
      </PageHead>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button 
            className={`btn small ${classFilterCategory === "all" ? "" : "secondary"}`}
            onClick={() => setClassFilterCategory("all")}
            style={{ fontWeight: "600", fontSize: "12px" }}
          >
            🔵 Tüm Şubeler ({classes.length})
          </button>
          <button 
            className={`btn small ${classFilterCategory === "with_students" ? "" : "secondary"}`}
            onClick={() => setClassFilterCategory("with_students")}
            style={{ fontWeight: "600", fontSize: "12px" }}
          >
            🟢 Dolu / Öğrencili Şubeler ({classesWithStudentsCount})
          </button>
          <button 
            className={`btn small ${classFilterCategory === "primary" ? "" : "secondary"}`}
            onClick={() => setClassFilterCategory("primary")}
            style={{ fontWeight: "600", fontSize: "12px" }}
          >
            🎒 İlkokul (1-4)
          </button>
          <button 
            className={`btn small ${classFilterCategory === "middle" ? "" : "secondary"}`}
            onClick={() => setClassFilterCategory("middle")}
            style={{ fontWeight: "600", fontSize: "12px" }}
          >
            🎓 Ortaokul & LGS (5-8)
          </button>
          <button 
            className={`btn small ${classFilterCategory === "high" ? "" : "secondary"}`}
            onClick={() => setClassFilterCategory("high")}
            style={{ fontWeight: "600", fontSize: "12px" }}
          >
            📚 Lise & YKS (9-12 / Mezun)
          </button>
        </div>

        <div className="top-search" style={{ width: "300px", margin: 0 }}>
          <Search size={15} />
          <input 
            placeholder="Şube adı, seviye, derslik veya öğretmen ara..." 
            value={classSearch} 
            onChange={e => setClassSearch(e.target.value)} 
            style={{ fontSize: "12px" }}
          />
        </div>
      </div>

      <div className="class-grid">
        {filteredClasses.map(c => {
          const isSelected = activeClass?.id === c.id;
          return (
            <div 
              className={`class-card ${isSelected ? "selected-card" : ""}`} 
              key={c.id}
              onClick={() => handleCardClick(c)}
              style={{
                cursor: "pointer",
                position: "relative",
                border: isSelected ? "2px solid #2563eb" : "1px solid var(--line)",
                boxShadow: isSelected ? "0 6px 18px rgba(37,99,235,0.18)" : "0 2px 6px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div className="class-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="class-icon"><BookOpen size={20} /></div>
                    <span className="active-label">AKTİF</span>
                    <span 
                      className="badge" 
                      style={{ 
                        background: c.enrolledCount > 0 ? "#dcfce7" : "#f1f5f9", 
                        color: c.enrolledCount > 0 ? "#166534" : "#64748b", 
                        fontSize: "11px", 
                        fontWeight: "700" 
                      }}
                    >
                      👥 {c.enrolledCount} Öğrenci
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
                    <button 
                      className="icon-btn" 
                      title="Sınıfı Düzenle"
                      style={{ padding: "4px" }}
                      onClick={() => setEditingClass(c)}
                    >
                      <Edit size={14} color="#2563eb" />
                    </button>
                    <button 
                      className="icon-btn" 
                      title="Sınıfı Sil"
                      style={{ padding: "4px" }}
                      onClick={() => handleDeleteClass(c)}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>

                <h2 style={{ margin: "10px 0 4px 0", fontSize: "18px", fontWeight: "800" }}>{c.name}</h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{c.level || "—"} · {c.room || "Derslik"}</p>
                
                <div className="class-meta" style={{ marginTop: "10px" }}>
                  <span><Users size={14} /> {c.capacity} kişilik ({c.enrolledCount} kayıtlı)</span>
                  <span>{c.teacher || "Öğretmen Atanmadı"}</span>
                </div>

                <div className="class-progress" style={{ marginTop: "10px" }}>
                  <div><span>Doluluk</span><b>%{c.occupancyPct}</b></div>
                  <div className="progress-track"><div style={{ width: `${c.occupancyPct}%` }} /></div>
                </div>

                {c.enrolledCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {c.enrolledStudents.slice(0, 5).map((st, i) => (
                        <div 
                          key={st.id || i}
                          style={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: "50%", 
                            background: "#3b82f6", 
                            color: "#fff", 
                            fontSize: "10px", 
                            fontWeight: "700", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            border: "2px solid #fff", 
                            marginLeft: i > 0 ? "-6px" : 0 
                          }}
                          title={st.student_name}
                        >
                          {st.student_name ? st.student_name[0] : "?"}
                        </div>
                      ))}
                    </div>
                    {c.enrolledCount > 5 && (
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
                        +{c.enrolledCount - 5} diğer
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "14px", display: "grid", gap: "6px" }} onClick={e => e.stopPropagation()}>
                <button 
                  className="btn small"
                  style={{ 
                    width: "100%", 
                    justifyContent: "center", 
                    background: isSelected ? "#1d4ed8" : "#2563eb",
                    fontWeight: "600",
                    fontSize: "12px"
                  }}
                  onClick={() => handleCardClick(c)}
                >
                  <Users size={14} /> Öğrenci Kadrosunu İncele ({c.enrolledCount})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeClass && (
        <div ref={rosterRef} className="panel" style={{ marginTop: "28px", padding: "22px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>{activeClass.name} Öğrenci Kadrosu</h2>
                <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }}>
                  {enrolledStudents.length} Kayıtlı Öğrenci
                </span>
                <span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "12px", fontSize: "12px" }}>
                  {activeClass.level || "Genel"} · {activeClass.room || "Derslik"}
                </span>
              </div>
              <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                Kontenjan: <b>{activeClass.capacity}</b> · Sınıf Öğretmeni: <b>{activeClass.teacher || "—"}</b>
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button 
                className="btn small"
                onClick={() => setInspectingClass(activeClass)} 
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1e293b", color: "#fff", fontWeight: "600" }}
              >
                <Users size={14} /> Detaylı Sınıf Portalı & A4 Yazdır
              </button>
              <button className="btn small secondary" onClick={() => setEditingClass(activeClass)} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Edit size={14} /> Sınıfı Düzenle
              </button>
              <button className="btn small secondary" onClick={() => onNavigate && onNavigate("attendance")} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <UserCheck size={14} /> Yoklama Al
              </button>
              <button className="btn small secondary" onClick={() => onNavigate && onNavigate("schedules")} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Clock size={14} /> Ders Programı
              </button>
              <button className="btn small" onClick={() => onOpen("student")} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#2563eb" }}>
                <Plus size={14} /> Yeni Öğrenci Ekle
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div className="top-search" style={{ width: "320px", margin: 0 }}>
              <Search size={15} />
              <input 
                placeholder="Bu sınıfta öğrenci, veli, telefon ara..." 
                value={studentSearch} 
                onChange={e => setStudentSearch(e.target.value)} 
              />
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Öğrenci satırına tıklayarak doğrudan tam <b>Öğrenci Bilgi Sayfasını</b> açabilirsiniz.
            </span>
          </div>

          {filteredClassStudents.length > 0 ? (
            <div style={{ border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
              <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Öğrenci Adı Soyadı</th>
                    <th>Okulu</th>
                    <th>Veli & İletişim</th>
                    <th>Taksit / Bakiye</th>
                    <th>Durum</th>
                    <th style={{ textAlign: "right" }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClassStudents.map(s => {
                    const rem = Math.max(0, (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0));
                    return (
                      <tr 
                        key={s.id} 
                        onClick={() => onSelect && onSelect(s)}
                        style={{ cursor: "pointer", transition: "background 0.15s" }}
                      >
                        <td><b style={{ color: "#2563eb", fontFamily: "monospace" }}>#{s.student_no || "—"}</b></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div className="student-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                              {s.student_name?.split(" ").map(x=>x[0]).join("").slice(0,2)}
                            </div>
                            <div>
                              <b style={{ color: "#1e293b", display: "block" }}>{s.student_name}</b>
                              {s.student_tc && <span style={{ fontSize: "11px", color: "#64748b" }}>TC: {s.student_tc}</span>}
                            </div>
                          </div>
                        </td>
                        <td><span style={{ color: "#475569" }}>{s.school || "—"}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div>
                              <span>{s.parent_name}</span>
                              <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>{s.parent_phone}</span>
                            </div>
                            {s.parent_phone && (
                              <a 
                                href={`https://wa.me/${s.parent_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Sayın ${s.parent_name}, Özel İnegöl Çözüm Kursu olarak ${s.student_name} isimli öğrencimizin sınıfı (${activeClass.name}) hakkında bilgilendirmedir.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Veliye WhatsApp Mesajı Gönder"
                                style={{ 
                                  display: "inline-flex", 
                                  alignItems: "center", 
                                  justifyContent: "center", 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: "6px", 
                                  background: "#22c55e", 
                                  color: "#fff",
                                  textDecoration: "none"
                                }}
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <b style={{ color: rem > 0 ? "#ef4444" : "#16a34a" }}>
                            {rem > 0 ? `${rem.toLocaleString("tr-TR")} TL Kalan` : "Ödendi ✓"}
                          </b>
                        </td>
                        <td>
                          <span className="status-pill success">{s.status || "Kayıtlı"}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button 
                            className="btn small secondary" 
                            onClick={(e) => { e.stopPropagation(); onSelect && onSelect(s); }}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 8px" }}
                          >
                            Öğrenci Bilgi Sayfası <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
              <Users size={28} color="#94a3b8" style={{ margin: "0 auto 6px auto" }} />
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                {studentSearch ? "Aramaya uygun öğrenci bulunamadı." : "Bu sınıfta henüz kayıtlı öğrenci yok."}
              </p>
            </div>
          )}
        </div>
      )}

      {inspectingClass && (
        <ClassDetailModal
          activeClass={inspectingClass}
          students={students}
          onClose={() => setInspectingClass(null)}
          onSelectStudent={(s) => {
            setInspectingClass(null);
            if (onSelect) onSelect(s);
          }}
          onEditClass={(c) => {
            setInspectingClass(null);
            setEditingClass(c);
          }}
          onNavigate={(page) => {
            setInspectingClass(null);
            if (onNavigate) onNavigate(page);
          }}
          onOpenNewStudent={() => {
            setInspectingClass(null);
            if (onOpen) onOpen("student");
          }}
        />
      )}

      {editingClass && (
        <EditClassModal 
          cls={editingClass} 
          onClose={() => setEditingClass(null)} 
          API={API}
          onSaved={() => {
            if (reload) reload();
            setEditingClass(null);
          }}
        />
      )}
    </>
  );
}

export default Classes;
