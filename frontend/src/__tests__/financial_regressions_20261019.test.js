import React from 'react';
import {render,cleanup,fireEvent} from './test_helpers';
import AccountingService from '../lib/edesisAccountingService';
import EdesisSozlesmeDetay from '../components/EdesisSozlesmeDetay';
import {GelirDetayModal} from '../components/GelirDetayModal';

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
 expect(view.container.querySelectorAll('details')).toHaveLength(1);
 expect(view.container.querySelector('summary').textContent).toBe('Makbuzlar (2 geçerli)');
 expect(view.container.querySelector('details').textContent).toContain('İptal');
 await fireEvent.click(view.getByRole('button',{name:'Tahsilat İptali'}));
 const confirm=view.getByRole('button',{name:'Evet, Tahsilatı Geri Al'});expect(confirm.disabled).toBe(true);
 await fireEvent.change(view.container.querySelector('#cancel-payment'),{target:{value:'new'}});
 await fireEvent.click(confirm);expect(cancel.mock.calls[0][0].payment_id).toBe('new');
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
