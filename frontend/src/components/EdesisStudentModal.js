import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import { StudentService } from "../lib/edesisStudentService";
import AccountingService from "../lib/edesisAccountingService";
import {
  X,
  User,
  Users,
  GraduationCap,
  CreditCard,
  Camera,
  Check,
  AlertTriangle,
  FileText,
  Calendar,
  Building,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

const DISCOUNT_TYPES = [
  { v: "", label: "İndirim Yok" },
  { v: "kardes", label: "Kardeş İndirimi" },
  { v: "erken_kayit", label: "Erken Kayıt İndirimi" },
  { v: "pesin", label: "Peşin Ödeme İndirimi" },
  { v: "basari_bursu", label: "Başarı / Derece Bursu" },
  { v: "ogretmen_cocugu", label: "Öğretmen / Personel Çocuğu" },
  { v: "ozel", label: "Özel Kurumsal İndirim" }
];

const EXTRA_SERVICES = [
  { k: "kaynak", label: "Yayın & Kitap Paketi", defaultPrice: 4500 },
  { k: "dijital", label: "Dijital Soru Bankası & Platform", defaultPrice: 2000 },
  { k: "dnm", label: "Kurumsal Türkiye Geneli Denemeler", defaultPrice: 3500 },
  { k: "kutuphane", label: "Sessiz Kütüphane & Etüt Kullanımı", defaultPrice: 1500 }
];

export function EdesisStudentModal({ isOpen, onClose, classes = [], API, onStudentAdded, initialData = null }) {
  const [activeTab, setActiveTab] = useState("genel"); // 'genel' | 'veli' | 'egitim' | 'muhasebe'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // 1. Genel Öğrenci Bilgileri
    student_name: "",
    student_tc: "",
    student_no: "",
    gender: "Erkek",
    birth_date: "",
    student_phone: "",
    school: "İnegöl Anadolu Lisesi",
    student_class: classes[0]?.name || "11-A Sayısal",
    department: "Sayısal",
    status: "Kayitli",
    student_address: "",
    photo: "",

    // 2. Veli ve Aile Bilgileri
    primary_parent: "baba",
    parent_name: "",
    parent_tc: "",
    parent_phone: "",
    father_job: "",
    father_work_phone: "",
    father_email: "",
    parent_address: "",
    father_work_address: "",

    mother_name: "",
    mother_tc: "",
    mother_phone: "",
    mother_job: "",
    mother_work_phone: "",
    mother_email: "",
    mother_address: "",
    mother_work_address: "",

    guardian_name: "",
    guardian_tc: "",
    guardian_phone: "",
    guardian_job: "",

    // 3. Eğitim & Muafiyetler
    din_muaf: 0,
    ing_muaf: 0,
    uses_service: 0,
    diploma_grade: "",
    health_notes: "",

    // 4. Finans & Taksit
    total_fee: 35000,
    discount_type: "",
    discount_amount: 0,
    discount_note: "",
    paid_amount: 0,
    installment_count: 6,
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    extra_kaynak: 4500,
    extra_dijital: 0,
    extra_dnm: 3500,
    extra_kutuphane: 0
  });

  React.useEffect(() => {
    if (initialData) {
      let extras = {};
      try {
        extras = typeof initialData.extra_fees === "string" ? JSON.parse(initialData.extra_fees || "{}") : (initialData.extra_fees || {});
      } catch {}
      setFormData({
        ...initialData,
        extra_kaynak: extras.kaynak !== undefined ? Number(extras.kaynak) : 4500,
        extra_dijital: extras.dijital !== undefined ? Number(extras.dijital) : 0,
        extra_dnm: extras.dnm !== undefined ? Number(extras.dnm) : 3500,
        extra_kutuphane: extras.kutuphane !== undefined ? Number(extras.kutuphane) : 0,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value
    }));
  };

  // Dinamik Hesaplamalar
  const extraTotal = useMemo(() => {
    return (
      Number(formData.extra_kaynak || 0) +
      Number(formData.extra_dijital || 0) +
      Number(formData.extra_dnm || 0) +
      Number(formData.extra_kutuphane || 0)
    );
  }, [formData.extra_kaynak, formData.extra_dijital, formData.extra_dnm, formData.extra_kutuphane]);

  const netTotal = useMemo(() => {
    const base = Number(formData.total_fee || 0);
    const disc = Number(formData.discount_amount || 0);
    return Math.max(0, base + extraTotal - disc);
  }, [formData.total_fee, extraTotal, formData.discount_amount]);

  // Canlı Taksit Planı Çizelgesi
  const installmentPlan = useMemo(() => {
    const count = Math.max(1, parseInt(formData.installment_count) || 1);
    const per = Math.round((netTotal / count) * 100) / 100;
    const plan = [];

    let startYear = new Date().getFullYear();
    let startMonth = new Date().getMonth() + 1;
    let startDay = 15;

    if (formData.due_date && formData.due_date.length >= 10) {
      const parts = formData.due_date.split("-");
      startYear = parseInt(parts[0]) || startYear;
      startMonth = parseInt(parts[1]) || startMonth;
      startDay = parseInt(parts[2]) || startDay;
    }

    for (let i = 0; i < count; i++) {
      let m = startMonth + i;
      let y = startYear + Math.floor((m - 1) / 12);
      m = ((m - 1) % 12) + 1;
      const dueStr = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(startDay, 28)).padStart(2, "0")}`;
      const amount = i === count - 1 ? Math.max(0, Math.round((netTotal - per * (count - 1)) * 100) / 100) : per;

      plan.push({
        no: i + 1,
        dueDate: dueStr,
        amount
      });
    }
    return plan;
  }, [netTotal, formData.installment_count, formData.due_date]);

  // Kamera Çekimi
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      alert("Kameraya erişilemedi veya izin verilmedi.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 300, 300);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setFormData((prev) => ({ ...prev, photo: dataUrl }));
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!formData.student_name.trim()) {
      setActiveTab("genel");
      return setError("Öğrenci adı soyadı zorunludur.");
    }

    const resolvedParent =
      formData.parent_name?.trim() ||
      formData.mother_name?.trim() ||
      formData.guardian_name?.trim() ||
      "Belirtilmedi";

    setLoading(true);
    try {
      const extraSum =
        Number(formData.extra_kaynak || 0) +
        Number(formData.extra_dijital || 0) +
        Number(formData.extra_dnm || 0) +
        Number(formData.extra_kutuphane || 0);
      const grossFee = Math.max(0, Number(formData.total_fee || 0) + extraSum - Number(formData.discount_amount || 0));

      const payload = {
        ...formData,
        student_name: formData.student_name.trim(),
        parent_name: resolvedParent,
        total_fee: grossFee || Number(formData.total_fee || 0),
        installment_count: Number(formData.installment_count || 1),
        discount_amount: Number(formData.discount_amount || 0),
        has_contract: true,
        sozlesme_no: formData.sozlesme_no || initialData?.sozlesme_no || "",
        gelir_kodu: formData.gelir_kodu || initialData?.gelir_kodu || "",
        extra_fees: {
          kaynak: Number(formData.extra_kaynak || 0),
          dijital: Number(formData.extra_dijital || 0),
          dnm: Number(formData.extra_dnm || 0),
          kutuphane: Number(formData.extra_kutuphane || 0)
        }
      };

      let saved = null;
      if (initialData?.id) {
        const res = await axios.patch(`${API}/students/${initialData.id}`, payload);
        saved = res.data;
      } else {
        const res = await axios.post(`${API}/students`, payload);
        saved = res.data;
      }
      const finalStudent = {
        ...(saved || {}),
        ...payload,
        has_contract: true,
        sozlesme_no: saved?.sozlesme_no || saved?.sozlesmeNo || payload.sozlesme_no || ""
      };
      if (grossFee > 0) {
        try {
          AccountingService.addNewIncome({
            id: saved?.contract_id || `cnt_${saved?.id}`,
            studentId: saved?.id,
            student_no: saved?.student_no || formData.student_no,
            sozlesmeNo: finalStudent.sozlesme_no,
            contract_id: saved?.contract_id,
            ogrenciAdi: formData.student_name.trim(),
            veliAdi: resolvedParent,
            sinifAdi: formData.student_class || "Genel",
            brutTutar: grossFee,
            taksitSayisi: Number(formData.installment_count) || 1,
            vadeTarihi: formData.due_date || new Date().toISOString().slice(0, 10),
            aciklama: `Kayıt Sözleşmesi`,
            skipRemoteSync: true
          });
        } catch (accErr) {
          console.warn("Accounting contract re-sync warning:", accErr);
        }
      }
      AccountingService.unTombstone(finalStudent.student_name, finalStudent.sozlesme_no, finalStudent.id);
      StudentService.saveStudent(finalStudent, API, { skipRemoteSync: true });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cozum_accounting_updated"));
        window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: { action: "save", student: finalStudent } }));
      }
      if (onStudentAdded) onStudentAdded();
      stopCamera();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Öğrenci kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="student-modal-title" style={{ zIndex: 100060 }}>
      <div className="modal wide edesis-wizard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Başlık ve Kapat Butonu */}
        <div className="modal-head">
          <div>
            <div className="eyebrow">EDESİS ÖĞRENCİ İŞLERİ · RESMİ KAYIT FORMU</div>
            <h2 id="student-modal-title">{initialData ? `Öğrenci Düzenleme: ${initialData.student_name}` : "Yeni Öğrenci ve Sözleşme Kaydı"}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} type="button" aria-label="Pencereyi kapat">
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {/* Edesis 4 Sekmeli Navigasyon Çubuğu */}
        <div className="edesis-modal-tabs" role="tablist" aria-label="Kayıt formu sekmeleri">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "genel"}
            className={`tab-btn ${activeTab === "genel" ? "active" : ""}`}
            onClick={() => setActiveTab("genel")}
          >
            <User size={16} aria-hidden="true" />
            <span>1. Öğrenci Bilgileri</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "veli"}
            className={`tab-btn ${activeTab === "veli" ? "active" : ""}`}
            onClick={() => setActiveTab("veli")}
          >
            <Users size={16} aria-hidden="true" />
            <span>2. Veli & Aile</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "egitim"}
            className={`tab-btn ${activeTab === "egitim" ? "active" : ""}`}
            onClick={() => setActiveTab("egitim")}
          >
            <GraduationCap size={16} aria-hidden="true" />
            <span>3. Eğitim & Muafiyetler</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "muhasebe"}
            className={`tab-btn ${activeTab === "muhasebe" ? "active" : ""}`}
            onClick={() => setActiveTab("muhasebe")}
          >
            <CreditCard size={16} aria-hidden="true" />
            <span>4. Kayıt & Taksit Planı</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="modal-form-body" style={{ minHeight: "420px" }}>
            {error && (
              <div className="modal-error" style={{ marginBottom: "14px" }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            {/* SEKME 1: ÖĞRENCİ GENEL BİLGİLERİ */}
            {activeTab === "genel" && (
              <div className="tab-pane">
                <div className="form-grid">
                  <label>
                    Öğrenci Adı Soyadı *
                    <input
                      name="student_name"
                      placeholder="Örn: Mehmet Ali Kaya"
                      value={formData.student_name}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    T.C. Kimlik Numarası (11 Hane)
                    <input
                      name="student_tc"
                      maxLength={11}
                      placeholder="Örn: 12345678901"
                      value={formData.student_tc}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <label>
                    Öğrenci / Okul No
                    <input
                      name="student_no"
                      placeholder="Örn: 1042"
                      value={formData.student_no}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Cinsiyet
                    <select name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="Erkek">Erkek</option>
                      <option value="Kız">Kız</option>
                    </select>
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <label>
                    Doğum Tarihi
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Öğrenci Cep Telefonu
                    <input
                      name="student_phone"
                      placeholder="0532 ..."
                      value={formData.student_phone}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <label>
                    Kayıtlı Olduğu Örgün Okul
                    <input
                      name="school"
                      placeholder="Örn: İnegöl Anadolu Lisesi"
                      value={formData.school}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Kurs Şubesi / Sınıfı
                    <select name="student_class" value={formData.student_class} onChange={handleChange}>
                      {classes.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.level || "Genel"})
                        </option>
                      ))}
                      <option value="1-A">1-A (İlkokul)</option>
                      <option value="2-A">2-A (İlkokul)</option>
                      <option value="3-A">3-A (İlkokul)</option>
                      <option value="4-A">4-A (İlkokul)</option>
                      <option value="5-A">5-A (Ara Sınıf)</option>
                      <option value="6-A">6-A (Ara Sınıf)</option>
                      <option value="7-A">7-A (Ara Sınıf)</option>
                      <option value="8-A LGS">8-A (LGS Hazırlık)</option>
                      <option value="9-A">9-A (Ara Sınıf)</option>
                      <option value="10-A">10-A (Ara Sınıf)</option>
                      <option value="11-A Sayısal">11-A Sayısal</option>
                      <option value="11-B Eşit Ağırlık">11-B Eşit Ağırlık</option>
                      <option value="12-A Sayısal">12-A Sayısal</option>
                      <option value="12-B Eşit Ağırlık">12-B Eşit Ağırlık</option>
                      <option value="Mezun Sayısal">Mezun Sayısal</option>
                      <option value="Mezun EA">Mezun EA</option>
                    </select>
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <label>
                    Alanı / Bölümü
                    <select name="department" value={formData.department} onChange={handleChange}>
                      <option value="ILKOKUL">İlkokul</option>
                      <option value="ARA SINIF">Ara Sınıf</option>
                      <option value="LGS">LGS (8. Sınıf)</option>
                      <option value="Sayısal">Sayısal (MF)</option>
                      <option value="Eşit Ağırlık">Eşit Ağırlık (TM)</option>
                      <option value="Sözel">Sözel (TS)</option>
                      <option value="Yabancı Dil">Yabancı Dil (DİL)</option>
                      <option value="TYT">TYT / YKS</option>
                    </select>
                  </label>
                  <label>
                    Öğrenci Durumu
                    <select name="status" value={formData.status} onChange={handleChange}>
                      <option value="Kayitli">Kayıtlı (Aktif Öğrenci)</option>
                      <option value="Burslu">Burslu Öğrenci</option>
                      <option value="Donduruldu">Kayıt Donduruldu</option>
                      <option value="Ayrildi">Ayrıldı / İptal</option>
                    </select>
                  </label>
                </div>

                <label style={{ marginTop: "10px", display: "block" }}>
                  Ev / İkametgah Adresi
                  <textarea
                    rows={2}
                    name="student_address"
                    placeholder="Mahalle, Cadde, No, İnegöl / BURSA"
                    value={formData.student_address}
                    onChange={handleChange}
                  />
                </label>

                {/* Vesikalık Fotoğraf / Kamera */}
                <div className="camera-box" style={{ marginTop: "14px" }}>
                  <div className="camera-title">
                    <Camera size={16} /> Öğrenci Vesikalık Fotoğrafı
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    {formData.photo ? (
                      <img src={formData.photo} alt="Öğrenci" style={{ width: "90px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--line)" }} />
                    ) : (
                      <div style={{ width: "90px", height: "110px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", color: "var(--muted)", fontSize: "11px" }}>
                        Fotoğraf Yok
                      </div>
                    )}

                    {cameraActive && (
                      <video ref={videoRef} style={{ width: "140px", height: "110px", borderRadius: "6px" }} />
                    )}

                    <div>
                      {!cameraActive ? (
                        <button type="button" className="btn secondary" onClick={startCamera}>
                          <Camera size={15} /> Kamerayı Aç
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button type="button" className="btn" onClick={capturePhoto}>
                            Fotoğrafı Çek
                          </button>
                          <button type="button" className="btn secondary" onClick={stopCamera}>
                            Kapat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEKME 2: VELİ VE AİLE BİLGİLERİ */}
            {activeTab === "veli" && (
              <div className="tab-pane">
                {/* Birincil İletişim Tercihi */}
                <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "6px", marginBottom: "14px" }}>
                  <b style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>Kurumsal SMS & WhatsApp İletişim Önceliği:</b>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="primary_parent" value="baba" checked={formData.primary_parent === "baba"} onChange={handleChange} />
                      Baba Bilgilerine Gönder
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="primary_parent" value="anne" checked={formData.primary_parent === "anne"} onChange={handleChange} />
                      Anne Bilgilerine Gönder
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="primary_parent" value="vasi" checked={formData.primary_parent === "vasi"} onChange={handleChange} />
                      Vasi / Diğer Yakınına Gönder
                    </label>
                  </div>
                </div>

                {/* BABA BİLGİLERİ */}
                <div className="form-section-title">Baba Bilgileri</div>
                <div className="form-grid">
                  <label>
                    Baba Adı Soyadı *
                    <input
                      name="parent_name"
                      placeholder="Örn: Ahmet Kaya"
                      value={formData.parent_name}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Baba T.C. Kimlik
                    <input
                      name="parent_tc"
                      maxLength={11}
                      value={formData.parent_tc}
                      onChange={handleChange}
                    />
                  </label>
                </div>
                <div className="form-grid" style={{ marginTop: "8px" }}>
                  <label>
                    Baba Cep Telefonu *
                    <input
                      name="parent_phone"
                      placeholder="0532 ..."
                      value={formData.parent_phone}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Baba Mesleği
                    <input
                      name="father_job"
                      placeholder="Esnaf, Öğretmen, Mühendis..."
                      value={formData.father_job}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                {/* ANNE BİLGİLERİ */}
                <div className="form-section-title" style={{ marginTop: "16px" }}>Anne Bilgileri</div>
                <div className="form-grid">
                  <label>
                    Anne Adı Soyadı
                    <input
                      name="mother_name"
                      placeholder="Örn: Fatma Kaya"
                      value={formData.mother_name}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Anne Cep Telefonu
                    <input
                      name="mother_phone"
                      placeholder="0533 ..."
                      value={formData.mother_phone}
                      onChange={handleChange}
                    />
                  </label>
                </div>
                <div className="form-grid" style={{ marginTop: "8px" }}>
                  <label>
                    Anne Mesleği
                    <input
                      name="mother_job"
                      placeholder="Ev Hanımı, Memur..."
                      value={formData.mother_job}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Anne E-posta
                    <input
                      type="email"
                      name="mother_email"
                      value={formData.mother_email}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                {/* VASİ BİLGİLERİ */}
                <details className="form-details" style={{ marginTop: "14px" }}>
                  <summary>Vasi / Acil Durum Yakını Bilgileri (İsteğe Bağlı)</summary>
                  <div className="form-grid" style={{ marginTop: "10px" }}>
                    <label>
                      Vasi Adı Soyadı
                      <input name="guardian_name" value={formData.guardian_name} onChange={handleChange} />
                    </label>
                    <label>
                      Vasi Telefonu
                      <input name="guardian_phone" value={formData.guardian_phone} onChange={handleChange} />
                    </label>
                  </div>
                </details>
              </div>
            )}

            {/* SEKME 3: EĞİTİM & MUAFİYETLER */}
            {activeTab === "egitim" && (
              <div className="tab-pane">
                <div className="form-section-title">Ders ve Kurum Muafiyetleri (Edesis Standartı)</div>
                <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "6px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="din_muaf"
                      checked={formData.din_muaf === 1}
                      onChange={handleChange}
                    />
                    <div>
                      <b>Din Kültürü ve Ahlak Bilgisi Dersinden Muaf</b>
                      <small style={{ display: "block", color: "var(--muted)" }}>Deneme sınavlarında Din yerine Felsefe/Ek Sosyal sorularından sorumlu tutulur.</small>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "6px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="ing_muaf"
                      checked={formData.ing_muaf === 1}
                      onChange={handleChange}
                    />
                    <div>
                      <b>Yabancı Dil (İngilizce) Dersinden Muaf</b>
                      <small style={{ display: "block", color: "var(--muted)" }}>LGS sınavlarında yabancı dil net hesaplamasına dahil edilmez.</small>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "6px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="uses_service"
                      checked={formData.uses_service === 1}
                      onChange={handleChange}
                    />
                    <div>
                      <b>Kurum Servis Aracı Hizmetinden Yararlanıyor</b>
                      <small style={{ display: "block", color: "var(--muted)" }}>Servis güzergahı ve sürücü takip modülünde listelenir.</small>
                    </div>
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: "16px" }}>
                  <label>
                    Diploma / OBP Başarı Puanı
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      name="diploma_grade"
                      value={formData.diploma_grade}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Hazırlık Programı
                    <input
                      name="program"
                      value={formData.program}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <label style={{ marginTop: "12px", display: "block" }}>
                  Sağlık, Kronik Rahatsızlık veya Özel Rehberlik Notları
                  <textarea
                    rows={2}
                    name="health_notes"
                    placeholder="Alerji, düzenli kullanılan ilaç veya rehberlik servisine iletilen özel notlar..."
                    value={formData.health_notes}
                    onChange={handleChange}
                  />
                </label>
              </div>
            )}

            {/* SEKME 4: KAYIT SÖZLEŞMESİ & TAKSİT PLANI */}
            {activeTab === "muhasebe" && (
              <div className="tab-pane">
                <div className="form-grid">
                  <label>
                    Kurs Öğrenim Ücreti (₺)
                    <input
                      type="number"
                      min="0"
                      name="total_fee"
                      value={formData.total_fee}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Taksit Sayısı
                    <select name="installment_count" value={formData.installment_count} onChange={handleChange}>
                      <option value="1">1 Taksit (Peşin)</option>
                      <option value="2">2 Taksit</option>
                      <option value="3">3 Taksit</option>
                      <option value="4">4 Taksit</option>
                      <option value="5">5 Taksit</option>
                      <option value="6">6 Taksit</option>
                      <option value="8">8 Taksit</option>
                      <option value="9">9 Taksit</option>
                      <option value="10">10 Taksit</option>
                    </select>
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: "10px" }}>
                  <label>
                    İlk Taksit Vade Tarihi
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Burs / İndirim Türü
                    <select name="discount_type" value={formData.discount_type} onChange={handleChange}>
                      {DISCOUNT_TYPES.map((d) => (
                        <option key={d.v} value={d.v}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {formData.discount_type && (
                  <div className="form-grid" style={{ marginTop: "10px" }}>
                    <label>
                      İndirim Tutarı (₺)
                      <input
                        type="number"
                        min="0"
                        name="discount_amount"
                        value={formData.discount_amount}
                        onChange={handleChange}
                      />
                    </label>
                    <label>
                      İndirim Gerekçesi / Notu
                      <input
                        name="discount_note"
                        placeholder="Örn: Erken kayıt %10 indirim"
                        value={formData.discount_note}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                )}

                {/* Ekstra Hizmetler */}
                <details className="form-details" style={{ marginTop: "12px" }}>
                  <summary>Ekstra Yayın ve Dijital Ücretler (İsteğe Bağlı)</summary>
                  <div className="form-grid" style={{ marginTop: "8px" }}>
                    <label>
                      Kitap & Yayın (₺)
                      <input type="number" min="0" name="extra_kaynak" value={formData.extra_kaynak} onChange={handleChange} />
                    </label>
                    <label>
                      Dijital Platform (₺)
                      <input type="number" min="0" name="extra_dijital" value={formData.extra_dijital} onChange={handleChange} />
                    </label>
                    <label>
                      Deneme Sınav Paketi (₺)
                      <input type="number" min="0" name="extra_dnm" value={formData.extra_dnm} onChange={handleChange} />
                    </label>
                    <label>
                      Kütüphane Kullanımı (₺)
                      <input type="number" min="0" name="extra_kutuphane" value={formData.extra_kutuphane} onChange={handleChange} />
                    </label>
                  </div>
                </details>

                {/* Net Finansal Özet Kartı */}
                <div className="fee-summary" style={{ marginTop: "14px" }}>
                  <div>
                    <span>Kurs Ücreti:</span>
                    <b>{Number(formData.total_fee || 0).toLocaleString("tr-TR")} ₺</b>
                  </div>
                  {extraTotal > 0 && (
                    <div>
                      <span>+ Ekstra Hizmetler:</span>
                      <b className="green">+{extraTotal.toLocaleString("tr-TR")} ₺</b>
                    </div>
                  )}
                  {Number(formData.discount_amount || 0) > 0 && (
                    <div>
                      <span>− İndirim / Burs:</span>
                      <b className="red">−{Number(formData.discount_amount || 0).toLocaleString("tr-TR")} ₺</b>
                    </div>
                  )}
                  <div className="summary-total">
                    <span>NET SÖZLEŞME BEDELİ:</span>
                    <b style={{ color: "#1d4ed8", fontSize: "18px" }}>{netTotal.toLocaleString("tr-TR")} ₺</b>
                  </div>
                </div>

                {/* Canlı Taksit Çizelgesi Önizleme Tablosu */}
                <div style={{ marginTop: "14px" }}>
                  <b style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>Otomatik Taksit Ödeme Çizelgesi ({installmentPlan.length} Taksit):</b>
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "6px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                          <th style={{ padding: "6px 10px" }}>Taksit</th>
                          <th style={{ padding: "6px 10px" }}>Vade Tarihi</th>
                          <th style={{ padding: "6px 10px", textAlign: "right" }}>Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentPlan.map((p) => (
                          <tr key={p.no} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 10px" }}><b>#{p.no}. Taksit</b></td>
                            <td style={{ padding: "6px 10px" }}>{p.dueDate}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}><b>{p.amount.toLocaleString("tr-TR")} ₺</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Alt Gezinti ve Kaydet Butonları */}
          <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              {activeTab !== "genel" && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    const tabs = ["genel", "veli", "egitim", "muhasebe"];
                    const currIdx = tabs.indexOf(activeTab);
                    if (currIdx > 0) setActiveTab(tabs[currIdx - 1]);
                  }}
                >
                  <ChevronLeft size={16} /> Geri
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button type="button" className="btn secondary" onClick={onClose}>
                Vazgeç
              </button>

              {activeTab !== "muhasebe" && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    const tabs = ["genel", "veli", "egitim", "muhasebe"];
                    const currIdx = tabs.indexOf(activeTab);
                    if (currIdx < tabs.length - 1) setActiveTab(tabs[currIdx + 1]);
                  }}
                >
                  Sonraki Adım <ChevronRight size={16} />
                </button>
              )}

              <button type="submit" className="btn" disabled={loading} style={{ background: "#1d4ed8", color: "#fff" }}>
                <Check size={16} /> {loading ? "Kaydediliyor..." : (initialData ? "Değişiklikleri Kaydet" : "Öğrenciyi Kaydet")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
