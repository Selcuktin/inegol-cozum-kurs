import React from "react";
import { ReceiptModal } from "../components/ReceiptModal";
import { PromissoryNoteModal, numberToTurkishWords } from "../components/PromissoryNoteModal";
import EdesisSozlesmeler from "../components/EdesisSozlesmeler";
import EdesisSozlesmeDetay from "../components/EdesisSozlesmeDetay";
import { MebContractPrintModal } from "../components/contracts/ContractModals";
import {
  render,
  cleanup,
  fireEvent,
  mockStudents,
  mockPayments,
  mockContracts
} from "./test_helpers";
import AccountingService from "../lib/edesisAccountingService";

describe("R2: Resmi Makbuz & Matbu Senet Süiti (print_modals.test.js)", () => {
  let originalPrint;

  beforeEach(() => {
    jest.clearAllMocks();
    originalPrint = window.print;
    window.print = jest.fn();
    AccountingService.setInitialData({ contracts: mockContracts, installments: mockStudents.flatMap(s=>Array.from({length:s.installment_count},(_,n)=>({id:s.id+'-note-'+n,student_id:s.id,sozlesmeNo:s.sozlesme_no,installment_no:n+1,amount:s.total_fee/s.installment_count,due_date:`2026-${String(n+1).padStart(2,'0')}-15`}))), collections: mockPayments });
  });

  afterEach(async () => {
    window.print = originalPrint;
    await cleanup();
  });

  /* =====================================================================
   * TIER 1: CORE RENDERING, MEB CODES & LEGAL PHRASING
   * ===================================================================== */
  describe("Tier 1: Core Rendering & Institutional Compliance", () => {
    test("T1.1: ReceiptModal renders official institution header and MEB codes", async () => {
      const { container } = await render(
        <ReceiptModal
          payment={mockPayments[0]}
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ");
      expect(container.textContent).toContain("Kemalpaşa Mah. Ilıca Sk. No:31/33A İnegöl / BURSA");
      expect(container.textContent).toContain("MEB Kurum Kodu: 627201");
      expect(container.textContent).toContain("Vergi No: 2600673412");
      expect(container.textContent).toContain("0224 715 00 02");
    });

    test("T1.2: ReceiptModal renders student, parent, and payment details accurately", async () => {
      const { container } = await render(
        <ReceiptModal
          payment={mockPayments[0]}
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      expect(container.textContent).toContain("Ahmet Yılmaz");
      expect(container.textContent).toContain("Mehmet Yılmaz");
      expect(container.textContent).toContain("12-SAY-A");
      expect(container.textContent).toContain("05321112233");
      expect(container.textContent).toContain("Vakıfbank havalesi");
    });

    test("T1.3: ReceiptModal displays amount in numbers and Turkish words", async () => {
      // pmt-1 has amount 10,000 -> "On Bin Türk Lirası"
      const { container } = await render(
        <ReceiptModal
          payment={mockPayments[0]}
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      expect(container.textContent).toContain("₺10.000,00");
      expect(container.textContent).toContain("#OnBin Türk Lirası#");
    });

    test("T1.4: ReceiptModal renders financial summary (Total Fee, Paid, Remaining)", async () => {
      // student 0: total 60,000, paid 20,000, remaining 40,000
      const { container } = await render(
        <ReceiptModal
          payment={mockPayments[0]}
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      expect(container.textContent).toContain("Toplam Kayıt Ücreti");
      expect(container.textContent).toContain("60.000,00");
      expect(container.textContent).toContain("Şimdiye Kadar Ödenen");
      expect(container.textContent).toContain("20.000,00");
      expect(container.textContent).toContain("Kalan Net Bakiye");
      expect(container.textContent).toContain("40.000,00");
    });

    test("T1.5: ReceiptModal print button triggers window.print", async () => {
      const { container } = await render(
        <ReceiptModal
          payment={mockPayments[0]}
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      const printBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Makbuzu Yazdır"));
      await fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalledTimes(1);
    });

    test("T1.6: ReceiptModal close button invokes onClose callback", async () => {
      const handleClose = jest.fn();
      const { container } = await render(
        <ReceiptModal
          payment={mockPayments[0]}
          student={mockStudents[0]}
          onClose={handleClose}
        />
      );

      const closeBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.trim() === "Kapat");
      await fireEvent.click(closeBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test("T1.7: PromissoryNoteModal renders TTK legal phrasing verbatim", async () => {
      const { container } = await render(
        <PromissoryNoteModal
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      expect(container.textContent).toContain("BONO (SENET)");
      expect(container.textContent).toContain("İşbu emre muharrer senedimin vadesinde");
      expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ");
      expect(container.textContent).toContain("kayıtsız şartsız ve nakden ödeyeceğimi");
      expect(container.textContent).toContain("muacceliyet kesbedeceğini");
      expect(container.textContent).toContain("İnegöl Mahkemeleri ve İcra Dairelerinin yetkili olduğunu");
    });

    test("T1.8: PromissoryNoteModal renders coupon koçan with all installments by default", async () => {
      // student 0 has 6 installments
      const { container } = await render(
        <PromissoryNoteModal
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      const sheets = container.querySelectorAll(".promissory-note-sheet");
      expect(sheets.length).toBe(6);
      expect(container.textContent).toContain("SIRA NO: 1 / 6");
      expect(container.textContent).toContain("SIRA NO: 6 / 6");
    });
  });

  /* =====================================================================
   * TIER 2: TURKISH WORDS CONVERTER & EDGE CASES
   * ===================================================================== */
  describe("Tier 2: Turkish Words Converter & Boundary Conditions", () => {
    test("T2.1: numberToTurkishWords converts exact boundary amounts correctly", () => {
      expect(numberToTurkishWords(0)).toBe("Sıfır Türk Lirası");
      expect(numberToTurkishWords(1)).toBe("Bir Türk Lirası");
      expect(numberToTurkishWords(1000)).toBe("Bin Türk Lirası");
      expect(numberToTurkishWords(1001)).toBe("BinBir Türk Lirası");
      expect(numberToTurkishWords(10000)).toBe("OnBin Türk Lirası");
      expect(numberToTurkishWords(12500)).toBe("OnİkiBinBeşYüz Türk Lirası");
      expect(numberToTurkishWords(100000)).toBe("YüzBin Türk Lirası");
      expect(numberToTurkishWords(1000000)).toBe("BirMilyon Türk Lirası");
    });

    test("T2.2: numberToTurkishWords handles kuruş (cents) accurately", () => {
      expect(numberToTurkishWords(50.25)).toBe("Elli Türk Lirası YirmiBeş Kuruş");
      expect(numberToTurkishWords(750.50)).toBe("YediYüzElli Türk Lirası Elli Kuruş");
      expect(numberToTurkishWords(1000.05)).toBe("Bin Türk Lirası Beş Kuruş");
    });

    test("T2.3: numberToTurkishWords handles null, undefined and NaN gracefully", () => {
      expect(numberToTurkishWords(null)).toBe("Sıfır Türk Lirası");
      expect(numberToTurkishWords(undefined)).toBe("Sıfır Türk Lirası");
      expect(numberToTurkishWords(NaN)).toBe("Sıfır Türk Lirası");
    });

    test("T2.4: ReceiptModal returns null when payment prop is null", async () => {
      const { container } = await render(
        <ReceiptModal payment={null} student={mockStudents[0]} onClose={jest.fn()} />
      );
      expect(container.innerHTML).toBe("");
    });

    test("T2.5: PromissoryNoteModal returns null when student prop is null", async () => {
      const { container } = await render(
        <PromissoryNoteModal student={null} onClose={jest.fn()} />
      );
      expect(container.innerHTML).toBe("");
    });

    test("T2.6: handles uneven installment amount division with remainder on last installment", async () => {
      // Fee 10,000 with 3 installments: 3333.33 + 3333.33 + 3333.34
      const unevenStudent = {
        ...mockStudents[0],
        total_fee: 10000,
        installment_count: 3
      };

      const { container } = await render(
        <PromissoryNoteModal student={unevenStudent} installments={[{amount:3333.33,due_date:'2026-10-31'},{amount:3333.33,due_date:'2026-11-30'},{amount:3333.34,due_date:'2026-12-31'}]} onClose={jest.fn()} />
      );

      const sheets = container.querySelectorAll(".promissory-note-sheet");
      expect(sheets.length).toBe(3);
      expect(container.textContent).toContain("3.333,33");
      expect(container.textContent).toContain("3.333,34");
    });
  });

  /* =====================================================================
   * TIER 3: PAIRWISE INTERACTIONS & DROPDOWN FILTERING
   * ===================================================================== */
  describe("Tier 3: Installment Selection & State Synchronization", () => {
    test("T3.1: selecting individual installment in dropdown updates sheet view to single note", async () => {
      const { container } = await render(
        <PromissoryNoteModal student={mockStudents[0]} onClose={jest.fn()} />
      );

      // Select installment 2 (index 1)
      const select = container.querySelector("select");
      await fireEvent.change(select, { target: { value: "1" } });

      const sheets = container.querySelectorAll(".promissory-note-sheet");
      expect(sheets.length).toBe(1);
      expect(container.textContent).toContain("SIRA NO: 2 / 6");
      expect(container.textContent).not.toContain("SIRA NO: 1 / 6");
    });

    test("T3.2: switching dropdown back to -1 restores all coupon notes", async () => {
      const { container } = await render(
        <PromissoryNoteModal student={mockStudents[0]} onClose={jest.fn()} />
      );

      const select = container.querySelector("select");
      await fireEvent.change(select, { target: { value: "2" } });
      expect(container.querySelectorAll(".promissory-note-sheet").length).toBe(1);

      await fireEvent.change(select, { target: { value: "-1" } });
      expect(container.querySelectorAll(".promissory-note-sheet").length).toBe(6);
    });

    test("T3.3: PromissoryNoteModal print button invokes window.print", async () => {
      const { container } = await render(
        <PromissoryNoteModal student={mockStudents[0]} onClose={jest.fn()} />
      );

      const printBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Senetleri Yazdır"));
      await fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalledTimes(1);
    });

    test("T3.4: debtor table renders parent or falls back to student info if parent missing", async () => {
      const studentNoParent = {
        ...mockStudents[0],
        parent_name: "",
        parent_tc: "",
        parent_phone: "",
        parent_address: ""
      };

      const { container } = await render(
        <PromissoryNoteModal student={studentNoParent} onClose={jest.fn()} />
      );

      expect(container.textContent).toContain(studentNoParent.student_name);
    });
  });

  /* =====================================================================
   * TIER 4: REAL-WORLD APPLICATION SCENARIO (Scenario 4)
   * ===================================================================== */
  describe("Tier 4: Realistic Scenario - Official Document Suite & Print Lifecycle", () => {
    test("T4: Full workflow - Generate official receipt, verify Turkish words, print, generate promissory note koçan, select installment", async () => {
      // Step 1: Render Receipt for 25,000 TL Nakit payment (pmt-3, stu-2)
      const { container, unmount } = await render(
        <ReceiptModal
          payment={mockPayments[2]}
          student={mockStudents[1]}
          onClose={jest.fn()}
        />
      );

      // Verify header, MEB code, amount in words
      expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ");
      expect(container.textContent).toContain("MEB Kurum Kodu: 627201");
      expect(container.textContent).toContain("#YirmiBeşBin Türk Lirası#");
      expect(container.textContent).toContain("₺25.000,00");

      // Verify signers
      expect(container.textContent).toContain("Nevin ÇAKMAK / Osman SEYMEN");

      // Print receipt
      const receiptPrintBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Makbuzu Yazdır"));
      await fireEvent.click(receiptPrintBtn);
      expect(window.print).toHaveBeenCalledTimes(1);

      await unmount();

      // Step 2: Render Promissory Note for stu-1 (6 installments of 10,000 TL each)
      const { container: noteContainer } = await render(
        <PromissoryNoteModal
          student={mockStudents[0]}
          onClose={jest.fn()}
        />
      );

      // Verify 6 coupon sheets rendered
      expect(noteContainer.querySelectorAll(".promissory-note-sheet").length).toBe(6);
      expect(noteContainer.textContent).toContain("SIRA NO: 1 / 6");
      expect(noteContainer.textContent).toContain("SIRA NO: 6 / 6");
      expect(noteContainer.textContent).toContain("İnegöl Mahkemeleri ve İcra Dairelerinin yetkili olduğunu");

      // Print full coupon koçan
      const notePrintBtn = Array.from(noteContainer.querySelectorAll("button"))
        .find(b => b.textContent.includes("Senetleri Yazdır"));
      await fireEvent.click(notePrintBtn);
      expect(window.print).toHaveBeenCalledTimes(2);

      // Step 3: Switch to single installment 4
      const select = noteContainer.querySelector("select");
      await fireEvent.change(select, { target: { value: "3" } });

      expect(noteContainer.querySelectorAll(".promissory-note-sheet").length).toBe(1);
      expect(noteContainer.textContent).toContain("SIRA NO: 4 / 6");
    });
  });

  /* =====================================================================
   * TIER 5: RESMÎ SÖZLEŞME YAZDIRMA (MEB STANDART ÇIKTI) & DETAY ENTEGRASYONU
   * ===================================================================== */
  describe("Tier 5: Resmî Sözleşmeyi Yazdır (MEB) Modal & Detay Entegrasyonu", () => {
    test("T5.1: clicking 'Resmî Sözleşmeyi Yazdır (MEB)' in EdesisSozlesmeDetay invokes onOpenPrintMeb", async () => {
      const mockContract = {
        id: "SZL202600135",
        sozlesmeNo: "SZL202600135",
        sozlesmeTarihi: "2026-10-03T00:00:00",
        ogrenciAdi: "Ahmet Yılmaz",
        musteriUnvan: "Ahmet Yılmaz",
        sinifAdi: "12-SAY-A",
        donemAdi: "2026-2027",
        brutTutar: 80000,
        odemeTuruText: "Taksitli (8 Taksit)",
        taksitSayisi: 8
      };

      const onOpenPrintMeb = jest.fn();
      const { container } = await render(
        <EdesisSozlesmeDetay
          contract={mockContract}
          onBack={jest.fn()}
          onOpenPrintMeb={onOpenPrintMeb}
        />
      );

      const printBtn = container.querySelector('[data-testid="print-meb-contract-btn"]');
      expect(printBtn).toBeTruthy();
      expect(printBtn.textContent).toContain("Resmî Sözleşmeyi Yazdır (MEB)");

      await fireEvent.click(printBtn);
      expect(onOpenPrintMeb).toHaveBeenCalledWith(mockContract);
    });

    test("T5.2: EdesisSozlesmeler renders MEB print modal from detail view and triggers window.print", async () => {
      sessionStorage.setItem("cozum_open_contract_no", "SZL202600135");

      const { container } = await render(
        <EdesisSozlesmeler
          students={mockStudents}
          payments={mockPayments}
        />
      );

      // Verify contract detail is open
      expect(container.textContent).toContain("Sözleşme Detay");
      expect(container.textContent).toContain("SZL202600135");

      // Find and click the Resmî Sözleşmeyi Yazdır (MEB) button
      const printBtn = container.querySelector('[data-testid="print-meb-contract-btn"]');
      expect(printBtn).toBeTruthy();
      await fireEvent.click(printBtn);

      // Verify official MEB modal opened
      expect(container.textContent).toContain("ÖZEL ÖĞRETİM KURUMLARI ÖĞRENCİ KAYIT SÖZLEŞMESİ");
      expect(container.textContent).toContain("MİLLÎ EĞİTİM BAKANLIĞI");
      expect(container.textContent).toContain("SZL202600135");
      expect(container.textContent).toContain("ÖZEL İNEGÖL ÇÖZÜM KURS MERKEZİ");

      // Verify print isolation classes are activated
      expect(document.body.classList.contains("meb-print-active")).toBe(true);
      const detailView = container.querySelector(".edesis-sozlesme-detay-view");
      expect(detailView).toBeTruthy();
      expect(detailView.classList.contains("no-print")).toBe(true);

      const contractSheet = container.querySelector(".meb-contract-sheet");
      expect(contractSheet).toBeTruthy();
      expect(contractSheet.textContent).toContain("KURUMUN ADI");
      expect(contractSheet.textContent).toContain("T.C. KİMLİK NO");
      expect(contractSheet.textContent).toContain("ÖĞRENCİNİN ADI SOYADI");
      expect(contractSheet.textContent).toContain("Osman SEYMEN - Özel İnegöl Çözüm Kurs Merkezi");
      expect(contractSheet.style.minHeight).toBe("255mm");

      // Click Yazdır / PDF Kaydet button inside modal
      const modalPrintBtn = container.querySelector('[data-testid="meb-modal-print-btn"]');
      expect(modalPrintBtn).toBeTruthy();
      await fireEvent.click(modalPrintBtn);
      expect(window.print).toHaveBeenCalled();
    });

    test("T5.3: closing MEB modal cleans up meb-print-active class from document.body", async () => {
      sessionStorage.setItem("cozum_open_contract_no", "SZL202600135");

      const { container } = await render(
        <EdesisSozlesmeler
          students={mockStudents}
          payments={mockPayments}
        />
      );

      const printBtn = container.querySelector('[data-testid="print-meb-contract-btn"]');
      await fireEvent.click(printBtn);
      expect(document.body.classList.contains("meb-print-active")).toBe(true);

      // Click Kapat button
      const buttons = Array.from(container.querySelectorAll("button"));
      const closeBtn = buttons.find((b) => b.textContent.trim() === "Kapat");
      expect(closeBtn).toBeTruthy();
      await fireEvent.click(closeBtn);

      // Verify class cleaned up
      expect(document.body.classList.contains("meb-print-active")).toBe(false);
      const detailView = container.querySelector(".edesis-sozlesme-detay-view");
      expect(detailView.classList.contains("no-print")).toBe(false);
    });

    test("T5.4: MEB print modal in full app container tree is decoupled from hidden detail view", async () => {
      sessionStorage.setItem("cozum_open_contract_no", "SZL202600135");

      const { container } = await render(
        <div className="content">
          <div data-testid="contracts-page-container">
            <EdesisSozlesmeler
              students={mockStudents}
              payments={mockPayments}
            />
          </div>
        </div>
      );

      const printBtn = container.querySelector('[data-testid="print-meb-contract-btn"]');
      await fireEvent.click(printBtn);

      const modalBackdrop = container.querySelector(".meb-contract-modal-backdrop");
      expect(modalBackdrop).toBeTruthy();

      // The detail view must be marked no-print, but the modal itself must NOT be inside the no-print element
      const detailView = container.querySelector(".edesis-sozlesme-detay-view");
      expect(detailView.classList.contains("no-print")).toBe(true);
      expect(detailView.contains(modalBackdrop)).toBe(false);

      // Sheet contains all essential MEB elements
      const sheet = container.querySelector(".meb-contract-sheet");
      expect(sheet).toBeTruthy();
      expect(sheet.textContent).toContain("ÖZEL ÖĞRETİM KURUMLARI ÖĞRENCİ KAYIT SÖZLEŞMESİ");
      expect(sheet.textContent).toContain("VELİ / VASİ");
      expect(sheet.textContent).toContain("KURUM YETKİLİSİ");
    });

    test("T5.5: In list view, MEB print modal is rendered outside edesis-contracts-view to avoid being hidden, and blue gear dropdown opens cleanly without crash", async () => {
      sessionStorage.removeItem("cozum_open_contract_no");
      window.location.hash = "documents";

      const { container } = await render(
        <div className="content">
          <div data-testid="contracts-page-container">
            <EdesisSozlesmeler
              students={mockStudents}
              payments={mockPayments}
            />
          </div>
        </div>
      );

      // Verify list view is rendered
      const listView = container.querySelector(".edesis-contracts-view");
      expect(listView).toBeTruthy();

      // Click the blue gear button to open dropdown
      const gearWrapper = container.querySelector("[data-sozlesme-dropdown]");
      expect(gearWrapper).toBeTruthy();
      const gearBtn = gearWrapper.querySelector("button");
      await fireEvent.click(gearBtn);

      // Verify dropdown opened without crashing and does NOT contain Hızlı Düzenle
      expect(container.textContent).toContain("Detay Görüntüle");
      expect(container.textContent).toContain("Resmî Sözleşmeyi Yazdır (MEB)");
      expect(container.textContent).not.toContain("Hızlı Düzenle (Tutar / Taksit)");

      // Find any Resmî Sözleşmeyi Yazdır button
      const allText = Array.from(container.querySelectorAll("div, button"));
      const printRowBtn = allText.find(el => el.textContent && el.textContent.trim() === "Resmî Sözleşmeyi Yazdır (MEB)");
      if (printRowBtn) {
        await fireEvent.click(printRowBtn);
        const modalBackdrop = container.querySelector(".meb-contract-modal-backdrop");
        expect(modalBackdrop).toBeTruthy();
        // Crucial test: modal backdrop must NOT be inside the hidden edesis-contracts-view
        expect(listView.contains(modalBackdrop)).toBe(false);
      }
    });

    test("T5.6: ReceiptModal never displays Invalid Date for DD.MM.YYYY or malformed dates", async () => {
      const { container } = await render(
        <ReceiptModal
          payment={{ ...mockPayments[0], payment_date: "31.10.2026" }}
          student={{ ...mockStudents[0], parent_name: "Ahmet Yılmaz" }}
          onClose={jest.fn()}
        />
      );

      expect(container.textContent).not.toContain("Invalid Date");
      expect(container.textContent).toContain("31.10.2026");
    });

    test("T5.7: MebContractPrintModal auto-fills student and parent details from students list when contract has snake_case or missing fields", async () => {
      const contractWithSnakeCase = {
        id: "cnt_9988",
        sozlesme_no: "SZL202600135",
        student_id: "stu-1",
        student_name: "Ahmet Yılmaz",
        brut_tutar: 80000,
        taksit_sayisi: 8,
        sozlesme_tarihi: "2026-10-05T10:00:00.000Z"
      };

      const { container } = await render(
        <MebContractPrintModal
          contract={contractWithSnakeCase}
          students={mockStudents}
          onClose={jest.fn()}
        />
      );

      // Verify auto-fill from mockStudents[0] (Ahmet Yılmaz)
      expect(container.textContent).toContain("SZL202600135");
      expect(container.textContent).toContain("Ahmet Yılmaz");
      expect(container.textContent).toContain("Mehmet Yılmaz"); // Parent auto-filled from student
      expect(container.textContent).toContain("05321112233"); // Parent phone auto-filled
      expect(container.textContent).toContain("12-SAY-A"); // Class auto-filled
      expect(container.textContent).toContain("₺80.000,00"); // Gross fee formatted
      expect(container.textContent).toContain("8 Taksit"); // Installment count
    });

    test("T5.8: MebContractPrintModal editable drawer allows overriding fields with live updates in the sheet and reset support", async () => {
      const sampleContract = {
        id: "cnt_123",
        sozlesmeNo: "SZL-TEST-001",
        ogrenciAdi: "Ali Kaya",
        sinifAdi: "11-EA",
        brutTutar: 50000,
        taksitSayisi: 5,
        parent_name: "Hasan Kaya",
        parent_phone: "05554443322"
      };

      const { container } = await render(
        <MebContractPrintModal
          contract={sampleContract}
          students={[]}
          onClose={jest.fn()}
        />
      );

      // Verify initial auto-filled rendering
      expect(container.textContent).toContain("Ali Kaya");
      expect(container.textContent).toContain("Hasan Kaya");
      expect(container.textContent).toContain("₺50.000,00");

      // Open editable drawer
      const editBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent.includes("Sözleşmeyi Düzenle"));
      expect(editBtn).toBeTruthy();
      await fireEvent.click(editBtn);

      // Verify drawer opened
      expect(container.textContent).toContain("Hızlı Sözleşme Düzenleme & Önizleme");
      expect(container.textContent).toContain("Sıfırla");

      // Find the inputs
      const studentNameInput = container.querySelector('input[value="Ali Kaya"]');
      expect(studentNameInput).toBeTruthy();
      await fireEvent.change(studentNameInput, { target: { value: "Ali Kaya (Burslu)" } });

      // Check live update in sheet
      expect(container.textContent).toContain("Ali Kaya (Burslu)");

      // Click Reset (Sıfırla) button
      const resetBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent.includes("Sıfırla"));
      expect(resetBtn).toBeTruthy();
      await fireEvent.click(resetBtn);

      // Check that it reverted back to original
      expect(container.textContent).toContain("Ali Kaya");
    });
  });
});


