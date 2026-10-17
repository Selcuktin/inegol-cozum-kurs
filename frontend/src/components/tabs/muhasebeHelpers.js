// Helper constants and functions for Muhasebe (V2) Dashboard

export function getStudentCategory(s) {
  if (["Ayrildi", "İptal", "İptal Edildi", "İptal / Ayrılan"].includes(s?.status) || s?.is_deleted || s?.durum === 3) return "iptal";
  const prog = (s?.program || "").trim().toUpperCase();
  const fee = Number(s?.total_fee || 0);
  if (prog === "2026-2027-YAZ" || s?.status === "Yaz Kursu" || s?.enrollment_status === "Yaz Kursu") {
    return "yaz";
  }
  if (prog === "2025-2026" || s?.status === "Mezun / Geçmiş" || s?.enrollment_status === "Mezun / Geçmiş") {
    return "mezun";
  }
  if (fee < 10) {
    return "deneme";
  }
  return "kesin";
}

// Yardımcı: Temiz ve Taşkınsız Para Formatı (Büyük sayılarda küsurat atılır, TL simgesiyle uyumlu)
export function fmtMoney(val, forceDecimals = false) {
  const num = Number(val) || 0;
  if (forceDecimals) {
    return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }
  if (Math.abs(num) >= 1000 || Number.isInteger(num)) {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.round(num));
  }
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

// Yardımcı: Net Etkin Sözleşme Tutarı Hesaplama (Taban Ücret + Ek Hizmetler - İndirim)
export function getEffectiveTotalFee(student) {
  const base = Number(student?.total_fee) || 0;
  let extraSum = 0;
  try {
    const extras = typeof student?.extra_fees === "string" ? JSON.parse(student?.extra_fees || "{}") : (student?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(student?.discount_amount) || 0;
  return Math.max(0, base + extraSum - discount);
}

// Yardımcı: Öğrenci Gerçek Taksit Planı Üretimi
export function computeStudentPlan(student) {
  const n = Math.max(1, parseInt(student?.installment_count) || 1);
  const total = getEffectiveTotalFee(student);
  const per = Math.round((total / n) * 100) / 100;
  let paidRemaining = Number(student?.paid_amount) || 0;

  let startYear = new Date().getFullYear();
  let startMonth = new Date().getMonth() + 1;
  let startDay = 15;
  if (student?.due_date && student.due_date.length >= 10) {
    const parts = student.due_date.slice(0, 10).split("-");
    startYear = parseInt(parts[0]) || startYear;
    startMonth = parseInt(parts[1]) || startMonth;
    startDay = parseInt(parts[2]) || startDay;
  }

  const plan = [];
  for (let i = 0; i < n; i++) {
    let m = startMonth + i;
    let y = startYear + Math.floor((m - 1) / 12);
    m = ((m - 1) % 12) + 1;
    const dueStr = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(startDay, new Date(y, m, 0).getDate())).padStart(2, "0")}`;

    const installmentAmount = (i === n - 1) ? Math.max(0, Math.round((total - (per * (n - 1))) * 100) / 100) : per;
    const applied = Math.min(installmentAmount, paidRemaining);
    paidRemaining = Math.max(0, paidRemaining - installmentAmount);
    const remaining = Math.max(0, Math.round((installmentAmount - applied) * 100) / 100);
    const status = applied >= installmentAmount - 0.5 ? "paid" : applied > 0 ? "partial" : "pending";

    plan.push({
      no: i + 1,
      due_date: dueStr,
      amount: installmentAmount,
      paid: Math.round(applied * 100) / 100,
      remaining,
      status,
    });
  }
  return plan;
}

export function getPaymentAccountInfo(p) {
  const m = (p.method || "").toLowerCase();
  const b = (p.bank || "").toLowerCase();
  if (b.includes("vakıf") || b.includes("vakif") || m.includes("vakıf") || m.includes("vakif")) {
    return { key: "vakif", label: p.bank || "VakıfBank İnegöl Şb." };
  }
  if (b.includes("halk") || m.includes("halk")) {
    return { key: "halk", label: p.bank || "Halkbank İnegöl Şb." };
  }
  if (m.includes("kart") || m.includes("pos")) {
    return { key: "pos", label: "POS / Kredi Kartı" };
  }
  if (m.includes("senet") || m.includes("çek") || m.includes("cek")) {
    return { key: "senet", label: "Senet & Çek Portföyü" };
  }
  if (m.includes("nakit") || m.includes("elden") || m.includes("kasa")) {
    return { key: "nakit", label: "Nakit Ana Kasa" };
  }
  if (m.includes("havale") || m.includes("eft") || m.includes("bank")) {
    return { key: "vakif", label: p.bank || "VakıfBank İnegöl Şb." };
  }
  return { key: "nakit", label: "Nakit Ana Kasa" };
}

export function getExpenseAccountInfo(e) {
  const acc = (e.account || "").toLowerCase();
  if (acc.includes("vakıf") || acc.includes("vakif")) {
    return { key: "vakif", label: "VakıfBank İnegöl Şb." };
  }
  if (acc.includes("halk")) {
    return { key: "halk", label: "Halkbank İnegöl Şb." };
  }
  if (acc.includes("pos") || acc.includes("kart")) {
    return { key: "pos", label: "POS / Kredi Kartı" };
  }
  return { key: "nakit", label: "Nakit Ana Kasa" };
}

export function exportAccountingDataToExcel(customData = null, fileSuffix = "Tum_Sistem", fallbackData = {}) {
  try {
    const srcStudents = customData?.students || fallbackData?.students || [];
    const srcPayments = customData?.payments || fallbackData?.payments || [];
    const srcExpenses = customData?.expenses || fallbackData?.expenses || [];

    // Öğrenci Listesi Tablosu
    const stdHeaders = [
      "Öğrenci No",
      "T.C. Kimlik No",
      "Adı Soyadı",
      "Sınıfı",
      "Dönem",
      "Veli Adı Soyadı",
      "Veli Telefon",
      "Kayıt Durumu",
      "Toplam Ücret (TL)",
      "Ödenen Tutar (TL)",
      "Kalan Net Borç (TL)"
    ];

    const stdRows = srcStudents.map((s) => {
      const total = Number(s.total_fee || 0);
      const paid = Number(s.paid_amount || 0);
      const remaining = Math.max(0, total - paid);
      return [
        s.student_no || s.id || "",
        s.student_tc || "",
        s.student_name || "",
        s.student_class || s.class_name || "",
        s.program || s.donem || "2026-2027",
        s.parent_name || "",
        s.parent_phone || "",
        s.status || "Kesin Kayıt",
        total,
        paid,
        remaining
      ];
    });

    // Tahsilatlar Tablosu
    const pmtHeaders = [
      "Makbuz/Tahsilat No",
      "Tarih",
      "Öğrenci Adı",
      "Tutar (TL)",
      "Ödeme Yöntemi",
      "Kasa / Hesap",
      "Açıklama"
    ];

    const pmtRows = srcPayments.map((p) => [
      p.code || p.receipt_no || p.id || "",
      p.date || p.payment_date || "",
      p.student_name || p.studentName || "",
      Number(p.amount || 0),
      p.method || p.payment_type || "Nakit",
      p.account || "Nakit Ana Kasa",
      p.note || ""
    ]);

    // Giderler Tablosu
    const expHeaders = ["Tarih", "Gider Başlığı", "Kategori", "Tutar (TL)", "Hesap"];
    const expRows = srcExpenses.map((e) => [
      e.date || "",
      e.title || "",
      e.category || "",
      Number(e.amount || 0),
      e.account || ""
    ]);

    let csv = "\uFEFF"; // UTF-8 BOM for Microsoft Excel Turkish locale
    csv += "=== ÖĞRENCİLER VE BORÇ / BAKİYE TABLOSU ===\r\n";
    csv += stdHeaders.join(";") + "\r\n";
    stdRows.forEach((r) => {
      csv += r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";") + "\r\n";
    });

    csv += "\r\n=== GERÇEKLEŞEN TAHSİLATLAR ===\r\n";
    csv += pmtHeaders.join(";") + "\r\n";
    pmtRows.forEach((r) => {
      csv += r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";") + "\r\n";
    });

    if (expRows.length > 0) {
      csv += "\r\n=== KURUM GİDERLERİ ===\r\n";
      csv += expHeaders.join(";") + "\r\n";
      expRows.forEach((r) => {
        csv += r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";") + "\r\n";
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Edesis_${fileSuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Excel export error:", err);
    alert("Excel aktarma hatası: " + err.message);
  }
}
