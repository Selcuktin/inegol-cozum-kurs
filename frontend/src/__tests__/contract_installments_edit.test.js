import AccountingService from '../lib/edesisAccountingService';
import React, {act} from 'react';
import EdesisSozlesmeDetay from '../components/EdesisSozlesmeDetay';
import {render,cleanup,fireEvent} from './test_helpers';

describe('Contract and Installment Dynamic Edits', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  test('background refresh preserves an open plan draft and cancelling discards it',async()=>{
    const contract={id:'draft-plan',sozlesmeNo:'SZL-DRAFT',brutTutar:1000,netTutar:1000,durum:1};
    AccountingService.setInitialData({contracts:[contract],installments:[1,2].map(n=>({id:'draft-'+n,contractId:contract.id,sozlesmeNo:contract.sozlesmeNo,taksitNo:n,taksitTutari:500,tahsilEdilen:0,vadeTarihi:'2026-10-15'}))});
    const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
    await fireEvent.click(view.getByRole('button',{name:'Tutarları Düzenle'}));
    await fireEvent.change(view.container.querySelector('.installment-editor-row input[type="number"]'),{target:{value:'650'}});
    await act(async()=>window.dispatchEvent(new Event('cozum_accounting_updated')));
    expect(view.container.querySelector('.installment-editor-row input[type="number"]').value).toBe('650');
    await fireEvent.click(view.getByRole('button',{name:'Vazgeç'}));
    await fireEvent.click(view.getByRole('button',{name:'Tutarları Düzenle'}));
    expect(view.container.querySelector('.installment-editor-row input[type="number"]').value).toBe('500');
  });

  test('redistributing remaining debt preserves partial collections and the gross total',async()=>{
    const contract={id:'partial-plan',sozlesmeNo:'SZL-PARTIAL',brutTutar:1000,netTutar:1000,durum:1};
    AccountingService.setInitialData({contracts:[contract],installments:[1,2].map(n=>({id:'partial-'+n,contractId:contract.id,sozlesmeNo:contract.sozlesmeNo,taksitNo:n,taksitTutari:500,tahsilEdilen:n===1?200:0,vadeTarihi:'2026-10-15'}))});
    const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
    await fireEvent.click(view.getByRole('button',{name:'Tutarları Düzenle'}));
    await fireEvent.click(view.getByRole('button',{name:'Kalanı Eşit Dağıt'}));
    expect([...view.container.querySelectorAll('.installment-editor-row input[type="number"]')].map(e=>Number(e.value))).toEqual([600,400]);
  });

  test('failed remote plan save keeps the draft open and never announces success',async()=>{
    const contract={id:'failed-plan',sozlesmeNo:'SZL-FAILED',brutTutar:1000,durum:1};
    AccountingService.setInitialData({contracts:[contract],installments:[{id:'failed-one',contractId:contract.id,sozlesmeNo:contract.sozlesmeNo,taksitNo:1,taksitTutari:1000,tahsilEdilen:0,vadeTarihi:'2026-10-31'}]});
    const save=jest.spyOn(AccountingService,'saveInstallments').mockRejectedValue(new Error('Plan başka bir işlemde değişti'));
    const alert=jest.spyOn(window,'alert').mockImplementation(()=>{});
    try{
      const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
      await fireEvent.click(view.getByRole('button',{name:'Tutarları Düzenle'}));
      await fireEvent.change(view.container.querySelector('.installment-editor-row input[type="number"]'),{target:{value:'1200'}});
      await fireEvent.click(view.getByRole('button',{name:'Tamamla ve Kaydet'}));
      expect(view.container.querySelector('.installment-editor-row input[type="number"]').value).toBe('1200');
      expect(alert).toHaveBeenCalledWith('Plan başka bir işlemde değişti');expect(view.container.textContent).not.toContain('Sözleşme tutarı ve taksitler kaydedildi');
    }finally{save.mockRestore();alert.mockRestore();}
  });

  test('missing contact data and installment history stay empty instead of showing sample records',async()=>{
    const contract={id:'no-history',sozlesmeNo:'SZL-DEMO-EMPTY',student_id:'missing-student',ogrenciAdi:'Örnek boş kayıt',brutTutar:1000,toplamTahsilat:200,kalanAlacak:800,taksitSayisi:9,durum:1};
    AccountingService.setInitialData({contracts:[contract],incomes:[],installments:[],collections:[]});
    expect(AccountingService.getInstallments()).toEqual([]);
    const {container}=await render(<EdesisSozlesmeDetay contract={contract}/>);
    for(const label of ['TC KİMLİK','TELEFON']){
      const el=[...container.querySelectorAll('span')].find(e=>e.textContent===label);
      expect(el.parentElement.lastElementChild.textContent).toBe('—');
    }
    expect(container.querySelector('[aria-label="Sözleşme taksitleri tablosu"] tbody').children.length).toBe(0);
    expect(container.textContent).toContain('200,00');
  });

  test('contract student ID wins over a same-name student earlier in the list',async()=>{
    AccountingService.setInitialData({contracts:[],incomes:[],installments:[],collections:[]});
    const students=[{id:'wrong',student_name:'Örnek aynı ad',student_tc:'yanlış-kimlik'},{id:'correct',student_name:'Örnek aynı ad',student_tc:'doğru-kimlik'}];
    const contract={id:'identity-check',student_id:'correct',sozlesmeNo:'SZL-IDENTITY',ogrenciAdi:'Örnek aynı ad',brutTutar:100,durum:1};
    const {container}=await render(<EdesisSozlesmeDetay contract={contract} students={students}/>);
    expect(container.textContent).toContain('doğru-kimlik');expect(container.textContent).not.toContain('yanlış-kimlik');
  });

  test('detail preserves down payment zero and the recorded zero VAT rate',async()=>{
    const contract={id:'down-payment',sozlesmeNo:'SZL-DOWN-PAYMENT',ogrenciAdi:'Örnek peşinat',brutTutar:1000,netTutar:1000,kdvTutari:0,durum:1};
    AccountingService.setInitialData({contracts:[contract],incomes:[],collections:[],installments:[
      {id:'down-zero',contractId:contract.id,sozlesmeNo:contract.sozlesmeNo,taksitNo:0,taksitTutari:200,tahsilEdilen:200,kalanTutar:0},
      {id:'down-one',contractId:contract.id,sozlesmeNo:contract.sozlesmeNo,taksitNo:1,taksitTutari:800,tahsilEdilen:0,kalanTutar:800}
    ]});
    const {container}=await render(<EdesisSozlesmeDetay contract={contract}/>);
    const rows=container.querySelectorAll('[aria-label="Sözleşme taksitleri tablosu"] tbody tr');
    expect(rows.length).toBe(2);expect(rows[0].cells[0].textContent).toBe('0');expect(rows[1].cells[0].textContent).toBe('1');
    const cells=container.querySelector('[aria-label="Sözleşme kalemleri tablosu"] tbody tr').cells;
    expect(cells[4].textContent).toContain('1.000,00');expect(cells[5].textContent).toContain('0,00');
  });

  test('cancelled detail shows actual status and preserved payment without inventing installments',async()=>{
    AccountingService.setInitialData({contracts:[],incomes:[],installments:[],collections:[]});
    const contract={id:'cancelled-demo',sozlesmeNo:'SZL-DEMO-CANCEL',ogrenciAdi:'Örnek Öğrenci',brutTutar:1000,netTutar:1000,kdvTutari:0,toplamTahsilat:100,kalanAlacak:0,taksitSayisi:9,durum:3,iptal_nedeni:'Hatalı sözleşme',iptal_tarihi:'2026-08-18',sozlesmeTarihi:'2026-07-16',donemAdi:'Örnek dönem'};
    const {container,getByRole}=await render(<EdesisSozlesmeDetay contract={contract}/>);
    expect(container.textContent).toContain('İptal Edildi');
    expect(container.textContent).not.toContain('Aktif');
    expect(container.textContent).toContain('Hatalı sözleşme');
    expect(container.textContent).toContain('2026-08-18');
    expect(container.textContent).toContain('Örnek dönem');
    expect(container.textContent).toContain('100,00');
    expect(container.textContent).not.toContain('1. Taksit');
    expect(getByRole('button',{name:'Tutarları Düzenle'}).disabled).toBe(true);
    const labels=[...container.querySelectorAll('div')].filter(e=>e.children.length===0&&e.textContent==='Kalan');
    expect(labels.length).toBeGreaterThan(0);
    for(const e of labels)expect(e.parentElement.textContent).toContain('0,00');
  });

  test('increasing installment amount automatically updates contract total (brutTutar)', () => {
    const mockContract = {
      id: 'cnt_991',
      sozlesmeNo: 'SZL202699100',
      studentId: 991,
      ogrenciAdi: 'TEST OGRENCI TAKSIT',
      brutTutar: 60000,
      taksitSayisi: 6,
      durum: 1
    };
    const mockInstallments = Array.from({ length: 6 }, (_, i) => ({
      id: `inst_991_${i + 1}`,
      contractId: 'cnt_991',
      sozlesmeNo: 'SZL202699100',
      ogrenciAdi: 'TEST OGRENCI TAKSIT',
      taksitNo: i + 1,
      taksitTutari: 10000,
      amount: 10000,
      durumText: 'Bekliyor'
    }));

    AccountingService.setInitialData({
      contracts: [mockContract],
      installments: mockInstallments
    });

    const contracts = AccountingService.getContracts();
    const target = contracts.find((c) => c.sozlesmeNo === 'SZL202699100');
    expect(target).toBeDefined();
    expect(target.brutTutar).toBe(60000);

    // 2. Fetch installments
    const insts = AccountingService.getInstallments().filter((t) => t.sozlesmeNo === 'SZL202699100');
    expect(insts.length).toBe(6);
    expect(insts[0].taksitTutari).toBe(10000);

    // 3. User increases first installment from 10,000 to 15,000 (+5,000)
    const modifiedInsts = insts.map((t, idx) => (idx === 0 ? { ...t, taksitTutari: 15000 } : t));
    const saveResult = AccountingService.saveInstallments(target, modifiedInsts);

    expect(saveResult.newBrut).toBe(65000);
    expect(saveResult.count).toBe(6);

    // 4. Verify updated contract has new total
    const updatedContracts = AccountingService.getContracts();
    const updatedTarget = updatedContracts.find((c) => c.sozlesmeNo === 'SZL202699100');
    expect(updatedTarget.brutTutar).toBe(65000);

    // 5. Verify getInstallments reflects the updated installment amount
    const updatedInsts = AccountingService.getInstallments().filter((t) => t.sozlesmeNo === 'SZL202699100');
    expect(updatedInsts[0].taksitTutari).toBe(15000);
    expect(updatedInsts[1].taksitTutari).toBe(10000);
  });

  test('rebalanceInstallments evenly distributes new amount across installments', () => {
    const mockContract = {
      id: 'cnt_992',
      sozlesmeNo: 'SZL202699200',
      studentId: 992,
      ogrenciAdi: 'TEST REBALANCE OGRENCI',
      brutTutar: 40000,
      taksitSayisi: 4,
      durum: 1
    };

    AccountingService.setInitialData({ contracts: [mockContract] });

    // Rebalance to 50,000 TL in 5 installments
    const result = AccountingService.rebalanceInstallments('SZL202699200', 50000, 5, '2026-10-01');
    expect(result.newBrut).toBe(50000);
    expect(result.count).toBe(5);

    const insts = AccountingService.getInstallments().filter((t) => t.sozlesmeNo === 'SZL202699200');
    expect(insts.length).toBe(5);
    expect(insts[0].taksitTutari).toBe(10000);
    expect(insts[4].taksitTutari).toBe(10000);
  });

  test('updateContract directly updates contract metadata and total', () => {
    const mockContract = {
      id: 'cnt_993',
      sozlesmeNo: 'SZL202699300',
      studentId: 993,
      ogrenciAdi: 'TEST UPDATE CONTRACT',
      brutTutar: 50000,
      taksitSayisi: 5,
      durum: 1
    };

    AccountingService.setInitialData({ contracts: [mockContract] });

    AccountingService.updateContract('SZL202699300', {
      brutTutar: 72000,
      netTutar: 65454.55,
      taksitSayisi: 8
    });

    const contracts = AccountingService.getContracts();
    const c = contracts.find((x) => x.sozlesmeNo === 'SZL202699300');
    expect(c.brutTutar).toBe(72000);
    expect(c.taksitSayisi).toBe(8);
  });
});
