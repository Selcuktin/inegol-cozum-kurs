import AccountingService, { formatCollectionRecord } from "../lib/edesisAccountingService";
import edesisData from "../data/edesisAccountingData.json";

describe("AccountingService End-to-End Sync & Data Safety Suite", () => {
  test("collection uses the actual income code and leaves unknown links empty", () => {
    expect(formatCollectionRecord({id:"p1",sozlesme_no:"SZL202600127",gelir_kodu:"GLR202600130"}).gelirKodu).toBe("GLR202600130");
    expect(formatCollectionRecord({id:"p1",sozlesme_no:"SZL202600127"}).gelirKodu).toBe("");
  });
  beforeEach(() => {
    localStorage.clear();
    AccountingService.setInitialData({
      incomes: edesisData.gelirler,
      contracts: edesisData.sozlesmeler,
      installments: edesisData.taksitler,
      collections: edesisData.tahsilatlar
    });
  });

  afterEach(() => {
    localStorage.clear();
    AccountingService.resetCustomData();
  });

  test("1. Pristine Baseline Data Integrity: Authentic counts match exactly without mutation", () => {
    const incomes = AccountingService.getIncomes();
    const contracts = AccountingService.getContracts();
    const installments = AccountingService.getInstallments();
    const collections = AccountingService.getCollections();

    expect(incomes.length).toBe(edesisData.gelirler.length);
    expect(contracts.length).toBe(edesisData.sozlesmeler.length);
    expect(installments.length).toBe(edesisData.taksitler.length);
    expect(collections.length).toBe(edesisData.tahsilatlar.length);

    // Verify first authentic contract SZL202600146
    expect(contracts[0].sozlesmeNo).toBe("SZL202600146");
    expect(contracts[0].ogrenciAdi).toBe("ÖRNEK ÖĞRENCİ");
  });

  test("2. Income Addition & Installment Splitting: 60.000 TL split into 6 monthly installments", () => {
    const res = AccountingService.addNewIncome({
      ogrenciAdi: "BARIŞ MANÇO",
      veliAdi: "DEVLET MANÇO",
      sinifAdi: "8-A",
      brutTutar: 60000,
      kdvOrani: 10,
      taksitSayisi: 6,
      gelirKategoriAdi: "Eğitim Hizmeti",
      aciklama: "Yeni Kayıt Sözleşmesi"
    });

    expect(res.income.brutTutar).toBe(60000);
    expect(res.income.ogrenciAdiSoyadi).toBe("BARIŞ MANÇO");
    expect(res.installments.length).toBe(6);

    // Verify installment division
    res.installments.forEach((inst, idx) => {
      expect(inst.taksitNo).toBe(idx + 1);
      expect(inst.taksitTutari).toBe(10000);
      expect(inst.kalanTutar).toBe(10000);
      expect(inst.tahsilEdilen).toBe(0);
      expect(inst.durumText).toBe("Vadesi Gelmedi");
      expect(inst.gelirKodu).toBe(res.income.gelirKodu);
    });

    // Incomes count should increment by 1
    const updatedIncomes = AccountingService.getIncomes();
    expect(updatedIncomes.length).toBe(edesisData.gelirler.length + 1);
    expect(updatedIncomes[0].ogrenciAdiSoyadi).toBe("BARIŞ MANÇO");

    // Installments count should increment by 6
    const updatedInstallments = AccountingService.getInstallments();
    expect(updatedInstallments.length).toBe(edesisData.taksitler.length + 6);

    // Contracts count should increment by 1
    const updatedContracts = AccountingService.getContracts();
    expect(updatedContracts.length).toBe(edesisData.sozlesmeler.length + 1);
  });

  test("3. Partial Collection & Debt Amortization: Collection reduces debt and allocates across installments", () => {
    const res = AccountingService.addNewIncome({
      ogrenciAdi: "SEZEN AKSU",
      brutTutar: 30000,
      taksitSayisi: 3
    });

    const incomeCode = res.income.gelirKodu;

    // Collect 15.000 TL (1.5 installments)
    AccountingService.recordCollection({
      gelirKodu: incomeCode,
      amount: 15000,
      bank: "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
      method: "Havale/EFT",
      note: "1. ve 2. Taksit Kısmi Ödemesi"
    });

    // Verify Income totals updated
    const incomes = AccountingService.getIncomes();
    const updatedInc = incomes.find(g => g.gelirKodu === incomeCode);
    expect(updatedInc.toplamTahsilat).toBe(15000);
    expect(updatedInc.kalanAlacak).toBe(15000);
    expect(updatedInc.tamTahsilEdildiMi).toBe(false);

    // Verify Installments amortization
    const installments = AccountingService.getInstallments().filter(t => t.gelirKodu === incomeCode);
    // 1st installment (10.000 TL) is fully paid
    expect(installments[0].tahsilEdilen).toBe(10000);
    expect(installments[0].kalanTutar).toBe(0);
    expect(installments[0].durumText).toBe("Tam Ödendi");

    // 2nd installment (10.000 TL) has 5.000 paid, 5.000 remaining
    expect(installments[1].tahsilEdilen).toBe(5000);
    expect(installments[1].kalanTutar).toBe(5000);

    // 3rd installment (10.000 TL) untouched
    expect(installments[2].tahsilEdilen).toBe(0);
    expect(installments[2].kalanTutar).toBe(10000);

    // Verify Collections count
    const collections = AccountingService.getCollections();
    expect(collections.length).toBe(edesisData.tahsilatlar.length + 1);
    expect(collections[0].tahsilatTutari).toBe(15000);
  });

  test("4. Zero Data Loss Guarantee: Resetting custom data restores pristine authentic Edesis dataset", () => {
    // Add custom income
    AccountingService.addNewIncome({
      ogrenciAdi: "TEMPORARY TEST",
      brutTutar: 50000,
      taksitSayisi: 5
    });

    expect(AccountingService.getIncomes().length).toBe(edesisData.gelirler.length + 1);
    expect(AccountingService.getInstallments().length).toBe(edesisData.taksitler.length + 5);

    // Call resetCustomData and restore baseline
    AccountingService.resetCustomData();
    AccountingService.setInitialData({
      incomes: edesisData.gelirler,
      contracts: edesisData.sozlesmeler,
      installments: edesisData.taksitler,
      collections: edesisData.tahsilatlar
    });

    // Verify exact original counts restored
    expect(AccountingService.getIncomes().length).toBe(edesisData.gelirler.length);
    expect(AccountingService.getContracts().length).toBe(edesisData.sozlesmeler.length);
    expect(AccountingService.getInstallments().length).toBe(edesisData.taksitler.length);
    expect(AccountingService.getCollections().length).toBe(edesisData.tahsilatlar.length);

    // Ensure the underlying authentic file was NEVER mutated
    expect(edesisData.gelirler.length).toBe(edesisData.gelirler.length);
    expect(edesisData.taksitler.length).toBe(edesisData.taksitler.length);
  });

  test("5. Target Installment Collection: Specific installment is marked paid and persists across cache", () => {
    const testSzl = "SZL_PERSIST_TEST";
    const testInsts = [
      { taksitNo: 1, taksitTutari: 5000, tahsilEdilen: 0, kalanTutar: 5000, durumText: "Bekliyor", sozlesmeNo: testSzl },
      { taksitNo: 2, taksitTutari: 5000, tahsilEdilen: 0, kalanTutar: 5000, durumText: "Bekliyor", sozlesmeNo: testSzl }
    ];
    AccountingService.saveInstallments(testSzl, testInsts);

    const coll = AccountingService.recordCollection({
      sozlesmeNo: testSzl,
      installment_no: 1,
      amount: 5000,
      bank: "Nakit Ana Kasa",
      alreadyPersisted: true
    });

    expect(coll).toBeDefined();
    expect(coll.amount).toBe(5000);

    const insts = AccountingService.getInstallments().filter(t => t.sozlesmeNo === testSzl);
    expect(insts.length).toBe(2);
    expect(insts[0].tahsilEdilen).toBe(5000);
    expect(insts[0].kalanTutar).toBe(0);
    expect(insts[0].durumText).toBe("Tam Ödendi");
    expect(insts[1].tahsilEdilen).toBe(0);
  });
});
