import React, { useState } from "react";
import axios from "axios";
import {
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Printer,
  RefreshCw,
  Sliders,
  Upload,
  X
} from "lucide-react";
import { trIncludes, escapeHtml } from "../../lib/utils";

// ==========================================================
// 1.E OPTİK FORM VE OMR OKUYUCU SÜİTİ
// ==========================================================
export function EdesisOptikSuiteModal({ exam, onClose, API, students = [], classes = [], onResultsUpdated }) {
  const [activeTab, setActiveTab] = useState("read"); // "read" | "template" | "calibrate" | "webcam"

  // 1. OKUMA & PARSER STATE
  const [parsedRows, setParsedRows] = useState([]);
  const [, setRawText] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [savingResults, setSavingResults] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [answerKeys, setAnswerKeys] = useState(() => { try { return typeof exam?.answer_keys === "string" ? JSON.parse(exam.answer_keys) : (exam?.answer_keys || {}); } catch { return {}; } });
  const [keyDraft, setKeyDraft] = useState(answerKeys);
  const [keyBooklet, setKeyBooklet] = useState("A");
  const subjectNames = {turkish:"Türkçe",history:"İnkılap Tarihi",religion:"Din Kültürü",english:"İngilizce",math:"Matematik",science:"Fen",social:"Sosyal",literature:"Edebiyat",geography:"Coğrafya",physics:"Fizik",chemistry:"Kimya",biology:"Biyoloji"};
  const defaultSubjects = exam?.exam_type === "LGS" ? ["turkish","history","religion","english","math","science"] : exam?.exam_type === "AYT" ? ["literature","social","math","physics","chemistry","biology"] : ["turkish","social","math","science"];
  const keySubjects = Object.keys(answerKeys[keyBooklet] || {}).length ? Object.keys(answerKeys[keyBooklet]) : defaultSubjects;
  const saveAnswerKeys = async () => {
    try {
      const keys = Object.fromEntries(Object.entries(keyDraft).map(([book,subjects])=>[book,Object.fromEntries((Object.keys(answerKeys[book] || {}).length ? Object.keys(answerKeys[book]) : defaultSubjects).filter(subject=>subjects[subject]).map(subject=>[subject,subjects[subject]]))]).filter(([,subjects])=>Object.keys(subjects).length));
      await axios.patch(`${API}/exams/${exam.id}`,{answer_keys:keys});
      setAnswerKeys(keys); setParsedRows([]); setUploadMsg("Cevap anahtarı kaydedildi. TXT dosyasını tekrar yükleyiniz.");
      onResultsUpdated?.();
    } catch(error) { setUploadMsg(error.response?.data?.detail || error.message); }
  };

  // 2. ŞABLON YÖNETİCİSİ STATE
  const [selectedTemplate, setSelectedTemplate] = useState("opt-lgs-90");
  const [customFmtDownloaded, setCustomFmtDownloaded] = useState(false);

  const [printerProfiles,setPrinterProfiles]=useState([]);
  React.useEffect(()=>{axios.get(`${API}/optical/printer-profiles`).then(r=>setPrinterProfiles(r.data)).catch(e=>setCalibrationSuccess(e.response?.data?.detail || e.message));},[API]);
  const savePrinterProfile = async () => {
    try { await axios.post(`${API}/optical/printer-profiles`,{id:printerProfile,name:printerProfiles.find(p=>p.id===printerProfile)?.name || "Varsayılan Yazıcı",offset_x_mm:offsetX,offset_y_mm:offsetY});setCalibrationSuccess("Profil veritabanına kaydedildi. Fiziksel ölçümü kalibrasyon sayfasıyla doğrulayınız."); }
    catch(e) {setCalibrationSuccess(e.response?.data?.detail || e.message);}
  };

  // 3. KALİBRASYON STATE
  const [printerProfile, setPrinterProfile] = useState("p-def");
  const [offsetX, setOffsetX] = useState(0.0);
  const [offsetY, setOffsetY] = useState(0.0);
  const [selectedClassForPrint, setSelectedClassForPrint] = useState(classes[0]?.name || "11-A Sayısal");
  const [calibrationSuccess, setCalibrationSuccess] = useState("");

  // 4. WEBCAM STATE
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraScannedData, setCameraScannedData] = useState(null);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const isLGS = exam?.exam_type === "LGS";
  const divisor = isLGS ? 3 : 4;

  // Fixed-width Parser Algoritması
  const parseRawText = (text) => {
    setRawText(text);
    const lines = text.split("\n").map(l => l.replace(/\r/, "")).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setUploadMsg("Yüklenen dosyada okunabilir satır bulunamadı.");
      setParsedRows([]);
      return;
    }

    let keys;
    try { keys = answerKeys; } catch {}
    if (!keys || !Object.keys(keys).length) { setParsedRows([]); setUploadMsg("Önce sınava ait gerçek cevap anahtarını kaydediniz."); return; }

    const rows = lines.map((line, idx) => {
      // Fixed width sütun indeksleri (Sekonic standardı)
      const noRaw = line.substring(0, 6).trim();
      const nameRaw = line.substring(6, 26).trim() || `Öğrenci #${noRaw || idx + 1}`;
      const bookletRaw = (line.substring(26, 27).trim() || "A").toUpperCase();
      const answersRaw = line.substring(27).toUpperCase();

      const bookKeys = keys[bookletRaw] || {};
      const subjectResults = {};
      let offset = 0;
      for (const [subject,key] of Object.entries(bookKeys)) {
        const ans = answersRaw.slice(offset,offset+key.length);
        offset += key.length;
        let d=0,y=0,b=0;
        for(let i=0;i<key.length;i++) { const ch=ans[i] || ' '; if(ch===' ' || ch==='.') b++; else if(ch===key[i]) d++; else y++; }
        subjectResults[subject]={d,y,b,net:Math.round((d-y/divisor)*100)/100};
      }
      const empty = {d:0,y:0,b:0,net:0};
      const tRes=subjectResults.turkish || empty,mRes=subjectResults.math || empty,fRes=subjectResults.science || empty,sRes=subjectResults.social || empty;
      const totalNet=Math.round(Object.values(subjectResults).reduce((sum,r)=>sum+r.net,0)*100)/100;
      const score=null;
      const isValid=Object.keys(bookKeys).length>0 && answersRaw.length===offset && /^[A-E. ]*$/.test(answersRaw);

      // Sistemdeki öğrenciyle eşleşme
      const matches = students.filter(s => s.student_no && String(s.student_no).replace(/^0+/, '') === noRaw.replace(/^0+/, ''));
      const matchedStudent=matches.length===1 ? matches[0] : null;

      return {
        id: `parsed_${idx}`,
        student_id: matchedStudent ? matchedStudent.id : null,
        no: noRaw || (matchedStudent ? matchedStudent.student_no : `10${idx + 1}`),
        name: matchedStudent ? matchedStudent.student_name : nameRaw,
        student_class: matchedStudent ? matchedStudent.student_class : "",
        isMatched: !!matchedStudent,
        isValid, subjectResults,
        booklet: bookletRaw,
        tD: tRes.d, tY: tRes.y, tNet: tRes.net,
        mD: mRes.d, mY: mRes.y, mNet: mRes.net,
        fD: fRes.d, fY: fRes.y, fNet: fRes.net,
        sD: sRes.d, sY: sRes.y, sNet: sRes.net,
        totalNet,
        score
      };
    });

    setParsedRows(rows);
    setUploadMsg(`${rows.length} optik satırı başarıyla okundu ve netleri hesaplandı ✓`);
  };

  // Dosya yükleme tetikleyicisi
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      parseRawText(event.target?.result || "");
    };
    reader.readAsText(file);
  };

  // Sonuçları Sınava ve D1 Veritabanına Kaydetme
  const saveResultsToExam = async () => {
    if (parsedRows.length === 0) {
      alert("Lütfen önce bir optik dosya okutun.");
      return;
    }
    if (parsedRows.some(r => !r.isMatched || !r.isValid)) { alert("Eşleşmeyen öğrenci veya hatalı cevap uzunluğu var. Dosyayı düzeltmeden kayıt yapılamaz."); return; }
    setSavingResults(true);
    setSaveSuccessMsg("");

    const payload = parsedRows.map((r, idx) => ({
      student_id: r.student_id,
      student_no: r.no,
      student_name: r.name,
      student_class: r.student_class,
      booklet: r.booklet,
      exam_type: exam?.exam_type || "LGS",
      turkish_correct: r.tD,
      turkish_incorrect: r.tY,
      turkish_net: r.tNet,
      math_correct: r.mD,
      math_incorrect: r.mY,
      math_net: r.mNet,
      science_correct: r.fD,
      science_incorrect: r.fY,
      science_net: r.fNet,
      social_correct: r.sD,
      social_incorrect: r.sY,
      social_net: r.sNet,
      total_net: r.totalNet,
      score: r.score,
      overall_rank: idx + 1,
      class_rank: idx + 1,
      weak_topics: [],
      subject_results: r.subjectResults
    }));

    try {
      if (API) {
        await axios.post(`${API}/exams/${exam.id}/results`, payload);
      }
      setSaveSuccessMsg(`${payload.length} öğrencinin sınav sonucu ve sıralamaları başarıyla kaydedildi ✓`);
      if (onResultsUpdated) onResultsUpdated();
      setTimeout(() => {
        setSaveSuccessMsg("");
      }, 4000);
    } catch (err) {
      alert("Sonuçlar kaydedilirken hata oluştu: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingResults(false);
    }
  };

  // Alan Sırasını İndir (TXT)me
  const downloadFmtFile = () => {
    const subjects=answerKeys.A;
    if(!subjects) { setUploadMsg("Önce A kitapçığı cevap anahtarını kaydediniz."); return; }
    let start=28;
    const fmtContent=Object.entries(subjects).map(([subject,key])=>{const line=`${subject.toUpperCase()}_START=${start}\n${subject.toUpperCase()}_LEN=${key.length}`;start+=key.length;return line;}).join("\n");
    const blob = new Blob([fmtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTemplate}_alan_sirasi.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setCustomFmtDownloaded(true);
  };

  // 100mm Kalibrasyon Test Sayfası Yazdırma
  const printCalibrationSheet = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Optik Baskı Kalibrasyon Test Sayfası (100mm Referans)</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20mm; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; }
          .header h1 { font-size: 16pt; margin: 0; }
          .header p { font-size: 10pt; margin: 4px 0 0 0; color: #475569; }
          .crosshair { position: absolute; width: 20mm; height: 20mm; }
          .top-left { top: 10mm; left: 10mm; }
          .top-right { top: 10mm; right: 10mm; }
          .bottom-left { bottom: 10mm; left: 10mm; }
          .bottom-right { bottom: 10mm; right: 10mm; }
          .ruler-container { margin: 30px auto; width: 100mm; text-align: center; }
          .ruler-bar { width: 100mm; height: 12mm; border: 1px solid #000; border-top: 3px solid #000; position: relative; background: #fff; margin: 0 auto; }
          .ruler-ticks { position: absolute; inset: 0; display: flex; justify-content: space-between; font-size: 8pt; padding: 2px; }
          .info-box { border: 1px dashed #64748b; padding: 12px; background: #f8fafc; font-size: 9pt; line-height: 1.5; margin-top: 30px; }
        </style>
      </head>
      <body>
        <!-- Köşe Hizalama İşaretleri -->
        <svg class="crosshair top-left" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>
        <svg class="crosshair top-right" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>
        <svg class="crosshair bottom-left" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>
        <svg class="crosshair bottom-right" viewBox="0 0 40 40"><line x1="0" y1="20" x2="40" y2="20" stroke="#000" stroke-width="2"/><line x1="20" y1="0" x2="20" y2="40" stroke="#000" stroke-width="2"/></svg>

        <div class="header">
          <h1>ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h1>
          <p>Optik Okuyucu & Yazıcı Milimetrik Kalibrasyon Test Çıktısı (Referans Cetveli)</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <b>Profil:</b> ${printerProfile} &nbsp;|&nbsp; <b>Aktif Ofset:</b> X: ${offsetX} mm, Y: ${offsetY} mm &nbsp;|&nbsp; <b>Tarih:</b> ${new Date().toLocaleDateString("tr-TR")}
        </div>

        <!-- 100mm Yatay Cetvel -->
        <div class="ruler-container">
          <div style="font-weight: bold; margin-bottom: 6px;">YATAY 100 MM REFERANS CETVELİ</div>
          <div class="ruler-bar">
            <div class="ruler-ticks">
              <span>0mm</span><span>25mm</span><span>50mm</span><span>75mm</span><span>100mm</span>
            </div>
          </div>
          <small style="color: #64748b;">(Bu çizginin başlangıç ve bitişini fiziksel bir cetvelle ölçün. Tam 100 mm olmalıdır.)</small>
        </div>

        <div class="info-box">
          <b>KALİBRASYON NASIL YAPILIR?</b><br/>
          1. Çıktıyı yazdırdıktan sonra üstteki yatay çizgiyi cetvelle ölçün.<br/>
          2. Eğer ölçülen uzunluk 99mm çıkarsa, sistemdeki ölçek çarpanını güncelleyin.<br/>
          3. Optik kutucuklar matbu forma göre sağa kaymışsa <b>X Ofsetini negatif (-)</b>, sola kaymışsa <b>pozitif (+)</b> girin.<br/>
          4. Aşağı kaymışsa <b>Y Ofsetini negatif (-)</b>, yukarı kaymışsa <b>pozitif (+)</b> girin.
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 250);
  };

  // Öğrenciye Özel Kişiselleştirilmiş Bubble Form Basımı
  const printPersonalizedOpticalForms = () => {
    const classStudents = students.filter(s => !selectedClassForPrint || s.student_class === selectedClassForPrint || s.program === selectedClassForPrint);
    const targetList = classStudents.length > 0 ? classStudents : students.slice(0, 10);

    const win = window.open("", "_blank");
    const formsHtml = targetList.map((st, i) => `
      <div style="page-break-after: always; transform: translate(${offsetX}mm,${offsetY}mm); padding: 15mm; font-family: Arial, sans-serif; position: relative;">
        <!-- Zamanlama Çizgileri -->
        <div style="position: absolute; left: 5mm; top: 15mm; bottom: 15mm; width: 4mm; display: flex; flex-direction: column; justify-content: space-between;">
          ${Array.from({ length: 45 }).map(() => '<div style="width: 4mm; height: 1.5mm; background: #000;"></div>').join("")}
        </div>

        <div style="margin-left: 10mm;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px;">
            <div>
              <h2 style="margin: 0; font-size: 14pt;">ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ</h2>
              <p style="margin: 2px 0 0 0; font-size: 9pt;">${exam?.title || "KURUMSAL DENEME SINAVI"} · ${exam?.exam_type || "TYT"}</p>
            </div>
            <div style="text-align: right;">
              <span style="border: 2px solid #000; padding: 4px 8px; font-weight: bold; font-size: 11pt;">KİTAPÇIK: A</span>
            </div>
          </div>

          <!-- Öğrenci Bilgileri & Kodlanmış Bubble Matrisi -->
          <div style="display: flex; gap: 20px; margin: 15px 0; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;">
            <div style="flex: 1;">
              <table style="width: 100%; font-size: 9pt; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 90px;">Öğrenci Adı:</td><td>${escapeHtml(st.student_name)}</td></tr>
                <tr><td style="font-weight: bold;">Okul No:</td><td><b>#${st.student_no || "100" + (i + 1)}</b></td></tr>
                <tr><td style="font-weight: bold;">Sınıf / Şube:</td><td>${escapeHtml(st.student_class || selectedClassForPrint)}</td></tr>
                <tr><td style="font-weight: bold;">T.C. Kimlik:</td><td>${escapeHtml(st.student_tc || "")}</td></tr>
              </table>
            </div>
            <div style="width: 140px; border-left: 1px solid #cbd5e1; padding-left: 12px; font-size: 8pt;">
              <div style="font-weight: bold; margin-bottom: 4px;">ÖĞRENCİ NO KODLAMASI:</div>
              <div style="display: flex; gap: 4px;">
                ${String(st.student_no || "100" + (i + 1)).padStart(6, "0").split("").map(digit => `
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 7pt;">
                    <b>${digit}</b>
                    ${Array.from({ length: 10 }).map((_, d) => `
                      <span style="width: 8px; height: 8px; border: 1px solid #000; border-radius: 50%; display: inline-block; background: ${Number(digit) === d ? '#000' : 'transparent'};"></span>
                    `).join("")}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- 4 Branş Soru Optik Cevap Sütunları -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 15px;">
            ${Object.entries(answerKeys.A || {}).map(([subject,key]) => `
              <div style="border: 1px solid #94a3b8; border-radius: 4px; padding: 6px;">
                <div style="background: #e2e8f0; font-weight: bold; font-size: 8pt; text-align: center; padding: 3px; margin-bottom: 6px;">${subjectNames[subject] || subject}</div>
                ${Array.from({ length: key.length }).map((_, q) => `
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; font-size: 8pt;">
                    <span style="width: 16px; font-weight: bold;">${q + 1}</span>
                    <div style="display: flex; gap: 3px;">
                      ${["A", "B", "C", "D", "E"].slice(0, isLGS ? 4 : 5).map(opt => `
                        <span style="width: 11px; height: 11px; border: 1px solid #475569; border-radius: 50%; font-size: 6pt; display: flex; align-items: center; justify-content: center;">${opt}</span>
                      `).join("")}
                    </div>
                  </div>
                `).join("")}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Taslak Öğrenci Optik Formu (cihaz uyumluluğu doğrulanmalı) - ${escapeHtml(selectedClassForPrint)}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; background: #fff; }
        </style>
      </head>
      <body>
        ${formsHtml}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  // WebCam Başlatma
  const startWebcam = async () => {
    setIsCameraActive(true);
    setCameraError("");
    setCameraScannedData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError("Kameraya erişilemedi: " + (err.message || "İzin verilmedi veya cihaz bulunamadı."));
      setIsCameraActive(false);
    }
  };

  // WebCam Durdurma
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // WebCam ile Kareyi Yakala ve OMR Oku
  const captureAndScanFrame = () => {
    setCameraScannedData(null);
    setCameraError("Görüntüden optik okuma desteklenmiyor. Cihazınızın doğrulanmış TXT çıktısını dosya okuma sekmesinden aktarınız.");
  };

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "860px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Modal Başlığı */}
        <div className="modal-head" style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "8px" }}>
              <Layers size={20} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>Optik Okuyucu & Şablon Süiti</h2>
                <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "12px" }}>
                  Kurum Kodu: 627201
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Sınav: <b>{exam?.title}</b> ({exam?.exam_type || "TYT"}) · Sabit genişlikli TXT sonuç aktarımı
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* 4 Sekmeli Navigasyon Çubuğu */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", padding: "0 16px" }}>
          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "read" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "read" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "read" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("read")}
          >
            <Upload size={15} /> Optik Dosya Oku & Puanla
          </button>

          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "template" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "template" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "template" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("template")}
          >
            <Sliders size={15} /> Optik Şablon & FMT Yöneticisi
          </button>

          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "calibrate" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "calibrate" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "calibrate" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("calibrate")}
          >
            <Printer size={15} /> Milimetrik Kalibrasyon & Baskı
          </button>

          <button
            className="tab-btn"
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "webcam" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "webcam" ? "#2563eb" : "#64748b",
              fontWeight: activeTab === "webcam" ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
            onClick={() => setActiveTab("webcam")}
          >
            <Camera size={15} /> WebCam / Kamera ile Tarama
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

          {/* SEKME 1: OPTİK DOSYA OKU & PUANLA */}
          {activeTab === "read" && (
            <div>
              <fieldset style={{marginBottom:16,padding:12}}>
                <legend>Cevap anahtarı · dosyadaki ders sırasına göre</legend>
                <label>Kitapçık <select value={keyBooklet} onChange={e=>setKeyBooklet(e.target.value)}>{["A","B","C","D"].map(b=><option key={b}>{b}</option>)}</select></label>
                {keySubjects.map(subject=><label key={subject} style={{display:"block",marginTop:8}}>{subjectNames[subject] || subject}
                  <input aria-label={`${keyBooklet} ${subjectNames[subject] || subject} cevapları`} value={keyDraft[keyBooklet]?.[subject] || ""} onChange={e=>setKeyDraft(prev=>({...prev,[keyBooklet]:{...prev[keyBooklet],[subject]:e.target.value.toUpperCase().replace(/\s/g,"")}}))} placeholder="ABCD…" style={{width:"100%"}} />
                </label>)}
                <button className="btn small" onClick={saveAnswerKeys}>Cevap Anahtarını Kaydet</button>
                <p>Boş cevaplar TXT içinde boşluk veya nokta ile korunmalıdır. Netler hesaplanır; resmî puan yayınevinin puanlama modelini gerektirir.</p>
              </fieldset>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
                <label className="btn small" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "#2563eb", color: "#fff" }}>
                  <Upload size={14} /> TXT / DAT Dosyası Seç
                  <input type="file" accept=".txt,.dat" style={{ display: "none" }} onChange={handleFileChange} />
                </label>
                {parsedRows.length > 0 && (
                  <button
                    className="btn small"
                    style={{ background: "#16a34a", color: "#fff", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    onClick={saveResultsToExam}
                    disabled={savingResults}
                  >
                    <CheckCircle2 size={14} /> {savingResults ? "Kaydediliyor..." : "Sonuçları Sınava Aktar & Kaydet"}
                  </button>
                )}
              </div>

              {uploadMsg && (
                <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#15803d", fontSize: "12px", marginBottom: "14px" }}>
                  {uploadMsg}
                </div>
              )}

              {saveSuccessMsg && (
                <div style={{ padding: "10px 12px", background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "6px", color: "#047857", fontSize: "12px", fontWeight: "600", marginBottom: "14px" }}>
                  {saveSuccessMsg}
                </div>
              )}

              {parsedRows.length > 0 ? (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    <table className="data-table" style={{ width: "100%", fontSize: "12px", margin: 0 }}>
                      <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                        <tr>
                          <th>No</th>
                          <th>Öğrenci Adı</th>
                          <th>Kitapçık</th>
                          <th>Türkçe Net</th>
                          <th>Matematik Net</th>
                          <th>Fen Net</th>
                          <th>Sosyal Net</th>
                          <th>Toplam Net</th>
                          <th>Puan</th>
                          <th>Eşleşme</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r, idx) => (
                          <tr key={idx}>
                            <td><b>#{r.no}</b></td>
                            <td>{r.name}</td>
                            <td><span className="badge" style={{ background: "#f1f5f9" }}>{r.booklet}</span></td>
                            <td>{r.tNet}</td>
                            <td>{r.mNet}</td>
                            <td>{r.fNet}</td>
                            <td>{r.sNet}</td>
                            <td><b style={{ color: "#2563eb" }}>{r.totalNet}</b></td>
                            <td><b style={{ color: "#16a34a" }}>{r.score ?? "—"}</b></td>
                            <td>
                              <span style={{ fontSize: "11px", color: r.isMatched ? "#15803d" : "#b45309" }}>
                                {r.isMatched ? "✓ Kayıtlı" : "Misafir"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "36px", textAlign: "center", background: "#f8fafc" }}>
                  <FileText size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <h4 style={{ margin: 0, color: "#334155" }}>Henüz Optik Dosya Yüklenmedi</h4>
                  <p style={{ margin: "6px 0 14px 0", fontSize: "12px", color: "#64748b" }}>
                    Sekonic veya OMR optik okuyucunuzun ürettiği <b>.TXT</b>, <b>.DAT</b> dosyasını yükleyin. Numara 6, ad 20, kitapçık 1 karakter; ardından cevaplar gelmelidir.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SEKME 2: OPTİK ŞABLON & FMT YÖNETİCİSİ */}
          {activeTab === "template" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Form Şablonu:</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="opt-lgs-90">LGS 90 Soru Tek Oturum Formu (A4 - 4 Sütun)</option>
                    <option value="opt-tyt-120">TYT 120 Soru Standart ÖSYM Formu (A4 - 4 Sütun)</option>
                    <option value="opt-ayt-160">AYT 160 Soru 4 Branş Formu (A4 - 4 Sütun)</option>
                    <option value="opt-kds-60">KDS / HBS 60 Soru Ara Sınıf Formu (A5 - 3 Sütun)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Kurum & Optik Kodu:</label>
                  <input
                    type="text"
                    readOnly
                    value="627201 (İnegöl Çözüm Özel Kurs)"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#1e293b" }}>Fixed-Width Kolon Koordinat Haritası (Sekonic Standart)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", fontSize: "11px" }}>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Öğrenci No:</span>
                    <b>Sütun 1 - 6 (Uzunluk 6)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Adı Soyadı:</span>
                    <b>Sütun 7 - 26 (Uzunluk 20)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Kitapçık (A/B):</span>
                    <b>Sütun 27 (Uzunluk 1)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Türkçe Cevap:</span>
                    <b>Sütun 28 - 47 (20 Soru)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Matematik Cevap:</span>
                    <b>Sütun 48 - 67 (20 Soru)</b>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Fen Bilimleri:</span>
                    <b>Sütun 68 - 87 (20 Soru)</b>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button className="btn small" onClick={downloadFmtFile} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Download size={14} /> Ders Alan Sırasını İndir (TXT)
                </button>
                {customFmtDownloaded && (
                  <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
                    ✓ Ders başlangıçları ve uzunlukları indirildi. Cihazın kendi FMT dosyası ayrıca üretici yazılımıyla hazırlanmalıdır.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SEKME 3: MİLİMETRİK KALİBRASYON & BASKI */}
          {activeTab === "calibrate" && (
            <div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                <strong style={{ color: "#1d4ed8", fontSize: "13px" }}>Yazıcı Milimetrik Sapma Kalibrasyonu</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#1e40af" }}>
                  Hazır baskılı matbu optik kağıtlarda kodlama kutularının tam hizaya oturması için ±15 mm hassas ofset ayarı yapabilirsiniz.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Aktif Yazıcı Profili:</label>
                  <select
                    value={printerProfile}
                    onChange={(e) => {
                      setPrinterProfile(e.target.value);
                      if (e.target.value === "p-epson") { setOffsetX(1.2); setOffsetY(-0.8); }
                      else if (e.target.value === "p-hp") { setOffsetX(-0.5); setOffsetY(1.0); }
                      else { setOffsetX(0.0); setOffsetY(0.0); }
                    }}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="p-def">Varsayılan Yazıcı</option>
                    {printerProfiles.filter(p=>p.id!=="p-def").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Baskı Alınacak Sınıf:</label>
                  <select
                    value={selectedClassForPrint}
                    onChange={(e) => setSelectedClassForPrint(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name} ({c.level})</option>)}
                    {classes.length === 0 && <option value="11-A Sayısal">11-A Sayısal</option>}
                  </select>
                </div>
              </div>

              {/* Stepper ve Slider Ofset Ayarları */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600" }}>Yatay Ofset (X mm):</span>
                    <b style={{ color: "#2563eb" }}>{offsetX > 0 ? `+${offsetX}` : offsetX} mm</b>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="0.1"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>Negatif: Sola kaydırır · Pozitif: Sağa kaydırır</small>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600" }}>Dikey Ofset (Y mm):</span>
                    <b style={{ color: "#2563eb" }}>{offsetY > 0 ? `+${offsetY}` : offsetY} mm</b>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="0.1"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>Negatif: Yukarı kaydırır · Pozitif: Aşağı kaydırır</small>
                </div>
              </div>

              {calibrationSuccess && (
                <div style={{ padding: "8px 12px", background: "#ecfdf5", color: "#047857", fontSize: "12px", borderRadius: "6px", marginBottom: "14px" }}>
                  {calibrationSuccess}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button className="btn small secondary" onClick={printCalibrationSheet} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Printer size={14} /> 100mm Kalibrasyon Test Sayfası Yazdır
                </button>
                <button className="btn small" onClick={printPersonalizedOpticalForms} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#7c3aed", color: "#fff" }}>
                  <FileText size={14} /> Öğrenciye Özel Optik Form Basımı ({selectedClassForPrint})
                </button>
                <button
                  className="btn small secondary"
                  onClick={savePrinterProfile}
                >
                  Ayarları Profile Kaydet
                </button>
              </div>
            </div>
          )}

          {/* SEKME 4: WEBCAM İLE CANLI OMR TARAMA */}
          {activeTab === "webcam" && (
            <div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
                {!isCameraActive ? (
                  <button className="btn small" onClick={startWebcam} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#2563eb", color: "#fff" }}>
                    <Camera size={14} /> Kamerayı Başlat (OMR Canlı Tarama)
                  </button>
                ) : (
                  <>
                    <button className="btn small secondary" onClick={stopWebcam}>
                      Kamerayı Kapat
                    </button>
                    <button className="btn small" onClick={captureAndScanFrame} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#16a34a", color: "#fff" }}>
                      <CheckCircle2 size={14} /> Kareyi Yakala & Oku
                    </button>
                  </>
                )}
              </div>

              {cameraError && (
                <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "12px", marginBottom: "14px" }}>
                  {cameraError}
                </div>
              )}

              {isCameraActive && (
                <div style={{ position: "relative", width: "100%", maxWidth: "560px", margin: "0 auto", borderRadius: "8px", overflow: "hidden", border: "2px solid #3b82f6", background: "#000" }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: "100%", display: "block" }} />
                  {/* OMR Hizalama Çerçevesi */}
                  <div style={{ position: "absolute", inset: "25px", border: "2px dashed #22c55e", borderRadius: "6px", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ background: "#22c55ecc", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                      Optik Formu Bu Çerçeveye Hizalayın
                    </span>
                  </div>
                </div>
              )}

              {cameraScannedData && (
                <div style={{ marginTop: "16px", padding: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0, color: "#166534", fontSize: "14px" }}>✓ Form Başarıyla Tarandı ({cameraScannedData.timestamp})</h4>
                    <span className="badge" style={{ background: "#dcfce7", color: "#15803d" }}>Güven Skoru: %98.4</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", fontSize: "12px" }}>
                    <div><span style={{ color: "#64748b" }}>Öğrenci:</span> <b>{cameraScannedData.name}</b></div>
                    <div><span style={{ color: "#64748b" }}>Numara:</span> <b>#{cameraScannedData.no}</b></div>
                    <div><span style={{ color: "#64748b" }}>Kitapçık:</span> <b>{cameraScannedData.booklet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Türkçe Net:</span> <b>{cameraScannedData.turkishNet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Matematik Net:</span> <b>{cameraScannedData.mathNet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Toplam Net:</span> <b style={{ color: "#16a34a" }}>{cameraScannedData.totalNet}</b></div>
                    <div><span style={{ color: "#64748b" }}>Puan:</span> <b style={{ color: "#2563eb" }}>{cameraScannedData.score}</b></div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Alt Çubuğu */}
        <div className="modal-foot" style={{ borderTop: "1px solid #e2e8f0", padding: "12px 20px" }}>
          <button className="btn secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

// Geriye dönük uyumluluk için alias
export const EdesisOptikModal = EdesisOptikSuiteModal;
