import React, { useState } from "react";
import {
  X,
  Play,
  FileText,
  Receipt,
  Award,
  AlertTriangle,
  UserPlus,
  Mail,
  Calendar,
  Users,
  DollarSign,
  TrendingDown,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
  Eye
} from "lucide-react";

import { GelirDetayModal } from "./GelirDetayModal";
import { trIncludes } from "../lib/utils";
import { ReceiptModal } from "./ReceiptModal";
import { PromissoryNoteModal } from "./PromissoryNoteModal";
import { AbsenceLetterModal } from "./AbsenceLetterModal";
import { HataKarnesiModal } from "./HataKarnesiModal";
import { ClassDetailModal } from "./ClassDetailModal";
import { EdesisStudentModal } from "./EdesisStudentModal";
import { OfficialEdesisKarneModal, EdesisOptikModal } from "../EdesisModules";

export function EdesisTestBenchModal({
  isOpen,
  onClose,
  data = {},
  API,
  onOpenGlobalModal,
  onNavigate
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTestModal, setActiveTestModal] = useState(null);

  if (!isOpen) return null;

  // Gerçek veya varsayılan örnek öğrenci
  const sampleStudent = (data.students && data.students[0]) || {
    id: "stu-sample-1",
    student_name: "ASELSARE BİLGİN",
    student_tc: "336045162072",
    student_phone: "0545 801 85 43",
    student_class: "4-A",
    school: "İnegöl İlkokulu",
    parent_name: "BİLGİN Velisi",
    parent_phone: "0545 801 85 43",
    total_fee: 55000,
    paid_amount: 5500,
    remaining: 49500,
    installment_count: 10,
    due_date: "2026-10-01",
    program: "2026-2027",
    status: "Aktif"
  };

  const sampleClass = (data.classes && data.classes.find(c => c.name === "7-A")) || (data.classes && data.classes[0]) || {
    id: "cls-7-a",
    name: "7-A",
    level: "7. Sınıf",
    room: "Derslik 3",
    capacity: 20,
    teacher: "Ahmet Yılmaz"
  };

  const sampleExam = (data.exams && data.exams[0]) || {
    id: "exam-001",
    title: "Özdebir Türkiye Geneli LGS Deneme Sınavı - 1",
    exam_type: "LGS",
    publisher: "Özdebir Yayınları",
    exam_date: "2026-10-01",
    booklet_types: "A,B",
    status: "completed"
  };

  const samplePayment = (data.payments && data.payments[0]) || {
    id: "pay-sample-1",
    student_id: sampleStudent.id,
    student_name: sampleStudent.student_name,
    amount: 5500,
    method: "Nakit",
    bank: "Nakit Ana Kasa",
    payment_date: "2026-10-01",
    note: "1. Taksit Tahsilatı"
  };

  const sampleKarne = {
    student_name: sampleStudent.student_name,
    student_no: "1042",
    student_class: "7-A",
    exam: sampleExam,
    booklet: "A",
    turkish_net: 18.0,
    math_net: 16.5,
    science_net: 17.0,
    social_net: 9.0,
    total_net: 60.5,
    score: 442.85,
    overall_rank: 4,
    class_rank: 1,
    weak_topics: ["Üslü Sayılar", "Kalıtım", "Cümlede Anlam"]
  };

  // Test envanterindeki 12 Edesis pop-up ve modalları
  const testComponents = [
    {
      id: "gelir_detay",
      category: "accounting",
      title: "📄 Edesis Gelir Detay (GLR) Modalı",
      tag: "Muhasebe V2",
      badgeColor: "#2563eb",
      desc: "10 Taksit Planı, KDV/Tevkifat kalemleri, Müşteri kartı, WhatsApp borç hatırlatma ve tek tıkla ödeme linki üretici.",
      contextInfo: `Öğrenci: ${sampleStudent.student_name} · GLR202600150 · ₺55.000,00`,
      actionLabel: "Gelir Detayını Başlat",
      action: () => setActiveTestModal("gelir_detay")
    },
    {
      id: "tahsilat_makbuzu",
      category: "accounting",
      title: "🧾 Resmi Tahsilat Makbuzu",
      tag: "Resmi Evrak",
      badgeColor: "#16a34a",
      desc: "Kurum antetli, seri/sıra no'lu, kaşe, imza ve finansal bakiye dökümlü MEB resmi A5/A4 tahsilat makbuzu.",
      contextInfo: `Makbuz No: MAK-2026-001 · Tutar: ₺${samplePayment.amount.toLocaleString("tr-TR")}`,
      actionLabel: "Makbuzu Görüntüle",
      action: () => setActiveTestModal("tahsilat_makbuzu")
    },
    {
      id: "matbu_senet",
      category: "accounting",
      title: "📜 Resmi Matbu Senet (Bono) Süiti",
      tag: "Hukuki / Finans",
      badgeColor: "#7c3aed",
      desc: "Vade, tutar, Türkçe yazı ile kuruş dahil para çevirisi, borçlu/kefil bilgileri ve resmi kambiyo taahhüt metni.",
      contextInfo: `Borçlu: ${sampleStudent.student_name} · 10 Adet Sıralı Bono`,
      actionLabel: "Senet Süitini Başlat",
      action: () => setActiveTestModal("matbu_senet")
    },
    {
      id: "hizli_tahsilat",
      category: "accounting",
      title: "💵 Hızlı Tahsilat Al (Makbuzlu)",
      tag: "Kasa Girişi",
      badgeColor: "#059669",
      desc: "Öğrenci arama, taksit seçimi, nakit/kart/havale kasa defteri aktarımı ve anlık makbuz tetikleme modalı.",
      contextInfo: "Kasa & Banka Entegrasyonu Aktif",
      actionLabel: "Tahsilat Formu Aç",
      action: () => {
        onClose();
        if (onOpenGlobalModal) onOpenGlobalModal("payment");
      }
    },
    {
      id: "gider_ekle",
      category: "accounting",
      title: "💸 Kurum Gideri Ekleme",
      tag: "Kasa Çıkışı",
      badgeColor: "#dc2626",
      desc: "Kira, maaş, kırtasiye, reklam gibi giderlerin ilgili kasa/banka hesabından anlık düşülmesi formu.",
      contextInfo: "Nakit Kasa & Banka Seçimi",
      actionLabel: "Gider Formu Aç",
      action: () => {
        onClose();
        if (onOpenGlobalModal) onOpenGlobalModal("expense");
      }
    },
    {
      id: "optik_okuyucu",
      category: "exams",
      title: "🎯 Optik Okuyucu & Şablon Süiti (OMR)",
      tag: "Ölçme & Değerlendirme",
      badgeColor: "#ea580c",
      desc: "Sekonic TXT dosyası yükleme, otomatik net hesaplama, milimetrik X/Y mm yazıcı kalibrasyonu ve web kamerasıyla tarama.",
      contextInfo: `Sınav: ${sampleExam.title}`,
      actionLabel: "Optik Süiti Başlat",
      action: () => setActiveTestModal("optik_okuyucu")
    },
    {
      id: "ogrenci_karnesi",
      category: "exams",
      title: "📊 Resmi Edesis Öğrenci Karnesi",
      tag: "Ölçme & Karne",
      badgeColor: "#0284c7",
      desc: "Branş net analizi, başarı yüzdelikleri, kurum içi ve genel sıralama rozetleri ile renkli resmi karne çıktısı.",
      contextInfo: `Öğrenci: ${sampleKarne.student_name} · Puan: ${sampleKarne.score}`,
      actionLabel: "Karneyi Görüntüle",
      action: () => setActiveTestModal("ogrenci_karnesi")
    },
    {
      id: "hata_karnesi",
      category: "exams",
      title: "⚠️ Kazanım Analizli Hata Karnesi",
      tag: "Koçluk & Rehberlik",
      badgeColor: "#d97706",
      desc: "Öğrencinin en çok hata yaptığı 5 kritik konunun radar analizi, haftalık soru hedef çubuğu ve gelişim planı.",
      contextInfo: `Kazanım Hedefi: ${sampleKarne.weak_topics.join(", ")}`,
      actionLabel: "Hata Karnesini Aç",
      action: () => setActiveTestModal("hata_karnesi")
    },
    {
      id: "ogrenci_kayit_sihirbazi",
      category: "students",
      title: "👤 Edesis 4 Sekmeli Öğrenci Kayıt Sihirbazı",
      tag: "Öğrenci İşleri",
      badgeColor: "#2563eb",
      desc: "Genel Bilgiler, Veli & Aile İletişim, Eğitim & Sınıf ve Taksitli Muhasebe Ödeme Planı adımlarıyla eksiksiz kayıt sihirbazı.",
      contextInfo: "4 Sekmeli Edesis Form Yapısı",
      actionLabel: "Kayıt Sihirbazını Aç",
      action: () => {
        onClose();
        if (onOpenGlobalModal) onOpenGlobalModal("student");
      }
    },
    {
      id: "sinif_detay_kadro",
      category: "students",
      title: "🏫 Sınıf Detay & Öğrenci Kadrosu Portali",
      tag: "Sınıf & Şube",
      badgeColor: "#4f46e5",
      desc: "Sınıftaki tüm öğrencilerin fotoğraflı listesi, veli WhatsApp butonları ve MEB antetli A4 Resmi Yoklama Çizelgesi çıktısı.",
      contextInfo: `Sınıf: ${sampleClass.name} · Kapasite: ${sampleClass.capacity}`,
      actionLabel: "Sınıf Kadrosunu Aç",
      action: () => setActiveTestModal("sinif_detay_kadro")
    },
    {
      id: "devamsizlik_mektubu",
      category: "academic",
      title: "✉️ MEB Devamsızlık Uyarı Mektubu (5/10 Gün)",
      tag: "Resmi Tebligat",
      badgeColor: "#dc2626",
      desc: "5 ve 10 gün devamsızlık yapan öğrencilerin velilerine gönderilen resmi MEB antetli, kanun maddeli yasal ihtar mektubu.",
      contextInfo: `Öğrenci: ${sampleStudent.student_name} · Nevin Çakmak İmzalı`,
      actionLabel: "Resmi Mektubu Aç",
      action: () => setActiveTestModal("devamsizlik_mektubu")
    }
  ];

  const filteredComponents = testComponents.filter((c) => {
    const matchesCat = activeCategory === "all" || c.category === activeCategory;
    const matchesSearch =
      searchFilter === "" ||
      trIncludes(c.title, searchFilter) ||
      trIncludes(c.desc, searchFilter) ||
      trIncludes(c.tag, searchFilter);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10050 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95vw",
          maxWidth: "1150px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.4)"
        }}
      >
        {/* Üst Bar */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(37,99,235,0.35)"
              }}
            >
              <Sparkles size={24} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#fff" }}>
                  Edesis ERP Bileşen, Menü & Popup Test Laboratuvarı
                </h2>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontWeight: "700",
                    border: "1px solid rgba(52, 211, 153, 0.3)"
                  }}
                >
                  🟢 CANLI D1 BAĞLI
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                Sistemdeki tüm Edesis modallarını, resmi baskı şablonlarını ve alt sayfalarını tek tıkla test edin.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "grid",
                placeItems: "center",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
              title="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filtre ve Arama Çubuğu */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          {/* Kategori Filtre Butonları */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: `Tümü (${testComponents.length})` },
              { id: "accounting", label: "Muhasebe & Finans (5)" },
              { id: "exams", label: "Ölçme & Optik (3)" },
              { id: "students", label: "Öğrenci & Kayıt (2)" },
              { id: "academic", label: "Eğitim & MEB (2)" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: activeCategory === cat.id ? "700" : "500",
                  background: activeCategory === cat.id ? "#2563eb" : "#fff",
                  color: activeCategory === cat.id ? "#fff" : "#475569",
                  border: `1px solid ${activeCategory === cat.id ? "#2563eb" : "#cbd5e1"}`,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Arama Kutusu */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px 12px",
              width: "280px"
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Popup veya işlem ara (optik, senet, glr)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12px",
                width: "100%",
                background: "transparent",
                color: "#1e293b"
              }}
            />
          </div>
        </div>

        {/* Bileşen Kartları Grid */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            background: "#f1f5f9"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px"
            }}
          >
            {filteredComponents.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                  transition: "all 0.2s"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: `${item.badgeColor}15`,
                        color: item.badgeColor
                      }}
                    >
                      {item.tag}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={12} color="#10b981" /> Hazır
                    </span>
                  </div>

                  <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                    {item.title}
                  </h3>

                  <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                    {item.desc}
                  </p>

                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      color: "#475569",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Layers size={13} color="#64748b" />
                    <span><b>Veri:</b> {item.contextInfo}</span>
                  </div>
                </div>

                <button
                  onClick={item.action}
                  style={{
                    width: "100%",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: item.badgeColor,
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    boxShadow: `0 2px 8px ${item.badgeColor}33`,
                    transition: "all 0.15s"
                  }}
                >
                  <Play size={13} fill="#fff" />
                  <span>{item.actionLabel}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Alt Bar Bilgilendirme */}
        <div
          style={{
            padding: "14px 24px",
            background: "#fff",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#64748b"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={16} color="#16a34a" />
            <span>Tüm modallar gerçek Edesis arayüz standartlarına ve D1 üretim veritabanına bağlıdır.</span>
          </div>
          <button className="btn secondary" onClick={onClose} style={{ padding: "6px 14px", fontSize: "12px" }}>
            Kapat
          </button>
        </div>
      </div>

      {/* TEST EDİLEN MODALLARIN ÇAĞRILMASI */}
      {activeTestModal === "gelir_detay" && (
        <GelirDetayModal
          isOpen={true}
          onClose={() => setActiveTestModal(null)}
          student={sampleStudent}
          onRecordPayment={() => {}}
        />
      )}

      {activeTestModal === "tahsilat_makbuzu" && (
        <ReceiptModal
          payment={samplePayment}
          student={sampleStudent}
          onClose={() => setActiveTestModal(null)}
        />
      )}

      {activeTestModal === "matbu_senet" && (
        <PromissoryNoteModal
          student={sampleStudent}
          onClose={() => setActiveTestModal(null)}
        />
      )}

      {activeTestModal === "optik_okuyucu" && (
        <EdesisOptikModal
          exam={sampleExam}
          onClose={() => setActiveTestModal(null)}
          API={API}
          students={data.students || []}
          classes={data.classes || []}
          onResultsUpdated={() => {}}
        />
      )}

      {activeTestModal === "ogrenci_karnesi" && (
        <OfficialEdesisKarneModal
          data={sampleKarne}
          onClose={() => setActiveTestModal(null)}
        />
      )}

      {activeTestModal === "hata_karnesi" && (
        <HataKarnesiModal
          student={sampleStudent}
          onClose={() => setActiveTestModal(null)}
        />
      )}

      {activeTestModal === "sinif_detay_kadro" && (
        <ClassDetailModal
          classItem={sampleClass}
          students={data.students || []}
          onClose={() => setActiveTestModal(null)}
          onOpenStudent={(s) => {}}
        />
      )}

      {activeTestModal === "devamsizlik_mektubu" && (
        <AbsenceLetterModal
          student={sampleStudent}
          daysAbsent={10}
          onClose={() => setActiveTestModal(null)}
        />
      )}
    </div>
  );
}
