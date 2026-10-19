import React from 'react';
import {render,cleanup,fireEvent} from './test_helpers';
import AccountingService from '../lib/edesisAccountingService';
import EdesisSozlesmeDetay from '../components/EdesisSozlesmeDetay';
import {GelirDetayModal} from '../components/GelirDetayModal';
import {InstallmentReceipts} from '../components/ReceiptModal';
import {fmtDateTime} from '../components/EdesisTahsilatListesi';
import {formatTrtDateTime} from '../lib/utils';

const contract={id:'contract',sozlesmeNo:'TEST-C',ogrenciAdi:'Sentetik öğrenci',student_id:'student',brutTutar:1000,netTutar:1000,durum:1};
const plan=[1,2].map(n=>({id:'inst-'+n,contractId:'contract',contract_id:'contract',sozlesmeNo:'TEST-C',taksitNo:n,taksitTutari:500,tahsilEdilen:0,kalanTutar:500,vadeTarihi:'2026-11-15'}));
beforeEach(()=>{
 localStorage.clear();AccountingService.resetCustomData();
 AccountingService.setInitialData({contracts:[contract],incomes:[{id:'income',gelirKodu:'TEST-G',sozlesmeNo:'TEST-C',contract_id:'contract',brutTutar:1000,ogrenciAdiSoyadi:'Sentetik öğrenci'}],installments:plan,collections:[]});
 jest.spyOn(AccountingService,'recordCollection').mockResolvedValue({id:'payment'});
 jest.spyOn(AccountingService,'fetchInstallments').mockResolvedValue(plan);
 jest.spyOn(window,'alert').mockImplementation(()=>{});
});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test.each(['','0','-1','1.001'])('invalid contract collection amount %s never sends a payment',async(value)=>{
 const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
 await fireEvent.click(view.container.querySelector('button[title="Taksiti Tahsil Et (Onay Popupı Açılır)"]'));
 await fireEvent.change(view.container.querySelector('.responsive-modal-backdrop input[type="number"]'),{target:{value}});
 await fireEvent.click(view.getByRole('button',{name:'Tahsilatı Onayla'}));
 expect(AccountingService.recordCollection).not.toHaveBeenCalled();expect(window.alert).toHaveBeenCalled();
});
test.each([['Havale / EFT','T.C. VAKIFLAR BANKASI İNEGÖL ŞB.'],['Kredi Kartı','POS / Kredi Kartı Kasası'],['Nakit','Nakit Ana Kasa']])('contract %s carries the matching account',async(method,bank)=>{
 const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
 await fireEvent.click(view.container.querySelector('button[title="Taksiti Tahsil Et (Onay Popupı Açılır)"]'));
 await fireEvent.change(view.container.querySelector('.responsive-modal-backdrop select'),{target:{value:method}});
 await fireEvent.click(view.getByRole('button',{name:'Tahsilatı Onayla'}));
 expect(AccountingService.recordCollection.mock.calls[0][0]).toMatchObject({method,bank,amount:500});
});
test('income collection targets the installment the user selected',async()=>{
 const view=await render(<GelirDetayModal isOpen gelirKodu="TEST-G"/>);
 await fireEvent.click(view.container.querySelectorAll('button[title="Hızlı Tahsilat Yap (Kısmi Ödeme & Makbuz)"]')[1]);
 await fireEvent.click([...view.container.querySelectorAll('button')].find(x=>x.textContent.trim()==='Sadece Kaydet'));
 expect(AccountingService.recordCollection.mock.calls[0][0]).toMatchObject({installment_id:'inst-2',installment_no:2,note:expect.stringContaining('2. taksit')});
});
test('partial receipts have one grouped control and cancellation explicitly selects a payment',async()=>{
 const payments=[{id:'old',amount:50},{id:'new',amount:50},{id:'cancelled',amount:100,is_cancelled:1}].map(p=>({...p,contract_id:'contract',installment_id:'inst-1',payment_date:'2026-10-19'}));
 AccountingService.setInitialData({contracts:[contract],installments:[{...plan[0],tahsilEdilen:100,kalanTutar:400}],collections:payments});
 const cancel=jest.spyOn(AccountingService,'cancelCollection').mockResolvedValue({ok:true});
 const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
 expect(view.container.querySelectorAll('details')).toHaveLength(0);
 await fireEvent.click(view.getByRole('button',{name:'Makbuzlar (2)'}));
 const receipts=document.querySelector('[role="dialog"]');
 expect(receipts.textContent).toContain('2 geçerli tahsilat');
 expect(receipts.querySelector('summary').textContent).toBe('İptal edilen tahsilatlar (1)');
 expect(receipts.querySelector('details').open).toBe(false);
 await fireEvent.click(receipts.querySelector('[aria-label="Makbuz listesini kapat"]'));
 await fireEvent.click(view.getByRole('button',{name:'Tahsilat İptali'}));
 const confirm=view.getByRole('button',{name:'Evet, Tahsilatı Geri Al'});expect(confirm.disabled).toBe(true);
 await fireEvent.change(view.container.querySelector('#cancel-payment'),{target:{value:'new'}});
 await fireEvent.click(confirm);expect(cancel.mock.calls[0][0].payment_id).toBe('new');
});

test('receipt picker hides technical IDs and opens the exact payment with a readable date',async()=>{
 const onOpen=jest.fn(),payments=[{id:'pay-private-active-uuid',amount:2000,payment_date:'2026-10-19'},{id:'pay-private-cancelled-uuid',amount:4000,payment_date:'2026-10-18',is_cancelled:1}];
 const view=await render(<InstallmentReceipts payments={payments} onOpen={onOpen}/>);
 await fireEvent.click(view.getByRole('button',{name:'Makbuzlar (1)'}));
 const dialog=document.querySelector('[role="dialog"]');
 expect(dialog.textContent).not.toContain('pay-private');expect(dialog.textContent).toContain('19.10.2026');
 expect(dialog.querySelector('details').open).toBe(false);
 await fireEvent.click(dialog.querySelector('ul button'));
 expect(onOpen).toHaveBeenCalledWith(payments[0]);expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test('single active receipt opens directly; cancelled-only history remains accessible',async()=>{
 const onOpen=jest.fn(),payment={id:'one',amount:2000,payment_date:'2026-10-19'};
 const view=await render(<InstallmentReceipts payments={[payment]} onOpen={onOpen}/>);
 await fireEvent.click(view.getByRole('button',{name:'Makbuz'}));expect(onOpen).toHaveBeenCalledWith(payment);
 await view.unmount();
 const history=await render(<InstallmentReceipts payments={[{...payment,is_cancelled:1}]} onOpen={onOpen}/>);
 await fireEvent.click(history.getByRole('button',{name:'Makbuz geçmişi'}));
 const dialog=document.querySelector('[role="dialog"]');expect(dialog.textContent).toContain('geçerli tahsilat bulunmuyor');
 await fireEvent.click(dialog.querySelector('summary'));expect(dialog.querySelector('details').open).toBe(true);
 await fireEvent.click(dialog.querySelector('ul button'));expect(onOpen.mock.calls.at(-1)[0].is_cancelled).toBe(1);
});

test.each(['2026-10-19','19.10.2026'])('date-only %s never invents a collection time',value=>{
 expect(formatTrtDateTime(value)).toBe('19.10.2026');expect(fmtDateTime(value)).toBe('19.10.2026');
});
test.each(['2026-10-19 12:36:27','2026-10-19T12:36:27.000','2026-10-19T12:36:27Z','2026-10-19T15:36:27+03:00'])('timestamp %s is rendered in Turkey time',value=>{
 expect(formatTrtDateTime(value)).toMatch(/19\.10\.2026.*15:36:27/);expect(fmtDateTime(value)).toMatch(/19\.10\.2026.*15:36:27/);
});
test('Turkey timestamp crosses the UTC date boundary while invalid dates remain explicit',()=>{
 expect(formatTrtDateTime('2026-10-19T22:05:00Z')).toMatch(/20\.10\.2026.*01:05:00/);
 expect(fmtDateTime('bilinmiyor')).toBe('bilinmiyor');
});
test('independent contract plan reads keep their own result in either completion order',async()=>{
 AccountingService.fetchInstallments.mockRestore();
 const pending={};jest.spyOn(globalThis,'fetch').mockImplementation(url=>new Promise(resolve=>{const id=url.split('=').at(-1);pending[id]=()=>resolve({ok:true,json:async()=>[{id:'plan-'+id,contract_id:id,amount:500}]});}));
 const a=AccountingService.fetchInstallments('A'),b=AccountingService.fetchInstallments('B');
 pending.B();expect((await b)[0].contractId).toBe('B');pending.A();expect((await a)[0].contractId).toBe('A');
 expect(AccountingService.getInstallments().filter(i=>['A','B'].includes(i.contractId))).toHaveLength(2);
});
test('contract overdue counter uses unpaid due dates instead of a fixed zero',async()=>{
 AccountingService.setInitialData({contracts:[contract],installments:[{...plan[0],vadeTarihi:'2000-01-01'},{...plan[1],vadeTarihi:'2099-01-01'}],collections:[]});
 const view=await render(<EdesisSozlesmeDetay contract={contract}/>),label=[...view.container.querySelectorAll('div')].find(el=>el.textContent==='Geciken Taksit');
 expect(label.parentElement.textContent).toBe('Geciken Taksit1');
});
