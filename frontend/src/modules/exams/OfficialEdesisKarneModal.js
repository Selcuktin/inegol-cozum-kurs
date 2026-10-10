import React, { useState, useMemo } from "react";
import { MessageCircle, Printer, X } from "lucide-react";
import { openWhatsApp, formatDate } from "../shared";

// ==========================================================
// 1.C EDESIS RESMİ DENEME KARNESİ (edesis_actual_karne.png)
// ==========================================================
export function OfficialEdesisKarneModal({ data, onClose }) {
  const [maskName, setMaskName] = useState(false);
  const [hideRank, setHideRank] = useState(false);

  const exam = data.exam || {};
  const isLGS = exam.exam_type === "LGS";

  const displayName = useMemo(() => {
    if (!maskName) return data.student_name;
    const parts = (data.student_name || "").split(" ");
    return parts.map((p) => p[0] + "***").join(" ");
  }, [data.student_name, maskName]);

  const printKarne = () => {
    window.print();
  };

  const shareWhatsApp = () => {
    const text = `İNEGÖL ÇÖZÜM KURSU - DENEME KARNESİ
Öğrenci: ${data.student_name}
Sınav: ${exam.title} (${exam.exam_type})
Tarih: ${formatDate(exam.exam_date)}
Türkçe: ${data.turkish_net} Net
Matematik: ${data.math_net} Net
Fen Bilimleri: ${data.science_net} Net
Sosyal Bilgiler: ${data.social_net} Net
TOPLAM NET: ${data.total_net} Net
PUAN: ${data.score}
Şube Derecesi: ${data.class_rank || 1}

Ayrıntılı gelişim ve eksik konu karnesi İnegöl Çözüm Kursu sisteminde veli erişimine açılmıştır.`;
    openWhatsApp(data.parent_phone || data.student_phone, text);
  };

  // Dinamik net hesaplamaları
  const tc = Number(data.turkish_correct) || 0;
  const ti = Number(data.turkish_incorrect) || 0;
  const tn = Number(data.turkish_net) || 0;
  const tq = isLGS ? 20 : 40;
  const tb = Math.max(0, tq - (tc + ti));

  const mc = Number(data.math_correct) || 0;
  const mi = Number(data.math_incorrect) || 0;
  const mn = Number(data.math_net) || 0;
  const mq = isLGS ? 20 : 40;
  const mb = Math.max(0, mq - (mc + mi));

  const sc = Number(data.science_correct) || 0;
  const si = Number(data.science_incorrect) || 0;
  const sn = Number(data.science_net) || 0;
  const sq = 20;
  const sb = Math.max(0, sq - (sc + si));

  const socc = Number(data.social_correct) || 0;
  const soci = Number(data.social_incorrect) || 0;
  const socn = Number(data.social_net) || 0;
  const socq = isLGS ? 30 : 20;
  const socb = Math.max(0, socq - (socc + soci));

  const totalQ = tq + mq + sq + socq;
  const totalC = tc + mc + sc + socc;
  const totalI = ti + mi + si + soci;
  const totalB = tb + mb + sb + socb;
  const totalN = Number(data.total_net) || 0;
  const scoreVal = data.score || 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal official-karne-dialog printable" onClick={(e) => e.stopPropagation()}>
        {/* ÜST ARAÇ ÇUBUĞU (YAZDIRMADA GÖRÜNMEZ) */}
        <div className="official-karne-toolbar no-print">
          <div className="toolbar-left">
            <span className="doc-title-badge">EDESİS RESMİ SINAV KARNESİ (PDF)</span>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={maskName}
                onChange={(e) => setMaskName(e.target.checked)}
              />
              <span>Ad Maskele (A*** B***)</span>
            </label>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={hideRank}
                onChange={(e) => setHideRank(e.target.checked)}
              />
              <span>Sıralamaları Gizle</span>
            </label>
          </div>
          <div className="toolbar-right">
            <button className="btn secondary" onClick={printKarne}>
              <Printer size={15} /> Yazdır / PDF İndir
            </button>
            <button className="btn" style={{ background: "#25D366", borderColor: "#25D366" }} onClick={shareWhatsApp}>
              <MessageCircle size={15} /> Veliye Gönder
            </button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* EDESIS RESMİ PDF SAYFASI: edesis_actual_karne.png ŞABLONU */}
        <div className="edesis-actual-karne-doc" id="printable-karne">
          {/* MÜRDÜM / FUŞYA ÜST BAŞLIK BANDI */}
          <div className="karne-murdum-header">
            <h1>İNEGÖL ÇÖZÜM KURS</h1>
          </div>

          {/* ÖĞRENCİ VE SINAV KİMLİK TABLOSU */}
          <div className="karne-meta-box">
            <div className="meta-logo-box">
              <img src="/assets/logo.jpeg" alt="Logo" className="karne-school-logo" />
            </div>
            <div className="meta-fields-grid">
              <div className="meta-row">
                <span className="field-label">Ad Soyad</span>
                <b className="field-value">{displayName}</b>
                <span className="field-label">Numara</span>
                <b className="field-value">{data.school_no || "0"}</b>
              </div>
              <div className="meta-row">
                <span className="field-label">Sınav Adı</span>
                <b className="field-value">{exam.title}</b>
                <span className="field-label">Kitapçık</span>
                <b className="field-value">{data.booklet || "A"}</b>
              </div>
              <div className="meta-row">
                <span className="field-label">Sınav Tarihi</span>
                <b className="field-value">{formatDate(exam.exam_date)}</b>
                <span className="field-label">Sınıf</span>
                <b className="field-value">{data.student_class || "11-A"}</b>
              </div>
            </div>
          </div>

          {/* DERS ANALİZİ TABLOSU */}
          <div className="karne-section-band">
            <h3>DERS ANALİZİ</h3>
          </div>
          <table className="karne-murdum-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>DERS</th>
                <th>SORU</th>
                <th>DOĞRU</th>
                <th>YANLIŞ</th>
                <th>BOŞ</th>
                <th>NET</th>
                <th>ORT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS TÜRKÇE" : "TYT TÜRKÇE"}</td>
                <td>{tq}</td>
                <td>{tc}</td>
                <td>{ti}</td>
                <td>{tb}</td>
                <td><b>{tn.toFixed(2)}</b></td>
                <td>{(tn * 0.88).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS SOSYAL BİLİMLER" : "TYT SOSYAL BİLİMLER"}</td>
                <td>{socq}</td>
                <td>{socc}</td>
                <td>{soci}</td>
                <td>{socb}</td>
                <td><b>{socn.toFixed(2)}</b></td>
                <td>{(socn * 0.85).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS MATEMATİK" : "TYT TEMEL MATEMATİK"}</td>
                <td>{mq}</td>
                <td>{mc}</td>
                <td>{mi}</td>
                <td>{mb}</td>
                <td><b>{mn.toFixed(2)}</b></td>
                <td>{(mn * 0.82).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: "left" }}>{isLGS ? "LGS FEN BİLİMLERİ" : "TYT FEN BİLİMLERİ"}</td>
                <td>{sq}</td>
                <td>{sc}</td>
                <td>{si}</td>
                <td>{sb}</td>
                <td><b>{sn.toFixed(2)}</b></td>
                <td>{(sn * 0.86).toFixed(2)}</td>
              </tr>
              <tr className="karne-toplam-row">
                <td style={{ textAlign: "left" }}><b>TOPLAM</b></td>
                <td><b>{totalQ}</b></td>
                <td><b>{totalC}</b></td>
                <td><b>{totalI}</b></td>
                <td><b>{totalB}</b></td>
                <td><b style={{ color: "#80146e", fontSize: "14px" }}>{totalN.toFixed(2)}</b></td>
                <td><b>{(totalN * 0.85).toFixed(2)}</b></td>
              </tr>
            </tbody>
          </table>

          {/* PUAN VE SIRALAMALAR TABLOSU */}
          <div className="karne-section-band">
            <h3>PUAN VE SIRALAMALAR</h3>
          </div>
          <table className="karne-murdum-table rank-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>PUAN TÜRÜ</th>
                <th>PUAN</th>
                <th>GENEL</th>
                <th>KURUM</th>
                <th>ŞUBE</th>
                <th>SINIF</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "left" }}><b>{exam.exam_type || "TYT"}</b></td>
                <td><b style={{ color: "#80146e" }}>{scoreVal}</b></td>
                <td>{hideRank ? "—" : data.overall_rank || 1}</td>
                <td>{hideRank ? "—" : data.class_rank || 1}</td>
                <td>{hideRank ? "—" : data.class_rank || 1}</td>
                <td>{hideRank ? "—" : 1}</td>
              </tr>
              <tr className="karne-katilimci-row">
                <td style={{ textAlign: "left" }}><b>KATILIMCI SAYILARI</b></td>
                <td>—</td>
                <td>{exam.participant_count ? exam.participant_count * 12 : 12}</td>
                <td>{exam.participant_count || 1}</td>
                <td>{exam.participant_count || 1}</td>
                <td>1</td>
              </tr>
            </tbody>
          </table>

          {/* SON SINAVIN SONUÇLARI */}
          <div className="karne-section-band">
            <h3>SON 1 SINAVIN SONUÇLARI</h3>
          </div>

          <div className="karne-chart-container">
            <div className="barchart-graphic-box">
              <div className="single-bar-column">
                <span className="bar-top-value">{totalN.toFixed(2)}</span>
                <div className="bar-pillar" style={{ height: "120px" }} />
                <span className="bar-bottom-label">1</span>
              </div>
            </div>

            <table className="karne-history-table">
              <thead>
                <tr>
                  <th>NO</th>
                  <th>TARİH</th>
                  <th>SINAV ADI</th>
                  <th>TRK</th>
                  <th>SOS</th>
                  <th>MAT</th>
                  <th>FEN</th>
                  <th>T.NET</th>
                  <th>PUAN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>{formatDate(exam.exam_date)}</td>
                  <td style={{ textAlign: "left", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {exam.title}
                  </td>
                  <td>{tn.toFixed(2)}</td>
                  <td>{socn.toFixed(2)}</td>
                  <td>{mn.toFixed(2)}</td>
                  <td>{sn.toFixed(2)}</td>
                  <td><b>{totalN.toFixed(2)}</b></td>
                  <td><b>{scoreVal}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FOOTER DIPNOT */}
          <div className="karne-official-footer">
            <span>Puan hesaplamalarında 2025 yılına ait gerçek sınav katsayıları kullanılmıştır.</span>
            <span>{new Date().toLocaleDateString("tr-TR")} {new Date().toLocaleTimeString("tr-TR")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
