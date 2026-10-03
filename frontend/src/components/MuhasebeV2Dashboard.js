import React, { useState, useMemo } from "react";
import axios from "axios";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Plus,
  Search,
  ChevronRight,
  Filter,
  CreditCard,
  Building,
  DollarSign,
  Receipt,
  FileText,
  MessageCircle,
  Users,
  ShieldCheck,
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Trash2,
  X,
  Percent
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ReceiptModal } from "./ReceiptModal";
import { PromissoryNoteModal } from "./PromissoryNoteModal";

// Yardımcı: Temiz ve Taşkınsız Para Formatı (Büyük sayılarda küsurat atılır, TL simgesiyle uyumlu)
function fmtMoney(val, forceDecimals = false) {
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
function getEffectiveTotalFee(student) {
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
function computeStudentPlan(student) {
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
    const dueStr = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(startDay, 28)).padStart(2, "0")}`;

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

function getPaymentAccountInfo(p) {
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

function getExpenseAccountInfo(e) {
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

export function MuhasebeV2Dashboard({ 
  me, 
  data = {}, 
  onOpen, 
  onSelectStudent, 
  API, 
  reload 
}) {
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'kasalar' | 'gecikenler' | 'tahsilatlar' | 'giderler' | 'senetler'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegisterFilter, setSelectedRegisterFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState("all"); // 'all' | '1-30' | '31-60' | '60+'
  
  // Modals state
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [promissoryStudent, setPromissoryStudent] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);

  // New Expense form
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Kira");
  const [expAccount, setExpAccount] = useState("Nakit Ana Kasa");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));

  // Quick Payment form
  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Nakit");
  const [payBank, setPayBank] = useState("T.C. VAKIFLAR BANKASI İNEGÖL ŞB.");
  const [payNote, setPayNote] = useState("Taksit Tahsilatı");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payLoading, setPayLoading] = useState(false);

  const students = useMemo(() => data.students || [], [data.students]);
  const payments = useMemo(() => data.payments || [], [data.payments]);
  const [expenses, setExpenses] = useState(data.expenses || []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // 1. ÖĞRENCİ GERÇEK TAKSİT PLANLARI HARİTASI
  const studentPlansMap = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      map[s.id] = computeStudentPlan(s);
    });
    return map;
  }, [students]);

  // 2. ÜST FİNANSAL KPI HESAPLAMALARI (Edesis Muhasebe V2)
  const totalContractRevenue = useMemo(() => {
    return students.reduce((sum, s) => sum + getEffectiveTotalFee(s), 0);
  }, [students]);

  const totalCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const totalRemaining = Math.max(0, totalContractRevenue - totalCollected);
  const collectionRate = totalContractRevenue > 0 ? Math.round((totalCollected / totalContractRevenue) * 100) : 0;
  const netCashBalance = Math.max(0, totalCollected - totalExpenses);

  // GAP-1: Bu Ay Vadesi Gelenler (Cari Ay Taksit Tahakkuku)
  const dueThisMonthData = useMemo(() => {
    let total = 0;
    let count = 0;
    let remaining = 0;
    students.forEach((s) => {
      const plan = studentPlansMap[s.id] || [];
      plan.forEach((inst) => {
        if (inst.due_date && inst.due_date.startsWith(currentMonthStr)) {
          total += inst.amount;
          count += 1;
          remaining += inst.remaining;
        }
      });
    });
    return {
      total,
      count,
      remaining,
      collected: Math.max(0, total - remaining)
    };
  }, [students, studentPlansMap, currentMonthStr]);

  // GAP-5: Taksit Yaşlandırma & Gecikme Takibi (Gerçek Vade Tarihine Göre)
  const overdueStudents = useMemo(() => {
    return students
      .map((s) => {
        const total = getEffectiveTotalFee(s);
        const paid = Number(s.paid_amount) || 0;
        const remaining = Math.max(0, total - paid);
        if (remaining <= 0) return null;

        let daysOverdue = 28;
        if (s.due_date) {
          const diff = Math.floor((new Date(todayStr).getTime() - new Date(s.due_date).getTime()) / 86400000);
          daysOverdue = Math.max(1, diff);
        }

        let agingCategory = "1-30";
        if (daysOverdue > 60) agingCategory = "60+";
        else if (daysOverdue > 30) agingCategory = "31-60";

        return {
          ...s,
          remaining,
          daysOverdue,
          agingCategory
        };
      })
      .filter(Boolean);
  }, [students, todayStr]);

  const totalOverdueDebt = useMemo(() => {
    return overdueStudents.reduce((sum, s) => sum + s.remaining, 0);
  }, [overdueStudents]);

  const agingSummary = useMemo(() => {
    const c1_30 = overdueStudents.filter(s => s.agingCategory === "1-30");
    const c31_60 = overdueStudents.filter(s => s.agingCategory === "31-60");
    const c60plus = overdueStudents.filter(s => s.agingCategory === "60+");

    const sum1_30 = c1_30.reduce((a, s) => a + s.remaining, 0);
    const sum31_60 = c31_60.reduce((a, s) => a + s.remaining, 0);
    const sum60plus = c60plus.reduce((a, s) => a + s.remaining, 0);

    const pct1_30 = totalOverdueDebt > 0 ? Math.round((sum1_30 / totalOverdueDebt) * 100) : 0;
    const pct31_60 = totalOverdueDebt > 0 ? Math.round((sum31_60 / totalOverdueDebt) * 100) : 0;
    const pct60plus = totalOverdueDebt > 0 ? Math.max(0, 100 - pct1_30 - pct31_60) : 0;

    return {
      c1_30: { count: c1_30.length, sum: sum1_30, pct: pct1_30 },
      c31_60: { count: c31_60.length, sum: sum31_60, pct: pct31_60 },
      c60plus: { count: c60plus.length, sum: sum60plus, pct: pct60plus }
    };
  }, [overdueStudents, totalOverdueDebt]);

  // 3. KASA & BANKA HESAP BAKİYELERİ (GAP-2 & GAP-3)
  const registers = useMemo(() => {
    let vakifbankInflow = 0;
    let halkbankInflow = 0;
    let nakitInflow = 0;
    let posInflow = 0;
    let senetInflow = 0;

    payments.forEach((p) => {
      const m = (p.method || "").toLowerCase();
      const b = (p.bank || "").toLowerCase();
      const amt = Number(p.amount || 0);

      if (b.includes("vakıf") || b.includes("vakif") || m.includes("vakıf") || m.includes("vakif")) {
        vakifbankInflow += amt;
      } else if (b.includes("halk") || m.includes("halk")) {
        halkbankInflow += amt;
      } else if (m.includes("kart") || m.includes("pos")) {
        posInflow += amt;
      } else if (m.includes("senet") || m.includes("çek") || m.includes("cek")) {
        senetInflow += amt;
      } else if (m.includes("nakit") || m.includes("elden") || m.includes("kasa")) {
        nakitInflow += amt;
      } else {
        if (m.includes("havale") || m.includes("eft") || m.includes("bank")) {
          vakifbankInflow += amt;
        } else {
          nakitInflow += amt;
        }
      }
    });

    let vakifbankExpense = 0;
    let halkbankExpense = 0;
    let nakitExpense = 0;
    let posExpense = 0;

    expenses.forEach((e) => {
      const acc = (e.account || "").toLowerCase();
      const amt = Number(e.amount || 0);
      if (acc.includes("vakıf") || acc.includes("vakif")) {
        vakifbankExpense += amt;
      } else if (acc.includes("halk")) {
        halkbankExpense += amt;
      } else if (acc.includes("pos") || acc.includes("kart")) {
        posExpense += amt;
      } else {
        nakitExpense += amt;
      }
    });

    return {
      vakifbankInflow,
      vakifbankExpense,
      vakifbank: Math.max(0, vakifbankInflow - vakifbankExpense),
      
      halkbankInflow,
      halkbankExpense,
      halkbank: Math.max(0, halkbankInflow - halkbankExpense),

      nakitInflow,
      nakitExpense,
      nakit: Math.max(0, nakitInflow - totalExpenses),

      posInflow,
      posExpense,
      pos: Math.max(0, posInflow - posExpense),

      senetInflow,
      senet: senetInflow,

      grossNakit: nakitInflow
    };
  }, [payments, expenses, totalExpenses]);

  const netLiquidBalance = useMemo(() => {
    return Math.max(0, registers.vakifbank + registers.halkbank + registers.pos + registers.nakit);
  }, [registers]);

  // 4. 12 AYLIK DİNAMİK GELİR & TAHSİLAT TREND GRAFİĞİ (GAP-4)
  const monthlyTrends = useMemo(() => {
    const MONTH_NAMES = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    const currentYear = new Date().getFullYear();

    return MONTH_NAMES.map((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, "0");
      const monthPrefix = `${currentYear}-${monthNum}`;

      let plan = 0;
      students.forEach((s) => {
        const studentPlan = studentPlansMap[s.id] || [];
        studentPlan.forEach((inst) => {
          if (inst.due_date && inst.due_date.startsWith(monthPrefix)) {
            plan += inst.amount;
          }
        });
      });

      let gerceklesen = 0;
      payments.forEach((p) => {
        if (p.payment_date && p.payment_date.startsWith(monthPrefix)) {
          gerceklesen += Number(p.amount || 0);
        }
      });

      const uyum = plan > 0 ? Math.min(100, Math.round((gerceklesen / plan) * 100)) : (gerceklesen > 0 ? 100 : 0);

      return {
        ay: name,
        ayKod: monthPrefix,
        plan: Math.round(plan),
        gerceklesen: Math.round(gerceklesen),
        uyum
      };
    });
  }, [students, studentPlansMap, payments]);

  // 5. GELİR KATEGORİLERİ & TAHSİLAT YÖNTEMLERİ DAĞILIMI (GAP-6)
  const incomeCategoryData = useMemo(() => {
    let sozlesme = 0;
    let kitap = 0;
    let dijital = 0;
    let dnm = 0;
    let ozelDers = 0;

    students.forEach((s) => {
      const base = Math.max(0, (Number(s.total_fee) || 0) - (Number(s.discount_amount) || 0));
      sozlesme += base;

      let extras = {};
      try {
        extras = typeof s.extra_fees === "string" ? JSON.parse(s.extra_fees || "{}") : (s.extra_fees || {});
      } catch {}
      kitap += Number(extras.kaynak || 0);
      dijital += Number(extras.dijital || 0);
      dnm += Number(extras.dnm || 0);
      ozelDers += Number(extras.ozel_ders || 0) + Number(extras.kutuphane || 0);
    });

    const total = sozlesme + kitap + dijital + dnm + ozelDers || 1;
    return [
      { name: "Sözleşmeler", value: sozlesme, color: "#2563eb", pct: Math.round((sozlesme / total) * 100) },
      { name: "Yayın & Kitap", value: kitap, color: "#16a34a", pct: Math.round((kitap / total) * 100) },
      { name: "Dijital Platform", value: dijital, color: "#ca8a04", pct: Math.round((dijital / total) * 100) },
      { name: "Deneme Kulübü", value: dnm, color: "#9333ea", pct: Math.round((dnm / total) * 100) },
      { name: "Etüt & Özel Ders", value: ozelDers, color: "#ea580c", pct: Math.round((ozelDers / total) * 100) },
    ].filter(item => item.value > 0);
  }, [students]);

  const paymentMethodData = useMemo(() => {
    const total = totalCollected || 1;
    return [
      { name: "Nakit Ana Kasa", value: registers.nakitInflow, color: "#ca8a04", pct: Math.round((registers.nakitInflow / total) * 100) },
      { name: "POS / Kredi Kartı", value: registers.posInflow, color: "#db2777", pct: Math.round((registers.posInflow / total) * 100) },
      { name: "VakıfBank Havale", value: registers.vakifbankInflow, color: "#16a34a", pct: Math.round((registers.vakifbankInflow / total) * 100) },
      { name: "Halkbank Havale", value: registers.halkbankInflow, color: "#2563eb", pct: Math.round((registers.halkbankInflow / total) * 100) },
      { name: "Senet / Bono", value: registers.senetInflow, color: "#7c3aed", pct: Math.round((registers.senetInflow / total) * 100) },
    ].filter(item => item.value > 0);
  }, [registers, totalCollected]);

  // Filtered Payments List (Kasalar Tab & Tahsilatlar Tab)
  const filteredPaymentsList = useMemo(() => {
    let running = 0;
    return payments
      .filter((p) => {
        const matchSearch = `${p.student_name || ""} ${p.method || ""} ${p.bank || ""} ${p.note || ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        if (!matchSearch) return false;

        const m = (p.method || "").toLowerCase();
        const b = (p.bank || "").toLowerCase();
        if (selectedRegisterFilter === "vakif") return m.includes("vakıf") || m.includes("vakif") || b.includes("vakıf") || b.includes("vakif") || m.includes("havale") || m.includes("eft");
        if (selectedRegisterFilter === "halk") return m.includes("halk") || b.includes("halk");
        if (selectedRegisterFilter === "nakit") return m.includes("nakit") || m.includes("elden");
        if (selectedRegisterFilter === "pos") return m.includes("kart") || m.includes("pos");
        if (selectedRegisterFilter === "senet") return m.includes("senet") || m.includes("çek");

        return true;
      })
      .map((p) => {
        running += Number(p.amount || 0);
        return {
          ...p,
          runningBalance: running
        };
      });
  }, [payments, searchQuery, selectedRegisterFilter]);

  // Çift Yönlü Kasa & Banka Defteri (Tahsilatlar + Giderler)
  const allLedgerItems = useMemo(() => {
    const list = [];
    payments.forEach((p) => {
      const info = getPaymentAccountInfo(p);
      list.push({
        id: p.id,
        isInflow: true,
        type: "tahsilat",
        date: p.payment_date || "2026-10-02",
        accountKey: info.key,
        accountLabel: info.label,
        party: p.student_name || "Öğrenci Kaydı",
        description: p.note || "Taksit Ödemesi",
        amount: Number(p.amount || 0),
        rawPayment: p,
      });
    });

    expenses.forEach((e) => {
      const info = getExpenseAccountInfo(e);
      list.push({
        id: e.id,
        isInflow: false,
        type: "gider",
        date: e.expense_date || "2026-10-02",
        accountKey: info.key,
        accountLabel: info.label,
        party: e.category ? `Gider: ${e.category}` : "Kurum Gideri",
        description: e.title || "İşletme Gideri",
        amount: Number(e.amount || 0),
        rawExpense: e,
      });
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments, expenses]);

  const filteredLedgerList = useMemo(() => {
    let running = 0;
    return allLedgerItems
      .filter((item) => {
        const matchSearch = `${item.party || ""} ${item.accountLabel || ""} ${item.description || ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        if (!matchSearch) return false;

        if (selectedRegisterFilter !== "all" && item.accountKey !== selectedRegisterFilter) {
          return false;
        }
        return true;
      })
      .map((item) => {
        if (item.isInflow) {
          running += item.amount;
        } else {
          running = Math.max(0, running - item.amount);
        }
        return {
          ...item,
          runningBalance: running,
        };
      });
  }, [allLedgerItems, searchQuery, selectedRegisterFilter]);

  // Filtered Overdue Students
  const filteredOverdueList = useMemo(() => {
    return overdueStudents.filter((s) => {
      const matchSearch = `${s.student_name} ${s.student_no} ${s.parent_name} ${s.parent_phone}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (agingFilter !== "all" && s.agingCategory !== agingFilter) return false;

      return true;
    });
  }, [overdueStudents, searchQuery, agingFilter]);

  // WhatsApp Borç Hatırlatma Gönder (GAP-5: öğrenci adı, vade tarihi, kalan borç, VakıfBank IBAN)
  const sendWhatsAppReminder = (student) => {
    const phone = (student.parent_phone || "").replace(/[^0-9]/g, "");
    let cleanPhone = phone.startsWith("0") ? "9" + phone : (phone.length === 10 ? "90" + phone : phone);
    const dueDateStr = student.due_date ? ` (${new Date(student.due_date).toLocaleDateString("tr-TR")} vadeli)` : "";
    const msg = `Sayın ${student.parent_name || "Velimiz"},\nÖzel İnegöl Çözüm Kurs Merkezi olarak ${student.student_name} isimli öğrencimizin${dueDateStr} vadesi gelen ₺${student.remaining.toLocaleString("tr-TR")} tutarındaki taksit ödemesini hatırlatmak isteriz.\nÖdeme İşlemleri için:\nT.C. VAKIFLAR BANKASI İNEGÖL ŞUBESİ\nIBAN: TR04 0001 5001 5800 7354 4922 43 (Nevin Çakmak)\nİletişim: 0224 715 00 02`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Toplu WhatsApp Hatırlatma
  const handleBulkWhatsAppReminder = () => {
    if (overdueStudents.length === 0) {
      alert("Vadesi geçmiş taksiti olan öğrenci bulunmuyor.");
      return;
    }
    const target = overdueStudents[0];
    sendWhatsAppReminder(target);
    alert(`Toplam ${overdueStudents.length} geciken taksit tespit edildi. İlk veli (${target.parent_name} - ${target.student_name}) için WhatsApp mesajı açıldı.`);
  };

  // GAP-3: Gider Kaydetme (Kasa/Banka Seçimi Dahil)
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expTitle || !expAmount) return;
    try {
      const amt = parseFloat(expAmount);
      const res = await axios.post(`${API}/expenses`, {
        title: expTitle,
        amount: amt,
        category: expCategory,
        account: expAccount,
        expense_date: expDate
      });
      const newExp = {
        id: res.data?.id || `exp-${Date.now()}`,
        title: expTitle,
        amount: amt,
        category: expCategory,
        account: expAccount,
        expense_date: expDate
      };
      setExpenses([newExp, ...expenses]);
      setShowExpenseModal(false);
      setExpTitle("");
      setExpAmount("");
      setExpAccount("Nakit Ana Kasa");
      alert("Kurum gideri başarıyla kaydedildi.");
      if (reload) reload();
    } catch (err) {
      alert("Gider kaydedilemedi: " + (err.response?.data?.detail || err.message));
    }
  };

  // Hızlı Tahsilat Kaydetme
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payStudentId || !payAmount) {
      alert("Lütfen öğrenci ve tahsilat tutarını seçiniz.");
      return;
    }
    setPayLoading(true);
    try {
      const amt = parseFloat(payAmount);
      const res = await axios.post(`${API}/payments`, {
        student_id: payStudentId,
        amount: amt,
        method: payMethod,
        bank: payMethod === "Banka Havale / EFT" ? payBank : "",
        payment_date: payDate,
        note: payNote
      });
      setShowQuickPaymentModal(false);
      const studentObj = students.find(s => s.id === payStudentId);
      
      setReceiptPayment({
        id: res.data?.id || `pmt-${Date.now()}`,
        student_id: payStudentId,
        student_name: studentObj?.student_name || "Öğrenci",
        parent_name: studentObj?.parent_name || "Veli",
        amount: amt,
        method: payMethod,
        payment_date: payDate,
        note: payNote
      });
      
      setPayAmount("");
      setPayStudentId("");
      alert("Tahsilat başarıyla kaydedildi! Resmi tahsilat makbuzu ekrana getiriliyor...");
      if (reload) reload();
    } catch (err) {
      alert("Tahsilat kaydedilemedi: " + (err.response?.data?.detail || err.message));
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="muhasebe-v2-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. ÜST BAŞLIK VE HIZLI EYLEM DÜĞMELERİ */}
      <div className="page-head" style={{ marginBottom: "4px" }}>
        <div>
          <div className="eyebrow" style={{ color: "#2563eb", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} /> ÖZEL İNEGÖL ÇÖZÜM KURSU · EDESİS MUHASEBE V2
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
            Muhasebe & Finans Yönetim Portali
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>
            Kurum gelirleri, kasa/banka çift yönlü defteri, taksit yaşlandırma ve resmi makbuz/senet motoru.
          </p>
        </div>

        <div className="head-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button 
            className="btn" 
            onClick={() => setShowQuickPaymentModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#16a34a", color: "#fff", fontWeight: "700" }}
          >
            <Plus size={16} /> Hızlı Tahsilat Al (Makbuzlu)
          </button>
          <button 
            className="btn secondary" 
            onClick={() => setShowExpenseModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <TrendingDown size={16} color="#ef4444" /> Gider Ekle
          </button>
          <button 
            className="btn secondary" 
            onClick={handleBulkWhatsAppReminder}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", borderColor: "#22c55e", color: "#16a34a" }}
            title="Vadesi geçmiş öğrencilerin velilerine tek tıkla WhatsApp borç bildirimi gönderir"
          >
            <MessageCircle size={16} /> Gecikenlere WhatsApp Hatırlat
          </button>
          <button 
            className="btn secondary" 
            onClick={() => window.print()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Printer size={16} /> Kasa Raporu Yazdır
          </button>
        </div>
      </div>

      {/* 2. MASTER FİNANSAL KPI GÖSTERGE KARTLARI (R1 Paritesi & Taşmayan Sayılar) */}
      <div className="muhasebe-kpi-grid">
        
        {/* Toplam Sözleşme / Kayıt Cirosu */}
        <div className="muhasebe-kpi-card" style={{ background: "#fff" }}>
          <div className="kpi-title-row" style={{ color: "#64748b" }}>
            <span>TOPLAM KAYIT CİROSU</span>
            <Building size={16} color="#3b82f6" />
          </div>
          <div className="kpi-value-text" style={{ color: "#0f172a" }} title={`₺${fmtMoney(totalContractRevenue)}`}>
            ₺{fmtMoney(totalContractRevenue)}
          </div>
          <div className="kpi-sub-text" style={{ color: "#64748b" }}>
            {students.length} Kayıtlı Öğrenci Taahhüdü
          </div>
        </div>

        {/* Gerçekleşen Tahsilat */}
        <div className="muhasebe-kpi-card" style={{ background: "#fff", borderColor: "#bbf7d0" }}>
          <div className="kpi-title-row" style={{ color: "#166534" }}>
            <span>GERÇEKLEŞEN TAHSİLAT</span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div className="kpi-value-text" style={{ color: "#16a34a" }} title={`₺${fmtMoney(totalCollected)}`}>
            ₺{fmtMoney(totalCollected)}
          </div>
          <div className="kpi-sub-text" style={{ color: "#166534", fontWeight: "600" }}>
            Tahsilat Oranı: %{collectionRate}
          </div>
        </div>

        {/* Bu Ay Vadesi Gelenler (GAP-1) */}
        <div className="muhasebe-kpi-card" style={{ background: "#fff", borderColor: "#fed7aa" }}>
          <div className="kpi-title-row" style={{ color: "#c2410c" }}>
            <span>BU AY VADESİ GELENLER</span>
            <Calendar size={16} color="#ea580c" />
          </div>
          <div className="kpi-value-text" style={{ color: "#ea580c" }} title={`₺${fmtMoney(dueThisMonthData.total)}`}>
            ₺{fmtMoney(dueThisMonthData.total)}
          </div>
          <div className="kpi-sub-text" style={{ color: "#9a3412" }}>
            {dueThisMonthData.count} Taksit (₺{fmtMoney(dueThisMonthData.collected)} Alındı)
          </div>
        </div>

        {/* Gecikmiş Taksitler (Kritik Takip) */}
        <div className="muhasebe-kpi-card" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <div className="kpi-title-row" style={{ color: "#991b1b" }}>
            <span>GECİKMİŞ TAKSİTLER</span>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div className="kpi-value-text" style={{ color: "#dc2626" }} title={`₺${fmtMoney(totalOverdueDebt)}`}>
            ₺{fmtMoney(totalOverdueDebt)}
          </div>
          <div className="kpi-sub-text" style={{ color: "#b91c1c", fontWeight: "600" }}>
            {overdueStudents.length} Öğrenci Vadesi Geçti
          </div>
        </div>

        {/* Tahsilat Başarı Oranı (Bağımsız Gösterge Kartı) */}
        <div className="muhasebe-kpi-card" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
          <div className="kpi-title-row" style={{ color: "#15803d" }}>
            <span>TAHSİLAT BAŞARI ORANI</span>
            <Percent size={16} color="#16a34a" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <span style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: "800", color: "#166534" }}>
              %{collectionRate}
            </span>
            <div style={{ flex: 1, background: "#dcfce7", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, collectionRate)}%`, background: "#16a34a", height: "100%", borderRadius: "4px" }} />
            </div>
          </div>
          <div className="kpi-sub-text" style={{ color: "#15803d", fontWeight: "600" }}>
            Kalan: ₺{fmtMoney(totalRemaining)}
          </div>
        </div>

        {/* Net Likit Mevcut */}
        <div className="muhasebe-kpi-card" style={{ background: "#f8fafc", border: "2px solid #2563eb" }}>
          <div className="kpi-title-row" style={{ color: "#1d4ed8" }}>
            <span>NET LİKİT MEVCUT</span>
            <Wallet size={16} color="#2563eb" />
          </div>
          <div className="kpi-value-text" style={{ color: "#1d4ed8" }} title={`₺${fmtMoney(netLiquidBalance)}`}>
            ₺{fmtMoney(netLiquidBalance)}
          </div>
          <div className="kpi-sub-text" style={{ color: "#2563eb", fontWeight: "600" }}>
            Kasa, Banka ve POS Likit Portföyü
          </div>
        </div>

      </div>

      {/* 3. KASA & BANKA PORTFÖY ŞERİDİ (5 Edesis Hesabı) */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <Building size={16} color="#2563eb" /> Resmi Kasa & Banka Hesap Defteri
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            T.C. Millî Eğitim Bakanlığı Onaylı Kurum Hesapları
          </span>
        </div>

        <div className="muhasebe-bank-grid">
          
          {/* VakıfBank */}
          <div 
            className="bank-acc-card"
            onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("vakif"); }}
            style={{ 
              background: "#f0fdf4", 
              border: "1px solid #bbf7d0"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", background: "#16a34a", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                  ANA HESAP
                </span>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                  VakıfBank İnegöl Şb.
                </div>
              </div>
              <CreditCard size={16} color="#16a34a" />
            </div>
            <div className="bank-card-val" style={{ color: "#166534" }} title={`₺${fmtMoney(registers.vakifbank)}`}>
              ₺{fmtMoney(registers.vakifbank)}
            </div>
            <div className="bank-card-flow">
              <span>G: ₺{fmtMoney(registers.vakifbankInflow)}</span>
              <span>Ç: ₺{fmtMoney(registers.vakifbankExpense)}</span>
            </div>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
              TR04 0001 ... 4922 43
            </div>
          </div>

          {/* Halkbank */}
          <div 
            className="bank-acc-card"
            onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("halk"); }}
            style={{ 
              background: "#eff6ff", 
              border: "1px solid #bfdbfe"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", background: "#2563eb", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                  BANKA
                </span>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                  Halkbank İnegöl Şb.
                </div>
              </div>
              <Building size={16} color="#2563eb" />
            </div>
            <div className="bank-card-val" style={{ color: "#1d4ed8" }} title={`₺${fmtMoney(registers.halkbank)}`}>
              ₺{fmtMoney(registers.halkbank)}
            </div>
            <div className="bank-card-flow">
              <span>G: ₺{fmtMoney(registers.halkbankInflow)}</span>
              <span>Ç: ₺{fmtMoney(registers.halkbankExpense)}</span>
            </div>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
              TR87 0001 ... 1016 32
            </div>
          </div>

          {/* Nakit Ana Kasa */}
          <div 
            className="bank-acc-card"
            onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("nakit"); }}
            style={{ 
              background: "#fefce8", 
              border: "1px solid #fef08a"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", background: "#ca8a04", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                  NAKİT
                </span>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                  Nakit Ana Kasa
                </div>
              </div>
              <Wallet size={16} color="#ca8a04" />
            </div>
            <div className="bank-card-val" style={{ color: "#854d0e" }} title={`₺${fmtMoney(registers.nakit)}`}>
              ₺{fmtMoney(registers.nakit)}
            </div>
            <div className="bank-card-flow">
              <span>G: ₺{fmtMoney(registers.nakitInflow)}</span>
              <span>Ç: ₺{fmtMoney(registers.nakitExpense)}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
              Ofis Elden Tahsilat Bakiyesi
            </div>
          </div>

          {/* POS / Kredi Kartı */}
          <div 
            className="bank-acc-card"
            onClick={() => { setActiveTab("kasalar"); setSelectedRegisterFilter("pos"); }}
            style={{ 
              background: "#fdf2f8", 
              border: "1px solid #fbcfe8"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", background: "#db2777", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                  POS
                </span>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                  POS / Kredi Kartı
                </div>
              </div>
              <CreditCard size={16} color="#db2777" />
            </div>
            <div className="bank-card-val" style={{ color: "#9d174d" }} title={`₺${fmtMoney(registers.pos)}`}>
              ₺{fmtMoney(registers.pos)}
            </div>
            <div className="bank-card-flow">
              <span>G: ₺{fmtMoney(registers.posInflow)}</span>
              <span>Ç: ₺{fmtMoney(registers.posExpense)}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
              Sanal ve Fiziki POS Girişleri
            </div>
          </div>

          {/* Senet Portföyü */}
          <div 
            className="bank-acc-card"
            onClick={() => { setActiveTab("senetler"); }}
            style={{ 
              background: "#f5f3ff", 
              border: "1px solid #ddd6fe"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "700", background: "#7c3aed", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
                  SENET / BONO
                </span>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
                  Senet & Çek Portföyü
                </div>
              </div>
              <FileText size={16} color="#7c3aed" />
            </div>
            <div className="bank-card-val" style={{ color: "#6d28d9" }} title={`₺${fmtMoney(registers.senet)}`}>
              ₺{fmtMoney(registers.senet)}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
              Matbu Senetli Tahsilatlar
            </div>
          </div>

        </div>
      </div>

      {/* 4. MODÜL SEKMELERİ (EDESİS MUHASEBE V2 MENÜSÜ & YATAY KAYDIRMA) */}
      <div className="muhasebe-tabs-scroll">
        <button
          className={`btn ${activeTab === "dashboard" ? "" : "secondary"}`}
          onClick={() => setActiveTab("dashboard")}
          style={{ fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <BarChart2 size={16} /> 📊 Muhasebe V2 Dashboard & Grafikler
        </button>
        <button
          className={`btn ${activeTab === "gecikenler" ? "" : "secondary"}`}
          onClick={() => setActiveTab("gecikenler")}
          style={{ fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", color: activeTab === "gecikenler" ? "#fff" : "#dc2626" }}
        >
          <AlertTriangle size={16} /> ⚠️ Geciken Taksitler & Yaşlandırma ({overdueStudents.length})
        </button>
        <button
          className={`btn ${activeTab === "kasalar" ? "" : "secondary"}`}
          onClick={() => setActiveTab("kasalar")}
          style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Building size={16} /> 💳 Kasa & Banka Defteri
        </button>
        <button
          className={`btn ${activeTab === "tahsilatlar" ? "" : "secondary"}`}
          onClick={() => setActiveTab("tahsilatlar")}
          style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Receipt size={16} /> 🧾 Tahsilat Listesi & Makbuzlar ({payments.length})
        </button>
        <button
          className={`btn ${activeTab === "giderler" ? "" : "secondary"}`}
          onClick={() => setActiveTab("giderler")}
          style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <TrendingDown size={16} /> 📉 Kurum Giderleri ({expenses.length})
        </button>
        <button
          className={`btn ${activeTab === "senetler" ? "" : "secondary"}`}
          onClick={() => setActiveTab("senetler")}
          style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <FileText size={16} /> 📜 Matbu Senet (Bono) Süiti
        </button>
      </div>

      {/* 5. SEKME İÇERİKLERİ */}

      {/* SEKME 1: DASHBOARD & RECHARTS GRAFİKLERİ */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Yaşlandırma Özeti Çubuğu (GAP-5: Gerçek Vade Tarihlerine Göre) */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Taksit Yaşlandırma & Risk Analizi (Edesis Aging Report)
                </h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                  Vadesi geçen toplam <b>₺{fmtMoney(totalOverdueDebt)}</b> tutarındaki taksitlerin gerçek gecikme dilimleri
                </p>
              </div>
              <button 
                className="btn small secondary" 
                onClick={handleBulkWhatsAppReminder}
                style={{ borderColor: "#22c55e", color: "#16a34a", fontWeight: "600" }}
              >
                <MessageCircle size={14} /> Gecikenlere Toplu WhatsApp Aç
              </button>
            </div>

            {/* Yaşlandırma Dinamik İlerleme Çubuğu */}
            <div style={{ display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden", background: "#f1f5f9", marginBottom: "12px" }}>
              <div 
                style={{ width: `${Math.max(5, collectionRate)}%`, background: "#22c55e" }} 
                title={`Zamanında Ödenenler: %${collectionRate}`} 
              />
              <div 
                style={{ width: `${Math.max(2, agingSummary.c1_30.pct)}%`, background: "#eab308" }} 
                title={`1-30 Gün Geciken: %${agingSummary.c1_30.pct}`} 
              />
              <div 
                style={{ width: `${Math.max(2, agingSummary.c31_60.pct)}%`, background: "#f97316" }} 
                title={`31-60 Gün Geciken: %${agingSummary.c31_60.pct}`} 
              />
              <div 
                style={{ width: `${Math.max(2, agingSummary.c60plus.pct)}%`, background: "#ef4444" }} 
                title={`60+ Gün Kritik: %${agingSummary.c60plus.pct}`} 
              />
            </div>

            <div className="aging-summary-grid">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <span><b>Zamanında:</b> %{collectionRate} (₺{fmtMoney(totalCollected)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308", flexShrink: 0 }} />
                <span><b>1 - 30 Gün:</b> {agingSummary.c1_30.count} Öğr. (₺{fmtMoney(agingSummary.c1_30.sum)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
                <span><b>31 - 60 Gün:</b> {agingSummary.c31_60.count} Öğr. (₺{fmtMoney(agingSummary.c31_60.sum)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                <span><b>60+ Gün:</b> {agingSummary.c60plus.count} Öğr. (₺{fmtMoney(agingSummary.c60plus.sum)})</span>
              </div>
            </div>
          </div>

          {/* GAP-4: 12 Aylık Karşılaştırmalı Trend Grafiği (Recharts Responsive BarChart) */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  12 Aylık Taksit & Tahsilat Karşılaştırma Grafiği (Edesis Trend Analizi)
                </h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                  Öğrencilerin taksit vadelerine göre planlanan tahakkuk vs gerçekleşen kasa/banka nakit akışı
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 12, background: "#93c5fd", borderRadius: "3px" }} /> Planlanan Taksit
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 12, background: "#16a34a", borderRadius: "3px" }} /> Gerçekleşen Tahsilat
                </span>
              </div>
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="ay" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false}
                    tickFormatter={(val) => `₺${val >= 1000 ? `${Math.round(val/1000)}k` : val}`} 
                  />
                  <Tooltip 
                    formatter={(val) => [`₺${fmtMoney(val)}`, ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="plan" name="Planlanan Taksit Tahakkuku" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gerceklesen" name="Gerçekleşen Tahsilat" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* DOM Accessibility & Monthly Pill Legend (T1.6 Compliance & Responsive Strip) */}
            <div className="monthly-trends-strip">
              {monthlyTrends.map((m, idx) => (
                <div key={idx} className="monthly-trend-pill">
                  <b style={{ display: "block", color: m.gerceklesen > 0 ? "#166534" : "#64748b", fontSize: "11px" }}>
                    {m.ay.slice(0, 3)}
                  </b>
                  <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                    {m.gerceklesen > 0 ? `₺${Math.round(m.gerceklesen/1000)}k` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* GAP-6: Gelir Kategorileri ve Tahsilat Yöntemleri Dağılım Panelleri */}
          <div className="muhasebe-charts-grid">
            
            {/* Panel 1: Gelir Kategorileri Dağılımı */}
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Gelir Kategorileri Dağılımı
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Ciro Kalemleri</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ width: 170, height: 170, margin: "auto" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeCategoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {incomeCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `₺${fmtMoney(val)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", minWidth: 160 }}>
                  {incomeCategoryData.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <b style={{ color: "#0f172a" }}>₺{fmtMoney(item.value)} (%{item.pct})</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel 2: Tahsilat Yöntemleri Dağılımı */}
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Tahsilat Yöntemleri Dağılımı
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Kasa & Banka Girişi</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ width: 170, height: 170, margin: "auto" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-pm-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `₺${fmtMoney(val)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", minWidth: 160 }}>
                  {paymentMethodData.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <b style={{ color: "#0f172a" }}>₺{fmtMoney(item.value)} (%{item.pct})</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SEKME 2: KASA & BANKA DEFTERİ (GAP-2: Tahsilat / Kasa Hareketleri & Bakiye) */}
      {activeTab === "kasalar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Kasa Filtre Seçicisi */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button 
                className={`btn small ${selectedRegisterFilter === "all" ? "" : "secondary"}`}
                onClick={() => setSelectedRegisterFilter("all")}
              >
                Tüm Hesaplar ({allLedgerItems.length})
              </button>
              <button 
                className={`btn small ${selectedRegisterFilter === "vakif" ? "" : "secondary"}`}
                onClick={() => setSelectedRegisterFilter("vakif")}
                style={{ color: "#166534" }}
              >
                VakıfBank (Bakiye: ₺{fmtMoney(registers.vakifbank)})
              </button>
              <button 
                className={`btn small ${selectedRegisterFilter === "halk" ? "" : "secondary"}`}
                onClick={() => setSelectedRegisterFilter("halk")}
                style={{ color: "#1d4ed8" }}
              >
                Halkbank (Bakiye: ₺{fmtMoney(registers.halkbank)})
              </button>
              <button 
                className={`btn small ${selectedRegisterFilter === "nakit" ? "" : "secondary"}`}
                onClick={() => setSelectedRegisterFilter("nakit")}
                style={{ color: "#854d0e" }}
              >
                Nakit Kasa (Bakiye: ₺{fmtMoney(registers.nakit)})
              </button>
              <button 
                className={`btn small ${selectedRegisterFilter === "pos" ? "" : "secondary"}`}
                onClick={() => setSelectedRegisterFilter("pos")}
                style={{ color: "#9d174d" }}
              >
                POS Kasası (₺{fmtMoney(registers.pos)})
              </button>
              <button 
                className={`btn small ${selectedRegisterFilter === "senet" ? "" : "secondary"}`}
                onClick={() => setSelectedRegisterFilter("senet")}
                style={{ color: "#7c3aed" }}
              >
                Senet Portföyü (₺{fmtMoney(registers.senet)})
              </button>
            </div>

            <div className="top-search" style={{ width: "240px", margin: 0 }}>
              <Search size={14} />
              <input 
                placeholder="Defterde ara..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: "12px" }}
              />
            </div>
          </div>

          {/* Kasa Hareketleri Tablosu (Çift Yönlü Defter & Responsive Yatay Kaydırma) */}
          <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "680px" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th>Tarih</th>
                  <th>Hesap / Kasa</th>
                  <th>Öğrenci / Alacaklı</th>
                  <th>Açıklama / Not</th>
                  <th style={{ textAlign: "right" }}>İşlem Tutarı</th>
                  <th style={{ textAlign: "right" }}>Kasa Bakiyesi</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgerList.map((item, idx) => {
                  const bakiye = item.runningBalance;
                  return (
                    <tr key={item.id || idx}>
                      <td><b style={{ color: "#475569" }}>{item.date ? item.date.slice(0, 10) : "2026-10-02"}</b></td>
                      <td>
                        <span className="badge" style={{ 
                          background: item.isInflow ? "#eff6ff" : "#fef2f2", 
                          color: item.isInflow ? "#1d4ed8" : "#dc2626", 
                          padding: "3px 8px", 
                          borderRadius: "6px", 
                          fontSize: "11px", 
                          fontWeight: "600" 
                        }}>
                          {item.accountLabel}
                        </span>
                      </td>
                      <td><b style={{ color: "#0f172a" }}>{item.party}</b></td>
                      <td><span style={{ color: "#64748b" }}>{item.description}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <b style={{ color: item.isInflow ? "#16a34a" : "#dc2626", fontSize: "14px" }}>
                          {item.isInflow ? `+₺${fmtMoney(item.amount)}` : `-₺${fmtMoney(item.amount)}`}
                        </b>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <b style={{ color: "#0f172a", fontFamily: "monospace" }}>₺{fmtMoney(bakiye)}</b>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {item.isInflow ? (
                          <button 
                            className="btn small secondary" 
                            onClick={() => setReceiptPayment(item.rawPayment)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 8px" }}
                          >
                            <Receipt size={12} color="#2563eb" /> Makbuz Bas
                          </button>
                        ) : (
                          <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600" }}>
                            Gider Çıkışı
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredLedgerList.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      Bu hesap için hareket kaydı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEKME 3: GECİKEN TAKSİTLER & YAŞLANDIRMA (WHATSAPP HATIRLATMA) */}
      {activeTab === "gecikenler" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                className={`btn small ${agingFilter === "all" ? "" : "secondary"}`}
                onClick={() => setAgingFilter("all")}
              >
                Tüm Gecikenler ({overdueStudents.length})
              </button>
              <button 
                className={`btn small ${agingFilter === "1-30" ? "" : "secondary"}`}
                onClick={() => setAgingFilter("1-30")}
                style={{ color: "#ca8a04" }}
              >
                1 - 30 Gün ({agingSummary.c1_30.count})
              </button>
              <button 
                className={`btn small ${agingFilter === "31-60" ? "" : "secondary"}`}
                onClick={() => setAgingFilter("31-60")}
                style={{ color: "#ea580c" }}
              >
                31 - 60 Gün ({agingSummary.c31_60.count})
              </button>
              <button 
                className={`btn small ${agingFilter === "60+" ? "" : "secondary"}`}
                onClick={() => setAgingFilter("60+")}
                style={{ color: "#dc2626" }}
              >
                60+ Gün Kritik ({agingSummary.c60plus.count})
              </button>
            </div>

            <div className="top-search" style={{ width: "260px", margin: 0 }}>
              <Search size={14} />
              <input 
                placeholder="Öğrenci veya veli ara..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: "12px" }}
              />
            </div>
          </div>

          {/* Geciken Taksitler Tablosu (Responsive Yatay Kaydırma) */}
          <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "#fef2f2" }}>
                  <th>Öğrenci Adı Soyadı</th>
                  <th>Şube / Sınıf</th>
                  <th>Veli & İletişim</th>
                  <th>Gecikme Süresi</th>
                  <th>Toplam Borç</th>
                  <th style={{ textAlign: "right" }}>Veliye Hatırlatma</th>
                </tr>
              </thead>
              <tbody>
                {filteredOverdueList.map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td>
                      <b style={{ color: "#0f172a", cursor: "pointer" }} onClick={() => onSelectStudent && onSelectStudent(s)}>
                        {s.student_name}
                      </b>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>#{s.student_no || "—"}</div>
                    </td>
                    <td><span style={{ color: "#475569" }}>{s.student_class || s.program || "—"}</span></td>
                    <td>
                      <div>
                        <b>{s.parent_name || "Veli"}</b>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{s.parent_phone || "—"}</div>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: s.agingCategory === "60+" ? "#fee2e2" : s.agingCategory === "31-60" ? "#ffedd5" : "#fef9c3",
                          color: s.agingCategory === "60+" ? "#991b1b" : s.agingCategory === "31-60" ? "#9a3412" : "#854d0e",
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          fontSize: "11px", 
                          fontWeight: "700"
                        }}
                      >
                        {s.daysOverdue} Gün Gecikmede
                      </span>
                    </td>
                    <td>
                      <b style={{ color: "#dc2626", fontSize: "14px" }}>
                        ₺{fmtMoney(s.remaining)}
                      </b>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button 
                          className="btn small"
                          onClick={() => sendWhatsAppReminder(s)}
                          style={{ background: "#22c55e", color: "#fff", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 8px" }}
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>
                        <button 
                          className="btn small secondary"
                          onClick={() => {
                            setPayStudentId(s.id);
                            setPayAmount(String(s.remaining));
                            setShowQuickPaymentModal(true);
                          }}
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                        >
                          Tahsil Et
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOverdueList.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      Geciken taksit ödemesi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SEKME 4: TAHSİLAT LİSTESİ & MAKBUZLAR */}
      {activeTab === "tahsilatlar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Toplam <b>{payments.length}</b> adet gerçekleşen tahsilat kaydı
            </div>
            <div className="top-search" style={{ width: "280px", margin: 0 }}>
              <Search size={14} />
              <input 
                placeholder="Tahsilat ara..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: "12px" }}
              />
            </div>
          </div>

          {/* Tahsilatlar Tablosu (Responsive Yatay Kaydırma) */}
          <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "680px" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th>Makbuz / İşlem No</th>
                  <th>Öğrenci Adı Soyadı</th>
                  <th>Ödeme Yöntemi</th>
                  <th>Tarih</th>
                  <th>Tutar</th>
                  <th style={{ textAlign: "right" }}>Makbuz İşlemi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPaymentsList.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td>
                      <b style={{ color: "#2563eb", fontFamily: "monospace" }}>
                        #{p.id ? String(p.id).slice(0, 8).toUpperCase() : `MKB-${idx+1}`}
                      </b>
                    </td>
                    <td>
                      <b style={{ color: "#0f172a" }}>{p.student_name || "Öğrenci"}</b>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "6px", fontSize: "11px" }}>
                        {p.method || "Nakit"} {p.bank ? `· ${p.bank}` : ""}
                      </span>
                    </td>
                    <td>{p.payment_date ? p.payment_date.slice(0, 10) : "2026-10-02"}</td>
                    <td>
                      <b style={{ color: "#16a34a", fontSize: "14px" }}>
                        ₺{fmtMoney(p.amount)}
                      </b>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button 
                        className="btn small secondary" 
                        onClick={() => setReceiptPayment(p)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 10px" }}
                      >
                        <Receipt size={13} color="#2563eb" /> Resmi Makbuz Yazdır
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SEKME 5: KURUM GİDERLERİ */}
      {activeTab === "giderler" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Kurum Gider Defteri</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>Kira, personel maaşları, enerji ve hesap bazlı gider çıkışları</p>
            </div>
            <button className="btn small" onClick={() => setShowExpenseModal(true)} style={{ background: "#ef4444", color: "#fff" }}>
              <Plus size={14} /> Yeni Gider Ekle
            </button>
          </div>

          <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "600px" }}>
              <thead>
                <tr style={{ background: "#fef2f2" }}>
                  <th>Tarih</th>
                  <th>Gider Başlığı</th>
                  <th>Kategori</th>
                  <th>Ödenen Hesap</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, idx) => (
                  <tr key={e.id || idx}>
                    <td>{e.expense_date ? e.expense_date.slice(0, 10) : "2026-10-02"}</td>
                    <td><b>{e.title}</b></td>
                    <td><span className="badge" style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "11px" }}>{e.category || "Genel"}</span></td>
                    <td><span className="badge" style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600" }}>{e.account || "Nakit Ana Kasa"}</span></td>
                    <td><b style={{ color: "#dc2626" }}>-₺{fmtMoney(e.amount)}</b></td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      Henüz kaydedilmiş gider bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SEKME 6: MATBU SENET (BONO) SÜİTİ */}
      {activeTab === "senetler" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "700" }}>Matbu Senet (Bono) Yazdırma Merkezi</h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Öğrencilerin taksit planına göre yasal Türk Ticaret Kanunu uyumlu A4/A5 resmi senetlerini yazdırabilirsiniz.
            </p>
          </div>

          <div className="table-responsive" style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%", margin: 0, fontSize: "13px", minWidth: "640px" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th>Öğrenci Adı Soyadı</th>
                  <th>Veli (Borçlu)</th>
                  <th>Taksit Sayısı</th>
                  <th>Net Sözleşme Tutarı</th>
                  <th style={{ textAlign: "right" }}>Senet İşlemi</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 30).map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.student_name}</b></td>
                    <td>{s.parent_name || "—"}</td>
                    <td>{s.installment_count || 1} Taksit</td>
                    <td><b>₺{fmtMoney(getEffectiveTotalFee(s))}</b></td>
                    <td style={{ textAlign: "right" }}>
                      <button 
                        className="btn small secondary" 
                        onClick={() => setPromissoryStudent(s)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "4px 10px" }}
                      >
                        <FileText size={13} color="#7c3aed" /> Matbu Senetleri Yazdır
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: RESMİ TAHSİLAT MAKBUZU */}
      {receiptPayment && (
        <ReceiptModal 
          payment={receiptPayment}
          student={students.find(s => s.id === receiptPayment.student_id)}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* MODAL 2: RESMİ MATBU SENET (BONO) */}
      {promissoryStudent && (
        <PromissoryNoteModal 
          student={promissoryStudent}
          onClose={() => setPromissoryStudent(null)}
        />
      )}

      {/* MODAL 3: HIZLI TAHSİLAT AL & MAKBUZ KES */}
      {showQuickPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowQuickPaymentModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "520px", width: "95vw" }}>
            <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Hızlı Tahsilat Girişi & Makbuz</h2>
              <button className="icon-btn" onClick={() => setShowQuickPaymentModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePayment} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Öğrenci Seçin:</label>
                <select 
                  value={payStudentId} 
                  onChange={e => setPayStudentId(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                  required
                >
                  <option value="">Öğrenci Seçiniz...</option>
                  {students.map(s => {
                    const eff = getEffectiveTotalFee(s);
                    const paid = Number(s.paid_amount || 0);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.student_name} (#{s.student_no}) - Kalan: ₺{fmtMoney(Math.max(0, eff - paid))}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Tahsilat Tutarı (TL):</label>
                <input 
                  type="number"
                  placeholder="Örn: 5000"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Ödeme Yöntemi:</label>
                <select 
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                >
                  <option value="Nakit">Nakit (Ana Kasa)</option>
                  <option value="Banka Havale / EFT">Banka Havale / EFT</option>
                  <option value="POS / Kredi Kartı">POS / Kredi Kartı</option>
                  <option value="Senet">Senet / Çek</option>
                </select>
              </div>

              {payMethod === "Banka Havale / EFT" && (
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Giriş Yapılacak Banka Hesabı:</label>
                  <select 
                    value={payBank}
                    onChange={e => setPayBank(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                  >
                    <option value="T.C. VAKIFLAR BANKASI İNEGÖL ŞB.">T.C. VAKIFLAR BANKASI İNEGÖL ŞB. (TR04...)</option>
                    <option value="T.C. HALKBANK İNEGÖL ŞB.">T.C. HALKBANK İNEGÖL ŞB. (TR87...)</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Açıklama / Dekont Notu:</label>
                <input 
                  type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" className="btn secondary" onClick={() => setShowQuickPaymentModal(false)}>İptal</button>
                <button type="submit" className="btn" disabled={payLoading} style={{ background: "#16a34a", color: "#fff" }}>
                  {payLoading ? "Kaydediliyor..." : "Tahsilatı Kaydet & Makbuz Aç"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: GİDER EKLE (GAP-3: Hesap Seçimi ile Kasa Düşüşü) */}
      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px", width: "95vw" }}>
            <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Kurum Gideri Ekle</h2>
              <button className="icon-btn" onClick={() => setShowExpenseModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveExpense} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Gider Başlığı:</label>
                <input 
                  type="text"
                  placeholder="Örn: Derslik 1 Klima Bakımı"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Tutar (TL):</label>
                <input 
                  type="number"
                  placeholder="Örn: 2500"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Ödenecek Hesap / Kasa (GAP-3):</label>
                <select 
                  value={expAccount} 
                  onChange={e => setExpAccount(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                >
                  <option value="Nakit Ana Kasa">Nakit Ana Kasa (Elden)</option>
                  <option value="T.C. VAKIFLAR BANKASI İNEGÖL ŞB.">T.C. VAKIFLAR BANKASI İNEGÖL ŞB. (TR04...)</option>
                  <option value="T.C. HALKBANK İNEGÖL ŞB.">T.C. HALKBANK İNEGÖL ŞB. (TR87...)</option>
                  <option value="POS / Şirket Kredi Kartı">POS / Şirket Kredi Kartı</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Kategori:</label>
                <select 
                  value={expCategory} 
                  onChange={e => setExpCategory(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                >
                  <option value="Kira">Kira</option>
                  <option value="Maaş / Eğitmen">Maaş / Eğitmen Ücreti</option>
                  <option value="Kırtasiye / Yayın">Kırtasiye / Deneme Sınavı Yayını</option>
                  <option value="Elektrik / Isınma">Elektrik / Su / Isınma</option>
                  <option value="Reklam / Tanıtım">Reklam / Sosyal Medya</option>
                  <option value="Genel">Diğer Genel Giderler</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Gider Tarihi:</label>
                <input 
                  type="date"
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowExpenseModal(false)}>İptal</button>
                <button type="submit" className="btn" style={{ background: "#ef4444", color: "#fff" }}>Gideri Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
