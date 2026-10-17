import AccountingService from "../lib/edesisAccountingService";
import { StudentService } from "../lib/edesisStudentService";
import React,{act} from 'react';
import EdesisSozlesmeler from '../components/EdesisSozlesmeler';
import {render,cleanup,fireEvent} from './test_helpers';

describe("AccountingService and StudentService SSOT Contract Management", () => {
  beforeEach(() => {
    localStorage.clear();
    AccountingService.resetCustomData();
  });
  afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

  test('contract cancellation waits for the server and displays persisted status despite stale props',async()=>{
    const contract={id:'cancel-ui',sozlesmeNo:'SZL-CANCEL-UI',ogrenciAdi:'Örnek Öğrenci',brutTutar:1000,toplamTahsilat:100,kalanAlacak:900,durum:1};
    AccountingService.setInitialData({contracts:[contract]});
    const cancelled={...contract,durum:3,durumText:'İptal Edildi',kalanAlacak:0};
    let resolvePost;let posted=false;
    jest.spyOn(globalThis,'fetch').mockImplementation(async(url,options={})=>{
      if(options.method==='POST'){posted=true;return new Promise(resolve=>{resolvePost=()=>resolve({ok:true,json:async()=>({ok:true,contract:cancelled})});});}
      return {ok:true,json:async()=>String(url).endsWith('/dashboard')?{contracts:[cancelled],payments:[]}:[]};
    });
    const {container,getByText,getByRole}=await render(<EdesisSozlesmeler contracts={[contract]}/>);
    await fireEvent.click(container.querySelector('[data-sozlesme-dropdown="cancel-ui"] button'));
    await fireEvent.click([...container.querySelectorAll('div')].find(e=>e.textContent.trim()==='İptal Et'));
    await fireEvent.change(container.querySelector('textarea'),{target:{value:'Hatalı sözleşme'}});
    await fireEvent.click(getByRole('button',{name:'İptal Et'}));
    expect(posted).toBe(true);
    expect(getByRole('button',{name:'Kaydediliyor…'}).disabled).toBe(true);
    expect(AccountingService.getContracts()[0].durum).toBe(1);
    await act(async()=>{resolvePost();});
    expect(container.querySelector('textarea')).toBeNull();
    expect(AccountingService.getContracts()[0].durum).toBe(3);
    const row=container.querySelector('[data-sozlesme-dropdown="cancel-ui"]').closest('tr');
    expect(row.textContent).toContain('İptal');expect(row.textContent).not.toContain('Aktif');
  });

  test('failed cancellation preserves cached contracts and payment history',async()=>{
    AccountingService.setInitialData({contracts:[{id:'cancel-fail',durum:1}],collections:[{id:'receipt-preserved',amount:100}]});
    jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:false,status:500,json:async()=>({detail:'İptal kaydedilemedi'})});
    await expect(AccountingService.cancelContract('cancel-fail','Hatalı sözleşme')).rejects.toThrow('İptal kaydedilemedi');
    expect(AccountingService.getContracts()[0].durum).toBe(1);
    expect(AccountingService.getCollections()[0].id).toBe('receipt-preserved');
  });

  test("loads and formats real persisted contracts without creating ghost synthetic contracts", () => {
    const mockStudent = {
      id: "student-test-999",
      student_name: "YENI KAYIT TEST OGRENCI",
      parent_name: "TEST VELI",
      total_fee: 65000,
      sozlesme_no: "SZL202600099"
    };

    const mockContract = {
      id: "cnt_999",
      sozlesmeNo: "SZL202600099",
      studentId: "student-test-999",
      ogrenciAdi: "YENI KAYIT TEST OGRENCI",
      parentName: "TEST VELI",
      brutTutar: 65000,
      netTutar: 59090.91,
      kdvTutari: 5909.09,
      taksitSayisi: 5,
      odemeTuruText: "Taksitli (5 Taksit)",
      durum: 1,
      durumText: "Aktif",
      donemId: 113,
      sozlesmeTarihi: "2026-10-08T15:00:00"
    };

    AccountingService.setInitialData({ contracts: [mockContract] });
    const contracts = AccountingService.getContracts([mockStudent]);
    const found = contracts.find((c) => c.ogrenciAdi === "YENI KAYIT TEST OGRENCI");

    expect(found).toBeDefined();
    expect(found.brutTutar).toBe(65000);
    expect(found.durum).toBe(1);
    expect(found.durumText).toBe("Aktif");
    expect(found.taksitSayisi).toBe(5);
  });

  test("skips creating synthetic contracts for students who have no contract row", () => {
    const studentWithNoContract = {
      id: "no-contract-student",
      student_name: "SOZLESMESIZ OGRENCI",
      total_fee: 70000,
      has_contract: false
    };

    const contracts = AccountingService.getContracts([studentWithNoContract]);
    const found = contracts.find((c) => c.ogrenciAdi === "SOZLESMESIZ OGRENCI");
    expect(found).toBeUndefined();
  });

  test("preserves deletion: deleted contract drops from active list", async () => {
    const mockContract = {
      id: "cnt_del_666",
      sozlesmeNo: "SZL202600066",
      studentId: "student-test-666",
      ogrenciAdi: "SILINECEK OGRENCI",
      brutTutar: 30000,
      durum: 1,
      donemId: 113
    };

    AccountingService.setInitialData({ contracts: [mockContract] });
    const contractsBefore = AccountingService.getContracts();
    const foundBefore = contractsBefore.find((c) => c.ogrenciAdi === "SILINECEK OGRENCI");
    expect(foundBefore).toBeDefined();

    jest.spyOn(globalThis,"fetch").mockResolvedValue({ok:true,json:async()=>[]});
    await AccountingService.deleteContract(foundBefore);

    const contractsAfter = AccountingService.getContracts();
    const foundAfter = contractsAfter.find((c) => c.ogrenciAdi === "SILINECEK OGRENCI");
    expect(foundAfter).toBeUndefined();
  });

  test("stats.activeAmount decreases when a contract is deleted", async () => {
    const mockContracts = [
      { id: "cnt-1", studentId: "stu-1", sozlesmeNo: "SZL1", ogrenciAdi: "STUDENT ONE", brutTutar: 50000, donemId: 113, durum: 1 },
      { id: "cnt-2", studentId: "stu-2", sozlesmeNo: "SZL2", ogrenciAdi: "STUDENT TWO", brutTutar: 40000, donemId: 113, durum: 1 }
    ];

    AccountingService.setInitialData({ contracts: mockContracts });
    const contractsBefore = AccountingService.getContracts();
    const activeBefore = contractsBefore.filter((c) => String(c.donemId) === "113" && c.durum === 1);
    const amountBefore = activeBefore.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);
    expect(amountBefore).toBe(90000);

    const toDelete = activeBefore.find(c => c.ogrenciAdi === "STUDENT ONE");
    jest.spyOn(globalThis,"fetch").mockImplementation(async(url,options={})=>({ok:true,json:async()=>String(url).endsWith("/dashboard")?{contracts:[mockContracts[1]],payments:[]}:[]}));
    await AccountingService.deleteContract(toDelete);

    const contractsAfter = AccountingService.getContracts();
    const activeAfter = contractsAfter.filter((c) => String(c.donemId) === "113" && c.durum === 1);
    const amountAfter = activeAfter.reduce((sum, c) => sum + (Number(c.brutTutar) || 0), 0);

    expect(amountAfter).toBe(40000);
  });

  test("StudentService.getAllStudents maps contracts accurately", () => {
    const mockStudent = {
      id: "student-test-777",
      student_name: "ROZET TEST OGRENCI",
      total_fee: 50000,
      sozlesme_no: "SZL202600077"
    };

    const enriched = StudentService.getAllStudents([mockStudent]);
    const found = enriched.find((s) => s.student_name === "ROZET TEST OGRENCI");
    expect(found).toBeDefined();
    expect(found.sozlesme_no).toBe("SZL202600077");
  });
});
