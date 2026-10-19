import React,{act} from 'react';
import {render,cleanup,fireEvent} from './test_helpers';
import AccountingService from '../lib/edesisAccountingService';
import StudentService from '../lib/edesisStudentService';
import {ReceiptModal} from '../components/ReceiptModal';
import {PromissoryNoteModal,numberToTurkishWords} from '../components/PromissoryNoteModal';
import {MebContractPrintModal,PaymentPlanModal} from '../components/contracts/ContractModals';
import EdesisSozlesmeDetay from '../components/EdesisSozlesmeDetay';
import EdesisSozlesmeler from '../components/EdesisSozlesmeler';
import {GelirDetayModal} from '../components/GelirDetayModal';

const student={id:'print-student',student_name:'İpek Çağrı Şen',parent_name:'Şule Ünal',parent_phone:'Test Phone',total_fee:1000,paid_amount:125,sozlesme_no:'PRINT-001'};
const contract={id:'print-contract',sozlesmeNo:'PRINT-001',ogrenciId:student.id,ogrenciAdi:student.student_name,brutTutar:1000,donemAdi:'2026-2027',taksitSayisi:2,durum:1};
const payment={id:'actual-receipt-001',contract_id:contract.id,student_id:student.id,amount:125,payment_date:'2026-10-16',method:'Nakit'};
beforeEach(()=>{localStorage.clear();AccountingService.acceptDashboard({contracts:[contract],incomes:[],payments:[payment],installments:[]});StudentService.acceptSnapshot([student]);});
afterEach(async()=>{await cleanup();sessionStorage.clear();jest.restoreAllMocks();expect(document.querySelector('[data-print-hidden]')).toBeNull();});
async function printing(){await act(async()=>window.dispatchEvent(new Event('beforeprint')));}
async function finished(){await act(async()=>window.dispatchEvent(new Event('afterprint')));}

test('receipt print isolates its ancestor path, hides background and restores exact prior attributes',async()=>{
  const view=await render(<div><section id='background'>Background report</section><section><ReceiptModal payment={payment} student={student}/></section></div>);
  const background=view.container.querySelector('#background');background.setAttribute('data-print-hidden','previous');
  await printing();expect(background.getAttribute('data-print-hidden')).toBe('');expect(view.container.querySelector('[data-print-root] .receipt-sheet')).toBeTruthy();
  await finished();expect(background.getAttribute('data-print-hidden')).toBe('previous');background.removeAttribute('data-print-hidden');expect(document.querySelector('[data-print-root]')).toBeNull();
});
test('nested receipt wins over underlying document, repeated print and unmount clear isolation',async()=>{
  const view=await render(<><MebContractPrintModal contract={contract} printStudent={student}/><ReceiptModal payment={payment} student={student}/></>);
  await printing();const roots=view.container.querySelectorAll('[data-print-root]');expect(roots).toHaveLength(1);expect(roots[0].querySelector('.receipt-sheet')).toBeTruthy();
  await printing();expect(view.container.querySelectorAll('[data-print-root]')).toHaveLength(1);
  await view.unmount();expect(document.querySelector('[data-print-root]')).toBeNull();expect(document.querySelector('[data-print-hidden]')).toBeNull();
});
test('receipt switches identity without retaining previous amount, date, parent or email result',async()=>{
  const view=await render(<ReceiptModal payment={payment} student={student}/>);
  await act(async()=>view.root.render(<ReceiptModal payment={{...payment,id:'second',amount:77.25,payment_date:'2026-11-03',student_name:'Second'}} student={{...student,id:'second',student_name:'Second',parent_name:'Second Parent'}}/>));
  const sheet=view.container.querySelector('.receipt-sheet');expect(sheet.textContent).toContain('77,25');expect(sheet.textContent).toContain('03.11.2026');expect(sheet.textContent).toContain('Second Parent');expect(sheet.textContent).not.toContain('Şule Ünal');
});
test('receipt of an old contract uses that income balance rather than new student contract totals',async()=>{
  AccountingService.acceptDashboard({contracts:[],incomes:[{id:'old-income',contract_id:'old',brut_tutar:800,toplam_tahsilat:200,durum:1}],installments:[],payments:[]});
  const view=await render(<ReceiptModal payment={{...payment,contract_id:'old',amount:200}} student={{...student,total_fee:90000,paid_amount:10000}}/>);
  const sheet=view.container.querySelector('.receipt-sheet').textContent;expect(sheet).toContain('800,00');expect(sheet).toContain('600,00');expect(sheet).not.toContain('90.000,00');
});
test('contract output resolves by ID before stale matching names or old student numbers',async()=>{
  const duplicate={...student,id:'unrelated',student_tc:'WRONG_TC',parent_name:'WRONG_PARENT'};
  const view=await render(<MebContractPrintModal contract={{...contract,student_no:'same-number'}} students={[{...duplicate,student_no:'same-number'},student]}/>);
  const sheet=view.container.querySelector('.meb-contract-sheet').textContent;expect(sheet).toContain('Şule Ünal');expect(sheet).not.toContain('WRONG_PARENT');
});
test('contract print does not invent missing start/end dates and carries long text without fixed height',async()=>{
  const view=await render(<MebContractPrintModal contract={{...contract,ogrenciAdi:'İpek '.repeat(100),notes:'Long'}} students={[student]}/>);
  const sheet=view.container.querySelector('.meb-contract-sheet');expect(sheet.style.maxHeight).toBe('');expect(sheet.textContent).not.toContain('01.10.2026');expect(sheet.textContent).not.toContain('30.06.2027');
});
test('contract screen resolves identity before a stale contract-number match in its print student prop',async()=>{
  StudentService.acceptSnapshot([{...student,id:'unrelated',parent_name:'WRONG_PARENT'},student]);
  sessionStorage.setItem('cozum_open_contract_no',contract.sozlesmeNo);
  const view=await render(<EdesisSozlesmeler students={[student]} payments={[payment]}/>);
  await fireEvent.click(view.container.querySelector('[data-testid="print-meb-contract-btn"]'));
  const sheet=view.container.querySelector('.meb-contract-sheet');expect(sheet.textContent).toContain('Şule Ünal');expect(sheet.textContent).not.toContain('WRONG_PARENT');
});
test('missing contract fields stay missing and cancelled documents retain their archive status',async()=>{
  const view=await render(<MebContractPrintModal contract={{durum:3}} students={[]}/>);
  const sheet=view.container.querySelector('.meb-contract-sheet').textContent;
  expect(sheet).toContain('İPTAL EDİLMİŞ SÖZLEŞME');expect(sheet).toContain('Sözleşme No: — · Düzenleme Tarihi: —');expect(sheet).not.toContain('Mezun / YKS');expect(sheet).not.toContain('2026-2027 Eğitim');
});
test('plan print preserves custom amounts, partial collection and installment zero without manufacturing a plan',async()=>{
  AccountingService.acceptDashboard({contracts:[contract],payments:[],incomes:[],installments:[{id:'deposit',contract_id:contract.id,sozlesme_no:contract.sozlesmeNo,installment_no:0,amount:125,paid_amount:125,due_date:'2026-10-01'},{id:'partial',contract_id:contract.id,sozlesme_no:contract.sozlesmeNo,installment_no:1,amount:875,paid_amount:200,due_date:'2026-11-30',status:'Kısmi Ödendi'}]});
  const view=await render(<PaymentPlanModal contract={contract}/>);expect(view.container.textContent).toContain('0. Taksit');expect(view.container.textContent).toContain('Kısmi Ödendi');expect(view.container.querySelectorAll('tbody tr')).toHaveLength(2);
  AccountingService.acceptDashboard({contracts:[contract],payments:[],incomes:[],installments:[]});await act(async()=>view.root.render(<PaymentPlanModal contract={{...contract}}/>));
  expect(view.container.textContent).toContain('Kayıtlı ödeme planı bulunamadı');expect([...view.container.querySelectorAll('button')].find(b=>b.textContent.trim()==='Yazdır').disabled).toBe(true);
});
test('senet selected index remains valid after switching to a shorter saved plan',async()=>{
  const plan=Array.from({length:4},(_,n)=>({installment_no:n+1,amount:250,due_date:'2026-10-31'}));
  const view=await render(<PromissoryNoteModal student={student} installments={plan}/>);
  await fireEvent.change(view.container.querySelector('select'),{target:{value:'3'}});
  await act(async()=>view.root.render(<PromissoryNoteModal student={{...student,id:'new'}} installments={[{amount:75.05,due_date:'2026-11-30'}]}/>));
  expect(view.container.querySelectorAll('.promissory-note-sheet')).toHaveLength(1);expect(view.container.textContent).toContain('75,05');
});
test.each([[1.999,'İki Türk Lirası'],[999.999,'Bin Türk Lirası'],[0.999,'Bir Türk Lirası']])('amount in words carries rounded kuruş into lira: %s', (amount,text)=>{expect(numberToTurkishWords(amount)).toBe(text);});
test.each([500,250])('installment collected %s prints individual saved transactions, not accumulated amounts',async paid=>{
  const installment={id:'inst',contract_id:contract.id,sozlesme_no:contract.sozlesmeNo,installment_no:1,amount:500,paid_amount:paid,due_date:'2026-10-31'};
  AccountingService.acceptDashboard({contracts:[contract],incomes:[],installments:[installment],payments:[{...payment,id:'p1',installment_id:'inst',amount:paid*0.4},{...payment,id:'p2',installment_id:'inst',amount:paid*0.6}]});
  const view=await render(<EdesisSozlesmeDetay contract={contract} students={[student]}/>);
  await fireEvent.click(view.getByRole('button',{name:'Makbuzlar (2)'}));
  const receipts=document.querySelectorAll('[role="dialog"] .installment-receipt-open');expect(receipts).toHaveLength(2);await fireEvent.click(receipts[0]);
  expect(view.container.querySelector('.receipt-sheet').textContent).toContain((paid*0.4).toLocaleString('tr-TR',{minimumFractionDigits:2}));expect(view.container.querySelector('.receipt-sheet').textContent).not.toContain('THS-');
});
test('income detail installment print opens the saved collection with its actual identity, amount and date',async()=>{
  const rawContract={...contract,student_id:student.id,sozlesme_no:contract.sozlesmeNo};
  AccountingService.acceptDashboard({contracts:[rawContract],incomes:[{id:'income',gelir_kodu:'PRINT-INCOME',contract_id:contract.id,student_id:student.id,sozlesme_no:contract.sozlesmeNo,brut_tutar:1000,toplam_tahsilat:125}],installments:[{id:'inst',contract_id:contract.id,sozlesme_no:contract.sozlesmeNo,installment_no:1,amount:500,paid_amount:125}],payments:[{...payment,installment_id:'inst',installment_no:1}]});
  const view=await render(<GelirDetayModal isOpen student={student} gelirKodu='PRINT-INCOME'/>);
  const buttons=[...view.container.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Makbuz');expect(buttons).toHaveLength(1);await fireEvent.click(buttons[0]);
  const sheet=view.container.querySelector('.receipt-sheet').textContent;expect(sheet).toContain('ODM-001');expect(sheet).toContain('125,00');expect(sheet).toContain('16.10.2026');
  localStorage.setItem('session_token','test-only-token');jest.spyOn(window,'prompt').mockReturnValue('veli@example.invalid');
  const fetchMock=jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({ok:true})});
  await fireEvent.click([...view.container.querySelectorAll('button')].find(b=>b.textContent.includes('E-Posta Gönder')));
  expect(fetchMock).toHaveBeenCalledWith(`/api/payments/${payment.id}/send-receipt-email`,expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer test-only-token'})}));
});

if(process.env.PRINT_FIXTURES==='1')test('export anonymous print layout fixtures from the real rendered components',async()=>{
  const fs=require('fs');
  const plan=Array.from({length:120},(_,n)=>({id:'long-'+n,contract_id:contract.id,sozlesme_no:contract.sozlesmeNo,installment_no:n+1,amount:8.33,paid_amount:0,due_date:'2026-10-31'}));
  AccountingService.acceptDashboard({contracts:[contract],incomes:[],payments:[],installments:plan});
  const samples={contract:<MebContractPrintModal contract={{...contract,ogrenciAdi:student.student_name.repeat(8)}} printStudent={student}/>,receipt:<ReceiptModal payment={{...payment,note:'Uzun açıklama. '.repeat(60)}} student={student}/>,notes:<PromissoryNoteModal student={student} installments={plan.slice(0,3)}/>,plan:<PaymentPlanModal contract={contract}/>};
  for(const [name,ui] of Object.entries(samples)){
    const view=await render(<div><div>BACKGROUND_MUST_NOT_PRINT</div>{ui}</div>);await printing();
    const html='<!doctype html><html lang="tr"><meta charset="utf-8"><style>'+fs.readFileSync('src/App.css','utf8')+'</style><body>'+view.container.outerHTML+'</body></html>';
    fs.writeFileSync('../test_reports/fix_print_'+name+'.html',html);await finished();await view.unmount();
  }
});
