// Cloudflare Pages SSOT REST Client - AccountingService
// Single Source of Truth (SSOT) connected directly to Cloudflare D1 via /api/*
// NO static JSON imports, NO localStorage tombstones, NO protectedKeys hack lists.

import { roundKurus } from "./installmentService.js";

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
    if (custom) return custom.replace(/\/$/, "");
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
    if (typeof fetch === "undefined") return _memory.contracts;
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/contracts`);
      if (!res || !res.ok) return _memory.contracts;
      const rows = await res.json();
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

    // Trigger background fetch if memory is empty
    if (list.length === 0 && !_memory.isFetching && typeof window !== "undefined") {
      _memory.isFetching = true;
      this.fetchContracts().finally(() => {
        _memory.isFetching = false;
        window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    // Dynamic synthesis for any freshly added remote students without contracts yet
    if (Array.isArray(remoteStudents) && remoteStudents.length > 0) {
      const existingNames = new Set(list.map((c) => trNorm(c.ogrenciAdi || c.student_name)));
      const existingNos = new Set(list.map((c) => trNorm(c.sozlesmeNo)));
      const existingIds = new Set(list.flatMap((c) => {
        const sid = String(c.studentId || c.student_id || "");
        return [sid, sid.replace(/^stu-/, "")];
      }));

      remoteStudents.forEach((st) => {
        if (!st || st.has_contract === false || st.contract_deleted) return;
        if (!st.has_contract && !st.sozlesme_no && Number(st.total_fee || 0) <= 0) return;
        const sName = trNorm(st.student_name);
        if (!sName || existingNames.has(sName)) return;
        const cleanId = String(st.id || "").replace(/^stu-/, "");
        if (st.id && (existingIds.has(String(st.id)) || existingIds.has(cleanId))) return;
        if (st.sozlesme_no && existingNos.has(trNorm(st.sozlesme_no))) return;

        const synth = this.buildSyntheticContractForStudent(st);
        if (synth) {
          list.push(synth);
          _memory.contracts.push(synth);
          existingNames.add(sName);
          existingNos.add(trNorm(synth.sozlesmeNo));

          // Also populate default installments for this student contract in memory
          const count = Math.max(1, synth.taksitSayisi || 8);
          const total = Number(synth.brutTutar) || 75000;
          const baseAmt = Math.floor((total / count) * 100) / 100;
          const remainder = roundKurus(total - (baseAmt * count));
          const baseDate = new Date(synth.sozlesmeTarihi || new Date());
          for (let i = 1; i <= count; i++) {
            const isLast = (i === count);
            const amt = isLast ? roundKurus(baseAmt + remainder) : baseAmt;
            const d = new Date(baseDate);
            d.setMonth(d.getMonth() + i - 1);
            d.setDate(15);
            const dueStr = d.toISOString().split("T")[0];
            _memory.installments.push({
              id: `inst_${synth.id}_${i}`,
              contractId: synth.id,
              sozlesmeNo: synth.sozlesmeNo,
              ogrenciAdi: synth.ogrenciAdi,
              ogrenciAdiSoyadi: synth.ogrenciAdi,
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
        }
      });
    }

    return list.filter((c) => !c.is_deleted);
  },

  // 2. Fetch & Get Installments (SSOT from /api/installments with Peşinat taksitNo: 0 support)
  async fetchInstallments(contractId = null) {
    if (typeof fetch === "undefined") return _memory.installments;
    try {
      const apiUrl = getApiUrl();
      const q = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : "";
      const res = await fetch(`${apiUrl}/api/installments${q}`);
      if (!res || !res.ok) return _memory.installments;
      const rows = await res.json();
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      const formatted = list.map((r) => {
        const no = (r.taksitNo !== undefined && r.taksitNo !== null) 
          ? Number(r.taksitNo) 
          : ((r.installment_no !== undefined && r.installment_no !== null) ? Number(r.installment_no) : 1);
        const amt = Number(r.taksitTutari || r.amount || 0);
        const paid = Number(r.tahsilEdilen || r.paid_amount || 0);
        const rem = Math.max(0, amt - paid);

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
          vadeTarihi: r.due_date || r.vadeTarihi,
          due_date: r.due_date || r.vadeTarihi,
          durumText: r.status || (paid >= amt && amt > 0 ? "Tam Ödendi" : paid > 0 ? "Kısmi Ödendi" : no === 0 ? "Peşinat" : "Bekliyor"),
          receiptNo: r.receipt_no,
          paymentDate: r.payment_date
        };
      });

      if (!contractId) {
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

    if (list.length === 0 && !_memory.isFetching && typeof window !== "undefined") {
      this.fetchInstallments().then((insts) => {
        if (insts.length > 0) window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    // Synthesize installments from active contracts if installments not yet cached
    if (list.length === 0 && _memory.contracts.length > 0) {
      _memory.contracts.forEach((cnt) => {
        const count = Math.max(1, cnt.taksitSayisi || 8);
        const total = Number(cnt.brutTutar) || 75000;
        const baseAmt = Math.floor((total / count) * 100) / 100;
        const remainder = roundKurus(total - (baseAmt * count));
        const baseDate = new Date(cnt.sozlesmeTarihi || new Date());

        for (let i = 1; i <= count; i++) {
          const isLast = (i === count);
          const amt = isLast ? roundKurus(baseAmt + remainder) : baseAmt;
          const d = new Date(baseDate);
          d.setMonth(d.getMonth() + i - 1);
          d.setDate(15);
          const dueStr = d.toISOString().split("T")[0];

          list.push({
            id: `inst_${cnt.id}_${i}`,
            contractId: cnt.id,
            sozlesmeNo: cnt.sozlesmeNo,
            ogrenciAdi: cnt.ogrenciAdi,
            ogrenciAdiSoyadi: cnt.ogrenciAdi,
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
      });
    }

    return list;
  },

  // 3. Fetch & Get Incomes (SSOT from /api/student-incomes)
  async fetchIncomes() {
    if (typeof fetch === "undefined") return _memory.incomes;
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/student-incomes`);
      if (!res || !res.ok) return _memory.incomes;
      const rows = await res.json();
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
    let list = [..._memory.incomes];

    if (list.length === 0 && typeof window !== "undefined") {
      this.fetchIncomes().then((incs) => {
        if (incs.length > 0) window.dispatchEvent(new Event("cozum_accounting_updated"));
      });
    }

    // Synthesize income objects from contracts if empty
    if (list.length === 0 && _memory.contracts.length > 0) {
      list = _memory.contracts.map((c) => ({
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
        toplamTahsilat: 0,
        kalanAlacak: c.brutTutar,
        tamTahsilEdildiMi: false,
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

  // 4. Collections (Payments)
  getCollections() {
    return _memory.collections;
  },

  // 5. Dynamic Summary (SSOT from /api/accounting/summary)
  async fetchSummary() {
    if (typeof fetch === "undefined") return _memory.summary;
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/accounting/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = await res.json();
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
    if (typeof fetch === "function" && !incomeData.skipRemoteSync && !incomeData.contract_id && !incomeData.sozlesmeNo) {
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/api/contracts`, {
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
      }).catch((err) => console.warn("[AccountingService] Remote contract POST error:", err));
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
    _memory.contracts = [newContract, ..._memory.contracts.filter((c) => trNorm(c.ogrenciAdi) !== nameNorm)];
    _memory.incomes = [newIncome, ..._memory.incomes.filter((i) => trNorm(i.ogrenciAdiSoyadi) !== nameNorm)];
    _memory.installments = [...newInstallments, ..._memory.installments.filter((t) => trNorm(t.ogrenciAdi) !== nameNorm)];

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
    const targetKey = typeof contractOrNo === "object" ? (contractOrNo.id || contractOrNo.sozlesmeNo || contractOrNo.ogrenciAdi || contractOrNo.student_name) : contractOrNo;
    if (!targetKey) return false;

    const norm = trNorm(targetKey);
    _memory.contracts = _memory.contracts.map((c) => {
      if (trNorm(c.id) === norm || trNorm(c.sozlesmeNo) === norm || trNorm(c.studentId) === norm || trNorm(c.ogrenciAdi) === norm) {
        return { ...c, durum: 3, durumText: "İptal Edildi", is_deleted: true };
      }
      return c;
    });

    _memory.incomes = _memory.incomes.map((i) => {
      if (trNorm(i.id) === norm || trNorm(i.sozlesmeNo) === norm || trNorm(i.gelirKodu) === norm || trNorm(i.ogrenciAdiSoyadi) === norm) {
        return { ...i, durum: 3, is_deleted: true };
      }
      return i;
    });

    _memory.installments = _memory.installments.filter((t) => trNorm(t.contractId) !== norm && trNorm(t.sozlesmeNo) !== norm && trNorm(t.ogrenciAdi) !== norm);

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    writeCache("cozum_ssot_incomes_v2", _memory.incomes);
    writeCache("cozum_ssot_installments_v2", _memory.installments);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }

    if (typeof fetch === "function") {
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/api/contracts/${encodeURIComponent(targetKey)}`, {
        method: "DELETE"
      }).catch((err) => console.warn("[AccountingService] Remote contract DELETE error:", err));
    }

    return true;
  },

  deleteIncome(incomeOrCode) {
    return this.deleteContract(incomeOrCode);
  },

  async signContract(targetKey, signerType = "kurum", signerName = "Kurum Yetkilisi") {
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/contracts/${encodeURIComponent(targetKey)}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signer_type: signerType, signer_name: signerName })
      });
    } catch (err) {
      console.warn("[AccountingService] Remote contract SIGN error:", err);
    }

    const norm = trNorm(targetKey);
    _memory.contracts = _memory.contracts.map((c) => {
      if (trNorm(c.id) === norm || trNorm(c.sozlesmeNo) === norm) {
        return {
          ...c,
          isSigned: true,
          is_signed: true,
          kurumImzaAlindi: true,
          kurumImzalayan: signerName,
          signedAt: new Date().toISOString()
        };
      }
      return c;
    });

    writeCache("cozum_ssot_contracts_v2", _memory.contracts);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return true;
  },

  updateContract(idOrSzl, patch = {}) {
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

    if (typeof fetch === "function") {
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/api/contracts/${encodeURIComponent(idOrSzl)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }).catch((err) => console.warn("[AccountingService] Remote contract PATCH error:", err));
    }

    return true;
  },

  // 7. Installment Management with Peşinat (taksitNo: 0) Support
  saveInstallments(contractIdOrNo, installments = []) {
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
    const amount = Number(paymentData.amount || paymentData.tahsilatTutari || 0);
    const incomeCode = paymentData.gelirKodu;
    const newColl = {
      id: `pay_${Date.now()}`,
      tahsilatTutari: amount,
      amount,
      gelirKodu: incomeCode,
      sozlesmeNo: paymentData.sozlesmeNo,
      tahsilatTarihi: paymentData.date || new Date().toISOString().slice(0, 10),
      kasaBankaAdi: paymentData.bank || "Nakit Ana Kasa"
    };

    _memory.collections = [newColl, ..._memory.collections];

    // Amortize against installments
    if (incomeCode) {
      let unapplied = amount;
      _memory.installments = _memory.installments.map((t) => {
        if (t.gelirKodu === incomeCode && unapplied > 0) {
          const due = Number(t.taksitTutari || t.amount || 0);
          const currentPaid = Number(t.tahsilEdilen || 0);
          const need = Math.max(0, due - currentPaid);
          const apply = Math.min(need, unapplied);
          unapplied -= apply;
          const updatedPaid = roundKurus(currentPaid + apply);
          const updatedRem = Math.max(0, due - updatedPaid);

          return {
            ...t,
            tahsilEdilen: updatedPaid,
            kalanTutar: updatedRem,
            durumText: updatedRem <= 0 ? "Tam Ödendi" : "Kısmi Ödendi"
          };
        }
        return t;
      });

      // Update income
      _memory.incomes = _memory.incomes.map((inc) => {
        if (inc.gelirKodu === incomeCode) {
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
    }

    writeCache("cozum_ssot_collections_v2", _memory.collections);
    writeCache("cozum_ssot_installments_v2", _memory.installments);
    writeCache("cozum_ssot_incomes_v2", _memory.incomes);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
    return newColl;
  },

  buildSyntheticContractForStudent(st) {
    if (!st) return null;
    const fee = Number(st.total_fee || 0);
    let extraSum = 0;
    try {
      const extras = typeof st.extra_fees === "string" ? JSON.parse(st.extra_fees || "{}") : (st.extra_fees || {});
      extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
    } catch {}
    const disc = Number(st.discount_amount || 0);
    const gross = Math.max(0, fee + extraSum - disc) || fee || 75000;
    const count = Math.max(1, parseInt(st.installment_count) || 8);
    const net = roundKurus(gross / 1.1);
    const vat = roundKurus(gross - net);
    const sName = trNorm(st.student_name) || "ÖĞRENCİ";
    const szlNo = st.sozlesme_no || `SZL2026${String(Date.now()).slice(-5)}`;

    return {
      id: st.id ? `cnt_${st.id}` : `cnt_${Date.now()}`,
      sozlesmeNo: szlNo,
      sozlesme_no: szlNo,
      studentId: st.id,
      student_id: st.id,
      ogrenciId: st.id,
      ogrenciAdi: sName,
      student_name: sName,
      ogrenciAdiSoyadi: sName,
      sinifAdi: st.student_class || "8-A",
      parentName: st.parent_name ? trNorm(st.parent_name) : sName,
      musteriUnvan: st.parent_name ? trNorm(st.parent_name) : sName,
      netTutar: net,
      kdvTutari: vat,
      brutTutar: gross,
      taksitSayisi: count,
      odemeTuru: 1,
      odemeTuruText: `Taksitli (${count} Taksit)`,
      donemId: st.donem_id || 113,
      donemAdi: "2026-2027",
      durum: 1,
      durumText: "Aktif",
      isSigned: false,
      sozlesmeTarihi: st.created_at || new Date().toISOString()
    };
  },

  setInitialData({ contracts = [], incomes = [], installments = [], collections = [], summary = null } = {}) {
    if (contracts && contracts.length) _memory.contracts = [...contracts];
    if (incomes && incomes.length) _memory.incomes = [...incomes];
    if (installments && installments.length) _memory.installments = [...installments];
    if (collections && collections.length) _memory.collections = [...collections];
    if (summary) _memory.summary = summary;
  },

  resetCustomData() {
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
    if (typeof window !== "undefined" && typeof fetch === "function") {
      this.fetchContracts().catch(() => {});
      this.fetchInstallments().catch(() => {});
      this.fetchSummary().catch(() => {});
      window.dispatchEvent(new Event("cozum_accounting_updated"));
    }
  }
};

export default AccountingService;
