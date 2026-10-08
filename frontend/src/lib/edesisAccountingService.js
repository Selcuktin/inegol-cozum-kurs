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

  _cachedDelSets: null,

  clearDelSetsCache() {
    this._cachedDelSets = null;
  },

  // ponytail: cached in-memory Set — 0ms lookups, zero localStorage reads on renders
  _buildDelSets() {
    if (this._cachedDelSets) return this._cachedDelSets;
    const dc = readStorage(STORAGE_KEYS.DELETED_CONTRACTS, []);
    const di = readStorage(STORAGE_KEYS.DELETED_INCOMES, []);
    this._cachedDelSets = {
      delContracts: new Set(dc.map(trNorm)),
      delIncomes: new Set([...dc, ...di].map(trNorm))
    };
    return this._cachedDelSets;
  },

  _isContractDeletedFast(contractOrNo, delContracts) {
    if (!contractOrNo || delContracts.size === 0) return false;
    if (typeof contractOrNo === "string" || typeof contractOrNo === "number") {
      return delContracts.has(trNorm(contractOrNo));
    }
    if (contractOrNo.contract_deleted) return true;
    const szl = trNorm(contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no);
    if (szl && delContracts.has(szl)) return true;
    const id = trNorm(contractOrNo.id);
    if (id && delContracts.has(id)) return true;
    if (id && delContracts.has(trNorm(`szl-${id}`))) return true;
    const oid = trNorm(contractOrNo.ogrenciId || contractOrNo.studentId || contractOrNo.student_id);
    if (oid && delContracts.has(oid)) return true;
    if (oid && delContracts.has(trNorm(`szl-${oid}`))) return true;
    const on = trNorm(contractOrNo.ogrenciNo || contractOrNo.student_no);
    if (on && delContracts.has(on)) return true;
    const sName = trNorm(contractOrNo.ogrenciAdi || contractOrNo.ogrenciAdiSoyadi || contractOrNo.student_name || contractOrNo.musteriUnvan);
    if (sName && delContracts.has(sName)) return true;
    return false;
  },

  _isIncomeDeletedFast(incomeOrCode, delIncomes) {
    if (!incomeOrCode || delIncomes.size === 0) return false;
    if (typeof incomeOrCode === "string" || typeof incomeOrCode === "number") {
      return delIncomes.has(trNorm(incomeOrCode));
    }
    const glr = trNorm(incomeOrCode.gelirKodu || incomeOrCode.gelir_kodu);
    if (glr && delIncomes.has(glr)) return true;
    const szl = trNorm(incomeOrCode.sozlesmeNo || incomeOrCode.sozlesme_no);
    if (szl && delIncomes.has(szl)) return true;
    const id = trNorm(incomeOrCode.id);
    if (id && delIncomes.has(id)) return true;
    if (id && delIncomes.has(trNorm(`inc-${id}`))) return true;
    const oid = trNorm(incomeOrCode.ogrenciId || incomeOrCode.studentId || incomeOrCode.student_id);
    if (oid && delIncomes.has(oid)) return true;
    const n1 = trNorm(incomeOrCode.ogrenciAdi); if (n1 && delIncomes.has(n1)) return true;
    const n2 = trNorm(incomeOrCode.ogrenciAdiSoyadi); if (n2 && delIncomes.has(n2)) return true;
    const n3 = trNorm(incomeOrCode.student_name); if (n3 && delIncomes.has(n3)) return true;
    return false;
  },

  // Remote sync for tombstoned/deleted contracts from D1 database
  async syncDeletedWithRemote() {
    if (typeof fetch === "undefined") return [];
    try {
      const apiUrl = (typeof localStorage !== "undefined" && localStorage.getItem("custom_api_url")) || "";
      const res = await fetch(`${apiUrl}/api/contracts/deleted-keys`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && Array.isArray(data.deletedKeys) && data.deletedKeys.length > 0) {
        const localDeleted = this.getDeletedContracts();
        const merged = Array.from(new Set([...localDeleted, ...data.deletedKeys]));
        if (merged.length > localDeleted.length) {
          writeStorage(STORAGE_KEYS.DELETED_CONTRACTS, merged);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("cozum_accounting_updated"));
          }
        }
        return data.deletedKeys;
      }
    } catch (e) {
      // quiet fail
    }
    return [];
  },

  unTombstone(studentOrName, sozlesmeNo, id) {
    const rawKeys = [];
    if (typeof studentOrName === "object" && studentOrName) {
      if (studentOrName.id) rawKeys.push(studentOrName.id);
      if (studentOrName.student_name) rawKeys.push(studentOrName.student_name);
      if (studentOrName.ogrenciAdi) rawKeys.push(studentOrName.ogrenciAdi);
      if (studentOrName.ogrenciAdiSoyadi) rawKeys.push(studentOrName.ogrenciAdiSoyadi);
      if (studentOrName.student_no) rawKeys.push(studentOrName.student_no);
      if (studentOrName.student_tc) rawKeys.push(studentOrName.student_tc);
      if (studentOrName.sozlesme_no) rawKeys.push(studentOrName.sozlesme_no);
      if (studentOrName.sozlesmeNo) rawKeys.push(studentOrName.sozlesmeNo);
    } else if (studentOrName) {
      rawKeys.push(studentOrName);
    }
    if (sozlesmeNo) rawKeys.push(sozlesmeNo);
    if (id) rawKeys.push(id);

    const normKeys = new Set(rawKeys.filter(Boolean).map(trNorm));
    if (normKeys.size === 0) return;

    const delContracts = this.getDeletedContracts().filter(k => !normKeys.has(trNorm(k)));
    writeStorage(STORAGE_KEYS.DELETED_CONTRACTS, delContracts);

    const delIncomes = this.getDeletedIncomes().filter(k => !normKeys.has(trNorm(k)));
    writeStorage(STORAGE_KEYS.DELETED_INCOMES, delIncomes);

    const delStudents = readStorage("cozum_deleted_students_v1", []).filter(k => !normKeys.has(trNorm(k)));
    writeStorage("cozum_deleted_students_v1", delStudents);
    this.clearDelSetsCache();
  },

  isContractDeleted(contractOrNo) {
    if (!contractOrNo) return false;
    return this._isContractDeletedFast(contractOrNo, this._buildDelSets().delContracts);
  },

  isIncomeDeleted(incomeOrCode) {
    if (!incomeOrCode) return false;
    return this._isIncomeDeletedFast(incomeOrCode, this._buildDelSets().delIncomes);
  },

  // 1. Get all incomes (authentic base + custom additions + payment overrides applied - deleted)
  getIncomes(remoteStudents = []) {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_INCOMES, []);
    const overrides = readStorage(STORAGE_KEYS.INCOME_OVERRIDES, {});
    const base = edesisData.gelirler || [];

    const list = [...custom, ...base];
    const existingGlr = new Set(list.map(g => trNorm(g.gelirKodu)));
    const existingSzl = new Set(list.map(g => trNorm(g.sozlesmeNo)));
    const existingNames = new Set(list.map(g => trNorm(g.ogrenciAdiSoyadi || g.ogrenciAdi)));

    // ponytail: read localStorage once, reuse Sets throughout
    const { delContracts, delIncomes } = this._buildDelSets();

    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      let activeStudents = (remoteStudents && remoteStudents.length > 0) ? remoteStudents : [];
      if (activeStudents.length === 0) {
        const cachedDash = readStorage("cozum_dashboard_data_v1", null);
        if (cachedDash && Array.isArray(cachedDash.students) && cachedDash.students.length > 0) {
          activeStudents = cachedDash.students;
        }
      }
      const allStudentsToInspect = [...activeStudents, ...customStudents];

      const existingStudentIds = new Set(list.map((g) => String(g.studentId || g.student_id || g.ogrenciId || "")).filter(Boolean));
      let maxSeqGlr = 150;
      list.forEach((g) => {
        const m = (g.gelirKodu || "").match(/GLR2026(\d+)/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxSeqGlr) maxSeqGlr = val;
        }
      });

      allStudentsToInspect.forEach((cs) => {
        if (!cs) return;
        const sName = trNorm(cs.student_name);
        if (!sName) return;
        if (cs.contract_deleted) return;
        if (this._isIncomeDeletedFast(cs, delIncomes) || this._isContractDeletedFast(cs, delContracts)) return;

        if (cs.id && existingStudentIds.has(String(cs.id))) return;
        if (existingNames.has(sName)) return;
        if (cs.sozlesme_no && existingSzl.has(trNorm(cs.sozlesme_no))) return;
        if (cs.gelir_kodu && existingGlr.has(trNorm(cs.gelir_kodu))) return;

        let cleanSzl = cs.sozlesme_no;
        let cleanGlr = cs.gelir_kodu;
        if (!cleanSzl || existingSzl.has(trNorm(cleanSzl)) || this._isContractDeletedFast(cleanSzl, delContracts)) {
          maxSeqGlr++;
          while (
            existingSzl.has(trNorm(`SZL2026${String(maxSeqGlr).padStart(5, "0")}`)) ||
            this._isContractDeletedFast(`SZL2026${String(maxSeqGlr).padStart(5, "0")}`, delContracts) ||
            existingGlr.has(trNorm(`GLR2026${String(maxSeqGlr).padStart(5, "0")}`)) ||
            this._isIncomeDeletedFast(`GLR2026${String(maxSeqGlr).padStart(5, "0")}`, delIncomes)
          ) {
            maxSeqGlr++;
          }
          cleanSzl = `SZL2026${String(maxSeqGlr).padStart(5, "0")}`;
          cleanGlr = `GLR2026${String(maxSeqGlr).padStart(5, "0")}`;
        }
        if (!cleanGlr) {
          const numPart = cleanSzl.replace(/\D/g, "").slice(-5) || "00155";
          cleanGlr = `GLR2026${numPart}`;
        }
        if (this._isContractDeletedFast(cleanSzl, delContracts) || this._isIncomeDeletedFast(cleanGlr, delIncomes)) return;

        existingNames.add(sName);
        existingSzl.add(trNorm(cleanSzl));
        existingGlr.add(trNorm(cleanGlr));
        if (cs.id) existingStudentIds.add(String(cs.id));

        const fee = Number(cs.total_fee || 0);
        let extraSum = 0;
        try {
          const extras = typeof cs.extra_fees === "string" ? JSON.parse(cs.extra_fees || "{}") : (cs.extra_fees || {});
          extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
        } catch {}
        const disc = Number(cs.discount_amount || 0);
        const gross = Math.max(0, fee + extraSum - disc) || fee || 75000;

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
          donemId: cs.donem_id || (cs.program === "2025-2026" ? 40 : cs.program === "2026-2027-YAZ" ? 142 : 113),
          donemAdi: cs.donem_adi || (cs.program === "2025-2026" ? "2025-2026" : cs.program === "2026-2027-YAZ" ? "2026-2027-YAZ" : "2026-2027"),
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
          ogrenciAdiSoyadi: cs.student_name ? cs.student_name.trim() : sName,
          sinifAdi: cs.student_class || "Genel",
          gradeAdi: (cs.student_class || "").split("-")[0] || "Genel"
        });
      });
    } catch (e) {
      console.warn("Dynamic income error:", e);
    }

    const merged = list.filter(g => !this._isIncomeDeletedFast(g, delIncomes));

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

  buildSyntheticContractForStudent(cs) {
    if (!cs) return null;
    const sName = trNorm(cs.student_name);
    const fee = Number(cs.total_fee || 0);
    let extraSum = 0;
    try {
      const extras = typeof cs.extra_fees === "string" ? JSON.parse(cs.extra_fees || "{}") : (cs.extra_fees || {});
      extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
    } catch {}
    const disc = Number(cs.discount_amount || 0);
    const gross = Math.max(0, fee + extraSum - disc) || fee || 75000;
    const inst = Math.max(1, Number(cs.installment_count) || 10);
    const net = Math.round((gross / 1.1) * 100) / 100;
    const vat = Math.round((gross - net) * 100) / 100;
    const parentName = cs.parent_name && cs.parent_name !== "Belirtilmedi" ? cs.parent_name : (cs.student_name || sName);
    const rawDate = cs.created_at || new Date().toISOString();
    const dateStr = String(rawDate).includes("T") ? String(rawDate) : String(rawDate).replace(" ", "T");
    const cleanNo = cs.sozlesme_no || `SZL2026${String(Date.now()).slice(-5)}`;
    return {
      id: cs.id ? `szl-${cs.id}` : `szl-${cleanNo}`,
      studentId: cs.id,
      ogrenciId: cs.id,
      sozlesmeNo: cleanNo,
      sozlesmeTarihi: dateStr,
      tarih: dateStr,
      musteriUnvan: parentName,
      ogrenciAdi: cs.student_name ? cs.student_name.trim().toLocaleUpperCase("tr-TR") : sName,
      ogrenciNo: cs.student_no || "",
      donemId: cs.donem_id || (cs.program === "2025-2026" ? 40 : cs.program === "2026-2027-YAZ" ? 142 : 113),
      donemAdi: cs.donem_adi || (cs.program === "2025-2026" ? "2025-2026" : cs.program === "2026-2027-YAZ" ? "2026-2027-YAZ" : "2026-2027"),
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
    };
  },

  // 2. Get all contracts (authentic base + custom additions + remote D1 synthesis - deleted + overrides applied)
  getContracts(remoteStudents = [], remoteContracts = []) {
    const custom = readStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, []);
    const base = edesisData.sozlesmeler || [];
    let rContracts = Array.isArray(remoteContracts) && remoteContracts.length > 0 ? remoteContracts : [];
    if (rContracts.length === 0) {
      try {
        const cachedDash = readStorage("cozum_dashboard_data_v1", null);
        if (cachedDash && Array.isArray(cachedDash.contracts) && cachedDash.contracts.length > 0) {
          rContracts = cachedDash.contracts;
        }
      } catch {}
    }
    // Deduplicate by sozlesmeNo / id across base, remote, and custom
    const contractMap = new Map();
    base.forEach((c) => {
      if (!c) return;
      const key = (c.sozlesmeNo || "").trim().toUpperCase() || (c.id ? String(c.id) : "");
      if (key) contractMap.set(key, c);
    });

    rContracts.forEach((c) => {
      if (!c) return;
      const key = (c.sozlesmeNo || "").trim().toUpperCase() || (c.id ? String(c.id) : "");
      if (key) {
        contractMap.set(key, { ...(contractMap.get(key) || {}), ...c });
      }
    });

    custom.forEach((c) => {
      if (!c) return;
      const key = (c.sozlesmeNo || "").trim().toUpperCase() || (c.id ? String(c.id) : "");
      if (key) {
        contractMap.set(key, { ...(contractMap.get(key) || {}), ...c });
      }
    });

    const list = Array.from(contractMap.values());
    const overrides = readStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, {});
    const { delContracts, delIncomes } = this._buildDelSets();

    // Critical: Filter deleted contracts FIRST so dead tombstones don't block synthesis for active students
    const activeList = list.filter(c => !this._isContractDeletedFast(c, delContracts));

    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      let activeStudents = (remoteStudents && remoteStudents.length > 0) ? remoteStudents : [];
      if (activeStudents.length === 0) {
        const cachedDash = readStorage("cozum_dashboard_data_v1", null);
        if (cachedDash && Array.isArray(cachedDash.students) && cachedDash.students.length > 0) {
          activeStudents = cachedDash.students;
        }
      }
      const allStudentsToInspect = [...activeStudents, ...customStudents];
      const existingNames = new Set(activeList.map((c) => trNorm(c.ogrenciAdi || c.ogrenciAdiSoyadi)));
      const existingNos = new Set(activeList.map((c) => trNorm(c.sozlesmeNo)));
      const existingStudentIds = new Set(activeList.map((c) => String(c.studentId || c.student_id || c.ogrenciId || "")).filter(Boolean));

      let maxSeqSzl = 150;
      activeList.forEach((c) => {
        const m = (c.sozlesmeNo || "").match(/SZL2026(\d+)/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxSeqSzl) maxSeqSzl = val;
        }
      });

      allStudentsToInspect.forEach((cs) => {
        if (!cs) return;
        const sName = trNorm(cs.student_name);
        if (!sName) return;
        if (cs.contract_deleted) return;
        if (this._isContractDeletedFast(cs, delContracts) || this._isIncomeDeletedFast(cs, delIncomes)) return;

        if (cs.id && existingStudentIds.has(String(cs.id))) return;
        if (existingNames.has(sName)) return;
        if (cs.sozlesme_no && existingNos.has(trNorm(cs.sozlesme_no))) return;

        let cleanNo = cs.sozlesme_no;
        if (cleanNo && this._isContractDeletedFast(cleanNo, delContracts)) return;

        if (!cleanNo || existingNos.has(trNorm(cleanNo))) {
          maxSeqSzl++;
          while (
            existingNos.has(trNorm(`SZL2026${String(maxSeqSzl).padStart(5, "0")}`)) ||
            this._isContractDeletedFast(`SZL2026${String(maxSeqSzl).padStart(5, "0")}`, delContracts)
          ) {
            maxSeqSzl++;
          }
          cleanNo = `SZL2026${String(maxSeqSzl).padStart(5, "0")}`;
        }
        if (this._isContractDeletedFast(cleanNo, delContracts)) return;

        existingNames.add(sName);
        existingNos.add(trNorm(cleanNo));
        if (cs.id) existingStudentIds.add(String(cs.id));

        const synth = this.buildSyntheticContractForStudent({ ...cs, sozlesme_no: cleanNo });
        if (synth) {
          activeList.push(synth);
        }
      });
    } catch (e) {
      console.warn("Dynamic contract error:", e);
    }

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
    const { delContracts, delIncomes } = this._buildDelSets();

    const list = [...custom, ...base];
    const existingNames = new Set(list.map(t => trNorm(t.ogrenciAdiSoyadi || t.ogrenciAdi)));
    const existingSzl = new Set(list.map(t => trNorm(t.sozlesmeNo)));
    const existingStudentIds = new Set(list.map((t) => String(t.studentId || t.student_id || t.ogrenciId || "")).filter(Boolean));

    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      let activeStudents = (remoteStudents && remoteStudents.length > 0) ? remoteStudents : [];
      if (activeStudents.length === 0) {
        const cachedDash = readStorage("cozum_dashboard_data_v1", null);
        if (cachedDash && Array.isArray(cachedDash.students) && cachedDash.students.length > 0) {
          activeStudents = cachedDash.students;
        }
      }
      const allStudentsToInspect = [...activeStudents, ...customStudents];


      let maxSeqInst = 150;
      list.forEach((t) => {
        const m = (t.sozlesmeNo || "").match(/SZL2026(\d+)/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxSeqInst) maxSeqInst = val;
        }
      });

      allStudentsToInspect.forEach((cs) => {
        if (!cs) return;
        const sName = trNorm(cs.student_name);
        if (!sName) return;
        if (cs.contract_deleted) return;
        if (this._isContractDeletedFast(cs, delContracts) || this._isIncomeDeletedFast(cs, delIncomes)) return;

        if (cs.id && existingStudentIds.has(String(cs.id))) return;
        if (existingNames.has(sName)) return;
        if (cs.sozlesme_no && existingSzl.has(trNorm(cs.sozlesme_no))) return;

        let cleanSzl = cs.sozlesme_no;
        let cleanGlr = cs.gelir_kodu;
        if (cleanSzl && this._isContractDeletedFast(cleanSzl, delContracts)) return;

        if (!cleanSzl || existingSzl.has(trNorm(cleanSzl))) {
          maxSeqInst++;
          while (
            existingSzl.has(trNorm(`SZL2026${String(maxSeqInst).padStart(5, "0")}`)) ||
            this._isContractDeletedFast(`SZL2026${String(maxSeqInst).padStart(5, "0")}`, delContracts)
          ) {
            maxSeqInst++;
          }
          cleanSzl = `SZL2026${String(maxSeqInst).padStart(5, "0")}`;
          cleanGlr = `GLR2026${String(maxSeqInst).padStart(5, "0")}`;
        }
        if (!cleanGlr) {
          const numPart = cleanSzl.replace(/\D/g, "").slice(-5) || "00155";
          cleanGlr = `GLR2026${numPart}`;
        }
        if (this._isContractDeletedFast(cleanSzl, delContracts) || this._isIncomeDeletedFast(cleanGlr, delIncomes)) return;

        existingNames.add(sName);
        existingSzl.add(trNorm(cleanSzl));
        if (cs.id) existingStudentIds.add(String(cs.id));

        const fee = Number(cs.total_fee || 0);
        let extraSum = 0;
        try {
          const extras = typeof cs.extra_fees === "string" ? JSON.parse(cs.extra_fees || "{}") : (cs.extra_fees || {});
          extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
        } catch {}
        const disc = Number(cs.discount_amount || 0);
        const gross = Math.max(0, fee + extraSum - disc) || fee || 75000;

        const contractOverrides = readStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, {});
        const ovContract = (cleanSzl && contractOverrides[cleanSzl]) || (cs.id && contractOverrides[cs.id]);
        const ovCount = ovContract?.taksitSayisi ? Number(ovContract.taksitSayisi) : null;
        const inst = ovCount || Math.max(1, Number(cs.installment_count) || 10);
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
            ogrenciAdiSoyadi: cs.student_name ? cs.student_name.trim() : sName,
            musteriUnvan: parentName,
            sinifAdi: className,
            taksitTutari: instAmt,
            toplamTutar: instAmt,
            tahsilEdilen: 0,
            kalanTutar: instAmt,
            vadeTarihi: due.toISOString(),
            durum: 0,
            durumText: "Vadesi Gelmedi",
            donemId: cs.donem_id || (cs.program === "2025-2026" ? 40 : cs.program === "2026-2027-YAZ" ? 142 : 113),
            donemAdi: cs.donem_adi || (cs.program === "2025-2026" ? "2025-2026" : cs.program === "2026-2027-YAZ" ? "2026-2027-YAZ" : "2026-2027"),
            notlar: `${i}. Taksit`
          });
        }
      });
    } catch (e) {
      console.warn("Dynamic installments error:", e);
    }

    const merged = list.filter(t => !this._isContractDeletedFast(t, delContracts) && !this._isIncomeDeletedFast(t, delIncomes));

    return merged.map((t) => {
      const key1 = t.gelirKodu ? `${t.gelirKodu}_${t.taksitNo}` : null;
      const key2 = t.sozlesmeNo ? `${t.sozlesmeNo}_${t.taksitNo}` : null;
      const key3 = t.id;
      const ov = (key1 && overrides[key1]) || (key2 && overrides[key2]) || (key3 && overrides[key3]);
      if (ov) {
        const amt = ov.taksitTutari != null ? Number(ov.taksitTutari) : t.taksitTutari;
        const paid = ov.tahsilEdilen != null ? Number(ov.tahsilEdilen) : (t.tahsilEdilen || 0);
        const rem = ov.kalanTutar != null ? Number(ov.kalanTutar) : Math.max(0, amt - paid);
        return {
          ...t,
          ...ov,
          taksitTutari: amt,
          toplamTutar: amt,
          tahsilEdilen: paid,
          kalanTutar: rem,
          vadeTarihi: ov.vadeTarihi || t.vadeTarihi,
          durum: ov.durum != null ? ov.durum : (paid >= amt && amt > 0 ? 1 : t.durum),
          durumText: ov.durumText || (rem <= 0 ? "Tam Ödendi" : t.durumText)
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

    const nextCode = payload.gelirKodu || `GLR2026${String(maxNum + 1).padStart(5, "0")}`;
    const { delContracts } = this._buildDelSets();
    let nextSzlCode = payload.sozlesmeNo || `SZL2026${String(maxNum + 1).padStart(5, "0")}`;
    while (delContracts.has(trNorm(nextSzlCode))) {
      maxNum++;
      nextSzlCode = `SZL2026${String(maxNum + 1).padStart(5, "0")}`;
    }

    const gross = Number(payload.brutTutar) || 0;
    const vatRate = Number(payload.kdvOrani) || 10;
    const net = Math.round((gross / (1 + vatRate / 100)) * 100) / 100;
    const vat = Math.round((gross - net) * 100) / 100;
    const installments = Math.max(1, Number(payload.taksitSayisi) || 1);

    const stName = (payload.ogrenciAdi || "").trim().toUpperCase();
    this.unTombstone(stName, nextSzlCode, nextCode);
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
      id: payload.contract_id || payload.contractId || (Date.now() + 100),
      studentId: payload.studentId || payload.student_id || payload.id || null,
      ogrenciId: payload.studentId || payload.student_id || payload.id || null,
      ogrenciNo: payload.student_no || payload.ogrenciNo || "",
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

    const customContracts = readStorage(STORAGE_KEYS.CUSTOM_CONTRACTS, []).filter(
      (c) => c && c.sozlesmeNo !== nextSzlCode && (!newContract.studentId || c.studentId !== newContract.studentId)
    );
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

    const ogrenciId = typeof contractOrNo === "object" ? contractOrNo.ogrenciId : null;
    const ogrenciNo = typeof contractOrNo === "object" ? (contractOrNo.ogrenciNo || contractOrNo.student_no) : null;
    const studentName = typeof contractOrNo === "object" ? (contractOrNo.ogrenciAdi || contractOrNo.ogrenciAdiSoyadi || contractOrNo.student_name) : null;
    const musteriUnvan = typeof contractOrNo === "object" ? contractOrNo.musteriUnvan : null;

    // Fire API DELETE to D1 backend with tombstone metadata
    if (typeof fetch !== "undefined" && targetKey) {
      try {
        const apiUrl = (typeof localStorage !== "undefined" && localStorage.getItem("custom_api_url")) || "";
        const token = (typeof localStorage !== "undefined" && localStorage.getItem("session_token")) || "";
        fetch(`${apiUrl}/api/contracts/${encodeURIComponent(targetKey)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            student_name: studentName || musteriUnvan,
            sozlesme_no: szlNo,
            id: id
          })
        }).catch((err) => console.warn("[AccountingService] API DELETE error:", err));
      } catch (e) {}
    }

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
    this.clearDelSetsCache();

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

  // 10. Update contract details (brutTutar, netTutar, installments count, etc.)
  updateContract(contractOrNo, patchData = {}) {
    if (!contractOrNo) return null;
    const szlNo = typeof contractOrNo === "object" ? (contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no) : contractOrNo;
    const id = typeof contractOrNo === "object" ? contractOrNo.id : null;
    const targetKey = szlNo || id;
    if (!targetKey) return null;

    const overrides = readStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, {});
    const existing = overrides[targetKey] || (szlNo && overrides[szlNo]) || (id && overrides[id]) || {};

    const updatedPatch = {
      ...existing,
      ...patchData,
      updatedAt: new Date().toISOString()
    };

    if (szlNo) overrides[szlNo] = updatedPatch;
    if (id) overrides[id] = updatedPatch;
    writeStorage(STORAGE_KEYS.CONTRACT_OVERRIDES, overrides);

    // If brutTutar changed, sync corresponding student income in INCOME_OVERRIDES
    if (patchData.brutTutar != null) {
      const incomeOverrides = readStorage(STORAGE_KEYS.INCOME_OVERRIDES, {});
      const glrKey = patchData.gelirKodu || (szlNo ? `GLR2026${szlNo.replace(/\D/g, "").slice(-5)}` : null);
      if (glrKey) {
        const curInc = incomeOverrides[glrKey] || {};
        const paid = curInc.toplamTahsilat || 0;
        const newGross = Number(patchData.brutTutar) || 0;
        const newNet = patchData.netTutar != null ? Number(patchData.netTutar) : Math.round((newGross / 1.1) * 100) / 100;
        const newVat = patchData.kdvTutari != null ? Number(patchData.kdvTutari) : Math.round((newGross - newNet) * 100) / 100;
        incomeOverrides[glrKey] = {
          ...curInc,
          brutTutar: newGross,
          netTutar: newNet,
          kdvTutari: newVat,
          kalanAlacak: Math.max(0, newGross - paid)
        };
        writeStorage(STORAGE_KEYS.INCOME_OVERRIDES, incomeOverrides);
      }
    }

    // Sync student total_fee and installment_count in custom students
    try {
      const customStudents = readStorage("cozum_custom_students_v1", []);
      let stModified = false;
      const updatedStudents = customStudents.map((st) => {
        const match = (szlNo && st.sozlesme_no === szlNo) || (st.id && id && String(st.id) === String(id)) ||
          (patchData.studentId && String(st.id) === String(patchData.studentId)) ||
          (patchData.ogrenciAdi && trNorm(st.student_name) === trNorm(patchData.ogrenciAdi));
        if (match) {
          stModified = true;
          return {
            ...st,
            total_fee: patchData.brutTutar != null ? patchData.brutTutar : st.total_fee,
            installment_count: patchData.taksitSayisi != null ? patchData.taksitSayisi : st.installment_count
          };
        }
        return st;
      });
      if (stModified) {
        writeStorage("cozum_custom_students_v1", updatedStudents);
      }
    } catch (e) {
      console.warn("Student sync error:", e);
    }

    // Remote sync with backend D1 API if reachable
    if (typeof fetch !== "undefined") {
      try {
        const apiUrl = (typeof localStorage !== "undefined" && localStorage.getItem("custom_api_url")) || "";
        const token = (typeof localStorage !== "undefined" && localStorage.getItem("session_token")) || "";
        const remoteId = id || szlNo;
        fetch(`${apiUrl}/api/contracts/${encodeURIComponent(remoteId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(patchData)
        }).catch(() => {});
      } catch (e) {}
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    return updatedPatch;
  },

  // 11. Save customized installments and automatically recalculate/update contract total
  saveInstallments(contractOrNo, installmentsList = []) {
    if (!contractOrNo || !Array.isArray(installmentsList)) return null;
    const szlNo = typeof contractOrNo === "object" ? (contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no) : contractOrNo;
    const id = typeof contractOrNo === "object" ? contractOrNo.id : null;

    // 1. Calculate new contract price from installments
    const newBrut = installmentsList.reduce((acc, t) => acc + (Number(t.taksitTutari) || 0), 0);
    const newNet = Math.round((newBrut / 1.1) * 100) / 100;
    const newKdv = Math.round((newBrut - newNet) * 100) / 100;

    // 2. Persist installment overrides
    const instOverrides = readStorage(STORAGE_KEYS.INSTALLMENT_OVERRIDES, {});
    installmentsList.forEach((t) => {
      const num = t.taksitNo;
      const amt = Number(t.taksitTutari) || 0;
      const paid = Number(t.tahsilEdilen) || 0;
      const rem = Math.max(0, amt - paid);
      const isPaid = paid >= amt && amt > 0;
      const data = {
        taksitNo: num,
        taksitTutari: amt,
        toplamTutar: amt,
        vadeTarihi: t.vadeTarihi,
        tahsilEdilen: paid,
        kalanTutar: rem,
        durum: isPaid ? 1 : (t.durum || 0),
        durumText: isPaid ? "Tahsil Edildi" : (t.durumText || "Vadesi Gelmedi"),
        odemeYontemi: t.odemeYontemi || null,
        tahsilatTarihi: t.tahsilatTarihi || null
      };
      if (t.gelirKodu) instOverrides[`${t.gelirKodu}_${num}`] = data;
      if (szlNo) instOverrides[`${szlNo}_${num}`] = data;
      if (t.id) instOverrides[t.id] = data;
    });
    writeStorage(STORAGE_KEYS.INSTALLMENT_OVERRIDES, instOverrides);

    // Persist to CUSTOM_INSTALLMENTS so count and details are 100% stable
    const customInst = readStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, []);
    const filteredCustom = customInst.filter((t) => t.sozlesmeNo !== szlNo && (id ? t.sozlesmeNo !== id : true));
    writeStorage(STORAGE_KEYS.CUSTOM_INSTALLMENTS, [...filteredCustom, ...installmentsList]);

    // 3. Update contract total & installment count
    this.updateContract(contractOrNo, {
      brutTutar: newBrut,
      netTutar: newNet,
      kdvTutari: newKdv,
      taksitSayisi: installmentsList.length,
      sozlesmeNo: szlNo
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    return {
      ok: true,
      newBrut,
      newNet,
      newKdv,
      count: installmentsList.length
    };
  },

  // 12. Practical rebalance: Distribute total fee across installments preserving paid installments
  rebalanceInstallments(contractOrNo, targetTotal, targetCount = null, baseDateStr = null) {
    const szlNo = typeof contractOrNo === "object" ? (contractOrNo.sozlesmeNo || contractOrNo.sozlesme_no) : contractOrNo;
    const all = this.getInstallments();
    const existing = all.filter(t => t.sozlesmeNo === szlNo).sort((a, b) => a.taksitNo - b.taksitNo);
    const count = Math.max(1, parseInt(targetCount, 10) || (existing.length > 0 ? existing.length : 10));
    const total = Number(targetTotal) || 0;

    const paidSum = existing.filter(t => t.durum === 1).reduce((acc, t) => acc + (Number(t.tahsilEdilen) || Number(t.taksitTutari) || 0), 0);
    const remainingToDistribute = Math.max(0, total - paidSum);
    const unpaidCount = Math.max(1, count - existing.filter(t => t.durum === 1).length);

    const perInst = Math.floor((remainingToDistribute / unpaidCount) * 100) / 100;
    const diff = Math.round((remainingToDistribute - perInst * unpaidCount) * 100) / 100;

    const baseDate = baseDateStr ? new Date(baseDateStr) : (existing[0]?.vadeTarihi ? new Date(existing[0].vadeTarihi) : new Date());

    let unpaidIndex = 0;
    const newList = [];
    for (let i = 1; i <= count; i++) {
      const prev = existing.find(t => t.taksitNo === i);
      if (prev && prev.durum === 1) {
        newList.push(prev);
      } else {
        unpaidIndex++;
        const isLastUnpaid = unpaidIndex === unpaidCount;
        const amt = isLastUnpaid ? Math.round((perInst + diff) * 100) / 100 : perInst;
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + (i - 1));
        const dateFormatted = d.toISOString().slice(0, 10);
        newList.push({
          id: prev?.id || `inst-${szlNo}-${i}`,
          taksitNo: i,
          gelirKodu: prev?.gelirKodu || (szlNo ? `GLR2026${szlNo.replace(/\D/g, "").slice(-5)}` : ""),
          sozlesmeNo: szlNo,
          ogrenciAdiSoyadi: prev?.ogrenciAdiSoyadi || (typeof contractOrNo === "object" ? contractOrNo.ogrenciAdi : ""),
          musteriUnvan: prev?.musteriUnvan || (typeof contractOrNo === "object" ? contractOrNo.musteriUnvan : ""),
          sinifAdi: prev?.sinifAdi || (typeof contractOrNo === "object" ? contractOrNo.sinifAdi : "Genel"),
          taksitTutari: amt,
          toplamTutar: amt,
          tahsilEdilen: 0,
          kalanTutar: amt,
          vadeTarihi: dateFormatted,
          durum: 0,
          durumText: "Vadesi Gelmedi"
        });
      }
    }

    return this.saveInstallments(contractOrNo, newList);
  },

  // 13. Reset all custom data to original authentic Edesis dump (100% data integrity safety)
  resetCustomData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
  }
};

if (typeof window !== "undefined") {
  // Sync D1 deleted tombstones on startup to prevent resurrection across cookie wipes
  setTimeout(() => {
    AccountingService.syncDeletedWithRemote().catch(() => {});
  }, 100);
}

export default AccountingService;
