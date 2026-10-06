import edesisData from "../data/edesisAccountingData.json";

const STORAGE_KEYS = {
  CUSTOM_INCOMES: "cozum_custom_incomes_v1",
  CUSTOM_CONTRACTS: "cozum_custom_contracts_v1",
  CUSTOM_INSTALLMENTS: "cozum_custom_installments_v1",
  CUSTOM_COLLECTIONS: "cozum_custom_collections_v1",
  INCOME_OVERRIDES: "cozum_income_overrides_v1",
  INSTALLMENT_OVERRIDES: "cozum_installment_overrides_v1"
};

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed != null ? parsed : fallback;
  } catch (err) {
    console.warn(`[AccountingService] Storage read error for ${key}:`, err);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[AccountingService] Storage write error for ${key}:`, err);
  }
}

export const AccountingService = {
  // 1. Get all incomes (authentic base + custom additions + payment overrides applied)
  getIncomes() {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_INCOMES, []);
    const overrides = readStorage(STORAGE_KEYS.INCOME_OVERRIDES, {});
    const base = edesisData.gelirler || [];

    const merged = [...custom, ...base];
    return merged.map((g) => {
      const ov = overrides[g.gelirKodu];
      if (ov) {
        return {
          ...g,
          toplamTahsilat: ov.toplamTahsilat != null ? ov.toplamTahsilat : g.toplamTahsilat,
          kalanAlacak: ov.kalanAlacak != null ? ov.kalanAlacak : g.kalanAlacak,
          tamTahsilEdildiMi: (ov.kalanAlacak != null ? ov.kalanAlacak : g.kalanAlacak) <= 0
        };
      }
      return g;
    });
  },

  // 2. Get all contracts (authentic base + custom additions)
  getContracts() {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, []);
    const base = edesisData.sozlesmeler || [];
    return [...custom, ...base];
  },

  // 3. Get all installments (authentic base + custom additions + payment overrides)
  getInstallments() {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, []);
    const overrides = readStorage(STORAGE_KEYS.INSTALLMENT_OVERRIDES, {});
    const base = edesisData.taksitler || [];

    const merged = [...custom, ...base];
    return merged.map((t) => {
      const key = `${t.gelirKodu || t.sozlesmeNo}_${t.taksitNo}`;
      const ov = overrides[key];
      if (ov) {
        return {
          ...t,
          tahsilEdilen: ov.tahsilEdilen != null ? ov.tahsilEdilen : t.tahsilEdilen,
          kalanTutar: ov.kalanTutar != null ? ov.kalanTutar : t.kalanTutar,
          durumText: (ov.kalanTutar <= 0) ? "Tam Ödendi" : t.durumText
        };
      }
      return t;
    });
  },

  // 4. Get all collections (authentic base + custom collections)
  getCollections() {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_COLLECTIONS, []);
    const base = edesisData.tahsilatlar || [];
    return [...custom, ...base];
  },

  // 5. Add new income with automatic installment generation and contract creation
  addNewIncome(payload) {
    const allIncomes = this.getIncomes();
    const maxNum = allIncomes.reduce((max, g) => {
      const m = (g.gelirKodu || "").match(/GLR\d{4}(\d+)/);
      if (m) {
        const val = parseInt(m[1], 10);
        return val > max ? val : max;
      }
      return max;
    }, 152);

    const nextCode = `GLR2026${String(maxNum + 1).padStart(5, "0")}`;
    const nextSzlCode = `SZL2026${String(maxNum + 1).padStart(5, "0")}`;

    const gross = Number(payload.brutTutar) || 0;
    const vatRate = Number(payload.kdvOrani) || 10;
    const net = Math.round((gross / (1 + vatRate / 100)) * 100) / 100;
    const vat = Math.round((gross - net) * 100) / 100;
    const installments = Math.max(1, Number(payload.taksitSayisi) || 1);

    const stName = (payload.ogrenciAdi || "").trim().toUpperCase();
    const parentName = (payload.veliAdi || stName).trim().toUpperCase();
    const className = payload.sinifAdi || "Genel";
    const category = payload.gelirKategoriAdi || "Öğrenci Sözleşmesi";
    const baseDate = payload.gelirTarihi ? new Date(payload.gelirTarihi) : new Date();

    // 5.1 Create new Income record
    const newIncome = {
      id: Date.now(),
      gelirKodu: nextCode,
      aciklama: payload.aciklama || `Sözleşme: ${nextSzlCode}`,
      netTutar: net,
      kdvOrani: vatRate,
      kdvTutari: vat,
      brutTutar: gross,
      gelirTarihi: baseDate.toISOString(),
      vadeTarihi: payload.vadeTarihi ? new Date(payload.vadeTarihi).toISOString() : new Date(baseDate.getTime() + 30 * 86400000).toISOString(),
      donemId: 113,
      donemAdi: "2026-2027",
      muH_GelirKategoriId: 87,
      gelirKategoriAdi: category,
      muH_MusteriId: 65000 + Math.floor(Math.random() * 1000),
      musteriUnvan: parentName,
      musteriTuru: 2,
      toplamTahsilat: 0,
      kalanAlacak: gross,
      tamTahsilEdildiMi: false,
      durum: 1,
      durumText: "Enum_GelirDurumu_1",
      taksitliMi: installments > 1,
      taksitSayisi: installments,
      kalanTaksitSayisi: installments,
      vadesiGectiMi: false,
      gecikmeGunSayisi: 0,
      sozlesmeNo: nextSzlCode,
      ogrenciAdiSoyadi: stName,
      sinifAdi: className,
      gradeAdi: className.split("-")[0] || "Genel"
    };

    // 5.2 Split into Installments (Taksit Bölme)
    const perInst = Math.floor((gross / installments) * 100) / 100;
    const remainder = Math.round((gross - perInst * installments) * 100) / 100;
    const generatedInstallments = [];

    for (let i = 1; i <= installments; i++) {
      const isLast = i === installments;
      const instAmt = isLast ? Math.round((perInst + remainder) * 100) / 100 : perInst;

      // Set monthly due date (e.g. 30th of each following month)
      const due = new Date(baseDate);
      due.setMonth(due.getMonth() + i);
      due.setDate(Math.min(30, due.getDate()));

      generatedInstallments.push({
        id: Date.now() + i,
        taksitNo: i,
        muH_GelirV2Id: newIncome.id,
        gelirKodu: nextCode,
        sozlesmeNo: nextSzlCode,
        ogrenciAdiSoyadi: stName,
        musteriUnvan: parentName,
        sinifAdi: className,
        taksitTutari: instAmt,
        toplamTutar: instAmt,
        tahsilEdilen: 0,
        kalanTutar: instAmt,
        vadeTarihi: due.toISOString(),
        durum: 1,
        durumText: "Vadesi Gelmedi",
        iptalMi: false,
        notlar: `${i}. Taksit`
      });
    }

    // 5.3 Create Contract record
    const newContract = {
      id: Date.now() + 100,
      sozlesmeNo: nextSzlCode,
      tarih: baseDate.toISOString(),
      musteriUnvan: parentName,
      ogrenciAdi: stName,
      donemId: 113,
      donemAdi: "2026-2027",
      sinifAdi: className,
      netTutar: net,
      kdvTutari: vat,
      brutTutar: gross,
      odemeTuru: installments > 1 ? `Taksitli (${installments} Taksit)` : "Peşin / Tek Çekim",
      taksitSayisi: installments,
      imzaDurumu: "İmzalandı",
      durum: "Aktif"
    };

    // Save all to custom storage
    const customIncomes = readStorage(STORAGE_KEYS.CUSTOM_INCOMES, []);
    writeStorage(STORAGE_KEYS.CUSTOM_INCOMES, [newIncome, ...customIncomes]);

    const customInstallments = readStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, []);
    writeStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, [...generatedInstallments, ...customInstallments]);

    const customContracts = readStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, []);
    writeStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, [newContract, ...customContracts]);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    return { income: newIncome, installments: generatedInstallments, contract: newContract };
  },

  // 6. Record payment / collection and update debts
  recordCollection({ gelirKodu, sozlesmeNo, amount, bank, method, note, studentName }) {
    const amt = Number(amount) || 0;
    if (amt <= 0) return null;

    const allIncomes = this.getIncomes();
    const targetIncome = allIncomes.find((g) => g.gelirKodu === gelirKodu || (sozlesmeNo && g.sozlesmeNo === sozlesmeNo));

    const curPaid = targetIncome ? Number(targetIncome.toplamTahsilat) || 0 : 0;
    const gross = targetIncome ? Number(targetIncome.brutTutar) || amt : amt;
    const newPaid = Math.min(gross, curPaid + amt);
    const newRemaining = Math.max(0, gross - newPaid);

    // Save Income Override
    const incomeOverrides = readStorage(STORAGE_KEYS.INCOME_OVERRIDES, {});
    const key = gelirKodu || targetIncome?.gelirKodu;
    if (key) {
      incomeOverrides[key] = {
        toplamTahsilat: newPaid,
        kalanAlacak: newRemaining
      };
      writeStorage(STORAGE_KEYS.INCOME_OVERRIDES, incomeOverrides);
    }

    // Allocate payment across installments
    const allInstallments = this.getInstallments();
    const instList = allInstallments
      .filter((t) => (key && t.gelirKodu === key) || (sozlesmeNo && t.sozlesmeNo === sozlesmeNo))
      .sort((a, b) => (Number(a.taksitNo) || 0) - (Number(b.taksitNo) || 0));

    let remPay = amt;
    const instOverrides = readStorage(STORAGE_KEYS.INSTALLMENT_OVERRIDES, {});
    instList.forEach((inst) => {
      if (remPay <= 0) return;
      const instRem = Number(inst.kalanTutar) || Number(inst.taksitTutari) || 0;
      if (instRem > 0) {
        const payForInst = Math.min(remPay, instRem);
        const newInstPaid = (Number(inst.tahsilEdilen) || 0) + payForInst;
        const newInstRem = Math.max(0, instRem - payForInst);
        remPay -= payForInst;

        const instKey = `${inst.gelirKodu || inst.sozlesmeNo}_${inst.taksitNo}`;
        instOverrides[instKey] = {
          tahsilEdilen: newInstPaid,
          kalanTutar: newInstRem
        };
      }
    });
    writeStorage(STORAGE_KEYS.INSTALLMENT_OVERRIDES, instOverrides);

    // Create Collection record
    const maxCollectionNum = this.getCollections().reduce((max, c) => {
      const m = (c.odemeKodu || "").match(/THS\d{4}(\d+)/);
      if (m) {
        const val = parseInt(m[1], 10);
        return val > max ? val : max;
      }
      return max;
    }, 159);

    const nextThsCode = `THS2026${String(maxCollectionNum + 1).padStart(5, "0")}`;
    const newCollection = {
      id: Date.now(),
      odemeKodu: nextThsCode,
      gelirKodu: key || "GLR202600150",
      gelirAciklama: sozlesmeNo || targetIncome?.sozlesmeNo || "Öğrenci Sözleşmesi",
      musteriUnvan: studentName || targetIncome?.ogrenciAdiSoyadi || "ÖĞRENCİ",
      tahsilatTutari: amt,
      kasaBankaAdi: bank || "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
      odemeYontemi: method || "Nakit",
      tahsilatTarihi: new Date().toISOString(),
      aciklama: note || "Taksit Tahsilatı",
      durum: 1,
      durumText: "Tahsil Edildi"
    };

    const customCollections = readStorage(STORAGE_KEYS.CUSTOM_COLLECTIONS, []);
    writeStorage(STORAGE_KEYS.CUSTOM_COLLECTIONS, [newCollection, ...customCollections]);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    return newCollection;
  },

  // 7. Reset all custom data to original authentic Edesis dump (100% data integrity safety)
  resetCustomData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
  }
};

export default AccountingService;
