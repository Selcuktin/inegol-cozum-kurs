import {
  Award, BellRing, BookOpen, Building, Calendar, CalendarCheck, FileDown,
  FileText, Folder, GraduationCap, History, LayoutDashboard, Printer, Settings,
  ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, UserCog, UserPlus, Users, Wallet
} from "lucide-react";
import { ENABLE_KASA_BANKA } from "../../lib/edesisAccountingService";

export function buildNavCategories({
  page,
  accountingTab,
  setPage,
  setAccountingTab,
  setMobileOpen,
  guardedOpen,
  setShowGlobalPromissory,
  kayitTab,
  setKayitTab,
  showGlobalOptikModal,
  showGlobalHataKarnesi,
  setShowGlobalOptikModal,
  setShowGlobalHataKarnesi
}) {
  return [
    {
      title: "KURUMSAL",
      items: [{ id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard, perm: "page_dashboard" }]
    },
    {
      title: "",
      items: [
        {
          id: "payments", label: "Muhasebe V2", icon: Wallet, perm: "page_payments", isTree: true, treeKey: "muhasebe",
          subItems: [
            {
              id: "p_dash", label: "Kontrol Paneli", icon: LayoutDashboard,
              activeCheck: () => page === "payments" && accountingTab === "dashboard",
              onClick: () => { setPage("payments"); setAccountingTab("dashboard"); setMobileOpen(false); }
            },
            {
              id: "p_gelir", label: "Gelir Yönetimi", isAccordion: true, subKey: "gelir", icon: Folder,
              children: [
                { id: "g_list", label: "Gelir Listesi", activeCheck: () => page === "gelir" || (page === "payments" && accountingTab === "gelirler"), onClick: () => { setPage("gelir"); setAccountingTab("gelirler"); setMobileOpen(false); } },
                { id: "g_szl", label: "Sözleşmeler", activeCheck: () => page === "documents", onClick: () => { try { sessionStorage.removeItem("cozum_open_contract_no"); } catch {} if (typeof window !== "undefined") window.location.hash = "documents"; setPage("documents"); setMobileOpen(false); } },
                { id: "g_vade", label: "Vade Takvimi", activeCheck: () => page === "vade" || (page === "payments" && accountingTab === "gecikenler"), onClick: () => { setPage("vade"); setMobileOpen(false); } },
                { id: "g_tahs", label: "Tahsilat Listesi", activeCheck: () => page === "tahsilat" || (page === "payments" && accountingTab === "tahsilatlar"), onClick: () => { setPage("tahsilat"); setMobileOpen(false); } },
                { id: "g_cust", label: "Müşteriler", activeCheck: () => page === "students", onClick: () => { setPage("students"); setMobileOpen(false); } }
              ]
            },
            {
              id: "p_gider", label: "Gider Yönetimi", isAccordion: true, subKey: "gider", icon: TrendingDown,
              children: [
                { id: "gid_list", label: "Gider Listesi", activeCheck: () => page === "payments" && accountingTab === "giderler", onClick: () => { setPage("payments"); setAccountingTab("giderler"); setMobileOpen(false); } },
                { id: "gid_add", label: "Yeni Gider Ekle", onClick: () => { guardedOpen("expense"); setMobileOpen(false); } }
              ]
            },
            ...(ENABLE_KASA_BANKA ? [{
              id: "p_kasa", label: "Kasa ve Banka", isAccordion: true, subKey: "kasa", icon: Building,
              children: [
                { id: "k_def", label: "Kasa Defteri", activeCheck: () => page === "payments" && accountingTab === "kasalar", onClick: () => { setPage("payments"); setAccountingTab("kasalar"); setMobileOpen(false); } },
                { id: "k_gun", label: "Kasa Raporu Yazdır", onClick: () => { window.print(); setMobileOpen(false); } },
                { id: "k_makbuz", label: "Tahsilat Makbuzu Kes", onClick: () => { guardedOpen("payment"); setMobileOpen(false); } },
                { id: "k_senet", label: "Matbu Senet (Bono) Yazdır", onClick: () => { setShowGlobalPromissory(true); setMobileOpen(false); } },
                { id: "k_bak", label: "Bakiyeler & Hesaplar", activeCheck: () => page === "payments" && accountingTab === "dashboard", onClick: () => { setPage("payments"); setAccountingTab("dashboard"); setMobileOpen(false); } },
                { id: "k_backup", label: "💾 Otomatik Yedekleme (20:00)", activeCheck: () => page === "payments" && accountingTab === "backup", onClick: () => { setPage("payments"); setAccountingTab("backup"); setMobileOpen(false); } }
              ]
            }] : [])
          ]
        }
      ]
    },
    {
      title: "",
      items: [
        {
          id: "kayit", label: "Kayıt İşlemleri", icon: Users, perm: "page_students", isTree: true, treeKey: "kayit",
          subItems: [
            { id: "k_kokpit", label: "Kayıt Kokpiti", icon: TrendingUp, activeCheck: () => page === "kayit" && kayitTab === "kokpit", onClick: () => { setPage("kayit"); setKayitTab("kokpit"); setMobileOpen(false); } },
            { id: "k_ogrenciler", label: "Öğrenciler", icon: UserPlus, activeCheck: () => page === "students", onClick: () => { setPage("students"); setMobileOpen(false); } },
            { id: "k_ogretmenler", label: "Öğretmenler & Kadro", icon: GraduationCap, activeCheck: () => page === "teachers", onClick: () => { setPage("teachers"); setMobileOpen(false); } },
            { id: "k_siniflar", label: "Sınıflar & Şubeler", icon: BookOpen, activeCheck: () => page === "classes", onClick: () => { setPage("classes"); setMobileOpen(false); } },
            { id: "k_raporlar", label: "Kayıt Raporları", icon: FileText, activeCheck: () => page === "kayit" && kayitTab === "raporlar", onClick: () => { setPage("kayit"); setKayitTab("raporlar"); setMobileOpen(false); } },
            {
              id: "k_araclar", label: "Araçlar ve Ayarlar", isAccordion: true, subKey: "kayit_araclar", icon: Settings,
              children: [
                { id: "k_sifre", label: "Geçici Şifreler (SMS)", activeCheck: () => page === "kayit" && kayitTab === "sifreler", onClick: () => { setPage("kayit"); setKayitTab("sifreler"); setMobileOpen(false); } },
                { id: "k_donem", label: "Dönem Geçiş Sihirbazı", activeCheck: () => page === "kayit" && kayitTab === "donem", onClick: () => { setPage("kayit"); setKayitTab("donem"); setMobileOpen(false); } },
                { id: "k_ayar", label: "Kayıt Ayarları", activeCheck: () => page === "kayit" && kayitTab === "ayarlar", onClick: () => { setPage("kayit"); setKayitTab("ayarlar"); setMobileOpen(false); } }
              ]
            },
            {
              id: "k_bursluluk", label: "Bursluluk ve STS Modülü", isAccordion: true, subKey: "kayit_bursluluk", icon: Award,
              children: [
                { id: "k_aday", label: "Adaylar & Ön Kayıtlar", activeCheck: () => page === "kayit" && kayitTab === "adaylar", onClick: () => { setPage("kayit"); setKayitTab("adaylar"); setMobileOpen(false); } },
                { id: "k_form", label: "Ön Kayıt Formları & Şubeler", activeCheck: () => page === "kayit" && kayitTab === "adaylar", onClick: () => { setPage("kayit"); setKayitTab("adaylar"); setMobileOpen(false); } },
                { id: "k_seans", label: "Sınav Seansları & Salonları", activeCheck: () => page === "kayit" && kayitTab === "adaylar", onClick: () => { setPage("kayit"); setKayitTab("adaylar"); setMobileOpen(false); } }
              ]
            }
          ]
        }
      ]
    },
    {
      title: "",
      items: [
        {
          id: "exams", label: "Deneme Sınavları & Karne", icon: Award, perm: "page_exams", isTree: true, treeKey: "olcme",
          subItems: [
            { id: "exams_list", label: "Deneme Sınavları Listesi", icon: Award, activeCheck: () => page === "exams" && !showGlobalOptikModal && !showGlobalHataKarnesi, onClick: () => { setPage("exams"); setMobileOpen(false); } },
            { id: "optik_omr", label: "Optik Okuma & Şablonlar (OMR)", icon: Sparkles, onClick: () => { setPage("exams"); setShowGlobalOptikModal(true); setMobileOpen(false); } },
            { id: "hata_karnesi", label: "Kazanım & Hata Karneleri", icon: Target, onClick: () => { setShowGlobalHataKarnesi(true); setMobileOpen(false); } },
            { id: "kalibrasyon", label: "Milimetrik Kalibrasyon & Baskı", icon: Printer, onClick: () => { setPage("exams"); setShowGlobalOptikModal(true); setMobileOpen(false); } }
          ]
        }
      ]
    },
    {
      title: "EĞİTİM & AKADEMİK",
      items: [
        { id: "schedules", label: "Ders Programı", icon: Calendar, perm: "page_schedules" },
        { id: "attendance", label: "Günlük Yoklama", icon: CalendarCheck, perm: "page_attendance" }
      ]
    },
    {
      title: "SİSTEM & YÖNETİM",
      items: [
        { id: "reports", label: "Aylık Muhasebe Raporu", icon: FileDown, perm: "page_reports" },
        { id: "reminders", label: "Taksit Takibi & Risk", icon: BellRing, perm: "page_reminders" },
        { id: "users", label: "Kullanıcılar & Roller", icon: UserCog, perm: "page_users" },
        { id: "audit", label: "Denetim Kaydı", icon: History, perm: "page_audit" },
        {
          id: "backup", label: "Otomatik Yedekleme (20:00)", icon: ShieldCheck, perm: "page_payments",
          activeCheck: () => page === "payments" && accountingTab === "backup",
          customAction: () => { setPage("payments"); setAccountingTab("backup"); }
        }
      ]
    }
  ];
}
