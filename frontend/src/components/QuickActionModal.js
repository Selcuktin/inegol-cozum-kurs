import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Camera } from "lucide-react";
import { Button } from "../pages/DashboardPage";
import AccountingService from "../lib/edesisAccountingService";
import StudentService from "../lib/edesisStudentService";
import { API } from "./layout/AuthAndNav";

const money = (n) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);

export const DISCOUNT_TYPES = [
  { v: "", label: "— İndirim yok —" },
  { v: "kardes", label: "Kardeş İndirimi" },
  { v: "ogretmen_cocugu", label: "Öğretmen Çocuğu İndirimi" },
  { v: "personel_cocugu", label: "Personel Çocuğu İndirimi" },
  { v: "basari", label: "Başarı İndirimi" },
  { v: "kurumsal", label: "Kurumsal İndirim" },
  { v: "kayitli", label: "Kayıtlı Öğrenci İndirimi" },
  { v: "sehit_gazi", label: "Şehit/Gazi Çocuğu İndirimi" },
  { v: "korucu", label: "Korucu Çocuğu İndirimi" },
  { v: "diger", label: "Diğer" }
];

export const EXTRA_KEYS = [
  { k: "kaynak", label: "Kaynak Kitaplar Ücreti" },
  { k: "dijital", label: "Dijital Platform Ücreti" },
  { k: "dnm", label: "DNM Kulübü Ücreti" },
  { k: "kutuphane", label: "Kütüphane / Kafe Ücreti" },
  { k: "ozel_ders", label: "Özel Ders Ücreti" }
];

export const computeEffective = (s) => {
  const total = Number(s?.total_fee || 0);
  let extraSum = 0;
  try {
    const extras = typeof s?.extra_fees === "string" ? JSON.parse(s.extra_fees || "{}") : (s?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(s?.discount_amount || 0);
  return { total, extraSum, discount, effective: Math.max(0, total + extraSum - discount) };
};

export function Modal({ type, selected, data = {}, close, reload, API: apiProp }) {
  const apiBase = apiProp || API;
  const [form, setForm] = useState({
    payment_date: today(),
    method: "Nakit",
    amount: "",
    installment_count: 1,
    extra_kaynak: 0,
    extra_dijital: 0,
    extra_dnm: 0,
    extra_kutuphane: 0,
    extra_ozel_ders: 0,
    discount_type: "",
    discount_amount: 0
  });
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef();
  if (!type) return null;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const extraSum = EXTRA_KEYS.reduce((s, x) => s + Number(form[`extra_${x.k}`] || 0), 0);
  const effective = Number(form.total_fee || 0) + extraSum - Number(form.discount_amount || 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (type === "student") {
        const payload = {
          ...form,
          parent_name: form.parent_name?.trim() || form.mother_name?.trim() || form.guardian_name?.trim() || "Belirtilmedi",
          total_fee: Number(form.total_fee || 0),
          installment_count: Number(form.installment_count || 1),
          discount_amount: Number(form.discount_amount || 0),
          extra_fees: EXTRA_KEYS.reduce((o, x) => ({ ...o, [x.k]: Number(form[`extra_${x.k}`] || 0) }), {}),
          photo
        };
        EXTRA_KEYS.forEach((x) => delete payload[`extra_${x.k}`]);
        const res = await axios.post(`${apiBase}/students`, payload);
        const saved = res.data || {};
        try {
          const cRes = AccountingService.addNewIncome({
            id: saved.contract_id || `cnt_${saved.id}`,
            studentId: saved.id,
            student_no: saved.student_no || payload.student_no,
            ogrenciAdi: payload.student_name,
            veliAdi: payload.parent_name,
            sinifAdi: payload.student_class || "Genel",
            brutTutar: effective || payload.total_fee || 75000,
            taksitSayisi: payload.installment_count || 1,
            vadeTarihi: payload.due_date || new Date().toISOString().slice(0, 10),
            aciklama: "Kayıt Sözleşmesi",
            sozlesmeNo: saved.sozlesme_no || saved.sozlesmeNo,
            skipRemoteSync: true
          });
          const finalSt = {
            ...saved,
            ...payload,
            has_contract: true,
            sozlesme_no: saved.sozlesme_no || cRes?.contract?.sozlesmeNo || ""
          };
          AccountingService.unTombstone(finalSt.student_name, finalSt.sozlesme_no, finalSt.id);
          StudentService.saveStudent(finalSt, apiBase, { skipRemoteSync: true });
        } catch (accErr) {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cozum_accounting_updated"));
          window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: { action: "save", student: { ...saved, ...payload } } }));
        }
      }
      if (type === "payment") {
        await axios.post(`${apiBase}/payments`, { ...form, student_id: form.student_id, amount: Number(form.amount) });
        const st = (data.students || []).find((s) => s.id === form.student_id);
        AccountingService.recordCollection({
          studentId: form.student_id,
          studentName: st?.student_name || "Öğrenci",
          amount: Number(form.amount),
          method: form.method || "Nakit",
          bank: form.bank || "Nakit Ana Kasa",
          note: form.note || "Taksit Tahsilatı",
          gelirKodu: st?.gelir_kodu,
          sozlesmeNo: st?.sozlesme_no
        });
      }
      if (type === "expense") {
        await axios.post(`${apiBase}/expenses`, {
          ...form,
          title: form.title || form.note || "Genel Gider",
          category: form.category || "Genel",
          expense_date: form.expense_date || form.payment_date || today(),
          amount: Number(form.amount)
        });
      }
      if (type === "class") {
        await axios.post(`${apiBase}/classes`, { ...form, capacity: Number(form.capacity || 20) });
      }
      if (reload) await reload();
      if (close) close();
    } catch (err) {
      setError(err.response?.data?.detail || "Kayıt sırasında bir sorun oluştu.");
    }
  };

  const title = {
    student: "Yeni öğrenci kaydı",
    payment: "Tahsilat ekle",
    expense: "Gider ekle",
    class: "Yeni sınıf oluştur"
  }[type];

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">KURS YÖNETİMİ</div>
            <h2>{title}</h2>
          </div>
          <button data-testid="modal-close" className="icon-btn" onClick={close} type="button">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="modal-form-body">
            {type === "student" && (
              <>
                <div className="form-section-title">Öğrenci Bilgileri</div>
                <div className="form-grid">
                  <label>
                    Öğrenci ad soyad
                    <input data-testid="student-name-input" required name="student_name" onChange={change} />
                  </label>
                  <label>
                    Öğrenci T.C.
                    <input data-testid="student-tc-input" name="student_tc" onChange={change} />
                  </label>
                  <label>
                    Öğrenci telefon
                    <input data-testid="student-phone-input" name="student_phone" onChange={change} />
                  </label>
                  <label>
                    Okul
                    <input data-testid="student-school-input" name="school" onChange={change} />
                  </label>
                  <label>
                    Sınıf
                    <input data-testid="student-class-input" name="student_class" onChange={change} />
                  </label>
                  <label>
                    Program
                    <input data-testid="program-input" name="program" placeholder="TYT - AYT" onChange={change} />
                  </label>
                </div>
                <label>
                  Öğrenci ev adresi
                  <textarea data-testid="student-address-input" name="student_address" onChange={change} />
                </label>

                <div className="form-section-title">Baba (Veli) Bilgileri</div>
                <div className="form-grid">
                  <label>
                    Ad soyad
                    <input data-testid="parent-name-input" name="parent_name" onChange={change} />
                  </label>
                  <label>
                    T.C.
                    <input data-testid="parent-tc-input" name="parent_tc" onChange={change} />
                  </label>
                  <label>
                    Cep telefonu
                    <input data-testid="parent-phone-input" name="parent_phone" onChange={change} />
                  </label>
                  <label>
                    Mesleği
                    <input data-testid="father-job-input" name="father_job" onChange={change} />
                  </label>
                  <label>
                    İş telefonu
                    <input data-testid="father-work-phone-input" name="father_work_phone" onChange={change} />
                  </label>
                  <label>
                    e-Posta
                    <input data-testid="father-email-input" type="email" name="father_email" onChange={change} />
                  </label>
                </div>
                <label>
                  Baba ev adresi
                  <textarea data-testid="parent-address-input" name="parent_address" onChange={change} />
                </label>
                <label>
                  Baba iş adresi
                  <textarea data-testid="father-work-address-input" name="father_work_address" onChange={change} />
                </label>

                <details className="form-details">
                  <summary>Anne Bilgileri (isteğe bağlı)</summary>
                  <div className="form-grid">
                    <label>
                      Ad soyad
                      <input data-testid="mother-name-input" name="mother_name" onChange={change} />
                    </label>
                    <label>
                      T.C.
                      <input data-testid="mother-tc-input" name="mother_tc" onChange={change} />
                    </label>
                    <label>
                      Cep telefonu
                      <input data-testid="mother-phone-input" name="mother_phone" onChange={change} />
                    </label>
                    <label>
                      Mesleği
                      <input data-testid="mother-job-input" name="mother_job" onChange={change} />
                    </label>
                    <label>
                      İş telefonu
                      <input data-testid="mother-work-phone-input" name="mother_work_phone" onChange={change} />
                    </label>
                    <label>
                      e-Posta
                      <input data-testid="mother-email-input" type="email" name="mother_email" onChange={change} />
                    </label>
                  </div>
                  <label>
                    Anne ev adresi
                    <textarea data-testid="mother-address-input" name="mother_address" onChange={change} />
                  </label>
                  <label>
                    Anne iş adresi
                    <textarea data-testid="mother-work-address-input" name="mother_work_address" onChange={change} />
                  </label>
                </details>

                <details className="form-details">
                  <summary>Vasi Bilgileri (varsa)</summary>
                  <div className="form-grid">
                    <label>
                      Ad soyad
                      <input data-testid="guardian-name-input" name="guardian_name" onChange={change} />
                    </label>
                    <label>
                      T.C.
                      <input data-testid="guardian-tc-input" name="guardian_tc" onChange={change} />
                    </label>
                    <label>
                      Cep telefonu
                      <input data-testid="guardian-phone-input" name="guardian_phone" onChange={change} />
                    </label>
                    <label>
                      Ev telefonu
                      <input data-testid="guardian-home-phone-input" name="guardian_home_phone" onChange={change} />
                    </label>
                    <label>
                      İş telefonu
                      <input data-testid="guardian-work-phone-input" name="guardian_work_phone" onChange={change} />
                    </label>
                    <label>
                      Mesleği
                      <input data-testid="guardian-job-input" name="guardian_job" onChange={change} />
                    </label>
                    <label>
                      e-Posta
                      <input data-testid="guardian-email-input" type="email" name="guardian_email" onChange={change} />
                    </label>
                  </div>
                  <label>
                    Ev adresi
                    <textarea data-testid="guardian-home-address-input" name="guardian_home_address" onChange={change} />
                  </label>
                  <label>
                    İş adresi
                    <textarea data-testid="guardian-work-address-input" name="guardian_work_address" onChange={change} />
                  </label>
                </details>

                <div className="form-section-title">Ödeme Bilgileri</div>
                <div className="form-grid">
                  <label>
                    Öğrenim ücreti (₺)
                    <input data-testid="total-fee-input" type="number" min="0" name="total_fee" onChange={change} />
                  </label>
                  <label>
                    Taksit sayısı
                    <input data-testid="installment-count-input" type="number" min="1" name="installment_count" defaultValue="1" onChange={change} />
                  </label>
                  <label>
                    İlk ödeme tarihi
                    <input data-testid="due-date-input" type="date" name="due_date" onChange={change} />
                  </label>
                </div>

                <details className="form-details" open>
                  <summary>Ekstra Ücretler (isteğe bağlı)</summary>
                  <div className="form-grid">
                    {EXTRA_KEYS.map((x) => (
                      <label key={x.k}>
                        {x.label} (₺)
                        <input data-testid={`extra-${x.k}-input`} type="number" min="0" name={`extra_${x.k}`} defaultValue="0" onChange={change} />
                      </label>
                    ))}
                  </div>
                </details>

                <details className="form-details">
                  <summary>İndirim</summary>
                  <div className="form-grid">
                    <label>
                      İndirim türü
                      <select data-testid="discount-type-select" name="discount_type" onChange={change}>
                        {DISCOUNT_TYPES.map((d) => (
                          <option key={d.v} value={d.v}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      İndirim tutarı (₺)
                      <input data-testid="discount-amount-input" type="number" min="0" name="discount_amount" defaultValue="0" onChange={change} />
                    </label>
                    <label>
                      İndirim notu
                      <input data-testid="discount-note-input" name="discount_note" placeholder="Örn. iki kardeş" onChange={change} />
                    </label>
                  </div>
                </details>

                <div className="fee-summary" data-testid="fee-summary">
                  <div>
                    <span>Öğrenim ücreti</span>
                    <b>{money(Number(form.total_fee || 0))}</b>
                  </div>
                  <div>
                    <span>+ Ekstra ücretler</span>
                    <b className="green">{money(extraSum)}</b>
                  </div>
                  <div>
                    <span>− İndirim</span>
                    <b className="red">{money(Number(form.discount_amount || 0))}</b>
                  </div>
                  <div className="summary-total">
                    <span>NET TOPLAM</span>
                    <b data-testid="effective-total">{money(effective)}</b>
                  </div>
                </div>

                <CameraCapture photo={photo} setPhoto={setPhoto} videoRef={videoRef} />
              </>
            )}
            {type === "payment" && (
              <div className="form-grid">
                <label>
                  Öğrenci
                  <select data-testid="payment-student-select" required name="student_id" onChange={change}>
                    <option value="">Öğrenci seçin</option>
                    {(data.students || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.student_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tutar (₺)
                  <input data-testid="payment-amount-input" required type="number" name="amount" onChange={change} />
                </label>
                <label>
                  Ödeme yöntemi
                  <select data-testid="payment-method-select" name="method" onChange={change}>
                    <option>Nakit</option>
                    <option>Çek</option>
                    <option>Kredi Kartı</option>
                    <option>Banka Transferi</option>
                  </select>
                </label>
                <label>
                  Banka seçimi
                  <input data-testid="payment-bank-input" name="bank" placeholder="Banka adı" onChange={change} />
                </label>
                <label>
                  Ödeme tarihi
                  <input data-testid="payment-date-input" type="date" name="payment_date" value={form.payment_date} onChange={change} />
                </label>
                <label>
                  Açıklama
                  <input data-testid="payment-note-input" name="note" placeholder="Örn. Mart taksiti" onChange={change} />
                </label>
              </div>
            )}
            {type === "expense" && (
              <div className="form-grid">
                <label>
                  Gider başlığı / açıklama
                  <input data-testid="expense-title-input" required name="title" placeholder="Örn. Elektrik faturası" onChange={change} />
                </label>
                <label>
                  Kategori
                  <select data-testid="expense-category-select" name="category" onChange={change}>
                    <option value="Genel">Genel</option>
                    <option value="Kira">Kira</option>
                    <option value="Fatura">Fatura</option>
                    <option value="Maaş">Maaş</option>
                    <option value="Materyal">Materyal / Kırtasiye</option>
                    <option value="Mutfak">Mutfak / İkram</option>
                  </select>
                </label>
                <label>
                  Tutar (₺)
                  <input data-testid="expense-amount-input" required type="number" name="amount" onChange={change} />
                </label>
                <label>
                  Tarih
                  <input data-testid="expense-date-input" type="date" name="expense_date" defaultValue={form.payment_date} onChange={change} />
                </label>
              </div>
            )}
            {type === "class" && (
              <div className="form-grid">
                <label>
                  Sınıf adı
                  <input data-testid="class-name-input" required name="name" onChange={change} />
                </label>
                <label>
                  Seviye
                  <input data-testid="class-level-input" name="level" onChange={change} />
                </label>
                <label>
                  Derslik
                  <input data-testid="class-room-input" name="room" onChange={change} />
                </label>
                <label>
                  Kontenjan
                  <input data-testid="class-capacity-input" type="number" name="capacity" defaultValue="20" onChange={change} />
                </label>
                <label>
                  Öğretmen
                  <input data-testid="class-teacher-input" name="teacher" onChange={change} />
                </label>
              </div>
            )}
            {error && (
              <div data-testid="modal-error" className="modal-error">
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button testid="modal-cancel" secondary onClick={close} type="button">
              Vazgeç
            </Button>
            <Button testid="modal-submit" type="submit">
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CameraCapture({ photo, setPhoto, videoRef: externalRef }) {
  const localRef = useRef(null);
  const videoRef = externalRef || localRef;
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [streamError, setStreamError] = useState("");
  const fileInputRef = useRef(null);

  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const startStream = async (mode = facingMode) => {
    stopStream();
    setStreamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setStreamError("Kamera açılamadı. Tarayıcı izinlerini kontrol edin veya galeriden seçin.");
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startStream(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
    const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
    const startX = ((video.videoWidth || 320) - size) / 2;
    const startY = ((video.videoHeight || 320) - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 320, 320);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    stopStream();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target.result);
      stopStream();
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div className="camera-box">
      <div className="camera-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Öğrenci Fotoğrafı
        </span>
        {photo && (
          <button
            type="button"
            className="small-btn danger"
            onClick={() => {
              setPhoto("");
              startStream();
            }}
          >
            Sil / Yeniden Çek
          </button>
        )}
      </div>

      {photo ? (
        <div className="photo-preview-wrap">
          <img src={photo} alt="Öğrenci Vesikalık" className="captured-avatar" />
          <span className="muted-cell" style={{ fontSize: 11 }}>
            Vesikalık fotoğraf başarıyla kaydedildi ✓
          </span>
        </div>
      ) : (
        <div className="live-camera-wrap">
          {isStreaming ? (
            <div className="video-container">
              <video ref={videoRef} autoPlay playsInline muted className="live-video" />
              <div className="avatar-frame-overlay" />
            </div>
          ) : (
            <div className="camera-placeholder" onClick={() => startStream()}>
              <Camera size={28} />
              <span>Fotoğraf çekmek için kamerayı açın</span>
            </div>
          )}

          {streamError && (
            <div className="modal-error" style={{ fontSize: 11 }}>
              {streamError}
            </div>
          )}

          <div className="camera-btn-group">
            {!isStreaming ? (
              <button type="button" data-testid="start-camera-button" className="small-btn" onClick={() => startStream()}>
                <Camera size={13} style={{ display: "inline", marginRight: 4 }} /> Kamerayı Aç
              </button>
            ) : (
              <>
                <button type="button" data-testid="capture-photo-button" className="btn" style={{ height: 32, fontSize: 12, padding: "0 12px" }} onClick={capturePhoto}>
                  📸 Çek
                </button>
                <button type="button" className="small-btn" onClick={toggleCamera} title="Ön/Arka Kamera">
                  🔄 Çevir
                </button>
                <button type="button" className="small-btn" onClick={stopStream}>
                  Kapat
                </button>
              </>
            )}

            <button type="button" className="small-btn" onClick={() => fileInputRef.current?.click()}>
              📁 Galeriden / Dosyadan Seç
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
          </div>
        </div>
      )}
    </div>
  );
}
