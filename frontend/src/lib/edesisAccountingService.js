import edesisData from "../data/edesisAccountingData.json";

const STORAGE_KEYS = {
  CUSTOM_INCOMES: "cozum_custom_incomes_v1",
  CUSTOM_CONTRACTS: "cozum_custom_contracts_v1",
  CUSTOM_INSTALLMENTS: "cozum_custom_installments_v1",
  CUSTOM_COLLECTIONS: "cozum_custom_collections_v1",
  INCOME_OVERRIDES: "cozum_income_overrides_v1",
  INSTALLMENT_OVERRIDES: "cozum_installment_overrides_v1",
  CONTRACT_OVERRIDES: "cozum_contract_overrides_v1",
  DELETED_CONTRACTS: "cozum_deleted_contracts_v1",
  DELETED_INCOMES: "cozum_deleted_incomes_v1"
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

export function trNorm(str) {
  if (str == null) return "";
  return String(str)
    .trim()
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toLocaleUpperCase("tr-TR")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ");
}

export const AccountingService = {
  getDeletedContracts() {
    return readStorage(STORAGE_KEYS.DELETED_CONTRACTS, []);
  },

  getDeletedIncomes() {
    return readStorage(STORAGE_KEYS.DELETED_INCOMES, []);
  },

  isContractDeleted(contractOrNo) {
    if (!contractOrNo) return false;
    const deleted = this.getDeletedContracts();
    if (!deleted || deleted.length === 0) return false;
    const delSet = new Set(deleted.map(k => trNorm(k)));
    if (typeof contractOrNo === "string" || typeof contractOrNo === "number") {
      return delSet.has(trNorm(contractOrNo));
    }
    const szl = trNorm(contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no);
    if (szl && delSet.has(szl)) return true;
    const id = trNorm(contractOrNo.id);
    if (id && delSet.has(id)) return true;
    const ogrenciId = trNorm(contractOrNo.ogrenciId);
    if (ogrenciId && delSet.has(ogrenciId)) return true;
    const ogrenciNo = trNorm(contractOrNo.ogrenciNo || contractOrNo.student_no);
    if (ogrenciNo && delSet.has(ogrenciNo)) return true;
    const name1 = trNorm(contractOrNo.ogrenciAdi);
    if (name1 && delSet.has(name1)) return true;
    const name2 = trNorm(contractOrNo.ogrenciAdiSoyadi);
    if (name2 && delSet.has(name2)) return true;
    const name3 = trNorm(contractOrNo.student_name);
    if (name3 && delSet.has(name3)) return true;
    const name4 = trNorm(contractOrNo.musteriUnvan);
    if (name4 && delSet.has(name4)) return true;
    return false;
  },

  isIncomeDeleted(incomeOrCode) {
    if (!incomeOrCode) return false;
    const deletedIncomes = this.getDeletedIncomes();
    const deletedContracts = this.getDeletedContracts();
    if ((!deletedIncomes || deletedIncomes.length === 0) && (!deletedContracts || deletedContracts.length === 0)) return false;
    const delSet = new Set([
      ...deletedIncomes.map(k => trNorm(k)),
      ...deletedContracts.map(k => trNorm(k))
    ]);
    if (typeof incomeOrCode === "string" || typeof incomeOrCode === "number") {
      return delSet.has(trNorm(incomeOrCode));
    }
    const glr = trNorm(incomeOrCode.gelirKodu || incomeOrCode.gelir_kodu);
    if (glr && delSet.has(glr)) return true;
    const szl = trNorm(incomeOrCode.sozlesmeNo || incomeOrCode.sozlesme_no);
    if (szl && delSet.has(szl)) return true;
    const id = trNorm(incomeOrCode.id);
    if (id && delSet.has(id)) return true;
    const name1 = trNorm(incomeOrCode.ogrenciAdi);
    if (name1 && delSet.has(name1)) return true;
    const name2 = trNorm(incomeOrCode.ogrenciAdiSoyadi);
    if (name2 && delSet.has(name2)) return true;
    const name3 = trNorm(incomeOrCode.student_name);
    if (name3 && delSet.has(name3)) return true;
    const name4 = trNorm(incomeOrCode.musteriUnvan);
    if (name4 && delSet.has(name4)) return true;
    return false;
  },

  // 1. Get all incomes (authentic base + custom additions + payment overrides applied - deleted)
  getIncomes(remoteStudents = []) {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_INCOMES, []);
    const overrides = readStorage(STORAGE_KEYS.INCOME_OVERRIDES, {});
    const base = edesisData.gelirler || [];

    const list = [...custom, ...base];
    const existingGlr = new Set(list.map(g => trNorm(g.gelirKodu)));
    const existingSzl = new Set(list.map(g => trNorm(g.sozlesmeNo)));
    const existingNames = new Set(list.map(g => trNorm(g.ogrenciAdiSoyadi || g.musteriUnvan)));

    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      const allStudentsToInspect = [...(remoteStudents || []), ...customStudents];

      allStudentsToInspect.forEach((cs) => {
        if (!cs) return;
        const sName = trNorm(cs.student_name);
        if (!sName) return;
        if (cs.contract_deleted) return;
        if (this.isIncomeDeleted(cs) || this.isContractDeleted(cs)) return;

        const fee = Number(cs.total_fee || 0);
        let extraSum = 0;
        try {
          const extras = typeof cs.extra_fees === "string" ? JSON.parse(cs.extra_fees || "{}") : (cs.extra_fees || {});
          extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
        } catch {}
        const disc = Number(cs.discount_amount || 0);
        const gross = Math.max(0, fee + extraSum - disc);

        if (gross <= 0 && !cs.has_contract && !cs.sozlesme_no) return;
        if (existingNames.has(sName)) return;

        const stableDigits = String(cs.student_no || cs.student_tc || cs.id || sName).replace(/\D/g, "");
        const numPart = stableDigits ? stableDigits.padStart(5, "0").slice(-5) : "00155";
        const cleanSzl = cs.sozlesme_no || `SZL2026${numPart}`;
        if (existingSzl.has(trNorm(cleanSzl)) || this.isContractDeleted(cleanSzl)) return;

        const cleanGlr = cs.gelir_kodu || `GLR2026${numPart}`;
        if (existingGlr.has(trNorm(cleanGlr)) || this.isIncomeDeleted(cleanGlr)) return;

        existingNames.add(sName);
        existingSzl.add(trNorm(cleanSzl));
        existingGlr.add(trNorm(cleanGlr));

        const inst = Math.max(1, Number(cs.installment_count) || 8);
        const net = Math.round((gross / 1.1) * 100) / 100;
        const vat = Math.round((gross - net) * 100) / 100;
        const parentName = cs.parent_name && cs.parent_name !== "Belirtilmedi" ? cs.parent_name : sName;
        const paid = Number(cs.paid_amount || 0);
        const remaining = Math.max(0, gross - paid);
        const rawDate = cs.created_at || new Date().toISOString();
        const dateStr = String(rawDate).includes("T") ? String(rawDate) : String(rawDate).replace(" ", "T");

        list.push({
          id: cs.id || `inc-${cleanGlr}`,
          gelirKodu: cleanGlr,
          sozlesmeNo: cleanSzl,
          aciklama: `Sözleşme: ${cleanSzl}`,
          netTutar: net,
          kdvOrani: 10,
          kdvTutari: vat,
          brutTutar: gross,
          gelirTarihi: dateStr,
          vadeTarihi: cs.due_date ? (String(cs.due_date).includes("T") ? String(cs.due_date) : String(cs.due_date).replace(" ", "T")) : dateStr,
          donemId: cs.donem_id || 113,
          donemAdi: cs.donem_adi || "2026-2027",
          muH_GelirKategoriId: 87,
          gelirKategoriAdi: "Öğrenci Sözleşmesi",
          musteriUnvan: parentName,
          musteriTuru: 2,
          toplamTahsilat: paid,
          kalanAlacak: remaining,
          tamTahsilEdildiMi: remaining <= 0,
          durum: 1,
          durumText: "Enum_GelirDurumu_1",
          taksitliMi: inst > 1,
          taksitSayisi: inst,
          kalanTaksitSayisi: inst,
          vadesiGectiMi: false,
          gecikmeGunSayisi: 0,
          ogrenciAdiSoyadi: sName,
          sinifAdi: cs.student_class || "Genel",
          gradeAdi: (cs.student_class || "").split("-")[0] || "Genel"
        });
      });
    } catch (e) {
      console.warn("Dynamic income error:", e);
    }

    const merged = list.filter(g => !this.isIncomeDeleted(g));

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

  // 2. Get all contracts (authentic base + custom additions + remote D1 synthesis - deleted + overrides applied)
  getContracts(remoteStudents = []) {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, []);
    const base = edesisData.sozlesmeler || [];
    const list = [...custom, ...base];
    const overrides = readStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, {});

    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      const allStudentsToInspect = [...(remoteStudents || []), ...customStudents];
      const existingNames = new Set(list.map((c) => trNorm(c.ogrenciAdi || c.ogrenciAdiSoyadi || c.musteriUnvan)));
      const existingNos = new Set(list.map((c) => trNorm(c.sozlesmeNo)));

      allStudentsToInspect.forEach((cs) => {
        if (!cs) return;
        const sName = trNorm(cs.student_name);
        if (!sName) return;
        if (cs.contract_deleted) return;
        if (this.isContractDeleted(cs) || this.isIncomeDeleted(cs)) return;

        const fee = Number(cs.total_fee || 0);
        let extraSum = 0;
        try {
          const extras = typeof cs.extra_fees === "string" ? JSON.parse(cs.extra_fees || "{}") : (cs.extra_fees || {});
          extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
        } catch {}
        const disc = Number(cs.discount_amount || 0);
        const gross = Math.max(0, fee + extraSum - disc);

        if (gross <= 0 && !cs.has_contract && !cs.sozlesme_no) return;
        if (existingNames.has(sName) || (cs.sozlesme_no && existingNos.has(trNorm(cs.sozlesme_no)))) {
          return;
        }

        const stableDigits = String(cs.student_no || cs.student_tc || cs.id || sName).replace(/\D/g, "");
        const numPart = stableDigits ? stableDigits.padStart(5, "0").slice(-5) : "00155";
        const cleanNo = cs.sozlesme_no || `SZL2026${numPart}`;
        if (this.isContractDeleted(cleanNo)) return;

        existingNames.add(sName);
        existingNos.add(trNorm(cleanNo));

        const inst = Math.max(1, Number(cs.installment_count) || 8);
        const net = Math.round((gross / 1.1) * 100) / 100;
        const vat = Math.round((gross - net) * 100) / 100;
        const parentName = cs.parent_name && cs.parent_name !== "Belirtilmedi" ? cs.parent_name : sName;
        const rawDate = cs.created_at || new Date().toISOString();
        const dateStr = String(rawDate).includes("T") ? String(rawDate) : String(rawDate).replace(" ", "T");

        list.push({
          id: cs.id || `szl-${cleanNo}`,
          sozlesmeNo: cleanNo,
          sozlesmeTarihi: dateStr,
          tarih: dateStr,
          musteriUnvan: parentName,
          ogrenciAdi: sName,
          ogrenciNo: cs.student_no || "",
          donemId: cs.donem_id || 113,
          donemAdi: cs.donem_adi || "2026-2027",
          sinifAdi: cs.student_class || "Genel",
          netTutar: net,
          kdvTutari: vat,
          brutTutar: gross,
          odemeTuru: inst > 1 ? 1 : 2,
          odemeTuruText: inst > 1 ? `Taksitli (${inst} Taksit)` : "Peşin / Tek Çekim",
          taksitSayisi: inst,
          imzaDurumu: "İmzalandı",
          isSigned: true,
          durum: 1,
          durumText: "Aktif",
          durumRenk: "success",
          silinebilirMi: true
        });
      });
    } catch (e) {
      console.warn("Dynamic contract error:", e);
    }

    // Filter out deleted contracts
    const activeList = list.filter(c => !this.isContractDeleted(c));

    // Apply overrides (e.g. cancellations)
    return activeList.map(c => {
      const ov = (c.sozlesmeNo && overrides[c.sozlesmeNo]) || (c.id && overrides[c.id]);
      if (ov) {
        return { ...c, ...ov };
      }
      return c;
    });
  },

  // 3. Get all installments (authentic base + custom additions + remote D1 synthesis - deleted + payment overrides)
  getInstallments(remoteStudents = []) {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, []);
    const overrides = readStorage(STORAGE_KEYS.INSTALLMENT_OVERRIDES, {});
    const base = edesisData.taksitler || [];

    const list = [...custom, ...base];
    const existingNames = new Set(list.map(t => trNorm(t.ogrenciAdiSoyadi || t.musteriUnvan)));
    const existingSzl = new Set(list.map(t => trNorm(t.sozlesmeNo)));

    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      const allStudentsToInspect = [...(remoteStudents || []), ...customStudents];

      allStudentsToInspect.forEach((cs) => {
        if (!cs) return;
        const sName = trNorm(cs.student_name);
        if (!sName) return;
        if (cs.contract_deleted) return;
        if (this.isContractDeleted(cs) || this.isIncomeDeleted(cs)) return;

        const fee = Number(cs.total_fee || 0);
        let extraSum = 0;
        try {
          const extras = typeof cs.extra_fees === "string" ? JSON.parse(cs.extra_fees || "{}") : (cs.extra_fees || {});
          extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
        } catch {}
        const disc = Number(cs.discount_amount || 0);
        const gross = Math.max(0, fee + extraSum - disc);

        if (gross <= 0 && !cs.has_contract && !cs.sozlesme_no) return;
        if (existingNames.has(sName)) return;

        const stableDigits = String(cs.student_no || cs.student_tc || cs.id || sName).replace(/\D/g, "");
        const numPart = stableDigits ? stableDigits.padStart(5, "0").slice(-5) : "00155";
        const cleanSzl = cs.sozlesme_no || `SZL2026${numPart}`;
        if (existingSzl.has(trNorm(cleanSzl)) || this.isContractDeleted(cleanSzl)) return;

        const cleanGlr = cs.gelir_kodu || `GLR2026${numPart}`;
        if (this.isIncomeDeleted(cleanGlr)) return;

        existingNames.add(sName);
        existingSzl.add(trNorm(cleanSzl));

        const inst = Math.max(1, Number(cs.installment_count) || 8);
        const parentName = cs.parent_name && cs.parent_name !== "Belirtilmedi" ? cs.parent_name : sName;
        const className = cs.student_class || "Genel";

        const perInst = Math.floor((gross / inst) * 100) / 100;
        const remainder = Math.round((gross - perInst * inst) * 100) / 100;
        const baseDate = cs.due_date ? new Date(cs.due_date) : (cs.created_at ? new Date(cs.created_at) : new Date());

        for (let i = 1; i <= inst; i++) {
          const isLast = i === inst;
          const instAmt = isLast ? Math.round((perInst + remainder) * 100) / 100 : perInst;
          const due = new Date(baseDate);
          due.setMonth(due.getMonth() + (i - 1));

          list.push({
            id: `inst-${cleanSzl}-${i}`,
            taksitNo: i,
            gelirKodu: cleanGlr,
            sozlesmeNo: cleanSzl,
            ogrenciAdiSoyadi: sName,
            musteriUnvan: parentName,
            sinifAdi: className,
            taksitTutari: instAmt,
            toplamTutar: instAmt,
            tahsilEdilen: 0,
            kalanTutar: instAmt,
            vadeTarihi: due.toISOString(),
            durum: 0,
            durumText: "Vadesi Gelmedi",
            donemId: cs.donem_id || 113,
            donemAdi: cs.donem_adi || "2026-2027",
            notlar: `${i}. Taksit`
          });
        }
      });
    } catch (e) {
      console.warn("Dynamic installments error:", e);
    }

    const merged = list.filter(t => !this.isContractDeleted(t) && !this.isIncomeDeleted(t));

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

  // 4. Get all collections (authentic base + custom collections + remote payments from D1)
  getCollections(remotePayments = []) {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_COLLECTIONS, []);
    const base = edesisData.tahsilatlar || [];

    const map = new Map();

    // 1. Base collections
    base.forEach((c) => {
      const key = c.odemeKodu || String(c.id);
      map.set(key, c);
    });

    // 2. Remote payments from D1
    (remotePayments || []).forEach((p) => {
      if (p && (p.amount || p.tahsilatTutari)) {
        const id = p.id || `pmt-${p.payment_date}-${p.amount}`;
        const code = p.odemeKodu || p.code || (String(id).startsWith("THS") ? id : `THS-${String(id).slice(-6)}`);
        const existing = map.get(code) || map.get(String(id));
        map.set(code, {
          ...(existing || {}),
          id: p.id || existing?.id || Date.now(),
          odemeKodu: code,
          gelirKodu: p.gelir_kodu || existing?.gelirKodu || "GLR202600150",
          gelirAciklama: p.note || existing?.gelirAciklama || "Taksit Tahsilatı",
          musteriUnvan: p.student_name || existing?.musteriUnvan || "Öğrenci",
          tahsilatTutari: Number(p.amount || p.tahsilatTutari || 0),
          kasaBankaAdi: p.bank || existing?.kasaBankaAdi || (p.method === "Nakit" ? "Nakit Ana Kasa" : "T.C. VAKIFLAR BANKASI İNEGÖL ŞB."),
          odemeYontemi: p.method || existing?.odemeYontemi || "Nakit",
          tahsilatTarihi: p.payment_date || p.tahsilatTarihi || existing?.tahsilatTarihi || new Date().toISOString(),
          aciklama: p.note || existing?.aciklama || "Tahsilat",
          durum: 1,
          durumText: "Tahsil Edildi"
        });
      }
    });

    // 3. Custom collections (local additions take precedence)
    custom.forEach((c) => {
      const key = c.odemeKodu || String(c.id);
      map.set(key, { ...(map.get(key) || {}), ...c });
    });

    const result = Array.from(map.values());
    result.sort((a, b) => (b.tahsilatTarihi || "").localeCompare(a.tahsilatTarihi || ""));
    return result;
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
      muH_MusteriId: 65000 + (maxNum % 1000),
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
      sozlesmeTarihi: baseDate.toISOString(),
      tarih: baseDate.toISOString(),
      musteriUnvan: parentName,
      ogrenciAdi: stName,
      donemId: 113,
      donemAdi: "2026-2027",
      sinifAdi: className,
      netTutar: net,
      kdvTutari: vat,
      brutTutar: gross,
      odemeTuru: installments > 1 ? 1 : 2,
      odemeTuruText: installments > 1 ? `Taksitli (${installments} Taksit)` : "Peşin / Tek Çekim",
      taksitSayisi: installments,
      imzaDurumu: "İmzalandı",
      isSigned: true,
      durum: 1,
      durumText: "Aktif",
      durumRenk: "success",
      silinebilirMi: true
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
  recordCollection({ gelirKodu, sozlesmeNo, amount, bank, method, note, studentName, studentId, apiBaseUrl }) {
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

    // Remote sync with Cloudflare D1
    const baseUrl = apiBaseUrl || (typeof window !== "undefined" && window.__API_BASE__) || "/api";
    if (studentId || studentName) {
      try {
        fetch(`${baseUrl}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId || "stu-" + Date.now(),
            student_name: studentName,
            amount: amt,
            method: method || "Nakit",
            bank: bank || "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
            payment_date: new Date().toISOString().slice(0, 10),
            note: note || `Tahsilat (${nextThsCode})`
          })
        }).catch((e) => console.warn("[AccountingService] Remote payment post error:", e));
      } catch (err) {
        console.warn("[AccountingService] Remote fetch error:", err);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
      window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: { action: "collection", amount: amt } }));
    }

    return newCollection;
  },

  // 7. Delete Contract persistently across refreshes and devices
  deleteContract(contractOrNo) {
    if (!contractOrNo) return false;
    const szlNo = typeof contractOrNo === "object" ? (contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no) : contractOrNo;
    const id = typeof contractOrNo === "object" ? contractOrNo.id : null;
    const targetKey = szlNo || id;

    // Fire API DELETE to D1 backend
    if (typeof fetch !== "undefined" && targetKey) {
      try {
        const apiUrl = (typeof localStorage !== "undefined" && localStorage.getItem("custom_api_url")) || "";
        const token = (typeof localStorage !== "undefined" && localStorage.getItem("session_token")) || "";
        fetch(`${apiUrl}/api/contracts/${encodeURIComponent(targetKey)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }).catch((err) => console.warn("[AccountingService] API DELETE error:", err));
      } catch (e) {}
    }

    const ogrenciId = typeof contractOrNo === "object" ? contractOrNo.ogrenciId : null;
    const ogrenciNo = typeof contractOrNo === "object" ? (contractOrNo.ogrenciNo || contractOrNo.student_no) : null;
    const studentName = typeof contractOrNo === "object" ? (contractOrNo.ogrenciAdi || contractOrNo.ogrenciAdiSoyadi || contractOrNo.student_name) : null;
    const musteriUnvan = typeof contractOrNo === "object" ? contractOrNo.musteriUnvan : null;

    // 1. Add to DELETED_CONTRACTS
    const deleted = this.getDeletedContracts();
    const newDeleted = [...deleted];
    const pushIf = (val) => {
      if (!val) return;
      const n = trNorm(val);
      if (n && !newDeleted.map(trNorm).includes(n)) {
        newDeleted.push(n);
      }
    };
    pushIf(szlNo);
    pushIf(id);
    pushIf(ogrenciId);
    pushIf(ogrenciNo);
    pushIf(studentName);
    pushIf(musteriUnvan);
    writeStorage(STORAGE_KEYS.DELETED_CONTRACTS, newDeleted);

    // 2. Remove from custom contracts storage
    const customContracts = readStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, []);
    const updatedCustom = customContracts.filter((c) => !this.isContractDeleted(c));
    writeStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, updatedCustom);

    // 3. Find and delete corresponding income
    const allIncomes = readStorage(STORAGE_KEYS.CUSTOM_INCOMES, []);
    const updatedIncomes = allIncomes.filter((g) => !this.isIncomeDeleted(g));
    writeStorage(STORAGE_KEYS.CUSTOM_INCOMES, updatedIncomes);

    // Add matching income code to DELETED_INCOMES
    const deletedIncomes = this.getDeletedIncomes();
    const newDeletedIncomes = [...deletedIncomes];
    const matchInc = (edesisData.gelirler || []).find((g) => this.isIncomeDeleted(g) || (szlNo && trNorm(g.sozlesmeNo) === trNorm(szlNo)));
    if (matchInc?.gelirKodu && !newDeletedIncomes.map(trNorm).includes(trNorm(matchInc.gelirKodu))) {
      newDeletedIncomes.push(trNorm(matchInc.gelirKodu));
    }
    writeStorage(STORAGE_KEYS.DELETED_INCOMES, newDeletedIncomes);

    // 4. Remove from custom installments
    const customInstallments = readStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, []);
    const updatedInstallments = customInstallments.filter((t) => {
      if (szlNo && trNorm(t.sozlesmeNo) === trNorm(szlNo)) return false;
      if (matchInc?.gelirKodu && trNorm(t.gelirKodu) === trNorm(matchInc.gelirKodu)) return false;
      if (this.isContractDeleted(t) || this.isIncomeDeleted(t)) return false;
      return true;
    });
    writeStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, updatedInstallments);

    // 5. Update StudentService if student had this contract
    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      const normName = studentName ? trNorm(studentName) : "";
      const updatedStudents = customStudents.map((st) => {
        const matchesName = normName && st.student_name && trNorm(st.student_name) === normName;
        const matchesSzl = szlNo && trNorm(st.sozlesme_no) === trNorm(szlNo);
        const matchesId = id && trNorm(st.id) === trNorm(id);
        if (matchesName || matchesSzl || matchesId) {
          return { ...st, has_contract: false, sozlesme_no: "", gelir_kodu: "", contract_deleted: true };
        }
        return st;
      });
      writeStorage("cozum_custom_students_v1", updatedStudents);
    } catch (e) {
      console.warn("Student contract unlink error:", e);
    }

    // 6. Dispatch events
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
      window.dispatchEvent(new CustomEvent("cozum_students_updated", { detail: { action: "contract_deleted", szlNo, studentName } }));
    }

    return true;
  },

  deleteIncome(incomeOrCode) {
    if (!incomeOrCode) return false;
    const glrCode = typeof incomeOrCode === "object" ? incomeOrCode.gelirKodu : incomeOrCode;
    const szlNo = typeof incomeOrCode === "object" ? incomeOrCode.sozlesmeNo : null;
    const id = typeof incomeOrCode === "object" ? incomeOrCode.id : null;
    const name = typeof incomeOrCode === "object" ? (incomeOrCode.ogrenciAdiSoyadi || incomeOrCode.musteriUnvan) : null;

    const deletedIncomes = this.getDeletedIncomes();
    const newDeleted = [...deletedIncomes];
    const pushIf = (val) => {
      if (!val) return;
      const n = trNorm(val);
      if (n && !newDeleted.map(trNorm).includes(n)) newDeleted.push(n);
    };
    pushIf(glrCode);
    pushIf(szlNo);
    pushIf(id);
    pushIf(name);
    writeStorage(STORAGE_KEYS.DELETED_INCOMES, newDeleted);

    if (szlNo || name) {
      this.deleteContract({ sozlesmeNo: szlNo, id, ogrenciAdi: name });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return true;
  },

  // 8. Cancel contract action with persistent reason
  cancelContract(contractOrNo, reason = "") {
    if (!contractOrNo) return false;
    const szlNo = typeof contractOrNo === "object" ? contractOrNo.sozlesmeNo : contractOrNo;
    const id = typeof contractOrNo === "object" ? contractOrNo.id : null;
    const overrides = readStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, {});
    const key = szlNo || id;
    if (key) {
      overrides[key] = {
        durum: 3,
        durumText: "İptal",
        durumRenk: "danger",
        iptalNedeni: reason || "Kullanıcı talebiyle iptal edildi",
        iptalTarihi: new Date().toISOString()
      };
      writeStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, overrides);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return true;
  },

  // 9. Sign contract action with persistent institution / parent signature
  signContract(contractOrNo, signerType = "kurum", signerName = "Kurum Yetkilisi") {
    if (!contractOrNo) return false;
    const szlNo = typeof contractOrNo === "object" ? (contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no) : contractOrNo;
    const id = typeof contractOrNo === "object" ? contractOrNo.id : null;
    const targetKey = szlNo || id;

    // Fire API POST to D1 backend
    if (typeof fetch !== "undefined" && targetKey) {
      try {
        const apiUrl = (typeof localStorage !== "undefined" && localStorage.getItem("custom_api_url")) || "";
        const token = (typeof localStorage !== "undefined" && localStorage.getItem("session_token")) || "";
        fetch(`${apiUrl}/api/contracts/${encodeURIComponent(targetKey)}/sign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ signer_type: signerType, signer_name: signerName })
        }).catch((err) => console.warn("[AccountingService] API sign error:", err));
      } catch (e) {}
    }

    // Apply contract override in local cache
    const overrides = readStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, {});
    if (targetKey) {
      overrides[targetKey] = {
        ...(overrides[targetKey] || {}),
        isSigned: true,
        kurumImzaAlindi: true,
        kurumImzalayan: signerName,
        kurumImzalayanUnvan: "Kurum Yetkilisi",
        signedAt: new Date().toISOString()
      };
      writeStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, overrides);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return true;
  },

  // 10. Reset all custom data to original authentic Edesis dump (100% data integrity safety)
  resetCustomData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
  }
};

export default AccountingService;
