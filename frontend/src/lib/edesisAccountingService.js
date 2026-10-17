// Cloudflare Pages SSOT REST Client - AccountingService
// Single Source of Truth (SSOT) connected directly to Cloudflare D1 via /api/*
// NO static JSON imports, NO localStorage tombstones, NO protectedKeys hack lists.

import { roundKurus, normalizeDate } from "./installmentService.js";
import { apiFetch, isAllowedBackendUrl } from "./utils.js";
import {dataScope} from './dataSync.js';

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

let cacheEpoch = 0;
const readVersions={contracts:0,installments:0,incomes:0,collections:0,summary:0};
// In-memory cache for ultra-fast render lookups
const _memory = {
  contracts: [],
  incomes: [],
  installments: [],
  collections: [],
  summary: null,
  isFetching: false,
};

let cacheScope=dataScope();
function ensureScope(){if(cacheScope!==dataScope()){cacheScope=dataScope();AccountingService.resetCustomData();}}

export function formatContractRecord(r) {
  if (!r) return null;
  const no = r.sozlesmeNo || r.sozlesme_no || "";
  const studentId = r.student_id || r.studentId || r.ogrenciId;
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
    studentId,
    student_id: studentId,
    ogrenciId: studentId,
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

const incomeFields={gelirKodu:'gelir_kodu',sozlesmeNo:'sozlesme_no',ogrenciAdi:'student_name',ogrenciAdiSoyadi:'student_name',ogrenciNo:'student_no',ogrenciId:'student_id',sinifAdi:'student_class',musteriUnvan:'musteri_unvan',brutTutar:'brut_tutar',netTutar:'net_tutar',kdvTutari:'kdv_tutari',toplamTahsilat:'toplam_tahsilat',kalanAlacak:'kalan_alacak',gelirTarihi:'gelir_tarihi',taksitSayisi:'taksit_sayisi',kalanTaksitSayisi:'kalan_taksit_sayisi',aciklama:'title',donemId:'period_id',donemAdi:'period_name'};
export function formatIncomeRecord(row){
  return {...row,...Object.fromEntries(Object.entries(incomeFields).map(([alias,field])=>[alias,row[alias]??row[field]])),tamTahsilEdildiMi:!!(row.tamTahsilEdildiMi??row.tam_tahsil_edildi_mi),vadeTarihi:normalizeDate(row.vadeTarihi||row.vade_tarihi)};
}

const formatInstallmentRecord=(r) => {
        const no = (r.taksitNo !== undefined && r.taksitNo !== null)
          ? Number(r.taksitNo)
          : ((r.installment_no !== undefined && r.installment_no !== null) ? Number(r.installment_no) : 1);
        const amt = Number(r.taksitTutari || r.amount || 0);
        const paid = Number(r.tahsilEdilen || r.paid_amount || 0);
        const rem = r.contract_status===3 ? 0 : Math.max(0, amt - paid);
        const due=normalizeDate(r.due_date||r.vadeTarihi);
        const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
        const overdueDays=Math.max(0,Math.floor((Date.parse(today)-Date.parse(due))/86400000))||0;

        return {
          ...r,
          id: r.id,
          contractId: r.contract_id || r.contractId,
          contract_id: r.contract_id || r.contractId,
          incomeId: r.income_id || r.incomeId,
          studentId: r.student_id || r.studentId,
          ogrenciId:r.student_id||r.studentId||r.ogrenciId,
          sozlesmeNo: r.sozlesme_no || r.sozlesmeNo,
          ogrenciAdi: r.student_name || r.ogrenciAdi,
          ogrenciAdiSoyadi: r.student_name || r.ogrenciAdi,
          donemId:r.period_id??r.donemId,
          donemAdi:r.period_name??r.donemAdi,
          vadesiGectiMi:rem>0&&overdueDays>0,
          gecikmeGunSayisi:overdueDays,
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
          due_date: r.due_date ?? r.vadeTarihi ?? "",
          durumText: r.contract_status===3 ? 'İptal Edildi' : r.status ?? r.durumText ?? (paid >= amt && amt > 0 ? "Tam Ödendi" : paid > 0 ? "Kısmi Ödendi" : no === 0 ? "Peşinat" : "Bekliyor"),
          receiptNo: r.receipt_no,
          paymentDate: r.payment_date
        };
      };

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
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersions.contracts;
    if (typeof fetch === "undefined") return _memory.contracts;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/contracts`);
      if (!res || !res.ok) return _memory.contracts;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      if(version!==readVersions.contracts)return _memory.contracts;
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      const formatted = list.map(formatContractRecord);

      _memory.contracts = formatted;_memory.contractsLoaded=true;
      return formatted;
    } catch (err) {
      console.warn("[AccountingService] fetchContracts error:", err);
      throw err;
    }
  },

  getContracts(remoteStudents = [], propContracts = null) {
    ensureScope();
    return (_memory.contractsLoaded ? _memory.contracts : (propContracts || _memory.contracts)).filter(c=>!c.is_deleted).map(formatContractRecord);
  },

  // 2. Fetch & Get Installments (SSOT from /api/installments with Peşinat taksitNo: 0 support)
  async fetchInstallments(contractId = null) {
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersions.installments;
    if (typeof fetch === "undefined") return _memory.installments;
    try {
      const apiUrl = getApiUrl();
      const q = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : "";
      const res = await apiFetch(`${apiUrl}/api/installments${q}`);
      if (!res || !res.ok) return _memory.installments;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      if(version!==readVersions.installments)return _memory.installments;
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      const formatted = list.map(formatInstallmentRecord);

      if (contractId) {
        const normId = trNorm(contractId);
        const contract=_memory.contracts.find(c=>trNorm(c.id)===normId||trNorm(c.sozlesmeNo)===normId);
        const keys=new Set([normId,trNorm(contract?.id),trNorm(contract?.sozlesmeNo),...formatted.flatMap(i=>[trNorm(i.contractId),trNorm(i.sozlesmeNo)])].filter(Boolean));
        _memory.installments = [
          ..._memory.installments.filter(t => !keys.has(trNorm(t.contractId)) && !keys.has(trNorm(t.sozlesmeNo))),
          ...formatted
        ];
      } else {
        _memory.installments = formatted;
      }
      return formatted;
    } catch (err) {
      console.warn("[AccountingService] fetchInstallments error:", err);
      throw err;
    }
  },

  getInstallments() { ensureScope();return _memory.installments.map(i=>({...i})); },

  // 3. Fetch & Get Incomes (SSOT from /api/student-incomes)
  async fetchIncomes() {
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersions.incomes;
    if (typeof fetch === "undefined") return _memory.incomes;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/student-incomes`);
      if (!res || !res.ok) return _memory.incomes;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      if(version!==readVersions.incomes)return _memory.incomes;
      const list = Array.isArray(rows) ? rows : (rows?.data || []);

      _memory.incomes = list.map(formatIncomeRecord);
      return this.getIncomes();
    } catch (err) {
      console.warn("[AccountingService] fetchIncomes error:", err);
      throw err;
    }
  },

  getIncomes() { ensureScope();return _memory.incomes.filter(i=>!i.is_deleted).map(formatIncomeRecord); },

  // 4. Collections (Payments - SSOT from /api/payments)
  async fetchCollections() {
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersions.collections;
    if (typeof fetch === "undefined") return _memory.collections;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/payments`);
      if (!res || !res.ok) return _memory.collections;
      const rows = await res.json();
      if (epoch!==cacheEpoch) return [];
      if(version!==readVersions.collections)return _memory.collections;
      const list = Array.isArray(rows) ? rows : (rows?.data || []);
      const formatted = list.map(formatCollectionRecord);
      _memory.collections = formatted;_memory.collectionsLoaded=true;
      return formatted;
    } catch (err) {
      console.warn("[AccountingService] fetchCollections error:", err);
      throw err;
    }
  },

  getCollections(propPayments = null) {
    ensureScope();
    return (_memory.collectionsLoaded ? _memory.collections : (propPayments || _memory.collections)).map(formatCollectionRecord);
  },

  // 5. Dynamic Summary (SSOT from /api/accounting/summary)
  async fetchSummary() {
    ensureScope();
    const epoch=cacheEpoch;
    const version=++readVersions.summary;
    if (typeof fetch === "undefined") return _memory.summary;
    try {
      const apiUrl = getApiUrl();
      const res = await apiFetch(`${apiUrl}/api/accounting/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = await res.json();
      if (epoch!==cacheEpoch) return null;
      if(version!==readVersions.summary)return _memory.summary;
      _memory.summary = summary;
      return summary;
    } catch (err) {
      console.warn("[AccountingService] fetchSummary error:", err);
      throw err;
    }
  },

  getSummary() {
    ensureScope();
    if (_memory.summary) return {..._memory.summary};
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
    if(incomeData.skipRemoteSync||incomeData.contract_id||incomeData.sozlesmeNo)return this.refresh().then(()=>({contract:this.getContracts().find(c=>c.id===incomeData.contract_id||c.sozlesmeNo===incomeData.sozlesmeNo)}));
    return apiFetch(`${getApiUrl()}/api/contracts`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({student_id:incomeData.studentId || incomeData.student_id,student_name:incomeData.ogrenciAdi || incomeData.ogrenciAdiSoyadi,parent_name:incomeData.veliAdi,student_class:incomeData.sinifAdi,total_amount:incomeData.brutTutar,installment_count:incomeData.taksitSayisi,due_date:incomeData.vadeTarihi})}).then(async res => {
      const saved=await res.json();await this.refreshAfterWrite();const contract=this.getContracts().find(c=>c.id===saved.id)||formatContractRecord(saved);
      return {contract,income:this.getIncomes().find(i=>i.contract_id===contract.id||i.sozlesmeNo===contract.sozlesmeNo),installments:this.getInstallments().filter(i=>i.contractId===contract.id)};
    });
  },

  deleteContract(contractOrNo) {
    return apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(typeof contractOrNo === "object" ? contractOrNo.id || contractOrNo.sozlesmeNo : contractOrNo)}`, {method:"DELETE",headers:{"Content-Type":"application/json"},body:undefined}).then(async res => {
      const saved=await res.json(); await this.refreshAfterWrite();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });
  },

  async cancelContract(contractOrNo,reason) {
    const key=typeof contractOrNo==='object' ? contractOrNo?.id || contractOrNo?.sozlesmeNo : contractOrNo;
    if(!key)throw new Error('Sözleşme bulunamadı');
    const res=await apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(key)}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});
    const saved=await res.json();
    await this.refreshAfterWrite();
    if(typeof window!=='undefined')window.dispatchEvent(new Event('cozum_accounting_updated'));
    return saved;
  },

  deleteIncome(incomeOrCode) {
    const income=typeof incomeOrCode==='object'?incomeOrCode:this.getIncomes().find(i=>i.id===incomeOrCode||i.gelirKodu===incomeOrCode);
    const key=income?.contract_id||income?.contractId||income?.sozlesmeNo||income?.sozlesme_no;
    if(!key)return Promise.reject(new Error('Gelirin bağlı olduğu sözleşme bulunamadı'));
    return this.deleteContract(key);
  },

  async signContract(targetKey, signerType = "kurum", signerName = "") {
    const epoch=cacheEpoch;
    const res=await apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(targetKey)}/sign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({signer_type:signerType,signer_name:signerName})});
    const saved=await res.json();
    if(epoch!==cacheEpoch)return saved.contract;
    await this.refreshAfterWrite();
    if(typeof window!=="undefined")window.dispatchEvent(new Event("cozum_accounting_updated"));
    return saved.contract;
  },

  async addNote(type,id,text) {
    if(!['contracts','student-incomes'].includes(type)||!id) throw new Error('Not kaydı bulunamadı');
    const res=await apiFetch(`${getApiUrl()}/api/${type}/${encodeURIComponent(id)}/notes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    const saved=await res.json();
    if(!res.ok) throw new Error(saved.detail || 'Not kaydedilemedi');
    await this.refreshAfterWrite();
    if(typeof window!=='undefined') window.dispatchEvent(new Event('cozum_accounting_updated'));
    return saved.notes;
  },

  updateContract(idOrSzl, patch = {}) {
    return apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(idOrSzl)}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)}).then(async res => {
      const saved=await res.json(); await this.refreshAfterWrite();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });
  },

  saveInstallments(contractIdOrNo, installments = [], options = {}) {
    return apiFetch(`${getApiUrl()}/api/contracts/${encodeURIComponent(typeof contractIdOrNo === "object" ? contractIdOrNo.id || contractIdOrNo.sozlesmeNo : contractIdOrNo)}/installments`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({installments,expectedInstallments:options.expectedInstallments})}).then(async res => {
      const saved=await res.json(); await this.refreshAfterWrite();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });
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

      return this.saveInstallments(szlNo, newInsts);
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
    if(paymentData.alreadyPersisted)return this.refreshAfterWrite().then(()=>paymentData);
      const id = paymentData.id || "pay_" + crypto.randomUUID();
      return apiFetch(`${getApiUrl()}/api/payments`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id,student_id:paymentData.studentId || paymentData.student_id,contract_id:paymentData.contractId || paymentData.contract_id,sozlesme_no:paymentData.sozlesmeNo || paymentData.sozlesme_no,
        installment_id:paymentData.installment_id || paymentData.taksitId,installment_no:paymentData.installment_no ?? paymentData.taksitNo,amount:paymentData.amount || paymentData.tahsilatTutari,
        method:paymentData.method,bank:paymentData.bank || paymentData.kasaBankaAdi,payment_date:paymentData.payment_date || paymentData.date || paymentData.tahsilatTarihi,note:paymentData.note
      })}).then(async res => {
        const saved=await res.json();
        await this.refreshAfterWrite();
        if (typeof window!=="undefined") window.dispatchEvent(new Event("cozum_accounting_updated"));
        return formatCollectionRecord(saved);
      });
  },

  cancelCollection(cancelData = {}) {
    return apiFetch(`${getApiUrl()}/api/payments/cancel`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:cancelData.payment_id || cancelData.id,student_id:cancelData.studentId || cancelData.student_id,contract_id:cancelData.contractId || cancelData.contract_id,sozlesme_no:cancelData.sozlesmeNo,installment_id:cancelData.installment_id || cancelData.taksitId,installment_no:cancelData.installment_no ?? cancelData.taksitNo})}).then(async res => {
      const saved=await res.json(); await this.refreshAfterWrite();
      if(typeof window!=="undefined"){window.dispatchEvent(new Event("cozum_accounting_updated"));window.dispatchEvent(new Event("cozum_students_updated"));}
      return saved;
    });
  },

  refresh(){
    ensureScope();
    if(!this.refreshing){
      const epoch=cacheEpoch;
      const request=apiFetch(`${getApiUrl()}/api/dashboard`).then(r=>r.json()).then(data=>{if(epoch===cacheEpoch)this.acceptDashboard(data);return data;}).finally(()=>{if(this.refreshing===request)this.refreshing=null;});
      this.refreshing=request;
    }
    return this.refreshing;
  },
  async refreshAfterWrite(){
    try{return await this.refresh();}
    catch(cause){throw Object.assign(new Error('İşlem sunucuda kaydedildi, fakat güncel görünüm yüklenemedi. Aynı işlemi tekrar göndermeden sayfayı yenileyin.'),{code:'WRITE_COMMITTED',cause});}
  },
  acceptDashboard(data){
    ensureScope();
    for(const key of Object.keys(readVersions))readVersions[key]++;
    _memory.contracts=(data.contracts||[]).map(formatContractRecord);_memory.contractsLoaded=true;
    _memory.collections=(data.payments||[]).map(formatCollectionRecord);_memory.collectionsLoaded=true;
    _memory.summary=data.accounting||data.summary||null;
    if(Array.isArray(data.installments))_memory.installments=data.installments.map(formatInstallmentRecord);
    if(Array.isArray(data.incomes))_memory.incomes=data.incomes.map(formatIncomeRecord);
  },

  setInitialData({ contracts = [], incomes = [], installments = [], collections = [], summary = null } = {}) {
    cacheScope=dataScope();
    if (Array.isArray(contracts)) {_memory.contracts = contracts.map(formatContractRecord);_memory.contractsLoaded=true;}
    if (Array.isArray(incomes)) _memory.incomes = incomes.map(formatIncomeRecord);
    if (Array.isArray(installments)) _memory.installments = installments.map(i=>({...i}));
    if (Array.isArray(collections)) {
      const formatted = collections.map(formatCollectionRecord);
      _memory.collections = formatted;_memory.collectionsLoaded=true;
    }
    if (summary) _memory.summary = summary;
  },

  resetCustomData() {
    cacheEpoch++;this.refreshing=null;
    _memory.contractsLoaded=false;_memory.collectionsLoaded=false;
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
