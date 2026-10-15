// Cloudflare Pages SSOT REST Client - AccountingService
// Single Source of Truth (SSOT) connected directly to Cloudflare D1 via /api/*
// NO static JSON imports, NO localStorage tombstones, NO protectedKeys hack lists.

import { roundKurus, normalizeDate } from "./installmentService.js";
import { apiFetch, isAllowedBackendUrl } from "./utils.js";

export const ENABLE_KASA_BANKA = false;

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

function getApiUrl() {
  if (typeof localStorage !== "undefined") {
    const custom = localStorage.getItem("custom_api_url");
    if (custom && isAllowedBackendUrl(custom)) {
      return custom.replace(/\/$/, "");
    }
  }
  return "";
}

function readCache(key, fallback = []) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed != null ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[AccountingService] Storage write error for ${key}:`, err);
  }
}

let cacheEpoch = 0;
// In-memory cache for ultra-fast render lookups
const _memory = {
  contracts: readCache("cozum_ssot_contracts_v2", []),
  incomes: readCache("cozum_ssot_incomes_v2", []),
  installments: readCache("cozum_ssot_installments_v2", []),
  collections: readCache("cozum_ssot_collections_v2", []),
  summary: readCache("cozum_ssot_summary_v2", null),
  isFetching: false,
};

export function formatContractRecord(r) {
  if (!r) return null;
  const no = r.sozlesmeNo || r.sozlesme_no || "";
  const name = r.ogrenciAdi || r.ogrenciAdiSoyadi || r.student_name || "";
  const parent = r.parent_name || r.parentName || r.musteriUnvan || name;
  const parentPhone = r.parent_phone || r.parentPhone || "";
  const sClass = r.student_class || r.sinifAdi || "8-A";
  const pId = r.period_id || r.donemId || 113;
  const pName = r.period_name || r.donemAdi || "2026-2027";
  const gross = Number(r.brut_tutar !== undefined ? r.brut_tutar : (r.brutTutar !== undefined ? r.brutTutar : 0));
  const net = Number(r.net_tutar !== undefined ? r.net_tutar : (r.netTutar !== undefined ? r.netTutar : Math.round(gross / 1.1 * 100) / 100));
  const vat = Number(r.kdv_tutari !== undefined ? r.kdv_tutari : (r.kdvTutari !== undefined ? r.kdvTutari : gross - net));
  const instCount = parseInt(r.taksit_sayisi !== undefined ? r.taksit_sayisi : (r.taksitSayisi !== undefined ? r.taksitSayisi : 8), 10) || 1;
  const date = r.sozlesme_tarihi || r.sozlesmeTarihi || "";
  const st = r.durum != null ? r.durum : 1;

  const paid = r.toplamTahsilat !== undefined
    ? Number(r.toplamTahsilat)
    : (r.toplam_tahsilat !== undefined
      ? Number(r.toplam_tahsilat)
      : (r.calculated_paid !== undefined ? Number(r.calculated_paid) : 0));
  const remaining = r.kalanAlacak !== undefined
    ? Number(r.kalanAlacak)
    : (r.kalan_alacak !== undefined
      ? Number(r.kalan_alacak)
      : Math.max(0, gross - paid));

  return {
    ...r,
    id: r.id,
    sozlesmeNo: no,
    sozlesme_no: no,
    studentId: r.student_id || r.studentId,
    student_id: r.student_id || r.studentId,
    ogrenciId: r.student_id || r.studentId,
    student_tc: r.student_tc || r.studentTc || "",
    studentTc: r.student_tc || r.studentTc || "",
    parent_tc: r.parent_tc || r.parentTc || "",
    parentTc: r.parent_tc || r.parentTc || "",
    ogrenciAdi: name,
    student_name: name,
    ogrenciAdiSoyadi: name,
    ogrenciNo: r.student_no || r.ogrenciNo || "",
    musteriUnvan: parent,
    parentName: parent,
    parent_name: parent,
    parentPhone: parentPhone,
    parent_phone: parentPhone,
    sinifAdi: sClass,
    student_class: sClass,
    period_id: pId,
    period_name: pName,
    donemId: pId,
    donemAdi: pName,
    netTutar: net,
    net_tutar: net,
    kdvTutari: vat,
    kdv_tutari: vat,
    brutTutar: gross,
    brut_tutar: gross,
    toplamTahsilat: paid,
    toplam_tahsilat: paid,
    kalanAlacak: remaining,
    kalan_alacak: remaining,
    taksitSayisi: instCount,
    taksit_sayisi: instCount,
    odemeTuru: r.odeme_turu || r.odemeTuru || 1,
    odemeTuruText: r.odeme_turu_text || r.odemeTuruText || (instCount > 1 ? `Taksitli (${instCount} Taksit)` : "Peşin"),
    sozlesmeTarihi: date,
    sozlesme_tarihi: date,
    durum: st,
    durumText: r.durumText || (st === 3 ? "İptal Edildi" : st === 0 ? "Taslak" : "Aktif"),
    isSigned: !!(r.is_signed || r.kurum_imza_alindi || r.veli_imza_alindi),
    is_signed: !!(r.is_signed || r.kurum_imza_alindi || r.veli_imza_alindi),
    veliImzaAlindi: !!r.veli_imza_alindi,
    kurumImzaAlindi: !!r.kurum_imza_alindi,
    kurumImzalayan: r.kurum_imzalayan || "",
    signedAt: r.signed_at || r.signedAt,
    sozlesmeUrl: r.sozlesme_url || r.sozlesmeUrl
  };
}

export function formatCollectionRecord(p) {
  if (!p) return null;
  const id = p.id || `pay_${Date.now()}`;
  const numId = String(id).replace(/\D/g, "");
  const code = p.odemeKodu || (numId ? `ODM-${numId.slice(-6)}` : `ODM-${id}`);
  const amt = Number(p.amount !== undefined ? p.amount : (p.tahsilatTutari !== undefined ? p.tahsilatTutari : 0));
  const sName = p.student_name || p.ogrenciAdi || p.musteriUnvan || "Öğrenci";
  const pName = p.parent_name || p.veliAdiSoyadi || "";
  const sId = p.student_id || p.ogrenciId || "";
  const sozNo = p.sozlesme_no || p.sozlesmeNo || "";
  const incCode = p.gelir_kodu || p.gelirKodu || "";
  const date = p.payment_date || p.tahsilatTarihi || p.created_at || new Date().toISOString().slice(0, 10);
  const bank = p.bank || p.kasaBankaAdi || p.method || "Nakit Ana Kasa";
  const note = p.note || p.gelirAciklama || (sozNo ? `Sözleşme: ${sozNo}` : "Tahsilat");

  const isCancelled = p.is_cancelled === 1 || p.is_cancelled === true || p.status === "İptal Edildi" || p.status === "cancelled";
  const status = isCancelled ? "İptal Edildi" : (p.status || "Odendi");
  const durum = isCancelled ? "İptal Edildi" : (p.durumText || "Tahsil Edildi");

  return {
    ...p,
    id,
    is_cancelled: isCancelled ? 1 : 0,
    status,
    odemeKodu: code,
    tahsilatTutari: amt,
    amount: amt,
    musteriUnvan: sName,
    ogrenciAdi: sName,
    ogrenciId: sId,
    student_id: sId,
    student_name: sName,
    parent_name: pName,
    veliAdiSoyadi: pName,
    parent_phone: p.parent_phone || "",
    sozlesmeNo: sozNo,
    sozlesme_no: sozNo,
    gelirKodu: incCode,
    gelirAciklama: note,
    kasaBankaAdi: bank,
    bank: bank,
    method: p.method || bank,
    tahsilatTarihi: date,
    payment_date: date,
    durumText: durum,
    taksitNo: p.taksitNo || p.taksit_no || null
  };
}

export const AccountingService = {
  // Backward compatibility stubs
  getDeletedContracts() { return []; },
  getDeletedIncomes() { return []; },
  clearDelSetsCache() {},
  syncDeletedWithRemote() { return Promise.resolve([]); },
  unTombstone() {},

  isContractDeleted(contractOrNo) {
    if (!contractOrNo) return false;
    if (typeof contractOrNo === "object") {
      return Boolean(contractOrNo.is_deleted || contractOrNo.contract_deleted || contractOrNo.durum === 3);
    }
    const norm = trNorm(contractOrNo);
    const found = _memory.contracts.find((c) => trNorm(c.id) === norm || trNorm(c.sozlesmeNo) === norm || trNorm(c.ogrenciAdi) === norm);
    if (found) return Boolean(found.is_deleted || found.durum === 3);
    return false;
  },

  isIncomeDeleted(incomeOrCode) {
    if (!incomeOrCode) return false;
    if (typeof incomeOrCode === "object") {
      return Boolean(incomeOrCode.is_deleted || incomeOrCode.durum === 3);
    }
    const norm = trNorm(incomeOrCode);
    const found = _memory.incomes.find((i) => trNorm(i.id) === norm || trNorm(i.gelirKodu) === norm || trNorm(i.sozlesmeNo) === norm);
    if (found) return Boolean(found.is_deleted || found.durum === 3);
    return false;
  },

  // 1. Fetch & Get Contracts (SSOT from /api/contracts)
  async fetchContracts() {
    const epoch=cacheEpoch;
    if (typeof fetch === "undefined") return _memory.contracts;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/contracts`);
      if (!res || !res.ok) return _memory.contracts;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      const formatted = list.map(formatContractRecord);

      _memory.contracts = formatted;
      writeCache("cozum_ssot_contracts_v2", formatted);
      return formatted;
    } catch (err) {
      console.warn("[AccountingService] fetchContracts error:", err);
      return _memory.contracts;
    }
  },

  getContracts(remoteStudents = [], propContracts = null) {
    if (Array.isArray(propContracts) && propContracts.length > 0) {
      const formatted = propContracts.map(formatContractRecord);
      _memory.contracts = formatted;
      writeCache("cozum_ssot_contracts_v2", formatted);
      return formatted;
    }

    let list = _memory.contracts.map(formatContractRecord);
    // Real D1 contracts from _memory.contracts are the Single Source of Truth

    // Trigger background fetch if memory is empty
    if (list.length === 0 && !_memory.isFetching && typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      _memory.isFetching = true;
      this.fetchContracts().finally(() => {
        _memory.isFetching = false;
        window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    return list.filter((c) => !c.is_deleted);
  },

  // 2. Fetch & Get Installments (SSOT from /api/installments with Peşinat taksitNo: 0 support)
  async fetchInstallments(contractId = null) {
    const epoch=cacheEpoch;
    if (typeof fetch === "undefined") return _memory.installments;
    try {
      const apiUrl = getApiUrl();
      const q = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : "";
      const res = await apiFetch(`${apiUrl}/api/installments${q}`);
      if (!res || !res.ok) return _memory.installments;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      const formatted = list.map((r) => {
        const no = (r.taksitNo !== undefined && r.taksitNo !== null)
          ? Number(r.taksitNo)
          : ((r.installment_no !== undefined && r.installment_no !== null) ? Number(r.installment_no) : 1);
        const amt = Number(r.taksitTutari || r.amount || 0);
        const paid = Number(r.tahsilEdilen || r.paid_amount || 0);
        const rem = r.contract_status===3 ? 0 : Math.max(0, amt - paid);

        return {
          ...r,
          id: r.id,
          contractId: r.contract_id || r.contractId,
          contract_id: r.contract_id || r.contractId,
          incomeId: r.income_id || r.incomeId,
          studentId: r.student_id || r.studentId,
          sozlesmeNo: r.sozlesme_no || r.sozlesmeNo,
          ogrenciAdi: r.student_name || r.ogrenciAdi,
          ogrenciAdiSoyadi: r.student_name || r.ogrenciAdi,
          taksitNo: no,
          installment_no: no,
          isPesinat: no === 0,
          taksitTutari: amt,
          amount: amt,
          toplamTutar: amt,
          tahsilEdilen: paid,
          paid_amount: paid,
          kalanTutar: rem,
          vadeTarihi: normalizeDate(r.due_date || r.vadeTarihi),
          due_date: r.due_date || r.vadeTarihi,
          durumText: r.contract_status===3 ? 'İptal Edildi' : r.status || (paid >= amt && amt > 0 ? "Tam Ödendi" : paid > 0 ? "Kısmi Ödendi" : no === 0 ? "Peşinat" : "Bekliyor"),
          receiptNo: r.receipt_no,
          paymentDate: r.payment_date
        };
      });

      if (contractId) {
        const normId = trNorm(contractId);
        _memory.installments = [
          ..._memory.installments.filter(t => trNorm(t.contractId) !== normId && trNorm(t.sozlesmeNo) !== normId),
          ...formatted
        ];
        writeCache("cozum_ssot_installments_v2", _memory.installments);
      } else {
        _memory.installments = formatted;
        writeCache("cozum_ssot_installments_v2", formatted);
      }
      return formatted;
    } catch (err) {
      console.warn("[AccountingService] fetchInstallments error:", err);
      return _memory.installments;
    }
  },

  getInstallments(remoteStudents = []) {
    let list = [..._memory.installments];

    if (list.length === 0 && !_memory.isFetching && typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      this.fetchInstallments().then((insts) => {
        if (insts.length > 0) window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    return list;
  },

  // 3. Fetch & Get Incomes (SSOT from /api/student-incomes)
  async fetchIncomes() {
    const epoch=cacheEpoch;
    if (typeof fetch === "undefined") return _memory.incomes;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/student-incomes`);
      if (!res || !res.ok) return _memory.incomes;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      _memory.incomes = list;
      writeCache("cozum_ssot_incomes_v2", list);
      return list;
    } catch (err) {
      console.warn("[AccountingService] fetchIncomes error:", err);
      return _memory.incomes;
    }
  },

  getIncomes(remoteStudents = []) {
    if (Array.isArray(remoteStudents) && remoteStudents.length > 0) {
      this.getContracts(remoteStudents);
    }
    let list = (_memory.incomes || []).filter((i) => !i.is_deleted);

    if (list.length === 0 && typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      this.fetchIncomes().then((incs) => {
        if (incs.length > 0) window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    // Synthesize income objects from contracts if empty
    if (list.length === 0 && _memory.contracts.length > 0) {
      list = _memory.contracts.filter((c) => !c.is_deleted).map((c) => ({
        id: c.id,
        gelirKodu: `GLR${(c.sozlesmeNo || "SZL202600150").replace(/\D/g, "")}`,
        sozlesmeNo: c.sozlesmeNo,
        ogrenciAdi: c.ogrenciAdi,
        ogrenciAdiSoyadi: c.ogrenciAdi,
        musteriUnvan: c.musteriUnvan || c.ogrenciAdi,
        sinifAdi: c.sinifAdi || "8-A",
        netTutar: c.netTutar,
        kdvTutari: c.kdvTutari,
        brutTutar: c.brutTutar,
        toplamTahsilat: Number(c.toplamTahsilat) || 0,
        kalanAlacak: c.kalanAlacak !== undefined ? Number(c.kalanAlacak) : c.brutTutar,
        tamTahsilEdildiMi: (Number(c.toplamTahsilat) || 0) >= (Number(c.brutTutar) || 0),
        gelirTarihi: c.sozlesmeTarihi,
        vadeTarihi: c.sozlesmeTarihi,
        taksitSayisi: c.taksitSayisi,
        kalanTaksitSayisi: c.taksitSayisi,
        aciklama: `Sözleşme: ${c.sozlesmeNo}`,
        donemId: c.donemId || 113,
        donemAdi: c.donemAdi || "2026-2027"
      }));
    }

    return list;
  },

  // 4. Collections (Payments - SSOT from /api/payments)
  async fetchCollections() {
    const epoch=cacheEpoch;
    if (typeof fetch === "undefined") return _memory.collections;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/payments`);
      if (!res || !res.ok) return _memory.collections;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      const list = Array.isArray(rows) ? rows : (rows?.data || []);
      const formatted = list.map(formatCollectionRecord);
      _memory.collections = formatted;
      writeCache("cozum_ssot_collections_v2", formatted);
      return formatted;
    } catch (err) {
      console.warn("[AccountingService] fetchCollections error:", err);
      return _memory.collections;
    }
  },

  getCollections(propPayments = null) {
    if (Array.isArray(propPayments)) {
      const formatted = propPayments.map(formatCollectionRecord);
      _memory.collections = formatted;
      writeCache("cozum_ssot_collections_v2", formatted);
      return formatted;
    }

    let list = _memory.collections.map(formatCollectionRecord);

    if (list.length === 0 && !_memory.isFetching && typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      this.fetchCollections().then((colls) => {
        if (colls && colls.length > 0) window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    return list;
  },

  // 5. Dynamic Summary (SSOT from /api/accounting/summary)
  async fetchSummary() {
    const epoch=cacheEpoch;
    if (typeof fetch === "undefined") return _memory.summary;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/accounting/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = await res.json();
      if (epoch!==cacheEpoch) return null;
      _memory.summary = summary;
      writeCache("cozum_ssot_summary_v2", summary);
      return summary;
    } catch (err) {
      console.warn("[AccountingService] fetchSummary error:", err);
      return _memory.summary;
    }
  },

  getSummary() {
    if (_memory.summary) return _memory.summary;
    const contracts = this.getContracts();
    const insts = this.getInstallments();
    const rev = contracts.reduce((a, b) => a + (Number(b.brutTutar) || 0), 0);
    const paid = insts.reduce((a, b) => a + (Number(b.tahsilEdilen) || 0), 0);

    return {
      totalRevenue: rev,
      totalCollected: paid,
      totalRemaining: Math.max(0, rev - paid),
      sozlesmelerCount: contracts.length,
      taksitlerCount: insts.length,
      gelirlerCount: contracts.length,
      tahsilatlarCount: _memory.collections.length,
      overdueInstallmentsCount: 0,
      overdueAmount: 0
    };
  },

  // 6. Action Handlers (Mutations sync directly to Cloudflare Pages API)
  addNewIncome(incomeData) {
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test" && !incomeData.skipRemoteSync && !incomeData.contract_id && !incomeData.sozlesmeNo) return apiFetch(`${getApiUrl()}/api/contracts`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({student_id:incomeData.studentId || incomeData.student_id,student_name:incomeData.ogrenciAdi || incomeData.ogrenciAdiSoyadi,parent_name:incomeData.veliAdi,student_class:incomeData.sinifAdi,total_amount:incomeData.brutTutar,installment_count:incomeData.taksitSayisi,due_date:incomeData.vadeTarihi})}).then(async res => {
      const saved=await res.json();await this.fetchContracts();await this.fetchIncomes();await this.fetchInstallments();return {contract:formatContractRecord(saved)};
    });

    const gross = Number(incomeData.brutTutar || 60000);
    const count = parseInt(incomeData.taksitSayisi) || 6;
    const net = roundKurus(gross / 1.1);
    const vat = roundKurus(gross - net);
    const studentName = String(incomeData.ogrenciAdi || incomeData.ogrenciAdiSoyadi || "Öğrenci").trim();
    const szlNo = incomeData.sozlesmeNo || `SZL2026${String(Date.now()).slice(-5)}`;
    const glrNo = incomeData.gelirKodu || `GLR${szlNo.replace(/\D/g, "")}`;
    const id = incomeData.id || incomeData.contract_id || `cnt_${Date.now()}`;

    // Remote sync guard: only fire remote POST if remote sync wasn't explicitly skipped
    // and neither contract_id nor a pre-assigned sozlesmeNo was provided (which indicates the contract already exists on the server).
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test" && !incomeData.skipRemoteSync && !incomeData.contract_id && !incomeData.sozlesmeNo) {
      const apiUrl = getApiUrl();
      try {
        const p = apiFetch(`${apiUrl}/api/contracts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: incomeData.studentId || incomeData.student_id || "",
            student_name: studentName,
            parent_name: incomeData.veliAdi || studentName,
            student_class: incomeData.sinifAdi || "8-A",
            total_amount: gross,
            installment_count: count,
            contract_date: new Date().toISOString()
          })
        });
        if (p && typeof p.catch === "function") p.catch((err) => console.warn("[AccountingService] Remote contract POST error:", err));
      } catch (err) {
        console.warn("[AccountingService] Remote contract POST error:", err);
      }
    }

    const newContract = {
      id,
      sozlesmeNo: szlNo,
      sozlesme_no: szlNo,
      ogrenciAdi: studentName,
      student_name: studentName,
      ogrenciAdiSoyadi: studentName,
      sinifAdi: incomeData.sinifAdi || "8-A",
      netTutar: net,
      kdvTutari: vat,
      brutTutar: gross,
      taksitSayisi: count,
      durum: 1,
      durumText: "Aktif",
      isSigned: false,
      sozlesmeTarihi: new Date().toISOString()
    };

    const newIncome = {
      id: `glr_${id}`,
      gelirKodu: glrNo,
      sozlesmeNo: szlNo,
      ogrenciAdiSoyadi: studentName,
      sinifAdi: incomeData.sinifAdi || "8-A",
      brutTutar: gross,
      netTutar: net,
      kdvTutari: vat,
      toplamTahsilat: 0,
      kalanAlacak: gross,
      tamTahsilEdildiMi: false,
      taksitSayisi: count,
      gelirTarihi: new Date().toISOString()
    };

    // Generate installment entries with exact rounding
    const baseAmt = Math.floor((gross / count) * 100) / 100;
    const remainder = roundKurus(gross - (baseAmt * count));
    const newInstallments = [];

    for (let i = 1; i <= count; i++) {
      const isLast = (i === count);
      const amt = isLast ? roundKurus(baseAmt + remainder) : baseAmt;
      newInstallments.push({
        id: `inst_${id}_${i}`,
        contractId: id,
        gelirKodu: glrNo,
        sozlesmeNo: szlNo,
        ogrenciAdi: studentName,
        taksitNo: i,
        installment_no: i,
        taksitTutari: amt,
        amount: amt,
        tahsilEdilen: 0,
        kalanTutar: amt,
        durumText: "Vadesi Gelmedi"
      });
    }

    const nameNorm = trNorm(studentName);
    _memory.contracts = [newContract, ..._memory.contracts.filter((c) => c.id !== id)];
    _memory.incomes = [newIncome, ..._memory.incomes.filter((i) => i.id !== newIncome.id)];
    _memory.installments = [...newInstallments, ..._memory.installments.filter((t) => t.contractId !== id)];

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    writeCache("cozum_ssot_incomes_v2", _memory.incomes);
    writeCache("cozum_ssot_installments_v2", _memory.installments);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    return {
      contract: newContract,
      income: newIncome,
      installments: newInstallments
    };
  },

  deleteContract(contractOrNo) {
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") return apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(typeof contractOrNo === "object" ? contractOrNo.id || contractOrNo.sozlesmeNo : contractOrNo)}`, {method:"DELETE",headers:{"Content-Type":"application/json"},body:undefined}).then(async res => {
      const saved=await res.json(); await this.fetchCollections(); await this.fetchInstallments(); await this.fetchContracts(); await this.fetchIncomes();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });

    if (!contractOrNo) return false;
    const targetKey = typeof contractOrNo === "object" ? (contractOrNo.id || contractOrNo.sozlesmeNo || contractOrNo.ogrenciAdi || contractOrNo.student_name) : contractOrNo;
    const studentName = typeof contractOrNo === "object" ? (contractOrNo.ogrenciAdi || contractOrNo.ogrenciAdiSoyadi || contractOrNo.student_name) : null;
    const studentId = typeof contractOrNo === "object" ? (contractOrNo.studentId || contractOrNo.student_id || contractOrNo.id) : null;

    if (!targetKey) return false;

    const normTarget = trNorm(targetKey);
    const normName = studentName ? trNorm(studentName) : null;
    const normStudentId = studentId ? trNorm(studentId) : null;

    _memory.contracts = _memory.contracts.map((c) => {
      const matchId = (c.id && trNorm(c.id) === normTarget) || (c.sozlesmeNo && trNorm(c.sozlesmeNo) === normTarget);
      const matchStudent = (normStudentId && c.studentId && (trNorm(c.studentId) === normStudentId || trNorm(String(c.studentId).replace(/^stu-/, "")) === normStudentId.replace(/^stu-/, "")))
        ;

      if (matchId || matchStudent) {
        return { ...c, durum: 3, durumText: "İptal Edildi", is_deleted: true };
      }
      return c;
    });

    _memory.incomes = _memory.incomes.map((i) => {
      const matchId = (i.id && trNorm(i.id) === normTarget) || (i.sozlesmeNo && trNorm(i.sozlesmeNo) === normTarget) || (i.gelirKodu && trNorm(i.gelirKodu) === normTarget);
      const matchStudent = (normStudentId && i.studentId && (trNorm(i.studentId) === normStudentId || trNorm(String(i.studentId).replace(/^stu-/, "")) === normStudentId.replace(/^stu-/, "")))
        ;

      if (matchId || matchStudent) {
        return { ...i, durum: 3, is_deleted: true };
      }
      return i;
    });

    _memory.installments = _memory.installments.filter((t) => {
      const matchId = (t.contractId && trNorm(t.contractId) === normTarget) || (t.sozlesmeNo && trNorm(t.sozlesmeNo) === normTarget);
      const matchStudent = normStudentId && trNorm(t.studentId || t.student_id) === normStudentId;
      return !matchId && !matchStudent;
    });

    _memory.collections = _memory.collections.filter((col) => {
      const matchContract = (col.contractId && trNorm(col.contractId) === normTarget)
        || (col.sozlesmeNo && trNorm(col.sozlesmeNo) === normTarget);
      const colStudentId = col.studentId || col.student_id;
      const normColStudentId = colStudentId ? trNorm(colStudentId) : null;
      const matchStudent = (normStudentId && normColStudentId && (normColStudentId === normStudentId || normColStudentId.replace(/^stu-/, "") === normStudentId.replace(/^stu-/, "")))

        ;
      return !matchContract && !matchStudent;
    });

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    writeCache("cozum_ssot_incomes_v2", _memory.incomes);
    writeCache("cozum_ssot_installments_v2", _memory.installments);
    writeCache("cozum_ssot_collections_v2", _memory.collections);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") {
      const rawBase = getApiUrl() || "";
      const base = rawBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");
      try {
        const p = apiFetch(`${base}/api/contracts/${encodeURIComponent(targetKey)}`, {
          method: "DELETE"
        });
        if (p && typeof p.catch === "function") p.catch((err) => console.warn("[AccountingService] Remote contract DELETE error:", err));
      } catch (err) {
        console.warn("[AccountingService] Remote contract DELETE error:", err);
      }
    }

    return true;
  },

  async cancelContract(contractOrNo,reason) {
    const key=typeof contractOrNo==='object' ? contractOrNo?.id || contractOrNo?.sozlesmeNo : contractOrNo;
    if(!key)throw new Error('Sözleşme bulunamadı');
    const res=await apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(key)}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});
    const saved=await res.json();
    await Promise.all([this.fetchContracts(),this.fetchIncomes(),this.fetchInstallments()]);
    if(typeof window!=='undefined')window.dispatchEvent(new Event('cozum_accounting_updated'));
    return saved;
  },

  deleteIncome(incomeOrCode) {
    return this.deleteContract(incomeOrCode);
  },

  async signContract(targetKey, signerType = "kurum", signerName = "") {
    const epoch=cacheEpoch;
    const res=await apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(targetKey)}/sign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({signer_type:signerType,signer_name:signerName})});
    const saved=await res.json();
    if(epoch!==cacheEpoch)return saved.contract;
    await this.fetchContracts();
    if(typeof window!=="undefined")window.dispatchEvent(new Event("cozum_accounting_updated"));
    return saved.contract;
  },

  async addNote(type,id,text) {
    if(!['contracts','student-incomes'].includes(type)||!id) throw new Error('Not kaydı bulunamadı');
    const res=await apiFetch(`${getApiUrl()}/api/${type}/${encodeURIComponent(id)}/notes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    const saved=await res.json();
    if(!res.ok) throw new Error(saved.detail || 'Not kaydedilemedi');
    if(type==='contracts') await this.fetchContracts(); else await this.fetchIncomes();
    if(typeof window!=='undefined') window.dispatchEvent(new Event('cozum_accounting_updated'));
    return saved.notes;
  },

  updateContract(idOrSzl, patch = {}) {
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") return apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(idOrSzl)}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)}).then(async res => {
      const saved=await res.json(); await this.fetchCollections(); await this.fetchInstallments(); await this.fetchContracts(); await this.fetchIncomes();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });

    const norm = trNorm(idOrSzl);
    _memory.contracts = _memory.contracts.map((c) => {
      if (trNorm(c.id) === norm || trNorm(c.sozlesmeNo) === norm) {
        return { ...c, ...patch };
      }
      return c;
    });

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") {
      const apiUrl = getApiUrl();
      try {
        const p = apiFetch(`${apiUrl}/api/contracts/${encodeURIComponent(idOrSzl)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (p && typeof p.catch === "function") p.catch((err) => console.warn("[AccountingService] Remote contract PATCH error:", err));
      } catch (err) {
        console.warn("[AccountingService] Remote contract PATCH error:", err);
      }
    }

    return true;
  },

  // 7. Installment Management with Peşinat (taksitNo: 0) Support
  saveInstallments(contractIdOrNo, installments = []) {
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") return apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(typeof contractIdOrNo === "object" ? contractIdOrNo.id || contractIdOrNo.sozlesmeNo : contractIdOrNo)}/installments`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({installments})}).then(async res => {
      const saved=await res.json(); await this.fetchCollections(); await this.fetchInstallments(); await this.fetchContracts(); await this.fetchIncomes();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });

    const targetKey = typeof contractIdOrNo === "object" ? (contractIdOrNo.id || contractIdOrNo.sozlesmeNo) : contractIdOrNo;
    const norm = trNorm(targetKey);
    const newBrut = installments.reduce((s, t) => s + Number(t.taksitTutari != null ? t.taksitTutari : (t.amount || 0)), 0);

    // Update contract brutTutar & taksitSayisi in memory
    _memory.contracts = _memory.contracts.map((c) => {
      if (trNorm(c.id) === norm || trNorm(c.sozlesmeNo) === norm) {
        return { ...c, brutTutar: newBrut, taksitSayisi: installments.length };
      }
      return c;
    });

    // Replace installments for this contract
    _memory.installments = [
      ..._memory.installments.filter((t) => trNorm(t.contractId) !== norm && trNorm(t.sozlesmeNo) !== norm),
      ...installments.map((t) => {
        const amt = Number(t.taksitTutari != null ? t.taksitTutari : (t.amount || 0));
        const paid = Number(t.tahsilEdilen != null ? t.tahsilEdilen : (t.paid_amount || 0));
        const no = (t.taksitNo !== undefined && t.taksitNo !== null)
          ? Number(t.taksitNo)
          : ((t.installment_no !== undefined && t.installment_no !== null) ? Number(t.installment_no) : 1);
        return {
          ...t,
          contractId: t.contractId || targetKey,
          sozlesmeNo: t.sozlesmeNo || targetKey,
          taksitNo: no,
          installment_no: no,
          isPesinat: no === 0,
          amount: amt,
          taksitTutari: amt,
          tahsilEdilen: paid,
          paid_amount: paid,
          kalanTutar: Math.max(0, amt - paid),
          due_date: t.due_date || t.vadeTarihi,
          vadeTarihi: t.vadeTarihi || t.due_date,
          durumText: t.durumText || (paid >= amt && amt > 0 ? "Tam Ödendi" : paid > 0 ? "Kısmi Ödendi" : no === 0 ? "Peşinat" : "Bekliyor")
        };
      })
    ];

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    writeCache("cozum_ssot_installments_v2", _memory.installments);

    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") {
      const apiUrl = getApiUrl();
      try {
        const p = apiFetch(`${apiUrl}/api/contracts/${encodeURIComponent(targetKey)}/installments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installments })
        });
        if (p && typeof p.catch === "function") p.catch((err) => console.warn("[AccountingService] Remote installments sync error:", err));
      } catch (err) {
        console.warn("[AccountingService] Remote installments sync error:", err);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return {
      newBrut,
      count: installments.length,
      installments
    };
  },

  rebalanceInstallments(contractIdOrList, totalAmount = 0, count = null, startDate = null) {
    if (typeof contractIdOrList === "string") {
      const szlNo = contractIdOrList;
      const targetCnt = _memory.contracts.find((c) => trNorm(c.sozlesmeNo) === trNorm(szlNo) || trNorm(c.id) === trNorm(szlNo));
      const total = Number(totalAmount) || 0;
      const cntCount = count || (targetCnt ? targetCnt.taksitSayisi : 5) || 5;
      const baseAmt = Math.floor((total / cntCount) * 100) / 100;
      const remainder = roundKurus(total - (baseAmt * cntCount));
      const baseDate = new Date(startDate || targetCnt?.sozlesmeTarihi || new Date());

      const newInsts = [];
      for (let i = 1; i <= cntCount; i++) {
        const isLast = (i === cntCount);
        const amt = isLast ? roundKurus(baseAmt + remainder) : baseAmt;
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i - 1);
        d.setDate(15);
        const dueStr = d.toISOString().split("T")[0];
        newInsts.push({
          id: `inst_${szlNo}_${i}`,
          contractId: targetCnt ? targetCnt.id : szlNo,
          sozlesmeNo: szlNo,
          ogrenciAdi: targetCnt?.ogrenciAdi || "",
          taksitNo: i,
          installment_no: i,
          taksitTutari: amt,
          amount: amt,
          toplamTutar: amt,
          tahsilEdilen: 0,
          kalanTutar: amt,
          vadeTarihi: dueStr,
          due_date: dueStr,
          durumText: "Bekliyor"
        });
      }

      this.saveInstallments(szlNo, newInsts);
      return {
        newBrut: total,
        count: cntCount,
        installments: newInsts
      };
    }

    // Array form
    const installments = contractIdOrList;
    if (!Array.isArray(installments) || installments.length === 0) return [];
    const total = Number(totalAmount) || 0;

    // Separate peşinat (taksitNo: 0) if exists
    const pesinat = installments.find((t) => t.taksitNo === 0);
    const pesinatAmt = pesinat ? Number(pesinat.amount || pesinat.taksitTutari || 0) : 0;
    const remainingToDistribute = Math.max(0, total - pesinatAmt);

    const regular = installments.filter((t) => t.taksitNo !== 0);
    const regCount = regular.length || 1;
    const baseAmt = Math.floor((remainingToDistribute / regCount) * 100) / 100;
    const remainder = roundKurus(remainingToDistribute - (baseAmt * regCount));

    const rebalancedRegular = regular.map((t, idx) => {
      const isLast = (idx === regCount - 1);
      const amt = isLast ? roundKurus(baseAmt + remainder) : baseAmt;
      return {
        ...t,
        amount: amt,
        taksitTutari: amt,
        kalanTutar: Math.max(0, amt - (Number(t.tahsilEdilen) || 0))
      };
    });

    return pesinat ? [pesinat, ...rebalancedRegular] : rebalancedRegular;
  },

  recordCollection(paymentData = {}) {
    if (!paymentData.alreadyPersisted && typeof fetch === "function" && process.env.NODE_ENV !== "test") {
      const id = paymentData.id || "pay_" + crypto.randomUUID();
      return apiFetch(`${getApiUrl()}/api/payments`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id,student_id:paymentData.studentId || paymentData.student_id,contract_id:paymentData.contractId || paymentData.contract_id,sozlesme_no:paymentData.sozlesmeNo || paymentData.sozlesme_no,
        installment_id:paymentData.installment_id || paymentData.taksitId,installment_no:paymentData.installment_no ?? paymentData.taksitNo,amount:paymentData.amount || paymentData.tahsilatTutari,
        method:paymentData.method,bank:paymentData.bank || paymentData.kasaBankaAdi,payment_date:paymentData.payment_date || paymentData.date || paymentData.tahsilatTarihi,note:paymentData.note
      })}).then(async res => {
        const saved=await res.json();
        const result=this.recordCollection({...paymentData,...saved,studentId:saved.student_id,contractId:saved.contract_id,installment_id:saved.installment_id,alreadyPersisted:true});
        await this.fetchInstallments(); await this.fetchContracts(); await this.fetchIncomes();
        if (typeof window!=="undefined") window.dispatchEvent(new Event("cozum_accounting_updated"));
        return result;
      });
    }

    const amount = Number(paymentData.amount || paymentData.tahsilatTutari || 0);
    const incomeCode = paymentData.gelirKodu;
    const sId = paymentData.studentId || paymentData.student_id || "";
    const sName = paymentData.studentName || paymentData.student_name || "";
    const szlNo = paymentData.sozlesmeNo || paymentData.sozlesme_no || "";
    const cntId = paymentData.contractId || paymentData.contract_id || "";
    const targetInstNo = paymentData.installment_no !== undefined ? paymentData.installment_no : paymentData.taksitNo;
    const targetInstId = paymentData.installment_id || paymentData.taksitId;
    const payDate = paymentData.date || paymentData.payment_date || new Date().toISOString().slice(0, 10);
    const payBank = paymentData.bank || paymentData.kasaBankaAdi || "Nakit Ana Kasa";
    const payMethod = paymentData.method || "Nakit";
    const payNote = paymentData.note || paymentData.aciklama || (szlNo ? `${szlNo} Tahsilatı` : "Tahsilat");

    const newColl = {
      id: paymentData.id || `pay_${Date.now()}`,
      tahsilatTutari: amount,
      amount,
      gelirKodu: incomeCode,
      sozlesmeNo: szlNo,
      sozlesme_no: szlNo,
      contractId: cntId,
      contract_id: cntId,
      studentId: sId,
      student_id: sId,
      studentName: sName,
      student_name: sName,
      tahsilatTarihi: payDate,
      payment_date: payDate,
      kasaBankaAdi: payBank,
      bank: payBank,
      method: payMethod,
      note: payNote,
      gelirAciklama: payNote
    };

    _memory.collections = [newColl, ..._memory.collections.filter(p=>p.id!==newColl.id)];

    // Amortize against installments
    if (incomeCode || szlNo || cntId || targetInstNo !== undefined || targetInstId) {
      let unapplied = amount;
      _memory.installments = _memory.installments.map((t) => {
        const matchesContract = (szlNo && t.sozlesmeNo === szlNo) ||
          (cntId && t.contractId === cntId) ||
          (incomeCode && t.gelirKodu === incomeCode);
        const matchesNo = targetInstNo !== undefined ? (Number(t.taksitNo) === Number(targetInstNo) || Number(t.installment_no) === Number(targetInstNo)) : true;
        const matchesId = targetInstId ? (t.id === targetInstId) : false;

        if ((matchesId || (matchesContract && matchesNo)) && unapplied > 0) {
          const due = Number(t.taksitTutari || t.amount || 0);
          const currentPaid = Number(t.tahsilEdilen || t.paid_amount || 0);
          const need = Math.max(0, due - currentPaid);
          const apply = Math.min(need, unapplied);
          unapplied -= apply;
          const updatedPaid = roundKurus(currentPaid + apply);
          const updatedRem = Math.max(0, due - updatedPaid);

          return {
            ...t,
            tahsilEdilen: updatedPaid,
            paid_amount: updatedPaid,
            kalanTutar: updatedRem,
            durumText: updatedRem <= 0 ? "Tam Ödendi" : "Kısmi Ödendi",
            status: updatedRem <= 0 ? "Odendi" : "KismenOdendi",
            tahsilatTarihi: payDate,
            payment_date: payDate,
            odemeYontemi: payMethod
          };
        }
        return t;
      });

      // Update income
      _memory.incomes = _memory.incomes.map((inc) => {
        if ((incomeCode && inc.gelirKodu === incomeCode) || (szlNo && inc.sozlesmeNo === szlNo)) {
          const updatedTotalPaid = roundKurus((Number(inc.toplamTahsilat) || 0) + amount);
          const updatedRem = Math.max(0, (Number(inc.brutTutar) || 0) - updatedTotalPaid);
          return {
            ...inc,
            toplamTahsilat: updatedTotalPaid,
            kalanAlacak: updatedRem,
            tamTahsilEdildiMi: updatedRem <= 0
          };
        }
        return inc;
      });

      // Update contract
      _memory.contracts = _memory.contracts.map((c) => {
        if ((szlNo && (c.sozlesmeNo === szlNo || c.sozlesme_no === szlNo)) || (cntId && c.id === cntId)) {
          const gross = Number(c.brutTutar || c.brut_tutar || 0);
          const currentPaid = Number(c.toplamTahsilat !== undefined ? c.toplamTahsilat : (c.toplam_tahsilat || 0));
          const updatedPaid = roundKurus(currentPaid + amount);
          const updatedRem = Math.max(0, gross - updatedPaid);
          return {
            ...c,
            toplamTahsilat: updatedPaid,
            toplam_tahsilat: updatedPaid,
            kalanAlacak: updatedRem,
            kalan_alacak: updatedRem
          };
        }
        return c;
      });
      writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    }

    writeCache("cozum_ssot_collections_v2", _memory.collections);
    writeCache("cozum_ssot_installments_v2", _memory.installments);
    writeCache("cozum_ssot_incomes_v2", _memory.incomes);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return newColl;
  },

  cancelCollection(cancelData = {}) {
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") return apiFetch(`${getApiUrl()}/api/payments/cancel`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:cancelData.payment_id || cancelData.id,student_id:cancelData.studentId || cancelData.student_id,contract_id:cancelData.contractId || cancelData.contract_id,sozlesme_no:cancelData.sozlesmeNo,installment_id:cancelData.installment_id || cancelData.taksitId,installment_no:cancelData.installment_no ?? cancelData.taksitNo})}).then(async res => {
      const saved=await res.json(); await this.fetchCollections(); await this.fetchInstallments(); await this.fetchContracts(); await this.fetchIncomes();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });

    const sId = cancelData.studentId || cancelData.student_id;
    const szlNo = cancelData.sozlesmeNo || cancelData.sozlesme_no;
    const cntId = cancelData.contractId || cancelData.contract_id;
    const targetInstNo = cancelData.installment_no !== undefined ? cancelData.installment_no : cancelData.taksitNo;
    const targetInstId = cancelData.installment_id || cancelData.taksitId;
    const amount = Number(cancelData.amount || 0);

    // 1. Update matching collection in _memory.collections
    _memory.collections = _memory.collections.map((c) => {
      const matchSzl = (szlNo && (c.sozlesmeNo === szlNo || c.sozlesme_no === szlNo));
      const matchInst = targetInstNo !== undefined && (
        Number(c.installment_no) === Number(targetInstNo) ||
        Number(c.taksitNo) === Number(targetInstNo) ||
        (c.note && (c.note.includes(`${targetInstNo}. Taksit`) || c.note.includes(`Taksit ${targetInstNo}`)))
      );
      const match = (c.installment_id && targetInstId && c.installment_id === targetInstId) ||
        (c.id && cancelData.payment_id && c.id === cancelData.payment_id) ||
        (matchSzl && matchInst);
      if (match) {
        return { ...c, is_cancelled: 1, status: "İptal Edildi", durum: "İptal Edildi", durumText: "İptal Edildi" };
      }
      return c;
    });

    // 2. Reset installment in _memory.installments
    _memory.installments = _memory.installments.map((t) => {
      const match = (targetInstId && t.id === targetInstId) ||
        ((szlNo && (t.sozlesmeNo === szlNo || t.contractId === cntId)) && Number(t.taksitNo || t.installment_no) === Number(targetInstNo));
      if (match) {
        const amt = Number(t.taksitTutari || t.amount || 0);
        return {
          ...t,
          tahsilEdilen: 0,
          paid_amount: 0,
          kalanTutar: amt,
          durumText: "Bekliyor",
          status: "Bekliyor",
          tahsilatTarihi: null,
          payment_date: null
        };
      }
      return t;
    });

    // 3. Update _memory.incomes
    _memory.incomes = _memory.incomes.map((inc) => {
      if (szlNo && inc.sozlesmeNo === szlNo) {
        const updatedTotalPaid = Math.max(0, roundKurus((Number(inc.toplamTahsilat) || 0) - amount));
        const updatedRem = Math.max(0, (Number(inc.brutTutar) || 0) - updatedTotalPaid);
        return {
          ...inc,
          toplamTahsilat: updatedTotalPaid,
          kalanAlacak: updatedRem,
          tamTahsilEdildiMi: updatedRem <= 0
        };
      }
      return inc;
    });

    // 3b. Update _memory.contracts
    _memory.contracts = _memory.contracts.map((c) => {
      if ((szlNo && (c.sozlesmeNo === szlNo || c.sozlesme_no === szlNo)) || (cntId && c.id === cntId)) {
        const gross = Number(c.brutTutar || c.brut_tutar || 0);
        const currentPaid = Number(c.toplamTahsilat !== undefined ? c.toplamTahsilat : (c.toplam_tahsilat || 0));
        const updatedPaid = Math.max(0, roundKurus(currentPaid - amount));
        const updatedRem = Math.max(0, gross - updatedPaid);
        return {
          ...c,
          toplamTahsilat: updatedPaid,
          toplam_tahsilat: updatedPaid,
          kalanAlacak: updatedRem,
          kalan_alacak: updatedRem
        };
      }
      return c;
    });

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    writeCache("cozum_ssot_collections_v2", _memory.collections);
    writeCache("cozum_ssot_installments_v2", _memory.installments);
    writeCache("cozum_ssot_incomes_v2", _memory.incomes);

    // 4. Remote API call to Cloudflare D1
    if (typeof fetch === "function" && process.env.NODE_ENV !== "test") {
      const apiUrl = getApiUrl();
      try {
        const p = apiFetch(`${apiUrl}/api/payments/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: sId,
            sozlesme_no: szlNo,
            contract_id: cntId,
            installment_no: targetInstNo,
            installment_id: targetInstId,
            payment_id: cancelData.payment_id,
            amount
          })
        });
        if (p && typeof p.then === "function") {
          p.then(() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("cozum_students_updated"));
            }
          }).catch((err) => console.warn("[AccountingService] Remote cancel payment error:", err));
        }
      } catch (err) {
        console.warn("[AccountingService] Remote cancel payment error:", err);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
  },


  setInitialData({ contracts = [], incomes = [], installments = [], collections = [], summary = null } = {}) {
    if (Array.isArray(contracts)) _memory.contracts = [...contracts];
    if (Array.isArray(incomes)) _memory.incomes = [...incomes];
    if (Array.isArray(installments)) _memory.installments = [...installments];
    if (Array.isArray(collections)) {
      const formatted = collections.map(formatCollectionRecord);
      _memory.collections = formatted;
      writeCache("cozum_ssot_collections_v2", formatted);
    }
    if (summary) _memory.summary = summary;
  },

  resetCustomData() {
    cacheEpoch++;
    _memory.contracts = [];
    _memory.incomes = [];
    _memory.installments = [];
    _memory.collections = [];
    _memory.summary = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("cozum_ssot_contracts_v2");
      localStorage.removeItem("cozum_ssot_incomes_v2");
      localStorage.removeItem("cozum_ssot_installments_v2");
      localStorage.removeItem("cozum_ssot_collections_v2");
      localStorage.removeItem("cozum_ssot_summary_v2");
    }

  }
};

export default AccountingService;
