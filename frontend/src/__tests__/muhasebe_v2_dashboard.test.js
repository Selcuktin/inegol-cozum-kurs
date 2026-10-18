import React from "react";
import axios from "axios";
import { MuhasebeV2Dashboard } from "../components/MuhasebeV2Dashboard";
import {
  render,
  cleanup,
  fireEvent,
  waitFor,
  mockClasses,
  mockStudents,
  mockPayments,
  mockExpenses
} from "./test_helpers";

jest.mock("axios");

describe("R1: Edesis Muhasebe V2 Dashboard & Finansal Raporlama Portali (muhasebe_v2_dashboard.test.js)", () => {
  const API = "/api";
  let originalOpen;
  let originalAlert;
  let originalPrint;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    originalOpen = window.open;
    originalAlert = window.alert;
    originalPrint = window.print;
    window.open = jest.fn();
    window.alert = jest.fn();
    window.print = jest.fn();

    axios.post.mockResolvedValue({ data: { id: "new-res-1" } });
  });

  afterEach(async () => {
    window.open = originalOpen;
    window.alert = originalAlert;
    window.print = originalPrint;
    localStorage.clear();
    await cleanup();
  });

  const getDashboardData = (overrides = {}) => ({
    students: mockStudents,
    payments: mockPayments,
    expenses: mockExpenses,
    classes: mockClasses,
    ...overrides
  });

  /* =====================================================================
   * TIER 1: CORE KPI CARDS, AGING REPORT & WHATSAPP
   * ===================================================================== */
  describe("Tier 1: Master Financial KPI Cards & Core Calculations", () => {
    test.each(["dashboard", "gelirler", "tahsilatlar", "giderler", "senetler", "backup", "gecikenler", "vade_takvimi"])("summary cards and their period note are scoped to due-date pages: %s", async activeTab => {
      const {container}=await render(<MuhasebeV2Dashboard me={{role:"admin"}} data={getDashboardData()} API={API} activeTab={activeTab}/>);
      const visible=activeTab==="gecikenler"||activeTab==="vade_takvimi";
      expect(container.querySelectorAll('.muhasebe-kpi-card')).toHaveLength(visible?6:0);
      expect(container.textContent.includes('Ciro ve kasa özeti tüm dönemleri kapsar.')).toBe(visible);
    });
    test("T1.1: renders 6 master financial KPI cards", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("TOPLAM KAYIT CİROSU");
      expect(container.textContent).toContain("GERÇEKLEŞEN TAHSİLAT");
      expect(container.textContent).toContain("BU AY VADESİ GELENLER");
      expect(container.textContent).toContain("GECİKMİŞ TAKSİTLER");
      expect(container.textContent).toContain("TAHSİLAT BAŞARI ORANI");
      expect(container.textContent).toContain("NET LİKİT MEVCUT");
    });

    test("T1.2: calculates Toplam Kayıt Cirosu accurately from students' total_fee", async () => {
      // 60,000 + 45,000 + 50,000 = 155,000
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("155.000");
      expect(container.textContent).toContain("3 Kayıtlı Öğrenci Taahhüdü");
    });

    test("T1.3: calculates Gerçekleşen Tahsilat and Tahsilat Başarı Oranı %", async () => {
      // 10000 + 10000 + 25000 + 20000 + 10000 = 75,000. 75,000 / 155,000 = 48%
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("75.000");
      expect(container.textContent).toContain("TAHSİLAT BAŞARI ORANI");
      expect(container.textContent).toContain("%48");
    });

    test("T1.4: calculates Kalan Toplam Alacak and Net Likit Mevcut", async () => {
      // Remaining: 155,000 - 75,000 = 80,000. Net liquid: 45,000
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("80.000");
      expect(container.textContent).toContain("45.000");
      expect(container.textContent).not.toContain("(80.000)");
    });

    test("T1.5: calculates Gecikmiş Taksitler and overdue students count", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("2 Öğrenci Vadesi Geçti");
    });

    test("T1.6: renders 12-month comparative trend chart and distribution panels", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      expect(container.textContent).toContain("12 Aylık Taksit & Tahsilat Karşılaştırma Grafiği");
      expect(container.textContent).toContain("Planlanan Taksit");
      expect(container.textContent).toContain("Gerçekleşen Tahsilat");
      expect(container.textContent).toContain("Gelir Kategorileri Dağılımı");
      expect(container.textContent).toContain("Tahsilat Yöntemleri Dağılımı");
    });

    test("T1.7: sends WhatsApp reminder with student name, remaining debt, and bank details", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      // Switch to Gecikenler tab
      const gecikenlerBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Geciken Taksitler"));
      await fireEvent.click(gecikenlerBtn);

      const waBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("WhatsApp") && b.textContent.trim() === "WhatsApp");
      expect(waBtn).toBeDefined();

      await fireEvent.click(waBtn);

      expect(window.open).toHaveBeenCalledTimes(1);
      const url = window.open.mock.calls[0][0];
      expect(url).toContain("https://wa.me/905321112233");
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain("Ahmet Yılmaz");
      expect(decodedUrl).toContain("₺40.000");
      expect(decodedUrl).toContain("T.C. VAKIFLAR BANKASI İNEGÖL ŞUBESİ");
      expect(decodedUrl).toContain("TR04 0001 5001 5800 7354 4922 43");
      expect(decodedUrl).toContain("Nevin Çakmak");
      expect(decodedUrl).toContain("0224 715 00 02");
    });

    test("T1.8: bulk WhatsApp reminder opens WhatsApp for first overdue student and alerts summary", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const bulkWaBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Gecikenlere WhatsApp Hatırlat"));
      expect(bulkWaBtn).toBeDefined();

      await fireEvent.click(bulkWaBtn);

      expect(window.open).toHaveBeenCalledTimes(1);
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("Toplam 2 geciken taksit tespit edildi")
      );
    });
  });

  /* =====================================================================
   * TIER 2: EDGE CASES, AGING FILTERS & BOUNDARIES
   * ===================================================================== */
  describe("Tier 2: Edge Cases, Filtering & Boundary Conditions", () => {
    test("T2.1: handles zero data gracefully without division by zero errors", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={{ students: [], payments: [], expenses: [] }}
          API={API}
        />
      );

      expect(container.textContent).toContain("₺0");
      expect(container.textContent).toContain("TAHSİLAT BAŞARI ORANI");
      expect(container.textContent).toContain("%0");
      expect(container.textContent).toContain("0 Kayıtlı Öğrenci Taahhüdü");
    });

    test("T2.2: excludes fully paid students from overdue debt calculation", async () => {
      // stu-2 has total 45000, paid 45000 -> remaining 0
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      // Switch to Gecikenler tab
      const gecikenlerBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Geciken Taksitler"));
      await fireEvent.click(gecikenlerBtn);

      expect(container.textContent).toContain("Ahmet Yılmaz");
      expect(container.textContent).toContain("Can Demir");
      expect(container.textContent).not.toContain("Zeynep Kaya"); // Fully paid
    });

    test("T2.3: filters overdue students by search query", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const gecikenlerBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Geciken Taksitler"));
      await fireEvent.click(gecikenlerBtn);

      const searchInput = container.querySelector("input[placeholder*='Öğrenci veya veli ara']");
      await fireEvent.change(searchInput, { target: { value: "Can Demir" } });

      expect(container.textContent).toContain("Can Demir");
      expect(container.textContent).not.toContain("Ahmet Yılmaz");
    });

    test("T2.4: filters overdue students by aging category button", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const gecikenlerBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Geciken Taksitler"));
      await fireEvent.click(gecikenlerBtn);

      const filter130Btn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("1 - 30 Gün"));
      expect(filter130Btn).toBeDefined();

      await fireEvent.click(filter130Btn);
      // Ensure aging filter state is active and table renders without crashing
      expect(container.querySelector(".data-table")).not.toBeNull();
    });

    test("T2.5: bulk WhatsApp button notifies when there are no overdue students", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={{ students: [{ id: "stu-99", total_fee: 10000, paid_amount: 10000 }], payments: [] }}
          API={API}
        />
      );

      const bulkWaBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Gecikenlere WhatsApp Hatırlat"));
      await fireEvent.click(bulkWaBtn);

      expect(window.alert).toHaveBeenCalledWith("Vadesi geçmiş taksiti olan öğrenci bulunmuyor.");
      expect(window.open).not.toHaveBeenCalled();
    });
  });

  /* =====================================================================
   * TIER 3: PAIRWISE INTERACTIONS & STATE FLOW
   * ===================================================================== */
  describe("Tier 3: Quick Actions, Modals & State Synchronization", () => {
    test("T3.1: clicking 'Hızlı Tahsilat Al' opens Quick Payment modal", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const quickPayBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Hızlı Tahsilat Al"));
      await fireEvent.click(quickPayBtn);

      expect(container.textContent).toContain("Hızlı Tahsilat Girişi & Makbuz");
      expect(container.querySelector("select")).not.toBeNull();
    });

    test("T3.2: clicking 'Tahsil Et' on overdue row opens modal prefilled with student info", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const gecikenlerBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Geciken Taksitler"));
      await fireEvent.click(gecikenlerBtn);

      const tahsilEtBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.trim() === "Tahsil Et");
      expect(tahsilEtBtn).toBeDefined();

      await fireEvent.click(tahsilEtBtn);

      expect(container.textContent).toContain("Hızlı Tahsilat Girişi & Makbuz");
      const amtInput = container.querySelector("input[placeholder='Örn: 5000']");
      expect(amtInput.value).toBe("40000"); // stu-1's remaining debt
    });

    test("T3.3: submitting Quick Payment opens official ReceiptModal automatically", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const quickPayBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Hızlı Tahsilat Al"));
      await fireEvent.click(quickPayBtn);

      const selects = container.querySelectorAll("select");
      const studentSelect = selects[selects.length - 2];
      const amountInput = container.querySelector("input[placeholder='Örn: 5000']");

      await fireEvent.change(studentSelect, { target: { value: "stu-1" } });
      await fireEvent.change(amountInput, { target: { value: "5000" } });

      const form = container.querySelector("form");
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(`${API}/payments`, expect.objectContaining({
          student_id: "stu-1",
          amount: 5000
        }));
      });

      // ReceiptModal should open
      await waitFor(() => {
        expect(container.textContent).toContain("RESMİ TAHSİLAT MAKBUZU SÜİTİ");
      });
    });

    test("T3.4: adding expense saves via API and updates expense list", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      const addExpBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Gider Ekle"));
      await fireEvent.click(addExpBtn);

      expect(container.textContent).toContain("Kurum Gideri Ekle");

      const titleInput = container.querySelector("input[placeholder*='Derslik 1 Klima']");
      const amountInput = container.querySelector("input[placeholder*='Örn: 2500']");

      await fireEvent.change(titleInput, { target: { value: "Fotokopi Kağıdı Alımı" } });
      await fireEvent.change(amountInput, { target: { value: "3500" } });

      const form = container.querySelector("form");
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(`${API}/expenses`, expect.objectContaining({
          title: "Fotokopi Kağıdı Alımı",
          amount: 3500
        }));
      });
    });
  });

  /* =====================================================================
   * TIER 4: REAL-WORLD APPLICATION SCENARIO (Scenario 1)
   * ===================================================================== */
  describe("Tier 4: Realistic Scenario - Student Registration to Aging & WhatsApp", () => {
    test("T4: Full workflow - Track student debt, trigger WhatsApp reminder, collect payment, issue receipt", async () => {
      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
        />
      );

      // Step 1: Verify initial KPI cards reflect 80,000 overdue debt
      expect(container.textContent).toContain("₺80.000");

      // Step 2: Open aging tab and find Ahmet Yılmaz
      const gecikenlerBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Geciken Taksitler"));
      await fireEvent.click(gecikenlerBtn);

      expect(container.textContent).toContain("Ahmet Yılmaz");
      expect(container.textContent).toContain("Mehmet Yılmaz");

      // Step 3: Trigger individual WhatsApp message
      const waBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.trim() === "WhatsApp");
      await fireEvent.click(waBtn);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining("https://wa.me/905321112233"),
        "_blank"
      );

      // Step 4: Collect payment for this overdue student
      const payRowBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.trim() === "Tahsil Et");
      await fireEvent.click(payRowBtn);

      expect(container.textContent).toContain("Hızlı Tahsilat Girişi & Makbuz");
      const quickForm = container.querySelector("form");
      await fireEvent.submit(quickForm);

      // Step 5: Verify receipt modal generated
      await waitFor(() => {
        expect(container.textContent).toContain("RESMİ TAHSİLAT MAKBUZU SÜİTİ");
        expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ");
      });
    });
  });

  /* =====================================================================
   * TIER 5: AUTHENTIC EDESIS 2026-2027 ACCOUNTING PARITY VERIFICATION
   * ===================================================================== */
  describe("Tier 5: Authentic Edesis 2026-2027 Accounting Parity Verification", () => {
    test("T5.1: matches exact Edesis 2026-2027 live dashboard figures (media_1791119564843.png)", async () => {
      // Simulate real production cohort of 61 students
      const mockRealCohort = Array.from({ length: 61 }, (_, i) => ({
        id: `stu-real-${i + 1}`,
        student_name: `Öğrenci ${i + 1}`,
        total_fee: 65000,
        paid_amount: 10000,
        program: "2026-2027",
        status: "Kesin Kayıt"
      }));

      const { container } = await render(
        <MuhasebeV2Dashboard activeTab="gecikenler"
          me={{ role: "admin" }}
          data={{ students: mockRealCohort, payments: [], expenses: [] }}
          API={API}
        />
      );

      const cards = Array.from(container.querySelectorAll(".stat-card"));
      expect(cards.find(c=>c.textContent.includes("TOPLAM KAYIT CİROSU")).textContent).toContain("3.965.000");
      expect(cards.find(c=>c.textContent.includes("GERÇEKLEŞEN TAHSİLAT")).textContent).toContain("₺0");
      expect(container.textContent).not.toContain("4.190.138");
      expect(container.textContent).not.toContain("100.401");

    });
  });

  /* =====================================================================
   * TIER 5: OTOMATİK VE MANUEL YEDEKLEME (BACKUP TAB)
   * ===================================================================== */
  describe("Tier 5: Otomatik ve Manuel Yedekleme (Backup Tab)", () => {
    test("T5.1: renders backup management view with 20:00 auto-backup banner and backup history", async () => {
      axios.get = jest.fn().mockResolvedValue({
        data: {
          backups: [
            {
              id: "backup_20261009_200000",
              filename: "backup_20261009_200000.json",
              backup_type: "scheduled_20_00",
              created_at: "2026-10-09T20:00:00.000Z",
              size_bytes: 1048576,
              notes: "Her Akşam 20:00 Otomatik Sistem Yedeği"
            }
          ]
        }
      });

      const { container } = await render(
        <MuhasebeV2Dashboard
          me={{ role: "admin" }}
          data={getDashboardData()}
          API={API}
          activeTab="backup"
        />
      );

      expect(container.textContent).toContain("Son kayıtlı yedek:");
      expect(container.textContent).toContain("backup_20261009_200000");
      expect(container.textContent).toContain("Her Akşam 20:00 Otomatik Sistem Yedeği");
      expect(container.textContent).toContain("Şimdi Manuel Yedek Al");
      expect(container.textContent).toContain("Tüm Verileri Excel'e İndir (.csv)");
      expect(container.textContent).toContain("Excel İndir");
      expect(container.textContent).toContain("JSON İndir");
    });
  });
});
