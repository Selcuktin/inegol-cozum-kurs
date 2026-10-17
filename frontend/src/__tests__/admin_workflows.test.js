import React,{act} from 'react';
import axios from 'axios';
import {render,cleanup,fireEvent} from './test_helpers';
import {MonthlyReportPreview} from '../components/MonthlyReportPreview';
import {Reports} from '../pages/SystemPages';
import {Button} from '../pages/DashboardPage';
import {Modal} from '../components/QuickActionModal';
import {MobileBottomNav} from '../components/layout/AuthAndNav';
import {buildNavCategories} from '../components/layout/navConfig';
import {csvCell,csvRow} from '../lib/csv';
import AccountingService from '../lib/edesisAccountingService';
import StudentService from '../lib/edesisStudentService';
import EdesisSozlesmeler from '../components/EdesisSozlesmeler';
import EdesisGelirListesi from '../components/EdesisGelirListesi';
import EdesisTahsilatListesi from '../components/EdesisTahsilatListesi';
import EdesisOgrenciListesi from '../components/EdesisOgrenciListesi';
import {KayitModulu} from '../components/KayitModulu';
import {PromissoryNoteModal} from '../components/PromissoryNoteModal';
import {ReceiptModal} from '../components/ReceiptModal';

const empty=()=>({contracts:[],payments:[],incomes:[],installments:[],expenses:[]});
beforeEach(()=>{localStorage.clear();sessionStorage.clear();window.history.replaceState({},'', '/');AccountingService.acceptDashboard(empty());StudentService.resetClientData();jest.spyOn(AccountingService,'syncDeletedWithRemote').mockResolvedValue([]);});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('empty report has zero expenses and honors an authoritative empty payment list',async()=>{
  AccountingService.acceptDashboard({...empty(),payments:[{id:'old',amount:9999,payment_date:'2026-10-01'}]});
  const view=await render(<MonthlyReportPreview month='2026-10' data={{payments:[],expenses:[],installments:[]}}/>);
  expect(view.container.textContent).toContain('0 Gider Kalemi');expect(view.container.textContent).not.toContain('185.000');expect(view.container.textContent).not.toContain('9.999');
});
test('monthly report excludes cancelled receipts and closed debt but retains historical cash',async()=>{
  const view=await render(<MonthlyReportPreview month='2026-10' data={{payments:[{id:'valid',amount:123.45,payment_date:'2026-10-01',student_name:'Historical cash'},{id:'cancelled',amount:99999,payment_date:'2026-10-01',is_cancelled:1,student_name:'Cancelled receipt'}],installments:[{id:'closed',contract_status:3,amount:99999,due_date:'2026-10-01',student_name:'Closed debt'}],expenses:[]}}/>);
  expect(view.container.textContent).toContain('Historical cash');expect(view.container.textContent).toContain('₺123,45');expect(view.container.textContent).not.toContain('Cancelled receipt');expect(view.container.textContent).not.toContain('Closed debt');
});
test('same month rerender uses the new stored installment plan',async()=>{
  const data={payments:[],expenses:[],installments:[{id:'i',amount:100,paid_amount:0,due_date:'2026-10-01',student_name:'Schedule student'}]};
  const view=await render(<MonthlyReportPreview month='2026-10' data={data}/>);
  expect(view.container.textContent).toContain('₺100,00');
  await act(async()=>view.root.render(<MonthlyReportPreview month='2026-10' data={{...data,installments:[{...data.installments[0],amount:275.25}]}}/>));
  expect(view.container.textContent).toContain('₺275,25');expect(view.container.textContent).not.toContain('₺100,00');
});
test('promissory notes use the stored custom plan and never recreate an authoritative empty plan',async()=>{
  AccountingService.acceptDashboard({...empty(),installments:[{id:'i',student_id:'s',amount:123.45,due_date:'2026-10-31'}]});
  const view=await render(<PromissoryNoteModal student={{id:'s',student_name:'Test',total_fee:99999,installment_count:8}}/>);
  expect(view.container.textContent).toContain('123,45');expect(view.container.textContent).toContain('31.10.2026');expect(view.container.querySelectorAll('.promissory-note-sheet')).toHaveLength(1);
  await act(async()=>view.root.render(<PromissoryNoteModal student={{id:'s',total_fee:99999}} installments={[]}/>));
  expect(view.container.textContent).toContain('Kayıtlı taksit planı bulunamadı');expect(view.container.querySelectorAll('.promissory-note-sheet')).toHaveLength(0);
});
test('cancelled receipt stays visibly cancelled in its printable document',async()=>{
  const view=await render(<ReceiptModal payment={{id:'cancelled',is_cancelled:1,amount:100}} student={{id:'s',student_name:'Test'}}/>);
  expect(view.container.querySelector('.receipt-sheet').textContent).toContain('İPTAL EDİLDİ');
  expect([...view.container.querySelectorAll('button')].find(b=>b.textContent.includes('E-Posta Gönder')).disabled).toBe(true);
});
test.each(['=1+1',' @SUM(A1)','\t+1','-2','İpek; "Test"\nSecond line'])('CSV literal cell survives special content: %s',value=>{
  const escaped=csvCell(value);expect(escaped[0]).toBe('"');expect(escaped.endsWith('"')).toBe(true);
  expect(escaped.slice(1,-1).replace(/""/g,'"')).toBe((/^\s*[=+@-]/.test(value)?"'":'')+value);
  expect(csvRow(['A;B','"C"'])).toBe('"A;B";"""C"""');
});
test('native button attributes prevent double saves and cancel never submits the form',async()=>{
  const click=jest.fn();const view=await render(<form><Button type='button'>Cancel</Button><Button type='submit' disabled onClick={click}>Save</Button></form>);
  const [cancel,save]=view.container.querySelectorAll('button');expect(cancel.type).toBe('button');expect(save.type).toBe('submit');expect(save.disabled).toBe(true);await fireEvent.click(save);expect(click).not.toHaveBeenCalled();
});
test('failed expense response retries with the same operation ID',async()=>{
  const post=jest.spyOn(axios,'post').mockRejectedValueOnce(new Error('Response lost')).mockResolvedValue({data:{id:'saved'}});
  const view=await render(<Modal type='expense' close={()=>{}} API='/api'/>);
  await fireEvent.change(view.container.querySelector('[name="title"]'),{target:{value:'Test expense'}});await fireEvent.change(view.container.querySelector('[name="amount"]'),{target:{value:'12.34'}});
  await fireEvent.submit(view.container.querySelector('form'));await fireEvent.submit(view.container.querySelector('form'));
  expect(post).toHaveBeenCalledTimes(2);expect(post.mock.calls[0][1].id).toMatch(/^exp_/);expect(post.mock.calls[1][1].id).toBe(post.mock.calls[0][1].id);
});
test('PDF network failure is visible and does not claim a successful print',async()=>{
  jest.spyOn(axios,'get').mockRejectedValue(new Error('Offline'));const print=jest.spyOn(window,'print').mockImplementation(()=>{});
  const view=await render(<Reports me={{role:'admin'}} data={empty()}/>);await fireEvent.click(view.container.querySelector('[data-testid="download-report-button"]'));
  expect(view.container.textContent).toContain('Rapor indirilemedi');expect(print).not.toHaveBeenCalled();
  const btn=[...view.container.querySelectorAll('button')].find(b=>b.textContent.includes('Yazdır / PDF Kaydet'));await fireEvent.click(btn);expect(print).toHaveBeenCalledTimes(1);
});
test('desktop and mobile navigation expose administrator finance routes',async()=>{
  const openOptic=jest.fn(),setPage=jest.fn();
  const categories=buildNavCategories({setPage,setShowGlobalOptikModal:openOptic,setMobileOpen:()=>{}});const ids=categories.flatMap(c=>c.items.map(i=>i.id));expect(ids).not.toContain('attendance');expect(ids).toEqual(expect.arrayContaining(['exams','schedules']));
  categories.flatMap(c=>c.items).find(i=>i.id==='exams').subItems.find(i=>i.id==='optik_omr').onClick();expect(setPage).toHaveBeenCalledWith('exams');expect(openOptic).toHaveBeenCalledWith(true);
  const navigate=jest.fn();const view=await render(<MobileBottomNav page='documents' setPage={navigate}/>);
  expect(view.container.textContent).not.toMatch(/Sınavlar|Yoklama/);await fireEvent.click([...view.container.querySelectorAll('button')].find(b=>b.textContent==='Sözleşmeler'));expect(navigate).toHaveBeenCalledWith('documents');
});
test('period screen reports stored period counts without pretending to migrate records',async()=>{
  const view=await render(<KayitModulu activeTab='donem' setActiveTab={()=>{}} students={[{id:'old',program:'2025-2026'},{id:'new',program:'2026-2027'}]}/>);
  expect(view.container.querySelector('.donem-view').textContent).toContain('2025-2026');expect(view.container.textContent).not.toContain('Simülasyonu Doğrula');expect(view.container.textContent).not.toContain('Veri kaybı riski bulunmamaktadır');
});

const records=()=>Array.from({length:76},(_,n)=>({id:'record-'+n,student_name:'Page Student '+n,ogrenciAdi:'Page Student '+n,student_id:'s-'+n,student_class:'8-A',status:'Kesin Kayıt',donemId:113,donem_id:113,period_id:113,program:'2026-2027',sozlesmeNo:'PAGE-'+String(n).padStart(3,'0'),gelirKodu:'GLR-'+n,brutTutar:100,brut_tutar:100,total_fee:100,tahsilatTutari:10,amount:10,payment_date:'2026-10-17',durum:1}));
test.each(['contracts','incomes','collections','students'])('%s pagination recovers after the underlying list shrinks',async domain=>{
  const all=records();const set=list=>{if(domain==='students')StudentService.acceptSnapshot(list);else AccountingService.setInitialData({contracts:domain==='contracts'?list:[],incomes:domain==='incomes'?list:[],collections:domain==='collections'?list:[]});};
  set(all);const ui=list=>domain==='contracts'?<EdesisSozlesmeler students={list}/>:domain==='incomes'?<EdesisGelirListesi students={list}/>:domain==='collections'?<EdesisTahsilatListesi payments={list} students={list}/>:<EdesisOgrenciListesi students={list}/>;
  const view=await render(ui(all));const next=()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent.trim()==='Sonraki');
  expect(next()).toBeDefined();
  expect(view.container.querySelector('tbody').querySelectorAll('tr')).toHaveLength(25);
  await act(async()=>window.dispatchEvent(new Event('beforeprint')));expect(view.container.querySelector('tbody').querySelectorAll('tr')).toHaveLength(76);
  await act(async()=>window.dispatchEvent(new Event('afterprint')));expect(view.container.querySelector('tbody').querySelectorAll('tr')).toHaveLength(25);
  for(let n=0;n<3;n++)await fireEvent.click(next());expect(view.container.querySelector('tbody').textContent).toContain('Page Student');
  const last=[all[0]];set(last);await act(async()=>view.root.render(ui(last)));
  expect(view.container.querySelector('tbody').textContent).toContain('Page Student 0');expect(next().disabled).toBe(true);
});

test.each(['contracts','incomes','collections','students'])('%s export includes all filtered rows across pages and safely quotes user text',async domain=>{
  if(!URL.createObjectURL)URL.createObjectURL=()=>'';
  const capture=jest.spyOn(URL,'createObjectURL').mockReturnValue('blob:admin-test');jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  const all=records();all[0].student_name='=Text; "İpek"';all[0].ogrenciAdi=all[0].student_name;
  AccountingService.setInitialData({contracts:domain==='contracts'?all:[],incomes:domain==='incomes'?all:[],collections:domain==='collections'?all:[]});StudentService.acceptSnapshot(all);
  const view=await render(domain==='contracts'?<EdesisSozlesmeler students={all}/>:domain==='incomes'?<EdesisGelirListesi students={all}/>:domain==='collections'?<EdesisTahsilatListesi payments={all} students={all}/>:<EdesisOgrenciListesi students={all}/>);
  const button=[...view.container.querySelectorAll('button')].find(b=>/Excel|CSV/.test(b.textContent));expect(button).toBeDefined();await fireEvent.click(button);
  const text=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(capture.mock.calls[0][0]);});
  expect((text.match(/Page Student/g)||[])).toHaveLength(75);expect(text).toContain(csvCell(all[0].student_name));
});

test('unknown contract number cannot open a different contract via a remembered same-name student',async()=>{
  const list=[{id:'real',sozlesmeNo:'REAL',student_id:'s',student_name:'Duplicate Name',brutTutar:100}];AccountingService.setInitialData({contracts:list});
  sessionStorage.setItem('cozum_open_contract_no','MISSING');sessionStorage.setItem('cozum_open_contract_student','Duplicate Name');
  const view=await render(<EdesisSozlesmeler students={[{id:'s',student_name:'Duplicate Name',sozlesme_no:'REAL'}]}/>);
  expect(view.container.querySelector('.edesis-sozlesme-detay-view')).toBeNull();expect(view.container.textContent).toContain('Sözleşme Listesi');
});
